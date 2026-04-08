<?php
/**
 * Corretores endpoint handlers
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function handleGetAllCorretores() {
    requireAuth();
    $db = getDatabase();
    
    $stmt = $db->query('
        SELECT c.*, 
            (SELECT COUNT(*) FROM lotes WHERE lotes.corretorId = c.id AND lotes.status = "Vendido") as totalSales,
            (SELECT COALESCE(SUM(price), 0) FROM lotes WHERE lotes.corretorId = c.id AND lotes.status = "Vendido") as totalVgv
        FROM corretores c
        ORDER BY c.name ASC
    ');
    $corretores = $stmt->fetchAll();
    
    // Buscar comissões de cada corretor
    foreach ($corretores as &$corretor) {
        $stmtComm = $db->prepare('
            SELECT 
                COUNT(*) as totalComissoes,
                COALESCE(SUM(commissionAmount), 0) as totalComissao,
                COALESCE(SUM(CASE WHEN status = "pago" THEN commissionAmount ELSE 0 END), 0) as comissaoPaga,
                COALESCE(SUM(CASE WHEN status = "pendente" THEN commissionAmount ELSE 0 END), 0) as comissaoPendente
            FROM comissoes WHERE corretorId = ?
        ');
        $stmtComm->execute([$corretor['id']]);
        $comissaoData = $stmtComm->fetch();
        $corretor = array_merge($corretor, $comissaoData);
        
        // Buscar comissões recentes (detalhamento)
        $stmtRecent = $db->prepare('
            SELECT c.*, l.name as loteName, loteamentos.name as loteamentoName
            FROM comissoes c
            LEFT JOIN lotes l ON c.loteId = l.id
            LEFT JOIN loteamentos ON l.loteamentoId = loteamentos.id
            WHERE c.corretorId = ?
            ORDER BY c.createdAt DESC
            LIMIT 5
        ');
        $stmtRecent->execute([$corretor['id']]);
        $corretor['recentCommissions'] = $stmtRecent->fetchAll();
    }
    
    jsonResponse($corretores);
}

function handleGetCorretor($id) {
    requireAuth();
    $db = getDatabase();
    
    $stmt = $db->prepare('SELECT * FROM corretores WHERE id = ?');
    $stmt->execute([$id]);
    $corretor = $stmt->fetch();
    
    if (!$corretor) {
        jsonResponse(['error' => 'Corretor não encontrado'], 404);
        return;
    }
    
    // Buscar vendas do corretor
    $stmtVendas = $db->prepare('
        SELECT lotes.*, loteamentos.name as loteamentoName 
        FROM lotes 
        LEFT JOIN loteamentos ON lotes.loteamentoId = loteamentos.id
        WHERE lotes.corretorId = ?
        ORDER BY lotes.saleDate DESC
    ');
    $stmtVendas->execute([$id]);
    $corretor['vendas'] = $stmtVendas->fetchAll();
    
    // Buscar comissões
    $stmtComm = $db->prepare('
        SELECT * FROM comissoes WHERE corretorId = ? ORDER BY createdAt DESC
    ');
    $stmtComm->execute([$id]);
    $corretor['comissoes'] = $stmtComm->fetchAll();
    
    jsonResponse($corretor);
}

function handleCreateCorretor() {
    requireAuth();
    $db = getDatabase();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $db->prepare('
        INSERT INTO corretores (name, email, phone, cpf, creci, commissionRate, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');
    
    $stmt->execute([
        $data['name'] ?? '',
        $data['email'] ?? '',
        $data['phone'] ?? '',
        $data['cpf'] ?? '',
        $data['creci'] ?? '',
        $data['commissionRate'] ?? 0.05,
        $data['active'] ?? 1,
    ]);
    
    $id = $db->lastInsertId();
    jsonResponse(['id' => (int)$id, 'success' => true]);
}

function handleUpdateCorretor($id) {
    requireAuth();
    $db = getDatabase();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $allowedFields = ['name', 'email', 'phone', 'cpf', 'creci', 'commissionRate', 'active'];
    $fields = [];
    $values = [];
    
    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $data)) {
            $fields[] = "{$field} = ?";
            $values[] = $data[$field];
        }
    }
    
    if (empty($fields)) {
        jsonResponse(['success' => true]);
        return;
    }
    
    $values[] = $id;
    $sql = "UPDATE corretores SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($values);
    
    jsonResponse(['success' => true]);
}

function handleDeleteCorretor($id) {
    requireAuth();
    $db = getDatabase();
    
    // Verificar se há vendas vinculadas
    $stmt = $db->prepare('SELECT COUNT(*) FROM lotes WHERE corretorId = ?');
    $stmt->execute([$id]);
    $count = $stmt->fetchColumn();
    
    if ($count > 0) {
        jsonResponse(['error' => 'Não é possível excluir. Este corretor possui vendas vinculadas.'], 400);
        return;
    }
    
    $stmt = $db->prepare('DELETE FROM corretores WHERE id = ?');
    $stmt->execute([$id]);
    
    jsonResponse(['success' => true]);
}