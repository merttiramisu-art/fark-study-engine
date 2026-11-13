/**
 * Zero-dependency Web Component (`<fark-study-deck>`) and embeddable view snapshot helper.
 * Safe to import in Node.js (registration runs only when customElements & HTMLElement exist).
 */
import { getStudySummary } from './index.js';
import { planStudySession } from './planner.js';
import { importStudyDeck } from './portable.js';
import { reviewCardWithStrategy } from './strategies.js';
import { parseClozePrompt } from './interchange.js';

/** Build a framework-free snapshot object usable by custom UIs or Web Components. */
export function renderWidgetSnapshot(cards, at = new Date(), options = {}) {
  const summary = getStudySummary(cards, at);
  const plan = planStudySession(cards, at, options);
  const firstItem = plan.planned[0] ?? null;
  const firstCard = firstItem ? cards.find((c) => c.id === firstItem.id) ?? null : null;
  return {
    summary,
    plan,
    activeCard: firstCard
      ? {
          id: firstCard.id,
          topic: firstCard.topic,
          ...parseClozePrompt(firstCard.question, firstCard.answer),
          rawQuestion: firstCard.question,
          rawAnswer: firstCard.answer
        }
      : null
  };
}

const BaseElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

/** Standalone zero-dependency Custom Element for embedding offline study decks anywhere. */
export class FarkStudyDeckElement extends BaseElement {
  #cards = [];
  #strategy = 'balanced';
  #revealed = false;
  #rated = 0;

  constructor() {
    super();
    if (typeof this.attachShadow === 'function') {
      this.attachShadow({ mode: 'open' });
    }
  }

  connectedCallback() {
    if (!this.#cards.length) {
      const jsonScript = this.querySelector?.('script[type="application/json"]');
      if (jsonScript?.textContent?.trim()) {
        try {
          this.#cards = importStudyDeck(jsonScript.textContent);
        } catch (err) {
          this.#renderError(err.message);
          return;
        }
      }
    }
    this.#render();
  }

  setCards(cards) {
    this.#cards = [...cards];
    this.#revealed = false;
    this.#render();
  }

  getCards() {
    return [...this.#cards];
  }

  setStrategy(strategy) {
    this.#strategy = strategy || 'balanced';
    this.#render();
  }

  #renderError(message) {
    if (!this.shadowRoot) return;
    this.shadowRoot.textContent = '';
    const box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText = 'padding:14px;border:1px solid #e3b8be;border-radius:10px;background:#fff5f6;color:#7e313d;font:13px sans-serif;';
    box.textContent = 'FARK widget error: ' + message;
    this.shadowRoot.append(box);
  }

  #render() {
    if (!this.shadowRoot) return;
    const root = this.shadowRoot;
    root.textContent = '';

    const style = document.createElement('style');
    style.textContent = `
      :host { display:block; font-family: system-ui, -apple-system, sans-serif; color:#22243b; }
      .card { border:1px solid #e2e3ed; border-radius:14px; padding:18px; background:#fff; }
      .meta { display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:#5b4db8; margin-bottom:10px; }
      .q { font-size:18px; font-weight:700; margin:0 0 12px; line-height:1.4; }
      .a { padding:11px 13px; border-radius:9px; background:#f5f4fb; margin-bottom:12px; font-size:14px; font-weight:600; }
      .row { display:flex; flex-wrap:wrap; gap:8px; }
      button { cursor:pointer; border:1px solid #d5d7e7; border-radius:8px; padding:8px 12px; background:#f8f8fc; font:inherit; font-size:12px; font-weight:700; }
      button.primary { background:#685ad4; color:#fff; border-color:#685ad4; }
    `;

    const snapshot = renderWidgetSnapshot(this.#cards, new Date(), { limit: 1 });
    const wrap = document.createElement('div');
    wrap.className = 'card';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const left = document.createElement('span');
    left.textContent = snapshot.activeCard ? snapshot.activeCard.topic : 'FARK STUDY DECK';
    const right = document.createElement('span');
    right.textContent = `${snapshot.summary.due} due · ${this.#rated} rated`;
    meta.append(left, right);
    wrap.append(meta);

    if (!snapshot.activeCard) {
      const done = document.createElement('p');
      done.className = 'q';
      done.textContent = snapshot.summary.total === 0 ? 'No cards loaded.' : 'All due cards reviewed.';
      wrap.append(done);
      root.append(style, wrap);
      return;
    }

    const q = document.createElement('p');
    q.className = 'q';
    q.textContent = snapshot.activeCard.maskedQuestion;
    wrap.append(q);

    if (this.#revealed) {
      const ans = document.createElement('div');
      ans.className = 'a';
      ans.textContent = snapshot.activeCard.isCloze
        ? snapshot.activeCard.revealedText
        : snapshot.activeCard.rawAnswer;
      wrap.append(ans);

      const row = document.createElement('div');
      row.className = 'row';
      for (const rating of ['again', 'hard', 'good', 'easy']) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = rating[0].toUpperCase() + rating.slice(1);
        btn.addEventListener('click', () => {
          const idx = this.#cards.findIndex((c) => c.id === snapshot.activeCard.id);
          if (idx >= 0) {
            this.#cards[idx] = reviewCardWithStrategy(this.#cards[idx], rating, new Date(), {
              strategy: this.#strategy,
              reasonAware: true
            });
            this.#rated += 1;
            this.#revealed = false;
            this.dispatchEvent?.(new CustomEvent('fark-review', { detail: { card: this.#cards[idx], rating } }));
            this.#render();
          }
        });
        row.append(btn);
      }
      wrap.append(row);
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'primary';
      btn.textContent = 'Reveal answer';
      btn.addEventListener('click', () => {
        this.#revealed = true;
        this.#render();
      });
      wrap.append(btn);
    }

    root.append(style, wrap);
  }
}

/** Register `<fark-study-deck>` if running inside a browser supporting Custom Elements. */
export function registerFarkWidget(tagName = 'fark-study-deck') {
  if (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined' && !customElements.get(tagName)) {
    customElements.define(tagName, FarkStudyDeckElement);
    return true;
  }
  return false;
}
