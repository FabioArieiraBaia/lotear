<?php
/**
 * Usuarios (Admin) handlers for LoteamentosPro
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function handleGetUsuarios() {
    $user = requireAuth();
    if (!in_array('usuarios', $user['permissions'])) {
        jsonResponse(['error' => 'Acesso negado'], 403);
    }
    
    $db = getDatabase();
    $stmt = $db->query("SELECT id, name, email, role, permissions, active, createdAt FROM admin_users WHERE active = 1 ORDER BY name ASC");
    $users = $stmt->fetchAll();
    
    // Format JSON array text back to proper JSON arrays
    foreach ($users as &$u) {
        $u['permissions'] = json_decode($u['permissions'], true);
    }
    
    jsonResponse($users);
}

function handleCreateUsuario() {
    $user = requireAuth();
    if (!in_array('usuarios', $user['permissions'])) {
        jsonResponse(['error' => 'Acesso negado'], 403);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $name = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? 'Usuario';
    $permissions = $data['permissions'] ?? [];
    
    if (!$name || !$email || !$password) {
        jsonResponse(['error' => 'Nome, e-mail e senha são obrigatórios'], 400);
    }
    
    $db = getDatabase();
    
    // Check email uniqueness
    $stmt = $db->prepare('SELECT COUNT(*) FROM admin_users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetchColumn() > 0) {
        jsonResponse(['error' => 'E-mail já está em uso'], 400);
    }
    
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $permsJSON = json_encode($permissions);
    
    $stmt = $db->prepare('INSERT INTO admin_users (name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$name, $email, $hash, $role, $permsJSON]);
    
    jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
}

function handleUpdateUsuario($id) {
    $user = requireAuth();
    if (!in_array('usuarios', $user['permissions'])) {
        jsonResponse(['error' => 'Acesso negado'], 403);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDatabase();
    
    $name = $data['name'] ?? null;
    $email = $data['email'] ?? null;
    $password = $data['password'] ?? null;
    $role = $data['role'] ?? null;
    $permissions = $data['permissions'] ?? null;
    
    $updates = [];
    $params = [];
    
    if ($name !== null) { $updates[] = 'name = ?'; $params[] = $name; }
    if ($email !== null) {
        // check if taken by other
        $stmtEx = $db->prepare('SELECT id FROM admin_users WHERE email = ? AND id != ?');
        $stmtEx->execute([$email, $id]);
        if ($stmtEx->fetch()) {
            jsonResponse(['error' => 'E-mail já está em uso por outro usuário'], 400);
        }
        $updates[] = 'email = ?'; $params[] = $email; 
    }
    if ($password !== null && $password !== '') { 
        $updates[] = 'password = ?'; 
        $params[] = password_hash($password, PASSWORD_DEFAULT); 
    }
    if ($role !== null) { $updates[] = 'role = ?'; $params[] = $role; }
    if ($permissions !== null) { $updates[] = 'permissions = ?'; $params[] = json_encode($permissions); }
    
    if (empty($updates)) {
        jsonResponse(['success' => true]);
    }
    
    $params[] = $id;
    $sql = 'UPDATE admin_users SET ' . implode(', ', $updates) . ' WHERE id = ?';
    $db->prepare($sql)->execute($params);
    
    // If we changed permissions of ourself, token may still be valid but permissions load dynamically
    
    jsonResponse(['success' => true]);
}

function handleDeleteUsuario($id) {
    $user = requireAuth();
    if (!in_array('usuarios', $user['permissions'])) {
        jsonResponse(['error' => 'Acesso negado'], 403);
    }
    
    $db = getDatabase();
    
    // Check if it's the last admin
    if ($user['id'] == $id) {
        jsonResponse(['error' => 'Você não pode excluir a si mesmo'], 400);
    }
    
    $stmt = $db->prepare('UPDATE admin_users SET active = 0, token = NULL WHERE id = ?');
    $stmt->execute([$id]);
    
    jsonResponse(['success' => true]);
}
