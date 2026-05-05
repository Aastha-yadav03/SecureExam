const { spawn } = require('child_process');

// Helper to run commands
function runProcess(name, command, args, cwd) {
    const proc = spawn(command, args, { cwd, shell: true });

    proc.stdout.on('data', (data) => {
        console.log(`[${name}] ${data.toString().trim()}`);
    });

    proc.stderr.on('data', (data) => {
        console.error(`[${name} ERROR] ${data.toString().trim()}`);
    });

    proc.on('close', (code) => {
        console.log(`[${name}] exited with code ${code}`);
    });

    return proc;
}

console.log("Starting SecureExam...");

// Start Backend
const backendProc = runProcess('BACKEND', 'npm', ['run', 'dev'], 'backend');

// Start Frontend
const frontendProc = runProcess('FRONTEND', 'npm', ['start'], 'frontend');

// Handle exit
process.on('SIGINT', () => {
    backendProc.kill();
    frontendProc.kill();
    process.exit();
});
