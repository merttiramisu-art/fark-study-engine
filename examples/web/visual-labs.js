/**
 * Pure, zero-dependency, XSS-safe interactive SVG visualizations for FARK Study Engine:
 * 1. Topological Knowledge & Prerequisite DAG Map (dual-coded status + keyboard accessible).
 * 2. Live DSR Power-Law Forgetting Curve R(t) = (1 + t/(9S))^-1 with interactive day scrubber.
 */
import { computeRetrievability } from '../../src/memory.js';

function createSvgEl(tag, attrs = {}) {
  const el =
    typeof document.createElementNS === 'function'
      ? document.createElementNS('http://www.w3.org/2000/svg', tag)
      : document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
  return el;
}

function outcomeStatus(outcomeRow, readinessRow, verifiedOutcomeIds) {
  if (verifiedOutcomeIds?.has(outcomeRow.outcomeId)) return 'verified';
  if (outcomeRow.teachingCompletions > 0 && outcomeRow.incorrect > 0) return 'remediated';
  if (outcomeRow.incorrect > 0) return 'difficulty';
  if (outcomeRow.correct > 0) return 'observed-correct';
  if (readinessRow && !readinessRow.ready) return 'incomplete-content';
  return 'unobserved';
}

const STATUS_META = {
  verified: {
    glyph: '✓',
    en: 'Verified follow-up',
    tr: 'Doğrulandı',
    stroke: '#0f766e',
    fill: '#e6f7f4',
    darkFill: '#123532',
    text: '#0f5c56'
  },
  remediated: {
    glyph: '◐',
    en: 'Lesson done',
    tr: 'Telafi edildi',
    stroke: '#4f46b5',
    fill: '#efedfd',
    darkFill: '#24204a',
    text: '#43389b'
  },
  difficulty: {
    glyph: '▲',
    en: 'Needs focus',
    tr: 'Zorlanılan',
    stroke: '#b91c1c',
    fill: '#fef2f2',
    darkFill: '#3b181b',
    text: '#991b1b'
  },
  'observed-correct': {
    glyph: '●',
    en: 'Observed correct',
    tr: 'Doğru gözlem',
    stroke: '#0284c7',
    fill: '#eff8ff',
    darkFill: '#142c40',
    text: '#0369a1'
  },
  'incomplete-content': {
    glyph: '!',
    en: 'Draft content',
    tr: 'Eksik içerik',
    stroke: '#b45309',
    fill: '#fffbeb',
    darkFill: '#3b2b12',
    text: '#92400e'
  },
  unobserved: {
    glyph: '○',
    en: 'Unobserved',
    tr: 'Gözlemlenmedi',
    stroke: '#94a3b8',
    fill: '#ffffff',
    darkFill: '#1b2033',
    text: '#475569'
  }
};

function computeTopologicalLayout(outcomes) {
  const byId = new Map(outcomes.map(o => [o.id, o]));
  const depthMemo = new Map();
  const visiting = new Set();

  function depthOf(id) {
    if (depthMemo.has(id)) return depthMemo.get(id);
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const node = byId.get(id);
    const parents = (node?.prerequisiteIds ?? []).filter(pid => byId.has(pid));
    const d = parents.length ? 1 + Math.max(...parents.map(depthOf)) : 0;
    visiting.delete(id);
    depthMemo.set(id, d);
    return d;
  }

  const columns = new Map();
  for (const outcome of outcomes) {
    const col = depthOf(outcome.id);
    if (!columns.has(col)) columns.set(col, []);
    columns.get(col).push(outcome);
  }

  const maxCols = Math.max(1, columns.size);
  const maxRows = Math.max(1, ...[...columns.values()].map(list => list.length));
  const nodeW = 196;
  const nodeH = 74;
  const gapX = 64;
  const gapY = 26;
  const padX = 24;
  const padY = 24;

  const width = padX * 2 + maxCols * nodeW + (maxCols - 1) * gapX;
  const height = padY * 2 + maxRows * nodeH + (maxRows - 1) * gapY;

  const positions = new Map();
  const sortedCols = [...columns.keys()].sort((a, b) => a - b);
  for (const colIdx of sortedCols) {
    const list = columns.get(colIdx);
    const colHeight = list.length * nodeH + (list.length - 1) * gapY;
    const startY = Math.round((height - colHeight) / 2);
    list.forEach((outcome, rowIdx) => {
      positions.set(outcome.id, {
        x: padX + colIdx * (nodeW + gapX),
        y: startY + rowIdx * (nodeH + gapY),
        w: nodeW,
        h: nodeH
      });
    });
  }

  return { positions, width, height };
}

function truncateLabel(text, max = 26) {
  const s = String(text ?? '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function renderConceptMapSvg(container, {
  core,
  evidenceReport,
  readiness,
  verifiedOutcomeIds = new Set(),
  selectedOutcomeId,
  lang = 'en',
  isDark = false,
  onSelect
}) {
  if (!container) return;
  const outcomes = core?.outcomes ?? [];
  if (!outcomes.length) {
    const empty = document.createElement('p');
    empty.className = 'insight-subnote';
    empty.textContent = lang === 'tr' ? 'Haritalanacak kazanım bulunmuyor.' : 'No outcomes to visualize yet.';
    container.replaceChildren(empty);
    return;
  }

  const evidenceById = new Map((evidenceReport?.outcomes ?? []).map(o => [o.outcomeId, o]));
  const readinessById = new Map((readiness?.outcomes ?? []).map(o => [o.outcomeId, o]));
  const { positions, width, height } = computeTopologicalLayout(outcomes);

  const svg = createSvgEl('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'concept-map-svg',
    role: 'img',
    'aria-label': lang === 'tr' ? 'Etkileşimli kavram ve ön koşul haritası' : 'Interactive concept and prerequisite map'
  });

  const defs = createSvgEl('defs');
  const marker = createSvgEl('marker', {
    id: 'fark-arrow',
    viewBox: '0 0 10 10',
    refX: '9',
    refY: '5',
    markerWidth: '6',
    markerHeight: '6',
    orient: 'auto-start-reverse'
  });
  marker.append(createSvgEl('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: isDark ? '#7b84a6' : '#9aa0b8' }));
  defs.append(marker);

  const activeMarker = createSvgEl('marker', {
    id: 'fark-arrow-active',
    viewBox: '0 0 10 10',
    refX: '9',
    refY: '5',
    markerWidth: '6',
    markerHeight: '6',
    orient: 'auto-start-reverse'
  });
  activeMarker.append(createSvgEl('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: '#4f46b5' }));
  defs.append(activeMarker);
  svg.append(defs);

  // Edges first
  const edgeLayer = createSvgEl('g', { class: 'map-edges' });
  for (const outcome of outcomes) {
    const targetPos = positions.get(outcome.id);
    if (!targetPos) continue;
    for (const parentId of outcome.prerequisiteIds ?? []) {
      const parentPos = positions.get(parentId);
      if (!parentPos) continue;
      const x1 = parentPos.x + parentPos.w;
      const y1 = parentPos.y + parentPos.h / 2;
      const x2 = targetPos.x;
      const y2 = targetPos.y + targetPos.h / 2;
      const midX = (x1 + x2) / 2;
      const isRelated = outcome.id === selectedOutcomeId || parentId === selectedOutcomeId;
      const path = createSvgEl('path', {
        d: `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2 - 4} ${y2}`,
        fill: 'none',
        stroke: isRelated ? '#4f46b5' : (isDark ? '#3a4159' : '#c6cae0'),
        'stroke-width': isRelated ? '2.4' : '1.6',
        'marker-end': isRelated ? 'url(#fark-arrow-active)' : 'url(#fark-arrow)'
      });
      edgeLayer.append(path);
    }
  }
  svg.append(edgeLayer);

  // Interactive Nodes
  const nodeLayer = createSvgEl('g', { class: 'map-nodes' });
  for (const outcome of outcomes) {
    const pos = positions.get(outcome.id);
    const ev = evidenceById.get(outcome.id) ?? { outcomeId: outcome.id, attempts: 0, correct: 0, incorrect: 0, teachingCompletions: 0 };
    const readyRow = readinessById.get(outcome.id);
    const statusKey = outcomeStatus(ev, readyRow, verifiedOutcomeIds);
    const meta = STATUS_META[statusKey] ?? STATUS_META.unobserved;
    const isSelected = outcome.id === selectedOutcomeId;
    const displayLabel = lang === 'tr' && outcome.labelTr ? outcome.labelTr : outcome.label;

    const group = createSvgEl('g', {
      class: 'map-node' + (isSelected ? ' is-selected' : ''),
      tabindex: '0',
      role: 'button',
      'aria-pressed': String(isSelected),
      'aria-label': `${displayLabel} — ${meta[lang]}`
    });

    const rect = createSvgEl('rect', {
      x: pos.x,
      y: pos.y,
      width: pos.w,
      height: pos.h,
      rx: '12',
      fill: isDark ? meta.darkFill : meta.fill,
      stroke: isSelected ? '#4f46b5' : meta.stroke,
      'stroke-width': isSelected ? '2.8' : '1.4'
    });
    group.append(rect);

    const statusLine = createSvgEl('text', {
      x: pos.x + 12,
      y: pos.y + 21,
      'font-size': '10.5',
      'font-weight': '700',
      fill: isDark ? '#cbd5e1' : meta.text
    });
    statusLine.textContent = `${meta.glyph} ${meta[lang]}`;
    group.append(statusLine);

    const titleLine = createSvgEl('text', {
      x: pos.x + 12,
      y: pos.y + 42,
      'font-size': '12.5',
      'font-weight': '700',
      fill: isDark ? '#f1f5f9' : '#1e2238'
    });
    titleLine.textContent = truncateLabel(displayLabel, 25);
    group.append(titleLine);

    const statsLine = createSvgEl('text', {
      x: pos.x + 12,
      y: pos.y + 60,
      'font-size': '10.5',
      fill: isDark ? '#94a3b8' : '#5b617a'
    });
    statsLine.textContent =
      ev.attempts > 0
        ? (lang === 'tr' ? `${ev.correct}/${ev.attempts} doğru · ${ev.incorrect} yanlış` : `${ev.correct}/${ev.attempts} correct · ${ev.incorrect} missed`)
        : (lang === 'tr' ? 'Henüz deneme yok' : 'No attempts yet');
    group.append(statsLine);

    const activate = () => onSelect?.(outcome.id);
    group.addEventListener('click', activate);
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault?.();
        activate();
      }
    });

    nodeLayer.append(group);
  }
  svg.append(nodeLayer);
  container.replaceChildren(svg);
}

export function renderDsrCurveSvg(container, {
  stability = 3.0,
  elapsedDay = 3,
  maxDays = 30,
  lang = 'en',
  isDark = false
}) {
  if (!container) return;
  const safeS = Math.max(0.25, Number(stability) || 1);
  const safeDay = Math.max(0, Math.min(maxDays, Number(elapsedDay) || 0));

  const W = 380;
  const H = 175;
  const padL = 38;
  const padR = 16;
  const padT = 14;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xOf = day => padL + (day / maxDays) * plotW;
  const yOf = r => padT + (1 - r) * plotH;

  const svg = createSvgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'dsr-curve-svg',
    role: 'img',
    'aria-label': lang === 'tr'
      ? `DSR unutma eğrisi, kararlılık ${safeS.toFixed(1)} gün`
      : `DSR forgetting curve with stability ${safeS.toFixed(1)} days`
  });

  const gridColor = isDark ? '#2a3147' : '#e4e7f2';
  const axisText = isDark ? '#94a3b8' : '#5f657d';

  // Horizontal percentage grid lines (100%, 90%, 50%, 0%)
  for (const pct of [1, 0.9, 0.5, 0]) {
    const y = yOf(pct);
    svg.append(createSvgEl('line', {
      x1: padL,
      y1: y,
      x2: W - padR,
      y2: y,
      stroke: pct === 0.9 ? '#0f766e' : gridColor,
      'stroke-width': pct === 0.9 ? '1.2' : '1',
      ...(pct === 0.9 ? { 'stroke-dasharray': '4 3' } : {})
    }));
    const lbl = createSvgEl('text', {
      x: padL - 6,
      y: y + 3.5,
      'text-anchor': 'end',
      'font-size': '9.5',
      fill: pct === 0.9 ? '#0f766e' : axisText
    });
    lbl.textContent = `${Math.round(pct * 100)}%`;
    svg.append(lbl);
  }

  // X-axis ticks
  for (const d of [0, 7, 14, 21, 30]) {
    const x = xOf(d);
    const lbl = createSvgEl('text', {
      x,
      y: H - 10,
      'text-anchor': 'middle',
      'font-size': '9.5',
      fill: axisText
    });
    lbl.textContent = lang === 'tr' ? `${d}g` : `D${d}`;
    svg.append(lbl);
  }

  // Curve path
  const points = [];
  for (let d = 0; d <= maxDays; d += 0.5) {
    const r = computeRetrievability(d, safeS) ?? 0;
    points.push(`${xOf(d).toFixed(1)},${yOf(r).toFixed(1)}`);
  }
  const areaPath = `M ${xOf(0).toFixed(1)},${yOf(0).toFixed(1)} L ${points.join(' L ')} L ${xOf(maxDays).toFixed(1)},${yOf(0).toFixed(1)} Z`;
  svg.append(createSvgEl('path', {
    d: areaPath,
    fill: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(79, 70, 181, 0.10)'
  }));

  svg.append(createSvgEl('path', {
    d: `M ${points.join(' L ')}`,
    fill: 'none',
    stroke: '#4f46b5',
    'stroke-width': '2.4'
  }));

  // Active day marker
  const currentR = computeRetrievability(safeDay, safeS) ?? 0;
  const mx = xOf(safeDay);
  const my = yOf(currentR);
  svg.append(createSvgEl('line', {
    x1: mx,
    y1: padT,
    x2: mx,
    y2: padT + plotH,
    stroke: '#b45309',
    'stroke-width': '1.2',
    'stroke-dasharray': '3 3'
  }));
  svg.append(createSvgEl('circle', {
    cx: mx,
    cy: my,
    r: '5',
    fill: '#ffffff',
    stroke: '#4f46b5',
    'stroke-width': '2.5'
  }));

  container.replaceChildren(svg);
  return { predictedR: currentR, stability: safeS, day: safeDay };
}
