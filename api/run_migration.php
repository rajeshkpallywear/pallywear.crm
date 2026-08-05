<?php
header("Content-Type: text/html; charset=utf-8");

echo "<h2>Pallywear Database Migration Script</h2>";

// 1. Load and parse .env from parent directory
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    die("<span style='color:red;'>Error: .env file not found in parent directory ($envFile).</span>");
}

$env = [];
$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    list($key, $val) = explode('=', $line, 2);
    $env[trim($key)] = trim($val);
}

// Extract database configuration
$db_host = isset($env['DB_HOST']) ? $env['DB_HOST'] : '';
$db_user = isset($env['DB_USER']) ? $env['DB_USER'] : '';
$db_pass = isset($env['DB_PASSWORD']) ? $env['DB_PASSWORD'] : '';
$db_name = isset($env['DB_NAME']) ? $env['DB_NAME'] : '';
$db_port = isset($env['DB_PORT']) ? intval($env['DB_PORT']) : 3306;

echo "Connecting to Database Host: <b>$db_host</b> on port <b>$db_port</b>...<br>";

// 2. Establish connection
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name, $db_port);
if ($conn->connect_error) {
    die("<span style='color:red;'>Database Connection Failed: " . $conn->connect_error . "</span>");
}

echo "<span style='color:green;'>Connected Successfully to Database: <b>$db_name</b></span><br><br>";

// 3. Define Alter queries to execute
$queries = [
    "ALTER TABLE `orders` MODIFY COLUMN `details` LONGTEXT DEFAULT NULL",
    "ALTER TABLE `orders` MODIFY COLUMN `sizeBreakdown` LONGTEXT DEFAULT NULL",
    "ALTER TABLE `orders` MODIFY COLUMN `staffImages` LONGTEXT DEFAULT NULL",
    "ALTER TABLE `orders` MODIFY COLUMN `staffPdfs` LONGTEXT DEFAULT NULL",
    "ALTER TABLE `orders` MODIFY COLUMN `staffAttachments` LONGTEXT DEFAULT NULL",
    "ALTER TABLE `orders` MODIFY COLUMN `accountsAttachments` LONGTEXT DEFAULT NULL",
    "ALTER TABLE `orders` MODIFY COLUMN `orderManagementAttachments` LONGTEXT DEFAULT NULL",
    "ALTER TABLE `orders` MODIFY COLUMN `designAttachments` LONGTEXT DEFAULT NULL",
    "ALTER TABLE `orders` MODIFY COLUMN `machineFiles` LONGTEXT DEFAULT NULL",
    "ALTER TABLE `invoices` MODIFY COLUMN `items` LONGTEXT DEFAULT NULL",
    "ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `sentByAccounts` tinyint(1) DEFAULT 0"
];

// 4. Run queries
foreach ($queries as $sql) {
    echo "Executing query: <code style='background:#f0f0f0;padding:2px 4px;'>$sql</code><br>";
    if ($conn->query($sql) === TRUE) {
        echo "<span style='color:green;font-weight:bold;'>✓ Query Completed Successfully.</span><br><br>";
    } else {
        // If ADD COLUMN fails because IF NOT EXISTS isn't supported or column already exists, handle gracefully
        if (strpos($conn->error, "Duplicate column name") !== false || strpos($conn->error, "already exists") !== false) {
            echo "<span style='color:orange;'>ℹ Column already exists. Skipping.</span><br><br>";
        } else {
            echo "<span style='color:red;'>✗ Query Failed: " . $conn->error . "</span><br><br>";
        }
    }
}

$conn->close();
echo "<h3>Database Migration Finished!</h3>";
?>
