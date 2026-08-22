import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const repo = path.resolve(process.argv[2] || process.cwd());
const downloadsRoot = path.join(repo, 'downloads');
const manifestPath = path.join(downloadsRoot, 'public-downloads.sha256');
const excluded = new Set([
  'BP-2P-0001_draft.pdf',
  'BP-2P-30-0001.pdf',
].map((name) => name.toLowerCase()));

async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

const files = (await walk(downloadsRoot))
  .filter((file) => path.resolve(file) !== path.resolve(manifestPath))
  .filter((file) => {
    const relative = path.relative(downloadsRoot, file).split(path.sep).join('/');
    const lower = relative.toLowerCase();
    return !lower.endsWith('.bak') && !lower.endsWith('.backup') && !excluded.has(lower);
  })
  .sort((left, right) => left.localeCompare(right, 'en'));

const lines = [];
for (const file of files) {
  const relative = path.relative(downloadsRoot, file).split(path.sep).join('/');
  if (!relative || relative === '..' || relative.startsWith('../')) throw new Error(`Unsafe download path: ${file}`);
  const digest = createHash('sha256').update(await fs.readFile(file)).digest('hex');
  lines.push(`${digest}  ${relative}`);
}

await fs.writeFile(manifestPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${lines.length} reviewed public downloads to ${manifestPath}`);
