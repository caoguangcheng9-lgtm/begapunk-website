# Begapunk Multilingual Site

This directory contains the translation, editorial review, SEO, and generation sources for the Begapunk static website.

## Scope

- Active languages: German, Japanese, and Russian (`activeLanguageCodes` in `config.json`).
- Pages: all 55 localized routes listed in `config.json` (48 translation-managed pages and 7 manually localized pages).
- Output: real static HTML files under `/de/`, `/ja/`, and `/ru/`.
- Production deployment is intentionally separate from translation generation.

## Credentials

The translation builder reads the Google Cloud Translation Basic API key only from the process environment:

```text
GOOGLE_CLOUD_TRANSLATION_API_KEY
```

Never add an API key to this repository, a JSON file, a command-line argument, a report, or a deployment package.

## Commands

Extract the unique English strings without calling an external service:

```text
npm run i18n:extract
```

Translate the extracted catalog through Google Cloud Translation Basic:

```text
npm run i18n:translate
```

Build the localized HTML pages after all translations are present:

```text
npm run i18n:build
```

Refresh curated SEO, the localized search indexes, AI indexes, and JSON-LD without rebuilding translated body copy:

```text
npm run i18n:refresh-metadata
```

Use the refresh command after editing `i18n/seo/*.json` or the structured-data localization rules. It is safe when current English copy has changed but the translation catalog has not yet been re-extracted and reviewed.

Production deployment uses this refresh-and-verify path so that a release cannot silently replace human-reviewed localized body copy. Run `i18n:build` explicitly only after the English catalog and all active-language translations have been updated and reviewed.

### Contact RFQ generation contract

The Contact body, `script#contact-rfq-copy` localization data, and executable RFQ behavior script are controlled by the Contact generation contract. `node scripts/build-localized-site.mjs --mode verify-contact` regenerates those owned regions in memory and compares them with the current German, Japanese, and Russian Contact pages without writing files. Header and Footer markup are managed by the separate navigation synchronization system and are outside the RFQ gate.

An external diagnostic build on 2026-08-16 found pre-existing non-idempotent whole-page drift in 47 translation-managed pages across each of the three target languages (141 non-Contact HTML files). Until that broader builder and navigation ownership debt receives separate governance, do not use the generic `i18n:build` command to overwrite the current localized pages. This whole-page technical debt does not indicate an English fallback in the Contact RFQ dynamic copy; the narrower Contact-owned-region gate verifies that copy independently.

The generic write modes now refuse an output root inside the source repository, including canonical path aliases and links. `i18n:build`, `i18n:refresh-metadata`, and `i18n:integrate` require an explicit repository-external `I18N_OUTPUT_ROOT`. Production preparation uses `i18n:metadata:verify`, which renders and compares the 144 managed localized pages, three localized Search Index files, and three localized `llms.txt` files in memory without writing. A failed comparison blocks the release; it is never repaired automatically during deployment preparation.

### Product-detail UI localization and progressive-enhancement contract

The 16 product models across English, German, Japanese, and Russian (64 pages) share `css/product-detail.css`, `js/product-detail.js`, and the localized UI labels in `i18n/manual/product-detail-ui.json`. The page-family contract is synchronized and verified by `scripts/sync-product-detail-ui.mjs`; its source-text transformations preserve each page's original line endings and do not reserialize whole documents.

The source HTML is deliberately fail-open: the four tabs are ordinary fragment links to four initially visible panels, the five FAQ items are open native `details` elements, and the three thumbnail links open the full images. The deferred shared script enhances a feature only after validating its complete expected structure; missing or invalid JavaScript must leave the source controls and content usable. `main#main-content` and the localized skip link belong to the product-detail contract. Header, Footer, and the floating inquiry control remain outside `main` and are managed by the separate navigation and shared-shell systems.

The search generator excludes only `a.skip-link[data-search-exclude][href="#main-content"]`; `data-search-exclude` is not a general-purpose way to suppress page content. The localized builder's primary selector includes `summary` solely so existing FAQ-question translation IDs remain valid. UI-B1 did not run the generic `i18n:build` command or modify localization Catalog, Cache, Editorial, SEO, Overrides, or Config data.

The generic localized builder also reads `i18n/manual/product-detail-ui.json`. For product-detail pages only, it excludes the direct skip-link text and the two region `aria-label` values from generic translation, then reapplies the reviewed manual copy after language-specific normalization. It does not exclude the Gallery, Product Information, Tab, Panel, or FAQ content. `--mode verify-product-ui-generation` renders all 16 product sources for the three target languages in memory, verifies 48 generated pages and 144 controlled values against the current localized pages, and performs no file write. This closes the UI-B1 generation gap without adding duplicate Catalog or Cache entries.

```text
npm run product-ui:verify
```

As of 2026-08-16, the UI-B1 changes are local only and have not been committed, pushed, or deployed.

Verify the generated localized pages:

```text
npm run i18n:verify
```

The 27-question FAQ is intentionally excluded from the generic translation catalog. Its approved German, Japanese, and Russian copy is maintained in `manual/faq-*.json` and synchronized with a dedicated, fail-closed contract:

```text
npm run faq:i18n:sync
npm run faq:i18n:verify
```

The FAQ command keeps the visible questions, FAQPage JSON-LD, curated SEO, localized search indexes, localized AI indexes, and contextual RFQ source paths synchronized. English FAQ fact changes must be reviewed line by line in all three target-market files before the localized sync is accepted; the generic translation build must not overwrite this page.

The builder never writes the API key to disk. Translation caches contain only source and translated text.

## AI-Assisted Target-Market Localization Review

Machine translation is draft content only. Complete this review after every new or changed localized page before marking the page editorially reviewed or preparing a release.

1. Review the complete rendered page, including the title, meta description, H1-H6 headings, body text, tables, FAQ, buttons, calls to action, image alt text, Open Graph/Twitter fields, and visible JSON-LD text.
2. Use representative manufacturer, industry, and peer pages from the target country to check industrial terminology, sentence structure, business tone, buyer vocabulary, and likely search intent. Also check how local buyers phrase the relevant product and application searches.
3. Record the page, language, reference URLs and access dates, terminology decisions, search-intent decisions, review method and date, reviewer role, and unresolved issues under `audit/localization/`.
4. Use peer pages only as language and search-pattern references. Never copy their wording or treat their specifications, certifications, performance claims, customer evidence, or commercial promises as Begapunk facts.
5. Confirm that localized claims still match the approved English fact source, drawings, and evidence records. Do not let localization broaden media compatibility, performance, certification, delivery, warranty, or application claims.
6. Keep independent native-speaker confirmation separate and explicit. AI-assisted review is required, but it does not qualify as native-speaker sign-off.

## Publishing Gate

Localized pages must not be deployed until:

1. Machine-translated drafts have completed the recorded AI-assisted target-market localization review above.
2. Technical terms, product codes, units, pressures, speeds, media, claims, and application boundaries are reviewed against approved Begapunk sources.
3. Every page has a self-referencing canonical and reciprocal `hreflang` links.
4. Local links, images, downloads, analytics, and the inquiry form pass verification.
5. The translated content is reviewed for local usefulness, natural reading and search intent, not merely page-count expansion.
6. The route also passes the four-language visual, responsive, availability, and performance requirements in `../docs/WEBSITE_EXPERIENCE_STANDARD.md`; language-specific layout forks are not allowed.

The strict 2026-08-17 Editorial reconciliation, including the required page-level target-market fields and 36 current-candidate source/screenshot hashes, is recorded in `../audit/localization/2026-08-17-editorial-evidence-reconciliation.md`. It records AI-assisted review only and must not be described as independent native-speaker sign-off.
