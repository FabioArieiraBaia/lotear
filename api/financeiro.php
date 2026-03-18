<?php
/**
 * Financeiro endpoint handlers
 * Gerencia parcelas, pagamentos e comissões
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// ==================== LIMPAR DADOS FINANCEIROS ====================

function handleLimparDadosFinanceiros($loteId) {
    requireAuth();
    $db = getDatabase();
    
    $db->beginTransaction();
    
    try {
        // Deletar pagamentos
        $db->prepare('DELETE FROM pagamentos WHERE loteId = ?')->execute([$loteId]);
        
        // Deletar parcelas
        $db->prepare('DELETE FROM parcelas WHERE loteId = ?')->execute([$loteId]);
        
        // Deletar comissões
        $db->prepare('DELETE FROM comissoes WHERE loteId = ?')->execute([$loteId]);
        
        // Limpar campos do lote
        $db->prepare('
            UPDATE lotes SET 
                buyerName = NULL,
                buyerCpf = NULL,
                corretorId = NULL,
                downPayment = 0,
                installments = 0,
                saleDate = NULL,
                paymentStatus = "pendente",
                totalPaid = 0
            WHERE id = ?
        ')->execute([$loteId]);
        
        $db->commit();
        
        jsonResponse(['success' => true, 'message' => 'Dados financeiros limpos com sucesso']);
        
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['error' => 'Erro ao limpar dados: ' . $e->getMessage()], 500);
    }
}

// ==================== PARCELAS ====================

function handleGetParcelasByLote($loteId) {
    requireAuth();
    $db = getDatabase();
    
    $stmt = $db->prepare('
        SELECT parcelas.*, 
            (SELECT COALESCE(SUM(amount), 0) FROM pagamentos WHERE parcelaId = parcelas.id) as totalPago
        FROM parcelas 
        WHERE loteId = ?
        ORDER BY installmentNumber ASC
    ');
    $stmt->execute([$loteId]);
    $parcelas = $stmt->fetchAll();
    
    jsonResponse($parcelas);
}

function handleGetAllParcelas() {
    requireAuth();
    $db = getDatabase();
    
    $status = $_GET['status'] ?? null;
    $vencimento = $_GET['vencimento'] ?? null; // 'hoje', 'semana', 'mes', 'atrasado'
    
    $sql = '
        SELECT parcelas.*, 
            lotes.name as loteName, 
            lotes.price as lotePrice,
            lotes.buyerName,
            lotes.buyerCpf,
            lotes.corretorId,
            loteamentos.name as loteamentoName,
            corretores.name as corretorName,
            (SELECT COALESCE(SUM(amount), 0) FROM pagamentos WHERE parcelaId = parcelas.id) as totalPago
        FROM parcelas 
        LEFT JOIN lotes ON parcelas.loteId = lotes.id
        LEFT JOIN loteamentos ON lotes.loteamentoId = loteamentos.id
        LEFT JOIN corretores ON lotes.corretorId = corretores.id
        WHERE 1=1
    ';
    
    $params = [];
    
    if ($status) {
        $sql .= ' AND parcelas.status = ?';
        $params[] = $status;
    }
    
    if ($vencimento === 'atrasado') {
        $sql .= ' AND parcelas.dueDate < date("now") AND parcelas.status = "pendente"';
    } elseif ($vencimento === 'hoje') {
        $sql .= ' AND parcelas.dueDate = date("now")';
    } elseif ($vencimento === 'semana') {
        $sql .= ' AND parcelas.dueDate BETWEEN date("now") AND date("now", "+7 days")';
    } elseif ($vencimento === 'mes') {
        $sql .= ' AND parcelas.dueDate BETWEEN date("now") AND date("now", "+30 days")';
    }
    
    $sql .= ' ORDER BY parcelas.dueDate ASC';
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $parcelas = $stmt->fetchAll();
    
    jsonResponse($parcelas);
}

function handleGenerateParcelas($loteId) {
    requireAuth();
    $db = getDatabase();
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Buscar dados do lote
    $stmt = $db->prepare('SELECT * FROM lotes WHERE id = ?');
    $stmt->execute([$loteId]);
    $lote = $stmt->fetch();
    
    if (!$lote) {
        jsonResponse(['error' => 'Lote não encontrado'], 404);
        return;
    }
    
    $price = floatval($lote['price'] ?? 0);
    $downPayment = floatval($data['downPayment'] ?? $lote['downPayment'] ?? 0);
    $installments = intval($data['installments'] ?? $lote['installments'] ?? 1);
    $startDate = $data['startDate'] ?? date('Y-m-d');
    $dayOfMonth = intval($data['dayOfMonth'] ?? 10); // Dia de vencimento padrão
    
    // PRIMEIRO: Deletar TODOS os dados financeiros existentes para evitar duplicatas
    $db->prepare('DELETE FROM pagamentos WHERE loteId = ?')->execute([$loteId]);
    $db->prepare('DELETE FROM parcelas WHERE loteId = ?')->execute([$loteId]);
    $db->prepare('DELETE FROM comissoes WHERE loteId = ?')->execute([$loteId]);
    
    // Iniciar transação
    $db->beginTransaction();
    
    try {
        // Deletar parcelas e pagamentos existentes
        $db->prepare('DELETE FROM pagamentos WHERE loteId = ?')->execute([$loteId]);
        $db->prepare('DELETE FROM parcelas WHERE loteId = ?')->execute([$loteId]);
        $db->prepare('DELETE FROM comissoes WHERE loteId = ?')->execute([$loteId]);
        
        // Calcular valor restante e valor de cada parcela
        $remainingAmount = $price - $downPayment;
        $installmentAmount = $installments > 0 ? $remainingAmount / $installments : $remainingAmount;
        
        // Gerar parcelas
        $stmtInsert = $db->prepare('
            INSERT INTO parcelas (loteId, installmentNumber, totalInstallments, amount, dueDate, status)
            VALUES (?, ?, ?, ?, ?, "pendente")
        ');
        
        $currentDate = new DateTime($startDate);
        
        // Se o dia do mês for especificado, ajustar para o próximo mês
        if ($dayOfMonth > 0) {
            $currentDate->modify('first day of next month');
            $currentDate->setDate($currentDate->format('Y'), $currentDate->format('m'), $dayOfMonth);
        }
        
        for ($i = 1; $i <= $installments; $i++) {
            $dueDate = $currentDate->format('Y-m-d');
            
            $stmtInsert->execute([
                $loteId,
                $i,
                $installments,
                $installmentAmount,
                $dueDate
            ]);
            
            $currentDate->modify('+1 month');
        }
        
        // Atualizar lote com dados da venda
        $stmtUpdate = $db->prepare('
            UPDATE lotes SET 
                downPayment = ?,
                installments = ?,
                saleDate = ?,
                paymentStatus = ?,
                totalPaid = ?
            WHERE id = ?
        ');
        $stmtUpdate->execute([
            $downPayment,
            $installments,
            $startDate,
            $downPayment > 0 ? 'em_dia' : 'pendente',
            $downPayment,
            $loteId
        ]);
        
        // Registrar pagamento do sinal se houver (verificar se já existe)
        if ($downPayment > 0) {
            // Verificar se já existe pagamento de sinal para este lote
            $stmtCheckSinal = $db->prepare('SELECT id FROM pagamentos WHERE loteId = ? AND type = "sinal"');
            $stmtCheckSinal->execute([$loteId]);
            $existingSinal = $stmtCheckSinal->fetch();
            
            if ($existingSinal) {
                // Atualizar o sinal existente
                $stmtUpdateSinal = $db->prepare('UPDATE pagamentos SET amount = ?, paidAt = ? WHERE id = ?');
                $stmtUpdateSinal->execute([$downPayment, $startDate, $existingSinal['id']]);
            } else {
                // Criar novo pagamento de sinal
                $stmtPagamento = $db->prepare('
                    INSERT INTO pagamentos (loteId, amount, type, paidAt, notes)
                    VALUES (?, ?, "sinal", ?, "Sinal/Entrada da venda")
                ');
                $stmtPagamento->execute([$loteId, $downPayment, $startDate]);
            }
        }
        
        // Gerar comissão do corretor se houver
        if ($lote['corretorId']) {
            handleGenerateComissao($db, $lote['corretorId'], $loteId, $price);
        }
        
        $db->commit();
        
        // Retornar parcelas geradas
        $stmtParcelas = $db->prepare('SELECT * FROM parcelas WHERE loteId = ? ORDER BY installmentNumber');
        $stmtParcelas->execute([$loteId]);
        $parcelas = $stmtParcelas->fetchAll();
        
        jsonResponse([
            'success' => true,
            'parcelas' => $parcelas,
            'installmentAmount' => $installmentAmount,
            'totalPaid' => $downPayment
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['error' => 'Erro ao gerar parcelas: ' . $e->getMessage()], 500);
    }
}

// ==================== PAGAMENTOS ====================

function handleGetPagamentos() {
    requireAuth();
    $db = getDatabase();
    
    $loteId = $_GET['loteId'] ?? null;
    
    $sql = '
        SELECT pagamentos.*, 
            lotes.name as loteName,
            parcelas.installmentNumber as parcelaNumero,
            corretores.name as corretorName
        FROM pagamentos
        LEFT JOIN lotes ON pagamentos.loteId = lotes.id
        LEFT JOIN parcelas ON pagamentos.parcelaId = parcelas.id
        LEFT JOIN corretores ON pagamentos.corretorId = corretores.id
        WHERE 1=1
    ';
    
    $params = [];
    
    if ($loteId) {
        $sql .= ' AND pagamentos.loteId = ?';
        $params[] = $loteId;
    }
    
    $sql .= ' ORDER BY pagamentos.paidAt DESC';
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $pagamentos = $stmt->fetchAll();
    
    jsonResponse($pagamentos);
}

function handleRegistrarPagamento() {
    requireAuth();
    $db = getDatabase();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $parcelaId = $data['parcelaId'] ?? null;
    $loteId = $data['loteId'] ?? null;
    $amount = floatval($data['amount'] ?? 0);
    $paymentMethod = $data['paymentMethod'] ?? '';
    $notes = $data['notes'] ?? '';
    $paidAt = $data['paidAt'] ?? date('Y-m-d H:i:s');
    
    // Iniciar transação
    $db->beginTransaction();
    
    try {
        // Registrar pagamento
        $stmt = $db->prepare('
            INSERT INTO pagamentos (loteId, parcelaId, amount, type, paymentMethod, paidAt, notes)
            VALUES (?, ?, ?, "parcela", ?, ?, ?)
        ');
        $stmt->execute([$loteId, $parcelaId, $amount, $paymentMethod, $paidAt, $notes]);
        
        // Se for pagamento de parcela específica
        if ($parcelaId) {
            // Buscar parcela
            $stmtParcela = $db->prepare('SELECT * FROM parcelas WHERE id = ?');
            $stmtParcela->execute([$parcelaId]);
            $parcela = $stmtParcela->fetch();
            
            if ($parcela) {
                // Calcular total pago nesta parcela
                $stmtTotal = $db->prepare('SELECT COALESCE(SUM(amount), 0) as total FROM pagamentos WHERE parcelaId = ?');
                $stmtTotal->execute([$parcelaId]);
                $totalPago = floatval($stmtTotal->fetch()['total']);
                
                // Atualizar status da parcela
                $novoStatus = $totalPago >= $parcela['amount'] ? 'pago' : 'pendente';
                $stmtUpdate = $db->prepare('UPDATE parcelas SET status = ?, paidAt = ?, paidAmount = ? WHERE id = ?');
                $stmtUpdate->execute([$novoStatus, $paidAt, $totalPago, $parcelaId]);
            }
        }
        
        // Atualizar total pago no lote
        $stmtTotalLote = $db->prepare('SELECT COALESCE(SUM(amount), 0) as total FROM pagamentos WHERE loteId = ?');
        $stmtTotalLote->execute([$loteId]);
        $totalPagoLote = floatval($stmtTotalLote->fetch()['total']);
        
        $db->prepare('UPDATE lotes SET totalPaid = ? WHERE id = ?')->execute([$totalPagoLote, $loteId]);
        
        // Verificar se todas parcelas estão pagas
        $stmtParcelasStatus = $db->prepare('
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status = "pago" THEN 1 ELSE 0 END) as pagas
            FROM parcelas WHERE loteId = ?
        ');
        $stmtParcelasStatus->execute([$loteId]);
        $statusParcelas = $stmtParcelasStatus->fetch();
        
        if ($statusParcelas['total'] > 0 && $statusParcelas['total'] == $statusParcelas['pagas']) {
            $db->prepare('UPDATE lotes SET paymentStatus = "quitado" WHERE id = ?')->execute([$loteId]);
        }
        
        $db->commit();
        
        jsonResponse(['success' => true, 'totalPaid' => $totalPagoLote]);
        
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['error' => 'Erro ao registrar pagamento: ' . $e->getMessage()], 500);
    }
}

// ==================== COMISSÕES ====================

function handleGetComissoes() {
    requireAuth();
    $db = getDatabase();
    
    $corretorId = $_GET['corretorId'] ?? null;
    $status = $_GET['status'] ?? null;
    
    $sql = '
        SELECT comissoes.*,
            corretores.name as corretorName,
            corretores.phone as corretorPhone,
            lotes.name as loteName,
            loteamentos.name as loteamentoName
        FROM comissoes
        LEFT JOIN corretores ON comissoes.corretorId = corretores.id
        LEFT JOIN lotes ON comissoes.loteId = lotes.id
        LEFT JOIN loteamentos ON lotes.loteamentoId = loteamentos.id
        WHERE 1=1
    ';
    
    $params = [];
    
    if ($corretorId) {
        $sql .= ' AND comissoes.corretorId = ?';
        $params[] = $corretorId;
    }
    
    if ($status) {
        $sql .= ' AND comissoes.status = ?';
        $params[] = $status;
    }
    
    $sql .= ' ORDER BY comissoes.createdAt DESC';
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $comissoes = $stmt->fetchAll();
    
    jsonResponse($comissoes);
}

function handleGenerateComissao($db, $corretorId, $loteId, $saleAmount) {
    // Buscar taxa de comissão do corretor
    $stmtCorretor = $db->prepare('SELECT commissionRate FROM corretores WHERE id = ?');
    $stmtCorretor->execute([$corretorId]);
    $corretor = $stmtCorretor->fetch();
    
    if (!$corretor) return;
    
    $commissionRate = floatval($corretor['commissionRate'] ?? 0.05);
    $commissionAmount = $saleAmount * $commissionRate;
    
    // Verificar se já existe comissão para este lote
    $stmtCheck = $db->prepare('SELECT id FROM comissoes WHERE loteId = ?');
    $stmtCheck->execute([$loteId]);
    
    if ($stmtCheck->fetch()) {
        // Atualizar comissão existente
        $stmtUpdate = $db->prepare('
            UPDATE comissoes SET 
                saleAmount = ?,
                commissionRate = ?,
                commissionAmount = ?
            WHERE loteId = ?
        ');
        $stmtUpdate->execute([$saleAmount, $commissionRate, $commissionAmount, $loteId]);
    } else {
        // Criar nova comissão
        $stmtInsert = $db->prepare('
            INSERT INTO comissoes (corretorId, loteId, saleAmount, commissionRate, commissionAmount, status)
            VALUES (?, ?, ?, ?, ?, "pendente")
        ');
        $stmtInsert->execute([$corretorId, $loteId, $saleAmount, $commissionRate, $commissionAmount]);
    }
}

function handlePagarComissao($comissaoId) {
    requireAuth();
    $db = getDatabase();
    
    $stmt = $db->prepare('UPDATE comissoes SET status = "pago", paidAt = datetime("now") WHERE id = ?');
    $stmt->execute([$comissaoId]);
    
    // Buscar dados da comissão para registrar pagamento
    $stmtComissao = $db->prepare('
        SELECT comissoes.*, corretores.name as corretorName, lotes.name as loteName
        FROM comissoes
        LEFT JOIN corretores ON comissoes.corretorId = corretores.id
        LEFT JOIN lotes ON comissoes.loteId = lotes.id
        WHERE comissoes.id = ?
    ');
    $stmtComissao->execute([$comissaoId]);
    $comissao = $stmtComissao->fetch();
    
    if ($comissao) {
        // Registrar pagamento da comissão
        $stmtPagamento = $db->prepare('
            INSERT INTO pagamentos (loteId, corretorId, amount, type, paidAt, notes)
            VALUES (?, ?, ?, "comissao", datetime("now"), ?)
        ');
        $stmtPagamento->execute([
            $comissao['loteId'],
            $comissao['corretorId'],
            $comissao['commissionAmount'],
            "Comissão paga para {$comissao['corretorName']} - Lote {$comissao['loteName']}"
        ]);
    }
    
    jsonResponse(['success' => true]);
}

// ==================== VENDAS ====================

function handleGetVendas() {
    requireAuth();
    $db = getDatabase();
    
    // Buscar lotes vendidos/reservados com dados completos
    $sql = '
        SELECT 
            lotes.id,
            lotes.name as loteName,
            lotes.price as valorTotal,
            lotes.downPayment as entrada,
            lotes.installments as totalParcelas,
            lotes.saleDate as dataVenda,
            lotes.buyerName as compradorNome,
            lotes.buyerCpf as compradorCpf,
            lotes.paymentStatus as statusPagamento,
            lotes.totalPaid as totalPago,
            lotes.corretorId,
            loteamentos.name as loteamentoName,
            corretores.name as corretorNome,
            corretores.commissionRate as corretorTaxa,
            (SELECT COUNT(*) FROM parcelas WHERE parcelas.loteId = lotes.id AND parcelas.status = "pago") as parcelasPagas,
            (SELECT COUNT(*) FROM parcelas WHERE parcelas.loteId = lotes.id) as parcelasGeradas,
            (SELECT COALESCE(SUM(amount), 0) FROM parcelas WHERE parcelas.loteId = lotes.id AND parcelas.status = "pendente") as valorPendente
        FROM lotes
        LEFT JOIN loteamentos ON lotes.loteamentoId = loteamentos.id
        LEFT JOIN corretores ON lotes.corretorId = corretores.id
        WHERE lotes.status IN ("Vendido", "Reservado")
        ORDER BY lotes.saleDate DESC
    ';
    
    $stmt = $db->query($sql);
    $vendas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calcular valor da parcela para cada venda
    foreach ($vendas as &$venda) {
        $valorRestante = floatval($venda['valorTotal']) - floatval($venda['entrada']);
        $totalParcelas = intval($venda['totalParcelas']) ?: 1;
        $venda['valorParcela'] = $valorRestante / $totalParcelas;
        $venda['parcelasPendentes'] = intval($venda['parcelasGeradas']) - intval($venda['parcelasPagas']);
    }
    
    jsonResponse($vendas);
}

// ==================== COMPRADORES ====================

function handleGetCompradores() {
    requireAuth();
    $db = getDatabase();
    
    // Buscar lotes vendidos/reservados com dados completos
    $sql = '
        SELECT 
            lotes.id as loteId,
            lotes.name as loteName,
            lotes.price as valorTotal,
            lotes.downPayment as entrada,
            lotes.installments as totalParcelas,
            lotes.saleDate as dataVenda,
            lotes.buyerName as compradorNome,
            lotes.buyerCpf as compradorCpf,
            lotes.paymentStatus as statusPagamento,
            lotes.totalPaid as totalPago,
            lotes.corretorId,
            loteamentos.id as loteamentoId,
            loteamentos.name as loteamentoName,
            corretores.name as corretorNome,
            corretores.phone as corretorPhone,
            corretores.email as corretorEmail,
            corretores.commissionRate as corretorTaxa
        FROM lotes
        LEFT JOIN loteamentos ON lotes.loteamentoId = loteamentos.id
        LEFT JOIN corretores ON lotes.corretorId = corretores.id
        WHERE lotes.status IN ("Vendido", "Reservado")
        ORDER BY lotes.saleDate DESC
    ';
    
    $stmt = $db->query($sql);
    $lotesVendidos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Agrupar por comprador
    $compradoresMap = [];
    
    foreach ($lotesVendidos as $lote) {
        $cpf = $lote['compradorCpf'] ?: $lote['compradorNome'] ?: 'Desconhecido';
        
        if (!isset($compradoresMap[$cpf])) {
            $compradoresMap[$cpf] = [
                'nome' => $lote['compradorNome'] ?: 'Sem nome',
                'cpf' => $lote['compradorCpf'] ?: '-',
                'lotes' => [],
                'totalComprado' => 0,
                'totalEntrada' => 0,
                'totalPago' => 0,
                'totalPendente' => 0
            ];
        }
        
        // Buscar parcelas do lote
        $stmtParcelas = $db->prepare('
            SELECT 
                id, installmentNumber, amount, dueDate, status, paidAmount
            FROM parcelas 
            WHERE loteId = ?
            ORDER BY installmentNumber
        ');
        $stmtParcelas->execute([$lote['loteId']]);
        $parcelas = $stmtParcelas->fetchAll(PDO::FETCH_ASSOC);
        
        // Calcular totais
        $parcelasPagas = array_filter($parcelas, fn($p) => $p['status'] === 'pago');
        $parcelasPendentes = array_filter($parcelas, fn($p) => $p['status'] === 'pendente');
        
        $valorParcelas = array_sum(array_column($parcelas, 'amount'));
        $valorPagoParcelas = array_sum(array_column($parcelasPagas, 'paidAmount'));
        $valorPendenteParcelas = array_sum(array_column($parcelasPendentes, 'amount'));
        
        // Valor restante a pagar
        $valorRestante = floatval($lote['valorTotal']) - floatval($lote['entrada']);
        $valorParcela = count($parcelas) > 0 ? $valorRestante / count($parcelas) : 0;
        
        $compradoresMap[$cpf]['lotes'][] = [
            'loteId' => $lote['loteId'],
            'loteName' => $lote['loteName'],
            'loteamentoId' => $lote['loteamentoId'],
            'loteamentoName' => $lote['loteamentoName'],
            'valorTotal' => floatval($lote['valorTotal']),
            'entrada' => floatval($lote['entrada']),
            'totalParcelas' => intval($lote['totalParcelas']),
            'valorParcela' => $valorParcela,
            'dataVenda' => $lote['dataVenda'],
            'statusPagamento' => $lote['statusPagamento'],
            'totalPago' => floatval($lote['totalPago']),
            'valorPendente' => $valorPendenteParcelas,
            'parcelas' => $parcelas,
            'parcelasPagas' => count($parcelasPagas),
            'parcelasPendentes' => count($parcelasPendentes),
            'corretor' => $lote['corretorNome'] ? [
                'nome' => $lote['corretorNome'],
                'phone' => $lote['corretorPhone'],
                'email' => $lote['corretorEmail'],
                'taxa' => floatval($lote['corretorTaxa'])
            ] : null
        ];
        
        // Atualizar totais do comprador
        $compradoresMap[$cpf]['totalComprado'] += floatval($lote['valorTotal']);
        $compradoresMap[$cpf]['totalEntrada'] += floatval($lote['entrada']);
        $compradoresMap[$cpf]['totalPago'] += floatval($lote['totalPago']);
        $compradoresMap[$cpf]['totalPendente'] += $valorPendenteParcelas;
    }
    
    $compradores = array_values($compradoresMap);
    
    jsonResponse($compradores);
}

// ==================== RESUMO FINANCEIRO ====================

function handleGetResumoFinanceiro() {
    requireAuth();
    $db = getDatabase();
    
    // Total de vendas (VGV)
    $stmtVgv = $db->query('SELECT COALESCE(SUM(price), 0) as total FROM lotes WHERE status = "Vendido"');
    $vgv = floatval($stmtVgv->fetch()['total']);
    
    // Total recebido
    $stmtRecebido = $db->query('SELECT COALESCE(SUM(amount), 0) as total FROM pagamentos WHERE type != "comissao"');
    $totalRecebido = floatval($stmtRecebido->fetch()['total']);
    
    // Total a receber (parcelas pendentes)
    $stmtAReceber = $db->query('
        SELECT COALESCE(SUM(amount - COALESCE(paidAmount, 0)), 0) as total 
        FROM parcelas 
        WHERE status = "pendente"
    ');
    $aReceber = floatval($stmtAReceber->fetch()['total']);
    
    // Inadimplência (parcelas atrasadas)
    $stmtInadimplencia = $db->query('
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM parcelas 
        WHERE status = "pendente" AND dueDate < date("now")
    ');
    $inadimplencia = floatval($stmtInadimplencia->fetch()['total']);
    
    // Comissões a pagar
    $stmtComissoesPendentes = $db->query('
        SELECT COALESCE(SUM(commissionAmount), 0) as total 
        FROM comissoes 
        WHERE status = "pendente"
    ');
    $comissoesPendentes = floatval($stmtComissoesPendentes->fetch()['total']);
    
    // Comissões pagas
    $stmtComissoesPagas = $db->query('
        SELECT COALESCE(SUM(commissionAmount), 0) as total 
        FROM comissoes 
        WHERE status = "pago"
    ');
    $comissoesPagas = floatval($stmtComissoesPagas->fetch()['total']);
    
    // Parcelas por status
    $stmtParcelasStatus = $db->query('
        SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM parcelas
        GROUP BY status
    ');
    $parcelasPorStatus = $stmtParcelasStatus->fetchAll(PDO::FETCH_ASSOC);
    
    // Próximos vencimentos
    $stmtProximos = $db->query('
        SELECT parcelas.*, lotes.name as loteName, lotes.buyerName,
               loteamentos.name as loteamentoName
        FROM parcelas
        LEFT JOIN lotes ON parcelas.loteId = lotes.id
        LEFT JOIN loteamentos ON lotes.loteamentoId = loteamentos.id
        WHERE parcelas.status = "pendente" AND parcelas.dueDate >= date("now")
        ORDER BY parcelas.dueDate ASC
        LIMIT 10
    ');
    $proximosVencimentos = $stmtProximos->fetchAll();
    
    // Últimos pagamentos
    $stmtUltimos = $db->query('
        SELECT pagamentos.*, lotes.name as loteName
        FROM pagamentos
        LEFT JOIN lotes ON pagamentos.loteId = lotes.id
        WHERE pagamentos.type != "comissao"
        ORDER BY pagamentos.paidAt DESC
        LIMIT 10
    ');
    $ultimosPagamentos = $stmtUltimos->fetchAll();
    
    jsonResponse([
        'vgv' => $vgv,
        'totalRecebido' => $totalRecebido,
        'aReceber' => $aReceber,
        'inadimplencia' => $inadimplencia,
        'comissoesPendentes' => $comissoesPendentes,
        'comissoesPagas' => $comissoesPagas,
        'parcelasPorStatus' => $parcelasPorStatus,
        'proximosVencimentos' => $proximosVencimentos,
        'ultimosPagamentos' => $ultimosPagamentos
    ]);
}