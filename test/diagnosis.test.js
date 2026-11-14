import test from 'node:test';
import assert from 'node:assert/strict';
import { createLedger, recordLedgerReview, upsertLedgerCard } from '../src/ledger.js';
import {
  computeConceptDynamics,
  diagnoseLearner,
  recordIntervention,
  evaluateIntervention,
  evaluateAllInterventions
} from '../src/diagnosis.js';

const T0 = '2026-01-01T09:00:00.000Z';
const addDays = (iso, days) => new Date(Date.parse(iso) + days * 24 * 60 * 60 * 1000).toISOString();

test('diagnoseLearner identifies prerequisite gap and verifies post-intervention uplift with control comparison', () => {
  let ledger = createLedger({
    createdAt: T0,
    concepts: [
      { id: 'Linear', label: 'Linear Equations', prerequisites: [] },
      { id: 'Quadratics', label: 'Quadratic Equations', prerequisites: ['Linear'] },
      { id: 'Vocab', label: 'Study Vocabulary', prerequisites: [] }
    ]
  });

  ledger = upsertLedgerCard(ledger, { id: 'lin-1', topic: 'Linear', question: 'Solve 2x=10', answer: 'x=5' });
  ledger = upsertLedgerCard(ledger, { id: 'lin-2', topic: 'Linear', question: 'Solve 3x-1=8', answer: 'x=3' });
  ledger = upsertLedgerCard(ledger, { id: 'quad-1', topic: 'Quadratics', question: 'Factor x^2-9', answer: '(x-3)(x+3)' });
  ledger = upsertLedgerCard(ledger, { id: 'quad-2', topic: 'Quadratics', question: 'Solve x^2-5x+6=0', answer: '2, 3' });
  ledger = upsertLedgerCard(ledger, { id: 'voc-1', topic: 'Vocab', question: 'Concise?', answer: 'Brief' });

  // Student has shaky foundation in Linear, fails Quadratics with misconceptions, steady on Vocab
  ledger = recordLedgerReview(ledger, 'lin-1', 'again', T0, { reason: 'knowledge-gap' }).ledger;
  ledger = recordLedgerReview(ledger, 'lin-2', 'again', T0, { reason: 'knowledge-gap' }).ledger;
  ledger = recordLedgerReview(ledger, 'quad-1', 'again', T0, { reason: 'misconception' }).ledger;
  ledger = recordLedgerReview(ledger, 'quad-2', 'again', T0, { reason: 'misconception' }).ledger;
  ledger = recordLedgerReview(ledger, 'voc-1', 'good', T0).ledger;
  ledger = recordLedgerReview(ledger, 'voc-1', 'good', addDays(T0, 2)).ledger;

  const diag = diagnoseLearner(ledger, addDays(T0, 2));
  const prereqRec = diag.recommendations.find((r) => r.signal === 'fix-prerequisite');
  assert.ok(prereqRec, 'should pinpoint Linear prerequisite bottleneck before Quadratics drilling');
  assert.equal(prereqRec.targetTopic, 'Quadratics');
  assert.equal(prereqRec.prerequisiteConcept, 'Linear');
  assert.ok(diag.calibration.sampleCount >= 1);

  // Seal intervention into the ledger
  const sealed = recordIntervention(ledger, prereqRec, addDays(T0, 2));
  ledger = sealed.ledger;

  // Before follow-up reviews, verdict stays honestly insufficient-data
  const earlyEval = evaluateIntervention(ledger, sealed.intervention.id, addDays(T0, 3));
  assert.equal(earlyEval.verdict, 'insufficient-data');

  // Student repairs Linear prerequisite, then succeeds on Quadratics + Vocab remains steady
  ledger = recordLedgerReview(ledger, 'lin-1', 'good', addDays(T0, 3)).ledger;
  ledger = recordLedgerReview(ledger, 'lin-2', 'good', addDays(T0, 3)).ledger;
  ledger = recordLedgerReview(ledger, 'quad-1', 'good', addDays(T0, 4)).ledger;
  ledger = recordLedgerReview(ledger, 'quad-2', 'easy', addDays(T0, 4)).ledger;
  ledger = recordLedgerReview(ledger, 'voc-1', 'good', addDays(T0, 5)).ledger;

  const finalEval = evaluateIntervention(ledger, sealed.intervention.id, addDays(T0, 5));
  assert.equal(finalEval.verdict, 'positive-signal');
  assert.ok(finalEval.deltas.recallDelta > 0.5);
  assert.ok(finalEval.deltas.misconceptionDelta < 0);
  assert.ok(finalEval.deltas.netUpliftVsControl > 0);
  assert.equal(evaluateAllInterventions(ledger, addDays(T0, 5)).length, 1);
});

test('computeConceptDynamics distinguishes improving recovery from old lapses', () => {
  let ledger = createLedger({ createdAt: T0 });
  ledger = upsertLedgerCard(ledger, { id: 'b1', topic: 'Bio', question: 'ATP?', answer: 'Energy' });

  // Early failures followed by recent consistent mastery (last 6 events)
  ledger = recordLedgerReview(ledger, 'b1', 'again', T0, { reason: 'misconception' }).ledger;
  ledger = recordLedgerReview(ledger, 'b1', 'again', addDays(T0, 0.2), { reason: 'misconception' }).ledger;
  for (let i = 1; i <= 6; i++) {
    ledger = recordLedgerReview(ledger, 'b1', 'good', addDays(T0, i * 2)).ledger;
  }

  const dyn = computeConceptDynamics(ledger, addDays(T0, 12));
  assert.equal(dyn.Bio.trend, 'improving');
  assert.equal(dyn.Bio.recentRecallRate, 1);
  assert.equal(dyn.Bio.recentMisconceptionCount, 0);
});
