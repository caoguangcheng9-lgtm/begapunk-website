# 2026-09-05 本地化审核快照 schema 迁移记录

migratedAt: `2026-09-05T02:11:33+09:00`
migratedByRole: `Codex localization audit-schema maintainer`
migrationType: `editorial-snapshot-schema-v1-to-v2`
semanticReviewPerformed: `false`
nativeSpeakerReviewPerformed: `false`
sourceReviewClaimsPreserved: `true`

## 迁移目的

旧 `current-localized-artifacts.json` 只保存一个名为 `sha256-bytes-v1` 的整页哈希，实际实现还会先统一 LF。它不能区分文案、SEO 或结构化数据变化与缓存键、排版和跨平台换行变化。本次仅把已有的精确制品封印迁移为两个用途明确的快照：

- `sha256-semantic-html-v1`：最终 HTML 的受控语义投影，包括正文文本单元、可翻译属性、局部语言/方向、标题与编辑型 meta、canonical/hreflang、导航目标、媒体与外链脚本/样式表身份、class/inline style/inline stylesheet、JSON-LD、保留 DOM 关联的声明式运行时 JSON，以及可能写入用户可见内容的内联脚本；
- `sha256-lf-text-v1`：把 CRLF 和孤立 CR 统一为 LF 后的完整 HTML 文本哈希。

## 迁移证据

- 迁移范围为 `i18n/config.json` 中 4 个 active language、每种语言 56 页，共 224 个既有本地化 HTML 制品。
- 写入新 schema 前，逐页重新计算 LF 规范化机械哈希，并与旧 manifest 的 224 个哈希逐项相等比较；任一不符均拒绝迁移。
- 新的语义哈希由上述已被旧 manifest 精确封印的同一份 HTML 派生，没有编辑页面，也没有以 schema 更新替代语言审核。
- 原 `status.json` 中各语言的 reviewed 状态、SEO/GEO 数量、render-QA 状态、`updatedAt` 和历史审核记录保持原样。
- 新 manifest 为每个 artifact 分别保存语义与机械来源；以后 mechanical-only 更新必须先证明语义哈希未变，并保留原语义来源。
- 迁移记录、旧审核记录及以后逐项 provenance 都保存 LF 稳定的记录摘要；记录字段必须唯一、位于顶层且结构化，事后改写会使 verifier 失败。
- 后续语义或机械刷新必须记录每页精确的 before/after 哈希与可信 manifest 时间；PR/release verifier 还必须从 CI 提供的受保护 Git 基线复核这些 transition，不能把待审核分支的当前 HEAD 当作信任根。

## 声明边界

本记录不是新的逐句审核、目标市场复核、母语复核、人工编辑批准或法律审核，也不扩大历史记录的结论。它只证明 schema 迁移发生在旧机械封印仍与当前文件一致的前提下。共享外部 JavaScript、CSS 生成文本及其独立审核仍由相应源码和浏览器门禁负责，不能用本 HTML 快照替代。

unresolvedIssues: `No new localization issue was assessed in this schema-only migration. Existing review boundaries and any separately recorded debt remain unchanged.`
