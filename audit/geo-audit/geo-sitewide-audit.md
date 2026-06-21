# Begapunk 全站 GEO 审计

## 执行摘要

- 扫描文件：394
- HTML 页面：51；静态判定可索引正式页面：48
- 全站 GEO 平均分：**68.3/100**
- 问题等级（以页面主优先级计）：P0 0、P1 23、P2 4、P3 24
- 重复内容组：3；证据待核陈述：1386

本次评分衡量的是页面作为 AI 可理解、可验证、可引用工程资料的能力，不等同于 Google 排名或 AI 实际引用概率。线上状态码、服务器重定向和证书必须人工验证。

## 网站整体 GEO 评分

当前站点已经形成“产品、应用、知识中心、询盘”框架，但主要短板是原始工程证据、最大值与连续值定义、适用边界、作者审核链和跨页面事实一致性。大量页面具备可抓取文本，却未必具备足够独特的第一手信息让 AI 优先引用。

## 网站实体识别情况

Begapunk 在多数页面被描述为 pneumatic rotary union / rotary joint 制造商，实体方向总体清楚。需要人工核对公司法定全称、宁波地址、制造商身份、ISO 证书主体以及 Begapunk 品牌主体是否在 Organization、About、Contact 和页脚完全一致。“Pneumatic Automation Solutions”等宽泛定位若仍存在，应弱化为产品应用能力，避免稀释 Air Rotary Union Specialist 实体。

## 技术 SEO 基础情况

- sitemap 漏收候选：未发现
- canonical 缺失候选：未发现
- JSON-LD 解析失败页面：未发现
- 孤立页候选：未发现
- 本地无法解析链接页面数：0；详见逐页报告
- `.html`/无扩展名、www/non-www、HTTP/HTTPS 和状态码规范化：静态文件无法确认，需要人工验证 `.htaccess` 与线上服务器行为。

## AI 抓取情况

robots.txt 当前内容：

```text
User-agent: *
Allow: /
Allow: /css/
Allow: /js/
Allow: /images/

# ===== PAGES THAT SHOULD NEVER BE INDEXED =====
Disallow: /404.html
Disallow: /send_inquiry.php

# ===== OLD/REMOVED PAGES (Bing cleanup 2026-05-30) =====
# Add old page paths here as you discover them:
# Disallow: /pneumatic-fittings.html
# Disallow: /old-product-page.html

# ===== LEGACY URL PATTERNS =====
# Disallow: /old-category/
# Disallow: /temp/
# Disallow: /test/

# ===== SITEMAP =====
Sitemap: https://www.begapunk.com/sitemap.xml

# Crawl-delay: 10
```

需分别判断搜索展示爬虫、模型训练爬虫和用户触发访问。robots 允许并不保证抓取、收录或引用。llms.txt：存在。

## 内容体系情况

产品型号、应用落地页和技术文章均已存在，架构基础好。缺口集中在：真实试验条件、安装尺寸约束、失效诊断树、型号替代规则、连续工况参数、工程案例的输入/诊断/结果数据，以及 RFQ 所需数据的统一定义。

## AI 引用能力

表格、FAQ 和参数提高了可提取性，但“可提取”不等于“值得引用”。最需要增强的是 Begapunk 独有的工程数据、可复核计算、测试方法、失败边界和带型号的案例。泛化行业介绍属于低独特性内容，AI 引用价值有限。

## 工业技术可信度

产品页有型号、材料、压力、转速和介质等基础信息。需要统一说明最大值/连续值、参数是否可同时达到、温度与介质对额定值的降额关系、寿命和泄漏测试条件。技术文章需要实名或可核验团队角色、审核日期和依据。

## 事实证据风险

检测到 1386 条带数字、认证或强性能陈述。不能据此判定虚假，但“200,000+ units”“40+ countries”“ISO 9001:2015 certified”“maintenance-free”“ships in 7 days”等应建立证据索引、统计时间范围和适用型号。高风险样例见 `claims-needing-evidence.csv`。

## 结构化数据

Schema 分布：ListItem=40, BreadcrumbList=39, Answer=21, FAQPage=21, Question=21, WebPage=20, Brand=17, Offer=17, Product=17, PropertyValue=17, ImageObject=7, TechArticle=7, Organization=6, PostalAddress=3, ContactPoint=2, GeoCoordinates=2, LocalBusiness=2, Person=2, CollectionPage=2, Blog=1, ContactPage=1, WebSite=1, ItemList=1。结构化数据必须与可见正文一致；不得补充无真实依据的 offers、aggregateRating 或 review。产品页应重点核对型号、图片 URL、品牌和 Product 可见参数。

## 内部链接

理想知识图谱为“品牌 → 产品目录 → 型号 → 应用 → 选型/安装/故障 → 案例 → RFQ”。当前页面间已有基础链接，但仍存在孤立页、模板锚文本和双向关联不足。优先让产品页链接到适用/不适用应用，让应用页链接到推荐型号和选型依据。

## 页面重复

共识别 3 个高相似组。产品模板重复本身合理，但型号页需要在用途、接口约束、风险、替代关系和 FAQ 上形成事实差异；应用页不能只替换行业名称。

## 询盘转化

Contact/RFQ 和产品 CTA 已形成转化入口。应确保每个型号来源自动带入询盘，并要求介质、最大/连续压力、转速、通道数、接口、安装空间和图纸。交期、免费 CAD 和定制能力均需明确条件，避免过度承诺。

## P0 问题

- **0 个已确认 P0 根因。** 本地静态审计未发现核心页 noindex、错误域名 canonical 或空白核心页面；线上状态仍需人工验证。

## P1 问题

- **6 个高优先级根因。**（1）核心产品页的工程参数缺少统一测试条件、连续值及参数能否同时达到的说明；（2）认证、出货量、国家数、交期和绝对性能陈述缺少页面级证据入口；（3）多处具体故障时间、停机损失、过滤精度和材料性能陈述看似案例或测试结论但未给出来源；（4）16 个产品详情页使用 `Offer/InStock/priceCurrency`，但没有价格，库存真实性需要人工核验；（5）法定公司名、证书主体、工厂地址、创始人和制造商身份需要企业文件支持；（6）部分同类产品页存在较高正文相似度且差异化结论缺少证据。

## P2 问题

- **7 个中优先级根因。**（1）技术文章作者、审核人、更新日期和依据不足；（2）部分页面缺少不适用场景、失败边界和直接答案摘要；（3）产品、应用、知识与 RFQ 之间的双向内部链接仍可加强；（4）`search.html` 为 noindex 但仍出现在 sitemap；（5）`products.html` 与 `products-p2.html` 使用相同 H1 和 meta description，且未发现 prev/next 关系；（6）llms.txt 遗漏多数产品页与技术文章，不能代表完整知识库；（7）FAQ 中部分精确时间、失效概率和“最常见错误”没有样本来源。

## P3 问题

- **3 个低优先级根因。** 个别图片 alt、泛化锚文本和日期格式可以进一步具体化。llms.txt 可继续维护，但它不是 GEO 排名或 AI 引用的必要条件。

## 全站优点

- 产品型号体系清晰，存在独立产品详情页。
- 已建立应用、知识中心、FAQ、安装、比较和 RFQ 页面。
- 大多数核心内容以静态 HTML 提供，不依赖 JavaScript 才能看到正文。
- 已部署多类 Schema，具备进一步校准实体关系的基础。

## 全站主要风险

- 工程事实可读但未必可证。
- 页面模板化造成同类页面差异不足。
- 强营销数字没有时间范围、样本和证据入口。
- 产品参数可能被 AI 当成可同时达到的连续额定值，需要定义边界。

## 未来 GEO 内容方向

优先发布可验证的选型边界、安装尺寸检查、失效诊断、介质兼容、压力/转速降额、型号替代和带测试条件的案例。每篇内容应回答一个明确工程问题，并连接具体型号、应用与 RFQ。
