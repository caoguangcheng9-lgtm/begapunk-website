# Begapunk Website Project Handoff

This document is the durable recovery point for future Codex tasks. Read it before modifying, committing, pushing, packaging, or deploying the website.

Last reviewed: 2026-07-13 (Asia/Tokyo)

## 1. Project Identity

- Project: Begapunk Website
- Production website: `https://www.begapunk.com/`
- Local source of truth: `E:\begapunk-site-v2`
- GitHub remote: `https://github.com/caoguangcheng9-lgtm/begapunk-website.git`
- Current working branch: `release-phase-2b-predeploy-repair`
- Code baseline immediately before this handoff document: `87a0b4af7d412d74c7f6e5a1e4076b751d1d2414`
- Previous product-parameter correction commit: `20fab1fc89cb115084e721f6c773ef2540c4d2d2`
- Previous remote branch baseline before the 2026-07-13 backup push: `56a4183fce7d38d27a8d9c3b0018af35ce1c1949`

Always run `git status`, `git branch --show-current`, and `git log -3 --oneline` before starting a new task. The latest commit after this document was added is authoritative even though a Git commit cannot reliably contain its own final hash.

## 2. Safety Rules

- Never delete, reset, clean, stash, or overwrite uncommitted user work automatically.
- Never use `git reset --hard`, `git checkout .`, or `git clean`.
- Never expose or commit passwords, SMTP authorization codes, tokens, cookies, private keys, or `.env` values.
- Do not modify production server files unless the user explicitly requests deployment.
- Before deployment, create a dated server backup and keep a rollback path.
- Keep website source, release packages, backups, and Codex temporary files in separate directories.
- Do not add `.codex-panel*`, `.codex-tmp*`, temporary archives, or local logs to the repository.
- Do not delete or stage the existing `catalog-project/` working files unless a later task explicitly reviews and approves them.

## 3. Current Git State

At handoff creation, the tracked website was committed through:

1. `20fab1f` - Fix product parameters to match approved drawings
2. `87a0b4a` - Integrate RFQ process timeline into contact page

Known untracked content that must remain untouched:

- `catalog-project/README.md`
- `catalog-project/assets/`
- `catalog-project/audit/`
- `catalog-project/data/catalog-data-schema.json`
- `catalog-project/data/catalog-data.json`
- `catalog-project/output/`
- `catalog-project/package.json`
- `catalog-project/reports/`
- `catalog-project/scripts/`
- `catalog-project/src/`

These files are not part of the contact-page commit and are intentionally excluded from the handoff commit.

## 4. Latest Completed Work

### Product parameter correction

- Commit: `20fab1fc89cb115084e721f6c773ef2540c4d2d2`
- Purpose: align approved product-page parameters with formal engineering drawings.
- Report: `audit/website-parameter-correction-report.md`
- Deployment status at handoff: not confirmed as deployed.

### Contact and RFQ page refactor

- Commit: `87a0b4af7d412d74c7f6e5a1e4076b751d1d2414`
- Page: `contact.html`
- New page-only stylesheet: `css/contact-rfq.css`
- Pre-change audit: `audit/contact-page-prechange-audit.md`
- Final QA report: `audit/contact-page-process-rfq-report.md`
- Layout: desktop process/RFQ 60/40; sticky form above 1100 px; single-column process-first layout at tablet/mobile widths.
- Browser QA: 1440, 1366, 1280, 1024, 768, 430, 390, and 375 px.
- Horizontal overflow: 0 at every tested width.
- Browser console errors: 0.
- Broken local resources: 0.
- Deployment status at handoff: not deployed.

## 5. Contact Form Contract

- Public page: `https://www.begapunk.com/contact.html`
- Backend: `/send_inquiry.php`
- Local backend file: `E:\begapunk-site-v2\send_inquiry.php`
- Method: `POST`
- Encoding: `multipart/form-data`
- Submission: existing page JavaScript posts `FormData` to `/send_inquiry.php`.
- Maximum attachment size: 10 MB.
- Supported extensions: PDF, STEP/STP, IGES/IGS, DWG, DXF, JPG/JPEG, PNG.
- Anti-spam field: `honeypot`.
- PHPMailer runtime: `PHPMailer/PHPMailer.php`, `PHPMailer/SMTP.php`, `PHPMailer/Exception.php`.

Backend-dependent field names that must not be changed without coordinated PHP review:

- `fullname`
- `email`
- `company`
- `country`
- `product`
- `application`
- `requirements`
- `inquiry_type`
- `source_model`
- `source_product`
- `source_page`
- `source_url`
- `source_language`
- `drawing`
- `honeypot`

The HTML also retains the hidden `redirect` field. `send_inquiry.php` did not change during the contact-page refactor.

## 6. Mail Incident Knowledge

If the contact page shows an inquiry-service error:

1. Confirm that `contact.html` loads normally.
2. A `GET` request to `/send_inquiry.php` returning HTTP 405 only proves that the endpoint exists; it does not prove mail delivery works.
3. If a valid `POST` reaches the endpoint but returns HTTP 502, inspect the SMTP path before rewriting frontend code.
4. The previous confirmed root cause was SMTP authentication failure while the TLS connection to Tencent enterprise mail was still available.
5. The production mail configuration file is `/www/wwwroot/47.252.73.192/.env`.
6. The relevant secret field is `SMTP_PASS`, but its value must never be copied into this repository, this document, logs, screenshots, or chat.
7. After any credential rotation, the user must update the server value privately and confirm with an end-to-end test.

## 7. Server and Deployment Locations

- Server IP: `47.252.73.192`
- Production document root: `/www/wwwroot/47.252.73.192/`
- Production environment file: `/www/wwwroot/47.252.73.192/.env`
- Server release staging directory used previously: `/www/releases/`
- Local release workspace: `E:\begapunk-site-releases`
- Local historical baseline backup: `E:\begapunk-site-v2-backups\pre-geo-baseline-20260621-122230`

Do not store panel login details, SSH passwords, or tokens here. Authentication must be completed manually when required.

### Latest verified deployment

#### Minified site, optimized images, social cards, and llms.txt - 2026-07-16

- Production content commit: `66b88a7` (`Add verified minified site build`).
- Server deployment timestamp: 2026-07-16 13:14:26 (server timestamp).
- Changed scope: 130 minified HTML/CSS/JavaScript/JSON/text and optimized image/social-card files.
- Server rollback backup: `/www/backups/begapunk-minified-predeploy-20260716-131426.tar.gz`.
- Server release directory: `/www/releases/minified-20260716-66b88a7`.
- Uploaded delta archive: `/www/releases/begapunk-minified-delta-20260716-66b88a7.zip`.
- Archive SHA-256: `CA089BEEF4FE6497ED39BA46B2DC45A06F8CBCB7079E252E8D731A0CCE4244A0`.
- Verification: all 130 release files matched the production copies; Nginx syntax passed; homepage, products, contact, llms.txt, CSS, JavaScript, social image, and inquiry endpoint checks passed; browser console errors were zero on the homepage, products page, and contact page.
- Gzip verification: enabled in Nginx with compression level 5 and `gzip_vary on`; public HTML, text, CSS, and JavaScript responses returned `Content-Encoding: gzip`.
- Detailed record: `audit/technical-repairs/deployment-minified-site-20260716.md`.
- Production-only `.env`, `.well-known/`, backend secrets, and unrelated server files were not changed.

#### GA4 cache-busting follow-up - 2026-07-15

- Production content commit: `b4f0fcb` (`Bust analytics script cache across site`).
- Deployment time: 2026-07-15 19:40 Asia/Tokyo.
- Changed scope: all 51 tracked root-level HTML pages now load `js/analytics.js?v=20260715-1`.
- Server rollback backup: `/www/backups/begapunk-ga4-cache-20260715-185231.tar.gz`.
- Server release directory: `/www/releases/ga4-cache-20260715-185231-b4f0fcb`.
- Verification: all live HTML hashes matched staging; Nginx syntax and public-page checks passed; a live GA4 collection request targeted `G-D4FZF37Z07`; GA4 Realtime showed one active user and the expected page-view/session/engagement/consent events.
- Detailed record: `audit/technical-repairs/deployment-ga4-cache-bust-20260715.md`.
- Production-only `.env`, `PHPMailer/`, `.well-known/`, backend files, and unrelated site files were not changed.

#### GA4 consent and lead tracking - 2026-07-14

- Production content commit: `7e33e7f` (`Fix GA4 consent and lead tracking`).
- Deployment time: 2026-07-14 14:48 Asia/Tokyo.
- Server rollback backup: `/www/backups/begapunk-ga4-20260714-144643.tar.gz`.
- Server release directory: `/www/releases/ga4-20260714-144643-7e33e7f`.
- Release archive SHA-256: `851A84A5E301A14C46D4DFF2DE95BC12CA07F40140D00DC634F0AAE63AD94FEF`.
- Deployed files: `contact.html`, `privacy.html`, and `js/analytics.js`.
- Verification: live hashes matched local source; Nginx syntax passed; consent, GA4 loading, lead-event behavior, public pages, and inquiry endpoint checks passed; a real test POST returned HTTP 200 and email-send success.
- Detailed record: `audit/technical-repairs/deployment-ga4-20260714-1448.md`.
- Production-only `.env`, `PHPMailer/`, `.well-known/`, and unrelated site files were not changed.

## 8. Deployment Guardrails

Before a production deployment:

1. Confirm the intended Git commit and list changed files.
2. Run HTML, JSON-LD, JavaScript, link, resource, responsive, and `git diff --check` validation.
3. Build a clean release package that excludes Git metadata, audit-only material, local backups, logs, temporary files, and `catalog-project/` unless specifically needed.
4. Back up the current production document root to a dated path outside the live root.
5. Preserve production-only files and runtime state, especially `.env`, `PHPMailer/`, and `.well-known/` where applicable.
6. Upload to a staging release directory first, inspect it, then switch or copy into the live root using a rollback-safe procedure.
7. Verify homepage, products, contact page, CSS/JS/images, sitemap/robots, redirects, and the inquiry endpoint.
8. Perform a real mail test only with the user's approval and confirmation of receipt.
9. Record the deployed commit, deployment time, backup path, and verification result in a new audit report.

## 9. SEO and GEO Baseline

- Preserve canonical URLs, metadata, Open Graph, Twitter metadata, JSON-LD, sitemap, robots, internal links, and legacy redirects during page work.
- Do not add unsupported certifications, guarantees, fixed response times, absolute quality claims, or invented engineering data.
- Product facts must follow approved drawings and evidence records.
- Existing GEO and claim-remediation records are under `audit/geo-audit/`, `audit/geo-remediation/`, and `audit/fact-resolution/`.
- Existing release and technical-repair records are under `audit/technical-repairs/`.

## 10. Backups and Recovery

Important local locations observed at handoff:

- `E:\begapunk-site-v2`
- `E:\begapunk-site-releases`
- `E:\begapunk-site-v2-backups`
- `E:\begapunk-website-backup-20260602-1530`

Git is the primary change history. Release directories and dated backups are secondary recovery layers. Do not assume an old backup is current without comparing its date and commit-equivalent content.

Recovery sequence after a new computer session or a new Codex task:

1. Open `E:\begapunk-site-v2\PROJECT_HANDOFF.md`.
2. Inspect current Git branch, latest commits, status, and remote tracking state.
3. Read the audit report for the area being changed.
4. Confirm whether the latest local commit has been pushed and deployed.
5. Continue only after separating existing user changes from the new task scope.

## 11. Next Recommended Action

The latest product-parameter and contact-page commits should be treated as local source changes until deployment is explicitly requested and verified. Before the next production update, compare the live site against the intended commit, create a clean release package, back up the server, deploy through staging, and test the inquiry mail flow end to end.

## 12. New-task Resume Prompt

Use this at the start of a new conversation:

> Continue the Begapunk website project. The local source of truth is `E:\begapunk-site-v2`. Read `PROJECT_HANDOFF.md`, then check Git status, current branch, latest commit, and remote tracking state before doing anything. Preserve all existing untracked `catalog-project/` files. Do not deploy or alter the server unless I explicitly request it.
