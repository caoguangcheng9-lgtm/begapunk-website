import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const PUBLIC_DOWNLOADS_CONFIG = 'data/public-downloads.json';
export const PUBLIC_DOWNLOADS_MANIFEST = 'public-downloads.sha256';

function validateDownloadName(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}: download names must be non-empty strings.`);
  }
  if (value !== value.trim()
    || value.includes('\\')
    || path.posix.isAbsolute(value)
    || path.posix.dirname(value) !== '.'
    || path.posix.normalize(value) !== value) {
    throw new Error(`${label}: download names must be normalized files directly under downloads/ (${value}).`);
  }
  if (path.posix.extname(value).toLowerCase() !== '.pdf') {
    throw new Error(`${label}: only reviewed PDF files may be public downloads (${value}).`);
  }
  return value;
}

export async function loadPublicDownloadAllowlist(repoRoot) {
  const configPath = path.join(repoRoot, PUBLIC_DOWNLOADS_CONFIG);
  let config;
  try {
    config = JSON.parse(await readFile(configPath, 'utf8'));
  } catch (error) {
    throw new Error(`${PUBLIC_DOWNLOADS_CONFIG}: unable to read public-download allowlist (${error.message}).`);
  }

  if (config?.version !== 1 || !Array.isArray(config.files) || !config.files.length) {
    throw new Error(`${PUBLIC_DOWNLOADS_CONFIG}: expected version 1 with a non-empty files array.`);
  }

  const files = config.files.map((value) => validateDownloadName(value, PUBLIC_DOWNLOADS_CONFIG));
  const folded = new Map();
  for (const fileName of files) {
    const key = fileName.normalize('NFC').toLowerCase();
    if (folded.has(key)) {
      throw new Error(`${PUBLIC_DOWNLOADS_CONFIG}: case-insensitive or Unicode-normalized duplicate (${folded.get(key)} and ${fileName}).`);
    }
    folded.set(key, fileName);
  }

  const sorted = [...files].sort((left, right) => left.localeCompare(right, 'en'));
  if (JSON.stringify(files) !== JSON.stringify(sorted)) {
    throw new Error(`${PUBLIC_DOWNLOADS_CONFIG}: files must be sorted for stable review.`);
  }
  return Object.freeze(files);
}

export async function createPublicDownloadsManifest(downloadsRoot, files) {
  const lines = [];
  for (const fileName of files) {
    const digest = createHash('sha256').update(await readFile(path.join(downloadsRoot, fileName))).digest('hex');
    lines.push(`${digest}  ${fileName}`);
  }
  return `${lines.join('\n')}\n`;
}

export function parsePublicDownloadsManifest(source, label = PUBLIC_DOWNLOADS_MANIFEST) {
  const records = new Map();
  const folded = new Map();
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const match = /^([0-9a-f]{64})[ \t]+(\*?)(.+)$/i.exec(line);
    if (!match) throw new Error(`${label}:${index + 1}: malformed SHA-256 entry.`);
    const fileName = validateDownloadName(match[3], `${label}:${index + 1}`);
    if (records.has(fileName)) throw new Error(`${label}:${index + 1}: duplicate entry (${fileName}).`);
    const key = fileName.normalize('NFC').toLowerCase();
    if (folded.has(key)) {
      throw new Error(`${label}:${index + 1}: case-insensitive or Unicode-normalized duplicate (${folded.get(key)} and ${fileName}).`);
    }
    records.set(fileName, match[1].toLowerCase());
    folded.set(key, fileName);
  }
  return records;
}
