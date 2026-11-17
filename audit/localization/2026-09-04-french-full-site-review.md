# 2026-09-04 法语全站本地化与搜索意图复核

reviewedAt: `2026-09-04T19:26:31+09:00`
reviewedByRole: `Codex AI-assisted French technical-localization reviewer (not native-speaker / not human sign-off)`
reviewMethod: `AI-assisted target-market line-by-line review of all 56 French pages, their SEO metadata, structured data, navigation, calls to action, forms, FAQ content, search index and llms.txt; terminology and search-intent choices were checked against prior Begapunk Google Ads and keyword research, French industrial usage references, the English source pages and governed owner-confirmed product facts. After the review, the identical Header-logo path defect was mechanically inspected and corrected on all 224 active localized pages, without changing localized copy. Direct file-preview behavior was then added centrally and checked in a real browser so canonical HTTP directory links remain unchanged while file:/// previews resolve to index.html. The existing localized Home labels were exposed in desktop navigation, with a 1280px full-navigation threshold selected through five-language breakpoint and collision testing.`
unresolvedIssues: `No release-blocking issue remains in the local build. Independent native-speaker editorial and legal sign-off were not performed. Production redirects and live forms still require post-deployment verification; long SERP snippets should be optimized later from Search Console impression and CTR data rather than shortened blindly.`

## 审核范围

- page: `fr/*.html` — `i18n/config.json` 中全部 56 个页面。
- language: `fr`。
- 同步审核了法语 `search-index.json`、`llms.txt`、canonical、hreflang、Open Graph、Twitter metadata、JSON-LD、FAQ、导航、CTA、表单提示与感谢页。
- 产品与应用内容覆盖气动、液压、多通道、通孔、传感器监测、粉尘环境、包装、激光切管、焊接定位、机器人末端执行器及维护选型场景。

## 目标市场参考来源

- Begapunk 既有 Google Ads Keyword Planner 与关键词研究：用于判断搜索意图、词组优先级和页面分工，不作为产品事实来源。
- [Deublin France — Joints tournants / raccords tournants](https://www.deublin.eu/joints-tournants-raccords-tournants)，访问日期：`2026-09-04`。
- [SCHUNK France — Joint tournant](https://schunk.com/fr/fr/technologie-d-automatisation/joint-tournant/c/PUB_8326)，访问日期：`2026-09-04`。
- [Festo France — Unité de traitement d’air](https://www.festo.com/fr/fr/e/blog/in-practice/comment-fonctionne-une-unite-de-traitement-d-air-id_4074291)，访问日期：`2026-09-04`。
- referenceUrls: `https://www.deublin.eu/joints-tournants-raccords-tournants`; `https://schunk.com/fr/fr/technologie-d-automatisation/joint-tournant/c/PUB_8326`; `https://www.festo.com/fr/fr/e/blog/in-practice/comment-fonctionne-une-unite-de-traitement-d-air-id_4074291`。
- referenceAccessDates: `2026-09-04`。
- 竞品页面仅用于核对法国工业语境中的术语和搜索表达；没有复制其文案，也没有把竞品事实写成 Begapunk 事实。

## 术语决定

- terminologyDecisions: `raccord tournant pneumatique` 作为商业与产品页的主表达；`joint tournant` 仅在自然同义语境中使用，`joint d’étanchéité` 专指密封件，避免把产品与密封件混淆。
- `passage` 按气路/液路语义译为 `circuit` 或 `passage`，并结合页面上下文保持一致；`through-bore` 使用 `alésage traversant`。
- 技术图、产品规格、材料与密封结构仅依据 Begapunk 当前页面、受控产品数据和图纸；不添加法国库存、本地团队、认证或法语客服等未经证实的承诺。
- 法语联系页明确披露：`Cette page est en français. Les échanges techniques et commerciaux qui suivent sont actuellement traités en anglais ; vous pouvez néanmoins envoyer votre besoin en français pour examen.`
- 法语排版统一小数逗号、千位空格及冒号前空格；型号、标准缩写、STEP、PASS/NG 等技术标识按行业惯例保留。

## 搜索意图决定

- searchIntentDecisions: 将产品词、应用词和问题型信息词分配到不同页面，形成 `产品发现 → 应用匹配/型号比较 → 技术验证 → 低摩擦询盘` 的路径。
- Google Ads 与关键词研究直接影响主词优先级、标题/H1/描述、应用页主题和内链锚文本；但语法、事实边界、结构化数据、可访问性、重定向和维护性修复并非由 Ads 单独推导。
- 主页及产品页承接高商业意图的 `raccord tournant pneumatique`；应用页承接机器与工况组合词；博客承接选型、泄漏、安装、材料、密封与维护问题词。
- 法语站内搜索关键词已本地化，不再继承完整英文说明；保留型号词以承接已知型号采购意图。
- 没有为迎合字符数而删除重要型号或采购词。较长的标题/描述属于非阻断项，应在上线取得真实展示量和 CTR 后再做数据驱动调整。

## 事实、风险与发布边界

- 产品规格、质保、交期和工厂信息均受现有 owner-confirmed 合约约束；删除了无法验证的“一工作日回复”承诺。
- `availableLanguage` 仅声明当前实际支持的 `English`；网站界面提供法语不等于企业已经提供法语人工服务。
- `/index.html → /` 与 `/fr/index.html → /fr/` 的 Apache/Nginx 永久重定向已写入本地配置，避免重复首页 URL 分散信号；本次没有部署，线上状态不能据此宣称已生效。
- 新增法语技术示意图由内置 ImageGen 基于原英文图进行文字本地化：仅替换指定法语标签，保留机械剖面、箭头、`0.003 mm` 数值和构图，不改机械结构、不添加水印。
- 该复核属于 AI-assisted 专业审核，不等同于独立法语母语编辑或法国法律顾问签署。

## 验证记录

- 56/56 法语 HTML 页面存在；canonical、hreflang、title、description、H1、JSON-LD、站内资源和 sitemap 覆盖通过自动化检查。
- 法语产品页、图纸事实、UI 合约、FAQ、站内搜索与 owner-confirmed 事实通过生成器往返验证。
- 全量桌面端/移动端渲染 QA 通过 448 个视口（56 页 × 4 种语言 × 2 个视口）；总门禁收敛后，又对各语言首页和 CNC 应用页执行 16 个最终增量视口检查，结果全部通过。
- 完整 `quality:pr` 门禁通过；生产构建包含 289 个 HTML 页面，14,423 个站内链接引用和 34 个完整性校验通过的公开下载文件。本次只生成本地发布产物，没有部署。
- 顶部 Logo 原先在 224 个本地化页面被错误生成为 `../`，现已统一修正为当前语言首页 `./`；法语 56 页在桌面端和移动端完成 112 次真实 Chrome 点击，全部落到 `/fr/` 且返回 HTTP 200。生成器、同步器和本地化验证器均增加了回归保护。
- 针对用户直接以 `file:///` 打开页面时 `./` 会显示磁盘目录索引的问题，导航脚本仅在 `file:` 协议下把当前语言首页链接改写为显式 `index.html`；源码与最终发布包分别对英文、法语全部页面完成 112 次真实 Home 链接点击和 112 次真实 Logo 点击（两套产物合计 448 次跳转），均返回各自语言目录的首页文件。
- 桌面主导航现显示既有首页入口（法语 `Accueil`），没有创建重复的 `home.html`。完整导航从 1280 px 起显示，1279 px 及以下使用可滚动菜单；五种语言在 1024、1025、1180、1279、1280、1366、1440 px 均无 Header 重叠或横向溢出。法语 56 页完成 112 个桌面/移动视口检查、112 次真实 Home 链接点击和 112 次真实 Logo 点击，全部通过。
- 首页语言选择器的线上目录式地址保持不变；在 `file:` 本地预览中，导航脚本会把 `de/`、`../fr/`、`./` 等运行时补成对应的 `index.html`，不再打开磁盘目录索引。语言选择器现由导航同步器统一生成；源码与最终发布包各自对 280 个正式页面逐页确认固定包含 `English / Deutsch / Français / 日本語 / Русский`，且每套产物均完成 295 次真实语言切换、280 次 Home 点击和 280 次 Logo 点击。HTTP 源码与最终发布包还分别通过 448 个桌面/手机场景、448 次真实语言切换、448 次 Home 点击和 448 次 Logo 点击，失败数均为 0。9 个无语言栏的文件均为刻意保留的 noindex 重定向壳页，不属于内容页。
