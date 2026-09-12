# BaoTa ACME runtime ownership compatibility

2026-09-12, Codex AI-assisted engineering review; not independent human review.
The owner explicitly authorized inspecting BaoTa renewal and correcting this
server-permission conflict after the unsuccessful activation of 77bf2b8.

## Evidence and scope

Run 34676886836 passed 60 canonical gates and 120 Lighthouse runs (40 routes,
median scores 98–100, zero red-zone/threshold findings). Its exact canonical
manifest remained 41bffaefca080e5feec4af2eb85841fb390a089ed3601cf19060767025bff342.
Activation failed before switching current because shared/.well-known was
www:www 0755 rather than root:root. Nginx transaction rollback succeeded; the
old production release's complete manifest and HTTP 200 were independently
verified. The per-candidate protected approval variables were cleared.

Read-only administrator evidence from the actual Virginia server, cloud command
t-use6wtlktp2qm0w, confirms root-owned/running BaoTa panel, task service and cron.
Filtered code/cron evidence in the private server report
/tmp/begapunk-renewal-report.Vj9zqw4T shows class/acme_v2.py explicitly calling
public.set_own(acme_path, 'www') and public.set_own(wellknown_path, 'www') around
lines 922–935. The existing root crontab invokes that file with --renew_v2=1 at
03:16 daily. No renewal was executed, certificate/private key read, or renewal
configuration modified. A one-time recursive chown would not address recurrence.

## Correction

- Only the literal /www/begapunk/shared/.well-known production path, with the
  existing expected root:root shared-directory contract, uses a dedicated
  read-only validator. There is no configurable alternate writer or path.
- Resolve the existing non-root www account. Allow its exact uid/gid only on
  .well-known, its acme-challenge directory, and direct token files with 22–256
  base64url filename characters. Exact directory 0755/file 0644 is required.
- Preserve the existing root-owned node contract elsewhere in the tree.
  Canonical-path, symlink and special-node rejection remain mandatory. Reject
  www-owned nested directories, script/dot/short filenames, unrelated nodes,
  wrong accounts, mixed owners/groups and writable modes.
- The shared parent, ordinary WW_verify files and SMTP configuration do NOT gain
  a www ownership exception. SMTP checks and the existing privileged helper are
  unchanged; no sudo/group membership or web-server routing changes are needed.
- The existing ordinary WW_verify file was separately backed up and normalized
  to root:root, preserving 0644 and its exact SHA-256. Cloud command
  t-use6wtnspe9i22o exited 0; backup is in the root-only directory
  /var/backups/begapunk-verification-owner.lZ56zPyn. The earlier attempt
  t-use6wtne8rvvbpc stopped before mutation on an incorrect lock-path check.
  The successful attempt used /www/begapunk/maintenance.lock under flock.
  Independent SSH checks confirmed SHARED_RUNTIME_OK, helper doctor v3 and
  SMTP check v1; current still pointed to the unchanged September 4 release.

## Tests and limits

Local release-boundary tests: 11 pass, 3 Linux-only skips. All three isolated
Linux suites passed: new ACME runtime fixtures, existing server-release safety,
and SMTP helper fixtures. New fixture tests simulate numeric ownership while
using real filesystem modes/types; they do not chown or read production data.
The new validator then passed a read-only check of the actual production ACME
tree. The complete shared-runtime validator still correctly rejected the
www-owned ordinary verification file, proving the exception does not spread.

No public HTML/CSS/JS/PHP/download payload change is part of this correction.
Full CI and canonical release gates, exact artifact binding, backup, transactional
activation and post-deployment verification remain required. The protection is
a deployment-time filesystem check, not a continuous security monitor or proof
that every future certificate renewal will succeed. Retain normal renewal
observation without claiming an actual issuance/renewal test was performed.
