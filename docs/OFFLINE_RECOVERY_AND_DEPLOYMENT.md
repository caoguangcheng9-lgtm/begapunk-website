# Offline Recovery and Deployment

## Purpose

GitHub is the collaboration and audit system, but it must not be the only recoverable copy of the Begapunk website. The local operating model separates daily work, production synchronization, and offline recovery.

## Local directory roles

| Path | Purpose | Rules |
| --- | --- | --- |
| `E:\begapunk-site-v2` | Existing development workspace | Preserve its branch, local state, and untracked `catalog-project/`. Do not use destructive synchronization. |
| `E:\begapunk-production-main` | Independent clean production copy | Keep on `main`, require a clean working tree, and synchronize only by fast-forward from `origin/main`. Use this directory for dry runs and approved deployments. |
| `E:\begapunk-offline-backups` | Offline recovery sets | Store a full Git bundle, validated release ZIP, hashes, and restore instructions. Copy completed sets to another physical disk. |

A Git worktree is not an independent backup because it shares Git object storage with its parent repository. The production copy must remain a standalone clone.

## Synchronize and create an offline recovery set

From the independent production copy:

```powershell
Set-Location E:\begapunk-production-main
.\sync-production-main.ps1
```

The script fails closed unless all of the following are true:

- the current branch is `main`;
- the working tree is clean;
- `origin` is the Begapunk repository;
- local `main` can fast-forward to `origin/main` without divergence;
- the complete release build and validation pass;
- the build leaves the repository clean.

The generated recovery set contains:

- a Git bundle with repository history, remote branches, and tags;
- a validated static release ZIP;
- SHA-256 hashes and the exact commit;
- restore instructions.

It excludes untracked `catalog-project/`, production `.env`, SMTP credentials, SSH keys, tokens, and other server-only secrets.

## Dry run

After synchronization, validate the exact remote `main` without deploying:

```powershell
.\deploy.ps1 -DryRun -ExpectedCommit <full-40-character-reviewed-commit>
```

A dry run creates no deployment tag and makes no production change.

## Production deployment gate

A real deployment requires a separate Lao Cao authorization bound to the full reviewed commit:

```powershell
.\deploy.ps1 -ExpectedCommit <full-40-character-reviewed-commit>
```

The script does not push `main`. It requires local `HEAD`, `origin/main`, and the reviewed commit to be identical. It then creates a deployment tag, waits for the exact GitHub Actions run, and performs read-only live checks after the workflow succeeds.

The server workflow must verify the existing `current` release before uploading or switching:

- `current` is a symbolic link;
- it resolves inside `/www/begapunk/releases`;
- the release contains `index.html` and `manifest.sha256`;
- every manifest hash verifies.

If any rollback evidence is missing or ambiguous, deployment stops before release activation.

## Physical backup rule

An offline set stored only on `E:` protects against a GitHub or network outage, but not against disk failure, ransomware, theft, or accidental volume loss. Copy each accepted recovery set to a separate physical disk or removable drive and verify its SHA-256 values after copying.
