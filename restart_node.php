<?php
header('Content-Type: text/plain; charset=utf-8');

echo "=== SERVER DIAGNOSTIC & RESTART ===\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "User: " . get_current_user() . "\n";
echo "Dir: " . __DIR__ . "\n\n";

// 1. Run git pull
echo "--- 1. Git Pull ---\n";
if (function_exists('shell_exec')) {
    $out = shell_exec('git pull origin main 2>&1');
    echo ($out ? $out : "shell_exec returned empty") . "\n";
} else {
    echo "shell_exec is disabled\n";
}

// 2. Check running node processes
echo "\n--- 2. Node processes ---\n";
if (function_exists('shell_exec')) {
    echo shell_exec('ps aux | grep -i node 2>&1') . "\n";
}

// 3. Restart PM2 or node
echo "\n--- 3. PM2 restart ---\n";
if (function_exists('shell_exec')) {
    echo shell_exec('pm2 restart all 2>&1') . "\n";
    echo shell_exec('npx pm2 restart all 2>&1') . "\n";
}

// 4. Touch restart.txt (for cPanel Passenger)
$tmpDir = __DIR__ . '/tmp';
if (!is_dir($tmpDir)) {
    @mkdir($tmpDir, 0755, true);
}
@touch($tmpDir . '/restart.txt');
echo "\n--- 4. cPanel restart file ---\n";
echo "Touched " . $tmpDir . "/restart.txt\n";

echo "\n=== DONE ===\n";
