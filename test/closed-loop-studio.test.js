import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initClosedLoopStudio } from '../examples/web/closed-loop-controller.js';

class MiniElement {
  constructor(id = '') {
    this.id = id;
    this.textContent = '';
    this.hidden = false;
    this.value = '';
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.classes = new Set();
    this.classList = {
      add: c => this.classes.add(c),
      remove: c => this.classes.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classes.has(c)) this.classes.delete(c);
          else this.classes.add(c);
        } else if (force) this.classes.add(c);
        else this.classes.delete(c);
      },
      contains: c => this.classes.has(c)
    };
  }
  addEventListener(type, fn) {
    this.listeners.set(type, fn);
  }
  click() {
    this.listeners.get('click')?.({ preventDefault() {} });
  }
  change() {
    this.listeners.get('change')?.({ preventDefault() {} });
  }
  input() {
    this.listeners.get('input')?.({ preventDefault() {} });
  }
  submit() {
    this.listeners.get('submit')?.({ preventDefault() {} });
  }
  setAttribute(k, v) {
    this.attributes.set(k, String(v));
  }
  append(...items) {
    this.children.push(...items);
  }
  replaceChildren(...items) {
    this.children = [...items];
  }
}

function findAll(node, predicate, out = []) {
  if (!node) return out;
  if (predicate(node)) out.push(node);
  for (const child of node.children ?? []) findAll(child, predicate, out);
  return out;
}

test('closed-loop studio HTML contains every element referenced by closed-loop-controller.js', async () => {
  const html = await readFile('examples/web/index.html', 'utf8');
  const js = await readFile('examples/web/closed-loop-controller.js', 'utf8');
  const ids = [...js.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]);
  const missing = [...new Set(ids)].filter(id => !html.includes(`id="${id}"`));
  assert.deepEqual(missing, [], 'every closed-loop controller element ID must exist in index.html');
});

test('full end-to-end closed-loop studio flow: baseline miss -> micro-lesson -> issued reassessment -> concept map -> lesson designer', async () => {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, new MiniElement(id));
    return nodes.get(id);
  };
  const docEl = new MiniElement('html');
  globalThis.document = {
    documentElement: docEl,
    getElementById: node,
    createElement: tag => new MiniElement(tag)
  };
  const storage = new Map();
  globalThis.window = {
    localStorage: {
      getItem: k => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: k => storage.delete(k)
    }
  };

  let lang = 'en';
  let activeTab = 'study';
  const notices = [];
  const downloads = [];

  try {
    const controller = initClosedLoopStudio({
      getLang: () => lang,
      isPersistEnabled: () => false,
      notify: msg => notices.push(msg),
      downloadText: (name, content) => downloads.push({ name, content }),
      switchTab: tab => { activeTab = tab; }
    });

    // 1. Enter Guided Closed Loop
    node('submode-guided').click();
    assert.equal(node('guided-study-view').hidden, false);
    assert.equal(node('spaced-study-view').hidden, true);

    // 2. Select incorrect distractor choice A ("wrote") + High confidence on baseline item q-eng-v2v3-1
    const baselineChoices = findAll(node('guided-stage'), el => el.className?.includes('cl-choice-btn'));
    const confButtons = findAll(node('guided-stage'), el => el.className?.includes('cl-conf-btn'));
    assert.equal(baselineChoices.length, 3);
    assert.equal(confButtons.length, 3);
    baselineChoices[0].click(); // 'a' (misconception: v2-used-as-v3)
    confButtons[2].click(); // 'high' confidence -> should trigger hypercorrection alert
    const submitBtn1 = findAll(node('guided-stage'), el => el.className?.includes('button-primary'))[0];
    submitBtn1.click();

    // 3. Should transition to Step 2: Micro-Lesson with misconception contrast + hypercorrection signal
    const completeLessonBtn = findAll(node('guided-stage'), el => el.id === 'guided-complete-lesson-btn')[0];
    assert.ok(completeLessonBtn, 'missed baseline must present targeted micro-lesson');
    const hyperCallout = findAll(node('guided-stage'), el => el.className?.includes('cl-callout-hyper'))[0];
    assert.ok(hyperCallout, 'high-confidence error must trigger hypercorrection callout');

    // Save portable session checkpoint while in progress
    node('guided-save-checkpoint').click();
    const checkpointExport = downloads.find(d => d.name === 'fark-learning-session.json');
    assert.ok(checkpointExport, 'should export fark-learning-session checkpoint');
    assert.equal(JSON.parse(checkpointExport.content).format, 'fark-learning-session');

    // 4. Complete micro-lesson -> automatically issues distinct reassessment question q-eng-v2v3-2
    completeLessonBtn.click();
    const reassessChoices = findAll(node('guided-stage'), el => el.className?.includes('cl-choice-btn'));
    assert.equal(reassessChoices.length, 3, 'distinct reassessment question must be issued');

    // Select correct choice C ("been") on q-eng-v2v3-2
    reassessChoices[2].click();
    const submitBtn2 = findAll(node('guided-stage'), el => el.className?.includes('button-primary'))[0];
    submitBtn2.click();

    // 5. Should display verified before/after comparison with honest disclaimer
    const stageText = findAll(node('guided-stage'), () => true).map(el => el.textContent).join(' ');
    assert.match(stageText, /verified-issued-answer/);
    assert.match(stageText, /Correct on distinct follow-up question/);

    // 6. Concept Map, DSR Curve, Metacognitive Calibration SVG & 14-Day Horizon SVG in Learning Intelligence
    controller.onTabChange('intelligence');
    const svgNodes = findAll(node('intel-concept-map'), el => el.attributes.get('role') === 'button');
    assert.equal(svgNodes.length, 4, 'English preset map must render 4 interactive outcome nodes');
    assert.match(node('intel-calibration-summary').textContent, /2 observations/);
    const calAlertsText = findAll(node('intel-calibration-alerts'), () => true).map(el => el.textContent).join(' ');
    assert.match(calAlertsText, /Hypercorrection priority/);
    assert.match(node('intel-horizon-summary').textContent, /Peak decay/);

    node('dsr-day-slider').value = '10';
    node('dsr-day-slider').input();
    assert.match(node('dsr-day-label').textContent, /\+10d/);
    assert.match(node('dsr-curve-readout').textContent, /Predicted recall R\(t\)/);

    node('horizon-practice-slider').value = '3';
    node('horizon-practice-slider').input();
    assert.match(node('horizon-practice-label').textContent, /3 urgent outcome/);

    // 7. Lesson Designer (Ders Tasarımcısı): test Markdown Open Content Adapter + blank authoring
    node('deck-submode-designer').click();
    node('designer-adapter-format').value = 'markdown';
    node('designer-adapter-sample').click();
    node('designer-adapter-convert').click();
    assert.match(node('designer-readiness-summary').textContent, /2 \/ 2 outcomes ready/);

    node('designer-blank-btn').click();
    assert.match(node('designer-readiness-summary').textContent, /0 \/ 1 outcomes ready/);

    const outcomeId = 'o-custom-1';
    node('designer-q-outcome').value = outcomeId;
    node('designer-q-prompt').value = 'Question 1?';
    node('designer-q-a').value = 'Right 1';
    node('designer-q-b').value = 'Wrong 1';
    node('designer-q-correct').value = 'a';
    node('designer-q-misc').value = 'custom-misc';
    node('designer-question-form').submit();

    node('designer-q-outcome').value = outcomeId;
    node('designer-q-prompt').value = 'Question 2?';
    node('designer-q-a').value = 'Wrong 2';
    node('designer-q-b').value = 'Right 2';
    node('designer-q-correct').value = 'b';
    node('designer-question-form').submit();

    node('designer-r-outcome').value = outcomeId;
    node('designer-r-title').value = 'Targeted Lesson';
    node('designer-r-summary').value = 'Clear explanation of concept 1.';
    node('designer-lesson-form').submit();

    assert.match(node('designer-readiness-summary').textContent, /1 \/ 1 outcomes ready/);

    // 8. Intelligence 3-view submode switching keeps only one view active at a time
    node('intel-submode-horizon').click();
    assert.equal(node('intel-view-map').hidden, true);
    assert.equal(node('intel-view-horizon').hidden, false);
    assert.equal(node('intel-view-ledger').hidden, true);

    node('intel-submode-ledger').click();
    assert.equal(node('intel-view-map').hidden, true);
    assert.equal(node('intel-view-horizon').hidden, true);
    assert.equal(node('intel-view-ledger').hidden, false);

    node('intel-submode-map').click();
    assert.equal(node('intel-view-map').hidden, false);
    assert.equal(node('intel-view-horizon').hidden, true);
    assert.equal(node('intel-view-ledger').hidden, true);

    // 9. Turkish language switch updates closed-loop studio copy cleanly without English leaks
    lang = 'tr';
    controller.applyLanguage();
    assert.equal(node('submode-guided').textContent, 'Hata Analizli Çalışma');
    assert.equal(node('deck-submode-designer').textContent, 'Kendi Dersini Hazırla');
    assert.equal(node('intel-submode-map').textContent, 'Konu Haritam & Unutma');
    assert.equal(node('intel-submode-horizon').textContent, 'Kendine Güven & 14 Günlük Plan');
    assert.equal(node('intel-submode-ledger').textContent, 'Hata Geçmişi & Etki');
    assert.equal(node('opt-adapter-md').textContent, 'Markdown Müfredatı');
    assert.match(node('designer-manual-summary').textContent, /Manuel ünite, kazanım, soru ve mikro-ders ekle/);
    assert.match(node('designer-readiness-summary').textContent, /1 \/ 1 kazanım tam kapalı döngü için hazır/);
    const readinessTextTr = findAll(node('designer-readiness-list'), () => true).map(el => el.textContent).join(' ');
    assert.match(readinessTextTr, /2 Soru · 1 Ders/);

    // 10. One-click "Test in Guided Loop" jumps to study tab
    node('designer-try-btn').click();
    assert.equal(activeTab, 'study');
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});
