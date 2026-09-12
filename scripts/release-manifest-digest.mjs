import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const manifestPath = path.resolve(import.meta.dirname, '..', 'dist', 'production', 'manifest.sha256');
const source = await readFile(manifestPath);
process.stdout.write(createHash('sha256').update(source).digest('hex'));
