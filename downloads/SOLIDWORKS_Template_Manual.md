# Begapunk 外贸工程图模板 — SOLIDWORKS 2024 手工创建版

> 如果 DXF 导入有问题，直接用这份手册在 SOLIDWORKS 里手动画，**15分钟搞定**，以后一劳永逸。

---

## 📐 整体布局（A4 横向）

```
纸张尺寸：297mm × 210mm
内框边距：10mm（四周都留 10mm）
```

```
┌──────────────────────────────────────────────────────────────────┐  ← 297mm
│                                                                  │
│  Ningbo Begapunk Pneumatic Components Co., Ltd.                   │  ← y=200
│  www.begapunk-rotaryjoint.com | sales@... | +86 183...          │  ← y=196
│                                                                  │
│   ┌──────────────┐                                              │
│   │ 技术参数框    │         【视图区域：放零件的三视图+轴测图】   │
│   │ 85mm × 55mm  │                                              │
│   │              │                                              │
│   │ MODEL:       │                                              │
│   │ MEDIA:       │                                              │
│   │ MAX PRESSURE:│                                              │
│   │ MAX SPEED:   │                                              │
│   │ TEMP RANGE:  │                                              │
│   │ MATERIAL:    │                                              │
│   └──────────────┘                                              │
│                                                                  │
│   ┌────────────────────────────────────────────────────┐        │
│   │ TECHNICAL NOTES:                                    │        │
│   │ 1. All sharp edges deburred 0.3 mm per ISO 13715   │        │
│   │ 2. Unspecified tolerances per ISO 2768-m           │        │
│   │ 3. Inspection scope confirmed by approved order     │        │
│   │ 4. Available records confirmed by order      │        │
│   │ 5. Surface finish Ra 3.2 unless specified           │        │
│   └────────────────────────────────────────────────────┘        │
│   左下角：x=10, y=10，宽140mm，高28mm                             │
│                                                                  │
│   ┌────────────────────────────────────┬────────────┐           │
│   │ PART NAME / DESCRIPTION              │  BEGA-    │           │
│   │ PART NUMBER: BP-XXXX-XXXX            │  PUNK     │           │
│   ├────────┬────────┬──────────────────┤  Logo     │           │
│   │ WEIGHT │MATERIAL│ SURFACE FINISH     │  Area     │           │
│   ├────┬───┼────┬───┼────┬───────────────┤           │           │
│   │DATE│DWN│CHK │APP│REV │     SCALE     │           │           │
│   └────┴───┴────┴───┴────┴───────────────┴────────────┘           │
│   右下角：x=107, y=10，宽180mm，高40mm                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                            210mm
```

---

## 🔧 Step by Step 手动画法

### 第一步：新建工程图 + 选 A4 横向

1. SOLIDWORKS → **文件 → 新建 → 工程图**
2. 在图纸格式选择窗口，选 **A4 (297mm × 210mm)**
3. 如果没有合适的，点击 **