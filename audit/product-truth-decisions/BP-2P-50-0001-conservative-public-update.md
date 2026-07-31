# BP-2P-50-0001 Conservative Public Update

Date: 2026-07-31

Issue: [#12 — Apply conservative public facts for BP-2P-50-0001](https://github.com/caoguangcheng9-lgtm/begapunk-website/issues/12)

Baseline: `81b50b8c3158297d1190830f4ff852667baec5da`

Decision owner: laocao

Decision type: `conservative-public-policy`

## Scope and authorization boundary

This change synchronizes conservative public wording for five fields. It is not an engineering verification and does not establish an approved drawing, BOM, material specification, weighing record, or ingress-protection test report.

- Public wording update: authorized by laocao in Issue #12.
- Engineering fact approval: `not-established`.
- Engineering verification: `manual-review-required`.
- PDF modification: not authorized and not performed.
- Production deployment: not authorized and not performed.

## Laocao decision

| Field | Before this update | Conservative public wording after this update | Public claim level | Engineering status |
| --- | --- | --- | --- | --- |
| Weight | Numeric public values included approximately 4.26 kg; evidence sources also conflict with 2.30 kg / 2300 g | `Confirm weight for the supplied configuration.` No numeric weight is published; JSON-LD omits weight | `prohibited-until-verified` | `manual-review-required` |
| Compatible media | Public pages and related content could imply air, water, coolant, oil, or other media without a model-specific qualification | `Air. Other media require written compatibility confirmation for the operating conditions.` | `public-with-qualification` | `manual-review-required` |
| Mounting | Generic `flange mount` wording did not expose the observed stator/rotor hole interfaces or the machining caution | `Stator side: 4 × M5, thread depth 10 mm; rotor side: 6 × M5, thread depth 8 mm.` plus confirmation against the supplied drawing before machining | `public-with-qualification` | `manual-review-required` |
| Protection | IP65, dust-proof, dust-seal, or equivalent wording could be read as a certified protection claim | `Protective-shroud and labyrinth design for dusty environments; no certified IP rating is currently claimed.` | `public-with-qualification` | `manual-review-required` |
| Seal material | Public content included PTFE composite and FKM/O-ring details not established by a controlled BOM | `PTFE seal with O-ring.` No FKM, PTFE composite formulation, or O-ring compound is identified | `public-with-qualification` | `manual-review-required` |

German, Japanese, and Russian pages express the same facts and qualifications in localized wording. No field is marked `verified`.

## Public propagation updated

The conservative policy is synchronized across:

- English, German, Japanese, and Russian product detail pages;
- visible product specifications and selection copy;
- Product and ItemList JSON-LD;
- product catalog cards, comparison rows, home-page product cards, and related-product references;
- application pages, FAQ/selection/material/seal articles, and other public pages that refer to BP-2P-50-0001;
- four search indexes;
- root and localized `llms.txt`;
- metadata, social metadata, image ALT text, and localized SEO records;
- the production-release build input.

Other product pages were changed only where their text refers to BP-2P-50-0001. Their own model facts were not changed.

## Affected files

### Target pages

- `BP-2P-50-0001.html`
- `de/BP-2P-50-0001.html`
- `ja/BP-2P-50-0001.html`
- `ru/BP-2P-50-0001.html`

### English product pages with BP-2P-50-0001 references

- `BP-1P-0003.html`
- `BP-1P-0006.html`
- `BP-2P-0001.html`
- `BP-2P-0002.html`
- `BP-2P-08-0001.html`
- `BP-2P-16-0001.html`
- `BP-2P-30-0001.html`
- `BP-2P-95-0001.html`
- `BP-2P-130-0001.html`
- `BP-3P-0004.html`
- `BP-3P-0006.html`
- `BP-3P-0007.html`
- `BP-3P-S06-0001.html`
- `BP-4P-30-0001.html`
- `BP-8P-0001.html`

### Localized product pages with BP-2P-50-0001 references

- German: `de/BP-1P-0003.html`, `de/BP-1P-0006.html`, `de/BP-2P-0001.html`, `de/BP-2P-0002.html`, `de/BP-2P-08-0001.html`, `de/BP-2P-16-0001.html`, `de/BP-2P-30-0001.html`, `de/BP-2P-95-0001.html`, `de/BP-2P-130-0001.html`, `de/BP-3P-0004.html`, `de/BP-3P-0006.html`, `de/BP-8P-0001.html`
- Japanese: `ja/BP-1P-0003.html`, `ja/BP-1P-0006.html`, `ja/BP-2P-0001.html`, `ja/BP-2P-0002.html`, `ja/BP-2P-08-0001.html`, `ja/BP-2P-16-0001.html`, `ja/BP-2P-30-0001.html`, `ja/BP-2P-95-0001.html`, `ja/BP-2P-130-0001.html`, `ja/BP-3P-0004.html`
- Russian: `ru/BP-1P-0003.html`, `ru/BP-1P-0006.html`, `ru/BP-2P-0001.html`, `ru/BP-2P-0002.html`, `ru/BP-2P-08-0001.html`, `ru/BP-2P-16-0001.html`, `ru/BP-2P-30-0001.html`, `ru/BP-2P-95-0001.html`, `ru/BP-2P-130-0001.html`, `ru/BP-3P-0004.html`, `ru/BP-3P-0006.html`, `ru/BP-3P-S06-0001.html`, `ru/BP-4P-30-0001.html`, `ru/BP-8P-0001.html`

### Catalog, comparison, home, application, article, search, and AI surfaces

- Root: `index.html`, `products.html`, `product-comparison.html`, `applications.html`, `application-steel-dusty-environments.html`, `application-textile-printing-converting.html`, `blog-rotary-joint-materials.html`, `blog-rotary-joint-selection.html`, `blog-rotary-union-seal-types.html`, `blog-seal-replacement.html`, `search-index.json`, `llms.txt`
- German: `de/index.html`, `de/products.html`, `de/product-comparison.html`, `de/applications.html`, `de/application-steel-dusty-environments.html`, `de/application-textile-printing-converting.html`, `de/blog-rotary-union-seal-types.html`, `de/blog-seal-replacement.html`, `de/search-index.json`, `de/llms.txt`
- Japanese: `ja/index.html`, `ja/products.html`, `ja/product-comparison.html`, `ja/application-steel-dusty-environments.html`, `ja/application-textile-printing-converting.html`, `ja/blog-rotary-union-seal-types.html`, `ja/blog-seal-replacement.html`, `ja/search-index.json`, `ja/llms.txt`
- Russian: `ru/index.html`, `ru/products.html`, `ru/product-comparison.html`, `ru/applications.html`, `ru/application-steel-dusty-environments.html`, `ru/application-textile-printing-converting.html`, `ru/blog-rotary-union-seal-types.html`, `ru/blog-seal-replacement.html`, `ru/search-index.json`, `ru/llms.txt`
- Localized SEO: `i18n/seo/de.json`, `i18n/seo/ja.json`, `i18n/seo/ru.json`

### Decision, audit, and enforcement

- `audit/product-truth-decisions/BP-2P-50-0001-decision-template.json`
- `audit/product-truth-decisions/BP-2P-50-0001-conservative-public-update.md`
- `audit/product-truth-baseline-20260731.md`
- `audit/product-truth-conflicts.json`
- `audit/product-truth-source-inventory.json`
- `scripts/build-localized-site.mjs`
- `scripts/validate-product-data.mjs`

The evidence packet `audit/product-truth-decisions/BP-2P-50-0001-evidence-packet.md` is unchanged.

## Audit result

The product-truth audit reports:

- 254 sources;
- 18 models;
- 18 normalized fields;
- 56 unresolved conflicts;
- 188 missing-evidence groups.

The prior baseline contained 59 unresolved conflicts. Three public contradiction groups no longer appear after conservative wording replaced unsupported public claims. This does **not** mean the engineering facts were verified. The weight and mounting conflicts for BP-2P-50-0001 remain unresolved, and all five decision fields remain `manual-review-required`.

## Validation

- `npm run audit:product-truth` — PASS; 56 unresolved conflicts reported without selecting a winning value.
- `npm run quality` — PASS.
- `npm run i18n:verify` — PASS; 204 localized pages.
- `npm run claims:verify` — PASS; 454 source, localized, download, i18n, and production text files.
- `npm run deploy:validate` — PASS; 205 HTML files, 615 release files, and 24 verified public downloads.
- `git diff --check` — PASS.
- Target-associated public block scan — PASS through `scripts/validate-product-data.mjs`.
- Product consistency — PASS for 16 models across four languages.
- `catalog-project/` fingerprint — unchanged at 188 files and 31,818,663 bytes; it remains untracked and was not staged.

## Missing engineering evidence

The following are still required before replacing the conservative wording with verified engineering facts:

1. A controlled weighing record, approved BOM, or approved drawing that establishes the complete sellable assembly mass for the supplied configuration.
2. A controlled media-compatibility record with limits for any medium other than air.
3. The current approved drawing revision defining the complete hole pattern, pitch circles, tolerances, counterbores, and mating geometry.
4. An ingress-protection test report tied to an approved configuration if an IP rating is to be claimed.
5. A controlled BOM or seal specification establishing the PTFE construction and O-ring compound.

The two available PDFs have different SHA-256 hashes and neither proves that it is the current approved version:

- `downloads/BP-2P-50-0001.pdf`: `652375676687345701f7b497d661fb4f6dedb9ddcb31a6d18df1f99ec5cf915c`
- `catalog-project/assets/drawings/BP-2P-50-0001.pdf`: `31c63b5f52574bed72d4bb2260b1307df73d0023a734d8dd6bc1ee84509ac644`

## Future re-review requirement

When a formally controlled drawing, BOM, weighing record, compatibility record, or IP test report becomes available, laocao must make a new engineering decision. The public wording, JSON-LD, search indexes, AI indexes, decision record, and conflict baseline must then be reviewed together. This update must not be treated as evidence that any of the five fields has passed engineering verification.

## Deployment statement

Not deployed. No server or production file was modified.
