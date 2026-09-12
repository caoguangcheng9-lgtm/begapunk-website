import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const RELEASE_MANIFEST_PATH = 'manifest.sha256';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const PUBLIC_ASSET_EXTENSION_ALLOWLIST = new Map([
  ['css', new Set(['.css'])],
  ['js', new Set(['.js'])],
  ['fonts', new Set(['.woff2'])],
  ['images', new Set(['.ico', '.jpg', '.png', '.webp'])],
  ['videos', new Set(['.mp4'])],
]);

const PUBLIC_ASSET_NESTING_ALLOWLIST = new Set(['js', 'images']);

const EXACT_PUBLIC_ASSET_PATHS = new Set([
  'js/vendor/fuse.LICENSE.txt',
  'fonts/LICENSE-Inter.txt',
  'fonts/LICENSE-Playfair-Display.txt',
  'PHPMailer/Exception.php',
  'PHPMailer/PHPMailer.php',
  'PHPMailer/SMTP.php',
]);

// Do not use localeCompare for manifest ordering: ICU/locale revisions can
// differ between runners. JavaScript's relational comparison is deterministic
// over the path's UTF-16 code units on every supported platform.
function compareReleasePath(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function releaseNodeType(stats) {
  if (stats.isSymbolicLink()) return 'symbolic link';
  if (stats.isFile()) return 'regular file';
  if (stats.isDirectory()) return 'directory';
  if (stats.isSocket()) return 'socket';
  if (stats.isFIFO()) return 'FIFO';
  if (stats.isBlockDevice()) return 'block device';
  if (stats.isCharacterDevice()) return 'character device';
  return 'unknown node type';
}

export function releasePathProblem(relativePath) {
  if (!relativePath || relativePath.startsWith('/') || relativePath.includes('\\')) {
    return 'path is not a normalized relative POSIX path';
  }
  if (/[\u0000-\u001f\u007f]/u.test(relativePath)) {
    return 'path contains a control character that cannot be represented safely in the manifest';
  }
  if (relativePath.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return 'path contains an empty, current-directory, or parent-directory segment';
  }
  return '';
}

function assertPolicyArray(value, owner) {
  if (!Array.isArray(value)) throw new Error(`${owner} must be an array.`);
}

export function createPublicDirectoryPolicy({
  deployedLanguageCodes,
  canonicalPages,
  redirectFiles = [],
  declaredNonHtmlFiles,
}) {
  assertPolicyArray(deployedLanguageCodes, 'deployedLanguageCodes');
  assertPolicyArray(canonicalPages, 'canonicalPages');
  assertPolicyArray(redirectFiles, 'redirectFiles');
  assertPolicyArray(declaredNonHtmlFiles, 'declaredNonHtmlFiles');

  const languages = new Set();
  for (const code of deployedLanguageCodes) {
    if (typeof code !== 'string' || !/^[a-z]{2,3}(?:-[a-z0-9]+)*$/u.test(code)) {
      throw new Error(`Invalid deployed language code in the public-directory policy: ${String(code)}`);
    }
    languages.add(code);
  }

  const pages = new Set();
  for (const page of canonicalPages) {
    if (typeof page !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.html$/u.test(page)) {
      throw new Error(`Invalid canonical HTML filename in the public-directory policy: ${String(page)}`);
    }
    pages.add(page);
  }

  const htmlPaths = new Set();
  const exactNonHtmlPatterns = new Set(EXACT_PUBLIC_ASSET_PATHS);
  for (const code of languages) {
    for (const page of pages) htmlPaths.add(`${code}/${page}`);
    exactNonHtmlPatterns.add(`${code}/llms.txt`);
    exactNonHtmlPatterns.add(`${code}/search-index.json`);
  }

  for (const redirectFile of redirectFiles) {
    const problem = releasePathProblem(redirectFile);
    if (problem || !redirectFile.endsWith('.html')) {
      throw new Error(`Invalid compatibility redirect in the public-directory policy (${String(redirectFile)}).`);
    }
    const [prefix] = redirectFile.split('/');
    if (languages.has(prefix)) htmlPaths.add(redirectFile);
  }

  const declaredNonHtmlPaths = new Set();
  let previousDeclaredPath = '';
  for (const declaredPath of declaredNonHtmlFiles) {
    if (typeof declaredPath !== 'string') {
      throw new Error(`Invalid non-HTML public inventory path (${String(declaredPath)}).`);
    }
    const problem = releasePathProblem(declaredPath);
    if (problem || declaredPath.endsWith('.html')) {
      throw new Error(`Invalid non-HTML public inventory path (${String(declaredPath)}).`);
    }
    if (previousDeclaredPath && declaredPath <= previousDeclaredPath) {
      throw new Error(`Non-HTML public inventory must be unique and code-unit sorted (${declaredPath}).`);
    }
    declaredNonHtmlPaths.add(declaredPath);
    previousDeclaredPath = declaredPath;
  }

  const publicDirectoryNames = new Set([
    ...PUBLIC_ASSET_EXTENSION_ALLOWLIST.keys(),
    'PHPMailer',
    ...languages,
  ]);

  const policy = Object.freeze({
    languages,
    htmlPaths,
    exactNonHtmlPatterns,
    declaredNonHtmlPaths,
    publicDirectoryNames,
  });
  for (const declaredPath of declaredNonHtmlPaths) {
    const declaredProblem = publicDirectoryPathProblem(declaredPath, policy);
    if (declaredProblem) {
      throw new Error(`Invalid non-HTML public inventory entry (${declaredPath}: ${declaredProblem}).`);
    }
  }
  return policy;
}

export function publicDirectoryPathProblem(relativePath, policy) {
  const pathProblem = releasePathProblem(relativePath);
  if (pathProblem) return pathProblem;
  if (!policy?.htmlPaths || !policy?.exactNonHtmlPatterns || !policy?.declaredNonHtmlPaths
    || !policy?.languages || !policy?.publicDirectoryNames) {
    return 'public-directory policy is missing or invalid';
  }

  const segments = relativePath.split('/');
  if (segments.some((segment) => segment.startsWith('.'))) {
    return 'hidden path segments are not allowed in public directories';
  }

  const [directoryName] = segments;
  if (!policy.publicDirectoryNames.has(directoryName)) {
    return `top-level public directory is not allowlisted (${directoryName})`;
  }
  if (policy.htmlPaths.has(relativePath)) return '';

  if (policy.exactNonHtmlPatterns.has(relativePath)) {
    return policy.declaredNonHtmlPaths.has(relativePath)
      ? ''
      : 'non-HTML public file is absent from the versioned exact inventory';
  }

  if (policy.languages.has(directoryName)) {
    return 'localized public file is not a canonical page, discovery asset, or declared compatibility redirect';
  }
  if (directoryName === 'PHPMailer') {
    return 'PHPMailer public file is not one of the three required runtime classes';
  }

  const allowedExtensions = PUBLIC_ASSET_EXTENSION_ALLOWLIST.get(directoryName);
  if (!allowedExtensions) return `public directory has no file allowlist (${directoryName})`;
  if (segments.length > 2 && !PUBLIC_ASSET_NESTING_ALLOWLIST.has(directoryName)) {
    return `${directoryName}/ does not allow nested public files`;
  }

  const extension = path.posix.extname(relativePath).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    return `${directoryName}/ does not allow the ${extension || '(no extension)'} file type`;
  }
  return policy.declaredNonHtmlPaths.has(relativePath)
    ? ''
    : 'non-HTML public file is absent from the versioned exact inventory';
}

export function publicDirectoryBoundaryFailures(files, policy, { requireCompleteInventory = false } = {}) {
  if (!Array.isArray(files)) throw new Error('Public-directory file inventory must be an array.');
  const failures = files.flatMap(({ relativePath }) => {
    const problem = publicDirectoryPathProblem(relativePath, policy);
    return problem ? [`${relativePath}: ${problem}`] : [];
  });
  if (requireCompleteInventory) {
    const actualPaths = new Set(files.map(({ relativePath }) => relativePath));
    for (const declaredPath of policy.declaredNonHtmlPaths) {
      if (!actualPaths.has(declaredPath)) {
        failures.push(`${declaredPath}: versioned non-HTML public inventory entry is missing from disk`);
      }
    }
  }
  return failures;
}

export async function inspectReleaseTree(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const files = [];
  const directories = [];
  const forbiddenNodes = [];
  const unsafePaths = [];

  async function visit(absolutePath, relativePath) {
    const stats = await lstat(absolutePath);
    const type = releaseNodeType(stats);

    if (relativePath) {
      const problem = releasePathProblem(relativePath);
      if (problem) unsafePaths.push({ relativePath, problem });
    }

    if (type === 'directory') {
      directories.push({ absolutePath, relativePath });
      const names = await readdir(absolutePath);
      names.sort(compareReleasePath);
      for (const name of names) {
        const childRelative = relativePath ? `${relativePath}/${name}` : name;
        await visit(path.join(absolutePath, name), childRelative);
      }
      return;
    }

    if (type === 'regular file') {
      files.push({ absolutePath, relativePath, size: stats.size });
      return;
    }

    forbiddenNodes.push({ absolutePath, relativePath: relativePath || '.', type });
  }

  await visit(root, '');
  files.sort((left, right) => compareReleasePath(left.relativePath, right.relativePath));
  directories.sort((left, right) => compareReleasePath(left.relativePath, right.relativePath));
  forbiddenNodes.sort((left, right) => compareReleasePath(left.relativePath, right.relativePath));
  unsafePaths.sort((left, right) => compareReleasePath(left.relativePath, right.relativePath));

  return { root, files, directories, forbiddenNodes, unsafePaths };
}

export function assertSafeReleaseTree(tree, owner = tree.root) {
  const failures = [
    ...tree.forbiddenNodes.map(({ relativePath, type }) => `${relativePath}: forbidden ${type}`),
    ...tree.unsafePaths.map(({ relativePath, problem }) => `${relativePath}: ${problem}`),
  ];
  if (failures.length) {
    throw new Error(`${owner}: release tree contains unsupported entries:\n- ${failures.join('\n- ')}`);
  }
}

export async function createDigestEntries(files) {
  const entries = [];
  for (const file of [...files].sort((left, right) => compareReleasePath(left.relativePath, right.relativePath))) {
    const problem = releasePathProblem(file.relativePath);
    if (problem) throw new Error(`${file.relativePath}: ${problem}`);
    const digest = createHash('sha256').update(await readFile(file.absolutePath)).digest('hex');
    entries.push({ digest, relativePath: file.relativePath });
  }
  return entries;
}

export function serializeSha256Manifest(entries) {
  return `${entries.map(({ digest, relativePath }) => {
    if (!SHA256_PATTERN.test(digest)) throw new Error(`Invalid SHA-256 digest for ${relativePath}.`);
    const problem = releasePathProblem(relativePath);
    if (problem) throw new Error(`${relativePath}: ${problem}`);
    return `${digest}  ${relativePath}`;
  }).join('\n')}\n`;
}

export function parseSha256Manifest(source, owner = RELEASE_MANIFEST_PATH) {
  if (typeof source !== 'string' || !source.endsWith('\n')) {
    throw new Error(`${owner}: manifest must be UTF-8 text ending with one newline.`);
  }
  if (source.includes('\r')) throw new Error(`${owner}: manifest must use LF line endings.`);

  const lines = source.slice(0, -1).split('\n');
  if (lines.some((line) => line === '')) throw new Error(`${owner}: manifest contains a blank line.`);

  const records = new Map();
  for (const [index, line] of lines.entries()) {
    const match = line.match(/^([0-9a-f]{64})  (.+)$/);
    if (!match) throw new Error(`${owner}:${index + 1}: invalid canonical sha256sum record.`);
    const [, digest, relativePath] = match;
    const problem = releasePathProblem(relativePath);
    if (problem) throw new Error(`${owner}:${index + 1}: ${relativePath}: ${problem}.`);
    if (relativePath === RELEASE_MANIFEST_PATH) {
      throw new Error(`${owner}:${index + 1}: the manifest cannot contain a self-referential record.`);
    }
    if (records.has(relativePath)) throw new Error(`${owner}:${index + 1}: duplicate path (${relativePath}).`);
    records.set(relativePath, digest);
  }
  return records;
}

export async function verifyReleaseManifest({ files, manifestSource, owner = RELEASE_MANIFEST_PATH }) {
  const failures = [];
  const diskFiles = files.filter(({ relativePath }) => relativePath !== RELEASE_MANIFEST_PATH);
  const diskByPath = new Map(diskFiles.map((file) => [file.relativePath, file]));
  let records;
  try {
    records = parseSha256Manifest(manifestSource, owner);
  } catch (error) {
    return { failures: [error.message], entryCount: 0 };
  }

  for (const relativePath of records.keys()) {
    if (!diskByPath.has(relativePath)) failures.push(`${owner}: lists a missing regular file (${relativePath}).`);
  }
  for (const [relativePath, file] of diskByPath) {
    if (!records.has(relativePath)) {
      failures.push(`${owner}: disk contains an unlisted regular file (${relativePath}).`);
      continue;
    }
    const digest = createHash('sha256').update(await readFile(file.absolutePath)).digest('hex');
    if (records.get(relativePath) !== digest) failures.push(`${owner}: SHA-256 mismatch (${relativePath}).`);
  }

  return { failures, entryCount: records.size };
}
