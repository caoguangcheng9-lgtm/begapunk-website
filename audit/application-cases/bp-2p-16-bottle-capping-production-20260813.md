# BP-2P-16-0001 Bottle-Capping Production Application Evidence

Date: 2026-08-13
Status: Local correction complete; real-browser visual acceptance pending; not committed, pushed, or deployed

## 1. Owner-confirmed facts

Evidence source: Begapunk factory confirmation supplied by the project owner on 2026-08-13.

- The photograph may be used publicly and shows an actual customer production machine.
- The installed rotary union visible in the photograph is BP-2P-16-0001.
- Two independent passages carry compressed air for clamping and releasing a pneumatic three-jaw gripper.
- The gripper holds the bottle cap and rotates it during the capping operation.
- The customer and machine brand must remain anonymous.
- BP-2P-08-0001 can also be used for this application type, but it is not the product identified in the photograph.

The public copy does not claim port numbering, operating pressure, rotational speed, duty cycle, service life, leakage performance, production output, customer identity, or machine brand. Those conditions remain machine-specific and require confirmation against the machine design and approved product data.

## 2. Image provenance and privacy

| File | Dimensions | SHA-256 | Public status |
| --- | ---: | --- | --- |
| Supplied source photograph | 1073 × 1458 | `1ADC17C5F7054EEA180DFEE26203F3BDFFFC9CFC6659E9A9BFFF818AD8F3A203` | External evidence source; not copied into the public site under its temporary filename |
| `images/applications/bottle-filling-capping/bp-2p-16-bottle-capping-three-jaw-gripper.jpg` | 960 × 1304 | `5B32198F3490881F6ADFD751854893241C1670DCC0C6CA68FBAA1EBF13C81F10` | Public JPEG fallback |
| `images/applications/bottle-filling-capping/bp-2p-16-bottle-capping-three-jaw-gripper.webp` | 960 × 1304 | `04DBD7D6EA5F0E6FA952038A0C9C877444B65C8A68AC32144AFA9647C83826BC` | Public WebP primary source |

The public derivatives were resized without cropping or altering the photographed equipment. Sharp metadata inspection confirmed 960 × 1304 sRGB output and no EXIF, IPTC, XMP, ICC, or GPS payload in either derivative.

## 3. Public implementation

### Application pages

The following four pages contain one localized, photo-supported production-application module:

- `application-bottle-filling-capping.html`
- `de/application-bottle-filling-capping.html`
- `ja/application-bottle-filling-capping.html`
- `ru/application-bottle-filling-capping.html`

Each module identifies BP-2P-16-0001 as the photographed model and includes the verified facts, anonymous disclosure, machine-specific evidence boundary, responsive JPEG/WebP picture, localized alt text, product links, and engineering-enquiry link. The photograph, the BP-2P-16-0001 value in the facts table, and the existing product CTA all link to the matching product page. The image link has a localized accessible name, while the image and model links have visible keyboard focus treatment.

Each module also identifies BP-2P-08-0001 as an additional model for this application type, with an explicit statement that it is not the product identified in the photograph. Passage count, mounting interface, pressure, speed, dimensions, and the approved drawing remain application-specific selection inputs.

The broader application pages remain in the approved discovery quarantine (`noindex,follow`) because their remaining generic content has not yet received a complete fact review. The new evidence module does not by itself justify opening the whole page for indexing.

### Discoverable product pages

The four BP-2P-16-0001 product pages contain a reciprocal visible verified-production entry and a localized `CreativeWork` JSON-LD evidence node with the public image. Their product search records expose the verified two-passage, three-jaw-gripper bottle-capping application.

The four BP-2P-08-0001 product pages contain a separate owner-confirmed application-fit entry and a localized `CreativeWork` node without an image. They state that the production photograph identifies BP-2P-16-0001, not BP-2P-08-0001.

The quarantined application-page URLs remain absent from search indexes, `llms.txt`, and sitemaps. This structure improves machine-readable evidence and retrieval quality without promising that an AI system or search engine will recommend Begapunk.

## 4. Persistent generation sources

- `scripts/sync-soft-isolation-content.mjs` owns the four application-page modules and scoped stylesheet references.
- `scripts/sync-owner-confirmed-facts.mjs` owns the exact product-page translation overrides.
- `scripts/build-localized-site.mjs` preserves and localizes both product-page `CreativeWork` nodes during metadata refresh.
- `i18n/source-catalog.json` and `i18n/overrides/{de,ja,ru}.json` contain the persistent translation coverage.
- `scripts/verify-localized-site.mjs` prevents image, image-link accessibility, model-link, content, reciprocal-link, photographed-model, alternative-model, discovery, structured-data, and search-index regressions.

## 5. Localized industrial terminology

| Language | Adopted term | Primary terminology evidence |
| --- | --- | --- |
| English | pneumatic three-jaw gripper | Owner-confirmed application description; neutral industrial English |
| German | pneumatischer 3-Finger-Zentrischgreifer | SCHUNK official product category: https://schunk.com/de/de/greiftechnik/zentrischgreifer/c/PUB_8301 |
| Japanese | 3爪エアチャック | SMC official selection guide: https://www.smcworld.com/products/select_guide/ja-jp/actuator/airchack.html |
| Russian | трёхкулачковый пневматический захват | SMC official Russian product page and catalog: https://www.smc.eu/ru-ru/products/standartnyj-mhs3~17485~cfg and https://static.smc.eu/pdf/MHS_RU.pdf |

Competitor and manufacturer sources were used only for terminology. No third-party specification, compatibility, performance, or marketing claim was transferred to Begapunk content.

After generation, the complete bottle-capping evidence set was manually reviewed in English, German, Japanese, and Russian. Ambiguous expressions that could be read or machine-translated as an electrical circuit were removed from the application module, product entries, Product and evidence JSON-LD, search records, and persistent translation sources. The approved localized concepts are `compressed-air passages`, `Druckluftkanäle`, `圧縮空気の流路`, and `каналы подачи сжатого воздуха`. Gripper terminology was checked against primary industrial sources: SCHUNK uses `3-Finger-Zentrischgreifer`, SMC Japan classifies the MHS3 as a `3爪` air chuck, and SMC Russia uses `Захват 3-кулачковый`. The validator now rejects the superseded bottle-capping terms instead of relying on generated output alone.

## 6. Verification

- `npm run i18n:extract`: PASS; 3,245 unique English source strings were catalogued without pruning the existing translation caches.
- `node scripts/sync-owner-confirmed-facts.mjs --check`: PASS; 48 exact owner-confirmed statements are synchronized across German, Japanese, and Russian sources.
- `npm run i18n:refresh-metadata`: PASS; metadata and structured data refreshed for 49 managed pages per localized language without rewriting manual localized pages.
- `npm run search:sync`: PASS; the first run synchronized the changed product records and the final run reported 0 of 4 indexes changed.
- `npm run i18n:verify`: PASS; 220 localized pages passed, including the BP-2P-16-0001 photographed-model and BP-2P-08-0001 alternative-fit boundary.
- Product-link coverage: PASS; all four application pages contain exactly three BP-2P-16-0001 links (the photograph, the model value, and the existing CTA), with localized image-link accessible names and one current scoped stylesheet reference.
- `npm run products:validate`: PASS; 16 models across four languages passed without changing approved specification tables.
- `npm run quality:source`: PASS.
- `npm run claims:verify`: PASS across 486 source, localized, download, i18n, and production text files.
- `npm run quality`: PASS; the complete chain built 674 production files and deployment validation passed with 221 HTML files, 675 total release files, and 24 verified public downloads.
- `git diff --check`: PASS; only Windows line-ending notices were emitted.
- Deterministic refresh: PASS; the target-source diff hash (excluding this audit record) remained `f0bf57d4986e5360b2b2eb3d8adab243e74db599` before and after a second metadata refresh, search sync, and both persistent-source checks.
- `catalog-project/`: unchanged.

Real-browser visual acceptance was attempted twice, but the in-app browser runtime could not initialize (`Cannot redefine property: process`). Visual acceptance therefore remains outstanding; source inspection and automated HTML validation are not presented as browser-tested evidence.

## 7. Release boundary

- Product engineering parameters changed: No.
- Customer identity disclosed: No.
- Application page removed from quarantine: No.
- `catalog-project/` changed: No.
- Commit created: No.
- Push performed: No.
- Production deployment performed: No.
