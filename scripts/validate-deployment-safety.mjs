import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Required deployment safety file is missing: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function requireMatch(content, pattern, message) {
  if (!pattern.test(content)) throw new Error(message);
}

function requireOrder(content, first, second, message) {
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) {
    throw new Error(message);
  }
}

const deployPowerShell = read('deploy.ps1');
const syncPowerShell = read('sync-production-main.ps1');
const workflow = read('.github/workflows/deploy.yml');
const activate = read('ops/activate-release.sh');
const verifyCurrent = read('ops/verify-current-release.sh');
read('tests/test-deployment-rollback.sh');
read('docs/OFFLINE_RECOVERY_AND_DEPLOYMENT.md');

requireMatch(deployPowerShell, /\[string\]\$ExpectedCommit/, 'deploy.ps1 must accept an exact reviewed commit.');
requireMatch(deployPowerShell, /Local main is not synchronized with origin\/main/, 'deploy.ps1 must fail when local main differs from origin/main.');
requireMatch(deployPowerShell, /A real deployment requires -ExpectedCommit/, 'deploy.ps1 must require explicit commit-bound deployment authorization.');
requireMatch(deployPowerShell, /gh run watch/, 'deploy.ps1 must wait for the exact GitHub Actions run.');
requireMatch(deployPowerShell, /BP-2P-50-0001\.html/, 'deploy.ps1 must include a representative product live check.');
requireMatch(deployPowerShell, /js\/vendor\/fuse\.min\.js/, 'deploy.ps1 must verify the local Fuse.js asset after deployment.');
if (/git\s+push\s+origin\s+main/i.test(deployPowerShell)) {
  throw new Error('deploy.ps1 must never push local main.');
}

requireMatch(syncPowerShell, /git merge --ff-only refs\/remotes\/origin\/main/, 'The production synchronization script must use fast-forward-only synchronization.');
requireMatch(syncPowerShell, /git bundle create/, 'The production synchronization script must create a complete Git bundle.');
requireMatch(syncPowerShell, /CreateFromDirectory/, 'The production synchronization script must create a release archive.');
requireMatch(syncPowerShell, /deployment_performed = \$false/, 'The offline backup manifest must state that no deployment occurred.');

requireOrder(
  workflow,
  'Verify rollback baseline and prepare IndexNow URLs',
  'Upload immutable release',
  'The workflow must verify the rollback baseline before uploading a release.',
);
requireMatch(workflow, /< ops\/verify-current-release\.sh/, 'The workflow must run the repository-controlled rollback verifier on the server.');
requireMatch(workflow, /ops\/verify-current-release\.sh/, 'The workflow must install the rollback verifier with deployment operations.');
requireMatch(workflow, /previous_release_id=\$active_release/, 'The workflow must record the verified previous release.');
requireMatch(workflow, /active_after/, 'The workflow must verify the activated release id.');

requireMatch(verifyCurrent, /"\$RELEASES_DIR"\/\*/, 'The rollback verifier must constrain current to the managed release directory.');
requireMatch(verifyCurrent, /sha256sum -c manifest\.sha256/, 'The rollback verifier must validate the active release manifest.');
requireMatch(verifyCurrent, /! -L "\$CURRENT_LINK"/, 'The rollback verifier must require current to be a symbolic link.');

requireMatch(activate, /previous_release_id="\$\(\$VERIFY_CURRENT_SCRIPT\)"/, 'Release activation must obtain a verified rollback release before switching.');
requireOrder(
  activate,
  'previous_release_id="$($VERIFY_CURRENT_SCRIPT)"',
  'mv -Tf "$next_link" "$CURRENT_LINK"',
  'Rollback verification must occur before the current release switch.',
);
requireMatch(activate, /restored_target/, 'Release activation must verify rollback link restoration after a failed health check.');
if (/rm -f "\$CURRENT_LINK"/.test(activate)) {
  throw new Error('Release activation must not remove current when rollback evidence is unavailable.');
}

console.log('Deployment safety validation passed: offline sync, exact-commit gate, workflow preflight, and rollback preservation are enforced.');
