/**
 * Public synthetic content only. Run: node examples/learning-session-demo.js
 * No KPSS exam questions, private material, network or paid service.
 */
import {createAssessmentHistory,recordAssessment} from '../src/assessment.js';
import {createTeachingHistory,recordTeachingCompletion} from '../src/learning-progress.js';
import {createLearningSession,serializeLearningSession,parseLearningSession,resumeLearningSession} from '../src/learning-session.js';
import {getLearningDashboard} from '../src/learning-orchestrator.js';
const core={format:'fark-knowledge-core',version:1,units:[{id:'math',label:'Synthetic Mathematics'}],
 outcomes:[{id:'fractions',unitId:'math',label:'Fraction comparison'}],
 resources:[{id:'visual',kind:'lesson',revision:'1',outcomeIds:['fractions']}],
 questions:[{id:'first',revision:'1',outcomeIds:['fractions'],correctChoiceId:'yes',choices:[{id:'yes'},{id:'no',misconceptionId:'denominator-confusion'}]},
 {id:'followup',revision:'1',outcomeIds:['fractions'],correctChoiceId:'yes',choices:[{id:'yes'},{id:'no'}]}],mappings:[]};
let assessments=recordAssessment(core,createAssessmentHistory(),{attemptId:'a1',questionId:'first',selectedChoiceId:'no',at:'2026-01-01T10:00:00Z'}).history;
let teaching=createTeachingHistory();
const checkpoint=createLearningSession(core,assessments,teaching,{sessionId:'synthetic-session',baselineAttemptId:'a1',outcomeId:'fractions',at:'2026-01-01T10:01:00Z'});
const stored=serializeLearningSession(checkpoint);
const restored=parseLearningSession(stored);
console.log('Before lesson:',resumeLearningSession(core,restored,{at:'2026-01-01T10:02:00Z'}).step.status);
teaching=recordTeachingCompletion(core,assessments,teaching,{completionId:'c1',resourceId:'visual',baselineAttemptId:'a1',at:'2026-01-01T10:05:00Z'}).history;
console.log('After lesson:',resumeLearningSession(core,restored,{at:'2026-01-01T10:06:00Z',teaching}).step.status);
assessments=recordAssessment(core,assessments,{attemptId:'a2',questionId:'followup',selectedChoiceId:'yes',at:'2026-01-01T10:10:00Z'}).history;
const final=resumeLearningSession(core,restored,{at:'2026-01-01T10:11:00Z',assessments,teaching});
console.log('After reassessment:',final.step.status,final.step.comparison.interpretation);
console.log('Evidence:',getLearningDashboard(core,assessments,teaching,{at:'2026-01-01T10:11:00Z'}).evidence.totals);
