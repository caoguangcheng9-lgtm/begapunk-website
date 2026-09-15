# Begapunk Automated Deployment

> Status: operational implementation guide. It does not authorize commit, push, deployment, or server changes. Current project decisions and release severity come from docs/standards/README.md and docs/standards/BEGAPUNK_WEBSITE_STANDARD.md. Any statement about live server state is a dated observation and must be verified before use.

## Outcome

The production workflow is designed around an immutable release directory and an atomic `current` symlink:

```text
Git commit and deploy tag
        -> GitHub Actions builds and audits one immutable artifact
        -> Lighthouse reuses that exact artifact
        -> rsync the same artifact to /www/begapunk/releases/<release-id>
        -> verify its exact manifest and public-byte identity
        -> stage and locally verify root-owned Nginx policy
        -> switch /www/begapunk/current
        -> verify public redirects, 404, headers and sensitive paths
        -> commit the Nginx/release transaction
        -> automatic Nginx + release rollback attempt on a runner-visible pre-commit failure or normal cancellation
```

As verified on 2026-09-04, production already uses `/www/begapunk/current` and has `/www/begapunk/.bootstrap-complete`; `rsync` and the external shared `.env` are present. The v3 privileged helper and matching `.hardening-complete` marker are required before the next automated release, so use the hardening upgrade—not bootstrap—when `--check` reports an older contract. Treat this as a dated observation and re-run `--check` before acting.

## Files in this deployment system

- `.github/workflows/deploy.yml`: GitHub Actions validation and deployment entry point.
- `deploy.ps1`: Windows one-command release trigger.
- `scripts/build-production-release.mjs`: creates a production-only release tree.
- `scripts/validate-deployment.mjs`: validates HTML, JavaScript, JSON-LD, local resources, sitemaps, robots and required files.
- `scripts/run-release-audit.mjs`: runs the versioned PR/release gate set and writes machine-readable evidence to `dist/audit/`.
- `audit/policy/release-audit-v2.json`: maps stable control IDs to their PR and release implementation gates.
- `audit/policy/release-html-inventory.json`: declares every allowed canonical, noindex/error and compatibility-redirect HTML class.
- `audit/policy/public-directory-inventory.json`: declares every non-HTML file allowed inside recursively copied public directories; a new image, script, font, video, locale discovery file or PHPMailer file must be deliberately added here or the build fails.
- `ops/bootstrap-server.sh`: one-time server migration from the current document root to releases/current layout.
- `ops/upgrade-deployment-hardening.sh`: one-time, non-rebootstrap upgrade for a server that already has the atomic release layout.
- `ops/activate-release.sh`: verifies, activates, checks, rolls back and prunes releases.
- `ops/install-nginx-managed-redirects.sh`: root-owned, allowlisted Nginx policy transaction helper; its installed copy is never writable by the deployment account.
- `ops/nginx-managed-redirects.conf`: location-free server policy for canonical redirects, sensitive-path denial, the branded 404, headers, cache revalidation and request size.
- `ops/verify-public-deployment.sh`: read-only post-activation gate for the public deployment boundary.

`catalog-project/`, audit material, source translation dictionaries, Git metadata, local logs, `.env` files and private keys are excluded from production releases.

## GitHub Secrets

Create a GitHub Environment named `production`, then add these Environment secrets:

| Secret | Purpose |
| --- | --- |
| `DEPLOY_HOST` | Server hostname or IP address. |
| `DEPLOY_PORT` | SSH port, normally `22`. |
| `DEPLOY_USER` | Restricted deployment account, currently planned as `codexdeploy`. |
| `DEPLOY_SSH_KEY` | Dedicated private deployment key. Never commit it. |
| `DEPLOY_KNOWN_HOSTS` | Verified SSH host-key line for the production server. |
| `INDEXNOW_KEY` | Random 8-128 character IndexNow ownership key. The workflow creates the required public key file inside each immutable release; never commit the key itself. |

Also create these **Environment variables** (not secrets) in the protected `production` environment. They are external inputs: a candidate branch must not be able to approve itself.

| Variable | Purpose |
| --- | --- |
| `EDITORIAL_TRUSTED_BASE_SHA` | Full 40-character commit SHA of the last approved release that is currently active on the server. It is the external trust root for localized editorial evidence. |
| `RELEASE_APPROVED_SHA` | Full 40-character candidate SHA approved for this release. It must exactly equal `GITHUB_SHA`. |
| `RELEASE_AUTHORIZATION_REF` | An 8-128 character immutable ticket/evidence reference for the completed release checklist. Start from [`.github/RELEASE_APPROVAL_TEMPLATE.md`](.github/RELEASE_APPROVAL_TEMPLATE.md); do not put credentials or personal data in it. |
| `INQUIRY_DELIVERY_APPLICABILITY` | Explicitly `required` or `not-applicable`. Changes to Contact forms, PHP/PHPMailer, `.env.example`, package manifests/lockfiles, `.htaccess`, Nginx/runtime routing, production build/deploy/activate/bootstrap paths, or an otherwise unclassified runtime/router path force `required`. |
| `INQUIRY_DELIVERY_APPROVED_SHA` | Candidate SHA to which the external SMTP/provider and destination-inbox review record is bound; required only when applicability is `required`. |
| `INQUIRY_DELIVERY_EVIDENCE_REF` | Immutable reference to the separately retained controlled-submission, provider-acceptance and destination-inbox record; required only when applicability is `required`. The workflow validates this reference's syntax and SHA binding, not its contents. |

The workflow fails closed if the editorial baseline is missing, equals the candidate commit, is not an ancestor, or does not match `/www/begapunk/current`; it also stops if the approval/evidence values are missing, stale, malformed, or contradict the changed-path applicability check. Deletions and renames are evaluated as separate paths, and unclassified runtime/routing changes are treated as inquiry-affecting. The authorization artifact's `PASS` means only that the protected candidate and reference bindings are valid. `INQ-SMTP` and `INQ-DELIVERY` remain `UNKNOWN` inside that artifact because the script does not inspect the external record. The authorization reference is an index, not proof by itself: its external record must contain the named reviewers, PASS/FAIL/UNKNOWN decisions, evidence locations and scope. Do not derive protected values from the candidate branch, `HEAD`, or the deploy tag inside the workflow.

After a release has passed all production checks and has been accepted as the new approved baseline, update `EDITORIAL_TRUSTED_BASE_SHA` to that release's full commit SHA before the next release. Do not promote it before success; a failure or rollback keeps the old value. Clear or replace the per-candidate approval and inquiry evidence variables after the run so they cannot be mistaken for current authorization.

Do not reuse a personal SSH key. Generate a dedicated Ed25519 key without placing its private half on the server:

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\begapunk_github_actions" -C "begapunk-github-actions"
```

Create the IndexNow secret without printing it to the terminal or writing it to the repository:

```powershell
$bytes = New-Object byte[] 16
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$indexNowKey = -join ($bytes | ForEach-Object { $_.ToString('x2') })
$indexNowKey | & 'C:\Program Files\GitHub CLI\gh.exe' secret set INDEXNOW_KEY --repo caoguangcheng9-lgtm/begapunk-website
Remove-Variable indexNowKey
```

The canonical deployment build runs inside the protected `production` environment and writes `${INDEXNOW_KEY}.txt` into the release root **before** creating `manifest.sha256`; Lighthouse, upload, deployment and public verification all reuse those exact bytes. The workflow sends only URLs changed since the server's currently active immutable release. It deliberately reads the active `current` target instead of trusting the preceding `deploy-*` tag, because a failed workflow can leave a tag without activating that release. IndexNow acknowledges discovery requests but does not guarantee crawling, indexing, or ranking.

Append only the `.pub` content to `/home/codexdeploy/.ssh/authorized_keys`. Copy the private-key content into `DEPLOY_SSH_KEY`, then delete or securely archive the local private copy after GitHub has been configured.

Obtain the server host key with `ssh-keyscan`, but verify its fingerprint against the Alibaba Cloud console or an already trusted SSH connection before saving it as `DEPLOY_KNOWN_HOSTS`. Blindly trusting a fresh scan defeats host verification.

## Server directories

### Production telemetry gate (2026-09-15)

Before deploying this workflow, a server owner must install the reviewed
`ops/production-telemetry.py` at
`/usr/local/libexec/begapunk-production-telemetry.py` as a root-owned regular file
with mode 0644, and update the existing root-owned Nginx helper from
`ops/install-nginx-managed-redirects.sh` (0755). Back up both installed files first,
verify their reviewed SHA-256 digests, and hold the existing maintenance lock.
Do not grant the deployment user access to raw logs or change sudoers.
Use the owner-only `ops/install-production-telemetry.sh --check` and then
`--apply`, supplying the reviewed helper and observer SHA-256 as the second
and third arguments. Stage all three files in a root-controlled directory.
The installer refuses pending deployment transactions, holds the maintenance
and helper locks, replaces the files atomically and retains a rollback backup.
The existing hardening/bootstrap commands do not install the observer; this is
an explicit additional provisioning step. The old v3 policy actions are unchanged.

After Nginx staging and before activation, `telemetry-start <release-id>` records
root-owned byte offsets for the fixed site access, Nginx error and PHP-FPM logs.
After public and browser checks and before commit, `telemetry-check <release-id>`
reads only appended data. It verifies the active release and checkpoint age,
requires parseable access evidence, and blocks on 5xx, known-public-path 404s,
PHP diagnostics or non-allowlisted Nginx errors. Ordinary missing-file scanner
errors are counted, not silently discarded. Missing/unreadable/replaced/rotated
logs, partial records, invalid UTF-8, stale checkpoints or deltas over 16 MiB
are UNKNOWN and fail closed, using the existing uncommitted-transaction rollback.
The workflow verifies the installed observer's digest against the candidate file
and retains only aggregate JSON. Neither raw requests nor customer data are emitted.

This is an immediate post-activation log check, not proof of 24-hour stability,
field latency or inbox delivery. System and latency observations remain separate.
The two new workflow steps and their order are enforced by the structural workflow
contract; parser fixtures run through the existing audit workflow self-test gate.

After the one-time bootstrap:

```text
/www/begapunk/
  current -> /www/begapunk/releases/<active-release>
  releases/
  shared/
    .env                         # outside the public `current` tree
    .well-known/
    WW_verify_*.txt
    nginx-managed-policy.conf    # root-owned Nginx include
    nginx-transactions/          # root-only rollback record
  maintenance.lock              # root-owned, deployment-group-writable orchestration lock
  staging/                       # deployment-owned policy candidates
  bin/
    activate-release.sh
  deployments.log

/usr/local/sbin/
  begapunk-nginx-config          # root-owned privileged helper

/etc/sudoers.d/
  begapunk-nginx-config          # one-command least-privilege sudo rule
```

Nginx will use:

```nginx
root /www/begapunk/current;
```

The original `/www/wwwroot/47.252.73.192` directory remains unchanged as the first rollback source. The production `.env` is copied to `/www/begapunk/shared/.env` with `root:www` ownership and mode `0640`; it is never uploaded from GitHub and is no longer linked into a new public release. `send_inquiry.php` reads that external path directly. A PHP built-in development server may still use the repository `.env`; production PHP never falls back to the web root.

## First-time server setup

Use this section only for a genuinely uninitialized server with no `.bootstrap-complete` marker. The currently observed production server is already initialized and must follow the upgrade path below.

1. Upload these three files together to a root-controlled temporary directory. Do not place the privileged helper in `/www/begapunk/bin`, because that directory is intentionally writable by the deployment account:

   ```text
   ops/bootstrap-server.sh
   ops/install-nginx-managed-redirects.sh
   ops/nginx-managed-redirects.conf
   ```

2. Run the read-only check first:

   ```bash
   sudo bash bootstrap-server.sh --check
   ```

3. Review the displayed live root, Nginx configuration and deployment user.
4. Apply the migration once:

   ```bash
   sudo bash bootstrap-server.sh --apply
   ```

The apply step installs rsync if missing, copies the existing live site into an initial versioned release, moves the active SMTP configuration outside the public root, installs the privileged helper as `/usr/local/sbin/begapunk-nginx-config`, installs the managed policy, changes the Nginx root, validates Nginx and performs local HTTPS checks. If configuration or health validation fails, the previous Nginx configuration is restored.

Bootstrap also creates `/etc/sudoers.d/begapunk-nginx-config` with this single command allowance:

```sudoers
codexdeploy ALL=(root) NOPASSWD: /usr/local/sbin/begapunk-nginx-config
```

Keep this narrow rule: daily deployment needs it to stage, commit or roll back the root-owned Nginx policy. Remove any older unrestricted rule such as `/etc/sudoers.d/codexdeploy`, but do **not** remove `begapunk-nginx-config`. Before changing Nginx, the installed helper validates the action, transaction identifier, fixed candidate path, exact allowlisted directives and `.env` ownership/mode. It then validates the expanded Nginx configuration, reload and local public behavior against a root-only rollback record; any failed staged check restores the prior configuration. Caller-provided environment variables cannot change its production paths.

Before the first automated release, verify the effective PHP-FPM configuration used by this site—not merely the CLI PHP configuration. These are minimum capacities, not values that must be forced globally:

```ini
upload_max_filesize >= 10M
post_max_size >= 12M
```

The observed PHP-FPM values of `50M/50M` are acceptable: application validation limits an attachment to 10 MiB and Nginx limits the complete request body to 12 MiB. Do not lower a shared global PHP configuration without checking whether other sites use it. The SMTP provider must also accept at least approximately 14 MiB messages because MIME/base64 encoding increases attachment size. If it does not, reduce the public attachment limit instead of advertising a flow the mail provider cannot deliver.

If `/www/begapunk/.bootstrap-complete` already exists, do not rerun bootstrap. Copy these four current files into a root-owned directory that is not writable by `codexdeploy`, then use the repeatable hardening upgrade instead:

```text
ops/upgrade-deployment-hardening.sh
ops/install-nginx-managed-redirects.sh
ops/nginx-managed-redirects.conf
ops/verify-public-deployment.sh
```

```bash
sudo bash upgrade-deployment-hardening.sh --check
sudo bash upgrade-deployment-hardening.sh --apply
```

`--check` is fail-closed: it returns a non-zero status until the active-release symlink, v3 helper and doctor result, helper ownership/mode, external `.env`, root-owned maintenance lock, root-owned `helper_version=v3` marker, narrow sudoers rule and removal of the older broad sudo rule all pass. `--apply` refuses the old broad rule before changing hardening files, preserves the active release, normalizes the external `.env`, installs the helper and sudoers file through validated atomic replacements, stages and self-checks the policy, commits it, and writes the marker last with an atomic rename. Directory, ownership, lock and `.env` normalization are idempotent preparatory changes and are not reverted. During helper/sudoers/policy/marker replacement, the signal/exit trap rolls back the policy first, restores prior files when safe, checks every recovery operation and retains root-only backups if recovery is incomplete.

The maintenance lock prevents the upgrade from replacing the helper during a workflow stage, activation, commit or rollback. Do not bypass it with direct helper or activation commands while an upgrade or deployment is running.

Older rollback releases may retain their historical `.env` symlink because their older PHP code still depends on it; the Nginx dotfile rule returns 404 for that path. Every newly built release reads the external file directly and contains no `.env` path. PHP upload limits must be verified from the effective PHP-FPM pool or a controlled FPM request; the CLI PHP configuration is not accepted as evidence.

Run this hardening upgrade again whenever the allowlisted Nginx policy or privileged helper changes. Normal content releases do not replace the root-owned helper; a new policy that the installed helper does not recognize fails closed before activation.

## Local dry run

From `E:\begapunk-site-v2`:

```powershell
.\deploy.ps1 -DryRun
```

The command intentionally refuses a dirty Git worktree. During development only, a non-deploying validation may include existing changes:

```powershell
.\deploy.ps1 -DryRun -AllowDirty -SkipInstall
```

`-AllowDirty` cannot be used for a real deployment.

## Daily release

1. Review the intended change set and commit all production source and generated multilingual pages.
2. Merge the approved release into `main`.
3. Confirm the protected `production` environment variable `EDITORIAL_TRUSTED_BASE_SHA` still identifies the approved release currently resolved by `/www/begapunk/current`.
4. If the same localized page changed semantically more than once since that baseline, consolidate the final review evidence into one exact production-baseline-to-candidate transition (or release the reviewed intermediate version first). The current manifest intentionally rejects an unprovable multi-hop gap.
5. Complete the release checklist, then set `RELEASE_APPROVED_SHA` to the exact candidate commit and `RELEASE_AUTHORIZATION_REF` to its immutable review record.
6. Set `INQUIRY_DELIVERY_APPLICABILITY` explicitly. If it is `required`, complete an authorized controlled end-to-end mail test against the candidate-equivalent environment, have the protected-environment reviewer inspect its provider and inbox records, and bind both inquiry evidence variables to the candidate SHA. Changes to package manifests/lockfiles, `.env.example`, `.htaccess`, Nginx/runtime routing, production build/deploy/activate/bootstrap code, PHP/PHPMailer, Contact forms, or an unclassified runtime/router path cannot be waived as `not-applicable`. Package and `.env.example` changes are conservative triggers because path-only analysis cannot prove they leave the build/operator mail contract unchanged.
7. Run:

   ```powershell
   .\deploy.ps1
   ```

The script validates the clean worktree, requires `main`, runs all deployment checks, pushes `main`, creates an auditable `deploy-<timestamp>-<sha>` tag and pushes the tag. GitHub Actions then builds and audits one immutable release artifact, records its manifest digest, and reuses that same artifact for Lighthouse and deployment. The root-owned helper stages the non-privileged policy candidate and keeps its rollback record; only after exact public-byte, HTTP/SEO and production-browser checks pass is the transaction committed. The protected `catalog-project/` tree is ignored by the cleanliness check and is never included in the release.

GitHub Actions can also be started manually with **Run workflow**, but the selected ref must be an approved production commit.

## Automatic rollback

`activate-release.sh` requires both a release id and the externally recorded SHA-256 of that release's `manifest.sha256`. It rejects an uploaded manifest whose identity differs from the build job's protected output before checking the files listed by that manifest. The helper records the previous `current` target before switching. If the local HTTPS homepage fails three health checks, it restores that previous target and exits with an error.

The workflow additionally remembers and protects the previous release while the Nginx policy transaction is open. A runner-visible failure or normal cancellation first reactivates the previous release and only then restores the preceding Nginx policy, avoiding an unverified new-release/old-policy combination. IndexNow runs only after commit; an IndexNow notification failure does not roll back a healthy website.

The public gate verifies that the cache-busted production homepage, robots and both sitemaps are byte-for-byte identical to the audited artifact, then checks all public-language homepages, representative product/contact paths, single-hop query-preserving 301s, compatibility URLs, sensitive-path 404s, branded 404 rendering, the inquiry endpoint method contract, cache revalidation and security headers. A real browser also compares representative multilingual HTML bytes with the audited artifact, clicks Logo, Home, every language option and a visible quote/Contact CTA, and confirms the localized form target before the transaction commits. These checks do not submit an inquiry or prove SMTP acceptance or mailbox delivery.

## Manual rollback

List available releases:

```bash
find /www/begapunk/releases -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r
```

Activate a known-good release as `codexdeploy`, under the same maintenance lock used by automated deployment:

```bash
release_id='<release-id>'
expected_manifest_sha256='<manifest.sha256 file digest from the retained audit artifact>'
flock -w 60 /www/begapunk/maintenance.lock /www/begapunk/bin/activate-release.sh \
  "$release_id" "$expected_manifest_sha256"
```

Do not derive `expected_manifest_sha256` from the potentially damaged release directory during an incident. Copy it from the original GitHub release audit/artifact record. The same identity, integrity and health checks run during rollback. The active release, the four newest other inactive releases and the release active immediately before the switch are retained. When enough history exists, the explicitly protected previous release can therefore be a fifth inactive release; all other older releases are deleted only after a successful activation.

The cleanup step is eligible to run for normal workflow cancellation, but it remains best-effort: no GitHub step can guarantee completion after a job-level timeout, force-cancel, abrupt runner loss, host failure or loss of all SSH connectivity. In that case the helper deliberately preserves and blocks on the unfinished transaction. Read the transaction id and previous release id from the failed workflow or helper diagnostic, then recover both under one maintenance lock. The shell exits immediately if release restoration fails, so it cannot put the old policy under an unverified release:

```bash
previous_release_id='<previous-release-id>'
previous_manifest_sha256='<manifest.sha256 file digest from the retained audit artifact>'
transaction_id='<transaction-id>'
flock -w 60 /www/begapunk/maintenance.lock bash -se -- \
  "$previous_release_id" "$previous_manifest_sha256" "$transaction_id" <<'ROLLBACK'
set -Eeuo pipefail
previous_release_id="$1"
previous_manifest_sha256="$2"
transaction_id="$3"
/www/begapunk/bin/activate-release.sh "$previous_release_id" "$previous_manifest_sha256"
sudo -n /usr/local/sbin/begapunk-nginx-config rollback "$transaction_id"
ROLLBACK
```

Use `commit <transaction-id>` only when the corresponding release and all public checks are known to have passed, and invoke it under the same maintenance lock. Do not delete `/www/begapunk/shared/nginx-transactions/` by hand; it is the root-only rollback record.

## Security and operational risks

- Anyone who can modify the workflow or obtain the deployment private key can modify public website files. Require PR review and status checks on `main`, protect deployment tags, add CODEOWNERS for workflow/policy/deployment files, and configure required reviewers on the `production` environment. Source-code checks cannot substitute for those repository settings.
- Every production run requires an external authorization record bound to the exact candidate SHA. GitHub Environment approval remains required governance for high-risk releases; the variable binding prevents a stale approval from being reused but does not prove the reviewer actually inspected the evidence.
- The automated endpoint check proves that PHP answers with the expected method boundary; it does not prove SMTP authentication, attachment acceptance or mailbox delivery. A syntactically valid evidence reference proves only its binding to the candidate; it is never recorded by the workflow as delivery `PASS`. After changes to `send_inquiry.php`, PHP-FPM, PHPMailer, `.env`/`.env.example`, package manifests/lockfiles, `.htaccess`, Nginx/runtime routing, production build/deploy/activate/bootstrap paths or the mail service, obtain authorization and send one controlled ordinary inquiry plus one near-limit attachment to a controlled mailbox.
- Baota can rewrite the Nginx site configuration when the site is edited or saved in the panel. After any Baota site-setting change, confirm the root is `/www/begapunk/current`, confirm the `nginx-managed-policy.conf` include still exists, run `nginx -t`, and run `bash ops/verify-public-deployment.sh` before the next release. A missing include is a release blocker, not a warning.
- Do not place `.env`, SMTP credentials, panel passwords or SSH private keys in repository variables, logs, archives or release directories. `/www/begapunk/shared/.env` must remain a regular `root:www` file with mode `0640`.
- The managed policy intentionally contains no `location` blocks, so it does not replace or shadow Baota's PHP/static locations. The default `expires -1` makes unspecified responses revalidate; a more specific existing static-asset location may set a longer lifetime for versioned assets.
- If a CDN or reverse proxy is introduced, do not enable `real_ip_header` without an exact trusted-proxy allowlist. Otherwise the inquiry rate limiter may see one shared proxy address or trust spoofed client addresses.
- One-click deployment reduces repetitive work, but it must not auto-commit or auto-stage a dirty worktree. Automating an unreviewed source tree would make mistakes faster rather than safer.
