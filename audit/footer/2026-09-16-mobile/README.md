# Mobile footer disclosures

Applied directly to E:/begapunk-site-v2 at the owner's request.

- At 430px and below, the four navigation groups start collapsed when scripting
  is available. Each group opens independently using its heading and plus/minus
  indicator. Native details/summary provides click and keyboard behavior.
- Above 430px, all groups stay expanded and headings do not toggle them.
- Brand, quote, contact, social and legal information remains visible.
- Without scripting, all links start visible and native disclosures remain usable.
- The generator's footer-only mode refreshes both the stylesheet and navigation
  script versions. All 285 pages are synchronized.

## Validation

40 browser cases passed across five languages: 320, 390, 430, 431, 768 and 1440px
with scripting, plus 390 and 1440px without scripting. Checks cover initial
state, independent expansion, Space/Enter operation, reopening on wider screens,
resetting on narrow screens, overflow, heading touch targets and floating-action
overlap. The screenshots isolate the actual footer; interaction checks ran in the
complete page. Details are in checks.json.

Source quality and source-catalog checks passed. Complete multilingual verification
has only the pre-existing main-directory ownership-record discrepancy (the review
record still declares 56 pages while the config contains 57). No editorial review
records were overwritten to bypass that discrepancy.

All 285 pages were compared with the pre-change backup: changes are limited to
footer markup and the two relevant asset cache versions. Other page content is
unchanged. No commit, push or deployment was performed.
