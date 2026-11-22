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
    const pctVal = Math.round(pct * 100);
    lbl.textContent = lang === 'tr' ? `%${pctVal}` : `${pctVal}%`;
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

/**
 * Render an editorial SVG Metacognitive Calibration / Reliability Diagram:
 * Expected confidence (30% / 65% / 90%) vs Observed accuracy with diagonal perfect-calibration guide.
 */
export function renderCalibrationDiagramSvg(container, {
  report,
  lang = 'en',
  isDark = false
}) {
  if (!container) return;
  const W = 400;
  const H = 216;
  const padL = 42;
  const padR = 18;
  const padT = 28;
  const padB = 38;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xOf = p => padL + p * plotW;
  const yOf = p => padT + (1 - p) * plotH;

  const svg = createSvgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'calibration-svg',
    role: 'img',
    'aria-label': lang === 'tr'
      ? 'Üstbilişsel güven ve doğruluk kalibrasyon diyagramı'
      : 'Metacognitive confidence vs accuracy calibration diagram'
  });

  const gridColor = isDark ? '#2a3147' : '#e4e7f2';
  const axisText = isDark ? '#94a3b8' : '#5f657d';
  const diagColor = isDark ? '#64748b' : '#94a3b8';

  // Subtle overconfidence triangle (below diagonal)
  svg.append(createSvgEl('polygon', {
    points: `${xOf(0)},${yOf(0)} ${xOf(1)},${yOf(1)} ${xOf(1)},${yOf(0)}`,
    fill: isDark ? 'rgba(220, 38, 38, 0.06)' : 'rgba(185, 28, 28, 0.045)'
  }));

  // Horizontal grid lines
  for (const pct of [0, 0.5, 1]) {
    const y = yOf(pct);
    svg.append(createSvgEl('line', {
      x1: padL,
      y1: y,
      x2: W - padR,
      y2: y,
      stroke: gridColor,
      'stroke-width': '1'
    }));
    const lbl = createSvgEl('text', {
      x: padL - 7,
      y: y + 3.5,
      'text-anchor': 'end',
      'font-size': '9.5',
      fill: axisText
    });
    const pctVal = Math.round(pct * 100);
    lbl.textContent = lang === 'tr' ? `%${pctVal}` : `${pctVal}%`;
    svg.append(lbl);
  }

  // Diagonal perfect calibration line (y = x)
  svg.append(createSvgEl('line', {
    x1: xOf(0),
    y1: yOf(0),
    x2: xOf(1),
    y2: yOf(1),
    stroke: diagColor,
    'stroke-width': '1.3',
    'stroke-dasharray': '5 4'
  }));

  // Top-left legend strip (collision-free above plot area)
  const diagLabel = createSvgEl('text', {
    x: padL,
    y: 13,
    'font-size': '9',
    'font-weight': '600',
    fill: axisText
  });
  diagLabel.textContent = lang === 'tr' ? '- - Tam kalibrasyon (y = x)' : '- - Perfect calibration (y = x)';
  svg.append(diagLabel);

  const overLabel = createSvgEl('text', {
    x: W - padR,
    y: 13,
    'text-anchor': 'end',
    'font-size': '9',
    'font-weight': '600',
    fill: isDark ? '#f87171' : '#b91c1c'
  });
  overLabel.textContent = lang === 'tr' ? '■ Aşırı güven bölgesi (alt)' : '■ Overconfidence zone (below)';
  svg.append(overLabel);

  const buckets = report?.buckets ?? [];
  const levelNames = {
    low: lang === 'tr' ? 'Tahmin (%30)' : 'Guess (30%)',
    medium: lang === 'tr' ? 'Kararsız (%65)' : 'Unsure (65%)',
    high: lang === 'tr' ? 'Eminim (%90)' : 'Sure (90%)'
  };

  const observedPoints = [];

  for (const b of buckets) {
    const cx = xOf(b.expectedAccuracy);
    const barW = 36;

    // X-axis bucket label
    const xLbl = createSvgEl('text', {
      x: cx,
      y: H - 18,
      'text-anchor': 'middle',
      'font-size': '9.5',
      'font-weight': '700',
      fill: axisText
    });
    xLbl.textContent = levelNames[b.level] ?? b.level;
    svg.append(xLbl);

    const nLbl = createSvgEl('text', {
      x: cx,
      y: H - 6,
      'text-anchor': 'middle',
      'font-size': '8.5',
      fill: axisText
    });
    nLbl.textContent = `n=${b.count}`;
    svg.append(nLbl);

    if (b.count > 0 && b.observedAccuracy != null) {
      const cy = yOf(b.observedAccuracy);
      observedPoints.push(`${cx.toFixed(1)},${cy.toFixed(1)}`);

      const isHyperAlert = b.level === 'high' && (report?.hypercorrectionCount ?? 0) > 0 && b.observedAccuracy < 0.85;
      const barFill = isHyperAlert
        ? (isDark ? 'rgba(248, 113, 113, 0.28)' : 'rgba(185, 28, 28, 0.16)')
        : (isDark ? 'rgba(99, 102, 241, 0.30)' : 'rgba(79, 70, 181, 0.18)');
      const barStroke = isHyperAlert ? '#b91c1c' : '#4f46b5';

      svg.append(createSvgEl('rect', {
        x: cx - barW / 2,
        y: cy,
        width: barW,
        height: Math.max(2, yOf(0) - cy),
        rx: '5',
        fill: barFill,
        stroke: barStroke,
        'stroke-width': '1.4'
      }));

      // Position percentage cleanly above the dot without overlapping the dot or top legend
      const labelY = b.observedAccuracy >= 0.92 ? cy + 16 : cy - 9;
      const valLbl = createSvgEl('text', {
        x: cx,
        y: labelY,
        'text-anchor': 'middle',
        'font-size': '10',
        'font-weight': '700',
        fill: isDark ? '#f1f5f9' : '#1e2238'
      });
      const obsPct = Math.round(b.observedAccuracy * 100);
      valLbl.textContent = lang === 'tr' ? `%${obsPct}` : `${obsPct}%`;
      svg.append(valLbl);
    } else {
      // Unobserved dashed reference ring on diagonal
      svg.append(createSvgEl('circle', {
        cx,
        cy: yOf(b.expectedAccuracy),
        r: '4.5',
        fill: 'none',
        stroke: diagColor,
        'stroke-width': '1.2',
        'stroke-dasharray': '2 2'
      }));
    }
  }

  if (observedPoints.length >= 2) {
    svg.append(createSvgEl('polyline', {
      points: observedPoints.join(' '),
      fill: 'none',
      stroke: '#0f766e',
      'stroke-width': '2'
    }));
  }

  for (const b of buckets) {
    if (b.count > 0 && b.observedAccuracy != null) {
      svg.append(createSvgEl('circle', {
        cx: xOf(b.expectedAccuracy),
        cy: yOf(b.observedAccuracy),
        r: '4.2',
        fill: '#ffffff',
        stroke: '#0f766e',
        'stroke-width': '2.2'
      }));
    }
  }

  container.replaceChildren(svg);
}

/**
 * Render an interactive 14-day Forgetting Horizon & Workload SVG chart
 * comparing baseline at-risk concepts (<90% R) vs "What-if I review N today?".
 */
export function renderForgettingHorizonSvg(container, {
  forecast,
  lang = 'en',
  isDark = false
}) {
  if (!container) return;
  const days = forecast?.days ?? [];
  const totalItems = Math.max(1, forecast?.itemCount ?? 1);

  const W = 400;
  const H = 205;
  const padL = 34;
  const padR = 14;
  const padT = 22;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const svg = createSvgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'horizon-svg',
    role: 'img',
    'aria-label': lang === 'tr'
      ? '14 günlük unutma ufku ve çalışma yükü tahmini'
      : '14-day forgetting horizon and study workload forecast'
  });

  const gridColor = isDark ? '#2a3147' : '#e4e7f2';
  const axisText = isDark ? '#94a3b8' : '#5f657d';

  const yOf = count => padT + (1 - Math.min(totalItems, count) / totalItems) * plotH;

  for (const frac of [0, 0.5, 1]) {
    const val = Math.round(totalItems * frac);
    const y = yOf(val);
    svg.append(createSvgEl('line', {
      x1: padL,
      y1: y,
      x2: W - padR,
      y2: y,
      stroke: gridColor,
      'stroke-width': '1'
    }));
    const lbl = createSvgEl('text', {
      x: padL - 6,
      y: y + 3.5,
      'text-anchor': 'end',
      'font-size': '9.5',
      fill: axisText
    });
    lbl.textContent = String(val);
    svg.append(lbl);
  }

  const slotW = plotW / Math.max(1, days.length);
  const barW = Math.max(6, Math.min(16, slotW - 5));
  const simLinePoints = [];

  days.forEach((entry, idx) => {
    const cx = padL + idx * slotW + slotW / 2;
    const baseY = yOf(entry.atRiskCount);
    const baseH = Math.max(2, yOf(0) - baseY);
    const riskRatio = entry.atRiskCount / totalItems;
    const barFill = riskRatio >= 0.7
      ? (isDark ? 'rgba(248, 113, 113, 0.45)' : 'rgba(185, 28, 28, 0.25)')
      : (isDark ? 'rgba(129, 140, 248, 0.35)' : 'rgba(79, 70, 181, 0.22)');
    const barStroke = riskRatio >= 0.7 ? '#b91c1c' : '#4f46b5';

    svg.append(createSvgEl('rect', {
      x: cx - barW / 2,
      y: baseY,
      width: barW,
      height: baseH,
      rx: '3',
      fill: barFill,
      stroke: barStroke,
      'stroke-width': '1.1'
    }));

    const simY = yOf(entry.simulatedAtRiskCount);
    simLinePoints.push(`${cx.toFixed(1)},${simY.toFixed(1)}`);

    if (entry.dayOffset === 0 || entry.dayOffset === 3 || entry.dayOffset === 7 || entry.dayOffset === 10 || entry.dayOffset === 14) {
      const tick = createSvgEl('text', {
        x: cx,
        y: H - 14,
        'text-anchor': 'middle',
        'font-size': '9.5',
        fill: axisText
      });
      tick.textContent = lang === 'tr' ? `+${entry.dayOffset}g` : `D${entry.dayOffset}`;
      svg.append(tick);
    }
  });

  if (simLinePoints.length >= 2 && (forecast?.simulateTodayReviews ?? 0) > 0) {
    svg.append(createSvgEl('polyline', {
      points: simLinePoints.join(' '),
      fill: 'none',
      stroke: '#0f766e',
      'stroke-width': '2.4'
    }));
    days.forEach((entry, idx) => {
      if (entry.dayOffset === 0 || entry.dayOffset === 7 || entry.dayOffset === 14) {
        const cx = padL + idx * slotW + slotW / 2;
        svg.append(createSvgEl('circle', {
          cx,
          cy: yOf(entry.simulatedAtRiskCount),
          r: '3.6',
          fill: '#ffffff',
          stroke: '#0f766e',
          'stroke-width': '2'
        }));
      }
    });
  }

  // Inline compact legend at top
  const legendBase = createSvgEl('text', {
    x: padL,
    y: 12,
    'font-size': '9',
    'font-weight': '700',
    fill: '#4f46b5'
  });
  legendBase.textContent = lang === 'tr' ? '■ Riskli (<%90 R)' : '■ At-risk (<90% R)';
  svg.append(legendBase);

  if ((forecast?.simulateTodayReviews ?? 0) > 0) {
    const legendSim = createSvgEl('text', {
      x: W - padR,
      y: 12,
      'text-anchor': 'end',
      'font-size': '9',
      'font-weight': '700',
      fill: '#0f766e'
    });
    legendSim.textContent = lang === 'tr'
      ? `— Bugün ${forecast.simulateTodayReviews} tekrar ile`
      : `— With ${forecast.simulateTodayReviews} reviews today`;
    svg.append(legendSim);
  }

  container.replaceChildren(svg);
}

