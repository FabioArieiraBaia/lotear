<?php
/**
 * Lotes endpoint handlers
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function handleGetAllLotes() {
    requireAuth();
    $db = getDatabase();
    
    $stmt = $db->query('
        SELECT lotes.*, loteamentos.name as loteamentoName 
        FROM lotes 
        LEFT JOIN loteamentos ON lotes.loteamentoId = loteamentos.id
    ');
    $rows = $stmt->fetchAll();
    
    $lotes = array_map(function($r) {
        $r['polygon'] = json_decode($r['polygon'], true);
        return $r;
    }, $rows);
    
    jsonResponse($lotes);
}

function handleGetLote($id) {
    $db = getDatabase();
    $stmt = $db->prepare('SELECT * FROM lotes WHERE id = ?');
    $stmt->execute([$id]);
    $lote = $stmt->fetch();
    
    if ($lote) {
        $lote['polygon'] = json_decode($lote['polygon'], true);
        jsonResponse($lote);
    } else {
        jsonResponse(['error' => 'Lote não encontrado'], 404);
    }
}

function handleCreateLote() {
    requireAuth();
    $db = getDatabase();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $db->prepare('
        INSERT INTO lotes (
            loteamentoId, name, polygon, area, status, owner, photoUrl, notes,
            price, buyerName, buyerCpf, brokerName, paymentStatus, downPayment, installments, commissionRate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    
    $stmt->execute([
        $data['loteamentoId'] ?? null,
        $data['name'] ?? '',
        json_encode($data['polygon'] ?? []),
        $data['area'] ?? '',
        $data['status'] ?? '',
        $data['owner'] ?? '',
        $data['photoUrl'] ?? '',
        $data['notes'] ?? '',
        $data['price'] ?? 0,
        $data['buyerName'] ?? '',
        $data['buyerCpf'] ?? '',
        $data['brokerName'] ?? '',
        $data['paymentStatus'] ?? 'pendente',
        $data['downPayment'] ?? 0,
        $data['installments'] ?? 1,
        $data['commissionRate'] ?? null,
    ]);
    
    $id = $db->lastInsertId();
    jsonResponse(['id' => (int)$id]);
}

function handleUpdateLote($id) {
    requireAuth();
    $db = getDatabase();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $fields = [];
    $values = [];
    
    $allowedFields = [
        'name', 'area', 'status', 'owner', 'photoUrl', 'notes',
        'price', 'buyerName', 'buyerCpf', 'brokerName', 'paymentStatus',
        'downPayment', 'installments', 'corretorId', 'saleDate', 'commissionRate'
    ];
    
    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $data)) {
            $fields[] = "{$field} = ?";
            $values[] = $data[$field];
        }
    }
    
    // Handle polygon separately (needs JSON encoding)
    if (array_key_exists('polygon', $data)) {
        $fields[] = "polygon = ?";
        $values[] = json_encode($data['polygon']);
    }
    
    if (empty($fields)) {
        jsonResponse(['success' => true]);
        return;
    }
    
    $values[] = $id;
    $sql = "UPDATE lotes SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($values);
    
    jsonResponse(['success' => true]);
}

function handleDeleteLote($id) {
    requireAuth();
    $db = getDatabase();
    
    $db->beginTransaction();
    try {
        // Deletar registros relacionados (cascata)
        $db->prepare('DELETE FROM pagamentos WHERE loteId = ?')->execute([$id]);
        $db->prepare('DELETE FROM parcelas WHERE loteId = ?')->execute([$id]);
        $db->prepare('DELETE FROM comissoes WHERE loteId = ?')->execute([$id]);
        
        // Deletar mídias físicas se existirem
        $stmt = $db->prepare('SELECT url FROM lote_midia WHERE loteId = ? AND type = "image"');
        $stmt->execute([$id]);
        $images = $stmt->fetchAll();
        foreach ($images as $img) {
            $filePath = __DIR__ . '/../' . $img['url'];
            if (file_exists($filePath)) @unlink($filePath);
        }
        $db->prepare('DELETE FROM lote_midia WHERE loteId = ?')->execute([$id]);

        // Deletar o lote
        $db->prepare('DELETE FROM lotes WHERE id = ?')->execute([$id]);
        
        $db->commit();
        jsonResponse(['success' => true]);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['error' => 'Erro ao deletar lote: ' . $e->getMessage()], 500);
    }
}

function handleGetLoteMidia($loteId) {
    $db = getDatabase();
    $stmt = $db->prepare('SELECT * FROM lote_midia WHERE loteId = ? ORDER BY createdAt DESC');
    $stmt->execute([$loteId]);
    jsonResponse($stmt->fetchAll());
}

function handleUploadLoteMidia($loteId) {
    requireAuth();
    $db = getDatabase();
    
    if (!empty($_FILES['image'])) {
        $file = $_FILES['image'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename = 'lote_' . $loteId . '_' . time() . '_' . uniqid() . '.' . $ext;
        $targetDir = __DIR__ . '/../uploads/';
        if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);
        
        if (move_uploaded_file($file['tmp_name'], $targetDir . $filename)) {
            $url = 'uploads/' . $filename;
            $stmt = $db->prepare('INSERT INTO lote_midia (loteId, type, url) VALUES (?, ?, ?)');
            $stmt->execute([$loteId, 'image', $url]);
            jsonResponse(['id' => $db->lastInsertId(), 'url' => $url, 'type' => 'image']);
        } else {
            jsonResponse(['error' => 'Falha no upload do arquivo'], 500);
        }
    } else {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!empty($data['youtubeUrl'])) {
            $url = $data['youtubeUrl'];
            $stmt = $db->prepare('INSERT INTO lote_midia (loteId, type, url) VALUES (?, ?, ?)');
            $stmt->execute([$loteId, 'youtube', $url]);
            jsonResponse(['id' => $db->lastInsertId(), 'url' => $url, 'type' => 'youtube']);
        } else {
            jsonResponse(['error' => 'Nenhuma imagem ou URL Youtube enviada'], 400);
        }
    }
}

function handleDeleteMidia($id) {
    requireAuth();
    $db = getDatabase();
    
    $stmt = $db->prepare('SELECT type, url FROM lote_midia WHERE id = ?');
    $stmt->execute([$id]);
    $midia = $stmt->fetch();
    
    if ($midia) {
        if ($midia['type'] === 'image') {
            $filePath = __DIR__ . '/../' . $midia['url'];
            if (file_exists($filePath)) @unlink($filePath);
        }
        $db->prepare('DELETE FROM lote_midia WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    } else {
        jsonResponse(['error' => 'Mídia não encontrada'], 404);
    }
}
