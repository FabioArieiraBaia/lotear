<?php
require_once __DIR__ . '/api/db.php';
$db = getDatabase();
$stmt = $db->query("SELECT * FROM lote_midia");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
