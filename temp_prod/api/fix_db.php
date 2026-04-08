<?php
$db = new PDO('sqlite:C:/xampp/htdocs/lotear/data/database.sqlite');
$stmt = $db->query("SELECT id, notes FROM pagamentos WHERE notes LIKE '%: R$ %'");
while ($row = $stmt->fetch()) {
    $notes = str_replace(
        ['Juros: R$ ', 'Desconto: R$ ', 'Multa: R$ '], 
        ['Juros: ', 'Desconto: ', 'Multa: '], 
        $row['notes']
    );
    // Add % sign
    $notes = preg_replace('/(Juros|Desconto|Multa): ([\d,.]+)( \| | - |$)/', '$1: $2%$3', $notes);
    $db->prepare('UPDATE pagamentos SET notes = ? WHERE id = ?')->execute([$notes, $row['id']]);
}
echo "OK.\n";
