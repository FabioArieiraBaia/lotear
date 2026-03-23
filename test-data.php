<?php
$db = new PDO('sqlite:./data/database.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== TABELAS DO BANCO ===\n\n";
$stmt = $db->query("SELECT name FROM sqlite_master WHERE type='table'");
foreach($stmt->fetchAll(PDO::FETCH_COLUMN) as $t) {
    echo $t . "\n";
}

echo "\n=== LIMPANDO BANCO DE DADOS ===\n\n";

// Limpar todas as tabelas exceto admins (se existir)
try {
    $db->exec('DELETE FROM pagamentos');
    echo "✓ Pagamentos limpos\n";
} catch (Exception $e) {}

try {
    $db->exec('DELETE FROM parcelas');
    echo "✓ Parcelas limpas\n";
} catch (Exception $e) {}

try {
    $db->exec('DELETE FROM comissoes');
    echo "✓ Comissões limpas\n";
} catch (Exception $e) {}

try {
    $db->exec('DELETE FROM corretores');
    echo "✓ Corretores limpos\n";
} catch (Exception $e) {}

try {
    $db->exec('DELETE FROM leads');
    echo "✓ Leads limpos\n";
} catch (Exception $e) {}

// Resetar lotes para disponível
$db->exec('UPDATE lotes SET status = "Disponível", buyerName = NULL, buyerCpf = NULL, downPayment = 0, installments = 0, totalPaid = 0, paymentStatus = "pendente", brokerName = NULL, saleDate = NULL, notes = NULL, corretorId = NULL WHERE status IN ("Vendido", "Reservado")');
echo "✓ Lotes resetados para Disponível\n";

echo "\n=== SITUAÇÃO ATUAL ===\n";
$stmt = $db->query('SELECT COUNT(*) as total FROM lotes WHERE status = "Disponível"');
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo "Lotes disponíveis: " . $row['total'] . "\n";

$stmt = $db->query('SELECT COUNT(*) as total FROM lotes WHERE status IN ("Vendido", "Reservado")');
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo "Lotes vendidos/reservados: " . $row['total'] . "\n";

echo "\n✓ Banco de dados limpo com sucesso!\n";