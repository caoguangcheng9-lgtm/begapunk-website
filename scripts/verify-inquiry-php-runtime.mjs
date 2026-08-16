import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILE = path.join(ROOT, 'send_inquiry.php');
const TEMP_PREFIX = 'begapunk-rfq-php-';
const PHP_START_TIMEOUT_MS = 5000;
const HTTP_TIMEOUT_MS = 3000;
const PROCESS_TIMEOUT_MS = 10000;
const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_LOG_CHARS = 8000;
const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_TO'];
const SUPPORTED_PHP_MINORS = new Set(['8.2', '8.3']);
const DISABLED_FUNCTIONS = 'mail,fsockopen,pfsockopen,stream_socket_client';
const FORBIDDEN_STATUSES = new Set([200, 303, 502]);
const FORBIDDEN_CODES = new Set(['sent', 'mail_failed']);
const TEST_EMAIL = 'rfq-test@example.invalid';
const INVALID_EMAIL = 'invalid@@example.invalid';
const TEST_PASSWORD_MARKER = 'non-secret-test-value';
const LONG_NAME = 'A'.repeat(101);
const LONG_QUANTITY = 'Q'.repeat(101);

const TEST_CASES = [
  {
    group: 'without-smtp',
    name: 'GET JSON EN invalid method',
    method: 'GET',
    accept: 'application/json',
    expected: {
      format: 'json',
      status: 405,
      language: 'en',
      code: 'invalid_method',
      message: 'This submission method is not supported.',
      allowPost: true,
    },
  },
  {
    group: 'without-smtp',
    name: 'GET q=0 HTML EN invalid method',
    method: 'GET',
    accept: 'application/json;q=0,text/html',
    expected: {
      format: 'html',
      status: 405,
      language: 'en',
      code: 'invalid_method',
      message: 'This submission method is not supported.',
      contactPath: '/contact.html#quoteForm',
      allowPost: true,
    },
  },
  {
    group: 'without-smtp',
    name: 'POST foreign Origin DE JSON',
    method: 'POST',
    accept: 'application/json',
    origin: 'https://evil.invalid',
    form: { source_language: 'de' },
    expected: {
      format: 'json',
      status: 403,
      language: 'de',
      code: 'origin_not_allowed',
      message: 'Die Anfrage kann von dieser Seite nicht angenommen werden.',
    },
  },
  {
    group: 'without-smtp',
    name: 'POST missing SMTP RU HTML',
    method: 'POST',
    accept: 'text/html',
    form: { source_language: 'ru' },
    expected: {
      format: 'html',
      status: 503,
      language: 'ru',
      code: 'service_unavailable',
      message: 'Сервис обработки запросов временно недоступен. Напишите на sales@begapunk.com.',
      contactPath: '/ru/contact.html#quoteForm',
    },
  },
  {
    group: 'loopback-smtp',
    name: 'POST honeypot DE JSON',
    method: 'POST',
    accept: 'application/json',
    form: { source_language: 'de', honeypot: 'isolated-automation-marker' },
    expected: {
      format: 'json',
      status: 400,
      language: 'de',
      code: 'spam_detected',
      message: 'Die Anfrage konnte nicht angenommen werden.',
    },
  },
  {
    group: 'loopback-smtp',
    name: 'POST missing required fields EN HTML',
    method: 'POST',
    accept: 'text/html',
    form: { source_language: 'en' },
    expected: {
      format: 'html',
      status: 422,
      language: 'en',
      code: 'required_fields',
      message: 'Please complete all required fields.',
      contactPath: '/contact.html#quoteForm',
    },
  },
  {
    group: 'loopback-smtp',
    name: 'POST invalid email JA JSON',
    method: 'POST',
    accept: 'application/json',
    form: {
      source_language: 'ja',
      fullname: 'Fictional RFQ Tester',
      email: INVALID_EMAIL,
      company: 'Example Invalid Test Company',
      country: 'Testland',
      product: 'BP-TEST-0001',
      requirements: 'Fictional isolated validation request.',
    },
    expected: {
      format: 'json',
      status: 422,
      language: 'ja',
      code: 'invalid_contact',
      message: 'お名前とメールアドレスをご確認ください。',
    },
  },
  {
    group: 'loopback-smtp',
    name: 'POST overlong fullname RU HTML',
    method: 'POST',
    accept: 'text/html',
    form: { source_language: 'ru', fullname: LONG_NAME },
    expected: {
      format: 'html',
      status: 422,
      language: 'ru',
      code: 'field_too_long',
      message: 'Одно или несколько полей превышают допустимую длину.',
      contactPath: '/ru/contact.html#quoteForm',
    },
  },
  {
    group: 'loopback-smtp',
    name: 'POST overlong quantity EN JSON',
    method: 'POST',
    accept: 'application/json',
    form: { source_language: 'en', quantity: LONG_QUANTITY },
    expected: {
      format: 'json',
      status: 422,
      language: 'en',
      code: 'field_too_long',
      message: 'One or more fields exceed the allowed length.',
    },
  },
];

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function mergeFailure(current, next, context) {
  const nextMessage = next instanceof Error ? next.message : String(next);
  if (!current) return new Error(`${context}: ${nextMessage}`);
  return new Error(`${current.message}; ${context}: ${nextMessage}`);
}

function appendBounded(current, chunk, maximum = MAX_LOG_CHARS) {
  return (current + String(chunk)).slice(-maximum);
}

function buildMinimalEnvironment(tempDirectory, smtp = null) {
  const allowedKeys = new Set([
    'path', 'pathext', 'systemroot', 'windir', 'lang', 'lc_all', 'lc_ctype',
  ]);
  const environment = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && allowedKeys.has(key.toLowerCase())) {
      environment[key] = value;
    }
  }

  environment.TEMP = tempDirectory;
  environment.TMP = tempDirectory;
  environment.TMPDIR = tempDirectory;
  for (const key of SMTP_KEYS) delete environment[key];
  if (smtp) {
    environment.SMTP_HOST = '127.0.0.1';
    environment.SMTP_PORT = String(smtp.port);
    environment.SMTP_USER = TEST_EMAIL;
    environment.SMTP_PASS = TEST_PASSWORD_MARKER;
    environment.SMTP_TO = 'rfq-recipient@example.invalid';
  }
  return environment;
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, options.timeoutMs ?? PROCESS_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout = appendBounded(stdout, chunk, 32 * 1024);
    });
    child.stderr.on('data', (chunk) => {
      stderr = appendBounded(stderr, chunk, 32 * 1024);
    });
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

async function sha256File(filePath) {
  const hash = createHash('sha256');
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}

function connectToLoopback(port, timeoutMs = 250) {
  return new Promise((resolve) => {
    let finished = false;
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const finish = (connected) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve(connected);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

async function allocateHighLoopbackPort() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const port = await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once('error', reject);
      server.listen({ host: '127.0.0.1', port: 0, exclusive: true }, () => {
        const address = server.address();
        const selected = address && typeof address === 'object' ? address.port : 0;
        server.close((error) => error ? reject(error) : resolve(selected));
      });
    });
    if (port > 1024) return port;
  }
  throw new Error('Could not allocate a dynamic high loopback port.');
}

async function startSmtpTrap() {
  const sockets = new Set();
  let connections = 0;
  const server = net.createServer({ pauseOnConnect: true }, (socket) => {
    connections += 1;
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
    socket.destroy();
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port: 0, exclusive: true }, resolve);
  });
  const address = server.address();
  ensure(address && typeof address === 'object' && address.address === '127.0.0.1', 'SMTP trap did not bind to IPv4 loopback.');
  ensure(address.port > 1024, 'SMTP trap did not receive a dynamic high port.');
  return {
    server,
    port: address.port,
    sockets,
    get connections() {
      return connections;
    },
  };
}

async function waitForPhpServer(record) {
  const deadline = Date.now() + PHP_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (record.spawnError) throw record.spawnError;
    if (record.child.exitCode !== null || record.child.signalCode !== null) {
      throw new Error(`PHP test server exited before becoming ready (code ${record.child.exitCode ?? 'signal'}).`);
    }
    if (await connectToLoopback(record.port)) return;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error('PHP test server did not become ready before the timeout.');
}

async function startPhpServer({ phpBin, siteDirectory, runtimeDirectory, smtp }, serverRecords) {
  const port = await allocateHighLoopbackPort();
  const args = [
    '-n',
    '-d', `sys_temp_dir=${runtimeDirectory}`,
    '-d', `upload_tmp_dir=${runtimeDirectory}`,
    '-d', `disable_functions=${DISABLED_FUNCTIONS}`,
    '-d', 'allow_url_fopen=0',
    '-d', 'allow_url_include=0',
    '-S', `127.0.0.1:${port}`,
    '-t', siteDirectory,
  ];
  const child = spawn(phpBin, args, {
    cwd: siteDirectory,
    env: buildMinimalEnvironment(runtimeDirectory, smtp),
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const record = {
    child,
    port,
    log: '',
    spawnError: null,
  };
  child.stdout.on('data', (chunk) => {
    record.log = appendBounded(record.log, chunk);
  });
  child.stderr.on('data', (chunk) => {
    record.log = appendBounded(record.log, chunk);
  });
  child.once('error', (error) => {
    record.spawnError = error;
  });
  serverRecords.push(record);
  await waitForPhpServer(record);
  return record;
}

function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function stopPhpServer(record) {
  if (record.child.exitCode === null && record.child.signalCode === null) {
    record.child.kill();
    if (!await waitForChildExit(record.child, 2000)) {
      record.child.kill('SIGKILL');
      ensure(await waitForChildExit(record.child, 2000), 'PHP test server did not stop.');
    }
  }
}

async function assertPortClosed(port, label) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (!await connectToLoopback(port, 150)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${label} loopback port remained open after cleanup.`);
}

function requestLocalPhp(port, testCase, networkAudit) {
  ensure(Number.isInteger(port) && port > 1024, `${testCase.name}: invalid PHP test port.`);
  networkAudit.requestedHosts.add('127.0.0.1');
  networkAudit.httpRequests += 1;
  ensure([...networkAudit.requestedHosts].every((host) => host === '127.0.0.1'), `${testCase.name}: external HTTP target was requested.`);

  const encodedBody = testCase.form ? new URLSearchParams(testCase.form).toString() : '';
  const headers = {
    Accept: testCase.accept,
    Connection: 'close',
  };
  if (testCase.origin) headers.Origin = testCase.origin;
  if (testCase.method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    headers['Content-Length'] = Buffer.byteLength(encodedBody);
  }

  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1',
      port,
      path: '/send_inquiry.php',
      method: testCase.method,
      headers,
      timeout: HTTP_TIMEOUT_MS,
    }, (response) => {
      const chunks = [];
      let totalBytes = 0;
      response.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_RESPONSE_BYTES) {
          request.destroy(new Error(`${testCase.name}: response exceeded the size limit.`));
          return;
        }
        chunks.push(chunk);
      });
      response.once('end', () => resolve({
        status: response.statusCode ?? 0,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.once('timeout', () => request.destroy(new Error(`${testCase.name}: HTTP timeout.`)));
    request.once('error', reject);
    if (encodedBody) request.write(encodedBody);
    request.end();
  });
}

function headerValue(response, name) {
  const value = response.headers[name.toLowerCase()];
  return Array.isArray(value) ? value.join(', ') : String(value ?? '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function assertNoDiagnosticLeak(testCase, response, tempRoot) {
  const lower = response.body.toLowerCase();
  ensure(!lower.includes('warning:'), `${testCase.name}: response exposed a PHP warning.`);
  ensure(!lower.includes('fatal error'), `${testCase.name}: response exposed a PHP fatal error.`);
  ensure(!lower.includes('stack trace'), `${testCase.name}: response exposed a stack trace.`);
  ensure(!lower.includes('send_inquiry.php on line'), `${testCase.name}: response exposed a PHP source location.`);
  ensure(!/\b[A-Za-z]:[\\/][^\s<>"']+/.test(response.body), `${testCase.name}: response exposed a Windows path.`);
  ensure(!/\/(?:home|tmp|var|srv|www)\/[^\s<>"']+/.test(response.body), `${testCase.name}: response exposed a server path.`);
  ensure(!response.body.includes(tempRoot), `${testCase.name}: response exposed the temporary path.`);
  ensure(!response.body.includes(TEST_PASSWORD_MARKER), `${testCase.name}: response exposed the SMTP test marker.`);
  ensure(!response.body.includes(LONG_QUANTITY), `${testCase.name}: response echoed the overlong quantity.`);
}

function validateResponse(testCase, response, tempRoot) {
  const expected = testCase.expected;
  ensure(!FORBIDDEN_STATUSES.has(response.status), `${testCase.name}: forbidden HTTP ${response.status} indicated a test-boundary breach.`);
  ensure(response.status === expected.status, `${testCase.name}: expected HTTP ${expected.status}, received ${response.status}.`);
  ensure(headerValue(response, 'x-content-type-options').toLowerCase() === 'nosniff', `${testCase.name}: X-Content-Type-Options is incorrect.`);
  ensure(headerValue(response, 'cache-control').toLowerCase() === 'no-store', `${testCase.name}: Cache-Control is incorrect.`);
  ensure(
    headerValue(response, 'referrer-policy').toLowerCase() === 'strict-origin-when-cross-origin',
    `${testCase.name}: Referrer-Policy is incorrect.`,
  );
  ensure(headerValue(response, 'content-language').toLowerCase() === expected.language, `${testCase.name}: Content-Language is incorrect.`);
  if (expected.allowPost) {
    ensure(headerValue(response, 'allow').toUpperCase().split(/\s*,\s*/).includes('POST'), `${testCase.name}: Allow does not include POST.`);
  }
  assertNoDiagnosticLeak(testCase, response, tempRoot);

  if (expected.format === 'json') {
    ensure(headerValue(response, 'content-type').toLowerCase().startsWith('application/json'), `${testCase.name}: response is not JSON.`);
    ensure(headerValue(response, 'vary').toLowerCase().split(/\s*,\s*/).includes('accept'), `${testCase.name}: Vary does not include Accept.`);
    ensure(!/<(?:!doctype|html)\b/i.test(response.body), `${testCase.name}: JSON response contained HTML.`);
    let payload;
    try {
      payload = JSON.parse(response.body);
    } catch {
      throw new Error(`${testCase.name}: JSON response could not be parsed.`);
    }
    ensure(payload && payload.success === false, `${testCase.name}: success must be false.`);
    ensure(payload.code === expected.code, `${testCase.name}: expected code ${expected.code}.`);
    ensure(!FORBIDDEN_CODES.has(payload.code), `${testCase.name}: forbidden code ${payload.code} indicated a mail-stage breach.`);
    ensure(typeof payload.message === 'string' && payload.message.length > 0, `${testCase.name}: localized message is empty.`);
    ensure(payload.message === expected.message, `${testCase.name}: localized message is incorrect.`);
    return;
  }

  ensure(headerValue(response, 'content-type').toLowerCase().startsWith('text/html'), `${testCase.name}: response is not HTML.`);
  ensure(headerValue(response, 'location') === '', `${testCase.name}: error response unexpectedly redirected.`);
  ensure(new RegExp(`<html\\s+lang=["']${expected.language}["']`, 'i').test(response.body), `${testCase.name}: HTML lang is incorrect.`);
  ensure(/<meta\s+name=["']robots["']\s+content=["']noindex["']/i.test(response.body), `${testCase.name}: HTML response lacks noindex.`);
  ensure(headerValue(response, 'content-security-policy').length > 0, `${testCase.name}: Content-Security-Policy is missing.`);
  ensure(response.body.includes(`href="${expected.contactPath}"`), `${testCase.name}: localized Contact return path is missing.`);
  ensure(response.body.includes(escapeHtml(expected.message)), `${testCase.name}: localized HTML message is incorrect.`);
  for (const marker of [TEST_EMAIL, INVALID_EMAIL, TEST_PASSWORD_MARKER, LONG_NAME, LONG_QUANTITY]) {
    ensure(!response.body.includes(marker), `${testCase.name}: response echoed isolated test data.`);
  }
}

function validateSafeTemporaryRoot(tempRoot) {
  const tempBase = path.resolve(os.tmpdir());
  const resolvedRoot = path.resolve(tempRoot);
  ensure(path.dirname(resolvedRoot) === tempBase, 'Temporary root is not a direct child of the system temporary directory.');
  ensure(path.basename(resolvedRoot).startsWith(TEMP_PREFIX), 'Temporary root does not have the required task prefix.');
  return resolvedRoot;
}

async function assertRateDirectory(runtimeDirectory, expectedAttempts) {
  const expectedName = `begapunk-rfq-${createHash('sha256').update('127.0.0.1').digest('hex')}.json`;
  const entries = await fsp.readdir(runtimeDirectory);
  ensure(entries.length === 1 && entries[0] === expectedName, 'Rate-limit state was not isolated in the expected runtime directory.');
  const parsed = JSON.parse(await fsp.readFile(path.join(runtimeDirectory, expectedName), 'utf8'));
  ensure(Array.isArray(parsed) && parsed.length === expectedAttempts, `Rate-limit state expected ${expectedAttempts} isolated attempt(s).`);
  ensure(parsed.every((value) => Number.isInteger(value)), 'Rate-limit state contains an invalid timestamp.');
}

async function closeSmtpTrap(trap) {
  for (const socket of trap.sockets) socket.destroy();
  await new Promise((resolve, reject) => {
    trap.server.close((error) => error ? reject(error) : resolve());
  });
}

function sanitizeFailureText(value, tempRoot) {
  let text = String(value ?? 'Unknown failure');
  for (const marker of [TEST_EMAIL, INVALID_EMAIL, 'rfq-recipient@example.invalid', TEST_PASSWORD_MARKER, LONG_NAME, LONG_QUANTITY]) {
    text = text.replaceAll(marker, '[redacted-test-value]');
  }
  if (tempRoot) text = text.replaceAll(tempRoot, '[temporary-root]');
  text = text.replaceAll(ROOT, '[repository-root]');
  return text.slice(0, 4000);
}

async function main() {
  const phpBin = process.env.BEGAPUNK_PHP_BIN?.trim() || 'php';
  const expectedPhpMinor = process.env.BEGAPUNK_EXPECTED_PHP_MINOR?.trim() || '';
  const phpServers = [];
  const networkAudit = { requestedHosts: new Set(), httpRequests: 0 };
  let smtpTrap = null;
  let tempRoot = '';
  let phpVersion = '';
  let phpMinor = '';
  let syntaxSummary = '';
  let sourceHash = '';
  let copiedFile = '';
  let passedCases = 0;
  let cleaned = false;
  let failure = null;
  let interruptionSignal = '';
  const handleSigint = () => {
    interruptionSignal ||= 'SIGINT';
    for (const record of phpServers) {
      try { record.child.kill(); } catch {}
    }
  };
  const handleSigterm = () => {
    interruptionSignal ||= 'SIGTERM';
    for (const record of phpServers) {
      try { record.child.kill(); } catch {}
    }
  };
  process.once('SIGINT', handleSigint);
  process.once('SIGTERM', handleSigterm);

  try {
    ensure(TEST_CASES.length === 9, `Runtime matrix must contain exactly 9 cases; found ${TEST_CASES.length}.`);
    ensure(
      !expectedPhpMinor || SUPPORTED_PHP_MINORS.has(expectedPhpMinor),
      `BEGAPUNK_EXPECTED_PHP_MINOR must be 8.2 or 8.3; found ${expectedPhpMinor || 'empty'}.`,
    );
    const probeEnvironment = buildMinimalEnvironment(os.tmpdir());
    let versionResult;
    try {
      versionResult = await runProcess(
        phpBin,
        ['-n', '-r', 'fwrite(STDOUT, PHP_VERSION);'],
        { cwd: ROOT, env: probeEnvironment },
      );
    } catch (error) {
      throw new Error(`PHP could not be started: ${error.code || error.message}`);
    }
    ensure(!versionResult.timedOut, 'PHP version probe timed out.');
    ensure(versionResult.code === 0, `PHP version probe failed with exit code ${versionResult.code}.`);
    phpVersion = versionResult.stdout.trim();
    phpMinor = phpVersion.match(/^(\d+\.\d+)(?:\.|$)/)?.[1] || '';
    ensure(
      SUPPORTED_PHP_MINORS.has(phpMinor),
      `PHP 8.2 or 8.3 is required; found ${phpVersion || 'unknown'}.`,
    );
    ensure(
      !expectedPhpMinor || phpMinor === expectedPhpMinor,
      `Expected PHP ${expectedPhpMinor}, but found ${phpVersion || 'unknown'}.`,
    );

    const lintResult = await runProcess(
      phpBin,
      ['-n', '-l', 'send_inquiry.php'],
      { cwd: ROOT, env: probeEnvironment },
    );
    ensure(!lintResult.timedOut, 'PHP syntax check timed out.');
    ensure(lintResult.code === 0, `PHP syntax check failed with exit code ${lintResult.code}.`);
    syntaxSummary = `${lintResult.stdout}\n${lintResult.stderr}`.trim().replace(/\s+/g, ' ');
    ensure(syntaxSummary.includes('No syntax errors detected in send_inquiry.php'), 'PHP syntax check did not return the expected PASS result.');

    const tempBase = path.resolve(os.tmpdir());
    tempRoot = await fsp.mkdtemp(path.join(tempBase, TEMP_PREFIX));
    validateSafeTemporaryRoot(tempRoot);
    const siteDirectory = path.join(tempRoot, 'site');
    const withoutSmtpDirectory = path.join(tempRoot, 'runtime-without-smtp');
    const loopbackSmtpDirectory = path.join(tempRoot, 'runtime-loopback-smtp');
    await Promise.all([
      fsp.mkdir(siteDirectory),
      fsp.mkdir(withoutSmtpDirectory),
      fsp.mkdir(loopbackSmtpDirectory),
    ]);

    copiedFile = path.join(siteDirectory, 'send_inquiry.php');
    await fsp.copyFile(SOURCE_FILE, copiedFile, fs.constants.COPYFILE_EXCL);
    const [initialSourceHash, copiedHash, siteEntries] = await Promise.all([
      sha256File(SOURCE_FILE),
      sha256File(copiedFile),
      fsp.readdir(siteDirectory),
    ]);
    sourceHash = initialSourceHash;
    ensure(sourceHash === copiedHash, 'Isolated PHP copy hash does not match the repository source.');
    ensure(siteEntries.length === 1 && siteEntries[0] === 'send_inquiry.php', 'Temporary site contains an unauthorized file.');

    smtpTrap = await startSmtpTrap();
    const withoutSmtpServer = await startPhpServer({
      phpBin,
      siteDirectory,
      runtimeDirectory: withoutSmtpDirectory,
      smtp: null,
    }, phpServers);
    const loopbackSmtpServer = await startPhpServer({
      phpBin,
      siteDirectory,
      runtimeDirectory: loopbackSmtpDirectory,
      smtp: { port: smtpTrap.port },
    }, phpServers);

    for (const testCase of TEST_CASES) {
      const server = testCase.group === 'without-smtp' ? withoutSmtpServer : loopbackSmtpServer;
      ensure(!interruptionSignal, `Runtime verification interrupted by ${interruptionSignal}.`);
      const response = await requestLocalPhp(server.port, testCase, networkAudit);
      validateResponse(testCase, response, tempRoot);
      ensure(smtpTrap.connections === 0, `${testCase.name}: SMTP trap received a connection.`);
      passedCases += 1;
    }
    ensure(passedCases === TEST_CASES.length, 'Runtime test matrix did not complete all nine cases.');
    ensure(networkAudit.httpRequests === 9, `Runtime verification made ${networkAudit.httpRequests} HTTP request(s), expected exactly 9.`);
    await assertRateDirectory(withoutSmtpDirectory, 1);
    await assertRateDirectory(loopbackSmtpDirectory, 5);
    ensure(smtpTrap.connections === 0, 'SMTP trap received a connection.');
    ensure([...networkAudit.requestedHosts].join(',') === '127.0.0.1', 'An external HTTP host was accessed.');
    const [finalSourceHash, finalCopiedHash] = await Promise.all([
      sha256File(SOURCE_FILE),
      sha256File(copiedFile),
    ]);
    ensure(finalSourceHash === sourceHash, 'Repository send_inquiry.php changed during runtime verification.');
    ensure(finalCopiedHash === sourceHash, 'Isolated send_inquiry.php changed during runtime verification.');
  } catch (error) {
    failure = error;
  } finally {
    for (const record of phpServers) {
      try {
        await stopPhpServer(record);
      } catch (error) {
        failure = mergeFailure(failure, error, 'PHP process cleanup failed');
      }
      try {
        await assertPortClosed(record.port, 'PHP');
      } catch (error) {
        failure = mergeFailure(failure, error, 'PHP port cleanup failed');
      }
    }
    if (smtpTrap) {
      try {
        await closeSmtpTrap(smtpTrap);
      } catch (error) {
        failure = mergeFailure(failure, error, 'SMTP trap cleanup failed');
      }
      try {
        ensure(smtpTrap.connections === 0, 'SMTP trap received a connection before cleanup completed.');
      } catch (error) {
        failure = mergeFailure(failure, error, 'SMTP isolation check failed');
      }
      try {
        await assertPortClosed(smtpTrap.port, 'SMTP trap');
      } catch (error) {
        failure = mergeFailure(failure, error, 'SMTP port cleanup failed');
      }
    }
    if (tempRoot) {
      try {
        const safeRoot = validateSafeTemporaryRoot(tempRoot);
        await fsp.rm(safeRoot, { recursive: true, force: true });
        cleaned = !fs.existsSync(safeRoot);
        ensure(cleaned, 'Temporary root still exists after cleanup.');
      } catch (error) {
        failure = mergeFailure(failure, error, 'Temporary directory cleanup failed');
      }
    }
    if (interruptionSignal) {
      failure = mergeFailure(failure, new Error(interruptionSignal), 'Runtime verification was interrupted');
    }
    process.removeListener('SIGINT', handleSigint);
    process.removeListener('SIGTERM', handleSigterm);
  }

  if (failure) {
    console.error(`Inquiry PHP runtime verification failed: ${sanitizeFailureText(failure.message, tempRoot)}`);
    const serverLog = phpServers.map((record) => record.log).filter(Boolean).join('\n');
    if (serverLog) {
      console.error('Truncated PHP server log:');
      console.error(sanitizeFailureText(serverLog.slice(-4000), tempRoot));
    }
    process.exitCode = 1;
    return;
  }

  console.log(`PHP version: ${phpVersion}`);
  console.log(`PHP compatibility target: ${expectedPhpMinor || 'supported local version (8.2 or 8.3)'}`);
  console.log(`Syntax check: PASS - ${syntaxSummary}`);
  console.log(`Runtime cases: ${passedCases}/${TEST_CASES.length} PASS`);
  console.log(`SMTP connections = ${smtpTrap?.connections ?? 0}`);
  console.log(`Temporary directory cleaned: ${cleaned ? 'YES' : 'NO'}`);
  console.log(`Harness HTTP targets: loopback only (${networkAudit.httpRequests}/${TEST_CASES.length})`);
}

await main();
