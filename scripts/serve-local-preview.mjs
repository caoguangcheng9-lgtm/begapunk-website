import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(import.meta.dirname, '..');
const rootArgument = process.argv.find((argument) => argument.startsWith('--root='));
const portArgument = process.argv.find((argument) => argument.startsWith('--port='));
const verifyMode = process.argv.includes('--verify');
const siteRoot = path.resolve(projectRoot, rootArgument?.slice('--root='.length) || '.');
const requestedPort = verifyMode ? 0 : Number(portArgument?.slice('--port='.length) || 8080);

if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
  throw new Error('Preview port must be an integer from 0 to 65535.');
}

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function send(response, status, body, headers = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Length': payload.length,
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(payload);
}

function resolveRequestPath(requestUrl) {
  const pathname = new URL(requestUrl || '/', 'http://127.0.0.1').pathname;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const segments = decoded.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '..' || segment.startsWith('.'))) return null;
  const candidate = path.resolve(siteRoot, decoded.replace(/^\/+/, '') || 'index.html');
  const relative = path.relative(siteRoot, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return candidate;
}

async function readTarget(candidate) {
  const stats = await fs.stat(candidate);
  const filePath = stats.isDirectory() ? path.join(candidate, 'index.html') : candidate;
  return { filePath, body: await fs.readFile(filePath) };
}

async function localized404Path(requestUrl) {
  const pathname = new URL(requestUrl || '/', 'http://127.0.0.1').pathname;
  const language = pathname.split('/').filter(Boolean)[0];
  const candidate = ['de', 'fr', 'ja', 'ru'].includes(language)
    ? path.join(siteRoot, language, '404.html')
    : path.join(siteRoot, '404.html');
  try {
    await fs.access(candidate);
    return candidate;
  } catch {
    return null;
  }
}

export function createPreviewServer() {
  return http.createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
      const body = JSON.stringify({
        success: false,
        message: 'Static preview only. Inquiry submission requires the production PHP service.',
      });
      send(response, 405, request.method === 'HEAD' ? '' : body, {
        Allow: 'GET, HEAD',
        'Content-Type': 'application/json; charset=utf-8',
      });
      return;
    }

    const candidate = resolveRequestPath(request.url);
    if (!candidate) {
      send(response, 403, request.method === 'HEAD' ? '' : 'Forbidden', {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      return;
    }

    try {
      const { filePath, body } = await readTarget(candidate);
      send(response, 200, request.method === 'HEAD' ? '' : body, {
        'Content-Type': mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
      });
    } catch {
      const errorPage = await localized404Path(request.url);
      const body = errorPage ? await fs.readFile(errorPage) : Buffer.from('Not found');
      send(response, 404, request.method === 'HEAD' ? '' : body, {
        'Content-Type': errorPage ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
      });
    }
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(requestedPort, '127.0.0.1', resolve);
  });
  return server.address();
}

async function verify(server, baseUrl) {
  const checks = [
    ['homepage', '/', 200, 'text/html'],
    ['search index', '/search-index.json', 200, 'application/json'],
    ['localized homepage', '/fr/', 200, 'text/html'],
    ['localized 404', '/fr/definitely-missing-preview-page', 404, 'text/html'],
    ['dotfile protection', '/.env', 403, 'text/plain'],
  ];
  const failures = [];
  for (const [label, urlPath, expectedStatus, expectedType] of checks) {
    const response = await fetch(`${baseUrl}${urlPath}`, { redirect: 'manual' });
    if (response.status !== expectedStatus) failures.push(`${label}: expected ${expectedStatus}, received ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith(expectedType)) failures.push(`${label}: expected ${expectedType}, received ${contentType || '(missing)'}`);
  }
  const postResponse = await fetch(`${baseUrl}/send_inquiry.php`, { method: 'POST', body: 'preview=true' });
  if (postResponse.status !== 405) failures.push(`inquiry guard: expected 405, received ${postResponse.status}`);
  if (failures.length) throw new Error(`Local HTTP preview verification failed:\n- ${failures.join('\n- ')}`);
  console.log(`Local HTTP preview verification passed for ${siteRoot}.`);
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

const server = createPreviewServer();
const address = await listen(server);
const baseUrl = `http://127.0.0.1:${address.port}`;

if (verifyMode) {
  await verify(server, baseUrl);
} else {
  console.log(`Begapunk preview: ${baseUrl}/`);
  console.log(`Serving: ${siteRoot}`);
  console.log('Press Ctrl+C to stop. Inquiry submission is disabled in this static preview.');
}
