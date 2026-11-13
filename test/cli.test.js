import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCard, reviewCard } from '../src/index.js';
import { exportStudyDeck } from '../src/portable.js';
import { runCli, CLI_VERSION } from '../src/cli.js';

const NOW = '2026-11-13T12:00:00.000Z';

function makeMemoryIo(files = {}) {
  const store = new Map(Object.entries(files));
  const out = [];
  const err = [];
  return {
    store,
    out,
    err,
    io: {
      async readText(path) {
        if (!store.has(path)) throw new Error(`ENOENT: ${path}`);
        return store.get(path);
      },
      async writeText(path, text) {
        store.set(path, text);
      },
      stdout(text) { out.push(text); },
      stderr(text) { err.push(text); }
    }
  };
}

test('CLI prints help and version cleanly', async () => {
  const { out, err, io } = makeMemoryIo();
  assert.equal(await runCli(['--version'], io), 0);
  assert.equal(out[0], CLI_VERSION);
  assert.equal(await runCli(['--help'], io), 0);
  assert.match(out[1], /Usage:/);
  assert.equal(err.length, 0);
});

test('CLI validates, summarizes, plans, and forecasts JSON and CSV decks', async () => {
  const cards = [
    reviewCard(createCard({ id: 'm1', topic: 'Math', question: '2+2?', answer: '4' }), 'again', '2026-11-12T12:00:00Z', { reason: 'attention' }),
    reviewCard(createCard({ id: 's1', topic: 'Science', question: 'H2O?', answer: 'Water' }), 'good', NOW),
    createCard({ id: 'h1', topic: 'History', question: '1453?', answer: 'Istanbul' })
  ];
  const { out, err, io } = makeMemoryIo({
    'deck.json': exportStudyDeck(cards),
    'sheet.csv': 'topic,question,answer\nPhysics,F=ma?,Newton\n'
  });

  assert.equal(await runCli(['validate', 'deck.json'], io), 0);
  assert.match(out[0], /Valid json deck: 3 card\(s\) across 3 topic\(s\)/);

  assert.equal(await runCli(['validate', 'sheet.csv', '--json'], io), 0);
  assert.deepEqual(JSON.parse(out[1]), { valid: true, format: 'csv', cards: 1, topics: 1 });

  assert.equal(await runCli(['summary', 'deck.json', '--at', NOW, '--json'], io), 0);
  const summaryPayload = JSON.parse(out[2]);
  assert.equal(summaryPayload.summary.total, 3);
  assert.equal(summaryPayload.mistakes.byReason.attention, 1);

  assert.equal(await runCli(['plan', 'deck.json', '--at', NOW, '--limit', '2', '--json'], io), 0);
  const planPayload = JSON.parse(out[3]);
  assert.equal(planPayload.plannedCount, 2);

  assert.equal(await runCli(['forecast', 'deck.json', '--at', NOW, '--days', '3', '--json'], io), 0);
  const forecastPayload = JSON.parse(out[4]);
  assert.equal(forecastPayload.schedule[0].dueCount, 1);
  assert.equal(forecastPayload.unreviewed, 1);
  assert.equal(forecastPayload.dueNow, 1);
  assert.equal(err.length, 0);
});

test('CLI converts between CSV and JSON decks with --out and --escape-formulas', async () => {
  const { store, out, err, io } = makeMemoryIo({
    'raw.csv': 'id,topic,question,answer\nm-1,Math,=1+1,2\n'
  });

  assert.equal(await runCli(['convert', 'raw.csv', '--to', 'json', '--out', 'raw.json'], io), 0);
  assert.match(out[0], /Converted 1 card\(s\) from csv to json/);
  assert.equal(await runCli(['convert', 'raw.json', '--to', 'csv', '--escape-formulas'], io), 0);
  assert.match(out[1], /'=1\+1/);
  assert.ok(store.has('raw.json'));
  assert.equal(err.length, 0);
});

test('CLI rejects bad flags, missing files, and invalid arguments with exit code 1', async () => {
  const { err, io } = makeMemoryIo({ 'bad.json': '{not-json}' });
  assert.equal(await runCli([], io), 1);
  assert.equal(await runCli(['unknown-cmd', 'bad.json'], io), 1);
  assert.equal(await runCli(['plan', 'bad.json', '--days', '5'], io), 1);
  assert.equal(await runCli(['forecast', 'bad.json', '--days', '0'], io), 1);
  assert.equal(await runCli(['validate', 'bad.json'], io), 1);
  assert.equal(await runCli(['convert', 'bad.json', '--to', 'json', '--escape-formulas'], io), 1);
  assert.equal(err.length, 6);
});

test('bin/fark.js executes end-to-end as a Node CLI process', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'fark-cli-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const csvPath = join(dir, 'cards.csv');
  const jsonPath = join(dir, 'cards.json');
  await writeFile(csvPath, 'topic,question,answer\nMath,6*7?,42\n', 'utf8');

  const conv = spawnSync(
    process.execPath,
    ['bin/fark.js', 'convert', csvPath, '--to', 'json', '--out', jsonPath],
    { encoding: 'utf8' }
  );
  assert.equal(conv.status, 0, conv.stderr);
  const written = await readFile(jsonPath, 'utf8');
  assert.match(written, /"format": "fark-study-deck"/);

  const check = spawnSync(
    process.execPath,
    ['bin/fark.js', 'validate', jsonPath],
    { encoding: 'utf8' }
  );
  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /Valid json deck: 1 card\(s\)/);
});
