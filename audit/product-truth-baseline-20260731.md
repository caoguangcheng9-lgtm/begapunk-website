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

Normalized fields observed: **21**

`body_material`, `channel_configuration`, `compatible_media`, `friction_torque`, `maximum_pressure`, `maximum_speed`, `model`, `model_identity`, `mounting_style`, `operating_temperature`, `passages`, `port_thread`, `protection_rating`, `rated_pressure`, `rotor_mounting_pattern`, `seal_material`, `stator_mounting_pattern`, `test_pressure`, `unassigned_mounting_pattern`, `warranty`, `weight`

Normalized fact observations: **2210**

## 4. Conflict baseline

Previous unresolved-conflict baseline: **56**

Active conflicts after semantic correction: **31**

Historical findings: **3**

Manual-review findings: **65**

Stale references: **14**

Mismatched source documents: **1**

Observations affected by source identity mismatches: **4**

Port-thread coverage differences: **1**

Parser ambiguities: **0**

| Model | Field | Normalized values | Public HTML | JSON-LD | Search/AI |
| --- | --- | --- | --- | --- | --- |
| `BP-1P-0003` | `compatible_media` | `air\|coolant\|oil\|water`<br>`air\|oil\|water` | Yes | Yes | Yes |
| `BP-1P-0003` | `port_thread` | `g1/4\|g1/8`<br>`g3/8` | Yes | Yes | Yes |
| `BP-1P-0003` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-1P-0006` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-1P-0006` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-2P-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-0001` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-2P-0002` | `channel_configuration` | `2-in-2-out`<br>`2-in-3-out` | Yes | No | Yes |
| `BP-2P-0002` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-0002` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-2P-08-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-08-0001` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-2P-130-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-130-0001` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-2P-16-0001` | `channel_configuration` | `1-in-1-out`<br>`2-in-2-out` | Yes | No | Yes |
| `BP-2P-16-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-16-0001` | `maximum_speed` | `200 RPM`<br>`500 RPM` | Yes | Yes | Yes |
| `BP-2P-16-0001` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-2P-30-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-95-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-95-0001` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-3P-0004` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-3P-0004` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-3P-0006` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-3P-0007` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-3P-0007` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-3P-S06-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-4P-30-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-4P-30-0001` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-8P-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-8P-0001` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |

Every active conflict is `unresolved`, has decision owner `laocao`, and contains no winning or correct value. Only `current-observed` values with unambiguous field semantics and normalized units participate.

## 5. Missing evidence

Public model-field groups without a parsed primary or approved supporting observation: **204**

Each missing-evidence record names its evidence domain and field-appropriate evidence types. Engineering drawings are not used as a universal requirement for business policy, product-master, compliance, or order-specific facts.

## 6. Manual engineering confirmation queue

- BP-1P-0003 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-1P-0003 / port_thread: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-1P-0003 / seal_material: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-1P-0006 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-1P-0006 / seal_material: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-0001 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-0001 / seal_material: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-0002 / channel_configuration: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-0002 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-0002 / seal_material: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-08-0001 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-08-0001 / seal_material: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-130-0001 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-130-0001 / seal_material: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-16-0001 / channel_configuration: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-16-0001 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-16-0001 / maximum_speed: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-16-0001 / seal_material: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-30-0001 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-95-0001 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-2P-95-0001 / seal_material: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-3P-0004 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-3P-0004 / seal_material: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-3P-0006 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-3P-0007 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-3P-0007 / seal_material: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-3P-S06-0001 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-4P-30-0001 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-4P-30-0001 / seal_material: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-8P-0001 / compatible_media: check Approved engineering drawing; approved technical datasheet; controlled engineering specification
- BP-8P-0001 / seal_material: check Approved engineering drawing; approved technical datasheet; controlled engineering specification

## 7. Required regression cases

| Model | Field | Result |
| --- | --- | --- |
| `BP-4P-30-0001` | `passages` | 4 passages retained; Ø30 mm bore excluded from passage count; current-observed without conflict |
| `BP-4P-30-0001` | `maximum_speed` | Current sources show 200 RPM; historical 80 RPM does not create an active conflict; 2 stale-reference; 1 manual-review-required |
| `BP-1P-0003` | `operating_temperature` | Current sources show -20°C to +80°C; historical +120°C does not create an active conflict; 2 stale-reference; 1 manual-review-required |
| `BP-2P-95-0001` | `test_pressure` | Current public page does not directly state 12 MPa. The PDF at the matching filename internally identifies `BP-2P-95-0005`; it is recorded as `source-identity-mismatch` and excluded before any test-pressure interpretation. |
| `BP-2P-50-0001` | mounting semantics | Both current descriptions resolve to stator `4xm5` and rotor `6xm5`; thread depth does not create a threaded mounting style or active conflict. |
| `BP-2P-0002` | `port_thread` | `G1/4 and G1/8 ports` resolves to `g1/4\|g1/8`; the `g1/8` subset is retained as `coverage-difference`, not an active conflict. |

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
