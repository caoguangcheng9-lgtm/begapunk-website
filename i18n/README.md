# Begapunk Multilingual Site Operations

状态：多语言操作手册，不是验收规则
当前发布标准：../docs/standards/BEGAPUNK_WEBSITE_STANDARD.md

本目录保存完整德文、法文、日文、俄文站，以及按市场验证逐步发布的部分语言页面组。翻译、人工覆盖、SEO、审校状态和静态页面生成范围始终以 config.json 的实时内容为准，不在本文件中维护固定页面数量。

## 1. 凭据

翻译工具只从进程环境读取 GOOGLE_CLOUD_TRANSLATION_API_KEY。

不得把 API key 写入仓库、JSON、命令参数、报告或发布包。翻译缓存只能保存源文本和译文。

## 2. 常用命令

提取英文字符串，不调用外部翻译服务：

    npm run i18n:extract

调用 Google Cloud Translation Basic 生成翻译草稿：

    npm run i18n:translate

在仓库外生成完整本地化页面：

    npm run i18n:build

刷新 SEO、搜索索引、AI 索引和 JSON-LD：

    npm run i18n:refresh-metadata

只读验证当前本地化输出：

    npm run i18n:verify

页面内容获批并写回后，同步及验证国际 sitemap 的内容哈希和 `lastmod`：

    npm run i18n:sitemap:sync
    npm run i18n:sitemap:verify

`i18n/sitemap-lastmod-state.json` 保存每个可索引 URL 的规范化 HTML SHA-256。只有页面内容哈希变化时，`lastmod` 才更新为同步日期；内容未变时保留原日期。不得只从旧 sitemap 或其他语言页面继承日期。

同步并验证未来可能按页面发布的部分语言：

npm run partial-locales:sync
npm run partial-locales:verify
npm run partial-locales:content:verify
npm run partial-contact:sync
npm run partial-contact:verify

产品详情 UI 合同验证：

    npm run product-ui:verify

FAQ 专用同步与验证：

    npm run faq:i18n:sync
    npm run faq:i18n:verify

## 3. 写入安全边界

- i18n:build、i18n:refresh-metadata 和 i18n:integrate 的写入模式必须使用仓库外的 I18N_OUTPUT_ROOT。
- `partial-locales:sync` 只维护 `partialLanguagePages` 声明页面的 hreflang、语言切换器和独立 sitemap；新增页面正文仍须人工创建与审校。
- `partialLanguageAssets` 显式声明部分语言页面依赖的同目录资源；`i18n:integrate` 会把这些页面和资源复制到仓库外的输出目录，避免只生成 HTML 而遗漏样式。
- 不得把通用生成输出直接写回 E:\begapunk-site-v2。
- deploy:prepare 使用只读生成比较，不应在发布准备期间自动覆盖已审校页面。
- 英文目录或翻译来源变化后，先在仓库外生成和比较，再决定是否同步受影响页面。
- 任何批量写回都必须作为单独授权阶段，并保留当前用户修改。

## 4. 稳定生成合同

### Contact/RFQ

Contact 正文、本地化动态文案和 RFQ 行为由 Contact 生成合同管理。验证模式应在内存中重建受控区域并与当前页面比较，不写文件。Header/Footer 由导航同步系统单独管理。

### 产品详情

产品详情页共享 css/product-detail.css、js/product-detail.js 和 manual/product-detail-ui.json。源 HTML 必须保持渐进增强：JavaScript 失败时，技术内容、FAQ、图片和询盘路径仍可使用。

产品详情同步器只修改其拥有的区域，不应重新序列化整页，也不应覆盖产品事实、Header/Footer 或无关本地化数据。

### FAQ

FAQ 使用 manual/faq-*.json 维护德文、法文、日文和俄文受控文案。英文事实变化后，必须同步可见内容、FAQPage JSON-LD、SEO、搜索索引、AI 索引和 RFQ 来源路径。通用翻译构建不能替代 FAQ 专用合同。

## 5. 审校与发布

- 机器翻译是草稿。
- 新增或改变含义的本地化内容，需要记录 AI 辅助目标市场逐行审校。
- AI 审校可以满足发布要求；独立母语或人工编辑审核是可选增强项。
- 不得把 AI 审校描述为母语、人工或专业翻译认证。
- 关键参数、产品范围和询盘含义冲突属于 P1；不影响含义的语言润色属于 P2。
- 详细的事实、客户表达、P0/P1 门槛和 P2/P3 优化规则只以主标准为准，本文件不重复制定。

审校证据放在 ../audit/localization/。日期化报告只证明当时检查过什么，不自动授权当前发布。
