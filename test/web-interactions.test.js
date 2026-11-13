import test from 'node:test';
import assert from 'node:assert/strict';

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.textContent = '';
    this.hidden = false;
    this.value = '';
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.classList = { add() {}, remove() {} };
    this.focusCount = 0;
  }
  addEventListener(event, callback) { this.listeners.set(event, callback); }
  click() { this.listeners.get('click')?.({ preventDefault() {} }); }
  focus() { this.focusCount++; }
  setAttribute(key, value) { this.attributes.set(key, String(value)); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  remove() {}
}

function createFakeDocument() {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, new FakeElement(id));
    return nodes.get(id);
  };
  node('session-limit').value = '6';
  node('topic-limit').value = '2';
  node('new-limit').value = '2';
  node('mistake-reason').value = '';
  const ratings = ['again', 'hard', 'good', 'easy'].map(rating => {
    const element = node('rating-' + rating);
    element.dataset.rating = rating;
    return element;
  });
  const doc = {
    getElementById: node,
    createElement: tag => new FakeElement(tag),
    querySelectorAll: query => query === '[data-rating]' ? ratings : [],
    body: new FakeElement('body')
  };
  return { doc, node };
}

test('skip never grades or reschedules; a rated answer does; finish receives focus', async () => {
  const previousDocument = globalThis.document;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const { doc, node } = createFakeDocument();
  let exportedBlob;
  globalThis.document = doc;
  URL.createObjectURL = blob => { exportedBlob = blob; return 'blob:fake'; };
  URL.revokeObjectURL = () => {};
  globalThis.setTimeout = () => 1;
  globalThis.clearTimeout = () => {};
  try {
    await import('../examples/web/app.js');
    const exportDeck = async () => {
      node('export-button').click();
      return JSON.parse(await exportedBlob.text()).cards;
    };
    const original = await exportDeck();
    assert.equal(original.length, 9);
    const firstQuestion = node('question-text').textContent;
    const firstCard = original.find(card => card.question === firstQuestion);
    assert.ok(firstCard);
    node('skip-button').click();
    assert.match(node('notice').textContent, /No review was recorded/);
    assert.match(node('session-description').textContent, /1 skipped/);
    assert.equal(node('progress-bar').attributes.get('aria-valuenow'), '1');
    const afterSkip = await exportDeck();
    assert.deepEqual(afterSkip, original, 'skipping must not change card data or counters');

    const secondQuestion = node('question-text').textContent;
    const secondCard = afterSkip.find(card => card.question === secondQuestion);
    assert.ok(secondCard);
    node('reveal-button').click();
    assert.equal(node('answer-panel').hidden, false);
    assert.ok(node('rating-again').focusCount > 0);
    node('rating-good').click();
    const afterRating = await exportDeck();
    assert.equal(afterRating.find(card => card.id === secondCard.id).reviews, secondCard.reviews + 1);
    assert.deepEqual(afterRating.find(card => card.id === firstCard.id), firstCard);

    while (node('question-content').hidden === false) node('skip-button').click();
    assert.equal(node('finished-content').hidden, false);
    assert.ok(node('finish-heading').focusCount >= 1);
    assert.match(node('finish-description').textContent, /1 rated/);
    assert.match(node('finish-description').textContent, /skipped/);
    const afterAllSkips = await exportDeck();
    assert.deepEqual(afterAllSkips, afterRating);
  } finally {
    globalThis.document = previousDocument;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});
