<?php
header('Content-Type: application/json');
echo json_encode([
    'getallheaders' => function_exists('getallheaders') ? getallheaders() : 'not available',
    'PHP_AUTH_USER' => $_SERVER['PHP_AUTH_USER'] ?? null,
    'PHP_AUTH_PW' => $_SERVER['PHP_AUTH_PW'] ?? null,
    'HTTP_AUTHORIZATION' => $_SERVER['HTTP_AUTHORIZATION'] ?? null,
    'REDIRECT_HTTP_AUTHORIZATION' => $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null,
    '_SERVER' => $_SERVER
], JSON_PRETTY_PRINT);
