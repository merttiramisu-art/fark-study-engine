# V4.1 — Offline learning-session checkpoints and safe resume

This package provides **portable JSON snapshots**, not a database or browser local-storage implementation. The host application decides where and how to persist them, and must protect student data with appropriate storage, access control, privacy and backup policies.

## Flow

1. Record a real incorrect answer in the assessment history.
2. Call `createLearningSession(core, assessments, teaching, {sessionId,baselineAttemptId,outcomeId,at})`.
3. Save `serializeLearningSession(session)` in application-owned storage. On restart, use `parseLearningSession(json)`.
4. Call `resumeLearningSession(core,session,{at,assessments,teaching})` with the latest persisted event histories. Earlier checkpoint events must still exist unchanged; conflicts throw instead of silently losing answers.
5. Read `step.nextAction` from the V4 orchestrator. Only an explicitly recorded lesson completion unlocks reassessment. A later distinct-question answer produces a descriptive comparison.
6. Run the public synthetic example with `npm run demo:session` or `node examples/learning-session-demo.js`.

The session snapshot includes baseline question ID/revision and copied assessment and teaching event histories. Content changes make stale baselines visible; future completions do not count. JSON parsing rejects malformed/oversized input and validates the snapshot shape.

**Limits:** JSON is not authenticated or encrypted. A malicious actor who can rewrite both snapshot and event history may forge progress. The host must protect integrity and privacy. The API does not write to disk, handle multi-device conflicts, authenticate users, or verify actual lesson reading. The synthetic demo is not a real KPSS curriculum, production student UI or efficacy validation.
