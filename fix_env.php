<?php
/**
 * Pallywear CRM Database Configuration Fixer
 * Upload this file to /home/pallywearcrm/public_html/ and visit it in your browser:
 * http://your-domain.com/fix_env.php
 */

header('Content-Type: text/html; charset=utf-8');

$envPath = __DIR__ . '/.env';
if (!file_exists($envPath)) {
    echo "<h2>❌ Error: .env file not found</h2>";
    echo "Please make sure this file is uploaded to the same directory as your .env file (/home/pallywearcrm/public_html/).";
    exit;
}

$content = file_get_contents($envPath);

echo "<h2>Pallywear CRM Database Config Fixer</h2>";
echo "<h3>Current .env file content:</h3>";
echo "<pre style='background:#f4f4f4; padding:15px; border-radius:5px;'>" . htmlspecialchars($content) . "</pre>";

$changed = false;

// 1. Fix DB_HOST (change public IP to localhost)
if (strpos($content, 'DB_HOST=118.139.167.81') !== false) {
    $content = str_replace('DB_HOST=118.139.167.81', 'DB_HOST=localhost', $content);
    $changed = true;
    echo "<p style='color:green; font-weight:bold;'>✓ DB_HOST updated from 118.139.167.81 to localhost</p>";
}

// 2. Write back to .env if changed
if ($changed) {
    if (file_put_contents($envPath, $content) !== false) {
        echo "<p style='color:green; font-weight:bold;'>✓ Server .env file updated successfully!</p>";
    } else {
        echo "<p style='color:red; font-weight:bold;'>❌ Error: Unable to write to .env file. Check file permissions.</p>";
    }
} else {
    echo "<p style='color:blue;'>ℹ No changes were required for DB_HOST (already localhost or not found).</p>";
}

// 3. Test the connection
$env = [];
$lines = explode("\n", $content);
foreach ($lines as $line) {
    $line = trim($line);
    if (empty($line) || strpos($line, '#') === 0) continue;
    $parts = explode('=', $line, 2);
    if (count($parts) === 2) {
        $env[trim($parts[0])] = trim($parts[1]);
    }
}

$host = isset($env['DB_HOST']) ? $env['DB_HOST'] : 'localhost';
$user = isset($env['DB_USER']) ? $env['DB_USER'] : '';
$pass = isset($env['DB_PASSWORD']) ? $env['DB_PASSWORD'] : '';
$db = isset($env['DB_NAME']) ? $env['DB_NAME'] : '';
$port = isset($env['DB_PORT']) ? $env['DB_PORT'] : '3306';

echo "<h3>Testing MySQL/MariaDB Connection:</h3>";
echo "<ul>";
echo "<li>Host: <b>" . htmlspecialchars($host) . "</b></li>";
echo "<li>User: <b>" . htmlspecialchars($user) . "</b></li>";
echo "<li>Database: <b>" . htmlspecialchars($db) . "</b></li>";
echo "<li>Port: <b>" . htmlspecialchars($port) . "</b></li>";
echo "</ul>";

// Try connecting using mysqli
$conn = @new mysqli($host, $user, $pass, $db, (int)$port);

if ($conn->connect_error) {
    echo "<div style='background:#fee; color:#b00; padding:15px; border-radius:5px; font-weight:bold;'>";
    echo "❌ Connection Failed: " . htmlspecialchars($conn->connect_error);
    echo "</div>";
} else {
    echo "<div style='background:#efe; color:#080; padding:15px; border-radius:5px; font-weight:bold;'>";
    echo "✓ Connection Successful! Node.js backend should now be able to connect.";
    echo "</div>";
    
    // Check tables
    $result = $conn->query("SHOW TABLES");
    if ($result) {
        echo "<h4>Tables found in database:</h4><ul>";
        while ($row = $result->fetch_row()) {
            echo "<li>" . htmlspecialchars($row[0]) . "</li>";
        }
        echo "</ul>";
    }
    $conn->close();
}
?>
