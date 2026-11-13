/**
 * Real responsive Chromium QA using the built-in Node 22 WebSocket client.
 * No Playwright install, third-party service, tracking, or external network.
 * This is browser emulation, not a physical device certification.
 */
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createDemoServer } from '../examples/serve-web.js';

function chromeExecutable() {
  for (const binary of [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    if (!binary) continue;
    try {
      if (isAbsolute(binary)) return binary;
      return execFileSync('which', [binary], { encoding: 'utf8' }).trim();
    } catch { /* Try the next supported Chrome binary. */ }
  }
  throw new Error('No Chromium/Chrome executable found. Set CHROME_BIN.');
}

async function retry(check, count = 100) {
  let lastError;
  for (let attempt = 0; attempt < count; attempt++) {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) { lastError = error; }
    await delay(100);
  }
  throw new Error('Browser did not become ready: ' + (lastError?.message ?? 'timed out'));
}

class DevTools {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.exceptions = [];
    this.socket.addEventListener('message', event => {
      const response = JSON.parse(event.data);
      if (response.method === 'Runtime.exceptionThrown') {
        this.exceptions.push(response.params?.exceptionDetails?.text ?? 'JavaScript error');
      }
      if (response.id != null) {
        const task = this.pending.get(response.id);
        if (!task) return;
        this.pending.delete(response.id);
        if (response.error) task.reject(new Error(response.error.message));
        else task.resolve(response.result);
      }
    });
  }
  async ready() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
  }
  async send(method, params = {}) {
    const id = this.nextId++;
    return await new Promise((resolve, reject) => {
      const watchdog = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('DevTools timeout: ' + method));
      }, 8000);
      this.pending.set(id, {
        resolve: value => { clearTimeout(watchdog); resolve(value); },
        reject: error => { clearTimeout(watchdog); reject(error); }
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const response = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.text + ': ' + (response.exceptionDetails.exception?.description ?? ''));
    }
    return response.result?.value;
  }
  close() { this.socket.close(); }
}

async function run() {
  const server = createDemoServer();
  server.listen(0, '127.0.0.1');
  await retry(() => server.listening);
  const address = 'http://127.0.0.1:' + server.address().port + '/examples/web/';
  const profile = await mkdtemp(join(tmpdir(), 'fark-mobile-qa-'));
  let stderrLog = '';
  const chrome = spawn(chromeExecutable(), [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-allow-origins=*',
    '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1',
    '--user-data-dir=' + profile,
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.stderr?.on('data', chunk => {
    if (stderrLog.length < 4000) stderrLog += chunk.toString();
  });
  let devtools;
  try {
    const port = await retry(async () => {
      if (chrome.exitCode !== null) {
        throw new Error('Chrome exited: ' + chrome.exitCode + (stderrLog ? ' (' + stderrLog.trim() + ')' : ''));
      }
      const match = stderrLog.match(/DevTools listening on ws:\/\/[^:]+:(\d+)/);
      if (match) return Number(match[1]);
      try {
        const file = await readFile(join(profile, 'DevToolsActivePort'), 'utf8');
        return Number(file.split('\n')[0]) || null;
      } catch (err) {
        throw new Error(`${err.message}${stderrLog ? ' | stderr: ' + stderrLog.trim() : ''}`);
      }
    }, 300);
    const target = await retry(async () => {
      const res = await fetch('http://127.0.0.1:' + port + '/json/list');
      const targets = await res.json();
      return targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
    });
    devtools = new DevTools(target.webSocketDebuggerUrl);
    await devtools.ready();
    await devtools.send('Page.enable');
    await devtools.send('Runtime.enable');
    await mkdir('artifacts/screenshots', { recursive: true });

    for (const viewport of [
      { width: 360, height: 640, mobile: true, label: 'phone-360' },
      { width: 393, height: 852, mobile: true, label: 'phone-393' },
      { width: 1280, height: 900, mobile: false, label: 'desktop-1280' }
    ]) {
      await devtools.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width, height: viewport.height, deviceScaleFactor: 1,
        mobile: viewport.mobile, screenWidth: viewport.width, screenHeight: viewport.height
      });
      await devtools.send('Page.navigate', { url: address });
      await retry(async () => await devtools.eval(`document.readyState === 'complete' &&
        !!document.getElementById('question-text') &&
        document.getElementById('question-text').textContent !== 'Ready for your first question?'`));

      const metrics = await devtools.eval(`(() => {
        const ids = ['tab-study','tab-simulator','tab-decks','reveal-button','skip-button',
                     'session-limit','topic-limit','new-limit','strategy-select','replan-button',
                     'export-button','export-csv-button','export-tsv-button','export-md-button','import-trigger','lang-toggle'];
        return {
          viewport: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          question: document.getElementById('question-text').textContent,
          controls: ids.map(id => {
            const el = document.getElementById(id);
            const r = el.getBoundingClientRect();
            return { id, width: r.width, left: r.left, right: r.right };
          })
        };
      })()`);
      if (metrics.viewport !== viewport.width) {
        throw new Error(viewport.label + ' viewport width differs: ' + JSON.stringify(metrics));
      }
      if (metrics.scrollWidth > metrics.viewport + 1) {
        throw new Error(viewport.label + ' has horizontal scrolling: ' + JSON.stringify(metrics));
      }
      for (const control of metrics.controls) {
        if (control.width < 42 || control.left < -1 || control.right > metrics.viewport + 1) {
          throw new Error(viewport.label + ' inaccessible control: ' + JSON.stringify(control));
        }
      }

      const screenshot = await devtools.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const filename = 'artifacts/screenshots/fark-' + viewport.label + '.png';
      await writeFile(filename, Buffer.from(screenshot.data, 'base64'));

      const interaction = await devtools.eval(`(() => {
        const first = document.getElementById('question-text').textContent;
        document.getElementById('skip-button').click();
        const skip = document.getElementById('notice').textContent;
        document.getElementById('reveal-button').click();
        const revealed = !document.getElementById('answer-panel').hidden;
        const focused = document.activeElement?.id;
        document.getElementById('rating-again').click();
        return { first, skip, revealed, focused, progress: document.getElementById('session-counter').textContent };
      })()`);
      if (!interaction.skip.includes('No review was recorded') ||
          !interaction.revealed || interaction.focused !== 'rating-again') {
        throw new Error(viewport.label + ' interaction failed: ' + JSON.stringify(interaction));
      }

      const studioChecks = await devtools.eval(`(() => {
        document.getElementById('tab-simulator').click();
        const simOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
        const simRows = document.querySelectorAll('#sim-results .sim-row').length;
        const seqRows = document.querySelectorAll('#seq-results .seq-row').length;
        const simRunBtn = document.getElementById('run-sim-btn').getBoundingClientRect();

        document.getElementById('tab-decks').click();
        const deckOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
        const deckIds = ['pack-starter','pack-cs','pack-biology','pack-language','add-card-submit','deck-search','deck-topic-filter'];
        const deckControls = deckIds.map(id => {
          const r = document.getElementById(id).getBoundingClientRect();
          return { id, width: r.width, left: r.left, right: r.right };
        });
        document.getElementById('pack-cs').click();
        document.getElementById('tab-study').click();
        const csQuestion = document.getElementById('question-text').textContent;
        return { simOverflow, simRows, seqRows, simRunWidth: simRunBtn.width, deckOverflow, deckControls, csQuestion };
      })()`);
      if (studioChecks.simOverflow || studioChecks.simRows !== 4 || studioChecks.seqRows !== 4 || studioChecks.simRunWidth < 42) {
        throw new Error(viewport.label + ' simulator tab failed: ' + JSON.stringify(studioChecks));
      }
      if (studioChecks.deckOverflow) {
        throw new Error(viewport.label + ' decks tab has horizontal overflow: ' + JSON.stringify(studioChecks));
      }
      for (const control of studioChecks.deckControls) {
        if (control.width < 42 || control.left < -1 || control.right > viewport.width + 1) {
          throw new Error(viewport.label + ' decks tab inaccessible control: ' + JSON.stringify(control));
        }
      }
      if (!studioChecks.csQuestion.includes('[ ___ ]')) {
        throw new Error(viewport.label + ' CS Cloze pack failed to render blanks: ' + JSON.stringify(studioChecks));
      }
      console.log(viewport.label + ' passed: 3-tab Studio QA, no overflow, visible controls, skip+rating+cloze, screenshot saved');
    }
    if (devtools.exceptions.length) {
      throw new Error('Browser JavaScript exceptions: ' + devtools.exceptions.join('; '));
    }
  } finally {
    devtools?.close();
    chrome.kill('SIGTERM');
    // Chrome may still be writing its temporary profile after SIGTERM.
    // Wait for exit before cleanup; a temporary-directory race must not
    // turn an otherwise successful browser QA run into a false failure.
    if (chrome.exitCode === null && chrome.signalCode === null) {
      await Promise.race([
        new Promise(resolve => chrome.once('exit', resolve)),
        delay(3000)
      ]);
    }
    await new Promise(resolve => server.close(resolve));
    try {
      await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
    } catch (error) {
      console.warn('Temporary Chromium profile cleanup warning:', error.message);
    }
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
