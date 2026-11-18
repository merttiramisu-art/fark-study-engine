import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssessmentHistory, recordAssessment } from '../src/assessment.js';
import { createTeachingHistory, recordTeachingCompletion } from '../src/learning-progress.js';
import {
  createReassessmentLedger,
  validateReassessmentLedger,
  issueReassessment,
  verifyIssuedReassessment
} from '../src/reassessment-ledger.js';

const core = {
  format: 'fark-knowledge-core', version: 1,
  units: [{ id: 'u', label: 'Unit' }],
  outcomes: [{ id: 'o', unitId: 'u', label: 'Outcome' }],
  resources: [{ id: 'r', kind: 'lesson', revision: '1', outcomeIds: ['o'] }],
  questions: ['q1', 'q2'].map(id => ({
    id, revision: '1', outcomeIds: ['o'], correctChoiceId: 'yes',
    choices: [{ id: 'yes' }, { id: 'no' }]
  })),
  mappings: []
};
const start = '2026-01-01T10:00:00Z';
const add = (history, attemptId, questionId, at) =>
  recordAssessment(core, history, { attemptId, questionId, selectedChoiceId: 'no', at }).history;

function fixture() {
  const assessments = add(createAssessmentHistory(), 'baseline', 'q1', start);
  const teaching = recordTeachingCompletion(core, assessments, createTeachingHistory(), {
    completionId: 'completion', resourceId: 'r',
    baselineAttemptId: 'baseline', at: '2026-01-01T11:00:00Z'
  }).history;
  return { assessments, teaching };
}
const options = { issueId: 'issue', baselineAttemptId: 'baseline', outcomeId: 'o', at: '2026-01-01T12:00:00Z' };

test('reassessment ledger rejects duplicate issued questions and duplicate issue IDs', () => {
  const issue = {
    id: 'issue', baselineAttemptId: 'baseline', outcomeId: 'o',
    questionId: 'q2', questionRevision: '1', issuedAt: options.at
  };
  assert.throws(() => validateReassessmentLedger({
    ...createReassessmentLedger(), issues: [issue, { ...issue, id: 'another' }]
  }), /question already issued/);
  assert.throws(() => validateReassessmentLedger({
    ...createReassessmentLedger(), issues: [issue, { ...issue, questionId: 'q1' }]
  }), /duplicate issue id/);
});

test('reassessment issuance preserves input ledger and returns no candidate after all questions are used', () => {
  const { assessments, teaching } = fixture();
  const original = createReassessmentLedger();
  const first = issueReassessment(core, assessments, teaching, original, options);
  assert.equal(first.status, 'issued');
  assert.equal(original.issues.length, 0);
  assert.equal(first.ledger.issues.length, 1);
  const second = issueReassessment(core, assessments, teaching, first.ledger, { ...options, issueId: 'issue-2' });
  assert.equal(second.status, 'no-unissued-question');
  assert.equal(second.issue, null);
  assert.equal(first.ledger.issues.length, 1);
});

test('verification rejects answers after verification time and answers exactly at issuance', () => {
  const { assessments, teaching } = fixture();
  const issued = issueReassessment(core, assessments, teaching, createReassessmentLedger(), options);
  assert.equal(issued.status, 'issued');
  const atIssuance = add(assessments, 'same-time', 'q2', options.at);
  assert.equal(verifyIssuedReassessment(core, atIssuance, issued.ledger, {
    issueId: 'issue', followupAttemptId: 'same-time', at: '2026-01-01T13:00:00Z'
  }).status, 'outside-issuance-window');
  const future = add(assessments, 'future', 'q2', '2026-01-01T14:00:00Z');
  assert.equal(verifyIssuedReassessment(core, future, issued.ledger, {
    issueId: 'issue', followupAttemptId: 'future', at: '2026-01-01T13:00:00Z'
  }).status, 'outside-issuance-window');
});

test('invalid issuance timestamp is rejected rather than silently normalized', () => {
  const { assessments, teaching } = fixture();
  assert.throws(() => issueReassessment(core, assessments, teaching, createReassessmentLedger(), {
    ...options, at: 'not-a-timestamp'
  }), /invalid issuance time/);
});
