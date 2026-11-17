# 2026-09-02 全站前后矛盾修复与多语言回归复核

reviewedAt: `2026-09-02T19:59:25+09:00`
reviewedByRole: `Codex AI senior industrial buyer, export-sales, engineering-content, and target-market localization reviewer (not native-speaker / not human sign-off)`
reviewMethod: `AI-assisted changed-surface review, canonical-source comparison, page-by-page regression verification, and four-language fact-boundary validation. Previously reviewed wording outside the changed surfaces retained its existing editorial decisions; regenerated markup was reconciled against the canonical navigation, drawing-backed product, owner-confirmed fact, inquiry, case-study, FAQ, search, and localization contracts before the artifact snapshot was refreshed.`
unresolvedIssues: `No known contradiction or localization blocker remains in the repaired scope. BP-3P-0006 port-thread details and BP-3P-S06-0001 electrical circuit allocation/ratings remain explicit engineering holds to be confirmed from the selected drawing/specification; the pages do not invent those values. Independent native-speaker review was not performed.`

## 审核范围

- 对本轮重新生成后发生字节变化的德语、日语、俄语页面进行差异面复核，并重新套用项目中已经审核的导航、页脚、首页、产品页、案例、询盘、FAQ 与图纸事实规范。
- 修复 15 个多语言页面中外露的 `app-detail-cta` 原始标记；页面结构、按钮与链接重新通过 224 页一致性检查。
- 4 个长期现货型号继续允许 MOQ 1；网页价格明确为 100 件以上的阶梯参考价，1–99 件改为询价，避免与 MOQ 1 冲突。
- 目录型号交期统一为入金后约 20 个自然日；特注产品统一为入金后 30 个自然日以内。国际运输时间不计入生产时间。
- 空压工具防扭管用途只推荐当前单流路目录型号；机器人末端工具用途改为按空压或空电组合方案比较，不再错误限定为两流路。
- BP-2P-95-0005 在德语和日语对比页统一为 2 流路、2 入口、4 出口；没有改成 4 个入口。
- BP-2P-50-0001 的德语、日语、俄语产品卡恢复为 2 入口 / 2 出口，并保留 1 MPa、100 min⁻¹、空气介质、安装和密封信息；不再只写模糊的“2流路”。
- 64 个四语产品页恢复“一年，自发货日起”的可见质保与 Product JSON-LD；上方重复的大型 STEP 按钮保持删除，紧凑下载入口与下载区仍可直接取得 STEP。
- 德语、日语、俄语首页恢复已经批准的 MOQ、生产周期、2D 图纸和 STEP 表述；俄语包装与灌装应用卡恢复自然的采购语言。
- 灌装案例中 BP-2P-08-0001 仅作为另一种候选结构，照片所示量产安装仍明确为 BP-2P-16-0001。

## 目标市场参考来源

本轮没有从同行页面导入任何产品参数、性能、价格、产能、认证或质保事实。工业术语与搜索意图沿用此前已记录的目标市场参考决定：

- 德语：Deublin Drehdurchführungen，`https://www.deublin.com/de/produkte/drehdurchfuehrungen`（沿用 2026-08-27 审核记录）
- 日语：Pascal ロータリージョイント，`https://www.pascaleng.co.jp/jp/products/work_clamp/rotary_joint/`（沿用 2026-08-27 审核记录）
- 俄语：Deublin 俄语安装资料，`https://www.deublin.com/-/media/API-Sync-Assets/INS/040-522.pdf?ts=20250517T2213293493`（沿用 2026-08-27 审核记录）
- 项目内复核依据：`audit/localization/2026-08-27-commercial-product-fact-review.md`、`audit/localization/2026-08-27-commercial-terms-review.md`、`audit/localization/2026-09-01-step-public-download-review.md`。

这些来源仅用于德、日、俄工业采购语言、术语和搜索意图对照；Begapunk 的技术与商业事实只采用项目内图纸和 owner-confirmed 记录。

## 术语决定

- `passage` 在流路数量语境中使用德语 `Wege/Kanäle`、日语 `流路`、俄语 `проходы/каналы`；入口与出口必须分别表达，不能用含糊的“端口”掩盖 2 进 4 出结构。
- BP-2P-95-0005 的德语对比行使用 `2 Kanäle · 2 Einlässe / 4 Auslässe`，日语使用 `2流路・2入口／4出口`。
- 目录交期使用“约 20 个自然日”，特注交期使用“30 个自然日以内”；不再混用 `20–30 days`、`about 30 days` 或容易被理解为没有上限的说法。
- MOQ 与价格分层分别说明：MOQ 1 是可接单门槛，100+ 是网页显示的数量价格门槛，两者不是同一概念。
- 质保期统一从发货日计算；订单的具体适用条件仍由正式报价、订单及书面质保文件约定。
- `STEP AP214` 继续作为可下载的 3D 装配核对文件，不使用“申请后才提供”的措辞，也不重复放置两个相邻的大型下载按钮。

## 搜索意图决定

- 首页和产品列表先回答采购方最关心的 MOQ、生产时间、是否可定制、能否取得 2D/STEP；不把宁波地名放在第一句阻碍海外工程师理解。
- 应用页只推荐与真实流路结构相符的目录产品族，并保留“按实际接口和工况确认”的边界，不把候选型号写成已验证适配。
- 产品页用型号、入口/出口、压力、转速和安装区别帮助工程师比较；询盘仍允许从型号、照片、图纸或简短说明开始。
- 搜索索引已从当前 HTML 重新生成，避免搜索结果继续展示旧 MOQ、旧交期、旧应用推荐或旧多语言措辞。

## 事实与质量边界

- 本记录不声称独立母语审校、第三方认证、额外产能、未做过的试验或未确认的适配。
- 询盘流程仅做静态契约验证；没有真实提交询盘、发送邮件或访问服务器。
- 通过的自动检查用于证明页面结构、链接、图纸事实、语言覆盖、索引和部署包一致性；它们本身不等同于母语人士背书。

pages: `all current de/ja/ru localized artifacts; changed-surface review covered the rebuilt translation-managed pages and the canonical synchronizers that repaired them`
language: `de, ja, ru (with English source comparison)`
referenceUrls: `https://www.deublin.com/de/produkte/drehdurchfuehrungen ; https://www.pascaleng.co.jp/jp/products/work_clamp/rotary_joint/ ; https://www.deublin.com/-/media/API-Sync-Assets/INS/040-522.pdf?ts=20250517T2213293493`
referenceAccessDates: `carried forward from the recorded 2026-08-27 target-market reviews; no new competitor fact was imported`
terminologyDecisions: `recorded above`
searchIntentDecisions: `recorded above`
