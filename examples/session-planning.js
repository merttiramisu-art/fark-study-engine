import { createCard, reviewCard } from '../src/index.js';
import { planStudySession } from '../src/planner.js';

const NOW = '2026-11-13T12:00:00Z';
const make = (id, topic, question, answer) => createCard({ id, topic, question, answer });
const topics = [
  reviewCard(make('math-01', 'Mathematics', '6 × 7?', '42'), 'again', '2026-11-12T12:00:00Z'),
  reviewCard(make('math-02', 'Mathematics', '2 + 5?', '7'), 'good', '2026-11-12T12:00:00Z'),
  make('reading-01', 'Reading', 'What does a heading do?', 'Names a section'),
  make('science-01', 'Science', 'Is water a compound?', 'Yes')
];
const plan = planStudySession(topics, NOW, { limit: 3, maxPerTopic: 2, maxNewCards: 1 });
console.log(JSON.stringify(plan, null, 2));
