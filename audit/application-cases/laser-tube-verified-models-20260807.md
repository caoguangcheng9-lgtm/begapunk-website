# Laser Tube Rear-Chuck Application — Verified Models and Sitewide Evidence Boundary

Date: 2026-08-07 (Asia/Tokyo)

Branch: `feature/bp-2p-95-application-case`

Current baseline: `aadd050ec0a7baffe55a69fb8ce8fd716ffe3b65`

Status: local source revision and validation only; not pushed, merged, packaged, or deployed

## 1. Factory confirmation and evidence boundary

`Evidence source: Begapunk factory confirmation supplied by the project owner on 2026-08-07. Application category and models are confirmed; photograph-to-model identification is not confirmed.`

Confirmed facts:

- `BP-3P-0004` and `BP-2P-08-0001` have actual application experience in compressed-air circuits on rear chucks of laser tube cutting machines.
- The verified function is compressed-air transfer from the stationary supply to the rotating rear chuck.
- The two workshop photographs document the same application category, but are separate installation records and are not presented as two views of one machine.
- Neither photograph is individually identified as either confirmed model.
- Circuit count, port assignment and mounting interfaces must be confirmed from the customer's chuck and complete machine design.

Not established by the evidence:

- oxygen, nitrogen, cutting-assist gas, process gas, coolant, lubricant, vacuum, rotary laser-head or cutting-head use;
- a verified pressure, speed, service life, leakage rate, customer result or universal fit;
- a confirmed clamp, release, purge or blow-off assignment for any individual port;
- any use of the separate `BP-3P-S06-0001` smart-chuck function description for these two standard models.

## 2. Current sitewide cleanup scope

This phase did not redesign or rewrite the already reviewed case centers, laser application pages, or the `BP-3P-0004` and `BP-2P-08-0001` product pages. It corrected the remaining aggregate-page wording only:

- four home pages now describe laser tube rear-chuck compressed-air transfer and name only the two factory-confirmed application models;
- four application overview pages now describe stationary-to-rotating rear-chuck compressed-air transfer, require chuck-specific confirmation, and retain an explicit negative process-gas/coolant boundary;
- the application overview structured data is localized and carries the same safe rear-chuck description;
- four FAQ pages now explain passage-count selection using independent medium circuits and rear-chuck compressed-air circuits, without the former oxygen + nitrogen + coolant example;
- each visible FAQ answer is synchronized exactly with its `FAQPage` JSON-LD answer;
- the Russian navigation label `Лазерная трубка режет` was replaced with `Лазерная резка труб` in the affected FAQ page;
- the four search indexes were regenerated only for `index.html`, `applications.html`, and `faq.html` using the repository's existing extraction semantics. No duplicate record was added.

The explicit negative safety paragraph remains visible on each application overview page. It is intentionally excluded from the search-body extraction so the index does not create an oxygen/nitrogen/process-gas association with the verified pneumatic models; the current positive rear-chuck content remains synchronized.

## 3. Terminology sources

Competitor and manufacturer sources were used only as terminology evidence. No third-party performance value, compatibility claim, or sentence was copied.

| Language | Terms adopted in the affected blocks | Official terminology source |
|---|---|---|
| German | `Drehdurchführung`, `Druckluft`, `hinteres Spannfutter`, `Laser-Rohrschneidmaschine` | https://www.deublin.eu/drehdurchfuehrungen ; https://www.deublin.eu/drehverteiler-fuer-druckluft |
| Japanese | `ロータリジョイント`, `圧縮空気`, `後側チャック`, `レーザー管切断機` | https://www.pascaleng.co.jp/jp/products/work_clamp/rotary_joint/ ; https://www.rix.co.jp/products_services/products/category/rotary/_2ees-2p03/ |
| Russian | `ротационное соединение`, `сжатый воздух`, `задний патрон`, `станок лазерной резки труб` | https://www.deublin.com/-/media/API-Sync-Assets/INS/040-501-GB-JP.pdf?ts=20250406T1917118096 ; https://fluidhandling.kadant.com/ru/produktsiya/vrashchayushchiesya-golovki-i-soedineniya/standartnye-vrashchayushchiesya-golovki |

No external native-language sign-off is claimed. The wording was reviewed for high-confidence industrial usage and remains subject to future native-speaker review.

## 4. Current working-tree files

Public pages:

- `index.html`
- `de/index.html`
- `ja/index.html`
- `ru/index.html`
- `applications.html`
- `de/applications.html`
- `ja/applications.html`
- `ru/applications.html`
- `faq.html`
- `de/faq.html`
- `ja/faq.html`
- `ru/faq.html`

Discovery data:

- `search-index.json`
- `de/search-index.json`
- `ja/search-index.json`
- `ru/search-index.json`

Validation and audit:

- `scripts/verify-localized-site.mjs`
- `audit/application-cases/laser-tube-verified-models-20260807.md`

No product page, product specification table, case-center page, direct laser application page, sitemap, `llms.txt`, image, or `catalog-project/` file is part of this working-tree change.

## 5. New automated safeguards

The localized-site validator now checks the following scoped elements in all four languages:

- the compact and overview laser entries on the home page;
- the detailed laser block, mapping row and summary card on the application overview;
- the explicit negative safety boundary and the exact two-model link set;
- localized `CollectionPage` structured data;
- the visible passage-selection FAQ and its accessibility relationship;
- exact visible-answer parity with the matching `FAQPage` JSON-LD Question;
- the corresponding `index.html`, `applications.html`, and `faq.html` search records and their current scoped snippets;
- known legacy wording, unsupported media/function/performance wording, stale laser-model recommendations, unsupported numeric claims, and missing rear-chuck/compressed-air semantics.

The checks are scoped to marked laser blocks or exact URL records. They do not scan unrelated page sections where media such as coolant or vacuum may be legitimate.

## 6. Automated validation

The required commands were run serially on the current working tree:

- `git diff --check`: PASS.
- `npm run i18n:verify`: PASS — 52 configured pages per language, 208 pages total.
- `npm run products:validate`: PASS — 16 product models across four languages, catalogs, search indexes, JSON-LD and sitemaps.
- `npm run quality:source`: PASS — consent, privacy, schema, favicon, external-link and local dependency checks.
- `npm run claims:verify`: PASS — 462 source, localized, download, i18n and production text files.
- `npm run quality`: PASS.
- The quality chain's temporary production-tree build copied 626 source files. Deployment-tree validation passed with 209 HTML files, 627 total release files and 24 verified public downloads. No archive, release tag, upload or deployment was created.
- Targeted legacy-phrase scan across the four home, application overview and FAQ pages and their four search indexes: 0 matches for the replaced laser claims.
- Targeted JSON-LD parse and exact search-record uniqueness check: PASS for all 12 affected pages and all 12 corresponding records.
- Canonical, hreflang, local links/resources, four-language search indexes, sitemap and `llms.txt` checks remain covered by the passing localized and full quality chains.
- Product specification tables: unchanged. No product page is present in the current diff.
- `catalog-project/`: Git status unchanged; two protected local files remain outside this task.

## 7. Browser acceptance

The earlier valid case-center capture remains preserved, but is not used as proof for the newly changed aggregate pages:

`C:\Users\cao19\.codex\visualizations\2026\08\07\begapunk-laser-verified-models\case-center-en-1440-full.png`

The two known invalid stitched files were moved and renamed:

- `rejected/FAILED-case-center-en-1440-full-valid.png`
- `rejected/FAILED-case-center-en-1440-full-valid2.png`

Current aggregate-page browser acceptance is **incomplete**. The required in-app browser connector was invoked, but its bundled client failed during bootstrap with `Cannot redefine property: process`. Therefore no new screenshots were produced and the 1440, 1024, 900, 768, 430 and 390 CSS-pixel checks, mobile menu/footer checks, keyboard FAQ expansion and four-language phone-card checks are not reported as passed. Source-level and automated DOM checks passed, but are not substituted for browser evidence.

Because the required current visual acceptance is incomplete, this working tree is not yet declared finally accepted and no local commit is created in this phase.

## 8. Change and release boundary

- Existing approved product specification values were not changed.
- `catalog-project/` was not modified, staged, copied, or included in public assets.
- No real form was submitted.
- No push, merge, release package, tag, server change, deployment, upload, IndexNow submission, or search-engine submission was performed.
