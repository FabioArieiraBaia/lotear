<?php
/**
 * Gemini API Proxy Handler
 */

require_once __DIR__ . '/auth.php';

function getGeminiApiKey() {
    $key = getenv('GEMINI_API_KEY');
    if ($key) return $key;
    
    $envPath = __DIR__ . '/../.env';
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value, " \t\n\r\0\x0B\"'");
                if ($name === 'GEMINI_API_KEY') {
                    return $value;
                }
            }
        }
    }
    return null;
}

function handleGeminiExtract() {
    requireAuth();
    
    $apiKey = getGeminiApiKey();
    if (!$apiKey) {
        jsonResponse(['error' => 'Chave de API do Gemini não configurada no servidor.'], 500);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $base64Image = $data['image'] ?? '';
    $mimeType = $data['mimeType'] ?? '';
    
    if (!$base64Image || !$mimeType) {
        jsonResponse(['error' => 'Imagem e mimeType são obrigatórios.'], 400);
    }
    
    $prompt = "
        Analise esta imagem de planta de loteamento.
        Identifique todos os lotes individuais visíveis.
        Para cada lote, extraia as coordenadas dos cantos (polígono) em um formato normalizado de 0 a 1000 (onde [0,0] é o topo esquerdo e [1000,1000] o inferior direito).
        Tente ler o número ou identificação de cada lote se estiver escrito.
        Retorne os dados estritamente em um formato JSON estruturado assim:
        {\"lotes\": [{\"name\": \"Lote 01\", \"polygon\": [[y1, x1], [y2, x2]], \"area\": \"...\"}]}
    ";
    
    $payload = [
        'contents' => [
            [
                'parts' => [
                    [
                        'inlineData' => [
                            'mimeType' => $mimeType,
                            'data' => preg_replace('#^data:image/\w+;base64,#i', '', $base64Image)
                        ]
                    ],
                    [
                        'text' => $prompt
                    ]
                ]
            ]
        ],
        'generationConfig' => [
            'responseMimeType' => 'application/json',
            'responseSchema' => [
                'type' => 'OBJECT',
                'properties' => [
                    'lotes' => [
                        'type' => 'ARRAY',
                        'items' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'name' => ['type' => 'STRING'],
                                'polygon' => [
                                    'type' => 'ARRAY',
                                    'items' => [
                                        'type' => 'ARRAY',
                                        'items' => ['type' => 'NUMBER']
                                    ]
                                ],
                                'area' => ['type' => 'STRING']
                            ],
                            'required' => ['name', 'polygon']
                        ]
                    ]
                ],
                'required' => ['lotes']
            ]
        ]
    ];
    
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $apiKey;
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        jsonResponse(['error' => 'Erro na requisição ao Gemini: ' . $error], 500);
    }
    
    if ($httpCode !== 200) {
        $errData = json_decode($response, true);
        $errMsg = $errData['error']['message'] ?? 'Erro desconhecido da API do Gemini';
        jsonResponse(['error' => $errMsg, 'raw' => $response], $httpCode);
    }
    
    $resData = json_decode($response, true);
    $text = $resData['candidates'][0]['content']['parts'][0]['text'] ?? '';
    
    if ($text) {
        jsonResponse(json_decode($text, true));
    } else {
        jsonResponse(['error' => 'Resposta do Gemini não pôde ser processada.'], 500);
    }
}
