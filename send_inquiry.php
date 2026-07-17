<?php
declare(strict_types=1);

// Never expose PHP warnings, stack traces, or server paths in a public JSON API.
ini_set('display_errors', '0');
ini_set('html_errors', '0');
error_reporting(E_ALL);

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: strict-origin-when-cross-origin');

function respond(int $status, bool $success, string $message): void
{
    http_response_code($status);
    echo json_encode(
        ['success' => $success, 'message' => $message],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    exit;
}

function post_value(string $key, int $maxLength): string
{
    $value = isset($_POST[$key]) && is_string($_POST[$key]) ? trim($_POST[$key]) : '';
    $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
    if ($length > $maxLength) {
        respond(422, false, 'One or more fields are too long.');
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

function enforce_same_origin(): void
{
    $allowedHosts = ['begapunk.com', 'www.begapunk.com'];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return;
    }

    $host = strtolower((string) parse_url($origin, PHP_URL_HOST));
    $scheme = strtolower((string) parse_url($origin, PHP_URL_SCHEME));
    if ($scheme !== 'https' || !in_array($host, $allowedHosts, true)) {
        respond(403, false, 'Request origin is not allowed.');
    }
}

function enforce_rate_limit(): void
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
            respond(429, false, 'Too many requests. Please try again later.');
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

function validate_attachment(array $file): array
{
    $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($error === UPLOAD_ERR_NO_FILE) {
        return [];
    }
    if ($error !== UPLOAD_ERR_OK) {
        respond(422, false, 'The attachment could not be uploaded. Please check the 10 MB limit and try again.');
    }

    $tmpName = isset($file['tmp_name']) && is_string($file['tmp_name']) ? $file['tmp_name'] : '';
    $originalName = isset($file['name']) && is_string($file['name']) ? $file['name'] : '';
    $size = isset($file['size']) ? (int) $file['size'] : 0;
    if ($tmpName === '' || !is_uploaded_file($tmpName) || $size <= 0 || $size > 10 * 1024 * 1024) {
        respond(422, false, 'Invalid attachment or file size. Maximum size is 10 MB.');
    }

    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowedExtensions = ['pdf', 'step', 'stp', 'iges', 'igs', 'dwg', 'dxf', 'jpg', 'jpeg', 'png'];
    if (!in_array($extension, $allowedExtensions, true)) {
        respond(422, false, 'Invalid file type. Allowed: PDF, STEP, IGES, DWG, DXF, JPG, PNG.');
    }

    if (!class_exists('finfo')) {
        respond(503, false, 'File uploads are temporarily unavailable. Please email the drawing directly.');
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
        respond(422, false, 'The attachment content does not match its file extension.');
    }

    if ($extension === 'dwg') {
        $sample = file_get_contents($tmpName, false, null, 0, 16);
        if ($sample === false || !preg_match('/^AC10[0-9]{2}/', $sample)) {
            respond(422, false, 'The DWG attachment does not appear to be valid.');
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
            respond(422, false, 'The CAD attachment does not appear to be a valid supported file.');
        }
    }

    $safeBase = preg_replace('/[^A-Za-z0-9._-]+/', '-', pathinfo($originalName, PATHINFO_FILENAME));
    $safeBase = trim((string) $safeBase, '.-_');
    if ($safeBase === '') {
        $safeBase = 'drawing';
    }

    return [$tmpName, substr($safeBase, 0, 80) . '.' . $extension];
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'Invalid request method.');
}

enforce_same_origin();
enforce_rate_limit();
load_env_file(__DIR__ . '/.env');

$smtpHost = env_value('SMTP_HOST');
$smtpPort = env_value('SMTP_PORT');
$username = env_value('SMTP_USER');
$password = env_value('SMTP_PASS');
$toEmail = env_value('SMTP_TO');
if (!$smtpHost || !$smtpPort || !$username || !$password || !$toEmail) {
    respond(503, false, 'The inquiry service is temporarily unavailable. Please email sales@begapunk.com.');
}

if (post_value('honeypot', 200) !== '') {
    respond(400, false, 'Spam detected.');
}

$name = post_value('fullname', 100);
$email = post_value('email', 254);
$company = post_value('company', 150);
$country = post_value('country', 100);
$product = post_value('product', 200);
$application = post_value('application', 500);
$requirements = post_value('requirements', 5000);
$inquiryType = post_value('inquiry_type', 100);
$sourceModel = post_value('source_model', 100);
$sourceProduct = post_value('source_product', 200);
$sourcePage = post_value('source_page', 300);
$sourceUrl = post_value('source_url', 500);
$sourceLanguage = strtolower(post_value('source_language', 20));
if ($sourceLanguage !== '' && !preg_match('/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/', $sourceLanguage)) {
    $sourceLanguage = '';
}

if ($name === '' || $email === '' || $company === '' || $country === '' || $product === '' || $requirements === '') {
    respond(422, false, 'Please fill in all required fields.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email . $name)) {
    respond(422, false, 'Invalid contact details.');
}

$attachment = isset($_FILES['drawing']) && is_array($_FILES['drawing'])
    ? validate_attachment($_FILES['drawing'])
    : [];

$rows = [
    'Name' => $name,
    'Email' => $email,
    'Company' => $company,
    'Country' => $country,
    'Product Interest' => $product,
    'Application' => $application,
    'Inquiry Type' => $inquiryType,
    'Source Model' => $sourceModel,
    'Source Product' => $sourceProduct,
    'Source Page' => $sourcePage,
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
    . '<tr><td><strong>Technical Requirements:</strong></td><td><pre style="white-space:pre-wrap;font-family:inherit;">'
    . escape_html($requirements)
    . '</pre></td></tr></table></body></html>';

require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';
require_once __DIR__ . '/PHPMailer/Exception.php';

$mail = new PHPMailer(true);
try {
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
    $mail->addReplyTo($email, $name);
    $mail->isHTML(true);
    $mail->Subject = '[Begapunk] New Quote Request from ' . $name;
    $mail->Body = $htmlBody;
    $mail->AltBody = trim(html_entity_decode(strip_tags(str_replace(['</tr>', '</td>'], ["\n", ': '], $htmlBody)), ENT_QUOTES, 'UTF-8'));

    if ($attachment !== []) {
        $mail->addAttachment($attachment[0], $attachment[1]);
    }

    $mail->send();
    respond(200, true, 'Email sent successfully.');
} catch (Exception $exception) {
    error_log('Begapunk inquiry mail failure: ' . $mail->ErrorInfo);
    respond(502, false, 'Failed to send the inquiry. Please email sales@begapunk.com.');
}
