<?php
/**
 * Loteamentos endpoint handlers
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function handleGetLoteamentos() {
    $db = getDatabase();
    $stmt = $db->query('SELECT * FROM loteamentos ORDER BY createdAt DESC');
    $rows = $stmt->fetchAll();
    jsonResponse($rows);
}

function handleCreateLoteamento() {
    requireAuth();
    $db = getDatabase();
    
    $name = $_POST['name'] ?? '';
    $imageUrl = '';
    
    // Handle file upload
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/../uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $uniqueName = time() . '-' . mt_rand(100000000, 999999999) . '.' . $ext;
        $destPath = $uploadDir . $uniqueName;
        
        if (move_uploaded_file($_FILES['image']['tmp_name'], $destPath)) {
            $imageUrl = '/uploads/' . $uniqueName;
        }
    }
    
    $stmt = $db->prepare('INSERT INTO loteamentos (name, imageUrl) VALUES (?, ?)');
    $stmt->execute([$name, $imageUrl]);
    $id = $db->lastInsertId();
    
    jsonResponse(['id' => (int)$id, 'name' => $name, 'imageUrl' => $imageUrl]);
}

function handleGetLoteamento($id) {
    $db = getDatabase();
    $stmt = $db->prepare('SELECT * FROM loteamentos WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    
    if (!$row) {
        jsonResponse(['error' => 'Not found'], 404);
        return;
    }
    
    jsonResponse($row);
}

function handleGetLoteamentoLotes($id) {
    $db = getDatabase();
    $stmt = $db->prepare('SELECT * FROM lotes WHERE loteamentoId = ?');
    $stmt->execute([$id]);
    $rows = $stmt->fetchAll();
    
    // Parse polygon JSON strings
    $lotes = array_map(function($r) {
        $r['polygon'] = json_decode($r['polygon'], true);
        return $r;
    }, $rows);
    
    jsonResponse($lotes);
}
