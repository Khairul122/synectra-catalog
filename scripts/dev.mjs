// Run backend (Hono :8788) and frontend (Next :3000) together: `npm run dev`.
// Output is prefixed per service; Ctrl+C or either process exiting stops both.
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';

const services = [
  {
    name: 'api',
    color: 36, // cyan
    cwd: path.join(root, 'backend'),
    cmd: process.execPath,
    // Root .env is optional; without it the backend runs on its dev defaults.
    args: ['--env-file-if-exists=../.env', 'scripts/dev.mjs'],
  },
  {
    name: 'web',
    color: 35, // magenta
    cwd: path.join(root, 'frontend'),
    cmd: isWin ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
  },
];

const children = [];
let stopping = false;

function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    // On Windows npm spawns a process tree; kill the whole tree.
    if (isWin) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
  process.exit(code);
}

for (const { name, color, cwd, cmd, args } of services) {
  const tag = `\x1b[${color}m[${name}]\x1b[0m `;
  const child = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: '1' }, shell: isWin && cmd.endsWith('.cmd') });
  const pipe = (stream, out) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) out.write(tag + line + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    process.stdout.write(`${tag}stopped (exit ${code ?? 'signal'})\n`);
    stopAll(code ?? 1);
  });
  children.push(child);
}

process.stdout.write('\x1b[1mSynectra dev\x1b[0m  api → http://localhost:8788   web → http://localhost:3000   (Ctrl+C to stop)\n');
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
