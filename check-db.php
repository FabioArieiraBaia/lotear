<?php
require_once 'api/db.php';
$db = getDatabase();

echo "=== VERIFICANDO BANCO DE DADOS ===\n\n";

// Verificar pagamentos
$stmt = $db->query('SELECT * FROM pagamentos ORDER BY id DESC');
$pagamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "PAGAMENTOS: " . count($pagamentos) . "\n";
foreach ($pagamentos as $p) {
    echo "  ID: {$p['id']} | Lote: {$p['loteId']} | Tipo: {$p['type']} | Valor: {$p['amount']}\n";
}

echo "\n";

// Verificar parcelas
$stmt = $db->query('SELECT * FROM parcelas');
$parcelas = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "PARCELAS: " . count($parcelas) . "\n";
foreach ($parcelas as $p) {
    echo "  ID: {$p['id']} | Lote: {$p['loteId']} | Num: {$p['installmentNumber']}/{$p['totalInstallments']} | Valor: {$p['amount']} | Status: {$p['status']}\n";
}

echo "\n";

// Verificar lotes
$stmt = $db->query('SELECT id, name, status, downPayment, installments, buyerName FROM lotes');
$lotes = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "LOTES:\n";
foreach ($lotes as $l) {
    echo "  ID: {$l['id']} | Nome: {$l['name']} | Status: {$l['status']} | Entrada: {$l['downPayment']} | Parcelas: {$l['installments']} | Comprador: {$l['buyerName']}\n";
}

echo "\n";

// Verificar comissões
$stmt = $db->query('SELECT * FROM comissoes');
$comissoes = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "COMISSÕES: " . count($comissoes) . "\n";
foreach ($comissoes as $c) {
    echo "  ID: {$c['id']} | Corretor: {$c['corretorId']} | Lote: {$c['loteId']} | Valor: {$c['commissionAmount']} | Status: {$c['status']}\n";
}