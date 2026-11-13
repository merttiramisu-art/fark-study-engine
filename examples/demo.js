import { createCard, reviewCard, selectReviewQueue, getStudySummary } from '../src/index.js';

const now = '2026-11-13T12:00:00.000Z';
const cards = [
  createCard({ id: 'a', topic: 'Matematik', question: '3 × 4 = ?', answer: '12' }),
  createCard({ id: 'b', topic: 'Dil bilgisi', question: 'Bir cümle hangi noktalama işaretiyle bitebilir?', answer: 'Nokta, soru işareti veya ünlem' }),
  createCard({ id: 'c', topic: 'Fen', question: 'Su deniz seviyesinde yaklaşık kaç °C sıcaklıkta kaynar?', answer: '100 °C' })
];

console.log('İlk durum:', getStudySummary(cards, now));
cards[0] = reviewCard(cards[0], 'good', now);
cards[1] = reviewCard(cards[1], 'again', now);
console.log('Güncel durum:', getStudySummary(cards, now));
console.log('Bugün tekrar edilecekler:', selectReviewQueue(cards, '2026-11-13T12:11:00.000Z').map(card => card.id));
