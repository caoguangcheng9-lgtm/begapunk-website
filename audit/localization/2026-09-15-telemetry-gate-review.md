# Owner-authorized production telemetry gate repair

The owner explicitly approved repairing the deployment workflow before continuing
the PTFE release on 2026-09-15. This change adds two mandatory ordered steps:
checkpoint logs after policy staging, then check the new log delta after public
and browser verification and before transaction commit. Existing rollback,
approval, inquiry, public-boundary, browser, performance and artifact gates remain.

The workflow and policy semantic fingerprints are deliberately updated solely to
authorize those two additional steps. No severity, threshold or existing gate is
removed or downgraded. OBS-01 remains classified as manual in the policy because
system, field latency and delayed observations still require external review.

The root-owned helper gains only fixed-path observer commands. It exposes no raw
logs, accepts no caller-provided path, ignores sudo environment overrides, and runs
the Python observer in isolated mode. The observer supports the production Python
3.6 runtime and records root-owned transaction-specific offsets. Failed/unavailable
log evidence blocks commit and uses the existing rollback path. The workflow
compares the installed observer digest to the candidate source before activation.

No article, translation, public asset, form, PHP implementation, mail recipient,
SMTP secret, Nginx policy, sudoers or currently installed server file is changed by
this source patch. Existing bootstrap/hardening transaction semantics are retained.
Provisioning the two reviewed root-owned files is a separate explicit operation;
the workflow fails closed until that prerequisite is satisfied.

Review method: AI-assisted implementation and self-review, not an independent
human/security certification. Test outcomes and final candidate binding are
recorded separately; this document is not a claim of completed production release.
