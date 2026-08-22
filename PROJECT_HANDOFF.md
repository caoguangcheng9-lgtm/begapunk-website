# Begapunk Website Project Handoff

状态：当前项目恢复入口
更新日期：2026-08-22

本文件只保存稳定的项目位置、技术合同和恢复顺序。商业目标、内容规则、严重级别和上线验收以 docs/standards/README.md 与 docs/standards/BEGAPUNK_WEBSITE_STANDARD.md 为准。

日期、commit、分支、页面数量、测试次数和部署状态都会变化。开始任务时必须读取实时 Git 和文件状态，不能把历史报告或本文件中的旧快照当成当前事实。

## 1. 项目位置

- 正式网站源码：E:\begapunk-site-v2
- 生产网站：https://www.begapunk.com/
- GitHub：caoguangcheng9-lgtm/begapunk-website
- 一键部署脚本：E:\begapunk-site-v2\deploy.ps1
- CRM 源码：E:\BEGAPUNK-CRM
- 独立目录产品目录项目：E:\begapunk-catalog-project
- 仓库内 catalog-project/：受保护的现有工作，不得自动清理、移动、暂存或删除

E:\begapunk-site-v2 是网站唯一正式源码。备份、发布包、审计报告和外部目录不能替代它。

## 2. 每次任务开始

1. 阅读 docs/standards/README.md 和与任务相关的主标准章节。
2. 检查实时 Git 分支、最新 commit、远程跟踪和工作区状态。
3. 区分已有用户修改与本次授权范围。
4. 只读取与当前任务相关的操作手册或历史证据。
5. 明确本阶段允许修改的文件、禁止操作和完成条件。

工作区可能长期包含大量未提交内容。不得使用 reset --hard、checkout .、clean，不能自动 stash，也不能覆盖、回退或删除来源不明的修改。

## 3. 文件职责

| 位置 | 职责 |
| --- | --- |
| docs/standards/ | 当前有效规则、验收和可选协作流程 |
| PROJECT_HANDOFF.md | 当前恢复入口和稳定技术合同 |
| DEPLOYMENT.md | 部署机制操作说明 |
| i18n/README.md | 多语言生成与验证操作说明 |
| docs/reference/ | 技术数据模型和实现参考，不定义公开文案或严重级别 |
| audit/ | 日期化检查、发布和历史证据，不定义当前规则 |

不要把 audit 报告中的建议、分数、P0/P1 标签或“下一步”直接继承到新任务。必须按当前主标准重新判断。

## 4. 产品与多语言合同

- 产品事实优先使用已确认且型号匹配的图纸或对应领域的一手资料。
- 客户页面直接陈述确认事实，不展示内部 QC、图签匹配、证据等级或审核状态。
- 英文是主要内容母版，明确受控的人工本地化页面除外。
- 德文、日文、俄文必须保持关键事实和询盘含义一致，但可以按照当地阅读习惯自然表达。
- i18n/config.json 是当前页面和语言范围的实时配置；不要在文档中维护容易过期的固定页面数量。
- 通用多语言写入模式必须使用仓库外的 I18N_OUTPUT_ROOT。不要用通用 i18n:build 覆盖当前已审校页面。
- 发布准备使用只读验证路径；历史页面数量和旧审校次数只是证据快照。

## 5. Contact/RFQ 稳定合同

- 公共页面：/contact.html
- 后端：/send_inquiry.php
- 方法：POST
- 编码：multipart/form-data
- 最大附件：10 MB
- 支持 PDF、STEP/STP、IGES/IGS、DWG、DXF、JPG/JPEG、PNG
- 反垃圾字段：honeypot

后端依赖的字段名包括：

fullname、email、company、country、product、quantity、application、requirements、inquiry_type、source_model、source_product、source_page、source_url、source_language、drawing、honeypot。

修改字段名、PHP、SMTP、收件人或邮件服务器配置时，必须协调检查前后端合同。GET /send_inquiry.php 返回 405 只能证明端点存在，不能证明邮件送达。真实表单和邮箱送达测试需要单独授权。

不得在仓库、文档、聊天、截图或日志中记录 SMTP 密码、Token、Cookie、私钥、.env 内容或其他凭据。

## 6. 发布与服务器边界

- deploy.ps1 是保留的一键发布入口，不得作为普通清理对象删除。
- 本地综合发布检查入口是 npm run deploy:prepare。
- 修改文件不包含提交；提交不包含推送；推送或合并不包含部署。
- 部署和服务器操作必须针对明确版本及明确范围单独授权。
- 部署前确认版本、变更文件、发布包、生产备份和回滚路径。
- 真实服务器目录、PHP/Nginx 状态和当前生效版本必须现场确认；历史审计中的服务器路径不能替代实时检查。
- 生产 .env、PHPMailer、.well-known 和其他运行时专属内容不得被本地发布包意外覆盖。

## 7. 历史资料

旧交接全文已保存在：

audit/legacy/2026-08-22-PROJECT_HANDOFF-pre-consolidation.md

旧网站审计报告已保存在：

audit/legacy/2026-07-27-WEBSITE-AUDIT-REPORT.md

它们用于追溯过去做过什么，不用于决定当前优先级、验收结论或下一步。

## 8. 恢复顺序

1. 进入 E:\begapunk-site-v2。
2. 阅读 docs/standards/README.md。
3. 检查实时 Git 状态和当前任务涉及的文件差异。
4. 阅读本文件中的相关稳定合同。
5. 需要操作时再读取 DEPLOYMENT.md、i18n/README.md 或对应 audit 证据。
6. 完成已授权目标后停止并汇报。

本项目没有跨任务自动延续的“下一项工作”。每次只以用户当前明确请求作为任务入口。
