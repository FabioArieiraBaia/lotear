<?php
/**
 * Main API Router for LoteamentosPro
 * All /api/* requests are routed here via .htaccess
 */

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Helper function for JSON responses
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Include handlers
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/loteamentos.php';
require_once __DIR__ . '/lotes.php';
require_once __DIR__ . '/leads.php';

// Parse the request path
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'])));
if ($basePath === '/' || $basePath === '.') {
    $basePath = '';
}

// Remove base path and query string
$path = parse_url($requestUri, PHP_URL_PATH);
$path = substr($path, strlen($basePath));
$path = rtrim($path, '/');

$method = $_SERVER['REQUEST_METHOD'];

// Route the request
try {
    // POST /api/login
    if ($path === '/api/login' && $method === 'POST') {
        handleLogin();
    }
    
    // GET /api/loteamentos
    elseif ($path === '/api/loteamentos' && $method === 'GET') {
        handleGetLoteamentos();
    }
    
    // POST /api/loteamentos
    elseif ($path === '/api/loteamentos' && $method === 'POST') {
        handleCreateLoteamento();
    }
    
    // GET /api/loteamentos/:id
    elseif (preg_match('#^/api/loteamentos/(\d+)$#', $path, $matches) && $method === 'GET') {
        handleGetLoteamento((int)$matches[1]);
    }
    
    // GET /api/loteamentos/:id/lotes
    elseif (preg_match('#^/api/loteamentos/(\d+)/lotes$#', $path, $matches) && $method === 'GET') {
        handleGetLoteamentoLotes((int)$matches[1]);
    }
    
    // GET /api/lotes
    elseif ($path === '/api/lotes' && $method === 'GET') {
        handleGetAllLotes();
    }
    
    // POST /api/lotes
    elseif ($path === '/api/lotes' && $method === 'POST') {
        handleCreateLote();
    }
    
    // PUT /api/lotes/:id
    elseif (preg_match('#^/api/lotes/(\d+)$#', $path, $matches) && $method === 'PUT') {
        handleUpdateLote((int)$matches[1]);
    }
    
    // DELETE /api/lotes/:id
    elseif (preg_match('#^/api/lotes/(\d+)$#', $path, $matches) && $method === 'DELETE') {
        handleDeleteLote((int)$matches[1]);
    }
    
    // GET /api/leads
    elseif ($path === '/api/leads' && $method === 'GET') {
        handleGetLeads();
    }
    
    // POST /api/leads
    elseif ($path === '/api/leads' && $method === 'POST') {
        handleCreateLead();
    }
    
    // PUT /api/leads/:id
    elseif (preg_match('#^/api/leads/(\d+)$#', $path, $matches) && $method === 'PUT') {
        handleUpdateLead((int)$matches[1]);
    }
    
    // 404 - Route not found
    else {
        jsonResponse(['error' => 'Route not found', 'path' => $path, 'method' => $method], 404);
    }
    
} catch (PDOException $e) {
    jsonResponse(['error' => $e->getMessage()], 500);
} catch (Exception $e) {
    jsonResponse(['error' => $e->getMessage()], 500);
}
