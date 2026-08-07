# Laser Tube Rear-Chuck Application — Verified Models and Evidence Boundary

Date: 2026-08-07 (Asia/Tokyo)

Branch: `feature/bp-2p-95-application-case`

Baseline: `ac3571bd8c8b1eb0197c05499ba458fc9349d0ae`

Status: local source revision and validation only; not pushed, merged, packaged, or deployed

This record supersedes the model-neutral application-category wording in `case-center-reacceptance-20260807.md`. It does not supersede that report's photographic privacy controls or its statement that the two photographs are not individually matched to product models.

## 1. Factory confirmation and evidence boundary

`Evidence source: Begapunk factory confirmation supplied by the project owner on 2026-08-07. Application category and models are confirmed; photograph-to-model identification is not confirmed.`

Confirmed facts:

- `BP-3P-0004` has actual application experience in pneumatic rear-chuck circuits on laser tube cutting machines.
- `BP-2P-08-0001` has actual application experience in pneumatic rear-chuck circuits on laser tube cutting machines.
- The approved application scope for these two standard models is compressed-air supply between the stationary and rotating sides of the rear chuck.
- The two workshop photographs document the same application category.
- The photographs are separate installation records and are not represented as two views of one machine.

Evidence limits retained in every language:

- Neither photograph is identified as `BP-3P-0004`, `BP-2P-08-0001`, or any other individual model.
- The photographs do not establish passage count, passage assignment, port function, pressure, speed, temperature, lifetime, leakage, customer acceptance, or operating performance.
- The pages do not associate either standard pneumatic model with oxygen, nitrogen, cutting-assist gas, process gas, or coolant transfer.
- `BP-3P-0004` may be described as a three-passage model and `BP-2P-08-0001` as a two-passage model because those are existing approved product facts. Final passage assignment and all operating and mounting conditions still require review against the chuck drawing.

## 2. Public-content changes

### Case centers

The English, German, Japanese, and Russian case centers now present:

1. the documented `BP-2P-95-0001` pneumatic-chuck installation;
2. the photo-supported laser tube cutting rear-chuck installation category;
3. a use guide;
4. two engineering selection examples.

The laser case links `BP-3P-0004` and `BP-2P-08-0001` as confirmed application-category models while stating that the photographed products have not been individually identified. Related products are split into:

- three models used in real applications: `BP-2P-95-0001`, `BP-3P-0004`, and `BP-2P-08-0001`;
- two reference models used only in engineering selection examples: `BP-2P-130-0001` and `BP-2P-30-0001`.

`BP-2P-0001` is no longer presented as a related product for this case center.

### Product pages

Eight product pages now include a verified rear-chuck application entry for the appropriate model and language. Each entry links to the localized case section and localized laser-tube application page, and preserves the photograph-to-model boundary. Existing specification tables were compared with the baseline and were not changed.

### Laser tube cutting application pages

The four application pages are now limited to pneumatic rotary supply for compressed-air circuits on rear chucks. The previously mixed treatment of rear-chuck pneumatics, cutting-assist gases, coolant, unsupported operating ranges, and unrelated recommended models was removed. A separate safety boundary states that process or assist-gas transfer is outside the verified scope and requires a separately engineered, cleaned, tested, and approved system; that safety section recommends no standard product.

### Discovery metadata

- Four language search indexes, four `llms.txt` entries, SEO sources, page metadata, OG/Twitter text, and JSON-LD share the same evidence boundary.
- `sitemap.xml` and `sitemap-i18n.xml` keep their URL sets and ordering; only the affected modification dates were synchronized to 2026-08-07.
- Canonical and hreflang coverage remains unchanged.

## 3. Localization terminology and sources

| Language | Preferred terms used in this scope | Evidence/source | Review note |
|---|---|---|---|
| German | `Drehdurchführung`, `Betriebsdruck`, `Anzahl der Pneumatikkreise`, `Zu bestätigende Bestellausführung` | https://www.deublin.eu/drehdurchfuehrungen ; https://fluidhandling.kadant.com/de/produkte/drehdurchfuehrungen/standard-drehdurchfuehrungen | Industrial terminology and sentence structure were reviewed internally; no external native-language sign-off is claimed. |
| Japanese | `ロータリジョイント`, `空圧回路`, `最高回転数`, `連続運転回転数`, `取付部の仕様` | https://www.sealtech.co.jp/products/rotodisk.html ; https://www.rix.co.jp/products_services/products/category/rotary/post_6/ | `ロータリジョイント` is the project-owner-approved spelling for this task's affected pages. No external native-language sign-off is claimed. |
| Russian | `ротационное соединение`, `пневматический контур`, `частота вращения`, `присоединительные размеры`, `проверяемый параметр` | https://rotaryjoint.ru/products/ ; https://feedsystems.ru/products/rotatsionnoe-soedinenie/ | Industrial terminology and sentence structure were reviewed internally; no external native-language sign-off is claimed. |

The localized pages were not generated by mirroring English sentences line by line. High-confidence terminology and syntax corrections were applied only within the affected case, application, product, SEO, search, and AI-discovery records.

## 4. Modified files

Public pages and styles:

- `case-studies.html`
- `de/case-studies.html`
- `ja/case-studies.html`
- `ru/case-studies.html`
- `application-laser-tube-cutting.html`
- `de/application-laser-tube-cutting.html`
- `ja/application-laser-tube-cutting.html`
- `ru/application-laser-tube-cutting.html`
- `BP-3P-0004.html`
- `BP-2P-08-0001.html`
- `de/BP-3P-0004.html`
- `de/BP-2P-08-0001.html`
- `ja/BP-3P-0004.html`
- `ja/BP-2P-08-0001.html`
- `ru/BP-3P-0004.html`
- `ru/BP-2P-08-0001.html`
- `css/case-studies.css`

Persistent localization and discovery sources:

- `i18n/seo/de.json`
- `i18n/seo/ja.json`
- `i18n/seo/ru.json`
- `search-index.json`
- `de/search-index.json`
- `ja/search-index.json`
- `ru/search-index.json`
- `llms.txt`
- `de/llms.txt`
- `ja/llms.txt`
- `ru/llms.txt`
- `sitemap.xml`
- `sitemap-i18n.xml`

Validation and audit:

- `scripts/verify-localized-site.mjs`
- `audit/application-cases/laser-tube-verified-models-20260807.md`

## 5. Automated validation

- `npm run i18n:verify`: PASS — 52 pages per language, 208 pages total.
- `npm run products:validate`: PASS — 16 product models across four languages, including catalog, search, JSON-LD, and sitemap consistency.
- `npm run quality:source`: PASS.
- `npm run claims:verify`: PASS — 462 checked source, localized, download, i18n, and production text files.
- `npm run quality`: PASS, including the repository's temporary deployment-tree validation. No release archive, tag, upload, or deployment was created.
- Product specification table comparison against `ac3571b`: PASS; all eight affected product specification tables are unchanged.
- Targeted fact-boundary scan: PASS — 20 affected pages, zero failures.
- JSON-LD parsing: PASS on all 20 affected pages.
- Local link and image checks: PASS; no failed images in the browser checks.
- Public image metadata: PASS — both WebP derivatives have no EXIF, GPS, XMP, IPTC, or ICC metadata.
- Two consecutive `i18n:refresh-metadata` runs: deterministic; Git diff hash remained `7d483894d2cfa3e06363d1a89e00b676ff2db3f2`.
- `git diff --check`: PASS after audit creation and immediately before staging.

## 6. Browser acceptance

The local site was served over HTTP and checked at 1440, 1024, 900, 768, 430, and 390 CSS pixels.

- Horizontal overflow: none at all six widths.
- Desktop navigation: four dropdowns present; Products dropdown visibly opens on hover.
- Responsive navigation: menu opens as a single-column navigation at 1024 px and below.
- Real case order: `BP-2P-95-0001`, then the laser rear-chuck application.
- Laser overview image: 4:3 source and container; the rotary-union subject remains visible.
- Laser detail image: `object-fit: contain`; the 3:4 source is not cropped at any tested width.
- Confirmed application products: three columns at desktop, two at tablet, one at phone.
- Selection-example products: two columns at desktop/tablet, one at phone.
- Footer: rendered at every tested width.
- Console warnings/errors: 0 in both the responsive run and Chrome keyboard run.
- FAQ: actual Chrome Tab and Enter input opened the second question; `aria-expanded="true"`, answer `hidden=false`, and the answer was visibly rendered.
- Twelve localized application/product pages were separately checked at 390 px: no overflow, failed images, or JSON-LD parse errors.

Screenshot directory:

`C:\Users\cao19\.codex\visualizations\2026\08\07\begapunk-laser-verified-models\`

Key evidence:

- `case-center-en-1440-full.png` — valid English desktop full-page capture without repeated Hero tiles.
- `case-center-en-faq-keyboard-1440.png` — real keyboard-expanded FAQ with the answer visible.
- `case-center-en-laser-390.png`
- `case-center-de-laser-390.png`
- `case-center-ja-laser-390.png`
- `case-center-ru-laser-390.png`
- `case-center-en-laser-detail-390.png`
- `case-center-en-product-groups-1440.png`
- `case-center-en-product-groups-390.png`

## 7. Change and release boundary

- Existing approved product specification values were not changed.
- `catalog-project/` was not modified, staged, copied, or included in public assets.
- Original source photographs remain outside Git; only the previously approved metadata-free WebP derivatives are referenced.
- No push, merge, release archive, tag, server change, deployment, IndexNow submission, or search-engine submission was performed.
