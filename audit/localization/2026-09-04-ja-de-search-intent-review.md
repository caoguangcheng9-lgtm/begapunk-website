# 2026-09-04 日语与德语首页搜索意图复核

reviewedAt: `2026-09-04T13:24:24+09:00`
reviewedByRole: `Codex AI target-market technical-content reviewer (not native-speaker / not human sign-off)`
reviewMethod: `AI-assisted changed-surface review of Japanese homepage and product-list metadata/body copy plus German homepage metadata and hero badge; checked against the governed i18n source contract, first-party search research, existing target-market terminology records, and the English product/commercial evidence in the repository.`
unresolvedIssues: `none in the changed wording; independent native-speaker review was not performed, and search-volume estimates should be rechecked before any paid-budget decision`

## 审核范围

- 日语：`ja/index.html` 与 `ja/products.html` 的 title、description、H1，以及首页/产品页的首屏说明；首页图片 alt 与工程面板 aria-label 一并复核。
- 德语：`de/index.html` 的 title、description、Open Graph/Twitter 文案和首屏产品类型短句。
- 对应的 `i18n/seo/*.json`、`i18n/editorial/*.json`、语言目录搜索索引和 `llms.txt` 按同一文本同步。
- 本次没有把目标词扩散到文章或全站模板；日语只覆盖首页和产品列表页，德语只覆盖首页。

## 目标市场参考来源

- 第一方搜索需求：Google Ads Keyword Planner（Begapunk 账户，2026-09-04 上游调研）显示日语 `エアー ロータリー ジョイント` 的量级高于站内原先单独使用的术语；该数据用于确定同义词覆盖范围，不作为精确流量预测。
- 第一方站点表现：Google Search Console（Begapunk，2026-09-04 上游调研）用于识别德语核心查询的点击率改善机会；没有把观察值外推成转化承诺。
- 日语工业采购语气沿用 Pascal 的日语旋转接头产品资料：`https://www.pascaleng.co.jp/jp/products/work_clamp/rotary_joint/`（术语参考沿用项目内 2026-08-27 审核记录）。
- 德语工业术语沿用 Deublin 的德语 Drehdurchführungen 产品资料：`https://www.deublin.com/de/produkte/drehdurchfuehrungen`（术语参考沿用项目内 2026-08-27 审核记录）。
- Begapunk 事实边界来自仓库英文首页/产品目录和既有商业、STEP 审核记录：1–8 流路、MOQ 1、标准/特注、目录型号 2D PDF 与 STEP AP214 下载。

第三方资料只用于目标市场用词和语气判断，没有用于引入 Begapunk 的性能、认证、交期或价格事实。

## 术语决定

- 日语同时保留 `エアーロータリージョイント` 与现有 `空圧用ロータリージョイント`。前者承接调研中的搜索表达，后者维持技术含义与既有站内一致性；正文首次出现时以括号并列，避免机械重复。
- 首页 H1 使用 `産業機械向けエアーロータリージョイント`，产品页 H1 使用 `エアーロータリージョイント製品一覧`。图片 alt 中生硬的 `プロダクト家族` 改为自然的 `製品群`。
- 德语使用 `Standard- und Sonderausführungen`，比 `Standard & kundenspezifisch` 更自然、词性也完整。
- 德语资料表述使用 `2D-PDF-Zeichnungen` 与 `STEP-Daten`，不使用 `2D-CAD`：仓库只证明可下载的 2D PDF 图纸与 STEP AP214，不能暗示提供可编辑二维 CAD 源文件。

## 搜索意图决定

- 日语首页服务于按产品类别寻找空压旋转接头的买家，产品列表页承接型号比较、图纸/STEP 下载和选型意图；不为同义词另建薄内容页。
- 德语首页把产品类型、1–8 Kanäle、Standard/Sonderausführung、2D-PDF/STEP 与 Mindestbestellmenge 1 Stück 集中在摘要中，帮助工程师和采购在结果页先判断适配性。
- 两种语言均避免不可验证的最高级、认证或交付承诺；搜索词只放在 title/H1/首屏的自然语境中，避免全站堆词和近重复页面。

pages: `de/index.html, ja/index.html, ja/products.html`
language: `de, ja (with English source comparison)`
referenceUrls: `Google Ads Keyword Planner (Begapunk account research); Google Search Console (Begapunk property research); https://www.pascaleng.co.jp/jp/products/work_clamp/rotary_joint/ ; https://www.deublin.com/de/produkte/drehdurchfuehrungen`
referenceAccessDates: `first-party search sources reviewed in upstream research on 2026-09-04; public terminology sources carried forward from recorded 2026-08-27 target-market reviews`
terminologyDecisions: `recorded above`
searchIntentDecisions: `recorded above`
