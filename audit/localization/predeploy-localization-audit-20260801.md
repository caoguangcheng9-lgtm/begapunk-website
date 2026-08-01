# Pre-deployment localization audit — 2026-08-01

## Scope and result

- Branch: `fix/predeploy-localization-quality`
- Automatic scan: 153 HTML pages (51 German, 51 Japanese, 51 Russian).
- Manual semantic review: 78 page-language combinations (26 priority pages per language: the 10 requested core/content pages and all 16 product detail pages).
- High-confidence visible-language findings: German 16, Japanese 27, Russian 25.
- Translation-source records synchronized: German 39, Japanese 53, Russian 112. This larger source count includes page-reviewed contact translations copied back into the cache and recurring Russian agreement corrections; it does not represent 204 new page claims.
- Engineering facts changed: **No**. No product pressure, speed, temperature, medium, material, price, certification, lead-time, or commercial commitment was changed.
- Deployment: **Not performed**.

## Evidence reviewed

### German

- DEUBLIN, [Drehdurchführungen](https://www.deublin.eu/drehdurchfuehrungen)
- DEUBLIN, [Mehrwege-Drehdurchführungen](https://www.deublin.eu/mehrwege-drehdurchfuehrungen-840)
- DEUBLIN, [Drehdurchführung anfragen](https://www.deublin.eu/drehdurchfuehrung-anfragen)
- Kadant, [Drehdurchführungen](https://fluidhandling.kadant.com/de/produkte/drehdurchfuehrungen)
- Kadant, [Standard-Drehdurchführungen](https://fluidhandling.kadant.com/de/produkte/drehdurchfuehrungen/standard-drehdurchfuehrungen)

Decision: use `Drehdurchführung` as the primary product/search term and `Mehrwege-Drehdurchführung` for multi-passage products. `Drehverbindung` is an accepted contextual synonym. `Drehgelenk` is retained only where a hose/tool swivel is specifically meant; it is not used as a random replacement for the core product term.

### Japanese

- SealTech, [ROTODISK ロータリージョイント](https://www.sealtech.co.jp/products/rotodisk.html)
- SealTech, [ROTOPACK 多ポート](https://www.sealtech.co.jp/products/rotopack.html)
- RIX, [多流路ロータリージョイント](https://www.rix.co.jp/products_services/products/category/rotary/post_6/)
- RIX, [製品仕様例](https://www.rix.co.jp/products_services/products/category/rotary/_2ees-2p03/)

Decision: use `ロータリージョイント` as the primary product/search term. `回転継手` is an accepted explanatory synonym and `ロータリーユニオン` is secondary. Technical labels use `使用流体`, `使用圧力`, `最高回転数`, `流路数`, `接続口径`, and `取付方法` according to the underlying field semantics.

### Russian

- Kadant, [Вращающиеся головки и соединения](https://fluidhandling.kadant.com/ru/produktsiya/vrashchayushchiesya-golovki-i-soedineniya/standartnye-vrashchayushchiesya-golovki/vrashchayushchiesya-golovki-rx)
- RotaryJoint.ru, [Ротационные соединения](https://rotaryjoint.ru/products/)
- FeedSystems, [Ротационное соединение](https://feedsystems.ru/products/rotatsionnoe-soedinenie/)
- Vertlux, [Ротационные соединения](https://vertlux.ru/products/)

Decision: use `ротационное соединение` as the primary product/search term. `вращающееся соединение` is an accepted explanatory synonym, not a page-by-page random alternate. Grammatical agreement is normalized to `пневматическое ротационное соединение` and the RFQ uses established engineering labels such as `рабочая среда`, `частота вращения`, and `количество каналов`.

## High-confidence fixes applied

### German — 16 visible wording issues

- Replaced English example names/company placeholders with German conventions.
- Rewrote literal or ungrammatical RFQ choices for standard, custom, replacement, and selection-help inquiries.
- Replaced the literal quotation verb wording with `Angebotsprüfung`.
- Standardized RFQ fields to `Betriebsmedium`, `Kanalzahl`, `Anschlussgewinde`, and `Maschinentyp`.

### Japanese — 27 visible wording issues

- Preserved and reviewed Aida's phone correction: `電話: +86 183 6842 5342`; removed the false fax label and `WhatsAppについて`.
- Corrected `完全な名前`, `カントリー`, `フランチェスコ`, `ジャパン・ジャパン`, the duplicated German country label, required markers, and local example names.
- Rewrote the four inquiry-type options and RFQ helper text in natural Japanese industrial language.
- Replaced `ワーキング使用流体`, `min⁻¹` used as a field name, `ポートのサイズ`, and literal quotation wording with the appropriate Japanese engineering labels.
- Standardized product filters to `すべて`, `1流路`, `2流路`, `3流路`, and `4流路以上`.

### Russian — 25 visible wording/grammar categories

- Rewrote literal RFQ options and placeholders; changed `рисунок` to `чертёж` in the engineering-document context.
- Replaced literal quotation wording and non-industrial field labels with `Данные для подготовки предложения`, `Рабочая среда`, `Частота вращения`, `Количество каналов`, and `Присоединительная резьба`.
- Corrected recurring adjective/noun agreement around `ротационное соединение` and removed redundant `поворотный ротационное` constructions.
- Corrected four Russian product-image descriptions without altering the underlying model, passage count, bore, mounting, or material facts.

## Synchronization

All accepted wording changes were synchronized to the relevant generated HTML and the durable translation sources in `i18n/cache/*.json` and `i18n/editorial/*.json`. `i18n:refresh-metadata` regenerated the three language search indexes and localized JSON-LD natural-language metadata from the reviewed pages. The relevant `llms.txt` descriptions required no wording change after review.

Modified files:

- `de/contact.html`
- `de/index.html`
- `de/llms.txt`
- `de/search-index.json`
- `i18n/cache/de.json`
- `i18n/cache/ja.json`
- `i18n/cache/ru.json`
- `i18n/editorial/de.json`
- `i18n/editorial/ja.json`
- `i18n/editorial/ru.json`
- `i18n/seo/de.json`
- `i18n/seo/ja.json`
- `i18n/seo/ru.json`
- `i18n/source-catalog.json`
- `ja/contact.html`
- `ja/index.html`
- `ja/llms.txt`
- `ja/products.html`
- `ja/products-p2.html`
- `ja/search-index.json`
- `ru/BP-2P-30-0001.html`
- `ru/BP-8P-0001.html`
- `ru/contact.html`
- `ru/index.html`
- `ru/llms.txt`
- `ru/products.html`
- `ru/products-p2.html`
- `ru/search-index.json`
- `audit/localization/i18n-build-missing-translations-20260801.csv`
- `audit/localization/localization-glossary-20260801.csv`
- `audit/localization/predeploy-localization-audit-20260801.md`

## Items requiring Aida review

1. The approved homepage title is now persisted in the source catalog, all three translation caches, all three `index.html` editorial maps, and all three SEO maps:
   - German: `Pneumatische Drehdurchführungen für OEM-Maschinen | Begapunk`
   - Japanese: `OEM機械向け空圧用ロータリージョイント | Begapunk`
   - Russian: `Пневматические ротационные соединения для OEM-оборудования | Begapunk`
2. A fresh extraction of the current 51 English pages found 701 additional uncached source records per language (2,103 language/source rows). This is an inventory produced by the raw extractor and may include breadcrumbs, composed text, and HTML fragments; it must not be interpreted as 2,103 confirmed public translation errors. The inventory is retained in `audit/localization/i18n-build-missing-translations-20260801.csv` as future translation-toolchain debt. A separate task must classify each record for translation, deliberate exclusion, or an extraction-rule adjustment. It does not block deployment of the currently reviewed localized pages. The broad regenerated source catalog was removed; only the approved homepage-title entry was added to the persistent catalog.
3. German `Drehgelenk` remains on the pneumatic hand-tool hose swivel page because that page describes a specific swivel-joint application. This is an intentional contextual exception, not the primary product keyword.
4. Russian `вращающееся соединение` or `вращающаяся головка` may remain in specific explanatory contexts. Product titles and core search entry points remain standardized on `ротационное соединение`.

## Validation results

- `npm run i18n:refresh-metadata`: PASS; 51 pages refreshed in each of `de`, `ja`, and `ru`.
- `npm run i18n:verify`: PASS; 204 localized pages verified.
- `npm run products:validate`: PASS; 16 models checked across four languages, catalogs, search indexes, JSON-LD, and sitemaps.
- `npm run quality:source`: PASS; consent, privacy, schema, favicon, external-link, and local dependency checks are clean.
- `npm run claims:verify`: PASS; 454 public text files verified.
- `npm run deploy:build`: PASS; 614 files built and 12 forbidden backup, draft, or quarantined paths excluded.
- `npm run deploy:validate`: PASS; 205 HTML files, 615 total release files, and 24 public downloads verified.
- `git diff --check`: PASS; no whitespace errors. Git emitted only the existing Windows LF/CRLF advisory for six JSON files.
- Deterministic metadata refresh: PASS; the localized source/output diff (`de`, `ja`, `ru`, and `i18n`) remained `7f12dd90db8b93f74c0ccd6a6099c2ce469982c1` before and after the second refresh.
- Audit scan: PASS; 153 localized HTML files were scanned, 207 JSON-LD blocks across the 204 configured pages were parsed, 78 manual page-language targets were present, and zero confirmed bad-phrase hits were found across 173 public/source files. Historical examples and `avoid_term` entries under `audit/localization/` were intentionally excluded from the public-source scan.
- Product fact guard: PASS; all 48 localized product specification tables are byte-identical to `HEAD`.
- Full `npm run i18n:build`: not part of the current production deployment gate. No unknown translation was generated.
- Homepage title synchronization: PASS; the approved German, Japanese, and Russian titles match the page title, Open Graph title, Twitter title, SEO map, translation cache, editorial override, and search-index homepage record.
- Release exclusion check: PASS; all 615 package files were inspected and neither `audit/` nor `catalog-project/` is present.

## Final deployment-gate conclusion

- Full `i18n:build`: not part of the current production deployment gate.
- Production metadata refresh: must pass.
- Multilingual verification for the current 204 pages: must pass.
- The 701 uncached records per language are retained as future toolchain technical debt.
- Current public localization changes: waiting for Aida final review.
- Deployment has not been performed.

## Safety declaration

- No engineering or commercial facts were changed.
- `catalog-project/` was not modified.
- No commit, push, pull request, server upload, symlink switch, or deployment was performed.
