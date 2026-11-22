/**
 * Public package import smoke test, usable as a minimal integration template.
 * Original synthetic card only; no API key, private course, or real learner data.
 */
import {
  createCard,
  reviewCard,
  selectReviewQueue,
  getStudySummary
} from 'fark-study-engine';

const studiedAt = '2026-01-01T09:00:00.000Z';
const observedAt = '2026-01-03T09:00:00.000Z';

const original = createCard({
  id: 'demo-1',
  topic: 'Arithmetic',
  question: 'What is 2 + 2?',
  answer: '4'
});
const reviewed = reviewCard(original, 'good', studiedAt);
const dueCards = selectReviewQueue([reviewed], observedAt, 5);
const summary = getStudySummary([reviewed], observedAt);

console.log(JSON.stringify({
  originalUnchanged: original.reviews === 0,
  reviewedCardId: reviewed.id,
  dueCardIds: dueCards.map(card => card.id),
  totalReviews: summary.totalReviews,
  observedAccuracy: summary.accuracy,
  disclaimer: 'Review ratings are self-reported events, not proof of mastery.'
}, null, 2));
