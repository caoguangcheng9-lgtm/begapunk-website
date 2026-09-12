import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  assertSafeReleaseTree,
  createPublicDirectoryPolicy,
  createDigestEntries,
  inspectReleaseTree,
  parseSha256Manifest,
  publicDirectoryBoundaryFailures,
  publicDirectoryPathProblem,
  releaseNodeType,
  RELEASE_MANIFEST_PATH,
  serializeSha256Manifest,
  verifyReleaseManifest,
} from '../scripts/lib/release-boundary.mjs';

const publicDirectoryPolicy = createPublicDirectoryPolicy({
  deployedLanguageCodes: ['de', 'fr'],
  canonicalPages: ['index.html', 'contact.html'],
  redirectFiles: ['legacy-root.html', 'de/products-p2.html'],
  declaredNonHtmlFiles: [
    'PHPMailer/Exception.php',
    'css/style.css',
    'fonts/LICENSE-Inter.txt',
    'fonts/inter-latin.woff2',
    'fr/search-index.json',
    'images/products/photo.JPG',
    'js/site-navigation.js',
    'js/vendor/fuse.LICENSE.txt',
    'js/vendor/fuse.min.js',
    'videos/factory-tour.mp4',
  ],
});

const execFileAsync = promisify(execFile);

function fakeStats(type) {
  const types = {
    'symbolic link': 'isSymbolicLink',
    'regular file': 'isFile',
    directory: 'isDirectory',
    socket: 'isSocket',
    FIFO: 'isFIFO',
    'block device': 'isBlockDevice',
    'character device': 'isCharacterDevice',
  };
  const active = types[type];
  return Object.fromEntries(
    ['isSymbolicLink', 'isFile', 'isDirectory', 'isSocket', 'isFIFO', 'isBlockDevice', 'isCharacterDevice']
      .map((method) => [method, () => method === active]),
  );
}

test('release node classification rejects every non-file/non-directory kind', () => {
  for (const type of ['symbolic link', 'socket', 'FIFO', 'block device', 'character device']) {
    assert.equal(releaseNodeType(fakeStats(type)), type);
    assert.throws(
      () => assertSafeReleaseTree({
        root: 'fixture',
        forbiddenNodes: [{ relativePath: 'unsafe-entry', type }],
        unsafePaths: [],
      }),
      new RegExp(`unsafe-entry: forbidden ${type}`),
    );
  }
  assert.equal(releaseNodeType(fakeStats('unknown')), 'unknown node type');
  assert.throws(
    () => assertSafeReleaseTree({
      root: 'fixture',
      forbiddenNodes: [{ relativePath: 'unsafe-entry', type: 'unknown node type' }],
      unsafePaths: [],
    }),
    /unsafe-entry: forbidden unknown node type/,
  );
  assert.equal(releaseNodeType(fakeStats('regular file')), 'regular file');
  assert.equal(releaseNodeType(fakeStats('directory')), 'directory');
});

test('tree inspection reports a symbolic link instead of following it', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'begapunk-release-boundary-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = path.join(root, 'target');
  await mkdir(target);
  await writeFile(path.join(target, 'inside.txt'), 'inside\n');
  try {
    await symlink(target, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (error?.code === 'EPERM' || error?.code === 'EACCES') {
      t.skip(`This host does not permit test symlink creation (${error.code}).`);
      return;
    }
    throw error;
  }

  const tree = await inspectReleaseTree(root);
  assert.deepEqual(tree.forbiddenNodes.map(({ relativePath, type }) => ({ relativePath, type })), [
    { relativePath: 'linked', type: 'symbolic link' },
  ]);
  assert.equal(tree.files.some(({ relativePath }) => relativePath === 'linked/inside.txt'), false);
  assert.throws(() => assertSafeReleaseTree(tree), /linked: forbidden symbolic link/);
});

test('manifest records exactly the regular files on disk and verifies every digest', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'begapunk-release-boundary-manifest-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'nested'));
  await writeFile(path.join(root, 'alpha.txt'), 'alpha\n');
  await writeFile(path.join(root, 'nested', 'beta.txt'), 'beta\n');

  const initialTree = await inspectReleaseTree(root);
  const manifestSource = serializeSha256Manifest(await createDigestEntries(initialTree.files));
  await writeFile(path.join(root, RELEASE_MANIFEST_PATH), manifestSource);

  let tree = await inspectReleaseTree(root);
  let result = await verifyReleaseManifest({ files: tree.files, manifestSource });
  assert.deepEqual(result.failures, []);
  assert.equal(result.entryCount, 2);

  await writeFile(path.join(root, 'unlisted.txt'), 'extra\n');
  tree = await inspectReleaseTree(root);
  result = await verifyReleaseManifest({ files: tree.files, manifestSource });
  assert.match(result.failures.join('\n'), /disk contains an unlisted regular file \(unlisted\.txt\)/);

  await unlink(path.join(root, 'nested', 'beta.txt'));
  await writeFile(path.join(root, 'alpha.txt'), 'tampered\n');
  tree = await inspectReleaseTree(root);
  result = await verifyReleaseManifest({ files: tree.files, manifestSource });
  assert.match(result.failures.join('\n'), /lists a missing regular file \(nested\/beta\.txt\)/);
  assert.match(result.failures.join('\n'), /SHA-256 mismatch \(alpha\.txt\)/);
});

test('manifest parser rejects duplicate, self-referential, and unsafe records', () => {
  const digest = '0'.repeat(64);
  assert.throws(
    () => parseSha256Manifest(`${digest}  alpha.txt\n${digest}  alpha.txt\n`),
    /duplicate path/,
  );
  assert.throws(
    () => parseSha256Manifest(`${digest}  ${RELEASE_MANIFEST_PATH}\n`),
    /self-referential/,
  );
  assert.throws(
    () => parseSha256Manifest(`${digest}  ..\/outside.txt\n`),
    /parent-directory/,
  );
});

test('public directory policy allows only declared paths and static extensions', () => {
  const allowed = [
    'css/style.css',
    'js/site-navigation.js',
    'js/vendor/fuse.min.js',
    'js/vendor/fuse.LICENSE.txt',
    'fonts/inter-latin.woff2',
    'fonts/LICENSE-Inter.txt',
    'images/products/photo.JPG',
    'videos/factory-tour.mp4',
    'PHPMailer/Exception.php',
    'fr/index.html',
    'fr/search-index.json',
    'de/products-p2.html',
  ];
  for (const relativePath of allowed) {
    assert.equal(publicDirectoryPathProblem(relativePath, publicDirectoryPolicy), '', relativePath);
  }
});

test('public directory policy rejects executable, hidden, undeclared, and misplaced files', () => {
  const rejected = [
    'fr/debug.php',
    'fr/undeclared.html',
    'images/customer-list.csv',
    'images/internal-drawing.jpg',
    'images/.private/photo.jpg',
    'js/credential.js',
    'js/shell.php',
    'fonts/nested/font.woff2',
    'PHPMailer/extra.php',
    'unknown/file.css',
  ];
  const failures = publicDirectoryBoundaryFailures(
    rejected.map((relativePath) => ({ relativePath })),
    publicDirectoryPolicy,
  );
  assert.equal(failures.length, rejected.length);
  for (const relativePath of rejected) {
    assert.match(failures.join('\n'), new RegExp(relativePath.replaceAll('.', '\\.')));
  }
});

test('public directory exact inventory fails closed when a declared file is missing', () => {
  const files = [...publicDirectoryPolicy.declaredNonHtmlPaths]
    .filter((relativePath) => relativePath !== 'images/products/photo.JPG')
    .map((relativePath) => ({ relativePath }));
  const failures = publicDirectoryBoundaryFailures(
    files,
    publicDirectoryPolicy,
    { requireCompleteInventory: true },
  );
  assert.match(failures.join('\n'), /images\/products\/photo\.JPG: versioned non-HTML public inventory entry is missing/);
});

test('server release/runtime boundary regression suite passes', {
  skip: process.platform === 'win32' ? 'The server safety suite requires Linux ownership and node semantics.' : false,
}, async () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { stdout, stderr } = await execFileAsync('bash', ['tests/release-server-safety.test.sh'], {
    cwd: repositoryRoot,
  });
  assert.match(stdout, /Server release safety tests passed/);
  assert.equal(stderr, '');
});

test('bootstrap exact-verifies the copied seed before adding runtime links', async () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const bootstrapSource = await readFile(path.join(repositoryRoot, 'ops', 'bootstrap-server.sh'), 'utf8');
  const seedCopy = bootstrapSource.indexOf('"$LIVE_ROOT/" "$seed_dir/"');
  const inquiryMigrationGuard = bootstrapSource.indexOf(
    '[[ ! -e "$BASE_DIR/shared/.env" && ! -L "$BASE_DIR/shared/.env"',
  );
  const inquirySourceValidation = bootstrapSource.indexOf(
    'validate_plain_runtime_file "$LIVE_ROOT/.env" || exit 12',
  );
  const inquiryEnvironmentInstall = bootstrapSource.indexOf(
    'install -o root -g www -m 0640 -- "$LIVE_ROOT/.env" "$BASE_DIR/shared/.env"',
  );
  const inquiryEnvironmentValidation = bootstrapSource.indexOf(
    'validate_inquiry_environment_file "$BASE_DIR/shared/.env" 0 "$www_gid"',
  );
  const managedDirectoryPreflight = bootstrapSource.indexOf(
    'for managed_dir in "$BASE_DIR" "$BASE_DIR/releases" "$BASE_DIR/shared" "$BASE_DIR/bin" "$BASE_DIR/staging"',
  );
  const managedTreePreflight = bootstrapSource.indexOf(
    'validate_plain_directory_tree "$BASE_DIR" || exit 12',
  );
  const managedDirectorySymlinkGuard = bootstrapSource.indexOf(
    '[[ -d "$managed_dir" && ! -L "$managed_dir" ]]',
    managedDirectoryPreflight,
  );
  const managedDirectoryCreation = bootstrapSource.indexOf(
    'mkdir -p "$BASE_DIR/releases" "$BASE_DIR/shared" "$BASE_DIR/bin" "$BASE_DIR/staging"',
  );
  const manifestCreation = bootstrapSource.indexOf("find . -type f ! -name manifest.sha256 -printf '%P\\0'");
  const exactVerification = bootstrapSource.indexOf('verify_release_tree_exact "$seed_dir"');
  const wellKnownBinding = bootstrapSource.indexOf('ln -s "$BASE_DIR/shared/.well-known" "$seed_dir/.well-known"');
  const legacyEnvBinding = bootstrapSource.indexOf('ln -s "$BASE_DIR/shared/.env" "$seed_dir/.env"');
  const verificationFileBinding = bootstrapSource.indexOf('ln -s "$verification_file" "$seed_dir/$(basename "$verification_file")"');

  assert.ok(managedTreePreflight >= 0, 'bootstrap must reject nested links and special nodes in an existing deployment tree');
  assert.ok(managedDirectoryPreflight > managedTreePreflight, 'bootstrap managed-directory preflight is missing or out of order');
  assert.ok(managedDirectorySymlinkGuard > managedDirectoryPreflight, 'bootstrap must reject managed-directory symlinks');
  assert.ok(managedDirectoryCreation > managedDirectorySymlinkGuard, 'bootstrap must reject unsafe managed paths before creating or changing them');
  assert.ok(inquiryMigrationGuard >= 0, 'bootstrap must not overwrite an existing or dangling shared .env link');
  assert.ok(inquirySourceValidation > inquiryMigrationGuard, 'bootstrap must validate a legacy .env before copying it');
  assert.ok(inquiryEnvironmentInstall > inquirySourceValidation, 'bootstrap may install a legacy .env only after source validation');
  assert.ok(inquiryEnvironmentValidation > inquiryEnvironmentInstall, 'bootstrap must validate the canonical shared .env after migration');
  assert.ok(inquiryEnvironmentValidation < seedCopy, 'shared .env validation must complete before copying or switching the initial release');
  assert.ok(seedCopy >= 0, 'bootstrap seed copy contract is missing');
  assert.ok(manifestCreation > seedCopy, 'bootstrap manifest must be generated after the seed copy');
  assert.ok(exactVerification > manifestCreation, 'bootstrap seed must be verified after manifest generation');
  for (const runtimeBinding of [wellKnownBinding, legacyEnvBinding, verificationFileBinding]) {
    assert.ok(runtimeBinding > exactVerification, 'runtime bindings must be added only after exact seed verification');
  }
});

test('every activation validates the canonical inquiry environment before release verification and switching', async () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const activationSource = await readFile(path.join(repositoryRoot, 'ops', 'activate-release.sh'), 'utf8');
  const inquiryEnvironmentValidation = activationSource.indexOf(
    'validate_inquiry_environment_file "$SHARED_DIR/.env" 0 "$www_gid"',
  );
  const sharedRuntimeValidation = activationSource.indexOf(
    'validate_shared_runtime_bindings "$SHARED_DIR" 0 0',
    inquiryEnvironmentValidation,
  );
  const releaseVerification = activationSource.indexOf(
    'verify_release_manifest_identity "$release_dir" "$expected_manifest_sha256"',
  );
  const releaseSwitch = activationSource.indexOf('mv -Tf "$next_link" "$CURRENT_LINK"');

  assert.ok(inquiryEnvironmentValidation >= 0, 'activation inquiry environment validation is missing');
  assert.ok(sharedRuntimeValidation > inquiryEnvironmentValidation, 'activation must validate the inquiry environment before shared runtime bindings');
  assert.ok(releaseVerification > sharedRuntimeValidation, 'activation must validate shared runtime state before release identity');
  assert.ok(releaseSwitch > releaseVerification, 'activation must validate inquiry and artifact state before switching current');
});
