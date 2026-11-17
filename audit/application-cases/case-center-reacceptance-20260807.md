# Begapunk Four-Language Case Center — Rework and Reacceptance Record

Date: 2026-08-07 (Asia/Tokyo)

Branch: `feature/bp-2p-95-application-case`

Baseline: `445c4b2fffd0424c12d562ef55820fa997a39eb3`

Status: local revision; native-language review pending; not pushed, merged, deployed, or submitted to an indexing service

## 1. Objective and final information architecture

This revision keeps the previously integrated BP-2P-95-0001 application page and repairs the four public case centers without creating a separate design system.

The final order in English, German, Japanese, and Russian is:

1. compact hero;
2. **Real Application Cases**;
3. BP-2P-95-0001 pneumatic-chuck installation;
4. model-neutral pneumatic rotary-union installation at a laser-tube-cutting rear chuck;
5. **How to Use This Case Center**;
6. **Engineering Selection Examples**;
7. corrosive outdoor-duty and CNC fit-check examples only;
8. FAQ, four related products, standard CTA, footer, and technical note.

The laser rear-chuck material is no longer presented as an engineering selection example. The four pages explicitly distinguish two photo-supported installation cases from two engineering selection examples.

## 2. Laser rear-chuck evidence boundary

The two source photographs were supplied by the user as real pneumatic rotary-union installations in laser tube cutting machine rear-chuck assemblies. They document the same application category, but the pages do not claim that they are two views of the same machine, project, or customer.

Allowed public statements are limited to:

- rear-chuck workshop installation context;
- a pneumatic rotary union positioned near the rotating chuck structure;
- visible chuck components, mounting flange, and pneumatic fittings;
- the role of a stationary-to-rotating pneumatic connection;
- the need to confirm circuit count, pressure, speed, interface, space, hose direction, maintenance access, and the exact order model.

The pages do not infer or claim:

- any Begapunk model for the photographed laser rear-chuck installation;
- passage count or individual port functions;
- cutting-assist-gas or coolant compatibility;
- pressure, speed, temperature, life, leakage, commissioning, acceptance, or in-service performance;
- machine brand, customer, country, or project identity.

The BP-2P-95-0001 card remains linked only to the separately documented pneumatic-chuck case. The model-neutral laser case has a “Discuss a Similar Integration” action and no product-card binding.

## 3. Photograph processing and privacy

Original files remain outside the repository and were not modified or copied into the public tree.

| Source | Source SHA-256 | Public derivative | Dimensions | Public SHA-256 | Metadata result |
|---|---|---|---:|---|---|
| `E:\Downloads\IMG_20220222_102924.jpg` | `7DD15BCEB379885B8852F56951EC5896E7AC34E36B10867917CBEB1A4974C7B3` | `images/cases/laser-tube-rear-chuck/laser-tube-rear-chuck-rotary-union-overview.webp` | 1600 × 1200 | `4B98C2C393C5A57961BE361A1924E35969FF3FC8DD4CD8C3005223D63B62C75F` | EXIF, ICC, IPTC, and XMP absent |
| `E:\Downloads\IMG_20240226_143109.jpg` | `B409BD9708AB59ECB40160B48AEA3F0D7900AC02506672F5FC7952275A8654D5` | `images/cases/laser-tube-rear-chuck/laser-tube-rear-chuck-rotary-union-mounting-detail.webp` | 1200 × 1600 | `55FA45B6D668C7696AE81F489DD2B7F84F939FC21B2DFAE8A861D8EDA676610A` | EXIF, ICC, IPTC, and XMP absent |

The second original contained precise location metadata. The published WebP was re-encoded and verified to contain no location or device metadata. No location value is retained in public content or this report. The photographs were not AI-generated, composited, or altered to add machinery, fittings, pipes, brands, or labels.

The landscape image is used as the case-center overview. The portrait image is displayed once as mounting-detail evidence with `object-fit: contain`.

## 4. Site-pattern, accessibility, and responsive repairs

- Reused the existing four-dropdown header, five-column footer, standard `.cta-section`, and current product-card components.
- Removed all four disabled `legacy-case-studies-styles` blocks.
- Kept BP-2P-95-0001 as the first related product and expanded the related-products layout to four columns, two columns, and one column by viewport.
- Updated the eight directly related pages to `case-studies.css` / `application-case.css` version `20260807-case-integration2`.
- Added a case-page-scoped mobile navigation mode at 1024 px and below, without modifying global `style.css`.
- Restored the established 70/82 px labelled mobile-menu controls at phone widths and preserved a compact 56 px fallback below 360 px.
- Converted four FAQ items per language from clickable `div` elements to native `button type="button"` controls with `aria-expanded`, `aria-controls`, matching answer IDs, and synchronized `hidden` state.
- Localized every mobile `data-label` in German, Japanese, and Russian.
- Removed the duplicate Related Resources section from the case centers.

## 5. Localization decisions

| Language | Main industry term | Laser rear-chuck title |
|---|---|---|
| English | pneumatic rotary union | Pneumatic Rotary Union Installation on a Laser Tube Cutting Rear Chuck |
| German | pneumatische Drehdurchführung | Einbaubeispiel einer pneumatischen Drehdurchführung am hinteren Spannfutter einer Laser-Rohrschneidmaschine |
| Japanese | 空圧用ロータリジョイント | レーザー切断機の後方チャックへの空圧用ロータリジョイント組込み事例 |
| Russian | пневматическое ротационное соединение | Пример установки пневматического ротационного соединения на заднем патроне станка лазерной резки труб |

High-confidence machine-translation artifacts were removed. Search records, `llms.txt`, visible metadata, JSON-LD, localized mobile labels, FAQs, and technical notes share the same evidence boundary. German, Japanese, and Russian remain marked **Native human review pending**; no native-review claim is made.

## 6. Discovery synchronization

- Four case-center search records describe two real installations and two selection examples.
- English and three localized `llms.txt` files describe the second real case without assigning a model.
- Existing case-detail canonical and hreflang sets remain intact.
- The multilingual registry remains 52 pages per language and 208 verified pages total.
- Existing sitemap coverage remains 49 main URLs and 196 localized URLs; no new URL was required because the second case is an in-page case-center section.
- Two consecutive metadata refreshes produced the same Git diff hash: `bcdc1b81129c76d7b84e80cd7056454ecae3d933`.

## 7. Browser acceptance

The pages were served through a local HTTP preview and tested in the in-app browser.

| Page/language | Viewports | Result |
|---|---|---|
| English | 1440, 1024, 900, 820, 768, 430, 390 px | No horizontal overflow; the 4:3 overview keeps the rotary union visible; portrait detail remains uncropped; product grid is 4/2/1 columns; desktop dropdown works; 1024-and-below menu opens, closes, and scrolls. |
| German | 1440 and 390 px | Desktop dropdown works; no horizontal overflow; mobile evidence labels are German; images load. |
| Japanese | 1440 and 390 px | Desktop dropdown works; no horizontal overflow; mobile evidence labels are Japanese; images load. |
| Russian | 1440 and 390 px | Desktop dropdown works; no horizontal overflow; mobile evidence labels are Russian; images load. |

Four-language image scroll-through result: 11 of 11 visible images loaded on every case-center page. Console errors: 0.

FAQ structure uses native buttons, so Tab focus and browser-native Enter/Space activation are preserved; click-state testing confirmed synchronized `aria-expanded` and `hidden` values. The in-app automation layer did not expose a reliable synthetic key-event result, so this record does not claim a tool-level key-injection observation beyond the native HTML control contract.

Screenshots are stored outside the repository at:

`C:\Users\cao19\.codex\visualizations\2026\08\07\begapunk-case-center-reacceptance\`

Key evidence files:

- `case-center-en-1440-top-dropdown.png`
- `case-center-en-1440-laser-case.png`
- `case-center-en-1440-laser-detail.png`
- `case-center-en-1024-laser.png`
- `case-center-en-900-menu-open.png`
- `case-center-en-900-laser.png`
- `case-center-en-820-menu-open.png`
- `case-center-en-820-laser.png`
- `case-center-en-768-laser.png`
- `case-center-en-430-laser.png`
- `case-center-en-390-menu-open-r2.png`
- `case-center-en-390-laser.png`
- `case-center-de-1440-top-dropdown.png`
- `case-center-de-390-table.png`
- `case-center-ja-1440-top-dropdown.png`
- `case-center-ja-390-table.png`
- `case-center-ru-1440-top-dropdown.png`
- `case-center-ru-390-table.png`

## 8. Automated validation

- `npm run i18n:refresh-metadata` twice: PASS; deterministic.
- `npm run i18n:verify`: PASS for 208 pages and four localized BP-2P-95 case-detail integrations.
- `npm run products:validate`: PASS for 16 models across four languages.
- `npm run quality:source`: PASS.
- `npm run claims:verify`: PASS across 462 checked source, localized, download, i18n, and production text files.
- Targeted model/media scan: zero specific-model references and zero prohibited medium phrases in all four laser-case blocks, matching search records, and matching `llms.txt` records.
- Public-image metadata scan: PASS; no EXIF, ICC, IPTC, or XMP in either derivative.
- `npm run quality`: PASS, including a 626-file production build, 209 HTML files, 627 validated release files, and 24 verified public downloads.
- `git diff --check`: PASS.

## 9. Change boundary

- Product engineering parameters were not changed.
- Product specification tables were not changed.
- Global `css/style.css` was not changed.
- `catalog-project/` was not modified, staged, or copied into public assets.
- Original photographs remain outside Git.
- No push, merge, deployment, server modification, IndexNow submission, or search-engine submission was performed.

Native German, Japanese, and Russian review remains pending before any deployment decision.
