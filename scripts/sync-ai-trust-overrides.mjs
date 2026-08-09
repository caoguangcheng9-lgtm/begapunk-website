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
    source: 'Body, shaft, and seal materials vary by model and configuration. Use the current product page and approved drawing, and confirm any material substitution or regulated or food-contact requirement for the selected project.',
    de: 'Die Werkstoffe von Gehäuse, Welle und Dichtungen unterscheiden sich je nach Modell und Ausführung. Maßgeblich sind die aktuelle Produktseite und die freigegebene Zeichnung. Bestätigen Sie Werkstoffänderungen sowie Anforderungen für regulierte Bereiche oder Lebensmittelkontakt für das ausgewählte Projekt.',
    ja: 'ボディ、シャフトおよびシールの材質は、型式と仕様により異なります。最新の製品ページと承認図を確認し、材質変更、規制対象用途または食品接触用途の要求を選定案件ごとに確定してください。',
    ru: 'Материалы корпуса, вала и уплотнений зависят от модели и исполнения. Руководствуйтесь актуальной страницей изделия и согласованным чертежом, а замену материалов и требования для регулируемых областей или контакта с пищевой продукцией подтверждайте для выбранного проекта.',
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
    source: 'Filtration requirements are model- and medium-specific. Confirm the required grade for the selected configuration; a clean supply helps reduce abrasive wear.',
    de: 'Die Anforderungen an die Filtration sind modell- und medienabhängig. Bestätigen Sie die erforderliche Filterfeinheit beziehungsweise Filterklasse für die ausgewählte Ausführung. Eine saubere Medienversorgung trägt zur Verringerung abrasiven Verschleißes bei.',
    ja: '必要なろ過条件は、型式および使用流体により異なります。選定仕様に必要なろ過等級をご確認ください。清浄な供給流体は異物による摩耗の低減に役立ちます。',
    ru: 'Требования к фильтрации зависят от модели и рабочей среды. Уточните требуемый класс или тонкость фильтрации для выбранного исполнения. Чистая подача рабочей среды способствует снижению абразивного износа.',
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

const toneRows = [
  {
    legacySource: 'Handheld pneumatic tools — tightening guns, grinders, sanders — twist the air hose with every rotation. Without a swivel, the hose kinks, restricts airflow, and fatigues at the fitting. A compact air swivel at the tool inlet extends hose life by 3–5×.',
    source: 'Handheld pneumatic tools — tightening guns, grinders, sanders — can twist the air hose with every rotation. A compact air swivel at the tool inlet helps prevent kinks, airflow restriction, and fatigue at the fitting.',
    de: 'Handgeführte Pneumatikwerkzeuge – Schrauber, Schleifer und Poliergeräte – können den Luftschlauch bei jeder Drehbewegung verdrehen. Ein kompakter Luftdrehanschluss am Werkzeugeingang hilft, Knicke, Durchflussbeschränkungen und Ermüdung an der Verschraubung zu vermeiden.',
    ja: '手持ち式の空圧工具（締付工具、グラインダー、サンダー）では、回転動作のたびにエアホースがねじれることがあります。工具入口に小型エアスイベルを設けることで、ホースの折れ、流量低下、継手部の疲労を抑えやすくなります。',
    ru: 'При работе ручного пневмоинструмента — гайковёртов, шлифовальных машин и орбитальных шлифмашин — воздушный шланг может скручиваться при каждом вращательном движении. Компактный воздушный шарнир на входе инструмента помогает предотвратить перегибы, ограничение расхода и усталостное повреждение в зоне фитинга.',
  },
  {
    legacySource: 'Welding turntables and pipe rotators operate in environments filled with spatter, grinding dust, and vibration. Standard rotary joints fail within weeks because dust enters the bearing and side loads destroy the seal.',
    source: 'Welding turntables and pipe rotators operate in environments with weld spatter, grinding dust, and vibration. Dust ingress and side loads can accelerate wear; review shielding, bearing protection, hose routing, and external loads for the actual installation.',
    de: 'Schweißdrehtische und Rohrrotatoren arbeiten in Umgebungen mit Schweißspritzern, Schleifstaub und Vibrationen. Staubeintrag und Querkräfte können den Verschleiß beschleunigen; deshalb sind Abschirmung, Lagerabdichtung, Schlauchführung und äußere Lasten für den tatsächlichen Einbau zu prüfen.',
    ja: '溶接用回転テーブルやパイプローテーターは、スパッタ、研削粉じん、振動のある環境で使用されます。粉じんの侵入や横荷重は摩耗を早めることがあるため、実際の取付条件に合わせて、遮へい、軸受保護、ホース配管、外力を確認してください。',
    ru: 'Сварочные поворотные столы и трубные вращатели работают в условиях брызг металла, шлифовальной пыли и вибрации. Попадание пыли и боковые нагрузки могут ускорять износ, поэтому для фактической установки следует проверить экранирование, защиту подшипников, прокладку шлангов и внешние нагрузки.',
  },
  {
    legacySource: 'Single-passage air swivels for handheld tightening guns, grinders, and sanders. Extends hose life 3–5× by preventing twist and kinks.',
    source: 'Single-passage air swivels for handheld tightening guns, grinders, and sanders help reduce hose twisting, kinks, and fitting fatigue.',
    de: 'Einkanal-Luftdrehanschlüsse für handgeführte Schrauber, Schleifer und Poliergeräte helfen, Schlauchverdrehung, Knicke und Ermüdung an der Verschraubung zu reduzieren.',
    ja: '手持ち式の締付工具、グラインダー、サンダー向け1流路エアスイベルは、ホースのねじれ、折れ、継手部の疲労を抑えるのに役立ちます。',
    ru: 'Одноканальные воздушные шарниры для ручных гайковёртов, шлифовальных машин и орбитальных шлифмашин помогают уменьшить скручивание и перегибы шланга, а также нагрузку на фитинг.',
  },
  {
    legacySource: 'Separate vacuum and compressed-air channels for suction and release air on rotary packaging turrets. Zero cross-contamination.',
    source: 'Separate vacuum and compressed-air channels help keep extraction and release-air functions independent on rotary packaging turrets.',
    de: 'Getrennte Vakuum- und Druckluftkanäle helfen, Absaug- und Löseluftfunktionen an rotierenden Verpackungskarussells unabhängig zu führen.',
    ja: '真空と圧縮空気を別流路にすることで、回転式包装タレットの吸引機能とリリースエア機能を独立して構成しやすくなります。',
    ru: 'Раздельные вакуумные и пневматические каналы помогают независимо реализовать функции вакуумирования и подачи воздуха для освобождения на вращающихся упаковочных каруселях.',
  },
  {
    legacySource: '<strong>Reduces leak points by 70%:</strong> One BP-1P-0006 replaces 6 external T-fittings (each with 2 potential leak points), consolidating 12 connections into 1 rotating component',
    source: '<strong>Six outlets from one inlet:</strong> One BP-1P-0006 can replace six external T-fittings and consolidate the pneumatic distribution into one rotating component.',
    de: '<strong>Sechs Ausgänge aus einem Eingang:</strong> Eine BP-1P-0006 kann sechs externe T-Stücke ersetzen und die pneumatische Verteilung in einem rotierenden Bauteil zusammenfassen.',
    ja: '<strong>1入力から6出力：</strong> BP-1P-0006 1台で外部T継手6個を置き換え、空圧分配を1つの回転部品に集約できます。',
    ru: '<strong>Шесть выходов от одного входа:</strong> Один BP-1P-0006 может заменить шесть внешних тройников и объединить пневматическое распределение в одном вращающемся компоненте.',
  },
  {
    legacySource: '<strong>Zero cross-talk:</strong> Independent passages prevent pressure interference — perfect for clamp + unclamp on compact rotary tables',
    source: '<strong>Dual independent passages:</strong> Two separately sealed air passages support clamp and release functions on compact rotary tables without an external rotating manifold.',
    de: '<strong>Zwei getrennt abgedichtete Kanäle:</strong> Zwei Luftkanäle unterstützen Spann- und Lösefunktionen an kompakten Rundtischen ohne externen rotierenden Verteiler.',
    ja: '<strong>独立してシールされた2流路：</strong> 2本の空気流路で、小型回転テーブルのクランプ・アンクランプ機能を外付け回転マニホールドなしで構成できます。',
    ru: '<strong>Два раздельно уплотнённых канала:</strong> Два воздушных канала обеспечивают зажим и разжим на компактных поворотных столах без внешнего вращающегося коллектора.',
  },
  {
    legacySource: '<strong>6mm bore for higher flow:</strong> 2.25× larger flow area than 4mm models, reducing pressure drop by up to 40% at the same flow rate',
    source: '<strong>6 mm passage for higher flow:</strong> The larger passage can reduce pressure drop compared with 4 mm variants; confirm actual flow and pressure drop for the complete pneumatic system.',
    de: '<strong>6-mm-Kanal für höheren Durchfluss:</strong> Der größere Kanal kann den Druckverlust gegenüber 4-mm-Ausführungen verringern; tatsächlichen Durchfluss und Druckverlust für das vollständige Pneumatiksystem bestätigen.',
    ja: '<strong>高流量向け6 mm流路：</strong> 4 mm仕様と比べて圧力損失を低減できる場合があります。装置全体の実流量と圧力損失をご確認ください。',
    ru: '<strong>Канал 6 мм для повышенного расхода:</strong> Более крупный канал может снизить падение давления по сравнению с вариантами 4 мм; фактический расход и падение давления необходимо подтвердить для всей пневмосистемы.',
  },
  {
    legacySource: '<strong>Pneumatic + electric in one:</strong> 3 air passages + 6 electrical circuits in a single Ø54mm body, eliminating a separate slip ring and reducing wiring complexity by 40%',
    source: '<strong>Pneumatic + electric in one body:</strong> Three air passages and six electrical circuits are integrated into one Ø54 mm flange-mounted body, avoiding a separate slip-ring assembly and simplifying machine wiring.',
    de: '<strong>Pneumatik und Elektrik in einem Gehäuse:</strong> Drei Luftkanäle und sechs Stromkreise sind in einem flanschmontierten Gehäuse Ø54 mm integriert. Dadurch entfällt eine separate Schleifringbaugruppe und die Maschinenverdrahtung wird vereinfacht.',
    ja: '<strong>空圧と電気を一体化：</strong> 3流路の空気回路と6回路の電気回路をØ54 mmのフランジ取付ボディに統合し、別体スリップリングを不要にして装置配線を簡素化します。',
    ru: '<strong>Пневматика и электрические цепи в одном корпусе:</strong> Три воздушных канала и шесть электрических цепей объединены в одном фланцевом корпусе Ø54 мм, что позволяет обойтись без отдельного токосъёмника и упростить проводку станка.',
  },
  {
    legacySource: '<strong>Si3N4 ceramic seal:</strong> Silicon nitride ceramic provides 3× the hardness of steel and 10× the wear resistance of standard PTFE, extending seal life 2× in abrasive media',
    source: '<strong>Si3N4 ceramic seal option:</strong> Silicon nitride ceramic is used where the selected medium and contamination profile call for a hard seal face; confirm material compatibility and duty conditions before selection.',
    de: '<strong>Si3N4-Keramikdichtung als Option:</strong> Siliziumnitridkeramik wird eingesetzt, wenn Medium und Verschmutzungsprofil eine harte Dichtfläche erfordern; Werkstoffverträglichkeit und Betriebsbedingungen vor der Auswahl bestätigen.',
    ja: '<strong>Si3N4セラミックシールの選択肢：</strong> 使用流体や異物条件に硬質シール面が必要な場合に窒化ケイ素セラミックを使用します。選定前に材質適合性と運転条件をご確認ください。',
    ru: '<strong>Вариант с керамическим уплотнением Si3N4:</strong> Керамика из нитрида кремния применяется, когда выбранная рабочая среда и загрязнение требуют твёрдой поверхности уплотнения; до выбора подтвердите совместимость материалов и режим эксплуатации.',
  },
];

const productHighlightRows = [
  {
    legacySource: '<strong>Single passage simplicity:</strong> One air line in, one air line out — no channel cross-contamination risk, no complex manifold plumbing',
    source: '<strong>Single-passage simplicity:</strong> One air line in and one air line out keep the pneumatic connection straightforward without a multi-channel manifold.',
    de: '<strong>Einfache Einkanal-Ausführung:</strong> Ein Lufteingang und ein Luftausgang halten den Pneumatikanschluss ohne Mehrkanalverteiler übersichtlich.',
    ja: '<strong>シンプルな1流路構成：</strong> 空気の入口と出口を各1つにすることで、多流路マニホールドを使わず簡潔に接続できます。',
    ru: '<strong>Простая одноканальная схема:</strong> Один вход и один выход воздуха обеспечивают понятное пневматическое подключение без многоканального коллектора.',
  },
  {
    legacySource: '<strong>Two independent passages:</strong> Clamp and unclamp, or gripper and vacuum, with zero pressure interference — no T-fitting leaks or back-pressure drops',
    source: '<strong>Two separately sealed passages:</strong> Supports clamp and unclamp, or gripper and vacuum, through two independent flow paths in one rotating body.',
    de: '<strong>Zwei getrennt abgedichtete Kanäle:</strong> Unterstützt Spannen und Lösen oder Greifer und Vakuum über zwei unabhängige Strömungswege in einem Drehkörper.',
    ja: '<strong>独立してシールされた2流路：</strong> 1つの回転体内の独立した2つの流路で、クランプ／アンクランプまたはグリッパ／真空を構成できます。',
    ru: '<strong>Два раздельно уплотнённых канала:</strong> Обеспечивают зажим и разжим либо работу захвата и вакуума по двум независимым путям потока в одном вращающемся корпусе.',
  },
  {
    legacySource: '<strong>1 MPa rating covers 90% of pneumatic applications:</strong> Air, water, coolant, and light hydraulic oil (ISO VG 32) with one seal compound',
    source: '<strong>Published 1 MPa operating limit:</strong> Review air, water, coolant, or light hydraulic-oil service against the approved drawing and selected seal configuration.',
    de: '<strong>Veröffentlichte Betriebsgrenze von 1 MPa:</strong> Prüfen Sie den Einsatz mit Luft, Wasser, Kühlmittel oder leichtem Hydrauliköl anhand der freigegebenen Zeichnung und der ausgewählten Dichtungsausführung.',
    ja: '<strong>公開使用限界1 MPa：</strong> 空気、水、クーラントまたは低粘度作動油での使用は、承認図面と選定したシール仕様に照らして確認してください。',
    ru: '<strong>Опубликованный рабочий предел 1 МПа:</strong> Применение с воздухом, водой, охлаждающей жидкостью или маловязким гидравлическим маслом проверяйте по согласованному чертежу и выбранному исполнению уплотнения.',
  },
  {
    legacySource: '<strong>300 RPM rating — higher than flange alternatives:</strong> The threaded-mount bearing arrangement allows 50% higher speed than flange-mounted BP-2P-0001, ideal for high-cycle indexing tables',
    source: '<strong>Published 300 RPM operating limit:</strong> Provides a threaded-mount option for indexing tables that require a higher published speed than BP-2P-0001.',
    de: '<strong>Veröffentlichte Betriebsgrenze von 300 U/min:</strong> Eine Gewindeausführung für Schalttische, die eine höhere veröffentlichte Drehzahl als der BP-2P-0001 benötigen.',
    ja: '<strong>公開使用限界300 RPM：</strong> BP-2P-0001より高い公開回転数が必要なインデックステーブル向けのねじ取付仕様です。',
    ru: '<strong>Опубликованный рабочий предел 300 об/мин:</strong> Резьбовой вариант для делительных столов, которым требуется более высокая опубликованная частота вращения, чем у BP-2P-0001.',
  },
  {
    legacySource: '<strong>Dual independent passages:</strong> Clamp and unclamp, or gripper and vacuum, with no cross-contamination between channels — each passage has its own PTFE seal',
    source: '<strong>Dual independent passages:</strong> Clamp and unclamp, or gripper and vacuum, through two separately sealed flow paths.',
    de: '<strong>Zwei unabhängige Kanäle:</strong> Spannen und Lösen oder Greifer und Vakuum werden über zwei getrennt abgedichtete Strömungswege geführt.',
    ja: '<strong>独立した2流路：</strong> クランプ／アンクランプまたはグリッパ／真空を、独立してシールされた2つの流路で構成します。',
    ru: '<strong>Два независимых канала:</strong> Зажим и разжим либо захват и вакуум работают по двум раздельно уплотнённым путям потока.',
  },
  {
    legacySource: '<strong>Dual independent passages prevent cross-contamination:</strong> Clamp and unclamp functions remain isolated — no pressure bleeding between channels that causes fixture release failures',
    source: '<strong>Dual independent passages:</strong> Two separately sealed flow paths support clamp and unclamp functions in one compact body.',
    de: '<strong>Zwei unabhängige Kanäle:</strong> Zwei getrennt abgedichtete Strömungswege unterstützen Spann- und Lösefunktionen in einem kompakten Gehäuse.',
    ja: '<strong>独立した2流路：</strong> 独立してシールされた2つの流路により、コンパクトな本体でクランプ／アンクランプ機能を構成できます。',
    ru: '<strong>Два независимых канала:</strong> Два раздельно уплотнённых пути потока обеспечивают зажим и разжим в одном компактном корпусе.',
  },
  {
    legacySource: '<strong>Protective shroud and labyrinth for dusty environments:</strong> The design reduces direct particle exposure at the seal area. No certified IP rating is currently claimed.',
    source: '<strong>Protective shroud and labyrinth for dusty environments:</strong> The design reduces direct particle exposure at the seal area.',
    de: '<strong>Schutzhaube und Labyrinth für staubige Umgebungen:</strong> Die Konstruktion verringert die direkte Partikelbelastung im Dichtungsbereich.',
    ja: '<strong>粉じん環境向け保護カバーとラビリンス：</strong> シール部への粒子の直接侵入を抑える構造です。',
    ru: '<strong>Защитный кожух и лабиринт для запылённой среды:</strong> Конструкция снижает прямое воздействие частиц на зону уплотнения.',
  },
  {
    legacySource: '<strong>Flange mount rigidity:</strong> Direct bolt-on mounting eliminates threaded-connection fatigue on indexing tables and provides superior vibration resistance',
    source: '<strong>Defined flange interface:</strong> Direct bolt-on mounting provides a stable installation surface for indexing tables; confirm the mating flange and external loads for the machine.',
    de: '<strong>Definierte Flanschschnittstelle:</strong> Die direkte Schraubbefestigung bietet eine stabile Montagefläche für Schalttische; prüfen Sie Gegenflansch und äußere Lasten der Maschine.',
    ja: '<strong>明確なフランジ取合い：</strong> 直接ボルト締結によりインデックステーブルへ安定して取り付けられます。相手フランジと装置側の外力をご確認ください。',
    ru: '<strong>Определённый фланцевый интерфейс:</strong> Прямое болтовое крепление создаёт стабильную монтажную поверхность для делительных столов; проверьте ответный фланец и внешние нагрузки машины.',
  },
  {
    legacySource: '<strong>4mm orifice precision flow:</strong> Restricted flow prevents oversizing on small vacuum cups and precision grippers — delivers exactly the flow needed without waste',
    source: '<strong>4 mm passage for compact circuits:</strong> Suits small vacuum cups and precision grippers; confirm the required flow and response time for the complete pneumatic circuit.',
    de: '<strong>4-mm-Kanal für kompakte Kreise:</strong> Geeignet für kleine Vakuumsauger und Präzisionsgreifer; prüfen Sie erforderlichen Durchfluss und Ansprechzeit für den vollständigen Pneumatikkreis.',
    ja: '<strong>コンパクト回路向け4 mm流路：</strong> 小型真空パッドや精密グリッパに適します。空圧回路全体で必要流量と応答時間をご確認ください。',
    ru: '<strong>Канал 4 мм для компактных контуров:</strong> Подходит для небольших вакуумных присосок и прецизионных захватов; подтвердите требуемый расход и время отклика всей пневмосистемы.',
  },
  {
    legacySource: '<strong>Ø30mm hollow bore for cable or shaft through-center:</strong> Cables, pneumatic tubing, or a central drive shaft pass through the 30 mm bore — eliminating external cable drag chains and reducing machine footprint by 20–30%',
    source: '<strong>Ø30 mm hollow bore for cable or shaft routing:</strong> Cables, pneumatic tubing, or a central drive shaft can pass through the rotation center, simplifying the surrounding machine layout.',
    de: '<strong>Ø30-mm-Hohlbohrung für Kabel- oder Wellenführung:</strong> Kabel, Pneumatikschläuche oder eine zentrale Antriebswelle können durch das Drehzentrum geführt werden und vereinfachen so die umliegende Maschinenanordnung.',
    ja: '<strong>ケーブルまたは軸を通すØ30 mm中空穴：</strong> 回転中心にケーブル、空圧チューブまたは中央駆動軸を通せるため、周辺の装置レイアウトを簡素化できます。',
    ru: '<strong>Полое отверстие Ø30 мм для прокладки кабелей или вала:</strong> Через центр вращения можно провести кабели, пневмотрубки или центральный приводной вал, упростив компоновку окружающих узлов машины.',
  },
];

const guideToneRows = [
  {
    legacySource: '<strong>Tip:</strong> Add one spare channel if your machine is likely to be upgraded later. It is cheaper to specify a 3-passage joint now than to replace a 2-passage joint in 18 months.',
    source: '<strong>Tip:</strong> If a future machine upgrade is likely, compare the cost and space of one spare passage with replacing the rotary joint later.',
    de: '<strong>Tipp:</strong> Wenn eine spätere Maschinenerweiterung wahrscheinlich ist, vergleichen Sie Kosten und Bauraum eines Reservekanals mit einem späteren Austausch der Drehdurchführung.',
    ja: '<strong>ヒント：</strong> 将来の装置拡張が見込まれる場合は、予備流路を1本設けるコストとスペースを、後日のロータリージョイント交換と比較してください。',
    ru: '<strong>Совет:</strong> Если в будущем планируется модернизация машины, сравните стоимость и требуемое место для одного резервного канала с последующей заменой вращающегося соединения.',
  },
  {
    legacySource: '<strong>Common mistake:</strong> Using a standard pneumatic rotary joint for coolant delivery. The aluminum body corrodes. The FKM seal degrades. The joint leaks in 3 months.',
    source: '<strong>Common mistake:</strong> Selecting a pneumatic rotary joint for coolant without reviewing the wetted materials, seal compound, concentration, temperature, filtration, and cleaning chemistry. Confirm the complete fluid-contact configuration before selection.',
    de: '<strong>Häufiger Fehler:</strong> Eine pneumatische Drehdurchführung für Kühlmittel auszuwählen, ohne medienberührte Werkstoffe, Dichtungswerkstoff, Konzentration, Temperatur, Filtration und Reinigungschemie zu prüfen. Bestätigen Sie vor der Auswahl die vollständige medienberührte Ausführung.',
    ja: '<strong>よくある誤り：</strong> 接液部材質、シール材質、濃度、温度、ろ過、洗浄薬品を確認せずに、クーラント用として空圧ロータリージョイントを選定することです。選定前に接液仕様全体をご確認ください。',
    ru: '<strong>Распространённая ошибка:</strong> Выбор пневматического вращающегося соединения для охлаждающей жидкости без проверки смачиваемых материалов, состава уплотнения, концентрации, температуры, фильтрации и моющей химии. До выбора подтвердите полную конфигурацию деталей, контактирующих с жидкостью.',
  },
  {
    legacySource: 'Custom food-grade configurations: Contact us for BP-3P-FDA specifications',
    source: 'Food-contact applications: request a documented review of wetted materials, seal compound, cleaning chemistry, temperature, and applicable requirements',
    de: 'Anwendungen mit Lebensmittelkontakt: dokumentierte Prüfung der medienberührten Werkstoffe, des Dichtungswerkstoffs, der Reinigungschemie, der Temperatur und der anwendbaren Anforderungen anfordern',
    ja: '食品接触用途：接液部材質、シール材質、洗浄薬品、温度および適用要件について、文書による確認をご依頼ください',
    ru: 'Применение с контактом с пищевой продукцией: запросите документированную проверку смачиваемых материалов, состава уплотнения, моющей химии, температуры и применимых требований',
  },
  {
    legacySource: 'BP-3P-FDA — contact for spec',
    source: 'Project-specific configuration — engineering review',
    de: 'Projektspezifische Ausführung – technische Prüfung',
    ja: '案件別仕様 — 技術確認',
    ru: 'Проектное исполнение — инженерная проверка',
  },
  {
    legacySource: 'These five checks take five minutes. Getting them wrong takes five weeks of downtime.',
    source: 'These five checks help narrow the model before the drawing and operating conditions are reviewed.',
    de: 'Diese fünf Prüfungen helfen, die Modellauswahl einzugrenzen, bevor Zeichnung und Betriebsbedingungen geprüft werden.',
    ja: 'この5項目を確認すると、図面と運転条件を検討する前に候補型式を絞り込めます。',
    ru: 'Эти пять проверок помогают сузить выбор модели до рассмотрения чертежа и условий эксплуатации.',
  },
  {
    legacySource: 'Passage count, pressure, RPM, media compatibility, and mounting type. The five checks that take five minutes &mdash; getting them wrong takes five weeks of downtime.',
    source: 'Passage count, pressure, RPM, media compatibility, and mounting type. Five practical checks to narrow the model before reviewing the drawing and operating conditions.',
    de: 'Kanalzahl, Druck, Drehzahl, Medienverträglichkeit und Befestigungsart. Fünf praktische Prüfungen, um das Modell vor der Prüfung von Zeichnung und Betriebsbedingungen einzugrenzen.',
    ja: '流路数、圧力、回転数、流体適合性、取付方式。図面と運転条件を確認する前に候補型式を絞るための5つの実用的な確認項目です。',
    ru: 'Число каналов, давление, частота вращения, совместимость со средой и способ монтажа. Пять практических проверок для предварительного выбора модели до анализа чертежа и условий эксплуатации.',
  },
];

const runInToneRows = [
  {
    legacySource: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load. This beds the PTFE seal against the shaft surface, creating a micro-smooth contact zone. Check for leaks at the thread and seal interfaces. If dry, gradually increase to operating pressure and speed over 10 minutes. <strong>Skipping the run-in</strong> is the #2 cause of early seal failure — the seal needs time to conform to the shaft surface finish.',
    source: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load. This beds the PTFE seal against the shaft surface. Check for leaks at the thread and seal interfaces. If dry, gradually increase to operating pressure and speed over 10 minutes. This staged run-in allows the seal contact to settle before full duty.',
    de: 'Lassen Sie die Drehdurchführung 5 Minuten lang ohne Last bei niedrigem Druck (0,2 MPa) und niedriger Drehzahl (50–100 U/min) laufen. Dadurch legt sich die PTFE-Dichtung an die Wellenoberfläche an. Prüfen Sie Gewinde- und Dichtungsschnittstellen auf Leckage. Sind sie trocken, erhöhen Sie Druck und Drehzahl über 10 Minuten schrittweise auf die Betriebswerte. Dieser stufenweise Einlauf lässt den Dichtungskontakt vor Volllast setzen.',
    ja: '低圧（0.2 MPa）、低速（50～100 RPM）、無負荷で5分間運転し、PTFEシールを軸表面になじませます。ねじ接続部とシール部の漏れを確認し、異常がなければ10分かけて運転圧力と回転数まで段階的に上げてください。この段階的なならし運転により、本運転前にシール接触部を安定させます。',
    ru: 'Выполните обкатку без нагрузки в течение 5 минут при низком давлении (0,2 МПа) и низкой частоте вращения (50–100 об/мин). Это позволяет уплотнению из ПТФЭ приработаться к поверхности вала. Проверьте резьбовое соединение и уплотнение на утечки. При отсутствии утечек плавно увеличивайте давление и частоту вращения до рабочих значений в течение 10 минут. Такая поэтапная обкатка позволяет стабилизировать контакт уплотнения до полной нагрузки.',
  },
  {
    legacySource: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load on both passages. This beds the PTFE seals against the shaft surface, creating a micro-smooth contact zone. Check for leaks at the flange gasket and both seal interfaces. If dry, gradually increase to operating pressure and speed over 10 minutes. <strong>Skipping the run-in</strong> is the #2 cause of early seal failure — the seal needs time to conform to the shaft surface finish.',
    source: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load on both passages. This beds the PTFE seals against the shaft surface. Check for leaks at the flange gasket and both seal interfaces. If dry, gradually increase to operating pressure and speed over 10 minutes. This staged run-in allows the seal contact to settle before full duty.',
    de: 'Lassen Sie beide Kanäle 5 Minuten lang ohne Last bei niedrigem Druck (0,2 MPa) und niedriger Drehzahl (50–100 U/min) laufen. Dadurch legen sich die PTFE-Dichtungen an die Wellenoberfläche an. Prüfen Sie Flanschdichtung und beide Dichtungsschnittstellen auf Leckage. Sind sie trocken, erhöhen Sie Druck und Drehzahl über 10 Minuten schrittweise auf die Betriebswerte. Dieser stufenweise Einlauf lässt den Dichtungskontakt vor Volllast setzen.',
    ja: '両流路を低圧（0.2 MPa）、低速（50～100 RPM）、無負荷で5分間運転し、PTFEシールを軸表面になじませます。フランジガスケットと両方のシール部の漏れを確認し、異常がなければ10分かけて運転圧力と回転数まで段階的に上げてください。この段階的なならし運転により、本運転前にシール接触部を安定させます。',
    ru: 'Выполните обкатку обоих каналов без нагрузки в течение 5 минут при низком давлении (0,2 МПа) и низкой частоте вращения (50–100 об/мин). Это позволяет уплотнениям из ПТФЭ приработаться к поверхности вала. Проверьте фланцевую прокладку и оба уплотнения на утечки. При отсутствии утечек плавно увеличивайте давление и частоту вращения до рабочих значений в течение 10 минут. Такая поэтапная обкатка позволяет стабилизировать контакт уплотнений до полной нагрузки.',
  },
  {
    legacySource: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load on both inlets. This beds the PTFE seals against the shaft surface, creating a micro-smooth contact zone. Check for leaks at the thread and both seal interfaces. If dry, gradually increase to operating pressure and speed over 10 minutes. <strong>Skipping the run-in</strong> is the #2 cause of early seal failure — the seal needs time to conform to the shaft surface finish.',
    source: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load on both inlets. This beds the PTFE seals against the shaft surface. Check for leaks at the thread and both seal interfaces. If dry, gradually increase to operating pressure and speed over 10 minutes. This staged run-in allows the seal contact to settle before full duty.',
    de: 'Lassen Sie beide Eingänge 5 Minuten lang ohne Last bei niedrigem Druck (0,2 MPa) und niedriger Drehzahl (50–100 U/min) laufen. Dadurch legen sich die PTFE-Dichtungen an die Wellenoberfläche an. Prüfen Sie Gewinde und beide Dichtungsschnittstellen auf Leckage. Sind sie trocken, erhöhen Sie Druck und Drehzahl über 10 Minuten schrittweise auf die Betriebswerte. Dieser stufenweise Einlauf lässt den Dichtungskontakt vor Volllast setzen.',
    ja: '両入口を低圧（0.2 MPa）、低速（50～100 RPM）、無負荷で5分間運転し、PTFEシールを軸表面になじませます。ねじ部と両方のシール部の漏れを確認し、異常がなければ10分かけて運転圧力と回転数まで段階的に上げてください。この段階的なならし運転により、本運転前にシール接触部を安定させます。',
    ru: 'Выполните обкатку обоих входов без нагрузки в течение 5 минут при низком давлении (0,2 МПа) и низкой частоте вращения (50–100 об/мин). Это позволяет уплотнениям из ПТФЭ приработаться к поверхности вала. Проверьте резьбу и оба уплотнения на утечки. При отсутствии утечек плавно увеличивайте давление и частоту вращения до рабочих значений в течение 10 минут. Такая поэтапная обкатка позволяет стабилизировать контакт уплотнений до полной нагрузки.',
  },
  {
    legacySource: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load on both passages. This beds the PTFE seals against the shaft surface, creating a micro-smooth contact zone. Check for leaks at the thread and both seal interfaces. If dry, gradually increase to operating pressure and speed over 10 minutes. <strong>Skipping the run-in</strong> is the #2 cause of early seal failure — the seal needs time to conform to the shaft surface finish.',
    source: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load on both passages. This beds the PTFE seals against the shaft surface. Check for leaks at the thread and both seal interfaces. If dry, gradually increase to operating pressure and speed over 10 minutes. This staged run-in allows the seal contact to settle before full duty.',
    de: 'Lassen Sie beide Kanäle 5 Minuten lang ohne Last bei niedrigem Druck (0,2 MPa) und niedriger Drehzahl (50–100 U/min) laufen. Dadurch legen sich die PTFE-Dichtungen an die Wellenoberfläche an. Prüfen Sie Gewinde und beide Dichtungsschnittstellen auf Leckage. Sind sie trocken, erhöhen Sie Druck und Drehzahl über 10 Minuten schrittweise auf die Betriebswerte. Dieser stufenweise Einlauf lässt den Dichtungskontakt vor Volllast setzen.',
    ja: '両流路を低圧（0.2 MPa）、低速（50～100 RPM）、無負荷で5分間運転し、PTFEシールを軸表面になじませます。ねじ部と両方のシール部の漏れを確認し、異常がなければ10分かけて運転圧力と回転数まで段階的に上げてください。この段階的なならし運転により、本運転前にシール接触部を安定させます。',
    ru: 'Выполните обкатку обоих каналов без нагрузки в течение 5 минут при низком давлении (0,2 МПа) и низкой частоте вращения (50–100 об/мин). Это позволяет уплотнениям из ПТФЭ приработаться к поверхности вала. Проверьте резьбу и оба уплотнения на утечки. При отсутствии утечек плавно увеличивайте давление и частоту вращения до рабочих значений в течение 10 минут. Такая поэтапная обкатка позволяет стабилизировать контакт уплотнений до полной нагрузки.',
  },
  {
    legacySource: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load. This beds the PTFE seal against the shaft surface, creating a micro-smooth contact zone. Check for leaks at the flange gasket and seal interfaces. If dry, gradually increase to operating pressure and speed over 10 minutes. <strong>Skipping the run-in</strong> is the #2 cause of early seal failure on two-passage joints — the seal needs time to conform to the shaft surface finish before full duty.',
    source: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load. This beds the PTFE seal against the shaft surface. Check for leaks at the flange gasket and seal interfaces. If dry, gradually increase to operating pressure and speed over 10 minutes. This staged run-in allows the seal contact to settle before full duty.',
    de: 'Lassen Sie die Drehdurchführung 5 Minuten lang ohne Last bei niedrigem Druck (0,2 MPa) und niedriger Drehzahl (50–100 U/min) laufen. Dadurch legt sich die PTFE-Dichtung an die Wellenoberfläche an. Prüfen Sie Flanschdichtung und Dichtungsschnittstellen auf Leckage. Sind sie trocken, erhöhen Sie Druck und Drehzahl über 10 Minuten schrittweise auf die Betriebswerte. Dieser stufenweise Einlauf lässt den Dichtungskontakt vor Volllast setzen.',
    ja: '低圧（0.2 MPa）、低速（50～100 RPM）、無負荷で5分間運転し、PTFEシールを軸表面になじませます。フランジガスケットとシール部の漏れを確認し、異常がなければ10分かけて運転圧力と回転数まで段階的に上げてください。この段階的なならし運転により、本運転前にシール接触部を安定させます。',
    ru: 'Выполните обкатку без нагрузки в течение 5 минут при низком давлении (0,2 МПа) и низкой частоте вращения (50–100 об/мин). Это позволяет уплотнению из ПТФЭ приработаться к поверхности вала. Проверьте фланцевую прокладку и уплотнения на утечки. При отсутствии утечек плавно увеличивайте давление и частоту вращения до рабочих значений в течение 10 минут. Такая поэтапная обкатка позволяет стабилизировать контакт уплотнения до полной нагрузки.',
  },
  {
    legacySource: 'Run at low pressure (0.2 MPa) and low speed (30–50 RPM) for 5 minutes without load. This beds the PTFE seal against the shaft surface and distributes grease within the deep groove bearing. Check for leaks at the flange gasket and seal interfaces. If dry, gradually increase to operating pressure and speed over 10 minutes. <strong>Skipping the run-in</strong> is the #2 cause of early seal failure on ball-bearing joints — the seal needs time to conform to the shaft surface finish, and the bearing needs initial grease redistribution before full radial load.',
    source: 'Run at low pressure (0.2 MPa) and low speed (30–50 RPM) for 5 minutes without load. This beds the PTFE seal against the shaft surface and distributes grease within the deep-groove bearing. Check for leaks at the flange gasket and seal interfaces. If dry, gradually increase to operating pressure and speed over 10 minutes. This staged run-in allows the seal contact and bearing lubrication to settle before full duty.',
    de: 'Lassen Sie die Drehdurchführung 5 Minuten lang ohne Last bei niedrigem Druck (0,2 MPa) und niedriger Drehzahl (30–50 U/min) laufen. Dadurch legt sich die PTFE-Dichtung an die Wellenoberfläche an und das Fett verteilt sich im Rillenkugellager. Prüfen Sie Flanschdichtung und Dichtungsschnittstellen auf Leckage. Sind sie trocken, erhöhen Sie Druck und Drehzahl über 10 Minuten schrittweise auf die Betriebswerte. Dieser stufenweise Einlauf lässt Dichtungskontakt und Lagerschmierung vor Volllast setzen.',
    ja: '低圧（0.2 MPa）、低速（30～50 RPM）、無負荷で5分間運転し、PTFEシールを軸表面になじませるとともに深溝玉軸受内のグリースを分散させます。フランジガスケットとシール部の漏れを確認し、異常がなければ10分かけて運転圧力と回転数まで段階的に上げてください。この段階的なならし運転により、本運転前にシール接触部と軸受潤滑を安定させます。',
    ru: 'Выполните обкатку без нагрузки в течение 5 минут при низком давлении (0,2 МПа) и низкой частоте вращения (30–50 об/мин). Это позволяет уплотнению из ПТФЭ приработаться к поверхности вала и распределяет смазку в радиальном шарикоподшипнике. Проверьте фланцевую прокладку и уплотнения на утечки. При отсутствии утечек плавно увеличивайте давление и частоту вращения до рабочих значений в течение 10 минут. Такая поэтапная обкатка позволяет стабилизировать контакт уплотнения и смазку подшипника до полной нагрузки.',
  },
  {
    legacySource: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load. This beds the PTFE seal against the shaft surface, creating a micro-smooth contact zone. Check all three seal interfaces for leaks. If dry, gradually increase to operating pressure and speed over 10 minutes. <strong>Skipping the run-in</strong> is the #2 cause of early seal failure — the seal needs time to conform to the shaft surface finish.',
    source: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load. This beds the PTFE seal against the shaft surface. Check all three seal interfaces for leaks. If dry, gradually increase to operating pressure and speed over 10 minutes. This staged run-in allows the seal contact to settle before full duty.',
    de: 'Lassen Sie die Drehdurchführung 5 Minuten lang ohne Last bei niedrigem Druck (0,2 MPa) und niedriger Drehzahl (50–100 U/min) laufen. Dadurch legt sich die PTFE-Dichtung an die Wellenoberfläche an. Prüfen Sie alle drei Dichtungsschnittstellen auf Leckage. Sind sie trocken, erhöhen Sie Druck und Drehzahl über 10 Minuten schrittweise auf die Betriebswerte. Dieser stufenweise Einlauf lässt den Dichtungskontakt vor Volllast setzen.',
    ja: '低圧（0.2 MPa）、低速（50～100 RPM）、無負荷で5分間運転し、PTFEシールを軸表面になじませます。3か所すべてのシール部の漏れを確認し、異常がなければ10分かけて運転圧力と回転数まで段階的に上げてください。この段階的なならし運転により、本運転前にシール接触部を安定させます。',
    ru: 'Выполните обкатку без нагрузки в течение 5 минут при низком давлении (0,2 МПа) и низкой частоте вращения (50–100 об/мин). Это позволяет уплотнению из ПТФЭ приработаться к поверхности вала. Проверьте все три уплотнения на утечки. При отсутствии утечек плавно увеличивайте давление и частоту вращения до рабочих значений в течение 10 минут. Такая поэтапная обкатка позволяет стабилизировать контакт уплотнения до полной нагрузки.',
  },
  {
    legacySource: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load. This beds the PTFE seal against the shaft surface and distributes grease in the deep groove ball bearing. Check all three seal interfaces for leaks. Listen for bearing noise — smooth operation indicates proper installation. If dry and quiet, gradually increase to operating pressure and speed over 10 minutes. <strong>Skipping the run-in</strong> is the #2 cause of early seal and bearing failure.',
    source: 'Run at low pressure (0.2 MPa) and low speed (50–100 RPM) for 5 minutes without load. This beds the PTFE seal against the shaft surface and distributes grease in the deep-groove ball bearing. Check all three seal interfaces for leaks and listen for abnormal bearing noise. If dry and quiet, gradually increase to operating pressure and speed over 10 minutes. This staged run-in allows the seal contact and bearing lubrication to settle before full duty.',
    de: 'Lassen Sie die Drehdurchführung 5 Minuten lang ohne Last bei niedrigem Druck (0,2 MPa) und niedriger Drehzahl (50–100 U/min) laufen. Dadurch legt sich die PTFE-Dichtung an die Wellenoberfläche an und das Fett verteilt sich im Rillenkugellager. Prüfen Sie alle drei Dichtungsschnittstellen auf Leckage und achten Sie auf ungewöhnliche Lagergeräusche. Sind die Schnittstellen trocken und der Lauf ruhig, erhöhen Sie Druck und Drehzahl über 10 Minuten schrittweise auf die Betriebswerte. Dieser stufenweise Einlauf lässt Dichtungskontakt und Lagerschmierung vor Volllast setzen.',
    ja: '低圧（0.2 MPa）、低速（50～100 RPM）、無負荷で5分間運転し、PTFEシールを軸表面になじませるとともに深溝玉軸受内のグリースを分散させます。3か所すべてのシール部の漏れと異常な軸受音を確認してください。漏れや異音がなければ、10分かけて運転圧力と回転数まで段階的に上げます。この段階的なならし運転により、本運転前にシール接触部と軸受潤滑を安定させます。',
    ru: 'Выполните обкатку без нагрузки в течение 5 минут при низком давлении (0,2 МПа) и низкой частоте вращения (50–100 об/мин). Это позволяет уплотнению из ПТФЭ приработаться к поверхности вала и распределяет смазку в радиальном шарикоподшипнике. Проверьте все три уплотнения на утечки и прислушайтесь к необычному шуму подшипника. При отсутствии утечек и шума плавно увеличивайте давление и частоту вращения до рабочих значений в течение 10 минут. Такая поэтапная обкатка позволяет стабилизировать контакт уплотнения и смазку подшипника до полной нагрузки.',
  },
  {
    legacySource: 'Run at low pressure (0.2 MPa) and low speed (50 RPM) for 5 minutes without load. Check all 3 pneumatic passages for leaks with soapy water. Test electrical continuity across all 6 circuits with a multimeter — resistance should be &lt;0.1 Ω per circuit. If any circuit shows &gt;1 Ω, stop and inspect brush contact. <strong>Skipping the run-in</strong> is the #2 cause of early seal failure and brush arcing. The PTFE seal needs time to conform to the shaft surface, and the slip ring brushes need to seat into their contact tracks.',
    source: 'Run at low pressure (0.2 MPa) and low speed (50 RPM) for 5 minutes without load. Check all 3 pneumatic passages for leaks with soapy water. Test electrical continuity across all 6 circuits with a multimeter — resistance should be &lt;0.1 Ω per circuit. If any circuit shows &gt;1 Ω, stop and inspect brush contact. This staged run-in allows the PTFE seal and slip-ring brush contacts to settle before full duty.',
    de: 'Lassen Sie die Drehdurchführung 5 Minuten lang ohne Last bei niedrigem Druck (0,2 MPa) und niedriger Drehzahl (50 U/min) laufen. Prüfen Sie alle drei Pneumatikkanäle mit Seifenwasser auf Leckage. Messen Sie den Durchgang aller sechs Stromkreise mit einem Multimeter; der Widerstand sollte je Stromkreis &lt;0,1 Ω betragen. Zeigt ein Stromkreis &gt;1 Ω, stoppen Sie und prüfen Sie den Bürstenkontakt. Dieser stufenweise Einlauf lässt PTFE-Dichtung und Schleifringbürsten vor Volllast setzen.',
    ja: '低圧（0.2 MPa）、低速（50 RPM）、無負荷で5分間運転します。3本の空圧流路すべてを石けん水で漏れ確認し、6回路すべての導通をテスターで測定してください。各回路の抵抗は&lt;0.1 Ωを目安とし、&gt;1 Ωの回路があれば停止してブラシ接触を点検します。この段階的なならし運転により、本運転前にPTFEシールとスリップリングブラシの接触を安定させます。',
    ru: 'Выполните обкатку без нагрузки в течение 5 минут при низком давлении (0,2 МПа) и низкой частоте вращения (50 об/мин). Проверьте все три пневматических канала на утечки мыльным раствором. Мультиметром проверьте непрерывность всех шести электрических цепей; сопротивление каждой цепи должно быть &lt;0,1 Ом. Если в какой-либо цепи сопротивление превышает 1 Ом, остановите узел и проверьте контакт щётки. Такая поэтапная обкатка позволяет стабилизировать уплотнение из ПТФЭ и контакты щёток токосъёмника до полной нагрузки.',
  },
  {
    legacySource: 'Run at low pressure (0.2 MPa) and low speed (20 RPM) for 5 minutes without load. This beds the PTFE + Si3N4 seal against the shaft surface and distributes lubricant evenly across the ceramic particles. Check all 4 passages for leaks with soapy water. If dry, gradually increase to operating pressure and speed over 10 minutes. <strong>Skipping the run-in</strong> is the #2 cause of early seal failure in abrasive media — the ceramic particles need time to align with the shaft surface finish.',
    source: 'Run at low pressure (0.2 MPa) and low speed (20 RPM) for 5 minutes without load. This beds the PTFE + Si3N4 seal against the shaft surface and distributes lubricant across the contact. Check all 4 passages for leaks with soapy water. If dry, gradually increase to operating pressure and speed over 10 minutes. This staged run-in allows the seal contact to settle before full duty.',
    de: 'Lassen Sie die Drehdurchführung 5 Minuten lang ohne Last bei niedrigem Druck (0,2 MPa) und niedriger Drehzahl (20 U/min) laufen. Dadurch legt sich die PTFE-/Si3N4-Dichtung an die Wellenoberfläche an und der Schmierstoff verteilt sich in der Kontaktzone. Prüfen Sie alle vier Kanäle mit Seifenwasser auf Leckage. Sind sie trocken, erhöhen Sie Druck und Drehzahl über 10 Minuten schrittweise auf die Betriebswerte. Dieser stufenweise Einlauf lässt den Dichtungskontakt vor Volllast setzen.',
    ja: '低圧（0.2 MPa）、低速（20 RPM）、無負荷で5分間運転し、PTFE＋Si3N4シールを軸表面になじませるとともに接触部へ潤滑剤を分散させます。4本の流路すべてを石けん水で漏れ確認し、異常がなければ10分かけて運転圧力と回転数まで段階的に上げてください。この段階的なならし運転により、本運転前にシール接触部を安定させます。',
    ru: 'Выполните обкатку без нагрузки в течение 5 минут при низком давлении (0,2 МПа) и низкой частоте вращения (20 об/мин). Это позволяет уплотнению из ПТФЭ и Si3N4 приработаться к поверхности вала и распределяет смазку по зоне контакта. Проверьте все четыре канала на утечки мыльным раствором. При отсутствии утечек плавно увеличивайте давление и частоту вращения до рабочих значений в течение 10 минут. Такая поэтапная обкатка позволяет стабилизировать контакт уплотнения до полной нагрузки.',
  },
  {
    legacySource: 'Run at low pressure (0.2 MPa) and low speed (50 RPM) for 5 minutes without load. Check all 8 passages for leaks with soapy water. Because there are 8 independent seals, a single leak indicates a localized seal issue, not a systemic failure. If all 8 are dry, gradually increase to operating pressure and speed over 10 minutes. <strong>Skipping the run-in</strong> is the #2 cause of early seal failure in multi-passage joints — the PTFE seal needs time to conform to the shaft surface finish, and running all 8 passages at full pressure immediately overloads the unbedded seals.',
    source: 'Run at low pressure (0.2 MPa) and low speed (50 RPM) for 5 minutes without load. Check all 8 passages for leaks with soapy water. If all 8 are dry, gradually increase to operating pressure and speed over 10 minutes. This staged run-in allows the individual seal contacts to settle before full duty.',
    de: 'Lassen Sie die Drehdurchführung 5 Minuten lang ohne Last bei niedrigem Druck (0,2 MPa) und niedriger Drehzahl (50 U/min) laufen. Prüfen Sie alle acht Kanäle mit Seifenwasser auf Leckage. Sind alle acht trocken, erhöhen Sie Druck und Drehzahl über 10 Minuten schrittweise auf die Betriebswerte. Dieser stufenweise Einlauf lässt die einzelnen Dichtungskontakte vor Volllast setzen.',
    ja: '低圧（0.2 MPa）、低速（50 RPM）、無負荷で5分間運転し、8本の流路すべてを石けん水で漏れ確認します。8流路すべてに漏れがなければ、10分かけて運転圧力と回転数まで段階的に上げてください。この段階的なならし運転により、本運転前に各シール接触部を安定させます。',
    ru: 'Выполните обкатку без нагрузки в течение 5 минут при низком давлении (0,2 МПа) и низкой частоте вращения (50 об/мин). Проверьте все восемь каналов на утечки мыльным раствором. Если все восемь каналов герметичны, плавно увеличивайте давление и частоту вращения до рабочих значений в течение 10 минут. Такая поэтапная обкатка позволяет стабилизировать контакты отдельных уплотнений до полной нагрузки.',
  },
];

const tighteningToneRows = [
  {
    legacySource: 'Use PTFE tape (3–4 wraps) or anaerobic liquid thread sealant on the male threads. <strong>Hand-tighten plus 1/4 turn maximum.</strong> Overtightening distorts the seal housing, compressing the PTFE seal unevenly and creating a leak path within days. Torque spec: 8–12 N·m for G1/4, 5–8 N·m for G1/8. Use a torque wrench — "finger tight plus a quarter turn" is not precise enough for the 0.27 kg steel body.',
    source: 'Use PTFE tape (3–4 wraps) or anaerobic liquid thread sealant on the male threads. <strong>Hand-tighten plus 1/4 turn maximum.</strong> Overtightening can distort the seal housing and load the PTFE seal unevenly. Torque spec: 8–12 N·m for G1/4, 5–8 N·m for G1/8. Use a torque wrench — "finger tight plus a quarter turn" is not precise enough for the 0.27 kg steel body.',
    de: 'Verwenden Sie PTFE-Band (3–4 Lagen) oder anaerobe flüssige Gewindedichtung auf den Außengewinden. <strong>Von Hand anziehen und höchstens 1/4 Umdrehung weiterdrehen.</strong> Zu starkes Anziehen kann das Dichtungsgehäuse verformen und die PTFE-Dichtung ungleichmäßig belasten. Anzugsdrehmoment: 8–12 N·m für G1/4 und 5–8 N·m für G1/8. Verwenden Sie einen Drehmomentschlüssel; „handfest plus eine Vierteldrehung“ ist für das 0,27-kg-Stahlgehäuse nicht genau genug.',
    ja: 'おねじ部にはPTFEテープ（3～4巻き）または嫌気性液状ねじシール剤を使用してください。<strong>手締め後、増し締めは最大1/4回転です。</strong>締めすぎるとシールハウジングが変形し、PTFEシールへ不均一な荷重がかかることがあります。締付トルクはG1/4が8～12 N·m、G1/8が5～8 N·mです。0.27 kgの鋼製ボディでは「手締め＋1/4回転」だけでは精度が不足するため、トルクレンチを使用してください。',
    ru: 'На наружную резьбу нанесите ленту ПТФЭ (3–4 витка) или анаэробный жидкий резьбовой герметик. <strong>Затяните от руки и доверните не более чем на 1/4 оборота.</strong> Чрезмерная затяжка может деформировать корпус уплотнения и неравномерно нагрузить уплотнение из ПТФЭ. Момент затяжки: 8–12 Н·м для G1/4 и 5–8 Н·м для G1/8. Используйте динамометрический ключ: «от руки плюс четверть оборота» недостаточно точно для стального корпуса массой 0,27 кг.',
  },
  {
    legacySource: 'Use PTFE tape (3–4 wraps) or anaerobic liquid thread sealant on the G1/8 male threads. <strong>Hand-tighten plus 1/4 turn maximum.</strong> Overtightening distorts the AL6061 housing, compressing the PTFE seal unevenly and creating a leak path within days. Torque spec: 8–12 N·m for G1/8. Use a torque wrench — "finger tight plus a quarter turn" is not precise enough for a 265 g aluminum body. If you feel the housing flex, you are already overtightened.',
    source: 'Use PTFE tape (3–4 wraps) or anaerobic liquid thread sealant on the G1/8 male threads. <strong>Hand-tighten plus 1/4 turn maximum.</strong> Overtightening can distort the AL6061 housing and load the PTFE seal unevenly. Torque spec: 8–12 N·m for G1/8. Use a torque wrench — "finger tight plus a quarter turn" is not precise enough for a 265 g aluminum body. If you feel the housing flex, you are already overtightened.',
    de: 'Verwenden Sie PTFE-Band (3–4 Lagen) oder anaerobe flüssige Gewindedichtung auf den G1/8-Außengewinden. <strong>Von Hand anziehen und höchstens 1/4 Umdrehung weiterdrehen.</strong> Zu starkes Anziehen kann das AL6061-Gehäuse verformen und die PTFE-Dichtung ungleichmäßig belasten. Anzugsdrehmoment für G1/8: 8–12 N·m. Verwenden Sie einen Drehmomentschlüssel; „handfest plus eine Vierteldrehung“ ist für das 265-g-Aluminiumgehäuse nicht genau genug. Wenn sich das Gehäuse spürbar durchbiegt, ist es bereits zu stark angezogen.',
    ja: 'G1/8おねじ部にはPTFEテープ（3～4巻き）または嫌気性液状ねじシール剤を使用してください。<strong>手締め後、増し締めは最大1/4回転です。</strong>締めすぎるとAL6061ハウジングが変形し、PTFEシールへ不均一な荷重がかかることがあります。G1/8の締付トルクは8～12 N·mです。265 gのアルミニウムボディでは「手締め＋1/4回転」だけでは精度が不足するため、トルクレンチを使用してください。ハウジングのたわみを感じた場合は締めすぎです。',
    ru: 'На наружную резьбу G1/8 нанесите ленту ПТФЭ (3–4 витка) или анаэробный жидкий резьбовой герметик. <strong>Затяните от руки и доверните не более чем на 1/4 оборота.</strong> Чрезмерная затяжка может деформировать корпус из AL6061 и неравномерно нагрузить уплотнение из ПТФЭ. Момент затяжки для G1/8: 8–12 Н·м. Используйте динамометрический ключ: «от руки плюс четверть оборота» недостаточно точно для алюминиевого корпуса массой 265 г. Если чувствуется прогиб корпуса, соединение уже перетянуто.',
  },
  {
    legacySource: 'Use PTFE tape (3–4 wraps) or anaerobic liquid thread sealant on the G1/8 male threads. <strong>Hand-tighten plus 1/4 turn maximum.</strong> Overtightening distorts the AL6061 housing, compressing the PTFE seal unevenly and creating a leak path within days. Torque spec: 8–12 N·m for G1/8. Use a torque wrench — "finger tight plus a quarter turn" is not precise enough for a 220 g aluminum body. If you feel the housing flex, you are already overtightened.',
    source: 'Use PTFE tape (3–4 wraps) or anaerobic liquid thread sealant on the G1/8 male threads. <strong>Hand-tighten plus 1/4 turn maximum.</strong> Overtightening can distort the AL6061 housing and load the PTFE seal unevenly. Torque spec: 8–12 N·m for G1/8. Use a torque wrench — "finger tight plus a quarter turn" is not precise enough for a 220 g aluminum body. If you feel the housing flex, you are already overtightened.',
    de: 'Verwenden Sie PTFE-Band (3–4 Lagen) oder anaerobe flüssige Gewindedichtung auf den G1/8-Außengewinden. <strong>Von Hand anziehen und höchstens 1/4 Umdrehung weiterdrehen.</strong> Zu starkes Anziehen kann das AL6061-Gehäuse verformen und die PTFE-Dichtung ungleichmäßig belasten. Anzugsdrehmoment für G1/8: 8–12 N·m. Verwenden Sie einen Drehmomentschlüssel; „handfest plus eine Vierteldrehung“ ist für das 220-g-Aluminiumgehäuse nicht genau genug. Wenn sich das Gehäuse spürbar durchbiegt, ist es bereits zu stark angezogen.',
    ja: 'G1/8おねじ部にはPTFEテープ（3～4巻き）または嫌気性液状ねじシール剤を使用してください。<strong>手締め後、増し締めは最大1/4回転です。</strong>締めすぎるとAL6061ハウジングが変形し、PTFEシールへ不均一な荷重がかかることがあります。G1/8の締付トルクは8～12 N·mです。220 gのアルミニウムボディでは「手締め＋1/4回転」だけでは精度が不足するため、トルクレンチを使用してください。ハウジングのたわみを感じた場合は締めすぎです。',
    ru: 'На наружную резьбу G1/8 нанесите ленту ПТФЭ (3–4 витка) или анаэробный жидкий резьбовой герметик. <strong>Затяните от руки и доверните не более чем на 1/4 оборота.</strong> Чрезмерная затяжка может деформировать корпус из AL6061 и неравномерно нагрузить уплотнение из ПТФЭ. Момент затяжки для G1/8: 8–12 Н·м. Используйте динамометрический ключ: «от руки плюс четверть оборота» недостаточно точно для алюминиевого корпуса массой 220 г. Если чувствуется прогиб корпуса, соединение уже перетянуто.',
  },
  {
    legacySource: 'Place the gasket between the flange faces. Tighten bolts evenly in a cross (star) pattern to the specified torque. For M6 bolts: 6–8 N·m. For M8 bolts: 12–15 N·m. Overtightening warps the AL6061 flange face, creating an uneven gasket seal that leaks within days. Undertightening allows the gasket to blow out under pressure. Use a torque wrench — "hand tight" is not precise enough for a 0.49 kg aluminum flange.',
    source: 'Place the gasket between the flange faces. Tighten bolts evenly in a cross (star) pattern to the specified torque. For M6 bolts: 6–8 N·m. For M8 bolts: 12–15 N·m. Overtightening can warp the AL6061 flange face and load the gasket unevenly. Undertightening can allow the gasket to move under pressure. Use a torque wrench — "hand tight" is not precise enough for a 0.49 kg aluminum flange.',
    de: 'Legen Sie die Dichtung zwischen die Flanschflächen. Ziehen Sie die Schrauben über Kreuz gleichmäßig mit dem vorgegebenen Drehmoment an. Für M6-Schrauben: 6–8 N·m; für M8-Schrauben: 12–15 N·m. Zu starkes Anziehen kann die AL6061-Flanschfläche verziehen und die Dichtung ungleichmäßig belasten. Zu geringes Anziehen kann dazu führen, dass sich die Dichtung unter Druck verschiebt. Verwenden Sie einen Drehmomentschlüssel; „handfest“ ist für einen 0,49-kg-Aluminiumflansch nicht genau genug.',
    ja: 'フランジ面の間にガスケットを置き、ボルトを対角線（星形）の順序で規定トルクまで均等に締め付けます。M6ボルトは6～8 N·m、M8ボルトは12～15 N·mです。締めすぎるとAL6061フランジ面が反り、ガスケットへ不均一な荷重がかかることがあります。締付不足では圧力によりガスケットが動くことがあります。0.49 kgのアルミニウムフランジでは「手締め」だけでは精度が不足するため、トルクレンチを使用してください。',
    ru: 'Установите прокладку между поверхностями фланцев. Равномерно затяните болты крест-накрест до заданного момента. Для болтов M6: 6–8 Н·м; для M8: 12–15 Н·м. Чрезмерная затяжка может деформировать поверхность фланца из AL6061 и неравномерно нагрузить прокладку. Недостаточная затяжка может привести к смещению прокладки под давлением. Используйте динамометрический ключ: затяжка «от руки» недостаточно точна для алюминиевого фланца массой 0,49 кг.',
  },
  {
    legacySource: 'Use PTFE tape (3–4 wraps) or anaerobic liquid thread sealant on the G1/4 male threads. <strong>Hand-tighten plus 1/4 turn maximum.</strong> Overtightening distorts the seal housing, compressing the PTFE seal unevenly and creating a leak path within days. Torque spec: 10–15 N·m for G1/4. Use a torque wrench — "finger tight plus a quarter turn" is not precise enough for a 0.36 kg aluminum body. Do not use pipe wrenches.',
    source: 'Use PTFE tape (3–4 wraps) or anaerobic liquid thread sealant on the G1/4 male threads. <strong>Hand-tighten plus 1/4 turn maximum.</strong> Overtightening can distort the seal housing and load the PTFE seal unevenly. Torque spec: 10–15 N·m for G1/4. Use a torque wrench — "finger tight plus a quarter turn" is not precise enough for a 0.36 kg aluminum body. Do not use pipe wrenches.',
    de: 'Verwenden Sie PTFE-Band (3–4 Lagen) oder anaerobe flüssige Gewindedichtung auf den G1/4-Außengewinden. <strong>Von Hand anziehen und höchstens 1/4 Umdrehung weiterdrehen.</strong> Zu starkes Anziehen kann das Dichtungsgehäuse verformen und die PTFE-Dichtung ungleichmäßig belasten. Anzugsdrehmoment für G1/4: 10–15 N·m. Verwenden Sie einen Drehmomentschlüssel; „handfest plus eine Vierteldrehung“ ist für das 0,36-kg-Aluminiumgehäuse nicht genau genug. Verwenden Sie keine Rohrzange.',
    ja: 'G1/4おねじ部にはPTFEテープ（3～4巻き）または嫌気性液状ねじシール剤を使用してください。<strong>手締め後、増し締めは最大1/4回転です。</strong>締めすぎるとシールハウジングが変形し、PTFEシールへ不均一な荷重がかかることがあります。G1/4の締付トルクは10～15 N·mです。0.36 kgのアルミニウムボディでは「手締め＋1/4回転」だけでは精度が不足するため、トルクレンチを使用してください。パイプレンチは使用しないでください。',
    ru: 'На наружную резьбу G1/4 нанесите ленту ПТФЭ (3–4 витка) или анаэробный жидкий резьбовой герметик. <strong>Затяните от руки и доверните не более чем на 1/4 оборота.</strong> Чрезмерная затяжка может деформировать корпус уплотнения и неравномерно нагрузить уплотнение из ПТФЭ. Момент затяжки для G1/4: 10–15 Н·м. Используйте динамометрический ключ: «от руки плюс четверть оборота» недостаточно точно для алюминиевого корпуса массой 0,36 кг. Не используйте трубный ключ.',
  },
];

const leadTimeToneRows = [
  {
    legacySource: 'BP-2P-0001 uses a machined flat flange with a bolt circle and through-holes for M6 or M8 bolts (depending on the production batch). The flange face is machined to a flatness of 0.02 mm to ensure gasket sealing. Download the 2D PDF drawing for exact flange OD, bolt circle diameter, hole count, hole diameter, and tolerances. Ensure your equipment mating flange matches before ordering. Custom flange patterns, including metric and imperial bolt circles, are available as custom orders with 10–14 day lead time.',
    source: 'BP-2P-0001 uses a machined flat flange with a bolt circle and through-holes for M6 or M8 bolts (depending on the production batch). The flange face is machined to a flatness of 0.02 mm to support gasket sealing. Download the 2D PDF drawing for exact flange OD, bolt circle diameter, hole count, hole diameter, and tolerances. Ensure your equipment mating flange matches before ordering. Custom flange patterns, including metric and imperial bolt circles, can be reviewed; scope and lead time are confirmed in the quotation or order.',
    de: 'Der BP-2P-0001 besitzt einen bearbeiteten Flachflansch mit Lochkreis und Durchgangsbohrungen für M6- oder M8-Schrauben (je nach Fertigungslos). Die Flanschfläche wird mit einer Ebenheit von 0,02 mm bearbeitet, um die Dichtwirkung der Flanschdichtung zu unterstützen. Außendurchmesser, Lochkreisdurchmesser, Anzahl und Durchmesser der Bohrungen sowie Toleranzen entnehmen Sie der 2D-PDF-Zeichnung. Prüfen Sie vor der Bestellung die Übereinstimmung des Gegenflansches. Sonderlochbilder mit metrischen oder zölligen Lochkreisen können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt.',
    ja: 'BP-2P-0001は、ボルト穴円とM6またはM8用の通し穴（製造ロットによる）を備えた切削平面フランジを採用しています。フランジ面はガスケットシールを支えるため平面度0.02 mmに加工されています。フランジ外径、PCD、穴数、穴径、公差は2D PDF図面で確認し、発注前に相手フランジとの一致をご確認ください。メートル系またはインチ系PCDの特殊穴配置は検討可能で、範囲と納期は見積書または注文書で確定します。',
    ru: 'BP-2P-0001 имеет обработанный плоский фланец с окружностью отверстий и сквозными отверстиями под болты M6 или M8 (в зависимости от производственной партии). Плоскостность поверхности фланца 0,02 мм обеспечивает работу прокладки. Точный наружный диаметр, диаметр окружности, число и размер отверстий и допуски приведены на 2D-чертежe PDF. До заказа проверьте соответствие ответного фланца. Специальные метрические или дюймовые схемы отверстий могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе.',
  },
  {
    legacySource: 'BP-2P-16-0001 uses a flange mount with 4×M5 screws on a specific bolt circle diameter. Download the 2D PDF drawing for exact P.C.D., hole diameter, counterbore depth, and tolerances. Ensure your equipment mating flange matches before ordering. The compact pattern is designed for 200–400 mm diameter rotary tables. Custom flange patterns (e.g., 3-M6 or 6-M4) are available as special orders with 5–7 day additional lead time.',
    source: 'BP-2P-16-0001 uses a flange mount with 4×M5 screws on a specific bolt circle diameter. Download the 2D PDF drawing for exact P.C.D., hole diameter, counterbore depth, and tolerances. Ensure your equipment mating flange matches before ordering. The compact pattern is designed for 200–400 mm diameter rotary tables. Custom flange patterns (e.g., 3-M6 or 6-M4) can be reviewed; scope and lead time are confirmed in the quotation or order.',
    de: 'Der BP-2P-16-0001 wird mit vier M5-Schrauben auf einem definierten Lochkreis am Flansch befestigt. Exakten Lochkreis, Bohrungsdurchmesser, Senkungstiefe und Toleranzen entnehmen Sie der 2D-PDF-Zeichnung. Prüfen Sie vor der Bestellung den Gegenflansch. Das kompakte Lochbild ist für Rundtische mit 200–400 mm Durchmesser ausgelegt. Sonderlochbilder, beispielsweise 3-M6 oder 6-M4, können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt.',
    ja: 'BP-2P-16-0001は、所定のPCD上の4×M5ねじでフランジ取付します。正確なPCD、穴径、座ぐり深さ、公差は2D PDF図面で確認し、発注前に装置側相手フランジとの一致をご確認ください。コンパクトな穴配置は直径200～400 mmの回転テーブル向けです。3-M6や6-M4などの特殊穴配置は検討可能で、範囲と納期は見積書または注文書で確定します。',
    ru: 'BP-2P-16-0001 крепится фланцем четырьмя винтами M5 на заданной окружности. Точные P.C.D., диаметр отверстий, глубина цековки и допуски приведены на 2D-чертежe PDF. До заказа проверьте ответный фланец оборудования. Компактная схема рассчитана на поворотные столы диаметром 200–400 мм. Специальные схемы, например 3-M6 или 6-M4, могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе.',
  },
  {
    legacySource: 'BP-2P-30-0001 uses a flange mount with a specific bolt pattern designed for medium rotary tables. Download the 2D PDF drawing for exact flange dimensions, bolt circle diameter (P.C.D.), hole sizes, counterbore depths, and tolerances. Ensure your equipment mating flange matches before ordering. The Ø76 mm outer diameter requires approximately 90 mm clearance for hose routing. Custom flange patterns are available as special orders with 5–7 day additional lead time.',
    source: 'BP-2P-30-0001 uses a flange mount with a specific bolt pattern designed for medium rotary tables. Download the 2D PDF drawing for exact flange dimensions, bolt circle diameter (P.C.D.), hole sizes, counterbore depths, and tolerances. Ensure your equipment mating flange matches before ordering. The Ø76 mm outer diameter requires approximately 90 mm clearance for hose routing. Custom flange patterns can be reviewed; scope and lead time are confirmed in the quotation or order.',
    de: 'Der BP-2P-30-0001 besitzt eine Flanschbefestigung mit einem für mittlere Rundtische ausgelegten Lochbild. Exakte Flanschmaße, Lochkreis, Bohrungsgrößen, Senkungstiefen und Toleranzen entnehmen Sie der 2D-PDF-Zeichnung. Prüfen Sie vor der Bestellung den Gegenflansch. Bei Ø76 mm Außendurchmesser sind etwa 90 mm Freiraum für die Schlauchführung erforderlich. Sonderlochbilder können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt.',
    ja: 'BP-2P-30-0001は、中型回転テーブル向けの所定ボルト穴配置を持つフランジ取付式です。正確なフランジ寸法、PCD、穴径、座ぐり深さ、公差は2D PDF図面で確認し、発注前に装置側相手フランジとの一致をご確認ください。外径Ø76 mmのため、ホース配管には約90 mmのクリアランスが必要です。特殊フランジ穴配置は検討可能で、範囲と納期は見積書または注文書で確定します。',
    ru: 'BP-2P-30-0001 имеет фланцевое крепление со схемой отверстий для поворотных столов среднего размера. Точные размеры фланца, P.C.D., размеры отверстий, глубины цековок и допуски приведены на 2D-чертежe PDF. До заказа проверьте ответный фланец. При наружном диаметре Ø76 мм для прокладки шлангов требуется около 90 мм свободного пространства. Специальные схемы фланца могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе.',
  },
  {
    legacySource: `Confirm your equipment's flange dimensions and bolt pattern match the rotary joint flange specification. The P.C.D. must align within 0.1 mm to prevent flange distortion under pressure. Download the 2D drawing for exact dimensions, hole sizes, depths, and tolerances. Custom bolt patterns are available with 10-day lead time. If your mating flange is steel or cast iron, check for burrs that could score the AL6061 face.`,
    source: `Confirm your equipment's flange dimensions and bolt pattern match the rotary joint flange specification. The P.C.D. must align within 0.1 mm to prevent flange distortion under pressure. Download the 2D drawing for exact dimensions, hole sizes, depths, and tolerances. Custom bolt patterns can be reviewed; scope and lead time are confirmed in the quotation or order. If your mating flange is steel or cast iron, check for burrs that could score the AL6061 face.`,
    de: 'Prüfen Sie, ob Flanschmaße und Lochbild der Maschine der Flanschspezifikation der Drehdurchführung entsprechen. Der Lochkreis muss innerhalb von 0,1 mm fluchten, um eine Flanschverformung unter Druck zu vermeiden. Exakte Maße, Bohrungsgrößen, Tiefen und Toleranzen entnehmen Sie der 2D-Zeichnung. Sonderlochbilder können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt. Entfernen Sie an Gegenflanschen aus Stahl oder Gusseisen Grate, die die AL6061-Fläche beschädigen könnten.',
    ja: '装置側フランジの寸法とボルト穴配置がロータリージョイントのフランジ仕様に一致することを確認してください。圧力によるフランジ変形を防ぐため、PCDは0.1 mm以内で一致させます。正確な寸法、穴径、深さ、公差は2D図面で確認してください。特殊ボルト穴配置は検討可能で、範囲と納期は見積書または注文書で確定します。相手フランジが鋼または鋳鉄の場合は、AL6061面を傷つけるバリがないことを確認してください。',
    ru: 'Убедитесь, что размеры и схема отверстий фланца оборудования соответствуют спецификации фланца вращающегося соединения. P.C.D. должен совпадать в пределах 0,1 мм, чтобы не деформировать фланец под давлением. Точные размеры, размеры и глубины отверстий и допуски приведены на 2D-чертежe. Специальные схемы отверстий могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе. На ответном фланце из стали или чугуна удалите заусенцы, способные повредить поверхность AL6061.',
  },
  {
    legacySource: 'BP-3P-0004 uses a standard flange mount with bolt holes on a defined P.C.D. Download the 2D PDF drawing for exact bolt circle diameters, hole sizes, depths, and tolerances. Ensure your equipment mating flange matches within 0.1 mm flatness before ordering. Custom bolt patterns are available with a 10-day lead time. The flange gasket material is included with every order. For high-vibration environments, specify lock washers or thread-locking compound to prevent bolt loosening.',
    source: 'BP-3P-0004 uses a standard flange mount with bolt holes on a defined P.C.D. Download the 2D PDF drawing for exact bolt circle diameters, hole sizes, depths, and tolerances. Ensure your equipment mating flange matches within 0.1 mm flatness before ordering. Custom bolt patterns can be reviewed; scope and lead time are confirmed in the quotation or order. The flange gasket material is included with every order. For high-vibration environments, specify lock washers or thread-locking compound to prevent bolt loosening.',
    de: 'Der BP-3P-0004 besitzt einen Standardflansch mit Bohrungen auf einem definierten Lochkreis. Exakte Lochkreisdurchmesser, Bohrungsgrößen, Tiefen und Toleranzen entnehmen Sie der 2D-PDF-Zeichnung. Prüfen Sie vor der Bestellung, dass der Gegenflansch innerhalb von 0,1 mm Ebenheit übereinstimmt. Sonderlochbilder können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt. Die Flanschdichtung ist im Lieferumfang enthalten. Für starke Vibrationen sind Sicherungsscheiben oder Schraubensicherung gegen Losdrehen vorzusehen.',
    ja: 'BP-3P-0004は、所定のPCD上にボルト穴を設けた標準フランジ取付式です。正確なPCD、穴径、深さ、公差は2D PDF図面で確認してください。発注前に、装置側相手フランジの平面度が0.1 mm以内で適合することを確認します。特殊ボルト穴配置は検討可能で、範囲と納期は見積書または注文書で確定します。フランジガスケット材は各注文に含まれます。振動が大きい環境では、ばね座金またはねじロック剤で緩みを防止してください。',
    ru: 'BP-3P-0004 имеет стандартный фланец с отверстиями на заданной P.C.D. Точные диаметры окружностей, размеры, глубины и допуски отверстий приведены на 2D-чертежe PDF. До заказа убедитесь, что ответный фланец соответствует плоскостности в пределах 0,1 мм. Специальные схемы отверстий могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе. Материал фланцевой прокладки входит в каждый заказ. Для сильной вибрации укажите стопорные шайбы или резьбовой фиксатор.',
  },
  {
    legacySource: 'BP-3P-0006 uses G1/4 BSP parallel (BSPP) threads per ISO 228-1. Confirm your equipment has G1/4 female threads or appropriate adapters. The 4× M6 mounting holes on the body are for anti-rotation brackets, not for torque reaction. Download the 2D drawing for exact thread dimensions, pitch (1.337 mm), and tolerances. NPT and metric thread options are available as custom orders with 10-day lead time.',
    source: 'BP-3P-0006 uses G1/4 BSP parallel (BSPP) threads per ISO 228-1. Confirm your equipment has G1/4 female threads or appropriate adapters. The 4× M6 mounting holes on the body are for anti-rotation brackets, not for torque reaction. Download the 2D drawing for exact thread dimensions, pitch (1.337 mm), and tolerances. NPT and metric thread options can be reviewed; scope and lead time are confirmed in the quotation or order.',
    de: 'Der BP-3P-0006 verwendet zylindrische G1/4-BSPP-Gewinde nach ISO 228-1. Prüfen Sie, ob die Maschine G1/4-Innengewinde oder passende Adapter besitzt. Die vier M6-Befestigungsbohrungen am Gehäuse sind für die Verdrehsicherung und nicht zur Drehmomentabstützung vorgesehen. Exakte Gewindemaße, Steigung (1,337 mm) und Toleranzen entnehmen Sie der 2D-Zeichnung. NPT- und metrische Gewindeausführungen können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt.',
    ja: 'BP-3P-0006はISO 228-1準拠のG1/4平行BSPPねじを採用しています。装置側にG1/4めねじまたは適切なアダプタがあることを確認してください。本体の4×M6取付穴は回り止めブラケット用で、トルク反力の受けには使用しません。正確なねじ寸法、ピッチ（1.337 mm）、公差は2D図面で確認してください。NPTまたはメートルねじ仕様は検討可能で、範囲と納期は見積書または注文書で確定します。',
    ru: 'BP-3P-0006 использует цилиндрическую резьбу G1/4 BSPP по ISO 228-1. Убедитесь, что на оборудовании имеется внутренняя резьба G1/4 или подходящий переходник. Четыре отверстия M6 на корпусе предназначены для кронштейна стопорения, а не для восприятия реактивного момента. Точные размеры резьбы, шаг 1,337 мм и допуски приведены на 2D-чертежe. Варианты NPT и метрической резьбы могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе.',
  },
  {
    legacySource: 'BP-3P-0006 uses G1/4 BSP parallel (BSPP) threads per ISO 228-1. BSP parallel threads seal on a gasket or O-ring at the port face, not on the thread itself. This means PTFE tape on the thread is for sealing only; the mechanical connection is made by the flat face compressing against the mating port. Download the 2D PDF drawing for exact thread dimensions, pitch (1.337 mm for G1/4), and tolerances. NPT and metric thread options are available as custom orders with 10-day lead time.',
    source: 'BP-3P-0006 uses G1/4 BSP parallel (BSPP) threads per ISO 228-1. BSP parallel threads seal on a gasket or O-ring at the port face, not on the thread itself. This means PTFE tape on the thread is for sealing only; the mechanical connection is made by the flat face compressing against the mating port. Download the 2D PDF drawing for exact thread dimensions, pitch (1.337 mm for G1/4), and tolerances. NPT and metric thread options can be reviewed; scope and lead time are confirmed in the quotation or order.',
    de: 'Der BP-3P-0006 verwendet zylindrische G1/4-BSPP-Gewinde nach ISO 228-1. BSPP-Gewinde dichten über eine Dichtung oder einen O-Ring an der Anschlussfläche und nicht über das Gewinde selbst. PTFE-Band dient daher nur zur Abdichtung; die mechanische Verbindung entsteht durch das Anpressen der Planfläche am Gegenanschluss. Exakte Gewindemaße, die G1/4-Steigung von 1,337 mm und Toleranzen entnehmen Sie der 2D-PDF-Zeichnung. NPT- und metrische Gewindeausführungen können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt.',
    ja: 'BP-3P-0006はISO 228-1準拠のG1/4平行BSPPねじを採用しています。BSP平行ねじはねじ部ではなくポート端面のガスケットまたはOリングでシールします。PTFEテープはシール補助であり、機械的な接続は平面を相手ポートへ圧着して行います。正確なねじ寸法、G1/4のピッチ（1.337 mm）、公差は2D PDF図面で確認してください。NPTまたはメートルねじ仕様は検討可能で、範囲と納期は見積書または注文書で確定します。',
    ru: 'BP-3P-0006 использует цилиндрическую резьбу G1/4 BSPP по ISO 228-1. Резьба BSPP герметизируется прокладкой или O-кольцом на торце порта, а не самой резьбой. Поэтому лента ПТФЭ служит только для герметизации, а механическое соединение создаётся прижатием плоского торца к ответному порту. Точные размеры резьбы, шаг G1/4 1,337 мм и допуски приведены на 2D-чертежe PDF. Варианты NPT и метрической резьбы могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе.',
  },
  {
    legacySource: 'BP-3P-0007 uses G1/8 BSP parallel (BSPP) threads per ISO 228-1. Confirm your equipment has G1/8 female threads or appropriate adapters. The rotor side has 3× M5 mounting holes; the stator side has 3× Ø6 mm through-holes. Download the 2D drawing for exact thread dimensions, pitch (0.907 mm for G1/8), and tolerances. NPT and metric thread options are available as custom orders with 10-day lead time.',
    source: 'BP-3P-0007 uses G1/8 BSP parallel (BSPP) threads per ISO 228-1. Confirm your equipment has G1/8 female threads or appropriate adapters. The rotor side has 3× M5 mounting holes; the stator side has 3× Ø6 mm through-holes. Download the 2D drawing for exact thread dimensions, pitch (0.907 mm for G1/8), and tolerances. NPT and metric thread options can be reviewed; scope and lead time are confirmed in the quotation or order.',
    de: 'Der BP-3P-0007 verwendet zylindrische G1/8-BSPP-Gewinde nach ISO 228-1. Prüfen Sie, ob die Maschine G1/8-Innengewinde oder passende Adapter besitzt. Die Rotorseite hat drei M5-Befestigungsbohrungen, die Statorseite drei Ø6-mm-Durchgangsbohrungen. Exakte Gewindemaße, Steigung (0,907 mm für G1/8) und Toleranzen entnehmen Sie der 2D-Zeichnung. NPT- und metrische Gewindeausführungen können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt.',
    ja: 'BP-3P-0007はISO 228-1準拠のG1/8平行BSPPねじを採用しています。装置側にG1/8めねじまたは適切なアダプタがあることを確認してください。ロータ側には3×M5取付穴、ステータ側には3×Ø6 mm通し穴があります。正確なねじ寸法、G1/8のピッチ（0.907 mm）、公差は2D図面で確認してください。NPTまたはメートルねじ仕様は検討可能で、範囲と納期は見積書または注文書で確定します。',
    ru: 'BP-3P-0007 использует цилиндрическую резьбу G1/8 BSPP по ISO 228-1. Убедитесь, что на оборудовании имеется внутренняя резьба G1/8 или подходящий переходник. На стороне ротора расположены три отверстия M5, а на стороне статора — три сквозных отверстия Ø6 мм. Точные размеры резьбы, шаг G1/8 0,907 мм и допуски приведены на 2D-чертежe. Варианты NPT и метрической резьбы могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе.',
  },
  {
    legacySource: 'BP-3P-0007 uses G1/8 BSP parallel (BSPP) threads per ISO 228-1 with 0.907 mm pitch. BSP parallel threads seal on a gasket or O-ring at the port face, not on the thread itself. This means PTFE tape on the thread is for sealing only; the mechanical connection is made by the flat face compressing against the mating port. Download the 2D PDF drawing for exact thread dimensions, pitch, and tolerances. NPT and metric thread options are available as custom orders with 10-day lead time. The rotor side uses 3-M5 mounting holes and the stator side uses 3-Ø6 mm through-holes.',
    source: 'BP-3P-0007 uses G1/8 BSP parallel (BSPP) threads per ISO 228-1 with 0.907 mm pitch. BSP parallel threads seal on a gasket or O-ring at the port face, not on the thread itself. This means PTFE tape on the thread is for sealing only; the mechanical connection is made by the flat face compressing against the mating port. Download the 2D PDF drawing for exact thread dimensions, pitch, and tolerances. NPT and metric thread options can be reviewed; scope and lead time are confirmed in the quotation or order. The rotor side uses 3-M5 mounting holes and the stator side uses 3-Ø6 mm through-holes.',
    de: 'Der BP-3P-0007 verwendet zylindrische G1/8-BSPP-Gewinde nach ISO 228-1 mit 0,907 mm Steigung. BSPP-Gewinde dichten über eine Dichtung oder einen O-Ring an der Anschlussfläche und nicht über das Gewinde selbst. PTFE-Band dient daher nur zur Abdichtung; die mechanische Verbindung entsteht durch das Anpressen der Planfläche am Gegenanschluss. Exakte Gewindemaße, Steigung und Toleranzen entnehmen Sie der 2D-PDF-Zeichnung. NPT- und metrische Gewindeausführungen können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt. Die Rotorseite hat drei M5-Befestigungsbohrungen, die Statorseite drei Ø6-mm-Durchgangsbohrungen.',
    ja: 'BP-3P-0007はISO 228-1準拠のG1/8平行BSPPねじ（ピッチ0.907 mm）を採用しています。BSP平行ねじはねじ部ではなくポート端面のガスケットまたはOリングでシールします。PTFEテープはシール補助であり、機械的な接続は平面を相手ポートへ圧着して行います。正確なねじ寸法、ピッチ、公差は2D PDF図面で確認してください。NPTまたはメートルねじ仕様は検討可能で、範囲と納期は見積書または注文書で確定します。ロータ側は3-M5取付穴、ステータ側は3-Ø6 mm通し穴です。',
    ru: 'BP-3P-0007 использует цилиндрическую резьбу G1/8 BSPP по ISO 228-1 с шагом 0,907 мм. Резьба BSPP герметизируется прокладкой или O-кольцом на торце порта, а не самой резьбой. Поэтому лента ПТФЭ служит только для герметизации, а механическое соединение создаётся прижатием плоского торца к ответному порту. Точные размеры резьбы, шаг и допуски приведены на 2D-чертежe PDF. Варианты NPT и метрической резьбы могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе. На стороне ротора расположены три отверстия M5, а на стороне статора — три сквозных отверстия Ø6 мм.',
  },
  {
    legacySource: '12 or 24 circuits with same 3 pneumatic passages; 5-day custom lead time',
    source: '12- or 24-circuit options can be reviewed with the same three pneumatic passages; scope and lead time are confirmed in the quotation or order.',
    de: 'Ausführungen mit 12 oder 24 Stromkreisen und denselben drei Pneumatikkanälen können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt.',
    ja: '同じ3本の空圧流路を備えた12回路または24回路仕様を検討可能で、範囲と納期は見積書または注文書で確定します。',
    ru: 'Могут быть рассмотрены варианты на 12 или 24 электрические цепи с теми же тремя пневматическими каналами; объём и срок подтверждаются в предложении или заказе.',
  },
  {
    legacySource: 'Download the 2D PDF drawing for exact flange dimensions, bolt circle diameter (P.C.D.), hole size, and tolerances. The flange uses a standard bolt pattern compatible with most automation rotary table manufacturers. Ensure your equipment mating flange matches before ordering. Custom flanges with different P.C.D., hole count, or thickness are available upon request with a 5–7 day custom lead time. The Ø30mm bore is concentric to the flange within 0.05 mm TIR to ensure smooth rotation when mounted.',
    source: 'Download the 2D PDF drawing for exact flange dimensions, bolt circle diameter (P.C.D.), hole size, and tolerances. The flange uses a standard bolt pattern compatible with many automation rotary tables. Ensure your equipment mating flange matches before ordering. Custom flanges with different P.C.D., hole count, or thickness can be reviewed; scope and lead time are confirmed in the quotation or order. The Ø30mm bore is concentric to the flange within 0.05 mm TIR to support smooth rotation when mounted.',
    de: 'Exakte Flanschmaße, Lochkreis, Bohrungsgröße und Toleranzen entnehmen Sie der 2D-PDF-Zeichnung. Der Flansch verwendet ein Standardlochbild, das mit vielen Automatisierungs-Rundtischen kompatibel ist. Prüfen Sie vor der Bestellung den Gegenflansch. Sonderflansche mit anderem Lochkreis, anderer Bohrungszahl oder Dicke können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt. Die Ø30-mm-Bohrung ist innerhalb von 0,05 mm Rundlauf zum Flansch ausgerichtet und unterstützt einen ruhigen Lauf nach der Montage.',
    ja: '正確なフランジ寸法、PCD、穴径、公差は2D PDF図面で確認してください。フランジは多くの自動化用回転テーブルに対応する標準ボルト穴配置を採用しています。発注前に装置側相手フランジとの一致をご確認ください。PCD、穴数、厚さが異なる特殊フランジは検討可能で、範囲と納期は見積書または注文書で確定します。Ø30 mm中空穴はフランジに対しTIR 0.05 mm以内で同心に加工され、取付後の滑らかな回転を支えます。',
    ru: 'Точные размеры фланца, P.C.D., размер отверстий и допуски приведены на 2D-чертежe PDF. Стандартная схема отверстий фланца совместима со многими автоматизированными поворотными столами. До заказа проверьте ответный фланец оборудования. Специальные фланцы с другой P.C.D., числом отверстий или толщиной могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе. Отверстие Ø30 мм соосно фланцу в пределах 0,05 мм TIR и обеспечивает плавное вращение после монтажа.',
  },
  {
    legacySource: 'BP-8P-0001 uses a 4-M5 flange bolt pattern on a standard bolt circle diameter. Download the 2D PDF drawing for exact P.C.D., hole size, and tolerances. Ensure your equipment mating flange matches before ordering. Custom flanges with different P.C.D., hole count, or thickness are available upon request with a 5–7 day custom lead time. The flange face must be flat within 0.05 mm to ensure even seal compression across all 8 passages. Use M5×16 mm screws with a minimum thread engagement of 8 mm in the mating flange.',
    source: 'BP-8P-0001 uses a 4-M5 flange bolt pattern on a standard bolt circle diameter. Download the 2D PDF drawing for exact P.C.D., hole size, and tolerances. Ensure your equipment mating flange matches before ordering. Custom flanges with different P.C.D., hole count, or thickness can be reviewed; scope and lead time are confirmed in the quotation or order. The flange face must be flat within 0.05 mm to support even seal compression across all 8 passages. Use M5×16 mm screws with a minimum thread engagement of 8 mm in the mating flange.',
    de: 'Der BP-8P-0001 verwendet ein 4-M5-Flanschlochbild auf einem Standardlochkreis. Exakten Lochkreis, Bohrungsgröße und Toleranzen entnehmen Sie der 2D-PDF-Zeichnung. Prüfen Sie vor der Bestellung den Gegenflansch. Sonderflansche mit anderem Lochkreis, anderer Bohrungszahl oder Dicke können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt. Die Flanschfläche muss innerhalb von 0,05 mm eben sein, um eine gleichmäßige Dichtungskompression über alle acht Kanäle zu unterstützen. Verwenden Sie M5×16-mm-Schrauben mit mindestens 8 mm Gewindeeingriff im Gegenflansch.',
    ja: 'BP-8P-0001は、標準PCD上に4-M5のフランジボルト穴配置を採用しています。正確なPCD、穴径、公差は2D PDF図面で確認し、発注前に装置側相手フランジとの一致をご確認ください。PCD、穴数、厚さが異なる特殊フランジは検討可能で、範囲と納期は見積書または注文書で確定します。8流路すべてのシールを均等に圧縮するため、フランジ面の平面度は0.05 mm以内としてください。相手フランジへのねじ掛かりを8 mm以上確保したM5×16 mmねじを使用します。',
    ru: 'BP-8P-0001 использует фланцевую схему 4-M5 на стандартной окружности. Точные P.C.D., размер отверстий и допуски приведены на 2D-чертежe PDF. До заказа проверьте ответный фланец оборудования. Специальные фланцы с другой P.C.D., числом отверстий или толщиной могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе. Плоскостность поверхности фланца должна быть в пределах 0,05 мм, чтобы обеспечить равномерное сжатие уплотнений всех восьми каналов. Используйте винты M5×16 мм с глубиной зацепления резьбы в ответном фланце не менее 8 мм.',
  },
];

const dustyEnvironmentRows = [
  {
    legacySource: 'No Certified IP Rating Claimed',
    source: 'Protective Shroud + Labyrinth',
    de: 'Schutzhaube + Labyrinth',
    ja: '保護カバー＋ラビリンス',
    ru: 'Защитный кожух + лабиринт',
  },
  {
    legacySource: 'BP-2P-50-0001 is a two-passage air rotary joint with a protective shroud and labyrinth design for dusty industrial environments. No certified IP rating is currently claimed. The mounting interfaces shown below are public reference values; confirm the complete mounting dimensions against the supplied drawing before machining.',
    source: 'BP-2P-50-0001 is a two-passage air rotary joint with a protective shroud and labyrinth design for dusty industrial environments. The mounting interfaces shown below are public reference values; confirm the complete mounting dimensions against the supplied drawing before machining.',
    de: 'Der BP-2P-50-0001 ist eine Zweikanal-Luftdrehdurchführung mit Schutzhaube und Labyrinth für staubige Industrieumgebungen. Die nachstehend gezeigten Montageschnittstellen sind öffentliche Referenzwerte; prüfen Sie vor der Bearbeitung die vollständigen Einbaumaße anhand der mitgelieferten Zeichnung.',
    ja: 'BP-2P-50-0001は、粉じんの多い産業環境向けに保護カバーとラビリンス構造を備えた2流路エアロータリージョイントです。以下の取付取合いは公開参考値です。機械加工前に、支給図面で完全な取付寸法をご確認ください。',
    ru: 'BP-2P-50-0001 — двухканальное воздушное вращающееся соединение с защитным кожухом и лабиринтом для запылённых промышленных условий. Приведённые ниже монтажные интерфейсы являются открытыми справочными данными; до механической обработки подтвердите полные монтажные размеры по поставляемому чертежу.',
  },
  {
    legacySource: '<strong>Large Two-Passage Packaging Turntables</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Dusty carton and palletizing lines with pneumatic clamp and vacuum functions. The protective shroud and labyrinth reduce direct particle exposure; no certified IP rating is currently claimed. <a href="application-packaging-machinery.html">Read application guide →</a></span>',
    source: '<strong>Large Two-Passage Packaging Turntables</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Dusty carton and palletizing lines with pneumatic clamp and vacuum functions. The protective shroud and labyrinth reduce direct particle exposure. <a href="application-packaging-machinery.html">Read application guide →</a></span>',
    de: '<strong>Große Zweikanal-Verpackungsrundtische</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Staubige Kartonier- und Palettierlinien mit pneumatischer Spann- und Vakuumfunktion. Schutzhaube und Labyrinth verringern die direkte Partikelbelastung. <a href="application-packaging-machinery.html">Anwendungsleitfaden lesen →</a></span>',
    ja: '<strong>大型2流路包装ターンテーブル</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">粉じんのあるカートン・パレタイジングラインの空圧クランプおよび真空機能向けです。保護カバーとラビリンスが粒子の直接侵入を抑えます。<a href="application-packaging-machinery.html">用途ガイドを見る →</a></span>',
    ru: '<strong>Крупные двухканальные упаковочные поворотные столы</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Запылённые линии упаковки в картон и паллетирования с пневматическим зажимом и вакуумом. Защитный кожух и лабиринт снижают прямое воздействие частиц. <a href="application-packaging-machinery.html">Читать руководство по применению →</a></span>',
  },
  {
    legacySource: '<strong>Large Pneumatic Testing Turntables</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Leak test + vent on large casting and weldment test stations. The protective shroud and labyrinth reduce direct exposure to foundry sand residue; no certified IP rating is claimed.</span>',
    source: '<strong>Large Pneumatic Testing Turntables</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Leak test + vent on large casting and weldment test stations. The protective shroud and labyrinth reduce direct exposure to foundry sand residue.</span>',
    de: '<strong>Große pneumatische Prüf-Rundtische</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Leckprüfung und Entlüftung an Prüfständen für große Guss- und Schweißteile. Schutzhaube und Labyrinth verringern die direkte Belastung durch Gießsandreste.</span>',
    ja: '<strong>大型空圧試験ターンテーブル</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">大型鋳造品・溶接構造物の試験装置で漏れ試験と排気を行います。保護カバーとラビリンスが鋳物砂残留物への直接暴露を抑えます。</span>',
    ru: '<strong>Крупные пневматические испытательные поворотные столы</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Проверка герметичности и сброс воздуха на стендах для крупных отливок и сварных конструкций. Защитный кожух и лабиринт снижают прямое воздействие остатков формовочного песка.</span>',
  },
  {
    legacySource: '<strong>Direct submersion or pressure washing on the seal face</strong> — the protective shroud and labyrinth are intended for dusty environments; no certified IP rating is currently claimed',
    source: '<strong>Direct submersion or pressure washing on the seal face</strong> — the protective shroud and labyrinth are intended for dusty environments',
    de: '<strong>Direktes Eintauchen oder Druckwäsche der Dichtfläche</strong> – Schutzhaube und Labyrinth sind für staubige Umgebungen vorgesehen',
    ja: '<strong>シール面の直接浸漬または高圧洗浄</strong> — 保護カバーとラビリンスは粉じん環境向けです',
    ru: '<strong>Прямое погружение или мойка поверхности уплотнения под давлением</strong> — защитный кожух и лабиринт предназначены для запылённой среды',
  },
  {
    legacySource: '✅ Candidate configuration — protective shroud and labyrinth; no certified IP rating claimed',
    source: '✅ Candidate configuration — protective shroud and labyrinth',
    de: '✅ Geeignete Ausgangskonfiguration – Schutzhaube und Labyrinth',
    ja: '✅ 候補仕様 — 保護カバーとラビリンス',
    ru: '✅ Возможная конфигурация — защитный кожух и лабиринт',
  },
  {
    legacySource: 'The public configuration uses a 6061 aluminum alloy body, PTFE seal with O-ring, and a protective shroud and labyrinth for dusty environments. No certified IP rating is currently claimed. Confirm weight and all configuration-dependent details for the supplied unit.',
    source: 'The public configuration uses a 6061 aluminum alloy body, PTFE seal with O-ring, and a protective shroud and labyrinth for dusty environments. Confirm weight and all configuration-dependent details for the supplied unit.',
    de: 'Die öffentlich dargestellte Ausführung verwendet ein Gehäuse aus Aluminiumlegierung 6061, eine PTFE-Dichtung mit O-Ring sowie Schutzhaube und Labyrinth für staubige Umgebungen. Bestätigen Sie Gewicht und alle ausführungsspezifischen Angaben für die gelieferte Einheit.',
    ja: '公開仕様は、6061アルミニウム合金ボディ、Oリング付きPTFEシール、粉じん環境向け保護カバーおよびラビリンスを採用しています。支給品の重量と仕様依存項目をご確認ください。',
    ru: 'В открытой конфигурации используются корпус из алюминиевого сплава 6061, уплотнение из ПТФЭ с O-кольцом, а также защитный кожух и лабиринт для запылённой среды. Подтвердите массу и все зависящие от исполнения данные поставляемого изделия.',
  },
  {
    legacySource: 'BP-2P-50-0001 (protective shroud and labyrinth; no certified IP rating claimed)',
    source: 'BP-2P-50-0001 (protective shroud and labyrinth for dusty environments)',
    de: 'BP-2P-50-0001 (Schutzhaube und Labyrinth für staubige Umgebungen)',
    ja: 'BP-2P-50-0001（粉じん環境向け保護カバーおよびラビリンス）',
    ru: 'BP-2P-50-0001 (защитный кожух и лабиринт для запылённой среды)',
  },
  {
    legacySource: 'Air service in dusty environments; protective shroud and labyrinth; no certified IP rating claimed',
    source: 'Air service in dusty environments; protective shroud and labyrinth',
    de: 'Luftbetrieb in staubigen Umgebungen; Schutzhaube und Labyrinth',
    ja: '粉じん環境での空気用途；保護カバーおよびラビリンス',
    ru: 'Воздушная среда в запылённых условиях; защитный кожух и лабиринт',
  },
  {
    legacySource: 'Protective shroud and labyrinth options for dusty environments; no certified IP rating is currently claimed.',
    source: 'Protective-shroud and labyrinth options for dusty environments; select the protection level from the machine requirements.',
    de: 'Ausführungen mit Schutzhaube und Labyrinth für staubige Umgebungen; wählen Sie die Schutzstufe anhand der Maschinenanforderungen.',
    ja: '粉じん環境向けの保護カバー・ラビリンス仕様です。装置要件に基づいて保護レベルを選定してください。',
    ru: 'Варианты с защитным кожухом и лабиринтом для запылённой среды; выбирайте уровень защиты по требованиям машины.',
  },
  {
    legacySource: 'Rotary-union engineering review for weld spatter, grinding dust, and vibration. Protective shroud and labyrinth options are available for dusty environments; no certified IP rating is currently claimed.',
    source: 'Rotary-union engineering review for weld spatter, grinding dust, and vibration. Match protective shrouds, labyrinths, materials, and external covers to the actual environment.',
    de: 'Technische Prüfung der Drehdurchführung für Schweißspritzer, Schleifstaub und Vibration. Stimmen Sie Schutzhauben, Labyrinthe, Werkstoffe und äußere Abdeckungen auf die tatsächliche Umgebung ab.',
    ja: '溶接スパッタ、研削粉じん、振動に対するロータリージョイントの技術確認です。保護カバー、ラビリンス、材質、外部カバーを実際の環境に合わせて選定してください。',
    ru: 'Инженерная проверка вращающегося соединения для сварочных брызг, шлифовальной пыли и вибрации. Подберите защитные кожухи, лабиринты, материалы и внешние ограждения по фактической среде.',
  },
  {
    legacySource: 'Dust-Proof Air Rotary Union for Steel and Dusty Environments',
    source: 'Air Rotary Union for Steel and Dusty Environments',
    de: 'Luftdrehdurchführung für Stahlindustrie und staubige Umgebungen',
    ja: '鉄鋼・粉じん環境向けエアロータリージョイント',
    ru: 'Воздушное вращающееся соединение для металлургии и запылённых условий',
  },
  {
    legacySource: 'Dust-Proof Rotary Union Questions',
    source: 'Rotary Union Questions for Dusty Environments',
    de: 'Fragen zu Drehdurchführungen für staubige Umgebungen',
    ja: '粉じん環境向けロータリージョイントのよくある質問',
    ru: 'Вопросы о вращающихся соединениях для запылённых условий',
  },
  {
    legacySource: 'Why do dusty environments damage rotary unions?',
    source: 'Is dust-proof the same as waterproof?',
    de: 'Ist Staubschutz dasselbe wie Wasserschutz?',
    ja: '防じんと防水は同じですか？',
    ru: 'Защита от пыли и защита от воды — одно и то же?',
  },
  {
    legacySource: 'Abrasive dust can enter exposed interfaces, increase seal wear, contaminate bearings, and cause early leakage if protection and hose routing are not considered.',
    source: 'No. Dust-proof design focuses on preventing particles from entering sensitive areas. Water exposure, washdown, or coolant splash should be reviewed separately.',
    de: 'Nein. Eine staubgeschützte Konstruktion soll das Eindringen von Partikeln in empfindliche Bereiche verhindern. Wassereinwirkung, Reinigung und Kühlmittelspritzer sind separat zu prüfen.',
    ja: 'いいえ。防じん設計は、粒子が重要部へ侵入するのを抑えることを目的としています。水への暴露、洗浄、クーラント飛沫は別途確認してください。',
    ru: 'Нет. Пылезащитная конструкция предназначена для предотвращения попадания частиц в чувствительные зоны. Воздействие воды, мойку и брызги охлаждающей жидкости следует рассматривать отдельно.',
  },
  {
    legacySource: 'What information is needed for a dust-proof rotary union?',
    source: 'Can Begapunk help replace an old rotary union with no drawing?',
    de: 'Kann Begapunk beim Ersatz einer alten Drehdurchführung ohne Zeichnung helfen?',
    ja: '図面のない古いロータリージョイントの置換にも対応できますか？',
    ru: 'Может ли Begapunk помочь заменить старое вращающееся соединение без чертежа?',
  },
  {
    legacySource: 'Provide dust type, temperature range, vibration level, pressure, RPM, mounting style, and whether the joint is exposed to powder, scale, chips, or splash.',
    source: 'Yes. Clear photos, measurements, port information, and operating conditions are often enough for a first review.',
    de: 'Ja. Für eine erste Prüfung reichen häufig deutliche Fotos, Maße, Anschlussdaten und Betriebsbedingungen aus.',
    ja: 'はい。鮮明な写真、寸法、ポート情報、運転条件があれば、初期確認を行える場合が多くあります。',
    ru: 'Да. Для первичной проверки часто достаточно чётких фотографий, размеров, данных о портах и условий эксплуатации.',
  },
];

const residualToneRows = [
  {
    legacySource: '<strong>Dusty or abrasive environments</strong> — no protective shroud or labyrinth; use BP-2P-50-0001 (protective shroud and labyrinth; no certified IP rating claimed) or add external bellows',
    source: '<strong>Dusty or abrasive environments</strong> — no protective shroud or labyrinth; use BP-2P-50-0001 (protective shroud and labyrinth) or add external bellows',
    de: '<strong>Staubige oder abrasive Umgebungen</strong> – keine Schutzhaube und kein Labyrinth; verwenden Sie den BP-2P-50-0001 (Schutzhaube und Labyrinth) oder einen externen Faltenbalg',
    ja: '<strong>粉じんまたは研磨性粒子のある環境</strong> — 保護カバーやラビリンスがないため、BP-2P-50-0001（保護カバー＋ラビリンス）を使用するか、外部ベローズを追加してください',
    ru: '<strong>Запылённая или абразивная среда</strong> — защитный кожух и лабиринт отсутствуют; используйте BP-2P-50-0001 (защитный кожух и лабиринт) или внешний сильфон',
  },
  {
    legacySource: 'Two-passage air model with a protective shroud and labyrinth for dusty environments; no certified IP rating is currently claimed.',
    source: 'Two-passage air model with a protective shroud and labyrinth for dusty environments.',
    de: 'Zweikanal-Luftmodell mit Schutzhaube und Labyrinth für staubige Umgebungen.',
    ja: '粉じん環境向け保護カバーとラビリンスを備えた2流路エアモデルです。',
    ru: 'Двухканальная воздушная модель с защитным кожухом и лабиринтом для запылённой среды.',
  },
  {
    legacySource: '<strong>Two-Passage Packaging Turntables</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Clamp + vacuum pickup on indexing packaging tables. Two independent passages prevent back-pressure interference between channels. <a href="application-packaging-machinery.html">Read application guide →</a></span>',
    source: '<strong>Two-Passage Packaging Turntables</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Clamp and vacuum pickup on indexing packaging tables. Two independent passages provide separate flow paths for the two functions. <a href="application-packaging-machinery.html">Read application guide →</a></span>',
    de: '<strong>Zweikanal-Verpackungsrundtische</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Spann- und Vakuumaufnahme an taktenden Verpackungstischen. Zwei unabhängige Kanäle stellen getrennte Strömungswege für beide Funktionen bereit. <a href="application-packaging-machinery.html">Anwendungsleitfaden lesen →</a></span>',
    ja: '<strong>2流路包装ターンテーブル</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">インデックス式包装テーブルのクランプと真空吸着向けです。独立した2流路が各機能に別々の流路を提供します。<a href="application-packaging-machinery.html">用途ガイドを見る →</a></span>',
    ru: '<strong>Двухканальные упаковочные поворотные столы</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Зажим и вакуумный захват на индексных упаковочных столах. Два независимых канала создают отдельные пути потока для обеих функций. <a href="application-packaging-machinery.html">Читать руководство по применению →</a></span>',
  },
  {
    legacySource: '<strong>Dusty or abrasive environments</strong> — this model has no protective shroud or labyrinth; abrasive particles can reach the seal area. Review BP-2P-50-0001, for which no certified IP rating is currently claimed.',
    source: '<strong>Dusty or abrasive environments</strong> — this model has no protective shroud or labyrinth; abrasive particles can reach the seal area. Review BP-2P-50-0001.',
    de: '<strong>Staubige oder abrasive Umgebungen</strong> – dieses Modell besitzt keine Schutzhaube und kein Labyrinth; abrasive Partikel können den Dichtungsbereich erreichen. Prüfen Sie den BP-2P-50-0001.',
    ja: '<strong>粉じんまたは研磨性粒子のある環境</strong> — 本型式には保護カバーやラビリンスがなく、粒子がシール部へ到達する可能性があります。BP-2P-50-0001をご検討ください。',
    ru: '<strong>Запылённая или абразивная среда</strong> — у этой модели нет защитного кожуха и лабиринта; абразивные частицы могут попасть в зону уплотнения. Рассмотрите BP-2P-50-0001.',
  },
  {
    source: 'Confirm the mating flange, bolt circles, hole sizes, depths, and tolerances against the approved drawing before machining or assembly. Custom bolt patterns can be reviewed; scope and lead time are confirmed in the quotation or order. Check steel or cast-iron mating faces for burrs that could damage the AL6061 flange face.',
    de: 'Prüfen Sie Gegenflansch, Lochkreise, Bohrungsgrößen, Tiefen und Toleranzen vor Bearbeitung oder Montage anhand der freigegebenen Zeichnung. Sonderlochbilder können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt. Kontrollieren Sie Gegenflächen aus Stahl oder Gusseisen auf Grate, die die AL6061-Flanschfläche beschädigen könnten.',
    ja: '機械加工または組立前に、承認図面で相手フランジ、PCD、穴径、深さ、公差を確認してください。特殊ボルト穴配置は検討可能で、範囲と納期は見積書または注文書で確定します。鋼または鋳鉄の相手面に、AL6061フランジ面を傷つけるバリがないことを確認してください。',
    ru: 'До механической обработки или сборки проверьте ответный фланец, окружности отверстий, их размеры, глубины и допуски по согласованному чертежу. Специальные схемы отверстий могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе. Проверьте ответные поверхности из стали или чугуна на отсутствие заусенцев, способных повредить фланец AL6061.',
  },
  {
    source: 'BP-2P-130-0001 uses a dual-bolt-circle flange. Download the current 2D PDF drawing for the exact bolt circles, hole sizes, depths, tolerances, and mating-flatness requirement before machining the equipment interface. Custom bolt patterns can be reviewed; scope and lead time are confirmed in the quotation or order.',
    de: 'Der BP-2P-130-0001 besitzt einen Flansch mit zwei Lochkreisen. Laden Sie vor der Bearbeitung der Maschinenschnittstelle die aktuelle 2D-PDF-Zeichnung herunter und prüfen Sie exakte Lochkreise, Bohrungsgrößen, Tiefen, Toleranzen und die erforderliche Ebenheit der Gegenfläche. Sonderlochbilder können geprüft werden; Umfang und Lieferzeit werden im Angebot oder Auftrag bestätigt.',
    ja: 'BP-2P-130-0001は2つのボルト穴円を備えたフランジを採用しています。装置側取合いを加工する前に最新の2D PDF図面を入手し、正確なPCD、穴径、深さ、公差、相手面の平面度要件を確認してください。特殊ボルト穴配置は検討可能で、範囲と納期は見積書または注文書で確定します。',
    ru: 'BP-2P-130-0001 имеет фланец с двумя окружностями отверстий. До обработки интерфейса оборудования загрузите актуальный 2D-чертёж PDF и проверьте точные окружности, размеры и глубины отверстий, допуски и требование к плоскостности ответной поверхности. Специальные схемы отверстий могут быть рассмотрены; объём и срок подтверждаются в предложении или заказе.',
  },
  {
    legacySource: '<strong>Dusty or abrasive environments</strong> (steel mill, foundry) — this model has no protective shroud or labyrinth. Review <a href="BP-2P-50-0001.html">BP-2P-50-0001</a>, for which no certified IP rating is currently claimed, or add a separately verified external protection solution.',
    source: '<strong>Dusty or abrasive environments</strong> (steel mill, foundry) — this model has no protective shroud or labyrinth. Review <a href="BP-2P-50-0001.html">BP-2P-50-0001</a>, or add a separately verified external protection solution.',
    de: '<strong>Staubige oder abrasive Umgebungen</strong> (Stahlwerk, Gießerei) – dieses Modell besitzt keine Schutzhaube und kein Labyrinth. Prüfen Sie den <a href="BP-2P-50-0001.html">BP-2P-50-0001</a> oder ergänzen Sie eine separat geprüfte äußere Schutzlösung.',
    ja: '<strong>粉じんまたは研磨性粒子のある環境</strong>（製鉄所、鋳造所）— 本型式には保護カバーやラビリンスがありません。<a href="BP-2P-50-0001.html">BP-2P-50-0001</a>を検討するか、別途検証した外部保護を追加してください。',
    ru: '<strong>Запылённая или абразивная среда</strong> (металлургия, литейное производство) — у этой модели нет защитного кожуха и лабиринта. Рассмотрите <a href="BP-2P-50-0001.html">BP-2P-50-0001</a> или добавьте отдельно проверенную внешнюю защиту.',
  },
  {
    legacySource: 'The protective shroud and labyrinth are intended to reduce direct particle exposure in dusty environments. They must not be interpreted as a certified ingress-protection rating. <strong>Rule:</strong> No certified IP rating is currently claimed; request written confirmation for any washdown or liquid-exposure requirement.',
    source: 'Direct pressure washing can force water and contamination past the protective features. <strong>Rule:</strong> Shield the seal area and do not direct the wash jet at the shroud or labyrinth.',
    de: 'Direkte Druckwäsche kann Wasser und Verunreinigungen an den Schutzelementen vorbeidrücken. <strong>Regel:</strong> Schirmen Sie den Dichtungsbereich ab und richten Sie den Waschstrahl nicht auf Schutzhaube oder Labyrinth.',
    ja: '高圧洗浄を直接当てると、水や異物が保護構造を越えて侵入することがあります。<strong>原則：</strong>シール部を遮へいし、洗浄噴流を保護カバーやラビリンスへ直接向けないでください。',
    ru: 'Прямая мойка под давлением может протолкнуть воду и загрязнения через защитные элементы. <strong>Правило:</strong> Закройте зону уплотнения и не направляйте струю на кожух или лабиринт.',
  },
  {
    legacySource: '<strong>Three-Station Pneumatic Clamping Fixtures</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Clamp, unclamp, and air blow on a single rotary fixture. 3 independent passages prevent cross-contamination between functions. <a href="application-cnc-pneumatic-clamping.html">Read application guide →</a></span>',
    source: '<strong>Three-Station Pneumatic Clamping Fixtures</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Clamp, unclamp, and air-blow on a single rotary fixture. Three independent passages provide separate flow paths for the functions. <a href="application-cnc-pneumatic-clamping.html">Read application guide →</a></span>',
    de: '<strong>Dreistufige pneumatische Spannvorrichtungen</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Spannen, Lösen und Abblasen auf einer rotierenden Vorrichtung. Drei unabhängige Kanäle stellen getrennte Strömungswege für die Funktionen bereit. <a href="application-cnc-pneumatic-clamping.html">Anwendungsleitfaden lesen →</a></span>',
    ja: '<strong>3ステーション空圧クランプ治具</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">1つの回転治具でクランプ、アンクランプ、エアブローを行います。独立した3流路が各機能に別々の流路を提供します。<a href="application-cnc-pneumatic-clamping.html">用途ガイドを見る →</a></span>',
    ru: '<strong>Трёхпозиционные пневматические зажимные приспособления</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">Зажим, разжим и обдув на одном вращающемся приспособлении. Три независимых канала создают отдельные пути потока для этих функций. <a href="application-cnc-pneumatic-clamping.html">Читать руководство по применению →</a></span>',
  },
  {
    legacySource: '<strong>Dusty or abrasive environments</strong> — this model has no protective shroud or labyrinth. Review BP-2P-50-0001, for which no certified IP rating is currently claimed, or add a separately verified external protection solution.',
    source: '<strong>Dusty or abrasive environments</strong> — this model has no protective shroud or labyrinth. Review BP-2P-50-0001, or add a separately verified external protection solution.',
    de: '<strong>Staubige oder abrasive Umgebungen</strong> – dieses Modell besitzt keine Schutzhaube und kein Labyrinth. Prüfen Sie den BP-2P-50-0001 oder ergänzen Sie eine separat geprüfte äußere Schutzlösung.',
    ja: '<strong>粉じんまたは研磨性粒子のある環境</strong> — 本型式には保護カバーやラビリンスがありません。BP-2P-50-0001を検討するか、別途検証した外部保護を追加してください。',
    ru: '<strong>Запылённая или абразивная среда</strong> — у этой модели нет защитного кожуха и лабиринта. Рассмотрите BP-2P-50-0001 или добавьте отдельно проверенную внешнюю защиту.',
  },
  {
    legacySource: '<strong>Dusty or abrasive environments</strong> — no protective shroud or labyrinth; steel mill dust will contaminate the slip ring contacts and accelerate bearing wear; use BP-2P-50-0001 (protective shroud and labyrinth; no certified IP rating claimed) or add external bellows',
    source: '<strong>Dusty or abrasive environments</strong> — no protective shroud or labyrinth; steel mill dust will contaminate the slip ring contacts and accelerate bearing wear; use BP-2P-50-0001 (protective shroud and labyrinth) or add external bellows',
    de: '<strong>Staubige oder abrasive Umgebungen</strong> – keine Schutzhaube und kein Labyrinth; Stahlstaub kann Schleifringkontakte verunreinigen und den Lagerverschleiß beschleunigen. Verwenden Sie den BP-2P-50-0001 (Schutzhaube und Labyrinth) oder einen externen Faltenbalg',
    ja: '<strong>粉じんまたは研磨性粒子のある環境</strong> — 保護カバーやラビリンスがなく、鉄粉がスリップリング接点を汚染し軸受摩耗を早める可能性があります。BP-2P-50-0001（保護カバー＋ラビリンス）を使用するか、外部ベローズを追加してください',
    ru: '<strong>Запылённая или абразивная среда</strong> — защитный кожух и лабиринт отсутствуют; металлическая пыль может загрязнить контакты токосъёмника и ускорить износ подшипника. Используйте BP-2P-50-0001 (защитный кожух и лабиринт) или внешний сильфон',
  },
  {
    legacySource: '<strong>Dusty or abrasive external environments</strong> — while the Si3N4 seal handles abrasive media, external steel dust will contaminate the bearing and flange threads; use BP-2P-50-0001 (protective shroud and labyrinth; no certified IP rating claimed) or add a protective shroud and bellows',
    source: '<strong>Dusty or abrasive external environments</strong> — while the Si3N4 seal handles abrasive media, external steel dust will contaminate the bearing and flange threads; use BP-2P-50-0001 (protective shroud and labyrinth) or add a protective shroud and bellows',
    de: '<strong>Staubige oder abrasive Außenumgebung</strong> – obwohl die Si3N4-Dichtung abrasive Medien verträgt, kann äußerer Stahlstaub Lager und Flanschgewinde verunreinigen. Verwenden Sie den BP-2P-50-0001 (Schutzhaube und Labyrinth) oder ergänzen Sie Schutzhaube und Faltenbalg',
    ja: '<strong>粉じんまたは研磨性粒子のある外部環境</strong> — Si3N4シールは研磨性流体に対応しますが、外部の鉄粉は軸受やフランジねじを汚染します。BP-2P-50-0001（保護カバー＋ラビリンス）を使用するか、保護カバーとベローズを追加してください',
    ru: '<strong>Запылённая или абразивная внешняя среда</strong> — уплотнение Si3N4 работает с абразивными средами, однако внешняя металлическая пыль загрязняет подшипник и резьбу фланца. Используйте BP-2P-50-0001 (защитный кожух и лабиринт) или добавьте кожух и сильфон',
  },
  {
    legacySource: '<strong>Dusty or abrasive external environments</strong> — while the seal handles clean media, external steel dust or abrasive particles will contaminate the bearing and flange threads, causing seizure; use BP-2P-50-0001 (protective shroud and labyrinth; no certified IP rating claimed) or add external bellows and sealed bearing covers',
    source: '<strong>Dusty or abrasive external environments</strong> — while the seal handles clean media, external steel dust or abrasive particles will contaminate the bearing and flange threads, causing seizure; use BP-2P-50-0001 (protective shroud and labyrinth) or add external bellows and sealed bearing covers',
    de: '<strong>Staubige oder abrasive Außenumgebung</strong> – bei sauberen Medien kann äußerer Stahlstaub oder Abrieb dennoch Lager und Flanschgewinde verunreinigen und zum Festsetzen führen. Verwenden Sie den BP-2P-50-0001 (Schutzhaube und Labyrinth) oder ergänzen Sie äußere Faltenbälge und abgedichtete Lagerabdeckungen',
    ja: '<strong>粉じんまたは研磨性粒子のある外部環境</strong> — 清浄流体に対応するシールでも、外部の鉄粉や粒子が軸受やフランジねじを汚染し、固着を招くことがあります。BP-2P-50-0001（保護カバー＋ラビリンス）を使用するか、外部ベローズと密閉軸受カバーを追加してください',
    ru: '<strong>Запылённая или абразивная внешняя среда</strong> — даже при чистой рабочей среде внешняя металлическая пыль или абразивные частицы могут загрязнить подшипник и резьбу фланца и вызвать заклинивание. Используйте BP-2P-50-0001 (защитный кожух и лабиринт) или внешние сильфоны и герметичные крышки подшипников',
  },
  {
    legacySource: 'Rotary welding tables and pipe rotators operate in harsh environments: weld spatter, grinding dust, and high vibration. Standard rotary joints fail within weeks from dust ingress and side-load damage. Protected designs with sealed bearings and dust shields are essential.',
    source: 'Rotary welding tables and pipe rotators operate around weld spatter, grinding dust, and vibration. Dust ingress and side loads can accelerate wear, so shielding, bearing protection, hose routing, and external loads should be reviewed for the actual installation.',
    de: 'Schweißdrehtische und Rohrrotatoren arbeiten in Umgebungen mit Schweißspritzern, Schleifstaub und Vibrationen. Staubeintrag und Querkräfte können den Verschleiß beschleunigen; deshalb sind Abschirmung, Lagerschutz, Schlauchführung und äußere Lasten für den tatsächlichen Einbau zu prüfen.',
    ja: '溶接用回転テーブルやパイプローテーターは、スパッタ、研削粉じん、振動のある環境で使用されます。粉じんの侵入や横荷重は摩耗を早めることがあるため、実際の取付条件に合わせて遮へい、軸受保護、ホース配管、外力を確認してください。',
    ru: 'Сварочные поворотные столы и трубные вращатели работают в условиях брызг металла, шлифовальной пыли и вибрации. Попадание пыли и боковые нагрузки могут ускорять износ, поэтому для фактической установки следует проверить экранирование, защиту подшипников, прокладку шлангов и внешние нагрузки.',
  },
  {
    legacySource: '<strong>Typical requirement:</strong> Confirm passage count, pressure, speed, mounting, material, weld-spatter exposure, vibration, and the required ingress-protection level from the machine specification. The referenced standard model uses a protective shroud and labyrinth; no certified IP rating is currently claimed.',
    source: '<strong>Typical requirement:</strong> Confirm passage count, pressure, speed, mounting, material, weld-spatter exposure, vibration, and the required ingress-protection level from the machine specification. Match the shielding and external protection to the actual installation.',
    de: '<strong>Typische Anforderung:</strong> Bestätigen Sie Kanalzahl, Druck, Drehzahl, Befestigung, Werkstoff, Schweißspritzerbelastung, Vibration und die in der Maschinenspezifikation geforderte Schutzstufe. Stimmen Sie Abschirmung und äußeren Schutz auf den tatsächlichen Einbau ab.',
    ja: '<strong>代表的な要件：</strong> 流路数、圧力、回転数、取付、材質、溶接スパッタへの暴露、振動、装置仕様で必要な保護レベルを確認してください。遮へいと外部保護を実際の取付環境に合わせます。',
    ru: '<strong>Типовое требование:</strong> Подтвердите число каналов, давление, частоту вращения, монтаж, материал, воздействие сварочных брызг, вибрацию и требуемый по спецификации машины уровень защиты. Подберите экранирование и внешнюю защиту по фактической установке.',
  },
  {
    legacySource: 'Steel mills, foundries, cement plants, and mining equipment can expose rotary joints to abrasive dust, metal chips, and vibration. These applications require an engineering review of contamination, shielding, mounting, and maintenance. A protective shroud and labyrinth can reduce direct exposure, but no certified IP rating is currently claimed for the referenced standard model.',
    source: 'Steel mills, foundries, cement plants, and mining equipment can expose rotary joints to abrasive dust, metal chips, and vibration. Review contamination, shielding, mounting, and maintenance together; a protective shroud and labyrinth can reduce direct exposure.',
    de: 'Stahlwerke, Gießereien, Zementanlagen und Bergbaumaschinen können Drehdurchführungen abrasivem Staub, Metallspänen und Vibrationen aussetzen. Prüfen Sie Verunreinigung, Abschirmung, Befestigung und Wartung gemeinsam; Schutzhaube und Labyrinth können die direkte Belastung verringern.',
    ja: '製鉄所、鋳造所、セメント設備、鉱山機械では、ロータリージョイントが研磨性粉じん、金属切粉、振動にさらされます。汚染、遮へい、取付、保守を一体として確認してください。保護カバーとラビリンスは直接暴露の低減に役立ちます。',
    ru: 'В металлургии, литейном производстве, цементных установках и горном оборудовании вращающиеся соединения подвергаются воздействию абразивной пыли, металлической стружки и вибрации. Совместно оцените загрязнение, экранирование, монтаж и обслуживание; защитный кожух и лабиринт могут снизить прямое воздействие.',
  },
  {
    legacySource: '<strong>Typical requirement:</strong> Confirm passage count, pressure, speed, mounting, body material, filtration, contamination type, shielding, vibration, and the required ingress-protection level. Do not treat a protective shroud or labyrinth as a certified IP rating.',
    source: '<strong>Typical requirement:</strong> Confirm passage count, pressure, speed, mounting, body material, filtration, contamination type, shielding, vibration, and the required ingress-protection level. Select the protective configuration from the actual machine environment.',
    de: '<strong>Typische Anforderung:</strong> Bestätigen Sie Kanalzahl, Druck, Drehzahl, Befestigung, Gehäusewerkstoff, Filtration, Verschmutzungsart, Abschirmung, Vibration und erforderliche Schutzstufe. Wählen Sie die Schutzkonfiguration anhand der tatsächlichen Maschinenumgebung.',
    ja: '<strong>代表的な要件：</strong> 流路数、圧力、回転数、取付、本体材質、ろ過、汚染物の種類、遮へい、振動、必要保護レベルを確認してください。実際の装置環境から保護仕様を選定します。',
    ru: '<strong>Типовое требование:</strong> Подтвердите число каналов, давление, частоту вращения, монтаж, материал корпуса, фильтрацию, тип загрязнения, экранирование, вибрацию и требуемый уровень защиты. Выберите защитную конфигурацию по фактической среде машины.',
  },
  {
    legacySource: 'Protective shroud and labyrinth for dusty environments; no certified IP rating claimed',
    source: 'Protective shroud and labyrinth for dusty industrial environments',
    de: 'Schutzhaube und Labyrinth für staubige Industrieumgebungen',
    ja: '粉じんの多い産業環境向け保護カバーおよびラビリンス',
    ru: 'Защитный кожух и лабиринт для запылённых промышленных условий',
  },
];

const dustyApplicationRows = [
  { legacySource: 'Air Rotary Union for Steel and Dusty Environments', source: 'Rotary Unions for Steel and Dusty Environments', de: 'Drehdurchführungen für Stahlindustrie und staubige Umgebungen', ja: '鉄鋼・粉じん環境向けロータリージョイント', ru: 'Вращающиеся соединения для металлургии и запылённых условий' },
  { legacySource: 'Steel equipment, powder handling, dusty packaging lines, and harsh industrial machines need protected pneumatic rotary joints that resist abrasive contamination, vibration, and early leakage.', source: 'Steel equipment, powder handling, dusty packaging lines, and other harsh industrial machines benefit from protected pneumatic rotary joints that limit direct particle exposure and support stable hose routing.', de: 'Stahlanlagen, Pulverhandhabung, staubige Verpackungslinien und andere raue Industriemaschinen profitieren von geschützten pneumatischen Drehdurchführungen, die die direkte Partikelbelastung begrenzen und eine stabile Schlauchführung unterstützen.', ja: '鉄鋼設備、粉体搬送、粉じんのある包装ラインなどの厳しい産業機械では、粒子の直接侵入を抑え、安定したホース配管を支える保護型空圧ロータリージョイントが有効です。', ru: 'Для металлургического оборудования, работы с порошками, запылённых упаковочных линий и других тяжёлых промышленных машин полезны защищённые пневматические вращающиеся соединения, которые ограничивают прямое воздействие частиц и обеспечивают стабильную прокладку шлангов.' },
  { legacySource: 'Protect the seal from dust, vibration, and abrasive particles', source: 'Reduce particle exposure around seals and bearings', de: 'Partikelbelastung an Dichtungen und Lagern verringern', ja: 'シール・軸受周辺への粒子侵入を低減', ru: 'Снижение воздействия частиц на уплотнения и подшипники' },
  { legacySource: 'In steel plants and dusty production areas, rotary joints fail early when dust enters the seal or bearing area. The operating environment matters as much as pressure and RPM.', source: 'In steel plants and dusty production areas, particles reaching the seal or bearing area can accelerate wear. The operating environment matters as much as pressure and RPM.', de: 'In Stahlwerken und staubigen Produktionsbereichen können Partikel, die Dichtungs- oder Lagerbereiche erreichen, den Verschleiß beschleunigen. Die Betriebsumgebung ist ebenso wichtig wie Druck und Drehzahl.', ja: '製鉄所や粉じんの多い生産区域では、シール部や軸受部に到達した粒子が摩耗を早めることがあります。使用環境は圧力や回転数と同じく重要です。', ru: 'В металлургических и запылённых производственных зонах частицы, попадающие в область уплотнения или подшипника, могут ускорить износ. Рабочая среда так же важна, как давление и частота вращения.' },
  { legacySource: 'For harsh applications, selection should include dust protection, body material, seal type, hose support, installation angle, and maintenance access. A standard open design may work on a clean bench but fail quickly near powder, scale, chips, or smelting dust.', source: 'For harsh applications, selection should include protective features, body material, seal type, hose support, installation angle, and maintenance access. Equipment near powder, scale, chips, or smelting dust may need additional shielding compared with a clean installation.', de: 'Bei rauen Anwendungen sind Schutzmerkmale, Gehäusewerkstoff, Dichtungsart, Schlauchabstützung, Einbaulage und Wartungszugang gemeinsam zu berücksichtigen. Anlagen in der Nähe von Pulver, Zunder, Spänen oder Schmelzstaub können gegenüber einer sauberen Installation zusätzliche Abschirmung benötigen.', ja: '厳しい用途では、保護構造、本体材質、シール形式、ホース支持、取付角度、保守アクセスを含めて選定します。粉体、スケール、切粉、溶解粉じんの近くでは、清浄な設置環境より追加の遮へいが必要になる場合があります。', ru: 'Для тяжёлых условий при выборе следует учитывать защитные элементы, материал корпуса, тип уплотнения, опору шлангов, монтажное положение и доступ для обслуживания. Оборудованию рядом с порошком, окалиной, стружкой или металлургической пылью может потребоваться дополнительное экранирование по сравнению с чистой установкой.' },
  { legacySource: 'Dust-proof air rotary union for steel and dusty environments', source: 'Protected air rotary union for steel and dusty environments', de: 'Geschützte Luftdrehdurchführung für Stahlindustrie und staubige Umgebungen', ja: '鉄鋼・粉じん環境向け保護型エアロータリージョイント', ru: 'Защищённое воздушное вращающееся соединение для металлургии и запылённых условий' },
  { legacySource: 'Typical Dust-Protected Rotary Union Specs', source: 'Selection Inputs for Dusty Environments', de: 'Auswahldaten für staubige Umgebungen', ja: '粉じん環境向け選定入力', ru: 'Исходные данные для выбора в запылённой среде' },
  { legacySource: '<strong>Pressure:</strong> 0.4–1.0 MPa (actuation) — heavy-duty rated for shock loads', source: '<strong>Pressure and speed:</strong> select within the current limits of the chosen model and approved drawing', de: '<strong>Druck und Drehzahl:</strong> innerhalb der aktuellen Grenzwerte des gewählten Modells und der freigegebenen Zeichnung auswählen', ja: '<strong>圧力・回転数：</strong> 選定型式と承認図面の最新限界内で選定', ru: '<strong>Давление и частота вращения:</strong> выбирайте в пределах актуальных значений выбранной модели и согласованного чертежа' },
  { legacySource: '<strong>Passages:</strong> 2–4 (clamp + blow-off + coolant + sensor)', source: '<strong>Passages:</strong> match the required clamp, release, blow-off, or other pneumatic functions', de: '<strong>Kanäle:</strong> auf die benötigten Spann-, Löse-, Abblas- oder sonstigen Pneumatikfunktionen abstimmen', ja: '<strong>流路：</strong> 必要なクランプ、アンクランプ、エアブローなどの空圧機能に合わせる', ru: '<strong>Каналы:</strong> согласуйте с требуемыми функциями зажима, разжима, обдува и другими пневматическими функциями' },
  { legacySource: '<strong>Mounting:</strong> flange with dust shield and anti-rotation bracket', source: '<strong>Mounting:</strong> provide stable anti-rotation support and keep external hose loads away from the rotating interface', de: '<strong>Befestigung:</strong> stabile Verdrehsicherung vorsehen und äußere Schlauchlasten von der rotierenden Schnittstelle fernhalten', ja: '<strong>取付：</strong> 安定した回り止め支持を設け、外部ホース荷重を回転部へ伝えない', ru: '<strong>Монтаж:</strong> обеспечьте стабильную фиксацию от проворачивания и не передавайте внешнюю нагрузку от шлангов на вращающийся интерфейс' },
  { legacySource: '<strong>Bore:</strong> 8–16 mm for large actuators; 6–10 mm for standard cylinders', source: '<strong>Flow:</strong> size the bore and ports for the actuator demand and acceptable pressure drop', de: '<strong>Durchfluss:</strong> Bohrung und Anschlüsse nach Aktuatorbedarf und zulässigem Druckverlust dimensionieren', ja: '<strong>流量：</strong> アクチュエータの必要量と許容圧力損失に合わせて流路径とポートを設定', ru: '<strong>Расход:</strong> подберите проходное отверстие и порты по потребности привода и допустимому падению давления' },
  { legacySource: '<strong>Protection:</strong> protective-shroud or labyrinth design for dusty environments; do not assume a certified IP rating without model-specific confirmation', source: '<strong>Protection:</strong> match the shroud, labyrinth, shielding, and cleaning method to the actual contamination', de: '<strong>Schutz:</strong> Schutzhaube, Labyrinth, Abschirmung und Reinigungsmethode auf die tatsächliche Verunreinigung abstimmen', ja: '<strong>保護：</strong> 保護カバー、ラビリンス、遮へい、清掃方法を実際の汚染条件に合わせる', ru: '<strong>Защита:</strong> подберите кожух, лабиринт, экранирование и способ очистки по фактическому загрязнению' },
  { legacySource: '<strong>Material:</strong> Grade 45 carbon steel or 304 SS — abrasion and spatter resistant', source: '<strong>Materials:</strong> review body, seal, and exposed hardware materials for dust, chips, spatter, temperature, and cleaning conditions', de: '<strong>Werkstoffe:</strong> Gehäuse-, Dichtungs- und freiliegende Beschlagwerkstoffe im Hinblick auf Staub, Späne, Spritzer, Temperatur und Reinigung prüfen', ja: '<strong>材質：</strong> 粉じん、切粉、スパッタ、温度、清掃条件に対して本体、シール、露出金具の材質を確認', ru: '<strong>Материалы:</strong> проверьте материалы корпуса, уплотнения и открытых деталей с учётом пыли, стружки, брызг, температуры и очистки' },
  { legacySource: '2-passage model with a protective-shroud and labyrinth design for dusty packaging and powder handling; no certified IP rating is currently claimed.', source: '2-passage model with a protective-shroud and labyrinth design for dusty packaging and powder handling.', de: 'Zweikanalmodell mit Schutzhaube und Labyrinth für staubige Verpackungslinien und Pulverhandhabung.', ja: '粉じんのある包装ラインや粉体搬送向けに保護カバーとラビリンス構造を備えた2流路モデルです。', ru: 'Двухканальная модель с защитным кожухом и лабиринтом для запылённых упаковочных линий и работы с порошками.' },
  { legacySource: 'Send the machine photos, old part dimensions, dust type, pressure, RPM, and mounting details. Begapunk can review whether a dust-proof or custom protected design is needed.', source: 'Send the machine photos, old part dimensions, dust type, pressure, RPM, and mounting details. Begapunk can review the protective features and mounting approach for the application.', de: 'Senden Sie Maschinenfotos, Maße des Altteils, Staubart, Druck, Drehzahl und Befestigungsdaten. Begapunk prüft Schutzmerkmale und Montagekonzept für die Anwendung.', ja: '装置写真、旧部品寸法、粉じんの種類、圧力、回転数、取付詳細をお送りください。Begapunkが用途に適した保護構造と取付方法を確認します。', ru: 'Отправьте фотографии машины, размеры старой детали, тип пыли, давление, частоту вращения и монтажные данные. Begapunk рассмотрит защитные элементы и способ монтажа для данного применения.' },
  { legacySource: 'Is dust-proof the same as waterproof?', source: 'How does particle protection differ from liquid protection?', de: 'Wie unterscheidet sich Partikelschutz vom Schutz gegen Flüssigkeiten?', ja: '粒子保護と液体保護はどのように異なりますか？', ru: 'Чем защита от частиц отличается от защиты от жидкости?' },
  { legacySource: 'No. Dust-proof design focuses on preventing particles from entering sensitive areas. Water exposure, washdown, or coolant splash should be reviewed separately.', source: 'A protective shroud or labyrinth helps limit direct particle exposure. Water, washdown, and coolant exposure require a separate review of the complete installation and selected configuration.', de: 'Eine Schutzhaube oder ein Labyrinth hilft, die direkte Partikelbelastung zu begrenzen. Wassereinwirkung, Reinigung und Kühlmittelkontakt erfordern eine separate Prüfung der vollständigen Installation und der gewählten Ausführung.', ja: '保護カバーまたはラビリンスは粒子の直接侵入を抑えるのに役立ちます。水への暴露、洗浄、クーラントへの暴露は、設置全体と選定仕様を別途確認する必要があります。', ru: 'Защитный кожух или лабиринт помогает ограничить прямое воздействие частиц. Воздействие воды, мойку и контакт с охлаждающей жидкостью необходимо отдельно оценить для всей установки и выбранного исполнения.' },
];

const remainingToneRows = [
  {
    legacySource: 'Two-passage air model with a protective shroud and labyrinth, rated to 1.0 MPa; no certified IP rating is currently claimed.',
    source: 'Two-passage air model with a protective shroud and labyrinth, rated to 1.0 MPa.',
    de: 'Zweikanal-Luftmodell mit Schutzhaube und Labyrinth, ausgelegt für 1,0 MPa.',
    ja: '保護カバーとラビリンスを備え、1.0 MPaに対応する2流路エアモデルです。',
    ru: 'Двухканальная воздушная модель с защитным кожухом и лабиринтом, рассчитанная на 1,0 МПа.',
  },
  {
    legacySource: 'The integrated S06 slip ring provides 6 circuits rated at 2A max per circuit, supporting 24V DC or 250V AC. Contact material is gold-plated copper alloy for stable, low-resistance signal transmission. Insulation resistance is ≥500 MΩ at 500V DC, and dielectric strength is 500V AC / 50Hz for 60 seconds. The slip ring is designed for mixed power and signal transmission — you can run solenoid valves (inductive), sensors (low-current), and encoder signals on different circuits simultaneously. Download the 2D PDF drawing for pinout, wire color code, and recommended wire gauge (22–24 AWG). For Ethernet or high-frequency signals, specify a custom capacitive or fiber-optic rotary joint.',
    source: 'The integrated S06 slip ring provides six electrical circuits. Confirm voltage, current, contact material, insulation resistance, dielectric strength, signal type, wire color, and conductor size against the approved electrical specification for the selected configuration. Review inductive loads, sensors, encoder signals, Ethernet, and other high-frequency requirements with engineering before wiring.',
    de: 'Der integrierte S06-Schleifring stellt sechs elektrische Stromkreise bereit. Bestätigen Sie Spannung, Strom, Kontaktwerkstoff, Isolationswiderstand, Spannungsfestigkeit, Signalart, Aderfarbe und Leiterquerschnitt anhand der freigegebenen elektrischen Spezifikation für die gewählte Ausführung. Prüfen Sie induktive Lasten, Sensoren, Gebersignale, Ethernet und andere Hochfrequenzanforderungen vor der Verdrahtung mit der Technik.',
    ja: '内蔵のS06スリップリングは6回路の電気回路を備えています。選定仕様の承認済み電気仕様書に基づき、電圧、電流、接点材質、絶縁抵抗、耐電圧、信号種別、電線色、導体サイズを確認してください。誘導負荷、センサー、エンコーダ信号、Ethernet、その他の高周波要件については、配線前に技術部門へ確認してください。',
    ru: 'Встроенный токосъёмник S06 имеет шесть электрических цепей. Сверьте напряжение, ток, материал контактов, сопротивление изоляции, электрическую прочность, тип сигнала, цвет проводов и сечение проводника с согласованной электрической спецификацией выбранного исполнения. Перед подключением согласуйте с инженерами индуктивные нагрузки, датчики, сигналы энкодера, Ethernet и другие высокочастотные требования.',
  },
  {
    legacySource: '<strong>Recommended products</strong> <a href="BP-2P-50-0001.html">BP-2P-50-0001</a> (protective shroud and labyrinth for dusty environments; no certified IP rating claimed), <a href="BP-3P-0004.html">BP-3P-0004</a> (3-passage flange), <a href="BP-4P-30-0001.html">BP-4P-30-0001</a> (4-passage heavy-duty), custom protected layouts with weld spatter shields.',
    source: '<strong>Recommended products</strong> <a href="BP-2P-50-0001.html">BP-2P-50-0001</a> (protective shroud and labyrinth for dusty environments), <a href="BP-3P-0004.html">BP-3P-0004</a> (3-passage flange), <a href="BP-4P-30-0001.html">BP-4P-30-0001</a> (4-passage heavy-duty), custom protected layouts with weld spatter shields.',
    de: '<strong>Empfohlene Produkte</strong> <a href="BP-2P-50-0001.html">BP-2P-50-0001</a> (Schutzhaube und Labyrinth für staubige Umgebungen), <a href="BP-3P-0004.html">BP-3P-0004</a> (3-Kanal-Flansch), <a href="BP-4P-30-0001.html">BP-4P-30-0001</a> (robuste 4-Kanal-Ausführung), kundenspezifische geschützte Ausführungen mit Schweißspritzerschutz.',
    ja: '<strong>推奨製品</strong> <a href="BP-2P-50-0001.html">BP-2P-50-0001</a>（粉じん環境向け保護カバーとラビリンス）、<a href="BP-3P-0004.html">BP-3P-0004</a>（3流路フランジ）、<a href="BP-4P-30-0001.html">BP-4P-30-0001</a>（ヘビーデューティ4流路）、溶接スパッタシールド付きのカスタム保護仕様。',
    ru: '<strong>Рекомендуемые изделия</strong> <a href="BP-2P-50-0001.html">BP-2P-50-0001</a> (защитный кожух и лабиринт для запылённых условий), <a href="BP-3P-0004.html">BP-3P-0004</a> (3-канальное фланцевое исполнение), <a href="BP-4P-30-0001.html">BP-4P-30-0001</a> (усиленное 4-канальное исполнение), а также заказные защищённые исполнения с экранами от сварочных брызг.',
  },
  {
    legacySource: '<strong>Recommended products</strong> <a href="BP-2P-50-0001.html">BP-2P-50-0001</a> (2-passage air model with protective shroud and labyrinth; no certified IP rating claimed), <a href="BP-3P-0004.html">BP-3P-0004</a> (3-passage flange), <a href="BP-4P-30-0001.html">BP-4P-30-0001</a> (heavy-duty 4-passage), custom protected layouts with dust boots and sealed bearings.',
    source: '<strong>Recommended products</strong> <a href="BP-2P-50-0001.html">BP-2P-50-0001</a> (2-passage air model with protective shroud and labyrinth), <a href="BP-3P-0004.html">BP-3P-0004</a> (3-passage flange), <a href="BP-4P-30-0001.html">BP-4P-30-0001</a> (heavy-duty 4-passage), custom protected layouts with dust boots and sealed bearings.',
    de: '<strong>Empfohlene Produkte</strong> <a href="BP-2P-50-0001.html">BP-2P-50-0001</a> (2-Kanal-Luftmodell mit Schutzhaube und Labyrinth), <a href="BP-3P-0004.html">BP-3P-0004</a> (3-Kanal-Flansch), <a href="BP-4P-30-0001.html">BP-4P-30-0001</a> (robuste 4-Kanal-Ausführung), kundenspezifische geschützte Ausführungen mit Staubmanschetten und abgedichteten Lagern.',
    ja: '<strong>推奨製品</strong> <a href="BP-2P-50-0001.html">BP-2P-50-0001</a>（保護カバーとラビリンスを備えた2流路エアモデル）、<a href="BP-3P-0004.html">BP-3P-0004</a>（3流路フランジ）、<a href="BP-4P-30-0001.html">BP-4P-30-0001</a>（ヘビーデューティ4流路）、ダストブーツと密封軸受を備えたカスタム保護仕様。',
    ru: '<strong>Рекомендуемые изделия</strong> <a href="BP-2P-50-0001.html">BP-2P-50-0001</a> (2-канальная воздушная модель с защитным кожухом и лабиринтом), <a href="BP-3P-0004.html">BP-3P-0004</a> (3-канальное фланцевое исполнение), <a href="BP-4P-30-0001.html">BP-4P-30-0001</a> (усиленное 4-канальное исполнение), а также заказные защищённые исполнения с пылезащитными чехлами и уплотнёнными подшипниками.',
  },
];

const resolverRows = [
  {
    source: `<img src="images/optimized/products/BP-2P-50-0001-1.webp" alt="BP-2P-50-0001 protective-shroud and labyrinth rotary joint" loading="lazy" width="500" height="500">
                <span class="portal-date">May 2026</span>
                <strong>BP-2P-50-0001</strong>
                <small>Protective shroud and labyrinth for dusty industrial environments</small>`,
    de: `<img src="images/optimized/products/BP-2P-50-0001-1.webp" alt="BP-2P-50-0001 Drehdurchführung mit Schutzhaube und Labyrinth" loading="lazy" width="500" height="500">
                <span class="portal-date">Mai 2026</span>
                <strong>BP-2P-50-0001</strong>
                <small>Schutzhaube und Labyrinth für staubige Industrieumgebungen</small>`,
    ja: `<img src="images/optimized/products/BP-2P-50-0001-1.webp" alt="BP-2P-50-0001 保護カバーとラビリンス付きロータリージョイント" loading="lazy" width="500" height="500">
                <span class="portal-date">2026年5月</span>
                <strong>BP-2P-50-0001</strong>
                <small>粉じんの多い産業環境向け保護カバーとラビリンス</small>`,
    ru: `<img src="images/optimized/products/BP-2P-50-0001-1.webp" alt="Вращающееся соединение BP-2P-50-0001 с защитным кожухом и лабиринтом" loading="lazy" width="500" height="500">
                <span class="portal-date">Май 2026</span>
                <strong>BP-2P-50-0001</strong>
                <small>Защитный кожух и лабиринт для запылённых промышленных условий</small>`,
  },
  {
    source: 'Protective Shroud &amp; Labyrinth',
    de: 'Schutzhaube &amp; Labyrinth',
    ja: '保護カバー・ラビリンス構造',
    ru: 'Защитный кожух и лабиринт',
  },
  {
    source: 'Commission the joint in stages using the pressure and speed limits approved for the machine. At each stage, check every passage for leakage and monitor friction, heat, vibration, and bearing noise. Increase to full duty only after the installation remains stable.',
    de: 'Nehmen Sie die Drehdurchführung stufenweise innerhalb der für die Maschine freigegebenen Druck- und Drehzahlgrenzen in Betrieb. Prüfen Sie in jeder Stufe jeden Kanal auf Leckage und überwachen Sie Reibung, Erwärmung, Vibrationen und Lagergeräusche. Gehen Sie erst auf Volllast, wenn die Installation stabil bleibt.',
    ja: '装置に承認された圧力・回転数範囲内で、ロータリージョイントを段階的に試運転してください。各段階で全流路の漏れを確認し、摩擦、発熱、振動、軸受音を監視します。取付状態が安定していることを確認してから本運転へ移行してください。',
    ru: 'Вводите вращающееся соединение в работу поэтапно в пределах давления и частоты вращения, разрешённых для машины. На каждом этапе проверяйте каждый канал на утечки и контролируйте трение, нагрев, вибрацию и шум подшипников. Переходите к полной нагрузке только после подтверждения стабильности установки.',
  },
  {
    source: 'Clamp and vacuum pickup on indexing packaging tables. Two independent passages provide separate flow paths for the two functions. <a href="application-packaging-machinery.html">Read application guide →</a>',
    de: 'Spann- und Vakuumaufnahme an taktenden Verpackungstischen. Zwei unabhängige Kanäle stellen getrennte Strömungswege für beide Funktionen bereit. <a href="application-packaging-machinery.html">Anwendungsleitfaden lesen →</a>',
    ja: 'インデックス式包装テーブルのクランプと真空吸着に対応します。独立した2流路が各機能に別々の流路を提供します。<a href="application-packaging-machinery.html">用途ガイドを見る →</a>',
    ru: 'Зажим и вакуумный захват на индексных упаковочных столах. Два независимых канала обеспечивают раздельные пути потока для обеих функций. <a href="application-packaging-machinery.html">Читать руководство по применению →</a>',
  },
  {
    source: '<strong>Low-speed heavy-duty configuration:</strong> Published 80 RPM limit with a dual bolt-circle flange for large rotary tables and machining centers; use the approved drawing for the exact interface.',
    de: '<strong>Robuste Ausführung für niedrige Drehzahlen:</strong> Veröffentlichte Grenze von 80 U/min mit Flansch und zwei Lochkreisen für große Rundtische und Bearbeitungszentren; verwenden Sie für die genaue Schnittstelle die freigegebene Zeichnung.',
    ja: '<strong>低速・ヘビーデューティ仕様：</strong> 大型回転テーブルやマシニングセンタ向けの2重ボルトサークルフランジを備え、公表上限は80 RPMです。正確な取合いは承認図で確認してください。',
    ru: '<strong>Низкоскоростное усиленное исполнение:</strong> опубликованный предел 80 об/мин и фланец с двумя окружностями крепёжных отверстий для крупных поворотных столов и обрабатывающих центров; точный интерфейс сверяйте с согласованным чертежом.',
  },
  {
    source: 'Dual bolt-circle flange mount; see approved drawing',
    de: 'Flanschbefestigung mit zwei Lochkreisen; siehe freigegebene Zeichnung',
    ja: '2重ボルトサークルのフランジ取付；承認図参照',
    ru: 'Фланцевое крепление с двумя окружностями отверстий; см. согласованный чертёж',
  },
  {
    source: 'Use the fastener size, grade, engagement, torque, and tightening sequence stated on the approved drawing and machine-interface specification. Tighten in a cross pattern, keep the flange faces clean and flat, and verify the assembled interface before applying pressure.',
    de: 'Verwenden Sie die in der freigegebenen Zeichnung und der Maschinenschnittstellen-Spezifikation angegebenen Befestigergrößen, Festigkeitsklassen, Einschraubtiefen, Anziehdrehmomente und Anzugsfolgen. Ziehen Sie über Kreuz an, halten Sie die Flanschflächen sauber und eben und prüfen Sie die montierte Schnittstelle vor der Druckbeaufschlagung.',
    ja: '承認図および装置取合い仕様に記載された締結部品のサイズ、強度区分、ねじ掛かり、締付トルク、締付順序を使用してください。対角順に締め付け、フランジ面を清浄かつ平坦に保ち、加圧前に組立後の取合いを確認してください。',
    ru: 'Используйте размер, класс прочности, глубину зацепления, момент и последовательность затяжки крепежа, указанные в согласованном чертеже и спецификации интерфейса машины. Затягивайте крест-накрест, поддерживайте фланцевые поверхности чистыми и плоскими и проверяйте собранное соединение до подачи давления.',
  },
  {
    source: 'Secure the stationary housing to a rigid anti-rotation bracket without transferring pipe or hose load into the joint. Confirm the fastener, bracket stiffness, and clearance to rotating parts against the approved installation drawing.',
    de: 'Befestigen Sie das stationäre Gehäuse an einer steifen Verdrehsicherung, ohne Rohr- oder Schlauchlasten in die Drehdurchführung einzuleiten. Prüfen Sie Befestiger, Haltersteifigkeit und Abstand zu rotierenden Teilen anhand der freigegebenen Einbauzeichnung.',
    ja: '配管やホースの荷重をロータリージョイントへ伝えないよう、固定側ハウジングを剛性のある回り止めブラケットに固定してください。締結部品、ブラケット剛性、回転部との隙間を承認済み取付図で確認してください。',
    ru: 'Закрепите неподвижный корпус на жёстком кронштейне против проворачивания, не передавая на соединение нагрузку от труб или шлангов. Сверьте крепёж, жёсткость кронштейна и зазор до вращающихся деталей с согласованным монтажным чертежом.',
  },
  {
    source: 'Full dimensions, tolerances, thread specifications, flange bolt pattern, P.C.D., shaft-finish requirements, and seal-groove details.',
    de: 'Vollständige Abmessungen, Toleranzen, Gewindeangaben, Flanschlochbild, Lochkreisdurchmesser, Anforderungen an die Wellenoberfläche und Details der Dichtungsnut.',
    ja: '全寸法、公差、ねじ仕様、フランジボルトパターン、P.C.D.、軸表面仕上げ要件、シール溝詳細。',
    ru: 'Полные размеры, допуски, спецификации резьбы, схема отверстий фланца, P.C.D., требования к обработке поверхности вала и параметры канавки уплотнения.',
  },
  {
    source: 'CNC machining center clamp and release at 3–5 MPa. Dual passages provide separate flow paths for the two circuits. <a href="application-cnc-pneumatic-clamping.html">Read application guide →</a>',
    de: 'Spannen und Lösen an CNC-Bearbeitungszentren bei 3–5 MPa. Zwei Kanäle stellen getrennte Strömungswege für beide Kreise bereit. <a href="application-cnc-pneumatic-clamping.html">Anwendungsleitfaden lesen →</a>',
    ja: '3～5 MPaでのCNCマシニングセンタのクランプ・アンクランプに対応します。2流路が2回路に別々の流路を提供します。<a href="application-cnc-pneumatic-clamping.html">用途ガイドを見る →</a>',
    ru: 'Зажим и разжим на обрабатывающем центре с ЧПУ при 3–5 МПа. Два канала обеспечивают раздельные пути потока для двух контуров. <a href="application-cnc-pneumatic-clamping.html">Читать руководство по применению →</a>',
  },
  {
    source: 'Dual hydraulic brake and clamp functions on 4th-axis tables. Confirm the dual bolt-circle flange against the machine interface and approved drawing. <a href="application-cnc-pneumatic-clamping.html">Read application guide →</a>',
    de: 'Hydraulische Brems- und Spannfunktion an Tischen der 4. Achse. Gleichen Sie den Flansch mit zwei Lochkreisen mit der Maschinenschnittstelle und der freigegebenen Zeichnung ab. <a href="application-cnc-pneumatic-clamping.html">Anwendungsleitfaden lesen →</a>',
    ja: '第4軸テーブルの油圧ブレーキとクランプの2機能に対応します。2重ボルトサークルフランジを装置取合いおよび承認図と照合してください。<a href="application-cnc-pneumatic-clamping.html">用途ガイドを見る →</a>',
    ru: 'Две гидравлические функции — торможение и зажим — на столах 4-й оси. Сверьте фланец с двумя окружностями отверстий с интерфейсом машины и согласованным чертежом. <a href="application-cnc-pneumatic-clamping.html">Читать руководство по применению →</a>',
  },
  {
    source: 'Dual Bolt-Circle Flange Mount',
    de: 'Flanschbefestigung mit zwei Lochkreisen',
    ja: '2重ボルトサークルフランジ取付',
    ru: 'Фланцевое крепление с двумя окружностями отверстий',
  },
  {
    source: 'Two-passage flange-mounted rotary joint with Ø30 mm central bore for pneumatic and fluid transfer applications. 6061 aluminum alloy body with PTFE composite seal. Max 150 RPM, Ø76 mm outer diameter, approx. 0.39 kg. Published running torque is ≤5 N·m. Lead time is confirmed for the selected model and order.',
    de: 'Flanschmontierte Zweikanal-Drehdurchführung mit zentraler Bohrung Ø30 mm für Pneumatik- und Flüssigkeitsübertragung. Gehäuse aus Aluminiumlegierung 6061 mit PTFE-Verbunddichtung. Max. 150 U/min, Außendurchmesser Ø76 mm, ca. 0,39 kg. Das veröffentlichte Laufdrehmoment beträgt ≤5 N·m. Die Lieferzeit wird für das ausgewählte Modell und den Auftrag bestätigt.',
    ja: '空圧・流体移送用途向け、中央穴Ø30 mmのフランジ取付2流路ロータリージョイントです。6061アルミニウム合金ボディとPTFE複合シールを採用。最大150 RPM、外径Ø76 mm、質量約0.39 kg。公表回転トルクは≤5 N·mです。納期は選定型式と注文内容に基づき確定します。',
    ru: 'Двухканальное фланцевое вращающееся соединение с центральным отверстием Ø30 мм для передачи воздуха и жидкостей. Корпус из алюминиевого сплава 6061 с композитным уплотнением из ПТФЭ. Макс. 150 об/мин, наружный диаметр Ø76 мм, масса около 0,39 кг. Опубликованный момент вращения — ≤5 Н·м. Срок поставки подтверждается для выбранной модели и заказа.',
  },
  {
    source: '<strong>Bearing-supported rotation:</strong> Published running torque is ≤5 N·m. Support external radial and axial loads separately and confirm alignment for the machine.',
    de: '<strong>Lagergestützte Rotation:</strong> Das veröffentlichte Laufdrehmoment beträgt ≤5 N·m. Stützen Sie äußere Radial- und Axiallasten separat ab und prüfen Sie die Ausrichtung an der Maschine.',
    ja: '<strong>軸受支持回転：</strong> 公表回転トルクは≤5 N·mです。外部のラジアル荷重・アキシアル荷重は別途支持し、装置との芯出しを確認してください。',
    ru: '<strong>Вращение на подшипнике:</strong> опубликованный момент вращения составляет ≤5 Н·м. Обеспечьте отдельную опору для внешних радиальных и осевых нагрузок и проверьте центровку на машине.',
  },
  {
    source: 'BP-2P-30-0001 is a two-passage rotary joint with a 30 mm central bore, designed for pneumatic and light-fluid transfer on automation rotary equipment. The deep-groove ball bearing supports rotation with a published running torque of ≤5 N·m; external radial and axial loads require separate support and alignment review. The sealing configuration may be suitable for selected air, water, or coolant applications, subject to medium compatibility, temperature, pressure, speed, and the approved specification for the selected version.',
    de: 'BP-2P-30-0001 ist eine Zweikanal-Drehdurchführung mit 30-mm-Zentralbohrung für die Übertragung von Druckluft und leichten Flüssigkeiten an rotierenden Automatisierungseinrichtungen. Das Rillenkugellager unterstützt die Rotation bei einem veröffentlichten Laufdrehmoment von ≤5 N·m; äußere Radial- und Axiallasten benötigen eine separate Abstützung und eine Ausrichtungsprüfung. Die Dichtungsausführung kann für ausgewählte Luft-, Wasser- oder Kühlmittelanwendungen geeignet sein, abhängig von Medienverträglichkeit, Temperatur, Druck, Drehzahl und der freigegebenen Spezifikation der gewählten Ausführung.',
    ja: 'BP-2P-30-0001は、中央穴30 mmを備え、回転式自動化設備で空圧および低粘度流体を移送するための2流路ロータリージョイントです。深溝玉軸受が回転を支持し、公表回転トルクは≤5 N·mです。外部のラジアル荷重・アキシアル荷重には別途支持と芯出し確認が必要です。選定仕様の媒体適合性、温度、圧力、回転数、承認仕様に応じて、空気、水、クーラント用途に適用できる場合があります。',
    ru: 'BP-2P-30-0001 — двухканальное вращающееся соединение с центральным отверстием 30 мм для передачи воздуха и лёгких жидкостей во вращающемся автоматизированном оборудовании. Радиальный шарикоподшипник поддерживает вращение с опубликованным моментом ≤5 Н·м; внешние радиальные и осевые нагрузки требуют отдельной опоры и проверки центровки. Конфигурация уплотнения может подходить для отдельных применений с воздухом, водой или охлаждающей жидкостью с учётом совместимости среды, температуры, давления, скорости и согласованной спецификации выбранного исполнения.',
  },
  {
    source: '<strong>Unsupported external radial or axial loads</strong> — provide separate load support and confirm alignment instead of applying machine loads through the rotary joint',
    de: '<strong>Nicht abgestützte äußere Radial- oder Axiallasten</strong> — Lasten separat abstützen und die Ausrichtung prüfen, statt Maschinenlasten durch die Drehdurchführung zu leiten',
    ja: '<strong>支持されていない外部ラジアル・アキシアル荷重</strong> — 装置荷重をロータリージョイントへ伝えず、別途荷重支持を設けて芯出しを確認してください',
    ru: '<strong>Внешние радиальные или осевые нагрузки без отдельной опоры</strong> — предусмотрите отдельную опору и проверьте центровку, не передавая нагрузку машины через вращающееся соединение',
  },
  {
    source: 'Dual air lines, 30 mm bore, medium rotary table, external loads supported separately',
    de: 'Zwei Luftleitungen, 30-mm-Bohrung, mittelgroßer Rundtisch, äußere Lasten separat abgestützt',
    ja: '2系統エア、30 mm穴、中型回転テーブル、外部荷重は別途支持',
    ru: 'Две воздушные линии, отверстие 30 мм, средний поворотный стол, отдельная опора внешних нагрузок',
  },
  {
    source: '✅ Suitable configuration to review — ball bearing, approx. 0.39 kg',
    de: '✅ Geeignete Ausführung zur Prüfung — Kugellager, ca. 0,39 kg',
    ja: '✅ 検討に適した仕様 — 玉軸受、約0.39 kg',
    ru: '✅ Подходящая конфигурация для рассмотрения — шарикоподшипник, около 0,39 кг',
  },
  {
    source: 'Mistake 1: Applying unsupported external load to the joint',
    de: 'Fehler 1: Nicht abgestützte äußere Last auf die Drehdurchführung einleiten',
    ja: '誤り1：支持されていない外部荷重をロータリージョイントへ加える',
    ru: 'Ошибка 1: передача на соединение внешней нагрузки без отдельной опоры',
  },
  {
    source: 'Mistake 3: Applying full duty before commissioning checks',
    de: 'Fehler 3: Volllast vor Abschluss der Inbetriebnahmeprüfungen',
    ja: '誤り3：試運転確認前に本運転を開始する',
    ru: 'Ошибка 3: переход к полной нагрузке до завершения пусковых проверок',
  },
  {
    source: 'Clamp, unclamp, and air-blow on a single rotary fixture. Three independent passages provide separate flow paths for the functions. <a href="application-cnc-pneumatic-clamping.html">Read application guide →</a>',
    de: 'Spannen, Lösen und Abblasen auf einer einzigen rotierenden Vorrichtung. Drei unabhängige Kanäle stellen getrennte Strömungswege für die Funktionen bereit. <a href="application-cnc-pneumatic-clamping.html">Anwendungsleitfaden lesen →</a>',
    ja: '1台の回転治具でクランプ、アンクランプ、エアブローを行います。独立した3流路が各機能に別々の流路を提供します。<a href="application-cnc-pneumatic-clamping.html">用途ガイドを見る →</a>',
    ru: 'Зажим, разжим и обдув на одном вращающемся приспособлении. Три независимых канала обеспечивают раздельные пути потока для этих функций. <a href="application-cnc-pneumatic-clamping.html">Читать руководство по применению →</a>',
  },
  {
    source: 'The standard BP-3P-0006 uses a full 6061 aluminum alloy body for light weight and good corrosion resistance. Its published envelope is Ø64 × 78 mm with an approximate mass of 0.36 kg. For full steel construction or special surface treatments, contact our engineering team. Inspection requirements and available records are confirmed for each model and order. Confirm required material and inspection documentation before ordering.',
    de: 'Der standardmäßige BP-3P-0006 besitzt ein vollständiges Gehäuse aus Aluminiumlegierung 6061 für geringes Gewicht und gute Korrosionsbeständigkeit. Die veröffentlichten Außenmaße betragen Ø64 × 78 mm bei einer ungefähren Masse von 0,36 kg. Für eine vollständige Stahlausführung oder besondere Oberflächenbehandlungen wenden Sie sich an unser Technikteam. Prüfanforderungen und verfügbare Nachweise werden für jedes Modell und jeden Auftrag bestätigt. Bestätigen Sie die benötigten Werkstoff- und Prüfdokumente vor der Bestellung.',
    ja: '標準BP-3P-0006は、軽量性と良好な耐食性を得るため、ボディ全体に6061アルミニウム合金を使用しています。公表外形はØ64 × 78 mm、質量は約0.36 kgです。全鋼製または特殊表面処理については技術チームへお問い合わせください。検査要件と提供可能な記録は型式・注文ごとに確定します。注文前に必要な材質証明および検査文書を確認してください。',
    ru: 'Стандартный BP-3P-0006 имеет цельный корпус из алюминиевого сплава 6061, обеспечивающий малую массу и хорошую коррозионную стойкость. Опубликованные габариты составляют Ø64 × 78 мм при приблизительной массе 0,36 кг. По вопросам полностью стального исполнения или специальной обработки поверхности обращайтесь к нашей инженерной команде. Требования к контролю и доступные записи подтверждаются для каждой модели и заказа. До заказа согласуйте необходимые документы по материалам и контролю.',
  },
  {
    source: 'Separate passages can support adhesive, air-purge, and clamp functions on small dispensing rotary stations; confirm material compatibility and flow control for the process.',
    de: 'Getrennte Kanäle können Klebstoff-, Luftspül- und Spannfunktionen an kleinen rotierenden Dosierstationen unterstützen; bestätigen Sie Werkstoffverträglichkeit und Durchflussregelung für den Prozess.',
    ja: '独立流路により、小型回転塗布ステーションの接着剤、エアパージ、クランプ機能を構成できます。工程に対する材質適合性と流量制御を確認してください。',
    ru: 'Раздельные каналы могут обеспечивать подачу клея, воздушную продувку и зажим на небольших вращающихся дозирующих станциях; подтвердите совместимость материалов и регулирование расхода для процесса.',
  },
  {
    source: 'See approved electrical specification',
    de: 'Siehe freigegebene elektrische Spezifikation',
    ja: '承認済み電気仕様書を参照',
    ru: 'См. согласованную электрическую спецификацию',
  },
  {
    source: 'Commission the joint in stages using the pressure and speed limits approved for the machine. At each stage, check every pneumatic passage for leakage and verify the electrical circuits against the approved electrical specification. Monitor friction, heat, vibration, bearing noise, and signal stability. Increase to full duty only after the installation remains stable.',
    de: 'Nehmen Sie die Drehdurchführung stufenweise innerhalb der für die Maschine freigegebenen Druck- und Drehzahlgrenzen in Betrieb. Prüfen Sie in jeder Stufe jeden Pneumatikkanal auf Leckage und gleichen Sie die elektrischen Stromkreise mit der freigegebenen elektrischen Spezifikation ab. Überwachen Sie Reibung, Erwärmung, Vibrationen, Lagergeräusche und Signalstabilität. Gehen Sie erst auf Volllast, wenn die Installation stabil bleibt.',
    ja: '装置に承認された圧力・回転数範囲内で、ロータリージョイントを段階的に試運転してください。各段階で全空圧流路の漏れを確認し、電気回路を承認済み電気仕様書と照合します。摩擦、発熱、振動、軸受音、信号安定性を監視し、取付状態が安定していることを確認してから本運転へ移行してください。',
    ru: 'Вводите вращающееся соединение в работу поэтапно в пределах давления и частоты вращения, разрешённых для машины. На каждом этапе проверяйте каждый пневматический канал на утечки и сверяйте электрические цепи с согласованной электрической спецификацией. Контролируйте трение, нагрев, вибрацию, шум подшипников и стабильность сигналов. Переходите к полной нагрузке только после подтверждения стабильности установки.',
  },
  {
    source: 'If your model includes an anti-rotation tab, secure it to a fixed bracket with an M3 screw. <strong>Do not let the body rotate freely with the shaft.</strong> Free rotation can twist all 8 pneumatic hoses together and create substantial torsional load. Use a rigid metal bracket bolted to the machine frame, not a zip-tie or cable clamp.',
    de: 'Wenn Ihr Modell eine Verdrehsicherungslasche besitzt, befestigen Sie sie mit einer M3-Schraube an einer festen Halterung. <strong>Lassen Sie das Gehäuse nicht frei mit der Welle rotieren.</strong> Freie Rotation kann alle 8 Pneumatikschläuche miteinander verdrehen und eine erhebliche Torsionslast erzeugen. Verwenden Sie eine steife Metallhalterung, die mit dem Maschinenrahmen verschraubt ist, und keinen Kabelbinder oder eine Kabelschelle.',
    ja: '選定型式に回り止めタブがある場合は、M3ねじで固定ブラケットへ取り付けてください。<strong>ボディを軸と一緒に自由回転させないでください。</strong> 自由回転すると8本の空圧ホースがまとめてねじれ、大きなねじり荷重が生じることがあります。結束バンドやケーブルクランプではなく、装置フレームにボルト固定した剛性のある金属ブラケットを使用してください。',
    ru: 'Если выбранная модель оснащена упором против проворачивания, закрепите его на неподвижном кронштейне винтом M3. <strong>Не допускайте свободного вращения корпуса вместе с валом.</strong> Свободное вращение может скрутить вместе все 8 пневматических шлангов и создать значительную крутящую нагрузку. Используйте жёсткий металлический кронштейн, прикреплённый болтами к раме машины, а не кабельную стяжку или зажим.',
  },
  {
    source: '<strong>Typical requirement:</strong> 2–4 independent air passages at 0.3–0.6 MPa, 60–120 RPM indexing speed, with flange mount for anti-rotation stability. Multi-passage layouts provide separate flow paths for clamp and vacuum circuits; confirm the required cross-port leakage limit for the selected configuration.',
    de: '<strong>Typische Anforderung:</strong> 2–4 unabhängige Luftkanäle bei 0,3–0,6 MPa, 60–120 U/min im Taktbetrieb und Flanschbefestigung für stabile Verdrehsicherung. Mehrkanalausführungen stellen getrennte Strömungswege für Spann- und Vakuumkreise bereit; bestätigen Sie den erforderlichen Grenzwert für kanalübergreifende Leckage der gewählten Ausführung.',
    ja: '<strong>代表的な要件：</strong> 0.3～0.6 MPaの独立した空気流路2～4本、インデックス回転数60～120 RPM、安定した回り止めのためのフランジ取付。多流路仕様はクランプ回路と真空回路に別々の流路を提供します。選定仕様に必要な流路間漏れ限界を確認してください。',
    ru: '<strong>Типичное требование:</strong> 2–4 независимых воздушных канала при 0,3–0,6 МПа, индексная скорость 60–120 об/мин и фланцевое крепление для устойчивой фиксации от проворачивания. Многоканальные исполнения обеспечивают раздельные пути потока для контуров зажима и вакуума; подтвердите требуемый предел межканальной утечки для выбранного исполнения.',
  },
  {
    source: '(protective shroud and labyrinth for dusty environments),',
    de: '(Schutzhaube und Labyrinth für staubige Umgebungen),',
    ja: '（粉じん環境向け保護カバーとラビリンス）、',
    ru: '(защитный кожух и лабиринт для запылённых условий),',
  },
  {
    source: 'Protected Rotary Union Selection',
    de: 'Auswahl geschützter Drehdurchführungen',
    ja: '保護型ロータリージョイントの選定',
    ru: 'Выбор защищённого вращающегося соединения',
  },
  {
    source: 'Protective-shroud and labyrinth design or a custom protected rotary union matched to the machine environment',
    de: 'Ausführung mit Schutzhaube und Labyrinth oder eine kundenspezifisch geschützte Drehdurchführung, abgestimmt auf die Maschinenumgebung',
    ja: '装置環境に合わせた保護カバー・ラビリンス構造、またはカスタム保護型ロータリージョイント',
    ru: 'Исполнение с защитным кожухом и лабиринтом либо заказное защищённое вращающееся соединение, подобранное под условия машины',
  },
  {
    source: 'Particle protection, clean air, simple maintenance',
    de: 'Partikelschutz, saubere Luft, einfache Wartung',
    ja: '粒子保護、清浄な空気、容易な保守',
    ru: 'Защита от частиц, чистый воздух, простое обслуживание',
  },
  {
    source: '<strong>BP-2P-50-0001</strong><span>2-passage model with a protective-shroud and labyrinth design for dusty packaging and powder handling.</span>',
    de: '<strong>BP-2P-50-0001</strong><span>Zweikanalmodell mit Schutzhaube und Labyrinth für staubige Verpackungslinien und Pulverhandhabung.</span>',
    ja: '<strong>BP-2P-50-0001</strong><span>粉じんの多い包装ラインや粉体搬送向けの保護カバー・ラビリンス構造を備えた2流路モデル。</span>',
    ru: '<strong>BP-2P-50-0001</strong><span>Двухканальная модель с защитным кожухом и лабиринтом для запылённых упаковочных линий и работы с порошками.</span>',
  },
  {
    source: 'Rotary Unions for Steel and Dusty Environments | Begapunk',
    de: 'Drehdurchführungen für Stahlindustrie und staubige Umgebungen | Begapunk',
    ja: '鉄鋼・粉じん環境向けロータリージョイント | Begapunk',
    ru: 'Вращающиеся соединения для металлургии и запылённых условий | Begapunk',
  },
];

const p1SelectionRows = [
  {
    legacySource: '✅ Perfect',
    source: '✅ Strong match',
    de: '✅ Geeignet',
    ja: '✅ 適合候補',
    ru: '✅ Подходит',
  },
  {
    legacySource: '✅ Perfect — 0.39 kg, M5 mount',
    source: '✅ Strong match — 0.39 kg, M5 mount',
    de: '✅ Geeignet — ca. 0,39 kg, M5-Montage',
    ja: '✅ 適合候補 — 約0.39 kg、M5取付',
    ru: '✅ Подходит — около 0,39 кг, крепление M5',
  },
  {
    legacySource: '✅ Perfect — 220 g, Ø64 mm',
    source: '✅ Strong match — 220 g, Ø64 mm',
    de: '✅ Geeignet — ca. 220 g, Ø64 mm',
    ja: '✅ 適合候補 — 約220 g、外径Ø64 mm',
    ru: '✅ Подходит — около 220 г, Ø64 мм',
  },
  {
    legacySource: '✅ Perfect — 265 g AL6061',
    source: '✅ Strong match — 265 g AL6061',
    de: '✅ Geeignet — ca. 265 g, AL6061',
    ja: '✅ 適合候補 — 265 g、AL6061',
    ru: '✅ Подходит — 265 г, AL6061',
  },
  {
    legacySource: '✅ Perfect — 4-M5 flange, 0.41 kg',
    source: '✅ Strong match — 4-M5 flange, 0.41 kg',
    de: '✅ Geeignet — 4-M5-Flansch, ca. 0,41 kg',
    ja: '✅ 適合候補 — 4-M5フランジ、約0.41 kg',
    ru: '✅ Подходит — фланец 4-M5, около 0,41 кг',
  },
  {
    legacySource: '✅ Perfect — dual passage, rigid flange',
    source: '✅ Strong match — dual passage, rigid flange',
    de: '✅ Geeignet — Zweikanal-Ausführung mit steifer Flanschmontage',
    ja: '✅ 適合候補 — 2流路、高剛性フランジ取付',
    ru: '✅ Подходит — два канала, жёсткое фланцевое крепление',
  },
  {
    legacySource: '✅ Perfect — highest passage count in standard range',
    source: '✅ Strong match — highest passage count in standard range',
    de: '✅ Geeignet — höchste Kanalzahl im Standardsortiment',
    ja: '✅ 適合候補 — 標準範囲で最大の流路数',
    ru: '✅ Подходит — максимальное число каналов в стандартной линейке',
  },
  {
    legacySource: '✅ Perfect — integrated pneumatic-electric',
    source: '✅ Strong match — integrated pneumatic-electric',
    de: '✅ Geeignet — integrierte Pneumatik und Elektrik',
    ja: '✅ 適合候補 — 空圧・電気一体型',
    ru: '✅ Подходит — объединённые пневматические и электрические цепи',
  },
  {
    legacySource: '✅ Perfect — quad passage with through-bore',
    source: '✅ Strong match — quad passage with through-bore',
    de: '✅ Geeignet — vier Kanäle mit Durchgangsbohrung',
    ja: '✅ 適合候補 — 4流路、貫通穴付き',
    ru: '✅ Подходит — четыре канала со сквозным отверстием',
  },
];

const p1LocalizedFaqRows = [
  {
    source: 'The standard version uses 6061 aluminum alloy construction as specified by the formal engineering drawing. Inspection requirements and available records are confirmed for each model and order. The domestic and export designations refer only to packaging and documentation language — the product itself is identical. For custom materials, contact our engineering team.',
    de: 'Die Bezeichnungen „Inland“ und „Export“ beziehen sich auf Verpackung und Dokumentationssprache. Die technische Ausführung wird für den Auftrag anhand der aktuellen Produktseite, des Angebots und der freigegebenen Zeichnung bestätigt. Die Standardzeichnung nennt Aluminiumlegierung 6061 als Gehäusewerkstoff; Sonderwerkstoffe können projektbezogen geprüft werden.',
    ja: '「国内向け」「輸出向け」の区分は、梱包と文書の言語に関するものです。技術仕様は、最新の製品ページ、見積書、承認図面に基づき注文ごとに確認します。標準図面のボディ材質は6061アルミニウム合金で、特殊材質は案件ごとに検討できます。',
    ru: 'Обозначения «для внутреннего рынка» и «для экспорта» относятся к упаковке и языку документации. Техническое исполнение подтверждается для заказа по актуальной странице изделия, предложению и согласованному чертежу. В стандартном чертеже указан корпус из алюминиевого сплава 6061; специальные материалы рассматриваются для конкретного проекта.',
  },
  {
    source: 'The standard version uses full AL6061 construction for higher strength and durability in a lightweight package. Inspection requirements and available records are confirmed for each model and order. The domestic and export designations refer only to packaging and documentation language — the product itself is identical. For full steel body options or custom materials, contact our engineering team.',
    de: 'Die Bezeichnungen „Inland“ und „Export“ beziehen sich auf Verpackung und Dokumentationssprache. Die technische Ausführung wird für den Auftrag anhand der aktuellen Produktseite, des Angebots und der freigegebenen Zeichnung bestätigt. Die Standardausführung besitzt ein leichtes Gehäuse aus Aluminium 6061; Vollstahl- oder Sonderwerkstoffausführungen können projektbezogen geprüft werden.',
    ja: '「国内向け」「輸出向け」の区分は、梱包と文書の言語に関するものです。技術仕様は、最新の製品ページ、見積書、承認図面に基づき注文ごとに確認します。標準仕様は軽量なAL6061製本体で、全鋼製や特殊材質は案件ごとに検討できます。',
    ru: 'Обозначения «для внутреннего рынка» и «для экспорта» относятся к упаковке и языку документации. Техническое исполнение подтверждается для заказа по актуальной странице изделия, предложению и согласованному чертежу. Стандартная версия имеет лёгкий корпус из алюминия 6061; полностью стальные и специальные материалы рассматриваются для конкретного проекта.',
  },
];

const p0FreezeRows = [
  {
    legacySource: '<strong>100 RPM rating matches slow-speed heavy industry:</strong> Steel mill and foundry rotary tables typically index at 5–30 RPM; the 100 RPM rating provides 3× margin without seal overheating',
    source: '<strong>100 RPM published speed limit:</strong> Confirm the actual pressure, medium, temperature, duty cycle, contamination controls, and installation against the current product page and approved drawing before selection.',
    de: '<strong>Veröffentlichte Drehzahlgrenze von 100 U/min:</strong> Prüfen Sie vor der Auswahl den tatsächlichen Druck, das Medium, die Temperatur, den Arbeitszyklus, die Maßnahmen gegen Verunreinigung und den Einbau anhand der aktuellen Produktseite und der freigegebenen Zeichnung.',
    ja: '<strong>公表回転数上限100 RPM：</strong> 選定前に、実際の圧力、媒体、温度、デューティサイクル、異物対策、取付条件を最新の製品ページと承認図で確認してください。',
    ru: '<strong>Опубликованный предел скорости 100 об/мин:</strong> До выбора проверьте фактические давление, среду, температуру, рабочий цикл, меры защиты от загрязнений и монтаж по актуальной странице изделия и согласованному чертежу.',
  },
  {
    legacySource: 'Air purge + vacuum hold on bottle and drum filling in dusty food-grade packaging. Specify FDA seal if required.',
    source: 'Air purge and vacuum hold on bottle and drum filling equipment. For regulated or food-contact service, review wetted materials, seal compound, cleaning chemistry, and required documentation for the specific project.',
    de: 'Luftspülung und Vakuumhaltung an Anlagen zum Befüllen von Flaschen und Fässern. Für regulierte Anwendungen oder Lebensmittelkontakt werden medienberührte Werkstoffe, Dichtungswerkstoff, Reinigungschemie und erforderliche Dokumentation projektbezogen geprüft.',
    ja: 'ボトル・ドラム充填設備のエアパージと真空保持。規制対象用途または食品接触用途では、接液部材質、シール材質、洗浄薬品、必要書類を案件ごとに確認します。',
    ru: 'Воздушная продувка и вакуумное удержание в оборудовании для наполнения бутылок и бочек. Для регулируемых применений или контакта с пищевой продукцией смачиваемые материалы, материал уплотнения, моющая химия и необходимая документация проверяются для конкретного проекта.',
  },
  {
    legacySource: 'Extreme dust (&gt;500 mg/m³ metal grinding dust)',
    source: 'High particle load or metal grinding dust',
    de: 'Hohe Partikelbelastung oder Metall-Schleifstaub',
    ja: '高濃度の粒子または金属研削粉じん',
    ru: 'Высокая концентрация частиц или металлической шлифовальной пыли',
  },
  {
    legacySource: '⚠ Marginal',
    source: '⚠ Engineering review',
    de: '⚠ Technische Prüfung',
    ja: '⚠ 技術確認',
    ru: '⚠ Техническая проверка',
  },
  {
    legacySource: '<a href="contact.html">Custom sealed bearing + purge</a>',
    source: '<a href="contact.html">Review protected configuration and purge options</a>',
    de: '<a href="contact.html">Geschützte Ausführung und Spüloptionen prüfen</a>',
    ja: '<a href="contact.html">保護仕様とパージの選択肢を確認</a>',
    ru: '<a href="contact.html">Рассмотреть защищённое исполнение и варианты продувки</a>',
  },
  {
    legacySource: 'Pressurized purge port prevents dust ingress even in extreme environments',
    source: 'Match shielding, purge provisions, bearing protection, cleaning method, and maintenance access to the actual contamination conditions',
    de: 'Abschirmung, Spülvorrichtungen, Lagerschutz, Reinigungsverfahren und Wartungszugang an die tatsächlichen Verschmutzungsbedingungen anpassen',
    ja: '遮へい、パージ構成、軸受保護、清掃方法、保守アクセスを実際の汚染条件に合わせる',
    ru: 'Согласовать экранирование, продувку, защиту подшипников, способ очистки и доступ для обслуживания с фактическими условиями загрязнения',
  },
  {
    legacySource: '<strong>Common mistake:</strong> Installing a standard FKM-sealed joint on a 400 RPM indexing table. The FKM seal overheats and hardens within two weeks. The joint leaks. The engineer blames the manufacturer — but the specification was wrong.',
    source: '<strong>Common mistake:</strong> Selecting an FKM-sealed joint for a high-speed indexing table without reviewing pressure, speed, temperature, duty cycle, lubrication, and seal suitability. Confirm the combined operating conditions against the selected model and approved specification.',
    de: '<strong>Häufiger Fehler:</strong> Auswahl einer Drehdurchführung mit FKM-Dichtung für einen schnelllaufenden Rundschalttisch, ohne Druck, Drehzahl, Temperatur, Arbeitszyklus, Schmierung und Dichtungseignung zu prüfen. Bestätigen Sie die kombinierten Betriebsbedingungen anhand des gewählten Modells und der freigegebenen Spezifikation.',
    ja: '<strong>よくある誤り：</strong> 圧力、回転数、温度、デューティサイクル、潤滑、シール適合性を確認せずに、高速インデックステーブルへFKMシール仕様を選定すること。選定型式と承認仕様に基づいて複合運転条件を確認してください。',
    ru: '<strong>Распространённая ошибка:</strong> выбор соединения с уплотнением FKM для высокоскоростного индексного стола без проверки давления, скорости, температуры, рабочего цикла, смазки и пригодности уплотнения. Подтвердите совокупные рабочие условия для выбранной модели по согласованной спецификации.',
  },
  {
    legacySource: 'A rigid anti-rotation setup that prevents the union from floating will cause seal wear and leakage within weeks.',
    source: 'A rigid anti-rotation setup that prevents the union from accommodating permitted movement can transfer misalignment or side load into the seal and bearing. Follow the clearance and support requirements in the approved installation instructions.',
    de: 'Eine starre Verdrehsicherung, die zulässige Bewegungen der Drehdurchführung verhindert, kann Fluchtfehler oder Seitenlasten auf Dichtung und Lager übertragen. Befolgen Sie die Vorgaben zu Freiraum und Abstützung in der freigegebenen Montageanleitung.',
    ja: '許容される動きを吸収できない剛固定の回り止めは、芯ずれや横荷重をシールと軸受へ伝えるおそれがあります。承認済み取付要領のクリアランスと支持条件に従ってください。',
    ru: 'Жёсткая фиксация от проворачивания, не допускающая разрешённого перемещения соединения, может передавать несоосность или боковую нагрузку на уплотнение и подшипник. Соблюдайте требования к зазорам и опорам в согласованной инструкции по монтажу.',
  },
  {
    legacySource: 'Use the 3× M5 mounting holes on the rotor side to secure the rotary joint body to a fixed bracket. Torque M5 bolts to 3–5 N·m. Never let the body rotate freely with the shaft — the supply hoses will twist and the seal will experience reverse torque, accelerating wear. The anti-rotation bracket must not apply side load to the body — side loads &gt;5 N will damage the deep groove ball bearing and increase idle torque.',
    source: 'Use the 3× M5 mounting holes on the rotor side to secure the rotary joint body to a fixed bracket. Torque M5 bolts to 3–5 N·m. Never let the body rotate freely with the shaft — the supply hoses will twist and the seal will experience reverse torque, accelerating wear. Support external loads separately, and confirm bracket clearance and alignment against the approved installation drawing so the anti-rotation bracket does not apply side load to the body.',
    de: 'Befestigen Sie das Gehäuse der Drehdurchführung über die drei M5-Bohrungen auf der Rotorseite an einer festen Halterung. Ziehen Sie die M5-Schrauben mit 3–5 N·m an. Lassen Sie das Gehäuse niemals frei mit der Welle drehen – sonst verdrehen sich die Versorgungsschläuche, und die Dichtung wird durch ein Gegenmoment zusätzlich belastet. Stützen Sie äußere Lasten separat ab und prüfen Sie Freiraum sowie Ausrichtung der Halterung anhand der freigegebenen Montagezeichnung, damit die Verdrehsicherung keine Seitenlast auf das Gehäuse ausübt.',
    ja: 'ロータ側の3×M5取付穴を使用して、ロータリージョイント本体を固定ブラケットへ取り付けます。M5ボルトは3～5 N·mで締め付けてください。本体を軸とともに自由回転させると、供給ホースがねじれ、シールに逆トルクが加わって摩耗が進むため避けてください。外部荷重は別に支持し、回り止めブラケットが本体へ横荷重を加えないよう、承認済み取付図でブラケットのクリアランスと芯出しを確認してください。',
    ru: 'Закрепите корпус вращающегося соединения на неподвижном кронштейне через три отверстия M5 со стороны ротора. Затяните болты M5 моментом 3–5 Н·м. Не допускайте свободного вращения корпуса вместе с валом: подводящие шланги будут скручиваться, а обратный момент ускорит износ уплотнения. Внешние нагрузки воспринимайте отдельными опорами и проверьте зазор и соосность кронштейна по согласованному монтажному чертежу, чтобы кронштейн не создавал боковую нагрузку на корпус.',
  },
  {
    legacySource: 'The standard version uses full AL6061 construction for higher strength and durability. For aluminum body options, contact our team. Documentation requirements are confirmed for the selected model and order. Both versions use the same PTFE composite seal and have identical pressure, speed, and temperature ratings. Lead time is the same for both versions.',
    source: 'Specifications are defined by the selected model and supplied version, not by a domestic or export label. Confirm the body material, seal configuration, pressure, speed, temperature range, documentation, and lead time in the quotation or order and the approved drawing.',
    de: 'Die Spezifikationen werden durch das gewählte Modell und die gelieferte Ausführung bestimmt, nicht durch die Bezeichnung als Inlands- oder Exportversion. Bestätigen Sie Gehäusewerkstoff, Dichtungsausführung, Druck, Drehzahl, Temperaturbereich, Dokumentation und Lieferzeit im Angebot oder Auftrag sowie in der freigegebenen Zeichnung.',
    ja: '仕様は国内向け・輸出向けという呼称ではなく、選定型式と納入仕様によって決まります。本体材質、シール構成、圧力、回転数、温度範囲、提出書類、納期を見積書または注文書と承認図で確認してください。',
    ru: 'Характеристики определяются выбранной моделью и поставляемым исполнением, а не обозначением «для внутреннего рынка» или «на экспорт». Подтвердите материал корпуса, конфигурацию уплотнения, давление, скорость, диапазон температур, документацию и срок поставки в предложении или заказе и в согласованном чертеже.',
  },
];

p0FreezeRows.push({
  legacySource: 'The standard version uses 6061 aluminum alloy body with PTFE composite seal and deep groove ball bearing. For full steel options or higher-temperature variants, contact our team. Documentation requirements are confirmed for the selected model and order. Both versions have identical pressure, speed, and temperature ratings. The deep groove ball bearing is standard on all versions.',
  source: 'Specifications are defined by the selected model and supplied version. Confirm the body material, seal configuration, bearing specification, pressure, speed, temperature range, documentation, and lead time in the quotation or order and the approved drawing.',
  de: 'Die Spezifikationen werden durch das gewählte Modell und die gelieferte Ausführung bestimmt. Bestätigen Sie Gehäusewerkstoff, Dichtungsausführung, Lagerspezifikation, Druck, Drehzahl, Temperaturbereich, Dokumentation und Lieferzeit im Angebot oder Auftrag sowie in der freigegebenen Zeichnung.',
  ja: '仕様は選定型式と納入仕様によって決まります。本体材質、シール構成、軸受仕様、圧力、回転数、温度範囲、提出書類、納期を見積書または注文書と承認図で確認してください。',
  ru: 'Характеристики определяются выбранной моделью и поставляемым исполнением. Подтвердите материал корпуса, конфигурацию уплотнения, спецификацию подшипника, давление, скорость, диапазон температур, документацию и срок поставки в предложении или заказе и в согласованном чертеже.',
});

p0FreezeRows.push({
  legacySource: 'No bore = simpler, lower cost for same pressure and speed',
  source: 'Compare the current published pressure and speed ratings for both models before selection.',
  de: 'Vergleichen Sie vor der Auswahl die aktuell veröffentlichten Druck- und Drehzahlwerte beider Modelle.',
  ja: '選定前に、両型式の最新の公開圧力・回転速度定格を比較してください。',
  ru: 'Перед выбором сравните актуальные опубликованные значения давления и частоты вращения для обеих моделей.',
});

const fixedDeratingRows = [
  {
    legacySource: '1 MPa (10 bar / 145 psi) — derate to 0.7 MPa for continuous water duty',
    source: '1 MPa (10 bar / 145 psi) — confirm the allowable continuous-duty pressure for the actual medium, speed, temperature, duty cycle, and approved drawing',
    de: '1 MPa (10 bar / 145 psi) — den zulässigen Druck im Dauerbetrieb anhand des tatsächlichen Mediums, der Drehzahl, der Temperatur, des Arbeitszyklus und der freigegebenen Zeichnung bestätigen',
    ja: '1 MPa（10 bar / 145 psi）— 実際の媒体、回転数、温度、デューティサイクル、承認図に基づき、連続運転時の許容圧力を確認',
    ru: '1 МПа (10 бар / 145 psi) — допустимое давление при непрерывной работе подтверждается с учётом фактической среды, частоты вращения, температуры, рабочего цикла и согласованного чертежа',
  },
  {
    legacySource: '1 MPa (10 bar / 145 psi) — derate to 0.7 MPa for continuous water or coolant duty',
    source: '1 MPa (10 bar / 145 psi) — confirm the allowable continuous-duty pressure for the actual medium, speed, temperature, duty cycle, and approved drawing',
    de: '1 MPa (10 bar / 145 psi) — den zulässigen Druck im Dauerbetrieb anhand des tatsächlichen Mediums, der Drehzahl, der Temperatur, des Arbeitszyklus und der freigegebenen Zeichnung bestätigen',
    ja: '1 MPa（10 bar / 145 psi）— 実際の媒体、回転数、温度、デューティサイクル、承認図に基づき、連続運転時の許容圧力を確認',
    ru: '1 МПа (10 бар / 145 psi) — допустимое давление при непрерывной работе подтверждается с учётом фактической среды, частоты вращения, температуры, рабочего цикла и согласованного чертежа',
  },
  {
    legacySource: '5 MPa (50 bar / 725 psi) — derate to 4 MPa for continuous hydraulic oil duty above 60 RPM',
    source: '5 MPa (50 bar / 725 psi) — confirm the allowable continuous-duty pressure for the actual medium, speed, temperature, duty cycle, and approved drawing',
    de: '5 MPa (50 bar / 725 psi) — den zulässigen Druck im Dauerbetrieb anhand des tatsächlichen Mediums, der Drehzahl, der Temperatur, des Arbeitszyklus und der freigegebenen Zeichnung bestätigen',
    ja: '5 MPa（50 bar / 725 psi）— 実際の媒体、回転数、温度、デューティサイクル、承認図に基づき、連続運転時の許容圧力を確認',
    ru: '5 МПа (50 бар / 725 psi) — допустимое давление при непрерывной работе подтверждается с учётом фактической среды, частоты вращения, температуры, рабочего цикла и согласованного чертежа',
  },
  {
    legacySource: '500 RPM — derate to 300 RPM for continuous water or coolant',
    source: '500 RPM — confirm the allowable continuous-duty speed for the actual medium, pressure, temperature, duty cycle, and approved drawing',
    de: '500 min⁻¹ — die zulässige Drehzahl im Dauerbetrieb anhand des tatsächlichen Mediums, des Drucks, der Temperatur, des Arbeitszyklus und der freigegebenen Zeichnung bestätigen',
    ja: '500 RPM — 実際の媒体、圧力、温度、デューティサイクル、承認図に基づき、連続運転時の許容回転数を確認',
    ru: '500 об/мин — допустимая частота вращения при непрерывной работе подтверждается с учётом фактической среды, давления, температуры, рабочего цикла и согласованного чертежа',
  },
  {
    legacySource: '300 RPM — derate to 200 RPM for continuous water or coolant',
    source: '300 RPM — confirm the allowable continuous-duty speed for the actual medium, pressure, temperature, duty cycle, and approved drawing',
    de: '300 min⁻¹ — die zulässige Drehzahl im Dauerbetrieb anhand des tatsächlichen Mediums, des Drucks, der Temperatur, des Arbeitszyklus und der freigegebenen Zeichnung bestätigen',
    ja: '300 RPM — 実際の媒体、圧力、温度、デューティサイクル、承認図に基づき、連続運転時の許容回転数を確認',
    ru: '300 об/мин — допустимая частота вращения при непрерывной работе подтверждается с учётом фактической среды, давления, температуры, рабочего цикла и согласованного чертежа',
  },
  {
    legacySource: '200 RPM — derate to 150 RPM for continuous water or coolant',
    source: '200 RPM — confirm the allowable continuous-duty speed for the actual medium, pressure, temperature, duty cycle, and approved drawing',
    de: '200 min⁻¹ — die zulässige Drehzahl im Dauerbetrieb anhand des tatsächlichen Mediums, des Drucks, der Temperatur, des Arbeitszyklus und der freigegebenen Zeichnung bestätigen',
    ja: '200 RPM — 実際の媒体、圧力、温度、デューティサイクル、承認図に基づき、連続運転時の許容回転数を確認',
    ru: '200 об/мин — допустимая частота вращения при непрерывной работе подтверждается с учётом фактической среды, давления, температуры, рабочего цикла и согласованного чертежа',
  },
  {
    legacySource: '200 RPM — derate to 150 RPM for continuous hydraulic oil duty',
    source: '200 RPM — confirm the allowable continuous-duty speed for the actual medium, pressure, temperature, duty cycle, and approved drawing',
    de: '200 min⁻¹ — die zulässige Drehzahl im Dauerbetrieb anhand des tatsächlichen Mediums, des Drucks, der Temperatur, des Arbeitszyklus und der freigegebenen Zeichnung bestätigen',
    ja: '200 RPM — 実際の媒体、圧力、温度、デューティサイクル、承認図に基づき、連続運転時の許容回転数を確認',
    ru: '200 об/мин — допустимая частота вращения при непрерывной работе подтверждается с учётом фактической среды, давления, температуры, рабочего цикла и согласованного чертежа',
  },
  {
    legacySource: '150 RPM — derate to 100 RPM for continuous water or coolant',
    source: '150 RPM — confirm the allowable continuous-duty speed for the actual medium, pressure, temperature, duty cycle, and approved drawing',
    de: '150 min⁻¹ — die zulässige Drehzahl im Dauerbetrieb anhand des tatsächlichen Mediums, des Drucks, der Temperatur, des Arbeitszyklus und der freigegebenen Zeichnung bestätigen',
    ja: '150 RPM — 実際の媒体、圧力、温度、デューティサイクル、承認図に基づき、連続運転時の許容回転数を確認',
    ru: '150 об/мин — допустимая частота вращения при непрерывной работе подтверждается с учётом фактической среды, давления, температуры, рабочего цикла и согласованного чертежа',
  },
  {
    legacySource: '80 RPM — derate to 50 RPM for continuous water or coolant at 5 MPa',
    source: '80 RPM — confirm the allowable continuous-duty speed for the actual medium, pressure, temperature, duty cycle, and approved drawing',
    de: '80 min⁻¹ — die zulässige Drehzahl im Dauerbetrieb anhand des tatsächlichen Mediums, des Drucks, der Temperatur, des Arbeitszyklus und der freigegebenen Zeichnung bestätigen',
    ja: '80 RPM — 実際の媒体、圧力、温度、デューティサイクル、承認図に基づき、連続運転時の許容回転数を確認',
    ru: '80 об/мин — допустимая частота вращения при непрерывной работе подтверждается с учётом фактической среды, давления, температуры, рабочего цикла и согласованного чертежа',
  },
  {
    legacySource: '<strong>Speed above 200 RPM</strong> — centrifugal force exceeds PTFE seal limits at 1 MPa; derate pressure or use a custom high-speed design',
    source: '<strong>Speed above 200 RPM</strong> — request a separately reviewed high-speed configuration and confirm the allowable combined pressure and speed for the actual duty',
    de: '<strong>Drehzahl über 200 min⁻¹</strong> — eine separat geprüfte Hochgeschwindigkeitsausführung anfragen und die zulässige Kombination aus Druck und Drehzahl für den tatsächlichen Betrieb bestätigen',
    ja: '<strong>200 RPMを超える回転数</strong> — 別途評価した高速仕様を依頼し、実際の運転条件に対する許容圧力と回転数の組み合わせを確認',
    ru: '<strong>Скорость свыше 200 об/мин</strong> — запросите отдельно рассмотренное высокоскоростное исполнение и подтвердите допустимое сочетание давления и частоты вращения для фактического режима работы',
  },
  {
    legacySource: '<strong>Speed above 200 RPM</strong> — bearing and seal limits; derate pressure or use a custom high-speed design',
    source: '<strong>Speed above 200 RPM</strong> — request a separately reviewed high-speed configuration and confirm the allowable combined pressure and speed for the actual duty',
    de: '<strong>Drehzahl über 200 min⁻¹</strong> — eine separat geprüfte Hochgeschwindigkeitsausführung anfragen und die zulässige Kombination aus Druck und Drehzahl für den tatsächlichen Betrieb bestätigen',
    ja: '<strong>200 RPMを超える回転数</strong> — 別途評価した高速仕様を依頼し、実際の運転条件に対する許容圧力と回転数の組み合わせを確認',
    ru: '<strong>Скорость свыше 200 об/мин</strong> — запросите отдельно рассмотренное высокоскоростное исполнение и подтвердите допустимое сочетание давления и частоты вращения для фактического режима работы',
  },
  {
    legacySource: 'Air atomize + fluid supply on coating and lubrication turntables. Derate to 150 RPM for continuous fluid duty.',
    source: 'Air atomization and fluid supply on coating and lubrication turntables. Confirm allowable continuous-duty pressure and speed for the selected model, medium, temperature, and approved drawing.',
    de: 'Zerstäuberluft und Flüssigkeitszufuhr an Beschichtungs- und Schmierrundtischen. Zulässigen Druck und zulässige Drehzahl im Dauerbetrieb für das gewählte Modell anhand von Medium, Temperatur und freigegebener Zeichnung bestätigen.',
    ja: 'コーティング・潤滑用ターンテーブルへの霧化用エアと液体供給。選定型式、媒体、温度、承認図に基づき、連続運転時の許容圧力と許容回転数を確認してください。',
    ru: 'Подача распыляющего воздуха и жидкости на поворотных столах для нанесения покрытий и смазки. Допустимые давление и частота вращения при непрерывной работе подтверждаются для выбранной модели с учётом среды, температуры и согласованного чертежа.',
  },
  {
    legacySource: 'Air atomize + fluid supply on coating turntables. Derate to 100 RPM for continuous fluid duty to extend seal life.',
    source: 'Air atomization and fluid supply on coating turntables. Confirm allowable continuous-duty pressure and speed for the selected model, medium, temperature, and approved drawing.',
    de: 'Zerstäuberluft und Flüssigkeitszufuhr an Beschichtungsrundtischen. Zulässigen Druck und zulässige Drehzahl im Dauerbetrieb für das gewählte Modell anhand von Medium, Temperatur und freigegebener Zeichnung bestätigen.',
    ja: 'コーティング用ターンテーブルへの霧化用エアと液体供給。選定型式、媒体、温度、承認図に基づき、連続運転時の許容圧力と許容回転数を確認してください。',
    ru: 'Подача распыляющего воздуха и жидкости на поворотных столах для нанесения покрытий. Допустимые давление и частота вращения при непрерывной работе подтверждаются для выбранной модели с учётом среды, температуры и согласованного чертежа.',
  },
  {
    legacySource: '<strong>Pressure:</strong> 0.4–0.8 MPa (clamping) — derate 30% for continuous machining duty',
    source: '<strong>Pressure:</strong> 0.4–0.8 MPa (clamping); confirm the continuous-duty limit for the selected model against the current product page, approved drawing, medium, temperature, and machining cycle',
    de: '<strong>Druck:</strong> 0,4–0,8 MPa (Spannen); den Grenzwert im Dauerbetrieb für das gewählte Modell anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Bearbeitungszyklus bestätigen',
    ja: '<strong>圧力：</strong> 0.4～0.8 MPa（クランプ）；選定型式の連続運転限界を、最新の製品ページ、承認図、媒体、温度、加工サイクルに基づいて確認',
    ru: '<strong>Давление:</strong> 0,4–0,8 МПа (зажим); предел для непрерывной работы выбранной модели подтверждается по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и циклу обработки',
  },
  {
    legacySource: '<strong>Pressure:</strong> 0.4–0.8 MPa (clamping) — derate 30% for continuous welding duty',
    source: '<strong>Pressure:</strong> 0.4–0.8 MPa (clamping); confirm the continuous-duty limit for the selected model against the current product page, approved drawing, gas mixture, temperature, and welding cycle',
    de: '<strong>Druck:</strong> 0,4–0,8 MPa (Spannen); den Grenzwert im Dauerbetrieb für das gewählte Modell anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Gasgemischs, der Temperatur und des Schweißzyklus bestätigen',
    ja: '<strong>圧力：</strong> 0.4～0.8 MPa（クランプ）；選定型式の連続運転限界を、最新の製品ページ、承認図、混合ガス、温度、溶接サイクルに基づいて確認',
    ru: '<strong>Давление:</strong> 0,4–0,8 МПа (зажим); предел для непрерывной работы выбранной модели подтверждается по актуальной странице изделия, согласованному чертежу, составу газовой смеси, температуре и сварочному циклу',
  },
  {
    legacySource: '<strong>Typical requirement:</strong> 2–3 passages at 0.3–0.6 MPa, flange mount for rigid fixture integration, with through-bore options for coolant or wiring passage. Derate pressure 30% for continuous-duty clamping cycles.',
    source: '<strong>Typical requirement:</strong> 2–3 passages at 0.3–0.6 MPa, flange mount for rigid fixture integration, with through-bore options for coolant or wiring passage. Confirm the continuous-duty pressure and speed for the selected model against the current product page, approved drawing, medium, temperature, and clamping cycle.',
    de: '<strong>Typische Anforderung:</strong> 2–3 Kanäle bei 0,3–0,6 MPa, Flanschmontage zur starren Integration in die Vorrichtung sowie optionale Durchgangsbohrung für Kühlmittel oder Leitungen. Druck und Drehzahl im Dauerbetrieb für das gewählte Modell anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Spannzyklus bestätigen.',
    ja: '<strong>代表的な要件：</strong> 0.3～0.6 MPa、2～3流路、治具への高剛性組込み用フランジ取付、クーラントまたは配線を通す中空穴オプション。選定型式の連続運転時の圧力と回転数を、最新の製品ページ、承認図、媒体、温度、クランプサイクルに基づいて確認してください。',
    ru: '<strong>Типовое требование:</strong> 2–3 канала при 0,3–0,6 МПа, фланцевый монтаж для жёсткой интеграции в приспособление и варианты со сквозным отверстием для СОЖ или проводки. Давление и частота вращения при непрерывной работе выбранной модели подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и циклу зажима.',
  },
  {
    legacySource: '<strong>Design rule:</strong> For continuous operation, apply a <strong>30% derating factor</strong>. A 1.0 MPa joint should be used at 0.7 MPa or below for round-the-clock duty. Exceed this, and seal fatigue accelerates dramatically.',
    source: '<strong>Design rule:</strong> For continuous operation, confirm the allowable combined pressure and speed for the selected model against the current product page, approved drawing, medium, temperature, duty cycle, and installation conditions.',
    de: '<strong>Auslegungsregel:</strong> Für den Dauerbetrieb ist die zulässige Kombination aus Druck und Drehzahl des gewählten Modells anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur, des Arbeitszyklus und der Einbaubedingungen zu bestätigen.',
    ja: '<strong>設計ルール：</strong> 連続運転では、選定型式の許容圧力と許容回転数の組み合わせを、最新の製品ページ、承認図、媒体、温度、デューティサイクル、取付条件に基づいて確認してください。',
    ru: '<strong>Правило проектирования:</strong> Для непрерывной работы подтвердите допустимое сочетание давления и частоты вращения выбранной модели по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре, рабочему циклу и условиям монтажа.',
  },
  {
    legacySource: 'Selecting a rotary joint is not complicated — but it is specific. Get the passage count right. Derate the pressure by 30%. Match the seal material to your RPM. Verify media compatibility with the body material. Size the bore for your flow requirement.',
    source: 'Selecting a rotary joint is not complicated — but it is specific. Confirm the passage count, allowable combined pressure and speed, seal material, media compatibility, mounting, and required flow against the current product page, approved drawing, and actual duty conditions.',
    de: 'Die Auswahl einer Drehdurchführung ist nicht kompliziert, aber anwendungsspezifisch. Bestätigen Sie Kanalzahl, zulässige Kombination aus Druck und Drehzahl, Dichtungswerkstoff, Medienverträglichkeit, Befestigung und erforderlichen Durchfluss anhand der aktuellen Produktseite, der freigegebenen Zeichnung und der tatsächlichen Betriebsbedingungen.',
    ja: 'ロータリージョイントの選定は複雑ではありませんが、用途ごとの確認が必要です。流路数、許容圧力と許容回転数の組み合わせ、シール材質、媒体適合性、取付、必要流量を、最新の製品ページ、承認図、実際の運転条件に基づいて確認してください。',
    ru: 'Выбор вращающегося соединения несложен, но требует учёта конкретного применения. Проверьте число каналов, допустимое сочетание давления и частоты вращения, материал уплотнения, совместимость со средой, монтаж и требуемый расход по актуальной странице изделия, согласованному чертежу и фактическим условиям эксплуатации.',
  },
];

fixedDeratingRows.push(
  {
    legacySource: 'Air atomize + fluid supply on coating turntables in dusty paint shops. Derate to 60 RPM for continuous fluid duty.',
    source: 'Air atomization and fluid supply on coating turntables. Confirm allowable continuous-duty pressure and speed for the selected model, medium, temperature, and approved drawing.',
    de: 'Zerstäuberluft und Flüssigkeitszufuhr an Beschichtungsrundtischen. Zulässigen Druck und zulässige Drehzahl im Dauerbetrieb für das gewählte Modell anhand von Medium, Temperatur und freigegebener Zeichnung bestätigen.',
    ja: 'コーティング用ターンテーブルへの霧化用エアと液体供給。選定型式、媒体、温度、承認図に基づき、連続運転時の許容圧力と許容回転数を確認してください。',
    ru: 'Подача распыляющего воздуха и жидкости на поворотных столах для нанесения покрытий. Допустимые давление и частота вращения при непрерывной работе подтверждаются для выбранной модели с учётом среды, температуры и согласованного чертежа.',
  },
  {
    legacySource: 'Yes — the PTFE composite seal and FKM O-ring are compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, derate pressure to 0.7 MPa and speed to 300 RPM to reduce seal wear. The Grade 45 carbon steel body has good corrosion resistance for intermittent water exposure, but continuous immersion requires nickel plating or stainless steel (304/316) specification. If your application involves deionized water or aggressive coolant, contact Begapunk for seal compatibility review.',
    source: 'Yes — the PTFE composite seal and FKM O-ring are compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, and duty cycle. The Grade 45 carbon steel body has good corrosion resistance for intermittent water exposure, but continuous immersion requires nickel plating or stainless steel (304/316) specification. If your application involves deionized water or aggressive coolant, contact Begapunk for seal compatibility review.',
    de: 'Ja — die PTFE-Verbunddichtung und der FKM-O-Ring sind mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl bis ISO VG 32 kompatibel. Für kontinuierlichen Wasserbetrieb sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Arbeitszyklus zu bestätigen. Das Gehäuse aus Kohlenstoffstahl Grade 45 bietet bei zeitweiligem Wasserkontakt eine gute Korrosionsbeständigkeit; bei dauerhaftem Eintauchen ist jedoch eine Vernickelung oder eine Ausführung aus Edelstahl 304/316 erforderlich. Bei deionisiertem Wasser oder aggressivem Kühlmittel wenden Sie sich zur Prüfung der Dichtungsverträglichkeit an Begapunk.',
    ja: 'はい — PTFE複合シールとFKM Oリングは、水、水溶性クーラント、低粘度作動油（ISO VG 32以下）に対応します。水で連続運転する場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクルに基づいて確認してください。Grade 45炭素鋼本体は間欠的な水接触に対して耐食性を備えますが、連続浸漬にはニッケルめっきまたは304/316ステンレス仕様が必要です。脱イオン水や侵食性の高いクーラントを使用する場合は、シール適合性についてBegapunkにお問い合わせください。',
    ru: 'Да — композитное уплотнение из ПТФЭ и кольцо FKM совместимы с водой, водорастворимой СОЖ и маловязким гидравлическим маслом до ISO VG 32. Для непрерывной работы с водой допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и рабочему циклу. Корпус из углеродистой стали Grade 45 обладает коррозионной стойкостью при периодическом контакте с водой, однако для постоянного погружения требуется никелирование или исполнение из нержавеющей стали 304/316. При использовании деионизированной воды или агрессивной СОЖ обратитесь в Begapunk для проверки совместимости уплотнения.',
  },
  {
    legacySource: 'Yes — the PTFE composite seal is compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, derate pressure to 0.7 MPa and speed to 200 RPM to reduce seal wear. The 6061 aluminum alloy body has good corrosion resistance for intermittent water exposure thanks to its anodized surface, but continuous immersion in aggressive coolant or caustic washdown requires additional surface treatment or a stainless steel body specification. If your application involves deionized water or high-purity coolant, contact Begapunk for seal compatibility review.',
    source: 'Yes — the PTFE composite seal is compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, and duty cycle. The 6061 aluminum alloy body has good corrosion resistance for intermittent water exposure thanks to its anodized surface, but continuous immersion in aggressive coolant or caustic washdown requires additional surface treatment or a stainless steel body specification. If your application involves deionized water or high-purity coolant, contact Begapunk for seal compatibility review.',
    de: 'Ja — die PTFE-Verbunddichtung ist mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl bis ISO VG 32 kompatibel. Für kontinuierlichen Wasserbetrieb sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Arbeitszyklus zu bestätigen. Das Gehäuse aus Aluminiumlegierung 6061 bietet dank seiner anodisierten Oberfläche bei zeitweiligem Wasserkontakt eine gute Korrosionsbeständigkeit; dauerhaftes Eintauchen in aggressives Kühlmittel oder alkalische Waschlösungen erfordert jedoch eine zusätzliche Oberflächenbehandlung oder ein Edelstahlgehäuse. Bei deionisiertem Wasser oder hochreinem Kühlmittel wenden Sie sich zur Prüfung der Dichtungsverträglichkeit an Begapunk.',
    ja: 'はい — PTFE複合シールは、水、水溶性クーラント、低粘度作動油（ISO VG 32以下）に対応します。水で連続運転する場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクルに基づいて確認してください。6061アルミニウム合金本体はアルマイト表面により間欠的な水接触に対して耐食性を備えますが、侵食性クーラントへの連続浸漬や苛性洗浄には、追加の表面処理またはステンレス本体仕様が必要です。脱イオン水や高純度クーラントを使用する場合は、シール適合性についてBegapunkにお問い合わせください。',
    ru: 'Да — композитное уплотнение из ПТФЭ совместимо с водой, водорастворимой СОЖ и маловязким гидравлическим маслом до ISO VG 32. Для непрерывной работы с водой допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и рабочему циклу. Корпус из алюминиевого сплава 6061 благодаря анодированной поверхности обладает коррозионной стойкостью при периодическом контакте с водой, однако постоянное погружение в агрессивную СОЖ или щелочная мойка требуют дополнительной обработки поверхности либо корпуса из нержавеющей стали. При использовании деионизированной воды или высокочистой СОЖ обратитесь в Begapunk для проверки совместимости уплотнения.',
  },
  {
    legacySource: 'Yes — the PTFE composite seal is compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, derate pressure to 0.7 MPa and speed to 150 RPM to reduce seal wear. The 6061 aluminum alloy body has an anodized surface that resists intermittent coolant spray. If your application involves deionized water, aggressive coolant, or continuous immersion, contact Begapunk for material and seal compatibility review.',
    source: 'Yes — the PTFE composite seal is compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, and duty cycle. The 6061 aluminum alloy body has an anodized surface that resists intermittent coolant spray. If your application involves deionized water, aggressive coolant, or continuous immersion, contact Begapunk for material and seal compatibility review.',
    de: 'Ja — die PTFE-Verbunddichtung ist mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl bis ISO VG 32 kompatibel. Für kontinuierlichen Wasserbetrieb sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Arbeitszyklus zu bestätigen. Die anodisierte Oberfläche des Gehäuses aus Aluminiumlegierung 6061 widersteht zeitweiligem Kühlmittelspritzkontakt. Bei deionisiertem Wasser, aggressivem Kühlmittel oder dauerhaftem Eintauchen wenden Sie sich zur Prüfung der Werkstoff- und Dichtungsverträglichkeit an Begapunk.',
    ja: 'はい — PTFE複合シールは、水、水溶性クーラント、低粘度作動油（ISO VG 32以下）に対応します。水で連続運転する場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクルに基づいて確認してください。6061アルミニウム合金本体のアルマイト表面は、間欠的なクーラント飛沫に対する耐食性を備えます。脱イオン水、侵食性クーラント、または連続浸漬を伴う場合は、材質とシールの適合性についてBegapunkにお問い合わせください。',
    ru: 'Да — композитное уплотнение из ПТФЭ совместимо с водой, водорастворимой СОЖ и маловязким гидравлическим маслом до ISO VG 32. Для непрерывной работы с водой допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и рабочему циклу. Анодированная поверхность корпуса из алюминиевого сплава 6061 устойчива к периодическому разбрызгиванию СОЖ. При использовании деионизированной воды, агрессивной СОЖ или постоянном погружении обратитесь в Begapunk для проверки совместимости материалов и уплотнения.',
  },
  {
    legacySource: 'Yes — the PTFE composite seal is compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, derate pressure to 0.7 MPa and speed to 200 RPM to reduce seal wear. The 6061 aluminum alloy body has an anodized surface that provides good corrosion resistance for intermittent water exposure, but continuous immersion in aggressive coolant or caustic washdown requires additional surface treatment or a stainless steel body specification. If your application involves deionized water or high-purity coolant, contact Begapunk for seal compatibility review.',
    source: 'Yes — the PTFE composite seal is compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, and duty cycle. The 6061 aluminum alloy body has an anodized surface that provides good corrosion resistance for intermittent water exposure, but continuous immersion in aggressive coolant or caustic washdown requires additional surface treatment or a stainless steel body specification. If your application involves deionized water or high-purity coolant, contact Begapunk for seal compatibility review.',
    de: 'Ja — die PTFE-Verbunddichtung ist mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl bis ISO VG 32 kompatibel. Für kontinuierlichen Wasserbetrieb sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Arbeitszyklus zu bestätigen. Die anodisierte Oberfläche des Gehäuses aus Aluminiumlegierung 6061 bietet bei zeitweiligem Wasserkontakt eine gute Korrosionsbeständigkeit; dauerhaftes Eintauchen in aggressives Kühlmittel oder alkalische Waschlösungen erfordert jedoch eine zusätzliche Oberflächenbehandlung oder ein Edelstahlgehäuse. Bei deionisiertem Wasser oder hochreinem Kühlmittel wenden Sie sich zur Prüfung der Dichtungsverträglichkeit an Begapunk.',
    ja: 'はい — PTFE複合シールは、水、水溶性クーラント、低粘度作動油（ISO VG 32以下）に対応します。水で連続運転する場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクルに基づいて確認してください。6061アルミニウム合金本体のアルマイト表面は、間欠的な水接触に対して耐食性を備えますが、侵食性クーラントへの連続浸漬や苛性洗浄には、追加の表面処理またはステンレス本体仕様が必要です。脱イオン水や高純度クーラントを使用する場合は、シール適合性についてBegapunkにお問い合わせください。',
    ru: 'Да — композитное уплотнение из ПТФЭ совместимо с водой, водорастворимой СОЖ и маловязким гидравлическим маслом до ISO VG 32. Для непрерывной работы с водой допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и рабочему циклу. Анодированная поверхность корпуса из алюминиевого сплава 6061 обеспечивает коррозионную стойкость при периодическом контакте с водой, однако постоянное погружение в агрессивную СОЖ или щелочная мойка требуют дополнительной обработки поверхности либо корпуса из нержавеющей стали. При использовании деионизированной воды или высокочистой СОЖ обратитесь в Begapunk для проверки совместимости уплотнения.',
  },
  {
    legacySource: 'Yes — the PTFE composite seal and O-ring are compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, derate pressure to 0.7 MPa and speed to 150 RPM to reduce seal wear. The 6061 aluminum alloy body has an anodized surface that provides good corrosion resistance for intermittent water exposure, but continuous immersion requires nickel plating or stainless steel (304/316) specification. If your application involves deionized water or aggressive coolant, contact Begapunk for seal compatibility review.',
    source: 'Yes — the PTFE composite seal and O-ring are compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, and duty cycle. The 6061 aluminum alloy body has an anodized surface that provides good corrosion resistance for intermittent water exposure, but continuous immersion requires nickel plating or stainless steel (304/316) specification. If your application involves deionized water or aggressive coolant, contact Begapunk for seal compatibility review.',
    de: 'Ja — die PTFE-Verbunddichtung und der O-Ring sind mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl bis ISO VG 32 kompatibel. Für kontinuierlichen Wasserbetrieb sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Arbeitszyklus zu bestätigen. Die anodisierte Oberfläche des Gehäuses aus Aluminiumlegierung 6061 bietet bei zeitweiligem Wasserkontakt eine gute Korrosionsbeständigkeit; dauerhaftes Eintauchen erfordert jedoch eine Vernickelung oder eine Ausführung aus Edelstahl 304/316. Bei deionisiertem Wasser oder aggressivem Kühlmittel wenden Sie sich zur Prüfung der Dichtungsverträglichkeit an Begapunk.',
    ja: 'はい — PTFE複合シールとOリングは、水、水溶性クーラント、低粘度作動油（ISO VG 32以下）に対応します。水で連続運転する場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクルに基づいて確認してください。6061アルミニウム合金本体のアルマイト表面は、間欠的な水接触に対して耐食性を備えますが、連続浸漬にはニッケルめっきまたは304/316ステンレス仕様が必要です。脱イオン水や侵食性の高いクーラントを使用する場合は、シール適合性についてBegapunkにお問い合わせください。',
    ru: 'Да — композитное уплотнение из ПТФЭ и уплотнительное кольцо совместимы с водой, водорастворимой СОЖ и маловязким гидравлическим маслом до ISO VG 32. Для непрерывной работы с водой допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и рабочему циклу. Анодированная поверхность корпуса из алюминиевого сплава 6061 обеспечивает коррозионную стойкость при периодическом контакте с водой, однако для постоянного погружения требуется никелирование или исполнение из нержавеющей стали 304/316. При использовании деионизированной воды или агрессивной СОЖ обратитесь в Begapunk для проверки совместимости уплотнения.',
  },
  {
    legacySource: 'Yes — the PTFE composite seal and FKM O-ring are compatible with water, water-soluble coolant, and light hydraulic oil up to ISO VG 32. For continuous water duty at 5 MPa, derate speed to 50 RPM to reduce seal wear. The 6061 aluminum alloy body is anodized for corrosion resistance. For continuous water immersion or deionized water, request an engineering review of body material and surface treatment. Always use appropriate filtration for water duty.',
    source: 'Yes — the PTFE composite seal and FKM O-ring are compatible with water, water-soluble coolant, and light hydraulic oil up to ISO VG 32. For continuous water duty, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, and duty cycle. The 6061 aluminum alloy body is anodized for corrosion resistance. For continuous water immersion or deionized water, request an engineering review of body material and surface treatment. Always use appropriate filtration for water duty.',
    de: 'Ja — die PTFE-Verbunddichtung und der FKM-O-Ring sind mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl bis ISO VG 32 kompatibel. Für kontinuierlichen Wasserbetrieb sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Arbeitszyklus zu bestätigen. Das Gehäuse aus Aluminiumlegierung 6061 ist zum Korrosionsschutz anodisiert. Für dauerhaftes Eintauchen in Wasser oder deionisiertes Wasser ist eine technische Prüfung von Gehäusewerkstoff und Oberflächenbehandlung anzufragen. Für Wasserbetrieb ist stets eine geeignete Filtration vorzusehen.',
    ja: 'はい — PTFE複合シールとFKM Oリングは、水、水溶性クーラント、低粘度作動油（ISO VG 32以下）に対応します。水で連続運転する場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクルに基づいて確認してください。6061アルミニウム合金本体には耐食性向上のためアルマイト処理を施しています。連続的な水中浸漬または脱イオン水では、本体材質と表面処理の技術確認を依頼してください。水用途では適切なろ過を必ず行ってください。',
    ru: 'Да — композитное уплотнение из ПТФЭ и кольцо FKM совместимы с водой, водорастворимой СОЖ и маловязким гидравлическим маслом до ISO VG 32. Для непрерывной работы с водой допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и рабочему циклу. Корпус из алюминиевого сплава 6061 анодирован для защиты от коррозии. При постоянном погружении в воду или использовании деионизированной воды запросите инженерную проверку материала корпуса и обработки поверхности. Для работы с водой всегда применяйте подходящую фильтрацию.',
  },
  {
    legacySource: 'Yes — the PTFE composite seal and O-ring are compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, derate pressure to 0.7 MPa and speed to 150 RPM to reduce seal wear. The 6061 aluminum alloy body has good corrosion resistance for intermittent water exposure, but continuous immersion requires hard anodizing (Type III) or stainless steel specification. If your application involves deionized water or aggressive coolant, contact Begapunk for seal compatibility review.',
    source: 'Yes — the PTFE composite seal and O-ring are compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, and duty cycle. The 6061 aluminum alloy body has good corrosion resistance for intermittent water exposure, but continuous immersion requires hard anodizing (Type III) or stainless steel specification. If your application involves deionized water or aggressive coolant, contact Begapunk for seal compatibility review.',
    de: 'Ja — die PTFE-Verbunddichtung und der O-Ring sind mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl bis ISO VG 32 kompatibel. Für kontinuierlichen Wasserbetrieb sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Arbeitszyklus zu bestätigen. Das Gehäuse aus Aluminiumlegierung 6061 bietet bei zeitweiligem Wasserkontakt eine gute Korrosionsbeständigkeit; dauerhaftes Eintauchen erfordert jedoch Hartanodisieren (Typ III) oder eine Edelstahlausführung. Bei deionisiertem Wasser oder aggressivem Kühlmittel wenden Sie sich zur Prüfung der Dichtungsverträglichkeit an Begapunk.',
    ja: 'はい — PTFE複合シールとOリングは、水、水溶性クーラント、低粘度作動油（ISO VG 32以下）に対応します。水で連続運転する場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクルに基づいて確認してください。6061アルミニウム合金本体は間欠的な水接触に対して耐食性を備えますが、連続浸漬には硬質アルマイト（タイプIII）またはステンレス仕様が必要です。脱イオン水や侵食性の高いクーラントを使用する場合は、シール適合性についてBegapunkにお問い合わせください。',
    ru: 'Да — композитное уплотнение из ПТФЭ и уплотнительное кольцо совместимы с водой, водорастворимой СОЖ и маловязким гидравлическим маслом до ISO VG 32. Для непрерывной работы с водой допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и рабочему циклу. Корпус из алюминиевого сплава 6061 обладает коррозионной стойкостью при периодическом контакте с водой, однако для постоянного погружения требуется твёрдое анодирование (тип III) или исполнение из нержавеющей стали. При использовании деионизированной воды или агрессивной СОЖ обратитесь в Begapunk для проверки совместимости уплотнения.',
  },
);

fixedDeratingRows.push(
  {
    legacySource: 'Yes — the PTFE composite seal is compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, derate pressure to 0.7 MPa and speed to 100 RPM to reduce seal wear. The 6061 aluminum alloy body is anodized for additional corrosion resistance. For continuous water immersion or aggressive coolant, specify hard anodizing (Type III) or stainless steel (304/316) body. If your application involves deionized water, contact Begapunk for seal compatibility review.',
    source: 'Yes — the PTFE composite seal is compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, and duty cycle. The 6061 aluminum alloy body is anodized for additional corrosion resistance. For continuous water immersion or aggressive coolant, specify hard anodizing (Type III) or stainless steel (304/316) body. If your application involves deionized water, contact Begapunk for seal compatibility review.',
    de: 'Ja — die PTFE-Verbunddichtung ist mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl bis ISO VG 32 kompatibel. Für kontinuierlichen Wasserbetrieb sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Arbeitszyklus zu bestätigen. Das Gehäuse aus Aluminiumlegierung 6061 ist für zusätzliche Korrosionsbeständigkeit anodisiert. Für dauerhaftes Eintauchen in Wasser oder aggressives Kühlmittel ist Hartanodisieren (Typ III) oder ein Gehäuse aus Edelstahl 304/316 vorzusehen. Bei deionisiertem Wasser wenden Sie sich zur Prüfung der Dichtungsverträglichkeit an Begapunk.',
    ja: 'はい — PTFE複合シールは、水、水溶性クーラント、低粘度作動油（ISO VG 32以下）に対応します。水で連続運転する場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクルに基づいて確認してください。6061アルミニウム合金本体には耐食性向上のためアルマイト処理を施しています。連続的な水中浸漬または侵食性クーラントでは、硬質アルマイト（タイプIII）または304/316ステンレス本体を指定してください。脱イオン水を使用する場合は、シール適合性についてBegapunkにお問い合わせください。',
    ru: 'Да — композитное уплотнение из ПТФЭ совместимо с водой, водорастворимой СОЖ и маловязким гидравлическим маслом до ISO VG 32. Для непрерывной работы с водой допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и рабочему циклу. Корпус из алюминиевого сплава 6061 анодирован для дополнительной защиты от коррозии. Для постоянного погружения в воду или работы с агрессивной СОЖ укажите твёрдое анодирование (тип III) либо корпус из нержавеющей стали 304/316. При использовании деионизированной воды обратитесь в Begapunk для проверки совместимости уплотнения.',
  },
  {
    legacySource: 'Yes — the PTFE composite seal and FKM O-ring are compatible with water, water-soluble coolant, and light hydraulic oil up to ISO VG 32. For continuous water duty, derate pressure to 0.7 MPa and speed to 150 RPM to reduce seal wear. The 6061 aluminum alloy body is anodized for corrosion resistance, making it suitable for intermittent water and coolant exposure. For continuous water immersion or deionized water, specify a nickel-plated or stainless steel (304/316) version. Always use a 40-micron filter for water duty to protect the seal from particulate damage.',
    source: 'Yes — the PTFE composite seal and FKM O-ring are compatible with water, water-soluble coolant, and light hydraulic oil up to ISO VG 32. For continuous water duty, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, and duty cycle. The 6061 aluminum alloy body is anodized for corrosion resistance, making it suitable for intermittent water and coolant exposure. For continuous water immersion or deionized water, specify a nickel-plated or stainless steel (304/316) version. Confirm the required filtration for the selected medium and contamination conditions.',
    de: 'Ja — die PTFE-Verbunddichtung und der FKM-O-Ring sind mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl bis ISO VG 32 kompatibel. Für kontinuierlichen Wasserbetrieb sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Arbeitszyklus zu bestätigen. Das Gehäuse aus Aluminiumlegierung 6061 ist zum Korrosionsschutz anodisiert und eignet sich für zeitweiligen Kontakt mit Wasser und Kühlmittel. Für dauerhaftes Eintauchen in Wasser oder deionisiertes Wasser ist eine vernickelte Ausführung oder Edelstahl 304/316 vorzusehen. Bestätigen Sie die erforderliche Filtration für das gewählte Medium und die tatsächlichen Verschmutzungsbedingungen.',
    ja: 'はい — PTFE複合シールとFKM Oリングは、水、水溶性クーラント、低粘度作動油（ISO VG 32以下）に対応します。水で連続運転する場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクルに基づいて確認してください。6061アルミニウム合金本体には耐食性向上のためアルマイト処理を施しており、間欠的な水・クーラント接触に適します。連続的な水中浸漬または脱イオン水では、ニッケルめっき仕様または304/316ステンレス仕様を指定してください。選定媒体と汚染条件に必要なろ過条件を確認してください。',
    ru: 'Да — композитное уплотнение из ПТФЭ и кольцо FKM совместимы с водой, водорастворимой СОЖ и маловязким гидравлическим маслом до ISO VG 32. Для непрерывной работы с водой допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и рабочему циклу. Корпус из алюминиевого сплава 6061 анодирован для защиты от коррозии и подходит для периодического контакта с водой и СОЖ. Для постоянного погружения в воду или деионизированной воды укажите никелированное исполнение либо нержавеющую сталь 304/316. Подтвердите требуемую фильтрацию с учётом выбранной среды и условий загрязнения.',
  },
  {
    legacySource: 'Yes — the PTFE composite seal and FKM O-ring are compatible with water, water-soluble coolant, and light hydraulic oil. For continuous water duty, derate pressure to 0.7 MPa and speed to 150 RPM to reduce seal wear. The 6061 aluminum alloy body is anodized for corrosion resistance, making it suitable for intermittent water and coolant exposure. However, the deep groove ball bearing is not sealed against water ingress — for continuous water duty, specify a sealed bearing option or use BP-3P-0004 (flange mount) with external bearing protection. Always use a 40-micron filter for water duty.',
    source: 'Yes — the PTFE composite seal and FKM O-ring are compatible with water, water-soluble coolant, and light hydraulic oil. For continuous water duty, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, and duty cycle. The 6061 aluminum alloy body is anodized for corrosion resistance, making it suitable for intermittent water and coolant exposure. However, the deep groove ball bearing is not sealed against water ingress — for continuous water duty, specify a sealed bearing option or use BP-3P-0004 (flange mount) with external bearing protection. Confirm the required filtration for the selected medium and contamination conditions.',
    de: 'Ja — die PTFE-Verbunddichtung und der FKM-O-Ring sind mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl kompatibel. Für kontinuierlichen Wasserbetrieb sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Arbeitszyklus zu bestätigen. Das Gehäuse aus Aluminiumlegierung 6061 ist zum Korrosionsschutz anodisiert und eignet sich für zeitweiligen Kontakt mit Wasser und Kühlmittel. Das Rillenkugellager ist jedoch nicht gegen eindringendes Wasser abgedichtet; für kontinuierlichen Wasserbetrieb ist eine abgedichtete Lageroption oder BP-3P-0004 (Flanschmontage) mit äußerem Lagerschutz vorzusehen. Bestätigen Sie die erforderliche Filtration für das gewählte Medium und die tatsächlichen Verschmutzungsbedingungen.',
    ja: 'はい — PTFE複合シールとFKM Oリングは、水、水溶性クーラント、低粘度作動油に対応します。水で連続運転する場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクルに基づいて確認してください。6061アルミニウム合金本体には耐食性向上のためアルマイト処理を施しており、間欠的な水・クーラント接触に適します。ただし、深溝玉軸受は水の侵入に対して密封されていません。水で連続運転する場合は、密封軸受オプションを指定するか、外部軸受保護を備えたBP-3P-0004（フランジ取付）を使用してください。選定媒体と汚染条件に必要なろ過条件を確認してください。',
    ru: 'Да — композитное уплотнение из ПТФЭ и кольцо FKM совместимы с водой, водорастворимой СОЖ и маловязким гидравлическим маслом. Для непрерывной работы с водой допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и рабочему циклу. Корпус из алюминиевого сплава 6061 анодирован для защиты от коррозии и подходит для периодического контакта с водой и СОЖ. Однако радиальный шариковый подшипник не защищён от попадания воды; для непрерывной работы с водой укажите герметизированный подшипник либо используйте BP-3P-0004 (фланцевый монтаж) с внешней защитой подшипника. Подтвердите требуемую фильтрацию с учётом выбранной среды и условий загрязнения.',
  },
  {
    legacySource: 'Yes — the PTFE + Graphite composite seal and anodized 6061 aluminum alloy body are compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, derate pressure to 0.7 MPa and speed to 150 RPM to reduce seal wear and prevent slip ring moisture ingress. The anodized surface provides good corrosion resistance for intermittent water exposure, but continuous immersion or aggressive synthetic coolant may require a PEEK seal option or nickel-plated port treatment. If your application involves deionized water or phosphate ester coolant, contact Begapunk for seal compatibility review before ordering.',
    source: 'Yes — the PTFE + Graphite composite seal and anodized 6061 aluminum alloy body are compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). For continuous water duty, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, duty cycle, and electrical protection requirements. The anodized surface provides good corrosion resistance for intermittent water exposure, but continuous immersion or aggressive synthetic coolant may require a PEEK seal option or nickel-plated port treatment. If your application involves deionized water or phosphate ester coolant, contact Begapunk for seal compatibility review before ordering.',
    de: 'Ja — die PTFE-Graphit-Verbunddichtung und das anodisierte Gehäuse aus Aluminiumlegierung 6061 sind mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl bis ISO VG 32 kompatibel. Für kontinuierlichen Wasserbetrieb sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur, des Arbeitszyklus und der Anforderungen an den elektrischen Schutz zu bestätigen. Die anodisierte Oberfläche bietet bei zeitweiligem Wasserkontakt eine gute Korrosionsbeständigkeit; dauerhaftes Eintauchen oder aggressives synthetisches Kühlmittel kann jedoch eine PEEK-Dichtungsoption oder vernickelte Anschlüsse erfordern. Bei deionisiertem Wasser oder Phosphatester-Kühlmittel wenden Sie sich vor der Bestellung zur Prüfung der Dichtungsverträglichkeit an Begapunk.',
    ja: 'はい — PTFE＋グラファイト複合シールとアルマイト処理した6061アルミニウム合金本体は、水、水溶性クーラント、低粘度作動油（ISO VG 32以下）に対応します。水で連続運転する場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクル、電気保護要件に基づいて確認してください。アルマイト表面は間欠的な水接触に対して耐食性を備えますが、連続浸漬や侵食性の高い合成クーラントでは、PEEKシールオプションまたはポート部のニッケルめっきが必要になる場合があります。脱イオン水またはリン酸エステル系クーラントを使用する場合は、注文前にシール適合性についてBegapunkにお問い合わせください。',
    ru: 'Да — композитное уплотнение ПТФЭ с графитом и анодированный корпус из алюминиевого сплава 6061 совместимы с водой, водорастворимой СОЖ и маловязким гидравлическим маслом до ISO VG 32. Для непрерывной работы с водой допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре, рабочему циклу и требованиям к электрической защите. Анодированная поверхность обладает коррозионной стойкостью при периодическом контакте с водой, однако постоянное погружение или агрессивная синтетическая СОЖ могут потребовать уплотнения PEEK либо никелирования портов. При использовании деионизированной воды или СОЖ на основе фосфатных эфиров обратитесь в Begapunk для проверки совместимости уплотнения до заказа.',
  },
  {
    legacySource: 'Yes — the PTFE + Si3N4 ceramic seal is compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). The Si3N4 ceramic filler provides exceptional wear resistance against hard water scale and coolant particles that would destroy a pure PTFE seal. For continuous water exposure, the anodized 6061 aluminum alloy body provides good corrosion resistance, but specify a nickel-plated or stainless steel (304/316) version for deionized water or aggressive synthetic coolant. Derate pressure to 0.7 MPa for continuous water duty to maximize seal life.',
    source: 'Yes — the PTFE + Si3N4 ceramic seal is compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). The ceramic-filled seal option is intended for applications where the selected medium and contamination profile call for a hard seal face. For continuous water exposure, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, and duty cycle. Review body material, surface treatment, and seal compatibility separately for deionized water or aggressive synthetic coolant.',
    de: 'Ja — die PTFE-Si3N4-Keramikdichtung ist mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl bis ISO VG 32 kompatibel. Die keramisch gefüllte Dichtungsoption ist für Anwendungen vorgesehen, bei denen das gewählte Medium und das Verschmutzungsprofil eine harte Dichtfläche erfordern. Bei kontinuierlichem Wasserkontakt sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Arbeitszyklus zu bestätigen. Für deionisiertes Wasser oder aggressives synthetisches Kühlmittel sind Gehäusewerkstoff, Oberflächenbehandlung und Dichtungsverträglichkeit separat zu prüfen.',
    ja: 'はい — PTFE＋Si3N4セラミックシールは、水、水溶性クーラント、低粘度作動油（ISO VG 32以下）に対応します。セラミック充填シールオプションは、選定媒体と汚染条件から硬質シール面が必要となる用途を対象としています。水に連続してさらされる場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクルに基づいて確認してください。脱イオン水または侵食性の高い合成クーラントでは、本体材質、表面処理、シール適合性を個別に確認してください。',
    ru: 'Да — керамическое уплотнение ПТФЭ с Si3N4 совместимо с водой, водорастворимой СОЖ и маловязким гидравлическим маслом до ISO VG 32. Уплотнение с керамическим наполнителем предназначено для применений, где выбранная среда и характер загрязнения требуют твёрдой уплотнительной поверхности. При постоянном воздействии воды допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и рабочему циклу. Для деионизированной воды или агрессивной синтетической СОЖ отдельно проверьте материал корпуса, обработку поверхности и совместимость уплотнения.',
  },
  {
    legacySource: 'Yes — the PTFE composite seal is compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). The 6061 aluminum alloy body is anodized for additional corrosion resistance. For continuous water duty, derate pressure to 0.7 MPa and speed to 150 RPM to reduce seal wear across all 8 passages. The anodized surface provides good protection for intermittent water exposure, but continuous immersion or aggressive synthetic coolant may require a nickel-plated or stainless steel (304/316) version. If your application involves deionized water or phosphate ester coolant, contact Begapunk for seal compatibility review before ordering.',
    source: 'Yes — the PTFE composite seal is compatible with water, water-soluble coolant, and light hydraulic oil (up to ISO VG 32). The 6061 aluminum alloy body is anodized for additional corrosion resistance. For continuous water duty, confirm allowable pressure and speed for the selected configuration against the current product page, approved drawing, medium, temperature, and duty cycle. The anodized surface provides good protection for intermittent water exposure, but continuous immersion or aggressive synthetic coolant may require a nickel-plated or stainless steel (304/316) version. If your application involves deionized water or phosphate ester coolant, contact Begapunk for seal compatibility review before ordering.',
    de: 'Ja — die PTFE-Verbunddichtung ist mit Wasser, wassermischbarem Kühlmittel und leichtem Hydrauliköl bis ISO VG 32 kompatibel. Das Gehäuse aus Aluminiumlegierung 6061 ist für zusätzliche Korrosionsbeständigkeit anodisiert. Für kontinuierlichen Wasserbetrieb sind zulässiger Druck und zulässige Drehzahl der gewählten Ausführung anhand der aktuellen Produktseite, der freigegebenen Zeichnung, des Mediums, der Temperatur und des Arbeitszyklus zu bestätigen. Die anodisierte Oberfläche bietet bei zeitweiligem Wasserkontakt einen guten Schutz; dauerhaftes Eintauchen oder aggressives synthetisches Kühlmittel kann jedoch eine vernickelte Ausführung oder Edelstahl 304/316 erfordern. Bei deionisiertem Wasser oder Phosphatester-Kühlmittel wenden Sie sich vor der Bestellung zur Prüfung der Dichtungsverträglichkeit an Begapunk.',
    ja: 'はい — PTFE複合シールは、水、水溶性クーラント、低粘度作動油（ISO VG 32以下）に対応します。6061アルミニウム合金本体には耐食性向上のためアルマイト処理を施しています。水で連続運転する場合は、選定仕様の許容圧力と許容回転数を、最新の製品ページ、承認図、媒体、温度、デューティサイクルに基づいて確認してください。アルマイト表面は間欠的な水接触に対して保護効果を備えますが、連続浸漬や侵食性の高い合成クーラントでは、ニッケルめっき仕様または304/316ステンレス仕様が必要になる場合があります。脱イオン水またはリン酸エステル系クーラントを使用する場合は、注文前にシール適合性についてBegapunkにお問い合わせください。',
    ru: 'Да — композитное уплотнение из ПТФЭ совместимо с водой, водорастворимой СОЖ и маловязким гидравлическим маслом до ISO VG 32. Корпус из алюминиевого сплава 6061 анодирован для дополнительной защиты от коррозии. Для непрерывной работы с водой допустимые давление и частота вращения выбранного исполнения подтверждаются по актуальной странице изделия, согласованному чертежу, рабочей среде, температуре и рабочему циклу. Анодированная поверхность обеспечивает хорошую защиту при периодическом контакте с водой, однако постоянное погружение или агрессивная синтетическая СОЖ могут потребовать никелированного исполнения либо нержавеющей стали 304/316. При использовании деионизированной воды или СОЖ на основе фосфатных эфиров обратитесь в Begapunk для проверки совместимости уплотнения до заказа.',
  },
);

const allPositiveToneRows = [...toneRows, ...productHighlightRows, ...guideToneRows, ...runInToneRows, ...tighteningToneRows, ...leadTimeToneRows, ...dustyEnvironmentRows, ...residualToneRows, ...dustyApplicationRows, ...remainingToneRows, ...p0FreezeRows, ...p1SelectionRows, ...p1LocalizedFaqRows, ...fixedDeratingRows];
const legacyToneSources = new Set(allPositiveToneRows.map((row) => row.legacySource).filter(Boolean));
const positiveToneRows = allPositiveToneRows.filter((row) => !legacyToneSources.has(row.source));
rows.push(...positiveToneRows, ...resolverRows);

const editorialRows = [
  {
    pages: ['BP-3P-0006.html', 'BP-3P-0007.html'],
    id: '856aff6a43bfb285',
    de: 'G1/8-Gewinde, 1 MPa, zwei Eingänge / drei Ausgänge',
    ja: 'G1/8ねじ、1 MPa、2入力・3出力',
    ru: 'Резьба G1/8, 1 МПа, два входа / три выхода',
  },
  {
    pages: ['BP-1P-0003.html', 'BP-1P-0006.html', 'BP-2P-0002.html', 'BP-2P-08-0001.html', 'BP-2P-16-0001.html', 'BP-2P-30-0001.html', 'BP-3P-0006.html', 'BP-3P-0007.html', 'BP-4P-30-0001.html'],
    id: 'c6d36ee1a63a6495',
    de: '<h3>Sonderausführung</h3>\n    <p>Für kundenspezifische Anforderungen werden medienberührte Werkstoffe, Dichtungswerkstoff, Reinigungschemie und erforderliche Dokumentation projektbezogen geprüft. Verfügbare CAD-Formate und Lieferzeit werden für das ausgewählte Projekt bestätigt.</p>\n    <div class="price">Angebot anfordern</div>',
    ja: '<h3>カスタム設計</h3>\n    <p>カスタム要件については、接液部材質、シール材質、洗浄薬品、必要書類を案件ごとに確認します。提供可能なCAD形式と納期は選定案件ごとに確定します。</p>\n    <div class="price">見積もりを依頼</div>',
    ru: '<h3>Специальное исполнение</h3>\n    <p>Для индивидуальных требований смачиваемые материалы, материал уплотнения, моющая химия и необходимая документация проверяются для конкретного проекта. Доступные форматы CAD и срок поставки подтверждаются для выбранного проекта.</p>\n    <div class="price">Запросить коммерческое предложение</div>',
  },
];

let changed = 0;
for (const language of ['de', 'ja', 'ru']) {
  const filePath = path.join(root, 'i18n', 'overrides', `${language}.json`);
  const before = await fs.readFile(filePath, 'utf8');
  const current = JSON.parse(before);
  const legacySources = [...legacyToneSources];
  const hasLegacy = legacySources.some((source) => Object.hasOwn(current, source));
  for (const legacySource of legacySources) delete current[legacySource];
  const missing = rows.filter((row) => current[row.source] !== row[language]);
  if (checkOnly) {
    if (missing.length || hasLegacy) throw new Error(`${language}: ${missing.length} approved AI-trust translation(s) are not synchronized; legacy entries present: ${hasLegacy}.`);
    continue;
  }
  if (!missing.length && !hasLegacy) continue;
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
