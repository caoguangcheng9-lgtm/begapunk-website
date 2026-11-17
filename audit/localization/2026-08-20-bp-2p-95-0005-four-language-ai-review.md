# BP-2P-95-0005 四语言 AI 逐行本地化审核

日期：2026-08-20（Asia/Tokyo）
reviewedAt：`2026-08-20T19:16:05.6886312+09:00`
reviewedByRole：`Codex AI technical-localization reviewer`
reviewMethod：`AI-assisted target-market line-by-line localization review`
independentNativeSpeakerReview：`not performed and not required`
humanEditorialSignOff：`not performed and not required`
unresolvedLocalizationIssues：`none`

## 审核对象与事实来源

- 页面：`BP-2P-95-0005.html`、`de/BP-2P-95-0005.html`、`ja/BP-2P-95-0005.html`、`ru/BP-2P-95-0005.html`
- 第一方事实来源：产品负责人提供的 `BP-2P-95-0005.pdf`
- 图纸标题栏型号：`BP-2P-95-0005`
- 文件控制号：`QC-2025-0512-003`
- PDF SHA-256：`A6451ACFCBE27F9122246FB7E04B885EF5276307D8255B3101A54B342C2A1E9A`
- 事实优先级：图纸标题栏、图纸参数表和明确尺寸标注优先；PDF 文档属性 Title 中残留的 `BP-2P-95-005` 不覆盖图纸标题栏。

## 逐行审核范围

AI 逐项读取并核对四语页面的 title、description、canonical/hreflang、Open Graph/Twitter 文案、H1、面包屑、首屏简介、5 项快捷导航、2 个询价/CAD 动作、PDF/比较工具、分享菜单、6 项关键参数、图纸摘要、规格表、适用性边界、安装说明、下载区、5 项 FAQ、相关型号、工程确认 CTA、图片替代文本以及 Product/Breadcrumb JSON-LD。审核同时核对站内产品卡、比较页、案例页、四语搜索索引和 LLMS 条目。

## 四语言术语与阅读决定

- English：采用 `2-Passage Pneumatic Rotary Union`、`release port`、`clamp port` 和 `drawing maximum`；不使用旧 `2-in-4-out` 或 `high-pressure heavy-duty` 表述。
- German：采用 `pneumatische 2-Kanal-Drehdurchführung`、`Löseanschluss`、`Klemmanschluss`、`Stirnseitige Befestigung gemäß Zeichnung`；以 `Zeichnungsmaxima` 与 `Dauerbetrieb ... bestätigen` 区分图纸上限和连续工况。
- Japanese：采用 `2流路 空圧ロータリージョイント`、`解除ポート`、`クランプポート`、`図面記載の端面取付`；使用 `図面上限` 和 `承認済み注文図面で確認` 保留工程边界。
- Russian：采用 `2-канальное пневматическое вращающееся соединение`、`порт разжима`、`порт зажима`、`торцевое крепление по чертежу`；使用 `предел по чертежу` 和 `по согласованному чертежу заказа` 避免把上限写成连续额定值。
- 保修字段四语继续为 `1 year`、`1 Jahr`、`1年`、`1 год`，未扩展起算日、范围、免责或救济承诺。

## 图纸事实与排除项

四语页面一致发布：空气、2 流路、最大 `1 MPa`、最大 `200 RPM`、6061 铝合金、`4260 g`、`−20～80°C`、PTFE + O 型圈、最大外径 `Ø162`、总长 `86 mm`、一处 G1/8 深 8 mm 解除口、一处 G1/8 深 8 mm 夹紧口，以及图纸明确的 6×M5、8×M8、8×M6、4×Ø4 和 2×M10 安装特征。

以下旧声明未进入可见页面、JSON-LD、搜索或 LLMS：2 进 4 出、多种液体介质、45#钢转子、10 MPa、扭矩、零泄漏、8,000 小时寿命及 ISO/CE/RoHS。

## 搜索与 AI 检索决定

- 主检索实体统一为完整型号 `BP-2P-95-0005`，并结合各目标市场自然的“两流路/空压旋转接头”称呼。
- 参数关键词只包含图纸支持的压力、转速、介质、材料、尺寸、接口和安装标注。
- HTML、Product JSON-LD、四语 search-index 和四语 llms.txt 使用同一事实合同；旧 `0001` 页面不再承载产品事实，仅作 `noindex,follow` 同语言兼容跳转。
- 页面具备静态正文、唯一 canonical、完整 hreflang、Product/Breadcrumb JSON-LD、可见规格与直接 PDF 链接，适合传统搜索和 AI 抽取；不承诺排名、摘要引用或推荐。

## 浏览器与响应式证据

使用 Codex 内置浏览器访问本地 HTTP 站点：

- English：`1440 × 1000`、`390 × 844`、`320 × 844`；
- German、Japanese、Russian：各 `390 × 844`；
- 所有检查均无页面级横向溢出、损坏图片或 warning/error 控制台日志；
- 四语均保留 5 项快捷导航、2 个主要动作、PDF 与比较、4 个分享渠道、6 项关键参数和 5 项 FAQ；
- 页面未出现旧 `2-in-4-out`、10 MPa 或高压重载表述；
- 旧 `BP-2P-95-0001.html?campaign=legacy-check#panel-specs` 正确跳转到 `BP-2P-95-0005.html?campaign=legacy-check#panel-specs`。

## 审核文件哈希

```text
4838438E410BEB60F7C87873A2ECE7052EA6EFEFBABE3ECBBBB4E13278DD4FD3  BP-2P-95-0005.html
ECE117027A6396EA512098CBAF4649B787DF2391EE24D9E6AB8C46DFF9AAFD07  de/BP-2P-95-0005.html
5D31780FB3ADF56FA0992F44122A22F71D595F9A466095AFBDB5F29AFB09EAEC  ja/BP-2P-95-0005.html
8295155979ED38CB2D526887C22B518D4237766B7E7B3CF00CCCFFAA5AF406D4  ru/BP-2P-95-0005.html
```

本记录准确描述为 AI 辅助逐行审核，不构成人工、母语或独立编辑签字声明。
