<?php
header('Content-Type: text/plain; charset=utf-8');

echo "Current Dir: " . __DIR__ . "\n";
echo "Current User: " . get_current_user() . " (" . exec('whoami') . ")\n";

// Check git status
echo "\n--- Git Status ---\n";
echo shell_exec('git status 2>&1');

// Git pull
echo "\n--- Git Pull ---\n";
echo shell_exec('git pull origin main 2>&1');

// Check PM2 / Node processes
echo "\n--- PM2 Status / Processes ---\n";
echo shell_exec('npx pm2 list 2>&1');

// Restart Node server if PM2 is used
echo "\n--- Restarting PM2 ---\n";
echo shell_exec('npx pm2 restart all 2>&1');

// Also try touch tmp/restart.txt if Passenger/cPanel is used
@mkdir(__DIR__ . '/tmp', 0755, true);
@touch(__DIR__ . '/tmp/restart.txt');
echo "\ntmp/restart.txt touched.\n";
