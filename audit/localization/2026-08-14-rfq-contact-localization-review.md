# RFQ Contact Localization Review — 2026-08-14

## Scope and status

- Review date: 2026-08-14
- Pages: `contact.html`, `de/contact.html`, `ja/contact.html`, and `ru/contact.html`
- Server response scope: the localized JSON messages and native HTML response text in `send_inquiry.php`
- reviewedByRole: Codex AI-assisted localization reviewer (not an independent native-speaker reviewer)
- Review type: AI-assisted target-market industrial-language review using existing Begapunk terminology and public manufacturer/contact-form language as references
- Status: reviewed for this Phase 1A change only; **this AI review is not a native-speaker human sign-off**
- Included: only the changed RFQ/contact strings in `contact.html`, `de/contact.html`, `ja/contact.html`, and `ru/contact.html`, plus the localized JSON and native-HTML response text in `send_inquiry.php`
- Excluded: all unchanged content on those pages, all other site pages, product facts, engineering claims, SEO copy, SMTP delivery, and production form submission
- Search-intent review: **not applicable** to transactional validation, sending, success, and error messages; no search keywords were invented or added

## Stable-code separation

The following values remain language-neutral machine codes and are not translated:

`quote`, `3d_step`, `application_review`, `seal_review`, `verified_drawing`, `technical_consultation`, `general_inquiry`

User-visible labels and prompts are selected from the current page language. `verified_drawing` is retained only as the compatibility code; visible wording asks for drawing verification and does not state that a drawing is already approved or available.

## Reviewed strings

### Request labels

| Code | EN | DE | JA | RU |
|---|---|---|---|---|
| `quote` | Quotation request | Angebotsanfrage | 見積依頼 | Запрос коммерческого предложения |
| `3d_step` | 3D STEP file request | Anfrage nach einer 3D-STEP-Datei | 3D STEPデータ依頼 | Запрос 3D-файла STEP |
| `application_review` | Application review | Anwendungsprüfung | 用途・仕様確認 | Проверка применения и условий эксплуатации |
| `seal_review` | Seal selection review | Prüfung der Dichtungsauswahl | シール選定確認 | Проверка выбора уплотнения |
| `verified_drawing` | Drawing verification request | Anfrage zur Zeichnungsprüfung | 図面確認依頼 | Запрос на проверку чертежа |
| `technical_consultation` | Technical consultation | Technische Beratung | 技術相談 | Техническая консультация |
| `general_inquiry` | General inquiry | Allgemeine Anfrage | その他のお問い合わせ | Общий запрос |

### Requirements request prompts

| Code | EN | DE | JA | RU |
|---|---|---|---|---|
| `quote` | Please review the operating conditions and advise what information is needed to prepare a quotation and assess availability. | Bitte geben Sie Stückzahl, Bestimmungsort, Betriebsbedingungen, benötigte Dokumentation und gewünschte Lieferbedingungen an. | 必要数量、納入先、使用条件、必要書類、ご希望の納入条件をご記入ください。 | Укажите требуемое количество, место назначения, условия эксплуатации, необходимую документацию и желаемые условия поставки. |
| `3d_step` | Please advise whether a 3D STEP file is available for engineering review. | Bitte beschreiben Sie die vorgesehene Anwendung und Einbauschnittstelle, damit geprüft werden kann, ob eine aktuelle STEP-Datei verfügbar ist. | STEPデータの有無を確認するため、使用用途と取付インターフェースをご記入ください。 | Опишите предполагаемое применение и монтажный интерфейс, чтобы мы могли проверить наличие актуального STEP-файла. |
| `application_review` | Please review this application and advise which information is still needed to confirm a suitable configuration. | Bitte geben Sie Medium, Druck, Drehzahl, Temperatur, Kanalzahl, verfügbaren Einbauraum und Betriebszyklus für die technische Prüfung an. | 使用流体、圧力、回転速度、温度、流路数、取付スペース、運転条件をご記入ください。 | Укажите рабочую среду, давление, частоту вращения, температуру, число каналов, доступное монтажное пространство и режим работы. |
| `seal_review` | Please review the sealing requirements and advise which operating-condition details are still needed. | Bitte geben Sie Medium und chemische Zusammensetzung, Temperatur, Druck, Drehzahl, Verschmutzungs- bzw. Filtrationsbedingungen und Betriebszyklus an. | 使用流体と成分、温度、圧力、回転速度、異物・ろ過条件、運転条件をご記入ください。 | Укажите рабочую среду и её химический состав, температуру, давление, частоту вращения, условия загрязнения или фильтрации и режим работы. |
| `verified_drawing` | Please provide the model and order or project reference, and identify the interface or dimensions that need to be checked. | Bitte geben Sie Modell sowie Auftrags- oder Projektreferenz an und kennzeichnen Sie die zu prüfende Schnittstelle bzw. Abmessungen. | 型式、注文番号または案件番号をご記入のうえ、確認が必要なインターフェースまたは寸法を明記してください。 | Укажите модель, номер заказа или проекта, а также интерфейс или размеры, которые необходимо проверить. |
| `technical_consultation` | Please review the technical requirements and advise the next engineering step. | Bitte beschreiben Sie die technische Frage und ergänzen Sie gegebenenfalls Betriebsdaten, Modell, Zeichnung oder Foto. | 技術的なご質問と関連する使用条件・型式をご記入のうえ、必要に応じて図面または写真を添付してください。 | Опишите технический вопрос, укажите относящиеся к нему условия эксплуатации и модель; при необходимости приложите чертёж или фотографию. |
| `general_inquiry` | Please review the requirements and advise the appropriate next step. | Bitte beschreiben Sie Ihr Anliegen und ergänzen Sie relevante Angaben zu Modell, Anwendung und Betriebsbedingungen sowie gegebenenfalls eine Zeichnung oder ein Foto. | ご相談内容と関連する型式・用途・使用条件をご記入のうえ、必要に応じて図面または写真を添付してください。 | Опишите, что вам требуется, и укажите модель, область применения и условия эксплуатации; при необходимости приложите чертёж или фотографию. |

### Dynamic field and transaction language

| Purpose | EN | DE | JA | RU |
|---|---|---|---|---|
| Request type | Request type | Anfrageart | お問い合わせ種別 | Тип запроса |
| Technical requirements | Technical Requirements | Technische Anforderungen | 技術条件 | Технические требования |
| Required-field pattern | `{field} is required. Please fill it in.` | `Bitte füllen Sie das Feld „{field}“ aus.` | `「{field}」を入力してください。` | `Заполните поле «{field}».` |
| Sending | Sending... | Anfrage wird gesendet… | 送信中… | Отправка запроса… |
| Success | Your inquiry was sent successfully. Our engineering team will review the information provided. | Ihre Anfrage wurde gesendet. Unser Technikteam prüft die übermittelten Angaben. | お問い合わせを送信しました。技術担当がご入力内容を確認します。 | Запрос отправлен. Наши технические специалисты рассмотрят предоставленные данные. |
| No file | No file selected | Keine Datei ausgewählt | ファイルが選択されていません | Файл не выбран |
| Invalid email | Please enter a valid email address (for example, john@company.com). | Bitte geben Sie eine gültige E-Mail-Adresse ein, z. B. name@firma.de. | 有効なメールアドレスを入力してください（例：name@company.com）。 | Введите корректный адрес электронной почты, например name@company.com. |
| Unsupported file | Invalid file type: `.{ext}`. Allowed: PDF, STEP, IGES, DWG, DXF, JPG, PNG. | Dieser Dateityp wird nicht unterstützt: `.{ext}`. Zulässig sind: PDF, STEP, STP, IGES, IGS, DWG, DXF, JPG, JPEG, PNG. | このファイル形式には対応していません：`.{ext}`。対応形式：PDF、STEP、STP、IGES、IGS、DWG、DXF、JPG、JPEG、PNG。 | Формат `.{ext}` не поддерживается. Допустимые форматы: PDF, STEP, STP, IGES, IGS, DWG, DXF, JPG, JPEG, PNG. |
| Over 10 MB | File too large (`{size}` MB). Maximum allowed: 10 MB. | Die Datei ist zu groß (`{size}` MB). Maximal zulässig sind 10 MB. | ファイルサイズが上限を超えています（`{size}` MB）。最大10 MBです。 | Файл слишком большой (`{size}` МБ). Максимальный размер — 10 МБ. |
| Temporary service failure | The inquiry service is temporarily unavailable. Please email sales@begapunk.com. | Der Anfragedienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut oder schreiben Sie an sales@begapunk.com. | 現在、お問い合わせサービスをご利用いただけません。時間をおいてからもう一度お試しいただくか、sales@begapunk.com までメールでご連絡ください。 | Сервис обработки запросов временно недоступен. Повторите попытку позже или напишите на sales@begapunk.com. |
| Ambiguous response | We could not confirm whether your inquiry was sent. Please contact sales@begapunk.com before submitting it again. | Wir konnten nicht bestätigen, ob Ihre Anfrage gesendet wurde. Bitte wenden Sie sich an sales@begapunk.com, bevor Sie sie erneut senden. | お問い合わせが送信されたか確認できませんでした。再送信する前に、sales@begapunk.com までご連絡ください。 | Не удалось подтвердить, был ли запрос отправлен. Перед повторной отправкой свяжитесь с нами по адресу sales@begapunk.com. |
| Network failure | The inquiry could not be sent. Please try again or email sales@begapunk.com. | Ein Netzwerkfehler ist aufgetreten. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut oder schreiben Sie an sales@begapunk.com. | ネットワークエラーが発生しました。接続をご確認のうえ再度お試しいただくか、sales@begapunk.com までメールでご連絡ください。 | Произошла ошибка сети. Проверьте подключение и повторите попытку или напишите на sales@begapunk.com. |

The four page dictionaries also contain localized field-name mappings, email-domain suggestions, and the 3D STEP submit-button label. The exact implementation keys reviewed were `requestLabels.*`, `requestTemplates.*`, `contextLabels.*`, `requiredFields.*`, `required`, `invalidEmail`, `emailSuggestion`, `invalidFileType`, `fileTooLarge`, `noFile`, `sending`, `success`, `serviceUnavailable`, `invalidResponse`, `networkFailure`, and `stepButton`.

For `send_inquiry.php`, every EN/DE/JA/RU value under these keys was reviewed: `sent`, `invalid_method`, `origin_not_allowed`, `rate_limited`, `spam_detected`, `field_too_long`, `required_fields`, `invalid_contact`, `attachment_upload`, `attachment_size`, `attachment_type`, `attachment_mismatch`, `attachment_dwg`, `attachment_cad`, `attachment_service_unavailable`, `service_unavailable`, `mail_failed`, `error_title`, `return_form`, and `email_sales`. These strings are used for both JSON responses and the fixed native HTML response path; no submitted content is included in them.

### Requirements prefill structure

Each language uses its own request label, field labels, and natural request prompt. Only non-empty context is included; a visitor's existing Requirements text is not overwritten.

- EN: `Request type`, `Product model`, `Product / reference`, `Application / machine`, `Source page`
- DE: `Anfrageart`, `Modell`, `Produkt`, `Anwendung / Maschine`, `Referenzseite`
- JA: `お問い合わせ種別`, `製品型式`, `製品`, `用途・機械`, `参照ページ`
- RU: `Тип запроса`, `Модель изделия`, `Изделие`, `Применение / оборудование`, `Исходная страница`

The DE, JA, and RU application-review prompts request operating medium, pressure, speed, temperature, passage count, mounting space, and duty or operating conditions. The EN prompt asks which additional information is needed to confirm a suitable configuration. All are information requests, not suitability or approval claims.

## Terminology decisions

- DE uses `Anfrage`, `Anwendungsprüfung`, `Betriebsbedingungen`, and `Technische Anforderungen`; consumer-style `Nachricht` was not used for the RFQ workflow.
- JA uses `お問い合わせ`, `用途・仕様確認`, `シール選定確認`, `型式`, and polite `〜してください` validation language.
- RU uses `Тип запроса`, `Технические требования`, `условия эксплуатации`, and `Отправить запрос` terminology appropriate to an industrial inquiry.
- STEP, model, application, seal, drawing, pressure, speed, temperature, and mounting-interface terminology was checked against the wording already used in the relevant Begapunk pages before external references were consulted.
- Success text confirms receipt for review only. It does not promise response time, price, delivery, suitability, an available STEP file, or an approved drawing.

## Public language references

All pages below were accessed on 2026-08-14 for terminology and form-information hierarchy only. No form was filled or submitted, and no product facts, claims, parameters, or complete passages were copied.

- EN — Deublin, custom rotary-union inquiry: <https://www.deublin.com/en/products/rotary-unions/custom-rotary-union-solutions>
- DE — Deublin, Drehdurchführung anfragen: <https://www.deublin.eu/drehdurchfuehrung-anfragen>
- JA — SMC Japan, technical inquiry: <https://www.smcworld.com/support/contact/ja/contact.do>
- RU — ОВЕН, industrial contact form: <https://owen.ru/contact_form>

## Review method

1. Compared the new dynamic strings with the existing static labels on each Begapunk Contact page and with terminology already present on the corresponding product/application pages.
2. Checked the separation between stable machine codes and localized visible labels.
3. Reviewed request prompts, validation text, file feedback, sending/success/failure states, and native PHP response text for clarity and industrial context.
4. Used the four public pages above only as market-language references.
5. Checked that wording does not introduce product approval, availability, performance, delivery, or response-time claims.

## Unresolved items

- Independent native-speaker industrial sales/engineering review for DE, JA, and RU has not been completed.
- No production POST, SMTP authentication, mailbox receipt, attachment delivery, CRM capture, or conversion tracking was tested.
- Local static browser checks cannot execute PHP; server response language remains contract-tested statically unless a separately authorized PHP/HTTP test is performed.
- This record does not add, remove, or reclassify any page in `i18n/editorial/status.json` and does not change release approval.
