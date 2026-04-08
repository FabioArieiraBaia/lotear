<?php
/**
 * Authentication handlers for LoteamentosPro
 */

require_once __DIR__ . '/db.php';

function handleLogin() {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    
    $db = getDatabase();
    
    // Check if table is empty, if so create default admin (using prepared statement)
    $stmt = $db->query('SELECT COUNT(*) FROM admin_users');
    if ($stmt->fetchColumn() == 0) {
        $hash = password_hash('admin', PASSWORD_DEFAULT);
        $perms = json_encode(['loteamentos', 'apresentacao', 'financeiro', 'compradores', 'contatos', 'corretores', 'usuarios']);
        $stmtInsert = $db->prepare('INSERT INTO admin_users (name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?)');
        $stmtInsert->execute(['Administrador', 'admin', $hash, 'Admin', $perms]);
    }
    
    // Database authentication only
    $stmt = $db->prepare('SELECT * FROM admin_users WHERE email = ? AND active = 1');
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        $token = bin2hex(random_bytes(32));
        $db->prepare('UPDATE admin_users SET token = ? WHERE id = ?')->execute([$token, $user['id']]);
        
        jsonResponse([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'permissions' => json_decode($user['permissions'], true)
            ]
        ]);
    } else {
        jsonResponse(['error' => 'Invalid credentials'], 401);
    }
}

function requireAuth() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    $token = '';
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = $matches[1];
    }
    
    if (!$token) {
        jsonResponse(['error' => 'Unauthorized'], 401);
        exit;
    }
    
    require_once __DIR__ . '/db.php';
    $db = getDatabase();
    $stmt = $db->prepare('SELECT * FROM admin_users WHERE token = ? AND active = 1');
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonResponse(['error' => 'Unauthorized'], 401);
        exit;
    }
    
    $user['permissions'] = json_decode($user['permissions'], true);
    return $user;
}
