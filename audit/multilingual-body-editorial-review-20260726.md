# Multilingual Body Editorial Review — 2026-07-26

## Scope

This review covers page-body localization for German, Japanese, and Russian. It is separate from the completed sitewide SEO/GEO metadata pass.

## Copy-reviewed pages awaiting rendered visual confirmation

- `404.html`
- `BP-1P-0003.html`
- `BP-1P-0006.html`
- `BP-2P-0001.html`
- `BP-2P-0002.html`
- `BP-2P-08-0001.html`
- `BP-2P-130-0001.html`
- `BP-2P-16-0001.html`
- `BP-2P-30-0001.html`
- `BP-2P-50-0001.html`
- `BP-2P-95-0001.html`
- `BP-3P-0004.html`
- `BP-3P-0006.html`
- `BP-3P-0007.html`
- `BP-3P-S06-0001.html`
- `BP-4P-30-0001.html`
- `BP-8P-0001.html`
- `blog-rotary-joint-installation-mistakes.html`
- `blog-rotary-joint-leaking.html`
- `blog-rotary-joint-materials.html`
- `blog-rotary-joint-selection.html`
- `blog-rotary-union-seal-types.html`
- `blog-seal-replacement.html`
- `blog-threaded-vs-flange.html`
- `case-studies.html`
- `faq.html`
- `about.html`
- `applications.html`
- `application-automation-rotary-tables.html`
- `application-bottle-filling-capping.html`
- `application-cnc-pneumatic-clamping.html`
- `application-electronics-battery-test-fixtures.html`
- `application-laser-tube-cutting.html`
- `application-packaging-machinery.html`
- `application-pneumatic-tools-hose-anti-twist.html`
- `application-robot-end-of-arm-tooling.html`
- `application-steel-dusty-environments.html`
- `application-textile-printing-converting.html`
- `application-vacuum-packaging-machines.html`
- `application-welding-positioners.html`
- `blog.html`
- `installation.html`
- `products-p2.html`
- `products.html`
- `privacy.html`
- `product-comparison.html`
- `search.html`
- `terms.html`
- `thank-you.html`

Each page above was reviewed in all three languages for visible headings, paragraphs, tables, calls to action, FAQ text, product recommendations, terminology, grammar, and high-risk claims. The corresponding page-scoped editorial dictionaries now contain 4,109 reviewed entries per language.

These pages are now counted as fully reviewed in `i18n/editorial/status.json`. A local HTTP preview removed the earlier `file://` navigation limitation, and every page was opened in real Chrome at both desktop and mobile viewport sizes.

## Browser render QA completed on 2026-07-27

- Loaded all 49 previously pending pages in German, Japanese, and Russian in real Google Chrome.
- Checked each page at desktop and mobile viewport sizes: 49 pages × 3 languages × 2 viewports = 294 rendered checks.
- Verified one visible H1, correct document language, no page-level horizontal overflow, no broken visible images, and no known placeholder or garbled-text patterns.
- Visually inspected representative pages and every detected anomaly, then repeated the complete render scan after rebuilding the localized site.
- Corrected Japanese product-comparison placeholder runs, localized the cookie banner and mobile menu label, repaired the mobile header logo layout, constrained German timeline text, made the application mapping table horizontally scrollable on small screens, and prevented long German CTA copy from widening the page.

## Additional SEO/GEO corrections

- Removed inherited English `meta keywords` from localized pages. Search engines do not use this field for ranking, and the old value contained mixed-language and unsupported certification wording.
- Localized the Organization founder job title in JSON-LD.
- Localized `knowsAbout` terminology in Organization JSON-LD.
- Localized the LocalBusiness name in JSON-LD.
- Corrected the current-page name and URL in BreadcrumbList JSON-LD.
- Added release verification for removed meta keywords, localized founder job titles, and localized breadcrumb current-page data.

## Claim-risk corrections

Localized copy no longer repeats unsupported fixed-response guarantees, model counts, unit totals, country totals, production-equipment counts, universal test claims, certification claims, or direct competitor comparisons on the reviewed pages. Statements were replaced with bounded descriptions that can be supported by the available project evidence.

The English source pages still contain several of these claims and require a separate evidence-and-approval review before they should be changed.

## Verification

- Localized build: 51 German + 51 Japanese + 51 Russian pages generated successfully.
- Browser render QA: passed for 294 localized page/viewports (49 pages × 3 languages × desktop/mobile), in addition to the previously rendered `index.html` and `contact.html` pages.
- `git diff --check`: passed; Git only reported existing Windows line-ending notices.
- Known garbled-text and placeholder scans: passed.
- Production deployment: not performed.
- Git commit or push: not performed.

## Remaining work

- No localized page-specific body-copy or browser-render review remains for German, Japanese, or Russian.
- Production deployment was not part of this QA run and remains a separate, explicitly authorized step.
