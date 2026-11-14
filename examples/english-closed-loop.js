/**
 * Runnable 14-day English Mastery Closed-Loop Case Study over FARK's MCP server.
 * Shows Claude / an AI tutor using real FARK tools to:
 *   1. Inspect an English learner failing Conditionals due to a Tenses prerequisite gap
 *   2. Seal an intervention hypothesis with frozen baseline & control topic
 *   3. Log Days 8-14 follow-up reviews + fit personalized DSR calibration at 0 TL
 *   4. Audit post-intervention uplift with empirical numbers
 *
 * Run: node examples/english-closed-loop.js
 */
import { createCard } from '../src/index.js';
import { buildConceptNodesForCards, buildSamplePack } from '../src/interchange.js';
import { createLedger, exportLedger, recordLedgerReview } from '../src/ledger.js';
import { handleMcpRequest } from '../src/mcp.js';
import { fitLearnerParameters, replayReviewStream } from '../src/calibrate.js';

function dayAt(day, hour = 10) {
  return new Date(Date.parse('2026-10-01T00:00:00Z') + (day * 24 + hour) * 3600 * 1000).toISOString();
}

function callMcp(name, args) {
  const res = handleMcpRequest({
    jsonrpc: '2.0',
    id: name,
    method: 'tools/call',
    params: { name, arguments: args }
  });
  const payload = res.result?.content?.[0]?.text ?? '';
  if (res.result?.isError) throw new Error(`MCP error in ${name}: ${payload}`);
  return JSON.parse(payload);
}

// 1. Initialize fresh English Mastery A2->B2 ledger cleanly with prerequisite DAG.
const freshCards = buildSamplePack('english', dayAt(0)).map((card) =>
  createCard({
    id: card.id,
    topic: card.topic,
    question: card.question,
    answer: card.answer
  })
);

let ledger = createLedger({
  cards: freshCards,
  concepts: buildConceptNodesForCards(freshCards),
  createdAt: dayAt(0)
});

// Days 1-6: Learner drills Conditionals prematurely while Tenses foundation is broken;
// Phrasal Verbs serves as untouched/normal control topic with one minor attention slip.
const weekOne = [
  ['eng-01', 'good', 1],
  ['eng-03', 'again', 1, 'misconception'],
  ['eng-06', 'again', 2, 'misconception'],
  ['eng-04', 'again', 2, 'misconception'],
  ['eng-09', 'again', 3, 'attention'],
  ['eng-10', 'good', 3],
  ['eng-07', 'again', 4, 'misconception'],
  ['eng-03', 'again', 5, 'misconception'],
  ['eng-06', 'again', 5, 'misconception'],
  ['eng-10', 'good', 6]
];
for (const [cardId, rating, d, reason] of weekOne) {
  ledger = recordLedgerReview(ledger, cardId, rating, dayAt(d), reason ? { reason } : {}).ledger;
}

// 2. Claude queries fark_diagnose_learner over MCP.
const diagnosis = callMcp('fark_diagnose_learner', {
  ledgerText: exportLedger(ledger),
  at: dayAt(7)
});
const topSignal = diagnosis.recommendations[0];
console.log('=== Step 1: MCP Diagnosis on Day 7 ===');
console.log('Top recommendation:', topSignal.signal, '->', topSignal.headline);
console.log('Target concepts:', topSignal.targetConcepts.join(' + '));

// 3. Claude seals a closed-loop intervention hypothesis into the immutable ledger.
const sealed = callMcp('fark_record_intervention', {
  ledgerText: exportLedger(ledger),
  targetTopic: topSignal.targetTopic,
  targetConcepts: topSignal.targetConcepts,
  signal: topSignal.signal,
  action: 'Pause new Conditionals cards for 5 days; contrast Past Simple vs Present Perfect examples first.',
  hypothesis: 'Repairing English: Tenses will eliminate Conditional tense-shift misconceptions.',
  at: dayAt(7, 11)
});
let ledgerText = JSON.stringify(sealed.ledger);
console.log('\n=== Step 2: Sealed Intervention Baseline ===');
console.log('Intervention ID:', sealed.intervention.id);
console.log('Frozen baseline:', sealed.intervention.baseline);

// 4. Days 8-14 follow-up reviews logged via fark_log_review_event.
const weekTwo = [
  ['eng-03', 'good', 8],
  ['eng-04', 'good', 9],
  ['eng-05', 'good', 10],
  ['eng-06', 'good', 11],
  ['eng-07', 'good', 12],
  ['eng-08', 'good', 13],
  ['eng-09', 'good', 13],
  ['eng-10', 'easy', 14]
];
for (const [cardId, rating, d] of weekTwo) {
  const logged = callMcp('fark_log_review_event', {
    ledgerText,
    cardId,
    rating,
    at: dayAt(d)
  });
  ledgerText = JSON.stringify(logged.ledger);
}

// 5. Evaluate closed-loop uplift + replay strategies + fit personal calibration at 0 TL.
const evalReport = callMcp('fark_evaluate_interventions', {
  ledgerText,
  at: dayAt(14, 18)
});
const evaluation = evalReport.evaluations[0];
const finalLedger = JSON.parse(ledgerText);
const replay = replayReviewStream(finalLedger);
const calibrationFit = fitLearnerParameters(finalLedger);

console.log('\n=== Step 3: MCP Post-Intervention Evaluation (Day 14) ===');
console.log('Verdict:', evaluation.verdict);
console.log('Deltas:', evaluation.deltas);
console.log('Caveat:', evaluation.limitations);

console.log('\n=== Step 4: Replay Comparison & 0 TL Personal Calibration ===');
for (const row of replay.strategies) {
  console.log(`- ${row.strategy.padEnd(8)} | scored=${row.sampleCount} | Brier=${row.brierScore} | LogLoss=${row.logLoss}`);
}
console.log('Personal fit:', {
  fitted: calibrationFit.fitted,
  reason: calibrationFit.reason,
  params: calibrationFit.params,
  brierDelta: calibrationFit.brierDelta
});
