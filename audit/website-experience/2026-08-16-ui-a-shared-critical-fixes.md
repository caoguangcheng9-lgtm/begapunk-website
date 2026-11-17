# UI-A 共享关键修复本地验收记录

- 日期：2026-08-16（Asia/Tokyo）
- 工作区：`E:\begapunk-site-v2`
- 分支：`main`
- HEAD：`958efd4ab5129fde7296f9c27afa35f9cf9658a8`
- 任务开始时 Git 状态路径：293；暂存：0；unmerged：0；`catalog-project/` 状态：0
- 任务开始时完整状态指纹：`D4617AE21FD9533A8EA7BA20A422106C09CAD2D1444D65F2976E8F1368EF276A`
- 任务开始时范围外状态：283 路径；范围外内容指纹：`48ABF3EC64F01F203DB5A8F95FC289A2C8D29670E93688D70A10A102F117722B`
- 施工前字节副本：`C:\Users\cao19\AppData\Local\Temp\begapunk-ui-a-prechange-20260816-20260816051603`

## 允许路径与 SHA-256

| 路径 | 施工前 SHA-256 | 施工后 SHA-256 |
|---|---|---|
| `products.html` | `D9E76DB37D2A515504EC016F81B20120FA275D68B83D99E32E8CAA594DF3C6D6` | `8CB1264866D67831C733B2A91AA1C4CDE550CEEAE7DA158AAE2EAEFBC60A14E7` |
| `products-p2.html` | `3824A2A70B59BB367AA4F5552EE643217147346C266B4C52BC77C89CAEF108FE` | `90B82B7F4F3C7E764E5420CD20DBF9F0997E8F034A97D80BD05B2B6E92CCBC5A` |
| `de/products.html` | `62069E85D6CDB6FCE7B1AF1E929C99182174721B403181C9BBFA748E4CCBEA02` | `506C57006B6A04AA005693E640D6FB7844E8EABF7C64161AD47EF4A00E7A40B0` |
| `de/products-p2.html` | `2C40DF4EB8B61AB2857CC9F8A815309A01946BDE8C00195302A9C84E05C111D5` | `4044527537A57580551B5D09CCABEF939FB2456A13B425260B7F258BDF9689DC` |
| `ja/products.html` | `F68A561C01D0DF48EBF1DC686EE366DD8964BD2A67017DA1A95339F08C84C4E7` | `6C94B7F246313115A93CF9FC8047662B2F2C99423B980614A8CC971BDA29EB1D` |
| `ja/products-p2.html` | `C25843374BD9C6F5D811915C3EA4FB104B493FE2888B5674F763A91B446A19BF` | `E533EFECAC7B1876D3DA5CA27D43AA4109825BFE7C54EEEE3C2F1B3798553D44` |
| `ru/products.html` | `928F9FC08E9A6A09F99E808E2D9364C4FEA88F23780FDE28881C5D129FBD1D2E` | `A7ECF9BE24DDADC264011C7D07872D177C34E135AA52EE419183B893D7E904C1` |
| `ru/products-p2.html` | `25C2F169E4E949E8A8FE55F25B8BFFD76246C5E3DA4B7060CBCF4EF392AB8247` | `693B0AF0D67CC88085B1104BC4DEDCE839752E037DFE86ECEDF8845256CC3C40` |
| `scripts/validate-product-data.mjs` | `B2E3DE3D691B0DA81B979F8933E29844E33AA1249FA259B215EA9D3909FA6538` | `7C0D5AE17904C6DCCABA46951F6F0EC7F0D5A4936D4D7A175EA6DE0471227230` |
| `css/style.css` | `51F7BA90440E4275CB57FF355C154FADAE6DFEEBF7B7BF475BF7335DEDA5FBC8` | `38B1172B7F2A602BD58904C03C57D0CCFE5215792D46312A4A7951E2ECE96D81` |
| `css/manufacturing-quality.css` | `A3D74E8A5FD1A6AC2D1517D019A9B497FF0587B55017974DD9F4590AE923B189` | `E613AACA024AB64990A8156753E54648CC24412F3CA4190697C87F9C739C6FE8` |
| `js/analytics.js` | `F0CF474AB88EF02EB7D1799411191A320029B02971FAD41CA323CFF33DF8F649` | `065663C5DCB720EE3F82F6208F5FDE52056C215231ED2958C83CEEF651A8AA54` |
| `audit/website-experience/2026-08-16-ui-a-shared-critical-fixes.md` | 不存在 | 自引用文件无法在自身正文中固定最终哈希；最终哈希记录在任务外部回报中 |

没有修改第 14 个路径；没有统一任何既有文件的换行格式。

## 本任务增量

相对于仓库外施工前字节副本：

| 路径组 | 增量 |
|---|---|
| 八个产品目录页 | EN 每页 `+30/-31`；DE/JA/RU 每页 `+31/-32`。加入六个稳定筛选代码、按钮类型与按压状态；筛选逻辑改为只使用 `dataset.filter` |
| `scripts/validate-product-data.mjs` | `+173/-0`。加入 DOM 合同、无 JavaScript 初始可见性及实际内联筛选脚本的内存行为测试 |
| `css/style.css` | `+103/-28`。修复共享网格最小宽度、分页/按钮换行、移动 CTA、安全区、面包屑作用域和 WhatsApp 对比度 |
| `css/manufacturing-quality.css` | `+13/-0`。移动卡片子项可收缩，按钮全宽并允许换行 |
| `js/analytics.js` | `+62/-22`。实现 `open` / `closing` / `settled` 同意界面状态及可取消删除计时器 |
| 本审计文件 | 新增，仅记录本次本地证据 |

## 修复结果

### 产品目录筛选

- 八页的当地语言可见文字未改变；逻辑只读取 `btn.dataset.filter`。
- 合法代码固定为 `all`、`1-channel`、`2-channel`、`3-channel`、`4-channel-plus`、`custom`。
- `4-channel-plus` 精确包含 `4-channel+`、`6-channel`、`8-channel`；非法代码不会改变当前状态。
- 每次操作恰有一个 `.active` 且恰有一个 `aria-pressed="true"`；非 All 隐藏分页，All 恢复分页。
- 无 JavaScript 时每页八张卡片均可见。

| 当前分页 | All | 1 | 2 | 3 | 4+ | Custom |
|---|---:|---:|---:|---:|---:|---:|
| 第一页（四语相同） | 8 | 1 | 5 | 1 | 1 | 0 |
| 第二页（四语相同） | 8 | 1 | 3 | 2 | 1 | 1 |

这仍然是当前分页内筛选，并未实现 16 个型号的跨页筛选。

### 布局、CTA 与对比度

- Manufacturing Quality、首页证据区、应用/安装网格、法律正文、产品分页和下载按钮均按根因增加可收缩轨道或安全换行；未用新的 `html/body overflow-x:hidden` 掩盖问题。
- 保留 `.filter-inner`、`.pd-tabs`、`.thumbnail-row`、技术表格、产品横向行和主题网格的局部滚动。
- 移动询盘按钮改用自动高度、最小 48px、正常换行；俄语代表页实测高度约 76.97px，未裁字。
- 产品 Hero 面包屑已限定到 `.pd-hero`，安装和 About 面包屑也分别限定到所属 Hero；没有残留新增的裸 `.breadcrumb` 覆盖。
- WhatsApp 默认色为 `#075e54`，白字计算对比度 `7.669:1`；hover/focus 为 `#064b43`，白字 `10.023:1`。Quote 按钮仍为 `rgb(30, 110, 184)`。
- 64 个四语产品详情页：普通面包屑最小对比度 `6.803:1`，链接最小 `9.300:1`，低于 4.5:1 的项目为 0。

### Cookie 与固定 CTA

- `html[data-bp-consent-ui]` 使用 `open`、`closing`、`settled` 三状态。
- 横幅成功创建后为 `open`；Accept/Decline 先进入 `closing`；DOM 删除后才进入 `settled`。
- `open` 和 `closing` 时 CTA 使用 `display:none !important`，不在 Tab 序列。
- `reset()` 在 settled 及 closing 阶段均能重开；closing 时会取消旧删除计时器，并用横幅对象和状态守卫防止旧回调误删新横幅。
- 无效、过期、损坏或错误版本记录均进入 open；`BANNER_VERSION` 仍为 `1.0`。
- 横幅和移动 CTA 均包含 `env(safe-area-inset-bottom, 0px)`；桌面模拟环境该变量为 0，因此计算值分别为 14px/10px。非零实体设备安全区未在本地桌面环境实测。

## 浏览器验收

服务只绑定 `127.0.0.1`；未访问生产站。所有测试均未点击询盘、WhatsApp或外部业务 CTA。

### A. 全站快速扫描

55 条正式路由 × 4 语 × 2 宽度，共 440 个页面视图：

| 宽度 | 页面 | 整页横溢 | 主要内容不可见 | CTA 裁切 | 同源资源失败 | 页面来源控制台错误 |
|---:|---:|---:|---:|---:|---:|---:|
| 320 | 220 | 0 | 0 | 0 | 0 | 0 |
| 390 | 220 | 0 | 0 | 0 | 0 | 0 |

批量 iframe 清理时浏览器自动化层产生 197 条无源码 URL 的 `MutationObserver observe non-Node` 噪声；它们不来自站点脚本，已与页面来源错误分开记录。顶层代表页复核未重现该噪声。

### B. 重点溢出

- 9 路由 × 4 语 × 320px：36/36 满足 `scrollWidth <= clientWidth + 1`。
- 德语首页 1024px：溢出 0px；原先约 14px 的横溢未再出现。

### C. 页面族

- 8 个代表页 × 4 语 × 1440/1024/390：96/96 无整页横溢，H1 可见。
- 390px 移动菜单：32/32 可打开，32/32 可用 Escape 关闭，32/32 焦点返回开关，32/32 有可见焦点样式。
- 发现 27 个预期的局部横向滚动组件，失去局部滚动的组件为 0。
- 200% 缩放：工具未能可靠设置真实浏览器缩放；改用 720px 半宽重排代理检查，32/32 无整页横溢且内容可见。此项只能记为代理检查，不是实际 200% PASS。

### D. 产品筛选

- 1440px：8/8 页面六种筛选计数、唯一 active/aria、分页隐藏/恢复均符合合同。
- 390px：8/8 页面结果相同，无横溢。
- 禁用页面脚本：8/8 页面八张卡片全部可见，无横溢。

### E. Cookie 状态

- 4 语 × 320/390/768/769：16/16 在 open/closing 隐藏 CTA，横幅删除后才恢复；横溢 0。
- settled reset：16/16 重开；closing reset 并等待超过旧 500ms：16/16 仍保持一个 open dialog。
- 损坏 JSON、过期、错误版本和非法值：4/4 均进入 open。
- Decline：4/4 未创建 GA 脚本。
- Accept：4/4 最多创建一个 GA 脚本；共 4 次 Google GET 尝试均被浏览器调试层拦截，完成的外部响应 0，外部 POST 0。
- reduced-motion：媒体查询生效，横幅和按钮 transition 为 0s，关闭后快速 settled。

### F. 请求、错误与资源总计

- 表单 POST：0。
- 页面发起的外部分析请求尝试：4，全部拦截；实际完成的外部分析响应/传输：0。
- 页面来源控制台错误：0；浏览器自动化层噪声：197（见上文，均无站点源码 URL）。
- 同源 CSS/JS/图片加载失败：0。
- 页面加载失败：0。

## 自动检查

| 命令 | 退出码 | 结果 |
|---|---:|---|
| 施工前 `git diff --check` | 0 | PASS |
| 施工前 `npm run heroes:verify` | 1 | 既有失败：`Page-hero synchronization required for 220 file(s).` |
| 施工前 `npm run products:validate` | 0 | PASS |
| `node --check js/analytics.js` | 0 | PASS |
| `node --check scripts/validate-product-data.mjs` | 0 | PASS |
| `npm run products:validate` | 0 | PASS；新增目录筛选自测确实执行 |
| `npm run search:verify` | 0 | PASS |
| `npm run discovery:verify` | 0 | PASS |
| `npm run i18n:verify` | 0 | PASS |
| `npm run images:verify` | 0 | PASS（56 页、53 manifest images、247 img tags、222 optimized） |
| `npm run quality:source` | 0 | PASS |
| `node scripts/verify-public-claims.mjs --source-only` | 1 | 非本任务引入：四语 Contact 的 `segment === '..'` 被现有双标点规则误报，共 4 项；相关文件及该验证器均未修改 |
| 最终 `git diff --check` | 0 | PASS |

由于施工前 `heroes:verify` 已在 220 页同步检查处失败，按任务指令未运行 `npm run quality:pr`，也未运行任何 Hero 同步。

## 已知剩余项与部署前待办

UI-B 未在本阶段处理：

1. 产品详情页标签的无 JavaScript可见性、tab/aria 状态合同。
2. 产品 FAQ 的 aria 状态与内容高度/缩放鲁棒性。
3. 缺失的 `main` landmark 与 skip-link。
4. 16 个型号的真正跨页目录筛选（当前仅在每个分页的八张卡片内筛选）。

另外，本地桌面环境未证明非零实体安全区，也未完成真实 200% 浏览器缩放；这些应在后续设备/浏览器验收中补齐。

**正式部署前必须统一更新 220 页 CSS/JS 缓存版本，并同步相应验证器期望。** 本任务没有修改缓存版本、没有运行同步或构建，也不能把当前本地修改直接视为可部署工件。

## 范围与授权声明

- 最终 Git 状态：296 路径，其中本任务允许路径恰好 13 个、既有范围外路径 283 个；暂存 0，`catalog-project/` 状态 0。
- 最终范围外内容指纹：`48ABF3EC64F01F203DB5A8F95FC289A2C8D29670E93688D70A10A102F117722B`；与施工前逐路径状态、字节数和 SHA-256 全部一致，变化 0、缺失 0。
- 未读取或修改 `catalog-project/` 内容，只检查了其 Git 状态。
- 未修改 package、i18n、SEO、翻译生成器、审批或 Editorial 状态。
- 未运行非 check 同步、构建、`quality:pr` 或部署准备。
- 未暂存、未提交、未推送、未创建 PR、未部署。
- 未访问生产服务器或邮箱，未向真实表单端点发送请求。
