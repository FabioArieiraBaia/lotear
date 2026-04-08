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

    // Parse polygon JSON strings and add first media image
    $lotes = array_map(function($r) use ($db) {
        $r['polygon'] = json_decode($r['polygon'], true);

        // If photoUrl is empty, get first image from lote_midia
        if (empty($r['photoUrl'])) {
            $stmtMidia = $db->prepare('SELECT url FROM lote_midia WHERE loteId = ? AND type = "image" ORDER BY createdAt ASC LIMIT 1');
            $stmtMidia->execute([$r['id']]);
            $firstMidia = $stmtMidia->fetch();
            if ($firstMidia) {
                $r['photoUrl'] = $firstMidia['url'];
            }
        }

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
    
    // Deletar leads do loteamento
    $stmt = $db->prepare('DELETE FROM leads WHERE loteamentoId = ?');
    $stmt->execute([$id]);

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

function handleUpdateLoteamento($id) {
    requireAuth();
    $db = getDatabase();

    // Buscar loteamento atual
    $stmt = $db->prepare('SELECT * FROM loteamentos WHERE id = ?');
    $stmt->execute([$id]);
    $loteamento = $stmt->fetch();

    if (!$loteamento) {
        jsonResponse(['error' => 'Loteamento não encontrado'], 404);
        return;
    }

    // Parse multipart/form-data for PUT requests
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $name = $loteamento['name'];
    $imageUrl = $loteamento['imageUrl'];

    // Handle multipart/form-data
    if (stripos($contentType, 'multipart/form-data') !== false) {
        // Read raw input and parse
        $rawData = file_get_contents('php://input');
        $boundary = substr($contentType, strpos($contentType, 'boundary=') + 9);

        $parts = explode('--' . $boundary, $rawData);
        foreach ($parts as $part) {
            if (empty($part) || $part == "--\r\n") continue;

            // Parse each part
            if (strpos($part, 'name="name"') !== false) {
                // Extract name value
                $lines = explode("\r\n", $part);
                $value = end($lines);
                if (!empty($value)) {
                    $name = $value;
                }
            }

            if (strpos($part, 'name="image"') !== false && strpos($part, 'filename=') !== false) {
                // Extract file info
                preg_match('/filename="([^"]+)"/', $part, $fileMatch);
                $filename = $fileMatch[1] ?? '';
                $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
                $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];

                if (in_array($ext, $allowedExts)) {
                    // Find content after double newline
                    $contentStart = strpos($part, "\r\n\r\n");
                    if ($contentStart !== false) {
                        $fileContent = substr($part, $contentStart + 4);
                        $fileContent = rtrim($fileContent, "\r\n-");

                        $uploadDir = __DIR__ . '/../uploads/';
                        if (!is_dir($uploadDir)) {
                            mkdir($uploadDir, 0755, true);
                        }

                        $uniqueName = time() . '-' . mt_rand(100000000, 999999999) . '.' . $ext;
                        $destPath = $uploadDir . $uniqueName;

                        if (file_put_contents($destPath, $fileContent)) {
                            // Delete old image if exists
                            if (!empty($loteamento['imageUrl'])) {
                                $oldPath = __DIR__ . '/../' . $loteamento['imageUrl'];
                                if (file_exists($oldPath)) {
                                    unlink($oldPath);
                                }
                            }
                            $imageUrl = 'uploads/' . $uniqueName;
                        }
                    }
                }
            }
        }
    } else {
        // Handle JSON body
        $data = json_decode(file_get_contents('php://input'), true);
        if ($data) {
            $name = $data['name'] ?? $loteamento['name'];
        }
    }

    $stmt = $db->prepare('UPDATE loteamentos SET name = ?, imageUrl = ? WHERE id = ?');
    $stmt->execute([$name, $imageUrl, $id]);

    jsonResponse([
        'success' => true,
        'id' => (int)$id,
        'name' => $name,
        'imageUrl' => $imageUrl
    ]);
}
