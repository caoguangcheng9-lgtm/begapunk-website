# 2026-09-03 产品手册下载入口多语言复核

reviewedAt: `2026-09-03T19:16:19+09:00`
reviewedByRole: `Codex AI target-market technical-content reviewer (not native-speaker / not human sign-off)`
reviewMethod: `AI-assisted changed-surface review of the newly added full-catalog download action on the German, Japanese, and Russian product-list pages. Each label was compared with the English source, the page's existing download terminology, and the previously reviewed industrial-language conventions. The destination URL, PDF format disclosure, English-language disclosure, download attribute, and surrounding page structure were verified.`
unresolvedIssues: `none in the changed surface; independent native-speaker review was not performed`

## 审核范围

- 德语产品页新增：`Gesamtkatalog herunterladen (PDF, Englisch)`。
- 日语产品页新增：`総合カタログをダウンロード（PDF・英語）`。
- 俄语产品页新增：`Скачать полный каталог (PDF, английский)`。
- 三个入口均明确文件为 PDF 且内容语言为英语，避免访问者误以为手册已完整本地化。
- 三个入口均指向同一份已校正的 2026 Begapunk 产品手册，不改变任何产品参数或商业承诺。

## 目标市场参考来源

- 德语工业术语沿用 Deublin 德语产品资料的采购语言习惯：`https://www.deublin.com/de/produkte/drehdurchfuehrungen`（沿用 2026-08-27 审核记录，仅作语言风格参考）。
- 日语工业术语沿用 Pascal 日语旋转接头产品资料的采购语言习惯：`https://www.pascaleng.co.jp/jp/products/work_clamp/rotary_joint/`（沿用 2026-08-27 审核记录，仅作语言风格参考）。
- 俄语工业术语沿用 Deublin 俄语资料的采购语言习惯：`https://www.deublin.com/-/media/API-Sync-Assets/INS/040-522.pdf?ts=20250517T2213293493`（沿用 2026-08-27 审核记录，仅作语言风格参考）。
- 项目内一致性依据：`audit/localization/2026-09-02-sitewide-contradiction-repair-review.md` 以及三个页面已有的 PDF/STEP 下载措辞。

上述来源没有被用来引入 Begapunk 的产品参数、认证、性能、价格、交期或质保事实。

## 术语决定

- 英文 `Full Product Catalog` 在德语使用 `Gesamtkatalog`，日语使用 `総合カタログ`，俄语使用 `полный каталог`；三者都表达覆盖产品系列的完整手册，而非单一型号数据表。
- 下载动作保持各页面既有表达习惯：德语 `herunterladen`、日语 `ダウンロード`、俄语 `Скачать`。
- 在按钮中保留 `PDF` 和英语语言提示，不把英文手册包装成本地语言版本。

## 搜索意图决定

- 下载入口服务于正在比较型号、尺寸和接口的工程师与采购人员，位于产品列表页的下载区域，不替代具体型号页、STEP 文件或询价入口。
- 按钮文本保持简短、明确并带格式与语言信息；不添加未经验证的营销词，也不改变页面的目标关键词。

pages: `de/products.html, ja/products.html, ru/products.html`
language: `de, ja, ru (with English source comparison)`
referenceUrls: `https://www.deublin.com/de/produkte/drehdurchfuehrungen ; https://www.pascaleng.co.jp/jp/products/work_clamp/rotary_joint/ ; https://www.deublin.com/-/media/API-Sync-Assets/INS/040-522.pdf?ts=20250517T2213293493`
referenceAccessDates: `carried forward from the recorded 2026-08-27 target-market reviews; no new competitor fact was imported`
terminologyDecisions: `recorded above`
searchIntentDecisions: `recorded above`
