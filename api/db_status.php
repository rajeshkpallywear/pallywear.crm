<?php
header("Content-Type: text/html; charset=utf-8");

$envFile = __DIR__ . '/../.env';
$env = [];
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($key, $val) = explode('=', $line, 2);
        $env[trim($key)] = trim($val);
    }
}

$db_host = isset($env['DB_HOST']) ? $env['DB_HOST'] : '118.139.167.81';
$db_user = isset($env['DB_USER']) ? $env['DB_USER'] : 'pallywearcrm_pallywearcrm';
$db_pass = isset($env['DB_PASSWORD']) ? $env['DB_PASSWORD'] : 'Pallywear@24';
$db_name = isset($env['DB_NAME']) ? $env['DB_NAME'] : 'pallywearcrm_pallywearcrm';
$db_port = isset($env['DB_PORT']) ? intval($env['DB_PORT']) : 3306;

echo "<h2>Database Status Check</h2>";

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name, $db_port);
if ($conn->connect_error) {
    echo "<p style='color:red'>Connection Failed: " . $conn->connect_error . "</p>";
    exit;
}

echo "<p style='color:green'>✓ Connected to MySQL database ($db_name)</p>";

$tables = ['orders', 'leads', 'invoices', 'users', 'expenses', 'leaves', 'sidebar_messages'];

echo "<table border='1' cellpadding='8' style='border-collapse:collapse;font-family:sans-serif;'>";
echo "<tr style='background:#f0f0f0;'><th>Table Name</th><th>Total Records</th></tr>";

foreach ($tables as $t) {
    $res = $conn->query("SELECT COUNT(*) as cnt FROM `$t`");
    $cnt = $res ? $res->fetch_assoc()['cnt'] : "Table does not exist";
    echo "<tr><td><b>$t</b></td><td>$cnt</td></tr>";
}
echo "</table>";

echo "<h3>Node.js Backend Connection Test</h3>";

$testUrls = ['http://127.0.0.1:3000/api/users', 'http://118.139.167.81:3000/api/users'];
foreach ($testUrls as $u) {
    $ch = curl_init($u);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    $res = curl_exec($ch);
    $err = curl_error($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($err) {
        echo "<p>Test to <code>$u</code>: <span style='color:red;'>FAILED ($err)</span></p>";
    } else {
        echo "<p>Test to <code>$u</code>: <span style='color:green;'>SUCCESS (HTTP $code)</span></p>";
    }
}
?>
