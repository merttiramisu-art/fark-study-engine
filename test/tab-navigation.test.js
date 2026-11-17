import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTabIndex } from '../examples/web/tab-navigation.js';

test('tab navigation wraps in both directions', () => {
  assert.equal(nextTabIndex('ArrowRight', 3, 4), 0);
  assert.equal(nextTabIndex('ArrowLeft', 0, 4), 3);
});
test('Home and End select boundaries', () => {
  assert.equal(nextTabIndex('Home', 2, 4), 0);
  assert.equal(nextTabIndex('End', 1, 4), 3);
});
test('unhandled keys do not move focus', () => {
  assert.equal(nextTabIndex('Enter', 1, 4), null);
  assert.equal(nextTabIndex('Tab', 1, 4), null);
});
test('invalid tab positions are rejected', () => {
  assert.throws(() => nextTabIndex('Home', -1, 4), RangeError);
  assert.throws(() => nextTabIndex('Home', 4, 4), RangeError);
  assert.throws(() => nextTabIndex('Home', 0, 0), RangeError);
});
