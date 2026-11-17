# Begapunk Website Project Handoff

> Historical pre-consolidation snapshot retained for recovery evidence. It is not the current project entry point and must not define current priorities, route counts, release severity, required next actions, or authorization. Use PROJECT_HANDOFF.md and docs/standards/README.md.

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
- Submission: the form has a native `POST` action to `/send_inquiry.php`; page JavaScript progressively enhances it with `fetch` and `FormData` when those APIs are available.
- AJAX negotiation: enhanced submissions send `Accept: application/json`. The JSON response retains `success` and `message` and adds a stable `code`.
- Native response: successful non-AJAX submissions receive a fixed language-specific `303` redirect to `/thank-you.html`, `/de/thank-you.html`, `/ja/thank-you.html`, or `/ru/thank-you.html`; failures receive a minimal localized HTML page with the original HTTP error status.
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
- `quantity`
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

The HTML also retains the hidden `redirect` field for compatibility, but `send_inquiry.php` does not read it or use it for navigation.

`quantity` is optional free text with a 100-character limit. Native and AJAX submissions both carry it through the same multipart form contract; the mail summary omits the row when it is empty and escapes it through the shared row renderer when present.

Supported RFQ context parameters are `request`, `model`, `product`, `application`, legacy `inquiry_type`, and `source`. A valid `request` takes precedence over legacy `inquiry_type`; unknown values fall back to `general_inquiry`. Stable internal inquiry codes are `quote`, `3d_step`, `application_review`, `seal_review`, `verified_drawing`, `technical_consultation`, and `general_inquiry`. User-visible labels remain localized and are not used as machine classifications.

`source` is accepted only as a same-site relative `.html` path with no scheme, protocol-relative prefix, backslash, or dot segment. The browser and server derive `source_url` from that validated path; submitted `source_url` text is never trusted as a navigation target.

The local Node contract validator statically checks selected DOM, mapping, fixed-path, and security-order contracts. It does not execute PHP, so that validator alone does not establish PHP syntax, runtime responses, SMTP behavior, or mailbox delivery. Separately authorized runtime evidence is recorded below; any real submission or delivery test still requires separate authorization.

### Contact multilingual generation contract - 2026-08-16

- The Contact body, `script#contact-rfq-copy` localization data, and executable RFQ behavior script are owned by the Contact generation contract. The read-only `--mode verify-contact` path regenerates those regions in memory and compares them exactly after normalizing only line endings and outer whitespace.
- Header and Footer markup are owned by the separate navigation synchronization system and are intentionally outside the RFQ generation gate; no other RFQ selector or content is ignored.
- A repository-external diagnostic build on 2026-08-16 found pre-existing whole-page non-idempotence in 47 translation-managed pages per target language, totaling 141 non-Contact HTML files. None of those pages was synchronized or modified during the Contact RFQ generation work.
- Until that wider builder and navigation ownership debt is separately governed, do not run the generic `i18n:build` command against the repository to overwrite the current localized pages. The observed whole-page drift does not mean that German, Japanese, or Russian RFQ dynamic prompts fell back to English; the Contact-owned-region gate verifies those localized prompts independently.

### Phase 1B/1D isolated PHP runtime validation - 2026-08-14

- The current local PR-quality and deployment workflows define an independent `ubuntu-24.04` PHP matrix for the supported `8.2` and `8.3` minor branches. The existing quality or deployment job has `needs: inquiry-php`, so either PHP matrix failure blocks the downstream job.
- The PHP setup action is pinned to the full commit SHA for `shivammathur/setup-php` 2.37.2. This pins the action code, not the runner image or the PHP patch release installed within each minor branch; the verifier separately requires the actual runtime minor to match the matrix value.
- The verifier copies only `send_inquiry.php` into a unique system-temporary site, does not copy or read the repository or production `.env`, and does not copy `PHPMailer/`.
- Both the PHP test server and the SMTP trap bind only to `127.0.0.1`. SMTP settings used by the guarded validation cases point only to the loopback trap, and the verified SMTP connection count was zero.
- The verified scope is PHP 8.2/8.3 syntax plus nine selected pre-mail error responses per runtime, covering HTTP 405, 403, 400, 422, and 503. The ninth case verifies that an optional `quantity` value over 100 ASCII characters returns `422 field_too_long` before PHPMailer or SMTP.
- Local isolated runs used official Windows NTS builds PHP `8.2.33` and `8.3.33`; both passed 9/9 cases and each recorded zero SMTP connections. Temporary PHP packages and test roots were removed after verification.
- Production was observed running PHP `8.2.28` on 2026-08-14. The CI matrix establishes current 8.2-minor compatibility but is not an exact reproduction of that production patch, Nginx, or PHP-FPM configuration.
- The current Inquiry contract validator is deliberately independent of Hero and CNC-case gates. It verifies the Contact/PHP/package contract immediately before `discovery:verify`; the CNC case remains covered by its own generator check.
- Success responses 200/303, PHPMailer sending, SMTP TLS or authentication, and mailbox receipt are not exercised by the isolated CI test. Production evidence for one separately authorized transaction is recorded below; CRM handling, UTM handling, inquiry numbering, and future availability remain unverified.

### Phase 1C authorized production mail-path verification - 2026-08-14

- Production inspection confirmed PHP CLI and the active PHP-FPM branch at `8.2.28`.
- One explicitly authorized test inquiry was submitted through the current public Contact page. `/send_inquiry.php` returned HTTP 200 JSON success, the browser showed the success state, and the exact unique test marker was found in the actual `sales@begapunk.com` mailbox.
- This is evidence that the then-live legacy page, endpoint, SMTP path, and recipient mailbox completed that one transaction. It does not establish ongoing availability or CRM-qualified conversion.
- The live Contact page observed during that test still used the older JavaScript-required submission contract and older JSON response. The local native-POST fallback, stable result codes, four-language server responses, and dual-version CI described above were not deployed by Phase 1C.
- No production file or configuration was changed during the inspection and test. The message was not replied to, forwarded, or deleted; opening it may have marked it as read.

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
2. Run HTML, JSON-LD, JavaScript, link, resource, responsive, and `git diff --check` validation. Also complete the availability, laboratory-performance, resource-budget, and visual evidence required by `docs/WEBSITE_EXPERIENCE_STANDARD.md`.
3. Build a clean release package that excludes Git metadata, audit-only material, local backups, logs, temporary files, and `catalog-project/` unless specifically needed.
4. Back up the current production document root to a dated path outside the live root.
5. Preserve production-only files and runtime state, especially `.env`, `PHPMailer/`, and `.well-known/` where applicable.
6. Upload to a staging release directory first, inspect it, then switch or copy into the live root using a rollback-safe procedure.
7. Verify homepage, products, contact page, CSS/JS/images, sitemap/robots, redirects, and the inquiry endpoint.
8. Perform a real mail test only with the user's approval and confirmation of receipt.
9. Record the deployed commit, deployment time, backup path, and verification result in a new audit report.

## 9. SEO and GEO Baseline

- Preserve canonical URLs, metadata, Open Graph, Twitter metadata, JSON-LD, sitemap, robots, internal links, and legacy redirects during page work.
- Treat machine translation as draft content only. After adding or changing any localized page, complete and record an AI-assisted target-market localization review covering local industrial terminology, natural reading patterns, search vocabulary and intent, metadata, calls to action, and structured-data text.
- Use representative target-country manufacturer, industry, and peer pages only as terminology, reading-pattern, and search-intent references. Do not copy their wording or import their product claims, parameters, certifications, or customer evidence into Begapunk content.
- A recorded AI-assisted target-market line-by-line localization review is the required and sufficient editorial release gate. Independent native-speaker or human editorial sign-off is optional and is not a release blocker. Keep the evidence status explicit and never describe AI-only work as native-speaker, human, or professional translation approval.
- The 27-question FAQ is a manually localized controlled page, not a generic translation-cache page. Maintain German, Japanese, and Russian source copy in `i18n/manual/faq-*.json`; run `npm run faq:i18n:sync` after an approved English fact change and require `npm run faq:i18n:verify` before PR or deployment checks. Never run the generic translation builder as a substitute for the recorded target-market line-by-line FAQ review.
- Do not add unsupported certifications, guarantees, fixed response times, absolute quality claims, or invented engineering data.
- Product facts must follow approved drawings and evidence records.
- Existing GEO and claim-remediation records are under `audit/geo-audit/`, `audit/geo-remediation/`, and `audit/fact-resolution/`.
- Existing release and technical-repair records are under `audit/technical-repairs/`.

## 9A. Website Experience Contract

- `docs/WEBSITE_EXPERIENCE_STANDARD.md` is the mandatory source of truth for UI consistency, B2B page-family structure, responsive/accessibility behavior, multilingual presentation, page availability, and page performance. Read it before adding a page, changing shared UI/CSS, preparing a release, or evaluating production acceptance.
- Keep static HTML as the public output unless a separately approved business case justifies a platform migration. Do not add a generic theme or framework merely to make the site look consistent.
- New and changed pages must use the approved page family, design tokens, shared components, CTA hierarchy, and four-language validation matrix. Existing inline/page-specific styles are migration debt and must not increase without a recorded exception.
- Treat "can open" and "opens quickly" as separate release gates. Unexpected timeout, 4xx/5xx, soft 404, blank/error content, missing critical same-origin resources, or blocked navigation/RFQ is an immediate release failure.
- Record laboratory performance, resource-budget, availability, and post-deployment evidence under `audit/website-experience/`. Real-user targets are p75 LCP <= 2.5 s, INP <= 200 ms, and CLS <= 0.10; missing field data is not a pass.
- The current repository does not yet automate every requirement in the experience standard. Until automation is implemented and verified, complete and record the required manual checks; never claim an unmeasured or unimplemented check passed.

### UI-B1 product-detail progressive-enhancement contract - 2026-08-16

- The 16 product models across English, German, Japanese, and Russian (64 pages) share `css/product-detail.css`, deferred `js/product-detail.js`, localized UI labels in `i18n/manual/product-detail-ui.json`, and the source-text synchronizer `scripts/sync-product-detail-ui.mjs`. The synchronizer preserves each file's original line endings and does not perform whole-page serialization.
- Product-detail source markup is intentionally fail-open: four ordinary fragment-link tabs target four initially visible panels, five FAQ items use open native `details`, and three thumbnail links open their full-size images. JavaScript enhances a feature only after its complete expected structure is validated; failed validation leaves the corresponding source content and native controls usable.
- Each page has one localized skip link and one `main#main-content`. Header, Footer, and the floating inquiry control remain outside `main`; the Header and Footer continue to be owned by the separate navigation synchronization system and were not rewritten by UI-B1.
- Search generation excludes only the exact UI-only selector `a.skip-link[data-search-exclude][href="#main-content"]`; it does not treat arbitrary `data-search-exclude` elements as hidden content. The four tracked search-index files remain generated artifacts and were not rewritten by UI-B1.
- The only UI-B1 change to the generic localized builder is adding `summary` to the primary translation selector so existing FAQ-question translation IDs remain stable. UI-B1 did not run the generic `i18n:build` command.
- `product-ui:verify` runs immediately before `products:validate` in both `quality:pr` and `deploy:prepare`. As of 2026-08-16, these changes remain local and unstaged; they have not been committed, pushed, or deployed.

### UI-B1C product-detail generation closure - 2026-08-16

- `scripts/build-localized-site.mjs` now treats the direct product skip link and the two product-region `aria-label` values as the three exact fields owned by `i18n/manual/product-detail-ui.json`. It does not exclude the surrounding product content from generic translation.
- `--mode verify-product-ui-generation` performs the full translation-coverage preflight, generates 16 products for DE/JA/RU in memory, and compares 144 controlled values with the current 48 localized product pages without writing files. `product-ui:verify` runs both the 64-page source synchronizer check and this 48-page generation check.
- The prior product-only build preflight gap was 144 items: 16 products × 3 target languages × the three controlled UI values. The generation gate now reports zero missing items for this page family.
- Product Tab history now returns to the default Specifications panel when navigation returns to an empty or non-panel hash. No product HTML, Search Index, localization Catalog/Cache/Editorial data, CSS, product facts, or resource version was changed by UI-B1C.
- At UI-B1C completion, real 200% browser zoom and Lighthouse evidence were still pending; the later release-performance section closes the Lighthouse item. Real 200% zoom and the duplicate first/second BP-8P thumbnail asset remain separate release-before or content follow-up items. UI-B1C does not authorize a commit, push, or deployment.

### Localization release-safety gate - 2026-08-17

- The generic `i18n:build`, `i18n:refresh-metadata`, and `i18n:integrate` write modes now refuse any output root inside the source repository after canonical-path resolution. Use an explicit external `I18N_OUTPUT_ROOT` for diagnostic generation; never point those commands back at the reviewed localized source pages.
- `i18n:metadata:verify` is the source-tree read-only release gate. It checks 48 managed routes across DE/JA/RU (144 pages), the three localized Search Index files, and the three localized `llms.txt` files without writing. `deploy:prepare` runs this gate instead of a metadata refresh.
- This safety control does not resolve the older 141-page whole-page non-idempotence. It prevents that debt from silently overwriting reviewed pages and leaves Header/Footer ownership for a separate task.
- Detailed evidence: `audit/website-experience/2026-08-17-i18n-release-safety.md`.

### Local release experience and Lighthouse gate - 2026-08-17

- `release:experience:verify` runs after the production package is built in both `quality:pr` and `deploy:prepare`. It serves the package on loopback, checks all 221 HTML pages plus critical same-origin resources, requires a Contact/RFQ path outside the approved legacy recovery page, and enforces the compressed resource budgets in `docs/WEBSITE_EXPERIENCE_STANDARD.md`.
- The deployment workflow has a separate Lighthouse job with no production environment or deployment secrets. It installs the allowlisted Chrome for Testing archive, builds the candidate, and runs the four-language performance matrix; the production job depends on both this job and the PHP matrix.
- Final local evidence used Lighthouse 13.4.1 and Chrome for Testing 152.0.7977.42: 32 routes, 72 runs, minimum score 97, maximum median LCP 2,110.5 ms, FCP 1,659.8 ms, TBT 20.0 ms, and CLS 0.08383. Home is now part of the three-run critical median set. All strict thresholds passed with no tolerance or waiver.
- Real 200% zoom, externally reachable preview/production full-sitemap checks, geographic uptime, and real-user p75 data remain explicit open gates. Local success is not deployment authorization.
- Detailed evidence: `audit/website-experience/2026-08-17-release-experience-and-performance.md` and `audit/website-experience/2026-08-16-lighthouse-release-performance.json`.

### Editorial evidence reconciliation - 2026-08-17

- The approved DE/JA/RU Manufacturing, Production Inspection, BP-2P-95 case, and BP-3P-S06 case wording was reconciled into the current UI and metadata candidate without restoring older Header/Footer or cache output.
- The current content contract matches 13/13 accepted sources, and the current candidate passed 36/36 new render checks across the three languages, six routes, and 1440/390 widths. The governed cumulative status is 55 reviewed pages per language and 330 viewport checks.
- Review method remains `AI-assisted target-market line-by-line localization review`; there is no independent native-speaker sign-off. The expired historical release approval remains unchanged and is not a deployment authorization.
- Detailed evidence: `audit/localization/2026-08-17-editorial-evidence-reconciliation.md`.

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
