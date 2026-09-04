import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { load } from 'cheerio';
import {
  loadPublicDownloadAllowlist,
  parsePublicDownloadsManifest,
} from './lib/public-downloads.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseRoot = path.resolve(process.argv[2] || 'dist/production');
const failures = [];
const i18nConfig = JSON.parse(await readFile(path.join(sourceRoot, 'i18n', 'config.json'), 'utf8'));
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
  if (!await exists(fileName)) failures.push(`Missing required release file: ${fileName}`);
}

for (const forbidden of ['.env', '.git', 'audit', 'catalog-project', 'i18n', 'scripts', 'package.json']) {
  if (await exists(forbidden)) failures.push(`Forbidden source or secret content in release: ${forbidden}`);
}

const allFiles = await walk(releaseRoot);
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
  if (!await exists(manifestRelative)) return 0;

  const downloadsRoot = path.join(releaseRoot, 'downloads');
  const manifestPath = path.join(releaseRoot, manifestRelative);
  let manifestSource;
  let downloadFiles;
  try {
    manifestSource = await readFile(manifestPath, 'utf8');
    downloadFiles = (await walk(downloadsRoot))
      .filter((fileName) => path.resolve(fileName) !== path.resolve(manifestPath));
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
    await stat(target);
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
  if (policyDirectives.length !== 43 || new Set(policyDirectives).size !== 43) {
    failures.push(`ops/nginx-managed-redirects.conf: expected exactly 43 unique approved directives; found ${policyDirectives.length}`);
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
  if (bootstrapPolicyStage < 0
    || bootstrapReleaseSwitch < 0
    || bootstrapPolicyStage > bootstrapReleaseSwitch
    || bootstrapPolicyCommit < bootstrapReleaseSwitch
    || bootstrapMarkerCommit < bootstrapPolicyCommit
    || bootstrapRollbackDisarm < bootstrapMarkerCommit
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
    'bash ops/verify-public-deployment.sh',
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
  for (const requiredPublicProbe of [
    "'/.env'",
    "'/manifest.sha256'",
    "'/PHPMailer/PHPMailer.php'",
    "'/BP-2P-95-0001.html'",
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
    'x-content-type-options:',
    'cache-control:',
    "'Alt-Svc'",
  ]) {
    if (!publicVerifier.includes(requiredPublicProbe)) {
      failures.push(`ops/verify-public-deployment.sh: missing public boundary probe (${requiredPublicProbe})`);
    }
  }
  if (publicVerifier.includes('includeSubDomains')) {
    failures.push('ops/verify-public-deployment.sh: HSTS verification must not require unreviewed subdomain coverage');
  }
} catch (error) {
  failures.push(`Cannot validate deployment hardening: ${error.message}`);
}

if (failures.length) {
  console.error(`Deployment validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Deployment validation passed: ${htmlFiles.length} HTML files, ${allFiles.length} total release files, and ${validatedDownloadCount} verified public downloads.`);
