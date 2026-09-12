import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { load } from 'cheerio';
import {
  loadPublicDownloadAllowlist,
  parsePublicDownloadsManifest,
} from './lib/public-downloads.mjs';
import {
  createPublicDirectoryPolicy,
  inspectReleaseTree,
  publicDirectoryBoundaryFailures,
  RELEASE_MANIFEST_PATH,
  verifyReleaseManifest,
} from './lib/release-boundary.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseRoot = path.resolve(process.argv[2] || 'dist/production');
const failures = [];
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
const partialLanguagePages = i18nConfig.partialLanguagePages || {};
const partialLanguageAssets = i18nConfig.partialLanguageAssets || {};
const partialLanguageCodes = Object.keys(partialLanguagePages);
const deployedLanguageCodes = [...new Set([
  ...(i18nConfig.activeLanguageCodes || []),
  ...partialLanguageCodes,
])].sort();
const escapedLanguageCodes = deployedLanguageCodes
  .map((code) => code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const homepageAliasPathPattern = new RegExp(
  `^/(?:index\\.html|(?:${escapedLanguageCodes})/index\\.html)$`,
);
const partialSitemapFiles = partialLanguageCodes.map((code) => `sitemap-${code}.xml`);
const approvedPublicDownloadFiles = await loadPublicDownloadAllowlist(sourceRoot);
const approvedPublicDownloads = new Set(approvedPublicDownloadFiles);

function toReleasePath(fileName) {
  return path.relative(releaseRoot, fileName).split(path.sep).join('/');
}

function isForbiddenReleasePath(relativePath) {
  const lower = relativePath.toLowerCase();
  return lower.endsWith('.bak')
    || lower.endsWith('.backup');
}

async function exists(relativePath) {
  try {
    await stat(path.join(releaseRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

const releaseTree = await inspectReleaseTree(releaseRoot);
for (const { relativePath, type } of releaseTree.forbiddenNodes) {
  failures.push(`Forbidden non-regular release entry: ${relativePath} (${type})`);
}
for (const { relativePath, problem } of releaseTree.unsafePaths) {
  failures.push(`Unsafe release path: ${relativePath} (${problem})`);
}
const allFiles = releaseTree.files.map(({ absolutePath }) => absolutePath);
const regularFilesByPath = new Map(releaseTree.files.map((file) => [file.relativePath, file]));
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
const releasePublicFiles = releaseTree.files.filter(({ relativePath }) => (
  publicDirectories.some((directoryName) => relativePath.startsWith(`${directoryName}/`))
));
failures.push(...publicDirectoryBoundaryFailures(
  releasePublicFiles,
  publicDirectoryPolicy,
  { requireCompleteInventory: true },
).map((failure) => `Public directory inventory: ${failure}`));

const requiredFiles = [
  'index.html',
  '404.html',
  'products.html',
  'contact.html',
  'send_inquiry.php',
  'css/style.css',
  'js/analytics.js',
  'robots.txt',
  'sitemap.xml',
  'sitemap-i18n.xml',
  ...partialSitemapFiles,
  'manifest.sha256',
  'downloads/public-downloads.sha256',
  ...(i18nConfig.activeLanguageCodes || []).flatMap((code) => (
    (i18nConfig.pages || []).map((pageName) => `${code}/${pageName}`)
  )),
  ...Object.entries(partialLanguagePages).flatMap(([code, pages]) => (
    pages.map((pageName) => `${code}/${pageName}`)
  )),
  ...Object.entries(partialLanguageAssets).flatMap(([code, assets]) => (
    assets.map((assetName) => `${code}/${assetName}`)
  )),
];

for (const fileName of requiredFiles) {
  if (!regularFilesByPath.has(fileName)) failures.push(`Missing required regular release file: ${fileName}`);
}

for (const forbidden of ['.env', '.git', 'audit', 'catalog-project', 'i18n', 'scripts', 'package.json']) {
  if (await exists(forbidden)) failures.push(`Forbidden source or secret content in release: ${forbidden}`);
}

const htmlFiles = allFiles.filter((fileName) => fileName.endsWith('.html'));
const allowedPartialSitemaps = new Set(partialSitemapFiles);
for (const relativePath of allFiles.map(toReleasePath).filter((fileName) => /^sitemap-[a-z]{2}\.xml$/i.test(fileName))) {
  if (!allowedPartialSitemaps.has(relativePath)) {
    failures.push(`Stale partial-locale sitemap in release: ${relativePath}`);
  }
}

for (const fileName of allFiles) {
  const relative = toReleasePath(fileName);
  if (isForbiddenReleasePath(relative)) {
    failures.push(`Forbidden backup, draft, or quarantined download in release: ${relative}`);
  }
}

async function validatePublicDownloadsManifest() {
  const manifestRelative = 'downloads/public-downloads.sha256';
  if (!regularFilesByPath.has(manifestRelative)) return 0;

  const downloadsRoot = path.join(releaseRoot, 'downloads');
  const manifestPath = path.join(releaseRoot, manifestRelative);
  let manifestSource;
  let downloadFiles;
  try {
    manifestSource = await readFile(manifestPath, 'utf8');
    downloadFiles = releaseTree.files
      .filter(({ relativePath }) => relativePath.startsWith('downloads/') && relativePath !== manifestRelative)
      .map(({ absolutePath }) => absolutePath);
  } catch (error) {
    failures.push(`${manifestRelative}: unable to read downloads manifest or directory (${error.message})`);
    return 0;
  }

  const actualByName = new Map();
  const actualByFoldedName = new Map();
  for (const fileName of downloadFiles) {
    const relative = path.relative(downloadsRoot, fileName).split(path.sep).join('/');
    const folded = relative.normalize('NFC').toLowerCase();
    if (actualByFoldedName.has(folded)) {
      failures.push(`${manifestRelative}: case-insensitive or Unicode-normalized file collision (${actualByFoldedName.get(folded)} and ${relative})`);
    }
    actualByName.set(relative, fileName);
    actualByFoldedName.set(folded, relative);
  }

  let records;
  try {
    records = parsePublicDownloadsManifest(manifestSource, manifestRelative);
  } catch (error) {
    failures.push(error.message);
    return actualByName.size;
  }

  for (const entryName of records.keys()) {
    if (!approvedPublicDownloads.has(entryName)) {
      failures.push(`${manifestRelative}: manifest contains a download outside the approved allowlist (${entryName})`);
    }
  }
  for (const entryName of approvedPublicDownloadFiles) {
    if (!records.has(entryName)) {
      failures.push(`${manifestRelative}: approved download is missing from the manifest (${entryName})`);
    }
  }

  for (const [entryName] of records) {
    if (!actualByName.has(entryName)) {
      failures.push(`${manifestRelative}: manifest lists a missing or excluded download (${entryName})`);
    }
  }

  for (const [entryName, fileName] of actualByName) {
    if (!records.has(entryName)) {
      failures.push(`${manifestRelative}: release download is not listed (${entryName})`);
      continue;
    }
    const actualDigest = createHash('sha256').update(await readFile(fileName)).digest('hex');
    if (actualDigest !== records.get(entryName)) {
      failures.push(`${manifestRelative}: SHA-256 mismatch (${entryName})`);
    }
  }

  return actualByName.size;
}

const validatedDownloadCount = await validatePublicDownloadsManifest();

let validatedReleaseManifestCount = 0;
const releaseManifest = regularFilesByPath.get(RELEASE_MANIFEST_PATH);
if (releaseManifest) {
  try {
    const manifestSource = await readFile(releaseManifest.absolutePath, 'utf8');
    const result = await verifyReleaseManifest({ files: releaseTree.files, manifestSource });
    validatedReleaseManifestCount = result.entryCount;
    failures.push(...result.failures);
  } catch (error) {
    failures.push(`${RELEASE_MANIFEST_PATH}: unable to verify release manifest (${error.message})`);
  }
}

function normalizeReference(value) {
  return value.split('#')[0].split('?')[0].trim();
}

async function verifyReference(reference, owner) {
  const normalized = normalizeReference(reference);
  if (!normalized || /^(?:https?:|mailto:|tel:|data:|blob:|javascript:|#)/i.test(normalized)) return;
  const ownerDir = path.dirname(owner);
  let target = normalized.startsWith('/')
    ? path.join(releaseRoot, normalized.slice(1))
    : path.resolve(ownerDir, normalized);
  if (normalized.endsWith('/')) target = path.join(target, 'index.html');
  if (!target.startsWith(releaseRoot)) {
    failures.push(`${path.relative(releaseRoot, owner)}: reference escapes release root (${reference})`);
    return;
  }
  try {
    const targetStats = await stat(target);
    if (!targetStats.isFile()) {
      failures.push(`${path.relative(releaseRoot, owner)}: local reference is not a regular file (${reference})`);
    }
  } catch {
    failures.push(`${path.relative(releaseRoot, owner)}: missing local reference (${reference})`);
  }
}

for (const htmlFile of htmlFiles) {
  const relative = path.relative(releaseRoot, htmlFile).split(path.sep).join('/');
  const source = await readFile(htmlFile, 'utf8');
  if (!/^\s*<!doctype html>/i.test(source)) failures.push(`${relative}: missing HTML doctype`);
  const $ = load(source);
  if (!$('html').length || !$('head').length || !$('body').length) failures.push(`${relative}: incomplete HTML document`);
  if (!$('title').first().text().trim()) failures.push(`${relative}: missing title`);
  if (!$('meta[charset]').length) failures.push(`${relative}: missing charset declaration`);
  if (!$('h1').length) failures.push(`${relative}: missing H1`);

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') || '';
    if (/^(?:mailto:|tel:|data:|blob:|javascript:|#)/i.test(href)) return;
    try {
      const resolved = new URL(href, `https://www.begapunk.com/${relative}`);
      if (['begapunk.com', 'www.begapunk.com'].includes(resolved.hostname)
        && homepageAliasPathPattern.test(resolved.pathname)) {
        failures.push(`${relative}: internal link points to a redirecting homepage alias (${href})`);
      }
    } catch {
      // Malformed and missing references are reported by the ordinary link checks below.
    }
  });

  $('script[type="application/ld+json"]').each((index, element) => {
    try {
      JSON.parse($(element).html() || '');
    } catch (error) {
      failures.push(`${relative}: invalid JSON-LD block ${index + 1} (${error.message})`);
    }
  });

  $('script:not([src])').each((index, element) => {
    const type = ($(element).attr('type') || '').toLowerCase();
    if (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) return;
    const script = $(element).html() || '';
    if (!script.trim() || type === 'module') return;
    try {
      new vm.Script(script, { filename: `${relative}:inline-${index + 1}` });
    } catch (error) {
      failures.push(`${relative}: invalid inline JavaScript block ${index + 1} (${error.message})`);
    }
  });

  const references = [
    ...$('a[href]').map((_, element) => $(element).attr('href')).get(),
    ...$('img[src],script[src],source[src]').map((_, element) => $(element).attr('src')).get(),
    ...$('link[href]').map((_, element) => $(element).attr('href')).get(),
    ...$('[poster]').map((_, element) => $(element).attr('poster')).get(),
    ...$('[action]').map((_, element) => $(element).attr('action')).get(),
  ].filter(Boolean);
  $('[srcset]').each((_, element) => {
    for (const candidate of ($(element).attr('srcset') || '').split(',')) {
      references.push(candidate.trim().split(/\s+/)[0]);
    }
  });
  for (const reference of references) await verifyReference(reference, htmlFile);
}

for (const jsFile of allFiles.filter((fileName) => /\.m?js$/i.test(fileName))) {
  const result = spawnSync(process.execPath, ['--check', jsFile], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${path.relative(releaseRoot, jsFile)}: JavaScript syntax check failed (${result.stderr.trim()})`);
}

for (const sitemapName of ['sitemap.xml', 'sitemap-i18n.xml', ...partialSitemapFiles]) {
  if (!await exists(sitemapName)) continue;
  const source = await readFile(path.join(releaseRoot, sitemapName), 'utf8');
  const locations = [...source.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  if (!locations.length) failures.push(`${sitemapName}: no URL entries found`);
  if (new Set(locations).size !== locations.length) failures.push(`${sitemapName}: duplicate URL entries found`);
  for (const location of locations) {
    if (!location.startsWith('https://www.begapunk.com/')) {
      failures.push(`${sitemapName}: unexpected URL origin (${location})`);
      continue;
    }
    let pathname = new URL(location).pathname.replace(/^\//, '');
    if (!pathname || pathname.endsWith('/')) pathname += 'index.html';
    if (!await exists(pathname)) failures.push(`${sitemapName}: URL has no release file (${location})`);
  }
}

if (await exists('robots.txt')) {
  const robots = await readFile(path.join(releaseRoot, 'robots.txt'), 'utf8');
  if (!/^User-agent:/im.test(robots)) failures.push('robots.txt: missing User-agent directive');
  if (!/^Sitemap:\s*https:\/\/www\.begapunk\.com\/sitemap\.xml/im.test(robots)) failures.push('robots.txt: primary sitemap is not declared');
  for (const sitemapName of partialSitemapFiles) {
    const declaration = `Sitemap: https://www.begapunk.com/${sitemapName}`;
    if (!robots.split(/\r?\n/).some((line) => line.trim() === declaration)) {
      failures.push(`robots.txt: partial sitemap is not declared (${sitemapName})`);
    }
  }
  const declaredPartialSitemaps = [...robots.matchAll(/^Sitemap:\s*\S+\/(sitemap-[a-z]{2}\.xml)\s*$/gim)]
    .map((match) => match[1]);
  for (const sitemapName of declaredPartialSitemaps) {
    if (!allowedPartialSitemaps.has(sitemapName)) {
      failures.push(`robots.txt: stale partial-locale sitemap declaration (${sitemapName})`);
    }
  }
}

if (await exists('.htaccess')) {
  const htaccess = await readFile(path.join(releaseRoot, '.htaccess'), 'utf8');
  const requiredRedirects = [
    ['root homepage alias', 'RedirectMatch 301 "^/index\\.html$" "https://www.begapunk.com/"'],
    [
      'localized homepage aliases',
      `RedirectMatch 301 "^/(${deployedLanguageCodes.join('|')})/index\\.html$" "https://www.begapunk.com/$1/"`,
    ],
  ];
  for (const [label, directive] of requiredRedirects) {
    if (!htaccess.split(/\r?\n/).some((line) => line.trim() === directive)) {
      failures.push(`.htaccess: missing ${label} canonical 301 redirect`);
    }
  }
}

try {
  const [nginxPolicy, nginxInstaller, activationScript, bootstrapScript, hardeningUpgrade, inquiryPhp, workflow, publicVerifier] = await Promise.all([
    readFile(path.join(sourceRoot, 'ops', 'nginx-managed-redirects.conf'), 'utf8'),
    readFile(path.join(sourceRoot, 'ops', 'install-nginx-managed-redirects.sh'), 'utf8'),
    readFile(path.join(sourceRoot, 'ops', 'activate-release.sh'), 'utf8'),
    readFile(path.join(sourceRoot, 'ops', 'bootstrap-server.sh'), 'utf8'),
    readFile(path.join(sourceRoot, 'ops', 'upgrade-deployment-hardening.sh'), 'utf8'),
    readFile(path.join(sourceRoot, 'send_inquiry.php'), 'utf8'),
    readFile(path.join(sourceRoot, '.github', 'workflows', 'deploy.yml'), 'utf8'),
    readFile(path.join(sourceRoot, 'ops', 'verify-public-deployment.sh'), 'utf8'),
  ]);
  const policyDirectives = nginxPolicy.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const requiredNginxDirectives = [
    ['root homepage alias', 'if ($request_uri ~ "^/index[.]html(?:[?].*)?$") { return 301 https://www.begapunk.com/$is_args$args; }'],
    [
      'localized homepage aliases',
      `if ($request_uri ~ "^/(${deployedLanguageCodes.join('|')})/index[.]html(?:[?].*)?$") { return 301 https://www.begapunk.com/$1/$is_args$args; }`,
    ],
    ['root product alias', 'rewrite ^/BP-2P-95-0001[.]html$ https://www.begapunk.com/BP-2P-95-0005.html permanent;'],
    ['legacy drawing alias', 'rewrite ^/downloads/BP-2P-95-0001[.]pdf$ https://www.begapunk.com/downloads/BP-2P-95-0005.pdf permanent;'],
    [
      'localized product aliases',
      `rewrite ^/(${deployedLanguageCodes.join('|')})/BP-2P-95-0001[.]html$ https://www.begapunk.com/$1/BP-2P-95-0005.html permanent;`,
    ],
    ['root product-list alias', 'rewrite ^/products-p2[.]html$ https://www.begapunk.com/products.html permanent;'],
    [
      'localized product-list aliases',
      `rewrite ^/(${deployedLanguageCodes.join('|')})/products-p2[.]html$ https://www.begapunk.com/$1/products.html permanent;`,
    ],
    ['legacy product alias', 'rewrite (?i)^/3-in-3-out-Pneumatic-rotary-joint-P6776400[.]html$ https://www.begapunk.com/BP-3P-0004.html permanent;'],
    ['legacy pneumatic category', 'rewrite (?i)^/Pneumatic-rotary-joint-c[0-9]+(?:/.*)?$ https://www.begapunk.com/products.html permanent;'],
    ['legacy fittings category', 'rewrite (?i)^/Pneumatic-Fittings-c[0-9]+(?:/.*)?$ https://www.begapunk.com/products.html permanent;'],
    ['legacy inquiry route', 'rewrite (?i)^/(?:inquiry|register)/?$ https://www.begapunk.com/contact.html permanent;'],
    ['legacy FAQ route', 'rewrite (?i)^/pages/faq[.]html$ https://www.begapunk.com/faq.html permanent;'],
    ['legacy about route', 'rewrite (?i)^/pages/about-us(?:-[0-9]+)?[.]html$ https://www.begapunk.com/about.html permanent;'],
    ['legacy privacy route', 'rewrite (?i)^/pages/privacy-policy[.]html$ https://www.begapunk.com/privacy.html permanent;'],
    ['legacy commercial terms routes', 'rewrite (?i)^/pages/(?:payment-methods|warranty-and-return)[.]html$ https://www.begapunk.com/terms.html permanent;'],
    ['legacy editorial fallback', 'rewrite (?i)^/blog-123-13355/.*$ https://www.begapunk.com/blog.html permanent;'],
    ['legacy tag fallback', 'rewrite (?i)^/tags/.*$ https://www.begapunk.com/blog.html permanent;'],
    ['canonical apex host', 'if ($host = begapunk.com) { return 301 https://www.begapunk.com$request_uri; }'],
    ['canonical HTTP scheme', 'if ($scheme = http) { return 301 https://www.begapunk.com$request_uri; }'],
    ['legacy hydraulic category', 'rewrite (?i)^/hydraulic-rotary-joint-c[0-9]+(?:/.*)?$ https://www.begapunk.com/custom-hydraulic-rotary-unions.html permanent;'],
    ['retired platform endpoints', 'if ($uri ~* ^/(?:locales/en[.]json|cgi-sys/suspendedpage[.]cgi)$) { return 410; }'],
    ['request body limit', 'client_max_body_size 12m;'],
    ['custom 404', 'error_page 404 /404.html;'],
    ['default cache revalidation', 'expires -1;'],
    ['MIME sniffing header', 'add_header X-Content-Type-Options "nosniff" always;'],
    ['clickjacking header', 'add_header X-Frame-Options "SAMEORIGIN" always;'],
    ['HSTS header', 'add_header Strict-Transport-Security "max-age=31536000" always;'],
    ['dotfile boundary', 'if ($uri ~ "(^|/)[.](?!well-known(?:/|$))") { return 404; }'],
    ['runtime directory boundary', 'if ($uri ~* ^/(PHPMailer|audit|catalog-project|i18n|scripts|ops|tests|tmp|node_modules)(/|$)) { return 404; }'],
    ['manifest boundary', 'if ($uri ~* ^/(manifest[.]sha256|package(-lock)?[.]json|DEPLOYMENT[.]md|PROJECT_HANDOFF[.]md|AGENTS[.]md)$) { return 404; }'],
  ];
  for (const [label, directive] of requiredNginxDirectives) {
    if (!policyDirectives.includes(directive)) {
      failures.push(`ops/nginx-managed-redirects.conf: missing managed ${label}`);
    }
  }
  if (policyDirectives.length !== 44 || new Set(policyDirectives).size !== 44) {
    failures.push(`ops/nginx-managed-redirects.conf: expected exactly 44 unique approved directives; found ${policyDirectives.length}`);
  }
  if (policyDirectives.some((line) => /^location\b|\b(?:root|alias|proxy_pass|include)\b/i.test(line))) {
    failures.push('ops/nginx-managed-redirects.conf: policy must remain location-free and must not change roots, aliases, proxies, or includes');
  }
  if (nginxPolicy.includes('includeSubDomains')) {
    failures.push('ops/nginx-managed-redirects.conf: HSTS must stay host-scoped until every subdomain is confirmed HTTPS-only');
  }

  if (!inquiryPhp.includes("$productionPath = '/www/begapunk/shared/.env';")
    || !inquiryPhp.includes('load_env_file(inquiry_env_file());')) {
    failures.push('send_inquiry.php: production environment must load from the shared file outside the web root');
  }
  if (/ln\s+-s\s+["']?\$?(?:SHARED_DIR|BASE_DIR)[^\n]*[.]env[^\n]*release/i.test(activationScript)
    || /release[^\n]*[.]env[^\n]*ln\s+-s/i.test(activationScript)) {
    failures.push('ops/activation: new releases must not receive a public .env link');
  }
  if (!activationScript.includes('Release contains a forbidden public .env path.')) {
    failures.push('ops/activate-release.sh: missing public .env fail-closed guard');
  }
  const activationInquiryEnvironmentValidation = activationScript.indexOf(
    'validate_inquiry_environment_file "$SHARED_DIR/.env" 0 "$www_gid"',
  );
  const activationReleaseIdentityValidation = activationScript.indexOf(
    'verify_release_manifest_identity "$release_dir" "$expected_manifest_sha256"',
  );
  const activationReleaseSwitch = activationScript.indexOf('mv -Tf "$next_link" "$CURRENT_LINK"');
  if (activationInquiryEnvironmentValidation < 0
    || activationReleaseIdentityValidation < activationInquiryEnvironmentValidation
    || activationReleaseSwitch < activationReleaseIdentityValidation) {
    failures.push('ops/activate-release.sh: every activation must validate the canonical inquiry environment before artifact verification and switching current');
  }
  if (!activationScript.includes('expected_homepage_sha256=')
    || !activationScript.includes('actual_homepage_sha256=')
    || !activationScript.includes('Origin served a different homepage artifact')) {
    failures.push('ops/activate-release.sh: origin health check must verify the exact audited homepage bytes');
  }
  const activationPreviousTargetCapture = activationScript.indexOf('previous_target="$(readlink -f "$CURRENT_LINK"');
  const activationPruneTargetResolution = activationScript.indexOf('candidate_target="$(readlink -f "$candidate")"');
  const activationPreviousTargetProtection = activationScript.indexOf('"$candidate_target" == "$previous_target"');
  const activationPruneRemoval = activationScript.indexOf('rm -rf -- "$candidate"');
  if (activationPreviousTargetCapture < 0
    || activationPruneTargetResolution < activationPreviousTargetCapture
    || activationPreviousTargetProtection < activationPruneTargetResolution
    || activationPruneRemoval < activationPreviousTargetProtection) {
    failures.push('ops/activate-release.sh: release pruning must preserve the pre-activation rollback target');
  }
  if (!bootstrapScript.includes('/usr/local/sbin/begapunk-nginx-config')
    || !bootstrapScript.includes('NOPASSWD: %s')) {
    failures.push('ops/bootstrap-server.sh: root-owned helper and minimal sudoers bootstrap are incomplete');
  }
  const bootstrapPolicyStage = bootstrapScript.indexOf('stage "$bootstrap_candidate" "$bootstrap_transaction"');
  const bootstrapReleaseSwitch = bootstrapScript.indexOf('mv -Tf "$next_link" "$CURRENT_LINK"');
  const bootstrapPolicyCommit = bootstrapScript.indexOf('commit "$bootstrap_transaction"');
  const bootstrapMarkerCommit = bootstrapScript.indexOf('mv -f -- "$bootstrap_marker_candidate" "$bootstrap_marker"');
  const bootstrapRollbackDisarm = bootstrapScript.indexOf('bootstrap_policy_staged=false');
  const bootstrapInquiryMigrationGuard = bootstrapScript.indexOf(
    '[[ ! -e "$BASE_DIR/shared/.env" && ! -L "$BASE_DIR/shared/.env"',
  );
  const bootstrapInquirySourceValidation = bootstrapScript.indexOf(
    'validate_plain_runtime_file "$LIVE_ROOT/.env" || exit 12',
  );
  const bootstrapInquiryEnvironmentInstall = bootstrapScript.indexOf(
    'install -o root -g www -m 0640 -- "$LIVE_ROOT/.env" "$BASE_DIR/shared/.env"',
  );
  const bootstrapInquiryEnvironmentValidation = bootstrapScript.indexOf(
    'validate_inquiry_environment_file "$BASE_DIR/shared/.env" 0 "$www_gid"',
  );
  const bootstrapManagedDirectoryPreflight = bootstrapScript.indexOf(
    'for managed_dir in "$BASE_DIR" "$BASE_DIR/releases" "$BASE_DIR/shared" "$BASE_DIR/bin" "$BASE_DIR/staging"',
  );
  const bootstrapManagedTreePreflight = bootstrapScript.indexOf(
    'validate_plain_directory_tree "$BASE_DIR" || exit 12',
  );
  const bootstrapManagedDirectorySymlinkGuard = bootstrapScript.indexOf(
    '[[ -d "$managed_dir" && ! -L "$managed_dir" ]]',
    bootstrapManagedDirectoryPreflight,
  );
  const bootstrapManagedDirectoryCreation = bootstrapScript.indexOf(
    'mkdir -p "$BASE_DIR/releases" "$BASE_DIR/shared" "$BASE_DIR/bin" "$BASE_DIR/staging"',
  );
  if (bootstrapPolicyStage < 0
    || bootstrapReleaseSwitch < 0
    || bootstrapPolicyStage > bootstrapReleaseSwitch
    || bootstrapPolicyCommit < bootstrapReleaseSwitch
    || bootstrapMarkerCommit < bootstrapPolicyCommit
    || bootstrapRollbackDisarm < bootstrapMarkerCommit
    || bootstrapInquiryMigrationGuard < 0
    || bootstrapInquirySourceValidation < bootstrapInquiryMigrationGuard
    || bootstrapInquiryEnvironmentInstall < bootstrapInquirySourceValidation
    || bootstrapInquiryEnvironmentValidation < bootstrapInquiryEnvironmentInstall
    || bootstrapInquiryEnvironmentValidation > bootstrapReleaseSwitch
    || bootstrapManagedTreePreflight < 0
    || bootstrapManagedDirectoryPreflight < bootstrapManagedTreePreflight
    || bootstrapManagedDirectorySymlinkGuard < bootstrapManagedDirectoryPreflight
    || bootstrapManagedDirectoryCreation < bootstrapManagedDirectorySymlinkGuard
    || !activationScript.includes('validate_inquiry_environment_file()')
    || !bootstrapScript.includes("! grep -Eq '/www/begapunk/shared/[.]env|BEGAPUNK_ENV_FILE'")
    || !bootstrapScript.includes('ln -s "$BASE_DIR/shared/.env" "$seed_dir/.env"')
    || !bootstrapScript.includes('rollback_bootstrap_on_exit')) {
    failures.push('ops/bootstrap-server.sh: legacy inquiry compatibility must be protected before the initial release switch and covered by transactional rollback');
  }
  const helperRollbackArm = hardeningUpgrade.indexOf('helper_changed=true');
  const helperAtomicReplace = hardeningUpgrade.indexOf('mv -Tf -- "$helper_candidate" "$PRIVILEGED_NGINX_HELPER"');
  const sudoersRollbackArm = hardeningUpgrade.indexOf('sudoers_changed=true');
  const sudoersAtomicReplace = hardeningUpgrade.indexOf('mv -Tf -- "$sudoers_candidate" "$SUDOERS_FILE"');
  const upgradeSuccessCommit = hardeningUpgrade.lastIndexOf('upgrade_succeeded=true');
  const policyRollbackDisarm = hardeningUpgrade.lastIndexOf('policy_attempted=false');
  const backupRootSafetyCheck = hardeningUpgrade.indexOf('backup_root_owner="$(stat -c');
  const firstBasePermissionChange = hardeningUpgrade.indexOf('chown "root:$deploy_group" "$BASE_DIR"');
  if (!hardeningUpgrade.includes("MODE=\"${1:---check}\"")
    || !hardeningUpgrade.includes('/usr/local/sbin/begapunk-nginx-config')
    || !hardeningUpgrade.includes('stage "$policy_candidate" "$policy_transaction"')
    || !hardeningUpgrade.includes('EXPECTED_HELPER_VERSION="begapunk-nginx-config-v3"')
    || !hardeningUpgrade.includes('BACKUP_ROOT="/var/backups"')
    || !hardeningUpgrade.includes('install -d -o root -g root -m 0755 "$BACKUP_ROOT"')
    || !hardeningUpgrade.includes('mktemp -d "$BACKUP_ROOT/begapunk-hardening.XXXXXX"')
    || !hardeningUpgrade.includes('run_hardening_checks')
    || !hardeningUpgrade.includes('recovery_failed=1')
    || backupRootSafetyCheck < 0
    || firstBasePermissionChange < backupRootSafetyCheck
    || helperRollbackArm < 0
    || helperAtomicReplace < helperRollbackArm
    || sudoersRollbackArm < 0
    || sudoersAtomicReplace < sudoersRollbackArm
    || upgradeSuccessCommit < 0
    || policyRollbackDisarm < upgradeSuccessCommit) {
    failures.push('ops/upgrade-deployment-hardening.sh: existing-layout hardening path is incomplete');
  }
  if (!nginxInstaller.includes('Never allow caller-controlled environment variables')
    || !nginxInstaller.includes('validate_candidate')
    || !nginxInstaller.includes('restore_transaction')
    || !nginxInstaller.includes("printf '%s\\n' 'begapunk-nginx-config-v3'")) {
    failures.push('ops/install-nginx-managed-redirects.sh: privileged scope validation or transaction rollback is incomplete');
  }
  for (const requiredMigrationControl of [
    'LEGACY_REWRITE_CONF="/www/server/panel/vhost/rewrite/begapunk_legacy_redirects.conf"',
    'legacy_rewrite_include_count',
    'html_cache_state',
    'alt_svc_before',
    'Expected one Begapunk HTML cache location with exactly one supported expires value',
    'The effective Nginx configuration must load the managed policy exactly once and must not load either legacy policy',
  ]) {
    if (!nginxInstaller.includes(requiredMigrationControl)) {
      failures.push(`ops/install-nginx-managed-redirects.sh: missing fail-closed Baota migration control (${requiredMigrationControl})`);
    }
  }
  if (workflow.includes('sudo -n /www/begapunk/bin/install-nginx-managed-redirects.sh')
    || /rsync[^\n]*install-nginx-managed-redirects[.]sh/.test(workflow)) {
    failures.push('.github/workflows/deploy.yml: must not upload and sudo-execute a deployment-user-writable helper');
  }
  for (const requiredWorkflowText of [
    '/usr/local/sbin/begapunk-nginx-config stage',
    '/usr/local/sbin/begapunk-nginx-config commit',
    '/usr/local/sbin/begapunk-nginx-config rollback',
    "expected_helper_version='begapunk-nginx-config-v3'",
    "expected_marker_version='v3'",
    "expected_doctor_result='begapunk-nginx-config-doctor-ok:v3'",
    'Verify hardened server deployment contract',
    "helper_metadata\" != 'root:root:755'",
    "env_metadata\" != 'root:www:640'",
    'active rollback release manifest verified',
    'available_kib < 1048576',
    'available_inodes < 10000',
    'SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_TO',
    'bash ops/verify-public-deployment.sh',
    'BEGAPUNK_EXPECTED_HOMEPAGE_SHA256=',
    'BEGAPUNK_EXPECTED_ROBOTS_SHA256=',
    'BEGAPUNK_EXPECTED_SITEMAP_SHA256=',
    'BEGAPUNK_EXPECTED_I18N_SITEMAP_SHA256=',
    'bash tests/verify-public-deployment-headers.sh',
    'npm run postdeploy:navigation:verify',
    'actions/upload-artifact@',
    'actions/download-artifact@',
    'include-hidden-files: true',
    'manifest_sha256:',
    'EXPECTED_MANIFEST_SHA256:',
    'BEGAPUNK_RELEASE_ID:',
    'previous_release_id',
  ]) {
    if (!workflow.includes(requiredWorkflowText)) {
      failures.push(`.github/workflows/deploy.yml: missing deployment transaction control (${requiredWorkflowText})`);
    }
  }
  const deployTimeout = workflow.match(/validate-and-deploy:\s*[\s\S]*?timeout-minutes:\s*(\d+)/)?.[1];
  if (!deployTimeout || Number(deployTimeout) < 45) {
    failures.push('.github/workflows/deploy.yml: deployment job must reserve at least 45 minutes for validation and rollback');
  }
  if (!/build-release:[\s\S]*?environment:\s*production[\s\S]*?Build and audit release once/u.test(workflow)) {
    failures.push('.github/workflows/deploy.yml: canonical release build must have production environment access before the IndexNow proof enters the manifest');
  }
  for (const requiredPublicProbe of [
    "'/.env'",
    "'/manifest.sha256'",
    "'/PHPMailer/PHPMailer.php'",
    "'/BP-2P-95-0001.html'",
    "'/downloads/BP-2P-95-0001.pdf'",
    "'/products-p2.html'",
    "'http://www.begapunk.com/?utm_source=post-deploy-http'",
    "'http://begapunk.com/?utm_source=post-deploy-apex-http'",
    "'https://begapunk.com/?utm_source=post-deploy-host'",
    "'/Pneumatic-rotary-joint-c123/'",
    "'/inquiry/?utm_source=legacy-gate'",
    "'/blog-123-13355/Industrial-Laser-Pipe-Cutting-Guide.html'",
    "'/tags/Low-speed-rotary-joint.html'",
    "'/hydraulic-rotary-joint-c123/retired.html'",
    "'/locales/en.json'",
    "'/cgi-sys/suspendedpage.cgi'",
    "'/__begapunk_missing_policy_probe__'",
    "verify_status '/' 200",
    "'/robots.txt' '/sitemap.xml' '/sitemap-i18n.xml'",
    "Sitemap: https://www.begapunk.com/sitemap-i18n.xml",
    'x-content-type-options:',
    'cache-control:',
    "'Alt-Svc'",
    'extract_final_http_header_block',
    'EXPECTED_HOMEPAGE_SHA256=',
    'verify_final_http_status "$endpoint_headers" 405',
    'verify_single_header_value "$endpoint_headers" \'Allow\' \'POST\'',
  ]) {
    if (!publicVerifier.includes(requiredPublicProbe)) {
      failures.push(`ops/verify-public-deployment.sh: missing public boundary probe (${requiredPublicProbe})`);
    }
  }
  if (publicVerifier.includes('includeSubDomains')) {
    failures.push('ops/verify-public-deployment.sh: HSTS verification must not require unreviewed subdomain coverage');
  }
  const deploymentCommit = workflow.indexOf('Commit deployment transaction');
  const indexNowNotification = workflow.indexOf('Notify IndexNow of changed URLs');
  const indexNowNonBlocking = workflow.indexOf('continue-on-error: true', indexNowNotification);
  if (deploymentCommit < 0
    || indexNowNotification < deploymentCommit
    || indexNowNonBlocking < indexNowNotification) {
    failures.push('.github/workflows/deploy.yml: IndexNow must run after transaction commit as a non-blocking notification');
  }
} catch (error) {
  failures.push(`Cannot validate deployment hardening: ${error.message}`);
}

if (failures.length) {
  console.error(`Deployment validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Deployment validation passed: ${htmlFiles.length} HTML files, ${validatedReleaseManifestCount} manifest-tracked regular files, ${allFiles.length} total regular files including the manifest, and ${validatedDownloadCount} verified public downloads.`);
