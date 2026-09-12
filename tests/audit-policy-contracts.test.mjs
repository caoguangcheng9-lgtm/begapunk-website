import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  auditPolicySemanticSha256,
  TRUSTED_AUDIT_POLICY_SEMANTIC_SHA256,
  validateTrustedAuditPolicyContract,
  validateReleaseSearchContract,
} from '../scripts/lib/audit-policy-contracts.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const policy = JSON.parse(await readFile(
  path.join(repositoryRoot, 'audit', 'policy', 'release-audit-v2.json'),
  'utf8',
));
const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));

test('the unified release plan retains the read-only search gate', () => {
  assert.deepEqual(validateReleaseSearchContract(packageJson, policy), []);
});

test('release entry point rejects echo, alternate phases, bypasses and mutation', () => {
  for (const command of [
    'echo npm run search:verify',
    'node scripts/run-release-audit.mjs pr',
    'node scripts/run-release-audit.mjs release || exit 0',
    'node scripts/run-release-audit.mjs release && npm run search:sync',
    '',
  ]) {
    const fixture = structuredClone(packageJson);
    fixture.scripts['deploy:prepare'] = command;
    assert.ok(validateReleaseSearchContract(fixture, policy).length, command);
  }
});

test('search verification cannot be replaced with a writer or a no-op', () => {
  for (const command of ['node scripts/sync-search-index.mjs', 'echo search verified', 'node scripts/sync-search-index.mjs --check || exit 0']) {
    const fixture = structuredClone(packageJson);
    fixture.scripts['search:verify'] = command;
    assert.match(validateReleaseSearchContract(fixture, policy).join('\n'), /without mutating/);
  }
});

test('search gate cannot be removed, made platform-only, or replaced with sync', () => {
  for (const mode of ['remove', 'platform-only', 'sync', 'unused-set']) {
    const fixture = structuredClone(policy);
    fixture.gateSets.source = fixture.gateSets.source.filter((gate) => gate !== 'search:verify');
    if (mode === 'platform-only') fixture.gateSets.nonWindows.push('search:verify');
    if (mode === 'sync') fixture.gateSets.source.push('search:sync');
    if (mode === 'unused-set') fixture.gateSets.unused = ['search:verify'];
    const failures = validateReleaseSearchContract(packageJson, fixture).join('\n');
    assert.match(failures, /semantic contract changed/);
    assert.match(failures, /every supported platform/);
    if (mode === 'sync') assert.match(failures, /without mutating it via search:sync/);
  }
});

function changed(mutator) {
  const fixture = structuredClone(policy);
  mutator(fixture);
  return validateTrustedAuditPolicyContract(fixture);
}

test('current release audit policy matches the trusted semantic contract', () => {
  assert.equal(auditPolicySemanticSha256(policy), TRUSTED_AUDIT_POLICY_SEMANTIC_SHA256);
  assert.deepEqual(validateTrustedAuditPolicyContract(policy), []);
});

test('a gate cannot be removed from a phase gate set', () => {
  const failures = changed((fixture) => {
    fixture.gateSets.source = fixture.gateSets.source.filter((gate) => gate !== 'release:boundary:verify');
  });
  assert.match(failures.join('\n'), /semantic contract changed/);
});

test('the release browser matrix cannot be removed', () => {
  const failures = changed((fixture) => {
    fixture.phases.release.additionalGates = [];
  });
  assert.match(failures.join('\n'), /semantic contract changed/);
});

test('a P0 control cannot be downgraded or made non-blocking', () => {
  for (const mutate of [
    (control) => { control.severity = 'P2'; },
    (control) => { control.stages.release = 'WARN'; },
  ]) {
    const failures = changed((fixture) => {
      mutate(fixture.controls.find((control) => control.id === 'SEC-01'));
    });
    assert.match(failures.join('\n'), /semantic contract changed/);
  }
});

test('a manual control cannot promote itself to implemented', () => {
  const failures = changed((fixture) => {
    fixture.controls.find((control) => control.id === 'OBS-01').automationStatus = 'implemented';
  });
  assert.match(failures.join('\n'), /semantic contract changed/);
});

test('control evidence mappings cannot be silently replaced', () => {
  const failures = changed((fixture) => {
    fixture.controls.find((control) => control.id === 'DL-01').implementation = ['audit:policy:verify'];
  });
  assert.match(failures.join('\n'), /semantic contract changed/);
});

test('a candidate policy cannot bless a different workflow fingerprint', () => {
  const failures = changed((fixture) => {
    fixture.workflowContracts.deploy = '0'.repeat(64);
  });
  assert.match(failures.join('\n'), /semantic contract changed/);
});
