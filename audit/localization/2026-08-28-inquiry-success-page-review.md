# 2026-08-28 询盘成功跳转与确认页四语审核

日期：2026-08-28（Asia/Tokyo）

- reviewedAt: `2026-08-28T15:09:39+09:00`
- reviewedByRole: `Codex AI-assisted industrial buyer-journey and localization reviewer`
- reviewMethod: `owner-supplied operating facts plus line-by-line EN/DE/JA/RU conversion-copy review`
- independentNativeSpeakerReview: `not performed`
- humanEditorialSignOff: `final wording and same-team WhatsApp handling were supplied or accepted by the site owner; deployment remains separately authorized`
- unresolvedIssues: `no known wording or layout blocker in the changed inquiry-success scope`

## 审核范围

- submission pages: `contact.html`, `de/contact.html`, `ja/contact.html`, `ru/contact.html`
- confirmation pages: `thank-you.html`, `de/thank-you.html`, `ja/thank-you.html`, `ru/thank-you.html`
- supporting contracts: `scripts/verify-inquiry-contract.mjs`, `scripts/sync-site-navigation.mjs`, `scripts/verify-localized-site.mjs`, `scripts/verify-copy-regressions.mjs`
- languages: `en`, `de`, `ja`, `ru`

成功路径统一为：服务器明确返回 `success: true` 后触发已有成功事件，再整页进入对应语言的 `thank-you.html`。失败、无效响应和网络异常继续停留在表单并显示错误；无 JavaScript 时仍由 PHP 根据 `source_language` 返回对应语言的 303 跳转。

## 目标市场参考来源

- 以欧美工业品采购者提交图纸或型号后的确认需求为判断基线：换页比清空表单后显示一行提示更容易让客户确认“已经提交”。
- 成功页不再次要求完整工况，也不引导客户重复填写表单；WhatsApp 仅作为补发照片或图纸的可选入口。
- 用户明确提出 WhatsApp 由同一团队处理，因此四语均保留“同一团队回复”的含义；该事实如以后改变，必须同步删除。
- 回复时限沿用网站已确认的服务边界，但使用 `normally / in der Regel / 通常 / обычно`，避免把正常回复目标扩大成无条件 SLA。

## 术语决定

- `inquiry received` 分别采用德语 `Anfrage ist ... eingegangen`、日语 `お問い合わせを受け付けました`、俄语 `Мы получили ваш запрос`，表达明确收到而不暗示报价已经完成。
- `same team` 按各市场自然表达，不使用销售部门或内部转交术语。
- 隐私徽章保留完整窄边界：询盘和图纸不用于营销或公开展示；不扩展为绝对保密、数据安全或不与履约相关人员共享的承诺。
- 页脚询盘按钮在成功页移除。Logo 已提供首页入口，无需再增加重复的 `Back to Home` 链接。

## 搜索意图决定

- 成功页继续保持 `noindex, nofollow`，不承担自然搜索获客任务。
- meta、Open Graph 和 Twitter 描述只确认收到询盘、通常一个工作日内回复及只询问必要缺失信息，不承诺每次都会同时提供报价、交期和 CAD。
- 固定确认页 URL 可辅助漏斗核对，但页面可被直接访问或刷新，不能单独作为邮件送达或真实询盘的证明；已有服务器成功事件仍是更严格的客户端转化信号。

## 审核边界

本记录不声称独立母语审校，也不证明生产服务器或邮箱已收到询盘。本轮没有发送 HTTP POST、没有执行真实 PHP 邮件流程、没有提交真实询盘，也没有提交、推送或部署网站。
