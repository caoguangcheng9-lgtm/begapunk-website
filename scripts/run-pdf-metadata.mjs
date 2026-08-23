import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  process.env.PYTHON ? { command: process.env.PYTHON, prefix: [] } : null,
  { command: 'python', prefix: [] },
  { command: 'python3', prefix: [] },
  { command: 'py', prefix: ['-3'] },
  {
    command: path.join(
      os.homedir(),
      '.cache',
      'codex-runtimes',
      'codex-primary-runtime',
      'dependencies',
      'python',
      process.platform === 'win32' ? 'python.exe' : 'bin/python',
    ),
    prefix: [],
  },
].filter(Boolean);

const selected = candidates.find(({ command, prefix }) => {
  const probe = spawnSync(command, [...prefix, '-c', 'import pypdf'], {
    cwd: repoRoot,
    stdio: 'ignore',
    windowsHide: true,
  });
  return probe.status === 0;
});

if (!selected) {
  console.error('PDF metadata validation requires a Python runtime with pypdf available.');
  process.exit(1);
}

const result = spawnSync(
  selected.command,
  [...selected.prefix, path.join(repoRoot, 'scripts', 'update-pdf-metadata.py'), ...process.argv.slice(2)],
  { cwd: repoRoot, stdio: 'inherit', windowsHide: true },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
