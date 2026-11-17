# 2026-09-04 搜索意图、法语漏斗与规范 URL 整合复核

reviewedAt: `2026-09-04T13:50:30+09:00`
reviewedByRole: `Codex AI localization integration reviewer (not native-speaker / not human or legal sign-off)`
reviewMethod: `AI-assisted changed-surface and line-by-line diff review, combining the recorded French commercial-funnel review, Japanese/German search-intent review, Consent Mode v2 privacy review, canonical-homepage link normalization, reciprocal hreflang integration, and release-contract verification.`
unresolvedIssues: `independent native-speaker and legal review were not performed; production Google Ads destination and account-side conversion settings are unavailable; deployment and a real pre-production inquiry remain pending`

## 审核范围

- 德语、日语与俄语的 56 页现有本地化制品：可见正文只在已记录的德语/日语搜索意图页面和三语隐私页面改变；其余页面仅把站内首页链接从显式 `index.html` 别名改为规范目录引用、同步共享分析脚本内容哈希，并在对应 6 页加入法语 hreflang/语言切换入口。
- 英文对应页、6 个法语商业漏斗页面、`sitemap-i18n.xml`、`sitemap-fr.xml`、询盘处理与发布校验。
- 法语联系页改为复用经过四语合同测试的同一份 RFQ 行为代码，并补齐共享 RFQ 样式；法语可见文案仍以独立法语审核记录为准。
- 本记录是本轮制品快照的整合索引，不把机械属性变化描述成新的母语或人工文案审批。

## 目标市场参考来源

- 日语与德语搜索意图、术语和第一方关键词依据：`audit/localization/2026-09-04-ja-de-search-intent-review.md`。
- 法语关键词、工业用语、事实边界和商业漏斗文案：`audit/localization/2026-09-04-french-commercial-funnel-review.md`。
- 德语、日语、俄语 Consent Mode 与归因文案：`audit/localization/2026-09-04-consent-attribution-privacy-review.md`。
- 规范 URL、hreflang 与发布安全边界以仓库的 `i18n/config.json`、两份 sitemap、服务器重定向配置及自动验证合同为准；这些机械变化不引入目标市场的新产品术语或事实。

## 逐项整合核对

- 所有站内 Home 链接和首页语言切换目标使用 `/`、`/de/`、`/fr/`、`/ja/`、`/ru/` 对应的相对目录引用，不再主动经过 `/index.html` 别名。
- canonical 与 hreflang 仍是绝对规范 URL；法语只加入 6 个确有对应内容的页面，不伪造全站法语覆盖。
- 法语可索引页面进入独立 sitemap；`thank-you.html` 保持 `noindex` 并排除在 sitemap 外。`lastmod` 继承对应已有页面的可信日期，不用构建当天日期制造虚假新鲜度。
- Consent Mode v2 默认拒绝四项可选存储/处理；允许计测后仍保持个性化广告关闭。询盘归因只在允许后写入当前会话，并只随主动提交的询盘进入内部邮件。
- `generate_lead` 只在服务端确认成功后触发；未配置或编造 Google Ads `AW-` 目的地。
- 首页别名的 Apache/Nginx 301、单跳、查询参数保留和部署前硬门禁均有自动校验；本轮未执行生产部署。

## 术语决定

- 继续采用专门审核记录中的决定：日语并列覆盖 `エアーロータリージョイント` 与 `空圧用ロータリージョイント`；德语使用可证实的 `2D-PDF-Zeichnungen`；法语以 `raccord tournant pneumatique` 为主、`joint tournant pneumatique` 与 `air comprimé` 为辅。
- `Français` 仅作为对应页面确实存在时的语言切换标签；不以此暗示法国本地团队、法语售后或法国实体。
- 本轮其他全站变化仅涉及 URL、脚本版本和机器可读元数据，不新增产品、认证、交期或性能术语。

## 搜索意图决定

- 日语与德语首屏分别承接已有第一方关键词/搜索表现证据，不把关键词机械扩散到无关页面。
- 法语采用“产品发现 → 型号比较 → 低摩擦询盘 → 法语隐私与成功确认”的 6 页闭环；在有真实需求数据前，不投入 50 多页全量翻译。
- 规范首页 URL 和 reciprocal hreflang 用于集中抓取、链接与语言信号；它们不代表仓库存在多份首页内容文件，而是处理同一 `index.html` 可由两种 URL 访问的问题。

pages: `all 56 EN/DE/JA/RU page clusters plus fr/index.html, fr/products.html, fr/product-comparison.html, fr/contact.html, fr/privacy.html, fr/thank-you.html`
language: `en, de, fr, ja, ru`
referenceUrls: `internal recorded review files listed above; no new external market claim introduced by the mechanical integration`
referenceAccessDates: `2026-09-04`
terminologyDecisions: `specialist review decisions retained; no additional product terminology introduced`
searchIntentDecisions: `focused JA/DE intent updates, six-page French funnel, canonical homepage consolidation, reciprocal hreflang only where page parity exists`
