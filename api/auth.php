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
    
    // Rate Limiting (SEC-08)
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $now = time();
    $blockTime = 15 * 60; // 15 minutos
    $maxAttempts = 5;
    
    // Limpar tentativas antigas
    $db->prepare('DELETE FROM login_attempts WHERE lastAttempt < ?')->execute([$now - $blockTime]);
    
    // Verificar tentativas atuais
    $stmtLimit = $db->prepare('SELECT * FROM login_attempts WHERE ip = ?');
    $stmtLimit->execute([$ip]);
    $attempt = $stmtLimit->fetch();
    
    if ($attempt && $attempt['attempts'] >= $maxAttempts && ($now - $attempt['lastAttempt']) < $blockTime) {
        $timeLeft = $blockTime - ($now - $attempt['lastAttempt']);
        jsonResponse(['error' => 'Muitas tentativas de login. Tente novamente em ' . ceil($timeLeft / 60) . ' minutos.'], 429);
    }
    
    // Check if table is empty, if so create default admin with strong generated password (SEC-02)
    $stmt = $db->query('SELECT COUNT(*) FROM admin_users');
    if ($stmt->fetchColumn() == 0) {
        $randomPassword = bin2hex(random_bytes(6)); // 12 caracteres
        $hash = password_hash($randomPassword, PASSWORD_DEFAULT);
        $perms = json_encode(['loteamentos', 'apresentacao', 'financeiro', 'compradores', 'contatos', 'corretores', 'usuarios']);
        $stmtInsert = $db->prepare('INSERT INTO admin_users (name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?)');
        $stmtInsert->execute(['Administrador', 'admin', $hash, 'Admin', $perms]);
        
        file_put_contents(__DIR__ . '/../admin_setup_credentials.txt', "Email: admin\nSenha: $randomPassword\n\nATENÇÃO: Delete este arquivo após o primeiro login!");
    }
    
    // Database authentication only
    $stmt = $db->prepare('SELECT * FROM admin_users WHERE email = ? AND active = 1');
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        // Limpar tentativas de login
        $db->prepare('DELETE FROM login_attempts WHERE ip = ?')->execute([$ip]);
        
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', $now + 24 * 3600); // Token expira em 24 horas (SEC-05)
        
        $db->prepare('UPDATE admin_users SET token = ?, token_expires_at = ? WHERE id = ?')->execute([$token, $expiresAt, $user['id']]);
        
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
        // Incrementar tentativas
        if ($attempt) {
            $db->prepare('UPDATE login_attempts SET attempts = attempts + 1, lastAttempt = ? WHERE ip = ?')->execute([$now, $ip]);
        } else {
            $db->prepare('INSERT INTO login_attempts (ip, attempts, lastAttempt) VALUES (?, 1, ?)')->execute([$ip, $now]);
        }
        jsonResponse(['error' => 'Credenciais inválidas'], 401);
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
    
    // Verificar expiração do token (SEC-05)
    if (!empty($user['token_expires_at'])) {
        $expires = strtotime($user['token_expires_at']);
        if ($expires < time()) {
            $db->prepare('UPDATE admin_users SET token = NULL, token_expires_at = NULL WHERE id = ?')->execute([$user['id']]);
            jsonResponse(['error' => 'Sessão expirada. Faça login novamente.'], 401);
            exit;
        }
    }
    
    $user['permissions'] = json_decode($user['permissions'], true);
    return $user;
}
