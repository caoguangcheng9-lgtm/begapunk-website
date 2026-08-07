# BP-2P-95-0001 Pneumatic Chuck Integration — Refactor and Integration Record

Date: 2026-08-07 (Asia/Tokyo)

Branch: `feature/bp-2p-95-application-case`

Initial draft commit: `97acc54`

Status: local revision; native-language review pending; not pushed, merged, deployed, submitted to IndexNow, or submitted to a search engine

## 1. Scope

This revision converts the four standalone application-case drafts into standard Begapunk case pages and connects them to the public discovery paths used by the English, German, Japanese, and Russian sites.

The integration includes:

- the four localized case-detail pages;
- the four case-study centers, with separate **Real Application Cases** and **Engineering Selection Examples** sections;
- the four `BP-2P-95-0001` product pages through their existing Related Resources area;
- curated SEO records, search indexes, `llms.txt`, `sitemap.xml`, and `sitemap-i18n.xml`;
- the multilingual page registry, editorial status, and validation rules.

No production deployment or search-engine notification is part of this revision.

## 2. Shared fact lock

| Locked concept | Public statement allowed in this revision | Excluded inference |
|---|---|---|
| Product identity | The user identifies the photographed product/application as BP-2P-95-0001. | The photographs do not independently prove the internal model identity. |
| Application | The product is integrated into a pneumatic chuck assembly. | No machine brand, country, project, front/rear position, or customer identity. |
| Integration stage | Workshop assembly and visible installation state. | No commissioning, trial-run, final delivery, customer acceptance, mass-production, or long-term-operation claim. |
| Medium | Compressed air. | No claim that water, coolant, oil, or another medium is approved for this case. |
| Evidence | Two workshop photographs. | Photographs are not test reports, inspection records, or lifetime evidence. |
| Visible relationship | The installation is close to the chuck axis; fixed-side pneumatic hoses approach the rotary-union area; rotating chuck components are on the opposite side of the connection. | No unpublished passage count, internal routing, or port assignment. |
| Engineering purpose | Transfer compressed air from a stationary supply toward rotating chuck components within the available space. | No zero-leakage, stability, maintenance-free, or quantified-improvement claim. |
| Evidence limit | The photographs document the visible assembly geometry and hose routing. | No service life, leakage result, undisclosed pressure/speed capability, final acceptance, or production result. |

No pressure, speed, temperature, weight, material, seal, thread, mounting-hole pattern, lifetime, maintenance interval, or performance number is duplicated into the case pages. The existing source-identity mismatch for `downloads/BP-2P-95-0001.pdf` remains outside this content task.

## 3. Original evidence

| Evidence | Original path | SHA-256 | Visible scope used |
|---|---|---|---|
| Assembly overview | `C:\Users\cao19\AppData\Local\Temp\codex-clipboard-2396d4a1-a238-4f12-8cfd-dfdc5e5b3741.jpg` | `2A58CC6A0EBA9DE60913CBE998D83C645109EEBE40A692903AF0D6D047C80D4B` | Chuck assembly, drive section, installation area, and visible hose routing. |
| Pneumatic connection detail | `C:\Users\cao19\AppData\Local\Temp\codex-clipboard-a5ff5703-9f67-4de5-9cfc-d91fbe37020e.jpg` | `8FCC864CBEB738156A1AC51FB0079E936FB5113C10D3CDC48CDA785D3AFBACF5` | Rotary-union installation position and two visible pneumatic hoses. |

Privacy review found no customer name, legible serial number, QR code, or other clear customer identifier. The generic Chinese equipment-position label visible in the overview does not identify the customer. No anonymization or pixel editing was applied.

## 4. Page refactor

- Reused the site's four-dropdown header, standard five-column footer, mobile Get Quote/WhatsApp bar, and standard CTA component.
- Corrected the shared mobile navigation state so the site's existing `open`, `active`, and `mobile-open` menu classes all receive the same full-width positioning and accessible submenu treatment.
- Replaced the independent card-heavy layout with `.cs-hero`, `.case-row`, `.case-image`, `.case-text`, `.case-spec-table`, `.tech-note`, and `.cta-section`.
- Kept the hero compact and text-led.
- Made the pneumatic connection detail the primary technical image and used it once.
- Used the assembly overview once, in a separate evidence section.
- Applied `loading="lazy"`, explicit dimensions, localized alternative text, full-image links, and `object-fit: contain` to both case photographs.
- Moved evidence limits from the first screen to a near-bottom technical note.
- Replaced unsupported “commissioning/trial run” wording with “workshop assembly and visible installation state”.
- Replaced claims about independent pneumatic paths with the neutral stationary-to-rotating compressed-air relationship.

## 5. Discovery and reverse links

| Mechanism | Result |
|---|---|
| Multilingual registry | Added as page 52; verification covers 208 pages. |
| Case-study centers | Real photo-supported case appears first; three existing selection examples remain under a separate heading. |
| Product pages | Four `BP-2P-95-0001` pages link to their corresponding localized case page. |
| Case pages | Each case page links back to its corresponding localized product page and case center. |
| Search indexes | Each language index contains 49 records and exactly one record for the new case. |
| AI indexes | English and three localized `llms.txt` files include the case; localized grouping treats `case-*` as application content. |
| Sitemaps | Main sitemap contains 49 URLs; multilingual sitemap contains 196 localized `<loc>` entries. |
| Localized metadata | Curated title, description, H1, social metadata, canonical, hreflang, language switcher, BreadcrumbList, and TechArticle `inLanguage` are synchronized. |
| Translation source catalog | `i18n/source-catalog.json` remains unchanged. These four human-authored pages are not falsely marked as automatic-cache translations. |

## 6. Localization status

No full-site translation, cache extraction, automatic translation, `i18n:build`, or `i18n:integrate` command was used. Copy was authored separately in each language under one shared fact lock.

| Language | Status |
|---|---|
| English | Human-authored localized copy; native human review pending |
| German | Human-authored localized copy; native human review pending |
| Japanese | Human-authored localized copy; native human review pending |
| Russian | Human-authored localized copy; native human review pending |

No language is marked “native reviewed”, “professionally translated”, or approved for deployment.

## 7. Validation and rendered QA

Automated validation completed successfully:

- `npm run quality`: PASS.
- `npm run i18n:verify`: PASS for 208 pages.
- `npm run products:validate`: PASS for 16 models across four languages, catalogs, search indexes, JSON-LD, and sitemaps.
- `npm run quality:source`: PASS.
- `npm run claims:verify`: PASS across 462 source, localized, download, i18n, and production text files.
- `npm run deploy:build`: PASS; 624 production files were built and 12 forbidden backup, draft, or quarantined download paths were excluded.
- `npm run deploy:validate`: PASS for 209 HTML files, 625 total release files, and 24 verified public downloads.
- Product/search/sitemap/link integration checks: PASS through the strengthened localized-site verifier.
- Explicit case regression output: PASS for four localized detail pages, case-center links, product-page links, search indexes, canonical/hreflang sets, JSON-LD language values, and both sitemap sources.
- JSON-LD parsing: PASS through product and deployment validation.
- Deterministic metadata refresh: PASS; two consecutive refreshes produced byte-identical metadata outputs and no additional working-tree changes.
- `git diff --check`: PASS; no whitespace errors.

Rendered browser QA completed against a local HTTP preview:

- 1440 px: PASS; centered H1, four desktop dropdowns, five footer columns, both photographs loaded with `object-fit: contain`, and no horizontal overflow.
- 1024 px: PASS; case rows collapse cleanly to one column and both photographs remain uncropped.
- 430 px: PASS; no page or navigation overflow, four localized dropdown groups are accessible, and the fixed quote/WhatsApp bar remains usable.
- 390 px: PASS in English, German, Japanese, and Russian; the menu opens and closes, all four submenu groups are visible, and navigation `scrollWidth` equals `clientWidth`.
- Desktop Products dropdown: PASS by pointer interaction.
- JavaScript console errors: none observed on the case detail page.

QA screenshots are outside the repository and are not part of the commit:

- `C:\Users\cao19\.codex\visualizations\2026\08\07\bp-2p-95-case-refactor\case-en-1440.png`
- `C:\Users\cao19\.codex\visualizations\2026\08\07\bp-2p-95-case-refactor\case-en-1024.png`
- `C:\Users\cao19\.codex\visualizations\2026\08\07\bp-2p-95-case-refactor\case-en-430.png`
- `C:\Users\cao19\.codex\visualizations\2026\08\07\bp-2p-95-case-refactor\case-en-390.png`
- `C:\Users\cao19\.codex\visualizations\2026\08\07\bp-2p-95-case-refactor\case-en-1440-dropdown.png`
- `C:\Users\cao19\.codex\visualizations\2026\08\07\bp-2p-95-case-refactor\case-en-390-menu-open-final.png`

## 8. Remaining limits

- Native German, Japanese, and Russian review remains pending.
- The photographs do not establish operating performance or product limits.
- The automatic translation source catalogue does not yet have a formal `manualLocalizedPages` mechanism; it is intentionally not altered in this revision.
- This revision has not been pushed, merged, deployed, or submitted to any indexing service.
