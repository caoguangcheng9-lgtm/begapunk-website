# Begapunk Search Console actions — 2026-07-13

## Production actions completed

- Submitted a real inquiry through `https://www.begapunk.com/contact.html` using clearly marked test-only content.
- The website returned the success message: `询价已成功发送。我们的工程团队将审核您提供的信息。`
- The mailbox owner confirmed that the test inquiry was received, completing the end-to-end website-to-mailbox verification.
- Resubmitted `sitemap.xml` in Google Search Console. Search Console confirmed that the sitemap was submitted successfully.
- Requested indexing for these live URLs:
  - `https://www.begapunk.com/`
  - `https://www.begapunk.com/contact.html`
  - `https://www.begapunk.com/products.html`
  - `https://www.begapunk.com/BP-2P-95-0001.html`

## Crawled, currently not indexed classification

Search Console exported 12 URLs. Eleven already return a relevant permanent redirect. One URL returned 404 and needs a legacy redirect:

| Classification | Count | Action |
| --- | ---: | --- |
| Relevant 301 redirect already live | 11 | No content resurrection required; allow Google to recrawl and consolidate the old URLs. |
| 404 legacy category URL | 1 | Added a local nginx redirect from `/Pneumatic-Fittings-c[0-9]+/` and descendants to `/products.html`. |

The missing redirect was deployed on 2026-07-13 and now returns a permanent redirect to `/products.html`.

## Query-to-page map

| Search intent | GSC evidence | Target page | Action |
| --- | --- | --- | --- |
| Printing machinery rotary unions | `rotary union for printing machinery`: 35 impressions, position 26.31; plural variant: 32 impressions, position 33.19 | `/application-textile-printing-converting.html` | First-priority page; optimized locally around the exact machine-selection intent. |
| Robot rotary unions | 21 impressions, position 31.86 | `/application-robot-end-of-arm-tooling.html` | Keep as the dedicated target; review copy and internal links next. |
| Vacuum packaging rotary unions | 16 impressions at position 61.06, plus related variants | `/application-vacuum-packaging-machines.html` | Keep as the dedicated target; expand selection guidance next. |
| Plastic machinery rotary unions | 17 impressions at position 76.12, plus plural variants | `/applications.html` until a dedicated page exists | Create a dedicated application page only when supported by real product and engineering evidence. |
| Rubber machinery rotary unions | 16 impressions at position 68.56, plus plural variants | `/applications.html` until a dedicated page exists | Same evidence requirement as plastics; avoid a thin near-duplicate page. |

## Local SEO repairs prepared

- Updated the printing/converting application page title, description, H1, opening answer, selection guidance, FAQ schema, internal product links, and CTA.
- Updated the page entry in `search-index.json` and its `sitemap.xml` last-modified date.
- Replaced eight invalid Product rich-result objects on `products.html` with a valid eight-item catalog `ItemList`. Public prices, reviews, and ratings are not published, so Product rich-result markup was intentionally omitted.
- Added the missing legacy nginx redirect for the old pneumatic fittings category.
- Added the web-optimized `Begapunk-Rotary-Joint-Catalog-2026.pdf` to the public `downloads/` directory and added a prominent download button on `products.html`. The separate print PDF remains an internal print asset.

## Validation

- `git diff --check` passed.
- `search-index.json` parses as JSON.
- `sitemap.xml` parses as XML.
- Both changed HTML files contain one title and one H1.
- All JSON-LD blocks parse successfully.
- The products catalog contains eight `ListItem` entries and no Product rich-result objects.
- The product catalog download URL returns the expected PDF and the download button has no horizontal overflow at desktop or 390 px mobile width.

## Deployment status and next steps

The seven production changes were committed as `3c9b95f` and deployed on 2026-07-13. The untracked `catalog-project/` workspace remained untouched. The detailed rollback and verification record is in `audit/seo/deployment-20260713-1952.md`.

Next steps:

1. Request indexing for the newly deployed printing application page and refreshed products page.
2. Monitor the 12 legacy URLs for redirect consolidation and recrawl changes.
3. Monitor the Product-snippet report; the invalid Product objects were removed because public price/review data is not available.
4. Continue expanding the robot, vacuum-packaging, plastics, and rubber-machinery application coverage only from verified engineering evidence.
