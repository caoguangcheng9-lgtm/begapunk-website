# Isolated CLS repair release preparation

Date: 2026-09-12 UTC
Decision: NOT READY FOR PRODUCTION. No deployment has been triggered.

## Authorization and scope

The site owner authorized isolating, committing and pushing the page repairs, one test inquiry to their own mailbox, and deployment only after verification. This candidate excludes the unrelated uncommitted server, workflow, deployment-policy and package changes in E:/begapunk-site-v2. Those originals remain untouched.

The working branch is codex/cls-release-20260912, based on 3f215df1e69088a2c23cc325eb2e92457777fb0c. It contains the shared native mobile-menu fallback, stable header layout, stable search area, FAQ initial-state preservation, narrow German quality-card wrapping, generated multilingual navigation and directly related validators. The existing deployed search-verification contract is retained; the unrelated pending audit-policy migration was not copied into this candidate.

## Verified production baseline

- SSH host-key checking was enforced using the existing trusted host entry.
- Active release: /www/begapunk/releases/20260904-155356-1df9f8151430.
- Baseline source commit: 1df9f815143055992dcdf32850206b080831069a.
- All currently deployed manifest-listed files passed sha256sum verification.
- Installed privileged-helper doctor returned begapunk-nginx-config-doctor-ok:v3.
- No production configuration or release pointer was changed.

## Local verification

- Source-quality validation: PASS.
- Localized structure: PASS, 280 pages.
- Inquiry contract: PASS, 2148 assertions, no submission from that verifier.
- Production build: PASS, 776 manifest-listed files.
- Package validation: PASS, 289 HTML files, 777 files including manifest, 34 public downloads.
- Links/downloads: PASS, 14943 link occurrences and 34 integrity-checked downloads.
- Isolated build manifest SHA-256: 729b177e948bf9fb56907fe436da4ee799a1018f37000e13d5b551872b67fa61.
- The earlier full-site matrix belongs to the original build. This isolated build has a different digest and must not inherit that artifact's final release approval. The isolated candidate's representative layout check passed 125/125 cases: 5 page families x 5 languages x 5 widths (320/390/768/1280/1440), with zero findings; see isolated-layout.json. This is not a claim of a new full 280-page browser matrix.

## Exactly one controlled inquiry

- Marker: BEGAPUNK-RELEASE-TEST-20260912-0214.
- One multipart POST to the production inquiry endpoint returned HTTP 200, success=true and code=sent. No retry was sent.
- Zoho search found one Inbox message and its corresponding Sent copy, not two submissions.
- Inbox folder type and matching message content were inspected. The body contained the marker, the internal-test purpose, and the statement that no quotation or reply was required.
- Destination was the owner's sales mailbox. No customer recipient or attachment was used.
- Inbox delivery: PASS for the current production inquiry handler. Provider acceptance is corroborated by the Sent copy and Inbox receipt; an independent SMTP transaction log was not retrieved.
- Current candidate send_inquiry.php is identical to the production handler after LF normalization: 66af16fa81c747f53a61c37469dea85b055274a6ed2354efddc455cb32c40e80. This does not approve future routing, SMTP or server changes.

## Blocking release-integration issues

1. The active release uses the legacy editorial snapshot format. The current verifier requires a pure, byte-preserving schema migration from that format; it does not accept changed HTML in the same transition. Candidate pages include changes beyond that baseline. Neither selecting HEAD as a false production baseline nor rehashing records would supply the missing production-to-candidate review chain.
2. The committed workflow does not inject EDITORIAL_TRUSTED_BASE_REF, while the committed new verifier requires it in GitHub Actions. The pending replacement workflow and server scripts are a separate, substantial migration, not a page-layout repair.
3. The protected production environment currently has no variables configured. Its required baseline/approval bindings must be established through an appropriately reviewed deployment-flow change before using the pending new pipeline.

These are release-pipeline integration blockers, not hundreds of newly discovered page-content errors. Current editorial readiness data records 56/56 reviewed pages in every localized language. The verifier's expired 16-page-debt exception is a fallback diagnostic after strict verification fails, not evidence that 16 pages are currently unreviewed; do not renew that old exception merely to suppress failures.

The next step requires separately scoped review of the deployment/audit migration (including an exact baseline transition and server compatibility). Do not trigger either an unconfigured new pipeline or an old pipeline by disabling its required checks.

## Non-blocking observation

npm audit reported a high-severity advisory for build-only sharp 0.35.3. No runtime Node packages are uploaded in this static/PHP release. Exploitability was not established here, and dependencies were not force-upgraded. Track this separately before accepting arbitrary untrusted build images.
