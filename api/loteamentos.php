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
        
        // Validar extensão do arquivo
        $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
        $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
        if (!in_array($ext, $allowedExts)) {
            jsonResponse(['error' => 'Tipo de arquivo não permitido. Use: ' . implode(', ', $allowedExts)], 400);
            return;
        }
        
        // Validar tamanho (max 20MB)
        if ($_FILES['image']['size'] > 20 * 1024 * 1024) {
            jsonResponse(['error' => 'Arquivo muito grande. Máximo: 20MB'], 400);
            return;
        }
        
        $uniqueName = time() . '-' . mt_rand(100000000, 999999999) . '.' . $ext;
        $destPath = $uploadDir . $uniqueName;
        
        if (move_uploaded_file($_FILES['image']['tmp_name'], $destPath)) {
            $imageUrl = 'uploads/' . $uniqueName;
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

function handleDeleteLoteamento($id) {
    requireAuth();
    $db = getDatabase();
    
    // Buscar imagem para deletar
    $stmt = $db->prepare('SELECT imageUrl FROM loteamentos WHERE id = ?');
    $stmt->execute([$id]);
    $loteamento = $stmt->fetch();
    
    if (!$loteamento) {
        jsonResponse(['error' => 'Loteamento não encontrado'], 404);
        return;
    }
    
    // Buscar IDs dos lotes para deletar registros relacionados
    $stmt = $db->prepare('SELECT id FROM lotes WHERE loteamentoId = ?');
    $stmt->execute([$id]);
    $loteIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (!empty($loteIds)) {
        $placeholders = implode(',', array_fill(0, count($loteIds), '?'));
        
        // Deletar pagamentos
        $stmt = $db->prepare("DELETE FROM pagamentos WHERE loteId IN ($placeholders)");
        $stmt->execute($loteIds);
        
        // Deletar parcelas
        $stmt = $db->prepare("DELETE FROM parcelas WHERE loteId IN ($placeholders)");
        $stmt->execute($loteIds);
        
        // Deletar comissões
        $stmt = $db->prepare("DELETE FROM comissoes WHERE loteId IN ($placeholders)");
        $stmt->execute($loteIds);
    }
    
    // Deletar lotes
    $stmt = $db->prepare('DELETE FROM lotes WHERE loteamentoId = ?');
    $stmt->execute([$id]);
    
    // Deletar loteamento
    $stmt = $db->prepare('DELETE FROM loteamentos WHERE id = ?');
    $stmt->execute([$id]);
    
    // Deletar arquivo de imagem
    if (!empty($loteamento['imageUrl'])) {
        $imagePath = __DIR__ . '/../' . $loteamento['imageUrl'];
        if (file_exists($imagePath)) {
            unlink($imagePath);
        }
    }
    
    jsonResponse(['success' => true, 'message' => 'Loteamento deletado com sucesso']);
}
