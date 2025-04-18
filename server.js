const { spawn } = require('child_process');
const path = require('path');

// Start the server process
const serverProcess = spawn('node', [path.join(__dirname, 'server', 'server.js')], {
  stdio: 'inherit' // This will pipe the server's stdout/stderr to the parent process
});

console.log('MongoDB server started on port 5001');

// Handle server process termination
serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('Stopping server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});
