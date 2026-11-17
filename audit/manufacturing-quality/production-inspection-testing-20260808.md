# Production Inspection Testing — Local Implementation Audit

Date: 2026-08-08
Repository: `E:\begapunk-site-v2`
Branch: `feature/bp-2p-95-application-case`
Baseline inspected: `aadd050ec0a7baffe55a69fb8ce8fd716ffe3b65`
Status: local implementation only; editorial and browser review remain in progress.

## 1. Mobile navigation root cause and repair

The defect came from competing responsive implementations. Page-specific CSS hid the navigation at tablet widths and expected `.nav.open`, while the page scripts used `.mobile-open`. Because the page stylesheet loaded after the global stylesheet, clicking the button could update the DOM without making the menu visible.

The repair establishes one site-wide implementation:

- `css/style.css` is the only stylesheet that controls Header and mobile navigation layout.
- The desktop/mobile breakpoint is now 1024 px. At 1024 px and below, the 64 px Header shows the menu button and `.nav.mobile-open` reveals a vertically scrollable menu with `max-height: calc(100vh - 64px)` and `overflow-y: auto`.
- `.nav.open` and `.nav.active` are no longer navigation state classes.
- `js/site-navigation.js` synchronizes `aria-expanded`, closes the menu after a link click, outside click, Escape, or transition back to desktop width, and restores focus after Escape.
- Desktop dropdowns remain open on `:focus-within`, not only on pointer hover.
- Page-specific Header/navigation copies were removed from `production-inspection-testing.css` and `case-studies.css`; the other audited page stylesheets do not implement Header state.
- `scripts/sync-site-navigation.mjs` replaces only `#mainNav` and the designated footer link columns. A second run changed 0 of 220 pages.

### Canonical four-language top-level navigation

| Language | Top-level items |
|---|---|
| English | Products · Applications · Quality · Knowledge Center · About · Get a Quote |
| German | Produkte · Anwendungen · Qualität · Wissenszentrum · Unternehmen · Angebot anfordern |
| Japanese | 製品情報 · 用途別情報 · 品質管理 · 技術情報 · 会社情報 · 見積もり・技術相談 |
| Russian | Продукция · Применение · Качество · Центр знаний · О компании · Запросить предложение |

The Applications dropdown now owns Case Studies. Quality contains direct links to Manufacturing & Quality and 100% Leak Testing. About is a direct company-page link, and mobile menus add a localized Home item that is hidden on desktop. No Durability Testing entry exists.

## 2. Scope

This task adds a four-language Manufacturing & Quality subpage describing Begapunk's confirmed production leak-testing procedure for pneumatic rotary unions:

- `production-inspection-testing.html`
- `de/production-inspection-testing.html`
- `ja/production-inspection-testing.html`
- `ru/production-inspection-testing.html`

The page is integrated through a prominent card on each language version of `manufacturing-quality.html`, through the new Quality dropdown on all 220 configured page instances, through the Company footer column, and through two direct Quality links on each homepage. It is not added to Case Studies and is not bound to any BP product model.

## 3. Confirmed production procedure

The project owner confirmed the following public facts for this page:

- Every finished pneumatic rotary union is leak-tested after final assembly; this is 100% production inspection, not batch sampling.
- Every passage is tested individually using compressed air at 1.0 MPa (approximately 10 bar).
- The nominal cycle per passage is approximately 1 second for pressurization and 4 seconds for pressure holding.
- While one passage is tested, all other passages remain unpressurized and open.
- External leakage or cross-passage leakage may cause the pressure-hold result to exceed the station's configured alarm threshold.
- The station reports PASS or NG but does not identify the leakage location or cause.
- An NG unit is segregated in a yellow quarantine container. Dedicated personnel diagnose the cause; repairable units are repaired and fully retested, and non-repairable units are scrapped.
- Only a unit whose complete passage-by-passage test has passed may proceed to packing and storage.

The numerical alarm threshold is intentionally not published. The page does not claim zero leakage, arbitrary minimum sensitivity, calibration certification, QR/CRM unit traceability, first-pass yield, customer acceptance rate, or a specific model result.

## 4. Source photographs and derived assets

The original files remain unchanged and outside the repository.

| Source | Original size | SHA-256 | Public use |
|---|---:|---|---|
| `C:\Users\cao19\AppData\Local\Temp\codex-clipboard-6ce0dfb1-d617-4d2c-8ae5-d7da755f15b9.jpg` | 1080 × 1920 | `7CD99DC1BD26B03D4AFFF58D048E6FD3902F0E46A781621CF9578A37ED001E92` | Assembled units awaiting inspection |
| `C:\Users\cao19\AppData\Local\Temp\codex-clipboard-fb9a78ac-3155-4eaa-b437-6b8799d8a2d7.jpg` | 3072 × 4096 | `97D7EA383DC40D41DE67D59897ABAF4B780F9BEEC33CE386677EFF410176853B` | Larger inspection-queue view after cropping the bottom watermark |
| `C:\Users\cao19\AppData\Local\Temp\codex-clipboard-162798ee-2e10-4d2f-9ab8-2da84b4e0ffe.png` | 728 × 937 | `8D4172F14EEAD9CB454286F61042037881D179A99ED7E435079FE59DB98EC205` | One pictured individual test cycle showing PASS |

### Derived files

| File | Dimensions | Bytes | SHA-256 |
|---|---:|---:|---|
| `images/manufacturing-quality/production-inspection/rotary-unions-awaiting-inspection.jpg` | 720 × 1280 | 168395 | `1714FA7AF8AA55C35C55A2754128A1D3650F9DA5AD526E2498B7B7C214E72441` |
| `images/manufacturing-quality/production-inspection/rotary-unions-awaiting-inspection.webp` | 720 × 1280 | 118748 | `AF86F3164453F9EE8FDE91EE0B4F1F7114679C01D4709467ACC2AC16B7FEA1A6` |
| `images/manufacturing-quality/production-inspection/assembled-units-in-inspection-queue.jpg` | 900 × 1084 | 233307 | `56DAFF719077EB7883D88E7945C0F29CB247E01BE44383491CA697DEB59485C8` |
| `images/manufacturing-quality/production-inspection/assembled-units-in-inspection-queue.webp` | 900 × 1084 | 176874 | `80C87507C73544536570339ABA3305D2CEA2311DBCB87835EC62C19669760BCC` |
| `images/manufacturing-quality/production-inspection/individual-passage-test-pass.jpg` | 688 × 720 | 52980 | `2A7AAEA9F2BE2CE1CCD5E040E72D788836747A6304863756FACFA327EC1954B6` |
| `images/manufacturing-quality/production-inspection/individual-passage-test-pass.webp` | 688 × 720 | 33522 | `7BD2D09269BD1998D8E65635786C8FCC61BD839CB1F9165660C0C0696D6400FF` |

### Cropping and metadata handling

- First queue image: no crop; resized from 1080 × 1920 to 720 × 1280.
- Second queue image: retained the top 3072 × 3700 pixels and removed the bottom 396-pixel watermark strip; resized to 900 × 1084. Product content was not altered.
- PASS image: cropped the left 40-pixel black border and retained a 688 × 720 region from the top. This removes the bottom subtitle/unused video frame while preserving the product, test station and green PASS display.
- All public JPG and WebP files were re-encoded without EXIF, GPS, XMP, ICC or IPTC metadata. Sharp inspection reported all five metadata flags absent for all six derived files.

### Evidence boundaries

- Queue photographs support the existence of assembled products awaiting inspection and a production inspection queue. They do not prove that the pictured units passed, were released, were shipped, or belong to a particular order or model.
- The PASS photograph supports one pictured individual test-cycle result only. It is not a batch certificate, a serial-number test record, proof of the unpublished alarm threshold, or proof that all pictured products passed.
- The 100% unit-by-unit and passage-by-passage procedure is based on the project owner's confirmed production rule, not inferred from the photographs.

## 5. Four-language terminology and editorial status

All page bodies, captions, alt text, table labels, calls to action and structured-data natural-language fields were authored separately for English, German, Japanese and Russian. No full-site automated translation build was run.

| Language | Terms used | Public terminology source |
|---|---|---|
| English | passage-by-passage leak testing; pressure-hold test; nonconforming unit | COSMO Instruments, Air Leak Tester: https://www.cosmo-k.co.jp/en/ |
| German | kanalweise Dichtheitsprüfung; Druckhaltephase; Leckage zwischen Kanälen; nichtkonformes Teil | WIKA Deutschland, Dienstleistungen für Dichtheitsprüfungen: https://www.wika.com/de-de/lp_lecktest.WIKA |
| Japanese | 全数検査; 各回路漏れ検査; 保圧工程; 不適合品 | コスモ計器, エアリークテスター: https://www.cosmo-k.co.jp/products/air-leak-tester/ and basic principle: https://www.cosmo-k.co.jp/leak-test/principle/ |
| Russian | поканальная проверка герметичности; выдержка под давлением; межканальная утечка; несоответствующее изделие | ConsultantPlus, official leak-test procedure wording: https://www.consultant.ru/document/cons_doc_LAW_457254/a14d0737d4356ca08812ad647417c61eed78a5df/ |

Sources were used only to verify established industrial terminology. No source performance data, thresholds, certifications or marketing language were copied into the Begapunk page. All four localized pages remain `inProgress` in editorial status until true browser rendering is accepted.

## 6. Integration and changed-file scope

Direct task files:

- Four new localized HTML pages.
- Four updated `manufacturing-quality.html` hub pages.
- All 220 configured HTML page instances received one canonical Header/Footer structure and the shared mobile navigation script.
- `css/style.css`, `js/site-navigation.js`, and the removal of competing navigation rules from page-specific stylesheets.
- `scripts/sync-site-navigation.mjs` and `scripts/sync-quality-breadcrumbs.mjs` provide repeatable, idempotent synchronization without reserializing page bodies.
- `css/production-inspection-testing.css` and the hub-card addition in `css/manufacturing-quality.css`.
- `i18n/config.json`, `i18n/editorial/status.json`, and three localized SEO files.
- `scripts/build-localized-site.mjs` for localized search keywords.
- `scripts/verify-localized-site.mjs` for production procedure, evidence, localization and discovery checks.
- `scripts/verify-public-claims.mjs` for a path- and context-bound exception to the legacy blanket ban on 100% pressure/leak-test claims. The verifier self-test confirms the same statement is still blocked on unrelated pages.
- Root and localized search indexes and `llms.txt` files.
- `sitemap.xml` and `sitemap-i18n.xml`.
- Six metadata-free JPG/WebP assets.

Homepage Quality cards now link directly to both `manufacturing-quality.html` and `production-inspection-testing.html`. Visible and JSON-LD breadcrumbs are flattened to Home / Quality on the hub and Home / Quality / 100% Leak Testing on the inspection page.

The inspection page was reduced from 10 process cards, 13 table rows, 4 principle cards and 4 NG cards to 4 fact cards, 5 process steps, 8 table rows, 2 evidence photographs, one compact NG summary and one CTA. The lower-resolution duplicate queue photograph is no longer rendered; its derived file is retained non-destructively as permitted.

Four-language `<meta name="keywords">` tags were removed. The Russian shipment-document wording is now `Протоколы контроля, которые необходимо приложить к поставке`. Open Graph, Twitter and WebPage primary-image metadata now use the Begapunk inspection-queue photograph rather than the third-party test-station image.

The required metadata refresh also rewrites localized metadata, structured data, search indexes and localized `llms.txt` for all currently configured pages. Those generated changes coexist with pre-existing work from other task windows and were not reset, cleaned or overwritten manually.

## 7. Automated verification

- `npm run i18n:refresh-metadata`: PASS — 55 pages refreshed for each of de/ja/ru.
- `npm run navigation:sync`: PASS — a consecutive run changed 0 of 220 pages.
- `npm run quality:breadcrumbs:sync`: PASS — four visible and JSON-LD Quality breadcrumbs synchronized.
- `npm run inspection:sync`: PASS — two consecutive runs produced byte-identical page and search-index output.
- `npm run i18n:verify`: PASS — 220 localized page instances, canonical navigation/footer assertions and production-inspection assertions.
- `git diff --check`: PASS.
- `npm run products:validate`: PASS — 16 product models across four languages; no approved specification table was changed by this task.
- `npm run quality:source`: PASS.
- `npm run images:verify`: PASS — 56 pages, 53 manifest images, 247 image tags and 231 optimized tags.
- `npm run claims:verify`: PASS — 486 source, localized, download, i18n and production text files after the final release build.
- `npm run quality`: PASS.
  - Multilingual verification: 220 configured page instances.
  - Production release build: 662 copied files before manifest generation.
  - Deployment validation: 221 HTML files, 663 total release files and 24 verified public downloads.
- Local links, image resources, canonical URLs, five-language hreflang sets, JSON-LD parsing, search indexes, `llms.txt`, both sitemaps and release-manifest integrity are covered by the passing quality chain.

## 8. Browser visual verification

Completed in the user's real Chrome browser through a local HTTP preview at `127.0.0.1`. The in-app browser connector continued to return `Cannot redefine property: process`, so it was not used as acceptance evidence.

- 1440 px: the complete English production-inspection page rendered without horizontal overflow; the desktop menu button remained hidden and the evidence-boundary heading was correct.
- 1024 px and 900 px: the closed and open menu states were captured. The English button measured 74 x 44 px, displayed `Menu` with a white background and dark-blue text, and hid all three decorative spans.
- 768 px: the text button did not overlap; opening and Escape closing worked, `aria-expanded` synchronized, and focus returned to the button.
- 430 px: English, German, Japanese and Russian open-menu states were inspected. English/German buttons measured 74 x 44 px; Japanese/Russian buttons measured 86 x 44 px. The localized labels were `Menu`, `Menü`, `メニュー` and `Меню`. Hit testing at the viewport bottom confirmed that the menu remained above the fixed quotation/WhatsApp CTA. The final About and Get a Quote links were both reached and activated; each link closed the menu.
- 390 px: the open menu retained the 74 x 44 px English text button, remained above the floating CTA and produced no horizontal overflow.
- Outside click, Escape and menu-link closing were exercised in Chrome. The Escape path returned focus to the toggle.
- The first Case Studies FAQ was expanded with the Enter key; `aria-expanded` changed from `false` to `true`, the controlled answer became visible and focus remained on the button.
- All 12 four-language Case Studies breadcrumb pages were loaded in Chrome. Case centers showed three breadcrumb items and details showed four, with no horizontal overflow.
- Chrome console error log: empty.
- German, Japanese and Russian production-inspection evidence headings were verified as `Bestätigter Umfang`, `確認できる範囲` and `Границы подтверждения`; none of the three pages contained the literal `undefined`.

Saved evidence directory: `C:\Users\cao19\.codex\visualizations\2026\08\08\begapunk-production-inspection-nav-qa`.

## 9. Unresolved limitations

- The configured numerical alarm threshold is intentionally not published.
- The photographed PASS cycle is not linked to a serial number and is not a batch certificate.
- No public calibration certificate, annual calibration claim, QR/CRM traceability, minimum leak-rate claim or first-pass-yield claim is made.
- No product model is assigned to this manufacturing procedure page.
- No durability-test page is included in this task.
- The in-app browser connector remains unavailable with `Cannot redefine property: process`; real Chrome acceptance was completed through the Chrome extension instead.

## 10. Git and deployment status

- Commit: not created.
- Push: not performed.
- Deployment: not performed.
- Server and production website: unchanged.
- `catalog-project/`: not modified, staged or deleted.
