<?php
// Increase memory limit and execution time to handle large base64 file payloads up to 100MB
@ini_set('memory_limit', '512M');
@set_time_limit(300);

// PHP Proxy Script for routing /api requests to local Node.js Express server on port 118

// Allow CORS for Capacitor Android/iOS apps
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Read route from raw QUERY_STRING to preserve URL-encoded characters like %23 (#)
// Apache URL-decodes $_GET values, which strips the # and breaks order IDs.
// Parsing QUERY_STRING directly preserves encoded chars like %23 intact.
$rawQuery = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
$route = '';
foreach (explode('&', $rawQuery) as $param) {
    if (strpos($param, 'route=') === 0) {
        $route = substr($param, 6); // preserve raw encoding, do NOT urldecode
        break;
    }
}

// The target URLs to try (127.0.0.1 local loopback first, then public IP)
$targetHosts = ['http://127.0.0.1:3000', 'http://localhost:3000', 'http://118.139.167.81:3000'];

// Only forward the Content-Type request header to protect against header clash or double gzip issues
$headers = [];
if (isset($_SERVER['CONTENT_TYPE'])) {
    $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
} elseif (isset($_SERVER['HTTP_CONTENT_TYPE'])) {
    $headers[] = 'Content-Type: ' . $_SERVER['HTTP_CONTENT_TYPE'];
}

// Get the request method
$method = $_SERVER['REQUEST_METHOD'];

// Get the request body
$input = file_get_contents('php://input');

$response = false;
$info = [];
$lastError = '';

foreach ($targetHosts as $host) {
    $targetUrl = $host . '/api/' . $route;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    if (!empty($input)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
    }

    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);

    $response = curl_exec($ch);
    $info = curl_getinfo($ch);

    if (!curl_errno($ch) && isset($info['http_code']) && $info['http_code'] > 0) {
        curl_close($ch);
        break;
    } else {
        $lastError = curl_error($ch);
        curl_close($ch);
    }
}

if ($response === false || empty($info) || (isset($info['http_code']) && $info['http_code'] === 0)) {
    http_response_code(503);
    echo json_encode([
        'error' => 'Backend Node.js server on port 3000 is not running. Please start the Node.js server (e.g. pm2 start start.cjs or via cPanel Setup Node.js App).',
        'details' => $lastError
    ]);
    exit;
}

// Split response into headers and body
$headerSize = $info['header_size'];
$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);

// Forward response code
if (isset($info['http_code']) && $info['http_code'] > 0) {
    http_response_code($info['http_code']);
}

// Only forward the Content-Type response header from Node.js
$responseHeaders = str_replace("\r\n", "\n", $responseHeaders);
$headerLines = explode("\n", $responseHeaders);
foreach ($headerLines as $line) {
    $line = trim($line);
    if (stripos($line, 'content-type:') === 0) {
        @header($line);
        break;
    }
}

// Output response body
echo $responseBody;
