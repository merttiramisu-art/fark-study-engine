/**
 * FARK Visual Learning V1 — original declarative number-line and chronology
 * models. Pure and offline; labels are inert text, never generated markup.
 * No learner evaluation, historical fact-checking or mastery assertions.
 */
export const VISUAL_LEARNING_LIMITS = Object.freeze({
  minNumber: -12, maxNumber: 12, maxPoints: 8,
  minYear: -3000, maxYear: 3000, maxEvents: 8
});

function onlyKeys(data, allowed, label) {
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.keys(data).some(key => !allowed.includes(key))) {
    throw new TypeError('invalid ' + label + ' shape');
  }
}
function int(value, min, max, name) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(name + ' must be an integer from ' + min + ' to ' + max);
  }
  return value;
}
function nonempty(value, name, max = 100) {
  if (typeof value !== 'string' || value !== value.trim() ||
      !value || value.length > max) throw new TypeError('invalid ' + name);
  return value;
}

/** Exact integer number-line diagram, including negative values and zero. */
export function buildNumberLineModel(input) {
  onlyKeys(input, ['min', 'max', 'points'], 'number-line');
  const min = int(input.min, -12, 12, 'min');
  const max = int(input.max, -12, 12, 'max');
  if (min >= max) throw new RangeError('min must be less than max');
  if (!Array.isArray(input.points) || input.points.length < 1 ||
      input.points.length > VISUAL_LEARNING_LIMITS.maxPoints) {
    throw new RangeError('number-line requires 1 to 8 points');
  }
  const selected = input.points.map((v, i) => int(v, min, max, 'point[' + i + ']'));
  if (new Set(selected).size !== selected.length) {
    throw new RangeError('duplicate number-line point');
  }
  const points = selected.sort((a, b) => a - b);
  return {
    kind: 'number-line', min, max, points,
    ticks: Array.from({ length: max - min + 1 }, (_, i) => ({
      value: min + i, selected: points.includes(min + i)
    })),
    summary: 'Number line from ' + min + ' to ' + max +
      '; marked points: ' + points.join(', '),
    mastery: null
  };
}

/**
 * An illustrative chronology, NOT a historical-fact validator. Negative
 * integers are abstract ordering coordinates, not BCE calendar conversion.
 */
export function buildTimelineModel(input) {
  onlyKeys(input, ['events'], 'timeline');
  if (!Array.isArray(input.events) || input.events.length < 2 ||
      input.events.length > VISUAL_LEARNING_LIMITS.maxEvents) {
    throw new RangeError('timeline requires 2 to 8 events');
  }
  const ids = new Set();
  const events = input.events.map((value, i) => {
    onlyKeys(value, ['id', 'year', 'label'], 'event');
    const id = nonempty(value.id, 'event.id', 80);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(id)) {
      throw new RangeError('invalid event.id');
    }
    if (ids.has(id)) throw new RangeError('duplicate timeline event id');
    ids.add(id);
    return {
      id,
      year: int(value.year, -3000, 3000, 'event.year'),
      label: nonempty(value.label, 'event.label', 120)
    };
  }).sort((a, b) => a.year - b.year || a.id.localeCompare(b.id, 'en'));
  return {
    kind: 'timeline', events,
    summary: 'Illustrative chronology with ' + events.length +
      ' events, ordered by numeric year',
    mastery: null
  };
}
