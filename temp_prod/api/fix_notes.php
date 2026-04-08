<?php
$db = new PDO('sqlite:' . __DIR__ . '/db.sqlite');
$stmt = $db->query("SELECT id, notes FROM pagamentos WHERE notes LIKE '%: R$ %'");
while ($row = $stmt->fetch()) {
    $notes = str_replace(
        ['Juros: R$ ', 'Desconto: R$ ', 'Multa: R$ '], 
        ['Juros: ', 'Desconto: ', 'Multa: '], 
        $row['notes']
    );
    // Adicionar o % depois dos números (antes do espaço, pipe, traço ou final da string)
    $notes = preg_replace('/(Juros: [\d,.]+)( \| | - |$)/', '$1%$2', $notes);
    $notes = preg_replace('/(Desconto: [\d,.]+)( \| | - |$)/', '$1%$2', $notes);
    $notes = preg_replace('/(Multa: [\d,.]+)( \| | - |$)/', '$1%$2', $notes);
    
    $db->prepare('UPDATE pagamentos SET notes = ? WHERE id = ?')->execute([$notes, $row['id']]);
}
echo "Database entries updated successfully.";
