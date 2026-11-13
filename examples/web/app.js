import {
  createCard,
  reviewCard,
  getStudySummary,
  getTopicSummaries,
  getMistakeBreakdown,
  getReviewForecast
} from '../../src/index.js';
import { planStudySession } from '../../src/planner.js';
import { exportStudyDeck, importStudyDeck } from '../../src/portable.js';
import { exportStudyCsv, importStudyCsv } from '../../src/csv.js';
import { exportStudyMarkdown, importStudyMarkdown } from '../../src/markdown.js';
import { getReviewStrategy, reviewCardWithStrategy } from '../../src/strategies.js';

const $ = id => document.getElementById(id);

const I18N = {
  en: {
    privacyText: 'Local-only demo',
    eyebrowText: 'INTERACTIVE LAB',
    pageTitleHtml: 'A clearer way<br>to <em>keep learning.</em>',
    introLead: 'See how the FARK engine turns review history into a balanced study session. Compare transparent spacing strategies, add cards or paste Markdown notes, and export cleanly—no account, no AI guesswork, no cloud.',
    overlineWorkspace: 'YOUR STUDY WORKSPACE',
    kickerActive: 'ACTIVE LEARNING',
    sessionHeading: "Today's session",
    labelQuestions: 'Questions',
    labelPerTopic: 'Per topic',
    labelNewCards: 'New cards',
    labelStrategy: 'Strategy',
    replanBtn: 'Rebuild plan ↻',
    labelScratchpad: 'Recall scratchpad',
    scratchpadHint: '(optional · never auto-graded)',
    scratchpadPlaceholder: 'Type what you remember before revealing...',
    sampleAnswerLabel: 'SAMPLE ANSWER',
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
    kickerAuthor: 'CUSTOM STUDY DECK',
    addCardHeading: 'Add your own card',
    addCardBlurb: 'Create original study cards in memory or bulk-paste Markdown notes (## Topic, - Q :: A) to test scheduling and portability.',
    labelCardTopic: 'Topic',
    labelCardQuestion: 'Question',
    labelCardAnswer: 'Answer',
    addCardSubmit: 'Add card to deck +',
    bulkPasteSummary: 'Bulk paste Markdown Q :: A notes',
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
    topicHeadingTitle: 'Topic overview',
    topicHeadingSub: 'Due / total cards',
    forecastHeadingTitle: '7-day scheduled load',
    forecastHeadingSub: 'Upcoming due dates',
    mistakesHeadingTitle: 'Self-reported lapses',
    mistakesHeadingSub: 'Never auto-guessed',
    insightFootnote: 'These counts are not a measure of true mastery.',
    kickerData: 'YOUR DATA, YOUR CHOICE',
    dataHeading: 'Take it with you.',
    dataBlurb: 'Download full review history as JSON, share spreadsheet-safe CSV, export printable Markdown, or import a file. Nothing leaves this tab.',
    exportJsonBtn: 'Export JSON ↗',
    exportCsvBtn: 'Export CSV ↗',
    exportMdBtn: 'Export MD ↗',
    importBtn: 'Import File ↑',
    resetBtn: '↻ Reset sample data',
    overlineHow: 'HOW IT WORKS',
    p1Title: 'Review what matters.',
    p1Body: 'Cards become eligible when their review time arrives. Previous mistakes influence their priority.',
    p2Title: 'Make room for variety.',
    p2Body: 'Topic limits and round-robin selection help prevent one subject from taking over.',
    p3Title: 'Stay honest about learning.',
    p3Body: 'FARK reports what the data can support—and keeps unknowns unknown.',
    strategyNames: {
      balanced: 'Balanced',
      gentle: 'Gentle',
      intensive: 'Intensive'
    },
    strategyNote: def =>
      `${def.label}: again ${def.againMinutes}m · hard ${def.hardHours}h · good boxes ${def.intervalsDays.slice(1).map(d => d + 'd').join(' / ')} (transparent preset, not cognitive truth).`,
    reasons: {
      'new-card': 'New card',
      'scheduled-review': 'Scheduled review',
      overdue: 'Review overdue',
      'previous-mistakes': 'Previous mistakes'
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
    deckCount: n => `${n} ${n === 1 ? 'card' : 'cards'}`,
    deckStatusNew: 'New',
    deckStatusDue: 'Due now',
    deckStatusScheduled: 'Scheduled',
    deckRemoveLabel: 'Delete',
    deckNoMatches: 'No cards match the current filter.',
    sessionDesc: (total, deferred, skipped) =>
      total
        ? `${total} selected · ${deferred} not selected${skipped ? ` · ${skipped} skipped (still due)` : ''}`
        : 'No eligible cards fit these limits.',
    finishAllCaughtUp: 'All caught up.',
    finishDone: 'Session finished.',
    finishNone: 'No cards selected.',
    finishDescCaughtUp: 'No reviews are due right now. You can add cards, import a deck, or reset the example.',
    finishDescDone: (rated, skipped, deferred) =>
      `${rated} rated · ${skipped} skipped. Skipped cards remain due. ${deferred} other card(s) were not selected. Review history stays in this browser tab only.`,
    finishDescNone: 'Your current limits excluded all due cards. Increase the limits and rebuild your plan.',
    emptyTopics: 'No cards in this deck. Add a card, import a deck, or reset the example.',
    topicDueOfTotal: (due, total) => `${due} due / ${total} cards`,
    forecastSummary: f => `${f.dueNow} due now · ${f.unreviewed} unreviewed · ${f.later} beyond 7 days`,
    dayLabel: d => `D+${d}`,
    noLapsesYet: 'No lapses recorded yet.',
    noticeSkip: topic => `Skipped ${topic} card. No review was recorded; it stays due.`,
    noticeSaved: (rating, dueStr) => `Saved: ${rating} · next review ${dueStr}`,
    noticePlanRebuilt: 'Study plan rebuilt using current review history.',
    noticeStrategyChanged: label => `Spacing strategy switched to ${label}.`,
    noticeReset: 'Sample data reset. Your previous in-memory changes were cleared.',
    noticeCardAdded: topic => `Added new ${topic} card to the deck and rebuilt plan.`,
    noticeCardError: msg => `Could not add card: ${msg}`,
    noticeBulkAdded: count => `Appended ${count} card(s) from pasted notes and rebuilt plan.`,
    noticeBulkError: msg => `Could not parse pasted notes: ${msg}`,
    noticeCardDeleted: topic => `Removed card from ${topic} and rebuilt plan.`,
    noticeExportJson: 'Deck exported as plain-text JSON. Keep it private.',
    noticeExportCsv: 'Deck content exported as RFC 4180 CSV (formula-safe).',
    noticeExportMd: 'Deck exported as a Markdown study sheet.',
    noticeExportFail: msg => `Export failed: ${msg}`,
    noticeFileTooLarge: 'File too large. Choose a smaller deck.',
    noticeImported: (count, fmt) => `Imported ${count} card(s) from ${fmt} locally. Nothing was uploaded.`,
    noticeImportFail: msg => `Import failed: ${msg}`
  },
  tr: {
    privacyText: 'Yalnızca yerel demo',
    eyebrowText: 'İNTERAKTİF LABORATUVAR',
    pageTitleHtml: 'Öğrenmeyi sürdürmenin<br><em>daha net</em> yolu.',
    introLead: 'FARK motorunun tekrar geçmişini nasıl dengeli bir çalışma oturumuna dönüştürdüğünü görün. Şeffaf aralık stratejilerini karşılaştırın, kart ekleyin veya Markdown notları yapıştırın—hesap veya bulut yok.',
    overlineWorkspace: 'ÇALIŞMA ALANINIZ',
    kickerActive: 'AKTİF ÇALIŞMA',
    sessionHeading: 'Bugünkü oturum',
    labelQuestions: 'Soru sayısı',
    labelPerTopic: 'Konu başı',
    labelNewCards: 'Yeni kart',
    labelStrategy: 'Strateji',
    replanBtn: 'Planı yenile ↻',
    labelScratchpad: 'Hatırlama notu',
    scratchpadHint: '(isteğe bağlı · otomatik puanlanmaz)',
    scratchpadPlaceholder: 'Yanıtı görmeden önce hatırladığını kısaca yaz...',
    sampleAnswerLabel: 'ÖRNEK YANIT',
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
    kickerAuthor: 'KİŞİSEL KART DESTESİ',
    addCardHeading: 'Kendi kartını ekle',
    addCardBlurb: 'Zamanlamayı ve dışa aktarmayı denemek için belleğe yeni kart ekle ya da toplu Markdown (## Konu, - Soru :: Yanıt) yapıştır.',
    labelCardTopic: 'Konu',
    labelCardQuestion: 'Soru',
    labelCardAnswer: 'Yanıt',
    addCardSubmit: 'Desteye kart ekle +',
    bulkPasteSummary: 'Toplu Markdown Q :: A notu yapıştır',
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
    topicHeadingTitle: 'Konu dağılımı',
    topicHeadingSub: 'Bekleyen / toplam',
    forecastHeadingTitle: '7 günlük tekrar yükü',
    forecastHeadingSub: 'Planlı tarihler',
    mistakesHeadingTitle: 'Hata nedenleri',
    mistakesHeadingSub: 'Otomatik tahmin edilmez',
    insightFootnote: 'Bu sayılar kesin bilgi düzeyini veya ustalığı ölçmez.',
    kickerData: 'VERİN SENİN KONTROLÜNDE',
    dataHeading: 'Dışa veya içe aktar.',
    dataBlurb: 'Tam tekrar geçmişini JSON, formül korumalı CSV veya yazdırılabilir Markdown olarak indir ya da dosya yükle. Veriler bu sekmeden çıkmaz.',
    exportJsonBtn: 'JSON İndir ↗',
    exportCsvBtn: 'CSV İndir ↗',
    exportMdBtn: 'MD İndir ↗',
    importBtn: 'Dosya Yükle ↑',
    resetBtn: '↻ Örnek veriyi sıfırla',
    overlineHow: 'NASIL ÇALIŞIR?',
    p1Title: 'Önemli olanı tekrar et.',
    p1Body: 'Tekrar zamanı gelen kartlar sıraya girer; önceki hatalar önceliği etkiler.',
    p2Title: 'Konuları dengede tut.',
    p2Body: 'Konu başı sınırlar ve sıralı seçim tek bir konunun oturumu kaplamasını önler.',
    p3Title: 'Ölçümde dürüst kal.',
    p3Body: 'FARK yalnızca verinin desteklediğini raporlar; bilinmeyeni bilinmiyor bırakır.',
    strategyNames: {
      balanced: 'Dengeli',
      gentle: 'Yumuşak',
      intensive: 'Yoğun'
    },
    strategyNote: def =>
      `${def.label}: tekrar ${def.againMinutes}dk · zor ${def.hardHours}sa · kutular ${def.intervalsDays.slice(1).map(d => d + 'g').join(' / ')} (şeffaf ön ayar, kesin bellek kuralı değil).`,
    reasons: {
      'new-card': 'Yeni kart',
      'scheduled-review': 'Planlı tekrar',
      overdue: 'Günü geçmiş',
      'previous-mistakes': 'Önceki hata'
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
    deckCount: n => `${n} kart`,
    deckStatusNew: 'Yeni',
    deckStatusDue: 'Şimdi',
    deckStatusScheduled: 'Planlı',
    deckRemoveLabel: 'Sil',
    deckNoMatches: 'Filtreyle eşleşen kart yok.',
    sessionDesc: (total, deferred, skipped) =>
      total
        ? `${total} seçildi · ${deferred} ertelendi${skipped ? ` · ${skipped} atlandı (hâlâ bekliyor)` : ''}`
        : 'Bu sınırlarla eşleşen kart yok.',
    finishAllCaughtUp: 'Hepsi tamam.',
    finishDone: 'Oturum bitti.',
    finishNone: 'Kart seçilmedi.',
    finishDescCaughtUp: 'Şu an tekrar zamanı gelmiş kart yok. Yeni kart ekleyebilir, dosya yükleyebilir veya örneği sıfırlayabilirsin.',
    finishDescDone: (rated, skipped, deferred) =>
      `${rated} puanlandı · ${skipped} atlandı (beklemede kalır). ${deferred} diğer kart seçilmedi. Geçmiş yalnızca bu sekmede tutulur.`,
    finishDescNone: 'Mevcut sınırlar tüm bekleyen kartları dışladı. Sınırları artırıp planı yenileyin.',
    emptyTopics: 'Destede kart yok. Kart ekle, dosya yükle veya örneği sıfırla.',
    topicDueOfTotal: (due, total) => `${due} bekliyor / ${total} kart`,
    forecastSummary: f => `${f.dueNow} şimdi bekliyor · ${f.unreviewed} hiç çalışılmadı · ${f.later} kart 7+ gün sonra`,
    dayLabel: d => `+${d}G`,
    noLapsesYet: 'Henüz kaydedilmiş hata yok.',
    noticeSkip: topic => `${topic} kartı atlandı. Tekrar kaydedilmedi; sırada kalır.`,
    noticeSaved: (rating, dueStr) => `Kaydedildi: ${rating} · sonraki tekrar ${dueStr}`,
    noticePlanRebuilt: 'Çalışma planı güncel tekrar geçmişine göre yenilendi.',
    noticeStrategyChanged: label => `Aralık stratejisi değişti: ${label}.`,
    noticeReset: 'Örnek veriler sıfırlandı. Bellekteki değişiklikler temizlendi.',
    noticeCardAdded: topic => `${topic} konusuna yeni kart eklendi ve plan güncellendi.`,
    noticeCardError: msg => `Kart eklenemedi: ${msg}`,
    noticeBulkAdded: count => `Yapıştırılan notlardan ${count} kart eklendi ve plan güncellendi.`,
    noticeBulkError: msg => `Notlar ayrıştırılamadı: ${msg}`,
    noticeCardDeleted: topic => `${topic} konusundan bir kart silindi ve plan güncellendi.`,
    noticeExportJson: 'Deste düz metin JSON olarak indirildi. Gizli tutun.',
    noticeExportCsv: 'Kart içerikleri RFC 4180 CSV olarak indirildi (formül korumalı).',
    noticeExportMd: 'Deste Markdown çalışma sayfası olarak indirildi.',
    noticeExportFail: msg => `Dışa aktarma başarısız: ${msg}`,
    noticeFileTooLarge: 'Dosya çok büyük. Daha küçük bir deste seçin.',
    noticeImported: (count, fmt) => `${fmt} dosyasından ${count} kart yerel olarak içe aktarıldı. Sunucuya yükleme yapılmadı.`,
    noticeImportFail: msg => `İçe aktarma başarısız: ${msg}`
  }
};

let lang = 'en';
let cards = buildSampleCards();
let plan = null;
let position = 0;
let ratedCount = 0;
let skippedCount = 0;
let answerVisible = false;
let customCounter = 1;
let messageTimer;

const t = () => I18N[lang];
const activeStrategyId = () => $('strategy-select').value || 'balanced';

function hoursAgo(hours, from) {
  return new Date(from.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function buildSampleCards() {
  const now = new Date();
  const make = (id, topic, question, answer) => createCard({ id, topic, question, answer });
  return [
    reviewCard(make('math-01', 'Mathematics', 'What is 18% of 250?', '45'), 'again', hoursAgo(36, now), { reason: 'knowledge-gap' }),
    reviewCard(make('math-02', 'Mathematics', 'Solve 3x − 7 = 11.', 'x = 6'), 'good', hoursAgo(72, now)),
    make('math-03', 'Mathematics', 'What is 7 squared?', '49'),
    reviewCard(make('science-01', 'Science', 'What gas do plants absorb during photosynthesis?', 'Carbon dioxide'), 'again', hoursAgo(42, now), { reason: 'misconception' }),
    reviewCard(make('science-02', 'Science', 'At sea level, what is the approximate boiling point of water?', '100 °C (212 °F)'), 'easy', hoursAgo(120, now)),
    make('language-01', 'Language', 'Give a synonym for “brief”.', 'Short or concise'),
    reviewCard(make('geography-01', 'Geography', 'Which ocean is the largest on Earth?', 'The Pacific Ocean'), 'hard', hoursAgo(30, now)),
    reviewCard(make('history-01', 'History', 'Which century did the year 1492 belong to?', 'The 15th century'), 'good', hoursAgo(1, now)),
    make('history-02', 'History', 'In which continent is ancient Carthage located?', 'Africa')
  ];
}

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

function applyLanguage() {
  const copy = t();
  document.documentElement?.setAttribute('lang', lang);
  $('lang-toggle').textContent = lang === 'en' ? 'TR' : 'EN';
  $('privacy-text').textContent = copy.privacyText;
  $('eyebrow-text').textContent = copy.eyebrowText;
  if ($('page-title').innerHTML !== undefined) $('page-title').innerHTML = copy.pageTitleHtml;
  $('intro-lead').textContent = copy.introLead;
  $('overline-workspace').textContent = copy.overlineWorkspace;
  $('kicker-active').textContent = copy.kickerActive;
  $('session-heading').textContent = copy.sessionHeading;
  $('label-questions').textContent = copy.labelQuestions;
  $('label-per-topic').textContent = copy.labelPerTopic;
  $('label-new-cards').textContent = copy.labelNewCards;
  $('label-strategy').textContent = copy.labelStrategy;
  $('replan-button').textContent = copy.replanBtn;
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
  $('export-md-button').textContent = copy.exportMdBtn;
  $('import-trigger').textContent = copy.importBtn;
  $('reset-button').textContent = copy.resetBtn;
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
  updateStrategyNote();
}

function planOptions() {
  return {
    limit: Number($('session-limit').value),
    maxPerTopic: Number($('topic-limit').value),
    maxNewCards: Number($('new-limit').value)
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

  const card = cards.find(c => c.id === item.id);
  $('question-topic').textContent = item.topic;
  $('question-kind').textContent = item.status === 'new' ? copy.newCardBadge : copy.dueReviewBadge;
  $('question-text').textContent = card.question;
  $('answer-text').textContent = card.answer;
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
    statusSpan.textContent = `${cardStatusLabel(card, nowMs, copy)} · box ${card.box} · ${card.reviews}r`;
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

function removeCardById(id) {
  const target = cards.find(c => c.id === id);
  if (!target) return;
  cards = cards.filter(c => c.id !== id);
  rebuildPlan();
  notify(t().noticeCardDeleted(target.topic));
}

function render() {
  progress();
  renderCard();
  renderInsights();
  renderDeckManager();
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
  const options = { strategy: activeStrategyId() };
  if (rating === 'again' && $('mistake-reason').value) {
    options.reason = $('mistake-reason').value;
  }
  const updated = reviewCardWithStrategy(cards[index], rating, new Date(), options);
  cards[index] = updated;
  ratedCount++;
  position++;
  answerVisible = false;
  $('mistake-reason').value = '';
  $('self-answer-input').value = '';
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
    $('card-topic').value = '';
    $('card-question').value = '';
    $('card-answer').value = '';
    rebuildPlan();
    notify(t().noticeCardAdded(newCard.topic));
  } catch (error) {
    notify(t().noticeCardError(error.message));
  }
}

function appendBulkNotes() {
  try {
    const raw = $('bulk-input').value;
    const parsed = importStudyMarkdown(raw, { idPrefix: 'paste-' + customCounter });
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
    $('bulk-input').value = '';
    rebuildPlan();
    notify(t().noticeBulkAdded(unique.length));
  } catch (error) {
    notify(t().noticeBulkError(error.message));
  }
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

function exportCardsMarkdown() {
  try {
    downloadText('fark-study-sheet.md', exportStudyMarkdown(cards, { includeStats: true }), 'text/markdown;charset=utf-8');
    notify(t().noticeExportMd);
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
    const isMd = name.endsWith('.md') || name.endsWith('.markdown') || type.includes('markdown');
    let restored;
    let label;
    if (isCsv) {
      restored = importStudyCsv(text);
      label = 'CSV';
    } else if (isMd) {
      restored = importStudyMarkdown(text);
      label = 'Markdown';
    } else {
      restored = importStudyDeck(text);
      label = 'JSON';
    }
    cards = restored;
    rebuildPlan();
    notify(t().noticeImported(cards.length, label));
  } catch (error) {
    notify(t().noticeImportFail(error.message));
  }
}

function handleKeyboardShortcut(event) {
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

$('lang-toggle').addEventListener('click', () => {
  lang = lang === 'en' ? 'tr' : 'en';
  applyLanguage();
  render();
});
$('strategy-select').addEventListener('change', () => {
  updateStrategyNote();
  notify(t().noticeStrategyChanged(t().strategyNames[activeStrategyId()] ?? activeStrategyId()));
});
$('settings-form').addEventListener('submit', event => {
  event.preventDefault();
  rebuildPlan();
  notify(t().noticePlanRebuilt);
});
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
$('reset-button').addEventListener('click', () => {
  cards = buildSampleCards();
  rebuildPlan();
  notify(t().noticeReset);
});
$('export-button').addEventListener('click', exportCardsJson);
$('export-csv-button').addEventListener('click', exportCardsCsv);
$('export-md-button').addEventListener('click', exportCardsMarkdown);
$('import-trigger').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', importCards);
document.addEventListener?.('keydown', handleKeyboardShortcut);

applyLanguage();
rebuildPlan();
