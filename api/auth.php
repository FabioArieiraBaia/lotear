<?php
/**
 * Authentication handlers for LoteamentosPro
 */

define('ADMIN_USERNAME', 'admin');
define('ADMIN_PASSWORD', 'admin');
define('ADMIN_TOKEN', 'admin-token-secret-123');

function handleLogin() {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    
    if ($username === ADMIN_USERNAME && $password === ADMIN_PASSWORD) {
        jsonResponse(['token' => ADMIN_TOKEN]);
    } else {
        jsonResponse(['error' => 'Invalid credentials'], 401);
    }
}

function requireAuth() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if ($authHeader !== 'Bearer ' . ADMIN_TOKEN) {
        jsonResponse(['error' => 'Unauthorized'], 401);
        exit;
    }
}
