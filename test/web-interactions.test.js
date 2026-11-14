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
  change() { this.listeners.get('change')?.({ preventDefault() {} }); }
  submit() { this.listeners.get('submit')?.({ preventDefault() {} }); }
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
  node('reason-aware-toggle').checked = true;
  node('reverse-toggle').checked = false;
  node('sim-cards').value = '30';
  node('sim-days').value = '30';
  node('sim-limit').value = '20';
  node('sim-profile').value = 'steady';
  const ratings = ['again', 'hard', 'good', 'easy'].map(rating => {
    const element = node('rating-' + rating);
    element.dataset.rating = rating;
    return element;
  });
  const packs = [
    ['pack-starter', 'starter'],
    ['pack-english', 'english'],
    ['pack-cs', 'computer-science'],
    ['pack-biology', 'biology'],
    ['pack-language', 'language']
  ].map(([id, pack]) => {
    const el = node(id);
    el.dataset.pack = pack;
    return el;
  });
  const doc = {
    getElementById: node,
    createElement: tag => new FakeElement(tag),
    querySelectorAll: query => query === '[data-rating]' ? ratings : query === '[data-pack]' ? packs : [],
    body: new FakeElement('body')
  };
  return { doc, node };
}

test('skip never grades or reschedules; a rated answer does; finish receives focus', async () => {
  const { createCard } = await import('../src/index.js');
  const { createLedger, exportLedger, recordLedgerReview } = await import('../src/ledger.js');
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const { doc, node } = createFakeDocument();
  const storageMap = new Map();
  let exportedBlob;
  globalThis.document = doc;
  globalThis.window = {
    localStorage: {
      getItem: key => (storageMap.has(key) ? storageMap.get(key) : null),
      setItem: (key, val) => storageMap.set(key, String(val)),
      removeItem: key => storageMap.delete(key)
    }
  };
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

    node('card-topic').value = 'Physics';
    node('card-question').value = 'SI unit of force?';
    node('card-answer').value = 'Newton';
    node('add-card-form').submit();
    const afterAdd = await exportDeck();
    assert.equal(afterAdd.length, 10);
    assert.ok(afterAdd.some(c => c.topic === 'Physics' && c.question === 'SI unit of force?'));

    node('export-csv-button').click();
    const csvText = await exportedBlob.text();
    assert.match(csvText, /^id,topic,question,answer/);
    assert.match(csvText, /Physics,SI unit of force\?,Newton/);

    node('lang-toggle').click();
    assert.equal(node('lang-toggle').textContent, 'EN');
    assert.match(node('add-card-heading').textContent, /Kendi kartını ekle/);
    node('lang-toggle').click();
    assert.equal(node('lang-toggle').textContent, 'TR');

    node('strategy-select').value = 'intensive';
    node('reason-aware-toggle').checked = false;
    node('reveal-button').click();
    node('rating-good').click();
    const afterIntensive = await exportDeck();
    const reviewed = afterIntensive.find(c => c.lastReviewedAt && Date.parse(c.dueAt) - Date.parse(c.lastReviewedAt) === 12 * 3600 * 1000);
    assert.ok(reviewed, 'intensive strategy box-1 good should schedule 12h interval');
    node('reason-aware-toggle').checked = true;

    node('bulk-input').value = '## Astronomy\n- Nearest star to Earth? :: Sun\n- Planet with rings? :: Saturn';
    node('bulk-import-btn').click();
    const afterBulk = await exportDeck();
    assert.equal(afterBulk.length, 12);

    node('export-md-button').click();
    const mdText = await exportedBlob.text();
    assert.match(mdText, /^# FARK Study Sheet/);
    assert.match(mdText, /## Astronomy/);

    node('export-tsv-button').click();
    const tsvText = await exportedBlob.text();
    assert.match(tsvText, /^topic\tquestion\tanswer/);
    assert.match(tsvText, /Astronomy\tNearest star to Earth\?\tSun/);

    node('tab-simulator').click();
    assert.equal(node('panel-simulator').hidden, false);
    assert.equal(node('panel-study').hidden, true);
    assert.equal(node('tab-simulator').attributes.get('aria-selected'), 'true');
    assert.equal(node('sim-results').children.length, 5);
    assert.equal(node('seq-results').children.length, 5);

    node('tab-intelligence').click();
    assert.equal(node('panel-intelligence').hidden, false);
    assert.equal(node('panel-simulator').hidden, true);
    assert.equal(node('tab-intelligence').attributes.get('aria-selected'), 'true');
    assert.ok(node('intel-concept-list').children.length >= 4);
    assert.ok(node('intel-diagnosis-list').children.length >= 1, 'starter pack should flag prerequisite diagnosis');

    const firstDiagBox = node('intel-diagnosis-list').children[0];
    const sealBtn = firstDiagBox.children.at(-1);
    assert.equal(sealBtn.id, 'button');
    sealBtn.click();
    assert.equal(node('intel-intervention-list').children.length, 1);
    assert.match(node('notice').textContent, /Intervention sealed/);

    node('tab-study').click();
    node('reveal-button').click();
    node('rating-good').click();
    node('tab-intelligence').click();
    const intvCard = node('intel-intervention-list').children[0];
    const intvMeta = intvCard.children.map(c => c.textContent).join(' | ');
    assert.match(intvMeta, /Follow-up/);
    assert.notEqual(node('intel-cal-events').textContent, '0');

    node('export-ledger-button').click();
    const exportedLedger = JSON.parse(await exportedBlob.text());
    assert.equal(exportedLedger.format, 'fark-study-ledger');
    assert.ok(exportedLedger.events.some(e => e.type === 'intervention'));
    assert.ok(exportedLedger.events.some(e => e.type === 'review'));

    node('tab-decks').click();
    assert.equal(node('panel-decks').hidden, false);
    node('pack-cs').click();
    const csDeck = await exportDeck();
    assert.equal(csDeck.length, 8);
    node('tab-study').click();
    assert.match(node('question-text').textContent, /\[ ___ \]/);

    node('pack-language').click();
    const normalPrompt = node('question-text').textContent;
    node('reverse-toggle').checked = true;
    node('reverse-toggle').change();
    const reversedPrompt = node('question-text').textContent;
    assert.notEqual(reversedPrompt, normalPrompt);
    node('reverse-toggle').checked = false;
    node('reverse-toggle').change();
    node('strategy-select').value = 'sm2';
    node('strategy-select').change();
    assert.match(node('strategy-note').textContent, /1\.3–2\.8 EF/);

    node('tab-decks').click();
    node('pack-english').click();
    const englishDeck = await exportDeck();
    assert.equal(englishDeck.length, 10);
    assert.ok(englishDeck.some(c => c.topic === 'English: Core Verbs'));

    node('tab-intelligence').click();
    assert.ok(node('intel-diagnosis-list').children.length >= 1, 'English pack should diagnose prerequisite bottleneck');

    node('prereq-child-topic').value = 'English: Phrasal Verbs & Reading';
    node('prereq-parent-topic').value = 'English: Core Verbs';
    node('prereq-form').submit();
    assert.match(node('notice').textContent, /Linked prerequisite/);

    node('prereq-child-topic').value = 'English: Core Verbs';
    node('prereq-parent-topic').value = 'English: Tenses';
    node('prereq-form').submit();
    assert.match(node('notice').textContent, /Could not link prerequisite/);

    node('persist-local-toggle').checked = true;
    node('persist-local-toggle').change();
    assert.equal(storageMap.get('fark-study-studio-persist-v07'), '1');
    assert.match(node('notice').textContent, /Local device persistence enabled/);

    node('calibrate-button').click();
    assert.match(node('intel-cal-note').textContent, /Need at least 8 repeat predictions/);

    const baseCards = [
      createCard({ id: 'cal-1', topic: 'English: Core Verbs', question: 'V1?', answer: 'A1' }),
      createCard({ id: 'cal-2', topic: 'English: Tenses', question: 'T1?', answer: 'A2' })
    ];
    let richLedger = createLedger({ cards: baseCards, createdAt: '2026-01-01T09:00:00Z' });
    for (let day = 1; day <= 6; day++) {
      const ts1 = new Date(Date.UTC(2026, 0, day * 2, 9, 0, 0));
      const ts2 = new Date(Date.UTC(2026, 0, day * 2, 10, 0, 0));
      richLedger = recordLedgerReview(richLedger, 'cal-1', day % 2 === 0 ? 'again' : 'good', ts1, day % 2 === 0 ? { reason: 'misconception' } : {}).ledger;
      richLedger = recordLedgerReview(richLedger, 'cal-2', day % 2 === 0 ? 'good' : 'again', ts2, day % 2 === 0 ? {} : { reason: 'attention' }).ledger;
    }
    const richJson = exportLedger(richLedger);
    await node('import-file').listeners.get('change')({
      target: {
        files: [{ name: 'rich-ledger.json', size: richJson.length, type: 'application/json', async text() { return richJson; } }],
        value: 'rich-ledger.json'
      }
    });
    node('calibrate-button').click();
    assert.match(node('notice').textContent, /Calibrated personal DSR/);
    assert.match(node('intel-cal-note').textContent, /Active personal DSR fit/);

    node('persist-local-toggle').checked = false;
    node('persist-local-toggle').change();
    assert.equal(storageMap.size, 0);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});
