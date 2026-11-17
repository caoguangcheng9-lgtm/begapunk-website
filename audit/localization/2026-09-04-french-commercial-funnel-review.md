# 2026-09-04 法语最小商业漏斗复核

reviewedAt: `2026-09-04T00:00:00+09:00`
reviewedByRole: `Codex AI French technical-content reviewer (not native-speaker / not human sign-off)`
reviewMethod: `AI-assisted translation and changed-surface review against the current English pages, current inquiry handler contract, shared Consent Mode v2 implementation, and supplied French search-intent evidence.`
unresolvedIssues: `reciprocal French hreflang entries, routing, sitemap inclusion, and production publishing remain outside this change; independent native-speaker and legal review were not performed`

## 审核范围

- 新建 6 个法语页面：`fr/index.html`、`fr/products.html`、`fr/product-comparison.html`、`fr/contact.html`、`fr/privacy.html`、`fr/thank-you.html`。
- 新建共享法语漏斗样式：`fr/funnel.css`。
- 本次仅形成可审阅的本地草案；未修改 `.htaccess`、`i18n/config.json`、`js/analytics.js`、现有语言页面或 sitemap，也未发布。

## 搜索意图与术语决定

- 以 `raccord tournant pneumatique` 作为首页、产品页和对比页的首要商业词；调研显示它在法国的需求高于 `joint tournant pneumatique`。
- `joint tournant pneumatique` 作为自然同义词进入正文；`air comprimé` 用于明确介质和采购场景，不进行机械堆词。
- 英文 `rotary union / rotary joint` 在法语产品语境中统一以 `raccord tournant` 为主；涉及密封件时使用 `joint d’étanchéité`，避免把产品与密封件混淆。

## 事实与证据边界

- 产品、参数和商业事实只取自当前英文母版与现有站内下载文件。
- 保留的已确认信息包括：最小订购量 1 件；目录型号通常约 20 个日历日；定制型号通常在 30 个日历日内；可用 2D/STEP 资料；逐流路检漏。
- 未加入法国法人、法国本地团队、法语客服、法国库存、认证或其他未经确认的服务承诺。
- 产品页指向现有英文型号详情、质量页和英文条款时，链接文字明确标注“anglais”。
- 联系页明确说明页面为法语，但后续技术和商务往来目前以英语处理；访问者仍可用法语提交需求以供审阅。

## 转化与表单复核

- 联系表单仅要求 `email` 与 `requirements`；产品、图纸、姓名、公司、国家、应用和数量均为可选。
- 表单继续提交至 `/send_inquiry.php`，包含 `source_language=fr`、法语成功页重定向、询盘类型、产品来源及现有归因字段。
- AJAX 成功分支继续派发 `begapunk:inquiry-success`，随后进入 `/fr/thank-you.html`；无脚本提交仍由服务端处理。
- 法语隐私页使用共享 Consent Mode v2 语义：可选的站点分析与广告效果衡量，个性化广告保持关闭；按钮与共享横幅一致为 `Autoriser la mesure` / `Refuser la mesure facultative`。

## SEO 与发布前限制

- 6 页均包含自指 canonical；可索引页面带法语自指 hreflang 及现有语言的候选 alternates，感谢页为 `noindex, follow`。
- 这些 hreflang 目前只是草案：发布前必须在对应英文、德文、日文和俄文页面加入 reciprocal `fr` alternate，并同时完成路由与 sitemap 配置，否则搜索引擎可能忽略该 hreflang 组。
- 发布前仍建议由母语法语技术编辑复核术语、由隐私/法务责任人复核 Consent Mode v2 描述，并在预发布环境进行真实表单投递测试。

pages: `fr/index.html, fr/products.html, fr/product-comparison.html, fr/contact.html, fr/privacy.html, fr/thank-you.html`
language: `fr`
sourcePages: `index.html, products.html, product-comparison.html, contact.html, privacy.html, thank-you.html, send_inquiry.php, js/analytics.js`
terminologyDecisions: `raccord tournant pneumatique primary; joint tournant pneumatique and air comprimé secondary/contextual`
searchIntentDecisions: `commercial product discovery -> model comparison -> low-friction inquiry -> French success and privacy continuity`
