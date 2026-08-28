# 2026-08-27 商业与产品事实四语言 AI 逐行审核

日期：2026-08-27（Asia/Tokyo）

- reviewedAt: `2026-08-27T00:48:29+09:00`
- reviewedByRole: `Codex AI technical-localization reviewer`
- reviewMethod: `AI-assisted target-market line-by-line localization review`
- independentNativeSpeakerReview: `not performed and not required`
- humanEditorialSignOff: `not performed and not required`
- unresolvedIssues: `none for the reviewed localized HTML copy`; 两份待重导产品图纸中的旧 1.5 倍测试说明和旧产品目录型号错误继续作为独立发布阻断项管理，本记录不解除这些文件问题。

## 审核范围

本次逐句核对英语母版及德语、日语、俄语对应页面的可见正文、标题、按钮、产品参数、移动表格标签、FAQ 正文、JSON-LD、搜索条目和 AI 索引。受影响的本地化页面为：

- `index.html`
- `about.html`
- `products.html`
- `products-p2.html`
- `product-comparison.html`
- `production-inspection-testing.html`
- `faq.html`
- 16 个 `BP-*.html` 产品详情页（共享交期字段）；其中 `BP-2P-95-0005.html` 另外审核了 2 入口、4 出口及夹紧/松开分配。

德、日、俄三种语言各 23 页，共 69 个本地化 HTML 页面。未更改的页面继续沿用原审核记录；本次没有把未经复核的页面重新声明为已审核。

## 第一方事实决定

- BP-2P-95-0005 为当前正确且批量生产的型号；旧产品目录中的 BP-2P-95-0001 为录入错误。
- BP-2P-95-0005 具有 2 个独立气路、2 个 G1/8 入口和 4 个 Ø4 出口；4 个 Ø4 孔分别为 2 个夹紧出口和 2 个松开出口，不是安装通孔。
- 所有成品逐气路进行 1.0 MPa 压缩空气泄漏测试；设备在约 1 秒加压和约 4 秒保压期间带动产品旋转，并检查旋转顺畅、无卡顿和无异响；每个气路显示 PASS 后才放行。
- 标准压缩空气产品要求颗粒过滤器、水分离器和油雾器组成的完整三联件；无油空气使用已验证的耐磨密封配方。
- 标准品和定制品的最小订单均为 1 件。目录型号生产时间通常约 20 个自然日；定制品不超过 30 个自然日；从收到货款后开始计算，不含国际运输。
- 每个目录型号均可提供 2D 图纸和 3D STEP 模型；定制产品在订单前提供客户外形接口 CAD 用于确认，不公开内部密封和制造细节。
- About 页面仅陈述英文技术资料和海外项目支持，不再声称扩大生产能力。

## 目标市场参考来源

访问日期均为 2026-08-27：

- German: `https://www.deublin.com/de/produkte/drehdurchfuehrungen`
- Japanese: `https://www.pascaleng.co.jp/jp/products/work_clamp/rotary_joint/`
- Russian: `https://www.deublin.com/-/media/API-Sync-Assets/INS/040-522.pdf?ts=20250517T2213293493`

参考页面只用于核对当地工业用词、接口表达和采购阅读顺序，不复制其文案，不采用第三方参数、认证、性能或商业承诺作为 Begapunk 事实。

## 术语决定

- German：使用 `Drehdurchführung`、`Katalogmodelle`、`Sonderanfertigungen`、`Fertigungszeit`、`Eingänge/Ausgänge`、`Klemmen/Lösen`、`Integrierte Drehfunktion` 和 `PASS`。
- Japanese：使用 `空圧ロータリージョイント`、`カタログ品`、`特注品`、`製作期間`、`入口／出口`、`クランプ／解除`、`装置回転機能` 和 `PASS`。
- Russian：使用 `пневматическое ротационное соединение`、`каталожная модель`、`заказное исполнение`、`срок изготовления`、`вход/выход`、`зажим/разжим`、`встроенное вращение` 和 `PASS`。
- 四语首页将信息压缩为标准/定制、实际工况、MOQ、20/30 自然日和 2D/STEP 五个要点，避免在手机首屏堆砌全部可调整项目。

## 搜索意图决定

- 首页突出标准与定制空压旋转接头，不把宁波地名作为首要识别信息。
- 产品页用完整型号、流路数、入口/出口、压力、转速、安装和可提供 CAD 支撑工程采购检索。
- CTA 继续指向报价、选型和工况提交，不把 WhatsApp 限定为只发送图纸。
- 旧产品目录 PDF 因型号错误暂时退出页面 CTA、公开发布清单和 IndexNow 主动提交清单。

## 桌面与手机端检查

使用本地 HTTP 页面和 Codex 内置浏览器检查：

- `en/de/ja/ru` × 首页、产品目录、BP-2P-95-0005、生产检测、FAQ；
- `390 × 844` 和 `1440 × 1000` 两种视口，共 40 次代表页检查；
- 40/40 页面均只有一个可见 H1，语言属性正确，无页面级横向溢出，无损坏可见图片；
- 首页压缩后四语手机端首屏均能在主要 CTA 后露出产品图，俄语首屏不再被长段说明占满；
- 产品参数、检测表格和 FAQ 在手机端保持可读，未发现遮挡或横向滚动。

本记录准确描述为 AI 辅助目标市场逐行审核，不构成人工、母语或独立编辑签字声明。
