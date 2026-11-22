/**
 * FARK "Why this step?" — original, memory-only browser example.
 * The engine chooses linked learning resources and verifies issued follow-ups.
 * All user clicks are observations; no mastery, causal effect, or tracking claims.
 */
import { createAssessmentHistory, recordAssessment } from '../../src/assessment.js';
import { createTeachingHistory, recordTeachingCompletion } from '../../src/learning-progress.js';
import { getLearningNextStep } from '../../src/learning-orchestrator.js';
import { createReassessmentLedger, issueReassessment, verifyIssuedReassessment } from '../../src/reassessment-ledger.js';

const $ = id => document.getElementById(id);
const core = {
  format: 'fark-knowledge-core', version: 1,
  units: [{ id: 'fractions', label: 'Original fractions' }],
  outcomes: [{ id: 'compare-unit-fractions', unitId: 'fractions', label: 'Compare fractions' }],
  resources: [{
    id: 'fraction-pieces', kind: 'lesson', revision: '1',
    outcomeIds: ['compare-unit-fractions'], misconceptionIds: ['denominator-size']
  }],
  questions: [
    { id: 'baseline', revision: '1', outcomeIds: ['compare-unit-fractions'],
      correctChoiceId: 'a', choices: [{ id: 'a' }, { id: 'b', misconceptionId: 'denominator-size' }] },
    { id: 'followup', revision: '1', outcomeIds: ['compare-unit-fractions'],
      correctChoiceId: 'a', choices: [{ id: 'a' }, { id: 'b' }] }
  ],
  mappings: []
};

let assessments, teaching, issued, activeIssue, stage, trail, finalResult;

function reset() {
  assessments = createAssessmentHistory();
  teaching = createTeachingHistory();
  issued = createReassessmentLedger();
  activeIssue = null;
  finalResult = null;
  stage = 'baseline';
  trail = [];
  $('journey-error').hidden = true;
  render();
}

function addEvidence(message) { trail.push(message); }

function choose(choice) {
  if (stage === 'baseline') {
    const recorded = recordAssessment(core, assessments, {
      attemptId: 'baseline-a1', questionId: 'baseline',
      selectedChoiceId: choice, at: '2026-01-01T10:00:00.000Z'
    });
    assessments = recorded.history;
    addEvidence('First question answered. Result recorded against the editorial answer key.');
    if (recorded.attempt.correct) {
      stage = 'baseline-correct';
      addEvidence('Correct first answer: FARK does not assume there is a gap to repair.');
    } else {
      const step = getLearningNextStep(core, assessments, teaching, {
        at: '2026-01-01T10:01:00.000Z',
        baselineAttemptId: 'baseline-a1',
        outcomeId: 'compare-unit-fractions'
      });
      if (step.status !== 'teaching-needed' ||
          !step.resources.some(row => row.resourceId === 'fraction-pieces')) {
        throw new Error('Expected editorial learning resource was not selected');
      }
      stage = 'lesson';
      addEvidence('The selected wrong answer carries a denominator-size tag. FARK linked the matching editorial lesson—no automatic diagnosis of the person.');
    }
  } else if (stage === 'followup' && activeIssue) {
    const recorded = recordAssessment(core, assessments, {
      attemptId: 'followup-a2', questionId: activeIssue.questionId,
      selectedChoiceId: choice, at: '2026-01-01T10:12:00.000Z'
    });
    assessments = recorded.history;
    finalResult = verifyIssuedReassessment(core, assessments, issued, {
      issueId: activeIssue.id, followupAttemptId: 'followup-a2', at: '2026-01-01T10:13:00.000Z'
    });
    if (finalResult.status !== 'verified-issued-answer' || finalResult.mastery !== null) {
      throw new Error('Issued reassessment evidence could not be verified');
    }
    stage = 'evidence';
    addEvidence('The first answer to the issued, different question was verified after the recorded lesson. This is an observation, not proof of lasting learning.');
  } else {
    return;
  }
  render();
}

function completeLesson() {
  if (stage !== 'lesson') return;
  const result = recordTeachingCompletion(core, assessments, teaching, {
    completionId: 'lesson-c1', resourceId: 'fraction-pieces',
    baselineAttemptId: 'baseline-a1', at: '2026-01-01T10:05:00.000Z'
  });
  teaching = result.history;
  addEvidence('A lesson-review completion was self-reported; FARK has not verified understanding.');
  const step = getLearningNextStep(core, assessments, teaching, {
    at: '2026-01-01T10:07:00.000Z',
    baselineAttemptId: 'baseline-a1', outcomeId: 'compare-unit-fractions'
  });
  if (step.status !== 'ready-to-reassess') throw new Error('Reassessment not ready');
  const issuance = issueReassessment(core, assessments, teaching, issued, {
    issueId: 'issued-r1', baselineAttemptId: 'baseline-a1',
    outcomeId: 'compare-unit-fractions', at: '2026-01-01T10:10:00.000Z'
  });
  if (issuance.status !== 'issued' || issuance.issue.questionId === 'baseline') {
    throw new Error('Different follow-up question was not issued');
  }
  issued = issuance.ledger;
  activeIssue = issuance.issue;
  addEvidence('FARK issued a different, unanswered question linked to the same outcome.');
  stage = 'followup';
  render();
}

function progress() {
  const position = { baseline: 0, 'baseline-correct': 0, lesson: 1, followup: 2, evidence: 3 }[stage];
  ['baseline', 'lesson', 'followup', 'evidence'].forEach((key, i) => {
    const el = $('progress-' + key);
    el.classList.toggle('active', i === position);
    el.classList.toggle('done', i < position);
    if (i === position) el.setAttribute('aria-current', 'step');
    else el.removeAttribute('aria-current');
  });
}

function renderTrail() {
  const list = $('evidence-list');
  list.replaceChildren();
  for (const event of trail.length ? trail : ['Nothing recorded yet. Choose an answer to begin.']) {
    const node = document.createElement('li');
    node.textContent = event;
    list.append(node);
  }
}

function render() {
  progress();
  const config = {
    baseline: {
      number: 'STEP 01 / 04', badge: 'OBSERVATION', heading: 'Start with a question',
      description: 'Choose the larger fraction. Your answer is evaluated against an explicit answer key; a single answer cannot establish mastery.',
      question: 'Which fraction is larger?', choices: ['1/3', '1/4'],
      why: 'No recommendation yet. First we need a recorded answer, not a guessed learner profile.',
      status: ''
    },
    'baseline-correct': {
      number: 'STEP 01 / 04', badge: 'OBSERVED', heading: 'You answered correctly',
      description: 'FARK recorded a correct answer on this one question. No targeted lesson was triggered.',
      question: 'One observation is not a mastery score.', choices: [],
      why: 'Without a wrong answer, this example has no linked misconception evidence. Restart to explore the remediation path.',
      status: 'Correct answer observed. We do not infer durable understanding from a single response.'
    },
    lesson: {
      number: 'STEP 02 / 04', badge: 'EDITORIAL LINK', heading: 'Why this explanation?',
      description: 'The chosen distractor has an explicit denominator-size tag. The engine found the corresponding original resource.',
      question: 'Compare pieces, not just numbers.', choices: [],
      why: 'This lesson is linked by curriculum editors to the observed answer and outcome—not selected by an unverified personal diagnosis.',
      status: 'Observed an incorrect baseline. A relevant lesson is available. Reviewing it is optional.'
    },
    followup: {
      number: 'STEP 03 / 04', badge: 'ISSUED QUESTION', heading: 'Try a different question',
      description: 'A separate question was explicitly issued only after you marked the lesson reviewed.',
      question: 'Which fraction is larger now?', choices: ['2/5', '2/7'],
      why: 'FARK issued a question with a different ID and the same learning outcome. Only its first answer after issuance can be linked to this journey.',
      status: 'Lesson review was self-reported. Now answer the independently issued question.'
    },
    evidence: {
      number: 'STEP 04 / 04', badge: 'VERIFIED RECORD', heading: 'An honest comparison',
      description: 'The issued question was answered after the recorded lesson. Compare only what was actually observed.',
      question: finalResult?.comparison?.followupCorrect
        ? 'Correct on this different question.' : 'Still incorrect on this different question.',
      choices: [],
      why: 'The answer was bound to the issued question and checked against its answer key. This comparison is descriptive, not a claim that the lesson caused a change.',
      status: 'First answer: incorrect. Different follow-up: ' +
        (finalResult?.comparison?.followupCorrect ? 'correct' : 'incorrect') +
        '. Mastery: unknown. Causal effect: unknown.'
    }
  }[stage];
  $('stage-number').textContent = config.number;
  $('stage-badge').textContent = config.badge;
  $('stage-heading').textContent = config.heading;
  $('stage-description').textContent = config.description;
  $('journey-question').textContent = config.question;
  $('why-description').textContent = config.why;
  $('journey-status').textContent = config.status;
  $('choices').hidden = !config.choices.length;
  if (config.choices.length) {
    $('choice-a').textContent = config.choices[0];
    $('choice-b').textContent = config.choices[1];
  }
  $('lesson-block').hidden = stage !== 'lesson';
  $('lesson-reviewed').hidden = stage !== 'lesson';
  renderTrail();
}

function guarded(action) {
  try {
    $('journey-error').hidden = true;
    action();
  } catch (error) {
    $('journey-error').textContent = 'This example could not continue: ' + error.message;
    $('journey-error').hidden = false;
  }
}

$('choice-a').addEventListener('click', () => guarded(() => choose('a')));
$('choice-b').addEventListener('click', () => guarded(() => choose('b')));
$('lesson-reviewed').addEventListener('click', () => guarded(completeLesson));
$('restart-journey').addEventListener('click', reset);
reset();
