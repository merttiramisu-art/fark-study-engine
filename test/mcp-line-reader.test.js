import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { readBoundedLines } from '../src/mcp-line-reader.js';

async function readChunks(chunks, max = 32) {
  const input = new PassThrough();
  const result = [];
  const reading = (async () => {
    for await (const line of readBoundedLines(input, max)) result.push(line);
  })();
  for (const chunk of chunks) input.write(chunk);
  input.end();
  await reading;
  return result;
}

test('bounded MCP line reader enforces exact byte limits and recovers', async () => {
  assert.deepEqual(await readChunks([
    'a'.repeat(31) + '\n', 'b'.repeat(32) + '\n',
    'c'.repeat(33) + '\n', 'ok\n'
  ]), [{ line: 'a'.repeat(31) }, { line: 'b'.repeat(32) }, { oversized: true }, { line: 'ok' }]);
});

test('bounded MCP line reader discards large single chunks without retaining line', async () => {
  assert.deepEqual(await readChunks(['z'.repeat(4_000_000) + '\nnext\n']),
    [{ oversized: true }, { line: 'next' }]);
});

test('bounded MCP line reader handles split UTF-8 and CRLF', async () => {
  const input = Buffer.from('ö\r\n😀\n');
  assert.deepEqual(await readChunks([...input].map(byte => Buffer.from([byte]))),
    [{ line: 'ö' }, { line: '😀' }]);
});

test('bounded MCP line reader handles partial EOF and oversized EOF', async () => {
  assert.deepEqual(await readChunks(['last']), [{ line: 'last' }]);
  assert.deepEqual(await readChunks(['x'.repeat(40)]), [{ oversized: true }]);
  assert.deepEqual(await readChunks([]), []);
});

test('bounded MCP line reader recovers after oversized split chunks', async () => {
  assert.deepEqual(await readChunks(['a'.repeat(30), 'b'.repeat(30), '\n', 'valid\n']),
    [{ oversized: true }, { line: 'valid' }]);
});
