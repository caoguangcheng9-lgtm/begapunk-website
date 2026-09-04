# Begapunk Automated Deployment

> Status: operational implementation guide. It does not authorize commit, push, deployment, or server changes. Current project decisions and release severity come from docs/standards/README.md and docs/standards/BEGAPUNK_WEBSITE_STANDARD.md. Any statement about live server state is a dated observation and must be verified before use.

## Outcome

The production workflow is designed around an immutable release directory and an atomic `current` symlink:

```text
Git commit and deploy tag
        -> GitHub Actions validation
        -> rsync to /www/begapunk/releases/<release-id>
        -> verify manifest
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

The deployment workflow hosts `${INDEXNOW_KEY}.txt` in the release root and sends only URLs changed since the server's currently active immutable release. It deliberately reads the active `current` target instead of trusting the preceding `deploy-*` tag, because a failed workflow can leave a tag without activating that release. IndexNow acknowledges discovery requests but does not guarantee crawling, indexing, or ranking.

Append only the `.pub` content to `/home/codexdeploy/.ssh/authorized_keys`. Copy the private-key content into `DEPLOY_SSH_KEY`, then delete or securely archive the local private copy after GitHub has been configured.

Obtain the server host key with `ssh-keyscan`, but verify its fingerprint against the Alibaba Cloud console or an already trusted SSH connection before saving it as `DEPLOY_KNOWN_HOSTS`. Blindly trusting a fresh scan defeats host verification.

## Server directories

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
3. Run:

   ```powershell
   .\deploy.ps1
   ```

The script validates the clean worktree, requires `main`, runs all deployment checks, pushes `main`, creates an auditable `deploy-<timestamp>-<sha>` tag and pushes the tag. GitHub Actions then uploads an immutable release and a non-privileged policy candidate. The root-owned helper stages the policy and keeps its rollback record; only after the new release passes the public boundary checks is the transaction committed. The protected `catalog-project/` tree is ignored by the cleanliness check and is never included in the release.

GitHub Actions can also be started manually with **Run workflow**, but the selected ref must be an approved production commit.

## Automatic rollback

`activate-release.sh` records the previous `current` target before switching. If the local HTTPS homepage fails three health checks, it restores that previous target and exits with an error.

The workflow additionally remembers and protects the previous release while the Nginx policy transaction is open. A runner-visible failure or normal cancellation first reactivates the previous release and only then restores the preceding Nginx policy, avoiding an unverified new-release/old-policy combination. IndexNow runs only after commit; an IndexNow notification failure does not roll back a healthy website.

The public gate verifies the homepage, single-hop query-preserving 301s, the `BP-2P-95-0001` and `products-p2` compatibility URLs in every language, sensitive-path 404s, branded 404 rendering, the inquiry endpoint method contract, cache revalidation and security headers. It does not send an inquiry or prove mailbox delivery.

## Manual rollback

List available releases:

```bash
find /www/begapunk/releases -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r
```

Activate a known-good release as `codexdeploy`, under the same maintenance lock used by automated deployment:

```bash
release_id='<release-id>'
flock -w 60 /www/begapunk/maintenance.lock /www/begapunk/bin/activate-release.sh "$release_id"
```

The same integrity and health checks run during rollback. The active release, the four newest other inactive releases and the release active immediately before the switch are retained. When enough history exists, the explicitly protected previous release can therefore be a fifth inactive release; all other older releases are deleted only after a successful activation.

The cleanup step is eligible to run for normal workflow cancellation, but it remains best-effort: no GitHub step can guarantee completion after a job-level timeout, force-cancel, abrupt runner loss, host failure or loss of all SSH connectivity. In that case the helper deliberately preserves and blocks on the unfinished transaction. Read the transaction id and previous release id from the failed workflow or helper diagnostic, then recover both under one maintenance lock. The shell exits immediately if release restoration fails, so it cannot put the old policy under an unverified release:

```bash
previous_release_id='<previous-release-id>'
transaction_id='<transaction-id>'
flock -w 60 /www/begapunk/maintenance.lock bash -se -- "$previous_release_id" "$transaction_id" <<'ROLLBACK'
set -Eeuo pipefail
previous_release_id="$1"
transaction_id="$2"
/www/begapunk/bin/activate-release.sh "$previous_release_id"
sudo -n /usr/local/sbin/begapunk-nginx-config rollback "$transaction_id"
ROLLBACK
```

Use `commit <transaction-id>` only when the corresponding release and all public checks are known to have passed, and invoke it under the same maintenance lock. Do not delete `/www/begapunk/shared/nginx-transactions/` by hand; it is the root-only rollback record.

## Security and operational risks

- Anyone who can modify the workflow or obtain the deployment private key can modify public website files. Protect `main`, deployment tags and the `production` environment.
- Prefer GitHub Environment approval for high-risk releases, even though it adds one confirmation click.
- The automated endpoint check proves that PHP answers with the expected method boundary; it does not prove SMTP authentication, attachment acceptance or mailbox delivery. After changes to `send_inquiry.php`, PHP-FPM, PHPMailer, `.env` or the mail service, obtain authorization and send one controlled ordinary inquiry plus one near-limit attachment to a controlled mailbox.
- Baota can rewrite the Nginx site configuration when the site is edited or saved in the panel. After any Baota site-setting change, confirm the root is `/www/begapunk/current`, confirm the `nginx-managed-policy.conf` include still exists, run `nginx -t`, and run `bash ops/verify-public-deployment.sh` before the next release. A missing include is a release blocker, not a warning.
- Do not place `.env`, SMTP credentials, panel passwords or SSH private keys in repository variables, logs, archives or release directories. `/www/begapunk/shared/.env` must remain a regular `root:www` file with mode `0640`.
- The managed policy intentionally contains no `location` blocks, so it does not replace or shadow Baota's PHP/static locations. The default `expires -1` makes unspecified responses revalidate; a more specific existing static-asset location may set a longer lifetime for versioned assets.
- If a CDN or reverse proxy is introduced, do not enable `real_ip_header` without an exact trusted-proxy allowlist. Otherwise the inquiry rate limiter may see one shared proxy address or trust spoofed client addresses.
- One-click deployment reduces repetitive work, but it must not auto-commit or auto-stage a dirty worktree. Automating an unreviewed source tree would make mistakes faster rather than safer.
