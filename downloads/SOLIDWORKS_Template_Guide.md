# Begapunk 外贸工程图模板 — SOLIDWORKS 2024 使用指南

## 📦 交付文件

| 文件 | 路径 | 说明 |
|------|------|------|
| **DXF 模板** | `downloads/Begapunk_A4_Horizontal_Template.dxf` | 可直接导入 SOLIDWORKS |
| **参考 PDF** | `downloads/Begapunk_Drawing_Template_Reference.pdf` | 展示完整效果（后续生成） |
| **本指南** | `downloads/SOLIDWORKS_Template_Guide.md` | 即本文件 |

---

## 🎯 模板设计目标

- **语言**：全英文（标题栏、参数框、技术说明）
- **询盘转化**：客户看图纸就能判断能不能用，减少来回邮件
- **品牌一致**：BEGAPUNK 蓝色品牌色贯穿
- **工程规范**：ISO 公差、去毛刺标准、压力测试声明
- **可扩展**：任何产品只需改型号和参数，框架不变

---

## 📐 模板布局（A4 横向）

```
┌─────────────────────────────────────────────────────────┐ ← 297mm
│                                                         │
│   ┌─────────────────────┐  ┌─────────────────────┐     │
│   │ TECHNICAL           │  │                     │     │
│   │ SPECIFICATIONS      │  │   【视图区域】       │     │
│   │                     │  │                     │     │
│   │ MODEL: BP-XXXX      │  │   前视图 / 俯视图    │     │
│   │ MEDIA: Air/Water    │  │   侧视图 / 轴测图    │     │
│   │ MAX PRESSURE: X MPa │  │                     │     │
│   │ MAX SPEED: X RPM    │  │                     │     │
│   │ TEMP RANGE: XX°C    │  │                     │     │
│   │ MATERIAL / SEAL     │  │                     │     │
│   └─────────────────────┘  │                     │     │
│                            └─────────────────────┘     │
│                                                         │
│   ┌────────────────────────────────────────────────┐    │
│   │ TECHNICAL NOTES:                                │    │
│   │ 1. All sharp edges deburred 0.3 mm per ISO 13715│    │
│   │ 2. Unspecified tolerances per ISO 2768-m       │    │
│   │ 3. Inspection scope confirmed by approved order │    │
│   │ 4. Available records confirmed by order  │    │
│   │ 5. Surface finish Ra 3.2 unless specified       │    │
│   └────────────────────────────────────────────────┘    │
│                                                         │
│   ┌────────────────────────────────────────┐ ┌────────┐ │
│   │ PART NAME / DESCRIPTION                │ │ BEGA- │ │
│   │ PART NUMBER: BP-XXXX-XXXX              │ │ PUNK   │ │
│   ├──────────┬──────────┬────────────────┤ │ Logo  │ │
│   │ WEIGHT   │ MATERIAL │ SURFACE FINISH  │ │ Area  │ │
│   ├────┬─────┼────┬─────┼────┬────────────┤ │       │ │
│   │DATE│DRAWN│CHK │APPR │REV │  SCALE     │ │       │ │
│   └────┴─────┴────┴─────┴────┴────────────┘ └────────┘ │
│   Ningbo Begapunk... | www.begapunk... | +86 183...      │
└─────────────────────────────────────────────────────────┘
                    210mm
```

---

## 🔧 SOLIDWORKS 2024 导入步骤

### 第一步：导入 DXF 模板

1. 打开 **SOLIDWORKS 2024**
2. 菜单栏 → **文件 → 打开**
3. 文件类型选择 **DXF (*.dxf)**
4. 找到文件：`downloads/Begapunk_A4_Horizontal_Template.dxf`
5. 打开后选择 **输入到工程图**
6. 在对话框中选择：
   - **图纸格式/大小**：A4 (297mm × 210mm)
   - **输入为**：2D 草图 或 直接作为图纸格式

### 第二步：将 DXF 转换为 .slddrt（图纸格式模板）

这是最关键的一步，以后所有工程图直接调用。

1. DXF 打开后，框选所有图框元素（Ctrl+A）
2. 检查线条比例是否正确（应该是 mm 单位）
3. 菜单栏 → **文件 → 保存图纸格式**
4. 保存位置：
   ```
   C:\ProgramData\SolidWorks\SolidWorks 2024\lang\chinese-simplified\sheetformat\
   ```
   或者你自己的模板目录
5. 文件名：`Begapunk_A4_Horizontal.slddrt`

### 第三步：创建工程图模板（.drwdot）

.slddrt 是图纸格式，.drwdot 是工程图模板（包含图层、字体、标注样式等）。

1. 菜单栏 → **文件 → 新建 → 工程图**
2. 在图纸格式选择窗口，点击 **浏览**
3. 选择刚才保存的 `Begapunk_A4_Horizontal.slddrt`
4. 进入工程图后，设置以下图层和样式：

#### 图层设置（工具 → 图层）

| 图层名 | 颜色 | 线宽 | 用途 |
|--------|------|------|------|
| BORDER | 黑色 | 0.5mm | 图框线 |
| TITLE | 蓝色 | 0.35mm | 标题栏外框 |
| TEXT | 黑色 | 默认 | 文字注释 |
| PARAM | 灰色 | 默认 | 参数文字 |
| BRAND | 蓝色 | 默认 | 品牌名/Logo |

#### 字体设置（工具 → 选项 → 文档属性 → 尺寸/注解）

- **英文工程图推荐字体**：`Arial` 或 `Helvetica`（不要使用中文字体如宋体）
- **字号规范**：
  - 品牌名：5mm
  - 标题栏字段名：2.5mm
  - 参数值：3mm
  - 技术说明：2.2mm
  - 公司联系信息：2mm

### 第四步：保存为工程图模板

1. 菜单栏 → **文件 → 另存为**
2. 文件类型：**工程图模板 (*.drwdot)**
3. 保存到：
   ```
   C:\ProgramData\SolidWorks\SolidWorks 2024\templates\
   ```
4. 文件名：`Begapunk_A4_Horizontal.drwdot`

### 第五步：设为默认模板（可选但推荐）

1. 菜单栏 → **工具 → 选项 → 系统选项 → 默认模板**
2. 工程图：浏览到 `Begapunk_A4_Horizontal.drwdot`
3. 确定

---

## 📝 每次出图时的操作流程

### 新建工程图

1. **文件 → 新建 → 工程图**
2. 选择 `Begapunk_A4_Horizontal.drwdot`
3. 浏览 → 选择零件/装配体文件
4. 放置标准三视图 + 轴测图

### 填写标题栏

双击标题栏文字，修改：
- **PART NAME**: `2-in-2-out Rotary Joint`（英文产品名）
- **PART NUMBER**: `BP-200-0001`（Begapunk 型号）
- **WEIGHT**: `155`（单位：克）
- **MATERIAL**: `AL6061-T6 + Steel`（材质）
- **SURFACE FINISH**: `Blue Anodized / Ra 3.2`
- **SCALE**: `1:1`（或实际比例）
- **DATE**: 自动或手动填写
- **REVISION**: `A`（初版为 A，改后为 B、C...）

### 填写技术参数框

双击参数框文字，修改：
- **MODEL**: `BP-200-0001`
- **MEDIA**: `Air · Water · Oil`
- **MAX PRESSURE**: `1.0 MPa`
- **MAX SPEED**: `200 RPM`
- **TEMP RANGE**: `-20°C ~ +120°C`
- **MATERIAL / SEAL**: `AL6061 + PTFE Seal`

### 填写技术规范（左下角）

这 5 条通常是固定的，除非客户有特殊要求：
1. All sharp edges deburred 0.3 mm per ISO 13715.
2. Unspecified tolerances per ISO 2768-m (medium class).
3. Inspection scope is confirmed by the approved order.
4. Material certificates (304/316 SS, AL6061) available on request.
5. Surface finish Ra 3.2 unless otherwise specified on drawing.

---

## 🎨 品牌视觉规范

| 元素 | 规范 |
|------|------|
| **主色** | 蓝色 `#2563eb`（RGB 37, 99, 235）或 SOLIDWORKS 色号 5 |
| **品牌名** | `BEGAPUNK`（全大写） |
| **副标题** | `Precision Rotary Joint Manufacturer` |
| **字体** | Arial / Helvetica，不用衬线体 |
| **Logo** | 右下角预留位置，可以插入图片或直接用文字 Logo |

---

## ⚠️ 常见问题

### Q1: 字体显示不全或乱码
- 确保 SOLIDWORKS 使用的是 Arial/Helvetica
- 不要用中文系统默认的 "宋体" 或 "仿宋"
- 如果客户打开你的 PDF 字体丢失，出图时选择 **嵌入字体**

### Q2: DXF 导入后尺寸不对
- DXF 使用的是毫米单位
- 导入时确认选择了 **mm** 而非英寸
- 如果大了 25.4 倍，说明误识别为英寸

### Q3: 如何加公司 Logo 图片
- 标题栏右上角 "BEGAPUNK Logo Area" 是预留位置
- 插入 → 图片 → 选择 PNG（透明背景）
- 建议 Logo 尺寸：宽 20-25mm，保持比例

### Q4: 客户要求第三角投影（Third Angle）
- 欧美标准通常是 **第三角投影**（Third Angle Projection）
- 中国默认是 **第一角投影**（First Angle Projection）
- 设置：工具 → 选项 → 文档属性 → 绘图标准 → ANSI（美国）或 ISO（欧洲）

### Q5: PDF 导出设置
- 文件 → 另存为 → PDF
- 勾选 **"嵌入字体"**
- 选择 **"高质量"**（矢量模式，不是位图）
- 如果图纸有颜色，PDF 会保留

---

## 📊 模板字段速查表

| 字段 | 位置 | 填写规则 |
|------|------|---------|
| MODEL | 右上参数框第1行 | BP-系列-序号，如 BP-200-0001 |
| MEDIA | 右上参数框第2行 | Air / Water / Oil / Steam / Multi |
| MAX PRESSURE | 右上参数框第3行 | X.XX MPa 或 XXX psi |
| MAX SPEED | 右上参数框第4行 | XXXX RPM |
| TEMP RANGE | 右上参数框第5行 | -XX°C ~ +XXX°C |
| MATERIAL/SEAL | 右上参数框第6行 | 主体材质 + 密封材质 |
| PART NAME | 标题栏左上 | 英文产品描述 |
| PART NUMBER | 标题栏中上 | Begapunk 型号 |
| WEIGHT | 标题栏中行左 | 克（g），不要写 kg |
| MATERIAL | 标题栏中行中 | 材质全称 |
| SCALE | 标题栏右下 | 1:1, 1:2, 2:1 等 |
| REVISION | 标题栏下排 | A（初版）→ B → C |

---

## 🔗 相关文件

- 网站根目录：`E:\begapunk-site-v2\`
- DXF 模板：`E:\begapunk-site-v2\downloads\Begapunk_A4_Horizontal_Template.dxf`
- 示例 PDF：`E:\begapunk-site-v2\downloads\BP-200-0001.pdf`（2进2出产品）

---

**如有问题随时发我截图，我帮你调！**
