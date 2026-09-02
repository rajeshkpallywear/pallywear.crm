<?php
header("Content-Type: application/json; charset=utf-8");

$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    $envFile = __DIR__ . '/.env';
}

$env = [];
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($key, $val) = explode('=', $line, 2);
        $env[trim($key)] = trim($val);
    }
}

$db_host = isset($env['DB_HOST']) ? $env['DB_HOST'] : 'localhost';
$db_user = isset($env['DB_USER']) ? $env['DB_USER'] : 'pallywearcrm_pallywearcrm';
$db_pass = isset($env['DB_PASSWORD']) ? $env['DB_PASSWORD'] : 'Pallywear@24';
$db_name = isset($env['DB_NAME']) ? $env['DB_NAME'] : 'pallywearcrm_pallywearcrm';
$db_port = isset($env['DB_PORT']) ? intval($env['DB_PORT']) : 3306;

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name, $db_port);
if ($conn->connect_error) {
    // Try 127.0.0.1
    $conn = new mysqli('127.0.0.1', $db_user, $db_pass, $db_name, $db_port);
    if ($conn->connect_error) {
        echo json_encode(['error' => 'DB Connection Failed: ' . $conn->connect_error]);
        exit;
    }
}

// Test Node.js port 3000 locally
$ch = curl_init('http://127.0.0.1:3000/api/users');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 3);
$nodeRes127 = curl_exec($ch);
$nodeErr127 = curl_error($ch);
curl_close($ch);

$ch2 = curl_init('http://118.139.167.81:3000/api/users');
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_TIMEOUT, 3);
$nodeResPublic = curl_exec($ch2);
$nodeErrPublic = curl_error($ch2);
curl_close($ch2);

// Count records
$ordersCount = 0;
$leadsCount = 0;
$invoicesCount = 0;
$usersCount = 0;

$r = $conn->query("SELECT COUNT(*) as c FROM orders");
if ($r) { $row = $r->fetch_assoc(); $ordersCount = intval($row['c']); }

$r = $conn->query("SELECT COUNT(*) as c FROM leads");
if ($r) { $row = $r->fetch_assoc(); $leadsCount = intval($row['c']); }

$r = $conn->query("SELECT COUNT(*) as c FROM invoices");
if ($r) { $row = $r->fetch_assoc(); $invoicesCount = intval($row['c']); }

$r = $conn->query("SELECT COUNT(*) as c FROM users");
if ($r) { $row = $r->fetch_assoc(); $usersCount = intval($row['c']); }

echo json_encode([
    'db_status' => 'connected',
    'orders_count' => $ordersCount,
    'leads_count' => $leadsCount,
    'invoices_count' => $invoicesCount,
    'users_count' => $usersCount,
    'node_127_0_0_1_error' => $nodeErr127,
    'node_127_0_0_1_sample' => substr($nodeRes127, 0, 100),
    'node_public_error' => $nodeErrPublic,
    'node_public_sample' => substr($nodeResPublic, 0, 100),
]);
