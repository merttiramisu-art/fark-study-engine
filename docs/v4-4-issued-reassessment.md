# V4.4 — Explicit reassessment issuance

V4.3 identified an important attribution limitation: a later answer to a distinct question is not necessarily a question the learning flow actually assigned. V4.4 introduces a **portable, append-only issue ledger** to bind a reassessment to an issued question.

```js
import {createReassessmentLedger,issueReassessment,verifyIssuedReassessment}
  from 'fark-study-engine/reassessment-ledger';
let ledger=createReassessmentLedger();
const result=issueReassessment(core,assessments,teaching,ledger,{
  issueId:'issue-1',baselineAttemptId:'baseline-1',outcomeId:'outcome-1',at:new Date().toISOString()
});
if(result.status==='issued'){
 ledger=result.ledger; // host must persist before showing the question
 // After the host records the actual answer:
 // verifyIssuedReassessment(core, updatedAssessments, ledger, {issueId:'issue-1',followupAttemptId:'...',at:'...'});
}
```

The module refuses issuance without a valid completed lesson for the selected outcome. It selects an unseen and not-previously-issued question, snapshots its revision, and only compares a matching answer **after issuance**. It rejects a second answer to the same issued question as a replay.

**Limits:** The host must persist issue events durably before showing questions and atomically coordinate multi-device writes. There is no cryptographic authentication or student identity binding; clients with write access can forge issue events. The existing descriptive V4 API remains backward-compatible and is **not** automatically upgraded to verified issuance; use the new API when trustworthy attribution is required. Correctness is not mastery or proof that teaching caused a change.
