import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const checkOnly = process.argv.includes('--check');

const rows = [
  {
    source: 'Model ranges vary. Use the current product page and approved drawing for pressure, speed, temperature, medium, and mounting limits; requirements outside published limits need engineering review.',
    de: 'Leistungsdaten und Ausführungen sind modellabhängig. Maßgeblich für zulässigen Druck, Drehzahl, Temperatur, Medien und Einbaubedingungen sind die aktuelle Produktseite und die freigegebene Zeichnung. Anforderungen außerhalb der veröffentlichten Grenzwerte bedürfen einer technischen Prüfung.',
    ja: '仕様範囲は型式により異なります。使用圧力、回転速度、温度、使用流体および取付条件の限界値については、最新の製品ページと承認図をご確認ください。掲載範囲外の要求仕様については、技術検討が必要です。',
    ru: 'Рабочие характеристики и варианты исполнения зависят от модели. Допустимые значения давления, частоты вращения, температуры, рабочей среды и условия монтажа следует уточнять на актуальной странице изделия и в согласованном чертеже. Требования, выходящие за опубликованные пределы, подлежат техническому рассмотрению.',
  },
  {
    source: 'Custom passage count, mounting, and materials can be reviewed. CAD files, drawing approval, inspection scope, price, and lead time are confirmed for the selected project and order.',
    de: 'Kundenspezifische Kanalzahlen, Einbauschnittstellen und Werkstoffe können technisch geprüft werden. CAD-Daten, Zeichnungsfreigabe, Prüfumfang, Preis und Lieferzeit werden für das jeweilige Projekt und den jeweiligen Auftrag bestätigt.',
    ja: '流路数、取付仕様および材質のカスタマイズは検討可能です。CADデータ、図面承認、検査範囲、価格および納期は、対象案件とご注文ごとに確定します。',
    ru: 'Возможна техническая проработка индивидуального количества каналов, способа монтажа и материалов. Предоставление CAD-файлов, согласование чертежа, объём контроля, цена и срок изготовления подтверждаются для конкретного проекта и заказа.',
  },
  {
    source: 'Lead time and shipping terms depend on model, quantity, customization, destination, and the accepted quotation or order.',
    de: 'Lieferzeit und Versandbedingungen richten sich nach Modell, Menge, Anpassungsumfang, Bestimmungsort sowie dem angenommenen Angebot beziehungsweise Auftrag.',
    ja: '納期および出荷条件は、型式、数量、カスタマイズ内容、仕向地、ならびに合意済みの見積条件または注文条件により異なります。',
    ru: 'Срок изготовления и условия отгрузки зависят от модели, количества, объёма доработок, пункта назначения, а также условий согласованного коммерческого предложения или подтверждённого заказа.',
  },
  {
    source: 'Warranty coverage and claim handling follow the accepted quotation, order, and applicable Terms; contact Begapunk with order and inspection details.',
    de: 'Garantieumfang und Reklamationsabwicklung richten sich nach dem angenommenen Angebot, dem Auftrag und den anwendbaren Geschäftsbedingungen. Bitte wenden Sie sich mit den Auftrags- und Prüfdaten an Begapunk.',
    ja: '保証範囲およびクレーム対応は、合意済みの見積条件、注文条件および適用される取引条件に従います。お問い合わせの際は、注文情報と検査内容をBegapunkまでお知らせください。',
    ru: 'Объём гарантии и порядок рассмотрения рекламаций определяются согласованным коммерческим предложением, заказом и применимыми условиями. При обращении в Begapunk укажите данные заказа и сведения о проведённом контроле.',
  },
  {
    source: 'STEP/IGES files may be provided for qualified projects after model and application review; format and timing are confirmed per project.',
    de: 'STEP-/IGES-Dateien können nach Prüfung von Modell und Anwendung für qualifizierte Projekte bereitgestellt werden. Dateiformat und Bereitstellungszeitpunkt werden projektspezifisch bestätigt.',
    ja: 'STEP/IGESデータは、型式および用途の確認後、対象となる案件に提供できる場合があります。ファイル形式と提供時期は案件ごとに確定します。',
    ru: 'Файлы STEP/IGES могут быть предоставлены для проектов, прошедших предварительную оценку модели и условий применения. Формат и срок предоставления согласовываются отдельно для каждого проекта.',
  },
  {
    source: 'Material and seal suitability for regulated or food-contact service requires documented review of wetted materials, cleaning chemistry, temperature, and applicable requirements; no product-level FDA compliance is claimed without configuration-specific documentation.',
    de: 'Die Eignung von Werkstoffen und Dichtungen für regulierte Anwendungen oder Anwendungen mit Lebensmittelkontakt erfordert eine dokumentierte Prüfung der medienberührten Werkstoffe, der Reinigungschemie, der Temperatur und der anwendbaren Anforderungen. Ohne konfigurationsbezogene Nachweise wird keine FDA-Konformität auf Produktebene ausgewiesen.',
    ja: '法規制が適用される用途または食品接触用途における材質・シールの適合性については、接液部材質、洗浄薬剤、使用温度および適用要件に基づく文書確認が必要です。構成ごとの裏付け資料がない限り、製品単位でFDA適合をうたうものではありません。',
    ru: 'При применении в регулируемых областях или в контакте с пищевыми продуктами пригодность материалов и уплотнений требует документированной оценки материалов, контактирующих с рабочей средой, химического состава моющих средств, температуры и применимых требований. Без документации для конкретного исполнения соответствие изделия требованиям FDA не заявляется.',
  },
  {
    source: 'Installation errors can contribute to early leakage; review torque, anti-rotation, alignment, flexible connections, filtration, and the approved test procedure.',
    de: 'Montagefehler können vorzeitige Leckagen begünstigen. Prüfen Sie Anzugsdrehmoment, Verdrehsicherung, Ausrichtung, flexible Anschlüsse, Filtration und das freigegebene Prüfverfahren.',
    ja: '取付不良は早期漏れの一因となる場合があります。締付トルク、回り止め、芯出し、フレキシブル接続、ろ過条件および承認済みの試験手順をご確認ください。',
    ru: 'Ошибки монтажа могут способствовать преждевременному появлению утечек. Проверьте момент затяжки, фиксацию от проворачивания, соосность, гибкие соединения, фильтрацию и согласованную методику испытаний.',
  },
  {
    source: 'Replacing multiple separate joints with a multi-passage body can simplify external plumbing; actual reduction in components and maintenance depends on machine design.',
    de: 'Der Ersatz mehrerer separater Drehdurchführungen durch eine Mehrkanal-Drehdurchführung kann die externe Verschlauchung vereinfachen. Die tatsächliche Reduzierung von Bauteilen und Wartungsaufwand hängt von der Maschinenkonstruktion ab.',
    ja: '複数の個別ロータリージョイントを多流路一体型ロータリージョイントに置き換えることで、外部配管を簡素化できる場合があります。部品点数や保守工数の実際の削減効果は、装置設計によって異なります。',
    ru: 'Замена нескольких отдельных вращающихся соединений одним многоканальным узлом может упростить внешнюю трубную обвязку. Фактическое сокращение числа компонентов и объёма технического обслуживания зависит от конструкции оборудования.',
  },
  {
    source: 'Minimum order quantity is confirmed for the selected model, customization scope, and quotation or order.',
    de: 'Die Mindestbestellmenge wird für das ausgewählte Modell und den vereinbarten Anpassungsumfang im jeweiligen Angebot beziehungsweise Auftrag bestätigt.',
    ja: '最低発注数量は、選定型式、カスタマイズ範囲、および見積条件または注文条件ごとに確定します。',
    ru: 'Минимальная партия подтверждается с учётом выбранной модели, объёма индивидуального исполнения и условий коммерческого предложения или заказа.',
  },
  {
    source: 'Compatible media are model-specific. Review the current product page and approved drawing; confirm wetted materials, seal compound, pressure, temperature, viscosity, cleaning chemistry, and filtration for the selected configuration.',
    de: 'Die zulässigen Medien sind modellabhängig. Prüfen Sie die aktuelle Produktseite und die freigegebene Zeichnung. Für die ausgewählte Ausführung sind die medienberührten Werkstoffe, der Dichtungswerkstoff, Druck, Temperatur, Viskosität, Reinigungschemie und Filtration zu bestätigen.',
    ja: '対応流体は型式ごとに異なります。最新の製品ページと承認図を確認し、選定仕様について、接液部材質、シール材質、圧力、温度、粘度、洗浄薬剤およびろ過条件をご確認ください。',
    ru: 'Совместимость с рабочей средой зависит от модели. Ознакомьтесь с актуальной страницей изделия и согласованным чертежом. Для выбранного исполнения необходимо подтвердить материалы, контактирующие со средой, марку материала уплотнений, давление, температуру, вязкость, химический состав моющих средств и требования к фильтрации.',
  },
  {
    source: 'Body, shaft, and seal materials vary by model and configuration. Use the current product page and approved drawing; material substitutions or regulated and food-contact service require documented engineering review.',
    de: 'Die Werkstoffe von Gehäuse, Welle und Dichtungen unterscheiden sich je nach Modell und Ausführung. Maßgeblich sind die aktuelle Produktseite und die freigegebene Zeichnung. Werkstoffänderungen sowie Anwendungen in regulierten Bereichen oder mit Lebensmittelkontakt bedürfen einer dokumentierten technischen Prüfung.',
    ja: 'ボディ、シャフトおよびシールの材質は、型式と仕様により異なります。最新の製品ページと承認図をご確認ください。材質変更、法規制が適用される用途または食品接触用途については、文書に基づく技術審査が必要です。',
    ru: 'Материалы корпуса, вала и уплотнений зависят от модели и исполнения. Руководствуйтесь актуальной страницей изделия и согласованным чертежом. Замена материалов, применение в регулируемых областях или в контакте с пищевыми продуктами требуют документированной инженерной оценки.',
  },
  {
    source: 'Threaded and flange mounting are available on selected models. Confirm the exact interface on the current product page and approved drawing, and use flexible connections unless the approved installation specifies otherwise.',
    de: 'Gewinde- und Flanschbefestigungen sind bei ausgewählten Modellen verfügbar. Bestätigen Sie die genaue Anschlussschnittstelle anhand der aktuellen Produktseite und der freigegebenen Zeichnung. Verwenden Sie flexible Leitungsanschlüsse, sofern die freigegebene Montageanweisung nichts anderes vorgibt.',
    ja: 'ねじ取付およびフランジ取付は、一部の型式で選択できます。最新の製品ページと承認図で正確な取合い仕様をご確認ください。承認済みの取付要領に別段の指定がない限り、フレキシブル接続を使用してください。',
    ru: 'Резьбовой и фланцевый монтаж предусмотрен для отдельных моделей. Точное присоединительное исполнение следует подтвердить по актуальной странице изделия и согласованному чертежу. Если иное не указано в согласованной инструкции по монтажу, используйте гибкие соединения.',
  },
  {
    source: 'Potential contributors to early leakage include rigid piping, misalignment or side load, contamination, operation outside approved limits, and unsuitable anti-rotation. Review the approved installation and inspection procedure.',
    de: 'Starre Rohrleitungen, Fehlausrichtung oder Querkräfte, Verunreinigungen, der Betrieb außerhalb freigegebener Grenzwerte und eine ungeeignete Verdrehsicherung können vorzeitige Leckagen begünstigen. Prüfen Sie die freigegebene Montage- und Prüfanweisung.',
    ja: '早期漏れの要因となり得るものには、剛性配管、芯ずれまたは横荷重、異物混入、承認範囲外での運転、および不適切な回り止めがあります。承認済みの取付要領と検査手順をご確認ください。',
    ru: 'Возможными факторами преждевременного появления утечек могут быть жёсткие трубопроводы, несоосность или боковая нагрузка, загрязнение, эксплуатация за пределами согласованных ограничений и ненадлежащая фиксация от проворачивания. Проверьте соблюдение согласованных инструкций по монтажу и процедуре контроля.',
  },
  {
    source: 'Repairability and seal-kit availability depend on the model and its condition. Contact Begapunk with the model, serial or order details, operating conditions, and inspection findings before repair.',
    de: 'Ob eine Reparatur möglich und ein Dichtungssatz verfügbar ist, hängt vom Modell und vom Zustand des Produkts ab. Wenden Sie sich vor einer Reparatur mit Modellbezeichnung, Seriennummer oder Auftragsdaten, Betriebsbedingungen und Prüfergebnissen an Begapunk.',
    ja: '修理可否とシールキットの供給可否は、型式と製品状態により異なります。修理前に、型式、シリアル番号または注文情報、使用条件および点検結果を添えてBegapunkまでお問い合わせください。',
    ru: 'Возможность ремонта и наличие комплектов уплотнений зависят от модели и состояния изделия. До начала ремонта обратитесь в Begapunk, указав модель, серийный номер или данные заказа, условия эксплуатации и результаты осмотра или контроля.',
  },
  {
    source: 'Filtration requirements are model- and medium-specific. Confirm the required grade for the selected configuration; a clean supply helps reduce abrasive wear, but no universal micron value is claimed here.',
    de: 'Die Anforderungen an die Filtration sind modell- und medienabhängig. Bestätigen Sie die erforderliche Filterfeinheit beziehungsweise Filterklasse für die ausgewählte Ausführung. Eine saubere Medienversorgung trägt zur Verringerung abrasiven Verschleißes bei; ein allgemeingültiger µm-Wert wird hier jedoch nicht angegeben.',
    ja: '必要なろ過条件は、型式および使用流体により異なります。選定仕様に必要なろ過等級をご確認ください。清浄な供給流体は異物による摩耗の低減に役立ちますが、本項では全製品に共通する一律のろ過精度（µm）を定めていません。',
    ru: 'Требования к фильтрации зависят от модели и рабочей среды. Уточните требуемый класс или тонкость фильтрации для выбранного исполнения. Чистая подача рабочей среды способствует снижению абразивного износа, однако универсальное значение в микронах здесь не заявляется.',
  },
  {
    source: 'Begapunk aims to respond promptly to complete technical inquiries. Response time depends on the application complexity and the information provided. STEP/IGES availability and delivery timing are confirmed for the selected model, configuration, and project.',
    de: 'Begapunk ist bestrebt, vollständige technische Anfragen zeitnah zu beantworten. Die Antwortzeit hängt von der Komplexität der Anwendung und den bereitgestellten Informationen ab. Verfügbarkeit und Bereitstellungszeitpunkt von STEP-/IGES-Dateien werden für das ausgewählte Modell, die Ausführung und das jeweilige Projekt bestätigt.',
    ja: 'Begapunkでは、必要な情報が揃った技術お問い合わせに迅速に回答できるよう努めています。回答時間は、用途の複雑さとご提供いただいた情報により異なります。STEP/IGESデータの提供可否と提供時期は、選定型式、仕様および案件ごとに確定します。',
    ru: 'Begapunk стремится оперативно отвечать на технические запросы, содержащие все необходимые данные. Срок ответа зависит от сложности применения и полноты предоставленной информации. Возможность и срок предоставления файлов STEP/IGES подтверждаются для выбранной модели, исполнения и конкретного проекта.',
  },
  {
    source: '<strong>Requirements above 1 MPa</strong> — this standard model is limited to 1 MPa; a separately verified configuration and engineering review are required',
    de: '<strong>Anforderungen über 1 MPa</strong> — dieses Standardmodell ist auf 1 MPa begrenzt; eine separat verifizierte Ausführung und eine technische Prüfung sind erforderlich',
    ja: '<strong>1 MPaを超える要件</strong> — この標準型式は1 MPaを上限とします。1 MPaを超える場合は、別仕様での個別検証と技術審査が必要です',
    ru: '<strong>Требования свыше 1 МПа</strong> — данная стандартная модель рассчитана не более чем на 1 МПа; требуется отдельно проверенное исполнение и инженерная оценка',
  },
  {
    source: '❌ Above the published rating',
    de: '❌ Oberhalb der veröffentlichten Nennwerte',
    ja: '❌ 公開仕様値を超える条件',
    ru: '❌ Выше опубликованных номинальных значений',
  },
  {
    source: 'No higher-pressure rating is claimed for this model; a separate configuration must be verified',
    de: 'Für dieses Modell wird keine höhere Druckfreigabe ausgewiesen; eine separate Ausführung muss verifiziert werden',
    ja: 'この型式について、これを超える圧力定格は表示していません。別仕様での検証が必要です',
    ru: 'Для данной модели более высокое допустимое давление не заявляется; требуется проверка отдельного исполнения',
  },
  {
    source: '2-in-2-out, 1 MPa, clean environment',
    de: '2 Eingänge/2 Ausgänge, 1 MPa, saubere Umgebung',
    ja: '2入力・2出力、1 MPa、清浄環境',
    ru: '2 входа/2 выхода, 1 МПа, чистая среда',
  },
  {
    source: '⚠️ More passages than required',
    de: '⚠️ Mehr Kanäle als erforderlich',
    ja: '⚠️ 必要以上の流路数',
    ru: '⚠️ Больше каналов, чем требуется',
  },
  {
    source: 'Two-passage alternative; price and final suitability are confirmed by quotation and application review',
    de: 'Alternative mit zwei Kanälen; Preis und endgültige Eignung werden im Angebot und durch die Anwendungsprüfung bestätigt',
    ja: '2流路の代替案。価格と最終的な適合可否は、見積書および用途審査で確定します',
    ru: 'Двухканальное альтернативное исполнение; цена и окончательная пригодность подтверждаются коммерческим предложением и анализом применения',
  },
  {
    source: '<strong>8 passages in one body:</strong> Can replace multiple separate rotary unions and simplify external plumbing; the actual reduction in components and maintenance depends on the machine design',
    de: '<strong>Acht Kanäle in einem Gehäuse:</strong> Kann mehrere separate Drehdurchführungen ersetzen und die externe Verschlauchung vereinfachen; die tatsächliche Reduzierung von Bauteilen und Wartungsaufwand hängt von der Maschinenkonstruktion ab',
    ja: '<strong>1つのボディに8流路：</strong> 複数の個別ロータリージョイントを置き換え、外部配管を簡素化できます。ただし、部品点数と保守工数の実際の削減効果は装置設計によって異なります',
    ru: '<strong>Восемь каналов в одном корпусе:</strong> Может заменить несколько отдельных вращающихся соединений и упростить внешнюю трубную обвязку; фактическое сокращение числа компонентов и объёма технического обслуживания зависит от конструкции оборудования',
  },
  {
    source: 'Replacing multiple separate joints with a multi-passage body can simplify external plumbing; actual reduction in components and maintenance depends on machine design. <a href="application-automation-rotary-tables.html">Read application guide →</a>',
    de: 'Der Ersatz mehrerer separater Drehdurchführungen durch eine Mehrkanal-Drehdurchführung kann die externe Verschlauchung vereinfachen; die tatsächliche Reduzierung von Bauteilen und Wartungsaufwand hängt von der Maschinenkonstruktion ab. <a href="application-automation-rotary-tables.html">Anwendungsleitfaden lesen →</a>',
    ja: '複数の個別ロータリージョイントを多流路一体型ロータリージョイントに置き換えることで、外部配管を簡素化できる場合があります。部品点数や保守工数の実際の削減効果は、装置設計によって異なります。<a href="application-automation-rotary-tables.html">用途ガイドを読む →</a>',
    ru: 'Замена нескольких отдельных вращающихся соединений одним многоканальным узлом может упростить внешнюю трубную обвязку; фактическое сокращение числа компонентов и объёма технического обслуживания зависит от конструкции оборудования. <a href="application-automation-rotary-tables.html">Руководство по применению →</a>',
  },
  {
    source: '<strong>Typical requirement:</strong> Passage count, pressure, mounting envelope, wetted materials, cleaning chemistry, and applicable food-contact requirements must be reviewed for the selected configuration. No product-level FDA compliance is claimed unless documented.',
    de: '<strong>Typische Anforderungen:</strong> Kanalzahl, Druck, Einbauraum, medienberührte Werkstoffe, Reinigungschemie und anwendbare Anforderungen für Lebensmittelkontakt müssen für die ausgewählte Ausführung geprüft werden. Ohne konfigurationsbezogene Nachweise wird keine FDA-Konformität auf Produktebene ausgewiesen.',
    ja: '<strong>代表的な確認項目：</strong> 選定仕様について、流路数、圧力、取付スペース、接液部材質、洗浄薬剤および適用される食品接触要件を確認する必要があります。構成ごとの裏付け資料がない限り、製品単位でFDA適合をうたうものではありません。',
    ru: '<strong>Типовые требования:</strong> Для выбранного исполнения необходимо проверить число каналов, давление, монтажные габариты, материалы, контактирующие со средой, химический состав моющих средств и применимые требования к контакту с пищевыми продуктами. Без документации для конкретного исполнения соответствие изделия требованиям FDA не заявляется.',
  },
  {
    source: '<strong>Typical requirement:</strong> Passage count, pressure, mounting envelope, wetted materials, cleaning chemistry, and applicable food-contact requirements must be reviewed for the selected configuration. No product-level FDA compliance is claimed without configuration-specific documentation.',
    de: '<strong>Typische Anforderungen:</strong> Kanalzahl, Druck, Einbauraum, medienberührte Werkstoffe, Reinigungschemie und anwendbare Anforderungen für Lebensmittelkontakt müssen für die ausgewählte Ausführung geprüft werden. Ohne konfigurationsbezogene Nachweise wird keine FDA-Konformität auf Produktebene ausgewiesen.',
    ja: '<strong>代表的な確認項目：</strong> 選定仕様について、流路数、圧力、取付スペース、接液部材質、洗浄薬剤および適用される食品接触要件を確認する必要があります。構成ごとの裏付け資料がない限り、製品単位でFDA適合をうたうものではありません。',
    ru: '<strong>Типовые требования:</strong> Для выбранного исполнения необходимо проверить число каналов, давление, монтажные габариты, материалы, контактирующие со средой, химический состав моющих средств и применимые требования к контакту с пищевыми продуктами. Без документации для конкретного исполнения соответствие изделия требованиям FDA не заявляется.',
  },
  {
    source: 'Pneumatic torque control and vacuum hold-down for beverage and pharmaceutical rotary turrets. Wetted materials, cleaning chemistry, and applicable requirements must be confirmed for the selected configuration.',
    de: 'Pneumatische Drehmomentsteuerung und Vakuumfixierung für rotierende Türme in Getränke- und Pharmaanlagen. Medienberührte Werkstoffe, Reinigungschemie und anwendbare Anforderungen müssen für die ausgewählte Ausführung bestätigt werden.',
    ja: '飲料・製薬設備のロータリータレット向け空気圧トルク制御および真空吸着保持。選定仕様について、接液部材質、洗浄薬剤および適用要件を確認する必要があります。',
    ru: 'Пневматическое управление крутящим моментом и вакуумная фиксация для роторных турелей в оборудовании для напитков и фармацевтической промышленности. Для выбранного исполнения необходимо подтвердить материалы, контактирующие со средой, химический состав моющих средств и применимые требования.',
  },
  {
    source: '(2-passage), and',
    de: '(2-kanalig) und',
    ja: '（2流路）および',
    ru: '(2 канала) и',
  },
  {
    source: '(3-passage compact). Final material and compliance suitability require documented configuration review.',
    de: '(kompakte 3-Kanal-Ausführung). Die endgültige Eignung hinsichtlich Werkstoffen und regulatorischen Anforderungen bedarf einer dokumentierten Prüfung der konkreten Ausführung.',
    ja: '（コンパクト3流路仕様）。材質および規制適合性の最終判断には、対象構成について文書に基づく審査が必要です。',
    ru: '(компактное 3-канальное исполнение). Окончательная оценка пригодности материалов и соответствия требованиям требует документированной проверки конкретного исполнения.',
  },
  {
    source: 'Models to review',
    de: 'Zu prüfende Modelle',
    ja: '検討対象型式',
    ru: 'Модели для рассмотрения',
  },
  {
    source: 'Installation errors can contribute to premature wear or leakage. Review seven common risks involving mounting, alignment, piping, filtration, and commissioning.',
    de: 'Montagefehler können vorzeitigen Verschleiß oder Leckagen begünstigen. Prüfen Sie sieben typische Risiken im Zusammenhang mit Befestigung, Ausrichtung, Rohr- und Schlauchleitungen, Filtration und Inbetriebnahme.',
    ja: '取付不良は早期摩耗や漏れの一因となる場合があります。取付、芯出し、配管、ろ過および立上げに関する7つの一般的なリスクをご確認ください。',
    ru: 'Ошибки монтажа могут способствовать преждевременному износу или появлению утечек. Проверьте семь распространённых рисков, связанных с креплением, соосностью, трубопроводами, фильтрацией и вводом в эксплуатацию.',
  },
  {
    source: 'Installation errors can contribute to early leakage. Compare threaded and flange mounting, torque, anti-rotation, alignment, and the approved inspection procedure.',
    de: 'Montagefehler können vorzeitige Leckagen begünstigen. Vergleichen Sie Gewinde- und Flanschmontage und prüfen Sie Anzugsdrehmoment, Verdrehsicherung, Ausrichtung sowie das freigegebene Prüfverfahren.',
    ja: '取付不良は早期漏れの一因となる場合があります。ねじ取付とフランジ取付を比較し、締付トルク、回り止め、芯出しおよび承認済みの検査手順をご確認ください。',
    ru: 'Ошибки монтажа могут способствовать преждевременному появлению утечек. Сравните резьбовой и фланцевый монтаж и проверьте момент затяжки, фиксацию от проворачивания, соосность и согласованную процедуру контроля.',
  },
  {
    source: 'Installation errors can contribute to early leakage. Review torque, anti-rotation, alignment, flexible connections, filtration, and the approved test procedure.',
    de: 'Montagefehler können vorzeitige Leckagen begünstigen. Prüfen Sie Anzugsdrehmoment, Verdrehsicherung, Ausrichtung, flexible Anschlüsse, Filtration und das freigegebene Prüfverfahren.',
    ja: '取付不良は早期漏れの一因となる場合があります。締付トルク、回り止め、芯出し、フレキシブル接続、ろ過条件および承認済みの試験手順をご確認ください。',
    ru: 'Ошибки монтажа могут способствовать преждевременному появлению утечек. Проверьте момент затяжки, фиксацию от проворачивания, соосность, гибкие соединения, фильтрацию и согласованную методику испытаний.',
  },
  {
    source: '<strong>Regulated or food-contact service</strong> → document the complete wetted-material list, seal compound, cleaning chemistry, temperature, and applicable requirements before selection',
    de: '<strong>Regulierte Anwendungen oder Anwendungen mit Lebensmittelkontakt</strong> → dokumentieren Sie vor der Auswahl die vollständige Liste der medienberührten Werkstoffe, den Dichtungswerkstoff, die Reinigungschemie, die Temperatur und die anwendbaren Anforderungen',
    ja: '<strong>法規制対象用途または食品接触用途</strong> → 選定前に、接液部材質の完全な一覧、シール材質、洗浄薬剤、温度および適用要件を文書化してください',
    ru: '<strong>Применение в регулируемых областях или в контакте с пищевыми продуктами</strong> → до выбора исполнения документально зафиксируйте полный перечень материалов, контактирующих со средой, марку материала уплотнений, химический состав моющих средств, температуру и применимые требования',
  },
  {
    source: '✅ CAD Support After Application Review',
    de: '✅ CAD-Unterstützung nach Anwendungsprüfung',
    ja: '✅ 用途審査後のCADサポート',
    ru: '✅ Поддержка CAD после анализа применения',
  },
  {
    source: 'CAD Support After Application Review',
    de: 'CAD-Unterstützung nach Anwendungsprüfung',
    ja: '用途審査後のCADサポート',
    ru: 'Поддержка CAD после анализа применения',
  },
  {
    source: 'Engineering review',
    de: 'Technische Prüfung',
    ja: '技術審査',
    ru: 'Инженерная оценка',
  },
];

const editorialRows = [
  {
    pages: ['BP-3P-0006.html', 'BP-3P-0007.html'],
    id: '856aff6a43bfb285',
    de: 'G1/8-Gewinde, 1 MPa, zwei Eingänge / drei Ausgänge',
    ja: 'G1/8ねじ、1 MPa、2入力・3出力',
    ru: 'Резьба G1/8, 1 МПа, два входа / три выхода',
  },
];

let changed = 0;
for (const language of ['de', 'ja', 'ru']) {
  const filePath = path.join(root, 'i18n', 'overrides', `${language}.json`);
  const before = await fs.readFile(filePath, 'utf8');
  const current = JSON.parse(before);
  const missing = rows.filter((row) => current[row.source] !== row[language]);
  if (checkOnly) {
    if (missing.length) throw new Error(`${language}: ${missing.length} approved AI-trust translation(s) are not synchronized.`);
    continue;
  }
  if (!missing.length) continue;
  for (const row of rows) current[row.source] = row[language];
  await fs.writeFile(filePath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  changed += 1;
}

for (const language of ['de', 'ja', 'ru']) {
  const filePath = path.join(root, 'i18n', 'editorial', `${language}.json`);
  const before = await fs.readFile(filePath, 'utf8');
  const current = JSON.parse(before);
  const missing = editorialRows.flatMap((row) => row.pages
    .filter((page) => current[page]?.[row.id] !== row[language])
    .map((page) => ({ row, page })));
  if (checkOnly) {
    if (missing.length) throw new Error(`${language}: ${missing.length} approved page-specific AI-trust translation(s) are not synchronized.`);
    continue;
  }
  if (!missing.length) continue;
  for (const { row, page } of missing) {
    current[page] ??= {};
    current[page][row.id] = row[language];
  }
  await fs.writeFile(filePath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  changed += 1;
}

console.log(checkOnly
  ? `Approved AI-trust translations are synchronized for ${rows.length} source statements and ${editorialRows.length} page-specific statement group(s) in three languages.`
  : `Synchronized approved AI-trust translations in ${changed} localization file(s).`);
