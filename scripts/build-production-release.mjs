import { readdir, readFile, rm, mkdir, cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicDownloadsManifest,
  loadPublicDownloadAllowlist,
  PUBLIC_DOWNLOADS_MANIFEST,
} from './lib/public-downloads.mjs';
import {
  assertSafeReleaseTree,
  createPublicDirectoryPolicy,
  createDigestEntries,
  inspectReleaseTree,
  publicDirectoryBoundaryFailures,
  RELEASE_MANIFEST_PATH,
  serializeSha256Manifest,
  verifyReleaseManifest,
} from './lib/release-boundary.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(sourceRoot, 'dist', 'production');
const i18nConfig = JSON.parse(await readFile(path.join(sourceRoot, 'i18n', 'config.json'), 'utf8'));
const releaseHtmlInventory = JSON.parse(await readFile(
  path.join(sourceRoot, 'audit', 'policy', 'release-html-inventory.json'),
  'utf8',
));
const publicDirectoryInventory = JSON.parse(await readFile(
  path.join(sourceRoot, 'audit', 'policy', 'public-directory-inventory.json'),
  'utf8',
));
if (publicDirectoryInventory.schemaVersion !== 1) {
  throw new Error('audit/policy/public-directory-inventory.json: unsupported schemaVersion.');
}
const partialLanguageCodes = Object.keys(i18nConfig.partialLanguagePages || {});
const deployedLanguageCodes = [...new Set([
  ...(i18nConfig.activeLanguageCodes || []),
  ...partialLanguageCodes,
])].sort();

if (!outputRoot.startsWith(`${sourceRoot}${path.sep}`)) {
  throw new Error(`Refusing to clean an output path outside the repository: ${outputRoot}`);
}

const rootEntries = await readdir(sourceRoot, { withFileTypes: true });
const rootHtmlEntries = rootEntries.filter((entry) => entry.name.endsWith('.html'));
const invalidRootHtmlEntries = rootHtmlEntries.filter((entry) => !entry.isFile());
if (invalidRootHtmlEntries.length) {
  throw new Error(`Root-level public HTML entries must be regular files: ${invalidRootHtmlEntries.map((entry) => entry.name).sort().join(', ')}`);
}
const rootFiles = rootHtmlEntries
  .map((entry) => entry.name);

const explicitFiles = [
  '.htaccess',
  'robots.txt',
  'sitemap.xml',
  'sitemap-i18n.xml',
  ...partialLanguageCodes.map((code) => `sitemap-${code}.xml`),
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
  'PHPMailer',
  ...deployedLanguageCodes,
];

const publicDirectoryPolicy = createPublicDirectoryPolicy({
  deployedLanguageCodes,
  canonicalPages: i18nConfig.pages || [],
  redirectFiles: releaseHtmlInventory.redirectFiles || [],
  declaredNonHtmlFiles: publicDirectoryInventory.files,
});

async function assertRegularSourceFile(relativePath) {
  const absolutePath = path.join(sourceRoot, relativePath);
  const tree = await inspectReleaseTree(absolutePath);
  assertSafeReleaseTree(tree, relativePath);
  if (tree.files.length !== 1 || tree.directories.length !== 0) {
    throw new Error(`${relativePath}: expected one regular public source file.`);
  }
}

async function assertRegularSourceDirectory(relativePath) {
  const absolutePath = path.join(sourceRoot, relativePath);
  const tree = await inspectReleaseTree(absolutePath);
  assertSafeReleaseTree(tree, relativePath);
  if (tree.directories.length === 0 || tree.directories[0].relativePath !== '') {
    throw new Error(`${relativePath}: expected a regular public source directory.`);
  }
  return tree;
}

for (const fileName of [...rootFiles, ...explicitFiles]) await assertRegularSourceFile(fileName);
const publicSourceTrees = new Map();
for (const directoryName of publicDirectories) {
  publicSourceTrees.set(directoryName, await assertRegularSourceDirectory(directoryName));
}

const sourcePublicFiles = [...publicSourceTrees].flatMap(([directoryName, tree]) => (
  tree.files.map((file) => ({
    ...file,
    relativePath: `${directoryName}/${file.relativePath}`,
  }))
));
const sourcePublicBoundaryFailures = publicDirectoryBoundaryFailures(
  sourcePublicFiles,
  publicDirectoryPolicy,
  { requireCompleteInventory: true },
);
if (sourcePublicBoundaryFailures.length) {
  throw new Error(`Public source directories contain files outside the explicit path/extension allowlist:\n- ${sourcePublicBoundaryFailures.join('\n- ')}`);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const fileName of [...rootFiles, ...explicitFiles]) {
  await cp(path.join(sourceRoot, fileName), path.join(outputRoot, fileName));
}

for (const directoryName of publicDirectories) {
  await cp(path.join(sourceRoot, directoryName), path.join(outputRoot, directoryName), {
    recursive: true,
  });
}

// IndexNow requires a public proof file. In the canonical release workflow the
// key is injected before manifest creation so the audited and deployed bytes
// remain identical. Local and pull-request builds intentionally omit it.
const indexNowKey = (process.env.INDEXNOW_KEY || '').trim();
if (indexNowKey) {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(indexNowKey)) {
    throw new Error('INDEXNOW_KEY has an invalid format.');
  }
  await writeFile(path.join(outputRoot, `${indexNowKey}.txt`), indexNowKey, 'utf8');
}

const sourceDownloadsRoot = path.join(sourceRoot, 'downloads');
const releaseDownloadsRoot = path.join(outputRoot, 'downloads');
const sourceDownloadsTree = await assertRegularSourceDirectory('downloads');
const publicDownloadFiles = await loadPublicDownloadAllowlist(sourceRoot);
const expectedDownloadsManifest = await createPublicDownloadsManifest(sourceDownloadsRoot, publicDownloadFiles);
const sourceDownloadsManifest = (await readFile(path.join(sourceDownloadsRoot, PUBLIC_DOWNLOADS_MANIFEST), 'utf8'))
  .replaceAll('\r\n', '\n');
if (sourceDownloadsManifest !== expectedDownloadsManifest) {
  throw new Error(`${PUBLIC_DOWNLOADS_MANIFEST} is stale. Run npm run downloads:manifest before building the release.`);
}

await mkdir(releaseDownloadsRoot, { recursive: true });
for (const fileName of [...publicDownloadFiles, PUBLIC_DOWNLOADS_MANIFEST]) {
  await cp(path.join(sourceDownloadsRoot, fileName), path.join(releaseDownloadsRoot, fileName));
}

const approvedSourceDownloads = new Set([...publicDownloadFiles, PUBLIC_DOWNLOADS_MANIFEST]);
const nonPublicSourceDownloads = sourceDownloadsTree.files
  .map((entry) => entry.relativePath)
  .filter((relativePath) => !approvedSourceDownloads.has(relativePath));
if (nonPublicSourceDownloads.length) {
  throw new Error(`downloads/ contains files outside the approved public-download allowlist: ${nonPublicSourceDownloads.sort().join(', ')}`);
}

const releaseTree = await inspectReleaseTree(outputRoot);
assertSafeReleaseTree(releaseTree, outputRoot);
const releaseFiles = releaseTree.files
  .filter(({ relativePath }) => relativePath !== RELEASE_MANIFEST_PATH);

const releasePublicFiles = releaseFiles.filter(({ relativePath }) => (
  publicDirectories.some((directoryName) => relativePath.startsWith(`${directoryName}/`))
));
const releasePublicBoundaryFailures = publicDirectoryBoundaryFailures(
  releasePublicFiles,
  publicDirectoryPolicy,
  { requireCompleteInventory: true },
);
if (releasePublicBoundaryFailures.length) {
  throw new Error(`Copied public directories escaped the explicit path/extension allowlist:\n- ${releasePublicBoundaryFailures.join('\n- ')}`);
}

const forbiddenCopies = releaseFiles.filter(({ relativePath }) => {
  const relative = relativePath.toLowerCase();
  return relative.endsWith('.bak')
    || relative.endsWith('.backup');
});
if (forbiddenCopies.length) {
  throw new Error(`Forbidden backup files survived the copy filter: ${forbiddenCopies.map(({ relativePath }) => relativePath).join(', ')}`);
}

const expectedReleaseDownloads = new Set(
  [...publicDownloadFiles, PUBLIC_DOWNLOADS_MANIFEST].map((fileName) => `downloads/${fileName}`),
);
const actualReleaseDownloads = releaseFiles
  .map(({ relativePath }) => relativePath)
  .filter((fileName) => fileName.startsWith('downloads/'));
const unexpectedReleaseDownloads = actualReleaseDownloads.filter((fileName) => !expectedReleaseDownloads.has(fileName));
const missingReleaseDownloads = [...expectedReleaseDownloads].filter((fileName) => !actualReleaseDownloads.includes(fileName));
if (unexpectedReleaseDownloads.length || missingReleaseDownloads.length) {
  throw new Error(`Release download boundary mismatch. Unexpected: ${unexpectedReleaseDownloads.join(', ') || 'none'}; missing: ${missingReleaseDownloads.join(', ') || 'none'}.`);
}

const manifestEntries = await createDigestEntries(releaseFiles);
const manifestSource = serializeSha256Manifest(manifestEntries);
await writeFile(path.join(outputRoot, RELEASE_MANIFEST_PATH), manifestSource, 'utf8');

const finalReleaseTree = await inspectReleaseTree(outputRoot);
assertSafeReleaseTree(finalReleaseTree, outputRoot);
const manifestVerification = await verifyReleaseManifest({
  files: finalReleaseTree.files,
  manifestSource,
});
if (manifestVerification.failures.length) {
  throw new Error(`Generated release manifest failed exact-boundary verification:\n- ${manifestVerification.failures.join('\n- ')}`);
}

console.log(`Production release built: ${manifestVerification.entryCount} manifest-tracked regular files in ${outputRoot}`);
console.log(`Published ${publicDownloadFiles.length} approved PDF/STEP download(s); public source directories contain no private or backup files.`);
