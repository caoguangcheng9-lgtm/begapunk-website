# Product-detail first-view simplification and compact share menu — local acceptance record

Date: 2026-08-19
Status: Local implementation and automated verification complete; browser visual review pending; not deployed

## Approved scope

- Apply one governed first-view layout to 16 product models in English, German, Japanese, and Russian (64 pages).
- Preserve product facts, metadata, JSON-LD, images, drawings, inquiry parameters, technical body copy, tabs, FAQs, and download destinations.
- Preserve `catalog-project/` without reading or modifying its contents.

## First-view changes

- Removed the five shortcut chips that duplicated the governed product tabs.
- Kept Request Quote as the single primary action and STEP request as the prominent secondary action.
- Converted the drawing/PDF and model-comparison actions into a lighter utility-link row.
- Reduced the first-view highlight list from six repeated statements to four decision parameters. Media and lead-time facts remain in the approved description, specification table, drawing/order boundaries, and technical content where applicable.
- Removed the four expanded social buttons from the decision area. A native, collapsed share disclosure remains beside the page-end technical note; expanding it reveals the original LinkedIn, X, Facebook, and WhatsApp destinations.
- On viewports up to 768 CSS px, the product gallery now precedes the dense product-information block.

## User-review correction

- After user review, the single LinkedIn-only page-end link was replaced with one compact `details`/`summary` entry that preserves all four original share channels.
- All 256 share `href` values were restored from and compared byte-for-byte after HTML decoding with the corresponding pre-change Git values. This preserves nine localized pages whose X and WhatsApp payloads differ from the English source.
- The disclosure is closed by default, uses native keyboard behavior without JavaScript, keeps each expanded target at least 44 CSS px high, and uses normal document flow rather than an overlay.
- Share-only labels are excluded from the internal search index. No product fact, parameter, drawing/download destination, inquiry link, model-comparison link, tab, FAQ, metadata field, or JSON-LD statement was changed by this correction.

## Governed synchronization

The existing product-detail synchronizer owns and verifies the new structure for all 64 pages. It protects content outside the approved first-view regions, validates the two-action hierarchy, two utility links, four highlights, one compact page-end share disclosure with four ordered destinations, cache key, image/information source order, tabs, FAQs, thumbnails, and accessible regions.

The localized generation contract now controls four shared labels per language, including the page-end share trigger. Localization is AI-assisted and technically verified; it is not independent native-speaker sign-off.

## Automated verification

- Product-detail synchronization: PASS, 64/64 pages, zero pending writes.
- Product-detail generation: PASS, 16 sources and 48 generated target-language pages; 192 controlled localized values.
- Structural totals: 64 H1 elements; 128 prominent actions; 128 utility links; 256 first-view highlights; 64 compact share disclosures; 256 preserved share destinations; zero legacy expanded social groups or standalone share links.
- Exact pre-change destination comparison: PASS, 256/256 `href` values across 64 pages.
- Search exclusion: PASS, the compact share UI is absent from all four generated internal-search text indexes.
- Inquiry contract: PASS, 1,242 checks; no HTTP request or form submission.
- Product data: PASS, 16 models across four languages, including catalogs, search indexes, JSON-LD, and sitemaps.
- Localized site: PASS, 224 pages.
- Full `quality:pr`: PASS.
- Local release: 225 HTML pages, 688 built files before the generated manifest, 689 validated total release files, 272 HTTP targets, and 24 verified public downloads.
- Source formatting: PASS (`git diff --check`).

## Open visual gate

The in-app browser connection was unavailable, so current 1440 px, 1024 px, 390 px, 320 px, keyboard/focus, and real 200% zoom screenshots were not captured. This remains a manual pre-deployment acceptance gate and must not be reported as passed.

## Authority boundary

No commit, push, deployment, production form submission, server change, or external message was performed.
