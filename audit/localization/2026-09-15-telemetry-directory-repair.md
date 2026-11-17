# Telemetry evidence directory repair

Production run 34958806404 completed the canonical release audit and Lighthouse
checks, but stopped before activation because the new checkpoint step piped its
result into `dist/audit/production-telemetry-start.json` before creating that
directory on the fresh deployment runner. The observer itself returned PASS.
The policy transaction rolled back; the active website remained the old release.

The owner requested continuing with this specific repair. The only deployment
behavior change is `mkdir -p dist/audit` immediately before the checkpoint, with
the existing fail-closed shell options unchanged. No article, public asset,
server-installed helper, mail configuration, permission, threshold or gate is
changed. The workflow semantic fingerprint and its enclosing policy fingerprint
are updated only to register this one-line repair, not to permit a bypass.

A clean-directory shell regression runs the actual YAML checkpoint with local
mock SSH commands: successful checkpoint evidence must be written, omission of
the directory must reproduce failure, and an observer failure must propagate
through the output pipeline. No server access is performed by this fixture.

Review method: AI-assisted implementation and self-review. This note does not
claim an independent review, completed CI, authorization to merge, or deployment.
