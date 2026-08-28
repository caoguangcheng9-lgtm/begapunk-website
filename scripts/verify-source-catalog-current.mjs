import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const buildScript = path.join(import.meta.dirname, 'build-localized-site.mjs');
const result = spawnSync(process.execPath, [buildScript, '--mode', 'verify-catalog'], {
  cwd: path.resolve(import.meta.dirname, '..'),
  stdio: 'inherit',
});

if (result.error) throw result.error;
if (result.signal) {
  console.error(`Source catalog verification terminated by signal ${result.signal}.`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
