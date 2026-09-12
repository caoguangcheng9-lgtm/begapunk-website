# Begapunk 发布审核与上线验证标准 v2

状态：当前有效（`BEGAPUNK_WEBSITE_STANDARD.md` 的发布审核执行细则）  
生效日期：2026-09-05  
适用范围：网站源码、全部公开语言、生成制品、下载文件、发布包、生产服务器、询盘链路、上线后观测，以及执行这些检查的审核器本身

## 1. 权威关系与目标

本标准把 [`BEGAPUNK_WEBSITE_STANDARD.md`](./BEGAPUNK_WEBSITE_STANDARD.md) 中的商业目标、P0-P3 和上线原则转成可执行的审核流程，不改变其授权边界和严重级别定义。发生冲突时，依次采用：

1. 用户对当前操作的最新明确授权；
2. [`BEGAPUNK_WEBSITE_STANDARD.md`](./BEGAPUNK_WEBSITE_STANDARD.md)；
3. 本标准；
4. [`DEPLOYMENT.md`](../../DEPLOYMENT.md)、[`i18n/README.md`](../../i18n/README.md) 等操作手册；
5. `audit/` 下的历史报告。

本标准的目标不是让检查数量最多，而是回答四个问题：

1. 本次准备发布的具体制品是什么；
2. 它是否保持正确事实、可用路径、安全边界和可回滚性；
3. 上线后用户实际拿到的是否就是已审核制品；
4. 证明上述结论的审核器是否可信、覆盖完整且没有被绕过。

日期、页面数量、语言数量、测试次数和工具版本必须从当前配置或本次证据读取，不得作为永久常量。当前公开范围是英文及 `i18n/config.json` 中的活动语言；以后增加语言时，本标准自动覆盖新增公开语言。

文中使用“必须”“不得”表示硬性要求；“应”表示默认做法，如不执行必须记录理由；“可以”表示可选增强。

## 2. 结果状态：PASS、FAIL、UNKNOWN

每个审核控制、每个阶段和最终发布结论只能使用以下三种证据状态。`SKIPPED`、`ASSUMED PASS`、`大概正常`、`之前通过`不能替代它们。

| 状态 | 精确定义 | 允许的依据 | 禁止的用法 |
| --- | --- | --- | --- |
| `PASS` | 本次指定 release、环境、范围和时间窗口内，实际结果满足已声明的期望，且证据完整可复核 | 当前 commit/release 的命令输出、制品哈希、HTTP/浏览器结果、受控人工复核、可关联的生产记录 | 用旧报告、无范围的口头确认、仅凭“命令退出 0”但不知道命令覆盖什么、用近似测试证明另一件事 |
| `FAIL` | 已取得可信证据，证明至少一个实际结果不满足期望 | 可重现失败、错误响应、哈希不符、错误事实、真实功能故障、审核器负向样例未检出 | 因工具没装、网络超时或没有权限而直接写 FAIL；这些情况通常是 UNKNOWN |
| `UNKNOWN` | 没有足够证据得出 PASS 或 FAIL，或证据不完整、过期、作用域错误、工具异常、结果互相冲突 | 工具不可用、超时、只测了部分语言、生产版本身份不明、缺日志、未获真实询盘授权 | 把 UNKNOWN 降格为 PASS；用“未发现错误”冒充“已验证正确” |

### 2.1 适用性与最终决策

- “不适用”是控制的 `applicability`，不是第四种结果。确实不适用的控制必须记录 `applicable: false`、理由和批准角色，不参加本阶段聚合。
- 任一适用的 P0/P1 控制为 `FAIL`，本阶段结论为 `FAIL`。
- 任一必需的 P0/P1 控制为 `UNKNOWN`，本阶段结论为 `UNKNOWN`，并按阻断处理；不得发布后再补证据。
- 只有全部适用 P0/P1 控制为 `PASS`，P2/P3 的 FAIL/UNKNOWN 已记录责任人和期限时，本阶段才可为 `PASS`。
- 映射到主标准时：阶段 `PASS` 等同 `READY`；阶段 `FAIL` 或必需 P0/P1 的 `UNKNOWN` 等同 `NOT READY`。
- PASS 只对证据中的 commit、release、URL、路径、语言、viewport 和时间窗口有效，不能继承给后续 release。

## 3. 严重级别与动作

严重级别按实际客户、事实、安全、隐私、询盘和发布影响判断，不由检查脚本名称或退出码自动决定。

| 级别 | 判断标准 | 发布前 | 已激活但事务未提交 | 已提交上线后 | 目标响应 |
| --- | --- | --- | --- | --- | --- |
| P0 | 核心站点大面积不可用；敏感信息暴露；制品被篡改或含恶意载荷；询盘隐私泄露、错投或大规模丢失；全站意外禁止抓取 | 阻断全部发布，保全证据 | 立即回滚 release 和相关策略 | 立即启动事件处置；由本次发布引起时立即回滚 | 立即 |
| P1 | 错误产品事实；关键页面、语言、Logo/Home/语言切换、下载或 Contact/RFQ 无法安全使用；关键 canonical/hreflang/redirect 严重错误；缺少必需审核证据 | 阻断受影响范围；不能可靠隔离时阻断全部发布 | 回滚或在事务提交前恢复；不得带故障提交 | 15 分钟内能完成低风险前修且范围可隔离时前修，否则回滚已知良好 release | 15 分钟内决策 |
| P2 | 用户仍能正确理解和完成核心操作，但存在明确质量、性能、收录、非关键链接或轻度可访问性问题 | 告警并建工单，不单独阻断 | 记录，不单独回滚 | 监控并按期限修复；恶化后可升级 | 1 个工作日内分派 |
| P3 | 视觉偏好、实验性增强、低收益完善 | 记录即可 | 不回滚 | 纳入普通优化池 | 周期性评估 |

### 3.1 固定动作规则

- P0/P1 的 FAIL 或必需证据 UNKNOWN 均不能靠重跑同一不完整检查变成 PASS。
- 能隔离到未公开的单页、单语言或单功能时，可以移出本次 release 后重新审核；当前原子 release 不能真正隔离时，必须整版阻断或回滚。
- Lighthouse 分数、IndexNow 失败、Search Console 尚未收录，单独出现时通常是 P2；只有同时证明关键页面真实不可用、空白、超时或核心操作失败时才升级 P1。
- 回滚必须指向通过完整审核的已知良好 release，并使用维护锁和现有原子激活流程；不得直接在生产目录手改文件来制造“临时 PASS”。现行流程见 [`ops/activate-release.sh`](../../ops/activate-release.sh) 和 [`DEPLOYMENT.md`](../../DEPLOYMENT.md#manual-rollback)。

## 4. 审核对象与硬门槛

### 4.1 网站与内容

发布前必须证明：

- 本次变更范围、共享影响面和所有派生制品已经列明；
- 型号、参数、介质、材料、接口、应用、交期、保修、认证和客户案例符合主标准中的一手事实来源；
- 英文与所有公开语言的关键事实、限制和 CTA 含义一致；
- 机器翻译没有被当作已审校内容，语义变化有精确绑定到页面、语言和 diff 的审核记录；
- 语义审核快照与机械制品完整性分开：换行、cache key、导航外壳或格式变化不得冒充新的逐句语义审核；
- HTML、CSS、JavaScript、JSON-LD、搜索索引和 AI 可读内容有效，关键内容在非必要 JavaScript 或第三方服务失败时仍可使用；
- 每个公开 HTML 路径都在 release inventory 中声明为 `indexable`、`noindex`、`redirect` 或 `error`，未声明路径不得发布；
- 从 CI 生成并上传的 production artifact 不存在 symlink、socket、device、备份、草稿、源审计、密钥或 inventory 外文件；总 manifest 与普通文件集合一一对应。服务器激活时附加的 `.well-known` 与 `WW_verify_*.txt` 不是 artifact 成员，只能作为显式 runtime binding：来源必须在 root-owned shared 目录中、不得嵌套 symlink/特殊节点、不得被部署账号写入，目标与来源要逐项核对；其他额外节点一律阻断。

当前可复用的本地检查包括 [`scripts/verify-localized-site.mjs`](../../scripts/verify-localized-site.mjs)、[`scripts/validate-source-quality.mjs`](../../scripts/validate-source-quality.mjs)、[`scripts/verify-public-claims.mjs`](../../scripts/verify-public-claims.mjs) 和 [`scripts/validate-product-data.mjs`](../../scripts/validate-product-data.mjs)。脚本存在不等于已执行，只有本次 evidence manifest 中的执行结果才算证据。

### 4.2 路径、SEO 与抓取

每个 indexable 页面必须满足：

- 恰好一个 self-canonical、一个非空 title、一个非空 meta description、一个明确 robots 状态；
- 每个公开语言恰好一个 reciprocal hreflang，并有一个 x-default；不得用 Map 覆盖重复标签后仍判 PASS；
- canonical、`og:url`、语言切换目标、sitemap URL 和实际 200 页面一致；
- sitemap 无重复、无 noindex/error/redirect URL，声明的目标均存在；hash-backed `lastmod` 与受控内容变化一致；
- robots.txt 为正式 origin，引用当前 sitemap，不得出现意外全站禁止；
- Logo、显式 Home 和语言选择器在桌面、移动端真实点击后进入预期语言路径、返回 200、`html lang` 正确且页面非空；
- 每个公开语言和受测页面至少有一个询盘/Contact CTA 在有效处理同意横幅后按最终 CSS 计算为可见、未禁用且命中测试可点击；必须真实进入同语言 Contact 页面并确认表单存在，Contact 页本身则确认提交控件可见可操作但不得在未授权时提交；
- 重定向为预期单跳，保留允许的 query 参数，不产生 loop、chain 或跨语言误跳。

当前静态合同见 [`scripts/sync-canonical-homepage-links.mjs`](../../scripts/sync-canonical-homepage-links.mjs)、[`scripts/sync-sitemap-i18n.mjs`](../../scripts/sync-sitemap-i18n.mjs) 和 [`scripts/verify-localized-site.mjs`](../../scripts/verify-localized-site.mjs)。真实点击能力见 [`scripts/verify-localized-render-qa.mjs`](../../scripts/verify-localized-render-qa.mjs) 与 [`scripts/verify-local-file-home-navigation.mjs`](../../scripts/verify-local-file-home-navigation.mjs)。历史 JSON 报告不能替代本次 release 的运行结果。

### 4.3 链接、资源与下载

- 所有站内链接、fragment、CSS/JS、图片、字体、视频和表单 action 必须解析到 release 内的普通文件或批准端点；大小写和 Unicode 规范化冲突必须阻断。
- 外部链接的暂时超时或限流只告警；确认持续 404/410、域名被接管或目标不安全时按影响升级。
- 本地图片必须存在、可解码并有宽高；关键首屏图不得造成页面不可用。压缩率和推荐格式通常只告警。
- 公开下载必须在显式白名单中、有页面入口、可访问标签和 SHA-256；PDF/STEP 必须能被独立解析。
- PDF 不得加密，不得包含 JavaScript、Launch action、EmbeddedFile 或未批准附件；恶意软件扫描命中为 P0。
- STEP 文件必须保持二进制/原始字节稳定，并通过完整性与最小结构验证；涉及工程事实变化时还需要对应图纸或工程批准，哈希本身不能证明内容正确。

当前下载边界见 [`scripts/lib/public-downloads.mjs`](../../scripts/lib/public-downloads.mjs)、[`scripts/generate-public-downloads-manifest.mjs`](../../scripts/generate-public-downloads-manifest.mjs) 和 [`scripts/verify-release-links-and-downloads.mjs`](../../scripts/verify-release-links-and-downloads.mjs)。

### 4.4 浏览器、可访问性与性能

- HTML 解析错误、重复 ID、关键表单无可访问名称、导航或 CTA 键盘不可达、阻断性 console/page error、broken image、横向溢出遮挡关键内容，均按影响作为 P1。
- 自动可访问性扫描的 critical/serious 项必须人工确认；确认影响核心路径后阻断。moderate/minor 默认 P2。
- PR 使用变更驱动的浏览器范围；release 对最终制品执行全语言、全关键页面族矩阵。共享导航、公共 CSS/JS、语言配置或生成器变化必须扩大到全部受影响页面。
- 性能同时保留确定性资源预算、三次运行中位数的实验室 Lighthouse 和生产观测。单个实验室分数不单独决定发布；关键页面真实加载或交互失败按 P1 处理。
- 浏览器、Node、依赖和测试配置必须记录版本；依赖系统浏览器但没有版本证据时，结果最高只能是 UNKNOWN。

当前能力见 [`scripts/verify-release-experience.mjs`](../../scripts/verify-release-experience.mjs)、[`scripts/verify-lighthouse-performance.mjs`](../../scripts/verify-lighthouse-performance.mjs)、[`scripts/verify-search-interactions.mjs`](../../scripts/verify-search-interactions.mjs) 和 [`scripts/verify-cookie-banner-layout.mjs`](../../scripts/verify-cookie-banner-layout.mjs)。

### 4.5 询盘：可达、提交、SMTP 与送达必须分开

询盘审核至少拆成以下四个控制，禁止合并成模糊的“询盘 PASS”：

| 控制 | PASS 所需证据 | 仅有下列证据时的结论 |
| --- | --- | --- |
| `INQ-UI` 表单与 CTA | 当前 release 的各公开语言 Contact/RFQ 可达，字段、验证、附件限制、隐私提示和 CTA 与合同一致 | 只检查 HTML 源码而未运行受影响交互：UNKNOWN |
| `INQ-ENDPOINT` 应用边界 | PHP 版本、方法、Origin、校验、限流和失败路径在隔离环境通过；生产端点的安全只读/拒绝路径符合预期 | HEAD 405、`Allow: POST` 或非法 Origin 403 只能让本控制相应子项 PASS |
| `INQ-SMTP` SMTP 接受 | 受控真实请求得到应用成功记录，并能关联到 SMTP/provider 接受 ID | 本地 mock、PHP 单元测试、端点 200、页面 thank-you：UNKNOWN |
| `INQ-DELIVERY` 收件箱送达 | 经单独授权的受控真实询盘，在目标邮箱实际收到；提交 ID、应用日志、provider/SMTP ID 与收件记录可关联，主题/正文/附件符合预期 | 未发送、只验证 405/403、本地 mock、只看到 SMTP accepted、只看到页面成功提示：必须写 UNKNOWN，绝对不得写 PASS |

- 纯内容或样式发布且询盘实现、收件人、SMTP、PHP-FPM 和服务器邮件配置均未变化时，`INQ-DELIVERY` 可记录 `applicable: false`；这不代表送达 PASS，也不得在发布总结中写“询盘已送达验证通过”。
- 修改表单合同、`send_inquiry.php`、PHPMailer、PHP-FPM、`.env`/`.env.example`、package/composer manifest 或 lockfile、`.htaccess`、Nginx/PHP 路由、生产构建/部署/激活/bootstrap、SMTP provider、收件人、DNS 邮件配置或附件限制时，`INQ-SMTP` 与 `INQ-DELIVERY` 均为 P1 必需控制。虽然 `.env.example` 与 package 文件不直接复制到公开 release，单凭路径无法证明其构建/运维邮件合同变化对候选行为无影响，因此保守升级为必需。无法明确归类但可能参与运行时请求、POST 或 PHP 路由的新增/修改/删除/重命名文件，同样按影响询盘链路处理，不得默认 `not-applicable`。若没有真实发送授权，结果为 UNKNOWN 并阻断该变更上线。
- `release-authorization.json` 只验证受保护变量、精确候选 SHA 和外部证据引用之间的绑定。其顶层 `PASS` 是“授权/引用绑定门禁通过”，不是 `INQ-SMTP` 或 `INQ-DELIVERY` PASS；该脚本没有读取并复核外部记录时，两项控制在制品内必须保持 UNKNOWN。
- 证据必须脱敏，不保存真实客户正文、附件、凭据、完整邮箱或不必要的个人信息。

当前隔离检查见 [`scripts/verify-inquiry-contract.mjs`](../../scripts/verify-inquiry-contract.mjs)、[`scripts/verify-inquiry-php-runtime.mjs`](../../scripts/verify-inquiry-php-runtime.mjs) 和 [`scripts/verify-analytics-attribution.mjs`](../../scripts/verify-analytics-attribution.mjs)。公网 HEAD/安全边界见 [`ops/verify-public-deployment.sh`](../../ops/verify-public-deployment.sh)，它不发送询盘，也不证明邮箱送达。

### 4.6 服务器与部署事务

release 激活前必须取得以下 PASS：

- commit 属于批准的 `main` 历史，tag、commit、release ID 和 manifest 可相互关联；
- 工作树与生成制品满足清洁/确定性要求；生产包为不可变目录；
- 目标主机身份已由已验证 host key 确认，部署密钥是专用最小权限密钥；
- `/www/begapunk/current` 指向已知 release，上一已知良好 release 存在且 manifest 可验证；
- root-owned helper、窄 sudoers、hardening marker、maintenance lock、外置 `.env` 的所有者/权限符合合同；
- Nginx 候选策略、expanded config、PHP-FPM 实际配置、磁盘空间和所需服务健康；
- 上传后的普通文件集合与 manifest 完全一致，且在 runtime binding 之前无 symlink 和未知类型；激活后的 symlink 只能是上一节列明并已验证来源的运行时绑定；服务器激活还必须先核对由构建 job 输出并跨 job 传递的 `manifest.sha256` 文件摘要，只在服务器上重算摘要或只运行 `sha256sum -c` 不能证明该 manifest 仍是已审核版本；
- Nginx policy 与 release 在同一事务内 stage、验证、activate、public verify、commit；中途失败按现有顺序先恢复 release，再恢复 policy。

现有实现入口为 [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)、[`ops/install-nginx-managed-redirects.sh`](../../ops/install-nginx-managed-redirects.sh)、[`ops/activate-release.sh`](../../ops/activate-release.sh)、[`ops/upgrade-deployment-hardening.sh`](../../ops/upgrade-deployment-hardening.sh) 和 [`ops/nginx-managed-redirects.conf`](../../ops/nginx-managed-redirects.conf)。

## 5. 分层测试策略

所有控制按最低充分层级执行。低层通过不能替代高层；高层发现问题也不能取消低层可复现证据。

| 层级 | 目的 | 典型检查 | 失败含义 |
| --- | --- | --- | --- |
| L0 范围与审核器 | 证明测试对象、规则和工具可信 | diff 分类、release inventory、控制清单、审核器正/负样例、跨平台确定性、verify 模式只读 | P0/P1 控制覆盖未知时阻断 |
| L1 静态合同 | 快速发现源码和内容错误 | 事实/i18n/SEO、HTML/JS/JSON-LD 语法、链接解析、表单合同、下载白名单 | 明确错误按 P0-P3 分类 |
| L2 最终制品 | 证明将上传的包正确 | clean build、文件类型、manifest、artifact 无 symlink/秘密、最终 release 链接/资源/下载 | P0/P1 阻断 |
| L3 本地浏览器 | 证明真实渲染和交互 | 桌面/移动、Logo/Home/语言切换、搜索、表单、无 JS 降级、console、overflow、可访问性 | 核心路径问题 P1 |
| L4 服务集成 | 证明服务器候选与事务可用 | PHP 8.2/8.3、Nginx validate、权限、localhost HTTPS、上传后 manifest、回滚演练/目标 | P0/P1 阻断 |
| L5 生产边界 | 证明公网实际响应命中本次 release | release identity、真实域名 HTTP/TLS/header/redirect/404、生产浏览器、在线 SEO/资源 | P0/P1 立即回滚或前修 |
| L6 延迟外部结果 | 观察无法即时证明的系统 | 邮箱送达、日志、Search Console、IndexNow、索引、RUM/CWV、询盘对账 | 按证据状态和严重级别处置 |

### 5.1 变更驱动范围

| 变更类型 | PR 最小层级与范围 | release 必需范围 |
| --- | --- | --- |
| 单页文字、SEO 或参数 | L0-L3；该页、所有受影响语言、相关搜索/AI/Schema | L0-L5；最终制品中的受影响路由 |
| 产品事实、下载或工程文件 | L0-L3；事实来源、引用页、搜索/AI、下载解析与哈希 | L0-L5；所有引用路径和公网下载 |
| Logo、Home、语言切换、公共导航 | L0-L3；所有语言、所有页面族、两个 viewport | L0-L5；最终 release 全公开语言的全页真实点击矩阵 |
| 公共 CSS/JS、analytics cache key、生成器 | L0-L3；跨平台确定性和所有受影响页面族 | L0-L5；完整 release 浏览器矩阵；纯机械变化不得刷新语义审核 |
| canonical、hreflang、sitemap、robots、redirect | L0-L2 全受影响 URL；L3 语言导航 | L0-L5 全 cluster、所有变更 redirect 与 query |
| 表单、PHP、SMTP、收件人、附件 | L0-L4；隔离合同和失败路径；真实送达另行授权 | L0-L6；授权的真实送达为必需 P1 证据 |
| Nginx、部署脚本、权限、secret 路径 | L0-L2 加 shell/policy 自测 | L0-L5；服务器 preflight、事务和回滚证据 |
| 仅规则文档 | L0；链接、矛盾、Markdown diff | 不因文档本身部署网站 |

## 6. 阶段矩阵

矩阵符号：

- `B`：blocking；适用 P0/P1 为 FAIL 或 UNKNOWN 时阻断。
- `R`：rollback gate；激活后 P0/P1 为 FAIL，或安全关键结论 UNKNOWN 时回滚。
- `W`：warning/observation；记录并告警，不能伪造 PASS。
- `C`：仅当该领域被本次变更影响时升级为 B/R。
- `—`：本阶段不要求；不表示 PASS。

| 控制域 | PR | release 候选 | 上线 0-5 分钟 | 上线 24 小时 | 上线 7 天 |
| --- | --- | --- | --- | --- | --- |
| `GOV-01` commit、diff、授权、release inventory | B | B | 核对 release identity：R | W | W |
| `AUD-01` 审核器自测、覆盖、防绕过、只读性 | B | B | 证据读取异常：R/C | W | 周度 B（对下一 release） |
| `WEB-01` 产品事实、商业承诺、跨语言语义 | B | B | 关键页面抽查：R | W/C | W |
| `WEB-02` HTML/JS/JSON-LD、站内链接和资源 | B | B | 生产 200/资源/console：R | R/W | W |
| `SEO-01` canonical、hreflang、robots、sitemap | B | B | 公网逐项核对：R | Search Console：W，站点级错误 R | W |
| `NAV-01` Logo、Home、语言选择和关键路径 | 变更页 B；共享变化全量 B | 全 release B | 生产真实点击：R | 重跑代表矩阵：R/W | W |
| `DL-01` 下载白名单、解析、恶意载荷、哈希 | B | B | 公网摘要/可达：R | W | W |
| `INQ-UI/ENDPOINT` | B | B | 生产安全边界与 UI：R | 日志异常 R/W | 对账 W |
| `INQ-SMTP/DELIVERY` | C；改变链路时 B | C；改变链路时 B | 仅经授权真实发送；否则 UNKNOWN | 收件/日志对账，改变链路时 R | 趋势 W |
| `SRV-01` 主机、权限、Nginx/PHP-FPM、rollback target | shell/policy 变更时 B | B | release/policy 身份：R | W | W |
| `SEC-01` 秘密、敏感路径、TLS、安全头、制品完整性 | B | B | 公网边界：R | 定时探针 R/W | W |
| `PERF-01` 资源预算、Lighthouse、生产时延/CWV | 回归 W；真实不可用 B | W；真实不可用 B | 生产基线 W，超时按 R | W | p75 数据 W/UNKNOWN |
| `DISC-01` IndexNow、抓取与收录 | — | URL 集合 B；提交结果 W | IndexNow W | Search Console W | Search Console W |
| `OBS-01` 5xx/404/PHP/询盘/系统日志 | — | telemetry 可用性 B | 异常 R/W | W，P0/P1 升级 | W，形成趋势 |

### 6.1 PR

PR 至少必须：

1. 确定变更范围和共享影响，读取当前活动语言及 release inventory；
2. 执行 L0-L3 的适用控制；
3. 对哈希、生成器、换行或跨平台路径相关改动，在 Windows 和 Linux 比较规范化结果；
4. 对审核器自身改动运行正向、负向和 bypass 样例；
5. 生成文件必须已提交，verify 命令执行后工作树仍干净；
6. 输出 stage evidence manifest；P0/P1 FAIL/UNKNOWN 时不得合并。

现行入口为 [`package.json`](../../package.json) 的 `quality:pr` 与 [`.github/workflows/pr-quality.yml`](../../.github/workflows/pr-quality.yml)。这两个入口没有执行的脚本不能仅因存在而计为门禁。

### 6.2 Release 候选

release 必须基于批准的 main commit，并在上传前完成：

1. 依赖锁定安装、适用 PHP 矩阵、统一 release 审核命令；
2. 最终生产包构建、普通文件 inventory、无 symlink/秘密/未知文件、整体 manifest；
3. 最终包上的全站链接、资源、下载、SEO、浏览器和关键路径检查；
4. 服务器 preflight、当前/上一 release 身份、维护锁、权限、Nginx/PHP-FPM 和回滚路径；
5. 查询本次是否改变询盘链路；如改变，必须满足第 4.5 节真实送达要求；
6. 所有报告绑定同一 commit 和 release manifest digest。

本地化审核的信任基线不得从候选分支自身读取：PR 必须由 GitHub 事件注入并 fetch `pull_request.base.sha`；tag/release 必须由受保护的 `production` environment variable 提供上一个已批准且仍在运行的完整 commit SHA。该 SHA 必须是候选的祖先，并与服务器 `/www/begapunk/current` 所标识的 commit 一致；缺失、不可解析、等于候选、与在线 release 不一致时均为 UNKNOWN 并阻断。新 release 通过生产检查并被批准后，才可将受保护变量提升到其 SHA。

自动候选报告本身不能授权上线。每次 production run 还必须从受保护 environment 取得与 `GITHUB_SHA` 完全相同的 `RELEASE_APPROVED_SHA` 以及不可变的 `RELEASE_AUTHORIZATION_REF`；引用指向的外部记录必须包含适用控制的人工结论和证据位置，可从 [`.github/RELEASE_APPROVAL_TEMPLATE.md`](../../.github/RELEASE_APPROVAL_TEMPLATE.md) 建立记录。询盘适用性必须显式声明为 `required` 或 `not-applicable`。当版本差异涉及 `send_inquiry.php`、PHPMailer、任一语言 Contact 表单、`.env.example`、package/composer manifest 或 lockfile、`.htaccess`、Nginx/PHP 路由、生产构建/部署/激活/bootstrap 或其他可能参与运行时/路由的未分类文件时，只允许 `required`；删除和重命名必须同时按旧、新路径判断。SMTP/provider 与实际受控收件箱证据必须分别绑定同一候选 SHA。缺失、过期或不一致一律阻断。字符串引用只证明绑定关系，不代替对外部证据内容的复核；绑定脚本的 PASS 绝不得改写为 SMTP 接受或邮箱送达 PASS。

当前本地化 manifest 对每个 artifact 保留一跳 before→after provenance。若同一页面在两个生产 release 之间发生两次或更多语义修改，最后一次记录不能拿中间 commit 冒充生产基线；必须在发布前对“已批准生产基线→最终候选”做一次合并后的最终语义复核并记录精确 transition，或先发布并批准中间版本。长期迁移目标是 append-only transition chain；在其落地前，这一限制按 P1 fail-closed，不得人工改 hash 绕过。

现行统一入口为 [`scripts/run-release-audit.mjs`](../../scripts/run-release-audit.mjs)：`quality:pr` 使用 `pr` phase，`deploy:prepare` 使用 `release` phase；两者读取同一份 [`audit/policy/release-audit-v2.json`](../../audit/policy/release-audit-v2.json)。最终制品由 [`scripts/build-production-release.mjs`](../../scripts/build-production-release.mjs) 构建，并由 [`scripts/validate-deployment.mjs`](../../scripts/validate-deployment.mjs) 验证。

### 6.3 上线后 0-5 分钟

这些检查应在激活后立即执行；能放在部署事务 commit 前的必须放在 commit 前：

1. 证明 `/www/begapunk/current`、公网响应指纹和本次 release ID/manifest 一致；
2. 运行 [`ops/verify-public-deployment.sh`](../../ops/verify-public-deployment.sh)，并覆盖本次全部新增/修改 redirect；
3. 检查所有公开语言首页、产品目录、代表产品、Contact/RFQ 为 200 且页面非空；
4. 用生产域名真实浏览器点击 Logo、Home、语言选择器，检查 pathname、`html lang`、资源、console、移动布局；
5. 在线核对 robots、主/国际 sitemap、受影响页面 canonical/hreflang/noindex；
6. 在静态 200、301、404/410 和 PHP 拒绝响应上检查 TLS 与安全头；
7. 只做已授权的询盘动作。405/403 只证明端点边界，绝不写成送达 PASS；
8. 检查部署后 5xx/PHP error 和异常 404，没有 P0/P1 后才提交事务；
9. IndexNow 在事务提交后执行，失败告警和重试，不回滚健康网站。

### 6.4 上线后 24 小时

1. 以 5-15 分钟间隔检查各语言首页、Contact、代表产品、TLS、5xx 和响应时延；
2. 对比发布前基线，按 path/referrer 聚合新增 404、redirect loop、PHP 403/429/5xx、超时和资源错误；
3. 重跑生产浏览器代表矩阵和在线 SEO 抽样；
4. 在 Search Console 核对 sitemap 读取状态，并抽查本次 changed URL 及受影响语言的抓取、robots、canonical；
5. 对询盘应用日志、provider/SMTP 和收件记录做可关联对账；没有真实提交或收件证据时，`INQ-DELIVERY` 保持 UNKNOWN；
6. 运行生产合成性能样本并与发布前基线比较。单纯分数回落告警，真实核心不可用按 P1。

### 6.5 上线后 7 天

1. 汇总 uptime、5xx、关键 404/redirect、PHP 错误率、p50/p95 TTFB 和事件；
2. 检查 Search Console Pages、Crawl Stats、sitemap discovered、Google-selected canonical 及受影响语言；搜索引擎尚未处理不得写 FAIL，也不得写 PASS，应按证据写 UNKNOWN/观察中；
3. 有足够真实流量样本时记录 p75 LCP/INP/CLS；样本不足必须为 UNKNOWN；
4. 对合法询盘的应用成功、SMTP/provider 接受和收件数量做隐私安全对账；无法关联时不能声称送达完整；
5. 将新 P0/P1 转事件并立即处置，P2/P3 建工单；复核所有临时例外是否到期。

## 7. 审核器自身的审核

自动检查只有在自身通过以下控制后才可提供 PASS 证据。

### 7.1 控制清单与调用闭环

- 必须维护版本化 control inventory，记录 control ID、严重级别、owner、实现入口、适用条件、期望、证据输出和阶段。
- `package.json`、PR workflow、deploy workflow 与 control inventory 必须一致；脚本存在但未由适用阶段调用，视为未覆盖。
- PR 与 deploy 不得维护两份无法比较的超长门禁列表；在统一 orchestrator 完成前，必须自动比较两条链的必需控制集合。
- 新增公开语言、页面类型或路径状态时，审核器必须从配置发现范围，或由 coverage test 因遗漏而失败。硬编码语言列表不得静默少测。

### 7.2 正向、负向与防绕过样例

每个 P0/P1 verifier 必须至少具有：

1. 一个有效样例，证明正确输入可 PASS；
2. 一个最小负向样例，证明目标故障会 FAIL；
3. 一个 bypass 样例，证明重复标签、大小写/Unicode、路径逃逸、缺页、空证据、错误作用域或伪造计数不能绕过；
4. verifier 修改时，对上述样例全部运行，并由非实现者或 site owner 复核阈值和 coverage 变化。

删除控制、缩小页面/语言范围、放宽阈值、把 FAIL 改为 warning、允许旧证据或降低真实送达要求，均视为审核制度变更，不得隐藏在普通内容 PR 中。

### 7.3 确定性与跨平台

- 文本哈希必须先声明规范化算法，例如 `sha256-text-lf-utf8-v1`；原始字节哈希必须明确为 binary，不得名称与实现不一致。
- 同一语义输入在 Windows/Linux 的换行、路径分隔符和 locale 差异下必须得到相同规范化制品；二进制下载则必须保持完全相同字节。
- `.gitattributes` 是材料化约束，不替代跨平台自测。
- GitHub Actions 依赖必须固定到已核验的完整 commit SHA，并以注释保留可读版本；版本标签只能用于核对，不能直接作为生产信任锚。升级时重新核验来源并由 CI 复测。
- 时间、随机端口和临时目录不得进入应可复现的制品哈希；确需时间戳时必须与语义/机械审核分离。

### 7.4 新鲜度、只读性与失败安全

- 证据的 commit SHA、release ID 或 manifest digest 与待发布对象不一致时为 UNKNOWN。
- 历史 render QA、截图或 editorial 状态计数不能证明当前制品；审核状态必须引用并校验实际报告及制品摘要。
- 名为 `verify`、`check`、`audit` 的门禁默认只读；执行后必须验证 tracked/untracked 状态没有变化。必须生成报告时，写入本次专用 evidence 目录并在字段中声明。
- 工具崩溃、依赖缺失、浏览器未找到、网络超时、权限不足、部分 shard 丢失或日志截断均为 UNKNOWN，不得 fail-open。
- 并行 shard 必须有预期总数和唯一范围；任一 shard 缺失时总体 UNKNOWN。

### 7.5 周期性审核器复核

- 每个 PR：检查受影响 verifier 的正/负/bypass 样例与只读性。
- 每个 release：校验 control inventory 与实际执行闭环，绑定最终 manifest。
- 每 7 天：完整运行全部 P0/P1 负向样例、依赖/浏览器版本检查和跨平台确定性检查。
- 每 30 天：人工复核 P0/P1 分类、例外、误报/漏报、耗时和维护成本；删除重复检查前必须证明覆盖没有下降。

## 8. 证据规范

每次 PR、release 和上线后阶段都必须生成一个 machine-readable evidence manifest；Markdown 摘要只能引用它，不能替代它。建议路径为：

```text
audit/releases/<release-id>/<stage>/evidence.json
```

至少包含以下字段：

| 字段 | 要求 |
| --- | --- |
| `schemaVersion` | 证据结构版本 |
| `auditId`、`stage` | 唯一审核 ID；`pr`、`release`、`postdeploy-0-5m`、`postdeploy-24h` 或 `postdeploy-7d` |
| `controlId`、`controlVersion` | 对应稳定控制及其规则版本 |
| `result`、`severity` | 仅 PASS/FAIL/UNKNOWN；P0-P3 |
| `applicable`、`applicabilityReason` | 是否适用；不适用必须解释 |
| `commitSha`、`tag`、`releaseId` | 精确发布身份；没有的阶段显式为 null |
| `releaseManifestSha256` | 最终 `manifest.sha256` 自身摘要，用于绑定所有报告 |
| `environment`、`origin`、`hostIdentity` | source/release/staging/production；正式 origin；脱敏后的主机身份 |
| `scope` | 路径、语言、页面族、viewport、接口、文件和预期总数 |
| `expected`、`actual` | 可机器比较的期望与实际；不能只写“正常” |
| `startedAt`、`completedAt` | UTC ISO-8601 时间；用于新鲜度判断 |
| `tool` | 命令、脚本路径、版本、Node/PHP/Python、OS、浏览器及配置摘要 |
| `exitCode`、`outputArtifact`、`outputSha256` | 退出码、完整报告位置及摘要；日志截断必须声明 |
| `reviewMethod`、`reviewedByRole` | 自动/人工/AI-assisted；角色，不夸大为母语或人工认证 |
| `sourceReferences` | 事实来源、review record、base/head diff 或相关控制证据 |
| `unknownReason` | UNKNOWN 必填；说明缺什么、下一步和责任人 |
| `findings` | 每项 finding 的 ID、P0-P3、路径、期望、实际、动作和 owner |
| `exceptionId` | 有例外时引用；例外不改变原 result |
| `authorizationRef` | 涉及生产、真实询盘、邮件或外部提交时的授权依据 |
| `containsPersonalData`、`redactions` | 隐私数据声明和脱敏说明；凭据永不写入证据 |
| `wroteFiles` | 是否写文件及精确列表；verify 模式应为 false |

总体 manifest 还必须记录：预期 control 集合、实际 control 集合、缺失/重复 control、各状态数量、最终阶段状态及作出发布/阻断/回滚决定的角色。

证据保留期：GitHub Actions 中的原始自动化 artifact 至少 90 天；release 决策摘要、manifest digest、P0/P1 finding/处置和真实询盘验证的脱敏关联证据，应另存于受控长期记录并至少保留 12 个月；P2/P3 与周期性观测至少保留 90 天。隐私数据按最小化原则保存，能保留关联 ID 和摘要时不得保留客户正文或附件。

## 9. 例外与技术债务

例外只改变临时处置，不改变事实状态：FAIL 仍是 FAIL，UNKNOWN 仍是 UNKNOWN，绝不能通过修改记录写成 PASS。

| 范围 | 是否允许 | 最长期限 | 条件 |
| --- | --- | --- | --- |
| P0 | 不允许 | 0 | 必须阻断或回滚并处置 |
| P1 | 仅允许隔离，不允许把暴露中的失败功能随 release 发布 | 24 小时且仅限一个精确 release | 受影响路径/语言/功能已从公开 release 物理隔离；site owner 批准；有回滚与修复计划 |
| P2 | 允许 | 30 天 | 明确用户影响、owner、修复期限和升级条件 |
| P3 | 允许 | 90 天 | 记录价值与是否继续投入；到期可重新评估 |

例外记录必须包含 `exceptionId`、原 result、严重级别、精确路径/语言/制品哈希、理由、风险、补偿控制、批准人、`approvedAt`、`expiresAt`、修复 owner、验证计划和回滚条件。

以下事项不得例外：敏感信息或凭据暴露、制品完整性未知、恶意下载、错误关键产品事实、询盘错投/泄露、全站意外 noindex/robots 禁止、未知生产 release 身份，以及把未验证的邮箱送达写成 PASS。

例外到期自动失效；后续 release 不继承。续期必须重新取证和批准，不能只修改时间戳。

## 10. 当前实现映射与迁移原则

当前已经落地的门禁入口包括：

- 统一控制与证据：[`audit/policy/release-audit-v2.json`](../../audit/policy/release-audit-v2.json)、[`scripts/verify-audit-policy.mjs`](../../scripts/verify-audit-policy.mjs) 和 [`scripts/run-release-audit.mjs`](../../scripts/run-release-audit.mjs)。编排器当前产物明确标记为 `automated-gates-only`、`releaseDecisionEligible: false`，它是候选制品证据，不得冒充最终发布决定；production workflow 另用 [`scripts/verify-release-authorization.mjs`](../../scripts/verify-release-authorization.mjs) 把受保护的人工授权/询盘适用性证据绑定到精确候选 SHA；
- PR：[`package.json`](../../package.json) 的 `quality:pr` 和 [`.github/workflows/pr-quality.yml`](../../.github/workflows/pr-quality.yml)，并比较 Windows/Linux 构建的 release manifest digest；
- release：`deploy:prepare`、[`audit/policy/release-html-inventory.json`](../../audit/policy/release-html-inventory.json)、[`audit/policy/public-directory-inventory.json`](../../audit/policy/public-directory-inventory.json)、[`scripts/build-production-release.mjs`](../../scripts/build-production-release.mjs) 和 [`scripts/validate-deployment.mjs`](../../scripts/validate-deployment.mjs)；HTML 与非 HTML 公共文件均须先进入版本化 exact inventory，同扩展但未声明的文件也会阻断；
- 部署事务：[`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) 与 [`ops/`](../../ops/)；
- 公网边界：[`ops/verify-public-deployment.sh`](../../ops/verify-public-deployment.sh) 的精确首页、robots 与 sitemap 字节摘要及 HTTP/TLS/header 检查；最终域名真实浏览器矩阵还会逐页比对代表性多语言 HTML 与同一份已审核 production artifact 的 SHA-256；
- 本地化审核：[`scripts/verify-editorial-release-status.mjs`](../../scripts/verify-editorial-release-status.mjs) 与 [`scripts/refresh-reviewed-localized-artifacts.mjs`](../../scripts/refresh-reviewed-localized-artifacts.mjs)；
- 浏览器与性能：[`scripts/verify-localized-render-qa.mjs`](../../scripts/verify-localized-render-qa.mjs)、[`scripts/verify-release-experience.mjs`](../../scripts/verify-release-experience.mjs)、[`scripts/verify-lighthouse-performance.mjs`](../../scripts/verify-lighthouse-performance.mjs)；
- 下载：[`scripts/verify-release-links-and-downloads.mjs`](../../scripts/verify-release-links-and-downloads.mjs)、PDF active-content 安全检查与 STEP 结构自测；
- 审核器负向样例：release boundary、STEP、PDF、公网 HTTP header/parser、release authorization 与结构化 GitHub Actions workflow contract 的离线 fixtures；工作流中的注释或 `echo 'npm run …'` 不再能冒充真实门禁。

尚未自动化或需要外部系统授权的范围：

1. `INQ-SMTP` 和 `INQ-DELIVERY` 仍需单独授权的真实请求与收件证据；现有端点检查和 release authorization 引用绑定均不得代替它们，未复核外部记录时保持 UNKNOWN；
2. Search Console、24 小时/7 天生产观测和真实流量 CWV 仍需对应账号与时间窗口；未取得证据时保持 UNKNOWN；
3. GitHub 分支保护、production environment 审批和长期证据存储属于仓库/平台设置，必须由有权限人员核对，源码规则不能假装它们已经启用；
4. 每次新增或修改 P0/P1 verifier，都必须同步补正向、负向和 bypass fixture，并让控制清单与实际阶段调用保持一致。

本标准不把“存在脚本”“CI 配置看起来正确”或“历史上通过”当作当前 release 的 PASS。无法自动产生的证据必须由受控人工步骤记录为 PASS/FAIL/UNKNOWN；没有执行就写 UNKNOWN。
