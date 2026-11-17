# AI 逐行本地化审核门禁决定

日期：2026-08-20（Asia/Tokyo）

## 决定

站点所有新增或变更的德语、日语和俄语页面仍必须完成并记录 AI 辅助的目标市场逐行审核。审核范围包括所有可见句子、标题、标签、按钮、元数据和结构化数据文本，并覆盖工业术语、自然阅读、买家搜索意图以及与 Begapunk 图纸和证据边界的一致性。

独立母语人士或人工编辑签字是可选项，不再是发布门禁，也不因缺少该签字形成编辑债务。AI 逐行审核通过且其余技术、事实、可访问性、响应式、搜索和发布检查通过时，本地化内容可进入发布候选。

## 不变的边界

- 机器翻译只能作为草稿；自动模式扫描本身不等于逐行审核。
- AI 审核必须保留页面、语言、参考来源、访问日期、术语决定、搜索意图决定、审核方法、审核时间、审核角色和未解决问题记录。
- 第三方页面只用于术语、阅读模式和搜索意图参考，不复制其文案，也不把其参数、认证、性能或客户证据变成 Begapunk 事实。
- AI-only 审核不得描述为人工翻译、人工编辑、母语审核、专业翻译或独立母语签字。
- 技术事实冲突、图纸身份冲突、未解决的本地化问题、页面可用性或发布检查失败仍然阻断发布；本决定只取消人工/母语签字这一额外条件。

## 门禁实现

`i18n/editorial/status.json` 现在显式声明 AI 逐行审核足以满足编辑发布门禁、人工和独立母语审核均非必需，并要求证据始终准确标注为 AI 辅助审核。`scripts/verify-editorial-release-status.mjs` 对这些政策字段做强制校验，防止未来规则被静默改回或把 AI-only 审核误称为人工审核。

本决定不构成提交、推送、部署、表单提交、邮件发送或服务器修改授权。

## 本次逐行审核记录：非接触すきま/Spaltdichtung/щелевое уплотнение 技术文章

- page: `blog-non-contact-clearance-seal-rotary-union.html`
- languages: `de`, `ja`, `ru`
- reviewedAt: `2026-08-20T14:42:45.7735607+09:00`
- reviewedByRole: `Codex AI technical-localization reviewer`
- reviewMethod: 逐项读取 title、description、H1、正文标题、段落、图注、图例、列表、FAQ、CTA、可见导航、Open Graph/Twitter 文案和结构化数据；逐句核对工业术语、语法、自然商业表达、目标市场搜索意图与事实边界。自动扫描只用于辅助发现，不代替逐行判断。
- independentNativeSpeakerReview: `not performed and not required`
- humanEditorialSignOff: `not performed and not required`
- unresolvedIssues: `none for localization or rendering`; 图纸身份和 PDF 导出问题继续由独立图纸冲突清单管理，不因本记录被解除。

### Reference URLs and access dates

- German, accessed 2026-08-20: `https://www.deublin.com/de/produkte/drehdurchfuehrungen`
- Japanese, accessed 2026-08-20: `https://www.pascaleng.co.jp/jp/products/work_clamp/rotary_joint/`
- Russian, accessed 2026-08-20: `https://evolution.skf.com/ru/%D0%BD%D0%BE%D0%B2%D0%BE%D0%B5-%D0%BF%D0%BE%D0%BA%D0%BE%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5-%D0%B2%D1%8B%D1%81%D0%BE%D0%BA%D0%BE%D1%82%D0%BE%D1%87%D0%BD%D1%8B%D1%85-%D0%BF%D0%BE%D0%B4%D1%88%D0%B8%D0%BF/`

这些来源只用于确认目标市场术语和阅读方式，不复制文案，不导入第三方参数、性能、认证或商业承诺。

### Terminology decisions

- German: 保留 `Drehdurchführung`、`berührungslose Radialspaltdichtung` 和 `einseitiger Radialspalt von 0,003 mm`；明确非接触不等于零泄漏，图示不是产品制造图。
- Japanese: 保留 `ロータリジョイント`、`非接触すきまシール` 和 `片側ラジアルすきま0.003 mm`；采用日本工业资料常见的回路、使用流体、最高使用压力等阅读词序，但不移植参考站参数。
- Russian: 保留 `ротационное соединение`、`бесконтактное щелевое уплотнение` 和 `односторонний радиальный зазор 0,003 мм`；使用 `частота вращения`、`рабочая среда`、`подшипниковая опора` 等自然技术表达。

### Search-intent decisions

- 页面标题和 H1 以“工作原理/高转速/非接触间隙密封”为主要检索意图，而不是用未经证实的产品性能词吸引点击。
- 直接答案、0.003 mm 解释、泄漏边界、适用条件、选型输入与 FAQ 保持可抽取结构，适合传统搜索和 AI 检索，但不承诺排名、摘要引用或推荐。
- CTA 维持工程条件提交和型号比较，不把信息型文章改写成夸张销售页。

### Browser and responsive evidence

使用修复后的 Codex 内置浏览器，在本地 HTTP 站点逐页检查：

- `de`, `ja`, `ru` × `1440 × 1000` 和 `390 × 844`，共 6 次当前检查；
- 每页恰好 1 个可见 H1，`html lang` 与目录语言一致；
- 6/6 无页面级横向溢出；
- 页面加载完成后 6/6 无损坏可见图片；
- 6/6 无浏览器 warning/error 控制台日志；
- 德语、日语和俄语的长标题、正文卡片、固定底部 CTA 与移动导航均可读，未发现乱码、英文对客文案泄漏或内容遮挡。

### Reviewed artifact hashes

```text
FB8D7C61C0B8B104006A89D9C6AF417CBDCBF02DCDBD2E5DC7CCAF8DD95E8298  de/blog-non-contact-clearance-seal-rotary-union.html
4FAD407BD63095FC071CF2AFE7A6280213699A3B59A5D417B1431CC29953DABD  ja/blog-non-contact-clearance-seal-rotary-union.html
F519CE58773DCE2CA7B1D3F832F2853204C199425B0A620954C8E171E8A33B64  ru/blog-non-contact-clearance-seal-rotary-union.html
```

本记录准确描述为 AI 辅助逐行审核，不构成人工、母语或独立编辑签字声明。
