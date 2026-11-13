import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { exportStudyDeck } from '../src/portable.js';
import { buildSamplePack } from '../src/interchange.js';
import { MCP_TOOLS, handleMcpRequest, startMcpServer } from '../src/mcp.js';

const NOW = '2026-11-13T12:00:00.000Z';

test('MCP handles initialize, notifications, ping, tools/list, and validation errors', () => {
  const init = handleMcpRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  assert.equal(init.result.serverInfo.name, 'fark-study-engine');
  assert.equal(init.result.protocolVersion, '2024-11-05');

  assert.equal(handleMcpRequest({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  assert.deepEqual(handleMcpRequest({ jsonrpc: '2.0', id: 2, method: 'ping' }), { jsonrpc: '2.0', id: 2, result: {} });

  const listed = handleMcpRequest({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
  assert.equal(listed.result.tools.length, MCP_TOOLS.length);
  assert.equal(MCP_TOOLS.length, 7);

  const missingMethod = handleMcpRequest({ jsonrpc: '2.0', id: 4, method: 'bogus/method' });
  assert.equal(missingMethod.error.code, -32601);

  const badRpc = handleMcpRequest({ id: 5 });
  assert.equal(badRpc.error.code, -32600);
});

test('MCP executes all 7 study tools accurately and returns isError on invalid payloads', () => {
  const deckJson = exportStudyDeck(buildSamplePack('starter', NOW));

  const validateRes = handleMcpRequest({
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: { name: 'fark_validate_deck', arguments: { deckText: deckJson, format: 'json' } }
  });
  assert.equal(validateRes.result.isError, false);
  assert.equal(JSON.parse(validateRes.result.content[0].text).cards, 9);

  const summaryRes = handleMcpRequest({
    jsonrpc: '2.0',
    id: 11,
    method: 'tools/call',
    params: { name: 'fark_get_study_summary', arguments: { deckText: deckJson, format: 'json', at: NOW } }
  });
  const summaryData = JSON.parse(summaryRes.result.content[0].text);
  assert.equal(summaryData.summary.total, 9);
  assert.ok(Array.isArray(summaryData.recommendations));

  const planRes = handleMcpRequest({
    jsonrpc: '2.0',
    id: 12,
    method: 'tools/call',
    params: { name: 'fark_plan_session', arguments: { deckText: deckJson, format: 'json', at: NOW, limit: 4, reasonAware: true } }
  });
  assert.equal(JSON.parse(planRes.result.content[0].text).plannedCount, 4);

  const forecastRes = handleMcpRequest({
    jsonrpc: '2.0',
    id: 13,
    method: 'tools/call',
    params: { name: 'fark_forecast_workload', arguments: { deckText: deckJson, format: 'json', at: NOW, days: 7 } }
  });
  assert.equal(JSON.parse(forecastRes.result.content[0].text).schedule.length, 7);

  const compareRes = handleMcpRequest({
    jsonrpc: '2.0',
    id: 14,
    method: 'tools/call',
    params: { name: 'fark_compare_strategies', arguments: { steps: ['good', 'again', 'good'], startAt: NOW } }
  });
  assert.equal(JSON.parse(compareRes.result.content[0].text).strategies.length, 4);

  const simRes = handleMcpRequest({
    jsonrpc: '2.0',
    id: 15,
    method: 'tools/call',
    params: { name: 'fark_simulate_cohort', arguments: { cardsCount: 15, days: 10, seed: 7 } }
  });
  assert.equal(JSON.parse(simRes.result.content[0].text).results.length, 4);

  const convertRes = handleMcpRequest({
    jsonrpc: '2.0',
    id: 16,
    method: 'tools/call',
    params: { name: 'fark_convert_deck', arguments: { deckText: deckJson, from: 'json', to: 'tsv' } }
  });
  assert.match(JSON.parse(convertRes.result.content[0].text).output, /^topic\tquestion\tanswer/);

  const badTool = handleMcpRequest({
    jsonrpc: '2.0',
    id: 17,
    method: 'tools/call',
    params: { name: 'fark_validate_deck', arguments: { deckText: '{broken', format: 'json' } }
  });
  assert.equal(badTool.result.isError, true);
});

test('startMcpServer streams newline-delimited JSON-RPC replies over stdio streams', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const errorOutput = new PassThrough();

  const chunks = [];
  output.on('data', (chunk) => chunks.push(chunk.toString('utf8')));

  const serverPromise = startMcpServer({ input, output, errorOutput });
  input.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }) + '\n');
  input.write('{bad json}\n');
  input.end();
  await serverPromise;

  const lines = chunks.join('').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines.length, 2);
  assert.equal(lines[0].id, 1);
  assert.deepEqual(lines[0].result, {});
  assert.equal(lines[1].error.code, -32700);
});
