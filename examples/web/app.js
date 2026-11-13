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

const $ = id => document.getElementById(id);

const I18N = {
  en: {
    privacyText: 'Local-only demo',
    eyebrowText: 'INTERACTIVE LAB',
    pageTitleHtml: 'A clearer way<br>to <em>keep learning.</em>',
    introLead: 'See how the FARK engine turns review history into a balanced study session. Add your own cards, test CSV/JSON portability, and inspect scheduled load—no account, no AI guesswork, no cloud.',
    overlineWorkspace: 'YOUR STUDY WORKSPACE',
    kickerActive: 'ACTIVE LEARNING',
    sessionHeading: "Today's session",
    labelQuestions: 'Questions',
    labelPerTopic: 'Per topic',
    labelNewCards: 'New cards',
    replanBtn: 'Rebuild plan ↻',
    sampleAnswerLabel: 'SAMPLE ANSWER',
    revealBtn: 'Reveal answer ↗',
    skipBtn: 'Skip for now ↷',
    revealHint: 'Think of your answer before revealing it.',
    mistakeLabelText: 'If you missed it, what was the reason?',
    mistakeOptional: '(optional)',
    ratingTitle: 'HOW WELL DID YOU RECALL IT?',
    feedbackNote: 'Your rating is self-reported, not independently graded.',
    skipInline: 'Skip this card without rating it ↷',
    nextPlanBtn: 'Plan another session ↗',
    kickerAuthor: 'CUSTOM STUDY DECK',
    addCardHeading: 'Add your own card',
    addCardBlurb: 'Create original study cards in memory to test scheduling, CSV export, and round-robin balancing.',
    labelCardTopic: 'Topic',
    labelCardQuestion: 'Question',
    labelCardAnswer: 'Answer',
    addCardSubmit: 'Add card to deck +',
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
    dataBlurb: 'Download full review history as JSON, share deck content as RFC 4180 CSV, or import a file. Nothing leaves this tab.',
    exportJsonBtn: 'Export JSON ↗',
    exportCsvBtn: 'Export CSV ↗',
    importBtn: 'Import JSON / CSV ↑',
    resetBtn: '↻ Reset sample data',
    overlineHow: 'HOW IT WORKS',
    p1Title: 'Review what matters.',
    p1Body: 'Cards become eligible when their review time arrives. Previous mistakes influence their priority.',
    p2Title: 'Make room for variety.',
    p2Body: 'Topic limits and round-robin selection help prevent one subject from taking over.',
    p3Title: 'Stay honest about learning.',
    p3Body: 'FARK reports what the data can support—and keeps unknowns unknown.',
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
    noticeReset: 'Sample data reset. Your previous in-memory changes were cleared.',
    noticeCardAdded: topic => `Added new ${topic} card to the deck and rebuilt plan.`,
    noticeCardError: msg => `Could not add card: ${msg}`,
    noticeExportJson: 'Deck exported as plain-text JSON. Keep it private.',
    noticeExportCsv: 'Deck content exported as RFC 4180 CSV (formula-safe).',
    noticeExportFail: msg => `Export failed: ${msg}`,
    noticeFileTooLarge: 'File too large. Choose a smaller deck.',
    noticeImported: (count, fmt) => `Imported ${count} card(s) from ${fmt} locally. Nothing was uploaded.`,
    noticeImportFail: msg => `Import failed: ${msg}`
  },
  tr: {
    privacyText: 'Yalnızca yerel demo',
    eyebrowText: 'İNTERAKTİF LABORATUVAR',
    pageTitleHtml: 'Öğrenmeyi sürdürmenin<br><em>daha net</em> yolu.',
    introLead: 'FARK motorunun tekrar geçmişini nasıl dengeli bir çalışma oturumuna dönüştürdüğünü görün. Kendi kartınızı ekleyin, CSV/JSON taşıyın ve 7 günlük yükü inceleyin—hesap veya bulut yok.',
    overlineWorkspace: 'ÇALIŞMA ALANINIZ',
    kickerActive: 'AKTİF ÇALIŞMA',
    sessionHeading: 'Bugünkü oturum',
    labelQuestions: 'Soru sayısı',
    labelPerTopic: 'Konu başı',
    labelNewCards: 'Yeni kart',
    replanBtn: 'Planı yenile ↻',
    sampleAnswerLabel: 'ÖRNEK YANIT',
    revealBtn: 'Yanıtı göster ↗',
    skipBtn: 'Şimdilik atla ↷',
    revealHint: 'Göstermeden önce kendi yanıtını düşün.',
    mistakeLabelText: 'Yanıldıysan nedeni neydi?',
    mistakeOptional: '(isteğe bağlı)',
    ratingTitle: 'NE KADAR İYİ HATIRLADIN?',
    feedbackNote: 'Puanlama öz-bildirime dayanır; sistem yanıtı otomatik notlandırmaz.',
    skipInline: 'Bu kartı puanlamadan atla ↷',
    nextPlanBtn: 'Yeni oturum planla ↗',
    kickerAuthor: 'KİŞİSEL KART DESTESİ',
    addCardHeading: 'Kendi kartını ekle',
    addCardBlurb: 'Tekrar zamanlamasını, CSV dışa aktarmayı ve konu dengesini denemek için belleğe yeni kartlar ekle.',
    labelCardTopic: 'Konu',
    labelCardQuestion: 'Soru',
    labelCardAnswer: 'Yanıt',
    addCardSubmit: 'Desteye kart ekle +',
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
    dataBlurb: 'Tam tekrar geçmişini JSON, kart içeriklerini RFC 4180 CSV olarak indir veya dosya yükle. Veriler bu sekmeden dışarı çıkmaz.',
    exportJsonBtn: 'JSON İndir ↗',
    exportCsvBtn: 'CSV İndir ↗',
    importBtn: 'JSON / CSV Yükle ↑',
    resetBtn: '↻ Örnek veriyi sıfırla',
    overlineHow: 'NASIL ÇALIŞIR?',
    p1Title: 'Önemli olanı tekrar et.',
    p1Body: 'Tekrar zamanı gelen kartlar sıraya girer; önceki hatalar önceliği etkiler.',
    p2Title: 'Konuları dengede tut.',
    p2Body: 'Konu başı sınırlar ve sıralı seçim tek bir konunun oturumu kaplamasını önler.',
    p3Title: 'Ölçümde dürüst kal.',
    p3Body: 'FARK yalnızca verinin desteklediğini raporlar; bilinmeyeni bilinmiyor bırakır.',
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
    noticeReset: 'Örnek veriler sıfırlandı. Bellekteki değişiklikler temizlendi.',
    noticeCardAdded: topic => `${topic} konusuna yeni kart eklendi ve plan güncellendi.`,
    noticeCardError: msg => `Kart eklenemedi: ${msg}`,
    noticeExportJson: 'Deste düz metin JSON olarak indirildi. Gizli tutun.',
    noticeExportCsv: 'Kart içerikleri RFC 4180 CSV olarak indirildi (formül korumalı).',
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
  $('replan-button').textContent = copy.replanBtn;
  $('sample-answer-label').textContent = copy.sampleAnswerLabel;
  $('reveal-button').textContent = copy.revealBtn;
  $('skip-button').textContent = copy.skipBtn;
  $('reveal-hint').textContent = copy.revealHint;
  $('mistake-label-text').textContent = copy.mistakeLabelText;
  $('mistake-optional').textContent = copy.mistakeOptional;
  $('rating-title').textContent = copy.ratingTitle;
  $('feedback-note').textContent = copy.feedbackNote;
  $('skip-after-reveal').textContent = copy.skipInline;
  $('next-plan-button').textContent = copy.nextPlanBtn;
  $('kicker-author').textContent = copy.kickerAuthor;
  $('add-card-heading').textContent = copy.addCardHeading;
  $('add-card-blurb').textContent = copy.addCardBlurb;
  $('label-card-topic').textContent = copy.labelCardTopic;
  $('label-card-question').textContent = copy.labelCardQuestion;
  $('label-card-answer').textContent = copy.labelCardAnswer;
  $('add-card-submit').textContent = copy.addCardSubmit;
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

function render() {
  progress();
  renderCard();
  renderInsights();
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
  const options = rating === 'again' && $('mistake-reason').value
    ? { reason: $('mistake-reason').value }
    : {};
  const updated = reviewCard(cards[index], rating, new Date(), options);
  cards[index] = updated;
  ratedCount++;
  position++;
  answerVisible = false;
  $('mistake-reason').value = '';
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
    const isCsv = file.name?.toLowerCase().endsWith('.csv') || file.type?.includes('csv');
    const restored = isCsv ? importStudyCsv(text) : importStudyDeck(text);
    cards = restored;
    rebuildPlan();
    notify(t().noticeImported(cards.length, isCsv ? 'CSV' : 'JSON'));
  } catch (error) {
    notify(t().noticeImportFail(error.message));
  }
}

$('lang-toggle').addEventListener('click', () => {
  lang = lang === 'en' ? 'tr' : 'en';
  applyLanguage();
  render();
});
$('settings-form').addEventListener('submit', event => {
  event.preventDefault();
  rebuildPlan();
  notify(t().noticePlanRebuilt);
});
$('add-card-form').addEventListener('submit', addCustomCard);
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
$('import-trigger').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', importCards);

applyLanguage();
rebuildPlan();
