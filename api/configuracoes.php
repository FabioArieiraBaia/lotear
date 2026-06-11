<?php
/**
 * Configurações API handler
 */

function handleGetConfig($db) {
    try {
        $stmt = $db->query("SELECT chave, valor FROM configuracoes");
        $results = $stmt->fetchAll();
        $config = [];
        foreach ($results as $row) {
            $config[$row['chave']] = $row['valor'];
        }
        echo json_encode($config);
    } catch (PDOException $e) {
        error_log($e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Erro interno do servidor']);
    }
}

function handleUpdateConfig($db) {
    require_once 'auth.php';
    $user = requireAuth();
    if (!in_array('configuracoes', $user['permissions'])) {
        jsonResponse(['error' => 'Acesso negado'], 403);
    }
    
    $configs = [];
    
    // Check if multipart/form-data
    if (!empty($_POST)) {
        foreach ($_POST as $key => $value) {
            $configs[$key] = $value;
        }
    } else {
        $json = json_decode(file_get_contents('php://input'), true);
        if ($json && is_array($json)) {
            $configs = $json;
        }
    }
    
    // Handle logo upload if exists
    if (!empty($_FILES['logo'])) {
        $file = $_FILES['logo'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        if (!in_array($ext, $allowedExts)) {
            jsonResponse(['error' => 'Tipo de arquivo de logo inválido. Use: ' . implode(', ', $allowedExts)], 400);
        }
        
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);
        $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
        if (!in_array($mime, $allowedMimes)) {
            jsonResponse(['error' => 'MIME-type de logo inválido.'], 400);
        }
        
        $filename = 'logo_' . time() . '.' . $ext;
        $targetDir = __DIR__ . '/../uploads/';
        if (!is_dir($targetDir)) mkdir($targetDir, 0755, true);
        
        if (move_uploaded_file($file['tmp_name'], $targetDir . $filename)) {
            $configs['logo_url'] = 'uploads/' . $filename;
        } else {
            jsonResponse(['error' => 'Falha no upload do logo.'], 500);
        }
    }

    try {
        $db->beginTransaction();
        $stmt = $db->prepare("INSERT INTO configuracoes (chave, valor, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP) 
                             ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, updatedAt = CURRENT_TIMESTAMP");
        
        foreach ($configs as $key => $value) {
            $stmt->execute([$key, $value]);
        }
        
        $db->commit();
        jsonResponse(['success' => true]);
    } catch (PDOException $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log($e->getMessage());
        jsonResponse(['error' => 'Erro interno do servidor ao salvar configurações'], 500);
    }
}
