# Product Truth Source Inventory and Conflict Baseline

Baseline date: 2026-07-31

Repository baseline: `d95d4db1ce908f941e76bff3f78bc052455d0b0b`

Issue: `#14`

## 1. Scope

Phase 1B re-read product-detail HTML in four languages, JSON-LD, product cards, search and AI derivatives, localization sources, existing audit evidence, public download manifests, tracked engineering files, content-generation scripts, and approved read-only local catalog sources.

The audit normalizes current observations and reports differences. Historical audit statements remain visible but cannot independently create an active conflict. The audit does not decide which conflicting value is correct.

## 2. Source inventory

| Source type | Files |
| --- | ---: |
| `audit-conflict-record` | 1 |
| `audit-evidence-card` | 11 |
| `content-generation-script` | 4 |
| `engineering-binary` | 25 |
| `local-untracked-engineering-binary` | 16 |
| `local-untracked-source` | 4 |
| `product-download-manifest` | 1 |
| `search-or-ai-index` | 8 |
| `translated-content` | 72 |
| `translated-content-source` | 16 |
| `translated-product-html` | 48 |
| `translated-product-list` | 6 |
| `website-product-html` | 16 |
| `website-product-list` | 2 |
| `website-technical-content` | 24 |

Total source files: **254**

Git-tracked sources: **234**

Git-untracked sources: **20**

Protected local catalog sources classified by task policy: **4**

When `PRODUCT_TRUTH_CATALOG_ROOT` is set, every `catalog-project/` source is read from that external directory and classified as a read-only local input, even if a path with the same name also exists in Git. No catalog file is copied into this change.

Manual engineering verification sources: **56**

The complete path, source type, Git state, SHA-256, parseability, model count, and field types are in `audit/product-truth-source-inventory.json`.

## 3. Models and fields

Models observed: **18**

`BP-1P-0003`, `BP-1P-0006`, `BP-200-0001`, `BP-2P-0001`, `BP-2P-0002`, `BP-2P-08-0001`, `BP-2P-130-0001`, `BP-2P-16-0001`, `BP-2P-30-0001`, `BP-2P-50-0001`, `BP-2P-95-0001`, `BP-2P-95-FAMILY`, `BP-3P-0004`, `BP-3P-0006`, `BP-3P-0007`, `BP-3P-S06-0001`, `BP-4P-30-0001`, `BP-8P-0001`

Normalized fields observed: **18**

`body_material`, `channel_configuration`, `compatible_media`, `friction_torque`, `maximum_pressure`, `maximum_speed`, `model`, `model_identity`, `mounting_type`, `operating_temperature`, `passages`, `port_thread`, `protection_rating`, `rated_pressure`, `seal_material`, `test_pressure`, `warranty`, `weight`

Normalized fact observations: **2138**

## 4. Conflict baseline

Previous unresolved-conflict baseline: **56**

Active conflicts after semantic correction: **45**

Historical findings: **17**

Stale references: **15**

Parser ambiguities: **0**

| Model | Field | Normalized values | Public HTML | JSON-LD | Search/AI |
| --- | --- | --- | --- | --- | --- |
| `BP-1P-0003` | `compatible_media` | `air\|coolant\|oil\|water`<br>`air\|oil\|water` | Yes | Yes | Yes |
| `BP-1P-0003` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-1P-0006` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-1P-0006` | `mounting_type` | `4xm4`<br>`threaded` | Yes | Yes | Yes |
| `BP-1P-0006` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-2P-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-0001` | `mounting_type` | `4xm5\|rotor`<br>`flange` | Yes | Yes | Yes |
| `BP-2P-0001` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-2P-0002` | `channel_configuration` | `2-in-2-out`<br>`2-in-3-out` | Yes | No | Yes |
| `BP-2P-0002` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-0002` | `mounting_type` | `m5, m6 and m8 mounting features; see drawing`<br>`threaded` | Yes | Yes | Yes |
| `BP-2P-0002` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-2P-08-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-08-0001` | `mounting_type` | `4xm4`<br>`threaded` | Yes | Yes | Yes |
| `BP-2P-08-0001` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-2P-130-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-130-0001` | `mounting_type` | `8xm0\|8xm10\|flange`<br>`flange`<br>`m10 mounting features; see drawing` | Yes | Yes | Yes |
| `BP-2P-130-0001` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-2P-16-0001` | `channel_configuration` | `1-in-1-out`<br>`2-in-2-out` | Yes | No | Yes |
| `BP-2P-16-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-16-0001` | `maximum_speed` | `200 RPM`<br>`500 RPM` | Yes | Yes | Yes |
| `BP-2P-16-0001` | `mounting_type` | `4xm5\|flange`<br>`4xm5\|rotor\|stator`<br>`flange` | Yes | Yes | Yes |
| `BP-2P-16-0001` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-2P-30-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-30-0001` | `mounting_type` | `4xm5`<br>`4xm5\|flange\|rotor\|stator`<br>`flange` | Yes | Yes | Yes |
| `BP-2P-50-0001` | `mounting_type` | `4xm5\|6xm5\|rotor\|stator`<br>`4xm5\|6xm5\|rotor\|stator\|threaded` | Yes | Yes | Yes |
| `BP-2P-95-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-95-0001` | `mounting_type` | `2xm10\|8xm5\|flange`<br>`6xm5\|8xm8`<br>`flange` | Yes | Yes | Yes |
| `BP-2P-95-0001` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-3P-0004` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-3P-0004` | `mounting_type` | `4xm6\|rotor\|stator`<br>`flange` | Yes | Yes | Yes |
| `BP-3P-0004` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-3P-0006` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-3P-0006` | `mounting_type` | `3xm6\|4xm6\|rotor\|stator`<br>`4xm6\|threaded`<br>`threaded` | Yes | Yes | Yes |
| `BP-3P-0007` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-3P-0007` | `mounting_type` | `3xm5`<br>`3xm5\|rotor\|threaded`<br>`threaded` | Yes | Yes | Yes |
| `BP-3P-0007` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-3P-S06-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-3P-S06-0001` | `mounting_type` | `2xm5\|3xm5`<br>`flange` | Yes | Yes | Yes |
| `BP-4P-30-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-4P-30-0001` | `mounting_type` | `4xm5\|6xm6\|rotor\|stator`<br>`flange` | Yes | Yes | Yes |
| `BP-4P-30-0001` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-8P-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-8P-0001` | `mounting_type` | `4xm5\|flange`<br>`4xm5\|rotor\|stator`<br>`flange` | Yes | Yes | Yes |
| `BP-8P-0001` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |

Every active conflict is `unresolved`, has decision owner `laocao`, and contains no winning or correct value. Only `current-observed` values with unambiguous field semantics and normalized units participate.

## 5. Missing evidence

Public model-field groups without a parsed primary or approved supporting observation: **195**

This is a traceability count, not proof that evidence does not exist. Binary drawings and datasheets were inventoried but intentionally not interpreted automatically.

## 6. Manual engineering confirmation queue

- BP-1P-0003 / compatible_media: check downloads/BP-1P-0003.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-1P-0003 / seal_material: check downloads/BP-1P-0003.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-1P-0006 / compatible_media: check downloads/BP-1P-0006.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-1P-0006 / mounting_type: check downloads/BP-1P-0006.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-1P-0006 / seal_material: check downloads/BP-1P-0006.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-0001 / compatible_media: check downloads/BP-2P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-0001 / mounting_type: check downloads/BP-2P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-0001 / seal_material: check downloads/BP-2P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-0002 / channel_configuration: check downloads/BP-2P-0002.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-0002 / compatible_media: check downloads/BP-2P-0002.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-0002 / mounting_type: check downloads/BP-2P-0002.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-0002 / seal_material: check downloads/BP-2P-0002.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-08-0001 / compatible_media: check downloads/BP-2P-08-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-08-0001 / mounting_type: check downloads/BP-2P-08-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-08-0001 / seal_material: check downloads/BP-2P-08-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-130-0001 / compatible_media: check downloads/BP-2P-130-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-130-0001 / mounting_type: check downloads/BP-2P-130-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-130-0001 / seal_material: check downloads/BP-2P-130-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-16-0001 / channel_configuration: check downloads/BP-2P-16-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-16-0001 / compatible_media: check downloads/BP-2P-16-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-16-0001 / maximum_speed: check downloads/BP-2P-16-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-16-0001 / mounting_type: check downloads/BP-2P-16-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-16-0001 / seal_material: check downloads/BP-2P-16-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-30-0001 / compatible_media: check downloads/BP-2P-30-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-30-0001 / mounting_type: check downloads/BP-2P-30-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-50-0001 / mounting_type: check downloads/BP-2P-50-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-95-0001 / compatible_media: check downloads/BP-2P-95-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-95-0001 / mounting_type: check downloads/BP-2P-95-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-95-0001 / seal_material: check downloads/BP-2P-95-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0004 / compatible_media: check downloads/BP-3P-0004.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0004 / mounting_type: check downloads/BP-3P-0004.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0004 / seal_material: check downloads/BP-3P-0004.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0006 / compatible_media: check downloads/BP-3P-0006.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0006 / mounting_type: check downloads/BP-3P-0006.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0007 / compatible_media: check downloads/BP-3P-0007.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0007 / mounting_type: check downloads/BP-3P-0007.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0007 / seal_material: check downloads/BP-3P-0007.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-S06-0001 / compatible_media: check downloads/BP-3P-S06-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-S06-0001 / mounting_type: check downloads/BP-3P-S06-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-4P-30-0001 / compatible_media: check downloads/BP-4P-30-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-4P-30-0001 / mounting_type: check downloads/BP-4P-30-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-4P-30-0001 / seal_material: check downloads/BP-4P-30-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-8P-0001 / compatible_media: check downloads/BP-8P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-8P-0001 / mounting_type: check downloads/BP-8P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-8P-0001 / seal_material: check downloads/BP-8P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification

## 7. Required regression cases

| Model | Field | Result |
| --- | --- | --- |
| `BP-4P-30-0001` | `passages` | 4 passages retained; Ø30 mm bore excluded from passage count; current-observed without conflict |
| `BP-4P-30-0001` | `maximum_speed` | Current sources show 200 RPM; historical 80 RPM does not create an active conflict; 2 stale-reference; 1 manual-review-required |
| `BP-1P-0003` | `operating_temperature` | Current sources show -20°C to +80°C; historical +120°C does not create an active conflict; 2 stale-reference; 1 manual-review-required |
| `BP-2P-95-0001` | `test_pressure` | Current public page does not directly state 12 MPa. The current PDF (SHA-256 `e93209eddc568b7e6b4073e1d5316dbf29ce9be086de65454becd52b29e1b50c`) visibly says “Test scope confirmed by approved order,” not 1.5× rated pressure; 3 stale-reference |

These classifications are audit-semantics results, not engineering decisions.

## 8. Potential downstream impact

- **Website:** unresolved values may appear in visible specifications, cards, articles, or application guidance.
- **JSON-LD:** some unresolved values are repeated as Product `additionalProperty` claims.
- **Search:** product-page bodies and descriptions are copied into language-specific search indexes.
- **AI citation:** `llms.txt`, search indexes, and localized pages can propagate public claims without creating independent evidence.
- **Downloads:** engineering and catalog files may contain primary-looking values, but applicability and approval must be confirmed manually.

## 9. Next phase recommendation

The remaining active conflicts should be handled in separate, model-scoped decision tasks. Each task must obtain the current approved engineering source and revision from `laocao` before proposing synchronized public changes.

## 10. Non-modification declaration

This task did not modify any public product fact, product HTML, localized parameter, JSON-LD, search index, `llms.txt`, product CSV/JSON fact value, download, `catalog-project/` file, server file, or production deployment.
