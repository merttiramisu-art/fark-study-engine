/**
 * FARK Concept Map V1 — explicit curriculum prerequisites plus recorded
 * answer-key observations. No guessed links, diagnoses, unlocks or mastery.
 * Zero runtime dependencies; does not mutate core or assessment history.
 */
import { validateKnowledgeCore } from './knowledge-core.js';
import { summarizeAssessments } from './assessment.js';

export const CONCEPT_MAP_LIMITS = Object.freeze({ maxOutcomes: 150, maxPrerequisiteEdges: 600 });

function statusFor(row) {
  if (row.attempts === 0) return 'not-observed';
  if (row.correct > 0 && row.incorrect > 0) return 'mixed-observations';
  return row.incorrect > 0 ? 'incorrect-observed' : 'correct-observed';
}

/**
 * Node levels represent longest prerequisite paths for layout, not difficulty
 * or readiness. Cross-unit prerequisite edges remain explicit and visible.
 */
export function buildConceptMap(core, history) {
  validateKnowledgeCore(core);
  if (core.outcomes.length > CONCEPT_MAP_LIMITS.maxOutcomes) {
    throw new RangeError('concept map exceeds 150 outcomes');
  }
  const count = core.outcomes.reduce((n, o) => n + (o.prerequisiteIds?.length ?? 0), 0);
  if (count > CONCEPT_MAP_LIMITS.maxPrerequisiteEdges) {
    throw new RangeError('concept map exceeds 600 declared prerequisite edges');
  }
  const assessment = summarizeAssessments(core, history);
  const outcomes = new Map(core.outcomes.map(o => [o.id, o]));
  const units = new Map(core.units.map(u => [u.id, u]));
  const observations = new Map(assessment.outcomes.map(row => [row.outcomeId, row]));
  const depthCache = new Map();
  function level(id) {
    if (depthCache.has(id)) return depthCache.get(id);
    const prerequisites = outcomes.get(id).prerequisiteIds ?? [];
    const result = prerequisites.length
      ? 1 + Math.max(...prerequisites.map(level)) : 0;
    depthCache.set(id, result);
    return result;
  }

  const nodes = core.outcomes.map(o => {
    const obs = observations.get(o.id);
    const prerequisiteIds = [...(o.prerequisiteIds ?? [])].sort();
    const dependentIds = core.outcomes.filter(other =>
      (other.prerequisiteIds ?? []).includes(o.id)).map(other => other.id).sort();
    return {
      id:o.id, label:o.label, unitId:o.unitId, unitLabel:units.get(o.unitId).label,
      level:level(o.id), prerequisiteIds, dependentIds,
      questionIds:core.questions.filter(q=>q.outcomeIds.includes(o.id)).map(q=>q.id).sort(),
      resourceIds:core.resources.filter(r=>r.outcomeIds.includes(o.id)).map(r=>r.id).sort(),
      attempts:obs.attempts, correct:obs.correct, incorrect:obs.incorrect,
      status:statusFor(obs), misconceptionCounts:{...obs.misconceptionCounts},
      mastery:null
    };
  }).sort((a,b)=>a.level-b.level||a.label.localeCompare(b.label,'en')||a.id.localeCompare(b.id,'en'));

  const edges = core.outcomes.flatMap(outcome =>
    (outcome.prerequisiteIds ?? []).map(id => ({
      from:id, to:outcome.id, kind:'declared-prerequisite'
    }))
  ).sort((a,b)=>a.from.localeCompare(b.from,'en')||a.to.localeCompare(b.to,'en'));

  return {
    format:'fark-concept-map', version:1,
    nodes, edges,
    levels:[...new Set(nodes.map(node=>node.level))],
    excluded:{staleAttemptIds:[...assessment.staleAttempts],orphanAttemptIds:[...assessment.orphanAttempts]},
    mastery:null,
    disclaimer:'Arrows are explicitly declared curricular prerequisites, not proven causal dependencies or access restrictions. Observed answer-key correctness does not establish mastery. A concept without observations is unknown, not failed; multi-outcome questions share evidence.'
  };
}
