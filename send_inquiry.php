<?php
declare(strict_types=1);

// Never expose PHP warnings, stack traces, or server paths in a public JSON API.
ini_set('display_errors', '0');
ini_set('html_errors', '0');
error_reporting(E_ALL);

use PHPMailer\PHPMailer\PHPMailer;

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: strict-origin-when-cross-origin');

function normalize_source_language($value): string
{
    $language = is_string($value) ? strtolower(trim($value)) : '';
    return in_array($language, ['en', 'de', 'ja', 'ru'], true) ? $language : 'en';
}

function request_wants_json(): bool
{
    $accept = isset($_SERVER['HTTP_ACCEPT']) && is_string($_SERVER['HTTP_ACCEPT'])
        ? $_SERVER['HTTP_ACCEPT']
        : '';
    foreach (explode(',', $accept) as $mediaRange) {
        $parts = array_map('trim', explode(';', $mediaRange));
        $mediaType = strtolower((string) array_shift($parts));
        if ($mediaType !== 'application/json') {
            continue;
        }

        $quality = 1.0;
        foreach ($parts as $parameter) {
            if (preg_match('/^q\s*=\s*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i', $parameter, $matches) === 1) {
                $quality = (float) $matches[1];
                break;
            }
        }
        if ($quality > 0.0) {
            return true;
        }
    }
    return false;
}

function localized_message(string $language, string $key): string
{
    $messages = [
        'en' => [
            'sent' => 'Thank you. We have received your request. Our engineers will review it and normally reply within one business day. If anything else is needed, we will ask only for the specific detail required.',
            'invalid_method' => 'This submission method is not supported.',
            'origin_not_allowed' => 'The inquiry cannot be accepted from this page.',
            'rate_limited' => 'Too many requests have been sent. Please try again later.',
            'spam_detected' => 'The inquiry could not be accepted.',
            'field_too_long' => 'One or more fields exceed the allowed length.',
            'required_fields' => 'Please complete all required fields.',
            'invalid_contact' => 'Please check the name and email address.',
            'attachment_upload' => 'The attachment could not be uploaded. Check the 10 MB limit and try again.',
            'attachment_size' => 'The attachment is invalid or exceeds the 10 MB size limit.',
            'attachment_type' => 'This file type is not supported. Allowed: PDF, STEP, STP, IGES, IGS, DWG, DXF, JPG, JPEG, PNG.',
            'attachment_mismatch' => 'The attachment content does not match its file extension.',
            'attachment_dwg' => 'The DWG attachment does not appear to be valid.',
            'attachment_cad' => 'The CAD attachment does not appear to be a valid supported file.',
            'attachment_service_unavailable' => 'File uploads are temporarily unavailable. Please email the drawing directly to sales@begapunk.com.',
            'service_unavailable' => 'The inquiry service is temporarily unavailable. Please email sales@begapunk.com.',
            'mail_failed' => 'The inquiry could not be sent. Please try again or email sales@begapunk.com.',
            'error_title' => 'Inquiry not sent',
            'return_form' => 'Return to the inquiry form',
            'email_sales' => 'Email sales@begapunk.com',
        ],
        'de' => [
            'sent' => 'Vielen Dank. Wir haben Ihre Anfrage erhalten. Unsere Ingenieure prüfen sie und antworten in der Regel innerhalb eines Arbeitstags. Sollte noch etwas fehlen, fragen wir nur gezielt nach der benötigten Angabe.',
            'invalid_method' => 'Diese Übermittlungsmethode wird nicht unterstützt.',
            'origin_not_allowed' => 'Die Anfrage kann von dieser Seite nicht angenommen werden.',
            'rate_limited' => 'Es wurden zu viele Anfragen gesendet. Bitte versuchen Sie es später erneut.',
            'spam_detected' => 'Die Anfrage konnte nicht angenommen werden.',
            'field_too_long' => 'Mindestens ein Feld überschreitet die zulässige Länge.',
            'required_fields' => 'Bitte füllen Sie alle Pflichtfelder aus.',
            'invalid_contact' => 'Bitte prüfen Sie Name und E-Mail-Adresse.',
            'attachment_upload' => 'Der Anhang konnte nicht hochgeladen werden. Prüfen Sie die maximale Dateigröße von 10 MB und versuchen Sie es erneut.',
            'attachment_size' => 'Der Anhang ist ungültig oder überschreitet die maximale Dateigröße von 10 MB.',
            'attachment_type' => 'Dieser Dateityp wird nicht unterstützt. Zulässig sind PDF, STEP, STP, IGES, IGS, DWG, DXF, JPG, JPEG und PNG.',
            'attachment_mismatch' => 'Der Inhalt des Anhangs stimmt nicht mit der Dateiendung überein.',
            'attachment_dwg' => 'Die DWG-Datei konnte nicht als gültige DWG-Datei erkannt werden.',
            'attachment_cad' => 'Die CAD-Datei konnte nicht als unterstützte gültige Datei erkannt werden.',
            'attachment_service_unavailable' => 'Dateiuploads sind vorübergehend nicht verfügbar. Bitte senden Sie die Zeichnung per E-Mail an sales@begapunk.com.',
            'service_unavailable' => 'Der Anfragedienst ist vorübergehend nicht verfügbar. Bitte schreiben Sie an sales@begapunk.com.',
            'mail_failed' => 'Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie an sales@begapunk.com.',
            'error_title' => 'Anfrage nicht gesendet',
            'return_form' => 'Zurück zum Anfrageformular',
            'email_sales' => 'E-Mail an sales@begapunk.com',
        ],
        'ja' => [
            'sent' => 'ありがとうございます。お問い合わせを受け付けました。当社の技術担当者が内容を確認し、通常1営業日以内にご返信します。追加情報が必要な場合も、必要な点だけを具体的にお伺いします。',
            'invalid_method' => 'この送信方法には対応していません。',
            'origin_not_allowed' => 'このページからのお問い合わせは受け付けられません。',
            'rate_limited' => '短時間に多くの送信が行われました。時間をおいてからもう一度お試しください。',
            'spam_detected' => 'お問い合わせを受け付けられませんでした。',
            'field_too_long' => '入力文字数が上限を超えている項目があります。',
            'required_fields' => '必須項目をすべて入力してください。',
            'invalid_contact' => 'お名前とメールアドレスをご確認ください。',
            'attachment_upload' => '添付ファイルをアップロードできませんでした。10 MBの上限をご確認のうえ、もう一度お試しください。',
            'attachment_size' => '添付ファイルを確認できないか、ファイルサイズが10 MBの上限を超えています。',
            'attachment_type' => 'このファイル形式には対応していません。対応形式：PDF、STEP、STP、IGES、IGS、DWG、DXF、JPG、JPEG、PNG。',
            'attachment_mismatch' => '添付ファイルの内容と拡張子が一致していません。',
            'attachment_dwg' => '有効なDWGファイルであることを確認できませんでした。',
            'attachment_cad' => '対応形式の有効なCADファイルであることを確認できませんでした。',
            'attachment_service_unavailable' => '現在、ファイルをアップロードできません。図面は sales@begapunk.com までメールでお送りください。',
            'service_unavailable' => '現在、お問い合わせサービスをご利用いただけません。sales@begapunk.com までメールでご連絡ください。',
            'mail_failed' => 'お問い合わせを送信できませんでした。もう一度お試しいただくか、sales@begapunk.com までメールでご連絡ください。',
            'error_title' => 'お問い合わせを送信できませんでした',
            'return_form' => 'お問い合わせフォームに戻る',
            'email_sales' => 'sales@begapunk.com にメールする',
        ],
        'ru' => [
            'sent' => 'Спасибо. Мы получили ваш запрос. Наши инженеры рассмотрят его и обычно ответят в течение одного рабочего дня. Если потребуется дополнительная информация, мы уточним только конкретно необходимые данные.',
            'invalid_method' => 'Этот способ отправки не поддерживается.',
            'origin_not_allowed' => 'Запрос с этой страницы не может быть принят.',
            'rate_limited' => 'Отправлено слишком много запросов. Повторите попытку позже.',
            'spam_detected' => 'Запрос не может быть принят.',
            'field_too_long' => 'Одно или несколько полей превышают допустимую длину.',
            'required_fields' => 'Заполните все обязательные поля.',
            'invalid_contact' => 'Проверьте имя и адрес электронной почты.',
            'attachment_upload' => 'Не удалось загрузить вложение. Проверьте ограничение 10 МБ и повторите попытку.',
            'attachment_size' => 'Недопустимое вложение или превышен максимальный размер 10 МБ.',
            'attachment_type' => 'Этот формат файла не поддерживается. Допустимые форматы: PDF, STEP, STP, IGES, IGS, DWG, DXF, JPG, JPEG, PNG.',
            'attachment_mismatch' => 'Содержимое вложения не соответствует расширению файла.',
            'attachment_dwg' => 'Не удалось подтвердить, что вложение является допустимым файлом DWG.',
            'attachment_cad' => 'Не удалось подтвердить, что вложение является допустимым поддерживаемым файлом CAD.',
            'attachment_service_unavailable' => 'Загрузка файлов временно недоступна. Отправьте чертёж по адресу sales@begapunk.com.',
            'service_unavailable' => 'Сервис обработки запросов временно недоступен. Напишите на sales@begapunk.com.',
            'mail_failed' => 'Не удалось отправить запрос. Повторите попытку или напишите на sales@begapunk.com.',
            'error_title' => 'Запрос не отправлен',
            'return_form' => 'Вернуться к форме запроса',
            'email_sales' => 'Написать на sales@begapunk.com',
        ],
    ];

    return $messages[$language][$key] ?? $messages['en'][$key] ?? $messages['en']['service_unavailable'];
}

function contact_path(string $language): string
{
    $paths = [
        'en' => '/contact.html#quoteForm',
        'de' => '/de/contact.html#quoteForm',
        'ja' => '/ja/contact.html#quoteForm',
        'ru' => '/ru/contact.html#quoteForm',
    ];
    return $paths[$language] ?? $paths['en'];
}

function thank_you_path(string $language): string
{
    $paths = [
        'en' => '/thank-you.html',
        'de' => '/de/thank-you.html',
        'ja' => '/ja/thank-you.html',
        'ru' => '/ru/thank-you.html',
    ];
    return $paths[$language] ?? $paths['en'];
}

function respond(array $context, int $status, bool $success, string $code, ?string $messageKey = null): void
{
    $language = $context['language'];
    $message = localized_message($language, $messageKey ?? $code);
    header('Vary: Accept');
    header('Content-Language: ' . $language);

    if ($context['json']) {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(
            ['success' => $success, 'code' => $code, 'message' => $message],
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        );
        exit;
    }

    if ($success && $code === 'sent') {
        header('Location: ' . thank_you_path($language), true, 303);
        exit;
    }

    http_response_code($status);
    header('Content-Type: text/html; charset=UTF-8');
    header("Content-Security-Policy: default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    $title = localized_message($language, 'error_title');
    $returnLabel = localized_message($language, 'return_form');
    $emailLabel = localized_message($language, 'email_sales');
    echo '<!doctype html><html lang="' . escape_html($language) . '"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'
        . '<title>' . escape_html($title) . ' | Begapunk</title></head><body><main><h1>' . escape_html($title) . '</h1>'
        . '<p>' . escape_html($message) . '</p><p><a href="' . escape_html(contact_path($language)) . '">'
        . escape_html($returnLabel) . '</a></p><p><a href="mailto:sales@begapunk.com">'
        . escape_html($emailLabel) . '</a></p></main></body></html>';
    exit;
}

function post_value(string $key, int $maxLength, array $context): string
{
    $value = isset($_POST[$key]) && is_string($_POST[$key]) ? trim($_POST[$key]) : '';
    $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
    if ($length > $maxLength) {
        respond($context, 422, false, 'field_too_long');
    }
    return $value;
}

function escape_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function load_env_file(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (!preg_match('/^[A-Z_][A-Z0-9_]*$/i', $key)) {
            continue;
        }
        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = $value[strlen($value) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
        }

        if (env_value($key) === false) {
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

function env_value(string $key)
{
    if (array_key_exists($key, $_ENV)) {
        return $_ENV[$key];
    }
    if (array_key_exists($key, $_SERVER)) {
        return $_SERVER[$key];
    }
    if (function_exists('getenv')) {
        return getenv($key);
    }
    return false;
}

function enforce_same_origin(array $context): void
{
    $allowedHosts = ['begapunk.com', 'www.begapunk.com'];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return;
    }

    $host = strtolower((string) parse_url($origin, PHP_URL_HOST));
    $scheme = strtolower((string) parse_url($origin, PHP_URL_SCHEME));
    if ($scheme !== 'https' || !in_array($host, $allowedHosts, true)) {
        respond($context, 403, false, 'origin_not_allowed');
    }
}

function enforce_rate_limit(array $context): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = hash('sha256', $ip);
    $path = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'begapunk-rfq-' . $key . '.json';
    $handle = @fopen($path, 'c+');
    if ($handle === false) {
        return;
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            return;
        }

        $raw = stream_get_contents($handle);
        $attempts = $raw ? json_decode($raw, true) : [];
        if (!is_array($attempts)) {
            $attempts = [];
        }

        $now = time();
        $windowStart = $now - 15 * 60;
        $attempts = array_values(array_filter($attempts, static fn($time): bool => is_int($time) && $time >= $windowStart));
        if (count($attempts) >= 5) {
            flock($handle, LOCK_UN);
            header('Retry-After: 900');
            respond($context, 429, false, 'rate_limited');
        }

        $attempts[] = $now;
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($attempts));
        fflush($handle);
        flock($handle, LOCK_UN);
    } finally {
        fclose($handle);
    }
}

function validate_attachment(array $file, array $context): array
{
    $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($error === UPLOAD_ERR_NO_FILE) {
        return [];
    }
    if (in_array($error, [UPLOAD_ERR_NO_TMP_DIR, UPLOAD_ERR_CANT_WRITE, UPLOAD_ERR_EXTENSION], true)) {
        respond($context, 503, false, 'service_unavailable', 'attachment_service_unavailable');
    }
    if ($error !== UPLOAD_ERR_OK) {
        respond($context, 422, false, 'attachment_invalid', 'attachment_upload');
    }

    $tmpName = isset($file['tmp_name']) && is_string($file['tmp_name']) ? $file['tmp_name'] : '';
    $originalName = isset($file['name']) && is_string($file['name']) ? $file['name'] : '';
    $size = isset($file['size']) ? (int) $file['size'] : 0;
    if ($tmpName === '' || !is_uploaded_file($tmpName) || $size <= 0 || $size > 10 * 1024 * 1024) {
        respond($context, 422, false, 'attachment_invalid', 'attachment_size');
    }

    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowedExtensions = ['pdf', 'step', 'stp', 'iges', 'igs', 'dwg', 'dxf', 'jpg', 'jpeg', 'png'];
    if (!in_array($extension, $allowedExtensions, true)) {
        respond($context, 422, false, 'attachment_invalid', 'attachment_type');
    }

    if (!class_exists('finfo')) {
        respond($context, 503, false, 'service_unavailable', 'attachment_service_unavailable');
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($tmpName);
    $binaryMimeByExtension = [
        'pdf' => ['application/pdf'],
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png' => ['image/png'],
        'dwg' => ['application/acad', 'application/x-acad', 'application/autocad_dwg', 'image/vnd.dwg', 'application/octet-stream'],
    ];

    if (isset($binaryMimeByExtension[$extension]) && !in_array($mime, $binaryMimeByExtension[$extension], true)) {
        respond($context, 422, false, 'attachment_invalid', 'attachment_mismatch');
    }

    if ($extension === 'dwg') {
        $sample = file_get_contents($tmpName, false, null, 0, 16);
        if ($sample === false || !preg_match('/^AC10[0-9]{2}/', $sample)) {
            respond($context, 422, false, 'attachment_invalid', 'attachment_dwg');
        }
    }

    if (in_array($extension, ['step', 'stp', 'iges', 'igs', 'dxf'], true)) {
        $sample = file_get_contents($tmpName, false, null, 0, 8192);
        $sample = $sample === false ? '' : strtoupper($sample);
        $valid = false;
        if (in_array($extension, ['step', 'stp'], true)) {
            $valid = strpos($sample, 'ISO-10303-21') !== false;
        } elseif (in_array($extension, ['iges', 'igs'], true)) {
            $valid = strlen($sample) >= 80 && (strpos($sample, 'IGES') !== false || preg_match('/.{72}S\s*\d+/m', $sample));
        } elseif ($extension === 'dxf') {
            $valid = strpos($sample, 'AUTOCAD BINARY DXF') !== false
                || (strpos($sample, 'SECTION') !== false && strpos($sample, 'HEADER') !== false);
        }
        if (!$valid) {
            respond($context, 422, false, 'attachment_invalid', 'attachment_cad');
        }
    }

    $safeBase = preg_replace('/[^A-Za-z0-9._-]+/', '-', pathinfo($originalName, PATHINFO_FILENAME));
    $safeBase = trim((string) $safeBase, '.-_');
    if ($safeBase === '') {
        $safeBase = 'drawing';
    }

    return [$tmpName, substr($safeBase, 0, 80) . '.' . $extension];
}

function normalize_inquiry_type(string $value): string
{
    $map = [
        'quote' => 'quote',
        '3d_step' => '3d_step',
        '3d-step' => '3d_step',
        'application_review' => 'application_review',
        'application-review' => 'application_review',
        'seal_review' => 'seal_review',
        'seal-review' => 'seal_review',
        'verified_drawing' => 'verified_drawing',
        'verified-drawing' => 'verified_drawing',
        'technical_consultation' => 'technical_consultation',
        'technical-consultation' => 'technical_consultation',
        'general_inquiry' => 'general_inquiry',
    ];
    return $map[$value] ?? 'general_inquiry';
}

function normalize_source_page(string $value): string
{
    if ($value === '' || strpos($value, '\\') !== false || strpos($value, '://') !== false || strpos($value, '//') === 0) {
        return '';
    }
    $value = ltrim($value, '/');
    $segments = explode('/', $value);
    if (in_array('.', $segments, true) || in_array('..', $segments, true)) {
        return '';
    }
    return preg_match('/^[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\.html$/', $value) === 1 ? $value : '';
}

$context = [
    'language' => normalize_source_language($_POST['source_language'] ?? ''),
    'json' => request_wants_json(),
];

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond($context, 405, false, 'invalid_method');
}

enforce_same_origin($context);
enforce_rate_limit($context);
load_env_file(__DIR__ . '/.env');

$smtpHost = env_value('SMTP_HOST');
$smtpPort = env_value('SMTP_PORT');
$username = env_value('SMTP_USER');
$password = env_value('SMTP_PASS');
$toEmail = env_value('SMTP_TO');
if (!$smtpHost || !$smtpPort || !$username || !$password || !$toEmail) {
    respond($context, 503, false, 'service_unavailable');
}

if (post_value('honeypot', 200, $context) !== '') {
    respond($context, 400, false, 'spam_detected');
}

$name = post_value('fullname', 100, $context);
$email = post_value('email', 254, $context);
$company = post_value('company', 150, $context);
$country = post_value('country', 100, $context);
$product = post_value('product', 200, $context);
$quantity = post_value('quantity', 100, $context);
$application = post_value('application', 500, $context);
$requirements = post_value('requirements', 5000, $context);
$inquiryType = normalize_inquiry_type(post_value('inquiry_type', 100, $context));
$sourceModel = post_value('source_model', 100, $context);
$sourceProduct = post_value('source_product', 200, $context);
$sourcePage = normalize_source_page(post_value('source_page', 300, $context));
post_value('source_url', 500, $context);
$sourceUrl = $sourcePage === '' ? '' : 'https://www.begapunk.com/' . $sourcePage;
$sourceLanguage = normalize_source_language(post_value('source_language', 20, $context));
$inquiryLabels = [
    'quote' => 'Quotation request',
    '3d_step' => 'STEP file request',
    'application_review' => 'Product selection help',
    'seal_review' => 'Seal compatibility check',
    'verified_drawing' => 'Drawing check',
    'technical_consultation' => 'Technical question',
    'general_inquiry' => 'General request',
];
$inquiryLabel = $inquiryLabels[$inquiryType] ?? $inquiryLabels['general_inquiry'];
$productReference = $sourceModel !== ''
    ? $sourceModel
    : ($sourceProduct !== '' ? $sourceProduct : $product);

if ($email === '' || $requirements === '') {
    respond($context, 422, false, 'required_fields');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email . $name)) {
    respond($context, 422, false, 'invalid_contact');
}

$attachment = isset($_FILES['drawing']) && is_array($_FILES['drawing'])
    ? validate_attachment($_FILES['drawing'], $context)
    : [];

$rows = [
    'Name' => $name,
    'Email' => $email,
    'Company' => $company,
    'Country' => $country,
    'Product / Reference' => $productReference,
    'Estimated Quantity' => $quantity,
    'Application' => $application,
    'Request Type' => $inquiryLabel,
    'Source URL' => $sourceUrl,
    'Source Language' => $sourceLanguage,
];

$tableRows = '';
foreach ($rows as $label => $value) {
    if ($value !== '') {
        $tableRows .= '<tr><td><strong>' . escape_html($label) . ':</strong></td><td>' . escape_html($value) . '</td></tr>';
    }
}

$htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>'
    . '<h2>New Quote Request from Begapunk Website</h2><table border="0" cellpadding="8" cellspacing="0">'
    . $tableRows
    . '<tr><td><strong>Customer Message:</strong></td><td><pre style="white-space:pre-wrap;font-family:inherit;">'
    . escape_html($requirements)
    . '</pre></td></tr></table></body></html>';

$mail = null;
try {
    require_once __DIR__ . '/PHPMailer/PHPMailer.php';
    require_once __DIR__ . '/PHPMailer/SMTP.php';
    require_once __DIR__ . '/PHPMailer/Exception.php';

    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = (string) $smtpHost;
    $mail->SMTPAuth = true;
    $mail->Username = (string) $username;
    $mail->Password = (string) $password;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = (int) $smtpPort;
    $mail->Timeout = 15;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom((string) $username, 'Begapunk Website');
    $mail->addAddress((string) $toEmail, 'Begapunk Sales');
    $requesterLabel = $name !== '' ? $name : $email;
    $mail->addReplyTo($email, $requesterLabel);
    $mail->isHTML(true);
    $mail->Subject = '[Begapunk] New Quote Request from ' . $requesterLabel;
    $mail->Body = $htmlBody;
    $mail->AltBody = trim(html_entity_decode(strip_tags(str_replace(['</tr>', '</td>'], ["\n", ': '], $htmlBody)), ENT_QUOTES, 'UTF-8'));

    if ($attachment !== []) {
        $mail->addAttachment($attachment[0], $attachment[1]);
    }

    $mail->send();
    respond($context, 200, true, 'sent');
} catch (\Throwable $exception) {
    error_log('Begapunk inquiry mail failure [' . get_class($exception) . ']');
    respond($context, 502, false, 'mail_failed');
}
