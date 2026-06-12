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
        
        // Validar MIME type real (SEC-06)
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($_FILES['image']['tmp_name']);
        $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!in_array($mime, $allowedMimes)) {
            jsonResponse(['error' => 'Conteúdo do arquivo inválido para o tipo especificado.'], 400);
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

    // Parse multipart/form-data for PUT/POST requests
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $name = $loteamento['name'];
    $imageUrl = $loteamento['imageUrl'];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (isset($_POST['name'])) {
            $name = trim($_POST['name']);
        }
        
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
            $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
            
            if (in_array($ext, $allowedExts)) {
                $uploadDir = __DIR__ . '/../uploads/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }

                $uniqueName = time() . '-' . mt_rand(100000000, 999999999) . '.' . $ext;
                $destPath = $uploadDir . $uniqueName;

                if (move_uploaded_file($_FILES['image']['tmp_name'], $destPath)) {
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
    // Handle multipart/form-data via PUT (fallback)
    elseif (stripos($contentType, 'multipart/form-data') !== false) {
        // Read raw input and parse
        $rawData = file_get_contents('php://input');
        $boundary = substr($contentType, strpos($contentType, 'boundary=') + 9);

        $parts = explode('--' . $boundary, $rawData);
        foreach ($parts as $part) {
            if (empty($part) || $part == "--\r\n") continue;

            // Parse each part
            $pos = strpos($part, "\r\n\r\n");
            if ($pos !== false) {
                $headers = substr($part, 0, $pos);
                $body = substr($part, $pos + 4);
                // Remove trailing CRLF
                if (substr($body, -2) === "\r\n") {
                    $body = substr($body, 0, -2);
                }

                if (strpos($headers, 'name="name"') !== false) {
                    $name = trim($body);
                }

                if (strpos($headers, 'name="image"') !== false && preg_match('/filename="([^"]+)"/', $headers, $fileMatch)) {
                    $filename = $fileMatch[1] ?? '';
                    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
                    $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];

                    if (in_array($ext, $allowedExts)) {
                        $uploadDir = __DIR__ . '/../uploads/';
                        if (!is_dir($uploadDir)) {
                            mkdir($uploadDir, 0755, true);
                        }

                        $uniqueName = time() . '-' . mt_rand(100000000, 999999999) . '.' . $ext;
                        $destPath = $uploadDir . $uniqueName;

                        if (file_put_contents($destPath, $body)) {
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

function handleDeleteLoteamentoLotes($loteamentoId) {
    requireAuth();
    $db = getDatabase();
    
    $db->beginTransaction();
    try {
        // Obter IDs dos lotes desse loteamento
        $stmt = $db->prepare('SELECT id FROM lotes WHERE loteamentoId = ?');
        $stmt->execute([$loteamentoId]);
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
            
            // Deletar mídias físicas
            $stmt = $db->prepare("SELECT url FROM lote_midia WHERE loteId IN ($placeholders) AND type = 'image'");
            $stmt->execute($loteIds);
            $images = $stmt->fetchAll();
            foreach ($images as $img) {
                $filePath = __DIR__ . '/../' . $img['url'];
                if (file_exists($filePath)) @unlink($filePath);
            }
            
            // Deletar lote_midia
            $stmt = $db->prepare("DELETE FROM lote_midia WHERE loteId IN ($placeholders)");
            $stmt->execute($loteIds);
            
            // Deletar lotes
            $stmt = $db->prepare("DELETE FROM lotes WHERE id IN ($placeholders)");
            $stmt->execute($loteIds);
        }
        
        $db->commit();
        jsonResponse(['success' => true, 'message' => 'Todos os lotes foram deletados com sucesso']);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['error' => 'Erro ao deletar lotes: ' . $e->getMessage()], 500);
    }
}

