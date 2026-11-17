# 搜索曝光修复记录 — 2026-09-18

## 后续进展：采购选型入口

本轮在五语言 products.html 增加多通路、通孔、气电组合选型入口，以及激光切管、CNC 气动夹持、瓶盖旋紧三个应用链接。相关翻译来源、五语言搜索索引和 sitemap 已同步；手机及桌面验证通过。改动仍未部署。

详见 ../localization/2026-09-18-catalog-selection-review.md。发布限制已进一步定位：本地主目录 HEAD 比现有远程跟踪引用落后 17 个提交；远程跟踪版本已有 57 页审核范围，但本地主目录仍使用 56 页旧快照，且后来的共享页脚改动未合并到审核证据链。本次保留现有修改和受保护审核记录，没有简单修改计数或声称全站通过。

## 当前目标
优先吸引有旋转接头采购、选型和设备集成需求的搜索访问。用户说明日本点击大部分来自本人，因此此前“日文增长代表市场信号”的判断撤回；不据此扩大日文内容产量。用户随后明确要求停止纠结自有访问过滤，集中提高相关曝光。

## 已在线完成
- Google Search Console：PTFE 涂层 O 形圈英文文章原显示“Google 无法识别此网址”。
- 2026-09-18 20:12（界面时间）Google 实时检查显示“网址可编入 Google 索引”。
- 请求编入索引后，界面显示“已请求编入索引”，网址加入优先抓取队列。请求成功不等于已经收录，也不保证排名。
- GA4 begapunk.com（property 509203047）：近期事件中已存在 generate_lead、whatsapp_click、quote_request_start、contact_form_attempt。generate_lead 原未标记为关键事件，本次已标记并确认勾选状态。
- GA4 Internal Traffic 过滤器原已处于测试模式。本次没有修改过滤器，也没有填写/收集办公公网 IP。按用户最新指示停止该方向。
- 未做真实询盘提交、邮箱送达测试，也未付费订阅、连接额外 Analytics OAuth 权限或改动广告账户。

## 主目录内容修改（尚未部署）
正式源码：E:\begapunk-site-v2

1. blog-rotary-joint-leaking.html
   - 保留此前已审校的五步故障排查标题和五步结构。
   - 导语直接描述读者能完成的诊断。
   - 增加密封类型、安装指南的正文链接，保留相关型号链接。
   - 联系提示先收集型号、照片和泄漏时机，工况有则补充。
2. blog-rotary-union-seal-types.html
   - 新增 PTFE 涂层 O 形圈与动态 PTFE 密封元件的区别说明。
   - 正文链接到 PTFE 文章及泄漏排查文章。
   - 保留可选配置边界，不写成全系列标准配置；不改既有型号额定参数。
3. application-textile-printing-converting.html
   - title/OG/Twitter 标题统一为 Rotary Unions for Printing Machinery | Begapunk。
   - 更新摘要，使印刷设备选型与气动产品比较的目的明确。
   - 用媒体/流路、压力/速度、装配、环境四项输入替代没有型号绑定的“典型参数”区块，避免让 2,000 RPM 等机器工况示例被误读为产品额定值。
   - 将 BP-2P-30-0001 明确为气动选型起点，真空/冷却回路分别评估。
4. 配套更新
   - 仅英文 search-index.json 随三页正文刷新。
   - sitemap.xml、sitemap-i18n.xml 和 lastmod 状态仅变更三篇英文页面的日期/指纹。
   - 刷新英文 source-catalog；标准提取器同步清理了四语言缓存中的孤立条目。
   - 为 13 条新增受管英文字符串补齐德/法/日/俄翻译覆盖（AI 辅助审校），存入既有 overrides。没有批量重建或覆盖其他语言 HTML。
   - 没有修改产品规格、询盘后端、SMTP 或生产服务器。

## 修改前的本地文件指纹
- blog-rotary-joint-leaking.html: e4b224d71208a58b78de7572bb5cfbad86dc19f4acda95b0458191b57d0a3e76
- blog-rotary-union-seal-types.html: 09cdd48e32a673adf73b8b7adf8e3bb55152d4b6adcd21c033a2684e6e0374c9
- application-textile-printing-converting.html: 7a2be50ab30b3edcf9191c1d40e3e9f4d3fac3524892ff488cf391beee4e001e

上述指纹属于本次修改前的主目录文件，不是 Git HEAD，也不是线上版本。主目录开始时已有大量未提交修改；本次没有 reset、stash、提交或推送。

## 验收
PASS：
- inquiry:verify：2150 项询盘合同检查 + 99 项统计/Consent Mode 检查（没有对外提交）。
- 五语言泄漏文章标题一致性与 PTFE 文章检查：25 项测试。
- copy:regressions:verify：228 项定向页面检查。
- quality:source：语义结构、隐私/统计、JSON-LD、本地依赖等检查。
- search:verify：5 语言索引与当前 HTML 一致。
- i18n:catalog:verify：1723 条字符串、47 个受管英文页一致。
- i18n:sitemap:verify：270 个内容指纹支持的条目一致。
- 三页的 32 个本地正文链接存在；改动文件 git diff --check 无空白错误。
- 浏览器实际点击密封文章新增链接，到达 PTFE 文章。
- 印刷应用页桌面及 390 px 宽度预览：新选型清单可读，无内容裁切；预览完成后恢复浏览器尺寸。浏览器自身会自动翻译部分内容，源 HTML 英文已另行核对。

未完全通过：
- i18n:verify 仍有 1 项既有页面范围记录不一致：config.pages=57，editorial reviewedArtifactSnapshot.pagesPerLanguage=56（47 受管 + 9 手工的旧记录）。
- 新增内容引起的四语言各 13 条缺失翻译已补齐；复跑后只剩上述 1 项。
- 不修改受保护的审核基线、不伪造全站审核通过。正式部署前需要核对原有页面登记与审核记录。
- 未运行或声称整个生产发布门禁通过；本轮为主目录内容准备和已授权的 Google/GA4 设置操作。

## 商业解释与后续验收
这轮修复提高页面可发现性、主题关联及选型清晰度，不承诺曝光量或业务增长。Google 数据中几十次点击不足以证明获客规模。
后续应围绕已确认产品能力组织核心采购词、产品类目与行业应用页面，优先采购/集成意图；PTFE 文章作为密封工艺佐证，不作为扩大泛 O 形圈流量的独立业务方向。
发布并重新抓取后，按完整 28 天窗口比较相关查询展示、非品牌搜索入口和真实询盘。不把人工测试点击计作获客成果，不将 GA4 按钮点击等同邮件送达。


## 2026-09-18 主目录对齐与发布准备（取代上文旧的登记阻塞状态）

- 主目录仍为 E:/begapunk-site-v2。已获取并核对 origin/main，将本地基线从 3f215df 对齐到 75f86dc7b7e2faea78f6814496208e67fc00ee85。对应 GitHub 成功部署运行 34965112008；未通过服务器 SSH 独立核对 current 指向，不把工作流成功等同于新的服务器现场核验。
- 所有既有文件先保存到主仓库 .git 内的恢复包，再逐项对齐；未新建项目目录，未创建新提交、推送或部署。真实索引未暂存任何文件。
- 原 56/57 审核范围问题已通过可信基线对齐解决。228 个外语页面的变更按实际差异复核；绝大部分只有公共页脚变化，16 页另含已记录的标题/相关链接或选型卡片变化。通过正式 snapshot refresh 更新记录，没有手工增加页面数或伪造母语审校。
- 合并造成的四语言 PTFE 搜索索引和 llms 重复项已去重；285 页五语言校验、元数据、源目录和 sitemap 指纹检查通过。
- 新页脚、手机折叠、五语言选型卡片、英文三页曝光优化和先前五步排查标题修复均保留。

### 已完成验证

- 本机完整 deploy:prepare 执行 59 项门禁，全部可执行门禁 PASS。总体报告仍为 UNKNOWN，因为 deploy:verifier:verify 必须在正式 Ubuntu CI 环境执行；不是生产发布授权。
- 570 组手机/桌面检查通过，含 600 次真实语言选择、560 次询价链接点击、570 次首页链接及 570 次 Logo 点击。10 次提交按钮检查仅检查可见性，没有提交表单。
- 本地文件导航：285 页、300 次语言选择、285 次询价链接/首页/Logo 点击通过。
- 294 个 HTML、15,169 处内部链接、34 个 PDF/STEP 下载和 789 个发布文件通过可用性、完整性与发布边界检查。
- 789 个发布文件与拟提交 Git 树逐一比较一致；文本仅归一化 CRLF/LF，二进制逐字节一致。发布包 .htaccess 与基线相同。
- 五语言 390px 手机页脚初始均为四组关闭且无横向溢出；英语/德语点击第一组仅展开该组，英语手机菜单开关正常。1440px 桌面重新加载后四组均展开。临时浏览器尺寸已恢复。
- 定向泄漏标题检查 10 项通过。额外旧 bing-title-remediation 混合测试中，5 个标题/分享检查通过，1 个已延期 PDF 跳转断言在基线路由下失败；此历史测试连同对应路由改动保留在主目录、排除本候选，未改测试使其虚假通过。
- git diff --check 通过。完整机器记录在 dist/audit/release-audit-report.json 和 dist/audit/release-navigation.json。

### 候选范围与仍需完成的上线步骤

候选仅包含这批内容、页脚及其生成器/索引/审校证据。独立清单和精确补丁保存在主仓库 .git/codex-candidate-20260918.json 与 .git/codex-candidate-20260918.patch；不是新提交，也不是部署批准。

以下原有文件已逐字节恢复并保留在主目录，但未进入拟提交候选及此次发布包：.htaccess、ops/install-nginx-managed-redirects.sh、ops/nginx-managed-redirects.conf、ops/verify-public-deployment.sh。与该旧跳转耦合的 tests/bing-title-remediation.test.mjs 也不在本候选中。不要直接对当前主目录执行无差别暂存/发布。

目前未上线。尚待：用户明确允许提交/推送；正式 Ubuntu CI；服务器当前版本与回滚目标预检；针对确切提交和清单的发布批准。

真实询盘送达证据仍为 UNKNOWN。虽然表单及后端未改，五个 contact.html 的公共页脚改变会触发现有路径规则，不能将适用性写成 not-applicable。需另获授权后完成受控真实提交、服务商接收和收件箱到达核验。未发送邮件或提交真实询盘。

本轮是版本整合及发布准备，不是曝光增长结果。上线并重新抓取后，再按完整 28 天窗口检查相关非品牌查询、采购入口及真实有效询盘。
