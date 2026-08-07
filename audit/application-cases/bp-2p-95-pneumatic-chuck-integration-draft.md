# BP-2P-95-0001 Pneumatic Chuck Integration — Draft Delivery Record

Date: 2026-08-07 (Asia/Tokyo)

Branch: `feature/bp-2p-95-application-case`

Status: local draft only; native-language review pending; not approved for deployment

## 1. Scope

This task creates four standalone, locally reviewable application-case pages based on two user-supplied workshop photographs. It does not connect the pages to the case-study index, navigation, sitemap, search index, IndexNow, or production website.

## 2. Shared fact lock

The following facts and evidence limits are locked across English, Japanese, German, and Russian. Wording is localized independently; the underlying meaning must remain the same.

| Locked concept | Approved statement for this draft | Excluded inference |
|---|---|---|
| Product identity | The photographed application is identified by the user as BP-2P-95-0001. | The photographs do not independently verify the engraved/internal model identity. |
| Application | The product is integrated into a real pneumatic chuck assembly. | No machine brand, machine type, country, project name, front/rear chuck position, or customer identity is disclosed. |
| Integration stage | Workshop assembly and commissioning. | No claim of final delivery, customer acceptance, mass production, or long-term operation. |
| Customer | Confidential OEM / anonymous OEM application. | No customer name or identifying business information. |
| Evidence | Two original workshop installation photographs. | Photographs are not test reports, inspection records, or lifetime evidence. |
| Visible installation relationship | Rotary union positioned on the chuck rotation axis; stationary-side hoses connect to the union; rotating-side connection supplies the chuck mechanism. | No unpublished internal passage geometry or unobserved port assignment. |
| Engineering purpose | Transfer compressed air between stationary supply lines and rotating chuck components while managing the installation envelope. | No claim of zero leakage, guaranteed stability, maintenance-free operation, or quantified improvement. |
| Evidence limit | The photographs demonstrate physical integration and visible hose routing within the photographed space. | No final lifetime, universal leakage level, undisclosed pressure/speed performance, final machine delivery, or long-term production result. |

### Deliberately omitted product parameters

No pressure, speed, temperature, weight, material, seal, thread, mounting-hole pattern, lifetime, maintenance interval, or performance number is published in these draft pages.

Reason: `downloads/BP-2P-95-0001.pdf` has SHA-256 `E93209EDDC568B7E6B4073E1D5316DBF29CE9BE086DE65454BECD52B29E1B50C`, but the existing product-truth audit records a source-identity mismatch between the filename/web product identity and the model displayed inside the PDF. The PDF is therefore not used to assign numerical facts to this case. The current public product page is linked for context, but its numerical values are not duplicated in the case draft.

## 3. Original evidence

| Evidence | Original path | SHA-256 | Visible scope used |
|---|---|---|---|
| Assembly overview | `C:\Users\cao19\AppData\Local\Temp\codex-clipboard-2396d4a1-a238-4f12-8cfd-dfdc5e5b3741.jpg` | `2A58CC6A0EBA9DE60913CBE998D83C645109EEBE40A692903AF0D6D047C80D4B` | Chuck assembly, drive section, rotary-union installation environment and hose routing. |
| Pneumatic connection detail | `C:\Users\cao19\AppData\Local\Temp\codex-clipboard-a5ff5703-9f67-4de5-9cfc-d91fbe37020e.jpg` | `8FCC864CBEB738156A1AC51FB0079E936FB5113C10D3CDC48CDA785D3AFBACF5` | Rotary-union installation position and two visible pneumatic hoses. |

Visual privacy check: no customer name, legible serial number, QR code, or other clear customer identifier was found. A generic Chinese equipment-position label is visible in the overview photograph, but it does not identify the customer. No anonymization or pixel editing was applied.

## 4. Image processing

- Original temporary files were not modified.
- Public JPG copies were re-encoded with metadata removed.
- WebP alternatives were generated for both photographs.
- The 1200 × 630 social image uses the complete overview photograph with a neutral background; no mechanical component was generated, removed, recoloured, or cropped out.
- Published derivatives contain no EXIF, GPS, XMP, or retained device metadata.
- Page markup uses `<picture>` with WebP plus JPG fallback and explicit dimensions.
- The overview image is eager/high-priority in the hero. The detail image is lazy-loaded.

## 5. Files added

- `case-bp-2p-95-pneumatic-chuck-integration.html`
- `de/case-bp-2p-95-pneumatic-chuck-integration.html`
- `ja/case-bp-2p-95-pneumatic-chuck-integration.html`
- `ru/case-bp-2p-95-pneumatic-chuck-integration.html`
- `css/application-case.css`
- `images/cases/bp-2p-95-pneumatic-chuck/bp-2p-95-chuck-assembly-overview.jpg`
- `images/cases/bp-2p-95-pneumatic-chuck/bp-2p-95-chuck-assembly-overview.webp`
- `images/cases/bp-2p-95-pneumatic-chuck/bp-2p-95-pneumatic-connection-detail.jpg`
- `images/cases/bp-2p-95-pneumatic-chuck/bp-2p-95-pneumatic-connection-detail.webp`
- `images/cases/bp-2p-95-pneumatic-chuck/bp-2p-95-pneumatic-chuck-social.jpg`
- `audit/application-cases/bp-2p-95-localization-terminology.md`
- `audit/application-cases/bp-2p-95-pneumatic-chuck-integration-draft.md`

## 6. Localization method and review status

- No full-site translation, translation-cache generation, or `i18n:build` command was used.
- A common fact-lock table was established before localized copy was authored.
- EN, JA, DE and RU sentences were organized independently for their industrial audience.
- Titles, descriptions, headings, breadcrumbs, labels, CTAs, image text alternatives, captions, social metadata and JSON-LD natural-language fields were localized.
- Terminology evidence is recorded in `bp-2p-95-localization-terminology.md`.

| Language | Status | Deployment eligibility |
|---|---|---|
| English | Localized draft completed; native human review pending | Not approved |
| Japanese | Localized draft completed; native human review pending | Not approved |
| German | Localized draft completed; native human review pending | Not approved |
| Russian | Localized draft completed; native human review pending | Not approved |

## 7. Unconfirmed facts not written into the pages

- Customer name, location, machine brand and project name.
- Whether the pictured assembly is a front or rear chuck.
- Installation date, operating duration, cycle count and production status.
- Customer acceptance, final machine delivery or series-production use.
- Pressure, rotational speed, temperature, service life and maintenance interval.
- Leakage value, performance improvement, reliability percentage or customer testimonial.
- Exact passage/port mapping beyond what is visible and approved in the task brief.
- Any numerical product fact affected by the current PDF model-identity mismatch.

## 8. Validation results

- Four-page structural validation: PASS. Each page has the expected language declaration, localized title and description, one H1, the complete en/ja/de/ru/x-default hreflang set, canonical URL, Open Graph and Twitter metadata.
- JSON-LD: PASS. Every `Article`/`TechArticle` and `BreadcrumbList` block parses as valid JSON.
- Local resources and links: PASS. Referenced CSS, scripts, JPG/WebP assets and internal targets exist at the resolved local path.
- Fact-boundary scan: PASS. The four case pages contain no pressure, speed, temperature, weight, material, seal, thread, mounting-hole, lifetime or maintenance numbers attributed to BP-2P-95-0001; prohibited absolute performance claims were not found.
- Product-data validation: PASS. Existing product consistency checks remain clean; no product page was changed.
- Public-claim validation: PASS across the repository's source, localized, download, i18n and production text checks.
- Source-quality validation: PASS. Consent, privacy, schema, favicon, external-link and local-dependency checks remain clean.
- Image privacy and metadata: PASS. The two public source derivatives and social image have no EXIF, GPS, XMP or retained ICC/device profile; the original files remain unchanged.
- Git whitespace check: PASS (`git diff --check`).
- Scope check: PASS. Only the four draft pages, one case stylesheet, five derived images and two internal audit records are added.
- Responsive source review: PASS for the declared 1440, 1024, 768, 430 and 390 px breakpoints; flexible grids, bounded media and mobile CTA rules are present.
- Browser-rendered visual QA, console inspection and preview screenshots: PENDING. The available Chrome control surface refused direct `file://` navigation under its URL safety policy, and the in-app preview connection failed to initialize. No workaround or production/local-server change was used. A human or a supported local preview session must still confirm no horizontal overflow, clipping or console errors before Phase B or deployment.

## 9. Phase B work intentionally deferred

- Add the case to `case-studies.html` and localized case-study index pages.
- Decide whether and where the case belongs in the global navigation or application guides.
- Integrate with approved localization metadata/tooling without overwriting the manually reviewed copy.
- Add the four URLs to search indexes, sitemap and any search-engine notification process after approval.
- Obtain and record native-human review for JA, DE and RU.
- Create a reviewed PR, merge and deploy only after the observation period and separate user approval.

No product page, form backend, navigation, case-study index, sitemap, robots file, search-engine submission file, server file, or production page was modified in this task.
