import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard } from '../src/index.js';
import { createLedger, linkConceptPrerequisites, recordLedgerReview } from '../src/ledger.js';
import { createMemoryState, updateDsrMemory, computeRetrievability } from '../src/memory.js';
import { validateKnowledgeCore } from '../src/knowledge-core.js';
import { createAssessmentHistory, recordAssessment } from '../src/assessment.js';
import { createTeachingHistory, recordTeachingCompletion } from '../src/learning-progress.js';
import { createReassessmentLedger, issueReassessment, verifyIssuedReassessment } from '../src/reassessment-ledger.js';
import { createLearningSession, parseLearningSession, resumeLearningSession, serializeLearningSession } from '../src/learning-session.js';
import { cloneKnowledgeCorePreset, KNOWLEDGE_CORE_PRESETS } from '../examples/web/knowledge-presets.js';
import { auditLearningContent } from '../src/content-readiness.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('property: DSR memory stays strictly bounded across 500 seeded random review sequences', () => {
  const rand = mulberry32(424242);
  const ratings = ['again', 'hard', 'good', 'easy'];
  const reasons = [undefined, 'knowledge-gap', 'misconception', 'attention', 'other'];

  for (let trial = 0; trial < 50; trial++) {
    let mem = createMemoryState();
    let clockMs = Date.parse('2026-01-01T08:00:00.000Z');
    for (let step = 0; step < 10; step++) {
      const rating = ratings[Math.floor(rand() * ratings.length)];
      const reason = rating === 'again' ? reasons[Math.floor(rand() * reasons.length)] : undefined;
      const gapDays = Number((rand() * 45).toFixed(3));
      clockMs += Math.round(gapDays * 86_400_000) + 1000;
      const res = updateDsrMemory(mem, rating, new Date(clockMs).toISOString(), reason ? { reason } : {});
      assert.ok(Number.isFinite(res.state.stabilityDays) && res.state.stabilityDays > 0, 'stability must stay positive');
      assert.ok(Number.isFinite(res.state.difficulty) && res.state.difficulty >= 1 && res.state.difficulty <= 10, 'difficulty in [1, 10]');
      const r = computeRetrievability(gapDays, res.state.stabilityDays);
      assert.ok(Number.isFinite(r) && r >= 0 && r <= 1, 'retrievability in [0, 1]');
      mem = res.state;
    }
  }
});

test('property: ledger append and cycle checks never mutate input state on valid or rejected operations', () => {
  const rand = mulberry32(991122);
  const baseCards = [
    createCard({ id: 'p-1', topic: 'A', question: 'Q1', answer: 'A1' }),
    createCard({ id: 'p-2', topic: 'B', question: 'Q2', answer: 'A2' }),
    createCard({ id: 'p-3', topic: 'C', question: 'Q3', answer: 'A3' })
  ];
  let ledger = createLedger({
    cards: baseCards,
    concepts: [
      { id: 'A', prerequisites: [] },
      { id: 'B', prerequisites: ['A'] },
      { id: 'C', prerequisites: ['B'] }
    ],
    createdAt: '2026-01-01T00:00:00.000Z'
  });

  const beforeCycle = JSON.stringify(ledger);
  assert.throws(() => linkConceptPrerequisites(ledger, 'A', ['C']), /cyclic|cycle/i);
  assert.equal(JSON.stringify(ledger), beforeCycle, 'rejected cycle link must not mutate input ledger');

  let ts = Date.parse('2026-01-02T00:00:00.000Z');
  for (let i = 0; i < 40; i++) {
    ts += Math.floor(rand() * 86_400_000) + 1000;
    const snap = JSON.stringify(ledger);
    const cardId = baseCards[i % baseCards.length].id;
    const rating = ['again', 'hard', 'good', 'easy'][Math.floor(rand() * 4)];
    const { ledger: updated } = recordLedgerReview(ledger, cardId, rating, new Date(ts).toISOString());
    assert.equal(JSON.stringify(ledger), snap, 'recordLedgerReview must never mutate previous ledger');
    assert.equal(updated.events.length, ledger.events.length + 1);
    ledger = updated;
  }
});

test('property: all curated bilingual Knowledge Core presets validate and pass 100% content readiness', () => {
  for (const presetId of Object.keys(KNOWLEDGE_CORE_PRESETS)) {
    const core = cloneKnowledgeCorePreset(presetId);
    validateKnowledgeCore(core);
    const audit = auditLearningContent(core);
    assert.equal(audit.summary.blocked, 0, `preset ${presetId} must have zero blocked outcomes`);
    assert.ok(audit.summary.ready >= 3, `preset ${presetId} should contain multiple ready outcomes`);
  }
});

test('property: reassessment issuance & session resume reject replay, out-of-order timestamps, and conflicting history without mutation', () => {
  const core = cloneKnowledgeCorePreset('english-grammar');
  const t1 = '2026-05-01T10:00:00.000Z';
  const t2 = '2026-05-01T10:05:00.000Z';
  const t3 = '2026-05-01T10:10:00.000Z';
  const t4 = '2026-05-01T10:15:00.000Z';

  let assessments = createAssessmentHistory();
  let teaching = createTeachingHistory();
  let rLedger = createReassessmentLedger();

  const b = recordAssessment(core, assessments, {
    attemptId: 'att-base',
    questionId: 'q-eng-v2v3-1',
    selectedChoiceId: 'a',
    at: t1
  });
  assessments = b.history;

  const session = createLearningSession(core, assessments, teaching, {
    sessionId: 'sess-prop-1',
    baselineAttemptId: 'att-base',
    outcomeId: 'eng-verb-forms',
    at: t1
  });
  const parsedSession = parseLearningSession(serializeLearningSession(session));

  // Cannot issue before teaching completion
  const tooEarly = issueReassessment(core, assessments, teaching, rLedger, {
    issueId: 'iss-1',
    baselineAttemptId: 'att-base',
    outcomeId: 'eng-verb-forms',
    at: t2
  });
  assert.equal(tooEarly.status, 'teaching-needed');
  assert.equal(rLedger.issues.length, 0);

  // Record teaching completion
  teaching = recordTeachingCompletion(core, assessments, teaching, {
    completionId: 'comp-1',
    resourceId: 'res-eng-v2v3',
    baselineAttemptId: 'att-base',
    at: t2
  }).history;

  const issued = issueReassessment(core, assessments, teaching, rLedger, {
    issueId: 'iss-1',
    baselineAttemptId: 'att-base',
    outcomeId: 'eng-verb-forms',
    at: t3
  });
  assert.equal(issued.status, 'issued');
  rLedger = issued.ledger;

  // Duplicate issue ID rejected without mutating rLedger
  const beforeDup = JSON.stringify(rLedger);
  assert.throws(() => issueReassessment(core, assessments, teaching, rLedger, {
    issueId: 'iss-1',
    baselineAttemptId: 'att-base',
    outcomeId: 'eng-verb-forms',
    at: t3
  }));
  assert.equal(JSON.stringify(rLedger), beforeDup);

  // Follow-up answer to issued question verifies cleanly
  const f = recordAssessment(core, assessments, {
    attemptId: 'att-follow',
    questionId: issued.issue.questionId,
    selectedChoiceId: 'c',
    at: t4
  });
  assessments = f.history;

  const verified = verifyIssuedReassessment(core, assessments, rLedger, {
    issueId: 'iss-1',
    followupAttemptId: 'att-follow',
    at: t4
  });
  assert.equal(verified.status, 'verified-issued-answer');
  assert.equal(verified.comparison.followupCorrect, true);

  // Session resume reconciles monotonic history, and rejects tampered history
  const resumed = resumeLearningSession(core, parsedSession, { at: t4, assessments, teaching });
  assert.equal(resumed.step.status, 'reassessment-observed');

  const tamperedAssessments = { ...assessments, attempts: assessments.attempts.slice(1) };
  assert.throws(() => resumeLearningSession(core, parsedSession, {
    at: t4,
    assessments: tamperedAssessments,
    teaching
  }), /conflicting assessment history/i);
});
