# 2026-08-28 Contact/RFQ 暖语气与回复预期审核

日期：2026-08-28（Asia/Tokyo）

- reviewedAt: `2026-08-28T10:36:56+09:00`
- reviewedByRole: `Codex AI-assisted industrial buyer-journey and localization reviewer`
- reviewMethod: `owner-confirmed business facts plus line-by-line EN/DE/JA/RU buyer-facing localization review`
- independentNativeSpeakerReview: `not performed`
- humanEditorialSignOff: `business facts confirmed by site owner; final visual wording remains available for owner review before deployment`
- unresolvedIssues: `no known wording blocker in the changed Contact/RFQ and submission-success scope`

## 审核范围

- pages: `contact.html`, `de/contact.html`, `ja/contact.html`, `ru/contact.html`, `thank-you.html`, `de/thank-you.html`, `ja/thank-you.html`, `ru/thank-you.html`
- supporting contracts: `i18n/manual/contact-rfq-copy.json`, `send_inquiry.php`
- languages: `en`, `de`, `ja`, `ru`
- owner-confirmed facts: `engineer review`, `normal reply within one business day`, `inquiries and drawings are not used for marketing or public display`

本次把客户沟通改为“先把已有信息发来，缺什么我们只问必要的一项”，同时明确由工程师查看、通常一个工作日内回复，并说明不会把客户询盘或图纸用于营销或公开展示。保留 `Start Quote`、`Send Request` 等清晰动作，不把主按钮弱化为模糊的流程词。

## 目标市场参考来源

- 以欧美工业品采购的首轮询盘习惯为判断基线：允许型号、照片、图纸或已知工况中的任意一种作为起点，不要求客户先完成一份完整技术规格书。
- 德语使用 `Arbeitstag` 而非可能包含星期六的 `Werktag`，避免回复时限理解偏差。
- 日语使用 `技術担当者が確認`，避免 `審査` 等资格审查或认证语感；俄语避免 `экспертиза` 等正式鉴定语气。
- 回复与资料使用事实均由网站所有者在 2026-08-28 明确确认，不由翻译人员推断。

## 术语决定

- `Quote & application review` 本地化为更自然的市场表达：德语 `Angebot & technische Abstimmung`、日语 `お見積りと製品選定`、俄语 `Расчёт стоимости и подбор решения`。
- `engineers` 在日语中使用工业企业常见的 `技術担当者`，不暗示执业资格；德语和俄语分别使用 `Ingenieure`、`инженеры`。
- `one business day` 分别表达为 `eines Arbeitstags`、`1営業日以内`、`одного рабочего дня`，均保留“通常/一般”的真实服务边界。
- 资料使用承诺限定为询盘和图纸不用于营销或公开展示；不扩展成保密协议、绝对保密保证或未经确认的数据保留承诺。该句已同步进入四语隐私页。

## 搜索意图决定

- Contact 页面仍服务于 `pneumatic rotary union quote`、型号匹配、替换件和定制配置询盘。
- 搜索摘要从“一次提交全部参数”改为“型号、照片、图纸或已知信息均可开始”，降低搜索结果页的询盘门槛。
- 回复时限描述为工程师通常在一个工作日内回复，不承诺一个工作日内完成报价、选型或技术结论。

## 四语视觉复核

- 1280 × 900：EN/DE/JA/RU 均无横向溢出，说明卡与表单卡继续顶对齐且等高；重点回复句为 15.68 px、字重 600；对应卡片高度为 848 / 890 / 862 / 970 px。
- 390 × 844：四语均无横向溢出，表单继续排在说明卡之前；表单宽度均为 349 px。
- 德语和俄语表单顶栏小标题在桌面端自然换为两行，没有截断；新增资料使用说明在手机端正常换行；重点回复句在四语手机端均正常换行。
- 浏览器测试没有填写字段、点击提交按钮或向 `send_inquiry.php` 发出请求。

## 审核边界

本记录不声称完成独立母语审校，也不证明真实邮件已送达。没有修改表单字段、SMTP、附件、反垃圾、收件人或服务器行为；没有提交真实询盘。后续如业务流程变化，必须同步复核“一个工作日”和“询盘及图纸不用于营销或公开展示”两项公开承诺。
