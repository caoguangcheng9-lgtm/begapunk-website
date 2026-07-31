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
| Active conflicts after correction | 31 |
| Information coverage differences | 1 |
| Historical findings | 3 |
| Manual-review findings | 65 |
| Stale references | 14 |
| Mismatched source documents | 1 |
| Observations affected by identity mismatches | 4 |
| Parser ambiguities | 0 |
| Missing evidence | 204 |

No record was deleted to lower the conflict count. Historical records are retained in `audit/product-truth-conflicts.json` with an observation status.

## Semantic changes

- Added `current-observed`, `historical-unverified`, `stale-reference`, `parser-ambiguous`, and `manual-review-required`.
- Limited active conflict grouping to `current-observed` values.
- Required model and canonical field equality, at least two different values, current-source re-reading, unambiguous parsing, and normalized units.
- Preserved historical CSV observations in separate findings rather than treating the CSV as a current fact source.
- Made passage parsing field-aware so a bore diameter cannot become a passage count.
- Added fixed regression cases, including a hash-bound identity gate for the PDF stored as `BP-2P-95-0001.pdf`.
- Added optional `PRODUCT_TRUTH_CATALOG_ROOT` support so an isolated worktree can read the protected original `catalog-project/` as an external, read-only input.
- Split interface threads, mounting style, stator hole pattern, and rotor hole pattern into separate canonical fields. Thread depth no longer implies threaded mounting.
- Parses every interface size in a multi-value port description in stable order. A strict subset of a non-exclusive multi-port statement is retained as `coverage-difference`, not promoted to a mutually exclusive active conflict.
- Reclassified German, Japanese, and Russian G-thread terminology as `port_thread`; normalized explicit German and Russian flange terminology as `mounting_style = flange`; and retained mounting holes without a reliable stator/rotor assignment as `unassigned_mounting_pattern` with manual review.
- Reports one mismatched source document separately from its four affected observations, while preserving every observation-level identity record.
- Separates the 3 `historical-unverified` records from 65 current `manual-review-required` records. The two arrays retain all 68 observations without relabeling current manual-review items as history.
- Added evidence domains so engineering, business-policy, controlled-product-master, legal-compliance, and order-specific facts request matching evidence.

## Required regression cases

- `BP-4P-30-0001 / passages`: current content resolves to four passages; Ø30 mm remains the hollow-bore diameter and is never counted as 30 passages.
- `BP-4P-30-0001 / maximum_speed`: current parsed sources state 200 RPM. Historical 80 RPM references are stale and do not form an active conflict.
- `BP-1P-0003 / operating_temperature`: current parsed sources state -20°C to +80°C. Historical +120°C is stale and does not form an active conflict.
- `BP-2P-95-0001 / test_pressure`: the current public product page does not directly state 12 MPa. The PDF at the matching filename, SHA-256 `e93209eddc568b7e6b4073e1d5316dbf29ce9be086de65454becd52b29e1b50c`, internally identifies `BP-2P-95-0005`. The audit stops at `source-identity-mismatch` and does not use that PDF to classify test-pressure statements for `BP-2P-95-0001`.
- `BP-2P-50-0001 / mounting`: both current descriptions resolve to stator `4xm5` and rotor `6xm5`. Thread depth is not treated as mounting style, and no active mounting conflict remains.
- `BP-2P-0002 / port_thread`: `G1/4 and G1/8 ports` normalizes to `g1/4|g1/8`; the current `g1/8` observation is a coverage subset and does not form an active conflict.
- `warranty / missing evidence`: every missing warranty record requests business-policy evidence rather than an engineering drawing.

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
- The protected `catalog-project/` still contains 188 files totaling 31,818,663 bytes. Its sorted path/size/content manifest SHA-256 is `916f6117e466e4280145b8bc838c496773eeeb15ceefb9e264c55f41071f47d6`; no write operation targeted that directory.
