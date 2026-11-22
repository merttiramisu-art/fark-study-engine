/**
 * Zero-dependency development server for FARK Study Engine Interactive Studio.
 * Binds to 0.0.0.0 on PORT (default 3000) for local and embedded preview environments.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const baseDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ROUTES = new Map([
  ['/examples/web/', ['examples/web/index.html', 'text/html; charset=utf-8']],
  ['/examples/web/index.html', ['examples/web/index.html', 'text/html; charset=utf-8']],
  ['/examples/web/styles.css', ['examples/web/styles.css', 'text/css; charset=utf-8']],
  ['/examples/web/app.js', ['examples/web/app.js', 'text/javascript; charset=utf-8']],
  ['/examples/web/tab-navigation.js', ['examples/web/tab-navigation.js', 'text/javascript; charset=utf-8']],
  ['/examples/web/knowledge-presets.js', ['examples/web/knowledge-presets.js', 'text/javascript; charset=utf-8']],
  ['/examples/web/visual-labs.js', ['examples/web/visual-labs.js', 'text/javascript; charset=utf-8']],
  ['/examples/web/closed-loop-controller.js', ['examples/web/closed-loop-controller.js', 'text/javascript; charset=utf-8']],
  ['/examples/widget-demo.html', ['examples/widget-demo.html', 'text/html; charset=utf-8']],
  ['/src/index.js', ['src/index.js', 'text/javascript; charset=utf-8']],
  ['/src/planner.js', ['src/planner.js', 'text/javascript; charset=utf-8']],
  ['/src/portable.js', ['src/portable.js', 'text/javascript; charset=utf-8']],
  ['/src/csv.js', ['src/csv.js', 'text/javascript; charset=utf-8']],
  ['/src/markdown.js', ['src/markdown.js', 'text/javascript; charset=utf-8']],
  ['/src/strategies.js', ['src/strategies.js', 'text/javascript; charset=utf-8']],
  ['/src/interchange.js', ['src/interchange.js', 'text/javascript; charset=utf-8']],
  ['/src/widget.js', ['src/widget.js', 'text/javascript; charset=utf-8']],
  ['/src/memory.js', ['src/memory.js', 'text/javascript; charset=utf-8']],
  ['/src/ledger.js', ['src/ledger.js', 'text/javascript; charset=utf-8']],
  ['/src/diagnosis.js', ['src/diagnosis.js', 'text/javascript; charset=utf-8']],
  ['/src/calibrate.js', ['src/calibrate.js', 'text/javascript; charset=utf-8']],
  ['/src/knowledge-core.js', ['src/knowledge-core.js', 'text/javascript; charset=utf-8']],
  ['/src/assessment.js', ['src/assessment.js', 'text/javascript; charset=utf-8']],
  ['/src/learning-loop.js', ['src/learning-loop.js', 'text/javascript; charset=utf-8']],
  ['/src/learning-progress.js', ['src/learning-progress.js', 'text/javascript; charset=utf-8']],
  ['/src/prerequisite-analysis.js', ['src/prerequisite-analysis.js', 'text/javascript; charset=utf-8']],
  ['/src/learning-orchestrator.js', ['src/learning-orchestrator.js', 'text/javascript; charset=utf-8']],
  ['/src/learning-session.js', ['src/learning-session.js', 'text/javascript; charset=utf-8']],
  ['/src/content-readiness.js', ['src/content-readiness.js', 'text/javascript; charset=utf-8']],
  ['/src/evidence-integrity.js', ['src/evidence-integrity.js', 'text/javascript; charset=utf-8']],
  ['/src/reassessment-ledger.js', ['src/reassessment-ledger.js', 'text/javascript; charset=utf-8']],
  ['/README.md', ['README.md', 'text/plain; charset=utf-8']]
]);

const HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data:; base-uri 'none'; form-action 'none'"
});

const server = createServer(async (req, res) => {
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

  if (pathname === '/' || pathname === '/index.html') {
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
    res.end('Unable to load studio asset');
  }
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
server.listen(port, host, () => {
  console.log(`FARK Interactive Studio dev server listening on http://${host}:${port}/examples/web/`);
});
