import {
  createCard,
  getStudySummary,
  getTopicSummaries,
  getMistakeBreakdown,
  getReviewForecast
} from '../../src/index.js';
import { getStudyRecommendations, planStudySession } from '../../src/planner.js';
import { exportStudyDeck, importStudyDeck } from '../../src/portable.js';
import { exportStudyCsv, importStudyCsv } from '../../src/csv.js';
import { exportStudyMarkdown, importStudyMarkdown } from '../../src/markdown.js';
import {
  buildConceptNodesForCards,
  buildSamplePack,
  exportStudyTsv,
  importStudyTsv,
  parseClozePrompt,
  reverseCardPrompt
} from '../../src/interchange.js';
import {
  compareStrategies,
  getReviewStrategy,
  reviewCardWithStrategy,
  simulateCohort
} from '../../src/strategies.js';
import {
  createLedger,
  exportLedger,
  importLedger,
  linkConceptPrerequisites,
  projectCardsFromLedger,
  recordLedgerReview,
  upsertLedgerCard
} from '../../src/ledger.js';
import {
  diagnoseLearner,
  evaluateAllInterventions,
  recordIntervention
} from '../../src/diagnosis.js';
import { fitLearnerParameters } from '../../src/calibrate.js';

const $ = id => document.getElementById(id);

const I18N = {
  en: {
    privacyText: 'Local-only studio',
    eyebrowText: 'OPEN-SOURCE STUDY STUDIO',
    pageTitleHtml: 'Deterministic scheduling.<br><em>Honest</em> learning signals.',
    introLead: 'Compare DSR, SM-2 & Leitner scheduling, log an append-only Learning Ledger, seal closed-loop interventions, practice {{cloze}} or Anki TSV decks, and run a local MCP server—zero cloud, zero tracking.',
    tabStudy: 'Study Studio',
    tabSimulator: 'Strategy Simulator',
    tabDecks: 'Deck Studio & Packs',
    tabIntelligence: 'Learning Intelligence',
    kickerActive: 'ACTIVE LEARNING',
    sessionHeading: "Today's session",
    labelQuestions: 'Questions',
    labelPerTopic: 'Per topic',
    labelNewCards: 'New cards',
    labelStrategy: 'Strategy',
    replanBtn: 'Rebuild plan ↻',
    labelReverseMode: 'Reverse Q ↔ A',
    labelReasonAware: 'Reason-aware focus',
    labelScratchpad: 'Recall scratchpad',
    scratchpadHint: '(optional · never auto-graded)',
    scratchpadPlaceholder: 'Type what you remember before revealing...',
    sampleAnswerLabel: 'ANSWER',
    revealBtn: 'Reveal answer ↗',
    skipBtn: 'Skip for now ↷',
    revealHint: 'Think of your answer before revealing it.',
    mistakeLabelText: 'If you missed it, what was the reason?',
    mistakeOptional: '(optional)',
    ratingTitle: 'HOW WELL DID YOU RECALL IT?',
    feedbackNote: 'Your rating is self-reported, not independently graded.',
    skipInline: 'Skip this card without rating it ↷',
    shortcutHint: 'Keyboard: Space = Reveal · 1–4 = Rate · S = Skip',
    nextPlanBtn: 'Plan another session ↗',
    kickerSim: 'COHORT BENCHMARK LAB',
    simHeading: 'Compare spacing strategies empirically.',
    simBlurb: 'Run a seeded deterministic forgetting-curve simulation across Balanced, Gentle, Intensive, SM-2 Adaptive, and DSR Memory to inspect daily load vs backlog vs simulated recall.',
    labelSimCards: 'Cards',
    labelSimDays: 'Days',
    labelSimLimit: 'Daily cap',
    labelSimProfile: 'Profile',
    runSimBtn: 'Run simulation ↻',
    kickerSeq: 'STEP-BY-STEP TRACE',
    seqHeading: 'Exact interval sequence',
    seqBlurb: 'Sequence: Good → Good → Again (misconception) → Good → Easy starting from day 0.',
    kickerPacks: 'CURATED SAMPLE PACKS',
    packsHeading: 'Switch topic packs',
    packsBlurb: 'Try realistic CS {{cloze}} prompts, Biology misconception tracking, or reversible EN↔TR vocabulary—100% original content.',
    packStarter: 'General Mix (9)',
    packEnglish: 'English Mastery (A2→B2)',
    packCs: 'CS & Algorithms (Cloze)',
    packBiology: 'Cell Biology',
    packLanguage: 'EN ↔ TR Vocab',
    kickerAuthor: 'CUSTOM STUDY DECK',
    addCardHeading: 'Add your own card',
    addCardBlurb: 'Create single cards (supports {{cloze}} blanks!) or paste Markdown Q :: A, CSV, or Anki/Quizlet tab-separated TSV.',
    labelCardTopic: 'Topic',
    labelCardQuestion: 'Question',
    labelCardAnswer: 'Answer',
    addCardSubmit: 'Add card to deck +',
    bulkPasteSummary: 'Bulk paste Markdown Q :: A or Anki TSV',
    bulkImportBtn: 'Append pasted cards +',
    kickerExplorer: 'DECK EXPLORER',
    deckManagerHeading: 'Browse & filter cards',
    labelDeckSearch: 'Filter text',
    deckSearchPlaceholder: 'Search question or topic...',
    labelDeckTopic: 'Topic',
    allTopicsOption: 'All topics',
    kickerSnapshot: 'LIVE SNAPSHOT',
    liveIndicator: '● IN MEMORY',
    insightsHeading: 'The bigger picture.',
    insightBlurb: 'Updated from the actual review engine as you study.',
    statDueLabel: 'Due now',
    statDueSub: 'Ready to revisit',
    statReviewedLabel: 'Reviewed',
    statReviewedSub: 'Cards with history',
    statAccuracyLabel: 'Recall rating',
    statAccuracySub: 'Self-reported',
    focusHeadingTitle: 'Honest focus signals',
    focusHeadingSub: 'From reason history',
    noFocusSignals: 'No bottleneck signals right now.',
    topicHeadingTitle: 'Topic overview',
    topicHeadingSub: 'Due / total cards',
    forecastHeadingTitle: '7-day scheduled load',
    forecastHeadingSub: 'Upcoming due dates',
    mistakesHeadingTitle: 'Self-reported lapses',
    mistakesHeadingSub: 'Never auto-guessed',
    insightFootnote: 'These counts are not a measure of true mastery.',
    kickerData: 'YOUR DATA, YOUR CHOICE',
    dataHeading: 'Take it with you.',
    dataBlurb: 'Download history as JSON, spreadsheet-safe CSV, Anki/Quizlet TSV, printable Markdown, or import a file. Nothing leaves this tab.',
    exportJsonBtn: 'Export JSON ↗',
    exportCsvBtn: 'Export CSV ↗',
    exportTsvBtn: 'Export TSV ↗',
    exportMdBtn: 'Export MD ↗',
    importBtn: 'Import File ↑',
    labelPersistLocal: 'Remember progress on this device',
    resetBtn: '↻ Reset sample data',
    overlineHow: 'HOW IT WORKS',
    p1Title: 'Review what matters.',
    p1Body: 'Deterministic SM-2 and Leitner presets schedule due cards while self-reported misconception history steers study focus.',
    p2Title: "Compare, don't assume.",
    p2Body: 'Simulate 30-day forgetting cohorts side-by-side and balance subjects with topic caps and round-robin selection.',
    p3Title: 'MCP-ready & local-first.',
    p3Body: 'Use via browser, Node CLI, Web Component, or stdio MCP server without letting AI agents fabricate progress.',
    strategyNames: {
      balanced: 'Balanced',
      gentle: 'Gentle',
      intensive: 'Intensive',
      sm2: 'SM-2 Adaptive',
      dsr: 'DSR Memory'
    },
    simProfiles: {
      steady: 'Steady learner',
      cramming: 'Fast decay (cram)',
      'missed-days': 'Skips 25% of days'
    },
    strategyNote: def => {
      if (def.id === 'dsr') {
        return `${def.label}: FSRS-style power-law R(t) = (1 + t/(9S))^-1 with stability damping and slip-resistant difficulty.`;
      }
      if (def.adaptive) {
        return `${def.label}: adaptive ease factor (1.3–2.8 EF) shaped by review streak and lapse reasons.`;
      }
      return `${def.label}: again ${def.againMinutes}m · hard ${def.hardHours}h · boxes ${def.intervalsDays.slice(1).map(d => d + 'd').join(' / ')}.`;
    },
    reasons: {
      'new-card': 'New card',
      'scheduled-review': 'Scheduled review',
      overdue: 'Review overdue',
      'previous-mistakes': 'Previous mistakes',
      'concept-misconception': 'Concept check',
      'knowledge-gap': 'Knowledge gap',
      'attention-slip': 'Attention slip'
    },
    mistakeOptions: {
      '': 'Not specified',
      'knowledge-gap': 'Knowledge gap',
      misconception: 'Concept mix-up',
      attention: 'Attention slip',
      other: 'Other'
    },
    mistakeChipNames: {
      'knowledge-gap': 'Knowledge gap',
      misconception: 'Concept mix-up',
      attention: 'Attention slip',
      other: 'Other',
      unspecified: 'Unspecified'
    },
    ratings: {
      again: ['Again', 'Retry soon'],
      hard: ['Hard', 'Keep close'],
      good: ['Good', 'Move ahead'],
      easy: ['Easy', 'Space it out']
    },
    stageQuestion: (idx, total) => `QUESTION ${String(idx).padStart(2, '0')} / ${String(total).padStart(2, '0')}`,
    stageSummary: 'SESSION SUMMARY',
    newCardBadge: 'NEW CARD',
    dueReviewBadge: 'DUE REVIEW',
    clozeBadge: 'CLOZE',
    reversedBadge: 'REVERSED',
    deckCount: n => `${n} ${n === 1 ? 'card' : 'cards'}`,
    deckStatusNew: 'New',
    deckStatusDue: 'Due now',
    deckStatusScheduled: 'Scheduled',
    deckRemoveLabel: 'Delete',
    deckNoMatches: 'No cards match the current filter.',
    simRecallMetric: (rate, mature, avg, peak, backlog, total) =>
      `Recall ${Math.round((rate ?? 0) * 100)}% · Mature ${mature}/${total} · Avg ${avg}/d (peak ${peak}) · Backlog ${backlog}`,
    sessionDesc: (total, deferred, skipped) =>
      total
        ? `${total} selected · ${deferred} not selected${skipped ? ` · ${skipped} skipped (still due)` : ''}`
        : 'No eligible cards fit these limits.',
    finishAllCaughtUp: 'All caught up.',
    finishDone: 'Session finished.',
    finishNone: 'No cards selected.',
    finishDescCaughtUp: 'No reviews are due right now. Try switching sample packs in Deck Studio or rebuild limits.',
    finishDescDone: (rated, skipped, deferred) =>
      `${rated} rated · ${skipped} skipped (remain due). ${deferred} other card(s) deferred. Review history stays in this tab.`,
    finishDescNone: 'Your current limits excluded all due cards. Increase the limits and rebuild your plan.',
    emptyTopics: 'No cards in this deck. Load a sample pack or add cards in Deck Studio.',
    topicDueOfTotal: (due, total) => `${due} due / ${total} cards`,
    forecastSummary: f => `${f.dueNow} due now · ${f.unreviewed} unreviewed · ${f.later} beyond 7 days`,
    dayLabel: d => `D+${d}`,
    noLapsesYet: 'No lapses recorded yet.',
    noticeSkip: topic => `Skipped ${topic} card. No review was recorded; it stays due.`,
    noticeSaved: (rating, dueStr) => `Saved: ${rating} · next review ${dueStr}`,
    noticePlanRebuilt: 'Study plan rebuilt using current review history.',
    noticeStrategyChanged: label => `Spacing strategy switched to ${label}.`,
    noticePackLoaded: (name, count) => `Loaded sample pack '${name}' (${count} cards).`,
    noticeReset: 'Sample data reset. Your previous in-memory changes were cleared.',
    noticeCardAdded: topic => `Added new ${topic} card to the deck and rebuilt plan.`,
    noticeCardError: msg => `Could not add card: ${msg}`,
    noticeBulkAdded: count => `Appended ${count} card(s) from pasted notes and rebuilt plan.`,
    noticeBulkError: msg => `Could not parse pasted notes: ${msg}`,
    noticeCardDeleted: topic => `Removed card from ${topic} and rebuilt plan.`,
    noticeExportJson: 'Deck exported as plain-text JSON. Keep it private.',
    noticeExportCsv: 'Deck content exported as RFC 4180 CSV (formula-safe).',
    noticeExportTsv: 'Deck exported as tab-separated TSV (Anki/Quizlet ready).',
    noticeExportMd: 'Deck exported as a Markdown study sheet.',
    noticeExportFail: msg => `Export failed: ${msg}`,
    noticeFileTooLarge: 'File too large. Choose a smaller deck.',
    noticeImported: (count, fmt) => `Imported ${count} card(s) from ${fmt} locally. Nothing was uploaded.`,
    noticeImportFail: msg => `Import failed: ${msg}`,
    kickerIntelDiag: 'DIAGNOSIS & INTERVENTION LOOP',
    intelDiagHeading: 'Evidence & closed-loop tracking',
    intelDiagBlurb: 'Each recommendation carries numeric evidence. Seal an intervention into the append-only ledger to measure real post-study recall & stability gains.',
    intelIntvTitle: 'Sealed interventions',
    intelIntvSub: 'Pre vs post evaluation',
    exportLedgerBtn: 'Export Learning Ledger (MCP JSON) ↗',
    kickerIntelDsr: 'EVENT-SOURCED DSR MEMORY',
    intelDsrHeading: 'Stability, recall & calibration',
    intelLabelEvents: 'Logged events',
    intelSubEvents: 'Immutable ledger',
    intelLabelBrier: 'Brier score',
    intelSubBrier: 'Lower = calibrated',
    intelLabelR: 'Predicted recall',
    intelSubR: 'Across events',
    intelConceptsTitle: 'Concept dynamics',
    intelConceptsSub: 'Trend · R(now) · Stability',
    calibrateBtn: 'Calibrate forgetting speed (0 TL)',
    intelPrereqTitle: 'Prerequisite graph links',
    intelPrereqSub: 'Cycle-checked DAG',
    labelPrereqChild: 'Target topic',
    labelPrereqParent: 'Depends on',
    prereqAddBtn: 'Link prerequisite +',
    calIdleNote: 'Analyzes repeat review intervals locally in this tab to fit personal DSR parameters (initialStabilityScale, stabilityGainScale).',
    calInsufficientNote: (have, need) => `Need at least ${need} repeat predictions in this ledger to fit without overfitting (currently ${have}). Study more reviews or import a ledger.`,
    calFittedNote: fit =>
      `Active personal DSR fit (${fit.sampleCount} scored reviews): s0=${fit.params.initialStabilityScale}, g=${fit.params.stabilityGainScale} · Brier ${fit.baseline.brierScore.toFixed(3)} → ${fit.fittedResult.brierScore.toFixed(3)} (${fit.brierDelta >= 0 ? '+' : ''}${fit.brierDelta.toFixed(4)}). ${fit.caveat}`,
    intelNoDiagnoses: 'No bottleneck diagnoses right now. Rate cards across sessions to build empirical DSR predictions and detect prerequisite gaps.',
    intelSealBtn: 'Seal & Track Intervention +',
    intelSealedTag: 'TRACKING',
    intelNoInterventions: 'No interventions sealed yet. Click "Seal & Track Intervention +" on any diagnosis above, then rate a few cards in Study Studio.',
    intelSignalNames: {
      'fix-prerequisite': 'Prerequisite gap',
      'resolve-misconception': 'Misconception',
      'rescue-fading-memory': 'Fading recall',
      'slow-down-reading': 'Attention slips',
      'consolidate-backlog': 'Queue overload'
    },
    intelVerdictNames: {
      'insufficient-data': 'Need >=3 follow-up reviews',
      'positive-signal': 'Positive uplift signal',
      'no-improvement-reassess': 'No gain — reassess',
      'mixed-or-neutral': 'Mixed or neutral'
    },
    intelTrendNames: {
      improving: 'Improving',
      worsening: 'Worsening',
      steady: 'Steady',
      'insufficient-data': 'Gathering history'
    },
    noticeInterventionSealed: topic => `Intervention sealed for "${topic}". Rate follow-up cards in Study Studio to evaluate uplift.`,
    noticeExportLedger: 'Append-only Learning Ledger exported (v0.7 MCP JSON). Keep it private.',
    noticePersistOn: 'Local device persistence enabled for this tab (0 bytes uploaded).',
    noticePersistOff: 'Local device storage cleared. Progress now stays in memory only.',
    noticePrereqLinked: (child, parent) => `Linked prerequisite: ${child} now depends on ${parent}.`,
    noticePrereqError: msg => `Could not link prerequisite: ${msg}`,
    noticeCalibrated: (s0, g) => `Calibrated personal DSR parameters locally (s0=${s0}, g=${g}).`,
    noticeCalInsufficient: (have, need) => `Logged ${have}/${need} repeat reviews so far — keep studying or import a ledger to calibrate.`
  },
  tr: {
    privacyText: 'Yalnızca yerel stüdyo',
    eyebrowText: 'AÇIK KAYNAK ÇALIŞMA STÜDYOSU',
    pageTitleHtml: 'Deterministik tekrar.<br><em>Dürüst</em> öğrenme sinyalleri.',
    introLead: 'DSR, SM-2 ve Leitner planlayıcılarını karşılaştır; eklemeli Öğrenme Defteri (Ledger) ve kapalı döngü müdahale takibi kullan; {{boşluklu}} ya da Anki TSV destelerle çalış—sıfır bulut, sıfır takip.',
    tabStudy: 'Çalışma Stüdyosu',
    tabSimulator: 'Strateji Simülatörü',
    tabDecks: 'Deste & Paketler',
    tabIntelligence: 'Öğrenme Analitiği',
    kickerActive: 'AKTİF ÇALIŞMA',
    sessionHeading: 'Bugünkü oturum',
    labelQuestions: 'Soru sayısı',
    labelPerTopic: 'Konu başı',
    labelNewCards: 'Yeni kart',
    labelStrategy: 'Strateji',
    replanBtn: 'Planı yenile ↻',
    labelReverseMode: 'Soru ↔ Yanıt Çevir',
    labelReasonAware: 'Hata-odaklı öncelik',
    labelScratchpad: 'Hatırlama notu',
    scratchpadHint: '(isteğe bağlı · otomatik puanlanmaz)',
    scratchpadPlaceholder: 'Yanıtı görmeden önce hatırladığını kısaca yaz...',
    sampleAnswerLabel: 'YANIT',
    revealBtn: 'Yanıtı göster ↗',
    skipBtn: 'Şimdilik atla ↷',
    revealHint: 'Göstermeden önce kendi yanıtını düşün.',
    mistakeLabelText: 'Yanıldıysan nedeni neydi?',
    mistakeOptional: '(isteğe bağlı)',
    ratingTitle: 'NE KADAR İYİ HATIRLADIN?',
    feedbackNote: 'Puanlama öz-bildirime dayanır; sistem yanıtı otomatik notlandırmaz.',
    skipInline: 'Bu kartı puanlamadan atla ↷',
    shortcutHint: 'Klavye: Boşluk = Göster · 1–4 = Puanla · S = Atla',
    nextPlanBtn: 'Yeni oturum planla ↗',
    kickerSim: 'KOHORT KARŞILAŞTIRMA LABI',
    simHeading: 'Stratejileri deneysel olarak karşılaştır.',
    simBlurb: 'Balanced, Gentle, Intensive, SM-2 Adaptive ve DSR Bellek stratejilerini aynı unutma eğrisi ve tohumlu simülasyonda kıyaslayarak günlük yük ve birikme farklarını gör.',
    labelSimCards: 'Kart',
    labelSimDays: 'Gün',
    labelSimLimit: 'Günlük sınır',
    labelSimProfile: 'Profil',
    runSimBtn: 'Simülasyonu çalıştır ↻',
    kickerSeq: 'ADIM ADIM İZLEME',
    seqHeading: 'Bire bir aralık dizisi',
    seqBlurb: 'Sıra: Good → Good → Again (kavram karışıklığı) → Good → Easy.',
    kickerPacks: 'HAZIR ÖRNEK PAKETLER',
    packsHeading: 'Konu paketi seç',
    packsBlurb: 'CS {{boşluk doldurma}}, Biyoloji hata analizi veya çift yönlü İngilizce-Türkçe kelime paketlerini tek tıkla dene.',
    packStarter: 'Genel Karışım (9)',
    packEnglish: 'İngilizce Ustalık (A2→B2)',
    packCs: 'Algoritmalar (Cloze)',
    packBiology: 'Hücre Biyolojisi',
    packLanguage: 'EN ↔ TR Kelime',
    kickerAuthor: 'KİŞİSEL KART DESTESİ',
    addCardHeading: 'Kendi kartını ekle',
    addCardBlurb: 'Tekil kart ekle ({{boşluk}} destekli!) veya toplu Markdown Q :: A, CSV ya da Anki/Quizlet TSV yapıştır.',
    labelCardTopic: 'Konu',
    labelCardQuestion: 'Soru',
    labelCardAnswer: 'Yanıt',
    addCardSubmit: 'Desteye kart ekle +',
    bulkPasteSummary: 'Toplu Markdown Q :: A veya Anki TSV yapıştır',
    bulkImportBtn: 'Yapıştırılan kartları ekle +',
    kickerExplorer: 'DESTE GEZGİNİ',
    deckManagerHeading: 'Kartları ara ve yönet',
    labelDeckSearch: 'Metin filtresi',
    deckSearchPlaceholder: 'Soru veya konu ara...',
    labelDeckTopic: 'Konu',
    allTopicsOption: 'Tüm konular',
    kickerSnapshot: 'CANLI ÖZET',
    liveIndicator: '● BELLEKTE',
    insightsHeading: 'Genel görünüm.',
    insightBlurb: 'Çalıştıkça doğrudan tekrar motorundan güncellenir.',
    statDueLabel: 'Şimdi tekrar',
    statDueSub: 'Çalışmaya hazır',
    statReviewedLabel: 'Çalışılan',
    statReviewedSub: 'Geçmişi olan kart',
    statAccuracyLabel: 'Hatırlama oranı',
    statAccuracySub: 'Öz-bildirim',
    focusHeadingTitle: 'Odak sinyalleri',
    focusHeadingSub: 'Öz-bildirim geçmişinden',
    noFocusSignals: 'Şu an tıkanma sinyali yok.',
    topicHeadingTitle: 'Konu dağılımı',
    topicHeadingSub: 'Bekleyen / toplam',
    forecastHeadingTitle: '7 günlük tekrar yükü',
    forecastHeadingSub: 'Planlı tarihler',
    mistakesHeadingTitle: 'Hata nedenleri',
    mistakesHeadingSub: 'Otomatik tahmin edilmez',
    insightFootnote: 'Bu sayılar kesin bilgi düzeyini veya ustalığı ölçmez.',
    kickerData: 'VERİN SENİN KONTROLÜNDE',
    dataHeading: 'Dışa veya içe aktar.',
    dataBlurb: 'Geçmişi JSON, formül korumalı CSV, Anki/Quizlet TSV veya Markdown olarak indir ya da dosya yükle. Veriler bu sekmeden dışarı çıkmaz.',
    exportJsonBtn: 'JSON İndir ↗',
    exportCsvBtn: 'CSV İndir ↗',
    exportTsvBtn: 'TSV İndir ↗',
    exportMdBtn: 'MD İndir ↗',
    importBtn: 'Dosya Yükle ↑',
    labelPersistLocal: 'İlerlemeyi bu cihazda hatırla',
    resetBtn: '↻ Örnek veriyi sıfırla',
    overlineHow: 'NASIL ÇALIŞIR?',
    p1Title: 'Önemli olanı tekrar et.',
    p1Body: 'Deterministik SM-2 ve Leitner ön ayarları kartları planlar; hata nedenlerin odak önceliğini etkiler.',
    p2Title: 'Varsayma, karşılaştır.',
    p2Body: '30 günlük unutma simülasyonlarını yan yana gör; konu başı sınırlarla oturumu dengede tut.',
    p3Title: 'MCP uyumlu & yerel-öncelikli.',
    p3Body: 'Tarayıcı, Node CLI, Web Component veya stdio MCP sunucusuyla kullan; yapay zekâ ilerleme uyduramaz.',
    strategyNames: {
      balanced: 'Dengeli',
      gentle: 'Yumuşak',
      intensive: 'Yoğun',
      sm2: 'SM-2 Uyarlanabilir',
      dsr: 'DSR Bellek (FSRS)'
    },
    simProfiles: {
      steady: 'Düzenli öğrenci',
      cramming: 'Hızlı unutma (sınav)',
      'missed-days': 'Günlerin %25\'i atlanır'
    },
    strategyNote: def => {
      if (def.id === 'dsr') {
        return `${def.label}: FSRS tarzı güç yasası R(t) = (1 + t/(9S))^-1, kararlılık sönümlemesi ve dikkatsizlik korumalı zorluk.`;
      }
      if (def.adaptive) {
        return `${def.label}: başarı serisi ve hata nedenine göre kolaylık çarpanı (1.3–2.8 EF) uygular.`;
      }
      return `${def.label}: tekrar ${def.againMinutes}dk · zor ${def.hardHours}sa · kutular ${def.intervalsDays.slice(1).map(d => d + 'g').join(' / ')}.`;
    },
    reasons: {
      'new-card': 'Yeni kart',
      'scheduled-review': 'Planlı tekrar',
      overdue: 'Günü geçmiş',
      'previous-mistakes': 'Önceki hata',
      'concept-misconception': 'Kavram kontrolü',
      'knowledge-gap': 'Bilgi eksiği',
      'attention-slip': 'Dikkatsizlik'
    },
    mistakeOptions: {
      '': 'Belirtilmedi',
      'knowledge-gap': 'Bilgi eksiği',
      misconception: 'Kavram karışıklığı',
      attention: 'Dikkatsizlik',
      other: 'Diğer'
    },
    mistakeChipNames: {
      'knowledge-gap': 'Bilgi eksiği',
      misconception: 'Kavram karışıklığı',
      attention: 'Dikkatsizlik',
      other: 'Diğer',
      unspecified: 'Belirtilmemiş'
    },
    ratings: {
      again: ['Tekrar', 'Kısa sürede'],
      hard: ['Zor', 'Yakın tut'],
      good: ['İyi', 'İlerlet'],
      easy: ['Kolay', 'Aralığı aç']
    },
    stageQuestion: (idx, total) => `SORU ${String(idx).padStart(2, '0')} / ${String(total).padStart(2, '0')}`,
    stageSummary: 'OTURUM ÖZETİ',
    newCardBadge: 'YENİ KART',
    dueReviewBadge: 'TEKRAR ZAMANI',
    clozeBadge: 'BOŞLUKLU',
    reversedBadge: 'TERS YÖN',
    deckCount: n => `${n} kart`,
    deckStatusNew: 'Yeni',
    deckStatusDue: 'Şimdi',
    deckStatusScheduled: 'Planlı',
    deckRemoveLabel: 'Sil',
    deckNoMatches: 'Filtreyle eşleşen kart yok.',
    simRecallMetric: (rate, mature, avg, peak, backlog, total) =>
      `Hatırlama %${Math.round((rate ?? 0) * 100)} · Olgun ${mature}/${total} · Ort ${avg}/g (zirve ${peak}) · Biriken ${backlog}`,
    sessionDesc: (total, deferred, skipped) =>
      total
        ? `${total} seçildi · ${deferred} ertelendi${skipped ? ` · ${skipped} atlandı (hâlâ bekliyor)` : ''}`
        : 'Bu sınırlarla eşleşen kart yok.',
    finishAllCaughtUp: 'Hepsi tamam.',
    finishDone: 'Oturum bitti.',
    finishNone: 'Kart seçilmedi.',
    finishDescCaughtUp: 'Şu an tekrar zamanı gelmiş kart yok. Deste Stüdyosundan yeni paket seçebilir veya sınırları ayarlayabilirsin.',
    finishDescDone: (rated, skipped, deferred) =>
      `${rated} puanlandı · ${skipped} atlandı (beklemede kalır). ${deferred} diğer kart seçilmedi. Geçmiş yalnızca bu sekmede tutulur.`,
    finishDescNone: 'Mevcut sınırlar tüm bekleyen kartları dışladı. Sınırları artırıp planı yenileyin.',
    emptyTopics: 'Destede kart yok. Deste Stüdyosundan paket yükle veya kart ekle.',
    topicDueOfTotal: (due, total) => `${due} bekliyor / ${total} kart`,
    forecastSummary: f => `${f.dueNow} şimdi bekliyor · ${f.unreviewed} hiç çalışılmadı · ${f.later} kart 7+ gün sonra`,
    dayLabel: d => `+${d}G`,
    noLapsesYet: 'Henüz kaydedilmiş hata yok.',
    noticeSkip: topic => `${topic} kartı atlandı. Tekrar kaydedilmedi; sırada kalır.`,
    noticeSaved: (rating, dueStr) => `Kaydedildi: ${rating} · sonraki tekrar ${dueStr}`,
    noticePlanRebuilt: 'Çalışma planı güncel tekrar geçmişine göre yenilendi.',
    noticeStrategyChanged: label => `Aralık stratejisi değişti: ${label}.`,
    noticePackLoaded: (name, count) => `'${name}' paketi yüklendi (${count} kart).`,
    noticeReset: 'Örnek veriler sıfırlandı. Bellekteki değişiklikler temizlendi.',
    noticeCardAdded: topic => `${topic} konusuna yeni kart eklendi ve plan güncellendi.`,
    noticeCardError: msg => `Kart eklenemedi: ${msg}`,
    noticeBulkAdded: count => `Yapıştırılan notlardan ${count} kart eklendi ve plan güncellendi.`,
    noticeBulkError: msg => `Notlar ayrıştırılamadı: ${msg}`,
    noticeCardDeleted: topic => `${topic} konusundan bir kart silindi ve plan güncellendi.`,
    noticeExportJson: 'Deste düz metin JSON olarak indirildi. Gizli tutun.',
    noticeExportCsv: 'Kart içerikleri RFC 4180 CSV olarak indirildi (formül korumalı).',
    noticeExportTsv: 'Deste sekmeli TSV (Anki/Quizlet uyumlu) olarak indirildi.',
    noticeExportMd: 'Deste Markdown çalışma sayfası olarak indirildi.',
    noticeExportFail: msg => `Dışa aktarma başarısız: ${msg}`,
    noticeFileTooLarge: 'Dosya çok büyük. Daha küçük bir deste seçin.',
    noticeImported: (count, fmt) => `${fmt} dosyasından ${count} kart yerel olarak içe aktarıldı. Sunucuya yükleme yapılmadı.`,
    noticeImportFail: msg => `İçe aktarma başarısız: ${msg}`,
    kickerIntelDiag: 'TANI VE MÜDAHALE DÖNGÜSÜ',
    intelDiagHeading: 'Kanıtlı tanı ve sonuç takibi',
    intelDiagBlurb: 'Her öneri sayısal kanıt taşır. Bir müdahaleyi eklemeli deftere mühürleyerek çalışma sonrası gerçek hatırlama ve kararlılık artışını ölç.',
    intelIntvTitle: 'Mühürlenmiş müdahaleler',
    intelIntvSub: 'Öncesi vs sonrası değerlendirme',
    exportLedgerBtn: 'Öğrenme Defterini İndir (MCP JSON) ↗',
    kickerIntelDsr: 'OLAY TABANLI DSR BELLEĞİ',
    intelDsrHeading: 'Kararlılık, hatırlama & kalibrasyon',
    intelLabelEvents: 'Kayıtlı olay',
    intelSubEvents: 'Değişmez defter',
    intelLabelBrier: 'Brier skoru',
    intelSubBrier: 'Düşük = kalibre',
    intelLabelR: 'Tahmini hatırlama',
    intelSubR: 'Olay ortalaması',
    intelConceptsTitle: 'Kavram dinamikleri',
    intelConceptsSub: 'Eğilim · R(şimdi) · Kararlılık',
    calibrateBtn: 'Unutma hızımı kalibre et (0 TL)',
    intelPrereqTitle: 'Önkoşul kavram bağlantıları',
    intelPrereqSub: 'Döngü korumalı grafik',
    labelPrereqChild: 'Hedef konu',
    labelPrereqParent: 'Önkoşul konusu',
    prereqAddBtn: 'Önkoşul bağla +',
    calIdleNote: 'Bu sekmedeki tekrar aralıklarını yerelde inceleyerek kişisel DSR bellek eğrini (initialStabilityScale, stabilityGainScale) kalibre eder.',
    calInsufficientNote: (have, need) => `Aşırı uyumu önlemek için bu defterde en az ${need} tekrar tahmini gerekir (şu an ${have}). Çalışmaya devam et veya defter içe aktar.`,
    calFittedNote: fit =>
      `Aktif kişisel DSR uyumu (${fit.sampleCount} puanlı tahmin): s0=${fit.params.initialStabilityScale}, g=${fit.params.stabilityGainScale} · Brier ${fit.baseline.brierScore.toFixed(3)} → ${fit.fittedResult.brierScore.toFixed(3)} (${fit.brierDelta >= 0 ? '+' : ''}${fit.brierDelta.toFixed(4)}).`,
    intelNoDiagnoses: 'Şu an tıkanıklık tanısı yok. Deneysel DSR tahminleri ve önkoşul açıkları için kartları çalışıp puanla.',
    intelSealBtn: 'Müdahaleyi Mühürle ve Takip Et +',
    intelSealedTag: 'TAKİPTE',
    intelNoInterventions: 'Henüz müdahale mühürlenmedi. Yukarıdaki bir tanıda "Müdahaleyi Mühürle" düğmesine bas ve Çalışma Stüdyosunda birkaç tekrar yap.',
    intelSignalNames: {
      'fix-prerequisite': 'Önkoşul açığı',
      'resolve-misconception': 'Kavram karışıklığı',
      'rescue-fading-memory': 'Zayıflayan iz',
      'slow-down-reading': 'Dikkatsizlik',
      'consolidate-backlog': 'Biriken yük'
    },
    intelVerdictNames: {
      'insufficient-data': 'En az 3 takip tekrarı gerekir',
      'positive-signal': 'Olumlu etki sinyali',
      'no-improvement-reassess': 'Gelişim yok — yeniden değerlendir',
      'mixed-or-neutral': 'Karışık veya nötr'
    },
    intelTrendNames: {
      improving: 'İyileşiyor',
      worsening: 'Kötüleşiyor',
      steady: 'Durağan',
      'insufficient-data': 'Geçmiş birikiyor'
    },
    noticeInterventionSealed: topic => `${topic} için müdahale mühürlendi. Etkiyi ölçmek için Çalışma Stüdyosunda takip tekrarları yap.`,
    noticeExportLedger: 'Eklemeli Öğrenme Defteri (v0.7 MCP JSON) indirildi. Gizli tutun.',
    noticePersistOn: 'Yerel tarayıcı kaydı (localStorage) açıldı. Sunucuya 0 bayt gider.',
    noticePersistOff: 'Yerel cihaz kaydı silindi. İlerleme yalnızca bu sekmede tutuluyor.',
    noticePrereqLinked: (child, parent) => `Önkoşul bağlandı: ${child} artık ${parent} konusuna bağlı.`,
    noticePrereqError: msg => `Önkoşul bağlanamadı: ${msg}`,
    noticeCalibrated: (s0, g) => `Kişisel DSR belleğin yerelde kalibre edildi (s0=${s0}, g=${g}).`,
    noticeCalInsufficient: (have, need) => `Şu ana kadar ${have}/${need} tekrar tahmini birikti; kalibrasyon için çalışmaya devam et veya defter yükle.`
  }
};

const STORAGE_ENABLE_KEY = 'fark-study-studio-persist-v07';
const STORAGE_STATE_KEY = 'fark-study-studio-state-v07';

function buildLedgerForDeck(deck, at = new Date()) {
  return createLedger({
    cards: deck,
    concepts: buildConceptNodesForCards(deck),
    createdAt: at
  });
}

let lang = 'en';
let activeTab = 'study';
let cards = buildSamplePack('starter');
let ledger = buildLedgerForDeck(cards);
let lastEventMs = Date.now();
let plan = null;
let position = 0;
let ratedCount = 0;
let skippedCount = 0;
let answerVisible = false;
let customCounter = 1;
let persistEnabled = false;
let fittedParams = null;
let lastCalibration = null;
let messageTimer;

function getLocalStorageSafe() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {}
  return null;
}

function clearLocalState() {
  const store = getLocalStorageSafe();
  if (!store) return;
  try {
    store.removeItem(STORAGE_ENABLE_KEY);
    store.removeItem(STORAGE_STATE_KEY);
  } catch {}
}

function saveLocalState() {
  const store = getLocalStorageSafe();
  if (!persistEnabled || !store) return;
  try {
    store.setItem(STORAGE_ENABLE_KEY, '1');
    store.setItem(
      STORAGE_STATE_KEY,
      JSON.stringify({
        version: 1,
        lang,
        strategy: activeStrategyId(),
        deckJson: exportStudyDeck(cards),
        ledgerJson: exportLedger(ledger),
        fittedParams
      })
    );
  } catch {}
}

function restoreLocalStateIfEnabled() {
  const store = getLocalStorageSafe();
  if (!store) return false;
  try {
    if (store.getItem(STORAGE_ENABLE_KEY) !== '1') return false;
    const raw = store.getItem(STORAGE_STATE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    const restoredCards = importStudyDeck(saved.deckJson);
    const restoredLedger = importLedger(saved.ledgerJson);
    cards = restoredCards;
    ledger = restoredLedger;
    persistEnabled = true;
    $('persist-local-toggle').checked = true;
    if (saved.lang === 'en' || saved.lang === 'tr') lang = saved.lang;
    if (typeof saved.strategy === 'string') {
      try {
        getReviewStrategy(saved.strategy);
        $('strategy-select').value = saved.strategy;
      } catch {}
    }
    if (
      saved.fittedParams &&
      Number.isFinite(saved.fittedParams.initialStabilityScale) &&
      Number.isFinite(saved.fittedParams.stabilityGainScale)
    ) {
      fittedParams = saved.fittedParams;
    }
    return true;
  } catch {
    clearLocalState();
    return false;
  }
}

function nextEventDate() {
  const now = Date.now();
  lastEventMs = now > lastEventMs ? now : lastEventMs + 1;
  return new Date(lastEventMs);
}

const t = () => I18N[lang];
const activeStrategyId = () => $('strategy-select').value || 'balanced';
const isReversedMode = () => Boolean($('reverse-toggle').checked);
const isReasonAware = () => ($('reason-aware-toggle').checked ?? true) !== false;

function notify(message) {
  const note = $('notice');
  note.textContent = message;
  note.classList.add('visible');
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => note.classList.remove('visible'), 4800);
}

function setRatingButtonCopy(id, title, sub) {
  const el = $(id);
  const small = document.createElement('small');
  small.textContent = sub;
  el.textContent = title + ' ';
  el.append(small);
}

function updateStrategyNote() {
  const def = getReviewStrategy(activeStrategyId());
  $('strategy-note').textContent = t().strategyNote(def);
}

function switchTab(nextTab) {
  activeTab = nextTab;
  const mapping = [
    ['study', 'tab-study', 'panel-study'],
    ['simulator', 'tab-simulator', 'panel-simulator'],
    ['decks', 'tab-decks', 'panel-decks'],
    ['intelligence', 'tab-intelligence', 'panel-intelligence']
  ];
  for (const [key, tabId, panelId] of mapping) {
    const isActive = key === activeTab;
    $(panelId).hidden = !isActive;
    $(tabId).setAttribute('aria-selected', String(isActive));
    if (isActive) $(tabId).classList.add('active');
    else $(tabId).classList.remove('active');
  }
  if (activeTab === 'simulator') renderSimulator();
  if (activeTab === 'decks') renderDeckManager();
  if (activeTab === 'intelligence') renderIntelligence();
}

function applyLanguage() {
  const copy = t();
  document.documentElement?.setAttribute('lang', lang);
  $('lang-toggle').textContent = lang === 'en' ? 'TR' : 'EN';
  $('privacy-text').textContent = copy.privacyText;
  $('eyebrow-text').textContent = copy.eyebrowText;
  if ($('page-title').innerHTML !== undefined) $('page-title').innerHTML = copy.pageTitleHtml;
  $('intro-lead').textContent = copy.introLead;
  $('tab-study').textContent = copy.tabStudy;
  $('tab-simulator').textContent = copy.tabSimulator;
  $('tab-decks').textContent = copy.tabDecks;
  $('tab-intelligence').textContent = copy.tabIntelligence;
  $('kicker-active').textContent = copy.kickerActive;
  $('session-heading').textContent = copy.sessionHeading;
  $('label-questions').textContent = copy.labelQuestions;
  $('label-per-topic').textContent = copy.labelPerTopic;
  $('label-new-cards').textContent = copy.labelNewCards;
  $('label-strategy').textContent = copy.labelStrategy;
  $('replan-button').textContent = copy.replanBtn;
  $('label-reverse-mode').textContent = copy.labelReverseMode;
  $('label-reason-aware').textContent = copy.labelReasonAware;
  $('label-scratchpad').textContent = copy.labelScratchpad;
  $('scratchpad-hint').textContent = copy.scratchpadHint;
  $('self-answer-input').placeholder = copy.scratchpadPlaceholder;
  $('sample-answer-label').textContent = copy.sampleAnswerLabel;
  $('reveal-button').textContent = copy.revealBtn;
  $('skip-button').textContent = copy.skipBtn;
  $('reveal-hint').textContent = copy.revealHint;
  $('mistake-label-text').textContent = copy.mistakeLabelText;
  $('mistake-optional').textContent = copy.mistakeOptional;
  $('rating-title').textContent = copy.ratingTitle;
  $('feedback-note').textContent = copy.feedbackNote;
  $('skip-after-reveal').textContent = copy.skipInline;
  $('shortcut-hint').textContent = copy.shortcutHint;
  $('next-plan-button').textContent = copy.nextPlanBtn;
  $('kicker-sim').textContent = copy.kickerSim;
  $('sim-heading').textContent = copy.simHeading;
  $('sim-blurb').textContent = copy.simBlurb;
  $('label-sim-cards').textContent = copy.labelSimCards;
  $('label-sim-days').textContent = copy.labelSimDays;
  $('label-sim-limit').textContent = copy.labelSimLimit;
  $('label-sim-profile').textContent = copy.labelSimProfile;
  $('run-sim-btn').textContent = copy.runSimBtn;
  $('kicker-seq').textContent = copy.kickerSeq;
  $('seq-heading').textContent = copy.seqHeading;
  $('seq-blurb').textContent = copy.seqBlurb;
  $('kicker-packs').textContent = copy.kickerPacks;
  $('packs-heading').textContent = copy.packsHeading;
  $('packs-blurb').textContent = copy.packsBlurb;
  $('pack-starter').textContent = copy.packStarter;
  $('pack-english').textContent = copy.packEnglish;
  $('pack-cs').textContent = copy.packCs;
  $('pack-biology').textContent = copy.packBiology;
  $('pack-language').textContent = copy.packLanguage;
  $('kicker-author').textContent = copy.kickerAuthor;
  $('add-card-heading').textContent = copy.addCardHeading;
  $('add-card-blurb').textContent = copy.addCardBlurb;
  $('label-card-topic').textContent = copy.labelCardTopic;
  $('label-card-question').textContent = copy.labelCardQuestion;
  $('label-card-answer').textContent = copy.labelCardAnswer;
  $('add-card-submit').textContent = copy.addCardSubmit;
  $('bulk-paste-summary').textContent = copy.bulkPasteSummary;
  $('bulk-import-btn').textContent = copy.bulkImportBtn;
  $('kicker-explorer').textContent = copy.kickerExplorer;
  $('deck-manager-heading').textContent = copy.deckManagerHeading;
  $('label-deck-search').textContent = copy.labelDeckSearch;
  $('deck-search').placeholder = copy.deckSearchPlaceholder;
  $('label-deck-topic').textContent = copy.labelDeckTopic;
  $('kicker-snapshot').textContent = copy.kickerSnapshot;
  $('live-indicator').textContent = copy.liveIndicator;
  $('insights-heading').textContent = copy.insightsHeading;
  $('insight-blurb').textContent = copy.insightBlurb;
  $('stat-due-label').textContent = copy.statDueLabel;
  $('stat-due-sub').textContent = copy.statDueSub;
  $('stat-reviewed-label').textContent = copy.statReviewedLabel;
  $('stat-reviewed-sub').textContent = copy.statReviewedSub;
  $('stat-accuracy-label').textContent = copy.statAccuracyLabel;
  $('stat-accuracy-sub').textContent = copy.statAccuracySub;
  $('focus-heading-title').textContent = copy.focusHeadingTitle;
  $('focus-heading-sub').textContent = copy.focusHeadingSub;
  $('topic-heading-title').textContent = copy.topicHeadingTitle;
  $('topic-heading-sub').textContent = copy.topicHeadingSub;
  $('forecast-heading-title').textContent = copy.forecastHeadingTitle;
  $('forecast-heading-sub').textContent = copy.forecastHeadingSub;
  $('mistakes-heading-title').textContent = copy.mistakesHeadingTitle;
  $('mistakes-heading-sub').textContent = copy.mistakesHeadingSub;
  $('insight-footnote').textContent = copy.insightFootnote;
  $('kicker-data').textContent = copy.kickerData;
  $('data-heading').textContent = copy.dataHeading;
  $('data-blurb').textContent = copy.dataBlurb;
  $('export-button').textContent = copy.exportJsonBtn;
  $('export-csv-button').textContent = copy.exportCsvBtn;
  $('export-tsv-button').textContent = copy.exportTsvBtn;
  $('export-md-button').textContent = copy.exportMdBtn;
  $('import-trigger').textContent = copy.importBtn;
  $('label-persist-local').textContent = copy.labelPersistLocal;
  $('reset-button').textContent = copy.resetBtn;
  $('kicker-intel-diag').textContent = copy.kickerIntelDiag;
  $('intel-diag-heading').textContent = copy.intelDiagHeading;
  $('intel-diag-blurb').textContent = copy.intelDiagBlurb;
  $('intel-intv-title').textContent = copy.intelIntvTitle;
  $('intel-intv-sub').textContent = copy.intelIntvSub;
  $('export-ledger-button').textContent = copy.exportLedgerBtn;
  $('kicker-intel-dsr').textContent = copy.kickerIntelDsr;
  $('intel-dsr-heading').textContent = copy.intelDsrHeading;
  $('intel-label-events').textContent = copy.intelLabelEvents;
  $('intel-sub-events').textContent = copy.intelSubEvents;
  $('intel-label-brier').textContent = copy.intelLabelBrier;
  $('intel-sub-brier').textContent = copy.intelSubBrier;
  $('intel-label-r').textContent = copy.intelLabelR;
  $('intel-sub-r').textContent = copy.intelSubR;
  $('calibrate-button').textContent = copy.calibrateBtn;
  $('intel-concepts-title').textContent = copy.intelConceptsTitle;
  $('intel-concepts-sub').textContent = copy.intelConceptsSub;
  $('intel-prereq-title').textContent = copy.intelPrereqTitle;
  $('intel-prereq-sub').textContent = copy.intelPrereqSub;
  $('label-prereq-child').textContent = copy.labelPrereqChild;
  $('label-prereq-parent').textContent = copy.labelPrereqParent;
  $('prereq-add-btn').textContent = copy.prereqAddBtn;
  $('overline-how').textContent = copy.overlineHow;
  $('p1-title').textContent = copy.p1Title;
  $('p1-body').textContent = copy.p1Body;
  $('p2-title').textContent = copy.p2Title;
  $('p2-body').textContent = copy.p2Body;
  $('p3-title').textContent = copy.p3Title;
  $('p3-body').textContent = copy.p3Body;

  for (const [key, label] of Object.entries(copy.ratings)) {
    setRatingButtonCopy('rating-' + key, label[0], label[1]);
  }
  const select = $('mistake-reason');
  if (select.options) {
    for (const opt of select.options) {
      if (Object.hasOwn(copy.mistakeOptions, opt.value)) {
        opt.textContent = copy.mistakeOptions[opt.value];
      }
    }
  }
  const stratSelect = $('strategy-select');
  if (stratSelect.options) {
    for (const opt of stratSelect.options) {
      if (Object.hasOwn(copy.strategyNames, opt.value)) {
        opt.textContent = copy.strategyNames[opt.value];
      }
    }
  }
  const profileSelect = $('sim-profile');
  if (profileSelect.options) {
    for (const opt of profileSelect.options) {
      if (Object.hasOwn(copy.simProfiles, opt.value)) {
        opt.textContent = copy.simProfiles[opt.value];
      }
    }
  }
  updateStrategyNote();
}

function planOptions() {
  return {
    limit: Number($('session-limit').value) || 6,
    maxPerTopic: Number($('topic-limit').value) || 2,
    maxNewCards: Number($('new-limit').value || 2),
    reasonAware: isReasonAware()
  };
}

function rebuildPlan() {
  plan = planStudySession(cards, new Date(), planOptions());
  position = 0;
  ratedCount = 0;
  skippedCount = 0;
  answerVisible = false;
  $('mistake-reason').value = '';
  $('self-answer-input').value = '';
  render();
}

function currentItem() {
  return plan?.planned[position] ?? null;
}

function progress() {
  const copy = t();
  const total = plan?.plannedCount ?? 0;
  const completed = Math.min(position, total);
  $('session-counter').textContent = completed + ' / ' + total;
  $('session-stage').textContent = total && completed < total
    ? copy.stageQuestion(completed + 1, total)
    : copy.stageSummary;
  $('progress-bar').setAttribute('aria-valuemax', String(total));
  $('progress-bar').setAttribute('aria-valuenow', String(completed));
  $('progress-fill').style.width = total ? Math.round(completed / total * 100) + '%' : '0%';
  const deferred = plan?.deferredCount ?? 0;
  $('session-description').textContent = copy.sessionDesc(total, deferred, skippedCount);
}

function renderCard() {
  const copy = t();
  const item = currentItem();
  const hasQuestion = !!item;
  $('question-content').hidden = !hasQuestion;
  $('finished-content').hidden = hasQuestion;
  if (!hasQuestion) {
    $('finish-heading').textContent = plan.dueCount === 0
      ? copy.finishAllCaughtUp
      : position > 0 ? copy.finishDone : copy.finishNone;
    $('finish-description').textContent = plan.dueCount === 0
      ? copy.finishDescCaughtUp
      : position > 0
        ? copy.finishDescDone(ratedCount, skippedCount, plan.deferredCount)
        : copy.finishDescNone;
    return;
  }

  const rawCard = cards.find(c => c.id === item.id);
  const rawCloze = parseClozePrompt(rawCard.question, rawCard.answer);
  const useReversed = isReversedMode() && !rawCloze.isCloze;
  const displayCard = useReversed ? reverseCardPrompt(rawCard) : rawCard;
  const cloze = parseClozePrompt(displayCard.question, displayCard.answer);

  $('question-topic').textContent = item.topic;
  const baseBadge = item.status === 'new' ? copy.newCardBadge : copy.dueReviewBadge;
  const extras = [];
  if (cloze.isCloze) extras.push(copy.clozeBadge);
  if (useReversed) extras.push(copy.reversedBadge);
  $('question-kind').textContent = extras.length ? `${baseBadge} · ${extras.join(' · ')}` : baseBadge;
  $('question-text').textContent = cloze.maskedQuestion;
  $('answer-text').textContent = cloze.isCloze ? cloze.revealedText : displayCard.answer;
  $('answer-panel').hidden = !answerVisible;
  $('reveal-controls').hidden = answerVisible;
  $('rating-controls').hidden = !answerVisible;
  $('question-reasons').replaceChildren();
  for (const reason of item.reasonCodes) {
    const pill = document.createElement('span');
    pill.className = 'reason-pill';
    pill.textContent = copy.reasons[reason] ?? reason;
    $('question-reasons').append(pill);
  }
}

function renderFocusSignals(now) {
  const copy = t();
  const recs = getStudyRecommendations(cards, now);
  const container = $('focus-list');
  container.replaceChildren();
  if (!recs.length) {
    const empty = document.createElement('p');
    empty.className = 'insight-subnote';
    empty.textContent = copy.noFocusSignals;
    container.append(empty);
    return;
  }
  for (const rec of recs.slice(0, 3)) {
    const box = document.createElement('div');
    box.className = 'focus-item';
    const title = document.createElement('strong');
    title.textContent = `${rec.topic} · ${rec.due}/${rec.total} due`;
    const msg = document.createElement('span');
    msg.textContent = rec.message;
    box.append(title, msg);
    container.append(box);
  }
}

function renderForecastAndMistakes(now) {
  const copy = t();
  const forecast = getReviewForecast(cards, now, 7);
  const grid = $('forecast-grid');
  grid.replaceChildren();
  const maxDue = Math.max(1, ...forecast.schedule.map(day => day.dueCount));
  for (const day of forecast.schedule) {
    const cell = document.createElement('div');
    cell.className = 'forecast-day';
    const wrap = document.createElement('div');
    wrap.className = 'forecast-bar-wrap';
    const bar = document.createElement('div');
    bar.className = day.dueCount === 0 ? 'forecast-bar zero' : 'forecast-bar';
    bar.style.height = day.dueCount === 0 ? '4px' : Math.max(8, Math.round((day.dueCount / maxDue) * 34)) + 'px';
    wrap.append(bar);
    const count = document.createElement('span');
    count.className = 'forecast-count';
    count.textContent = String(day.dueCount);
    const label = document.createElement('span');
    label.className = 'forecast-label';
    label.textContent = copy.dayLabel(day.day);
    cell.append(wrap, count, label);
    grid.append(cell);
  }
  $('forecast-summary').textContent = copy.forecastSummary(forecast);

  const mistakes = getMistakeBreakdown(cards);
  const list = $('mistake-list');
  list.replaceChildren();
  if (mistakes.totalLapses === 0) {
    const empty = document.createElement('p');
    empty.className = 'insight-subnote';
    empty.textContent = copy.noLapsesYet;
    list.append(empty);
    return;
  }
  const entries = [
    ...Object.entries(mistakes.byReason).filter(([, count]) => count > 0),
    ...(mistakes.unspecified > 0 ? [['unspecified', mistakes.unspecified]] : [])
  ];
  for (const [key, count] of entries) {
    const chip = document.createElement('span');
    chip.className = 'mistake-chip';
    chip.textContent = `${copy.mistakeChipNames[key] ?? key}: ${count}`;
    list.append(chip);
  }
}

function renderInsights() {
  const copy = t();
  const now = new Date();
  const summary = getStudySummary(cards, now);
  $('stat-due').textContent = summary.due;
  $('stat-reviewed').textContent = summary.studied;
  $('stat-accuracy').textContent = summary.accuracy === null ? '—' : Math.round(summary.accuracy * 100) + '%';
  renderFocusSignals(now);

  const list = $('topic-list');
  list.replaceChildren();
  const topics = getTopicSummaries(cards, now);
  if (!topics.length) {
    const empty = document.createElement('p');
    empty.className = 'insight-footnote';
    empty.textContent = copy.emptyTopics;
    list.append(empty);
  }
  for (const topic of topics) {
    const row = document.createElement('div');
    row.className = 'topic-row';
    const header = document.createElement('div');
    header.className = 'topic-row-header';
    const name = document.createElement('span');
    name.textContent = topic.topic;
    const count = document.createElement('span');
    count.textContent = copy.topicDueOfTotal(topic.due, topic.total);
    header.append(name, count);
    const track = document.createElement('div');
    track.className = 'topic-track';
    const fill = document.createElement('div');
    fill.className = 'topic-fill';
    fill.style.width = (topic.total ? topic.due / topic.total * 100 : 0) + '%';
    track.append(fill);
    row.append(header, track);
    list.append(row);
  }
  renderForecastAndMistakes(now);
}

function cardStatusLabel(card, nowMs, copy) {
  if (card.reviews === 0) return copy.deckStatusNew;
  return Date.parse(card.dueAt) <= nowMs ? copy.deckStatusDue : copy.deckStatusScheduled;
}

function renderDeckManager() {
  const copy = t();
  const nowMs = Date.now();
  const topicSelect = $('deck-topic-filter');
  const prevTopic = topicSelect.value;
  const uniqueTopics = [...new Set(cards.map(c => c.topic))].sort((a, b) => a.localeCompare(b));

  const allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = copy.allTopicsOption;
  const opts = [allOpt, ...uniqueTopics.map(topic => {
    const opt = document.createElement('option');
    opt.value = topic;
    opt.textContent = topic;
    return opt;
  })];
  topicSelect.replaceChildren(...opts);
  topicSelect.value = uniqueTopics.includes(prevTopic) ? prevTopic : '';

  const query = ($('deck-search').value || '').trim().toLowerCase();
  const topicFilter = topicSelect.value;
  const filtered = cards.filter(card => {
    if (topicFilter && card.topic !== topicFilter) return false;
    if (!query) return true;
    return (
      card.question.toLowerCase().includes(query) ||
      card.answer.toLowerCase().includes(query) ||
      card.topic.toLowerCase().includes(query)
    );
  });

  $('deck-count-pill').textContent = copy.deckCount(cards.length);
  const container = $('deck-list');
  container.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'insight-subnote';
    empty.textContent = copy.deckNoMatches;
    container.append(empty);
    return;
  }

  for (const card of filtered) {
    const item = document.createElement('div');
    item.className = 'deck-item';
    const main = document.createElement('div');
    main.className = 'deck-item-main';
    const meta = document.createElement('div');
    meta.className = 'deck-item-meta';
    const topicSpan = document.createElement('span');
    topicSpan.textContent = card.topic;
    const statusSpan = document.createElement('span');
    statusSpan.className = 'deck-item-status';
    const clozeTag = parseClozePrompt(card.question).isCloze ? ` · ${copy.clozeBadge}` : '';
    statusSpan.textContent = `${cardStatusLabel(card, nowMs, copy)} · box ${card.box} · ${card.reviews}r${clozeTag}`;
    meta.append(topicSpan, statusSpan);
    const q = document.createElement('div');
    q.className = 'deck-item-q';
    q.textContent = card.question;
    main.append(meta, q);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'deck-delete-btn';
    del.textContent = copy.deckRemoveLabel;
    del.setAttribute('aria-label', `${copy.deckRemoveLabel}: ${card.question}`);
    del.addEventListener('click', () => removeCardById(card.id));

    item.append(main, del);
    container.append(item);
  }
}

function renderSimulator() {
  const copy = t();
  const sim = simulateCohort({
    cardsCount: Number($('sim-cards').value || 30),
    days: Number($('sim-days').value || 30),
    dailyLimit: Number($('sim-limit').value || 20),
    profile: $('sim-profile').value || 'steady',
    seed: 42
  });

  const maxReviews = Math.max(1, ...sim.results.map(r => r.totalReviews));
  const simBox = $('sim-results');
  simBox.replaceChildren();
  for (const row of sim.results) {
    const el = document.createElement('div');
    el.className = 'sim-row';
    const head = document.createElement('div');
    head.className = 'sim-row-head';
    const title = document.createElement('span');
    title.textContent = row.label;
    const total = document.createElement('span');
    total.textContent = `${row.totalReviews} reviews`;
    head.append(title, total);

    const track = document.createElement('div');
    track.className = 'sim-bar-track';
    const bar = document.createElement('div');
    bar.className = 'sim-bar';
    bar.style.width = Math.max(8, Math.round((row.totalReviews / maxReviews) * 100)) + '%';
    track.append(bar);

    const metrics = document.createElement('div');
    metrics.className = 'sim-metrics';
    metrics.textContent = copy.simRecallMetric(
      row.simulatedRecallRate,
      row.maturedCards,
      row.avgDailyReviews,
      row.peakDailyReviews,
      row.finalDueBacklog,
      sim.cardsCount
    );
    el.append(head, track, metrics);
    simBox.append(el);
  }
  $('sim-disclaimer').textContent = sim.disclaimer;

  const cmp = compareStrategies(
    ['good', 'good', { rating: 'again', reason: 'misconception' }, 'good', 'easy'],
    { startAt: '2026-01-01T09:00:00Z' }
  );
  const seqBox = $('seq-results');
  seqBox.replaceChildren();
  for (const row of cmp.strategies) {
    const el = document.createElement('div');
    el.className = 'seq-row';
    const strong = document.createElement('strong');
    strong.textContent = `${row.label} — span ${row.totalSpanDays}d (final box ${row.finalBox})`;
    const seq = document.createElement('span');
    seq.textContent = row.timeline.map(s => `${s.rating}:${s.intervalDays}d`).join(' → ');
    el.append(strong, seq);
    seqBox.append(el);
  }
}

function formatEvidenceSummary(evidence) {
  return Object.entries(evidence ?? {})
    .filter(([, value]) => value != null)
    .map(([key, value]) => {
      const rendered = Array.isArray(value)
        ? value.join(', ')
        : typeof value === 'number' && !Number.isInteger(value)
          ? value.toFixed(2)
          : String(value);
      return `${key}: ${rendered}`;
    })
    .join(' · ');
}

function formatDeltaPp(value) {
  if (value == null) return '—';
  const pp = Math.round(value * 100);
  return `${pp >= 0 ? '+' : ''}${pp}pp`;
}

function sealIntervention(rec) {
  const sealed = recordIntervention(ledger, rec, nextEventDate());
  ledger = sealed.ledger;
  saveLocalState();
  renderIntelligence();
  notify(t().noticeInterventionSealed(rec.targetTopic));
}

function populateTopicSelect(selectEl, topics, fallbackIdx = 0) {
  const prev = selectEl.value;
  const opts = topics.map(topic => {
    const opt = document.createElement('option');
    opt.value = topic;
    opt.textContent = topic;
    return opt;
  });
  selectEl.replaceChildren(...opts);
  if (topics.includes(prev)) {
    selectEl.value = prev;
  } else if (topics.length > fallbackIdx) {
    selectEl.value = topics[fallbackIdx];
  } else {
    selectEl.value = topics[0] ?? '';
  }
}

function runPersonalCalibration() {
  const fit = fitLearnerParameters(ledger, { minSamples: 8 });
  lastCalibration = fit;
  if (fit.fitted) {
    fittedParams = fit.params;
    saveLocalState();
    renderIntelligence();
    notify(t().noticeCalibrated(fit.params.initialStabilityScale, fit.params.stabilityGainScale));
  } else {
    renderIntelligence();
    notify(t().noticeCalInsufficient(fit.sampleCount, fit.minRequired));
  }
}

function addPrerequisiteLink(event) {
  event.preventDefault();
  const child = $('prereq-child-topic').value;
  const parent = $('prereq-parent-topic').value;
  if (!child || !parent) return;
  try {
    const existing = ledger.concepts[child]?.prerequisites ?? [];
    const nextReqs = existing.includes(parent) ? existing : [...existing, parent];
    ledger = linkConceptPrerequisites(
      ledger,
      child,
      nextReqs,
      ledger.concepts[child]?.label ?? child
    );
    saveLocalState();
    renderIntelligence();
    notify(t().noticePrereqLinked(child, parent));
  } catch (error) {
    notify(t().noticePrereqError(error.message));
  }
}

function renderIntelligence() {
  const copy = t();
  const evalAt = new Date(Math.max(Date.now(), lastEventMs));
  const diag = diagnoseLearner(ledger, evalAt);
  const evaluations = evaluateAllInterventions(ledger, evalAt);

  $('intel-cal-events').textContent = String(ledger.events.length);
  $('intel-cal-brier').textContent = diag.calibration.brierScore == null ? '—' : diag.calibration.brierScore.toFixed(3);
  $('intel-cal-r').textContent = diag.calibration.meanPredictedR == null ? '—' : Math.round(diag.calibration.meanPredictedR * 100) + '%';
  $('intel-cal-note').textContent = !lastCalibration
    ? copy.calIdleNote
    : lastCalibration.fitted
      ? copy.calFittedNote(lastCalibration)
      : copy.calInsufficientNote(lastCalibration.sampleCount, lastCalibration.minRequired);

  const diagList = $('intel-diagnosis-list');
  diagList.replaceChildren();
  if (!diag.recommendations.length) {
    const empty = document.createElement('p');
    empty.className = 'insight-subnote';
    empty.textContent = copy.intelNoDiagnoses;
    diagList.append(empty);
  } else {
    for (const rec of diag.recommendations) {
      const box = document.createElement('div');
      box.className = 'focus-item intel-diag-card';
      const head = document.createElement('div');
      head.className = 'intel-diag-head';
      const title = document.createElement('strong');
      title.textContent = rec.headline;
      const badge = document.createElement('span');
      badge.className = 'intel-badge';
      badge.textContent = `${copy.intelSignalNames[rec.signal] ?? rec.signal} · ${rec.confidence}`;
      head.append(title, badge);

      const action = document.createElement('div');
      action.className = 'intel-diag-meta';
      action.textContent = `${rec.recommendedAction} — ${rec.hypothesis}`;

      const evidence = document.createElement('div');
      evidence.className = 'intel-diag-meta';
      evidence.textContent = formatEvidenceSummary(rec.evidence);

      const alreadySealed = ledger.events.some(
        ev => ev.type === 'intervention' && ev.targetTopic === rec.targetTopic && ev.signal === rec.signal
      );
      const sealBtn = document.createElement('button');
      sealBtn.type = 'button';
      sealBtn.className = 'button button-outline intel-seal-btn';
      sealBtn.textContent = alreadySealed ? copy.intelSealedTag : copy.intelSealBtn;
      if (alreadySealed) {
        sealBtn.disabled = true;
      } else {
        sealBtn.addEventListener('click', () => sealIntervention(rec));
      }

      box.append(head, action, evidence, sealBtn);
      diagList.append(box);
    }
  }

  const intvList = $('intel-intervention-list');
  intvList.replaceChildren();
  if (!evaluations.length) {
    const empty = document.createElement('p');
    empty.className = 'insight-subnote';
    empty.textContent = copy.intelNoInterventions;
    intvList.append(empty);
  } else {
    for (const ev of evaluations) {
      const box = document.createElement('div');
      box.className = 'focus-item intel-diag-card';
      const head = document.createElement('div');
      head.className = 'intel-diag-head';
      const title = document.createElement('strong');
      title.textContent = `${ev.targetTopic} · ${copy.intelSignalNames[ev.signal] ?? ev.signal}`;
      const badge = document.createElement('span');
      badge.className = 'intel-badge';
      badge.textContent = copy.intelVerdictNames[ev.verdict] ?? ev.verdict;
      head.append(title, badge);

      const action = document.createElement('div');
      action.className = 'intel-diag-meta';
      action.textContent = ev.action;

      const deltaRow = document.createElement('div');
      deltaRow.className = 'intel-diag-meta';
      const netTxt = ev.deltas.netUpliftVsControl == null ? '' : ` · net vs control ${formatDeltaPp(ev.deltas.netUpliftVsControl)}`;
      deltaRow.textContent =
        `Follow-up ${ev.followUpTargetReviews} rev · Δrecall ${formatDeltaPp(ev.deltas.recallDelta)} · ` +
        `Δmisconception ${formatDeltaPp(ev.deltas.misconceptionDelta)} · Δstability ${ev.deltas.stabilityDeltaDays >= 0 ? '+' : ''}${ev.deltas.stabilityDeltaDays}d${netTxt}`;

      box.append(head, action, deltaRow);
      intvList.append(box);
    }
  }

  const conceptList = $('intel-concept-list');
  conceptList.replaceChildren();
  for (const c of Object.values(diag.concepts)) {
    const row = document.createElement('div');
    row.className = 'seq-row';
    const strong = document.createElement('strong');
    const reqText = c.prerequisites.length ? ` (← ${c.prerequisites.join(', ')})` : '';
    strong.textContent = `${c.label}${reqText} · ${copy.intelTrendNames[c.trend] ?? c.trend}`;
    const span = document.createElement('span');
    const recStr = c.recentRecallRate == null ? '—' : Math.round(c.recentRecallRate * 100) + '%';
    const rStr = c.meanRetrievability == null ? '—' : Math.round(c.meanRetrievability * 100) + '%';
    const sStr = c.meanStabilityDays == null ? '—' : c.meanStabilityDays + 'd';
    span.textContent = `${copy.deckCount(c.cardCount)} · ${c.combinedReviews} rev · recall ${recStr} · R(now) ${rStr} · S ${sStr}`;
    row.append(strong, span);
    conceptList.append(row);
  }

  const conceptTopics = Object.keys(diag.concepts).sort((a, b) => a.localeCompare(b));
  populateTopicSelect($('prereq-child-topic'), conceptTopics, 1);
  populateTopicSelect($('prereq-parent-topic'), conceptTopics, 0);
}

function removeCardById(id) {
  const target = cards.find(c => c.id === id);
  if (!target) return;
  cards = cards.filter(c => c.id !== id);
  const referencedInLedger = ledger.events.some(ev => ev.type === 'review' && ev.cardId === id);
  if (!referencedInLedger && Object.hasOwn(ledger.cards, id)) {
    const nextLedger = structuredClone(ledger);
    delete nextLedger.cards[id];
    ledger = nextLedger;
  }
  saveLocalState();
  rebuildPlan();
  notify(t().noticeCardDeleted(target.topic));
}

function render() {
  progress();
  renderCard();
  renderInsights();
  renderDeckManager();
  renderSimulator();
  renderIntelligence();
}

function revealAnswer() {
  if (!currentItem()) return;
  answerVisible = true;
  renderCard();
  $('rating-again').focus();
}

function rate(rating) {
  const item = currentItem();
  if (!item || !answerVisible) return;
  const index = cards.findIndex(card => card.id === item.id);
  if (index < 0) return;
  const options = {
    strategy: activeStrategyId(),
    reasonAware: isReasonAware()
  };
  if (rating === 'again' && $('mistake-reason').value) {
    options.reason = $('mistake-reason').value;
  }
  const now = nextEventDate();
  const updated = reviewCardWithStrategy(cards[index], rating, now, options);
  cards[index] = updated;
  const ledgerOpts = {};
  if (options.reason) ledgerOpts.reason = options.reason;
  if (fittedParams) ledgerOpts.params = fittedParams;
  ledger = recordLedgerReview(ledger, updated.id, rating, now, ledgerOpts).ledger;
  ratedCount++;
  position++;
  answerVisible = false;
  $('mistake-reason').value = '';
  $('self-answer-input').value = '';
  saveLocalState();
  render();
  notify(t().noticeSaved(rating, new Date(updated.dueAt).toLocaleString()));
  focusAfterAdvance();
}

/** Move on without recording a review. The card remains due. */
function skipCurrentCard() {
  const item = currentItem();
  if (!item) return;
  skippedCount++;
  position++;
  answerVisible = false;
  $('mistake-reason').value = '';
  $('self-answer-input').value = '';
  render();
  notify(t().noticeSkip(item.topic));
  focusAfterAdvance();
}

function focusAfterAdvance() {
  if (currentItem()) {
    $('question-text').focus();
  } else {
    $('finish-heading').focus();
  }
}

function nextCustomId() {
  const existing = new Set(cards.map(card => card.id));
  while (existing.has('custom-' + String(customCounter).padStart(3, '0'))) {
    customCounter++;
  }
  return 'custom-' + String(customCounter++).padStart(3, '0');
}

function addCustomCard(event) {
  event.preventDefault();
  try {
    const newCard = createCard({
      id: nextCustomId(),
      topic: $('card-topic').value,
      question: $('card-question').value,
      answer: $('card-answer').value
    });
    cards = [...cards, newCard];
    ledger = upsertLedgerCard(ledger, newCard, { at: nextEventDate() });
    $('card-topic').value = '';
    $('card-question').value = '';
    $('card-answer').value = '';
    saveLocalState();
    rebuildPlan();
    notify(t().noticeCardAdded(newCard.topic));
  } catch (error) {
    notify(t().noticeCardError(error.message));
  }
}

function appendBulkNotes() {
  try {
    const raw = $('bulk-input').value;
    let parsed;
    if (raw.includes('\t')) {
      parsed = importStudyTsv(raw, { idPrefix: 'paste-' + customCounter });
    } else if (/^\s*(?:id,|topic,)/i.test(raw)) {
      parsed = importStudyCsv(raw, { idPrefix: 'paste-' + customCounter });
    } else {
      parsed = importStudyMarkdown(raw, { idPrefix: 'paste-' + customCounter });
    }
    const existing = new Set(cards.map(card => card.id));
    const unique = parsed.map(card => {
      if (!existing.has(card.id)) {
        existing.add(card.id);
        return card;
      }
      const freshId = nextCustomId();
      existing.add(freshId);
      return { ...card, id: freshId };
    });
    customCounter += unique.length;
    cards = [...cards, ...unique];
    const bulkAt = nextEventDate();
    for (const added of unique) {
      ledger = upsertLedgerCard(ledger, added, { at: bulkAt });
    }
    $('bulk-input').value = '';
    saveLocalState();
    rebuildPlan();
    notify(t().noticeBulkAdded(unique.length));
  } catch (error) {
    notify(t().noticeBulkError(error.message));
  }
}

function loadSamplePack(packId) {
  const at = nextEventDate();
  cards = buildSamplePack(packId, at);
  ledger = buildLedgerForDeck(cards, at);
  fittedParams = null;
  lastCalibration = null;
  saveLocalState();
  rebuildPlan();
  notify(t().noticePackLoaded(packId, cards.length));
}

function downloadText(filename, content, mimeType) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function exportCardsJson() {
  try {
    downloadText('fark-study-deck.json', exportStudyDeck(cards), 'application/json');
    notify(t().noticeExportJson);
  } catch (error) {
    notify(t().noticeExportFail(error.message));
  }
}

function exportCardsCsv() {
  try {
    downloadText('fark-study-deck.csv', exportStudyCsv(cards, { escapeFormulas: true }), 'text/csv;charset=utf-8');
    notify(t().noticeExportCsv);
  } catch (error) {
    notify(t().noticeExportFail(error.message));
  }
}

function exportCardsTsv() {
  try {
    downloadText('fark-study-deck.tsv', exportStudyTsv(cards), 'text/tab-separated-values;charset=utf-8');
    notify(t().noticeExportTsv);
  } catch (error) {
    notify(t().noticeExportFail(error.message));
  }
}

function exportCardsMarkdown() {
  try {
    downloadText('fark-study-sheet.md', exportStudyMarkdown(cards, { includeStats: true }), 'text/markdown;charset=utf-8');
    notify(t().noticeExportMd);
  } catch (error) {
    notify(t().noticeExportFail(error.message));
  }
}

function exportLedgerJson() {
  try {
    downloadText('fark-learning-ledger.json', exportLedger(ledger), 'application/json');
    notify(t().noticeExportLedger);
  } catch (error) {
    notify(t().noticeExportFail(error.message));
  }
}

async function importCards(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 4_000_000) {
    notify(t().noticeFileTooLarge);
    return;
  }
  try {
    const text = await file.text();
    const name = (file.name || '').toLowerCase();
    const type = file.type || '';
    const isCsv = name.endsWith('.csv') || type.includes('csv');
    const isTsv = name.endsWith('.tsv') || name.endsWith('.txt') || type.includes('tab-separated');
    const isMd = name.endsWith('.md') || name.endsWith('.markdown') || type.includes('markdown');
    let restored;
    let label;
    if (isCsv) {
      restored = importStudyCsv(text);
      ledger = buildLedgerForDeck(restored, nextEventDate());
      label = 'CSV';
    } else if (isTsv) {
      restored = importStudyTsv(text);
      ledger = buildLedgerForDeck(restored, nextEventDate());
      label = 'TSV';
    } else if (isMd) {
      restored = importStudyMarkdown(text);
      ledger = buildLedgerForDeck(restored, nextEventDate());
      label = 'Markdown';
    } else {
      let maybeJson;
      try {
        maybeJson = JSON.parse(text);
      } catch {
        maybeJson = null;
      }
      if (maybeJson?.format === 'fark-study-ledger') {
        ledger = importLedger(text);
        restored = projectCardsFromLedger(ledger, nextEventDate());
        label = 'Learning Ledger';
      } else {
        restored = importStudyDeck(text);
        ledger = buildLedgerForDeck(restored, nextEventDate());
        label = 'JSON';
      }
    }
    fittedParams = null;
    lastCalibration = null;
    cards = restored;
    saveLocalState();
    rebuildPlan();
    notify(t().noticeImported(cards.length, label));
  } catch (error) {
    notify(t().noticeImportFail(error.message));
  }
}

function handleKeyboardShortcut(event) {
  if (activeTab !== 'study') return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const tag = event.target?.tagName?.toUpperCase?.() || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const item = currentItem();
  if (!item) return;

  if (event.key === ' ' && !answerVisible && tag !== 'BUTTON') {
    event.preventDefault();
    revealAnswer();
    return;
  }
  if ((event.key === 's' || event.key === 'S') && tag !== 'BUTTON') {
    event.preventDefault();
    skipCurrentCard();
    return;
  }
  if (answerVisible) {
    const map = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };
    if (Object.hasOwn(map, event.key)) {
      event.preventDefault();
      rate(map[event.key]);
    }
  }
}

$('tab-study').addEventListener('click', () => switchTab('study'));
$('tab-simulator').addEventListener('click', () => switchTab('simulator'));
$('tab-decks').addEventListener('click', () => switchTab('decks'));
$('tab-intelligence').addEventListener('click', () => switchTab('intelligence'));
$('lang-toggle').addEventListener('click', () => {
  lang = lang === 'en' ? 'tr' : 'en';
  saveLocalState();
  applyLanguage();
  render();
});
$('strategy-select').addEventListener('change', () => {
  updateStrategyNote();
  saveLocalState();
  notify(t().noticeStrategyChanged(t().strategyNames[activeStrategyId()] ?? activeStrategyId()));
});
$('reverse-toggle').addEventListener('change', () => renderCard());
$('reason-aware-toggle').addEventListener('change', () => {
  rebuildPlan();
  notify(t().noticePlanRebuilt);
});
$('settings-form').addEventListener('submit', event => {
  event.preventDefault();
  rebuildPlan();
  notify(t().noticePlanRebuilt);
});
$('run-sim-btn').addEventListener('click', renderSimulator);
$('sim-cards').addEventListener('change', renderSimulator);
$('sim-days').addEventListener('change', renderSimulator);
$('sim-limit').addEventListener('change', renderSimulator);
$('sim-profile').addEventListener('change', renderSimulator);
document.querySelectorAll('[data-pack]').forEach(btn =>
  btn.addEventListener('click', () => loadSamplePack(btn.dataset.pack))
);
$('add-card-form').addEventListener('submit', addCustomCard);
$('bulk-import-btn').addEventListener('click', appendBulkNotes);
$('deck-search').addEventListener('input', renderDeckManager);
$('deck-topic-filter').addEventListener('change', renderDeckManager);
$('reveal-button').addEventListener('click', revealAnswer);
$('skip-button').addEventListener('click', skipCurrentCard);
$('skip-after-reveal').addEventListener('click', skipCurrentCard);
document.querySelectorAll('[data-rating]').forEach(button =>
  button.addEventListener('click', () => rate(button.dataset.rating))
);
$('next-plan-button').addEventListener('click', rebuildPlan);
$('calibrate-button').addEventListener('click', runPersonalCalibration);
$('prereq-form').addEventListener('submit', addPrerequisiteLink);
$('persist-local-toggle').addEventListener('change', () => {
  persistEnabled = Boolean($('persist-local-toggle').checked);
  if (persistEnabled) {
    saveLocalState();
    notify(t().noticePersistOn);
  } else {
    clearLocalState();
    notify(t().noticePersistOff);
  }
});
$('reset-button').addEventListener('click', () => {
  const at = nextEventDate();
  cards = buildSamplePack('starter', at);
  ledger = buildLedgerForDeck(cards, at);
  fittedParams = null;
  lastCalibration = null;
  saveLocalState();
  rebuildPlan();
  notify(t().noticeReset);
});
$('export-button').addEventListener('click', exportCardsJson);
$('export-csv-button').addEventListener('click', exportCardsCsv);
$('export-tsv-button').addEventListener('click', exportCardsTsv);
$('export-md-button').addEventListener('click', exportCardsMarkdown);
$('export-ledger-button').addEventListener('click', exportLedgerJson);
$('import-trigger').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', importCards);
document.addEventListener?.('keydown', handleKeyboardShortcut);

restoreLocalStateIfEnabled();
applyLanguage();
rebuildPlan();
