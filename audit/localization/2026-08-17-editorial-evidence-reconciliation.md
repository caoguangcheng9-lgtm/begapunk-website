# Editorial Evidence Reconciliation — 2026-08-17

## Decision

- Result: **PASS** for the current local candidate.
- Review method: `AI-assisted target-market line-by-line localization review`.
- Accepted by role: `site-owner`.
- Reviewed by role: `AI localization reviewer and release QA reviewer`.
- Independent native-speaker sign-off: **No**.
- Prohibited descriptions: native-speaker reviewed, human translated, professionally translated, or independent native sign-off.
- Reviewed at: `2026-08-17T02:55:54.3078892+09:00`.
- Final unresolved editorial issues: **0**.
- This record reconciles the approved 2026-08-14 wording with the newer UI, cache, Contact, product-detail, metadata, and release-gate work in the current workspace. The older page and screenshot hashes are historical evidence only; they are not presented as current-file proof.

## Scope and source-of-truth result

- Local workspace: `E:\begapunk-site-v2`.
- Baseline Git commit: `958efd4ab5129fde7296f9c27afa35f9cf9658a8` plus the current uncommitted candidate.
- Editorial scope: DE/JA/RU × Manufacturing, Production Inspection, BP-2P-95 case, and BP-3P-S06 case = 12 localized pages.
- English BP-2P-95 fact source SHA-256: `610451AE0F799CBC1B2C427FCA244476C790B5CC93DF96FED32A6236138CDF82`.
- Current versus accepted content contract: **13/13 MATCH** (English BP-2P-95 source plus 12 localized pages).
- Aggregate semantic SHA-256: `1AF531C81F982BE857A39F1F6E186306BA64299497F875CE9B88AA86EC3D04FA`.
- Semantic comparison covered visible main content, href/src/alt/ARIA/data-label values, SEO/Open Graph/Twitter metadata, and normalized JSON-LD. It intentionally excluded shared Header/Footer serialization, cache query keys, and non-editorial UI markup.

## Target-market references

All references below were accessed on `2026-08-14` for terminology, reading patterns, and search intent only. No competitor wording, product parameters, certifications, performance claims, or customer facts were copied.

- `DE-1`: https://www.deublin.com/de/produkte/drehdurchfuehrungen
- `DE-2`: https://www.deublin.com/de/produkte/drehdurchfuehrungen/luft
- `DE-3`: https://schunk.com/de/de/werkstueckspanntechnik/stationaere-spannfutter/pneumatische-spannfutter/c/PUB_8560
- `JA-1`: https://www.ckd.co.jp/kiki/jp/product/detail/424/RJF
- `JA-2`: https://www.cosmo-k.co.jp/products/air-leak-tester/
- `JA-3`: https://www.cosmo-k.co.jp/downloads/
- `RU-1`: https://www.smwautoblok.com/wp-content/uploads/sites/7/2021/04/SP_SP-ES_SP-L_RU.pdf
- `RU-2`: https://www.deublin.com/-/media/API-Sync-Assets/INS/040-501-GB-JP.pdf

## Required page-level review fields

The `referenceAccessDates` value is `2026-08-14`, `reviewMethod` is `AI-assisted target-market line-by-line localization review`, `reviewedAt` is `2026-08-17T02:55:54.3078892+09:00`, `reviewedByRole` is `AI localization reviewer and release QA reviewer`, and `unresolvedIssues` is `[]` for every row.

| Page | Language | Reference URLs | Terminology decisions | Search-intent decisions | Current source SHA-256 | Result |
|---|---|---|---|---|---|---|
| `de/manufacturing-quality.html` | de | DE-1, DE-2 | Use natural German manufacturing terms for setups, aluminium alloys, hard anodizing, dimensional checks, and explicit photo-evidence boundaries. | Preserve intent around Drehdurchführung manufacturing quality and hard anodizing without adding certification or batch-wide evidence claims. | `3FAD65402DFE22C7D9CAA5792C35ED12E124BA7E72C9E74C6C75720345A7D586` | PASS |
| `de/production-inspection-testing.html` | de | DE-1, DE-2 | Keep 100% finished-unit and passage-by-passage leak-test language tied to the approved pressure/time facts; keep NG/quarantine/scrap boundaries. | Support technical buyers looking for inspection and leak-test process evidence, not a zero-leak or certification promise. | `5CC21AF6FFCF5E63148D1BEEF5DB1606BFEA0BC7CF57D84F1CDF417655016763` | PASS |
| `de/case-bp-2p-95-pneumatic-chuck-integration.html` | de | DE-1, DE-3 | Use `pneumatisches Spannfutter`; distinguish project-owner model confirmation from what customer-authorized photos visibly prove. | Match buyers researching a pneumatic chuck integration while retaining evidence and operating-condition boundaries. | `5547FFEED73ABBBC6B128A6F1610F5D59F9508ADBD62DDE1947F2F9F949DBED8` | PASS |
| `de/case-bp-3p-s06-sensor-monitored-chuck.html` | de | DE-1, DE-3 | Attribute application data to the project owner and describe external sensor-signal transfer without implying self-detection. | Match sensor-monitored pneumatic chuck integration searches without promising interlock, accuracy, or fail-safe behavior. | `8913C7093365F358B585D9E51662E0753DF3529E927AFA819A9D76D834E0C80A` | PASS |
| `ja/manufacturing-quality.html` | ja | JA-1, JA-3 | Use Japanese industrial wording for machining stages, surface treatment, inspection records, and the limits of photographic evidence. | Support manufacturing-quality and hard-anodizing research while avoiding continuous traceability or per-piece proof claims. | `AF2C1642F138EF339930AE40C37C397022EDD902C48ECA24D76E6DE826F49646` | PASS |
| `ja/production-inspection-testing.html` | ja | JA-2, JA-3 | Use `エアリークテスター`, inspection-object wording, and `不適合品隔離容器`; retain every-unit/every-passage facts and test limits. | Match searches for air leak testing and inspection conditions without inventing detection thresholds or calibration claims. | `4CE1B8DEDA53D64BC6B66614BEE704D8C1AEB59086C807247A7D43874909A054` | PASS |
| `ja/case-bp-2p-95-pneumatic-chuck-integration.html` | ja | JA-1 | Use natural rotary-joint and pneumatic-chuck terms; distinguish project-owner model confirmation from photo-visible assembly and air routing. | Support pneumatic-chuck integration research and clearly request pressure, rotational speed, and duty-cycle review. | `AC29AF902CBF0D4955452A927597D6BFE3004FA46C3AA2D34DD59592E74DBCC7` | PASS |
| `ja/case-bp-3p-s06-sensor-monitored-chuck.html` | ja | JA-1 | Describe three pneumatic functions and external sensor-signal transfer without turning the slip ring into a sensing device. | Match sensor-monitored chuck integration intent while preserving configuration-specific port allocation. | `F3340282B58FBAAB91EBE280AB80D8FCB3B2FEB8CBB0223BECA7FC9837B0C9D3` | PASS |
| `ru/manufacturing-quality.html` | ru | RU-1, RU-2 | Use Russian engineering terms for setups, external anodizing, dimensional growth, hard anodizing, and photo-evidence boundaries. | Support searches for manufacturing and quality of rotary connections without adding certification or lifetime claims. | `72AEAFEC10443D7BAD9FA17775DF9CDDD0ABC03E70252E8DE3C482BE7AAB4332` | PASS |
| `ru/production-inspection-testing.html` | ru | RU-2 | Use correct Russian percentage typography and explicit quarantine/repair/scrap terminology; retain the approved per-passage test sequence. | Match technical inspection and leak-test intent without presenting PASS/NG equipment as a diagnostic system. | `F38AA11CAE0A18733BFF69CC236F187EB74972E3F087ABBB9A492392B1E7D30E` | PASS |
| `ru/case-bp-2p-95-pneumatic-chuck-integration.html` | ru | RU-1, RU-2 | Use `пневматический патрон`, mounting-dimension language, and an explicit model-confirmation/photo-evidence distinction. | Support industrial chuck-integration searches while preserving engineering-review requirements and evidence limits. | `7F0865B8D04F6DF01EE4D0D0FF3C8662241B7519B1483839E7E25E1F6B03486E` | PASS |
| `ru/case-bp-3p-s06-sensor-monitored-chuck.html` | ru | RU-1, RU-2 | Describe external sensor signals, pneumatic passage functions, and project-owner-confirmed application data without universalizing the port map. | Match sensor-monitored chuck integration searches without promising self-detection, interlock, or response performance. | `99322EC12D9993B85CB912770F4236E6AAC05DBFA8A31C3DEA586ADBD72A5F81` | PASS |

## Current-candidate render evidence

- Matrix: DE/JA/RU × `index.html`, `contact.html`, the four Editorial pages × 1440×900 and 390×844 = **36/36 PASS**.
- Current candidate source hashes and current screenshot hashes are recorded below.
- Browser: Codex in-app Browser (Chromium).
- HTTP failures: 0; page-level horizontal overflow: 0; broken visible images: 0; garbled-text detections: 0; wrong/multiple visible H1: 0; console warnings/errors introduced by a page: 0; mobile-menu failures: 0/18; POST attempts: 0.
- The hidden native file input and the Manufacturing hero's decorative overflow appeared in element-level diagnostics, but neither created page-level overflow, visible clipping, or an inaccessible control in these views.
- Screenshot directory: `C:\Users\cao19\.codex\visualizations\2026\08\14\019ffda0-15f0-7fa1-ad60-a539abb7c9cd\begapunk-editorial-20260817`.

| Language | Page | Viewport | Result | Current source SHA-256 | Screenshot SHA-256 |
|---|---|---:|---|---|---|
| DE | index.html | 390×844 | PASS | `13EC1E613EAC17BB7A99667BAFB306B32F6F8AE590A339C861BE6C6AB2362870` | `C501209A57E0492CB58ACA78EE63399A7EBBB5A74BC97248546CCFF71C154D44` |
| DE | contact.html | 390×844 | PASS | `5C7E89C6CB5F6BFE84C931472273528022DD99EA29FE0000205F42261F93B1D1` | `F443AFC5C7FF333D3504E4180A15D7D0557070A084C408925AD41F40369FCE0C` |
| DE | manufacturing-quality.html | 390×844 | PASS | `3FAD65402DFE22C7D9CAA5792C35ED12E124BA7E72C9E74C6C75720345A7D586` | `0152BEEF85D367A18A679913B65CEBC2A116EDCA5F0A1CAE38AE7E88B3036CCF` |
| DE | production-inspection-testing.html | 390×844 | PASS | `5CC21AF6FFCF5E63148D1BEEF5DB1606BFEA0BC7CF57D84F1CDF417655016763` | `A6841ECFCC60445211B157F7BBE02E47EBAF49CD5E55D26BB62328169FCB6222` |
| DE | case-bp-2p-95-pneumatic-chuck-integration.html | 390×844 | PASS | `5547FFEED73ABBBC6B128A6F1610F5D59F9508ADBD62DDE1947F2F9F949DBED8` | `49C59B70088CBAFAAAF19310C04BC8506F31B98974BFBA346AD6B4C4136FF3B4` |
| DE | case-bp-3p-s06-sensor-monitored-chuck.html | 390×844 | PASS | `8913C7093365F358B585D9E51662E0753DF3529E927AFA819A9D76D834E0C80A` | `2D312F99FE028B7E3BBF2295B9857DB8935AC663A016BF22E2DA87D38BACB414` |
| DE | index.html | 1440×900 | PASS | `13EC1E613EAC17BB7A99667BAFB306B32F6F8AE590A339C861BE6C6AB2362870` | `3772E8F1674995BE94EB16BAF0EA09CD6732525CD6C2A7A5D15644A7BCAC7C11` |
| DE | contact.html | 1440×900 | PASS | `5C7E89C6CB5F6BFE84C931472273528022DD99EA29FE0000205F42261F93B1D1` | `BE8B81243B52D8A6FD68CD0A3DAEB60CD4EF322F0394B872F41E3DEDB8BA0369` |
| DE | manufacturing-quality.html | 1440×900 | PASS | `3FAD65402DFE22C7D9CAA5792C35ED12E124BA7E72C9E74C6C75720345A7D586` | `97A002A45D476E566E42E804E7E172D8BF8FFE87AAFD9BA05B49E8FC9ACD7F0D` |
| DE | production-inspection-testing.html | 1440×900 | PASS | `5CC21AF6FFCF5E63148D1BEEF5DB1606BFEA0BC7CF57D84F1CDF417655016763` | `C3AE50BBB819483B1D9D9B3FF562DC00776FCEF2ECC2E5416C3BBC624F994133` |
| DE | case-bp-2p-95-pneumatic-chuck-integration.html | 1440×900 | PASS | `5547FFEED73ABBBC6B128A6F1610F5D59F9508ADBD62DDE1947F2F9F949DBED8` | `8A851F7B7FD5629E56806E056F8250CDE9764F3D3FE28B0AC64F9A4E3A6F99EE` |
| DE | case-bp-3p-s06-sensor-monitored-chuck.html | 1440×900 | PASS | `8913C7093365F358B585D9E51662E0753DF3529E927AFA819A9D76D834E0C80A` | `B37734350A6C5396DF64ACC2C81A3786F7724A056431124AB82F1E353160BE9E` |
| JA | index.html | 390×844 | PASS | `39B96C44A87FEE052F40E446877C8ACD1A1278F9728E682F35E9CA7F54D13E44` | `9D54556EF1993E064111537F7E140416EFD8196AFCCD2955792D39F95D55D263` |
| JA | contact.html | 390×844 | PASS | `6E9CCFC7FD58997E51F35D74B6F54585B7A4DB59727F4D2DEC19F89B108FAA3E` | `85A91AC54A076B691C6E8779D0691E3F595B22109C697AB6FE817F0E9752340D` |
| JA | manufacturing-quality.html | 390×844 | PASS | `AF2C1642F138EF339930AE40C37C397022EDD902C48ECA24D76E6DE826F49646` | `33075FCD129F3C136A226DDAF7C87DBE07A59EBA0F693560F95329544FDAF173` |
| JA | production-inspection-testing.html | 390×844 | PASS | `4CE1B8DEDA53D64BC6B66614BEE704D8C1AEB59086C807247A7D43874909A054` | `7651E3DDBA23D2C2E694E420B00BE5F956033BCBB3FCD159EA68AF77F80C6608` |
| JA | case-bp-2p-95-pneumatic-chuck-integration.html | 390×844 | PASS | `AC29AF902CBF0D4955452A927597D6BFE3004FA46C3AA2D34DD59592E74DBCC7` | `85E3E32E3C1957AD279FF6AA038043E3BECC33D1AF22F3E764127698D05AF912` |
| JA | case-bp-3p-s06-sensor-monitored-chuck.html | 390×844 | PASS | `F3340282B58FBAAB91EBE280AB80D8FCB3B2FEB8CBB0223BECA7FC9837B0C9D3` | `0FECEAEF6376733C9DC62405C7F429FC106E063E3BBE5F6841DFB4AA168F4389` |
| JA | index.html | 1440×900 | PASS | `39B96C44A87FEE052F40E446877C8ACD1A1278F9728E682F35E9CA7F54D13E44` | `8D88BA96AB5DA5C4D529EB997266E1149A23E3C334C30F6D0669392BF8D560A4` |
| JA | contact.html | 1440×900 | PASS | `6E9CCFC7FD58997E51F35D74B6F54585B7A4DB59727F4D2DEC19F89B108FAA3E` | `1FCF40EF20997AFA395017513EA4FC21BB2AC382EDA39866B39E0AE9FA87A49C` |
| JA | manufacturing-quality.html | 1440×900 | PASS | `AF2C1642F138EF339930AE40C37C397022EDD902C48ECA24D76E6DE826F49646` | `7A0D0E9A12EE2A61F8B31EB451588CDA50A307A7716D8036630D6A9F44F747F0` |
| JA | production-inspection-testing.html | 1440×900 | PASS | `4CE1B8DEDA53D64BC6B66614BEE704D8C1AEB59086C807247A7D43874909A054` | `CF77346F7464BE885B832BEB19648654C9C7F69E0A9449A23775EE02AD6A12B8` |
| JA | case-bp-2p-95-pneumatic-chuck-integration.html | 1440×900 | PASS | `AC29AF902CBF0D4955452A927597D6BFE3004FA46C3AA2D34DD59592E74DBCC7` | `0DF163798BA6EABDAA8EBD93D3FCC12FEA2364CFFAF34EE0BE58A6517E01467A` |
| JA | case-bp-3p-s06-sensor-monitored-chuck.html | 1440×900 | PASS | `F3340282B58FBAAB91EBE280AB80D8FCB3B2FEB8CBB0223BECA7FC9837B0C9D3` | `EC7C0DA8142432276EFACF97FDC43C5C922F34005904523194801A31D8990D4F` |
| RU | index.html | 390×844 | PASS | `09A49E67529D697FF94CC6A03C8A784EADF19F78CD0297D3BBC231A00B9DBA5B` | `86385569762DF7103B41BD6F8B069B545C7DF6B958459AB6BE1A958F8CF738F3` |
| RU | contact.html | 390×844 | PASS | `685A003F6531A72CED93E07DEBC0C029CE13E7B20B705C7B9DA8E94B7854A1A7` | `E058A78F62B9B4EE51FAAEFBEFA4BB196B578908D9FC9F6ED625B3BACC3D76EE` |
| RU | manufacturing-quality.html | 390×844 | PASS | `72AEAFEC10443D7BAD9FA17775DF9CDDD0ABC03E70252E8DE3C482BE7AAB4332` | `3C3B51CE01C6E0AD9E345CA2B13ACD4E5BADED1FEE69DC144551EB6D120CC4D6` |
| RU | production-inspection-testing.html | 390×844 | PASS | `F38AA11CAE0A18733BFF69CC236F187EB74972E3F087ABBB9A492392B1E7D30E` | `16C15F1C8B3D87DA1F14E465649503D8864798D4BEADB2C52A8207C50E0994B7` |
| RU | case-bp-2p-95-pneumatic-chuck-integration.html | 390×844 | PASS | `7F0865B8D04F6DF01EE4D0D0FF3C8662241B7519B1483839E7E25E1F6B03486E` | `6CE718C139AD18462276B5103B1F749A6F720B8D0FD3C9B7647944664189EECB` |
| RU | case-bp-3p-s06-sensor-monitored-chuck.html | 390×844 | PASS | `99322EC12D9993B85CB912770F4236E6AAC05DBFA8A31C3DEA586ADBD72A5F81` | `1A27D77A5B47C47F617ED135173418950169BFC31253C401159EADA677987968` |
| RU | index.html | 1440×900 | PASS | `09A49E67529D697FF94CC6A03C8A784EADF19F78CD0297D3BBC231A00B9DBA5B` | `E19FECFC5A0E8D4EEF9D67F165BD01F8A92F9A0998408C2C4798BF25A69DFA6F` |
| RU | contact.html | 1440×900 | PASS | `685A003F6531A72CED93E07DEBC0C029CE13E7B20B705C7B9DA8E94B7854A1A7` | `4DC0B930B376150393D08FCD79F391516A946D0611B2DB49C10E2731320C349F` |
| RU | manufacturing-quality.html | 1440×900 | PASS | `72AEAFEC10443D7BAD9FA17775DF9CDDD0ABC03E70252E8DE3C482BE7AAB4332` | `EFFE914DFE4CBFE883F5FB4CD3F8F87C80BA4C4A96A7DCD8B6CF7702324652DD` |
| RU | production-inspection-testing.html | 1440×900 | PASS | `F38AA11CAE0A18733BFF69CC236F187EB74972E3F087ABBB9A492392B1E7D30E` | `BB21B8D02967AA5ADB1A69BC572B29074E09564E708AD73A2AB437470935D052` |
| RU | case-bp-2p-95-pneumatic-chuck-integration.html | 1440×900 | PASS | `7F0865B8D04F6DF01EE4D0D0FF3C8662241B7519B1483839E7E25E1F6B03486E` | `3E8C63284A8D7C2FC200B9AC1AE48AEB2A09F39E2E2355A7A8627CD639D37C73` |
| RU | case-bp-3p-s06-sensor-monitored-chuck.html | 1440×900 | PASS | `99322EC12D9993B85CB912770F4236E6AAC05DBFA8A31C3DEA586ADBD72A5F81` | `72BDBF500B69DB37267C4D238C2BA7B914C94D13DB787884F52F39B2876E15F0` |

## Status transition and safety boundary

- The prior accepted Render QA baseline recorded 49 pages per language and 294 viewport checks. This current candidate adds 36 current-hash checks (6 pages × 3 languages × 2 viewports), yielding the governed cumulative total of 55 pages per language and 330 checks.
- `i18n/editorial/status.json` may therefore move from 51/55 to 55/55, `inProgress` to empty, `remaining` to 0, and Render QA to 55/330.
- The expired historical `i18n/editorial/release-approval.json` remains unchanged and is not represented as current release approval.
- This Editorial PASS is a local content and render gate. It does not authorize commit, push, deployment, production access, or a real form submission.
