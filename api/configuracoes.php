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
    requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid data']);
        return;
    }

    try {
        $db->beginTransaction();
        $stmt = $db->prepare("INSERT INTO configuracoes (chave, valor, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP) 
                             ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, updatedAt = CURRENT_TIMESTAMP");
        
        foreach ($data as $key => $value) {
            $stmt->execute([$key, $value]);
        }
        
        $db->commit();
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        $db->rollBack();
        error_log($e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Erro interno do servidor']);
    }
}
