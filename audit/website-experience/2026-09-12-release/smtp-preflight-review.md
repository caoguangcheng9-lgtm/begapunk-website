# SMTP preflight privilege-boundary correction

Reviewed by Codex (AI-assisted engineering review), 2026-09-12.
This is not independent human approval or evidence of a successful deployment.

The failed run 34672559862 exposed a contract mismatch: codexdeploy was asked
to read root:www 0640 SMTP configuration. The same mismatch exists in the
subsequent activation validator, so both callers are corrected together.

## Scope and preserved controls

- Add the argument-free `smtp-check` action to the existing root-owned helper.
  Its configuration path is a literal, not the helper's overridable test path.
  Reject non-root execution, extra arguments, symlinks/noncanonical paths and
  any metadata other than root:www 0640. Parse data without sourcing/evaluating
  it. Check the same five required keys and first-occurrence/non-empty semantics.
- Output only a fixed success marker or a missing key name/static error.
  No SMTP values, network requests or test email are emitted.
- Preflight requires exit success AND the exact versioned marker. Activation
  delegates only when the canonical production path is unreadable and the
  expected owner is root; fixture/bootstrap readable paths retain full checks.
- Nginx v3 protocol, doctor, hardening marker, 43-directive policy, sudoers rule,
  file permissions, group membership, release authorization, manifest binding,
  rollback and post-deployment gates are unchanged. The additive SMTP capability
  has its own v1 marker; old v3 installations fail closed until upgraded.
- No public website payload or SMTP settings changed.

## Workflow semantic review

Only the production preflight's unprivileged awk block was replaced by the
fixed helper invocation and exact output check. No jobs, permissions, action
versions, conditions, artifact paths or deployment steps changed.

Previous parsed-YAML digest:
`b865d93a8f83eeee8ecacfd6a8fe6ba984357976cbd667eed36e873254ddf054`

Reviewed parsed-YAML digest:
`5ba3790921d6a85fd39fb9c8a5535bc29c3b8759fa184060d18d3318ed4041ac`

The executable allowlist is updated for this specific reviewed change, not to
waive a failing server gate. Tests verify both callers require the marker and
that the workflow cannot return to direct awk reads. Linux fixture tests cover
all required keys, quoted/whitespace empties, duplicate-first semantics, literal
shell metacharacters, wrong mode, missing file, symlink and directory rejection.
The helper function's fixed path/owner are mapped only within the isolated test
harness; production dispatch/root/argument contracts are checked separately.

The policy diff contains only that workflow digest replacement; controls,
severity, gate sets and evidence mappings remain unchanged. Its reviewed
semantic digest therefore changes from
`940f568ea77e5b8104ef531c83daf025fefb9c8719f8c6b50e64ac97c2e391b8`
to `8e1e70e688cdfcf6e738ea10af563c02409a46ff022179f8d546c68526cfe09e`.

## Installation / release still pending

Verification completed before installation: 42 local Node regression tests
passed (2 Linux-only tests skipped on Windows); both the SMTP helper fixtures
and complete server release safety shell suite then passed under codexdeploy
in `/tmp/begapunk-smtp-fixtures.P0uAQUBo` on Linux. Fixture-only sudo is mocked;
the real root-installed action is still untested/uninstalled. Deployment
inventory validation passed for the unchanged public package.

Installed old helper SHA-256 observed read-only:
`69d65c0e3c65c049c02e53638aa5be6ef3107966532cee5a98d919ea70f48f6f`.
Reviewed candidate helper SHA-256, matched locally and after transfer:
`ce0a4b90abf95c5b84c465cf7214062f3c8b6443a645c2241d0cbb285a39f863`.

Administrator installation must back up the old root-owned helper, verify the
reviewed candidate hash, replace only that helper atomically with root:root
0755, and confirm doctor plus smtp-check via codexdeploy. Do not run bootstrap,
relax .env permissions, expose arbitrary sudo or modify Nginx configuration.
The new capability requires owner confirmation at the browser action boundary.
No production publication is authorized by this review record alone.
