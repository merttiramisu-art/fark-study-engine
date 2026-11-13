import { createCard, reviewCard, getStudySummary, getTopicSummaries } from '../../src/index.js';
import { planStudySession } from '../../src/planner.js';
import { exportStudyDeck, importStudyDeck } from '../../src/portable.js';

const $ = id => document.getElementById(id);
const REASONS = {
  'new-card': 'New card',
  'scheduled-review': 'Scheduled review',
  overdue: 'Review overdue',
  'previous-mistakes': 'Previous mistakes'
};

let cards = buildSampleCards();
let plan = null;
let position = 0;
let answerVisible = false;
let messageTimer;

function hoursAgo(hours, from) {
  return new Date(from.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function buildSampleCards() {
  const now = new Date();
  const make = (id, topic, question, answer) => createCard({ id, topic, question, answer });
  return [
    reviewCard(make('math-01', 'Mathematics', 'What is 18% of 250?', '45'), 'again', hoursAgo(36, now), { reason: 'knowledge-gap' }),
    reviewCard(make('math-02', 'Mathematics', 'Solve 3x − 7 = 11.', 'x = 6'), 'good', hoursAgo(72, now)),
    make('math-03', 'Mathematics', 'What is 7 squared?', '49'),
    reviewCard(make('science-01', 'Science', 'What gas do plants absorb during photosynthesis?', 'Carbon dioxide'), 'again', hoursAgo(42, now), { reason: 'misconception' }),
    reviewCard(make('science-02', 'Science', 'At sea level, what is the approximate boiling point of water?', '100 °C (212 °F)'), 'easy', hoursAgo(120, now)),
    make('language-01', 'Language', 'Give a synonym for “brief”.', 'Short or concise'),
    reviewCard(make('geography-01', 'Geography', 'Which ocean is the largest on Earth?', 'The Pacific Ocean'), 'hard', hoursAgo(30, now)),
    reviewCard(make('history-01', 'History', 'Which century did the year 1492 belong to?', 'The 15th century'), 'good', hoursAgo(1, now)),
    make('history-02', 'History', 'In which continent is ancient Carthage located?', 'Africa')
  ];
}

function notify(message) {
  const note = $('notice');
  note.textContent = message;
  note.classList.add('visible');
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => note.classList.remove('visible'), 4800);
}

function planOptions() {
  return {
    limit: Number($('session-limit').value),
    maxPerTopic: Number($('topic-limit').value),
    maxNewCards: Number($('new-limit').value)
  };
}

function rebuildPlan() {
  plan = planStudySession(cards, new Date(), planOptions());
  position = 0;
  answerVisible = false;
  $('mistake-reason').value = '';
  render();
}

function currentItem() {
  return plan?.planned[position] ?? null;
}

function progress() {
  const total = plan?.plannedCount ?? 0;
  const completed = Math.min(position, total);
  $('session-counter').textContent = completed + ' / ' + total;
  $('session-stage').textContent = total && completed < total
    ? 'QUESTION ' + String(completed + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0')
    : 'SESSION SUMMARY';
  $('progress-bar').setAttribute('aria-valuemax', String(total));
  $('progress-bar').setAttribute('aria-valuenow', String(completed));
  $('progress-fill').style.width = total ? Math.round(completed / total * 100) + '%' : '0%';
  const deferred = plan?.deferredCount ?? 0;
  $('session-description').textContent = total
    ? total + ' selected · ' + deferred + ' due card' + (deferred === 1 ? '' : 's') + ' deferred to another session'
    : 'No eligible cards fit these limits.';
}

function renderCard() {
  const item = currentItem();
  const hasQuestion = !!item;
  $('question-content').hidden = !hasQuestion;
  $('finished-content').hidden = hasQuestion;
  if (!hasQuestion) {
    $('finish-heading').textContent = plan.dueCount === 0 ? 'All caught up.' : position > 0 ? 'Session completed.' : 'No cards selected.';
    $('finish-description').textContent = plan.dueCount === 0
      ? 'No reviews are due right now. You can import a deck or reset the example.'
      : position > 0
        ? 'Nice work. Your ratings updated the local demo only. ' + plan.deferredCount + ' eligible card(s) were left for another session.'
        : 'Your current limits excluded all due cards. Increase the limits and rebuild your plan.';
    return;
  }

  const card = cards.find(card => card.id === item.id);
  $('question-topic').textContent = item.topic;
  $('question-kind').textContent = item.status === 'new' ? 'NEW CARD' : 'DUE REVIEW';
  $('question-text').textContent = card.question;
  $('answer-text').textContent = card.answer;
  $('answer-panel').hidden = !answerVisible;
  $('reveal-controls').hidden = answerVisible;
  $('rating-controls').hidden = !answerVisible;
  $('question-reasons').replaceChildren();
  for (const reason of item.reasonCodes) {
    const pill = document.createElement('span');
    pill.className = 'reason-pill';
    pill.textContent = REASONS[reason] ?? reason;
    $('question-reasons').append(pill);
  }
}

function renderInsights() {
  const summary = getStudySummary(cards, new Date());
  $('stat-due').textContent = summary.due;
  $('stat-reviewed').textContent = summary.studied;
  $('stat-accuracy').textContent = summary.accuracy === null ? '—' : Math.round(summary.accuracy * 100) + '%';
  const list = $('topic-list');
  list.replaceChildren();

  const topics = getTopicSummaries(cards, new Date());
  if (!topics.length) {
    const empty = document.createElement('p');
    empty.className = 'insight-footnote';
    empty.textContent = 'No cards in this deck. Import a deck or reset the example.';
    list.append(empty);
  }
  for (const topic of topics) {
    const row = document.createElement('div');
    row.className = 'topic-row';
    const header = document.createElement('div');
    header.className = 'topic-row-header';
    const name = document.createElement('span');
    name.textContent = topic.topic;
    const count = document.createElement('span');
    count.textContent = topic.due + ' due / ' + topic.total + ' cards';
    header.append(name, count);
    const track = document.createElement('div');
    track.className = 'topic-track';
    const fill = document.createElement('div');
    fill.className = 'topic-fill';
    fill.style.width = (topic.total ? topic.due / topic.total * 100 : 0) + '%';
    track.append(fill);
    row.append(header, track);
    list.append(row);
  }
}

function render() {
  progress();
  renderCard();
  renderInsights();
}

function revealAnswer() {
  if (!currentItem()) return;
  answerVisible = true;
  renderCard();
  $('rating-again').focus();
}

function rate(rating) {
  const item = currentItem();
  if (!item || !answerVisible) return;
  const index = cards.findIndex(card => card.id === item.id);
  if (index < 0) return;
  const options = rating === 'again' && $('mistake-reason').value
    ? { reason: $('mistake-reason').value }
    : {};
  const updated = reviewCard(cards[index], rating, new Date(), options);
  cards[index] = updated;
  position++;
  answerVisible = false;
  $('mistake-reason').value = '';
  render();
  notify('Saved: ' + rating + ' · next review ' + new Date(updated.dueAt).toLocaleString());
  if (currentItem()) $('question-text').focus();
}

function exportCards() {
  try {
    const json = exportStudyDeck(cards);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fark-study-deck.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    notify('Deck exported as plain-text JSON. Keep it private.');
  } catch (error) {
    notify('Export failed: ' + error.message);
  }
}

async function importCards(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 4_000_000) {
    notify('File too large. Choose a smaller deck.');
    return;
  }
  try {
    const text = await file.text();
    const restored = importStudyDeck(text);
    cards = restored;
    rebuildPlan();
    notify('Imported ' + cards.length + ' cards locally. Nothing was uploaded.');
  } catch (error) {
    notify('Import failed: ' + error.message);
  }
}

$('settings-form').addEventListener('submit', event => {
  event.preventDefault();
  rebuildPlan();
  notify('Study plan rebuilt using current review history.');
});
$('reveal-button').addEventListener('click', revealAnswer);
document.querySelectorAll('[data-rating]').forEach(button =>
  button.addEventListener('click', () => rate(button.dataset.rating))
);
$('next-plan-button').addEventListener('click', rebuildPlan);
$('reset-button').addEventListener('click', () => {
  cards = buildSampleCards();
  rebuildPlan();
  notify('Sample data reset. Your previous in-memory changes were cleared.');
});
$('export-button').addEventListener('click', exportCards);
$('import-trigger').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', importCards);
rebuildPlan();
