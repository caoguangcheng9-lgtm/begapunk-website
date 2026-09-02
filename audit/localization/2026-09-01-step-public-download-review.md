# Local-market AI-assisted review — public STEP download on the drawing-backed catalog

reviewedAt: `2026-09-02T12:00:00+09:00`
reviewedByRole: AI-assisted target-market reviewer (not native-speaker / not human sign-off)
reviewMethod: AI-assisted line-by-line review of the product-detail first view, downloads panel, pricing card, and FAQ change for public STEP downloads across all 16 drawing-backed catalog models (en/de/ja/ru), against industrial CAD-download convention and buyer search intent.
unresolvedIssues: none (STEP model is a simplified public envelope file; detailed production geometry is not published; engineering facts unchanged)

SEO/GEO intent update (2026-09-02):
  - Added a localized meta-description hook on every model (en/de/ja/ru) noting the simplified 3D STEP model (AP214) is available for a fit check, kept within each language length limit.
  - Added a Product JSON-LD additionalProperty "3D CAD model" (STEP AP214) on every model, so structured data states the model ships with a downloadable 3D file.
  - Title unchanged: model + product name + brand already covers the buyer decision terms; adding "STEP" would dilute the core keyword.
  - sitemap.xml now lists every approved public download (PDF + STEP) alongside pages; ops/indexnow-extra-urls.txt mirrors the same set for discovery.

目标市场参考来源
  - Reference terminology for the file-download label: English "Download 3D Model (.step)", German "3D-Modell (.step) herunterladen", Japanese "3Dモデル（.step）をダウンロード", Russian "Скачать 3D-модель (.step)"; reference used for terminology and search-intent only.

术语决定
  - The previous "Request 3D STEP/IGES file" / "Request STEP File" request-only wording is replaced on this model by a direct "Download 3D Model (.step)" link once a public simplified STEP file exists. The request wording remains for models without a published STEP file.
  - Extension stays lowercase ".step" to match the deployed filename and Linux case-sensitive serving; the file is AP214, single merged body.
  - The pricing card and 3D-model wording are kept consistent across the four languages; each model's STEP file is the model-specific reviewed file (owner-confirmed).

搜索意图决定
  - Engineers searching for a ready 3D model to run an envelope / fit check receive an immediate download, removing the request barrier; the download is gated by server MIME/Content-Disposition so every browser downloads rather than rendering the STEP text.
  - The commercial "Get a Quote" primary action (with price, MOQ 100, lead time 20-30 days, warranty) is retained as the lead-capture path; the detailed/gated CAD remains available on request.

pages: en, de, ja, ru for all 16 drawing-backed catalog models (public STEP download)
language: de, ja, ru (plus English source)
referenceUrls: target-market peer CAD-download references (terminology only)
referenceAccessDates: 2026-09-02
terminologyDecisions: recorded above
searchIntentDecisions: recorded above
