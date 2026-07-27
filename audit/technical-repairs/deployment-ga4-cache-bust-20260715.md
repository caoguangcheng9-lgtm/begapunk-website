# Begapunk GA4 cache-busting deployment - 2026-07-15

## Deployment identity

- Production content commit: `b4f0fcb` (`Bust analytics script cache across site`).
- Branch: `release-phase-2b-predeploy-repair`.
- Deployment completed: 2026-07-15 19:40 Asia/Tokyo.
- Production document root: `/www/wwwroot/47.252.73.192`.
- Changed scope: 51 tracked root-level HTML pages.
- Script reference deployed to every tracked page: `js/analytics.js?v=20260715-1`.

## Root cause

The production `js/analytics.js` contained the correct measurement ID, `G-D4FZF37Z07`, but browsers that had visited before the 2026-07-14 deployment could continue using the previous script for seven days because the response used `Cache-Control: max-age=604800` and every page referenced the unversioned URL. A controlled Chrome check confirmed that the old script was being served from disk cache and still contained the placeholder configuration.

## Rollback material

- Full production-root backup: `/www/backups/begapunk-ga4-cache-20260715-185231.tar.gz`.
- Backup size: 24 MB.
- Backup SHA-256: `20f9f8b9b2918a0fc940a6f2ce4d9027e338dd3a8f1c09c0c0e8b54e6d842a40`.
- The backup passed `gzip -t` before production files were replaced.

## Release material

- Local release directory: `E:\begapunk-site-releases\begapunk-ga4-cache-20260715-185231-b4f0fcb`.
- Server release directory: `/www/releases/ga4-cache-20260715-185231-b4f0fcb`.
- Server archive: `/www/releases/ga4-cache-20260715-185231-b4f0fcb/begapunk-ga4-cache-20260715-185231-b4f0fcb.tar.gz`.
- Archive SHA-256: `a026d41d99aa08d8e3634c6f83d60be98bdacdf35d667cbef315f6c9e9e23f80`.
- Staging validation: 51 HTML files, all containing the expected versioned analytics reference.

## Verification results

- Local change set contained exactly one replacement line in each of 51 tracked HTML files.
- No unversioned `src="js/analytics.js"` reference remained in tracked HTML.
- The untracked `catalog-project/` workspace remained outside the final commit and deployment package.
- All 51 live HTML hashes matched the staged release hashes after deployment.
- All deployed files retained owner/group `www:www` and mode `0644` through the deployment install step.
- Nginx configuration syntax passed.
- Homepage, products, contact, privacy, a representative product page, and thank-you page returned HTTP 200.
- Every sampled public page exposed `js/analytics.js?v=20260715-1`.
- The versioned analytics script exposed measurement ID `G-D4FZF37Z07`.
- The contact backend remained unchanged; `GET /send_inquiry.php` returned the expected HTTP 405.
- A controlled production visit loaded `https://www.googletagmanager.com/gtag/js?id=G-D4FZF37Z07` and sent a `POST` request to the GA4 collection endpoint for `G-D4FZF37Z07`.
- GA4 Realtime confirmed one active user, two page views, one session start, one user engagement event, and two `cookie_consent_granted` events during verification.

## Scope protection

No production `.env` content, SMTP credentials, `PHPMailer/`, `.well-known/`, PHP backend, server configuration, or unrelated document-root files were changed.

## Rollback outline

If rollback is required, extract `/www/backups/begapunk-ga4-cache-20260715-185231.tar.gz` outside the live root, restore the 51 HTML files to `/www/wwwroot/47.252.73.192`, preserve `www:www` ownership and mode `0644`, then repeat Nginx, public-page, and GA4 checks.
