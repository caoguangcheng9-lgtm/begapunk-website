# Website Parameter Correction Report

## 1. Source of Truth

Formal engineering drawing PDFs are the approved source of truth for product parameters. All nine drawings were visually inspected as rendered pages before the website values were changed.

## 2. User Decision

All confirmed conflicts between webpage parameters and drawing parameters are resolved in favor of the drawing. The user explicitly approved the 13 final values covered by this correction task.

## 3. Modified Models

1. BP-1P-0003
2. BP-2P-0001
3. BP-2P-08-0001
4. BP-2P-130-0001
5. BP-2P-16-0001
6. BP-2P-30-0001
7. BP-2P-95-0001
8. BP-3P-0004
9. BP-4P-30-0001

## 4. Resolved Fields

| Model | Field | Old webpage value | Drawing value | Final webpage value | Modified files |
|---|---|---|---|---|---|
| BP-1P-0003 | Approx. Weight | 0.08 kg | 0.27 kg | 0.27 kg | `BP-1P-0003.html` |
| BP-1P-0003 | Maximum Temperature | 120 C | 80 C | -20 C to +80 C | `BP-1P-0003.html` |
| BP-1P-0003 | Body Material | 45# steel / optional 6061-T6 aluminum | Steel 45# | 45# Steel | `BP-1P-0003.html` |
| BP-2P-0001 | Approx. Weight | 0.85 kg | 0.39 kg | 0.39 kg | `BP-2P-0001.html` |
| BP-2P-0001 | Body Material | AL6061 + 45# Steel | Aluminum Alloy 6061 | Aluminum Alloy 6061 | `BP-2P-0001.html`, `products.html`, `product-comparison.html` |
| BP-2P-08-0001 | Approx. Weight | 0.28 kg | 0.39 kg | 0.39 kg | `BP-2P-08-0001.html` |
| BP-2P-130-0001 | Body Material | AL6061 + 45# Steel composite | Aluminum Alloy 6061 | Aluminum Alloy 6061 | `BP-2P-130-0001.html`, `products.html`, `product-comparison.html` |
| BP-2P-16-0001 | Approx. Weight | 0.45 kg | 0.41 kg | 0.41 kg | `BP-2P-16-0001.html` |
| BP-2P-30-0001 | Approx. Weight | 1.23 kg | 0.39 kg | 0.39 kg | `BP-2P-30-0001.html` |
| BP-2P-95-0001 | Maximum Pressure | 10 MPa | 1 MPa | 1 MPa / 10 bar | `BP-2P-95-0001.html`, `BP-2P-16-0001.html`, `BP-2P-30-0001.html`, `BP-2P-50-0001.html`, `BP-2P-130-0001.html`, `products.html`, `product-comparison.html`, `search-index.json` |
| BP-2P-95-0001 | Body Material | AL6061 + 45# Steel | Aluminum Alloy 6061 | Aluminum Alloy 6061 | `BP-2P-95-0001.html`, `products.html`, `product-comparison.html`, `search-index.json` |
| BP-3P-0004 | Approx. Weight | 0.45 kg | 0.49 kg | 0.49 kg | `BP-3P-0004.html` |
| BP-4P-30-0001 | Maximum Speed | 80 RPM | 200 RPM | 200 rpm | `BP-4P-30-0001.html`, `products-p2.html`, `product-comparison.html`, `search-index.json` |

The matching rows in `catalog-project/data/catalog-data.csv` and the resolution metadata in `catalog-project/data/source-evidence.json` were synchronized. `catalog-project/data/catalog-data.json` already contained the approved final values and was verified without rewriting it.

## 5. Files Modified

- `BP-1P-0003.html`
- `BP-2P-0001.html`
- `BP-2P-08-0001.html`
- `BP-2P-130-0001.html`
- `BP-2P-16-0001.html`
- `BP-2P-30-0001.html`
- `BP-2P-50-0001.html`
- `BP-2P-95-0001.html`
- `BP-3P-0004.html`
- `BP-4P-30-0001.html`
- `products.html`
- `products-p2.html`
- `product-comparison.html`
- `search-index.json`
- `catalog-project/data/catalog-data.csv`
- `catalog-project/data/source-evidence.json`
- `audit/website-parameter-correction-report.md`

## 6. Files Not Modified

- Original PDF drawings unchanged
- Product images unchanged
- Website structure unchanged
- Product URLs and canonical URLs unchanged
- Contact forms and PHP inquiry program unchanged
- `robots.txt` and `sitemap.xml` unchanged
- `blog-rotary-joint-installation-mistakes.html` unchanged
- `blog-seal-replacement.html` unchanged

## 7. Validation

| Validation | Result | Evidence |
|---|---|---|
| HTML parsing | PASS | 12 target pages parsed successfully |
| JSON-LD parsing | PASS | 11 JSON-LD blocks parsed successfully |
| Inline JavaScript parsing | PASS | 12 inline scripts parsed successfully |
| External JavaScript parsing | PASS | All files in `js/` parsed successfully |
| Local links and assets | PASS | 978 local links, images, scripts, stylesheets, and PDF targets checked; 0 missing |
| Canonical links | PASS | Canonical present on all 12 target pages |
| Browser rendering | PASS | Desktop checks passed on all 12 pages; 0 broken images; 0 console errors |
| Mobile layout | PASS | 375 px content viewport; 0 page or navigation horizontal overflow on all 12 pages |
| Old-value scan | PASS | All model-scoped forbidden values reduced to 0 matches |
| Git whitespace check | PASS | `git diff --check` returned no errors |

## 8. Outstanding Questions

1. `downloads/BP-2P-95-0001.pdf` has the filename and website association `BP-2P-95-0001`, but the rendered drawing title block says `BP-2P-95-0005`. The two user-approved parameter corrections were applied, but the model identity discrepancy remains open.
2. `downloads/BP-2P-30-0001.pdf` has the filename and website association `BP-2P-30-0001`, but the rendered drawing title block says `BP-3P-30-0001`. The approved weight correction was applied, but the model identity discrepancy remains open.
3. The `BP-2P-130-0001` drawing includes an unclear mounting annotation involving `M0` and `M10`. This task did not alter that mounting value or guess a replacement.

## 9. Final Result

PASS

The 13 user-approved webpage parameter conflicts were corrected and validated. The three drawing-identity or annotation questions above remain explicitly documented and were not guessed.
