# 2026-09-04 Consent Mode v2 与询盘归因隐私文案三语言复核

reviewedAt: `2026-09-04T13:31:55+09:00`
reviewedByRole: Codex AI target-market privacy and technical-content reviewer (not native-speaker / not human or legal sign-off)
reviewMethod: AI-assisted line-by-line changed-surface review of the English source and German, Japanese, and Russian privacy disclosures against the implemented Consent Mode v2 and inquiry-attribution code, the governed i18n source catalog, and Google's target-language Consent Mode references.
unresolvedIssues: independent native-speaker and legal review were not performed; production Google Analytics retention and Google Ads account settings still require account-owner confirmation

## 审核范围

- 英文来源 privacy.html 中新增或改变含义的 12 个可翻译记录，包括 Consent Mode v2 四项状态、分析与广告效果计测、会话归因字段、内部询盘邮件、撤回同意和保存期说明。
- 德语 de/privacy.html 与 i18n/editorial/de.json 的上述 12 个对应记录。
- 日语 ja/privacy.html 与 i18n/editorial/ja.json 的上述 12 个对应记录。
- 俄语 ru/privacy.html 与 i18n/editorial/ru.json 的上述 12 个对应记录。
- 实现核对：js/analytics.js 和 send_inquiry.php。本记录只确认文案与当前实现一致，不构成适用法或同意机制充分性的法律意见。

本次刷新活动语言制品快照时，工作树中同时存在已经由 audit/localization/2026-09-04-ja-de-search-intent-review.md 逐行复核的 de/index.html、ja/index.html 与 ja/products.html 变化。de/ja/ru contact 页仅新增与英文表单相同的不可见归因字段，字段名与值由询盘合同测试复核，不产生新的目标语言可见文案；de/ja/ru search 页仅同步共享搜索脚本的 cache-buster，不改变目标语言可见文案。本记录作为本轮快照的合并索引，不把上述独立记录重新描述为本次隐私审核。

## 目标市场参考来源

访问日期均为 2026-09-04：

- Google Consent Mode 开发者文档：https://developers.google.com/tag-platform/security/guides/consent
- 德语 Google Analytics 帮助：https://support.google.com/analytics/answer/13802165?hl=de
- 日语 Google Analytics 帮助：https://support.google.com/analytics/answer/13802165?hl=ja
- 俄语 Google Analytics 帮助：https://support.google.com/analytics/answer/10718549?hl=ru
- 本仓库既有法律主体与三语言法律文案审核：audit/localization/2026-08-27-legal-identity-arbitration-review.md

Google 资料仅用于核对 Consent Mode 参数名称及目标语言中的分析、广告数据、个性化广告等术语。Begapunk 的数据流和事实边界只取自当前仓库实现，没有从第三方资料推导额外的数据处理、认证或合规承诺。

## 逐行事实核对

- 初始状态中 analytics_storage、ad_storage、ad_user_data、ad_personalization 均为 denied。
- 明确允许计测后，前三项为 granted，ad_personalization 仍为 denied；文案不声称启用个性化广告。
- gclid、gbraid、wbraid、UTM 参数、首次落地页和初始 referrer 只在允许计测后写入会话存储，并仅随访客主动提交的询盘进入内部销售邮件。
- 初次拒绝时 GA4 不加载。若已允许并加载后再撤回，代码会更新同意状态、停止后续可选计测并清理可访问的 GA Cookie 与会话归因；文案不再错误声称能够卸载当前页面已经执行的脚本。
- generate_lead 仍以服务端确认成功事件为前提；姓名、邮箱、公司、国家、自由文本、附件和原始点击标识不会由站点代码作为 GA4 事件参数发送。

## 术语决定

- 德语使用 Analyse und Messung des Werbeerfolgs、Sitzungszuordnung、optionale Messung；用 personalisierte Werbung bleibt deaktiviert 明确区别效果衡量与个性化广告。
- 日语使用 アクセス解析と広告効果の計測、セッション帰属情報、任意の計測；撤回后的行为描述为停止后续计测，而不是卸载已执行脚本。
- 俄语使用 аналитика и измерение эффективности рекламы、атрибуция сеанса、необязательные измерения；保留 Google 参数和存储键原文，避免技术键名翻译后失真。
- 三种语言均保留 Consent Mode v2、GA4、Google Signals、sessionStorage 和各 consent key 的技术原名。

## 搜索意图决定

- Privacy 页面服务于访客的透明度与尽调意图，不承担泛关键词获客任务；不为了广告相关词增加营销性或最高级表达。
- 标题和正文优先回答“收集什么、何时收集、用于什么、保存多久、如何撤回”，并让工程采购访客能区分站内询盘归因、GA4 事件和个性化广告。
- 站内搜索摘要应保留“分析与广告效果计测”“会话归因”“个性化广告关闭”的事实边界，不把同意描述扩张成法律合规保证。

pages: privacy.html, de/privacy.html, ja/privacy.html, ru/privacy.html
language: en source comparison; de, ja, ru
referenceUrls: https://developers.google.com/tag-platform/security/guides/consent ; https://support.google.com/analytics/answer/13802165?hl=de ; https://support.google.com/analytics/answer/13802165?hl=ja ; https://support.google.com/analytics/answer/10718549?hl=ru
referenceAccessDates: 2026-09-04
terminologyDecisions: recorded above
searchIntentDecisions: recorded above
