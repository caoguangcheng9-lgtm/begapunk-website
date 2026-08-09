import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const pages = {
  'blog-rotary-union-seal-types.html': `
<p>Seal selection is a system decision. Media, pressure, speed, temperature, motion pattern, allowable leakage, counterface condition, contamination and maintenance access must be considered together. A material name by itself is not enough to approve a rotary union.</p>
<p><strong>Rating boundary:</strong> this guide does not increase any model's pressure, speed, temperature or media rating. Use the current product page and the approved drawing for the selected configuration.</p>

<h2>Three seal families, three different design roles</h2>
<table>
<thead><tr><th>Seal family</th><th>General construction</th><th>Typical strengths</th><th>Items that require confirmation</th></tr></thead>
<tbody>
<tr><td>Elastomer O-ring</td><td>Elastomer ring installed in a machined groove</td><td>Compact construction and simple replacement</td><td>Compound, groove geometry, clearance, lubrication, pressure, motion and temperature</td></tr>
<tr><td>PTFE composite or lip seal</td><td>PTFE-based dynamic sealing element, sometimes combined with an elastomer backup seal</td><td>Low friction and broad media options when the exact compound is compatible</td><td>Filler, counterface finish, runout, pressure, speed, temperature, creep and wear</td></tr>
<tr><td>Spring-energized PTFE seal</td><td>PTFE-based sealing element preloaded by an energizer</td><td>Can help maintain contact force in demanding, application-specific designs</td><td>Spring design, installation space, counterface, leakage limit and validation of the complete assembly</td></tr>
</tbody>
</table>
<p>None of these families is universally better. The correct choice depends on the complete operating envelope and on the approved construction of the selected model.</p>

<h2>Current published Begapunk model examples</h2>
<p>The table below repeats values from the current public model pages. It is not an independent certification. If it differs from an approved drawing or model-specific datasheet, the approved document controls.</p>
<table>
<thead><tr><th>Model</th><th>Maximum pressure</th><th>Maximum speed</th><th>Selection boundary</th></tr></thead>
<tbody>
<tr><td><a href="BP-2P-0001.html">BP-2P-0001</a></td><td>1 MPa</td><td>200 RPM</td><td>Two independent passages; confirm medium, temperature and duty</td></tr>
<tr><td><a href="BP-2P-130-0001.html">BP-2P-130-0001</a></td><td>5 MPa</td><td>80 RPM</td><td>High-pressure, low-speed model; use only within its published limits</td></tr>
<tr><td><a href="BP-2P-95-0001.html">BP-2P-95-0001</a></td><td>1 MPa</td><td>200 RPM</td><td>2-inlet/4-outlet distribution; use the published 1 MPa limit</td></tr>
<tr><td><a href="BP-2P-50-0001.html">BP-2P-50-0001</a></td><td>1 MPa</td><td>100 RPM</td><td>Protective shroud and labyrinth; no certified IP rating is claimed</td></tr>
</tbody>
</table>
<p>These values describe the public standard configurations. A custom request is not approved until its material, dimensions, seal arrangement and operating limits are confirmed in writing.</p>

<h2>Information needed before seal selection</h2>
<ol>
<li><strong>Media:</strong> composition, concentration, contamination and required cleanliness.</li>
<li><strong>Pressure:</strong> normal pressure, peaks, vacuum conditions and whether passages operate independently.</li>
<li><strong>Motion:</strong> continuous rotation, indexing or oscillation; maximum and typical speed; duty cycle.</li>
<li><strong>Temperature:</strong> media, ambient and expected temperature rise at the sealing interface.</li>
<li><strong>Leakage criterion:</strong> an agreed limit, test medium, pressure, duration and measurement method.</li>
<li><strong>Mechanical interface:</strong> counterface material and finish, runout, alignment, mounting loads and available space.</li>
<li><strong>Maintenance:</strong> inspection access, acceptable downtime and replacement procedure.</li>
</ol>

<h2>How production leak testing fits</h2>
<p>Begapunk's current standard production check is performed after final assembly. Each passage is checked separately with compressed air at 1.0 MPa while the other passages remain vented. The test uses approximately 1 second of pressurization and 4 seconds of hold time; a detector alarm identifies a nonconforming unit for segregation and investigation.</p>
<p>This is a production inspection step. It is not a service-life test, a universal leakage class, or permission to operate above the model's published rating. See the documented process under <a href="production-inspection-testing.html">100% Leak Testing</a>.</p>

<h2>Claims this guide does not make</h2>
<ul>
<li>No ISO leakage class is claimed.</li>
<li>No universal replacement interval or service life is claimed.</li>
<li>No generic seal family has one pressure, speed or temperature limit that applies to every geometry.</li>
<li>"Zero leakage" is not claimed. A leakage statement requires a defined limit and an agreed test method.</li>
</ul>

<h2>Request an engineering review</h2>
<p>Send the media, pressure, motion, temperature, passage count, mounting drawing and leakage criterion. Begapunk can then review a standard model or a separately documented custom configuration.</p>
<p><a href="contact.html"><strong>Request a seal and rotary-union review &rarr;</strong></a></p>
<p><strong>Technical note:</strong> when this guide and a product page differ, stop the selection and request written confirmation. The current approved product page and drawing control the model-specific decision.</p>`,

  'de/blog-rotary-union-seal-types.html': `
<p>Die Dichtungsauswahl ist eine Systementscheidung. Medium, Druck, Drehzahl, Temperatur, Bewegungsart, zul&auml;ssige Leckage, Gegenlauffl&auml;che, Verunreinigung und Wartungszugang m&uuml;ssen gemeinsam bewertet werden. Eine Werkstoffbezeichnung allein reicht nicht zur Freigabe einer Drehdurchf&uuml;hrung.</p>
<p><strong>Grenze der Angaben:</strong> Dieser Leitfaden erh&ouml;ht keine Druck-, Drehzahl-, Temperatur- oder Medienfreigabe eines Modells. Ma&szlig;geblich sind die aktuelle Produktseite und die freigegebene Zeichnung der gew&auml;hlten Ausf&uuml;hrung.</p>

<h2>Drei Dichtungsfamilien mit unterschiedlichen Aufgaben</h2>
<table>
<thead><tr><th>Dichtungsfamilie</th><th>Grundaufbau</th><th>Typische St&auml;rken</th><th>Zu best&auml;tigende Punkte</th></tr></thead>
<tbody>
<tr><td>Elastomer-O-Ring</td><td>Elastomerring in einer bearbeiteten Nut</td><td>Kompakter Aufbau und einfacher Austausch</td><td>Mischung, Nutgeometrie, Spalt, Schmierung, Druck, Bewegung und Temperatur</td></tr>
<tr><td>PTFE-Verbund- oder Lippendichtung</td><td>Dynamisches PTFE-Dichtelement, teilweise mit elastomerer St&uuml;tzdichtung</td><td>Geringe Reibung und breite Medienauswahl bei best&auml;tigter Werkstoffvertr&auml;glichkeit</td><td>F&uuml;llstoff, Gegenlauffl&auml;che, Rundlauf, Druck, Drehzahl, Temperatur, Kriechen und Verschlei&szlig;</td></tr>
<tr><td>Federunterst&uuml;tzte PTFE-Dichtung</td><td>PTFE-Dichtelement mit Vorspannelement</td><td>Kann in anwendungsspezifischen Konstruktionen die Kontaktkraft stabilisieren</td><td>Federkonstruktion, Bauraum, Gegenlauffl&auml;che, Leckagegrenze und Validierung der Gesamtbaugruppe</td></tr>
</tbody>
</table>
<p>Keine dieser Familien ist allgemein die beste. Entscheidend sind das vollst&auml;ndige Lastprofil und die freigegebene Konstruktion des ausgew&auml;hlten Modells.</p>

<h2>Aktuell ver&ouml;ffentlichte Begapunk-Modellbeispiele</h2>
<p>Die folgende Tabelle gibt Angaben der aktuell ver&ouml;ffentlichten Modellseiten wieder; sie ist keine unabh&auml;ngige Zertifizierung. Bei Abweichungen haben die freigegebene Zeichnung und das modellspezifische Datenblatt Vorrang.</p>
<table>
<thead><tr><th>Modell</th><th>Maximaldruck</th><th>Maximaldrehzahl</th><th>Auswahlgrenze</th></tr></thead>
<tbody>
<tr><td><a href="BP-2P-0001.html">BP-2P-0001</a></td><td>1 MPa</td><td>200 min<sup>-1</sup></td><td>Zwei unabh&auml;ngige Kan&auml;le; Medium, Temperatur und Lastprofil best&auml;tigen</td></tr>
<tr><td><a href="BP-2P-130-0001.html">BP-2P-130-0001</a></td><td>5 MPa</td><td>80 min<sup>-1</sup></td><td>Hochdruck-/Niederdrehzahlmodell; nur innerhalb der ver&ouml;ffentlichten Grenzen einsetzen</td></tr>
<tr><td><a href="BP-2P-95-0001.html">BP-2P-95-0001</a></td><td>1 MPa</td><td>200 min<sup>-1</sup></td><td>Verteilung 2 Eing&auml;nge/4 Ausg&auml;nge; die ver&ouml;ffentlichte Grenze von 1 MPa einhalten</td></tr>
<tr><td><a href="BP-2P-50-0001.html">BP-2P-50-0001</a></td><td>1 MPa</td><td>100 min<sup>-1</sup></td><td>Schutzhaube und Labyrinth; keine zertifizierte IP-Schutzart angegeben</td></tr>
</tbody>
</table>
<p>Diese Werte gelten f&uuml;r die ver&ouml;ffentlichten Standardausf&uuml;hrungen. Eine kundenspezifische Ausf&uuml;hrung ist erst freigegeben, wenn Werkstoff, Abmessungen, Dichtungsanordnung und Betriebsgrenzen schriftlich best&auml;tigt sind.</p>

<h2>Erforderliche Angaben vor der Dichtungsauswahl</h2>
<ol>
<li><strong>Medium:</strong> Zusammensetzung, Konzentration, Verunreinigung und geforderte Reinheit.</li>
<li><strong>Druck:</strong> Normaldruck, Druckspitzen, Vakuumbedingungen und unabh&auml;ngiger Betrieb der Kan&auml;le.</li>
<li><strong>Bewegung:</strong> Dauerrotation, Takten oder Schwenken; maximale und typische Drehzahl; Einschaltdauer.</li>
<li><strong>Temperatur:</strong> Medium, Umgebung und erwartete Erw&auml;rmung an der Dichtstelle.</li>
<li><strong>Leckagekriterium:</strong> vereinbarter Grenzwert, Pr&uuml;fmedium, Druck, Dauer und Messverfahren.</li>
<li><strong>Mechanische Schnittstelle:</strong> Werkstoff und Oberfl&auml;che der Gegenlauffl&auml;che, Rundlauf, Ausrichtung, Montagelasten und Bauraum.</li>
<li><strong>Wartung:</strong> Inspektionszugang, zul&auml;ssige Stillstandszeit und Austauschverfahren.</li>
</ol>

<h2>Einordnung der Produktions-Dichtheitspr&uuml;fung</h2>
<p>Die aktuelle Standardpr&uuml;fung von Begapunk erfolgt nach der Endmontage. Jeder Kanal wird einzeln mit Druckluft bei 1,0 MPa gepr&uuml;ft, w&auml;hrend die &uuml;brigen Kan&auml;le drucklos und offen bleiben. Die Pr&uuml;fung umfasst etwa 1 Sekunde Druckaufbau und 4 Sekunden Haltezeit. Ein Alarm des Pr&uuml;fger&auml;ts kennzeichnet ein nichtkonformes Teil zur Sperrung und Ursachenanalyse.</p>
<p>Dies ist eine Produktionspr&uuml;fung. Sie ist weder eine Lebensdauerpr&uuml;fung noch eine allgemeine Leckageklasse oder eine Freigabe oberhalb der ver&ouml;ffentlichten Modellgrenze. Der dokumentierte Pr&uuml;fablauf ist unter <a href="production-inspection-testing.html">100% Leak Testing</a> beschrieben.</p>

<h2>Was dieser Leitfaden nicht behauptet</h2>
<ul>
<li>Es wird keine ISO-Leckageklasse beansprucht.</li>
<li>Es wird kein allgemeines Wechselintervall und keine pauschale Lebensdauer angegeben.</li>
<li>Keine Dichtungsfamilie besitzt eine universelle Druck-, Drehzahl- oder Temperaturgrenze f&uuml;r alle Geometrien.</li>
<li>&bdquo;Nullleckage&ldquo; wird nicht behauptet. Eine Aussage zur Leckage erfordert einen definierten Grenzwert und ein vereinbartes Pr&uuml;fverfahren.</li>
</ul>

<h2>Technische Pr&uuml;fung anfragen</h2>
<p>Senden Sie Medium, Druck, Bewegung, Temperatur, Kanalzahl, Einbauzeichnung und Leckagekriterium. Begapunk kann daraufhin ein Standardmodell oder eine separat dokumentierte Sonderausf&uuml;hrung pr&uuml;fen.</p>
<p><a href="contact.html"><strong>Dichtungs- und Drehdurchf&uuml;hrungspr&uuml;fung anfragen &rarr;</strong></a></p>
<p><strong>Technischer Hinweis:</strong> Weicht dieser Leitfaden von einer Produktseite ab, ist die Auswahl zu stoppen und schriftlich zu kl&auml;ren. F&uuml;r die modellspezifische Entscheidung gelten die aktuelle freigegebene Produktseite und Zeichnung.</p>`,

  'ja/blog-rotary-union-seal-types.html': `
<p>シール選定は、シール材だけで決められるものではありません。使用流体、圧力、回転速度、温度、動作パターン、許容漏れ量、摺動相手面、異物、保守性を一体で確認する必要があります。</p>
<p><strong>仕様上の境界：</strong>本ページは、各型式の圧力・回転速度・温度・使用流体の許容範囲を拡大するものではありません。選定時は、最新の製品ページと承認図面を優先してください。</p>

<h2>3種類のシール構造と役割</h2>
<table>
<thead><tr><th>シール構造</th><th>基本構造</th><th>一般的な特長</th><th>確認が必要な項目</th></tr></thead>
<tbody>
<tr><td>エラストマーOリング</td><td>加工溝に組み込むエラストマー製リング</td><td>省スペースで交換しやすい</td><td>材質、溝寸法、すきま、潤滑、圧力、動作、温度</td></tr>
<tr><td>PTFE複合シール／リップシール</td><td>PTFE系の動的シール。補助Oリングを併用する構造もある</td><td>適合する配合材を選べば、低摩擦と幅広い流体対応が可能</td><td>充填材、摺動面粗さ、振れ、圧力、速度、温度、クリープ、摩耗</td></tr>
<tr><td>ばね入りPTFEシール</td><td>ばね等の付勢部品でPTFE系シールに予圧を与える構造</td><td>用途別設計により接触力の維持に役立つ</td><td>ばね設計、取付スペース、摺動面、漏れ基準、アセンブリ全体の検証</td></tr>
</tbody>
</table>
<p>どの構造も万能ではありません。実際の使用条件と、選定する型式で承認された構造を照合して判断します。</p>

<h2>現在公開中のBegapunk型式例</h2>
<p>以下の表は、現在公開中の各型式ページの数値を再掲したものであり、独立した認証を示すものではありません。承認図面または型式別データシートと異なる場合は、承認済み文書を優先します。</p>
<table>
<thead><tr><th>型式</th><th>最高使用圧力</th><th>最高回転速度</th><th>選定上の境界</th></tr></thead>
<tbody>
<tr><td><a href="BP-2P-0001.html">BP-2P-0001</a></td><td>1 MPa</td><td>200 min<sup>-1</sup></td><td>2回路独立。流体、温度、デューティを確認</td></tr>
<tr><td><a href="BP-2P-130-0001.html">BP-2P-130-0001</a></td><td>5 MPa</td><td>80 min<sup>-1</sup></td><td>高圧・低速型。公開仕様範囲内で使用</td></tr>
<tr><td><a href="BP-2P-95-0001.html">BP-2P-95-0001</a></td><td>1 MPa</td><td>200 min<sup>-1</sup></td><td>2入力・4出力の分配構造。公開仕様の1 MPa上限を適用</td></tr>
<tr><td><a href="BP-2P-50-0001.html">BP-2P-50-0001</a></td><td>1 MPa</td><td>100 min<sup>-1</sup></td><td>保護カバーとラビリンス構造。認証済みIP等級の表示なし</td></tr>
</tbody>
</table>
<p>上記は公開されている標準仕様です。特注仕様は、材質、寸法、シール構成、使用限界が書面で確認されるまで承認済みとはみなしません。</p>

<h2>シール選定前に必要な情報</h2>
<ol>
<li><strong>使用流体：</strong>組成、濃度、異物、要求清浄度。</li>
<li><strong>圧力：</strong>常用圧力、ピーク圧、真空条件、各回路の独立動作。</li>
<li><strong>動作：</strong>連続回転、割出し、揺動。最高速度、通常速度、デューティ。</li>
<li><strong>温度：</strong>流体温度、周囲温度、シール部の温度上昇。</li>
<li><strong>漏れ判定：</strong>合意した許容値、試験流体、圧力、時間、測定方法。</li>
<li><strong>機械側条件：</strong>摺動相手材と面粗さ、振れ、芯ずれ、取付荷重、取付スペース。</li>
<li><strong>保守条件：</strong>点検性、許容停止時間、交換手順。</li>
</ol>

<h2>出荷前漏れ検査の位置づけ</h2>
<p>Begapunkの現行標準検査は総組立後に行います。各回路を1回路ずつ、圧縮空気1.0 MPaで検査し、検査していない回路は大気開放とします。約1秒加圧した後、約4秒保圧し、検査装置が警報を出した製品は不適合品として隔離し、原因を確認します。</p>
<p>これは出荷前の工程検査です。耐久試験、共通の漏れ等級、または製品ページの使用圧力を超える運転許可ではありません。検査手順の記録範囲は<a href="production-inspection-testing.html">100% Leak Testing</a>に記載しています。</p>

<h2>本ページで保証しない事項</h2>
<ul>
<li>ISO漏れ等級は表示していません。</li>
<li>一律の交換周期や寿命は表示していません。</li>
<li>シール構造だけで全ての形状に共通する圧力・速度・温度限界は決まりません。</li>
<li>「漏れゼロ」は主張しません。漏れに関する記載には、定量的な許容値と合意済みの試験方法が必要です。</li>
</ul>

<h2>技術選定をご依頼ください</h2>
<p>使用流体、圧力、動作、温度、回路数、取付図、漏れ判定基準をご提示ください。標準型式または個別に文書化した特注仕様を検討します。</p>
<p><a href="contact.html"><strong>シールとロータリジョイントの選定を依頼する &rarr;</strong></a></p>
<p><strong>技術注記：</strong>本ページと製品ページの記載が異なる場合は選定を中止し、書面で確認してください。型式固有の判断には、最新の承認済み製品ページと図面を適用します。</p>`,

  'ru/blog-rotary-union-seal-types.html': `
<p>Выбор уплотнения является системной инженерной задачей. Необходимо совместно учитывать рабочую среду, давление, скорость, температуру, характер движения, допустимую утечку, состояние ответной поверхности, загрязнение и доступность обслуживания. Одного названия материала недостаточно для одобрения вращающегося соединения.</p>
<p><strong>Граница применимости:</strong> данное руководство не повышает допустимые давление, скорость, температуру или перечень сред ни для одной модели. При выборе приоритет имеют актуальная страница изделия и утверждённый чертёж конкретного исполнения.</p>

<h2>Три семейства уплотнений и разные задачи</h2>
<table>
<thead><tr><th>Семейство</th><th>Общая конструкция</th><th>Типичные преимущества</th><th>Что необходимо подтвердить</th></tr></thead>
<tbody>
<tr><td>Эластомерное O-кольцо</td><td>Эластомерное кольцо в обработанной канавке</td><td>Компактность и простая замена</td><td>Марку материала, геометрию канавки, зазор, смазку, давление, движение и температуру</td></tr>
<tr><td>Композитное PTFE-уплотнение или манжета</td><td>Динамический элемент на основе PTFE, иногда с эластомерным резервным уплотнением</td><td>Низкое трение и широкий выбор сред при подтверждённой совместимости состава</td><td>Наполнитель, поверхность контртела, биение, давление, скорость, температуру, ползучесть и износ</td></tr>
<tr><td>Подпружиненное PTFE-уплотнение</td><td>Элемент на основе PTFE с предварительным поджатием</td><td>Может поддерживать контактное усилие в специально рассчитанной конструкции</td><td>Конструкцию пружины, место установки, контртело, предел утечки и проверку узла в сборе</td></tr>
</tbody>
</table>
<p>Ни одно семейство не является универсально лучшим. Выбор выполняют по полному набору рабочих условий и по одобренной конструкции конкретной модели.</p>

<h2>Актуальные опубликованные примеры моделей Begapunk</h2>
<p>Таблица ниже повторяет значения с актуальных публичных страниц моделей и не является независимой сертификацией. При расхождении приоритет имеют утверждённый чертёж и технический лист конкретной модели.</p>
<table>
<thead><tr><th>Модель</th><th>Максимальное давление</th><th>Максимальная скорость</th><th>Граница выбора</th></tr></thead>
<tbody>
<tr><td><a href="BP-2P-0001.html">BP-2P-0001</a></td><td>1 МПа</td><td>200 об/мин</td><td>Два независимых канала; подтвердить среду, температуру и режим работы</td></tr>
<tr><td><a href="BP-2P-130-0001.html">BP-2P-130-0001</a></td><td>5 МПа</td><td>80 об/мин</td><td>Модель для высокого давления и низкой скорости; использовать только в опубликованных пределах</td></tr>
<tr><td><a href="BP-2P-95-0001.html">BP-2P-95-0001</a></td><td>1 МПа</td><td>200 об/мин</td><td>Распределение 2 входа/4 выхода; применять опубликованный предел 1 МПа</td></tr>
<tr><td><a href="BP-2P-50-0001.html">BP-2P-50-0001</a></td><td>1 МПа</td><td>100 об/мин</td><td>Защитный кожух и лабиринт; сертифицированная степень IP не заявлена</td></tr>
</tbody>
</table>
<p>Эти значения относятся к опубликованным стандартным исполнениям. Специальный запрос не считается одобренным, пока материал, размеры, схема уплотнений и рабочие пределы не подтверждены письменно.</p>

<h2>Данные, необходимые до выбора уплотнения</h2>
<ol>
<li><strong>Рабочая среда:</strong> состав, концентрация, загрязнение и требуемая чистота.</li>
<li><strong>Давление:</strong> рабочее значение, пики, вакуум и независимость каналов.</li>
<li><strong>Движение:</strong> непрерывное вращение, индексирование или качание; максимальная и обычная скорость; рабочий цикл.</li>
<li><strong>Температура:</strong> среды, окружающего воздуха и ожидаемый нагрев в зоне уплотнения.</li>
<li><strong>Критерий утечки:</strong> согласованный предел, испытательная среда, давление, длительность и метод измерения.</li>
<li><strong>Механический интерфейс:</strong> материал и шероховатость контртела, биение, соосность, монтажные нагрузки и место установки.</li>
<li><strong>Обслуживание:</strong> доступ для осмотра, допустимый простой и порядок замены.</li>
</ol>

<h2>Роль производственной проверки герметичности</h2>
<p>Текущая стандартная проверка Begapunk выполняется после окончательной сборки. Каждый канал проверяют отдельно сжатым воздухом при 1,0 МПа, а остальные каналы оставляют открытыми без давления. Подача давления занимает около 1 секунды, выдержка — около 4 секунд. Сигнал прибора означает несоответствие: изделие изолируют и направляют на поиск причины.</p>
<p>Это производственный контроль. Он не является испытанием ресурса, общей классификацией утечки или разрешением работать выше опубликованного предела модели. Документированный процесс описан на странице <a href="production-inspection-testing.html">100% Leak Testing</a>.</p>

<h2>Чего это руководство не заявляет</h2>
<ul>
<li>Класс утечки по ISO не заявляется.</li>
<li>Универсальный срок службы или период замены не заявляется.</li>
<li>Ни одно семейство уплотнений не имеет единого предела давления, скорости или температуры для всех геометрий.</li>
<li>«Нулевая утечка» не заявляется. Любое заявление об утечке требует определённого предела и согласованного метода испытаний.</li>
</ul>

<h2>Запросить инженерный подбор</h2>
<p>Передайте данные о среде, давлении, движении, температуре, числе каналов, монтажный чертёж и критерий утечки. Begapunk сможет рассмотреть стандартную модель или отдельно документированное специальное исполнение.</p>
<p><a href="contact.html"><strong>Запросить подбор уплотнения и вращающегося соединения &rarr;</strong></a></p>
<p><strong>Техническое примечание:</strong> если данное руководство расходится со страницей изделия, выбор необходимо остановить и получить письменное подтверждение. Для конкретной модели действуют актуальная одобренная страница изделия и чертёж.</p>`
};

const relatedSections = {
  'blog-rotary-union-seal-types.html': `
<section class="related-articles">
  <div class="container">
    <h2 style="font-size:1.5rem;font-weight:700;color:var(--dark-soft);">Related Articles</h2>
    <div class="related-grid">
      <div class="related-card">
        <span class="tag">Selection Guide</span>
        <h3>How to Select a Pneumatic Rotary Joint: 5 Parameters</h3>
        <p>Review the five operating inputs used to narrow a model selection.</p>
        <a href="blog-rotary-joint-selection.html">Read Now &rarr;</a>
      </div>
      <div class="related-card">
        <span class="tag">Maintenance</span>
        <h3>Rotary Joint Seal Replacement: A Step-by-Step Guide</h3>
        <p>Review service access, seal orientation and leakage checks before planning replacement work.</p>
        <a href="blog-seal-replacement.html">Read Now &rarr;</a>
      </div>
      <div class="related-card">
        <span class="tag">Selection Guide</span>
        <h3>Rotary Joint Body Materials</h3>
        <p>Compare published material options against media, corrosion, weight and manufacturing requirements.</p>
        <a href="blog-rotary-joint-materials.html">Read Now &rarr;</a>
      </div>
    </div>
  </div>
</section>`,

  'de/blog-rotary-union-seal-types.html': `
<section class="related-articles">
  <div class="container">
    <h2 style="font-size:1.5rem;font-weight:700;color:var(--dark-soft);">Weiterf&uuml;hrende Artikel</h2>
    <div class="related-grid">
      <div class="related-card">
        <span class="tag">Auswahlleitfaden</span>
        <h3>Pneumatische Drehdurchf&uuml;hrung ausw&auml;hlen: 5 Parameter</h3>
        <p>Pr&uuml;fen Sie f&uuml;nf Betriebsangaben, um die Modellauswahl einzugrenzen.</p>
        <a href="blog-rotary-joint-selection.html">Jetzt lesen</a>
      </div>
      <div class="related-card">
        <span class="tag">Instandhaltung</span>
        <h3>Dichtungswechsel an Drehdurchf&uuml;hrungen: Schritt-f&uuml;r-Schritt-Leitfaden</h3>
        <p>Pr&uuml;fen Sie Wartungszugang, Dichtungsausrichtung und Leckagekontrolle vor der Planung des Austauschs.</p>
        <a href="blog-seal-replacement.html">Jetzt lesen</a>
      </div>
      <div class="related-card">
        <span class="tag">Auswahlleitfaden</span>
        <h3>Geh&auml;usewerkstoffe f&uuml;r Drehdurchf&uuml;hrungen</h3>
        <p>Vergleichen Sie ver&ouml;ffentlichte Werkstoffoptionen mit Medium, Korrosion, Gewicht und Fertigungsanforderungen.</p>
        <a href="blog-rotary-joint-materials.html">Jetzt lesen</a>
      </div>
    </div>
  </div>
</section>`,

  'ja/blog-rotary-union-seal-types.html': `
<section class="related-articles">
  <div class="container">
    <h2 style="font-size:1.5rem;font-weight:700;color:var(--dark-soft);">関連記事</h2>
    <div class="related-grid">
      <div class="related-card">
        <span class="tag">選定ガイド</span>
        <h3>空気圧ロータリージョイント選定の5項目</h3>
        <p>型式候補を絞り込むために確認する5つの運転条件を解説します。</p>
        <a href="blog-rotary-joint-selection.html">読む &rarr;</a>
      </div>
      <div class="related-card">
        <span class="tag">メンテナンス</span>
        <h3>ロータリージョイントのシール交換手順</h3>
        <p>交換作業を計画する前に、保守スペース、シール方向、漏れ確認を検討します。</p>
        <a href="blog-seal-replacement.html">読む &rarr;</a>
      </div>
      <div class="related-card">
        <span class="tag">選定ガイド</span>
        <h3>ロータリージョイントの本体材質</h3>
        <p>公開されている材質候補を、流体、耐食性、質量、加工要件と照合します。</p>
        <a href="blog-rotary-joint-materials.html">読む &rarr;</a>
      </div>
    </div>
  </div>
</section>`,

  'ru/blog-rotary-union-seal-types.html': `
<section class="related-articles">
  <div class="container">
    <h2 style="font-size:1.5rem;font-weight:700;color:var(--dark-soft);">Связанные материалы</h2>
    <div class="related-grid">
      <div class="related-card">
        <span class="tag">Руководство по выбору</span>
        <h3>Выбор пневматического вращающегося соединения: 5 параметров</h3>
        <p>Пять рабочих параметров, которые помогают сузить выбор модели.</p>
        <a href="blog-rotary-joint-selection.html">Читать</a>
      </div>
      <div class="related-card">
        <span class="tag">Обслуживание</span>
        <h3>Замена уплотнения вращающегося соединения: пошаговое руководство</h3>
        <p>Перед планированием замены проверьте доступ для обслуживания, ориентацию уплотнения и контроль утечки.</p>
        <a href="blog-seal-replacement.html">Читать</a>
      </div>
      <div class="related-card">
        <span class="tag">Руководство по выбору</span>
        <h3>Материалы корпуса вращающегося соединения</h3>
        <p>Сопоставьте опубликованные варианты материалов со средой, коррозией, массой и требованиями производства.</p>
        <a href="blog-rotary-joint-materials.html">Читать</a>
      </div>
    </div>
  </div>
</section>`
};

const markerPattern = /<!-- ===== BLOG CONTENT ===== -->\s*<article class="blog-content">[\s\S]*?<\/article>/;
const relatedPattern = /<!-- ===== RELATED ARTICLES ===== -->\s*<section class="related-articles">[\s\S]*?<\/section>/;
const jsonLdPattern = /<script\b([^>]*\btype=["']application\/ld\+json["'][^>]*)>([\s\S]*?)<\/script>/gi;

function removeInvisibleFaqPage(html, relativePath) {
  return html.replace(jsonLdPattern, (fullMatch, attributes, rawJson) => {
    let data;
    try {
      data = JSON.parse(rawJson);
    } catch (error) {
      throw new Error(`Invalid JSON-LD in ${relativePath}: ${error.message}`);
    }

    const originalJson = JSON.stringify(data);
    if (Array.isArray(data)) {
      data = data.filter((node) => node?.['@type'] !== 'FAQPage');
    } else if (data?.['@type'] === 'FAQPage') {
      return '';
    } else if (Array.isArray(data?.['@graph'])) {
      data = { ...data, '@graph': data['@graph'].filter((node) => node?.['@type'] !== 'FAQPage') };
    }

    const normalizeArticleNode = (node) => {
      if (node?.['@type'] !== 'TechArticle') return node;
      const nextNode = { ...node };
      if (typeof nextNode.description === 'string') {
        nextNode.description = nextNode.description.replace(/carbon-filled\s+/gi, '');
      }
      if (Array.isArray(nextNode.about)) {
        nextNode.about = nextNode.about.filter((topic) => topic !== 'carbon-filled PTFE seal');
      }
      return nextNode;
    };

    if (Array.isArray(data)) {
      data = data.map(normalizeArticleNode);
    } else if (Array.isArray(data?.['@graph'])) {
      data = { ...data, '@graph': data['@graph'].map(normalizeArticleNode) };
    } else {
      data = normalizeArticleNode(data);
    }

    if (JSON.stringify(data) === originalJson) return fullMatch;
    return `<script${attributes}>\n${JSON.stringify(data, null, 2)}\n</script>`;
  });
}

function assertNoFaqPage(html, relativePath) {
  for (const match of html.matchAll(jsonLdPattern)) {
    const data = JSON.parse(match[2]);
    const nodes = Array.isArray(data) ? data : Array.isArray(data?.['@graph']) ? data['@graph'] : [data];
    if (nodes.some((node) => node?.['@type'] === 'FAQPage')) {
      throw new Error(`Invisible FAQPage remains in ${relativePath}`);
    }
  }
}

let changed = 0;

for (const [relativePath, body] of Object.entries(pages)) {
  const filePath = path.join(rootDir, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  if (!markerPattern.test(source)) {
    throw new Error(`Blog content marker not found: ${relativePath}`);
  }
  if (!relatedPattern.test(source)) {
    throw new Error(`Related articles marker not found: ${relativePath}`);
  }
  const replacement = `<!-- ===== BLOG CONTENT ===== -->\n<article class="blog-content">${body}\n</article>`;
  const relatedReplacement = `<!-- ===== RELATED ARTICLES ===== -->\n${relatedSections[relativePath]}`;
  const next = removeInvisibleFaqPage(source
    .replace(markerPattern, replacement)
    .replace(relatedPattern, relatedReplacement)
    .replace(/spring-energized carbon-filled PTFE/g, 'spring-energized PTFE')
    .replace(/"dateModified"\s*:\s*"\d{4}-\d{2}-\d{2}"/, '"dateModified": "2026-08-08"'), relativePath);
  assertNoFaqPage(next, relativePath);
  if (next !== source) {
    fs.writeFileSync(filePath, next, 'utf8');
    changed += 1;
  }
}

console.log(`Sealing guide sync complete: ${changed} of ${Object.keys(pages).length} pages changed.`);
