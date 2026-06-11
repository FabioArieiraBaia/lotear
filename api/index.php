<?php
/**
 * Main API Router for LoteamentosPro
 * All /api/* requests are routed here via .htaccess
 */

// CORS headers
$allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost', 'http://127.0.0.1'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
} else {
    $serverName = $_SERVER['SERVER_NAME'] ?? '';
    if ($serverName && strpos($origin, $serverName) !== false) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    }
}
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
require_once __DIR__ . '/corretores.php';
require_once __DIR__ . '/financeiro.php';
require_once __DIR__ . '/usuarios.php';
require_once __DIR__ . '/configuracoes.php';
require_once __DIR__ . '/gemini.php';

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
    
    // POST /api/gemini/extract
    elseif ($path === '/api/gemini/extract' && $method === 'POST') {
        handleGeminiExtract();
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
    
    // DELETE /api/loteamentos/:id
    elseif (preg_match('#^/api/loteamentos/(\d+)$#', $path, $matches) && $method === 'DELETE') {
        handleDeleteLoteamento((int)$matches[1]);
    }

    // PUT /api/loteamentos/:id
    elseif (preg_match('#^/api/loteamentos/(\d+)$#', $path, $matches) && $method === 'PUT') {
        handleUpdateLoteamento((int)$matches[1]);
    }
    
    // GET /api/lotes
    elseif ($path === '/api/lotes' && $method === 'GET') {
        handleGetAllLotes();
    }

    // GET /api/lotes/:id
    elseif (preg_match('#^/api/lotes/(\d+)$#', $path, $matches) && $method === 'GET') {
        handleGetLote((int)$matches[1]);
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

    // GET /api/lotes/:id/midia
    elseif (preg_match('#^/api/lotes/(\d+)/midia$#', $path, $matches) && $method === 'GET') {
        handleGetLoteMidia((int)$matches[1]);
    }

    // POST /api/lotes/:id/midia
    elseif (preg_match('#^/api/lotes/(\d+)/midia$#', $path, $matches) && $method === 'POST') {
        handleUploadLoteMidia((int)$matches[1]);
    }

    // DELETE /api/midia/:id
    elseif (preg_match('#^/api/midia/(\d+)$#', $path, $matches) && $method === 'DELETE') {
        handleDeleteMidia((int)$matches[1]);
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
    
    
    // GET /api/configuracoes
    elseif ($path === '/api/configuracoes' && $method === 'GET') {
        handleGetConfig(getDatabase());
    }

    // POST /api/configuracoes
    elseif ($path === '/api/configuracoes' && $method === 'POST') {
        handleUpdateConfig(getDatabase());
    }

    // ==================== CORRETORES ====================
    
    // GET /api/corretores
    elseif ($path === '/api/corretores' && $method === 'GET') {
        handleGetAllCorretores();
    }
    
    // POST /api/corretores
    elseif ($path === '/api/corretores' && $method === 'POST') {
        handleCreateCorretor();
    }
    
    // GET /api/corretores/:id
    elseif (preg_match('#^/api/corretores/(\d+)$#', $path, $matches) && $method === 'GET') {
        handleGetCorretor((int)$matches[1]);
    }
    
    // PUT /api/corretores/:id
    elseif (preg_match('#^/api/corretores/(\d+)$#', $path, $matches) && $method === 'PUT') {
        handleUpdateCorretor((int)$matches[1]);
    }
    
    // DELETE /api/corretores/:id
    elseif (preg_match('#^/api/corretores/(\d+)$#', $path, $matches) && $method === 'DELETE') {
        handleDeleteCorretor((int)$matches[1]);
    }
    
    // ==================== FINANCEIRO ====================
    
    // GET /api/financeiro/resumo
    elseif ($path === '/api/financeiro/resumo' && $method === 'GET') {
        handleGetResumoFinanceiro();
    }
    
    // GET /api/financeiro/vendas
    elseif ($path === '/api/financeiro/vendas' && $method === 'GET') {
        handleGetVendas();
    }
    
    // GET /api/financeiro/compradores
    elseif ($path === '/api/financeiro/compradores' && $method === 'GET') {
        handleGetCompradores();
    }
    
    // GET /api/parcelas
    elseif ($path === '/api/parcelas' && $method === 'GET') {
        handleGetAllParcelas();
    }
    
    // GET /api/parcelas/lote/:id
    elseif (preg_match('#^/api/parcelas/lote/(\d+)$#', $path, $matches) && $method === 'GET') {
        handleGetParcelasByLote((int)$matches[1]);
    }
    
    // POST /api/parcelas/generate/:loteId
    elseif (preg_match('#^/api/parcelas/generate/(\d+)$#', $path, $matches) && $method === 'POST') {
        handleGenerateParcelas((int)$matches[1]);
    }
    
    // GET /api/pagamentos
    elseif ($path === '/api/pagamentos' && $method === 'GET') {
        handleGetPagamentos();
    }
    
    // POST /api/pagamentos
    elseif ($path === '/api/pagamentos' && $method === 'POST') {
        handleRegistrarPagamento();
    }
    
    // GET /api/comissoes
    elseif ($path === '/api/comissoes' && $method === 'GET') {
        handleGetComissoes();
    }
    
    // POST /api/comissoes/:id/pagar
    elseif (preg_match('#^/api/comissoes/(\d+)/pagar$#', $path, $matches) && $method === 'POST') {
        handlePagarComissao((int)$matches[1]);
    }
    
    // DELETE /api/financeiro/lote/:id (limpar dados financeiros de um lote)
    elseif (preg_match('#^/api/financeiro/lote/(\d+)$#', $path, $matches) && $method === 'DELETE') {
        handleLimparDadosFinanceiros((int)$matches[1]);
    }
    
    // ==================== USUÁRIOS ====================
    
    // GET /api/usuarios
    elseif ($path === '/api/usuarios' && $method === 'GET') {
        handleGetUsuarios();
    }
    
    // POST /api/usuarios
    elseif ($path === '/api/usuarios' && $method === 'POST') {
        handleCreateUsuario();
    }
    
    // PUT /api/usuarios/:id
    elseif (preg_match('#^/api/usuarios/(\d+)$#', $path, $matches) && $method === 'PUT') {
        handleUpdateUsuario((int)$matches[1]);
    }
    
    // DELETE /api/usuarios/:id
    elseif (preg_match('#^/api/usuarios/(\d+)$#', $path, $matches) && $method === 'DELETE') {
        handleDeleteUsuario((int)$matches[1]);
    }
    
    // 404 - Route not found
    else {
        jsonResponse(['error' => 'Route not found', 'path' => $path, 'method' => $method], 404);
    }
    
} catch (PDOException $e) {
    error_log($e->getMessage());
    jsonResponse(['error' => 'Erro interno do servidor'], 500);
} catch (Exception $e) {
    error_log($e->getMessage());
    jsonResponse(['error' => 'Erro interno do servidor'], 500);
}
