# GEO Phase 1A Safe Remediation Report

## Scope

Phase 1A addressed only the explicitly allowed sitemap, Product Schema, catalog pagination, and audit-report files. No product engineering parameter, certification claim, company metric, technical article body, CSS, PHP, `.htaccess`, `robots.txt`, `llms.txt`, or server configuration was changed.

## Changes Completed

### Sitemap and noindex alignment

- Confirmed that `search.html` declares `noindex, follow`.
- Removed `https://www.begapunk.com/search.html` from `sitemap.xml`.
- Preserved `search.html`, its noindex directive, and all search functionality.
- Scanned the remaining sitemap URLs; no other sitemap URL currently declares noindex.

### Product Schema calibration

- Reviewed 24 Product objects across 17 HTML files.
- Removed 24 complete Offer objects from 16 product detail pages and `products.html`.
- Original Offer fields removed: `@type`, `availability`, `description`, `itemCondition`, `priceCurrency`, `priceValidUntil`, and `url`.
- Reason: these are industrial RFQ products with no public fixed price or verifiable real-time inventory. The Offer objects declared `InStock` and USD currency without a purchasable price.
- Retained every Product object and its existing identity and engineering fields, including name, SKU, model/MPN, brand, manufacturer, image, description, URL, category, material where present, and `additionalProperty` values.
- No `aggregateRating` or `review` Product markup was found, so none was added or removed.

### Catalog pagination

- Preserved self-referencing canonicals:
  - Page 1: `https://www.begapunk.com/products.html`
  - Page 2: `https://www.begapunk.com/products-p2.html`
- Added a Page 2-specific H1: `Rotary Joint Catalog ? Page 2`.
- Gave Page 1 and Page 2 distinct meta descriptions.
- Clarified crawlable HTML links as `Next: More Rotary Joint Models` and `Previous: Rotary Joint Catalog Page 1`.
- Preserved Page 2 as indexable and did not remove it.

## High-Risk Claims Not Changed

No public claim was rewritten in this phase. `phase-1-high-risk-claims.csv` consolidates 225 source occurrences into 128 root claims across these decision classes:

- A: absolute marketing language
- B: wording that requires conditions
- C: Begapunk evidence required
- D: product base parameters that prohibit automatic changes
- E: repeated public-template claims
- F: cross-page lead-time conflicts

Safe replacement drafts are decision aids only and were not written back to the website.

## Evidence Required from Begapunk

`evidence-required-from-begapunk.md` defines 24 evidence packages. Priority blockers include the legal entity and brand relationship, current certification scope, model-level datasheets, shipment metrics with cutoff dates, lead-time records, operating-limit definitions, simultaneous pressure/RPM envelopes, and documented leakage/life-test methods.

## Validation Results

| Check | Result |
|---|---|
| JSON-LD scripts parsed | Passed: 57 |
| Product objects retained | Passed: 24 across 17 files |
| Product fields unchanged except Offer removal | Passed against baseline commit `6cc8215b22b1d55734c53935b94c4bd48144648a` |
| Product Offer objects remaining | 0 |
| Priceless InStock Offers remaining | 0 |
| New prices, inventory, ratings, or reviews added | None |
| sitemap XML parsing | Passed: 48 URLs |
| search.html absent from sitemap | Passed |
| Other noindex URLs in sitemap | None detected |
| Page descriptions differ | Passed |
| Page 2 H1 contains Page 2 | Passed |
| Crawlable bidirectional pagination links | Passed |
| Self-referencing canonicals | Passed |
| Broken local references in modified HTML | 0 |
| Changes outside allowed scope | 0 |

## Begapunk Decisions Needed

1. Provide or reject each evidence package in `evidence-required-from-begapunk.md`.
2. Confirm standard versus custom lead-time definitions before any public wording is normalized.
3. Confirm whether maximum pressure and maximum RPM may be reached simultaneously for each model.
4. Map ISO, CE, and RoHS documentation to the legal entity, scope, model, revision, and validity period.
5. Approve any future replacement wording from the high-risk claim list before website changes.

## Known Limitations

- This phase validates local source code, not deployed server output or third-party rich-result rendering.
- It does not determine whether any business, certification, or engineering claim is true; it identifies the evidence needed to make that determination.
- Source claim line numbers were not present in the original claim inventory. Exact source lines are recorded only where an exact text match could be found; other entries are marked as audit extractions.
- Existing high-risk claims remain publicly present until Begapunk provides evidence and approves Phase 1B decisions.
