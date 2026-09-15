import { createHash } from 'node:crypto';

// This digest pins the complete parsed policy semantics: gate inventories,
// phase composition, control severities, automation claims, release actions,
// evidence boundaries and workflow fingerprints. Updating it is a governed
// policy change, never a mechanical response to a failing test.
export const TRUSTED_AUDIT_POLICY_SEMANTIC_SHA256 =
  'eb01c667c8f3f284fa35b5c76e8165d0d8972eca52576e58fa96ceaa28ce527f';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

export function auditPolicySemanticSha256(policy) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(policy)))
    .digest('hex');
}

export function validateTrustedAuditPolicyContract(policy) {
  const actual = auditPolicySemanticSha256(policy);
  return actual === TRUSTED_AUDIT_POLICY_SEMANTIC_SHA256
    ? []
    : [`Release audit policy semantic contract changed (expected ${TRUSTED_AUDIT_POLICY_SEMANTIC_SHA256}, actual ${actual}). Review the complete policy diff and its negative tests before deliberately updating the trusted contract.`];
}

// Validate the actual release plan, not the presence of command text in a
// shell string. The pinned policy also prevents moving the check into an
// unused or platform-skipped gate set.
export function validateReleaseSearchContract(packageJson, policy) {
  const failures = validateTrustedAuditPolicyContract(policy);
  const scripts = packageJson?.scripts || {};
  if (scripts['deploy:prepare'] !== 'node scripts/run-release-audit.mjs release') {
    failures.push('package.json: deploy:prepare must use the versioned release audit orchestrator.');
  }
  if (scripts['search:verify'] !== 'node scripts/sync-search-index.mjs --check') {
    failures.push('package.json: search:verify must check search data without mutating it.');
  }
  const phase = policy?.phases?.release;
  const gateSets = Array.isArray(phase?.gateSets) ? phase.gateSets : [];
  const gates = gateSets.filter((name) => name !== 'nonWindows')
    .flatMap((name) => Array.isArray(policy?.gateSets?.[name]) ? policy.gateSets[name] : []);
  if (Array.isArray(phase?.additionalGates)) gates.push(...phase.additionalGates);
  if (!gates.includes('search:verify')) {
    failures.push('Release audit: search:verify must run on every supported platform.');
  }
  if (gates.includes('search:sync')) {
    failures.push('Release audit: search data must be verified without mutating it via search:sync.');
  }
  return failures;
}
