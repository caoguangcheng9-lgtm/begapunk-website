# Begapunk Technical Hardening Audit Report

**Audit date:** 2026-07-31

**Repository:** `E:\begapunk-site-v2`

**Branch:** `main`

**Audited HEAD:** `9b785e5` (`Harden public claims and release safeguards`)

**Status at audit completion:** Pre-commit working-tree snapshot; at that point the changes had not been committed, pushed, or deployed. Aida subsequently returned `Result: PASS` and authorized the pull-request submission process.

## 1. Audit scope and task objectives

This report covers the five requested technical-hardening tasks:

1. Remove the duplicate legacy cookie-consent system and retain one consent implementation.
2. Synchronize the English, German, Japanese, and Russian privacy policies with the actual PHP inquiry handler and GA4 consent/measurement implementation.
3. Add a product-data consistency validator covering product detail pages, catalogs, search indexes, JSON-LD, and sitemaps.
4. Add a pull-request quality workflow that runs the project validation and release checks.
5. Fix the confirmed small SEO, Schema.org, and security issues: founder schema, duplicate favicon declarations, missing `noopener noreferrer`, and the remote Fuse.js dependency.

The existing untracked `catalog-project/` directory is user-owned work outside this audit and was not modified.

## 2. Modification statistics

### 2.1 Working-tree files

Implementation changes before adding this report:

- **205 tracked files modified**
- **786 tracked-line additions**
- **1,099 tracked-line deletions**
- **5 implementation files added**
- **1 audit report added** (this file)

Tracked-file breakdown:

| File type | Modified files |
|---|---:|
| HTML | 196 |
| JSON | 5 |
| MJS | 2 |
| CSS | 1 |
| JS | 1 |
| **Total** | **205** |

Path breakdown:

| Area | Modified tracked files |
|---|---:|
| English root/configuration | 51 |
| German (`de/`) | 50 |
| Japanese (`ja/`) | 50 |
| Russian (`ru/`) | 50 |
| Scripts | 2 |
| CSS | 1 |
| JavaScript | 1 |
| **Total** | **205** |

New implementation files:

- `.github/workflows/pr-quality.yml`
- `scripts/validate-product-data.mjs`
- `scripts/validate-source-quality.mjs`
- `js/vendor/fuse.min.js`
- `js/vendor/fuse.LICENSE.txt`

### 2.2 Cookie-consent removal

- **8 legacy cookie-banner HTML instances removed**:
  - `index.html`, `404.html`
  - `de/index.html`, `de/404.html`
  - `ja/index.html`, `ja/404.html`
  - `ru/index.html`, `ru/404.html`
- **8 legacy inline JavaScript/localStorage handlers removed**.
- **2 obsolete CSS rule groups removed**: the base cookie-bar rules and the mobile cookie-bar rules.
- The obsolete storage key `cookiesAccepted` was removed.
- The canonical consent implementation in `js/analytics.js`, using `begapunk_cookie_consent`, remains the sole consent system.

### 2.3 Privacy-policy synchronization

Modified privacy-policy files:

- `privacy.html`
- `de/privacy.html`
- `ja/privacy.html`
- `ru/privacy.html`

The four policies now describe the current implementation:

- Actual inquiry fields and source-page metadata processed by `send_inquiry.php`.
- Optional PDF, STEP/STP, IGES/IGS, DWG, DXF, JPG/JPEG, and PNG attachments up to 10 MB.
- IP-derived one-way hash and recent attempt timestamps used for the 15-minute rate-limit window.
- PHPMailer delivery through authenticated SMTP to the configured sales mailbox.
- No website database record intentionally created for inquiry fields or attachments.
- Temporary attachment handling and no intentional separate persistent server copy.
- Consent state stored in `localStorage` under `begapunk_cookie_consent`, with a 365-day application-level expiry.
- GA4 loaded only after analytics consent; denial prevents GA4 loading and removes accessible GA cookies.
- GA4 events actually emitted by the site, while excluding names, email addresses, companies, countries, free-text requirements, and attachments from the site's GA4 event payloads.
- Google Signals and advertising personalization disabled in the site implementation.
- Analytics retention described as controlled by the current GA4 property configuration instead of an unsupported fixed period.

Stale references to FormBold, phone-number collection, fixed 14/26-month analytics retention, and unsupported exact inquiry/order retention periods were removed or corrected.

### 2.4 Product-data validator coverage

`scripts/validate-product-data.mjs` covers:

- **16 product models**.
- **4 languages**: English, German, Japanese, and Russian.
- **64 product detail pages** (16 models × 4 languages).
- Title, H1, canonical URL, and `og:url` consistency.
- Product JSON-LD count and validity.
- Product `sku`, `mpn`, stable product `@id`, localized `url`, product name, additional properties, and visible model table row.
- **8 catalog pages**: `products.html` and `products-p2.html` in four languages.
- **4 search indexes**: one per language.
- English and multilingual sitemap `loc` coverage.
- Missing, duplicate, or unexpected product references.

Current result: **passed for 16 models across 4 languages**.

### 2.5 PR quality workflow

`.github/workflows/pr-quality.yml` adds:

- Trigger on pull requests targeting `main`.
- Read-only `contents` permission.
- Per-PR concurrency with cancellation of superseded runs.
- Ubuntu runner and a 20-minute timeout.
- `actions/checkout@v7.0.1`.
- `actions/setup-node@v7.0.0` with Node.js 24 and npm caching.
- Reproducible dependency installation with `npm ci`.
- `npm run quality:pr`, which runs localization, product, source-quality, production-build, public-claim, and deployment-package validation.
- A final clean-tree check that fails when generated assets differ from the committed version or unexpected untracked files are produced.

`package.json` also adds `products:validate`, `quality:source`, and `quality:pr`, and includes the new validators in `deploy:prepare`.

The workflow file is locally reviewed, but it cannot have a real GitHub Actions run until the changes are later committed, pushed, and opened or updated in a pull request.

### 2.6 Schema.org fixes

- **4 Organization schemas fixed**: `about.html`, `de/about.html`, `ja/about.html`, and `ru/about.html` now use the Schema.org `founder` property instead of the nonstandard `founders` property.
- The localized-site builder and verifier were updated to use and validate `founder`.
- **3 localized homepage founder job titles refreshed** in German, Japanese, and Russian.
- Founder entries are validated as named `Person` objects.

### 2.7 Favicon fixes

- **4 duplicate favicon declarations removed**, one each from:
  - `index.html`
  - `de/index.html`
  - `ja/index.html`
  - `ru/index.html`
- Each affected page now has one favicon declaration; Apple touch icons remain separate and are not counted as duplicates.

### 2.8 `noopener noreferrer` fixes

**638 new-window links** were upgraded to include both `noopener` and `noreferrer`.

External-link classification (**582 external links**):

| Type | Links fixed |
|---|---:|
| WhatsApp (`wa.me` and `api.whatsapp.com`) | 292 |
| LinkedIn | 92 |
| X/Twitter | 92 |
| Facebook | 92 |
| ISO references | 8 |
| Google privacy-policy links | 4 |
| SMRP reference | 1 |
| NFPA reference | 1 |
| **External subtotal** | **582** |

Same-site links opened in a new tab:

| Type | Links fixed |
|---|---:|
| `begapunk.com` new-window links | 56 |

**Grand total: 638 links.**

### 2.9 Fuse.js migration

- Removed the runtime request to `https://unpkg.com/fuse.js@7.0.0/dist/fuse.min.js`.
- Added exact dependency `fuse.js@7.0.0` to `package.json` and `package-lock.json`.
- Added local runtime asset `js/vendor/fuse.min.js` (**23,850 bytes**).
- Added upstream license `js/vendor/fuse.LICENSE.txt` (**11,343 bytes**).
- Updated `js/search.js` to resolve the local asset relative to its own script URL, so root and localized pages use the correct path.
- Confirmed the generated production release contains `dist/production/js/vendor/fuse.min.js`.

## 3. Validation commands and results

### 3.1 Required final commands

#### `npm run deploy:prepare`

**Result: PASS**

This command completed all included stages:

- Refreshed metadata and structured data for 51 German, 51 Japanese, and 51 Russian pages.
- Localization verification passed for 204 pages.
- Product validation passed for 16 models across 4 languages.
- Source-quality validation passed for consent, privacy, schema, favicon, external-link, and local-dependency checks.
- Production release built locally with 614 files; 14 forbidden backup, draft, or quarantined download paths were excluded.
- Public-claim verification passed across 454 source, localized, download, i18n, and production text files.
- Deployment-package validation passed for 205 HTML files, 615 total release files, and 24 verified public downloads.

#### `npm run i18n:verify`

**Result: PASS** — localized site verification passed for 204 pages.

#### `npm run claims:verify`

**Result: PASS** — public-claim verification passed across 454 files; protected technical references such as ISO VG 32 and ISO 228-1 remained allowed.

#### `npm run deploy:validate`

**Result: PASS** — 205 HTML files, 615 total release files, and 24 public downloads verified in the local production package.

### 3.2 Additional checks completed during implementation

- `npm run quality:pr`: **PASS**.
- JavaScript/MJS syntax checks for the modified search and validation scripts: **PASS**.
- `npm audit --omit=dev`: **0 known vulnerabilities**.
- `git diff --check`: **PASS**; Git displayed non-blocking Windows CRLF conversion advisories only.
- Local Fuse.js presence in the production release: **PASS**.

## 4. Unresolved or intentionally deferred items

1. **Pull-request review remains pending.** Aida's pre-commit final review returned `PASS`; a new Aida review is still required after the pull request is created.
2. **GitHub Actions had not run remotely at audit completion.** Only local equivalent checks had run at the time this pre-commit report was generated.
3. **No live-site health check was performed.** The website was not deployed as part of this audit.
4. **No live inquiry email was sent.** The privacy-policy review compared the documented behavior with the current PHP/GA4 code; it did not retest SMTP delivery or mailbox receipt.
5. **Windows line-ending advisories remain.** They are non-blocking and `git diff --check` reports no whitespace errors, but repository-wide line-ending normalization was intentionally kept outside this task.
6. **`catalog-project/` remains untracked and untouched.** It is excluded from the implementation and audit statistics.

## 5. Pre-commit audit-state and non-deployment declaration

At the time this pre-commit audit was completed:

- No commit had been created for these changes.
- No branch or tag had been created for these changes.
- No push had been performed.
- No pull request had been created or updated.
- No server connection or server-side file change had been made.
- No production deployment had been performed.
- `dist/production` had been generated and validated locally only.
- Repository HEAD was `9b785e5`, and all audited changes remained in the local working tree awaiting Aida's final pre-commit review.

This report does not authorize deployment. The subsequent submission process is limited to a feature-branch commit, push, and pull request; merge and deployment remain prohibited pending further review and owner approval.
