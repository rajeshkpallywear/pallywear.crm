const { spawn } = require('child_process');

console.log('Starting CRM backend server...');
const child = spawn('npm', ['run', 'server'], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  process.exit(code);
});
