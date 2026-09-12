import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateReleaseSearchContract } from './lib/audit-policy-contracts.mjs';
import {
  parseWorkflow,
  validateAuditWorkflowContracts,
  workflowNpmScripts,
} from './lib/workflow-contracts.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const policyPath = path.join(repositoryRoot, 'audit', 'policy', 'release-audit-v2.json');
const packagePath = path.join(repositoryRoot, 'package.json');
const deployWorkflowPath = path.join(repositoryRoot, '.github', 'workflows', 'deploy.yml');
const prWorkflowPath = path.join(repositoryRoot, '.github', 'workflows', 'pr-quality.yml');
const [policy, packageJson, deployWorkflowSource, prWorkflowSource] = await Promise.all([
  readFile(policyPath, 'utf8').then(JSON.parse),
  readFile(packagePath, 'utf8').then(JSON.parse),
  readFile(deployWorkflowPath, 'utf8'),
  readFile(prWorkflowPath, 'utf8'),
]);

const failures = [];
failures.push(...validateReleaseSearchContract(packageJson, policy));
let deployWorkflow = { jobs: {} };
let prWorkflow = { jobs: {} };
try {
  deployWorkflow = parseWorkflow(deployWorkflowSource, 'deploy workflow');
  prWorkflow = parseWorkflow(prWorkflowSource, 'PR workflow');
} catch (error) {
  failures.push(error.message);
}
const requiredStages = ['pr', 'release', 'postdeploy-0-5m', 'postdeploy-24h', 'postdeploy-7d'];
const statusVocabulary = new Set(['PASS', 'FAIL', 'UNKNOWN']);
const bindingStatusVocabulary = new Set(['BOUND', 'INVALID', 'NOT_APPLICABLE']);
const severityVocabulary = new Set(['P0', 'P1', 'P2', 'P3']);
const actionVocabulary = new Set(['BLOCK', 'ROLLBACK', 'WARN', 'CONDITIONAL', 'NOT_APPLICABLE']);

function exactVocabulary(label, actual, expected) {
  if (!Array.isArray(actual)
    || actual.length !== expected.size
    || actual.some((value) => !expected.has(value))) {
    failures.push(`${label} must contain exactly: ${[...expected].join(', ')}`);
  }
}

exactVocabulary('statusVocabulary', policy.statusVocabulary, statusVocabulary);
exactVocabulary('bindingStatusVocabulary', policy.bindingStatusVocabulary, bindingStatusVocabulary);
exactVocabulary('severityVocabulary', policy.severityVocabulary, severityVocabulary);
exactVocabulary('actionVocabulary', policy.actionVocabulary, actionVocabulary);
if (policy.policyVersion !== 'BEGAPUNK_RELEASE_AUDIT_STANDARD_V2') failures.push('Unexpected policyVersion.');
if (policy.inquiryAuthorizationSemantics?.requiredControlResult !== 'UNKNOWN') {
  failures.push('Inquiry SMTP/delivery controls must remain UNKNOWN in the reference-binding artifact.');
}
if (!String(policy.inquiryAuthorizationSemantics?.gatePass || '').includes('not inspected')) {
  failures.push('Inquiry authorization gate semantics must state that referenced evidence is not inspected.');
}
for (const requiredPathClass of [
  'contact-form',
  'php-runtime',
  'phpmailer',
  'package-and-mail-contract',
  'htaccess',
  'nginx-routing',
  'production-build-deploy-activate-bootstrap',
  'unclassified-runtime-routing',
]) {
  if (!policy.inquiryAuthorizationSemantics?.failClosedPathClasses?.includes(requiredPathClass)) {
    failures.push(`Inquiry authorization semantics must fail closed for ${requiredPathClass}.`);
  }
}

const scripts = packageJson.scripts || {};
const flattenedGates = [];
for (const [gateSetName, gates] of Object.entries(policy.gateSets || {})) {
  if (!Array.isArray(gates) || !gates.length) {
    failures.push(`Gate set ${gateSetName} must be a non-empty array.`);
    continue;
  }
  for (const gate of gates) {
    flattenedGates.push(gate);
    if (!scripts[gate]) failures.push(`Gate set ${gateSetName} references missing npm script ${gate}.`);
  }
}

function referencedNpmScripts(command) {
  return [...String(command || '').matchAll(/\bnpm\s+run\s+([a-z0-9:_-]+)/giu)]
    .map((match) => match[1]);
}

const phaseRootGates = new Set();

for (const phaseName of ['pr', 'release']) {
  const phase = policy.phases?.[phaseName];
  if (!phase) {
    failures.push(`Missing phase ${phaseName}.`);
    continue;
  }
  const phaseGates = [];
  for (const gateSet of phase.gateSets || []) {
    if (!policy.gateSets?.[gateSet]) failures.push(`Phase ${phaseName} references missing gate set ${gateSet}.`);
    else phaseGates.push(...policy.gateSets[gateSet]);
  }
  for (const gate of phase.additionalGates || []) {
    phaseGates.push(gate);
    if (!scripts[gate]) failures.push(`Phase ${phaseName} references missing npm script ${gate}.`);
  }
  const duplicates = phaseGates.filter((gate, index) => phaseGates.indexOf(gate) !== index);
  if (duplicates.length) failures.push(`Phase ${phaseName} contains duplicate gates: ${[...new Set(duplicates)].join(', ')}.`);
  phaseGates.forEach((gate) => phaseRootGates.add(gate));
}

const workflowRootGates = new Set([
  ...workflowNpmScripts(deployWorkflow),
  ...workflowNpmScripts(prWorkflow),
]);
const reachableGates = new Set([...phaseRootGates, ...workflowRootGates]);
const pendingReachability = [...reachableGates];
while (pendingReachability.length) {
  const gate = pendingReachability.pop();
  for (const dependency of referencedNpmScripts(scripts[gate])) {
    if (!reachableGates.has(dependency)) {
      reachableGates.add(dependency);
      pendingReachability.push(dependency);
    }
  }
}

const controlIds = new Set();
const mappedGates = new Set();
for (const control of policy.controls || []) {
  if (!/^[A-Z]+-(?:[A-Z]+|\d{2})$/u.test(control.id)) failures.push(`Invalid control id: ${control.id}.`);
  if (controlIds.has(control.id)) failures.push(`Duplicate control id: ${control.id}.`);
  controlIds.add(control.id);
  if (!severityVocabulary.has(control.severity)) failures.push(`${control.id}: invalid severity ${control.severity}.`);
  if (!String(control.owner || '').trim()) failures.push(`${control.id}: owner is required.`);
  if (!['implemented', 'partial', 'manual'].includes(control.automationStatus)) {
    failures.push(`${control.id}: invalid automationStatus ${control.automationStatus}.`);
  }
  if (control.automationStatus === 'partial' && !String(control.remainingEvidence || '').trim()) {
    failures.push(`${control.id}: partial controls must state the remaining evidence boundary.`);
  }
  const implementation = control.implementation || [];
  if (implementation.length !== new Set(implementation).size) {
    failures.push(`${control.id}: implementation contains duplicate gate references.`);
  }
  for (const gate of implementation) {
    if (!scripts[gate]) failures.push(`${control.id}: implementation references missing npm script ${gate}.`);
    if (!reachableGates.has(gate)) failures.push(`${control.id}: implementation gate ${gate} is not reachable from a PR/release phase or workflow.`);
    mappedGates.add(gate);
  }
  if (!implementation.length && !String(control.requiredEvidence || '').trim()) {
    failures.push(`${control.id}: manual controls require an explicit evidence contract.`);
  }
  for (const stage of requiredStages) {
    if (!actionVocabulary.has(control.stages?.[stage])) {
      failures.push(`${control.id}: missing or invalid ${stage} action.`);
    }
  }
  const unexpectedStages = Object.keys(control.stages || {}).filter((stage) => !requiredStages.includes(stage));
  if (unexpectedStages.length) failures.push(`${control.id}: unexpected stages ${unexpectedStages.join(', ')}.`);
}


for (const gate of new Set(flattenedGates)) {
  if (!mappedGates.has(gate)) failures.push(`Configured gate ${gate} is not mapped to any control.`);
}

for (const requiredControl of ['GOV-01', 'AUD-01', 'WEB-01', 'WEB-02', 'SEO-01', 'NAV-01', 'DL-01', 'INQ-UI', 'INQ-ENDPOINT', 'INQ-SMTP', 'INQ-DELIVERY', 'SRV-01', 'SEC-01', 'PERF-01', 'DISC-01', 'OBS-01']) {
  if (!controlIds.has(requiredControl)) failures.push(`Missing required control ${requiredControl}.`);
}

if (scripts['quality:pr'] !== 'node scripts/run-release-audit.mjs pr') {
  failures.push('quality:pr must use the versioned PR audit orchestrator.');
}
if (scripts['audit:policy:verify'] !== 'node --test tests/audit-policy-contracts.test.mjs && node scripts/verify-audit-policy.mjs') {
  failures.push('audit:policy:verify must run policy downgrade fixtures before validating the live policy.');
}
if (scripts['deploy:prepare'] !== 'node scripts/run-release-audit.mjs release') {
  failures.push('deploy:prepare must use the versioned release audit orchestrator.');
}
if (scripts['editorial:release:verify'] !== 'node scripts/verify-editorial-release-status.mjs') {
  failures.push('editorial:release:verify must not inject or override the workflow-provided trusted baseline.');
}
if (scripts['release:authorization:verify'] !== 'node scripts/verify-release-authorization.mjs') {
  failures.push('release:authorization:verify must use the versioned commit-bound authorization verifier.');
}
if (scripts['release:authorization:self-test'] !== 'node --test tests/release-authorization.test.mjs') {
  failures.push('release authorization negative tests must remain enabled.');
}
if (scripts['audit:workflow-contracts:self-test'] !== 'node --test tests/workflow-contracts.test.mjs') {
  failures.push('workflow contract bypass tests must remain enabled.');
}
if (scripts['browser:interaction:self-test'] !== 'node --test tests/browser-interaction-gate.test.mjs') {
  failures.push('browser interaction disabled/overlay/pageerror negative tests must remain enabled.');
}
if (scripts['release:boundary:verify'] !== 'node --test tests/release-boundary.test.mjs') {
  failures.push('release and server exact-boundary negative tests must remain enabled.');
}
if (scripts['deploy:build'] !== 'node scripts/build-production-release.mjs') {
  failures.push('deploy:build must use the exact-inventory production release builder.');
}
if (scripts['deploy:validate'] !== 'node scripts/validate-deployment.mjs dist/production && npm run release:links:verify') {
  failures.push('deploy:validate must verify the canonical artifact and its complete internal-link/download surface.');
}
if (scripts['local-preview:release:verify'] !== 'node scripts/verify-local-file-home-navigation.mjs dist/production') {
  failures.push('The full local-file navigation matrix must remain in the release phase.');
}
if (scripts['release:navigation:verify'] !== 'node scripts/verify-localized-render-qa.mjs dist/production --report=dist/audit/release-navigation.json') {
  failures.push('The full HTTP/browser navigation matrix must remain in the release phase.');
}
if (packageJson.devDependencies?.yaml !== '2.9.0') {
  failures.push('The structural workflow parser must remain exactly pinned to yaml 2.9.0.');
}
if (scripts['postdeploy:navigation:verify'] !== 'node scripts/verify-localized-render-qa.mjs --base-url=https://www.begapunk.com --expected-root=dist/production --pages=index.html,products.html,BP-2P-95-0005.html,contact.html --report=dist/audit/postdeploy-navigation.json') {
  failures.push('Post-deployment browser verification must bind public HTML bytes to the audited production artifact.');
}
if (policy.workflowContracts?.semanticDigestAlgorithm !== 'sha256-canonical-json-v1') {
  failures.push('workflowContracts must use sha256-canonical-json-v1.');
}
failures.push(...validateAuditWorkflowContracts({
  deploySource: deployWorkflowSource,
  prSource: prWorkflowSource,
  expectedSemanticDigests: policy.workflowContracts,
}));

if (failures.length) {
  console.error(`Release audit policy verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Release audit policy verified: ${controlIds.size} controls, ${flattenedGates.length} configured gate references, and PR/release workflow contracts are aligned.`);
