import { createHash } from 'node:crypto';
import { parse } from 'yaml';

// Parsed-YAML fingerprints form an executable allowlist. Formatting and
// comments are ignored, while any semantic field (including an appended run
// command, shell, permission, environment, action input or job option) changes
// the digest and therefore requires an explicit contract review.
export const TRUSTED_WORKFLOW_SEMANTIC_DIGESTS = Object.freeze({
  deploy: 'f03715f1880b198d99428a34c233b65f0870e83f0758a6f722ed0407ea86d777',
  prQuality: '5a6fa2745cfd6e172321fec19d1c83427ae04e9053941f473db9ca506dece07a',
});

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

function normalizedRun(value) {
  return String(value || '').replaceAll('\r\n', '\n').trim();
}

function sameSet(actual, expected) {
  const values = Array.isArray(actual) ? actual : actual ? [actual] : [];
  return values.length === expected.length
    && expected.every((entry) => values.includes(entry));
}

function job(workflow, id, failures, workflowName) {
  const value = workflow?.jobs?.[id];
  if (!value || typeof value !== 'object') failures.push(`${workflowName}: missing job ${id}.`);
  return value || {};
}

function step(jobValue, name, failures, jobName) {
  const matches = (jobValue.steps || []).filter((entry) => entry?.name === name);
  if (matches.length !== 1) failures.push(`${jobName}: expected exactly one step named ${name}.`);
  return matches[0] || {};
}

function exact(label, actual, expected, failures) {
  if (actual !== expected) failures.push(`${label} must equal ${JSON.stringify(expected)}.`);
}

function exactRun(label, stepValue, expected, failures) {
  exact(`${label} run`, normalizedRun(stepValue.run), normalizedRun(expected), failures);
}

function actionName(uses) {
  const at = String(uses || '').lastIndexOf('@');
  return at > 0 ? String(uses).slice(0, at) : String(uses || '');
}

function assertAction(label, stepValue, expectedAction, failures) {
  exact(`${label} action`, actionName(stepValue.uses), expectedAction, failures);
}

function assertUnconditional(label, value, failures) {
  if (Object.hasOwn(value || {}, 'if')) failures.push(`${label} must not have an if condition.`);
  if (Object.hasOwn(value || {}, 'continue-on-error')) failures.push(`${label} must not continue on error.`);
}

function assertOrder(label, jobValue, orderedSteps, failures) {
  const positions = orderedSteps.map((stepValue) => (jobValue.steps || []).indexOf(stepValue));
  if (positions.some((position) => position < 0)
    || positions.some((position, index) => index > 0 && position <= positions[index - 1])) {
    failures.push(`${label} steps are not in the required fail-closed order.`);
  }
}

function assertPinnedActions(workflow, workflowName, failures) {
  for (const [jobId, jobValue] of Object.entries(workflow?.jobs || {})) {
    for (const stepValue of jobValue.steps || []) {
      if (!stepValue?.uses) continue;
      const match = String(stepValue.uses).match(/^([^@]+)@([0-9a-f]{40})$/u);
      if (!match) failures.push(`${workflowName}/${jobId}/${stepValue.name || '(unnamed)'} must pin uses to a full lowercase commit SHA.`);
    }
  }
}

const EXPECTED_DEPLOY_STEPS = Object.freeze({
  'build-release': [
    'Check out release source',
    'Set up Node.js',
    'Set up Python',
    'Install PDF validation dependency',
    'Confirm release is the current main commit',
    'Load protected editorial trust baseline',
    'Create immutable release identity',
    'Install dependencies',
    'Build and audit release once',
    'Bind protected release authorization and inquiry evidence',
    'Record canonical release manifest digest',
    'Confirm generated source files are committed',
    'Verify deployment shell and Nginx policy contracts',
    'Upload canonical production artifact',
    'Upload release audit evidence',
  ],
  'inquiry-php': [
    'Check out release source',
    'Set up Node.js',
    'Set up PHP ${{ matrix.php }}',
    'Verify isolated inquiry failure paths',
  ],
  'lighthouse-performance': [
    'Check out release source',
    'Set up Node.js',
    'Install dependencies',
    'Download the audited production artifact',
    'Verify downloaded artifact identity',
    'Verify pinned mobile performance matrix',
  ],
  'validate-and-deploy': [
    'Check out release source',
    'Set up Node.js',
    'Install dependencies',
    'Download the exact audited production artifact',
    'Revalidate downloaded artifact integrity',
    'Configure SSH',
    'Verify hardened server deployment contract',
    'Prepare IndexNow URLs from the active release',
    'Upload immutable release',
    'Stage managed Nginx policy',
    'Checkpoint production telemetry',
    'Activate release',
    'Verify public deployment boundary',
    'Verify production navigation in a real browser',
    'Verify production telemetry before commit',
    'Commit deployment transaction',
    'Roll back an uncommitted deployment',
    'Notify IndexNow of changed URLs',
    'Deployment summary',
    'Upload post-deployment audit evidence',
  ],
});

const EXPECTED_PR_STEPS = Object.freeze({
  'inquiry-php': [
    'Check out pull request',
    'Set up Node.js',
    'Set up PHP ${{ matrix.php }}',
    'Verify isolated inquiry failure paths',
  ],
  'deterministic-release-linux': [
    'Check out pull request',
    'Set up Node.js',
    'Install dependencies',
    'Build release candidate',
    'Record release manifest digest',
  ],
  'deterministic-release-windows': [
    'Check out pull request',
    'Set up Node.js',
    'Install dependencies',
    'Build release candidate',
    'Record release manifest digest',
  ],
  'deterministic-release': ['Compare Linux and Windows release manifests'],
  quality: [
    'Check out pull request',
    'Set up Node.js',
    'Set up Python',
    'Install PDF validation dependency',
    'Install dependencies',
    'Run source, product, localization, claim, and release checks',
    'Confirm generated assets are committed',
  ],
});

function assertExactJobAndStepInventory(workflow, expected, workflowName, failures) {
  const actualJobIds = Object.keys(workflow?.jobs || {}).sort();
  const expectedJobIds = Object.keys(expected).sort();
  if (JSON.stringify(actualJobIds) !== JSON.stringify(expectedJobIds)) {
    failures.push(`${workflowName}: job inventory must be exactly ${expectedJobIds.join(', ')}.`);
  }
  for (const [jobId, expectedStepNames] of Object.entries(expected)) {
    const jobValue = workflow?.jobs?.[jobId];
    if (!jobValue) continue;
    const actualStepNames = (jobValue.steps || []).map((stepValue) => stepValue?.name || '');
    if (JSON.stringify(actualStepNames) !== JSON.stringify(expectedStepNames)) {
      failures.push(`${workflowName}/${jobId}: step names and order must match the exact audited inventory.`);
    }
  }
}

function assertConditionalInventory(deployWorkflow, prWorkflow, failures) {
  const allowed = new Map([
    ['deploy/build-release/Upload release audit evidence/if', '${{ always() }}'],
    [
      'deploy/validate-and-deploy/Roll back an uncommitted deployment/if',
      "${{ always() && env.nginx_transaction_attempted == 'true' && env.deployment_committed != 'true' }}",
    ],
    ['deploy/validate-and-deploy/Notify IndexNow of changed URLs/continue-on-error', true],
    ['deploy/validate-and-deploy/Upload post-deployment audit evidence/if', '${{ always() }}'],
  ]);
  for (const [workflowName, workflow] of [['deploy', deployWorkflow], ['pr-quality', prWorkflow]]) {
    for (const [jobId, jobValue] of Object.entries(workflow?.jobs || {})) {
      for (const property of ['if', 'continue-on-error']) {
        if (Object.hasOwn(jobValue, property)) failures.push(`${workflowName}/${jobId}: job-level ${property} is forbidden.`);
      }
      for (const stepValue of jobValue.steps || []) {
        for (const property of ['if', 'continue-on-error']) {
          if (!Object.hasOwn(stepValue, property)) continue;
          const key = `${workflowName}/${jobId}/${stepValue.name || '(unnamed)'}/${property}`;
          if (!allowed.has(key) || stepValue[property] !== allowed.get(key)) {
            failures.push(`${key} is not an audited conditional exception.`);
          }
        }
      }
    }
  }
}

export function parseWorkflow(source, label = 'workflow') {
  const workflow = parse(source);
  if (!workflow || typeof workflow !== 'object' || !workflow.jobs || typeof workflow.jobs !== 'object') {
    throw new Error(`${label} is not a GitHub Actions workflow with jobs.`);
  }
  return workflow;
}

export function workflowSemanticSha256(workflow) {
  return createHash('sha256').update(JSON.stringify(canonicalize(workflow))).digest('hex');
}

export function workflowNpmScripts(workflow) {
  const scripts = [];
  for (const jobValue of Object.values(workflow?.jobs || {})) {
    for (const stepValue of jobValue.steps || []) {
      for (const rawLine of normalizedRun(stepValue?.run).split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const match = line.match(/^npm\s+run\s+([a-z0-9:_-]+)(?:\s|$)/iu);
        if (match) scripts.push(match[1]);
      }
    }
  }
  return scripts;
}

export function validateAuditWorkflowContracts({ deploySource, prSource, expectedSemanticDigests = null }) {
  const failures = [];
  let deployWorkflow;
  let prWorkflow;
  try {
    deployWorkflow = parseWorkflow(deploySource, 'deploy workflow');
  } catch (error) {
    failures.push(error.message);
    return failures;
  }
  try {
    prWorkflow = parseWorkflow(prSource, 'PR workflow');
  } catch (error) {
    failures.push(error.message);
    return failures;
  }

  const actualDigests = {
    deploy: workflowSemanticSha256(deployWorkflow),
    prQuality: workflowSemanticSha256(prWorkflow),
  };
  for (const [name, actual] of Object.entries(actualDigests)) {
    const trusted = TRUSTED_WORKFLOW_SEMANTIC_DIGESTS[name];
    if (actual !== trusted) {
      failures.push(`${name} workflow semantic digest changed (expected ${trusted}, actual ${actual}); update the trusted code contract only after reviewing the complete workflow diff.`);
    }
    if (expectedSemanticDigests && expectedSemanticDigests[name] !== trusted) {
      failures.push(`${name} workflow digest in the release policy must equal the trusted code contract.`);
    }
  }

  assertPinnedActions(deployWorkflow, 'deploy', failures);
  assertPinnedActions(prWorkflow, 'pr-quality', failures);
  assertExactJobAndStepInventory(deployWorkflow, EXPECTED_DEPLOY_STEPS, 'deploy', failures);
  assertExactJobAndStepInventory(prWorkflow, EXPECTED_PR_STEPS, 'pr-quality', failures);
  assertConditionalInventory(deployWorkflow, prWorkflow, failures);

  for (const [jobId, jobValue] of Object.entries(deployWorkflow.jobs || {})) {
    if (['build-release', 'validate-and-deploy'].includes(jobId)) continue;
    if (Object.hasOwn(jobValue, 'environment')) {
      failures.push(`deploy/${jobId}: only build-release and validate-and-deploy may consume the production environment.`);
    }
  }

  if (JSON.stringify(deployWorkflow.on) !== JSON.stringify({ push: { tags: ['deploy-*'] }, workflow_dispatch: null })) {
    failures.push('deploy triggers must be exactly deploy-* tags plus explicit workflow_dispatch.');
  }
  if (JSON.stringify(prWorkflow.on) !== JSON.stringify({ pull_request: { branches: ['main'] } })) {
    failures.push('PR audit trigger must be exactly pull requests targeting main.');
  }
  if (JSON.stringify(deployWorkflow.permissions) !== JSON.stringify({ contents: 'read' })) {
    failures.push('deploy workflow permissions must remain read-only at workflow scope.');
  }
  if (JSON.stringify(prWorkflow.permissions) !== JSON.stringify({ contents: 'read' })) {
    failures.push('PR workflow permissions must remain read-only.');
  }

  const qualityJob = job(prWorkflow, 'quality', failures, 'pr-quality');
  assertUnconditional('pr-quality/quality job', qualityJob, failures);
  if (!sameSet(qualityJob.needs, ['inquiry-php', 'deterministic-release'])) {
    failures.push('pr-quality/quality needs must exactly require inquiry-php and deterministic-release.');
  }
  const qualityCheckout = step(qualityJob, 'Check out pull request', failures, 'pr-quality/quality');
  assertAction('pr-quality/quality checkout', qualityCheckout, 'actions/checkout', failures);
  exact('pr-quality/quality checkout fetch-depth', qualityCheckout.with?.['fetch-depth'], 0, failures);
  const pdfInstall = step(qualityJob, 'Install PDF validation dependency', failures, 'pr-quality/quality');
  exactRun('pr-quality/quality PDF install', pdfInstall, 'python -m pip install --require-hashes -r .github/requirements-deploy.txt', failures);
  const qualityGate = step(qualityJob, 'Run source, product, localization, claim, and release checks', failures, 'pr-quality/quality');
  assertUnconditional('pr-quality/quality gate', qualityGate, failures);
  exactRun('pr-quality/quality gate', qualityGate, 'npm run quality:pr', failures);
  exact(
    'pr-quality/quality trusted baseline',
    qualityGate.env?.EDITORIAL_TRUSTED_BASE_REF,
    '${{ github.event.pull_request.base.sha }}',
    failures,
  );
  if ((qualityJob.steps || []).indexOf(pdfInstall) >= (qualityJob.steps || []).indexOf(qualityGate)) {
    failures.push('pr-quality/quality must install the PDF verifier before the unified audit gate.');
  }

  const deterministicJob = job(prWorkflow, 'deterministic-release', failures, 'pr-quality');
  if (!sameSet(deterministicJob.needs, ['deterministic-release-linux', 'deterministic-release-windows'])) {
    failures.push('pr-quality/deterministic-release must require both Linux and Windows builds.');
  }
  job(prWorkflow, 'deterministic-release-linux', failures, 'pr-quality');
  job(prWorkflow, 'deterministic-release-windows', failures, 'pr-quality');

  const buildJob = job(deployWorkflow, 'build-release', failures, 'deploy');
  assertUnconditional('deploy/build-release job', buildJob, failures);
  exact('deploy/build-release environment', buildJob.environment, 'production', failures);
  exact(
    'deploy/build-release editorial baseline output',
    buildJob.outputs?.editorial_trusted_base_sha,
    '${{ steps.editorial-baseline.outputs.sha }}',
    failures,
  );
  const buildCheckout = step(buildJob, 'Check out release source', failures, 'deploy/build-release');
  assertAction('deploy/build-release checkout', buildCheckout, 'actions/checkout', failures);
  exact('deploy/build-release checkout fetch-depth', buildCheckout.with?.['fetch-depth'], 0, failures);

  const baselineStep = step(buildJob, 'Load protected editorial trust baseline', failures, 'deploy/build-release');
  assertUnconditional('deploy/build-release baseline', baselineStep, failures);
  exact(
    'deploy/build-release protected baseline input',
    baselineStep.env?.EDITORIAL_TRUSTED_BASE_SHA,
    '${{ vars.EDITORIAL_TRUSTED_BASE_SHA }}',
    failures,
  );
  exactRun('deploy/build-release baseline', baselineStep, `
[[ "$EDITORIAL_TRUSTED_BASE_SHA" =~ ^[0-9a-f]{40}$ ]]
test "$EDITORIAL_TRUSTED_BASE_SHA" != "$GITHUB_SHA"
git cat-file -e "\${EDITORIAL_TRUSTED_BASE_SHA}^{commit}"
git merge-base --is-ancestor "$EDITORIAL_TRUSTED_BASE_SHA" "$GITHUB_SHA"
echo "EDITORIAL_TRUSTED_BASE_REF=$EDITORIAL_TRUSTED_BASE_SHA" >> "$GITHUB_ENV"
echo "sha=$EDITORIAL_TRUSTED_BASE_SHA" >> "$GITHUB_OUTPUT"
`, failures);

  const buildAuditStep = step(buildJob, 'Build and audit release once', failures, 'deploy/build-release');
  assertUnconditional('deploy/build-release candidate audit', buildAuditStep, failures);
  exactRun('deploy/build-release candidate audit', buildAuditStep, 'npm run deploy:prepare', failures);
  exact('deploy/build-release release identity input', buildAuditStep.env?.BEGAPUNK_RELEASE_ID, '${{ steps.identity.outputs.release_id }}', failures);
  exact('deploy/build-release IndexNow input', buildAuditStep.env?.INDEXNOW_KEY, '${{ secrets.INDEXNOW_KEY }}', failures);

  const authorizationStep = step(buildJob, 'Bind protected release authorization and inquiry evidence', failures, 'deploy/build-release');
  assertUnconditional('deploy/build-release authorization', authorizationStep, failures);
  exactRun('deploy/build-release authorization', authorizationStep, 'npm run release:authorization:verify', failures);
  const expectedAuthorizationEnvironment = {
    RELEASE_APPROVED_SHA: '${{ vars.RELEASE_APPROVED_SHA }}',
    RELEASE_AUTHORIZATION_REF: '${{ vars.RELEASE_AUTHORIZATION_REF }}',
    INQUIRY_DELIVERY_APPLICABILITY: '${{ vars.INQUIRY_DELIVERY_APPLICABILITY }}',
    INQUIRY_DELIVERY_APPROVED_SHA: '${{ vars.INQUIRY_DELIVERY_APPROVED_SHA }}',
    INQUIRY_DELIVERY_EVIDENCE_REF: '${{ vars.INQUIRY_DELIVERY_EVIDENCE_REF }}',
  };
  for (const [name, value] of Object.entries(expectedAuthorizationEnvironment)) {
    exact(`deploy/build-release authorization env ${name}`, authorizationStep.env?.[name], value, failures);
  }

  const productionUpload = step(buildJob, 'Upload canonical production artifact', failures, 'deploy/build-release');
  assertUnconditional('deploy/build-release production upload', productionUpload, failures);
  assertAction('deploy/build-release production upload', productionUpload, 'actions/upload-artifact', failures);
  exact('deploy/build-release production artifact path', productionUpload.with?.path, 'dist/production', failures);
  exact('deploy/build-release production artifact hidden-files flag', productionUpload.with?.['include-hidden-files'], true, failures);
  exact('deploy/build-release production artifact missing-files policy', productionUpload.with?.['if-no-files-found'], 'error', failures);
  const manifestStep = step(buildJob, 'Record canonical release manifest digest', failures, 'deploy/build-release');
  assertUnconditional('deploy/build-release manifest digest', manifestStep, failures);
  exactRun(
    'deploy/build-release manifest digest',
    manifestStep,
    'echo "sha256=$(node scripts/release-manifest-digest.mjs)" >> "$GITHUB_OUTPUT"',
    failures,
  );
  assertOrder(
    'deploy/build-release',
    buildJob,
    [baselineStep, buildAuditStep, authorizationStep, manifestStep, productionUpload],
    failures,
  );

  const validationJob = job(deployWorkflow, 'validate-and-deploy', failures, 'deploy');
  assertUnconditional('deploy/validate-and-deploy job', validationJob, failures);
  exact('deploy/validate-and-deploy environment', validationJob.environment, 'production', failures);
  if (!sameSet(validationJob.needs, ['build-release', 'inquiry-php', 'lighthouse-performance'])) {
    failures.push('deploy/validate-and-deploy needs must exactly require build-release, inquiry-php and lighthouse-performance.');
  }
  const deployCheckout = step(validationJob, 'Check out release source', failures, 'deploy/validate-and-deploy');
  assertAction('deploy/validate-and-deploy checkout', deployCheckout, 'actions/checkout', failures);
  exact('deploy/validate-and-deploy checkout fetch-depth', deployCheckout.with?.['fetch-depth'], 0, failures);
  const productionDownload = step(validationJob, 'Download the exact audited production artifact', failures, 'deploy/validate-and-deploy');
  assertUnconditional('deploy/validate-and-deploy artifact download', productionDownload, failures);
  assertAction('deploy/validate-and-deploy artifact download', productionDownload, 'actions/download-artifact', failures);
  exact('deploy/validate-and-deploy artifact path', productionDownload.with?.path, 'dist/production', failures);
  const expectedArtifactName = 'begapunk-production-${{ github.sha }}-${{ github.run_attempt }}';
  exact('deploy/validate-and-deploy artifact name', productionDownload.with?.name, expectedArtifactName, failures);
  const downloadedValidation = step(validationJob, 'Revalidate downloaded artifact integrity', failures, 'deploy/validate-and-deploy');
  assertUnconditional('deploy/validate-and-deploy artifact revalidation', downloadedValidation, failures);
  exact('deploy/validate-and-deploy manifest input', downloadedValidation.env?.EXPECTED_MANIFEST_SHA256, '${{ needs.build-release.outputs.manifest_sha256 }}', failures);
  exactRun('deploy/validate-and-deploy artifact revalidation', downloadedValidation, `
test -n "$EXPECTED_MANIFEST_SHA256"
test "$(node scripts/release-manifest-digest.mjs)" = "$EXPECTED_MANIFEST_SHA256"
npm run deploy:validate
(cd dist/production && sha256sum --quiet -c manifest.sha256)
`, failures);
  const browserStep = step(validationJob, 'Verify production navigation in a real browser', failures, 'deploy/validate-and-deploy');
  const telemetryStart = step(validationJob, 'Checkpoint production telemetry', failures, 'deploy/validate-and-deploy');
  const telemetryCheck = step(validationJob, 'Verify production telemetry before commit', failures, 'deploy/validate-and-deploy');
  for (const [label, gate, action] of [['checkpoint', telemetryStart, 'telemetry-start'], ['check', telemetryCheck, 'telemetry-check']]) {
    assertUnconditional(`deploy/validate-and-deploy telemetry ${label}`, gate, failures);
    if (!normalizedRun(gate.run).includes(`/usr/local/sbin/begapunk-nginx-config ${action} '$release_id'`)
      || !normalizedRun(gate.run).includes('set -Eeuo pipefail')) {
      failures.push(`deploy/validate-and-deploy telemetry ${label} must execute the transaction-bound fail-closed observer.`);
    }
  }
  assertUnconditional('deploy/validate-and-deploy browser verification', browserStep, failures);
  exactRun('deploy/validate-and-deploy browser verification', browserStep, 'npm run postdeploy:navigation:verify', failures);
  const uploadReleaseStep = step(validationJob, 'Upload immutable release', failures, 'deploy/validate-and-deploy');
  const activationStep = step(validationJob, 'Activate release', failures, 'deploy/validate-and-deploy');
  exact(
    'deploy/validate-and-deploy activation manifest input',
    activationStep.env?.EXPECTED_MANIFEST_SHA256,
    '${{ needs.build-release.outputs.manifest_sha256 }}',
    failures,
  );
  if (!normalizedRun(activationStep.run).includes(
    "/www/begapunk/bin/activate-release.sh '$release_id' '$EXPECTED_MANIFEST_SHA256'",
  )) {
    failures.push('deploy/validate-and-deploy activation must pass the audited manifest digest as the helper second argument.');
  }
  const publicBoundaryStep = step(validationJob, 'Verify public deployment boundary', failures, 'deploy/validate-and-deploy');
  const commitStep = step(validationJob, 'Commit deployment transaction', failures, 'deploy/validate-and-deploy');
  const rollbackStep = step(validationJob, 'Roll back an uncommitted deployment', failures, 'deploy/validate-and-deploy');
  const uploadRun = normalizedRun(uploadReleaseStep.run);
  if (!uploadRun.includes('previous_manifest_sha256="$(ssh "${ssh_args[@]}" "$target"')
    || !uploadRun.includes('"sha256sum -- /www/begapunk/releases/$previous_release_id/manifest.sha256" | awk \'{print $1}\')"')
    || !uploadRun.includes('echo "previous_manifest_sha256=$previous_manifest_sha256" >> "$GITHUB_ENV"')) {
    failures.push('deploy/validate-and-deploy upload must capture and persist the exact previous-release manifest digest for rollback.');
  }
  const rollbackRun = normalizedRun(rollbackStep.run);
  if (!rollbackRun.includes('"$previous_release_id" "$previous_manifest_sha256" "$release_id" "$nginx_candidate"')
    || !rollbackRun.includes('/www/begapunk/bin/activate-release.sh "$previous_release_id" "$previous_manifest_sha256"')) {
    failures.push('deploy/validate-and-deploy rollback must bind the previous release to its captured manifest digest.');
  }
  for (const [label, stepValue] of [
    ['activation', activationStep],
    ['public boundary', publicBoundaryStep],
    ['transaction commit', commitStep],
  ]) assertUnconditional(`deploy/validate-and-deploy ${label}`, stepValue, failures);
  exactRun('deploy/validate-and-deploy public boundary', publicBoundaryStep, `
mkdir -p dist/audit
expected_homepage_sha256="$(sha256sum dist/production/index.html | awk '{print $1}')"
expected_robots_sha256="$(sha256sum dist/production/robots.txt | awk '{print $1}')"
expected_sitemap_sha256="$(sha256sum dist/production/sitemap.xml | awk '{print $1}')"
expected_i18n_sitemap_sha256="$(sha256sum dist/production/sitemap-i18n.xml | awk '{print $1}')"
BEGAPUNK_EXPECTED_HOMEPAGE_SHA256="$expected_homepage_sha256" \\
BEGAPUNK_EXPECTED_ROBOTS_SHA256="$expected_robots_sha256" \\
BEGAPUNK_EXPECTED_SITEMAP_SHA256="$expected_sitemap_sha256" \\
BEGAPUNK_EXPECTED_I18N_SITEMAP_SHA256="$expected_i18n_sitemap_sha256" \\
  bash ops/verify-public-deployment.sh | tee dist/audit/public-boundary.log
`, failures);
  assertOrder(
    'deploy/validate-and-deploy production transaction',
    validationJob,
    [productionDownload, downloadedValidation, uploadReleaseStep, activationStep, publicBoundaryStep, browserStep, commitStep],
    failures,
  );
  const indexNowStep = step(validationJob, 'Notify IndexNow of changed URLs', failures, 'deploy/validate-and-deploy');
  exact('deploy/validate-and-deploy IndexNow failure policy', indexNowStep['continue-on-error'], true, failures);

  const lighthouseJob = job(deployWorkflow, 'lighthouse-performance', failures, 'deploy');
  exact('deploy/lighthouse-performance dependency', lighthouseJob.needs, 'build-release', failures);
  const lighthouseDownload = step(lighthouseJob, 'Download the audited production artifact', failures, 'deploy/lighthouse-performance');
  assertAction('deploy/lighthouse-performance artifact download', lighthouseDownload, 'actions/download-artifact', failures);
  exact('deploy/lighthouse-performance artifact name', lighthouseDownload.with?.name, expectedArtifactName, failures);
  exact('deploy/lighthouse-performance artifact path', lighthouseDownload.with?.path, 'dist/production', failures);

  return failures;
}
