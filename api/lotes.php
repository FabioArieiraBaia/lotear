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

function handleCreateLote() {
    requireAuth();
    $db = getDatabase();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $db->prepare('
        INSERT INTO lotes (
            loteamentoId, name, polygon, area, status, owner, photoUrl, notes,
            price, buyerName, buyerCpf, brokerName, paymentStatus, downPayment, installments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        'downPayment', 'installments'
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
    
    $stmt = $db->prepare('DELETE FROM lotes WHERE id = ?');
    $stmt->execute([$id]);
    
    jsonResponse(['success' => true]);
}
