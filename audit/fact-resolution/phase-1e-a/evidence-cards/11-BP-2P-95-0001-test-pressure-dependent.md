# 冲突名称

BP-2P-95-0001 测试压力依赖冲突

## 涉及型号

网页：BP-2P-95-0001；PDF内部：BP-2P-95-0005

## 网页当前值

* 数值：12 MPa；网页同时把额定压力写为10 MPa
* 页面：`BP-2P-95-0001.html`
* 具体章节：Engineering Overview；Specifications / Max Pressure；FAQ
* 原文：`Every unit is pressure-tested at 12 MPa (20% over rating)`；`10 MPa ... tested at 12 MPa`
* 定位：HTML 第255行、第261行、第498行

## PDF当前值

* 数值：未直接写测试压力数值；通用备注写“按额定压力1.5倍进行100%压力测试”；该PDF额定压力栏为1 MPa
* 文件路径：`downloads/BP-2P-95-0001.pdf`
* PDF内部标题：BP-2P-95-0005 Rotary Joint
* PDF页码：第1页
* 原文或参数表字段：`Max. Pressure 1 MPa`；`100% pressure tested at 1.5x rated pressure`
* 图纸编号/文控号：QC-2025-0512-003
* 修订号：未标注
* 日期：2025-05-12（PDF元数据创建时间为2026-05-13）
* 可视证据：[11-BP-2P-95-0001-test-pressure-pdf-page-1.png](../evidence-images/11-BP-2P-95-0001-test-pressure-pdf-page-1.png)

## 参数表当前值

未找到该型号独立XLS/XLSX参数表。

## 其他证据

`faq.html` 第209行和第701行公开写“每个旋转接头按额定压力1.5倍测试”。若先假设网页10 MPa额定值正确，则数学推导为15 MPa；但该推导不是独立测试记录，且PDF内部型号/额定压力仍有冲突。

## 冲突说明

12 MPa与“1.5倍额定压力”规则不能在10 MPa额定值下同时成立，除非存在例外测试方法。测试压力同时依赖型号身份、额定压力、保压时间和测试介质。

## Codex不能确定的内容

不能确定12 MPa是否为该型号批准测试值，也不能把推导的15 MPa视为真实测试值。

## 需要Begapunk确认的问题

等待测试方法确认，暂不裁决。请在型号身份和额定压力确认后，提供适用的测试规范、测试介质、压力、保压时间、合格标准和例外规则。

## 选择项

本项为依赖冲突，本轮不要求在12 MPa与15 MPa之间选择。

* [ ] 等待测试方法确认，暂不裁决

## 正确值或说明



## 正确资料文件名



## 是否允许修改网站

* [ ] 允许
* [ ] 暂不允许
