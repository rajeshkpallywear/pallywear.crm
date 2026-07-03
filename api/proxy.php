<?php
// PHP Proxy Script for routing /api requests to local Node.js Express server on port 118

$route = isset($_GET['route']) ? $_GET['route'] : '';

// The target URL of the Node.js server running on your VPS
$targetUrl = 'http://118.139.167.81:3000/api/' . $route;

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

// Initialize cURL session
$ch = curl_init();

// Set cURL options
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

curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Execute request
$response = curl_exec($ch);
$info = curl_getinfo($ch);

if (curl_errno($ch)) {
    $error = curl_error($ch);
    curl_close($ch);
    http_response_code(500);
    echo json_encode(['error' => 'Proxy Error: ' . $error]);
    exit;
}

curl_close($ch);

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
