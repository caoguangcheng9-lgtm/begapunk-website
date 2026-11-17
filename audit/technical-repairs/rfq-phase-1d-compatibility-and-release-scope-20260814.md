# RFQ Phase 1D Compatibility and Release-Scope Record

Date: 2026-08-14 (Asia/Tokyo)

Status: local implementation and isolated verification complete; not approved for commit, push, or deployment.

## 1. Outcome

- The Inquiry backend now has an explicit PHP 8.2/8.3 compatibility gate in both pull-request and deployment workflows.
- Official PHP 8.2.33 and 8.3.33 Windows NTS builds each passed syntax validation and all eight isolated pre-mail runtime cases. Each run recorded zero SMTP connections and used loopback-only harness HTTP targets.
- The production PHP branch observed in Phase 1C is 8.2.28. Passing a current 8.2 patch establishes minor-branch compatibility evidence; it is not an exact copy of the production patch, Nginx, PHP-FPM, extensions, or configuration.
- The Inquiry contract validator was decoupled from Hero and CNC-case ordering. It now contains 664 RFQ-core checks; the CNC customer-case output remains covered separately by `cnc-saw-case:verify`.
- The current main worktree is not a safe release source because it contains hundreds of unrelated tracked and untracked changes. Whole-file staging from this worktree is prohibited for the RFQ release.

No commit, staging, push, deployment, production request, or real email was performed in Phase 1D.

## 2. PHP evidence

| Runtime | Official package | SHA-256 | Syntax | Runtime cases | SMTP connections |
|---|---|---|---|---:|---:|
| PHP 8.2.33 | `php-8.2.33-nts-Win32-vs16-x64.zip` | `d0bd189522fa50255ee94ed4b340ed4330f5ae33a90a74205275b0f0b221d388` | PASS | 8/8 PASS | 0 |
| PHP 8.3.33 | `php-8.3.33-nts-Win32-vs16-x64.zip` | `534399107056313246f424adbbb7937337e40fbbf6aa7bc26287ba9cfd2e4a2a` | PASS | 8/8 PASS | 0 |

Sources: [PHP 8.2 Windows downloads](https://www.php.net/downloads.php?os=windows&version=8.2) and [PHP 8.3 Windows downloads](https://www.php.net/downloads.php?os=windows&version=8.3).

The test harness disables `mail`, `fsockopen`, `pfsockopen`, `stream_socket_client`, `allow_url_fopen`, and `allow_url_include`; it copies only `send_inquiry.php`, does not copy `.env` or PHPMailer, binds its HTTP servers and SMTP trap to `127.0.0.1`, and fails if a guarded success/mail branch or any SMTP connection is observed.

## 3. CI contract

Both workflows use a two-entry matrix: PHP 8.2 and 8.3. The matrix runs independently from the Node/site quality job, and the downstream quality or deployment job requires the entire matrix to pass.

`shivammathur/setup-php` is pinned to commit `f3e473d116dcccaddc5834248c87452386958240` (release 2.37.2). The full SHA pins third-party action code; it does not freeze the hosted runner or PHP patch packages. `BEGAPUNK_EXPECTED_PHP_MINOR` prevents two matrix entries from silently using the same PHP minor.

The PHP matrix intentionally does not run `npm ci`: the verifier uses only Node built-ins and `npm run` only dispatches the script. The existing quality/deployment job retains its single dependency installation.

## 4. RFQ core source boundary

The clean RFQ source change has 12 candidate files.

### Public runtime source: 5 files

- `contact.html`
- `de/contact.html`
- `ja/contact.html`
- `ru/contact.html`
- `send_inquiry.php`

For each Contact page, transfer only the RFQ form and script changes: native `/send_inquiry.php` POST fallback, removal of blocking `onsubmit`, stable `general_inquiry` default, query-context mapping, localized validation/feedback, and progressive enhancement. Exclude Hero stylesheet query-string changes, footer serialization changes, and unrelated formatting. The full `send_inquiry.php` difference belongs to RFQ core.

Existing runtime dependencies must be verified but not replaced from the dirty worktree: `PHPMailer/`, the four Thank-you pages, production `.env`, shared CSS, and analytics JavaScript.

### Validation and CI: 5 files

- `scripts/verify-inquiry-contract.mjs`
- `scripts/verify-inquiry-php-runtime.mjs`
- `package.json`
- `.github/workflows/pr-quality.yml`
- `.github/workflows/deploy.yml`

Rebuild `package.json` from the clean baseline by adding only `inquiry:verify`, `inquiry:php:verify`, and `inquiry:verify` immediately before `discovery:verify` in `quality:pr` and `deploy:prepare`. Do not carry Hero or CNC commands as part of the RFQ patch. The PHP runtime command remains in the workflow matrix, not in the local aggregate chain.

### Audit and handoff: 2 files

- `audit/localization/2026-08-14-rfq-contact-localization-review.md`
- `PROJECT_HANDOFF.md`

The localization record can be included as a complete source artifact but must not enter the production web root. From the handoff, transfer only the Contact Form Contract and RFQ Phase 1B/1C/1D facts; exclude unrelated Website Experience, general localization, Hero, and case-study changes.

## 5. Explicit exclusions

The CNC case links are excluded from the RFQ-core release because they live inside a new customer-case module that does not exist at the clean baseline. Including those links would pull in four-language application/product pages, images, CSS, JSON-LD, search indexes, sitemaps, localization outputs, and a separate generator. That work belongs in a dedicated case-study change.

Also exclude all Hero/UI work, shared CSS changes, product/application/blog edits, other customer cases, `i18n/cache`, `i18n/editorial`, general overrides, search indexes, sitemaps, `llms.txt`, `catalog-project/`, `.env`, PHPMailer, and production configuration.

## 6. Required clean-release procedure

1. Create a separate clean worktree from the confirmed baseline `958efd4ab5129fde7296f9c27afa35f9cf9658a8` or the subsequently verified `origin/main` equivalent.
2. Reconstruct only the 12 RFQ-core files using the block-level rules above; do not stage from the current dirty worktree.
3. Require the clean worktree status to contain only those 12 source paths.
4. Run the Inquiry contract, PHP 8.2 and 8.3 isolated matrix, site quality chain, release build, and deployment validation.
5. Re-run localization/render review for the exact clean artifacts, then issue a new byte-bound release approval. The current expired/invalidated editorial approval must not be reused.
6. Before any production deployment, compare the clean release against the active production release. The RFQ feature intends five public runtime source changes, but the actual deployment delta may be larger if production is behind the clean Git baseline.
7. Only after explicit deployment authorization: back up production, stage an immutable release, preserve `.env`, PHPMailer and other production-only state, switch with rollback available, then verify Contact, native/AJAX failure paths, and one separately authorized end-to-end mail transaction.

## 7. Remaining boundaries

The isolated matrix does not test the success 200/303 branches, PHPMailer transport, SMTP TLS/authentication, mailbox receipt, exact PHP 8.2.28 behavior, Nginx/PHP-FPM integration, CRM, UTM attribution, lead IDs, sales qualification, or future uptime. Phase 1C proved one transaction through the old live contract; it did not test the undeployed local RFQ contract.
