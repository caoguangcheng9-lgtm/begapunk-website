# Local-market AI-assisted review — one-page catalog, public STEP, four-model bulk prices

reviewedAt: `2026-09-02T14:20:00+09:00`
reviewedByRole: AI-assisted target-market reviewer (not native-speaker / not human sign-off)
reviewMethod: AI-assisted line-by-line review of the merged catalog listing, products-p2 redirect stub, four-model bulk-price chips, and localized llms/search indexes (en/de/ja/ru), against industrial catalog and buyer search intent.
unresolvedIssues: none (products-p2 remains a URL alias/redirect, not a second indexed catalog; 12 unpriced models stay RFQ-only; hydraulic custom page is out of this review)

目标市场参考来源
  - Catalog listing price chips use the same 100-pc unit prices already shown on the four model pages: $57, $42, $60, $218. Localized listing strings: German `57 $/St. · 100+`, Japanese `$57/個 · 100+`, Russian `57 $/шт. · 100+` (and the matching 42/60/218 forms). Reference used for terminology and search-intent only.

术语决定
  - `products.html` is the only indexed catalog. `products-p2.html` is a noindex redirect alias for old page-2 URLs and is removed from i18n ownership, sitemap, search, and llms.
  - Bulk price on listing cards stays `$X/pc · 100+` in English; DE/JA/RU keep the existing on-page unit forms. Under-100 quantity remains request-quote.
  - Public STEP AP214 download wording is unchanged from the 2026-09-01 review.

搜索意图决定
  - Buyers and crawlers hitting `/products-p2.html` must land on the full 16-model catalog, not a second thin listing.
  - Four priced models keep a visible 100-pc list price so AI/schema can quote a number without inventing the other twelve.

pages: en, de, ja, ru catalog listing, products-p2 redirect, four priced model cards, localized llms.txt
language: de, ja, ru (plus English source)
referenceUrls: existing on-page listing chips and model Offer JSON-LD (terminology only)
referenceAccessDates: 2026-09-02
terminologyDecisions: recorded above
searchIntentDecisions: recorded above
