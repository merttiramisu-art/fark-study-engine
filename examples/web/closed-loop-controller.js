/**
 * Closed-Loop Learning Controller for FARK Study Engine Interactive Studio.
 * Connects post-v0.7 engine modules (knowledge-core, assessment, learning-loop,
 * learning-progress, prerequisite-analysis, learning-orchestrator, learning-session,
 * content-readiness, reassessment-ledger) into:
 *  1) Guided Closed-Loop Student Flow (Study Studio sub-mode)
 *  2) Lesson & Curriculum Designer / Ders Tasarımcısı (Deck Studio sub-mode)
 *  3) Interactive Concept Map & Live DSR Forgetting Curve (Learning Intelligence)
 *
 * Zero external network calls. Strict textContent / DOM node construction (XSS-safe).
 */
import { validateKnowledgeCore } from '../../src/knowledge-core.js';
import { createAssessmentHistory, recordAssessment } from '../../src/assessment.js';
import { createTeachingHistory, recordTeachingCompletion } from '../../src/learning-progress.js';
import { getLearningDashboard, getLearningNextStep } from '../../src/learning-orchestrator.js';
import {
  createLearningSession,
  parseLearningSession,
  resumeLearningSession,
  serializeLearningSession
} from '../../src/learning-session.js';
import { auditLearningContent } from '../../src/content-readiness.js';
import {
  createReassessmentLedger,
  issueReassessment,
  verifyIssuedReassessment
} from '../../src/reassessment-ledger.js';
import { KNOWLEDGE_CORE_PRESETS, cloneKnowledgeCorePreset, localizedText } from './knowledge-presets.js';
import { renderConceptMapSvg, renderDsrCurveSvg } from './visual-labs.js';

const CLOSED_LOOP_STORAGE_KEY = 'fark-study-studio-closed-loop-v1';

const COPY = {
  en: {
    modeSpaced: 'Spaced Review',
    modeGuided: 'Guided Closed Loop',
    deckModeCards: 'Flashcard Deck',
    deckModeDesigner: 'Lesson Designer',
    guidedKicker: 'GUIDED CLOSED-LOOP SESSION',
    guidedHeading: 'Assess, diagnose, teach & verify.',
    guidedBlurb: 'Answer a baseline question, inspect prerequisite or misconception signals, complete a focused micro-lesson, and answer a fresh issued question.',
    labelCorePreset: 'Learning module',
    labelOutcomeSelect: 'Target outcome',
    stepLabels: ['1. Baseline', '2. Micro-Lesson', '3. Reassessment', '4. Observed Comparison'],
    submitAnswer: 'Check answer ↗',
    chooseOptionNotice: 'Select an option before submitting.',
    correctBaselineTitle: 'Observed correct on baseline.',
    correctBaselineDesc: 'You answered this baseline item accurately. Remember: one correct item is an observation, not proof of durable mastery. Pick another outcome or move on.',
    nextOutcomeBtn: 'Next outcome →',
    wrongBaselineTitle: 'Missed baseline — targeted lesson ready.',
    misconceptionDetected: id => `Observed distractor tag: ${id}`,
    prereqHint: list => `Prerequisite outcomes with observed difficulty: ${list}`,
    wrongIntuitionLabel: 'Common misconception',
    rightPrincipleLabel: 'Core principle',
    exampleLabel: 'Worked example',
    completeLessonBtn: 'I reviewed this micro-lesson → Issue fresh check',
    reassessKicker: 'ISSUED FOLLOW-UP CHECK (DISTINCT QUESTION)',
    reassessHint: 'This question was explicitly issued after your lesson completion with a pinned revision and timestamp.',
    submitReassessBtn: 'Verify issued answer ✓',
    comparisonVerified: 'Verified issued follow-up',
    comparisonCorrect: 'Correct on distinct follow-up question',
    comparisonIncorrect: 'Still missed on distinct follow-up question',
    comparisonDisclaimer: 'Honest limit: Two answers cannot prove durable mastery or causal teaching impact. Use Spaced Review to consolidate over days.',
    restartOutcomeBtn: 'Practice another outcome ↻',
    saveCheckpointBtn: 'Save Session Checkpoint (JSON) ↗',
    resumeCheckpointBtn: 'Resume Checkpoint ↑',
    checkpointSaved: 'Portable learning-session checkpoint exported (fark-learning-session v1).',
    checkpointResumed: status => `Session checkpoint verified and resumed safely (status: ${status}).`,
    checkpointError: msg => `Checkpoint rejected: ${msg}`,
    noUnansweredBaseline: 'All baseline questions for this outcome have been answered. Switch to another outcome or reset this module.',
    resetModuleBtn: 'Reset module history ↻',
    resetModuleNotice: 'Closed-loop module history reset in memory.',
    mapKicker: 'INTERACTIVE CONCEPT & PREREQUISITE MAP',
    mapHeading: 'Knowledge graph & forgetting curve.',
    mapBlurb: 'Click any outcome node to inspect its prerequisite chain, observed assessment evidence, and live DSR memory decay R(t) = (1 + t/(9S))^-1.',
    inspectorSelectHint: 'Select an outcome on the map.',
    inspectorPrereqs: 'Prerequisites',
    inspectorNone: 'None (foundational outcome)',
    inspectorEvidence: 'Observed evidence',
    inspectorReadiness: 'Editorial readiness',
    inspectorReady: 'Ready for closed loop',
    inspectorBlocked: 'Missing content inventory',
    inspectorPracticeBtn: 'Practice in Guided Loop →',
    inspectorDesignBtn: 'Edit in Lesson Designer',
    dsrCurveTitle: 'Live DSR forgetting curve',
    dsrDayLabel: d => `Forecast day: +${d}d`,
    dsrReadout: (r, s) => `Predicted recall R(t): ${Math.round(r * 100)}% · Stability S = ${s.toFixed(1)}d`,
    designerKicker: 'LESSON & CURRICULUM DESIGNER',
    designerHeading: 'Build verified closed-loop modules.',
    designerBlurb: 'Author units, cycle-checked prerequisite outcomes, misconception-tagged questions, and targeted micro-lessons. Content Readiness checks every outcome live.',
    designerPresetLabel: 'Active curriculum core',
    designerBlankBtn: 'New blank core +',
    designerTryBtn: 'Test in Guided Loop →',
    designerExportBtn: 'Export Core JSON ↗',
    designerImportBtn: 'Import Core JSON ↑',
    readinessTitle: 'Live content readiness audit',
    readinessSummary: (ready, total) => `${ready} / ${total} outcomes ready for full closed loop`,
    problemLabels: {
      'no-assessment-questions': 'No assessment questions',
      'fewer-than-two-gradable-distinct-questions': 'Needs >=2 distinct gradable questions',
      'no-teaching-resource': 'Needs >=1 teaching micro-lesson',
      'prerequisites-without-gradable-questions': 'Prerequisite lacks gradable question'
    },
    formUnitTitle: 'Add Unit',
    formUnitLabel: 'Unit title',
    formUnitBtn: 'Add unit +',
    formOutcomeTitle: 'Add Outcome',
    formOutcomeUnit: 'Parent unit',
    formOutcomeLabel: 'Outcome label',
    formOutcomePrereq: 'Prerequisite (optional)',
    formOutcomeBtn: 'Add outcome +',
    formQuestionTitle: 'Add MCQ Question',
    formQuestionOutcome: 'Target outcome',
    formQuestionPrompt: 'Question prompt',
    formQuestionChoiceA: 'Choice A',
    formQuestionChoiceB: 'Choice B',
    formQuestionChoiceC: 'Choice C (optional)',
    formQuestionCorrect: 'Correct choice',
    formQuestionMisconception: 'Distractor misconception tag (optional)',
    formQuestionBtn: 'Add question +',
    formLessonTitle: 'Add Micro-Lesson',
    formLessonOutcome: 'Target outcome',
    formLessonHeading: 'Lesson title',
    formLessonSummary: 'Core explanation',
    formLessonWrong: 'Common misconception',
    formLessonRight: 'Core principle',
    formLessonMisconception: 'Target misconception tag (optional)',
    formLessonBtn: 'Add micro-lesson +',
    noticeUnitAdded: name => `Added unit "${name}".`,
    noticeOutcomeAdded: name => `Added outcome "${name}" and re-audited readiness.`,
    noticeQuestionAdded: 'Added gradable MCQ item and updated readiness audit.',
    noticeLessonAdded: 'Added editorial micro-lesson and updated readiness audit.',
    noticeCoreExported: 'Knowledge Core exported as fark-knowledge-core v1 JSON.',
    noticeCoreImported: count => `Imported validated Knowledge Core (${count} outcomes).`,
    noticeCoreError: msg => `Knowledge Core validation error: ${msg}`,
    noticeBlankCreated: 'Created a fresh blank Knowledge Core ready for authoring.'
  },
  tr: {
    modeSpaced: 'Aralıklı Tekrar',
    modeGuided: 'Rehberli Kapalı Döngü',
    deckModeCards: 'Kart Destesi',
    deckModeDesigner: 'Ders Tasarımcısı',
    guidedKicker: 'REHBERLİ KAPALI DÖNGÜ OTURUMU',
    guidedHeading: 'Ölç, tanıla, öğret ve yeniden doğrula.',
    guidedBlurb: 'Ön değerlendirme sorusunu çöz; kavram yanılgısı veya ön koşul sinyallerini gör; hedefe yönelik mikro-dersi tamamla ve sistemin ürettiği yeni soruyu yanıtla.',
    labelCorePreset: 'Öğrenme modülü',
    labelOutcomeSelect: 'Hedef kazanım',
    stepLabels: ['1. Ön Ölçme', '2. Mikro-Ders', '3. Yeniden Ölçme', '4. Gözlemlenen Karşılaştırma'],
    submitAnswer: 'Yanıtı kontrol et ↗',
    chooseOptionNotice: 'Göndermeden önce bir seçenek işaretle.',
    correctBaselineTitle: 'Ön değerlendirmede doğru yanıt gözlemlendi.',
    correctBaselineDesc: 'Bu soruyu doğru yanıtladın. Unutma: tek bir doğru yanıt yalnızca bir gözlemdir, kalıcı ustalık kanıtı değildir. Başka bir kazanıma geçebilirsin.',
    nextOutcomeBtn: 'Sonraki kazanım →',
    wrongBaselineTitle: 'Ön ölçmede hata — hedefe yönelik mikro-ders hazır.',
    misconceptionDetected: id => `Gözlemlenen çeldirici etiketi: ${id}`,
    prereqHint: list => `Zorlanılan ön koşul kazanımları: ${list}`,
    wrongIntuitionLabel: 'Yaygın kavram yanılgısı',
    rightPrincipleLabel: 'Doğru temel ilke',
    exampleLabel: 'Çözümlü örnek',
    completeLessonBtn: 'Mikro-dersi tamamladım → Yeni soru çıkar',
    reassessKicker: 'DENETİMLİ YENİDEN ÖLÇME (FARKLI SORU)',
    reassessHint: 'Bu soru, öğretim tamamlama olayından sonra sürüm ve zaman damgasıyla özel olarak çıkarıldı.',
    submitReassessBtn: 'Yeniden ölçme yanıtını doğrula ✓',
    comparisonVerified: 'Doğrulanan yeniden ölçme',
    comparisonCorrect: 'Farklı takip sorusunda doğru yanıt',
    comparisonIncorrect: 'Farklı takip sorusunda hâlâ hata var',
    comparisonDisclaimer: 'Dürüst sınır: İki yanıt kalıcı ustalığı veya öğretimin nedensel etkisini tek başına kanıtlamaz. Pekiştirmek için Aralıklı Tekrar kullan.',
    restartOutcomeBtn: 'Başka kazanım çalış ↻',
    saveCheckpointBtn: 'Oturum Kaydı İndir (JSON) ↗',
    resumeCheckpointBtn: 'Oturum Yükle ↑',
    checkpointSaved: 'Taşınabilir oturum kaydı indirildi (fark-learning-session v1).',
    checkpointResumed: status => `Oturum kaydı çakışma kontrolünden geçerek yüklendi (durum: ${status}).`,
    checkpointError: msg => `Oturum kaydı reddedildi: ${msg}`,
    noUnansweredBaseline: 'Bu kazanımdaki tüm ön değerlendirme soruları çözüldü. Başka bir kazanım seçebilir veya modül geçmişini sıfırlayabilirsin.',
    resetModuleBtn: 'Modül geçmişini sıfırla ↻',
    resetModuleNotice: 'Kapalı döngü modül geçmişi sıfırlandı.',
    mapKicker: 'ETKİLEŞİMLİ KAVRAM VE ÖN KOŞUL HARİTASI',
    mapHeading: 'Bilgi grafiği ve unutma eğrisi.',
    mapBlurb: 'Herhangi bir kazanım düğümüne tıklayarak ön koşul zincirini, gözlemlenen kanıtları ve canlı DSR unutma eğrisini R(t) = (1 + t/(9S))^-1 incele.',
    inspectorSelectHint: 'Haritadan bir kazanım seç.',
    inspectorPrereqs: 'Ön koşullar',
    inspectorNone: 'Yok (temel kazanım)',
    inspectorEvidence: 'Gözlemlenen kanıt',
    inspectorReadiness: 'İçerik hazırlık durumu',
    inspectorReady: 'Kapalı döngüye hazır',
    inspectorBlocked: 'Eksik içerik envanteri',
    inspectorPracticeBtn: 'Kapalı Döngüde Çalış →',
    inspectorDesignBtn: 'Ders Tasarımcısında Düzenle',
    dsrCurveTitle: 'Canlı DSR unutma eğrisi',
    dsrDayLabel: d => `Tahmin günü: +${d}g`,
    dsrReadout: (r, s) => `Tahmini hatırlama R(t): %${Math.round(r * 100)} · Kararlılık S = ${s.toFixed(1)}g`,
    designerKicker: 'DERS VE MÜFREDAT TASARIMCISI',
    designerHeading: 'Doğrulanmış kapalı döngü dersleri oluştur.',
    designerBlurb: 'Üniteler, döngü korumalı ön koşul kazanımları, kavram yanılgısı etiketli sorular ve hedefe yönelik mikro-dersler oluştur. İçerik Hazırlık Denetimi anlık çalışır.',
    designerPresetLabel: 'Aktif müfredat çekirdeği',
    designerBlankBtn: 'Boş çekirdek oluştur +',
    designerTryBtn: 'Öğrenci Modunda Dene →',
    designerExportBtn: 'Çekirdeği İndir (JSON) ↗',
    designerImportBtn: 'Çekirdek Yükle (JSON) ↑',
    readinessTitle: 'Canlı içerik hazırlık denetimi',
    readinessSummary: (ready, total) => `${ready} / ${total} kazanım tam kapalı döngü için hazır`,
    problemLabels: {
      'no-assessment-questions': 'Değerlendirme sorusu yok',
      'fewer-than-two-gradable-distinct-questions': 'En az 2 bağımsız çoktan seçmeli soru gerekli',
      'no-teaching-resource': 'En az 1 telafi mikro-dersi gerekli',
      'prerequisites-without-gradable-questions': 'Ön koşul kazanımında değerlendirme sorusu eksik'
    },
    formUnitTitle: 'Ünite Ekle',
    formUnitLabel: 'Ünite adı',
    formUnitBtn: 'Ünite ekle +',
    formOutcomeTitle: 'Kazanım Ekle',
    formOutcomeUnit: 'Bağlı ünite',
    formOutcomeLabel: 'Kazanım başlığı',
    formOutcomePrereq: 'Ön koşul kazanımı (isteğe bağlı)',
    formOutcomeBtn: 'Kazanım ekle +',
    formQuestionTitle: 'Çoktan Seçmeli Soru Ekle',
    formQuestionOutcome: 'Hedef kazanım',
    formQuestionPrompt: 'Soru metni',
    formQuestionChoiceA: 'Seçenek A',
    formQuestionChoiceB: 'Seçenek B',
    formQuestionChoiceC: 'Seçenek C (isteğe bağlı)',
    formQuestionCorrect: 'Doğru seçenek',
    formQuestionMisconception: 'Çeldirici yanılgı etiketi (isteğe bağlı)',
    formQuestionBtn: 'Soru ekle +',
    formLessonTitle: 'Mikro-Ders Ekle',
    formLessonOutcome: 'Hedef kazanım',
    formLessonHeading: 'Ders başlığı',
    formLessonSummary: 'Temel açıklama',
    formLessonWrong: 'Yaygın yanılgı',
    formLessonRight: 'Doğru ilke',
    formLessonMisconception: 'Hedef yanılgı etiketi (isteğe bağlı)',
    formLessonBtn: 'Mikro-ders ekle +',
    noticeUnitAdded: name => `"${name}" ünitesi eklendi.`,
    noticeOutcomeAdded: name => `"${name}" kazanımı eklendi ve hazırlık denetimi güncellendi.`,
    noticeQuestionAdded: 'Çoktan seçmeli soru eklendi ve hazırlık denetimi güncellendi.',
    noticeLessonAdded: 'Editoryal mikro-ders eklendi ve hazırlık denetimi güncellendi.',
    noticeCoreExported: 'Öğrenme Çekirdeği fark-knowledge-core v1 JSON olarak indirildi.',
    noticeCoreImported: count => `Doğrulanmış Öğrenme Çekirdeği yüklendi (${count} kazanım).`,
    noticeCoreError: msg => `Öğrenme Çekirdeği doğrulama hatası: ${msg}`,
    noticeBlankCreated: 'Yeni boş Öğrenme Çekirdeği oluşturuldu.'
  }
};

function slugId(prefix, raw) {
  const clean = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return `${prefix}-${clean || 'item'}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export function initClosedLoopStudio(host) {
  const $ = id => document.getElementById(id);
  const copy = () => COPY[host.getLang()] ?? COPY.en;

  let studySubMode = 'spaced'; // 'spaced' | 'guided'
  let deckSubMode = 'cards'; // 'cards' | 'designer'
  let activePresetId = 'english-grammar';
  let core = cloneKnowledgeCorePreset(activePresetId);
  let assessments = createAssessmentHistory();
  let teaching = createTeachingHistory();
  let reassessmentLedger = createReassessmentLedger();

  let selectedOutcomeId = core.outcomes[0]?.id ?? '';
  let mapSelectedOutcomeId = core.outcomes[0]?.id ?? '';
  let activeBaselineAttemptId = null;
  let activeIssueId = null;
  let lastVerifiedResult = null;
  let lastBaselineCorrectAttempt = null;
  let dsrForecastDay = 4;
  let dsrInspectStability = 4.0;
  let eventClockMs = Date.now();
  let seqCounter = 1;

  function nextIso() {
    const now = Date.now();
    eventClockMs = now > eventClockMs ? now : eventClockMs + 1000;
    return new Date(eventClockMs).toISOString();
  }

  function nextId(prefix) {
    seqCounter += 1;
    return `${prefix}-${Date.now()}-${seqCounter}`;
  }

  function persistIfEnabled() {
    if (!host.isPersistEnabled()) return;
    try {
      window.localStorage?.setItem(
        CLOSED_LOOP_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          activePresetId,
          core,
          assessments,
          teaching,
          reassessmentLedger
        })
      );
    } catch {}
  }

  function clearPersisted() {
    try {
      window.localStorage?.removeItem(CLOSED_LOOP_STORAGE_KEY);
    } catch {}
  }

  function restorePersisted() {
    if (!host.isPersistEnabled()) return;
    try {
      const raw = window.localStorage?.getItem(CLOSED_LOOP_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      validateKnowledgeCore(saved.core);
      core = saved.core;
      activePresetId = saved.activePresetId || 'custom';
      assessments = saved.assessments?.format === 'fark-assessment-history' ? saved.assessments : createAssessmentHistory();
      teaching = saved.teaching?.format === 'fark-teaching-history' ? saved.teaching : createTeachingHistory();
      reassessmentLedger = saved.reassessmentLedger?.format === 'fark-reassessment-ledger' ? saved.reassessmentLedger : createReassessmentLedger();
      selectedOutcomeId = core.outcomes[0]?.id ?? '';
      mapSelectedOutcomeId = selectedOutcomeId;
    } catch {
      clearPersisted();
    }
  }

  function outcomeDisplayLabel(outcome) {
    if (!outcome) return '';
    return host.getLang() === 'tr' && outcome.labelTr ? outcome.labelTr : outcome.label;
  }

  function unitDisplayLabel(unit) {
    if (!unit) return '';
    return host.getLang() === 'tr' && unit.labelTr ? unit.labelTr : unit.label;
  }

  function verifiedOutcomeSet() {
    const set = new Set();
    for (const issue of reassessmentLedger.issues) {
      const followup = assessments.attempts.find(
        a => a.questionId === issue.questionId && Date.parse(a.at) > Date.parse(issue.issuedAt)
      );
      if (followup && followup.correct) set.add(issue.outcomeId);
    }
    return set;
  }

  function setStudySubMode(mode) {
    studySubMode = mode;
    const isGuided = mode === 'guided';
    const spacedEl = $('spaced-study-view');
    const guidedEl = $('guided-study-view');
    if (spacedEl) spacedEl.hidden = isGuided;
    if (guidedEl) guidedEl.hidden = !isGuided;
    $('submode-spaced')?.classList.toggle('active', !isGuided);
    $('submode-guided')?.classList.toggle('active', isGuided);
    $('submode-spaced')?.setAttribute('aria-pressed', String(!isGuided));
    $('submode-guided')?.setAttribute('aria-pressed', String(isGuided));
    if (isGuided) renderGuidedFlow();
  }

  function setDeckSubMode(mode) {
    deckSubMode = mode;
    const isDesigner = mode === 'designer';
    const cardsEl = $('decks-flashcard-view');
    const designerEl = $('decks-designer-view');
    if (cardsEl) cardsEl.hidden = isDesigner;
    if (designerEl) designerEl.hidden = !isDesigner;
    $('deck-submode-cards')?.classList.toggle('active', !isDesigner);
    $('deck-submode-designer')?.classList.toggle('active', isDesigner);
    $('deck-submode-cards')?.setAttribute('aria-pressed', String(!isDesigner));
    $('deck-submode-designer')?.setAttribute('aria-pressed', String(isDesigner));
    if (isDesigner) renderDesigner();
  }

  function populateSelectOptions(selectEl, items, currentVal) {
    if (!selectEl) return;
    selectEl.replaceChildren();
    for (const { value, label } of items) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (value === currentVal) opt.selected = true;
      selectEl.append(opt);
    }
  }

  function syncCoreSelectors() {
    const lang = host.getLang();
    const presetItems = Object.values(KNOWLEDGE_CORE_PRESETS).map(p => ({
      value: p.id,
      label: localizedText(p.title, lang)
    }));
    if (activePresetId === 'custom') {
      presetItems.push({ value: 'custom', label: lang === 'tr' ? 'Özel Müfredat Çekirdeği' : 'Custom Knowledge Core' });
    }
    populateSelectOptions($('guided-preset-select'), presetItems, activePresetId);
    populateSelectOptions($('designer-preset-select'), presetItems, activePresetId);

    if (!core.outcomes.some(o => o.id === selectedOutcomeId)) {
      selectedOutcomeId = core.outcomes[0]?.id ?? '';
    }
    if (!core.outcomes.some(o => o.id === mapSelectedOutcomeId)) {
      mapSelectedOutcomeId = core.outcomes[0]?.id ?? '';
    }

    const outcomeItems = core.outcomes.map(o => ({
      value: o.id,
      label: outcomeDisplayLabel(o)
    }));
    populateSelectOptions($('guided-outcome-select'), outcomeItems, selectedOutcomeId);
    populateSelectOptions($('designer-q-outcome'), outcomeItems, selectedOutcomeId);
    populateSelectOptions($('designer-r-outcome'), outcomeItems, selectedOutcomeId);
    populateSelectOptions($('designer-outcome-prereq'), [
      { value: '', label: copy().inspectorNone },
      ...outcomeItems
    ], '');

    const unitItems = core.units.map(u => ({
      value: u.id,
      label: unitDisplayLabel(u)
    }));
    populateSelectOptions($('designer-outcome-unit'), unitItems, core.units[0]?.id ?? '');
  }

  function renderStepper(activeStepIndex) {
    const stepper = $('guided-stepper');
    if (!stepper) return;
    stepper.replaceChildren();
    copy().stepLabels.forEach((label, idx) => {
      const item = document.createElement('span');
      item.className = 'cl-step' + (idx === activeStepIndex ? ' is-active' : idx < activeStepIndex ? ' is-done' : '');
      item.textContent = label;
      stepper.append(item);
    });
  }

  function renderGuidedFlow() {
    const stage = $('guided-stage');
    if (!stage) return;
    syncCoreSelectors();
    const c = copy();
    const lang = host.getLang();
    const now = nextIso();
    stage.replaceChildren();

    const outcome = core.outcomes.find(o => o.id === selectedOutcomeId);
    if (!outcome) {
      const empty = document.createElement('p');
      empty.className = 'insight-subnote';
      empty.textContent = c.noUnansweredBaseline;
      stage.append(empty);
      renderStepper(0);
      return;
    }

    // State 4: Verified Reassessment Comparison
    if (lastVerifiedResult && lastVerifiedResult.outcomeId === selectedOutcomeId) {
      renderStepper(3);
      const box = document.createElement('div');
      box.className = 'cl-panel';

      const statusLine = document.createElement('div');
      statusLine.className = 'cl-meta-line';
      statusLine.textContent = `${c.comparisonVerified} · ${lastVerifiedResult.status}`;

      const h3 = document.createElement('h3');
      h3.className = 'cl-title';
      h3.textContent = lastVerifiedResult.comparison?.followupCorrect
        ? c.comparisonCorrect
        : c.comparisonIncorrect;

      const summary = document.createElement('p');
      summary.className = 'cl-body';
      const elapsedSec = Math.max(1, Math.round((lastVerifiedResult.comparison?.elapsedMs ?? 0) / 1000));
      summary.textContent = lang === 'tr'
        ? `Ön ölçme: Yanlış → Takip sorusu: ${lastVerifiedResult.comparison?.followupCorrect ? 'Doğru' : 'Yanlış'} · Geçen süre: ${elapsedSec}sn · Durum: ${lastVerifiedResult.status}`
        : `Baseline: Incorrect → Distinct follow-up: ${lastVerifiedResult.comparison?.followupCorrect ? 'Correct' : 'Incorrect'} · Elapsed: ${elapsedSec}s · Status: ${lastVerifiedResult.status}`;

      const disclaimer = document.createElement('p');
      disclaimer.className = 'insight-footnote';
      disclaimer.textContent = c.comparisonDisclaimer;

      const actions = document.createElement('div');
      actions.className = 'cl-actions';
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'button button-primary';
      nextBtn.textContent = c.restartOutcomeBtn;
      nextBtn.addEventListener('click', () => {
        const idx = core.outcomes.findIndex(o => o.id === selectedOutcomeId);
        const nextOutcome = core.outcomes[(idx + 1) % core.outcomes.length];
        selectedOutcomeId = nextOutcome.id;
        activeBaselineAttemptId = null;
        activeIssueId = null;
        lastVerifiedResult = null;
        lastBaselineCorrectAttempt = null;
        renderGuidedFlow();
      });
      actions.append(nextBtn);

      box.append(statusLine, h3, summary, disclaimer, actions);
      stage.append(box);
      return;
    }

    // State 1b: Baseline answered correctly
    if (lastBaselineCorrectAttempt && lastBaselineCorrectAttempt.outcomeId === selectedOutcomeId) {
      renderStepper(3);
      const box = document.createElement('div');
      box.className = 'cl-panel';
      const h3 = document.createElement('h3');
      h3.className = 'cl-title';
      h3.textContent = c.correctBaselineTitle;
      const p = document.createElement('p');
      p.className = 'cl-body';
      p.textContent = c.correctBaselineDesc;
      const actions = document.createElement('div');
      actions.className = 'cl-actions';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'button button-primary';
      btn.textContent = c.nextOutcomeBtn;
      btn.addEventListener('click', () => {
        const idx = core.outcomes.findIndex(o => o.id === selectedOutcomeId);
        selectedOutcomeId = core.outcomes[(idx + 1) % core.outcomes.length].id;
        lastBaselineCorrectAttempt = null;
        renderGuidedFlow();
      });
      actions.append(btn);
      box.append(h3, p, actions);
      stage.append(box);
      return;
    }

    // If an incorrect baseline is active for this outcome, consult orchestrator!
    if (activeBaselineAttemptId) {
      const baseline = assessments.attempts.find(a => a.id === activeBaselineAttemptId);
      if (baseline && baseline.outcomeIds.includes(selectedOutcomeId) && !baseline.correct) {
        const step = getLearningNextStep(core, assessments, teaching, {
          at: now,
          baselineAttemptId: activeBaselineAttemptId,
          outcomeId: selectedOutcomeId
        });

        // State 2: Teaching / Micro-Lesson Needed
        if (step.status === 'teaching-needed') {
          renderStepper(1);
          const resourceRef = step.resources[0];
          const resource = core.resources.find(r => r.id === resourceRef.resourceId);
          const dash = getLearningDashboard(core, assessments, teaching, { at: now });
          const gapRow = dash.gaps.outcomes.find(o => o.outcomeId === selectedOutcomeId);
          const weakPrereqs = (gapRow?.prerequisites ?? [])
            .filter(p => p.incorrect > 0)
            .map(p => outcomeDisplayLabel(core.outcomes.find(o => o.id === p.outcomeId)));

          const box = document.createElement('div');
          box.className = 'cl-panel';

          const meta = document.createElement('div');
          meta.className = 'cl-meta-line';
          const parts = [outcomeDisplayLabel(outcome)];
          if (baseline.misconceptionId) parts.push(c.misconceptionDetected(baseline.misconceptionId));
          meta.textContent = parts.join(' · ');

          const h3 = document.createElement('h3');
          h3.className = 'cl-title';
          h3.textContent = localizedText(resource?.title, lang, c.wrongBaselineTitle);

          const summary = document.createElement('p');
          summary.className = 'cl-body';
          summary.textContent = localizedText(resource?.summary, lang, '');

          box.append(meta, h3, summary);

          if (weakPrereqs.length) {
            const prereqNote = document.createElement('p');
            prereqNote.className = 'cl-callout-warn';
            prereqNote.textContent = c.prereqHint(weakPrereqs.join(', '));
            box.append(prereqNote);
          }

          if (resource?.wrongIntuition || resource?.rightPrinciple) {
            const compareGrid = document.createElement('div');
            compareGrid.className = 'cl-contrast-grid';

            const left = document.createElement('div');
            left.className = 'cl-contrast-item';
            const leftLbl = document.createElement('span');
            leftLbl.className = 'cl-contrast-label cl-label-warn';
            leftLbl.textContent = `▲ ${c.wrongIntuitionLabel}`;
            const leftTxt = document.createElement('p');
            leftTxt.textContent = localizedText(resource.wrongIntuition, lang, '');
            left.append(leftLbl, leftTxt);

            const right = document.createElement('div');
            right.className = 'cl-contrast-item';
            const rightLbl = document.createElement('span');
            rightLbl.className = 'cl-contrast-label cl-label-ok';
            rightLbl.textContent = `✓ ${c.rightPrincipleLabel}`;
            const rightTxt = document.createElement('p');
            rightTxt.textContent = localizedText(resource.rightPrinciple, lang, '');
            right.append(rightLbl, rightTxt);

            compareGrid.append(left, right);
            box.append(compareGrid);
          }

          if (resource?.example) {
            const exWrap = document.createElement('div');
            exWrap.className = 'cl-example-box';
            const exLbl = document.createElement('span');
            exLbl.className = 'tiny-label';
            exLbl.textContent = c.exampleLabel;
            const exTxt = document.createElement('p');
            exTxt.textContent = localizedText(resource.example, lang, '');
            exWrap.append(exLbl, exTxt);
            box.append(exWrap);
          }

          const actions = document.createElement('div');
          actions.className = 'cl-actions';
          const doneBtn = document.createElement('button');
          doneBtn.type = 'button';
          doneBtn.id = 'guided-complete-lesson-btn';
          doneBtn.className = 'button button-primary';
          doneBtn.textContent = c.completeLessonBtn;
          doneBtn.addEventListener('click', () => {
            const tComp = nextIso();
            teaching = recordTeachingCompletion(core, assessments, teaching, {
              completionId: nextId('comp'),
              resourceId: resource.id,
              baselineAttemptId: activeBaselineAttemptId,
              at: tComp
            }).history;
            const tIssue = nextIso();
            const issued = issueReassessment(core, assessments, teaching, reassessmentLedger, {
              issueId: nextId('issue'),
              baselineAttemptId: activeBaselineAttemptId,
              outcomeId: selectedOutcomeId,
              at: tIssue
            });
            if (issued.status === 'issued') {
              reassessmentLedger = issued.ledger;
              activeIssueId = issued.issue.id;
            }
            persistIfEnabled();
            renderGuidedFlow();
            renderMapAndCurve();
          });
          actions.append(doneBtn);
          box.append(actions);
          stage.append(box);
          return;
        }

        // State 3: Issued Distinct Reassessment Question
        if (step.status === 'ready-to-reassess' && activeIssueId) {
          const issue = reassessmentLedger.issues.find(i => i.id === activeIssueId);
          const q = issue ? core.questions.find(item => item.id === issue.questionId) : null;
          if (issue && q) {
            renderStepper(2);
            renderMcqCard(stage, {
              kicker: c.reassessKicker,
              hint: c.reassessHint,
              question: q,
              submitLabel: c.submitReassessBtn,
              onSubmit: selectedChoiceId => {
                const tFollow = nextIso();
                const res = recordAssessment(core, assessments, {
                  attemptId: nextId('att'),
                  questionId: q.id,
                  selectedChoiceId,
                  at: tFollow
                });
                assessments = res.history;
                const verified = verifyIssuedReassessment(core, assessments, reassessmentLedger, {
                  issueId: issue.id,
                  followupAttemptId: res.attempt.id,
                  at: tFollow
                });
                lastVerifiedResult = { ...verified, outcomeId: selectedOutcomeId };
                activeBaselineAttemptId = null;
                activeIssueId = null;
                persistIfEnabled();
                renderGuidedFlow();
                renderMapAndCurve();
              }
            });
            return;
          }
        }
      }
    }

    // State 1: Baseline Assessment MCQ
    renderStepper(0);
    const answeredIds = new Set(assessments.attempts.map(a => a.questionId));
    const candidates = core.questions.filter(
      q => q.outcomeIds.includes(selectedOutcomeId) && Array.isArray(q.choices) && q.choices.length >= 2 && !answeredIds.has(q.id)
    );
    const question = candidates[0];
    if (!question) {
      const box = document.createElement('div');
      box.className = 'cl-panel';
      const p = document.createElement('p');
      p.className = 'cl-body';
      p.textContent = c.noUnansweredBaseline;
      box.append(p);
      stage.append(box);
      return;
    }

    renderMcqCard(stage, {
      kicker: outcomeDisplayLabel(outcome),
      hint: `${lang === 'tr' ? 'Soru' : 'Question'} ${question.id} · ${lang === 'tr' ? 'Sürüm' : 'Rev'} ${question.revision}`,
      question,
      submitLabel: c.submitAnswer,
      onSubmit: selectedChoiceId => {
        const res = recordAssessment(core, assessments, {
          attemptId: nextId('att'),
          questionId: question.id,
          selectedChoiceId,
          at: nextIso()
        });
        assessments = res.history;
        if (res.attempt.correct) {
          lastBaselineCorrectAttempt = { attemptId: res.attempt.id, outcomeId: selectedOutcomeId };
          activeBaselineAttemptId = null;
        } else {
          activeBaselineAttemptId = res.attempt.id;
          lastBaselineCorrectAttempt = null;
        }
        persistIfEnabled();
        renderGuidedFlow();
        renderMapAndCurve();
      }
    });
  }

  function renderMcqCard(container, { kicker, hint, question, submitLabel, onSubmit }) {
    const lang = host.getLang();
    const box = document.createElement('div');
    box.className = 'cl-panel';

    const meta = document.createElement('div');
    meta.className = 'cl-meta-line';
    meta.textContent = `${kicker} · ${hint}`;

    const h3 = document.createElement('h3');
    h3.className = 'cl-title';
    h3.textContent = localizedText(question.prompt, lang, question.id);

    const choicesWrap = document.createElement('div');
    choicesWrap.className = 'cl-choice-list';
    choicesWrap.setAttribute('role', 'radiogroup');

    let picked = null;
    const buttons = [];
    for (const choice of question.choices) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cl-choice-btn';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.textContent = `${choice.id.toUpperCase()}. ${localizedText(choice.label, lang, choice.id)}`;
      btn.addEventListener('click', () => {
        picked = choice.id;
        for (const other of buttons) {
          const active = other === btn;
          other.classList.toggle('is-picked', active);
          other.setAttribute('aria-checked', String(active));
        }
      });
      buttons.push(btn);
      choicesWrap.append(btn);
    }

    const actions = document.createElement('div');
    actions.className = 'cl-actions';
    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'button button-primary';
    submitBtn.textContent = submitLabel;
    submitBtn.addEventListener('click', () => {
      if (!picked) {
        host.notify(copy().chooseOptionNotice);
        return;
      }
      onSubmit(picked);
    });
    actions.append(submitBtn);

    box.append(meta, h3, choicesWrap, actions);
    container.append(box);
  }

  function renderMapAndCurve() {
    const mapContainer = $('intel-concept-map');
    const inspector = $('intel-map-inspector');
    const curveContainer = $('intel-dsr-curve');
    if (!mapContainer || !inspector || !curveContainer) return;

    const c = copy();
    const lang = host.getLang();
    const isDark = document.documentElement?.classList?.contains('dark') ?? false;
    const now = nextIso();
    const dash = getLearningDashboard(core, assessments, teaching, { at: now });
    const readiness = auditLearningContent(core);
    const verified = verifiedOutcomeSet();

    if (!core.outcomes.some(o => o.id === mapSelectedOutcomeId)) {
      mapSelectedOutcomeId = core.outcomes[0]?.id ?? '';
    }

    renderConceptMapSvg(mapContainer, {
      core,
      evidenceReport: dash.evidence,
      readiness,
      verifiedOutcomeIds: verified,
      selectedOutcomeId: mapSelectedOutcomeId,
      lang,
      isDark,
      onSelect: id => {
        mapSelectedOutcomeId = id;
        renderMapAndCurve();
      }
    });

    // Inspector Panel
    const outcome = core.outcomes.find(o => o.id === mapSelectedOutcomeId);
    inspector.replaceChildren();
    if (!outcome) {
      const p = document.createElement('p');
      p.className = 'insight-subnote';
      p.textContent = c.inspectorSelectHint;
      inspector.append(p);
    } else {
      const ev = dash.evidence.outcomes.find(o => o.outcomeId === outcome.id);
      const readyRow = readiness.outcomes.find(o => o.outcomeId === outcome.id);
      const unit = core.units.find(u => u.id === outcome.unitId);

      // Estimate a meaningful stability preview from observed outcome evidence (transparently labeled)
      dsrInspectStability = ev && ev.attempts > 0
        ? Math.max(0.8, 1.5 + ev.correct * 2.5 - ev.incorrect * 0.7)
        : 3.0;

      const meta = document.createElement('div');
      meta.className = 'cl-meta-line';
      meta.textContent = `${unitDisplayLabel(unit)} · ${readyRow?.ready ? c.inspectorReady : c.inspectorBlocked}`;

      const title = document.createElement('h3');
      title.className = 'cl-inspector-title';
      title.textContent = outcomeDisplayLabel(outcome);

      const prereqLine = document.createElement('p');
      prereqLine.className = 'cl-inspector-row';
      const prereqNames = (outcome.prerequisiteIds ?? [])
        .map(pid => outcomeDisplayLabel(core.outcomes.find(o => o.id === pid)))
        .filter(Boolean);
      prereqLine.textContent = `${c.inspectorPrereqs}: ${prereqNames.length ? prereqNames.join(' → ') : c.inspectorNone}`;

      const evLine = document.createElement('p');
      evLine.className = 'cl-inspector-row';
      evLine.textContent = `${c.inspectorEvidence}: ${ev?.correct ?? 0}/${ev?.attempts ?? 0} · ${lang === 'tr' ? 'Ders tamamlama' : 'Lessons'}: ${ev?.teachingCompletions ?? 0}`;

      const actRow = document.createElement('div');
      actRow.className = 'cl-actions';
      const goStudy = document.createElement('button');
      goStudy.type = 'button';
      goStudy.className = 'button button-outline';
      goStudy.textContent = c.inspectorPracticeBtn;
      goStudy.addEventListener('click', () => {
        selectedOutcomeId = outcome.id;
        host.switchTab('study');
        setStudySubMode('guided');
      });

      const goDesign = document.createElement('button');
      goDesign.type = 'button';
      goDesign.className = 'button button-light';
      goDesign.textContent = c.inspectorDesignBtn;
      goDesign.addEventListener('click', () => {
        selectedOutcomeId = outcome.id;
        host.switchTab('decks');
        setDeckSubMode('designer');
      });
      actRow.append(goStudy, goDesign);

      inspector.append(meta, title, prereqLine, evLine, actRow);
    }

    const curveResult = renderDsrCurveSvg(curveContainer, {
      stability: dsrInspectStability,
      elapsedDay: dsrForecastDay,
      lang,
      isDark
    });
    if ($('dsr-day-label')) $('dsr-day-label').textContent = c.dsrDayLabel(dsrForecastDay);
    if ($('dsr-curve-readout') && curveResult) {
      $('dsr-curve-readout').textContent = c.dsrReadout(curveResult.predictedR, curveResult.stability);
    }
  }

  function renderDesigner() {
    syncCoreSelectors();
    const auditBox = $('designer-readiness-list');
    const summaryEl = $('designer-readiness-summary');
    if (!auditBox || !summaryEl) return;

    const c = copy();
    const audit = auditLearningContent(core);
    summaryEl.textContent = c.readinessSummary(audit.summary.ready, audit.summary.checked);

    auditBox.replaceChildren();
    for (const row of audit.outcomes) {
      const outcome = core.outcomes.find(o => o.id === row.outcomeId);
      const item = document.createElement('div');
      item.className = 'readiness-row' + (row.ready ? ' is-ready' : ' is-blocked');

      const head = document.createElement('div');
      head.className = 'readiness-row-head';
      const title = document.createElement('strong');
      title.textContent = `${row.ready ? '✓' : '▲'} ${outcomeDisplayLabel(outcome)}`;
      const counts = document.createElement('span');
      counts.className = 'tabular-nums';
      counts.textContent = `${row.gradableQuestionCount} Q · ${row.teachingResourceCount} R`;
      head.append(title, counts);

      item.append(head);
      if (row.problems.length) {
        const prob = document.createElement('p');
        prob.className = 'readiness-problems';
        prob.textContent = row.problems.map(code => c.problemLabels[code] ?? code).join(' · ');
        item.append(prob);
      }
      auditBox.append(item);
    }
  }

  function applyClosedLoopLanguage() {
    const c = copy();
    const set = (id, text) => {
      const el = $(id);
      if (el) el.textContent = text;
    };
    set('submode-spaced', c.modeSpaced);
    set('submode-guided', c.modeGuided);
    set('deck-submode-cards', c.deckModeCards);
    set('deck-submode-designer', c.deckModeDesigner);
    set('kicker-guided', c.guidedKicker);
    set('guided-heading', c.guidedHeading);
    set('guided-blurb', c.guidedBlurb);
    set('label-guided-preset', c.labelCorePreset);
    set('label-guided-outcome', c.labelOutcomeSelect);
    set('guided-save-checkpoint', c.saveCheckpointBtn);
    set('guided-resume-trigger', c.resumeCheckpointBtn);
    set('guided-reset-module', c.resetModuleBtn);
    set('kicker-map', c.mapKicker);
    set('map-heading', c.mapHeading);
    set('map-blurb', c.mapBlurb);
    set('dsr-curve-title', c.dsrCurveTitle);
    set('kicker-designer', c.designerKicker);
    set('designer-heading', c.designerHeading);
    set('designer-blurb', c.designerBlurb);
    set('label-designer-preset', c.designerPresetLabel);
    set('designer-blank-btn', c.designerBlankBtn);
    set('designer-try-btn', c.designerTryBtn);
    set('designer-export-btn', c.designerExportBtn);
    set('designer-import-trigger', c.designerImportBtn);
    set('designer-readiness-title', c.readinessTitle);
    set('designer-unit-title', c.formUnitTitle);
    set('label-designer-unit', c.formUnitLabel);
    set('designer-unit-btn', c.formUnitBtn);
    set('designer-outcome-title', c.formOutcomeTitle);
    set('label-designer-outcome-unit', c.formOutcomeUnit);
    set('label-designer-outcome-name', c.formOutcomeLabel);
    set('label-designer-outcome-prereq', c.formOutcomePrereq);
    set('designer-outcome-btn', c.formOutcomeBtn);
    set('designer-question-title', c.formQuestionTitle);
    set('label-designer-q-outcome', c.formQuestionOutcome);
    set('label-designer-q-prompt', c.formQuestionPrompt);
    set('label-designer-q-a', c.formQuestionChoiceA);
    set('label-designer-q-b', c.formQuestionChoiceB);
    set('label-designer-q-c', c.formQuestionChoiceC);
    set('label-designer-q-correct', c.formQuestionCorrect);
    set('label-designer-q-misc', c.formQuestionMisconception);
    set('designer-question-btn', c.formQuestionBtn);
    set('designer-lesson-title', c.formLessonTitle);
    set('label-designer-r-outcome', c.formLessonOutcome);
    set('label-designer-r-title', c.formLessonHeading);
    set('label-designer-r-summary', c.formLessonSummary);
    set('label-designer-r-wrong', c.formLessonWrong);
    set('label-designer-r-right', c.formLessonRight);
    set('label-designer-r-misc', c.formLessonMisconception);
    set('designer-lesson-btn', c.formLessonBtn);

    syncCoreSelectors();
    if (studySubMode === 'guided') renderGuidedFlow();
    if (deckSubMode === 'designer') renderDesigner();
    renderMapAndCurve();
  }

  function loadCorePreset(presetId) {
    activePresetId = presetId;
    core = cloneKnowledgeCorePreset(presetId);
    assessments = createAssessmentHistory();
    teaching = createTeachingHistory();
    reassessmentLedger = createReassessmentLedger();
    selectedOutcomeId = core.outcomes[0]?.id ?? '';
    mapSelectedOutcomeId = selectedOutcomeId;
    activeBaselineAttemptId = null;
    activeIssueId = null;
    lastVerifiedResult = null;
    lastBaselineCorrectAttempt = null;
    persistIfEnabled();
    syncCoreSelectors();
    renderGuidedFlow();
    renderDesigner();
    renderMapAndCurve();
  }

  // Wire UI Events
  $('submode-spaced')?.addEventListener('click', () => setStudySubMode('spaced'));
  $('submode-guided')?.addEventListener('click', () => setStudySubMode('guided'));
  $('deck-submode-cards')?.addEventListener('click', () => setDeckSubMode('cards'));
  $('deck-submode-designer')?.addEventListener('click', () => setDeckSubMode('designer'));

  $('guided-preset-select')?.addEventListener('change', () => {
    const val = $('guided-preset-select').value;
    if (KNOWLEDGE_CORE_PRESETS[val]) loadCorePreset(val);
  });
  $('designer-preset-select')?.addEventListener('change', () => {
    const val = $('designer-preset-select').value;
    if (KNOWLEDGE_CORE_PRESETS[val]) loadCorePreset(val);
  });
  $('guided-outcome-select')?.addEventListener('change', () => {
    selectedOutcomeId = $('guided-outcome-select').value;
    activeBaselineAttemptId = null;
    activeIssueId = null;
    lastVerifiedResult = null;
    lastBaselineCorrectAttempt = null;
    renderGuidedFlow();
  });
  $('guided-reset-module')?.addEventListener('click', () => {
    assessments = createAssessmentHistory();
    teaching = createTeachingHistory();
    reassessmentLedger = createReassessmentLedger();
    activeBaselineAttemptId = null;
    activeIssueId = null;
    lastVerifiedResult = null;
    lastBaselineCorrectAttempt = null;
    persistIfEnabled();
    renderGuidedFlow();
    renderMapAndCurve();
    host.notify(copy().resetModuleNotice);
  });

  $('guided-save-checkpoint')?.addEventListener('click', () => {
    try {
      const targetBaseline = activeBaselineAttemptId ?? assessments.attempts.find(a => !a.correct && a.outcomeIds.includes(selectedOutcomeId))?.id;
      if (!targetBaseline) {
        throw new RangeError(host.getLang() === 'tr'
          ? 'Oturum kaydı almak için önce bir ön değerlendirme sorusunda hata gözlemlenmiş olmalı.'
          : 'Answer a baseline item incorrectly first to anchor a verifiable learning-session checkpoint.');
      }
      const session = createLearningSession(core, assessments, teaching, {
        sessionId: nextId('session'),
        baselineAttemptId: targetBaseline,
        outcomeId: selectedOutcomeId,
        at: nextIso()
      });
      host.downloadText('fark-learning-session.json', serializeLearningSession(session), 'application/json');
      host.notify(copy().checkpointSaved);
    } catch (err) {
      host.notify(copy().checkpointError(err.message));
    }
  });

  $('guided-resume-trigger')?.addEventListener('click', () => $('guided-resume-file')?.click());
  $('guided-resume-file')?.addEventListener('change', async event => {
    const file = event.target?.files?.[0];
    if (event.target) event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseLearningSession(text);
      const resumed = resumeLearningSession(core, parsed, {
        at: nextIso(),
        assessments: parsed.assessments,
        teaching: parsed.teaching
      });
      assessments = resumed.assessments;
      teaching = resumed.teaching;
      selectedOutcomeId = parsed.outcomeId;
      activeBaselineAttemptId = parsed.baselineAttemptId;
      lastVerifiedResult = null;
      persistIfEnabled();
      renderGuidedFlow();
      renderMapAndCurve();
      host.notify(copy().checkpointResumed(resumed.step.status));
    } catch (err) {
      host.notify(copy().checkpointError(err.message));
    }
  });

  $('dsr-day-slider')?.addEventListener('input', () => {
    dsrForecastDay = Number($('dsr-day-slider').value) || 0;
    renderMapAndCurve();
  });

  // Designer actions
  $('designer-blank-btn')?.addEventListener('click', () => {
    activePresetId = 'custom';
    core = {
      format: 'fark-knowledge-core',
      version: 1,
      units: [{ id: 'u-custom-1', label: 'Unit 1: Foundations', labelTr: 'Ünite 1: Temeller', prerequisiteIds: [] }],
      outcomes: [{ id: 'o-custom-1', unitId: 'u-custom-1', label: 'Core Concept 1', labelTr: 'Temel Kavram 1', prerequisiteIds: [] }],
      resources: [],
      questions: [],
      mappings: []
    };
    assessments = createAssessmentHistory();
    teaching = createTeachingHistory();
    reassessmentLedger = createReassessmentLedger();
    selectedOutcomeId = 'o-custom-1';
    mapSelectedOutcomeId = 'o-custom-1';
    persistIfEnabled();
    renderDesigner();
    renderMapAndCurve();
    host.notify(copy().noticeBlankCreated);
  });

  $('designer-try-btn')?.addEventListener('click', () => {
    host.switchTab('study');
    setStudySubMode('guided');
  });

  $('designer-export-btn')?.addEventListener('click', () => {
    try {
      validateKnowledgeCore(core);
      host.downloadText('fark-knowledge-core.json', JSON.stringify(core, null, 2), 'application/json');
      host.notify(copy().noticeCoreExported);
    } catch (err) {
      host.notify(copy().noticeCoreError(err.message));
    }
  });

  $('designer-import-trigger')?.addEventListener('click', () => $('designer-import-file')?.click());
  $('designer-import-file')?.addEventListener('change', async event => {
    const file = event.target?.files?.[0];
    if (event.target) event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      if (text.length > 2_000_000) throw new RangeError('Knowledge core JSON exceeds 2 MB limit');
      const parsed = JSON.parse(text);
      validateKnowledgeCore(parsed);
      core = parsed;
      activePresetId = 'custom';
      assessments = createAssessmentHistory();
      teaching = createTeachingHistory();
      reassessmentLedger = createReassessmentLedger();
      selectedOutcomeId = core.outcomes[0]?.id ?? '';
      mapSelectedOutcomeId = selectedOutcomeId;
      persistIfEnabled();
      renderDesigner();
      renderMapAndCurve();
      host.notify(copy().noticeCoreImported(core.outcomes.length));
    } catch (err) {
      host.notify(copy().noticeCoreError(err.message));
    }
  });

  $('designer-unit-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const label = ($('designer-unit-input')?.value || '').trim();
    if (!label) return;
    const candidate = JSON.parse(JSON.stringify(core));
    candidate.units.push({ id: slugId('unit', label), label, labelTr: label, prerequisiteIds: [] });
    try {
      validateKnowledgeCore(candidate);
      core = candidate;
      $('designer-unit-input').value = '';
      persistIfEnabled();
      renderDesigner();
      renderMapAndCurve();
      host.notify(copy().noticeUnitAdded(label));
    } catch (err) {
      host.notify(copy().noticeCoreError(err.message));
    }
  });

  $('designer-outcome-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const unitId = $('designer-outcome-unit')?.value;
    const label = ($('designer-outcome-name')?.value || '').trim();
    const prereqId = $('designer-outcome-prereq')?.value || '';
    if (!label || !unitId) return;
    const candidate = JSON.parse(JSON.stringify(core));
    const newId = slugId('out', label);
    candidate.outcomes.push({
      id: newId,
      unitId,
      label,
      labelTr: label,
      prerequisiteIds: prereqId ? [prereqId] : []
    });
    try {
      validateKnowledgeCore(candidate);
      core = candidate;
      selectedOutcomeId = newId;
      mapSelectedOutcomeId = newId;
      $('designer-outcome-name').value = '';
      persistIfEnabled();
      renderDesigner();
      renderMapAndCurve();
      host.notify(copy().noticeOutcomeAdded(label));
    } catch (err) {
      host.notify(copy().noticeCoreError(err.message));
    }
  });

  $('designer-question-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const outcomeId = $('designer-q-outcome')?.value;
    const prompt = ($('designer-q-prompt')?.value || '').trim();
    const a = ($('designer-q-a')?.value || '').trim();
    const b = ($('designer-q-b')?.value || '').trim();
    const cVal = ($('designer-q-c')?.value || '').trim();
    const correctChoiceId = $('designer-q-correct')?.value || 'a';
    const misconception = ($('designer-q-misc')?.value || '').trim();
    if (!outcomeId || !prompt || !a || !b) return;
    const choices = [
      { id: 'a', label: a, ...(correctChoiceId !== 'a' && misconception ? { misconceptionId: misconception } : {}) },
      { id: 'b', label: b, ...(correctChoiceId !== 'b' && misconception ? { misconceptionId: misconception } : {}) },
      ...(cVal ? [{ id: 'c', label: cVal, ...(correctChoiceId !== 'c' && misconception ? { misconceptionId: misconception } : {}) }] : [])
    ];
    if (!choices.some(ch => ch.id === correctChoiceId)) return;
    const candidate = JSON.parse(JSON.stringify(core));
    candidate.questions.push({
      id: slugId('q', prompt),
      outcomeIds: [outcomeId],
      revision: 'r1',
      prompt,
      choices,
      correctChoiceId
    });
    try {
      validateKnowledgeCore(candidate);
      core = candidate;
      $('designer-q-prompt').value = '';
      $('designer-q-a').value = '';
      $('designer-q-b').value = '';
      $('designer-q-c').value = '';
      $('designer-q-misc').value = '';
      persistIfEnabled();
      renderDesigner();
      renderMapAndCurve();
      host.notify(copy().noticeQuestionAdded);
    } catch (err) {
      host.notify(copy().noticeCoreError(err.message));
    }
  });

  $('designer-lesson-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const outcomeId = $('designer-r-outcome')?.value;
    const title = ($('designer-r-title')?.value || '').trim();
    const summary = ($('designer-r-summary')?.value || '').trim();
    const wrong = ($('designer-r-wrong')?.value || '').trim();
    const right = ($('designer-r-right')?.value || '').trim();
    const misc = ($('designer-r-misc')?.value || '').trim();
    if (!outcomeId || !title || !summary) return;
    const candidate = JSON.parse(JSON.stringify(core));
    candidate.resources.push({
      id: slugId('res', title),
      outcomeIds: [outcomeId],
      ...(misc ? { misconceptionIds: [misc] } : {}),
      kind: 'micro-lesson',
      revision: 'r1',
      title,
      summary,
      ...(wrong ? { wrongIntuition: wrong } : {}),
      ...(right ? { rightPrinciple: right } : {})
    });
    try {
      validateKnowledgeCore(candidate);
      core = candidate;
      $('designer-r-title').value = '';
      $('designer-r-summary').value = '';
      $('designer-r-wrong').value = '';
      $('designer-r-right').value = '';
      $('designer-r-misc').value = '';
      persistIfEnabled();
      renderDesigner();
      renderMapAndCurve();
      host.notify(copy().noticeLessonAdded);
    } catch (err) {
      host.notify(copy().noticeCoreError(err.message));
    }
  });

  restorePersisted();
  applyClosedLoopLanguage();

  return {
    applyLanguage: applyClosedLoopLanguage,
    onTabChange(tab) {
      if (tab === 'intelligence') renderMapAndCurve();
      if (tab === 'decks' && deckSubMode === 'designer') renderDesigner();
      if (tab === 'study' && studySubMode === 'guided') renderGuidedFlow();
    },
    onThemeChange: () => renderMapAndCurve(),
    onPersistToggle(enabled) {
      if (enabled) persistIfEnabled();
      else clearPersisted();
    },
    onReset() {
      loadCorePreset('english-grammar');
    }
  };
}
