import { createHash } from 'node:crypto';
import { readdir, readFile, rm, mkdir, cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(sourceRoot, 'dist', 'production');

if (!outputRoot.startsWith(`${sourceRoot}${path.sep}`)) {
  throw new Error(`Refusing to clean an output path outside the repository: ${outputRoot}`);
}

const rootEntries = await readdir(sourceRoot, { withFileTypes: true });
const rootFiles = rootEntries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name);

const explicitFiles = [
  '.htaccess',
  'robots.txt',
  'sitemap.xml',
  'sitemap-i18n.xml',
  'llms.txt',
  'search-index.json',
  'send_inquiry.php',
];

const publicDirectories = [
  'css',
  'js',
  'fonts',
  'images',
  'videos',
  'downloads',
  'PHPMailer',
  'de',
  'ja',
  'ru',
];

const excludedReleaseFiles = new Set([
  'downloads/BP-2P-0001_draft.pdf',
  'downloads/BP-2P-30-0001.pdf',
].map((fileName) => fileName.toLowerCase()));

function toReleasePath(fileName) {
  return path.relative(sourceRoot, fileName).split(path.sep).join('/');
}

function isExcludedReleasePath(fileName) {
  const relative = toReleasePath(fileName);
  if (!relative || relative === '.') return false;
  if (relative === '..' || relative.startsWith('../')) {
    throw new Error(`Refusing to evaluate a public path outside the repository: ${fileName}`);
  }

  const lower = relative.toLowerCase();
  return lower.endsWith('.bak')
    || lower.endsWith('.backup')
    || excludedReleaseFiles.has(lower);
}

const excludedDuringBuild = new Set();

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const fileName of [...rootFiles, ...explicitFiles]) {
  await cp(path.join(sourceRoot, fileName), path.join(outputRoot, fileName));
}

for (const directoryName of publicDirectories) {
  await cp(path.join(sourceRoot, directoryName), path.join(outputRoot, directoryName), {
    recursive: true,
    filter: (source) => {
      if (!isExcludedReleasePath(source)) return true;
      excludedDuringBuild.add(toReleasePath(source));
      return false;
    },
  });
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    if (entry.isFile()) files.push(absolute);
  }
  return files;
}

const releaseFiles = (await walk(outputRoot))
  .filter((fileName) => path.basename(fileName) !== 'manifest.sha256')
  .sort((left, right) => left.localeCompare(right, 'en'));

const forbiddenCopies = releaseFiles.filter((fileName) => {
  const relative = path.relative(outputRoot, fileName).split(path.sep).join('/').toLowerCase();
  return relative.endsWith('.bak')
    || relative.endsWith('.backup')
    || excludedReleaseFiles.has(relative);
});
if (forbiddenCopies.length) {
  throw new Error(`Forbidden release files survived the copy filter: ${forbiddenCopies.join(', ')}`);
}

const manifestLines = [];
for (const fileName of releaseFiles) {
  const digest = createHash('sha256').update(await readFile(fileName)).digest('hex');
  const relative = path.relative(outputRoot, fileName).split(path.sep).join('/');
  manifestLines.push(`${digest}  ${relative}`);
}

await writeFile(path.join(outputRoot, 'manifest.sha256'), `${manifestLines.join('\n')}\n`, 'utf8');

console.log(`Production release built: ${releaseFiles.length} files in ${outputRoot}`);
console.log(`Excluded ${excludedDuringBuild.size} forbidden backup, draft, or quarantined download path(s).`);
