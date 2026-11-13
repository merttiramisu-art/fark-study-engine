/**
 * Local-only, dependency-free development server for the browser example.
 * Serves an explicit list of static files; binds only to 127.0.0.1.
 */
import { createServer as httpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const baseDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROUTES = new Map([
  ['/examples/web/', ['examples/web/index.html', 'text/html; charset=utf-8']],
  ['/examples/web/index.html', ['examples/web/index.html', 'text/html; charset=utf-8']],
  ['/examples/web/styles.css', ['examples/web/styles.css', 'text/css; charset=utf-8']],
  ['/examples/web/app.js', ['examples/web/app.js', 'text/javascript; charset=utf-8']],
  ['/src/index.js', ['src/index.js', 'text/javascript; charset=utf-8']],
  ['/src/planner.js', ['src/planner.js', 'text/javascript; charset=utf-8']],
  ['/src/portable.js', ['src/portable.js', 'text/javascript; charset=utf-8']],
  ['/src/csv.js', ['src/csv.js', 'text/javascript; charset=utf-8']],
  ['/src/markdown.js', ['src/markdown.js', 'text/javascript; charset=utf-8']],
  ['/src/strategies.js', ['src/strategies.js', 'text/javascript; charset=utf-8']],
  ['/README.md', ['README.md', 'text/plain; charset=utf-8']]
]);

const HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
});

export function createDemoServer() {
  return httpServer(async (req, res) => {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch {
      res.writeHead(400, HEADERS);
      res.end('Bad request');
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { ...HEADERS, Allow: 'GET, HEAD' });
      res.end('Method not allowed');
      return;
    }
    if (pathname === '/') {
      res.writeHead(302, { ...HEADERS, Location: '/examples/web/' });
      res.end();
      return;
    }
    const entry = ROUTES.get(pathname);
    if (!entry) {
      res.writeHead(404, HEADERS);
      res.end('Not found');
      return;
    }
    try {
      const [relativePath, mime] = entry;
      const buffer = await readFile(resolve(baseDir, relativePath));
      res.writeHead(200, { ...HEADERS, 'Content-Type': mime, 'Content-Length': buffer.length });
      res.end(req.method === 'HEAD' ? undefined : buffer);
    } catch {
      res.writeHead(500, HEADERS);
      res.end('Unable to load demo asset');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createDemoServer();
  const port = Number(process.env.PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError('PORT must be an integer from 1 to 65535');
  }
  server.listen(port, '127.0.0.1', () => {
    console.log('FARK Interactive Lab: http://127.0.0.1:' + port + '/examples/web/');
    console.log('Local-only. No external APIs, accounts, telemetry, or storage.');
  });
}
