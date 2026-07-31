# Aida-Codex 人工中继协作运行模型

版本：1.0

适用仓库：`caoguangcheng9-lgtm/begapunk-website`

权威记录：GitHub Issue、Pull Request、CI 结果和精确 Git commit

中继人：老曹

## 1. 目标

这套模型用于解决 Aida 与 Codex 不能直接、可靠地互相传递上下文的问题，同时防止同一 GitHub 账号下的角色混淆。

- Aida 负责分析、提出任务和独立审核。
- Codex 负责实现、测试和提供可复核证据。
- 老曹负责在两者之间原样中继信息，并独立决定是否合并、是否部署。
- GitHub 保存任务、代码、审核结论、CI 和所有者授权的审计轨迹。

角色标题是审计标记，不是 GitHub 原生身份验证。任何人都不能仅凭评论标题声称另一角色已完成审核或授权。

## 2. 不可突破的边界

1. 不在聊天、Issue、PR、日志或仓库中传递密码、Token、SMTP 授权码、Cookie、私钥或 `.env` 内容。
2. Aida 的审核结论必须绑定完整 commit SHA；该 commit 后新增任何提交都会使原结论失效。
3. `Result: CHANGES_REQUIRED` 阻止合并。
4. `Result: PASS` 仅表示通过审核，不等于允许合并或部署。
5. 合并必须有老曹针对具体 PR 的明确授权。
6. 部署必须有老曹针对具体 commit 的另一条明确授权；合并授权不包含部署授权。
7. Codex 不得自行合并、自行部署或扩大任务范围。
8. 一次只执行一个满足入口条件的任务；存在业务决策、证据缺失或阻塞时停止实施并交还老曹。
9. 生产故障之外不得跳过审核。紧急绕行必须记录原因、范围、回滚方案和事后复审。

## 3. 单一事实来源

每项工作使用一个 GitHub Issue 作为任务主记录，一个 Pull Request 作为实现主记录：

- Issue 保存目标、范围、验收标准、限制和业务决策。
- 分支保存实现过程。
- PR 保存 Codex 交付、CI、Aida 审核和老曹决定。
- commit SHA 标识被审核和被授权的唯一代码状态。
- 生产部署记录标识实际上线的 commit；不能由 PR 合并状态推断。

聊天内容只有在被原样中继到相应 Issue 或 PR 后，才进入正式审计记录。

## 4. 角色与权限

| 活动 | Aida | Codex | 老曹 |
| --- | --- | --- | --- |
| 发现问题和分析风险 | 负责 | 可补充证据 | 确认商业优先级 |
| 定义验收标准 | 负责 | 检查可执行性 | 解决业务取舍 |
| 修改代码 | 不执行 | 负责 | 不要求亲自操作 |
| 本地验证和 CI 修复 | 独立复核 | 负责 | 接收结果 |
| 最终代码审核 | 负责 | 回应问题 | 中继完整结论 |
| 合并 PR | 不授权 | 不自行执行 | 唯一授权人 |
| 部署生产 | 可给风险建议 | 获授权后执行 | 唯一授权人 |
| 紧急绕行 | 事后复审 | 最小范围实施 | 明确批准 |

## 5. 任务状态机

建议标签：

- `source:aida`
- `owner:codex`
- `status:ready-for-codex`
- `status:in-progress`
- `status:awaiting-aida-review`
- `status:changes-required`
- `status:ready-for-owner`
- `status:done`
- `needs:laocao-decision`
- `blocked`

正常流转：

```text
Draft
  -> ready-for-codex
  -> in-progress
  -> awaiting-aida-review
  -> changes-required -> in-progress
  -> ready-for-owner
  -> merged
  -> deployment decision
  -> done
```

Codex 的自动或人工任务入口必须同时满足：

- `source:aida`
- `owner:codex`
- `status:ready-for-codex`
- 不含 `blocked`
- 不含 `needs:laocao-decision`
- 目标、范围和验收标准完整

不满足任一条件时不得猜测，不得静默扩大范围。

## 6. 标准运行循环

### 阶段 A：Aida 定义任务

1. Aida 给出目标、理由、范围、禁止项、验收标准和风险。
2. 老曹使用 Aida-Codex Task Issue 模板原样登记，不总结掉限制条件。
3. 老曹解决需要商业判断的事项后，设置任务入口标签。

### 阶段 B：Codex 实施

1. 核对 Issue、仓库、分支、工作区和已有用户修改。
2. 从最新 `main` 建立独立分支。
3. 只实施 Issue 范围，保留用户未跟踪或无关修改。
4. 运行与风险相称的本地验证。
5. 提供 `## CODEX DELIVERY`，列出精确 commit、文件、验证、风险和部署状态。
6. 未经允许不得把“修复完成”扩展为合并或部署。

### 阶段 C：老曹中继给 Aida

老曹向 Aida 提供：

- Issue 链接
- PR 链接
- 待审核的完整 commit SHA
- `CODEX DELIVERY`
- CI 结果
- 尚未解决的风险

不得只说“Codex 已做好”，因为这不足以形成可审核输入。

### 阶段 D：Aida 审核

Aida 使用固定模板输出：

- `Reviewed commit`
- `Result: PASS` 或 `Result: CHANGES_REQUIRED`
- 发现、必改项、剩余风险
- 对合并/部署的建议

若为 `CHANGES_REQUIRED`，Codex 修复后必须提交新的 SHA，并重新走完整审核。旧结论不能继承。

### 阶段 E：老曹决策

当且仅当以下条件全部满足时，Codex可报告“可以合并”：

- Aida 对当前 PR 最新 head SHA 给出 `PASS`
- CI 全部通过
- 没有未解决审核线程
- 没有 `blocked` 或 `needs:laocao-decision`
- 变更范围与 Issue 一致

老曹随后使用 `## LAOCAO DECISION` 明确决定是否合并。部署需要在合并后另行决定。

## 7. 人工中继消息规范

中继时保留以下字段，不自行改写结论：

```text
Source role:
Relayed by: Lao Cao
Repository:
Issue/PR:
Commit:
Timestamp:
Original content:
```

若内容很长，可以附链接，但目标、Result、commit 和阻塞项必须原样保留。

## 8. 决策闸门

### 合并闸门

- PR 为 Open 且可合并。
- PR head 与 Aida 审核的 SHA 完全相同。
- 必需 CI 全部成功。
- Aida 最新结论为 `PASS`。
- 老曹明确写出 `Action: MERGE PR #<number>`。

### 部署闸门

- 被部署 commit 已在 `main`。
- 发布前验证通过。
- 回滚路径可用。
- 老曹明确写出 `Action: DEPLOY COMMIT <sha>`。
- 部署后健康检查和记录完成。

### 紧急绕行

只有正在发生的生产故障可以使用。老曹必须写出 `Action: EMERGENCY OVERRIDE`，并包含：

- 故障影响
- 最小修复范围
- 为什么不能等待常规审核
- 回滚方案
- 事后 Aida 复审截止时间

## 9. 失败处理

- 信息不完整：添加 `needs:laocao-decision`，不实施。
- 技术阻塞：添加 `blocked`，记录已验证证据和下一步。
- CI 失败：Codex只修复与当前任务相关的问题。
- Aida 要求变更：回到实施阶段，生成新 SHA，重新审核。
- 合并后健康检查失败：不得自动掩盖；按部署系统回滚并记录。
- 中继内容与 GitHub 记录冲突：以精确 SHA、CI 和 GitHub 时间线为准，并由老曹重新确认。

## 10. 成功指标

每月检查：

- 未经 Aida `PASS` 合并数量：`0`
- 未经老曹明确授权合并数量：`0`
- 合并授权被误用于部署数量：`0`
- 审核 SHA 与最终 PR head 不一致数量：`0`
- 任务因范围不清返工比例
- 从 `ready-for-codex` 到 `ready-for-owner` 的中位时间
- 部署回滚次数和原因

速度不是第一目标。模型的首要目标是让每个关键决定可验证、可追溯、可回滚。

## 11. 首次启用清单

1. Aida 审核本文件和三个模板。
2. Codex根据审核意见修订。
3. 老曹批准后合并治理 PR。
4. 在 GitHub 创建第 5 节列出的标签，禁止选择无关仓库或扩大 App 权限。
5. 使用一个低风险文档任务试运行完整闭环。
6. 试运行通过后，才将该模型用于代码和部署任务。
