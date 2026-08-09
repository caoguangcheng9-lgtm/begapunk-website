# BP-3P-S06-0001 sensor-monitored chuck case audit

Date: 2026-08-08
Status: local preparation only; not deployed
Case page: `case-bp-3p-s06-sensor-monitored-chuck.html`

## Approved case facts

- The project owner identifies the product as BP-3P-S06-0001 and the application as a sensor-monitored pneumatic chuck.
- In this customer design, three independent compressed-air circuits are assigned to clamping, unclamping and blow-off for dust or chip removal.
- The electrical slip ring provides a transfer path for external sensor signals across the stationary-to-rotating interface.
- The machine controller may use those external signals for workpiece-presence or clamped-position confirmation.
- The rotary union is a transfer component. External sensors and machine controls perform detection and logic.
- This circuit assignment is customer-specific and is not presented as a universal port map.

## Photograph evidence

| Source | Public derivative | What it supports | What it does not support |
| --- | --- | --- | --- |
| `E:/Downloads/MVIMG_20260109_094632.jpg` | `images/cases/bp-3p-s06-sensor-monitored-chuck/bp-3p-s06-chuck-installation.*` | Visible chuck installation, pneumatic tubing, electrical leads and rotating-interface integration | Pressure, speed, leakage, lifetime, sensor type, detection accuracy, machine acceptance or fail-safe behavior |
| `E:/Downloads/mmexport1783329015108.jpg` | `images/cases/bp-3p-s06-sensor-monitored-chuck/bp-3p-s06-batch-preparation.*` | Production preparation with labeled pneumatic ports and external electrical leads | Batch testing, inspection result, pass status, order quantity or proof that every visible unit was accepted |

The website derivatives were resized and written without the source EXIF metadata. The source files remain unchanged. The two photographs are not represented as the same unit, machine or order.

## Prohibited claims

- Do not state that the rotary union itself detects a workpiece or confirms clamping.
- Do not claim safety interlock, fail-safe behavior, automatic stop, detection accuracy or response time.
- Do not add unsupported pressure, speed, voltage, current, leakage, cycle or lifetime values.
- Do not call the batch photograph a test, PASS result or final inspection.
- Do not identify the customer, sensor, PLC, protocol, order size or production history without separate approved evidence.

## Localization terminology

- English: `sensor-monitored pneumatic chuck`, `clamping`, `unclamping`, `blow-off`, `external sensor signals`
- German: `sensorüberwachtes pneumatisches Spannfutter`, `Spannen`, `Lösen`, `Ausblasen`, `externe Sensorsignale`
- Japanese: `センサ監視対応空圧チャック`, `クランプ`, `アンクランプ`, `除塵用エアブロー`, `外部センサ信号`
- Russian: `пневматический патрон с контролем по датчикам`, `зажим`, `разжим`, `обдув`, `сигналы внешних датчиков`

## Publication gate

Customer authorization to publish the customer-machine installation photograph was confirmed by the project owner on 2026-08-09. This confirmation permits publication of the photograph only within the evidence boundary above; it does not convert the photograph into proof of lifetime, full product performance, machine acceptance or sensor accuracy. Clean-build and browser-QA gates remain separate requirements.
