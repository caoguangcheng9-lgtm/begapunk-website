# Begapunk Automated Deployment

## Outcome

The production workflow is designed around an immutable release directory and an atomic `current` symlink:

```text
Git commit and deploy tag
        -> GitHub Actions validation
        -> rsync to /www/begapunk/releases/<release-id>
        -> verify manifest
        -> switch /www/begapunk/current
        -> homepage health check
        -> automatic rollback on failure
```

The current production website is still served directly from `/www/wwwroot/47.252.73.192`. Creating these repository files does not change the server. The one-time bootstrap described below must be reviewed and run separately.

## Files in this deployment system

- `.github/workflows/deploy.yml`: GitHub Actions validation and deployment entry point.
- `deploy.ps1`: Windows one-command release trigger.
- `scripts/build-production-release.mjs`: creates a production-only release tree.
- `scripts/validate-deployment.mjs`: validates HTML, JavaScript, JSON-LD, local resources, sitemaps, robots and required files.
- `ops/bootstrap-server.sh`: one-time server migration from the current document root to releases/current layout.
- `ops/activate-release.sh`: verifies, activates, checks, rolls back and prunes releases.

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
    .env
    .well-known/
    WW_verify_*.txt
  bin/
    activate-release.sh
  deployments.log
```

Nginx will use:

```nginx
root /www/begapunk/current;
```

The original `/www/wwwroot/47.252.73.192` directory remains unchanged as the first rollback source. The production `.env` is copied to the shared directory with `root:www` ownership and mode `0640`; it is never uploaded from GitHub.

## First-time server setup

Current read-only inspection found Alibaba Cloud Linux 3, Nginx at `/usr/bin/nginx`, 18 GB free disk space, no existing `current` symlink and no installed `rsync` command.

1. Upload `ops/bootstrap-server.sh` to a temporary server location.
2. Run the read-only check first:

   ```bash
   sudo bash bootstrap-server.sh --check
   ```

3. Review the displayed live root, Nginx configuration and deployment user.
4. Apply the migration once:

   ```bash
   sudo bash bootstrap-server.sh --apply
   ```

The apply step installs rsync if missing, copies the existing live site into an initial versioned release, preserves `.env`, `.well-known` and verification files in `shared`, changes the Nginx root, validates Nginx and performs a local HTTPS health check. If validation or health checking fails, the original Nginx configuration is restored automatically.

After bootstrap and SSH-key verification, remove unrestricted sudo access from the deployment account. Daily deployment does not require root:

```bash
sudo rm -f /etc/sudoers.d/codexdeploy
```

Do this only after confirming that no unrelated server process depends on that sudo rule.

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

The script validates the clean worktree, requires `main`, runs all deployment checks, pushes `main`, creates an auditable `deploy-<timestamp>-<sha>` tag and pushes the tag. GitHub Actions then performs the deployment. The protected `catalog-project/` tree is ignored by the cleanliness check and is never included in the release.

GitHub Actions can also be started manually with **Run workflow**, but the selected ref must be an approved production commit.

## Automatic rollback

`activate-release.sh` records the previous `current` target before switching. If the local HTTPS homepage fails three health checks, it restores that previous target and exits with an error, causing GitHub Actions to fail.

## Manual rollback

List available releases:

```bash
find /www/begapunk/releases -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r
```

Activate a known-good release as `codexdeploy`:

```bash
/www/begapunk/bin/activate-release.sh <release-id>
```

The same integrity and health checks run during rollback. The active release plus the four newest inactive releases are retained; older releases are deleted only after a successful activation.

## Security and operational risks

- Anyone who can modify the workflow or obtain the deployment private key can modify public website files. Protect `main`, deployment tags and the `production` environment.
- Prefer GitHub Environment approval for high-risk releases, even though it adds one confirmation click.
- The homepage check proves that Nginx serves a valid page; it does not prove SMTP delivery. Run a real form-email test after changes to `send_inquiry.php`, PHPMailer or server mail configuration.
- Baota can rewrite the Nginx site configuration when the site is edited or saved in the panel. After any Baota site-setting change, confirm that the document root is still `/www/begapunk/current`, run `nginx -t`, and perform a homepage health check before the next release.
- Do not place `.env`, SMTP credentials, panel passwords or SSH private keys in repository variables, logs, archives or release directories.
- One-click deployment reduces repetitive work, but it must not auto-commit or auto-stage a dirty worktree. Automating an unreviewed source tree would make mistakes faster rather than safer.
