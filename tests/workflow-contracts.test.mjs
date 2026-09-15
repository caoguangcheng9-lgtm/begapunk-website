import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  parseWorkflow,
  TRUSTED_WORKFLOW_SEMANTIC_DIGESTS,
  validateAuditWorkflowContracts,
  workflowSemanticSha256,
} from '../scripts/lib/workflow-contracts.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const [deploySource, prSource] = await Promise.all([
  readFile(path.join(repositoryRoot, '.github', 'workflows', 'deploy.yml'), 'utf8'),
  readFile(path.join(repositoryRoot, '.github', 'workflows', 'pr-quality.yml'), 'utf8'),
]);
const expectedSemanticDigests = {
  ...TRUSTED_WORKFLOW_SEMANTIC_DIGESTS,
};

test('production telemetry parser positive, negative and bypass fixtures', () => {
  const result = spawnSync('python', ['-B', 'tests/production-telemetry.test.py'], { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
});

test('telemetry provisioning scripts have valid Bash and reject invalid arguments on Linux', { skip: process.platform === 'win32' }, () => {
  for (const file of ['ops/install-production-telemetry.sh', 'ops/install-nginx-managed-redirects.sh']) {
    const syntax = spawnSync('bash', ['-n', file], { cwd: repositoryRoot, encoding: 'utf8' });
    assert.equal(syntax.status, 0, syntax.stderr);
  }
  const invalid = spawnSync('bash', ['ops/install-production-telemetry.sh', '--apply', '../bad', 'bad'], { cwd: repositoryRoot, encoding: 'utf8' });
  assert.equal(invalid.status, 2, invalid.stderr);
});

test('telemetry cannot be omitted or made non-blocking before commit', () => {
  for (const replacement of [
    '      - name: Verify production telemetry before commit\n        if: ${{ false }}',
    '      - name: Verify production telemetry before commit\n        continue-on-error: true',
  ]) {
    const changed = deploySource.replace('      - name: Verify production telemetry before commit', replacement);
    assert.ok(validateContracts({ deploySource: changed, prSource }).length);
  }
  const changed = deploySource.replace('telemetry-check', 'version');
  assert.ok(validateContracts({ deploySource: changed, prSource }).length);
});

test('telemetry cannot move behind transaction commit', () => {
  const begin = deploySource.indexOf('      - name: Verify production telemetry before commit');
  const end = deploySource.indexOf('      - name: Commit deployment transaction', begin);
  assert.ok(begin > 0 && end > begin);
  const block = deploySource.slice(begin, end);
  const changed = deploySource.replace(block, '').replace('      - name: Roll back an uncommitted deployment', block + '      - name: Roll back an uncommitted deployment');
  assert.match(validateContracts({ deploySource: changed, prSource }).join('\n'), /step names and order must match/);
});

test('telemetry checkpoint creates evidence on a clean runner and preserves failure propagation', { skip: process.platform === 'win32' }, async () => {
  const workflow = parseWorkflow(deploySource);
  const run = workflow.jobs['validate-and-deploy'].steps.find(entry => entry.name === 'Checkpoint production telemetry').run;
  const mockCommands = `
sha256sum() { printf 'fixture-digest  observer.py\\n'; }
ssh() {
  case "$*" in
    *telemetry-version*) printf 'fixture-digest\\n' ;;
    *telemetry-start*) printf '{"result":"PASS","stage":"checkpoint"}\\n'; return "$FIXTURE_OBSERVER_EXIT" ;;
    *) return 99 ;;
  esac
}
`;
  for (const variant of ['clean', 'missing-directory', 'observer-failure']) {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'begapunk-checkpoint-'));
    try {
      const script = variant === 'missing-directory' ? run.replace('mkdir -p dist/audit', ':') : run;
      const result = spawnSync('bash', ['-c', mockCommands + script], {
        cwd: directory, encoding: 'utf8', timeout: 10000,
        env: { ...process.env, DEPLOY_USER: 'fixture', DEPLOY_HOST: 'invalid', release_id: 'fixture-release', FIXTURE_OBSERVER_EXIT: variant === 'observer-failure' ? '7' : '0' },
      });
      assert.equal(result.error, undefined);
      if (variant === 'clean') {
        assert.equal(result.status, 0, result.stderr);
        assert.equal(JSON.parse(await readFile(path.join(directory, 'dist/audit/production-telemetry-start.json'), 'utf8')).result, 'PASS');
      } else {
        assert.notEqual(result.status, 0, `${variant} must fail closed`);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
});

function validateContracts(input) {
  return validateAuditWorkflowContracts({ ...input, expectedSemanticDigests });
}

test('current workflows satisfy structural audit contracts', () => {
  assert.deepEqual(validateContracts({ deploySource, prSource }), []);
});

test('echoing a production browser command cannot impersonate the gate', () => {
  const spoofed = deploySource.replace(
    'run: npm run postdeploy:navigation:verify',
    "run: echo 'npm run postdeploy:navigation:verify'",
  );
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /browser verification run/);
});

test('a comment cannot impersonate the PR audit gate', () => {
  const spoofed = prSource.replace(
    'run: npm run quality:pr',
    "run: |\n          # npm run quality:pr\n          echo skipped",
  );
  const failures = validateContracts({ deploySource, prSource: spoofed });
  assert.match(failures.join('\n'), /quality gate run/);
});

test('unpinned third-party actions are rejected structurally', () => {
  const spoofed = deploySource.replace(
    /actions\/download-artifact@[0-9a-f]{40}/u,
    'actions/download-artifact@v4',
  );
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /full lowercase commit SHA/);
});

test('a disabled critical step is rejected', () => {
  const spoofed = deploySource.replace(
    'run: npm run release:authorization:verify',
    'if: ${{ false }}\n        run: npm run release:authorization:verify',
  );
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /authorization must not have an if condition/);
});

test('authorization cannot be moved after artifact upload', () => {
  const authorizationBlock = `      - name: Bind protected release authorization and inquiry evidence
        env:
          RELEASE_APPROVED_SHA: \${{ vars.RELEASE_APPROVED_SHA }}
          RELEASE_AUTHORIZATION_REF: \${{ vars.RELEASE_AUTHORIZATION_REF }}
          INQUIRY_DELIVERY_APPLICABILITY: \${{ vars.INQUIRY_DELIVERY_APPLICABILITY }}
          INQUIRY_DELIVERY_APPROVED_SHA: \${{ vars.INQUIRY_DELIVERY_APPROVED_SHA }}
          INQUIRY_DELIVERY_EVIDENCE_REF: \${{ vars.INQUIRY_DELIVERY_EVIDENCE_REF }}
        run: npm run release:authorization:verify

`;
  assert.ok(deploySource.includes(authorizationBlock));
  const withoutAuthorization = deploySource.replace(authorizationBlock, '');
  const insertionPoint = '      - name: Upload release audit evidence\n';
  const spoofed = withoutAuthorization.replace(insertionPoint, `${authorizationBlock}${insertionPoint}`);
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /fail-closed order/);
});

test('an extra production job cannot bypass the audited graph', () => {
  const spoofed = `${deploySource}\n  rogue-production:\n    runs-on: ubuntu-24.04\n    environment: production\n    steps:\n      - name: Rogue deploy\n        run: echo bypass\n`;
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /job inventory must be exactly/);
  assert.match(failures.join('\n'), /only build-release and validate-and-deploy may consume/);
});

test('expression-valued continue-on-error cannot swallow authorization failure', () => {
  const spoofed = deploySource.replace(
    'run: npm run release:authorization:verify',
    'continue-on-error: ${{ true }}\n        run: npm run release:authorization:verify',
  );
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /not an audited conditional exception|must not continue on error/);
});

test('an extra step inside an audited job is rejected', () => {
  const spoofed = deploySource.replace(
    '      - name: Record canonical release manifest digest',
    '      - name: Hidden bypass\n        run: echo bypass\n\n      - name: Record canonical release manifest digest',
  );
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /step names and order must match/);
});

test('current workflow fingerprints match the versioned code allowlist', () => {
  assert.equal(workflowSemanticSha256(parseWorkflow(deploySource)), expectedSemanticDigests.deploy);
  assert.equal(workflowSemanticSha256(parseWorkflow(prSource)), expectedSemanticDigests.prQuality);
});

test('an appended command inside an allowed deployment step is rejected', () => {
  const spoofed = deploySource.replace(
    /^(\s*rsync -az --delete[^\n]+)$/mu,
    '$1\n          printf malicious > dist/production/shell.php\n          (cd dist/production && sha256sum shell.php >> manifest.sha256)',
  );
  assert.notEqual(spoofed, deploySource);
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /semantic digest changed/);
});

test('activation cannot omit the build-bound manifest digest', () => {
  const spoofed = deploySource.replace(
    "activate-release.sh '$release_id' '$EXPECTED_MANIFEST_SHA256'",
    "activate-release.sh '$release_id'",
  );
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /semantic digest changed|helper second argument/);
});

test('rollback cannot omit the captured previous-release manifest digest', () => {
  const spoofed = deploySource.replace(
    'activate-release.sh "$previous_release_id" "$previous_manifest_sha256"',
    'activate-release.sh "$previous_release_id"',
  );
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /semantic digest changed|rollback must bind/);
});

test('a custom shell cannot swallow an authorization failure', () => {
  const spoofed = deploySource.replace(
    '        run: npm run release:authorization:verify',
    '        shell: bash {0} || true\n        run: npm run release:authorization:verify',
  );
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /semantic digest changed/);
});

test('workflow defaults cannot change every run step while preserving its text', () => {
  const spoofed = deploySource.replace(
    'concurrency:\n',
    'defaults:\n  run:\n    shell: bash {0} || true\n\nconcurrency:\n',
  );
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /semantic digest changed/);
});

test('job permissions cannot override the read-only workflow token', () => {
  const spoofed = deploySource.replace(
    '    runs-on: ubuntu-24.04\n    environment: production',
    '    runs-on: ubuntu-24.04\n    permissions:\n      contents: write\n    environment: production',
  );
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /semantic digest changed/);
});

test('a step-level BASH_ENV injection cannot preserve an approved command contract', () => {
  const spoofed = deploySource.replace(
    '          RELEASE_APPROVED_SHA: ${{ vars.RELEASE_APPROVED_SHA }}',
    '          BASH_ENV: /tmp/swallow-failures\n          RELEASE_APPROVED_SHA: ${{ vars.RELEASE_APPROVED_SHA }}',
  );
  assert.notEqual(spoofed, deploySource);
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /semantic digest changed/);
});

test('job-level environment injection cannot alter every audited step', () => {
  const spoofed = deploySource.replace(
    '    runs-on: ubuntu-24.04\n    environment: production',
    '    runs-on: ubuntu-24.04\n    env:\n      BASH_ENV: /tmp/swallow-failures\n    environment: production',
  );
  assert.notEqual(spoofed, deploySource);
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /semantic digest changed/);
});

test('a container cannot replace the audited runner boundary', () => {
  const spoofed = deploySource.replace(
    '    runs-on: ubuntu-24.04\n    environment: production',
    '    runs-on: ubuntu-24.04\n    container: attacker.example/bypass:latest\n    environment: production',
  );
  assert.notEqual(spoofed, deploySource);
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /semantic digest changed/);
});

test('a runner label change cannot move deployment onto an unaudited host', () => {
  const spoofed = deploySource.replace(
    '    runs-on: ubuntu-24.04\n    environment: production',
    '    runs-on: self-hosted\n    environment: production',
  );
  assert.notEqual(spoofed, deploySource);
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /semantic digest changed/);
});

test('an extra action input cannot change an otherwise pinned action', () => {
  const spoofed = deploySource.replace(
    '          include-hidden-files: true\n          retention-days: 90',
    '          include-hidden-files: true\n          overwrite: true\n          retention-days: 90',
  );
  assert.notEqual(spoofed, deploySource);
  const failures = validateContracts({ deploySource: spoofed, prSource });
  assert.match(failures.join('\n'), /semantic digest changed/);
});
