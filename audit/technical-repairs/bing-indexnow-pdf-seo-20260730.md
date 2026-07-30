# Bing indexing, IndexNow, redirect, and PDF metadata repair

Date: 2026-07-30 (Asia/Tokyo)

## Scope

- Review Bing Webmaster Tools search, sitemap, index, backlink, SEO report, AI performance, and IndexNow status.
- Repair the legacy product URL that still receives Bing impressions but returns HTTP 404.
- Add secret-backed IndexNow notifications to the immutable GitHub Actions deployment.
- Replace weak or privacy-leaking metadata in every public PDF without changing rendered content.

## Bing evidence before repair

- Search performance (three months): 466 impressions and 37 clicks.
- The `site:begapunk.com` query accounted for 317 impressions and 27 clicks, so most measured activity was site-owner/index checking rather than non-brand discovery.
- Bing Site Explorer: 127 indexed URLs, 0 crawl errors, 30 warnings, and 6 excluded URLs.
- All three submitted sitemaps were successful; no sitemap errors or warnings were reported.
- Bing reported only one referring domain and one backlink.
- The legacy URL `/3-in-3-out-Pneumatic-rotary-joint-P6776400.html` had 11 impressions, one click, and an average position near 5, but returned HTTP 404.
- The four HTML pages reported as `Title too long` now have production titles of 52, 59, 54, and 60 characters. The Bing report predates the current titles.
- All 16 URLs reported as `title too short` were PDF downloads rather than HTML pages.

## Verified redirect mapping

The legacy page's three product images are byte-identical to the BP-3P-0004 product images:

| Legacy asset | BP-3P-0004 asset | SHA-256 |
| --- | --- | --- |
| `images/3-in-3-out01-rotary-joint.png` | `images/products/BP-3P-0004-1.png` | `6E14EDC6E29586322CC4F6712944A7E443E1E15EE151901EC3F7D4132ED78832` |
| `images/3-in-3-out01-rotary-joint2.png` | `images/products/BP-3P-0004-2.png` | `7CC70A567E8DA71AAFE71FD1A9116EDB47654B5B6F8F9FE3BFC1693D58639CF5` |
| `images/3-in-3-out-rotary-joint-1.png` | `images/products/BP-3P-0004-3.png` | `233BA122E80F261BA9D4253FAB606F469C5010184ABCA39F84063A42D240A3C3` |

The managed Nginx rule therefore redirects the old URL to `/BP-3P-0004.html` rather than to the homepage or generic product catalog.

The deployment account did not have non-interactive `sudo` permission during the first deployment attempt. The release therefore also contains a canonical/meta-refresh compatibility page at the legacy path. The workflow uses this safe fallback when it cannot install the Nginx rule and automatically upgrades to a verified HTTP 301 when the server grants the installer permission.

## IndexNow design

- The ownership key is stored only as the GitHub Secret `INDEXNOW_KEY`.
- The workflow creates `${INDEXNOW_KEY}.txt` inside the immutable release and adds its checksum to `manifest.sha256`.
- URL notifications are derived from changes since the server's currently active immutable release, not merely the preceding tag.
- Only production HTML/PDF URLs and verified redirect source/target URLs are eligible.
- The submission script refuses non-HTTPS or non-`www.begapunk.com` URLs, deduplicates the list, enforces the 10,000 URL protocol limit, and accepts only HTTP 200/202 responses.
- IndexNow is a discovery notification and is not treated as a ranking or indexing guarantee.

## PDF metadata repair

- Updated all 22 public PDFs, not only the 16 currently listed by Bing.
- Removed the local Windows username from PDF Author fields.
- Added descriptive Title, Author, Subject, Keywords, Creator, and Producer metadata.
- Page counts, MediaBox values, and extracted page text fingerprints were checked before replacement.
- Rendered all 48 pages before and after the metadata rewrite at 72 DPI.
- Before/after PNG hashes were identical for all 48 pages (`RENDER_DIFFERENCE_COUNT=0`).
- Visually inspected the catalog cover, installation manual, and BP-3P-0004 engineering drawing after the rewrite; no layout defects were found.

## Validation before deployment

- `npm ci`: 0 vulnerabilities.
- Localized verification: passed for 204 pages.
- Production release: 624 public files plus `manifest.sha256`.
- Deployment validation: passed for 204 HTML files and 625 total release files.
- IndexNow full-sitemap preparation test: 192 unique canonical URLs.
- IndexNow empty-change test: skipped safely without a network submission.
- JavaScript syntax and Python compilation checks: passed.
- `git diff --check`: passed after marking PDFs as binary in `.gitattributes`.
- Protected `catalog-project/` files were not modified or staged.

## Deployment result

- First workflow run `30507287402` stopped before release activation because the deployment account could not run the Nginx installer with non-interactive `sudo`. Existing production remained active.
- Follow-up workflow run `30507600865` deployed successfully with the canonical/meta-refresh fallback. Homepage and legacy URL checks passed.
- That run exposed a second workflow defect: it compared against the failed deployment tag and therefore sent only one IndexNow URL (HTTP 202). The workflow now resolves the active server release commit and includes a one-time 24-URL catch-up list.
- Final catch-up deployment and live verification: pending.
