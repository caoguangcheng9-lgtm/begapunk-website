# Local-market AI-assisted review — product-detail STEP action deduplication

reviewedAt: `2026-09-02T18:43:00+09:00`
reviewedByRole: AI-assisted target-market reviewer (not native-speaker / not human sign-off)
reviewMethod: AI-assisted changed-surface review of the product-detail first-view action block across all 16 catalog models in English, German, Japanese, and Russian. The diff was verified page by page: each page removes only the large duplicate STEP button; the already-reviewed localized STEP utility link and Downloads-panel entry remain unchanged.
unresolvedIssues: none (no wording, engineering fact, download target, metadata, or structured-data value changed)

目标市场参考来源
  - Reused the industrial CAD-download wording and buyer-intent decisions recorded in `audit/localization/2026-09-01-step-public-download-review.md`; no new target-market term was introduced. Reference used for terminology and search-intent consistency only.

术语决定
  - English `Download 3D Model (.step)`, German `3D-Modell (.step) herunterladen`, Japanese `3Dモデル（.step）をダウンロード`, and Russian `Скачать 3D-модель (.step)` remain unchanged on the compact utility link and in the Downloads panel.
  - The large secondary STEP button is removed because it duplicated the immediately adjacent utility action. `Get a Quote` remains the only large first-view CTA.
  - The direct model-specific `.step` download URL, `download` attribute, and public STEP availability are unchanged.

搜索意图决定
  - Engineers retain immediate STEP access without a request barrier, while the first-view hierarchy now has one primary commercial CTA and one compact CAD download link instead of two visually competing STEP entries.
  - No SEO/GEO copy or structured-data change is needed because the downloadable STEP asset and its reviewed wording remain present on every product page.

pages: en, de, ja, ru for all 16 drawing-backed catalog product-detail pages
language: de, ja, ru (plus English source)
referenceUrls: existing reviewed Begapunk product-detail pages and the 2026-09-01 public STEP review record (terminology and search intent only)
referenceAccessDates: 2026-09-02
terminologyDecisions: recorded above
searchIntentDecisions: recorded above
