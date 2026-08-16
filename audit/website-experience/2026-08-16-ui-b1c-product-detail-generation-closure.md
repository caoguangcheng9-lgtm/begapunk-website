# UI-B1C Product-detail generation closure

Date: 2026-08-16
Result: PASS for code and static generation gates; browser history retest pending because the in-app browser backend was unavailable.

## Scope

This phase changed only these seven authorized paths:

1. `scripts/build-localized-site.mjs`
2. `js/product-detail.js`
3. `scripts/sync-product-detail-ui.mjs`
4. `package.json`
5. `i18n/README.md`
6. `PROJECT_HANDOFF.md`
7. `audit/website-experience/2026-08-16-ui-b1c-product-detail-generation-closure.md`

No product HTML, product facts, visible product copy, metadata, JSON-LD, search index, translation catalog/cache/editorial data, CSS, navigation, footer, Contact page, approval data, or `catalog-project/` content was changed in this phase.

## Problem and correction

Before this phase, generic localized generation could not rebuild the UI-B1 product template. The preflight stopped with exactly 144 missing items: 16 product source pages × 3 target languages × the three controlled labels `Skip to main content`, `Product images`, and `Product information`.

The builder now reads the reviewed `i18n/manual/product-detail-ui.json` contract and owns only those three exact fields on product-detail pages. The generic extractor excludes only the exact skip-link text and the two exact `aria-label` attributes; Gallery, Product Information, FAQ summaries, and product body copy remain in the normal translation flow. Manual UI copy is applied after language normalization.

A new read-only `verify-product-ui-generation` mode generates 48 localized product pages in memory, compares 144 controlled fields against the manual contract and current localized pages, verifies template structure and translated tabs/FAQ summaries, and writes no files. It is now part of `product-ui:verify`.

The shared product script also restores the default Specifications tab when browser history returns to an empty or non-panel hash. Valid panel hashes still activate and scroll to their target; unrelated hashes are not rewritten.

## File hashes

| File | Before SHA-256 | After SHA-256 |
|---|---|---|
| `scripts/build-localized-site.mjs` | `ADF93884CE6F773BC4F2462AE109407D3A2821B54BAB910465DE641D4775DB4B` | `C33CE2CEFFCB740567C34AD6DF970A3987AD58D46A17D8A71622A2C7868923D9` |
| `js/product-detail.js` | `0ED0B0E77543D0276138B25103B084D869C3D47E6DE5FCEC04805BFA75FF90AD` | `1478FE8C38A0383C2364F959C068D2D7D16A99B27FFA47ECBCD57F2D50A0CEB6` |
| `scripts/sync-product-detail-ui.mjs` | `E6390B770AAD9E4FBB2551BDF418B21C6DAB0B0792C7E8ACBADD4E0B57578DBF` | `E9F7C4FC220F83014D8E5A049D6655814769CDE8AB3D941DA774231FAE227194` |
| `package.json` | `906944A0211F02819D374ABC0E60F231697406B40FCD9D6B833CA5164BA54B6B` | `8509AFD854BBA02E4E71EB6DB6BFAF1D098499227978E6FCC5F26180863E6EE6` |
| `i18n/README.md` | `A99A5D64D3AC2FE15EEBB178C8F9ED21454151A31E5B29C9AF66DE3FA18FA041` | `735F9F9DB52FDE581291674CCC962B82B76FCBBADB4CEC013E03863F9A01A2FD` |
| `PROJECT_HANDOFF.md` | `A597DA3AA93590E4802F258CD860748CD46E69E13BC5B0DF96ACCCCCB8CA2DAE` | `252D6C5DF38A40B992AE6DA63F06907F0B47F77302A753A43DB079D6CCE2DC11` |

## Verification

All of the following completed with exit code 0:

- Node syntax checks for the builder, shared product script, and product UI synchronizer.
- Direct `--mode verify-product-ui-generation`.
- `npm run product-ui:verify`.
- Product trust and product data validation.
- Contact-owned region generation verification and 1,242 RFQ contract checks.
- 220-page localized-site verification.
- Search, discovery, image, public-claims source-only, and source-quality checks.
- `git diff --check` (existing line-ending warnings only).

The generation report recorded:

- source pages: 16
- target languages: 3
- generated pages: 48
- controlled comparisons: 144
- source totals: 64 tabs, 64 panels, 80 FAQ details, 80 summaries, 48 thumbnails
- generated totals: 192 tabs, 192 panels, 240 FAQ details, 240 summaries, 144 thumbnails
- `wroteFiles: false`

## Browser boundary

The planned four-language browser history matrix was not executed. At retest time, the application browser backend was unavailable and only external browser-extension backends were detected. The approved browser workflow prohibits switching browsers or bypassing that boundary. No page was loaded and no POST was attempted. The temporary local service was stopped and port 8765 was confirmed closed.

Before release, retest at least one representative page per language for: default Specifications state, click Downloads, browser Back restoring Specifications, Forward restoring Downloads, valid panel hash, unrelated hash, console errors, and horizontal overflow. This is a browser evidence gap, not a known code failure.

## Preserved follow-up items

- True 200% browser zoom remains unverified.
- Lighthouse/performance evidence remains unverified.
- BP-8P currently has duplicate first and second thumbnail image URLs; this is an existing content/resource issue, not a UI-B1C regression.
- No package or tool was installed. No generic i18n build, non-check sync, commit, push, PR, deployment, production access, SMTP connection, form submission, or translation API call was performed.
