import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import './editorial-legacy-transition.test.mjs';
import { fileURLToPath } from 'node:url';
import {
  applyMechanicalOnlySnapshots,
  createArtifactSnapshot,
  createSemanticProjection,
  mechanicalSha256,
  semanticSha256,
} from '../scripts/lib/editorial-artifact-snapshot.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(command, arguments_, cwd, environmentOverrides = {}) {
  return spawnSync(command, arguments_, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    env: {
      ...process.env,
      CI: '',
      GITHUB_ACTIONS: '',
      EDITORIAL_TRUSTED_BASE_REF: '',
      GITHUB_BASE_SHA: '',
      GITHUB_BASE_REF: '',
      ...environmentOverrides,
    },
  });
}

function assertCommandPassed(result, label) {
  assert.equal(result.status, 0, `${label}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
}

const baseHtml = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Raccord tournant industriel">
  <meta property="og:title" content="Raccord tournant | Begapunk">
  <meta name="twitter:image" content="https://www.begapunk.com/images/social.webp?v=one">
  <link rel="canonical" href="https://www.begapunk.com/fr/example.html">
  <link rel="alternate" hreflang="de" href="https://www.begapunk.com/de/example.html">
  <link rel="stylesheet" href="../css/style.css?v=one">
  <title>Raccord tournant | Begapunk</title>
  <script type="application/ld+json">{"@context":"https://schema.org","name":"Raccord tournant","offers":["standard","sur mesure"]}</script>
</head>
<body class="layout" id="page">
  <h1>Raccord <strong>tournant</strong></h1>
  <p>Texte visible.</p>
  <a href="contact.html?request=quote" aria-label="Demander un devis">Demander un devis</a>
  <div data-href="products.html" data-label="Produits">Carte produit</div>
  <input type="email" placeholder="E-mail professionnel">
  <img src="../images/product.webp?v=one" alt="Raccord tournant pneumatique">
  <script id="rfq-copy" type="application/json">{"sending":"Envoi en cours…","requiredFields":{"email":"E-mail"}}</script>
  <script>statusNode.textContent = 'État prêt';</script>
  <svg><text>Pression nominale</text></svg>
  <script defer src="../js/site.js?v=one"></script>
</body>
</html>
`;

function replaceOnce(source, before, after) {
  assert.ok(source.includes(before), `fixture must contain ${JSON.stringify(before)}`);
  return source.replace(before, after);
}

test('cache-query changes affect only the mechanical snapshot', () => {
  const changed = replaceOnce(baseHtml, '../js/site.js?v=one', '../js/site.js?v=two');
  assert.equal(semanticSha256(changed), semanticSha256(baseHtml));
  assert.notEqual(mechanicalSha256(changed), mechanicalSha256(baseHtml));
});

test('LF, CRLF, and lone CR normalize to the same semantic and mechanical snapshots', () => {
  const crlf = baseHtml.replaceAll('\n', '\r\n');
  const cr = baseHtml.replaceAll('\n', '\r');
  assert.equal(semanticSha256(crlf), semanticSha256(baseHtml));
  assert.equal(semanticSha256(cr), semanticSha256(baseHtml));
  assert.equal(mechanicalSha256(crlf), mechanicalSha256(baseHtml));
  assert.equal(mechanicalSha256(cr), mechanicalSha256(baseHtml));
});

test('non-presentational attributes, comments, indentation, and generic wrappers do not change semantics', () => {
  const before = '<!doctype html><html lang="fr"><body><p>Texte de test</p></body></html>';
  const after = `<!doctype html>
    <html lang="fr"><body id="body" data-build="mechanical">
      <!-- mechanical comment --><div>
        <p id="copy">  Texte   de test </p>
      </div>
    </body></html>`;
  assert.equal(semanticSha256(after), semanticSha256(before));
  assert.notEqual(mechanicalSha256(after), mechanicalSha256(before));
});

test('Unicode spacing and semantic element boundaries remain governed', () => {
  assert.notEqual(
    semanticSha256('<html><body><p>10\u00a0bar</p></body></html>'),
    semanticSha256('<html><body><p>10 bar</p></body></html>'),
  );
  assert.notEqual(
    semanticSha256('<html><body><h1>Titre</h1></body></html>'),
    semanticSha256('<html><body><p>Titre</p></body></html>'),
  );
  assert.notEqual(
    semanticSha256('<html><body><p>ab</p><p>c</p></body></html>'),
    semanticSha256('<html><body><p>a</p><p>bc</p></body></html>'),
  );
});

test('each governed editorial surface changes the semantic snapshot', () => {
  const mutations = [
    ['lang', 'lang="fr"', 'lang="de"'],
    ['title', 'Raccord tournant | Begapunk</title>', 'Union rotative | Begapunk</title>'],
    ['meta description', 'content="Raccord tournant industriel"', 'content="Union rotative industrielle"'],
    ['social image source', '/images/social.webp?v=one', '/images/other-social.webp?v=one'],
    ['canonical', '/fr/example.html', '/fr/other.html'],
    ['hreflang', 'hreflang="de"', 'hreflang="ja"'],
    ['visible text', 'Texte visible.', 'Texte visible modifié.'],
    ['alt', 'alt="Raccord tournant pneumatique"', 'alt="Union rotative pneumatique"'],
    ['aria label', 'aria-label="Demander un devis"', 'aria-label="Obtenir un devis"'],
    ['placeholder', 'placeholder="E-mail professionnel"', 'placeholder="Adresse e-mail"'],
    ['data label', 'data-label="Produits"', 'data-label="Catalogue"'],
    ['CTA target', 'href="contact.html?request=quote"', 'href="contact.html?request=sample"'],
    ['data href', 'data-href="products.html"', 'data-href="applications.html"'],
    ['image source', '../images/product.webp?v=one', '../images/other-product.webp?v=one'],
    ['stylesheet source', '../css/style.css?v=one', '../css/evil.css?v=one'],
    ['external script source', '../js/site.js?v=one', '../js/evil.js?v=one'],
    ['JSON-LD value', '"name":"Raccord tournant"', '"name":"Union rotative"'],
    ['embedded runtime copy', '"sending":"Envoi en cours…"', '"sending":"Traitement…"'],
    ['inline dynamic UI copy', "'État prêt'", "'État terminé'"],
    ['SVG text', '>Pression nominale</text>', '>Pression maximale</text>'],
  ];
  const baseline = semanticSha256(baseHtml);
  for (const [label, before, after] of mutations) {
    assert.notEqual(semanticSha256(replaceOnce(baseHtml, before, after)), baseline, label);
  }
  assert.notEqual(
    semanticSha256('<html><head><meta http-equiv="refresh" content="0; url=/fr/"></head><body></body></html>'),
    semanticSha256('<html><head><meta http-equiv="refresh" content="0; url=/de/"></head><body></body></html>'),
  );
});

test('targets stay associated with their elements instead of being compared as a sorted bag', () => {
  const links = '<html><body><a href="contact.html">Quote</a><a href="privacy.html">Privacy</a></body></html>';
  const swappedLinks = '<html><body><a href="privacy.html">Quote</a><a href="contact.html">Privacy</a></body></html>';
  assert.notEqual(semanticSha256(links), semanticSha256(swappedLinks));

  const options = '<html><body><select><option value="de/">Deutsch</option><option value="fr/">Français</option></select></body></html>';
  const swappedOptions = '<html><body><select><option value="fr/">Deutsch</option><option value="de/">Français</option></select></body></html>';
  assert.notEqual(semanticSha256(options), semanticSha256(swappedOptions));
});

test('visibility, document direction, embedded JSON identity, and indirect UI code are governed', () => {
  assert.notEqual(
    semanticSha256('<html><body><p>Visible</p></body></html>'),
    semanticSha256('<html><body><p hidden>Visible</p></body></html>'),
  );
  assert.notEqual(
    semanticSha256('<html><body><p>Visible</p></body></html>'),
    semanticSha256('<html><body><p style="display:none">Visible</p></body></html>'),
  );
  assert.notEqual(
    semanticSha256('<html><body><a href="contact.html">Contact</a></body></html>'),
    semanticSha256('<html><body><a class="sr-only" href="contact.html">Contact</a></body></html>'),
  );
  assert.notEqual(
    semanticSha256('<html><head></head><body><a class="cta" href="contact.html">Contact</a></body></html>'),
    semanticSha256('<html><head><style>.cta { display: none }</style></head><body><a class="cta" href="contact.html">Contact</a></body></html>'),
  );
  assert.notEqual(
    semanticSha256('<html lang="ar" dir="rtl"><body>نص</body></html>'),
    semanticSha256('<html lang="ar" dir="ltr"><body>نص</body></html>'),
  );
  assert.notEqual(
    semanticSha256('<html lang="fr"><body><div dir="ltr">BP-2P-95</div></body></html>'),
    semanticSha256('<html lang="fr"><body><div dir="rtl">BP-2P-95</div></body></html>'),
  );
  assert.notEqual(
    semanticSha256('<html><body><script id="primary" type="application/json">{"copy":"A"}</script><script id="secondary" type="application/json">{"copy":"B"}</script></body></html>'),
    semanticSha256('<html><body><script id="primary" type="application/json">{"copy":"B"}</script><script id="secondary" type="application/json">{"copy":"A"}</script></body></html>'),
  );
  assert.notEqual(
    semanticSha256('<html><body><script data-slot="hero" type="application/json">{"copy":"A"}</script><script data-slot="cta" type="application/json">{"copy":"B"}</script></body></html>'),
    semanticSha256('<html><body><script data-slot="hero" type="application/json">{"copy":"B"}</script><script data-slot="cta" type="application/json">{"copy":"A"}</script></body></html>'),
  );
  assert.notEqual(
    semanticSha256("<html><body><script>const label='Prêt'; node['textContent']=label;</script></body></html>"),
    semanticSha256("<html><body><script>const label='Terminé'; node['textContent']=label;</script></body></html>"),
  );
  assert.notEqual(
    semanticSha256('<html><body></body></html>'),
    semanticSha256("<html><body><script>document.body.append('Produit indisponible.')</script></body></html>"),
  );
  for (const embeddedMedia of [
    '<iframe src="unreviewed.html"></iframe>',
    '<object data="unreviewed.pdf"></object>',
    '<embed src="unreviewed.svg">',
    '<svg><image href="unreviewed.png"></image></svg>',
    '<input type="image" src="unreviewed.png">',
  ]) {
    assert.notEqual(
      semanticSha256('<html><body></body></html>'),
      semanticSha256(`<html><body>${embeddedMedia}</body></html>`),
      embeddedMedia,
    );
  }
});

test('technical metadata and asset cache keys stay outside the editorial projection', () => {
  let changed = replaceOnce(baseHtml, 'width=device-width, initial-scale=1', 'width=device-width, initial-scale=1, maximum-scale=5');
  changed = replaceOnce(changed, '../css/style.css?v=one', '../css/style.css?v=two');
  changed = replaceOnce(changed, '../images/product.webp?v=one', '../images/product.webp?v=two');
  changed = replaceOnce(changed, '/images/social.webp?v=one', '/images/social.webp?v=two');
  assert.equal(semanticSha256(changed), semanticSha256(baseHtml));
  assert.notEqual(mechanicalSha256(changed), mechanicalSha256(baseHtml));
});

test('JSON object and block order normalize, while array order remains semantic', () => {
  const first = '<html><body><script type="application/ld+json">{"a":1,"b":{"x":"A","y":"B"}}</script><script type="application/ld+json">{"c":3}</script></body></html>';
  const reordered = '<html><body><script type="application/ld+json">{"c":3}</script><script type="application/ld+json">{"b":{"y":"B","x":"A"},"a":1}</script></body></html>';
  assert.equal(semanticSha256(reordered), semanticSha256(first));
  assert.notEqual(
    semanticSha256('<html><body><script type="application/ld+json">{"items":["a","b"]}</script></body></html>'),
    semanticSha256('<html><body><script type="application/ld+json">{"items":["b","a"]}</script></body></html>'),
  );
});

test('invalid governed JSON fails closed', () => {
  assert.throws(
    () => semanticSha256('<html><body><script type="application/ld+json">{"broken":}</script></body></html>'),
    /JSON-LD block 1 is invalid/,
  );
  assert.throws(
    () => semanticSha256('<html><body><script type="application/json">{"broken":}</script></body></html>'),
    /Embedded application\/json block 1 is invalid/,
  );
  assert.throws(
    () => mechanicalSha256(Buffer.from([0xc3, 0x28])),
    /encoded data was not valid|valid for encoding/,
  );
});

test('mechanical-only refresh preserves semantic hash and provenance', () => {
  const priorSnapshot = {
    ...createArtifactSnapshot('fr/example.html', baseHtml),
    semanticProvenance: { kind: 'old-semantic-record', record: 'review.md' },
    mechanicalProvenance: { kind: 'old-mechanical-record', record: 'capture.md' },
  };
  const changed = replaceOnce(baseHtml, '../js/site.js?v=one', '../js/site.js?v=two');
  const currentSnapshot = createArtifactSnapshot('fr/example.html', changed);
  const update = applyMechanicalOnlySnapshots([priorSnapshot], [currentSnapshot], {
    kind: 'mechanical-only-refresh',
    record: 'mechanical.md',
  });
  assert.deepEqual(update.comparison.semanticChangedPaths, []);
  assert.deepEqual(update.comparison.mechanicalChangedPaths, ['fr/example.html']);
  assert.equal(update.artifacts[0].semanticSha256, priorSnapshot.semanticSha256);
  assert.strictEqual(update.artifacts[0].semanticProvenance, priorSnapshot.semanticProvenance);
  assert.equal(update.artifacts[0].mechanicalSha256, currentSnapshot.mechanicalSha256);
  assert.deepEqual(update.artifacts[0].mechanicalProvenance, {
    kind: 'mechanical-only-refresh',
    record: 'mechanical.md',
  });
});

test('mechanical-only refresh refuses visible-copy changes', () => {
  const prior = createArtifactSnapshot('fr/example.html', baseHtml);
  const changed = createArtifactSnapshot(
    'fr/example.html',
    replaceOnce(baseHtml, 'Texte visible.', 'Texte visible modifié.'),
  );
  assert.throws(
    () => applyMechanicalOnlySnapshots([prior], [changed], {}),
    /Mechanical-only refresh refused because editorial semantics changed: fr\/example\.html/,
  );
});

test('refresh CLI anchors HEAD, permits cache-only change, and rejects semantic bypass', async (t) => {
  const fixtureRoot = await mkdtemp(path.join(repositoryRoot, '.editorial-refresh-cli-'));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  await mkdir(path.join(fixtureRoot, 'scripts', 'lib'), { recursive: true });
  await mkdir(path.join(fixtureRoot, 'i18n', 'editorial'), { recursive: true });
  await mkdir(path.join(fixtureRoot, 'audit', 'localization'), { recursive: true });
  await mkdir(path.join(fixtureRoot, 'fr'), { recursive: true });
  await cp(
    path.join(repositoryRoot, 'scripts', 'refresh-reviewed-localized-artifacts.mjs'),
    path.join(fixtureRoot, 'scripts', 'refresh-reviewed-localized-artifacts.mjs'),
  );
  await cp(
    path.join(repositoryRoot, 'scripts', 'verify-editorial-release-status.mjs'),
    path.join(fixtureRoot, 'scripts', 'verify-editorial-release-status.mjs'),
  );
  await cp(
    path.join(repositoryRoot, 'scripts', 'lib', 'editorial-artifact-snapshot.mjs'),
    path.join(fixtureRoot, 'scripts', 'lib', 'editorial-artifact-snapshot.mjs'),
  );

  const now = new Date().toISOString();
  const pagePath = path.join(fixtureRoot, 'fr', 'page.html');
  const manifestPath = path.join(fixtureRoot, 'audit', 'localization', 'current-localized-artifacts.json');
  const page = '<!doctype html>\n<html lang="fr"><body><p>Texte visible</p><script src="../js/site.js?v=one"></script></body></html>\n';
  await writeFile(pagePath, page);
  await writeFile(
    path.join(fixtureRoot, 'i18n', 'config.json'),
    `${JSON.stringify({ activeLanguageCodes: ['fr'], pages: ['page.html'] }, null, 2)}\n`,
  );
  await writeFile(
    path.join(fixtureRoot, 'i18n', 'editorial', 'status.json'),
    `${JSON.stringify({
      updatedAt: '2026-09-05',
      localMarketReview: {
        schemaVersion: 1,
        effectiveDate: '2026-08-14',
        requiredFor: ['new-localized-page', 'changed-localized-page'],
        machineTranslationDraftOnly: true,
        aiAssistedTargetMarketReviewRequired: true,
        aiLineByLineReviewSufficientForRelease: true,
        independentNativeSpeakerRequiredForRelease: false,
        humanEditorialSignOffRequiredForRelease: false,
        reviewClaimMustRemainAiAssisted: true,
        targetMarketPeerReferenceRequired: true,
        targetMarketSearchPatternReviewRequired: true,
        referenceUse: 'terminology-and-search-intent-only',
        competitorContentMayBeCopied: false,
        competitorFactsMayBeUsedAsBegapunkFacts: false,
        independentNativeSpeakerEquivalent: false,
        recordDirectory: 'audit/localization',
        requiredRecordFields: [
          'page',
          'language',
          'referenceUrls',
          'referenceAccessDates',
          'terminologyDecisions',
          'searchIntentDecisions',
          'reviewMethod',
          'reviewedAt',
          'reviewedByRole',
          'unresolvedIssues',
        ],
      },
      reviewedArtifactSnapshot: {
        schemaVersion: 2,
        algorithm: 'sha256-bytes-v1',
        manifest: 'audit/localization/current-localized-artifacts.json',
        capturedAt: now,
        pagesPerLanguage: 1,
        languages: ['fr'],
        qualityBoundary: 'integrity-only-not-native-speaker-or-semantic-proof',
      },
      languages: {
        fr: {
          reviewed: ['page.html'],
          copyReviewedAwaitingRender: [],
          inProgress: [],
          remaining: 0,
        },
      },
      seoGeo: { fr: { reviewed: 1, total: 1 } },
      renderQa: {
        pagesPerLanguage: 1,
        viewportsPerPage: 2,
        checkedViewports: 2,
      },
    }, null, 2)}\n`,
  );
  const sourceRecord = 'audit/localization/source-review.md';
  const sourceRecordPath = path.join(fixtureRoot, ...sourceRecord.split('/'));
  const sourceRecordSource = '# Existing review\n';
  await writeFile(sourceRecordPath, sourceRecordSource);
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      schemaVersion: 1,
      algorithm: 'sha256-bytes-v1',
      capturedAt: now,
      statusUpdatedAt: '2026-09-05',
      qualityBoundary: 'integrity-only-not-native-speaker-or-semantic-proof',
      reviewRecord: sourceRecord,
      artifacts: [{ path: 'fr/page.html', sha256: mechanicalSha256(page) }],
    }, null, 2)}\n`,
  );
  const migrationRecord = 'audit/localization/migration.md';
  const migrationRecordPath = path.join(fixtureRoot, ...migrationRecord.split('/'));
  const migrationRecordSource = `migratedAt: \`${now}\`\nmigratedByRole: \`test reviewer\`\nmigrationType: \`editorial-snapshot-schema-v1-to-v2\`\nsemanticReviewPerformed: \`false\`\nnativeSpeakerReviewPerformed: \`false\`\nsourceReviewClaimsPreserved: \`true\`\n`;
  await writeFile(
    migrationRecordPath,
    migrationRecordSource,
  );

  assertCommandPassed(run('git', ['init', '-q'], fixtureRoot), 'git init');
  assertCommandPassed(run('git', ['config', 'user.email', 'audit-test@example.invalid'], fixtureRoot), 'git config email');
  assertCommandPassed(run('git', ['config', 'user.name', 'Audit Test'], fixtureRoot), 'git config name');
  assertCommandPassed(run('git', ['add', '.'], fixtureRoot), 'git add legacy baseline');
  assertCommandPassed(run('git', ['commit', '-qm', 'legacy baseline'], fixtureRoot), 'git commit legacy baseline');
  assertCommandPassed(run('git', ['branch', 'trusted-legacy'], fixtureRoot), 'create trusted legacy ref');
  const trustedLegacySha = run('git', ['rev-parse', 'trusted-legacy'], fixtureRoot).stdout.trim();

  const legacyManifestBeforeRejectedMigration = await readFile(manifestPath, 'utf8');
  const legacyStatusPath = path.join(fixtureRoot, 'i18n', 'editorial', 'status.json');
  const legacyStatusBeforeRejectedMigration = await readFile(legacyStatusPath, 'utf8');
  await writeFile(sourceRecordPath, `${sourceRecordSource}post-hoc legacy edit\n`);
  const pollutedSourceRecordAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    '--schema-migration',
    `--migration-record=${migrationRecord}`,
  ], fixtureRoot);
  assert.notEqual(pollutedSourceRecordAttempt.status, 0);
  assert.match(pollutedSourceRecordAttempt.stderr, /legacy source review record differs from trusted HEAD/);
  assert.equal(await readFile(manifestPath, 'utf8'), legacyManifestBeforeRejectedMigration);
  assert.equal(await readFile(legacyStatusPath, 'utf8'), legacyStatusBeforeRejectedMigration);
  await writeFile(sourceRecordPath, sourceRecordSource);

  const migration = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    '--schema-migration',
    `--migration-record=${migrationRecord}`,
  ], fixtureRoot);
  assertCommandPassed(migration, 'schema migration');
  assertCommandPassed(
    run(process.execPath, ['scripts/verify-editorial-release-status.mjs'], fixtureRoot),
    'verifier accepts immutable migration evidence',
  );
  await writeFile(migrationRecordPath, `${migrationRecordSource}\npost-hoc edit\n`);
  const driftedMigrationEvidence = run(
    process.execPath,
    ['scripts/verify-editorial-release-status.mjs'],
    fixtureRoot,
  );
  assert.notEqual(driftedMigrationEvidence.status, 0);
  assert.match(driftedMigrationEvidence.stderr, /content no longer matches recordSha256/);
  await writeFile(migrationRecordPath, migrationRecordSource);
  assertCommandPassed(run('git', ['add', '.'], fixtureRoot), 'git add migrated baseline');
  assertCommandPassed(run('git', ['commit', '-qm', 'migrated baseline'], fixtureRoot), 'git commit migrated baseline');
  assertCommandPassed(run('git', ['branch', 'trusted-base'], fixtureRoot), 'create trusted baseline ref');
  const trustedBaseSha = run('git', ['rev-parse', 'trusted-base'], fixtureRoot).stdout.trim();
  const trustedManifestSource = await readFile(manifestPath, 'utf8');
  const trustedManifest = JSON.parse(trustedManifestSource);
  const statusPath = path.join(fixtureRoot, 'i18n', 'editorial', 'status.json');
  const trustedStatusSource = await readFile(statusPath, 'utf8');
  const migratedBranch = run('git', ['branch', '--show-current'], fixtureRoot).stdout.trim();
  const symbolicBaselineAttempt = run(process.execPath, [
    'scripts/verify-editorial-release-status.mjs',
    '--baseline-ref=HEAD',
  ], fixtureRoot);
  assert.notEqual(symbolicBaselineAttempt.status, 0);
  assert.match(symbolicBaselineAttempt.stderr, /exact lowercase 40-character commit SHA/);
  const selfTrustedCiBaselineAttempt = run(process.execPath, [
    'scripts/verify-editorial-release-status.mjs',
    `--baseline-ref=${trustedBaseSha}`,
  ], fixtureRoot, {
    GITHUB_ACTIONS: 'true',
    EDITORIAL_TRUSTED_BASE_REF: trustedBaseSha,
  });
  assert.notEqual(selfTrustedCiBaselineAttempt.status, 0);
  assert.match(selfTrustedCiBaselineAttempt.stderr, /must differ from the candidate HEAD/);
  const conflictingCliBaselineAttempt = run(process.execPath, [
    'scripts/verify-editorial-release-status.mjs',
    `--baseline-ref=${trustedLegacySha}`,
  ], fixtureRoot, {
    GITHUB_ACTIONS: 'true',
    EDITORIAL_TRUSTED_BASE_REF: trustedBaseSha,
  });
  assert.notEqual(conflictingCliBaselineAttempt.status, 0);
  assert.match(conflictingCliBaselineAttempt.stderr, /must exactly match the workflow-injected/);

  assertCommandPassed(run('git', ['switch', '-qc', 'poisoned-migration-source'], fixtureRoot), 'create migration-source poison branch');
  const forgedSourceRecord = 'audit/localization/forged-source.md';
  const forgedSourceRecordSource = '# Forged prior review\n';
  const sourcePoisonedManifest = JSON.parse(trustedManifestSource);
  sourcePoisonedManifest.migration.sourceReviewRecord = forgedSourceRecord;
  sourcePoisonedManifest.migration.sourceReviewRecordSha256 = mechanicalSha256(forgedSourceRecordSource);
  await writeFile(path.join(fixtureRoot, ...forgedSourceRecord.split('/')), forgedSourceRecordSource);
  await writeFile(manifestPath, `${JSON.stringify(sourcePoisonedManifest, null, 2)}\n`);
  assertCommandPassed(run('git', ['add', '.'], fixtureRoot), 'git add migration-source poison');
  assertCommandPassed(run('git', ['commit', '-qm', 'migration-source poison'], fixtureRoot), 'git commit migration-source poison');
  const committedMigrationSourcePoisonAttempt = run(process.execPath, [
    'scripts/verify-editorial-release-status.mjs',
    `--baseline-ref=${trustedLegacySha}`,
  ], fixtureRoot);
  assert.notEqual(committedMigrationSourcePoisonAttempt.status, 0);
  assert.match(committedMigrationSourcePoisonAttempt.stderr, /schema migration source provenance does not match trusted git baseline/);
  assertCommandPassed(run('git', ['switch', '-q', migratedBranch], fixtureRoot), 'return from migration-source poison branch');

  assertCommandPassed(run('git', ['switch', '-qc', 'poisoned-snapshot'], fixtureRoot), 'create poisoned branch');
  const poisonedPage = page.replace('Texte visible', 'Texte non révisé');
  const poisonedManifest = JSON.parse(trustedManifestSource);
  poisonedManifest.artifacts[0].semanticSha256 = semanticSha256(poisonedPage);
  poisonedManifest.artifacts[0].mechanicalSha256 = mechanicalSha256(poisonedPage);
  await writeFile(pagePath, poisonedPage);
  await writeFile(manifestPath, `${JSON.stringify(poisonedManifest, null, 2)}\n`);
  assertCommandPassed(run('git', ['add', '.'], fixtureRoot), 'git add poisoned snapshot');
  assertCommandPassed(run('git', ['commit', '-qm', 'poisoned snapshot'], fixtureRoot), 'git commit poisoned snapshot');
  const committedPoisonAttempt = run(process.execPath, [
    'scripts/verify-editorial-release-status.mjs',
    `--baseline-ref=${trustedBaseSha}`,
  ], fixtureRoot);
  assert.notEqual(committedPoisonAttempt.status, 0);
  assert.match(committedPoisonAttempt.stderr, /semantic change is not bound to an exact review transition from trusted git baseline/);
  assertCommandPassed(run('git', ['switch', '-q', migratedBranch], fixtureRoot), 'return to migrated baseline');

  assertCommandPassed(run('git', ['switch', '-qc', 'poisoned-mechanical'], fixtureRoot), 'create mechanically poisoned branch');
  const mechanicallyPoisonedPage = page.replace('site.js?v=one', 'site.js?v=unreviewed');
  const mechanicallyPoisonedManifest = JSON.parse(trustedManifestSource);
  mechanicallyPoisonedManifest.artifacts[0].mechanicalSha256 = mechanicalSha256(mechanicallyPoisonedPage);
  await writeFile(pagePath, mechanicallyPoisonedPage);
  await writeFile(manifestPath, `${JSON.stringify(mechanicallyPoisonedManifest, null, 2)}\n`);
  assertCommandPassed(run('git', ['add', '.'], fixtureRoot), 'git add mechanically poisoned snapshot');
  assertCommandPassed(run('git', ['commit', '-qm', 'mechanically poisoned snapshot'], fixtureRoot), 'git commit mechanically poisoned snapshot');
  const committedMechanicalPoisonAttempt = run(process.execPath, [
    'scripts/verify-editorial-release-status.mjs',
    `--baseline-ref=${trustedBaseSha}`,
  ], fixtureRoot);
  assert.notEqual(committedMechanicalPoisonAttempt.status, 0);
  assert.match(committedMechanicalPoisonAttempt.stderr, /mechanical change is not bound to an exact evidence transition from trusted git baseline/);
  assertCommandPassed(run('git', ['switch', '-q', migratedBranch], fixtureRoot), 'return from mechanical poison branch');

  const changeRecord = 'audit/localization/mechanical.md';
  const cacheOnlyChange = page.replace('site.js?v=one', 'site.js?v=two');
  const mechanicalChangedAt = new Date(
    Math.max(Date.now(), Date.parse(trustedManifest.updatedAt) + 1),
  ).toISOString();
  const mechanicalTransition = [{
    path: 'fr/page.html',
    beforeMechanicalSha256: trustedManifest.artifacts[0].mechanicalSha256,
    afterMechanicalSha256: mechanicalSha256(cacheOnlyChange),
  }];
  const changeRecordSource = `changedAt: \`${mechanicalChangedAt}\`\nchangedByRole: \`test maintainer\`\nchangeType: \`mechanical-only\`\nreason: \`cache key update\`\nsemanticReviewPerformed: \`false\`\nnativeSpeakerReviewPerformed: \`false\`\nchangedArtifactTransitions: \`${JSON.stringify(mechanicalTransition)}\`\n`;
  await writeFile(
    path.join(fixtureRoot, ...changeRecord.split('/')),
    changeRecordSource,
  );
  const semanticChange = page.replace('Texte visible', 'Texte falsifié');
  await writeFile(pagePath, semanticChange);
  const pollutedManifest = JSON.parse(trustedManifestSource);
  pollutedManifest.artifacts[0].semanticSha256 = semanticSha256(semanticChange);
  await writeFile(manifestPath, `${JSON.stringify(pollutedManifest, null, 2)}\n`);
  const pollutedAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    '--mechanical-only',
    `--change-record=${changeRecord}`,
  ], fixtureRoot);
  assert.notEqual(pollutedAttempt.status, 0);
  assert.match(pollutedAttempt.stderr, /working manifest differs from the trusted HEAD baseline/);

  await writeFile(manifestPath, trustedManifestSource);
  const pollutedStatus = JSON.parse(trustedStatusSource);
  pollutedStatus.languages.fr.reviewed = [];
  pollutedStatus.languages.fr.remaining = 1;
  pollutedStatus.seoGeo.fr.reviewed = 0;
  pollutedStatus.renderQa.checkedViewports = 0;
  await writeFile(statusPath, `${JSON.stringify(pollutedStatus, null, 2)}\n`);
  const pollutedStatusAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    '--mechanical-only',
    `--change-record=${changeRecord}`,
  ], fixtureRoot);
  assert.notEqual(pollutedStatusAttempt.status, 0);
  assert.match(pollutedStatusAttempt.stderr, /working editorial status differs from the trusted HEAD baseline/);
  await writeFile(statusPath, trustedStatusSource);

  await writeFile(pagePath, cacheOnlyChange);
  const allowedAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    '--mechanical-only',
    `--change-record=${changeRecord}`,
  ], fixtureRoot);
  assertCommandPassed(allowedAttempt, 'mechanical-only cache refresh');
  const refreshedManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(refreshedManifest.artifacts[0].semanticSha256, trustedManifest.artifacts[0].semanticSha256);
  assert.deepEqual(refreshedManifest.artifacts[0].semanticProvenance, trustedManifest.artifacts[0].semanticProvenance);
  assert.notEqual(refreshedManifest.artifacts[0].mechanicalSha256, trustedManifest.artifacts[0].mechanicalSha256);
  assertCommandPassed(
    run(process.execPath, ['scripts/verify-editorial-release-status.mjs'], fixtureRoot),
    'verifier accepts mechanical-only evidence',
  );

  assertCommandPassed(run('git', ['add', '.'], fixtureRoot), 'git add mechanical refresh');
  assertCommandPassed(run('git', ['commit', '-qm', 'mechanical refresh'], fixtureRoot), 'git commit mechanical refresh');
  await writeFile(pagePath, cacheOnlyChange.replace('site.js?v=two', 'site.js?v=three'));
  const replayedMechanicalRecordAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    '--mechanical-only',
    `--change-record=${changeRecord}`,
  ], fixtureRoot);
  assert.notEqual(replayedMechanicalRecordAttempt.status, 0);
  assert.match(replayedMechanicalRecordAttempt.stderr, /changedAt must be later than the trusted manifest updatedAt|changedArtifactTransitions hashes do not match/);
  await writeFile(pagePath, cacheOnlyChange);
  const reviewedSemanticPage = cacheOnlyChange.replace('Texte visible', 'Texte modifié');
  await writeFile(pagePath, reviewedSemanticPage);
  const semanticProbeChangedAt = new Date(
    Math.max(Date.now(), Date.parse(refreshedManifest.updatedAt) + 1),
  ).toISOString();
  const semanticProbeTransition = [{
    path: 'fr/page.html',
    beforeMechanicalSha256: refreshedManifest.artifacts[0].mechanicalSha256,
    afterMechanicalSha256: mechanicalSha256(reviewedSemanticPage),
  }];
  const semanticProbeRecordSource = `changedAt: \`${semanticProbeChangedAt}\`\nchangedByRole: \`test maintainer\`\nchangeType: \`mechanical-only\`\nreason: \`classification probe\`\nsemanticReviewPerformed: \`false\`\nnativeSpeakerReviewPerformed: \`false\`\nchangedArtifactTransitions: \`${JSON.stringify(semanticProbeTransition)}\`\n`;
  await writeFile(path.join(fixtureRoot, ...changeRecord.split('/')), semanticProbeRecordSource);
  const semanticAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    '--mechanical-only',
    `--change-record=${changeRecord}`,
  ], fixtureRoot);
  assert.notEqual(semanticAttempt.status, 0);
  assert.match(semanticAttempt.stderr, /Mechanical-only refresh refused because editorial semantics changed/);
  await writeFile(path.join(fixtureRoot, ...changeRecord.split('/')), changeRecordSource);

  const semanticRecord = 'audit/localization/semantic-review.md';
  const semanticRecordPath = path.join(fixtureRoot, ...semanticRecord.split('/'));
  const semanticReviewedAt = new Date(
    Math.max(Date.now(), Date.parse(refreshedManifest.updatedAt) + 1),
  ).toISOString();
  const reviewedTransition = [{
    path: 'fr/page.html',
    beforeSemanticSha256: refreshedManifest.artifacts[0].semanticSha256,
    afterSemanticSha256: semanticSha256(reviewedSemanticPage),
    beforeMechanicalSha256: refreshedManifest.artifacts[0].mechanicalSha256,
    afterMechanicalSha256: mechanicalSha256(reviewedSemanticPage),
  }];
  const semanticRecordSource = ({
    reviewer = 'test reviewer',
    blockingIssues = [],
    duplicateBlockingField = false,
  } = {}) => [
    `reviewedAt: \`${semanticReviewedAt}\``,
    `reviewedByRole: \`${reviewer}\``,
    'reviewMethod: `AI-assisted line-by-line target-market review`',
    'reviewType: `ai-assisted-target-market-semantic-review`',
    'semanticReviewPerformed: `true`',
    'nativeSpeakerReviewPerformed: `false`',
    'referenceUrls: `["https://example.com/fr/reference"]`',
    `referenceAccessDates: \`["${semanticReviewedAt.slice(0, 10)}"]\``,
    'terminologyDecisions: `["Use localized product terminology"]`',
    'searchIntentDecisions: `["Preserve quotation intent"]`',
    'unresolvedIssues: `[]`',
    `blockingIssues: \`${JSON.stringify(blockingIssues)}\``,
    'reviewedArtifactPaths: `["fr/page.html"]`',
    `reviewedArtifactTransitions: \`${JSON.stringify(reviewedTransition)}\``,
    ...(duplicateBlockingField ? ['blockingIssues: `["P1 unresolved"]`'] : []),
    '',
  ].join('\n');
  const baselineManifestBeforeRejectedReviews = await readFile(manifestPath, 'utf8');
  const baselineStatusBeforeRejectedReviews = await readFile(statusPath, 'utf8');

  await writeFile(semanticRecordPath, semanticRecordSource({ reviewer: '' }));
  const emptyReviewerAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    `--review-record=${semanticRecord}`,
  ], fixtureRoot);
  assert.notEqual(emptyReviewerAttempt.status, 0);
  assert.match(emptyReviewerAttempt.stderr, /reviewedByRole must not be empty/);

  await writeFile(semanticRecordPath, semanticRecordSource({ blockingIssues: ['P1 unresolved'] }));
  const blockingIssueAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    `--review-record=${semanticRecord}`,
  ], fixtureRoot);
  assert.notEqual(blockingIssueAttempt.status, 0);
  assert.match(blockingIssueAttempt.stderr, /blockingIssues must be an empty JSON array/);

  await writeFile(semanticRecordPath, semanticRecordSource({ duplicateBlockingField: true }));
  const duplicateFieldAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    `--review-record=${semanticRecord}`,
  ], fixtureRoot);
  assert.notEqual(duplicateFieldAttempt.status, 0);
  assert.match(duplicateFieldAttempt.stderr, /blockingIssues: must appear exactly once, found 2/);

  await writeFile(semanticRecordPath, `~~~yaml\n${semanticRecordSource()}~~~\n`);
  const fencedEvidenceAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    `--review-record=${semanticRecord}`,
  ], fixtureRoot);
  assert.notEqual(fencedEvidenceAttempt.status, 0);
  assert.match(fencedEvidenceAttempt.stderr, /must be in the top record section, outside code fences/);

  await writeFile(
    semanticRecordPath,
    semanticRecordSource().replace(
      'terminologyDecisions: `["Use localized product terminology"]`',
      'terminologyDecisions: `[""]`',
    ),
  );
  const emptyDecisionAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    `--review-record=${semanticRecord}`,
  ], fixtureRoot);
  assert.notEqual(emptyDecisionAttempt.status, 0);
  assert.match(emptyDecisionAttempt.stderr, /decisions must be non-empty strings/);

  await writeFile(
    semanticRecordPath,
    semanticRecordSource().replace(
      `referenceAccessDates: \`["${semanticReviewedAt.slice(0, 10)}"]\``,
      'referenceAccessDates: `["2026-99-99"]`',
    ),
  );
  const invalidAccessDateAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    `--review-record=${semanticRecord}`,
  ], fixtureRoot);
  assert.notEqual(invalidAccessDateAttempt.status, 0);
  assert.match(invalidAccessDateAttempt.stderr, /real YYYY-MM-DD dates not later than reviewedAt/);

  await writeFile(
    semanticRecordPath,
    semanticRecordSource().replace('unresolvedIssues: `[]`', 'unresolvedIssues: `["P1 release blocker"]`'),
  );
  const unresolvedIssueAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    `--review-record=${semanticRecord}`,
  ], fixtureRoot);
  assert.notEqual(unresolvedIssueAttempt.status, 0);
  assert.match(unresolvedIssueAttempt.stderr, /unresolvedIssues must be an empty JSON array/);
  assert.equal(await readFile(manifestPath, 'utf8'), baselineManifestBeforeRejectedReviews);
  assert.equal(await readFile(statusPath, 'utf8'), baselineStatusBeforeRejectedReviews);

  const validSemanticRecord = semanticRecordSource();
  await writeFile(semanticRecordPath, validSemanticRecord);
  const reviewedSemanticAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    `--review-record=${semanticRecord}`,
  ], fixtureRoot);
  assertCommandPassed(reviewedSemanticAttempt, 'reviewed semantic refresh');
  assertCommandPassed(
    run(process.execPath, ['scripts/verify-editorial-release-status.mjs'], fixtureRoot),
    'verifier accepts complete semantic review evidence',
  );

  const validSemanticManifestSource = await readFile(manifestPath, 'utf8');
  const maliciousRecord = validSemanticRecord.replace(
    'unresolvedIssues: `[]`',
    'unresolvedIssues: `["P1 release blocker"]`',
  );
  const maliciousRecordSha256 = mechanicalSha256(maliciousRecord);
  const maliciousManifest = JSON.parse(validSemanticManifestSource);
  maliciousManifest.lastUpdate.recordSha256 = maliciousRecordSha256;
  maliciousManifest.artifacts[0].semanticProvenance.recordSha256 = maliciousRecordSha256;
  maliciousManifest.artifacts[0].mechanicalProvenance.recordSha256 = maliciousRecordSha256;
  await writeFile(semanticRecordPath, maliciousRecord);
  await writeFile(manifestPath, `${JSON.stringify(maliciousManifest, null, 2)}\n`);
  const forgedButDigestMatchedEvidence = run(
    process.execPath,
    ['scripts/verify-editorial-release-status.mjs'],
    fixtureRoot,
  );
  assert.notEqual(forgedButDigestMatchedEvidence.status, 0);
  assert.match(forgedButDigestMatchedEvidence.stderr, /unresolvedIssues must be an empty JSON array/);
  await writeFile(manifestPath, validSemanticManifestSource);
  await writeFile(semanticRecordPath, validSemanticRecord);

  await writeFile(semanticRecordPath, `${validSemanticRecord}post-hoc edit\n`);
  const driftedSemanticEvidence = run(
    process.execPath,
    ['scripts/verify-editorial-release-status.mjs'],
    fixtureRoot,
  );
  assert.notEqual(driftedSemanticEvidence.status, 0);
  assert.match(driftedSemanticEvidence.stderr, /content no longer matches recordSha256/);

  await writeFile(semanticRecordPath, validSemanticRecord);
  assertCommandPassed(run('git', ['add', '.'], fixtureRoot), 'git add semantic refresh');
  assertCommandPassed(run('git', ['commit', '-qm', 'semantic refresh'], fixtureRoot), 'git commit semantic refresh');
  const manifestBeforeReplay = await readFile(manifestPath, 'utf8');
  await writeFile(pagePath, reviewedSemanticPage.replace('Texte modifié', 'Texte encore modifié'));
  const replayAttempt = run(process.execPath, [
    'scripts/refresh-reviewed-localized-artifacts.mjs',
    '--write',
    `--review-record=${semanticRecord}`,
  ], fixtureRoot);
  assert.notEqual(replayAttempt.status, 0);
  assert.match(replayAttempt.stderr, /reviewedAt must be later than the trusted manifest updatedAt|reviewedArtifactTransitions hashes do not match/);
  assert.equal(await readFile(manifestPath, 'utf8'), manifestBeforeReplay);
});

test('semantic projection has a deterministic golden digest', () => {
  assert.equal(createSemanticProjection(baseHtml).includes('\r'), false);
  assert.match(semanticSha256(baseHtml), /^[a-f0-9]{64}$/);
  // Fixed after the projection schema is finalized. Any intentional projection
  // change must bump SEMANTIC_ALGORITHM and update this golden value together.
  assert.equal(semanticSha256(baseHtml), '865ef481c2ec8bc674959f01daa4b4a8c1197b18fdc873f1ccd5dffcc2f7f677');
});
