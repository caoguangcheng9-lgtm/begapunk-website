# Instagram 当前企业资料核对 — Phase 3L

核对时间：2026-11-13 11:30–11:34（Asia/Tokyo，UTC+09:00）；原始时间范围 2026-11-13T02:30:17.261Z 至 2026-11-13T02:34:18.683Z。

目标：[https://www.instagram.com/begapunkrotaryjoints/](https://www.instagram.com/begapunkrotaryjoints/)。本轮仅使用现有合法会话只读查看公开资料、编辑字段和账户类型入口。

## 结论

账号归属：**已确认官方企业使用账号**。精确历史URL、现有自账号编辑权限、匹配的品牌/官网回链以及公开帖文中的法定公司名称相互印证。此结论不是Instagram平台认证，也不代表平台账号类型为Business。

当前官网首页页脚仅列出LinkedIn、YouTube、Facebook、X，未显示Instagram；因此不能声称本轮从官网首页找到了Instagram链接。未扩大到全站或全部JSON-LD扫描。历史证据没有被当作今天的实时内容。

总体：**BIO_CHANGE_RECOMMENDED，NOT_MODIFIED**。当前Bio仍为22字符的“Long-life Rotary Joint”，与Phase 1B/Phase 2一致；未体现manufacturer。沿用Phase 2A的P2A-022 **P1 / OPEN（工程证据缺口）**：缺少寿命条件及支持资料，不据此认定产品虚假或寿命短，也不把没有写manufacturer定性为虚假身份。建议复用已审核H稿116字符，上限150，余34字符。

未发现已证实的P0国家/法律主体错误。官网回链本次已实际访问成功，最终落地HTTPS官网，不能再称其失效；历史HTTP目标可作为可选规范化事项，非必须修复。AI标签及头像定位为P3负责人待确认，不自动判断标签错误。

## 字段矩阵

E编号及证据文件、哈希见同目录INSTAGRAM_EVIDENCE_INDEX.md。UNKNOWN表示未能核实，不能推断为空白、错误或通过。

| 字段 | CURRENT | PROPOSED | EVIDENCE | RISK | ACTION |
|---|---|---|---|---|---|
| 准确URL / Username | instagram.com/begapunkrotaryjoints/；begapunkrotaryjoints | 保持 | E01、E03、H01、H02 | 无已证实问题 | NO_CHANGE_REQUIRED |
| Display Name | BEGAPUNK ROTARY JOINTS | 保持；大写展示不等于新品牌 | E01、E02 | 无已证实问题 | NO_CHANGE_REQUIRED |
| 法定公司名称 | Bio未写；可见假期通知帖文写Ningbo Begapunk Pneumatic Components Co., Ltd. | 保持已正确名称；短Bio通过独立官网链接关联法律主体 | E01、P03、E06、H04 | 无已证实主体冲突 | NO_CHANGE_REQUIRED |
| Bio全文 | Long-life Rotary Joint | Phase 2A H全文，见建议报告 | E01、E03、H03 | P1，继承P2A-022；寿命证据缺口 | OPEN；候选稿送审，不发布 |
| 字符数/编辑上限 | 22 / 150；公开原文与编辑值一致 | 116 / 150（2个LF，无末尾LF） | E03、H03；本地逐字符计数 | 无超限 | NO_CHANGE_REQUIRED（限制本身） |
| 制造商定位 | Bio未出现manufacturer | H稿明确pneumatic rotary joint & rotary union manufacturer | E01、E06；负责人已确认制造和装配事实 | P3定位优化；不另计技术错误 | 随同Bio建议处理 |
| 账号类型 | “账户类型和工具”提供“切换为专业账户” | 本轮保持；不自动转Business/Creator | E04、E05 | 从入口推断当前为普通/非专业账号；未显示Business/Creator子类型 | 无需为资料一致性强制转换；精确平台分类待负责人按需核对 |
| AI生成主页标签 | 公开显示；编辑页开关值1 | 暂保持，确认标签与人物头像/账号定位是否相符 | E01、E02、E03、H05 | P3 / OWNER_CONFIRMATION_REQUIRED；不是制造能力证据 | 不自动移除标签、换头像或转换账号 |
| Website | 显示www.begapunk.com；转址目标HTTP官网，含utm_source=ig、utm_medium=social、utm_content=link_in_bio | 保留现有链接及UTM | E01、E07 | 当前无失效/错域问题；HTTP源地址仅可选规范化 | NO_CHANGE_REQUIRED（目的域与可用性） |
| 实际落地 | HTTPS begapunk.com首页，保留上述UTM，另有平台fbclid | 保持 | E07 | 可访问不代表已索引或被AI引用 | NO_CHANGE_REQUIRED |
| 其他外部链接 | 本次主页只观察到1个网站链接 | 不新增或推断隐藏链接 | E01、E03 | 未展示内容UNKNOWN | 无修改建议 |
| Email | 主页可见帖文含sales@begapunk.com；Bio无邮箱 | 保持正确帖文邮箱；不必塞入短Bio | E01、P01/P02/P04/P05 | 联系按钮实际配置UNKNOWN | 帖文邮箱NO_CHANGE_REQUIRED；按钮不作判断 |
| 电话 / WhatsApp | 本次界面未显示号码或可核对按钮 | 不凭缺失新增；已确认企业基准为+86 183 6842 5342 | E01、E03；用户事实基准 | UNKNOWN，不是错误号码 | 若后续需要展示，由负责人核对移动端公开联系选项 |
| 国家 / 所在地 / 地址 | Profile未展示；帖文提到Ningbo；平台账户国家/注册地址未读到 | H稿Ningbo, China；不填工厂地址 | E01、P03、H04；用户事实基准 | 平台国家/地址UNKNOWN；未见错误US | 不以未展示为国家错误 |
| 旧称Begapunk Precision | 本次Bio、名称、5条可见帖文描述未见 | 不新增旧称 | E01 | 未全面审计历史或视频逐帧 | NO_CHANGE_REQUIRED（已查范围） |
| steam/高温/高压/通用介质兼容 | 已查Bio及可见帖文未见此类无条件声明；oil配置明确与标准气动目录分开 | 保留按配置评估边界 | E01、P02 | 未证明所有型号技术参数；不扩大为全历史PASS | NO_CHANGE_REQUIRED（已查表述范围） |
| 厂房面积/认证/通用性能保证 | 已查简介未声明面积/认证；Long-life单列 | H稿不新增面积、认证或性能指标 | E01、H03 | 总使用面积500多平方米不能等同生产车间面积 | NO_CHANGE_REQUIRED（不新增） |
| 置顶内容 | 当前5个主页缩略项；未获得明确置顶标记 | 保持 | E01、E02 | 置顶状态UNKNOWN；不能声称不存在置顶 | 未改置顶；必要时人工确认 |

## 主页可见内容的限定检查

| 编号与URL | 直接观察到的主要内容 | 判断和边界 |
|---|---|---|
| P01 [HF8](https://www.instagram.com/begapunkrotaryjoints/reel/DetAEEoxtHB/) | 三路空气、Ø8 mm通道、G3/8、10/12 mm管件选项及气动夹紧 | 属于具体配置表述；未见通用液体兼容/高压承诺。尺寸与全部工况没有在本轮重新工程验证，不能全部标VERIFIED |
| P02 [油路CAD演示](https://www.instagram.com/begapunkrotaryjoints/reel/DeOGuGKREtc/) | 标准目录为pneumatic models；油传输配置需提供工况咨询；明确AI-assisted CAD workflow | 已区分气动目录与油路配置；CAD动画不是油介质、压力、寿命试验证书 |
| P03 [假期通知](https://www.instagram.com/begapunkrotaryjoints/reel/Dd794jXxJ-v/) | 法定公司名称及官网，提到Ningbo | 可作第一方品牌关联证据；不作独立工商认证，不调查帖文中的个人生活内容 |
| P04 [BP-10P-0001](https://www.instagram.com/begapunkrotaryjoints/reel/Dd6WYeeR6zg/) | 10路气动、G1/8、转台应用；要求介质/压力/转速/安装空间评估；标明原理动画 | 有工况评估限定；动画不是测试，未复核全部图纸参数 |
| P05 [BP-5P-0001](https://www.instagram.com/begapunkrotaryjoints/reel/Dd22LZhxNM4/) | 5通道、独立通路、转台；要求工况评估；标明流路可视化、未展示内部细节 | 未见所有介质通用承诺；不将画面理解为所有性能已验证 |

读取的是主页提供的可见帖文描述及缩略图，不是全面观看所有视频、全部历史贴文或评论。未查看私信、收藏、私密文件夹或个人账号资料。

## 待确认与下一阶段

1. Long-life的型号、寿命定义、压力/速度/介质/负载/试验条件及原始测试依据仍UNKNOWN；若保留此营销词需工程证据。本轮仅建议替换，不声称完成技术整改。
2. AI标签的使用依据与企业号/代表人物主页定位需负责人确认；现有合法会话足以支持企业使用归属，不足以判断人物是否AI生成。
3. 电话/WhatsApp/邮箱联系按钮、平台账户国家与置顶状态没有充分可读证据；匿名或移动端呈现未测。
4. Manufacture事实已获负责人确认，不重复要求确认；但后续任何发布仍须单独授权。
5. Bio建议能改善身份表达，不能保证收录、流量或ChatGPT/Gemini/Copilot推荐。5帖、1粉丝不能证明工业受众或第三方工程背书。

执行记录：只读打开编辑入口及账户类型工具，未输入新值、未点击Submit/Save/Publish、未转换账号。返回主页后Bio仍为原22字符；外链检查仅正常点击现有链接。其他设置未执行任何写入，不宣称审计了全部后台设置。
