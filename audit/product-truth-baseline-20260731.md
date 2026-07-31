# Product Truth Source Inventory and Conflict Baseline

Baseline date: 2026-07-31

Repository baseline: `472de959069a1e2da7a530be3dd449399b30e255`

Issue: `#8`

## 1. Scope

Phase 1A inventoried product-detail HTML in four languages, JSON-LD, product cards, search and AI derivatives, localization sources, existing audit evidence, public download manifests, tracked engineering files, content-generation scripts, and approved read-only local catalog sources.

The audit normalizes observations and reports differences. It does not decide which conflicting value is correct.

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

Git-tracked sources: **236**

Git-untracked sources: **18**

Protected local catalog sources classified by task policy: **4**

Two protected local catalog inputs (`catalog-data.csv` and `source-evidence.json`) are already Git-tracked at this baseline even though the surrounding `catalog-project/` tree is otherwise untracked. The audit records the actual Git state and keeps the entire directory read-only.

Manual engineering verification sources: **56**

The complete path, source type, Git state, SHA-256, parseability, model count, and field types are in `audit/product-truth-source-inventory.json`.

## 3. Models and fields

Models observed: **18**

`BP-1P-0003`, `BP-1P-0006`, `BP-200-0001`, `BP-2P-0001`, `BP-2P-0002`, `BP-2P-08-0001`, `BP-2P-130-0001`, `BP-2P-16-0001`, `BP-2P-30-0001`, `BP-2P-50-0001`, `BP-2P-95-0001`, `BP-2P-95-FAMILY`, `BP-3P-0004`, `BP-3P-0006`, `BP-3P-0007`, `BP-3P-S06-0001`, `BP-4P-30-0001`, `BP-8P-0001`

Normalized fields observed: **18**

`body_material`, `channel_configuration`, `compatible_media`, `friction_torque`, `maximum_pressure`, `maximum_speed`, `model`, `model_identity`, `mounting_type`, `operating_temperature`, `passages`, `port_thread`, `protection_rating`, `rated_pressure`, `seal_material`, `test_pressure`, `warranty`, `weight`

Normalized fact observations: **2130**

## 4. Conflict baseline

Unresolved conflicts: **56**

| Model | Field | Normalized values | Public HTML | JSON-LD | Search/AI |
| --- | --- | --- | --- | --- | --- |
| `BP-1P-0003` | `body_material` | `aluminum-6061`<br>`steel-45` | Yes | Yes | Yes |
| `BP-1P-0003` | `compatible_media` | `air\|coolant\|oil\|water`<br>`air\|oil\|water` | Yes | Yes | Yes |
| `BP-1P-0003` | `operating_temperature` | `-20..120 °C`<br>`-20..80 °C` | Yes | Yes | Yes |
| `BP-1P-0003` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-1P-0006` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-1P-0006` | `mounting_type` | `4xm4`<br>`threaded` | Yes | Yes | Yes |
| `BP-1P-0006` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-2P-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-0001` | `mounting_type` | `4xm5\|rotor`<br>`flange` | Yes | Yes | Yes |
| `BP-2P-0001` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-2P-0001` | `weight` | `0.39 kg`<br>`0.85 kg` | Yes | Yes | Yes |
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
| `BP-2P-30-0001` | `model_identity` | `bp-2p-30-0001`<br>`bp-3p-30-0001` | Yes | No | Yes |
| `BP-2P-30-0001` | `mounting_type` | `4xm5`<br>`4xm5\|flange\|rotor\|stator`<br>`flange` | Yes | Yes | Yes |
| `BP-2P-50-0001` | `mounting_type` | `4xm5\|6xm5\|rotor\|stator`<br>`4xm5\|6xm5\|rotor\|stator\|threaded` | Yes | Yes | Yes |
| `BP-2P-50-0001` | `weight` | `2.3 kg`<br>`4.26 kg` | Yes | No | Yes |
| `BP-2P-95-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-2P-95-0001` | `model_identity` | `bp-2p-95-0001`<br>`bp-2p-95-0005` | Yes | No | Yes |
| `BP-2P-95-0001` | `mounting_type` | `2xm10\|8xm5\|flange`<br>`6xm5\|8xm8`<br>`flange` | Yes | Yes | Yes |
| `BP-2P-95-0001` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-2P-95-0001` | `test_pressure` | `12 mpa`<br>`no direct numeric test pressure; note says 1.5x rated pressure` | Yes | No | Yes |
| `BP-2P-95-FAMILY` | `rated_pressure` | `1 mpa for internally titled bp-2p-95-0005`<br>`10 mpa` | Yes | No | No |
| `BP-3P-0004` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-3P-0004` | `mounting_type` | `4xm6\|rotor\|stator`<br>`flange` | Yes | Yes | Yes |
| `BP-3P-0004` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-3P-0004` | `weight` | `0.45 kg`<br>`0.49 kg` | Yes | Yes | Yes |
| `BP-3P-0006` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-3P-0006` | `mounting_type` | `3xm6\|4xm6\|rotor\|stator`<br>`4xm6\|threaded`<br>`threaded` | Yes | Yes | Yes |
| `BP-3P-0007` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-3P-0007` | `mounting_type` | `3xm5`<br>`3xm5\|rotor\|threaded`<br>`threaded` | Yes | Yes | Yes |
| `BP-3P-0007` | `seal_material` | `fkm\|o-ring\|ptfe`<br>`o-ring\|ptfe` | Yes | Yes | Yes |
| `BP-3P-S06-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-3P-S06-0001` | `mounting_type` | `2xm5\|3xm5`<br>`flange` | Yes | Yes | Yes |
| `BP-4P-30-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-4P-30-0001` | `maximum_speed` | `200 RPM`<br>`80 RPM` | Yes | Yes | Yes |
| `BP-4P-30-0001` | `mounting_type` | `4xm5\|6xm6\|rotor\|stator`<br>`flange` | Yes | Yes | Yes |
| `BP-4P-30-0001` | `passages` | `30 passages`<br>`4 passages` | Yes | Yes | Yes |
| `BP-4P-30-0001` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |
| `BP-8P-0001` | `compatible_media` | `air`<br>`air\|coolant\|oil\|water` | Yes | Yes | Yes |
| `BP-8P-0001` | `mounting_type` | `4xm5\|flange`<br>`4xm5\|rotor\|stator`<br>`flange` | Yes | Yes | Yes |
| `BP-8P-0001` | `seal_material` | `o-ring\|ptfe`<br>`ptfe` | Yes | Yes | Yes |

Every conflict is `unresolved`, has decision owner `laocao`, and contains no winning or correct value.

## 5. Missing evidence

Public model-field groups without a parsed primary or approved supporting observation: **188**

This is a traceability count, not proof that evidence does not exist. Binary drawings and datasheets were inventoried but intentionally not interpreted automatically.

## 6. Manual engineering confirmation queue

- BP-1P-0003 / body_material: check downloads/BP-1P-0003.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-1P-0003 / compatible_media: check downloads/BP-1P-0003.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-1P-0003 / operating_temperature: check downloads/BP-1P-0003.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-1P-0003 / seal_material: check downloads/BP-1P-0003.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-1P-0006 / compatible_media: check downloads/BP-1P-0006.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-1P-0006 / mounting_type: check downloads/BP-1P-0006.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-1P-0006 / seal_material: check downloads/BP-1P-0006.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-0001 / compatible_media: check downloads/BP-2P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-0001 / mounting_type: check downloads/BP-2P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-0001 / seal_material: check downloads/BP-2P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-0001 / weight: check downloads/BP-2P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
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
- BP-2P-30-0001 / model_identity: check downloads/BP-2P-30-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-30-0001 / mounting_type: check downloads/BP-2P-30-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-50-0001 / mounting_type: check downloads/BP-2P-50-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-50-0001 / weight: check downloads/BP-2P-50-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-95-0001 / compatible_media: check downloads/BP-2P-95-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-95-0001 / model_identity: check downloads/BP-2P-95-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-95-0001 / mounting_type: check downloads/BP-2P-95-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-95-0001 / seal_material: check downloads/BP-2P-95-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-95-0001 / test_pressure: check downloads/BP-2P-95-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-2P-95-FAMILY / rated_pressure: check current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0004 / compatible_media: check downloads/BP-3P-0004.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0004 / mounting_type: check downloads/BP-3P-0004.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0004 / seal_material: check downloads/BP-3P-0004.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0004 / weight: check downloads/BP-3P-0004.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0006 / compatible_media: check downloads/BP-3P-0006.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0006 / mounting_type: check downloads/BP-3P-0006.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0007 / compatible_media: check downloads/BP-3P-0007.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0007 / mounting_type: check downloads/BP-3P-0007.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-0007 / seal_material: check downloads/BP-3P-0007.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-S06-0001 / compatible_media: check downloads/BP-3P-S06-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-3P-S06-0001 / mounting_type: check downloads/BP-3P-S06-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-4P-30-0001 / compatible_media: check downloads/BP-4P-30-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-4P-30-0001 / maximum_speed: check downloads/BP-4P-30-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-4P-30-0001 / mounting_type: check downloads/BP-4P-30-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-4P-30-0001 / passages: check downloads/BP-4P-30-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-4P-30-0001 / seal_material: check downloads/BP-4P-30-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-8P-0001 / compatible_media: check downloads/BP-8P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-8P-0001 / mounting_type: check downloads/BP-8P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification
- BP-8P-0001 / seal_material: check downloads/BP-8P-0001.pdf; current approved engineering drawing; formal datasheet or order-specific specification

## 7. Known case: BP-2P-50-0001

No value below is declared correct. Final confirmation belongs to `laocao` and must use an approved engineering drawing or formal technical record.

| Field | Actual observations | Assessment |
| --- | --- | --- |
| `weight` | `Confirm weight for the supplied configuration.` — `BP-2P-50-0001.html` (website-product-spec, SHA-256 `621060d73d9ebf278aa02bca45c6d3f3e930942063e5fa3b44133cd44287037a`)<br>`Gewicht der gelieferten Konfiguration bestätigen.` — `de/BP-2P-50-0001.html` (translated-product-spec, SHA-256 `27def9dc5f07b1e63ffc8b04681eeaaf322fda511576418bdd8f1e0cab58c626`)<br>`納入仕様の質量をご確認ください。` — `ja/BP-2P-50-0001.html` (translated-product-spec, SHA-256 `b54a67a5d9b54986e7f563594699555e2dad115dfbdaf6bbed3c486c51b293b9`)<br>`Уточните массу поставляемой конфигурации.` — `ru/BP-2P-50-0001.html` (translated-product-spec, SHA-256 `ba7089360b302fb4928c53dceebdbf683dc32de13899ee4130988bff2d44fb7a`)<br>`2.3 kg` — `catalog-project/data/catalog-data.csv` (local-untracked-source, SHA-256 `e366e2f2d699fc387065795904b280860bfc146d8dd8a16034dfaed4beb1a510`)<br>`2.3 kg` — `catalog-project/data/catalog-data.json` (local-untracked-source, SHA-256 `0e277cdc4156ed949e3b6e8fc6d9d2647729e0e0f80a59ed4006608369b82e2e`)<br>`Approx. 4.26 kg` — `audit/fact-resolution/phase-1e-a/product-fact-conflicts.csv` (website-audit-observation, SHA-256 `33c482809594992c9e22d1730fc522c9f7e157afb7cc38893ea423784d5ba469`)<br>`2300 g (2.30 kg)` — `audit/fact-resolution/phase-1e-a/product-fact-conflicts.csv` (engineering-audit-observation, SHA-256 `33c482809594992c9e22d1730fc522c9f7e157afb7cc38893ea423784d5ba469`) | `unresolved`; manual engineering verification required |
| `compatible_media` | `Air. Other media require written compatibility confirmation for the operating conditions.` — `BP-2P-50-0001.html` (website-product-spec, SHA-256 `621060d73d9ebf278aa02bca45c6d3f3e930942063e5fa3b44133cd44287037a`)<br>`Air. Other media require written compatibility confirmation for the operating conditions.` — `BP-2P-50-0001.html` (website-json-ld, SHA-256 `621060d73d9ebf278aa02bca45c6d3f3e930942063e5fa3b44133cd44287037a`)<br>`Luft. Andere Medien erfordern eine schriftliche Kompatibilitätsbestätigung für die Betriebsbedingungen.` — `de/BP-2P-50-0001.html` (translated-product-spec, SHA-256 `27def9dc5f07b1e63ffc8b04681eeaaf322fda511576418bdd8f1e0cab58c626`)<br>`Luft. Andere Medien erfordern eine schriftliche Kompatibilitätsbestätigung für die Betriebsbedingungen.` — `de/BP-2P-50-0001.html` (translated-json-ld, SHA-256 `27def9dc5f07b1e63ffc8b04681eeaaf322fda511576418bdd8f1e0cab58c626`)<br>`標準使用流体：空気。その他の流体は、使用条件に対する適合性を書面で確認する必要があります。` — `ja/BP-2P-50-0001.html` (translated-product-spec, SHA-256 `b54a67a5d9b54986e7f563594699555e2dad115dfbdaf6bbed3c486c51b293b9`)<br>`標準使用流体：空気。その他の流体は、使用条件に対する適合性を書面で確認する必要があります。` — `ja/BP-2P-50-0001.html` (translated-json-ld, SHA-256 `b54a67a5d9b54986e7f563594699555e2dad115dfbdaf6bbed3c486c51b293b9`)<br>`Стандартная рабочая среда: воздух. Для других сред требуется письменное подтверждение совместимости с рабочими условиями.` — `ru/BP-2P-50-0001.html` (translated-product-spec, SHA-256 `ba7089360b302fb4928c53dceebdbf683dc32de13899ee4130988bff2d44fb7a`)<br>`Стандартная рабочая среда: воздух. Для других сред требуется письменное подтверждение совместимости с рабочими условиями.` — `ru/BP-2P-50-0001.html` (translated-json-ld, SHA-256 `ba7089360b302fb4928c53dceebdbf683dc32de13899ee4130988bff2d44fb7a`)<br>`Air` — `catalog-project/data/catalog-data.csv` (local-untracked-source, SHA-256 `e366e2f2d699fc387065795904b280860bfc146d8dd8a16034dfaed4beb1a510`)<br>`Air` — `catalog-project/data/catalog-data.json` (local-untracked-source, SHA-256 `0e277cdc4156ed949e3b6e8fc6d9d2647729e0e0f80a59ed4006608369b82e2e`) | `missing-evidence`; no competing automatically parsed value |
| `protection_rating` | `Protective-shroud and labyrinth design for dusty environments; no certified IP rating is currently claimed.` — `BP-2P-50-0001.html` (website-product-spec, SHA-256 `621060d73d9ebf278aa02bca45c6d3f3e930942063e5fa3b44133cd44287037a`)<br>`Protective-shroud and labyrinth design for dusty environments; no certified IP rating is currently claimed.` — `BP-2P-50-0001.html` (website-json-ld, SHA-256 `621060d73d9ebf278aa02bca45c6d3f3e930942063e5fa3b44133cd44287037a`)<br>`Schutzhauben- und Labyrinthkonstruktion für staubige Umgebungen; derzeit wird keine zertifizierte IP-Schutzart angegeben.` — `de/BP-2P-50-0001.html` (translated-product-spec, SHA-256 `27def9dc5f07b1e63ffc8b04681eeaaf322fda511576418bdd8f1e0cab58c626`)<br>`Schutzhauben- und Labyrinthkonstruktion für staubige Umgebungen; derzeit wird keine zertifizierte IP-Schutzart angegeben.` — `de/BP-2P-50-0001.html` (translated-json-ld, SHA-256 `27def9dc5f07b1e63ffc8b04681eeaaf322fda511576418bdd8f1e0cab58c626`)<br>`粉じん環境向けの保護カバー・ラビリンス構造。現時点で認証済みIP保護等級は表示していません。` — `ja/BP-2P-50-0001.html` (translated-product-spec, SHA-256 `b54a67a5d9b54986e7f563594699555e2dad115dfbdaf6bbed3c486c51b293b9`)<br>`粉じん環境向けの保護カバー・ラビリンス構造。現時点で認証済みIP保護等級は表示していません。` — `ja/BP-2P-50-0001.html` (translated-json-ld, SHA-256 `b54a67a5d9b54986e7f563594699555e2dad115dfbdaf6bbed3c486c51b293b9`)<br>`Защитный кожух и лабиринт для запылённых условий; сертифицированная степень защиты IP в настоящее время не заявляется.` — `ru/BP-2P-50-0001.html` (translated-product-spec, SHA-256 `ba7089360b302fb4928c53dceebdbf683dc32de13899ee4130988bff2d44fb7a`)<br>`Защитный кожух и лабиринт для запылённых условий; сертифицированная степень защиты IP в настоящее время не заявляется.` — `ru/BP-2P-50-0001.html` (translated-json-ld, SHA-256 `ba7089360b302fb4928c53dceebdbf683dc32de13899ee4130988bff2d44fb7a`) | `manual-review-required`; public IP65 statements exist, but Phase 1A did not establish approval of the drawing or protection test evidence |
| `mounting_type` | `Stator side: 4 × M5, thread depth 10 mm; rotor side: 6 × M5, thread depth 8 mm. Confirm the complete mounting dimensions against the supplied drawing before machining.` — `BP-2P-50-0001.html` (website-product-spec, SHA-256 `621060d73d9ebf278aa02bca45c6d3f3e930942063e5fa3b44133cd44287037a`)<br>`Stator side: 4 × M5, thread depth 10 mm; rotor side: 6 × M5, thread depth 8 mm. Confirm the complete mounting dimensions against the supplied drawing before machining.` — `BP-2P-50-0001.html` (website-json-ld, SHA-256 `621060d73d9ebf278aa02bca45c6d3f3e930942063e5fa3b44133cd44287037a`)<br>`Statorseite: 4 × M5, Gewindetiefe 10 mm; Rotorseite: 6 × M5, Gewindetiefe 8 mm. Vor der Bearbeitung vollständige Einbaumaße anhand der mitgelieferten Zeichnung bestätigen.` — `de/BP-2P-50-0001.html` (translated-product-spec, SHA-256 `27def9dc5f07b1e63ffc8b04681eeaaf322fda511576418bdd8f1e0cab58c626`)<br>`Statorseite: 4 × M5, Gewindetiefe 10 mm; Rotorseite: 6 × M5, Gewindetiefe 8 mm. Vor der Bearbeitung vollständige Einbaumaße anhand der mitgelieferten Zeichnung bestätigen.` — `de/BP-2P-50-0001.html` (translated-json-ld, SHA-256 `27def9dc5f07b1e63ffc8b04681eeaaf322fda511576418bdd8f1e0cab58c626`)<br>`固定側：4 × M5、ねじ深さ10 mm；回転側：6 × M5、ねじ深さ8 mm。加工前に、支給図面で取付寸法全体をご確認ください。` — `ja/BP-2P-50-0001.html` (translated-product-spec, SHA-256 `b54a67a5d9b54986e7f563594699555e2dad115dfbdaf6bbed3c486c51b293b9`)<br>`固定側：4 × M5、ねじ深さ10 mm；回転側：6 × M5、ねじ深さ8 mm。加工前に、支給図面で取付寸法全体をご確認ください。` — `ja/BP-2P-50-0001.html` (translated-json-ld, SHA-256 `b54a67a5d9b54986e7f563594699555e2dad115dfbdaf6bbed3c486c51b293b9`)<br>`Сторона статора: 4 × M5, глубина резьбы 10 мм; сторона ротора: 6 × M5, глубина резьбы 8 мм. До механической обработки сверьте все монтажные размеры с предоставленным чертежом.` — `ru/BP-2P-50-0001.html` (translated-product-spec, SHA-256 `ba7089360b302fb4928c53dceebdbf683dc32de13899ee4130988bff2d44fb7a`)<br>`Сторона статора: 4 × M5, глубина резьбы 10 мм; сторона ротора: 6 × M5, глубина резьбы 8 мм. До механической обработки сверьте все монтажные размеры с предоставленным чертежом.` — `ru/BP-2P-50-0001.html` (translated-json-ld, SHA-256 `ba7089360b302fb4928c53dceebdbf683dc32de13899ee4130988bff2d44fb7a`)<br>`4 x M5 stator mount, depth 10 mm; 6 x M5 rotor mount, depth 8 mm` — `catalog-project/data/catalog-data.csv` (local-untracked-source, SHA-256 `e366e2f2d699fc387065795904b280860bfc146d8dd8a16034dfaed4beb1a510`)<br>`4 x M5 stator mount, depth 10 mm; 6 x M5 rotor mount, depth 8 mm` — `catalog-project/data/catalog-data.json` (local-untracked-source, SHA-256 `0e277cdc4156ed949e3b6e8fc6d9d2647729e0e0f80a59ed4006608369b82e2e`) | `unresolved`; manual engineering verification required |

The expected `4.26 kg` and `2.3 kg` observations were both found. Broad website media wording and local `Air`-only data were also found. Website mounting wording and the local stator/rotor hole-pattern description differ. The audit does not choose between them.

## 8. Potential downstream impact

- **Website:** unresolved values may appear in visible specifications, cards, articles, or application guidance.
- **JSON-LD:** some unresolved values are repeated as Product `additionalProperty` claims.
- **Search:** product-page bodies and descriptions are copied into language-specific search indexes.
- **AI citation:** `llms.txt`, search indexes, and localized pages can propagate public claims without creating independent evidence.
- **Downloads:** engineering and catalog files may contain primary-looking values, but applicability and approval must be confirmed manually.

## 9. Next phase recommendation

Phase 1B should select a small set of high-risk conflicts, obtain the current approved engineering source and revision from `laocao`, record the decision scope, and only then propose synchronized changes across HTML, JSON-LD, translations, search/AI indexes, and downloads. Do not build a full Product Truth database until the decision and approval workflow has been proven on this pilot.

## 10. Non-modification declaration

This task did not modify any public product fact, product HTML, localized parameter, JSON-LD, search index, `llms.txt`, product CSV/JSON fact value, download, `catalog-project/` file, server file, or production deployment.
