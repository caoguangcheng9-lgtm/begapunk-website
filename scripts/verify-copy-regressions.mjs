import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const failures = [];
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));

const checks = [
  {
    file: 'blog-rotary-joint-selection.html',
    forbidden: [
      'oxygen and coolant, for example',
      'Laser cutting head (clamp, unclamp, blow dust)',
      'If channel A carries compressed air and channel B carries cutting coolant',
      'High torque, high RPM, heavy hoses',
      'Size Is Not Always Smaller',
      '~15 L/min',
      '~60 L/min',
      '~150 L/min',
      '40 mm bore pneumatic cylinder',
      'two complete seal assemblies',
      'Pneumatic gripper = <strong>2 channels</strong>',
      'Pneumatic gripper + vacuum ejector = <strong>4 channels</strong>',
    ],
    required: [
      'A rotary fixture needs <strong>3 passages</strong> only when',
      'A Smaller Body Does Not Guarantee Adequate Flow',
      'Flow depends on the complete path',
      'Do not apply the ratings of a standard air model to mixed-media service.',
      'A double-acting pneumatic gripper typically requires <strong>2 passages</strong>',
      'The required passage count depends on where the control valves and vacuum generator are mounted.',
      '"dateModified":"2026-08-26"',
    ],
  },
  {
    file: 'blog.html',
    forbidden: ['Continue the Review', 'Move from guidance to project evidence', 'Explore documented integrations', 'Review testing evidence'],
    required: ['Practical Next Steps', 'Compare models, see real installations, and view production testing', 'A model number, photo, or drawing is enough to start.'],
  },
  {
    file: 'de/blog.html',
    forbidden: ['Technische Prüfung fortsetzen', 'Vom Leitfaden zu projektbezogenen Nachweisen', 'dokumentierte Integrationen', 'Prüfnachweise ansehen'],
    required: ['Praktische nächste Schritte', 'Modelle vergleichen, reale Einbauten ansehen und den Prüfablauf kennenlernen', 'Für den Einstieg genügt eine Modellnummer, ein Foto oder eine Zeichnung.'],
  },
  {
    file: 'ja/blog.html',
    forbidden: ['技術ガイドから案件別の確認資料へ', '技術承認前の一次選定', '次の確認資料'],
    required: ['次にできること', '型式を比較し、実機への取付例と出荷前検査工程を見る', '初回のお問い合わせは、型式、写真、図面のいずれか一つで十分です。'],
  },
  {
    file: 'ru/blog.html',
    forbidden: ['Продолжить технический анализ', 'От общих рекомендаций к проектным данным', 'подтверждённые интеграции', 'Посмотреть данные о проверке'],
    required: ['Следующие шаги', 'Сравните модели, посмотрите реальные установки и процесс производственных испытаний', 'Для начала достаточно номера модели, фотографии или чертежа.'],
  },
  {
    file: 'case-studies.html',
    forbidden: ['Details for a Similar Installation', 'What information is needed for model selection?', 'written engineering confirmation', 'suitability depends on written engineering review'],
    required: ['For a Similar Rear-Chuck Installation', 'What can I send to start a model recommendation?', 'A model number, photo, or drawing is enough to start.', 'send the operating conditions to check whether it fits'],
  },
  {
    file: 'de/case-studies.html',
    forbidden: ['Vor der technischen Auslegung zu bestätigen', 'Welche Angaben werden für die Modellauswahl benötigt?', 'schriftlich technisch bestätigt', 'anwendungsspezifische technische Prüfung'],
    required: ['Für einen ähnlichen Einbau am hinteren Spannfutter', 'Was kann ich für eine Modellempfehlung senden?', 'Für den Einstieg genügt eine Modellnummer, ein Foto oder eine Zeichnung.', 'senden Sie die Betriebsbedingungen, damit wir die Eignung prüfen können'],
  },
  {
    file: 'ja/case-studies.html',
    forbidden: ['仕様確定前の確認項目', '型式選定に必要な情報は？', '使用流体、流路数、常用・ピーク圧力'],
    required: ['同様の後方チャック用途をご検討の場合', '型式提案には何を送ればよいですか？', '型式、写真、図面のいずれかがあれば始められます。', '使用条件をお送りいただければ、適合可否を確認します'],
  },
  {
    file: 'ru/case-studies.html',
    forbidden: ['Что нужно подтвердить до подбора', 'Для инженерного запроса приложите', 'Может ли Begapunk проверить существующий номер детали или чертёж?', 'Каталожная модель для инженерной проверки'],
    required: ['Для аналогичной установки на заднем патроне', 'С чего можно начать подбор модели?', 'Для начала достаточно номера детали, фотографии или чертежа.', 'сообщите условия эксплуатации, чтобы проверить, подходит ли она'],
  },
  {
    file: 'application-steel-dusty-environments.html',
    forbidden: ['Send Harsh Environment Specs', 'Scale, vibration, heat nearby', 'Shock, side load, contamination'],
    required: ['Send Operating Conditions', 'Metal scale, vibration, nearby heat', 'Impact loads, side load, contamination'],
  },
  {
    file: 'product-comparison.html',
    forbidden: ['Send Drawing or Photo &rarr;', 'Send RFQ &rarr;'],
    required: ['Request a Quote &rarr;', 'Request Model Selection &amp; Quote &rarr;', '2 passages · 2 in / 4 out'],
  },
  {
    file: 'products.html',
    forbidden: ['Begapunk-Rotary-Joint-Catalog-2026.pdf', 'about 30 days for custom'],
    required: ['within 30 calendar days', '2 in / 4 out', '4 × Ø4 outlets (2 clamp · 2 release)'],
  },
  {
    file: 'BP-2P-95-0005.html',
    forbidden: ['4 × Ø4 mm through-hole', '4 × Ø4 mm mounting'],
    required: ['release inlet', 'clamp inlet', 'release outlet', 'clamp outlet'],
  },
  {
    file: 'index.html',
    forbidden: ['Email or WhatsApp your drawing'],
    required: ['Email or WhatsApp a model number, photo, drawing, or operating conditions'],
  },
  {
    file: 'contact.html',
    forbidden: ['Quick quote', 'We will identify the next useful step.', 'We may ask about your operating conditions', 'Email and requirements are enough'],
    required: [
      'Quote &amp; application review',
      'we&rsquo;ll ask only for what is needed to quote or recommend a model',
      'reviewed by our engineers. We normally reply within one business day.',
      'We do not use your inquiries or drawings for marketing or public display.',
      'An email and a short description are enough to start',
    ],
  },
  {
    file: 'de/contact.html',
    forbidden: ['Schnelle Angebotsanfrage', 'nächsten sinnvollen Schritt', 'Möglicherweise fragen wir nach Ihren Betriebsbedingungen'],
    required: ['Angebot &amp; technische Abstimmung', 'innerhalb eines Arbeitstags', 'weder für Marketingzwecke noch zur öffentlichen Darstellung', 'E-Mail-Adresse und eine kurze Beschreibung'],
  },
  {
    file: 'ja/contact.html',
    forbidden: ['かんたん見積依頼', '次に必要な手順をご案内します', '使用条件をお伺いする場合があります'],
    required: ['お見積りと製品選定', '通常1営業日以内にご返信します', 'マーケティングや一般公開に使用することはありません', 'メールアドレスと簡単なご説明だけ'],
  },
  {
    file: 'ru/contact.html',
    forbidden: ['Быстрый запрос цены', 'следующий полезный шаг', 'Мы можем уточнить условия эксплуатации'],
    required: ['Расчёт стоимости и подбор решения', 'в течение одного рабочего дня', 'не публикуем их в открытом доступе', 'адреса электронной почты и краткого описания'],
  },
  {
    file: 'send_inquiry.php',
    required: ['normally reply within one business day', 'innerhalb eines Arbeitstags', '通常1営業日以内にご返信します', 'в течение одного рабочего дня'],
  },
  {
    file: 'thank-you.html',
    forbidden: ['Thank You! Your Inquiry Is Submitted', 'Download catalog', 'Inquiry Submitted | Begapunk', 'reply with a quotation, estimated lead time, and CAD availability', 'Have additional application details?', 'Reply from Our Sales Team'],
    required: [
      '<title>Inquiry Received | Begapunk</title>',
      'We have received your inquiry. Our engineers normally reply within one business day and ask only for details needed to answer your request.',
      'Thank You! We&rsquo;ve Received Your Inquiry',
      'we normally reply within one business day',
      'we will ask only for the specific detail required',
      'Want to add a photo or drawing?',
      'Normally reply within one business day',
      'Inquiries and drawings are not used for marketing or public display',
    ],
  },
  {
    file: 'de/thank-you.html',
    forbidden: ['Download catalog', 'voraussichtlicher Fertigungszeit', 'CAD-Verfügbarkeit', 'Möchten Sie weitere Angaben ergänzen?', 'Antwort unseres Vertriebsteams'],
    required: ['Ihre Anfrage ist bei uns eingegangen.', 'normalerweise innerhalb eines Arbeitstags', 'nur nach Angaben, die für die Antwort noch fehlen', 'Foto oder eine Zeichnung ergänzen', 'nicht für Marketing oder öffentliche Darstellung verwendet'],
  },
  {
    file: 'ja/thank-you.html',
    forbidden: ['Download catalog', '予定製作期間', 'CADデータの提供可否', '追加情報がある場合は、WhatsAppから技術チームへ', '営業担当からの回答'],
    required: ['お問い合わせを受け付けました。', '通常1営業日以内に返信します', '回答に必要な情報が不足している場合だけ', '写真や図面を追加したい場合', 'マーケティングや一般公開には使用しません'],
  },
  {
    file: 'ru/thank-you.html',
    forbidden: ['Download catalog', 'ориентировочным сроком изготовления', 'доступности CAD', 'Хотите дополнить запрос?', 'Ответ нашего отдела продаж'],
    required: ['Мы получили ваш запрос.', 'обычно отвечают в течение одного рабочего дня', 'только те данные, которые действительно нужны для ответа', 'добавить фотографию или чертёж', 'для маркетинга или открытой публикации'],
  },
  {
    file: 'production-inspection-testing.html',
    forbidden: ['The sequence below preserves', 'Control every NG result', '>NG handling<', '>NG segregation and disposition<', 'Any NG unit', 'Define the inspection requirement for your project', 'Request an Engineering Review'],
    required: ['Every finished unit follows the same inspection and nonconformance process before release.', 'Segregate every nonconforming unit', '>Nonconforming-unit handling<', '>Nonconforming-unit segregation and disposition<', 'Any nonconforming unit', 'Need Inspection Records with Your Order?', 'Send Inspection Requirements', 'Integrated rotation · PASS/NG', 'The instrument displays PASS for every passage'],
  },
  {
    file: 'faq.html',
    forbidden: ['Send the basic operating conditions', 'provide the equipment application and basic operating conditions', 'Do not run a standard compressed-air configuration without oil mist', 'What air preparation does a compressed-air rotary joint require?'],
    required: ['complete three-piece air-preparation unit', 'wear-resistant, oil-free seal option', 'automated test equipment includes a rotation function', 'within 30 calendar days', 'We do not use your inquiries or drawings for marketing or public display.'],
  },
  {
    file: 'terms.html',
    forbidden: [
      'dates are estimates rather than fixed delivery commitments',
      'Custom-product lead time depends on drawing approval',
      'Repair, replacement, credit, refund, or another remedy is not automatic',
      'Begapunk Precision Rotary Joint Manufacturer ("we", "us", or "our")',
      'Ningbo International Arbitration Court',
    ],
    required: [
      'minimum order quantity is one unit for both catalog and custom products',
      'Catalog models typically take about 20 calendar days to produce',
      'Custom products are completed within 30 calendar days',
      'Production time starts when payment is received',
      'one year from the shipment date',
      'replacement at no charge',
      'Ningbo Begapunk Pneumatic Components Co., Ltd. ("Begapunk", "we", "us", or "our")',
      'Ningbo Arbitration Commission',
      'arbitration rules in effect at the time of submission',
    ],
  },
  {
    file: 'privacy.html',
    forbidden: ['Begapunk Precision Rotary Joint Manufacturer ("we", "us", or "our")', '<strong>Last Updated:</strong> August 27, 2026'],
    required: [
      '<strong>Last Updated:</strong> August 28, 2026',
      'Ningbo Begapunk Pneumatic Components Co., Ltd. ("Begapunk", "we", "us", or "our")',
      'We do not use your inquiries or drawings for marketing or public display.',
    ],
  },
  {
    file: 'about.html',
    forbidden: ['Global Expansion', 'Expanded production capacity', 'Leadership', 'Meet the Team', 'Founder &amp; Chief Engineer', 'Li Wei', 'Sarah Zhang', 'Production Manager', 'Fluent in EN/DE/ES'],
    required: ['International Project Support', 'Website launched with English technical documentation and expanded application support.', 'Project Support', 'Engineering, Production &amp; Sales', 'Founder &amp; Engineer', 'Production &amp; Quality', 'Machining, assembly, and passage-by-passage inspection', 'Inquiry, drawing, quotation, and order coordination'],
  },
  {
    file: 'de/about.html',
    forbidden: ['Li Wei', 'Sarah Zhang', 'Unternehmensleitung', '<h2 class="section-title">Unser Team</h2>', 'leitender Ingenieur'],
    required: ['Projektunterstützung', 'Technik, Fertigung &amp; Vertrieb', 'Gründer &amp; Ingenieur', 'Fertigung &amp; Qualität', 'Koordination von Bearbeitung, Montage und Prüfung jedes einzelnen Kanals'],
  },
  {
    file: 'ja/about.html',
    forbidden: ['Li Wei', 'Sarah Zhang', '経営・技術チーム', 'チーム紹介', '技術責任者'],
    required: ['案件対応', '技術・製造・営業', '創業者・エンジニア', '製造・品質管理', '加工・組立・各流路の検査を調整'],
  },
  {
    file: 'ru/about.html',
    forbidden: ['Li Wei', 'Sarah Zhang', 'Руководство компании', 'Наша команда', 'главный инженер'],
    required: ['Поддержка проектов', 'Инженерная поддержка, производство и продажи', 'Основатель и инженер', 'Производство и качество', 'Координация обработки, сборки и проверки каждого канала'],
  },
  {
    file: 'de/case-studies.html',
    forbidden: ['Kostenlose 3D-Datei mit jeder Anfrage'],
  },
  {
    file: 'de/privacy.html',
    forbidden: ['Begapunk, Hersteller von Präzisions-Drehdurchführungen'],
    required: ['Ningbo Begapunk Pneumatic Components Co., Ltd.', 'Zuletzt aktualisiert:</strong> 28. August 2026', 'weder für Marketingzwecke noch zur öffentlichen Darstellung'],
  },
  {
    file: 'de/terms.html',
    forbidden: ['Ningbo International Arbitration Court', 'Kauf von Drehdurchführungen bei Begapunk („wir“'],
    required: ['Ningbo Begapunk Pneumatic Components Co., Ltd.', 'Ningbo Arbitration Commission', 'zum Zeitpunkt der Einreichung geltender Schiedsordnung'],
  },
  {
    file: 'ru/case-studies.html',
    forbidden: ['Бесплатный 3D-файл с каждым запросом'],
  },
  {
    file: 'ja/privacy.html',
    forbidden: ['精密ロータリージョイントメーカーBegapunk', 'Yugongの道', 'Zonghanの工業団地', 'アドレス:'],
    required: [
      'Ningbo Begapunk Pneumatic Components Co., Ltd.',
      '最終更新日：</strong>2026年8月28日',
      'マーケティングや一般公開に使用することはありません',
      '住所：88 Yugong Road, Zonghan Industrial Park, Cixi, Ningbo, Zhejiang, 315300, China',
    ],
  },
  {
    file: 'ja/terms.html',
    forbidden: ['Ningbo International Arbitration Court', 'Begapunk（以下「当社」）からのロータリージョイント製品'],
    required: ['Ningbo Begapunk Pneumatic Components Co., Ltd.', 'Ningbo Arbitration Commission（寧波仲裁委員会）', '申立時に有効な同委員会の仲裁規則'],
  },
  {
    file: 'ru/privacy.html',
    forbidden: ['Begapunk, производитель прецизионных вращающихся соединений'],
    required: ['Ningbo Begapunk Pneumatic Components Co., Ltd.', 'Последнее обновление:</strong> 28 августа 2026 г.', 'не публикуем их в открытом доступе'],
  },
  {
    file: 'ru/terms.html',
    forbidden: ['Ningbo International Arbitration Court', 'приобретение ротационных соединений у Begapunk («мы»'],
    required: ['Ningbo Begapunk Pneumatic Components Co., Ltd.', 'Ningbo Arbitration Commission (Арбитражную комиссию Нинбо)', 'действующим на момент подачи заявления'],
  },
  {
    file: 'de/product-comparison.html',
    forbidden: [
      'Gewerkschaften',
      'Pneumatische Kompaktarmaturen',
      'Skalierung, Vibration',
      'Blickrichtung',
      'pneumatischen Begapunk Drehdurchführungen',
      'Automatisierung Rundschalttische',
      'CNC-Pneumatikspannung',
    ],
    required: ['2 Kanäle · 2 Einlässe / 4 Auslässe'],
  },
  {
    file: 'ja/product-comparison.html',
    forbidden: ['>プロフィール<', 'トルクの specs'],
    required: ['2流路・2入口／4出口'],
  },
  {
    file: 'ru/product-comparison.html',
    forbidden: [
      'Пролитый vs.',
      'космическая проблема',
      'зажим + зажим',
      'материалу кузова',
      'пневматические оснастка',
      'крепление фланец',
      'пневматическая маршрутизация',
      'малая станкостроение',
    ],
    required: ['2 канала · 2 входа / 4 выхода'],
  },
  {
    file: 'ja/blog-rotary-joint-selection.html',
    forbidden: ['ザ・ザ・ザ', 'レーザーの髭剃り部', '激光剃须部', '~15 L/min', '~60 L/min', '~150 L/min', '空圧グリッパ：<strong>2流路</strong>', '空圧グリッパ＋真空エジェクタ：<strong>4流路</strong>', '2組の独立したシール系'],
    required: ['複動式空圧グリッパは通常、<strong>2流路</strong>', '必要流路数は、切換弁と真空発生器の配置によって変わります', 'シール要素で分離された2つの独立流路', '"dateModified":"2026-08-26"'],
  },
  {
    file: 'ru/blog-rotary-joint-selection.html',
    forbidden: ['~15 л/мин', '~60 л/мин', '~150 л/мин', 'кислород и охлаждающая жидкость'],
    required: ['"dateModified":"2026-08-26"'],
  },
  {
    file: 'de/blog-rotary-joint-selection.html',
    forbidden: ['~15 L/min', '~60 L/min', '~150 L/min', 'Sauerstoff und Kühlmittel'],
    required: ['"dateModified":"2026-08-26"'],
  },
  {
    file: 'ru/application-steel-dusty-environments.html',
    forbidden: [
      'Отправка суррогатных экологических спецификаций',
      'дизайнеры оборудования',
      'поддержку антивращения и маршрутизацию шланга',
      'об/мин находятся в пределах диапазона',
      'Суровые среды выигрывают',
      'Замена ротационное соединение',
    ],
  },
  {
    file: 'de/application-steel-dusty-environments.html',
    forbidden: ['Auswahl für raue Umgebungen Checkliste', 'Harte Umgebungen profitieren', 'in Reichweite liegen'],
  },
  {
    file: 'de/blog-rotary-joint-selection.html',
    forbidden: ['compact, ausgelegt', 'Der Unterschied liegt normalerweise bei fünf Parametern', 'Nicht übereinstimmende Spezifikationen'],
  },
  {
    file: 'ru/blog-rotary-joint-selection.html',
    forbidden: ['ротационное соединение является', 'Ссылка на продукт Begapunk', 'номинальный 1.0 МПа', 'работу дольше машины'],
  },
  {
    file: 'de/index.html',
    forbidden: ['Zeichnung per E-Mail oder WhatsApp senden'],
    required: ['Modellnummer, Foto, Zeichnung oder Betriebsbedingungen per E-Mail oder WhatsApp senden', 'höchstens 30 Kalendertage'],
  },
  {
    file: 'ja/index.html',
    forbidden: ['メールまたはWhatsAppで図面を送付'],
    required: ['型式、写真、図面、使用条件をメール／WhatsAppで送付', '30暦日以内'],
  },
  {
    file: 'ru/index.html',
    forbidden: ['Отправьте чертёж по электронной почте или WhatsApp', 'Как проходит 100%-ная проверка герметичности'],
    required: ['Отправьте номер модели, фотографию, чертёж или условия эксплуатации по электронной почте или через WhatsApp', 'не более чем за 30 календарных дней', 'Как проверяется каждое готовое изделие'],
  },
  {
    file: 'ru/application-textile-printing-converting.html',
    forbidden: ['текстильные ветрогенераторы', 'ветровые машины'],
  },
  {
    file: 'ru/application-electronics-battery-test-fixtures.html',
    forbidden: ['текстильные ветрогенераторы', 'ветровые машины'],
  },
  {
    file: 'ja/products.html',
    forbidden: ['8インチ8インチ'],
    required: ['8流路'],
  },
  {
    file: 'ja/products-p2.html',
    forbidden: ['トルクの specs'],
  },
  {
    file: 'search-index.json',
    forbidden: [
      'oxygen and coolant, for example',
      'two complete seal assemblies',
      'Pneumatic gripper = 2 channels',
      'Pneumatic gripper + vacuum ejector = 4 channels',
      'Laser cutting head (clamp, unclamp, blow dust)',
      '~15 L/min',
      '~60 L/min',
      '~150 L/min',
      'Control every NG result',
      'NG segregation and disposition',
      'Email or WhatsApp your drawing',
      'Begapunk Precision Rotary Joint Manufacturer',
      'Ningbo International Arbitration Court',
      'Li Wei',
      'Sarah Zhang',
      'Fluent in EN/DE/ES',
    ],
    required: [
      'A double-acting pneumatic gripper typically requires 2 passages',
      'The required passage count depends on where the control valves and vacuum generator are mounted.',
      'Email or WhatsApp a model number, photo, drawing, or operating conditions',
      'Nonconforming-unit segregation and disposition',
      'Ningbo Begapunk Pneumatic Components Co., Ltd.',
      'Ningbo Arbitration Commission',
      'Engineering, Production & Sales',
      'Production & Quality',
      'Inquiry, drawing, quotation, and order coordination',
    ],
  },
  {
    file: 'de/search-index.json',
    forbidden: ['Gewerkschaften', 'Blickrichtung', 'Sauerstoff und Kühlmittel', '~15 L/min', '~60 L/min', '~150 L/min', 'Kostenlose 3D-Datei mit jeder Anfrage', 'Drehdurchführung Dichtungswechsel', 'Carbon Dichtungen', 'optimales Leben', 'Zeichnung per E-Mail oder WhatsApp senden', 'Begapunk, Hersteller von Präzisions-Drehdurchführungen', 'Kauf von Drehdurchführungen bei Begapunk („wir“', 'Ningbo International Arbitration Court', 'Li Wei', 'Sarah Zhang', 'Unternehmensleitung'],
    required: ['Modellnummer, Foto, Zeichnung oder Betriebsbedingungen per E-Mail oder WhatsApp senden', 'Ningbo Begapunk Pneumatic Components Co., Ltd.', 'Ningbo Arbitration Commission', 'Technik, Fertigung & Vertrieb', 'Fertigung & Qualität'],
  },
  {
    file: 'ja/search-index.json',
    forbidden: ['ザ・ザ・ザ', 'レーザーの髭剃り部', '激光剃须部', '~15 L/min', '~60 L/min', '~150 L/min', '8インチ8インチ', '空圧グリッパ：2流路', '空圧グリッパ＋真空エジェクタ：4流路', 'メールまたはWhatsAppで図面を送付', '精密ロータリージョイントメーカーBegapunk', 'Begapunk（以下「当社」）からのロータリージョイント製品', 'Ningbo International Arbitration Court', 'Li Wei', 'Sarah Zhang', '経営・技術チーム', 'チーム紹介'],
    required: ['型式、写真、図面、使用条件をメール／WhatsAppで送付', 'Ningbo Begapunk Pneumatic Components Co., Ltd.', 'Ningbo Arbitration Commission', '技術・製造・営業', '製造・品質管理'],
  },
  {
    file: 'ru/search-index.json',
    forbidden: ['Пролитый vs.', 'космическая проблема', 'кислород и охлаждающая жидкость', '~15 л/мин', '~60 л/мин', '~150 л/мин', 'Отправка суррогатных экологических спецификаций', 'текстильные ветрогенераторы', 'Бесплатный 3D-файл с каждым запросом', 'Замена ротационной совместной уплотнение', 'утечка неисправностей', 'Материалы для ротационное соединение', 'Отправьте чертёж по электронной почте или WhatsApp', 'Begapunk, производитель прецизионных вращающихся соединений', 'приобретение ротационных соединений у Begapunk («мы»', 'Ningbo International Arbitration Court', 'Li Wei', 'Sarah Zhang', 'Руководство компании', 'Наша команда'],
    required: ['Отправьте номер модели, фотографию, чертёж или условия эксплуатации по электронной почте или через WhatsApp', 'Ningbo Begapunk Pneumatic Components Co., Ltd.', 'Ningbo Arbitration Commission', 'Инженерная поддержка, производство и продажи', 'Производство и качество'],
  },
];

const applicationOverviewChecks = [
  {
    file: 'applications.html',
    forbidden: [
      'A machine name alone is not enough. These inputs allow Begapunk to compare a standard model or define a custom configuration.',
      'A machine type, model number, photo, or drawing is enough to start. Share any of the details below that you know, and we can narrow the choice to a catalog model or custom option.',
    ],
    required: ['You can start with a machine type, model number, photo, or drawing. Share any of the details below that you know, and we can narrow the choice to a catalog model or custom option.'],
  },
  {
    file: 'de/applications.html',
    forbidden: ['Die Maschinenbezeichnung allein reicht nicht aus. Mit diesen Angaben kann Begapunk ein Standardmodell prüfen oder eine Sonderausführung festlegen.'],
    required: ['Zum Einstieg genügt bereits eine Angabe: Maschinentyp, Modellnummer, Foto oder Zeichnung. Senden Sie einfach die unten aufgeführten Informationen, die Ihnen bereits vorliegen. Damit können wir ein passendes Katalogmodell oder eine Sonderausführung eingrenzen.'],
  },
  {
    file: 'ja/applications.html',
    forbidden: ['装置名だけでは適切な選定はできません。以下の情報があれば、Begapunkが標準型式との照合または特注仕様の検討を行えます。'],
    required: ['装置名、型式、写真、図面のいずれかがあれば選定を始められます。下記のうち分かる情報だけお送りください。カタログ型式または特注仕様の候補を絞り込みます。'],
  },
  {
    file: 'ru/applications.html',
    forbidden: ['Одного названия машины недостаточно. Эти данные позволяют Begapunk сопоставить стандартную модель с задачей или определить индивидуальную конфигурацию.'],
    required: ['Для начала достаточно указать тип оборудования или прислать номер модели, фотографию либо чертёж. Сообщите любые известные вам данные из списка ниже — мы сузим выбор до подходящей каталожной модели или заказного исполнения.'],
  },
];

checks.push(...applicationOverviewChecks);

const buyerFacingApplicationCopyByLocale = [
  {
    prefix: '',
    visibleForbidden: [
      'Evidence boundary',
      'Verified application facts',
      'Verified installed model',
      'Documented Applications',
      'Engineering confirmation',
      'What the photograph establishes',
      'Photo note:',
    ],
    visibleRequiredByPage: {
      'applications.html': [
        'Process or assist gases need a separate solution. Tell us the gas and operating conditions so we can check materials, cleanliness, and testing.',
        'The photograph shows the application type; the exact model in the image has not been identified.',
      ],
      'application-laser-tube-cutting.html': [
        'BP-3P-0004 and BP-2P-08-0001 are standard starting points for this application. The workshop photographs show the installation type; the exact model in each image has not been identified.',
        'Process and assist gases need a separate solution',
      ],
      'application-cnc-pneumatic-clamping.html': ['Installed product', 'For a similar fixture', 'two independent passages for clamp and release'],
      'application-bottle-filling-capping.html': ['For a similar capping machine', 'Another option for this application', 'The installation shown uses BP-2P-16-0001.'],
    },
  },
  {
    prefix: 'de/',
    visibleForbidden: [
      'Nachweisgrenze',
      'Bestätigte Anwendungsdaten',
      'Bestätigtes Einbaumodell',
      'Dokumentierte Anwendungen',
      'Technische Abstimmung',
      'Was das Foto belegt',
      'Fotohinweis:',
    ],
    visibleRequiredByPage: {
      'applications.html': [
        'Für Prozess- oder Hilfsgase ist eine separate Lösung erforderlich. Nennen Sie Gas und Betriebsbedingungen; wir prüfen Werkstoffe, Sauberkeit und Prüfanforderungen.',
        'Das Foto zeigt den Anwendungstyp; das genaue Modell im Bild wurde nicht bestimmt.',
      ],
      'application-laser-tube-cutting.html': [
        'BP-3P-0004 und BP-2P-08-0001 sind Standardausführungen als Ausgangspunkt. Die Werkstattfotos zeigen den Einbautyp; das genaue Modell auf den einzelnen Bildern wurde nicht bestimmt.',
        'Prozess- und Hilfsgase benötigen eine separate Lösung',
      ],
      'application-cnc-pneumatic-clamping.html': ['Eingebautes Produkt', 'Für eine ähnliche Vorrichtung', 'zwei getrennten Kanälen zum Spannen und Lösen'],
      'application-bottle-filling-capping.html': ['Für eine ähnliche Verschließmaschine', 'Eine weitere Option für diese Anwendung', 'Im gezeigten Einbau wird BP-2P-16-0001 verwendet.'],
    },
  },
  {
    prefix: 'ja/',
    visibleForbidden: [
      '確認できる範囲',
      '確認済みの用途情報',
      '確認済みの搭載型式',
      '記録された用途',
      '選定時の確認事項',
      '写真から確認できる範囲',
      '写真に関する注記',
    ],
    visibleRequiredByPage: {
      'applications.html': [
        'プロセスガスやアシストガスには別仕様が必要です。ガスと使用条件をお知らせいただければ、材質、清浄度、試験内容を確認します。',
        '写真は用途例を示すもので、写っている製品の正確な型式は特定されていません。',
      ],
      'application-laser-tube-cutting.html': [
        'BP-3P-0004およびBP-2P-08-0001は、この用途の標準候補です。現場写真は組込み例を示すもので、写真に写っている製品の正確な型式は特定されていません。',
        'プロセスガス・アシストガスには別仕様が必要です',
      ],
      'application-cnc-pneumatic-clamping.html': ['搭載製品', '同様の治具をご検討の場合', 'BP-2P-130-0001の独立2流路をクランプ／アンクランプに使用しています。'],
      'application-bottle-filling-capping.html': ['同様のキャッピング設備をご検討の場合', 'この用途の別候補', '写真の設備ではBP-2P-16-0001を使用しています。'],
    },
  },
  {
    prefix: 'ru/',
    visibleForbidden: [
      'Границы подтверждения',
      'Подтверждённые факты применения',
      'Подтверждённая модель',
      'Документированные применения',
      'Инженерное согласование',
      'Что подтверждает фотография',
      'Примечание к фотографиям',
    ],
    visibleRequiredByPage: {
      'applications.html': [
        'Для технологических или вспомогательных газов требуется отдельное решение. Сообщите газ и условия работы — мы проверим материалы, чистоту и испытания.',
        'Фотография показывает тип применения; точная модель на снимке не определена.',
      ],
      'application-laser-tube-cutting.html': [
        'BP-3P-0004 и BP-2P-08-0001 — стандартные отправные варианты для этой задачи. Цеховые фотографии показывают тип монтажа; точная модель на каждом снимке не определена.',
        'Для технологических и вспомогательных газов нужно отдельное решение',
      ],
      'application-cnc-pneumatic-clamping.html': ['Установленное изделие', 'Для аналогичного приспособления', 'двумя независимыми каналами для зажима и разжима'],
      'application-bottle-filling-capping.html': ['Для аналогичной укупорочной машины', 'Ещё один вариант для этого применения', 'В показанной установке используется BP-2P-16-0001.'],
    },
  },
];

for (const copy of buyerFacingApplicationCopyByLocale) {
  for (const [pageName, visibleRequired] of Object.entries(copy.visibleRequiredByPage)) {
    checks.push({
      file: `${copy.prefix}${pageName}`,
      visibleForbidden: copy.visibleForbidden,
      visibleRequired,
    });
  }
}

const sharedApplicationCtaFiles = [
  'application-electronics-battery-test-fixtures.html',
  'application-textile-printing-converting.html',
  'application-vacuum-packaging-machines.html',
  'application-welding-positioners.html',
];

const applicationCopyByLocale = [
  {
    prefix: '',
    oldHeader: 'Begapunk Direction',
    newHeader: 'Possible Model or Configuration',
    oldCommon: 'Send the machine layout, media, pressure, passage count, RPM, port size, and mounting space. We will reply with a suitable standard or custom pneumatic rotary joint direction.',
    newCommon: 'Send whatever you already have—a machine layout, photo, drawing, or the operating details you know. We will recommend a suitable catalog model or custom option and tell you if anything else is needed.',
    oldCnc: 'Send your fixture drawing, air circuit, pressure, RPM, and mounting space. We will reply with a standard model or custom interface direction.',
    newCnc: 'Send whatever you already have—a fixture drawing, photo, air-circuit sketch, or the operating details you know. We will recommend a suitable catalog model or custom interface and tell you if anything else is needed.',
  },
  {
    prefix: 'de/',
    oldHeader: 'Begapunk-Empfehlung',
    oldHeaderVariants: ['Empfehlung von Begapunk', 'Mögliches Modell oder Ausführung'],
    newHeader: 'Modell oder Ausführung',
    oldCommon: 'Senden Sie Maschinenlayout, Medium, Druck, Kanalzahl, Drehzahl, Anschlussgröße und Einbauraum. Wir antworten mit einer passenden Standard- oder Sonderlösung für eine pneumatische Drehdurchführung.',
    newCommon: 'Senden Sie einfach, was Ihnen bereits vorliegt – Maschinenlayout, Foto, Zeichnung oder bekannte Betriebsdaten. Wir empfehlen ein passendes Katalogmodell oder eine Sonderausführung und teilen Ihnen mit, falls noch Angaben fehlen.',
    oldCnc: 'Senden Sie Ihre Vorrichtungszeichnung, den Luftkreis, Druck, Drehzahl und Einbauraum. Wir antworten mit einem passenden Standardmodell oder einer Empfehlung für eine kundenspezifische Schnittstelle.',
    newCnc: 'Senden Sie einfach, was Ihnen bereits vorliegt – Vorrichtungszeichnung, Foto, Pneumatikplan oder bekannte Betriebsdaten. Wir empfehlen ein passendes Katalogmodell oder eine kundenspezifische Schnittstelle und teilen Ihnen mit, falls noch Angaben fehlen.',
  },
  {
    prefix: 'ja/',
    oldHeader: 'Begapunkの推奨',
    oldHeaderVariants: ['Begapunkの提案方針', '選定の方向性'],
    newHeader: '候補型式・仕様',
    oldCommon: '機械レイアウト、流体、圧力、流路数、回転数、ポートサイズ、取付スペースをお送りください。適切な標準品または特注の空圧用ロータリージョイントをご提案します。',
    newCommon: '装置レイアウト、写真、図面、分かっている使用条件など、今お持ちの情報をお送りください。適切なカタログ型式または特注仕様をご提案し、追加で必要な情報があればお知らせします。',
    oldCnc: '治具図面、空気回路、圧力、回転数、取付スペースをお送りください。標準型式または特注インターフェースの方向性をご回答します。',
    newCnc: '治具図面、写真、空気回路図、分かっている使用条件など、今お持ちの情報をお送りください。適切なカタログ型式または特注インターフェースをご提案し、追加で必要な情報があればお知らせします。',
  },
  {
    prefix: 'ru/',
    oldHeader: 'Рекомендация Begapunk',
    newHeader: 'Возможная модель или исполнение',
    oldCommon: 'Отправьте компоновку оборудования, рабочую среду, давление, число каналов, частоту вращения, размер портов и доступное монтажное пространство. Мы предложим подходящее стандартное или заказное пневматическое вращающееся соединение.',
    newCommon: 'Отправьте то, что у вас уже есть: компоновку оборудования, фотографию, чертёж или известные условия эксплуатации. Мы предложим подходящую каталожную модель либо заказное исполнение и сообщим, если понадобятся дополнительные данные.',
    oldCnc: 'Отправьте чертёж приспособления, пневматическую схему, давление, частоту вращения и монтажное пространство. Мы предложим стандартную модель или направление для заказного интерфейса.',
    newCnc: 'Отправьте то, что у вас уже есть: чертёж приспособления, фотографию, пневматическую схему или известные условия эксплуатации. Мы предложим подходящую каталожную модель либо исполнение с заказным интерфейсом и сообщим, если понадобятся дополнительные данные.',
  },
];

for (const copy of applicationCopyByLocale) {
  for (const file of sharedApplicationCtaFiles) {
    checks.push({
      file: `${copy.prefix}${file}`,
      forbidden: [copy.oldCommon, copy.oldHeader, ...(copy.oldHeaderVariants ?? [])],
      required: [copy.newCommon, copy.newHeader],
    });
  }

  checks.push({
    file: `${copy.prefix}application-cnc-pneumatic-clamping.html`,
    forbidden: [copy.oldCnc, copy.oldHeader, ...(copy.oldHeaderVariants ?? [])],
    required: [copy.newCnc, copy.newHeader],
  });

  checks.push({
    file: `${copy.prefix}application-steel-dusty-environments.html`,
    forbidden: [copy.oldHeader, ...(copy.oldHeaderVariants ?? [])],
    required: [copy.newHeader],
  });
}

const productPageNames = config.pages.filter((pageName) => /^BP-[\w-]+\.html$/.test(pageName));
const commercialProductCopyByLocale = [
  {
    prefix: '',
    forbidden: [
      'Published specifications for this model are listed below.',
      'CAD availability and revision are confirmed after the model and application requirements are reviewed.',
      'Inspection and order documentation',
      'State required inspection records, material documents, and acceptance criteria before ordering.',
      'Maximum pressure and speed are selection limits; combined continuous operation depends on the medium, temperature, mounting, and duty cycle.',
      'Send the medium, temperature, mounting, duty cycle, and required pressure and speed for an operating-point review.',
    ],
    required: [
      'Key dimensions and operating limits for this model are listed below.',
      'We provide STEP/IGES models for the selected configuration and fit check.',
      'Inspection Documents',
      'Need an inspection record or material document? Include the requirement with your inquiry.',
    ],
  },
  {
    prefix: 'de/',
    forbidden: [
      'Die veröffentlichten technischen Daten dieses Modells sind nachfolgend aufgeführt.',
      'CAD-Verfügbarkeit und Revision werden nach Prüfung von Modell und Anwendungsanforderungen bestätigt.',
      'Prüf- und Auftragsdokumentation',
      'Benötigte Prüfprotokolle, Werkstoffunterlagen und Abnahmekriterien vor der Bestellung angeben.',
      'Maximaldruck und Maximaldrehzahl sind Auswahlgrenzen; der kombinierte Dauerbetrieb hängt von Medium, Temperatur, Montage und Lastprofil ab.',
      'Senden Sie Medium, Temperatur, Montage, Lastprofil sowie den erforderlichen Druck und die Drehzahl für eine Prüfung des Betriebspunkts.',
    ],
    required: [
      'Die wichtigsten Abmessungen und Betriebsgrenzen dieses Modells sind nachfolgend aufgeführt.',
      'Für die ausgewählte Ausführung und Einbauprüfung stellen wir STEP-/IGES-Modelle bereit.',
      'Prüfunterlagen',
      'Benötigen Sie ein Prüfprotokoll oder einen Werkstoffnachweis? Geben Sie die Anforderung in Ihrer Anfrage an.',
    ],
  },
  {
    prefix: 'ja/',
    forbidden: [
      'この型式の公開仕様を以下に示します。',
      '型式と用途条件を確認後、CADデータの提供可否とリビジョンを回答します。',
      '検査・注文書類',
      '必要な検査記録、材質書類、受入基準は発注前に指定してください。',
      '最高圧力と最高回転数は選定上限です。組合せ連続運転は、流体、温度、取付け、デューティによって異なります。',
      '運転点の確認には、流体、温度、取付け、デューティ、必要圧力、回転数をお知らせください。',
    ],
    required: [
      'この型式の主要寸法と使用限界を以下に示します。',
      '選定仕様の組込み確認用にSTEP／IGESモデルを提供します。',
      '検査資料',
      '検査記録や材料資料が必要な場合は、お問い合わせ時に要件をお知らせください。',
    ],
  },
  {
    prefix: 'ru/',
    forbidden: [
      'Опубликованные характеристики этой модели приведены ниже.',
      'Доступность и ревизия CAD подтверждаются после проверки модели и требований применения.',
      'Инспекционная и заказная документация',
      'Укажите требуемые протоколы, документы на материалы и критерии приёмки до заказа.',
      'Максимальные давление и скорость являются пределами выбора; совместная непрерывная работа зависит от среды, температуры, монтажа и рабочего цикла.',
      'Для проверки рабочей точки укажите среду, температуру, монтаж, рабочий цикл, требуемые давление и частоту вращения.',
    ],
    required: [
      'Ниже приведены основные размеры и рабочие пределы этой модели.',
      'Для выбранного исполнения и проверки компоновки мы предоставляем модели STEP/IGES.',
      'Документы контроля',
      'Если вам нужен протокол контроля или документ на материал, укажите это в запросе.',
    ],
  },
];

for (const copy of commercialProductCopyByLocale) {
  for (const pageName of productPageNames) {
    checks.push({ file: `${copy.prefix}${pageName}`, forbidden: copy.forbidden, required: copy.required });
  }
}

const caseCopyByLocale = [
  {
    prefix: '',
    centerForbidden: ['Review documented rotary-union installations', 'real applications supported by workshop photographs', 'Two customer-authorized workshop photographs document'],
    centerRequired: ['See installed rotary-union applications', 'The three entries above show installed applications.', 'BP-2P-95-0005 supplies compressed air from the stationary side to the rotating chuck in this installation.'],
    detailForbidden: ['Photo note:', 'What the photograph establishes', 'metadata-stripped', 'The project owner confirmed the model', 'Project-owner confirmation'],
    bpRequired: ['Stationary-to-rotating compressed-air connection at the chuck'],
    smartRequired: ['Clamping, unclamping and blow-off in this installation', 'The external sensors and machine controller perform the actual detection'],
    llmsRequired: ['Three installed rotary-union applications and two selection examples', 'BP-2P-95-0005 supplies compressed air from the stationary side to the rotating chuck', 'three pneumatic passages for clamp, unclamp, and blow-off functions'],
  },
  {
    prefix: 'de/',
    centerForbidden: ['Dokumentierte Einbauten von Drehdurchführungen', 'reale Anwendungen, die durch Werkstattfotos belegt sind', 'Zwei mit Genehmigung des Kunden veröffentlichte Werkstattaufnahmen dokumentieren'],
    centerRequired: ['Sehen Sie Einbauanwendungen von Drehdurchführungen', 'Die drei Einträge oben zeigen installierte Anwendungen.', 'BP-2P-95-0005 führt in diesem Einbau Druckluft von der feststehenden Seite zum rotierenden Spannfutter.'],
    detailForbidden: ['Fotohinweis:', 'Was das Foto belegt', 'Bestätigter Umfang', 'Der Projektverantwortliche bestätigte'],
    bpRequired: ['Druckluftübertragung von der stationären auf die rotierende Seite des Spannfutters'],
    smartRequired: ['Spannen, Lösen und Ausblasen in diesem Einbau', 'Die eigentliche Erkennung erfolgt durch externe Sensoren und die Maschinensteuerung'],
    llmsRequired: ['Drei fotodokumentierte Einbaufälle und zwei Auslegungsbeispiele', 'BP-2P-95-0005 führt Druckluft von der feststehenden Seite zum rotierenden pneumatischen Spannfutter', 'Druckluftübertragung über drei getrennte Kanäle'],
  },
  {
    prefix: 'ja/',
    centerForbidden: ['工場内写真に基づく実際の用途事例', 'お客様の許可を得た2点の工場内組立写真'],
    centerRequired: ['ロータリジョイントの組込み用途', '上の3項目は実機への組込み用途です。', 'BP-2P-95-0005が固定側から回転チャックへ圧縮空気を供給します。'],
    detailForbidden: ['写真に関する注記', '写真から確認できる範囲', '撮影メタデータ', '案件責任者が型式'],
    bpRequired: ['チャック部での固定側から回転側への圧縮空気の供給'],
    smartRequired: ['この組込みではクランプ、アンクランプ、除塵用エアブロー', '検出を行うのは外部センサと機械制御装置'],
    llmsRequired: ['写真で確認できる3件の組込み事例と2件の技術選定例', 'BP-2P-95-0005は、固定側から回転するエアチャックへ圧縮空気を供給します', '独立した3系統の空圧流路を介して圧縮空気を供給'],
  },
  {
    prefix: 'ru/',
    centerForbidden: ['подтверждённые цеховыми фотографиями', 'Две цеховые фотографии, опубликованные с разрешения заказчика, документируют'],
    centerRequired: ['Примеры установки ротационных соединений', 'Три записи выше показывают установленные применения.', 'BP-2P-95-0005 передаёт сжатый воздух с неподвижной стороны на вращающийся патрон.'],
    detailForbidden: ['Примечание к фотографиям', 'Что подтверждает фотография', 'без метаданных', 'Владелец проекта подтвердил модель'],
    bpRequired: ['Подача сжатого воздуха от неподвижной к вращающейся стороне патрона'],
    smartRequired: ['Зажим, разжим и обдув в этой установке', 'Наличие заготовки и состояние зажима определяются внешними датчиками'],
    llmsRequired: ['Три фотоподтверждённых примера установки и два инженерных примера подбора', 'BP-2P-95-0005 передаёт сжатый воздух от неподвижной стороны к вращающемуся пневматическому патрону', 'три независимых пневмоканала и передача сигналов внешних датчиков'],
  },
];

for (const copy of caseCopyByLocale) {
  checks.push({ file: `${copy.prefix}case-studies.html`, forbidden: copy.centerForbidden, required: copy.centerRequired });
  checks.push({ file: `${copy.prefix}case-bp-2p-95-pneumatic-chuck-integration.html`, forbidden: copy.detailForbidden, required: copy.bpRequired });
  checks.push({ file: `${copy.prefix}case-bp-3p-s06-sensor-monitored-chuck.html`, forbidden: copy.detailForbidden, required: copy.smartRequired });
  checks.push({
    file: `${copy.prefix}llms.txt`,
    forbidden: copy.detailForbidden,
    required: copy.llmsRequired,
  });
}

const recurringLeakCardFiles = [
  'de/BP-1P-0006.html',
  'de/BP-2P-0001.html',
  'de/BP-2P-0002.html',
  'de/BP-2P-08-0001.html',
  'ja/BP-1P-0006.html',
  'ja/BP-2P-0001.html',
  'ja/BP-2P-0002.html',
  'ja/BP-2P-08-0001.html',
];

for (const file of recurringLeakCardFiles) {
  checks.push({
    file,
    forbidden: file.startsWith('de/')
      ? ['Überspannung und thermischer Zyklus']
      : ['監督および熱循環'],
  });
}

for (const check of checks) {
  let source;
  try {
    source = await fs.readFile(path.join(root, ...check.file.split('/')), 'utf8');
  } catch (error) {
    failures.push(`${check.file}: cannot be read (${error.message})`);
    continue;
  }

  for (const phrase of check.forbidden ?? []) {
    if (source.includes(phrase)) failures.push(`${check.file}: forbidden legacy wording remains: ${phrase}`);
  }
  for (const phrase of check.required ?? []) {
    if (!source.includes(phrase)) failures.push(`${check.file}: required corrected wording is missing: ${phrase}`);
  }
  if (check.visibleForbidden?.length || check.visibleRequired?.length) {
    const $ = load(source, { decodeEntities: false });
    const visibleBody = $('body').clone();
    visibleBody.find('script, style, noscript, template').remove();
    const visibleText = visibleBody.text().replace(/\s+/g, ' ').trim();
    const foldedVisibleText = visibleText.toLocaleLowerCase();
    for (const phrase of check.visibleForbidden ?? []) {
      if (foldedVisibleText.includes(phrase.toLocaleLowerCase())) {
        failures.push(`${check.file}: visible legacy audit wording remains: ${phrase}`);
      }
    }
    for (const phrase of check.visibleRequired ?? []) {
      if (!visibleText.includes(phrase)) failures.push(`${check.file}: required buyer-facing wording is missing: ${phrase}`);
    }
  }
}

if (failures.length) {
  console.error(`Copy regression verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Copy regression verification passed: ${checks.length} targeted page checks.`);
