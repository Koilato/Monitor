import { spawn } from 'node:child_process';

const child = spawn('tsx', ['src/index.ts'], {
  stdio: 'inherit',
  env: process.env,
});

let shuttingDown = false;

const shutdown = () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  child.kill('SIGTERM');
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

child.on('exit', (code, signal) => {
  if (shuttingDown || signal) {
    process.exit(0);
    return;
  }

  process.exit(code ?? 0);
});
