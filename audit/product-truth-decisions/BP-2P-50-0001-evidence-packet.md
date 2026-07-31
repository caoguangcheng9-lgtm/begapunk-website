# BP-2P-50-0001 Engineering Evidence Packet

Phase: 1B

Issue: [#10](https://github.com/caoguangcheng9-lgtm/begapunk-website/issues/10)

Repository baseline: `2f4e8b257acb38c1ef6ba1b4c61938079b5d648a`

Decision owner: `laocao`

## 1. Purpose and boundary

This packet organizes evidence for five unresolved BP-2P-50-0001 fields:

1. weight;
2. compatible media;
3. mounting method and hole pattern;
4. IP/protection rating;
5. seal material.

It does not select a value, establish an authoritative source, modify a public product fact, or authorize a website update. Every engineering observation remains subject to confirmation against a current approved drawing, BOM, test record, datasheet, or order-specific technical specification.

The companion JSON file initializes every field as `pending-laocao-decision`. No other product-truth conflict is handled in this phase.

## 2. Review method and limitations

- Public and local text sources were read directly and hashed with SHA-256.
- Both engineering PDFs were inspected without modification.
- Each PDF page was rendered into a local temporary directory and visually reviewed.
- PDF text extraction was used only to locate and cross-check visible content.
- No OCR-derived value is treated as a drawing observation.
- A filename, local `VERIFIED` label, metadata timestamp, repeated website value, document-control string, or drawing-date string does not independently establish current approval.
- `catalog-project/` was treated as read-only. No protected file was copied into this packet or added to Git.

## 3. Source inventory

### 3.1 Product pages and JSON-LD

| Source | SHA-256 | Relevant location | Git |
| --- | --- | --- | --- |
| `BP-2P-50-0001.html` | `129fd87b3ffc435436f777fcb4ec51383b50ca028ebf1fecdee0f1fe32ebc336` | Product JSON-LD lines 65-78; visible specification table lines 266-277 | tracked |
| `de/BP-2P-50-0001.html` | `0f023719bd08bda282c92b62b6ccc92d16c8d6e56c4d9faefceee8290f656ecc` | Product JSON-LD on line 43; visible specification table lines 225-236 | tracked |
| `ja/BP-2P-50-0001.html` | `3d129ea3aa82026ebbc5074bdbdf62fe667ae96ed3ab7f804d59cf4aa7a0c23d` | Product JSON-LD on line 43; visible specification table lines 225-236 | tracked |
| `ru/BP-2P-50-0001.html` | `9409521135f094fb8999175279b3dbf363179b4277d574c0f8e50801c7894469` | Product JSON-LD on line 43; visible specification table lines 225-236 | tracked |

### 3.2 Product lists and comparison pages

| Source | SHA-256 | Relevant location | Observation scope |
| --- | --- | --- | --- |
| `products.html` | `d641757ccf9ec79b61facadc24d53d0a0035d14390e8a4ff6a98f2405e3cde18` | BP-2P-50-0001 card lines 607-644 | Dust-Proof, flange mount and IP65 image alt text |
| `de/products.html` | `acb8af1c42644a1a76d7cf001466c8d1d8c6731c0ad053925e55a8632a08dbd1` | BP-2P-50-0001 card lines 551-588 | Staubgeschutzt, flange mounting and IP65 image alt text |
| `ja/products.html` | `5c6b35afb4a6f4e4b193be9463e49939652f44227afa775348b88ddc47544bf9` | BP-2P-50-0001 card lines 551-588 | IP65 dust-protection wording and flange mounting |
| `ru/products.html` | `5b7c472fa62ae679528b3258e1628264efc76062abbacaf378eec545400faedb` | BP-2P-50-0001 card lines 551-588 | IP65 dust-protection wording and flange mounting |
| `product-comparison.html` | `b2403e43c0d4a70bcd3109cfb7afeab5b0c6216fe9a71a6642966eb3691722e4` | comparison row lines 205-212 | Flange mount; IP65 dust-proof environments |
| `de/product-comparison.html` | `914165ed14b14ca24f820693763fe50bb765af9bc3b26d95440df2e7c40b9c20` | comparison row lines 181-188 | Flanschmontage; IP65 environments |
| `ja/product-comparison.html` | `4c2f5ad4435a644be0bbf47f73ff12009d0fca89e364386b3973e290c18c8177` | comparison row lines 181-188 | Flange mounting; IP65 environment |
| `ru/product-comparison.html` | `c9d7aebcf2f69a5c3e6dc73dbb7fc7aeb4c210e8f32d35fd1167bfbc6c161c2d` | comparison row lines 181-188 | Flange mounting; IP65 environment |

### 3.3 Search and AI derivatives

| Source | SHA-256 | Relevant location | Observation scope |
| --- | --- | --- | --- |
| `search-index.json` | `4dd1d561b9b57d180a7b171d6059d9baac0b5efc7818fbe6d9bff8b0ae03f435` | array entry `id=BP-2P-50-0001` | Repeats all five public fields in body/keywords |
| `de/search-index.json` | `ae69493ce0126c54b5cfae9ac948c3797a20a665c44be27d32ae1be375363330` | array entry `id=BP-2P-50-0001` | Repeats all five public fields in localized body plus inherited English keywords |
| `ja/search-index.json` | `45bee8f9cc77a3b8b30ad13d45b56f56fc541a09d25deeba768cc4860a962456` | array entry `id=BP-2P-50-0001` | Repeats all five public fields in localized body plus inherited English keywords |
| `ru/search-index.json` | `a3848e73aee7c120279c326a70fe8feb9a16f43976c2b833dd420d9e77e887a5` | array entry `id=BP-2P-50-0001` | Repeats all five public fields in localized body plus inherited English keywords |
| `llms.txt` | `52d4db64ca86d7d1eed3ab1e0c480a280f9a000aea5a84458bf36a57f8bf561a` | lines 38, 96, 113 and 130 | Describes dust resistance, two passages and flange mounting in four languages |
| `de/llms.txt` | `7bd2419f7d23e16dc755dd962687d24637ae79d6f7f52c7b3784f7076a1bd1d7` | line 21 | Describes a dust-protected two-channel unit with flange connection |
| `ja/llms.txt` | `5b9cc1fdc7332bad20baf3781a2b391a69f47b027b09cb6d1e2df5b4127cfda4` | line 21 | Describes a dust-oriented two-passage flange-mounted unit |
| `ru/llms.txt` | `dd239e3d224ad3719019000e78d591ae2b56af06f1f113db242c29b42bcbb67d` | line 21 | Describes a dust-protected two-channel unit with flange mounting |

### 3.4 Protected catalog and existing audit records

| Source | SHA-256 | Relevant location | Git |
| --- | --- | --- | --- |
| `catalog-project/data/catalog-data.csv` | `e366e2f2d699fc387065795904b280860bfc146d8dd8a16034dfaed4beb1a510` | model row `BP-2P-50-0001` | tracked before this task; unchanged |
| `catalog-project/data/catalog-data.json` | `0e277cdc4156ed949e3b6e8fc6d9d2647729e0e0f80a59ed4006608369b82e2e` | array index `[8]` | untracked; unchanged |
| `catalog-project/data/source-evidence.json` | `e2c0b764af3746512b9d4c312a281b03367229a8717d81db2cd291303239c6ff` | array index `[8]` | tracked before this task; unchanged |
| `catalog-project/audit/catalog-data-conflicts.md` | `ec737b75d5c83d9539d46cf3583c1c8761af9b91d3c51408f53dadab319b4ca1` | lines 139-143 | untracked; unchanged |
| `audit/fact-resolution/phase-1e-a/product-fact-conflicts.csv` | `33c482809594992c9e22d1730fc522c9f7e157afb7cc38893ea423784d5ba469` | conflict `P1EA-009` | tracked |
| `audit/fact-resolution/phase-1e-a/evidence-cards/09-BP-2P-50-0001-weight.md` | `3422b70ac047a7cf792a72b38f86d0698ed330c66d081dc0cdb47cc6805ef5e5` | complete evidence card | tracked |
| `audit/product-truth-conflicts.json` | `48b11814e211181f3e57ddca4b8fcb48f1d200da26da291dc54e63f0ad7e2d3a` | five BP-2P-50-0001 conflict records | tracked |

The local CSV/JSON label `VERIFIED` and `source-evidence.json` file reference are evidence-chain observations, not proof that a drawing is currently approved.

## 4. Engineering file review

### 4.1 File inventory

| Property | Public download | Protected catalog drawing |
| --- | --- | --- |
| Path | `downloads/BP-2P-50-0001.pdf` | `catalog-project/assets/drawings/BP-2P-50-0001.pdf` |
| SHA-256 | `652375676687345701f7b497d661fb4f6dedb9ddcb31a6d18df1f99ec5cf915c` | `31c63b5f52574bed72d4bb2260b1307df73d0023a734d8dd6bc1ee84509ac644` |
| Git state | tracked | untracked and protected |
| Type | PDF 1.3, A4 landscape | PDF 1.4, A4 landscape, optimized |
| Pages | 1 | 1 |
| Visible drawing model | `BP-2P-50-0001` | `BP-2P-50-0001` |
| Visible drawing date | `2023-8-6` | `2023-8-6` |
| Explicit revision | none visible | none visible |
| Metadata title | `BP-2P-50-0001 Technical Drawing` | `BP-2P-50-001` |
| Metadata author/creator | Ningbo Begapunk Pneumatic Components Co., Ltd. / Begapunk | `WINDOWS\cao19 (WINDOWS)` / SOLIDWORKS 2024 SP5.0 |
| Metadata creation/modification | not stated | 2026-05-14 08:39:35 to 08:39:38 +08:00 |
| Current approval proven by file | no | no |

### 4.2 Hash comparison and visible differences

The PDF hashes are different. They must not be treated as identical or interchangeable.

Common visible drawing observations on page 1:

- drawing title block model `BP-2P-50-0001`;
- medium `Air`;
- material `Aluminum Alloy 6061`;
- weight `2300g`;
- seal material `PTFE,O-Ring`;
- date `2023-8-6`;
- `4-M5` thread depth `10`;
- `6-M5` thread depth `8`;
- `2-G1/8 IN` and `2-G1/8 OUT`;
- common principal dimensions and hole pattern.

Observed differences:

- The public PDF is 237,382 bytes; the protected catalog PDF is 118,512 bytes.
- The public PDF metadata uses the complete model and Begapunk company identity. The protected PDF metadata title omits one zero (`BP-2P-50-001`) and identifies a local Windows/SOLIDWORKS producer.
- The public PDF visibly adds issuer/document-control presentation including `QC-2023-0806-001`.
- Public note 3 says `Test scope confirmed by approved order`; protected-drawing note 3 says `100% pressure tested at 1.5x rated pressure`.
- Public note 5 says `Available records confirmed by order`; protected-drawing note 5 says `Material certificates available on request`.
- The protected PDF text layer contains issuer/document-control strings, but the local Poppler render did not display that area reliably because the source uses unavailable fonts. Those text-layer strings are not promoted to visible drawing observations.
- Neither file displays an explicit revision field, approval signature, approval status, or controlled statement proving that it is the current released drawing.

The newer protected-PDF metadata timestamp does not establish drawing approval or supersession. The public document-control string also does not, by itself, establish current approval.

## 5. Five-field decision matrix

### 5.1 Weight

| Evidence category | Observation | Source and location |
| --- | --- | --- |
| Current English webpage | `Approx. 4.26 kg (4,260 g)` | `BP-2P-50-0001.html`, SHA-256 `129fd87b3ffc435436f777fcb4ec51383b50ca028ebf1fecdee0f1fe32ebc336`, visible table line 276 |
| English JSON-LD | `Approx. 4.26 kg (4,260 g)` | same file and hash, Product `additionalProperty` line 76 |
| Multilingual pages | DE `Ca. 4.26 kg (4,260 g)` / JSON-LD `ca. 4,26 kg (4.260 g)`; JA visible `交通アクセス 4.26 kg (4,260 g)` / JSON-LD `約 4.26 kg（4,260 g）`; RU visible `Приближается. 4.26 kg (4,260 g)` / JSON-LD `Около 4,26 кг (4 260 g)` | `de/BP-2P-50-0001.html` SHA `0f023719bd08bda282c92b62b6ccc92d16c8d6e56c4d9faefceee8290f656ecc`, `ja/BP-2P-50-0001.html` SHA `3d129ea3aa82026ebbc5074bdbdf62fe667ae96ed3ab7f804d59cf4aa7a0c23d`, `ru/BP-2P-50-0001.html` SHA `9409521135f094fb8999175279b3dbf363179b4277d574c0f8e50801c7894469`; visible table lines 235 and JSON-LD line 43 |
| Product catalog | `2.3 kg` | `catalog-project/data/catalog-data.csv` SHA `e366e2f2d699fc387065795904b280860bfc146d8dd8a16034dfaed4beb1a510`, model row; `catalog-project/data/catalog-data.json` SHA `0e277cdc4156ed949e3b6e8fc6d9d2647729e0e0f80a59ed4006608369b82e2e`, index `[8]` |
| Existing evidence record | Web `Approx. 4.26 kg`; PDF `2300 g (2.30 kg)`; metadata-title inconsistency noted | conflict CSV SHA `33c482809594992c9e22d1730fc522c9f7e157afb7cc38893ea423784d5ba469`, `P1EA-009`; evidence card SHA `3422b70ac047a7cf792a72b38f86d0698ed330c66d081dc0cdb47cc6805ef5e5` |
| Visible drawing observation | `Weight 2300g` on page 1 of both PDFs | public PDF SHA `652375676687345701f7b497d661fb4f6dedb9ddcb31a6d18df1f99ec5cf915c`; protected PDF SHA `31c63b5f52574bed72d4bb2260b1307df73d0023a734d8dd6bc1ee84509ac644` |

Conflict: yes.

Impact: visible website yes; JSON-LD yes; all four search indexes yes; root and localized `llms.txt` do not state weight.

Current approval status: not established.

Questions for `laocao`:

1. What is the current complete sellable assembly mass?
2. Does 2300 g include the flange, shroud, fittings and all supplied components?
3. Which approved drawing, BOM, inspection record or controlled weighing record applies?

### 5.2 Compatible media

| Evidence category | Observation | Source and location |
| --- | --- | --- |
| Current English webpage | `Air, water, water-soluble coolant, light hydraulic oil (ISO VG 32 max)` | `BP-2P-50-0001.html` SHA `129fd87b3ffc435436f777fcb4ec51383b50ca028ebf1fecdee0f1fe32ebc336`, visible table line 274 |
| English JSON-LD | same broad media list | same file and hash, Product `additionalProperty` line 70 |
| Multilingual pages | DE, JA and RU repeat the same broad media scope in localized visible specifications and JSON-LD | DE SHA `0f023719bd08bda282c92b62b6ccc92d16c8d6e56c4d9faefceee8290f656ecc`, JA SHA `3d129ea3aa82026ebbc5074bdbdf62fe667ae96ed3ab7f804d59cf4aa7a0c23d`, RU SHA `9409521135f094fb8999175279b3dbf363179b4277d574c0f8e50801c7894469`; visible line 233 and JSON-LD line 43 |
| Product catalog | `Air` | CSV SHA `e366e2f2d699fc387065795904b280860bfc146d8dd8a16034dfaed4beb1a510`, model row; JSON SHA `0e277cdc4156ed949e3b6e8fc6d9d2647729e0e0f80a59ed4006608369b82e2e`, index `[8]` |
| Existing evidence record | Phase 1A records `air` versus `air|coolant|oil|water`; local `source-evidence.json` only points to the drawing | `audit/product-truth-conflicts.json` SHA `48b11814e211181f3e57ddca4b8fcb48f1d200da26da291dc54e63f0ad7e2d3a`; `source-evidence.json` SHA `e2c0b764af3746512b9d4c312a281b03367229a8717d81db2cd291303239c6ff`, index `[8]` |
| Visible drawing observation | `Medium Air` on page 1 of both PDFs | public PDF SHA `652375676687345701f7b497d661fb4f6dedb9ddcb31a6d18df1f99ec5cf915c`; protected PDF SHA `31c63b5f52574bed72d4bb2260b1307df73d0023a734d8dd6bc1ee84509ac644` |

Conflict: yes.

Impact: visible website yes; JSON-LD yes; all four search indexes yes; `llms.txt` does not enumerate media.

Current approval status: not established.

Questions for `laocao`:

1. Is the standard approved medium Air only?
2. If liquid media are approved, what pressure, speed, temperature, filtration, corrosion and service-life limits apply?
3. Which approved compatibility record or controlled specification supports the broader list?

### 5.3 Mounting method and hole pattern

| Evidence category | Observation | Source and location |
| --- | --- | --- |
| Current English webpage | `Flange Mount (6-M5)` | `BP-2P-50-0001.html` SHA `129fd87b3ffc435436f777fcb4ec51383b50ca028ebf1fecdee0f1fe32ebc336`, visible table line 268 |
| English JSON-LD | `Flange mount (6-M5)` | same file and hash, Product `additionalProperty` line 74 |
| Multilingual pages | Visible DE/JA/RU text says flange mounting and points users to the drawing; localized JSON-LD says flange mounting `(6-M5)` | DE SHA `0f023719bd08bda282c92b62b6ccc92d16c8d6e56c4d9faefceee8290f656ecc`, JA SHA `3d129ea3aa82026ebbc5074bdbdf62fe667ae96ed3ab7f804d59cf4aa7a0c23d`, RU SHA `9409521135f094fb8999175279b3dbf363179b4277d574c0f8e50801c7894469`; visible line 227 and JSON-LD line 43 |
| Product lists/comparisons | All four product lists and comparison rows use generic flange-mount wording; the public card alt text also associates the model with flange mounting | product-list and comparison hashes in sections 3.2 |
| Product catalog | `4 x M5 stator mount, depth 10 mm; 6 x M5 rotor mount, depth 8 mm` | CSV SHA `e366e2f2d699fc387065795904b280860bfc146d8dd8a16034dfaed4beb1a510`, model row; JSON SHA `0e277cdc4156ed949e3b6e8fc6d9d2647729e0e0f80a59ed4006608369b82e2e`, index `[8]` |
| Existing evidence record | Phase 1A records `4xm5|6xm5|rotor|stator`, `6xm5|flange` and generic `flange` | `audit/product-truth-conflicts.json` SHA `48b11814e211181f3e57ddca4b8fcb48f1d200da26da291dc54e63f0ad7e2d3a` |
| Visible drawing observation | `4-M5` depth `10`; `6-M5` depth `8`; drawing views show distinct stator/rotor-side patterns | page 1 of both PDFs, SHAs `652375676687345701f7b497d661fb4f6dedb9ddcb31a6d18df1f99ec5cf915c` and `31c63b5f52574bed72d4bb2260b1307df73d0023a734d8dd6bc1ee84509ac644` |

Conflict or material incompleteness: yes. The generic flange wording may describe only part of the two-sided mounting interface; this packet does not decide whether it is wrong or merely incomplete.

Impact: visible website yes; JSON-LD yes; product lists/comparisons yes; all search indexes yes; all root/localized `llms.txt` files describe flange mounting.

Current approval status: not established.

Questions for `laocao`:

1. Should both stator and rotor patterns be public?
2. Is `(6-M5)` only the rotor-side pattern?
3. Which approved drawing revision establishes quantities, threads, pitch circles and depths?

### 5.4 IP/protection rating

| Evidence category | Observation | Source and location |
| --- | --- | --- |
| Current English webpage | `IP65-rated labyrinth seal and protective shroud` | `BP-2P-50-0001.html` SHA `129fd87b3ffc435436f777fcb4ec51383b50ca028ebf1fecdee0f1fe32ebc336`, visible table line 273 |
| English JSON-LD | `IP65 dust-proof structure` | same file and hash, Product `additionalProperty` line 73 |
| Multilingual pages | Visible DE/JA/RU specifications describe a labyrinth/protective cover without an explicit IP number; their JSON-LD states IP65 | DE SHA `0f023719bd08bda282c92b62b6ccc92d16c8d6e56c4d9faefceee8290f656ecc`, JA SHA `3d129ea3aa82026ebbc5074bdbdf62fe667ae96ed3ab7f804d59cf4aa7a0c23d`, RU SHA `9409521135f094fb8999175279b3dbf363179b4277d574c0f8e50801c7894469`; visible line 232 and JSON-LD line 43 |
| Product lists/comparisons | Product cards and comparison use dust-protected/IP65 environment wording | product-list and comparison hashes in section 3.2 |
| Product catalog | no protection-rating field is present for this model | CSV SHA `e366e2f2d699fc387065795904b280860bfc146d8dd8a16034dfaed4beb1a510`; JSON SHA `0e277cdc4156ed949e3b6e8fc6d9d2647729e0e0f80a59ed4006608369b82e2e` |
| Existing evidence record | Phase 1A records generic `dust-proof` versus `IP65`; no approved protection test was established | `audit/product-truth-conflicts.json` SHA `48b11814e211181f3e57ddca4b8fcb48f1d200da26da291dc54e63f0ad7e2d3a` |
| Visible drawing observation | no IP rating, test standard or protection classification was found on page 1 of either PDF | PDF SHAs `652375676687345701f7b497d661fb4f6dedb9ddcb31a6d18df1f99ec5cf915c` and `31c63b5f52574bed72d4bb2260b1307df73d0023a734d8dd6bc1ee84509ac644` |

Conflict or unsupported specificity: yes.

Impact: visible website yes; JSON-LD yes; product lists/comparisons yes; all search indexes yes; all root/localized `llms.txt` files carry dust-protection wording.

Current approval status: not established.

Questions for `laocao`:

1. Is IP65 approved for the complete assembly?
2. Which test report, standard, test configuration and approved revision support it?
3. If only the labyrinth and protective shroud are established, what qualified public wording is authorized?

### 5.5 Seal material

| Evidence category | Observation | Source and location |
| --- | --- | --- |
| Current English webpage | `PTFE (Teflon) composite seal with FKM O-ring backup` | `BP-2P-50-0001.html` SHA `129fd87b3ffc435436f777fcb4ec51383b50ca028ebf1fecdee0f1fe32ebc336`, visible table line 272 |
| English JSON-LD | same PTFE composite plus FKM statement | same file and hash, Product `additionalProperty` line 72 |
| Multilingual pages | DE, JA and RU repeat PTFE plus FKM O-ring wording in visible specifications and JSON-LD | DE SHA `0f023719bd08bda282c92b62b6ccc92d16c8d6e56c4d9faefceee8290f656ecc`, JA SHA `3d129ea3aa82026ebbc5074bdbdf62fe667ae96ed3ab7f804d59cf4aa7a0c23d`, RU SHA `9409521135f094fb8999175279b3dbf363179b4277d574c0f8e50801c7894469`; visible line 231 and JSON-LD line 43 |
| Product catalog | `PTFE, O-Ring` | CSV SHA `e366e2f2d699fc387065795904b280860bfc146d8dd8a16034dfaed4beb1a510`, model row; JSON SHA `0e277cdc4156ed949e3b6e8fc6d9d2647729e0e0f80a59ed4006608369b82e2e`, index `[8]` |
| Existing evidence record | Phase 1A records `fkm|o-ring|ptfe` versus `o-ring|ptfe`; local source record does not independently identify O-ring compound | `audit/product-truth-conflicts.json` SHA `48b11814e211181f3e57ddca4b8fcb48f1d200da26da291dc54e63f0ad7e2d3a`; `source-evidence.json` SHA `e2c0b764af3746512b9d4c312a281b03367229a8717d81db2cd291303239c6ff` |
| Visible drawing observation | `Seal Material PTFE,O-Ring`; no FKM compound is visibly specified | page 1 of both PDFs, SHAs `652375676687345701f7b497d661fb4f6dedb9ddcb31a6d18df1f99ec5cf915c` and `31c63b5f52574bed72d4bb2260b1307df73d0023a734d8dd6bc1ee84509ac644` |

Conflict or unsupported specificity: yes.

Impact: visible website yes; JSON-LD yes; all four search indexes yes; `llms.txt` does not identify seal material.

Current approval status: not established.

Questions for `laocao`:

1. Is the standard O-ring specifically FKM?
2. What exact PTFE compound or composite construction is approved?
3. Which approved drawing, BOM, seal specification or material record supports the full wording?

## 6. Decision summary

| Field | Current status | Codex decision |
| --- | --- | --- |
| Weight | `pending-laocao-decision` | none |
| Compatible media | `pending-laocao-decision` | none |
| Mounting method and hole pattern | `pending-laocao-decision` | none |
| IP/protection rating | `pending-laocao-decision` | none |
| Seal material | `pending-laocao-decision` | none |

No current approved source was established for any of the five fields. This statement means the reviewed materials did not prove approval; it does not mean an approved source does not exist.

## 7. Required next input from laocao

For each field, provide:

1. the applicable approved source path or controlled record identifier;
2. the approved revision/date;
3. the exact assembly or configuration scope;
4. the decision statement;
5. whether a later synchronized update may cover visible HTML, JSON-LD, translations, product lists, comparison pages, search indexes, `llms.txt`, downloads and catalog records.

Until those answers are recorded, no public product fact should be changed.

## 8. Non-modification declaration

This Phase 1B packet did not modify product HTML, JSON-LD, translations, product lists, comparison pages, search indexes, `llms.txt`, product data, downloads, engineering PDFs, `catalog-project/`, production server files or deployment state.
