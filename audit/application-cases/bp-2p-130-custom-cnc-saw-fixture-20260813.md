# BP-2P-130-0001 Custom CNC Circular-Saw Fixture Application Evidence

Date: 2026-08-14
Status: Local implementation, automated validation and real-Chrome viewport validation complete; not committed, pushed, or deployed

## 1. Owner-confirmed facts

Evidence source: Begapunk factory confirmation supplied by the project owner on 2026-08-13.

- The equipment is an actual customer production machine and the customer has authorized public use of the supplied video.
- The application is a customer-specific non-standard CNC machining fixture on a circular-blade saw machine.
- The installed rotary union is BP-2P-130-0001.
- Two independent passages carry compressed air for fixture clamp and release.
- The equipment is a low-speed application; no exact rotational speed has been supplied or inferred.
- The public frame shows the rear or tail of the fixture. The front jaws are outside the camera frame.
- The customer and machine brand remain anonymous.

The public implementation does not claim port numbering or assignment, operating pressure, exact rotational speed, duty cycle, service life, leakage performance, customer output, productivity gain or other operating result. Those conditions remain machine-specific and require confirmation from the fixture drawing and approved product data.

## 2. Video source and public derivatives

| Evidence | Dimensions / duration | SHA-256 | Public status |
| --- | --- | --- | --- |
| `E:\Downloads\2501021617392523(1).mp4` | 720 × 1280, 14.47 s | `67169E49B4AB2D5EE98AC5B425F3E9CF05CED31410E962CF1AC531044303C50F` | External evidence source; not copied into the public site |
| Selected frame | 00:00:08.500 | Derived from the source video above | Temporary review artifact only |
| `images/applications/cnc-pneumatic-clamping/bp-2p-130-custom-cnc-circular-saw-fixture-rear-view.jpg` | 720 × 1280 | `D7C814FBFAE2A09C44B3A551EE430B8128B22105E6EC8624AD55E53EC353E8C3` | Public JPEG fallback |
| `images/applications/cnc-pneumatic-clamping/bp-2p-130-custom-cnc-circular-saw-fixture-rear-view.webp` | 720 × 1280 | `A522974FB896FF4F3ED194EC5F806ECAAF8A51C6CD7329E32B80BCF50F357391` | Public WebP primary source |

The selected frame was re-encoded without cropping or altering the photographed equipment. Sharp metadata inspection confirmed 720 × 1280 sRGB output and no EXIF, IPTC, XMP, ICC or GPS payload in either derivative.

## 3. Public implementation

### Application pages

The English, German, Japanese and Russian `application-cnc-pneumatic-clamping.html` pages contain one localized, photo-supported customer production module. The module includes:

- a responsive WebP/JPEG picture using the complete vertical frame;
- localized alt text and image-link accessible name;
- a visible BP-2P-130-0001 product link in the photograph, fact table and primary CTA;
- the two-passage compressed-air clamp/release fact;
- the low-speed context without an unsupported numeric speed;
- the rear-view and off-camera front-jaw boundary;
- anonymous customer disclosure and a positive, machine-specific engineering-confirmation request;
- localized `CreativeWork` structured data.

The public module does not show the earlier long negative disclaimer. It uses the localized heading “Engineering confirmation” and asks the customer for the CNC clamping-fixture drawing and operating conditions so that Begapunk can check the port arrangement, pressure, rotational speed, duty cycle and mounting interface before recommending a configuration. The stricter unsupported-claim boundary remains in this internal audit and in automated validation.

The application-introduction wording explicitly identifies the stationary **compressed-air supply side** and the **rotating fixture**. The earlier ambiguous English phrase “stationary supply” was removed because browser translation could misread it as an electrical power supply; this pneumatic application does not claim electrical transfer.

### Product pages

The four BP-2P-130-0001 product pages contain a reciprocal verified customer-application entry and the same localized `CreativeWork` evidence entity. Existing product specification tables and approved product parameters are unchanged.

### Discovery surfaces

The four search indexes, four `llms.txt` files and both sitemap sources are synchronized with the verified application. Discovery copy states the confirmed model and application without adding pressure, exact speed, lifetime, leakage or customer-performance claims.

## 4. Persistent generation sources

- `scripts/sync-cnc-saw-fixture-case.mjs` owns the four application modules, four product reciprocal entries, exact translation overrides, `llms.txt` entries and sitemap dates.
- `scripts/build-localized-site.mjs` preserves and localizes the `CreativeWork` node during metadata refresh.
- `scripts/verify-localized-site.mjs` checks the image, metadata, localized wording, model links, engineering-confirmation wording, reciprocal product entry, structured data and search records.
- `i18n/overrides/{de,ja,ru}.json` contains exact human-authored translations for future rebuilds.

## 5. Industrial terminology

| Language | Adopted terminology | Terminology evidence |
| --- | --- | --- |
| English | custom CNC circular-saw fixture; clamp and release | Owner-confirmed application description; neutral industrial English |
| German | kundenspezifische CNC-Spannvorrichtung; Kreissägemaschine; Spannen und Lösen | KASTO official circular-saw catalog: https://www.kasto.com/fileadmin/KASTO/Broschueren/german/B-ProdCircularSaw-DE.pdf and BEHRINGER official catalog: https://www.behringer.net/fileadmin/user_upload/Behringer.net/downloads/BE20_EISELE_Gesamtprogramm_de.pdf |
| Japanese | CNC丸鋸盤; 特注クランプ治具; クランプ／アンクランプ | AMADA official machine category and product pages: https://www.amada.co.jp/ja/products/search/function/ and https://products.amada.co.jp/products/product/?language=1&productid=id000237 |
| Russian | круглопильный станок с ЧПУ; нестандартное зажимное приспособление; зажим и разжим | Natural industrial localization of the owner-confirmed facts; no third-party performance claim transferred |

External sources were used only to confirm ordinary industrial terminology. No third-party specification, compatibility, performance or marketing claim was transferred to Begapunk content.

## 6. Validation

- `node --check` passed for the case synchronizer, localized-site verifier and localized metadata builder.
- `npm run cnc-saw-case:verify` passed with zero files requiring synchronization.
- `npm run i18n:verify` passed for 220 localized pages. The case-specific assertions cover all four application pages and four BP-2P-130-0001 product pages, the public image derivatives and stripped metadata, localized copy, model and CTA links, engineering-confirmation wording, reciprocal entries, `CreativeWork` nodes and search records.
- `npm run products:validate` passed for 16 models across four languages, including catalogs, search indexes, JSON-LD and sitemaps.
- `npm run quality:source` passed.
- `npm run claims:verify` passed across 486 source, localized, download, i18n and production text files.
- `npm run quality` passed. The build produced 677 release payload files; final deployment validation reported 221 HTML files, 678 total release files including the generated manifest, and 24 verified public downloads.
- A second metadata refresh followed by the case, soft-isolation and search synchronizers changed none of the 21 case-related source and discovery files.
- `git diff --check` passed; Git reported only existing LF-to-CRLF conversion warnings and no whitespace errors.
- Both public image derivatives were visually inspected at their full 720 × 1280 composition; the photographed equipment was not cropped or altered.
- Local HTTP rendering in real headless Google Chrome passed at 1440, 1024, 430 and 390 CSS-pixel widths. Every request returned HTTP 200, `scrollWidth` equalled `clientWidth`, and no console or page errors were recorded.
- The verified-customer case card rendered at a maximum width of 1120 px on the 1440 px viewport, 976 px at 1024 px, 394 px at 430 px and 354 px on the 390 px Japanese viewport. The intro-to-case gap was 0 px at all four widths, removing the previous oversized blank area without collapsing the section padding.
- The top application visual used `BP-2P-130-0001-1.webp` at every viewport. The public confirmation headings rendered as `Engineering confirmation` in English and `選定時の確認事項` in Japanese; the four-language source verifier covers the German and Russian equivalents.
- Review screenshots are stored outside the repository under `C:\Users\cao19\.codex\visualizations\2026\08\14\cnc-page-ui-review-final\`.

## 7. Release boundary

- Product engineering parameters changed: No.
- Customer identity disclosed: No.
- Source video copied into the repository: No.
- `catalog-project/` changed: No.
- Commit created: No.
- Push performed: No.
- Production deployment performed: No.
