import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { exportStudyDeck } from '../src/portable.js';
import { buildSamplePack } from '../src/interchange.js';
import { MAX_MCP_MESSAGE_BYTES } from '../src/mcp.js';

const CLI = fileURLToPath(new URL('../bin/fark.js', import.meta.url));

function runStdioClient(lines) {
  const execution = spawnSync(process.execPath, [CLI, 'mcp'], {
    input: lines.join('\\n') + '\\n',
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
    timeout: 20_000
  });
  assert.equal(execution.error, undefined, String(execution.error));
  assert.equal(execution.status, 0, execution.stderr);
  assert.match(execution.stderr, /MCP v/);
  const messages = execution.stdout.trim().split('\\n').filter(Boolean).map(JSON.parse);
  return messages;
}

test('MCP CLI subprocess completes initialization and tool discovery without stdout contamination', () => {
  const ping = { jsonrpc: '2.0', id: 1, method: 'ping' };
  const result = runStdioClient([
    JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'initialize', params: {} }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    JSON.stringify({ jsonrpc: '2.0', id: 11, method: 'tools/list' }),
    JSON.stringify(ping)
  ]);
  assert.deepEqual(result.map(x => x.id), [10, 11, 1]);
  assert.equal(result[0].result.serverInfo.name, 'fark-study-engine');
  assert.equal(result[0].result.protocolVersion, '2024-11-05');
  assert.equal(result[1].result.tools.length, 13);
  assert.deepEqual(result[2].result, {});
});

test('MCP CLI subprocess executes a synthetic tool call and returns a tool error safely', () => {
  const deckText = exportStudyDeck(buildSamplePack('starter', '2026-11-13T12:00:00.000Z'));
  const result = runStdioClient([
    JSON.stringify({
      jsonrpc: '2.0', id: 31, method: 'tools/call',
      params: { name: 'fark_validate_deck', arguments: { deckText, format: 'json' } }
    }),
    JSON.stringify({
      jsonrpc: '2.0', id: 32, method: 'tools/call',
      params: { name: 'fark_validate_deck', arguments: { deckText: 100, format: 'json' } }
    })
  ]);
  assert.deepEqual(result.map(x => x.id), [31, 32]);
  assert.equal(result[0].result.isError, false);
  assert.equal(result[1].result.isError, true);
});

test('MCP CLI subprocess recovers from oversized payload, malformed JSON and missing methods', () => {
  const result = runStdioClient([
    'x'.repeat(MAX_MCP_MESSAGE_BYTES + 1),
    '{not json',
    JSON.stringify({ jsonrpc: '2.0', id: 44 }),
    JSON.stringify({ jsonrpc: '2.0', id: 45, method: 'ping' })
  ]);
  assert.equal(result.length, 4);
  assert.deepEqual(result.map(x => x.id), [null, null, 44, 45]);
  assert.equal(result[0].error.code, -32600);
  assert.equal(result[1].error.code, -32700);
  assert.equal(result[2].error.code, -32600);
  assert.deepEqual(result[3].result, {});
});
