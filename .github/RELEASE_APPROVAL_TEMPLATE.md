# BEGAPUNK RELEASE APPROVAL

> Copy this template into an access-controlled, immutable review record. Do not store credentials, customer messages, attachments, or unnecessary personal data here. A checked box is not evidence by itself; link the retained evidence.

## Release identity

- Candidate commit (full 40-character SHA):
- Deploy tag:
- Release ID:
- `manifest.sha256` file SHA-256:
- Policy version: `BEGAPUNK_RELEASE_AUDIT_STANDARD_V2`
- Review timestamp (UTC):

## Scope and change classification

- Intended changes:
- Affected paths, languages, page families, downloads, forms, server/runtime files:
- Shared generator/CSS/JavaScript/navigation impact:
- Inquiry-chain change detected: YES | NO

## Evidence reviewed

- PR audit run and exact commit:
- Release-candidate audit artifact and manifest digest:
- Editorial/product-fact review record:
- Server preflight and rollback-target evidence:
- Remaining P0/P1 manual or partial controls:

## Inquiry evidence

- Applicability: `required` | `not-applicable`
- Applicability reason:
- Authorized controlled-submission reference (when required):
- `INQ-SMTP` applicable: true | false
- `INQ-SMTP` result (when applicable): PASS | FAIL | UNKNOWN
- Provider acceptance ID evidence (redacted):
- `INQ-DELIVERY` applicable: true | false
- `INQ-DELIVERY` result (when applicable): PASS | FAIL | UNKNOWN
- Destination-inbox receipt evidence (redacted):
- Reviewer role and timestamp:

`PASS` for SMTP or delivery requires inspection of the correlated external record. A reference string, endpoint response, local mock, or thank-you page alone is `UNKNOWN`.

## Findings and unknowns

- P0/P1 findings:
- P2/P3 findings, owner, and due date:
- UNKNOWN evidence, owner, and next action:
- Exception ID (P2/P3 only; never converts FAIL/UNKNOWN to PASS):

## Decision

- Decision: APPROVE EXACT COMMIT | BLOCK | ROLLBACK
- `RELEASE_APPROVED_SHA` value (must equal candidate commit):
- `RELEASE_AUTHORIZATION_REF` value (this immutable record):
- Approver role:
- Approval timestamp (UTC):

Approval applies only to the exact candidate commit and manifest above. Any later commit, rebuilt artifact, changed manifest, or changed protected input requires a new decision.

## Post-deployment closure

- 0-5 minute public-boundary result: PASS | FAIL | UNKNOWN
- Production browser result: PASS | FAIL | UNKNOWN
- Activated release/manifest identity confirmed:
- Transaction committed or rolled back:
- 24-hour review reference:
- 7-day review reference:
