<?php
/**
 * Leads endpoint handlers
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function handleGetLeads() {
    requireAuth();
    $db = getDatabase();
    
    $stmt = $db->query('
        SELECT l.*, lt.name as loteName, lo.name as loteamentoName 
        FROM leads l
        LEFT JOIN lotes lt ON l.loteId = lt.id
        LEFT JOIN loteamentos lo ON l.loteamentoId = lo.id
        ORDER BY l.createdAt DESC
    ');
    $rows = $stmt->fetchAll();
    
    jsonResponse($rows);
}

function handleCreateLead() {
    // Public endpoint - no auth required
    $db = getDatabase();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $db->prepare('INSERT INTO leads (loteamentoId, loteId, name, email, phone) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([
        $data['loteamentoId'] ?? null,
        $data['loteId'] ?? null,
        $data['name'] ?? '',
        $data['email'] ?? '',
        $data['phone'] ?? '',
    ]);
    
    $id = $db->lastInsertId();
    jsonResponse(['id' => (int)$id], 201);
}

function handleUpdateLead($id) {
    requireAuth();
    $db = getDatabase();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $status = $data['status'] ?? '';
    
    $stmt = $db->prepare('UPDATE leads SET status = ? WHERE id = ?');
    $stmt->execute([$status, $id]);
    
    jsonResponse(['success' => true]);
}
