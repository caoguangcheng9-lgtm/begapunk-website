import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phase = process.argv[2] || 'pr';
const policyPath = path.join(repositoryRoot, 'audit', 'policy', 'release-audit-v2.json');
const policy = JSON.parse(await readFile(policyPath, 'utf8'));
const supportedPhases = new Set(Object.keys(policy.phases || {}));

if (!supportedPhases.has(phase)) {
  throw new Error(`Unsupported audit phase ${JSON.stringify(phase)}. Expected one of: ${[...supportedPhases].join(', ')}.`);
}

function currentCommit() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout.trim() : 'UNKNOWN';
}

async function releaseManifestDigest() {
  try {
    const source = await readFile(path.join(repositoryRoot, 'dist', 'production', 'manifest.sha256'));
    return createHash('sha256').update(source).digest('hex');
  } catch {
    return null;
  }
}

// Windows cannot spawn a .cmd file directly without a shell. Execute npm's
// JavaScript entry point using this Node runtime, keeping gate arguments separate.
const npmCommand = process.platform === 'win32' ? process.execPath : 'npm';
const npmPrefix = process.platform === 'win32'
  ? [process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')]
  : [];
const phasePolicy = policy.phases[phase];
const skippedPlatformGateSets = new Set(process.platform === 'win32' ? ['nonWindows'] : []);
const phaseGates = [
  ...phasePolicy.gateSets.flatMap((gateSet) => policy.gateSets[gateSet]),
  ...phasePolicy.additionalGates,
];
const skippedPlatformGates = phasePolicy.gateSets
  .filter((gateSet) => skippedPlatformGateSets.has(gateSet))
  .flatMap((gateSet) => policy.gateSets[gateSet]);
const skippedPlatformGateNames = new Set(skippedPlatformGates);
const runnableGates = phaseGates.filter((gate) => !skippedPlatformGateNames.has(gate));
const startedAt = new Date();
const results = [];
let failedGate = null;
let unknownGate = null;

for (const gate of runnableGates) {
  const gateStartedAt = new Date();
  console.log(`\n=== Audit gate: ${gate} ===`);
  const result = spawnSync(npmCommand, [...npmPrefix, 'run', gate], {
    cwd: repositoryRoot,
    stdio: 'inherit',
    windowsHide: true,
  });
  const completedAt = new Date();
  const status = result.error || result.status === null
    ? 'UNKNOWN'
    : result.status === 0 ? 'PASS' : 'FAIL';
  results.push({
    gate,
    status,
    startedAt: gateStartedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - gateStartedAt.getTime(),
    exitCode: result.status,
    signal: result.signal || null,
    error: result.error?.message || null,
  });
  if (status === 'FAIL') {
    failedGate = gate;
    break;
  }
  if (status === 'UNKNOWN') {
    unknownGate = gate;
    break;
  }
}

const completedAt = new Date();
const manifestDigest = await releaseManifestDigest();
const commit = currentCommit();
const unknownChecks = skippedPlatformGates.map((gate) => ({
  gate,
  status: 'UNKNOWN',
  reason: 'This non-Windows gate runs in the canonical Ubuntu CI environment.',
}));
const unknownGateNames = new Set([
  ...unknownChecks.map(({ gate }) => gate),
  ...(unknownGate ? [unknownGate] : []),
]);
const overallStatus = failedGate ? 'FAIL' : (unknownGateNames.size ? 'UNKNOWN' : 'PASS');
const resultByGate = new Map(results.map((result) => [result.gate, result]));
const automatedControlResults = policy.controls.map((control) => {
  const expectedAutomationGates = (control.implementation || []).filter((gate) => phaseGates.includes(gate));
  const executedAutomationGates = expectedAutomationGates
    .map((gate) => resultByGate.get(gate))
    .filter(Boolean);
  const automatedStatus = executedAutomationGates.some((result) => result.status === 'FAIL')
    ? 'FAIL'
    : expectedAutomationGates.some((gate) => unknownGateNames.has(gate))
      ? 'UNKNOWN'
      : expectedAutomationGates.length > 0 && executedAutomationGates.length === expectedAutomationGates.length
      ? 'PASS'
      : 'UNKNOWN';
  return {
    controlId: control.id,
    phaseAction: control.stages?.[phase] || null,
    automatedStatus,
    expectedAutomationGates,
    executedAutomationGates: executedAutomationGates.map(({ gate, status }) => ({ gate, status })),
    evidenceBoundary: control.remainingEvidence || control.requiredEvidence || null,
  };
});
const releaseId = process.env.BEGAPUNK_RELEASE_ID?.trim() || null;
const editorialTrustedBaseCommit = /^[0-9a-f]{40}$/u.test(process.env.EDITORIAL_TRUSTED_BASE_REF?.trim() || '')
  ? process.env.EDITORIAL_TRUSTED_BASE_REF.trim()
  : null;
const tag = process.env.GITHUB_REF_TYPE === 'tag' ? (process.env.GITHUB_REF_NAME || null) : null;
const auditId = `${phase}-${commit.slice(0, 12)}-${startedAt.toISOString().replace(/[-:.]/gu, '')}`;
const report = {
  schemaVersion: 1,
  auditId,
  policyVersion: policy.policyVersion,
  policyPath: path.relative(repositoryRoot, policyPath).split(path.sep).join('/'),
  phase,
  stage: phase,
  result: overallStatus,
  status: overallStatus,
  commit,
  commitSha: commit,
  tag,
  releaseId,
  editorialTrustedBaseCommit,
  releaseManifestSha256: manifestDigest,
  environment: phase === 'release' ? 'release-candidate' : 'source-and-release-candidate',
  origin: null,
  platform: process.platform,
  architecture: process.arch,
  node: process.version,
  startedAt: startedAt.toISOString(),
  completedAt: completedAt.toISOString(),
  durationMs: completedAt.getTime() - startedAt.getTime(),
  failedGate,
  unknownGate,
  expectedGateCount: phaseGates.length,
  runnableGateCount: runnableGates.length,
  executedGateCount: results.length,
  gates: results,
  resultScope: 'automated-gates-only',
  releaseDecisionEligible: false,
  expected: { gateCount: phaseGates.length, runnableGateCount: runnableGates.length },
  actual: {
    executedGateCount: results.length,
    failedGate,
    unknownGate,
    unknownCheckCount: unknownChecks.length,
  },
  controlInventory: policy.controls.map((control) => ({
    id: control.id,
    severity: control.severity,
    owner: control.owner,
    phaseAction: control.stages?.[phase] || null,
    automationStatus: control.automationStatus,
    remainingEvidence: control.remainingEvidence || control.requiredEvidence || null,
  })),
  automatedControlResults,
  unknownChecks,
  evidenceBoundary: 'This report covers automated candidate gates only and cannot authorize a release. Unexecuted approvals, server/public checks, inbox delivery, and delayed search/observability evidence remain UNKNOWN or conditional as declared by policy.',
  tool: {
    command: `node scripts/run-release-audit.mjs ${phase}`,
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
  },
  wroteFiles: true,
  writtenArtifacts: [`dist/audit/${phase}-audit-report.json`],
  gateOutputBoundary: 'Selected gates may rebuild dist/production and write additional reports under dist/audit.',
};

const reportDirectory = path.join(repositoryRoot, 'dist', 'audit');
await mkdir(reportDirectory, { recursive: true });
const reportPath = path.join(reportDirectory, `${phase}-audit-report.json`);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`\nAudit evidence written to ${reportPath}`);

if (failedGate) {
  console.error(`Release audit failed at gate: ${failedGate}`);
  process.exit(1);
}

if (unknownGate) {
  console.error(`Release audit could not establish a result at gate: ${unknownGate}`);
  process.exit(1);
}

if (overallStatus === 'UNKNOWN') {
  console.warn(`Local ${phase} audit completed ${results.length} gate(s); Bash verifier evidence remains UNKNOWN until canonical Ubuntu CI runs.`);
} else {
  console.log(`Automated ${phase} candidate gates passed: ${results.length}. This scoped report is not a standalone release authorization.`);
}
