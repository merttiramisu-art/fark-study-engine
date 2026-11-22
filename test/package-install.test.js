import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = fileURLToPath(new URL('../', import.meta.url));
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function npmOffline(args, cwd) {
  const result = spawnSync(npmCommand, args, {
    cwd,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      npm_config_offline: 'true',
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_update_notifier: 'false'
    }
  });
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.status, 0, `npm ${args[0]} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

test('packaged FARK installs offline in an independent Node consumer project', () => {
  const root = mkdtempSync(join(tmpdir(), 'fark-offline-consumer-'));
  try {
    const packed = JSON.parse(npmOffline([
      'pack', '--json', '--offline', '--ignore-scripts', '--pack-destination', root
    ], REPOSITORY));
    assert.equal(packed.length, 1);
    assert.equal(packed[0].name, 'fark-study-engine');
    const archive = join(root, packed[0].filename);
    const consumer = join(root, 'consumer');
    mkdirSync(consumer);
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({
      private: true, type: 'module', name: 'fark-offline-test-consumer'
    }));
    npmOffline([
      'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund',
      '--no-package-lock', '--prefix', consumer, archive
    ], consumer);
    writeFileSync(join(consumer, 'main.mjs'), `
import { createCard, reviewCard, getStudySummary } from 'fark-study-engine';
import { MCP_TOOLS } from 'fark-study-engine/mcp';
import { importOpenContentPack } from 'fark-study-engine/content-adapter';
import { importMarkdownContentPack } from 'fark-study-engine/markdown-content';
import { compareFractionModels } from 'fark-study-engine/visual-math';
const pack = importOpenContentPack({
  format: 'fark-open-content-pack', version: 1,
  attribution: { title: 'Local sample', creator: 'FARK contributors', license: 'MIT' },
  units: [{ id: 'math', label: 'Original math' }],
  outcomes: [{ id: 'fractions', unitId: 'math', label: 'Fractions' }],
  lessons: [{ id: 'viz', revision: '1', title: 'Fraction picture',
    bodyText: 'Compare equal wholes', outcomeIds: ['fractions'],
    visual: { kind: 'fraction-comparison',
      left: { numerator: 1, denominator: 3 },
      right: { numerator: 1, denominator: 4 }
    }
  }],
  questions: [{ id: 'q1', revision: '1', outcomeIds: ['fractions'],
    prompt: 'Choose the larger fraction', correctChoiceId: 'a',
    choices: [{ id: 'a', text: '1/3' }, { id: 'b', text: '1/4' }]
  }]
});
const sampleMarkdown = [
  '# FARK Content Pack', 'version: 1',
  'title: Offline sample', 'creator: FARK contributors', 'license: MIT',
  '## Unit: math', 'label: Original math',
  '## Outcome: fractions', 'unitId: math', 'label: Fractions',
  '## Lesson: viz', 'revision: 1', 'title: Fraction picture',
  'outcomeIds: fractions', 'visualLeft: 1/3', 'visualRight: 1/4',
  '### Body', 'Compare equal wholes',
  '## Question: question-1', 'revision: 1', 'outcomeIds: fractions',
  'prompt: Which fraction is larger?', 'correctChoiceId: a',
  '- a | 1/3', '- b | 1/4'
].join(String.fromCharCode(10));
const markdownPack = importMarkdownContentPack(sampleMarkdown);
const visualSpec = pack.materials.lessons[0].visual;
const visual = compareFractionModels(visualSpec.left, visualSpec.right);
const visualBridgeEqual = JSON.stringify(visualSpec) ===
  JSON.stringify(markdownPack.materials.lessons[0].visual);
const card = createCard({ id: 'c', topic: 'Math', question: '2+2?', answer: '4' });
const reviewed = reviewCard(card, 'good', '2026-01-01T00:00:00.000Z');
const summary = getStudySummary([reviewed], '2026-01-02T00:00:00.000Z');
console.log(JSON.stringify({ totalReviews: summary.totalReviews, tools: MCP_TOOLS.length, unchanged: card.reviews === 0, importedQuestions: pack.core.questions.length, contentLicense: pack.attribution.license, markdownQuestions: markdownPack.core.questions.length, visualComparison: visual.label, visualBridgeEqual }));
`);
    const execution = spawnSync(process.execPath, [join(consumer, 'main.mjs')], {
      cwd: consumer, encoding: 'utf8', timeout: 12_000, maxBuffer: 1024 * 1024
    });
    assert.equal(execution.error, undefined, String(execution.error));
    assert.equal(execution.status, 0, execution.stderr);
    assert.equal(execution.stderr, '');
    assert.deepEqual(JSON.parse(execution.stdout), {
      totalReviews: 1, tools: 13, unchanged: true, importedQuestions: 1, contentLicense: 'MIT', markdownQuestions: 1, visualComparison: '1/3 > 1/4', visualBridgeEqual: true
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
