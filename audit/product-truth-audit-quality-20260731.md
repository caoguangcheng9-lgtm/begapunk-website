# Phase 1B Product Truth Audit Semantics Correction

Issue: `#14`

Repository baseline: `d95d4db1ce908f941e76bff3f78bc052455d0b0b`

Audit date: 2026-07-31

## Objective

Correct the audit semantics so only different, unambiguous, unit-normalized values re-read from current sources can form an active product-fact conflict. Historical audit statements remain traceable but cannot independently create a current conflict.

This task does not select an engineering value and does not modify a public product fact.

## Result

| Category | Count |
| --- | ---: |
| Previous conflicts | 56 |
| Active conflicts after correction | 45 |
| Historical findings | 17 |
| Stale references | 15 |
| Parser ambiguities | 0 |
| Missing evidence | 195 |

No record was deleted to lower the conflict count. Historical records are retained in `audit/product-truth-conflicts.json` with an observation status.

## Semantic changes

- Added `current-observed`, `historical-unverified`, `stale-reference`, `parser-ambiguous`, and `manual-review-required`.
- Limited active conflict grouping to `current-observed` values.
- Required model and canonical field equality, at least two different values, current-source re-reading, unambiguous parsing, and normalized units.
- Preserved historical CSV observations in separate findings rather than treating the CSV as a current fact source.
- Made passage parsing field-aware so a bore diameter cannot become a passage count.
- Added fixed regression cases, including a hash-bound visual check for the current `BP-2P-95-0001` PDF.
- Added optional `PRODUCT_TRUTH_CATALOG_ROOT` support so an isolated worktree can read the protected original `catalog-project/` as an external, read-only input.

## Required regression cases

- `BP-4P-30-0001 / passages`: current content resolves to four passages; Ø30 mm remains the hollow-bore diameter and is never counted as 30 passages.
- `BP-4P-30-0001 / maximum_speed`: current parsed sources state 200 RPM. Historical 80 RPM references are stale and do not form an active conflict.
- `BP-1P-0003 / operating_temperature`: current parsed sources state -20°C to +80°C. Historical +120°C is stale and does not form an active conflict.
- `BP-2P-95-0001 / test_pressure`: the current public product page does not directly state 12 MPa. Visual review of page 1 of the current PDF, SHA-256 `e93209eddc568b7e6b4073e1d5316dbf29ce9be086de65454becd52b29e1b50c`, shows `Test scope confirmed by approved order.` It does not show the historical `1.5x rated pressure` statement. These historical statements are stale references, not active facts.

These are audit classifications only. They do not establish the correct engineering values or approval status.

## Protection and scope

- Public product HTML, JSON-LD, language pages, search indexes, `llms.txt`, downloads, and product fact values were not modified.
- The original worktree's 25 unrelated tracked modifications were not switched, reset, stashed, staged, or committed.
- The original `catalog-project/` was used only as a read-only external input and was not copied into the commit.
- No server or deployment configuration was changed.
- No deployment was performed.

## Validation

- `npm run audit:product-truth`: PASS.
- Two consecutive audit runs produced byte-identical source inventory, conflict JSON, and Markdown baseline outputs.
- Generated JSON and the regression fixture parse successfully.
- `npm run quality`: PASS, including collaboration, localization, product consistency, source quality, release build, public-claim, and deployment-package validation.
- `git diff --check`: PASS.
- The original worktree still contains the same 25 protected tracked paths.
- The protected `catalog-project/` still contains 188 files totaling 31,818,663 bytes; its pre-task manifest fingerprint was retained and no write operation targeted that directory.
