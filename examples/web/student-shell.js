import {
  cloneKnowledgeCorePreset
} from './knowledge-presets.js';
import {
  COURSE_PACK_FORMAT,
  COURSE_PACK_VERSION,
  createCourseRegistry,
  parseCoursePackFile,
  resolveLocalizedText
} from '../../src/course-pack.js';

const CUSTOM_PACKS_STORAGE_KEY = 'fark-course-packs-v1';
const SVG_NS = 'http://www.w3.org/2000/svg';

const COPY = {
  en: {
    navCourses: 'Courses',
    navProgress: 'My Progress',
    navAddCourse: 'Add Course',
    studioSwitchToStudio: 'Studio',
    studioSwitchToStudent: 'Student View',
    catalogTitle: 'What do you want to learn today?',
    catalogSubtitle:
      'Pick a course. When you miss a question, we explain why in one minute and check again with a fresh question.',
    resumeLabel: 'Continue where you left off',
    resumeBtn: 'Continue →',
    startBtn: 'Start →',
    continueBtn: 'Continue →',
    deletePackLabel: 'Remove',
    customOriginLabel: 'Custom course',
    metaTopics: (topics, mins) => `${topics} ${topics === 1 ? 'topic' : 'topics'} · ~${mins} min`,
    metaCards: (cards, mins) => `${cards} ${cards === 1 ? 'card' : 'cards'} · ~${mins} min`,
    progressTopics: (done, total) => `${done} of ${total} verified`,
    progressCards: (reviewed, total) => `${reviewed} of ${total} reviewed`,
    notStarted: 'Ready to begin',
    importBannerTitle: 'Have your own notes or exam pack?',
    importBannerBody:
      'Upload a Markdown, CSV, or JSON course file to add it right into your catalog—everything stays locally in your browser.',
    importBannerUpload: 'Upload course file ↑',
    importBannerOpen: 'Paste or build a course →',
    importBannerTemplate: 'Download .md template',
    backToCourses: '← Courses',
    lessonTopicProgress: (idx, total, label) => `Topic ${idx} of ${total} · ${label}`,
    lessonCardProgress: (reviewed, total) => `${reviewed} / ${total} reviewed`,
    flashcardPackLabel: 'Deck',
    addTitle: 'Add your own course',
    addSubtitle:
      'Plug in any subject—language prep, university notes, or a private exam pack—via file upload, pasted notes, or a 5-line JS call.',
    uploadTitle: '1. Upload a course file',
    uploadBody: 'Supports CoursePack JSON, Knowledge Core JSON, Study Deck JSON, Markdown (.md), or CSV (.csv).',
    uploadBtn: 'Choose file (.json, .md, .csv) ↑',
    templateBtn: 'Download sample .md template',
    pasteTitle: '2. Or paste structured notes',
    pasteBody:
      'Paste Markdown with # Unit / ## Outcome / Lesson: / Q: (or simple Q :: A flashcards) to validate and add instantly.',
    pasteNameLabel: 'Course title (optional)',
    pasteNamePlaceholder: 'e.g. Constitutional Law Foundations',
    pasteSampleBtn: 'Load example notes',
    pastePreviewBtn: 'Check & preview',
    pasteAddBtn: 'Add to My Courses & Start →',
    pastePlaceholder:
      '# Unit: Foundations\n## Outcome: Core Distinction\nLesson: Focus on the structural rule before memorizing exceptions.\nWrong: Relying on surface keywords alone.\nRight: Test the underlying condition directly.\nQ: Which check prevents surface-level errors?\n* Verify the underlying condition directly\n- Memorize only the first word [misconception: surface-cue]\nQ: What should you apply on an unfamiliar example?\n* The structural rule behind the concept\n- A guess based on length [misconception: surface-cue]',
    previewReady: (title, modeLabel, countLabel) => `Ready: "${title}" (${modeLabel} · ${countLabel})`,
    previewEmpty: 'Paste Markdown, CSV, or JSON notes above to validate.',
    previewError: msg => `Could not parse: ${msg}`,
    modeClosedLoop: 'Guided closed-loop',
    modeFlashcards: 'Flashcard review',
    devSummary: 'For developers & private exam apps (JavaScript CourseRegistry API)',
    devBody:
      'Reuse this exact FARK engine and student UI in your own app by registering a CoursePack object directly in code:',
    openStudioLink: 'Need fine-grained authoring? Open Lesson Designer in Studio →',
    noticeCourseAdded: title => `Added "${title}" to your courses.`,
    noticeCourseRemoved: title => `Removed "${title}" from your catalog.`,
    noticeCourseError: msg => `Could not add course: ${msg}`,
    noticeTemplateDownloaded: 'Downloaded clean Markdown course template (fark-course-template.md).',
    noticeStudioMode: 'Switched to Advanced Studio.',
    noticeStudentMode: 'Returned to Student View.',
    flashcardPacks: [
      { id: 'starter', label: 'General Mix (9)' },
      { id: 'english', label: 'English A2→B2' },
      { id: 'computer-science', label: 'CS Cloze' },
      { id: 'biology', label: 'Biology' },
      { id: 'language', label: 'EN ↔ TR' }
    ]
  },
  tr: {
    navCourses: 'Kurslar',
    navProgress: 'İlerlemem',
    navAddCourse: 'Kurs Ekle',
    studioSwitchToStudio: 'Stüdyo',
    studioSwitchToStudent: 'Öğrenci Görünümü',
    catalogTitle: 'Bugün ne öğrenmek istiyorsun?',
    catalogSubtitle:
      'Bir kurs seç. Bir soruyu yanlış yaparsan nedenini 1 dakikada açıklayıp yeni bir soruyla doğruluyoruz.',
    resumeLabel: 'Kaldığın yerden devam et',
    resumeBtn: 'Devam et →',
    startBtn: 'Başla →',
    continueBtn: 'Devam et →',
    deletePackLabel: 'Kaldır',
    customOriginLabel: 'Özel kurs',
    metaTopics: (topics, mins) => `${topics} konu · ~${mins} dk`,
    metaCards: (cards, mins) => `${cards} kart · ~${mins} dk`,
    progressTopics: (done, total) => `${done} / ${total} doğrulandı`,
    progressCards: (reviewed, total) => `${reviewed} / ${total} çalışıldı`,
    notStarted: 'Başlamaya hazır',
    importBannerTitle: 'Kendi notların veya özel sınav paketin mi var?',
    importBannerBody:
      'Markdown, CSV veya JSON kurs dosyanı tek tıkla yükle—kataloğuna anında eklensin, verilerin yalnızca tarayıcında kalsın.',
    importBannerUpload: 'Kurs dosyası yükle ↑',
    importBannerOpen: 'Yapıştır veya paket ekle →',
    importBannerTemplate: '.md şablonu indir',
    backToCourses: '← Kurslar',
    lessonTopicProgress: (idx, total, label) => `Konu ${idx} / ${total} · ${label}`,
    lessonCardProgress: (reviewed, total) => `${reviewed} / ${total} çalışıldı`,
    flashcardPackLabel: 'Deste',
    addTitle: 'Kendi kursunu ekle',
    addSubtitle:
      'İngilizce, üniversite notları ya da kendi özel sınav paketin (KPSS vb.)—dosya yükle, not yapıştır veya 5 satır kodla bağla.',
    uploadTitle: '1. Kurs dosyası yükle',
    uploadBody:
      'CoursePack JSON, Bilgi Çekirdeği JSON, Deste JSON, Markdown (.md) veya CSV (.csv) dosyalarını otomatik tanır.',
    uploadBtn: 'Dosya seç (.json, .md, .csv) ↑',
    templateBtn: 'Örnek .md şablonu indir',
    pasteTitle: '2. Veya yapılandırılmış not yapıştır',
    pasteBody:
      '# Unit / ## Outcome / Lesson: / Q: biçiminde Markdown (veya Soru :: Cevap kartları) yapıştırıp anında kursa dönüştür.',
    pasteNameLabel: 'Kurs adı (isteğe bağlı)',
    pasteNamePlaceholder: 'örn. Anayasa Temel Kavramlar',
    pasteSampleBtn: 'Örnek not doldur',
    pastePreviewBtn: 'Doğrula ve önizle',
    pasteAddBtn: 'Kurslarıma Ekle ve Başla →',
    pastePlaceholder:
      '# Unit: Temeller\n## Outcome: Temel Ayrım\nLesson: Ezberlemeden önce kavramın temel kuralını netleştir.\nWrong: Yalnızca yüzeydeki anahtar kelimelere bakmak.\nRight: Her örnekte temel koşulu doğrudan test et.\nQ: Yüzeysel hataları önleyen yaklaşım hangisidir?\n* Kavramın temel koşulunu doğrudan test etmek\n- Yalnızca ilk kelimeyi ezberlemek [misconception: yuzeysel-ipucu]\nQ: Yeni bir örnekte hangisini uygulamalısın?\n* Kavramın arkasındaki yapısal kuralı\n- Seçenek uzunluğuna göre tahmini [misconception: yuzeysel-ipucu]',
    previewReady: (title, modeLabel, countLabel) => `Hazır: "${title}" (${modeLabel} · ${countLabel})`,
    previewEmpty: 'Doğrulamak için yukarıya Markdown, CSV veya JSON yapıştır.',
    previewError: msg => `Ayrıştırılamadı: ${msg}`,
    modeClosedLoop: 'Rehberli kapalı döngü',
    modeFlashcards: 'Kart tekrarı',
    devSummary: 'Geliştiriciler ve özel sınav uygulamaları için (JavaScript CourseRegistry API)',
    devBody:
      'Kendi özel uygulamanda (ör. KPSS) bu motoru ve öğrenci arayüzünü tek satır değiştirmeden kullanmak için CoursePack kaydet:',
    openStudioLink: 'Ayrıntılı ders düzenleyici mi lazım? Stüdyo Ders Tasarımcısını aç →',
    noticeCourseAdded: title => `"${title}" kurslarına eklendi.`,
    noticeCourseRemoved: title => `"${title}" katalogdan kaldırıldı.`,
    noticeCourseError: msg => `Kurs eklenemedi: ${msg}`,
    noticeTemplateDownloaded: 'Temiz Markdown kurs şablonu indirildi (fark-course-template.md).',
    noticeStudioMode: 'Gelişmiş Stüdyo görünümüne geçildi.',
    noticeStudentMode: 'Öğrenci görünümüne dönüldü.',
    flashcardPacks: [
      { id: 'starter', label: 'Genel Karışık (9)' },
      { id: 'english', label: 'İngilizce A2→B2' },
      { id: 'computer-science', label: 'Bilgisayar (Cloze)' },
      { id: 'biology', label: 'Biyoloji' },
      { id: 'language', label: 'EN ↔ TR' }
    ]
  }
};

const BUILTIN_COURSES = [
  {
    format: COURSE_PACK_FORMAT,
    version: COURSE_PACK_VERSION,
    id: 'english-grammar',
    title: { en: 'English A2 → B2', tr: 'İngilizce A2 → B2' },
    subtitle: {
      en: 'Fix tense mix-ups, conditionals, and passive voice with 1-minute targeted lessons.',
      tr: 'Zamanlar, koşul cümleleri ve edilgen çatı hatalarını 1 dakikalık derslerle kalıcı düzelt.'
    },
    kind: 'closed-loop',
    source: 'builtin',
    icon: 'globe',
    accent: 'cobalt',
    estimatedMinutes: 6,
    payload: cloneKnowledgeCorePreset('english-grammar')
  },
  {
    format: COURSE_PACK_FORMAT,
    version: COURSE_PACK_VERSION,
    id: 'math-foundations',
    title: { en: 'Math Foundations', tr: 'Matematik Temelleri' },
    subtitle: {
      en: 'Spot hidden gaps in order of operations, linear equations, and percentages.',
      tr: 'İşlem önceliği, denklem kurma ve yüzde hesaplarındaki gizli boşlukları yakala.'
    },
    kind: 'closed-loop',
    source: 'builtin',
    icon: 'grid',
    accent: 'emerald',
    estimatedMinutes: 5,
    payload: cloneKnowledgeCorePreset('math-foundations')
  },
  {
    format: COURSE_PACK_FORMAT,
    version: COURSE_PACK_VERSION,
    id: 'cs-algorithms',
    title: { en: 'Algorithms & Logic', tr: 'Algoritma ve Mantık' },
    subtitle: {
      en: 'Master Big-O growth, binary search invariants, and BFS vs DFS intuition.',
      tr: 'Big-O karmaşıklığı, ikili arama koşulları ve BFS/DFS mantığını sağlamlaştır.'
    },
    kind: 'closed-loop',
    source: 'builtin',
    icon: 'nodes',
    accent: 'amber',
    estimatedMinutes: 6,
    payload: cloneKnowledgeCorePreset('cs-algorithms')
  },
  {
    format: COURSE_PACK_FORMAT,
    version: COURSE_PACK_VERSION,
    id: 'quick-flashcards',
    title: { en: 'Quick Flashcard Review', tr: 'Hızlı Kart Tekrarı' },
    subtitle: {
      en: 'Practice active recall across general knowledge, biology, CS cloze, and vocabulary.',
      tr: 'Genel kültür, biyoloji, bilgisayar ve kelime desteleriyle akıllı aralıklı tekrar yap.'
    },
    kind: 'flashcards',
    source: 'builtin',
    icon: 'cards',
    accent: 'slate',
    estimatedMinutes: 4,
    payload: [
      { id: 'qf-placeholder', topic: 'General', question: 'Ready to practice', answer: 'Built-in packs' }
    ]
  }
];

const BUILTIN_IDS = new Set(BUILTIN_COURSES.map(c => c.id));

const TEMPLATE_MARKDOWN = {
  en: `# Unit: Core Principles
## Outcome: Distinguishing Cause and Correlation
Lesson: Two variables moving together do not prove one causes the other; check for a confounding variable first.
Wrong: Assuming a strong correlation automatically means direct causation.
Right: Ask whether a hidden third factor could drive both observations.
Q: Ice cream sales and sunburn cases rise together in July. What is the best conclusion?
* A third factor (summer weather) likely drives both
- Buying ice cream directly causes sunburn [misconception: correlation-as-causation]
- Sunburn forces people to buy ice cream [misconception: reverse-causation]
Q: A study finds cities with more libraries have more traffic lights. Why is claiming libraries cause traffic lights flawed?
* Population size is a confounding variable affecting both
- Libraries are always built next to intersections [misconception: correlation-as-causation]
- Traffic lights decrease reading habits [misconception: reverse-causation]

## Outcome: Control Groups
Lesson: A control group gives you a baseline so you can isolate the effect of the single change you tested.
Wrong: Measuring only the treated group and attributing all change to the intervention.
Right: Compare the treated group against an otherwise identical control group.
Q: Why does a fair experiment include a control group?
* To establish a baseline for isolating the tested variable
- To double the amount of data collected [misconception: control-as-size]
- To avoid measuring outcomes after the test [misconception: skip-baseline]
Q: Students try a new study schedule and improve by 8% next month. What is missing before crediting the schedule?
* A comparison group that kept the usual schedule
- A longer survey about student preferences [misconception: control-as-size]
- Removing the hardest exam questions [misconception: skip-baseline]
`,
  tr: `# Unit: Temel Kavramlar
## Outcome: Neden-Sonuç ve Korelasyon Ayrımı
Lesson: İki değişkenin birlikte artması birinin diğerine neden olduğunu kanıtlamaz; önce gizli üçüncü bir etken olup olmadığına bak.
Wrong: Güçlü bir birlikteliği otomatik olarak doğrudan neden-sonuç sanmak.
Right: Her iki durumu da etkileyen ortak bir gizli değişken (karıştırıcı) var mı diye sor.
Q: Yaz aylarında dondurma satışı ile güneş yanığı vakaları birlikte artıyor. En doğru çıkarım hangisidir?
* Ortak bir üçüncü etken (sıcak hava) ikisini birden artırıyordur
- Dondurma yemek doğrudan güneş yanığına yol açar [misconception: korelasyon-nedensellik]
- Güneş yanığı insanları dondurma almaya zorlar [misconception: ters-nedensellik]
Q: Daha çok kütüphanesi olan şehirlerde daha çok trafik ışığı bulunuyor. Kütüphanelerin trafik ışığına yol açtığını söylemek neden hatalıdır?
* Şehir nüfusu her ikisini de etkileyen ortak değişkendir
- Kütüphaneler her zaman kavşaklara yapılır [misconception: korelasyon-nedensellik]
- Trafik ışıkları okuma oranını düşürür [misconception: ters-nedensellik]

## Outcome: Kontrol Grubu Mantığı
Lesson: Kontrol grubu, test edilen tek değişikliğin gerçek etkisini ayırabilmek için taban çizgisi sunar.
Wrong: Yalnızca uygulama yapılan grubu ölçüp tüm değişimi uygulamaya bağlamak.
Right: Uygulama grubunu aynı koşullardaki kontrol grubuyla karşılaştır.
Q: Güvenilir bir deneyde kontrol grubu neden gereklidir?
* Test edilen etkenin farkını ayıracak taban çizgisi oluşturmak için
- Sadece katılımcı sayısını ikiye katlamak için [misconception: kontrol-boyut]
- Deney sonunda ölçüm yapmaktan kaçınmak için [misconception: taban-atlama]
Q: Yeni bir çalışma programı deneyen grup bir ayda %8 gelişti. Başarıyı programa bağlamadan önce ne eksiktir?
* Eski programla devam eden bir karşılaştırma grubu
- Daha uzun bir memnuniyet anketi [misconception: kontrol-boyut]
- Zor soruların sınavdan çıkarılması [misconception: taban-atlama]
`
};

const DEV_SNIPPET = `window.FarkCourseRegistry.registerCoursePack({
  id: 'my-private-exam-pack',
  kind: 'closed-loop', // or 'flashcards'
  title: { tr: 'Özel Sınav Paketi', en: 'Custom Exam Pack' },
  subtitle: { tr: 'Kendi soruların ve 1 dk açıklamaların.', en: 'Your own questions and micro-lessons.' },
  payload: myValidatedKnowledgeCore // or cards array
});`;

function createSvgIcon(kind) {
  if (typeof document.createElementNS !== 'function') {
    const fallback = document.createElement('span');
    fallback.className = 'course-icon-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.textContent = kind === 'globe' ? 'EN' : kind === 'grid' ? '∑' : kind === 'nodes' ? '◇' : '▤';
    return fallback;
  }
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('width', '40');
  svg.setAttribute('height', '40');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('course-emblem-svg');

  const add = (tag, attrs) => {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.append(el);
    return el;
  };

  if (kind === 'globe') {
    add('circle', { cx: 20, cy: 20, r: 13, stroke: 'currentColor', 'stroke-width': 2 });
    add('ellipse', { cx: 20, cy: 20, rx: 6.5, ry: 13, stroke: 'currentColor', 'stroke-width': 1.8 });
    add('line', { x1: 7.5, y1: 16, x2: 32.5, y2: 16, stroke: 'currentColor', 'stroke-width': 1.6 });
    add('line', { x1: 7.5, y1: 24, x2: 32.5, y2: 24, stroke: 'currentColor', 'stroke-width': 1.6 });
  } else if (kind === 'grid') {
    add('rect', { x: 8, y: 8, width: 10, height: 10, rx: 2.5, stroke: 'currentColor', 'stroke-width': 2 });
    add('rect', { x: 22, y: 8, width: 10, height: 10, rx: 2.5, stroke: 'currentColor', 'stroke-width': 2 });
    add('rect', { x: 8, y: 22, width: 10, height: 10, rx: 2.5, stroke: 'currentColor', 'stroke-width': 2 });
    add('circle', { cx: 27, cy: 27, r: 5, fill: 'currentColor', opacity: 0.24 });
    add('circle', { cx: 27, cy: 27, r: 5, stroke: 'currentColor', 'stroke-width': 2 });
  } else if (kind === 'nodes') {
    add('line', { x1: 20, y1: 12, x2: 11, y2: 27, stroke: 'currentColor', 'stroke-width': 2 });
    add('line', { x1: 20, y1: 12, x2: 29, y2: 27, stroke: 'currentColor', 'stroke-width': 2 });
    add('line', { x1: 11, y1: 27, x2: 29, y2: 27, stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-dasharray': '3 3' });
    add('circle', { cx: 20, cy: 11, r: 4.5, fill: 'currentColor', opacity: 0.22, stroke: 'currentColor', 'stroke-width': 2 });
    add('circle', { cx: 11, cy: 27, r: 4, fill: 'currentColor', opacity: 0.14, stroke: 'currentColor', 'stroke-width': 2 });
    add('circle', { cx: 29, cy: 27, r: 4, fill: 'currentColor', opacity: 0.14, stroke: 'currentColor', 'stroke-width': 2 });
  } else if (kind === 'cards') {
    add('rect', { x: 8, y: 12, width: 19, height: 16, rx: 3.5, stroke: 'currentColor', 'stroke-width': 2 });
    add('path', {
      d: 'M14 12V9.5C14 8.4 14.9 7.5 16 7.5H29.5C30.6 7.5 31.5 8.4 31.5 9.5V22.5C31.5 23.6 30.6 24.5 29.5 24.5H27',
      stroke: 'currentColor',
      'stroke-width': 1.8
    });
    add('line', { x1: 13, y1: 18, x2: 22, y2: 18, stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' });
    add('line', { x1: 13, y1: 22.5, x2: 19, y2: 22.5, stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' });
  } else {
    add('rect', { x: 9, y: 7, width: 22, height: 26, rx: 4, stroke: 'currentColor', 'stroke-width': 2 });
    add('line', { x1: 14, y1: 14, x2: 26, y2: 14, stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' });
    add('line', { x1: 14, y1: 20, x2: 26, y2: 20, stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' });
    add('line', { x1: 14, y1: 26, x2: 21, y2: 26, stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' });
  }
  return svg;
}

export function initStudentShell(host) {
  const $ = id => document.getElementById(id);
  const copy = () => COPY[host.getLang() === 'tr' ? 'tr' : 'en'];

  const registry = createCourseRegistry(BUILTIN_COURSES);
  let studentMode = true;
  let studentView = 'catalog'; // 'catalog' | 'lesson' | 'progress' | 'add-course'
  let activeCourseId = null;
  let activeFlashcardPackId = 'starter';

  function getStoreSafe() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    } catch {}
    return null;
  }

  function persistCustomPacks() {
    const store = getStoreSafe();
    if (!store) return;
    try {
      const customs = registry.listCoursePacks().filter(pack => !BUILTIN_IDS.has(pack.id));
      store.setItem(CUSTOM_PACKS_STORAGE_KEY, JSON.stringify(customs));
    } catch {}
  }

  function restoreCustomPacks() {
    const store = getStoreSafe();
    if (!store) return;
    try {
      const raw = store.getItem(CUSTOM_PACKS_STORAGE_KEY);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      for (const pack of list) {
        try {
          if (pack && !BUILTIN_IDS.has(pack.id)) registry.registerCoursePack(pack);
        } catch {}
      }
    } catch {}
  }

  function syncBodyState() {
    document.body?.classList?.toggle('student-experience', studentMode);
    if (document.body?.dataset) {
      document.body.dataset.studentView = studentMode ? studentView : 'studio';
    }

    const catalogEl = $('student-catalog-view');
    const lessonBarEl = $('student-lesson-bar');
    const importEl = $('student-import-view');
    const navEl = $('student-nav');

    if (catalogEl) catalogEl.hidden = !(studentMode && studentView === 'catalog');
    if (lessonBarEl) lessonBarEl.hidden = !(studentMode && studentView === 'lesson');
    if (importEl) importEl.hidden = !(studentMode && studentView === 'add-course');
    if (navEl) navEl.hidden = !studentMode;

    const navMap = [
      ['catalog', 'nav-courses'],
      ['lesson', 'nav-courses'],
      ['progress', 'nav-progress'],
      ['add-course', 'nav-add-course']
    ];
    for (const [key, id] of navMap) {
      const btn = $(id);
      if (!btn) continue;
      const isCurrent =
        studentMode &&
        ((id === 'nav-courses' && (studentView === 'catalog' || studentView === 'lesson')) ||
          studentView === key);
      btn.classList.toggle('is-active', isCurrent);
      btn.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    }

    const switchBtn = $('studio-mode-switch');
    if (switchBtn) {
      const c = copy();
      switchBtn.textContent = studentMode ? c.studioSwitchToStudio : c.studioSwitchToStudent;
      switchBtn.setAttribute('aria-pressed', String(!studentMode));
    }
  }

  function setStudentView(nextView) {
    studentMode = true;
    studentView = nextView;
    if (nextView === 'progress') {
      host.switchTab('intelligence');
    } else if (nextView === 'lesson') {
      host.switchTab('study');
    }
    syncBodyState();
    if (nextView === 'catalog') renderCatalog();
    if (nextView === 'lesson') renderLessonBar();
  }

  function openCourse(courseId) {
    const pack = registry.getCoursePack(courseId);
    if (!pack) return false;
    activeCourseId = pack.id;
    const lang = host.getLang();
    const title = resolveLocalizedText(pack.title, lang);

    if (pack.kind === 'closed-loop') {
      host.closedLoopStudio?.loadCourseCore(pack.id, pack.payload, title);
    } else {
      host.closedLoopStudio?.setStudyMode('spaced');
      if (pack.id === 'quick-flashcards') {
        host.openFlashcardPack(activeFlashcardPackId);
      } else {
        host.openCustomFlashcards(pack.payload, title);
      }
    }

    setStudentView('lesson');
    renderLessonBar();
    return true;
  }

  function renderLessonBar() {
    const bar = $('student-lesson-bar');
    if (!bar) return;
    const c = copy();
    const lang = host.getLang();
    const pack = activeCourseId ? registry.getCoursePack(activeCourseId) : null;

    const backBtn = $('lesson-back-btn');
    if (backBtn) backBtn.textContent = c.backToCourses;

    const titleEl = $('lesson-course-title');
    if (titleEl) titleEl.textContent = pack ? resolveLocalizedText(pack.title, lang) : '';

    const progressEl = $('lesson-course-progress');
    if (progressEl && pack) {
      if (pack.kind === 'closed-loop') {
        const summary = host.closedLoopStudio?.getActiveCourseSummary?.();
        if (summary && summary.totalOutcomes > 0) {
          progressEl.textContent = c.lessonTopicProgress(
            summary.selectedOutcomeIndex,
            summary.totalOutcomes,
            summary.selectedOutcomeLabel
          );
        } else {
          progressEl.textContent = '';
        }
      } else {
        const stats = host.getFlashcardProgress();
        progressEl.textContent = c.lessonCardProgress(stats.reviewed, stats.total);
      }
    }

    const packStrip = $('lesson-flashcard-packs');
    if (packStrip) {
      const showStrip = Boolean(pack && pack.id === 'quick-flashcards');
      packStrip.hidden = !showStrip;
      if (showStrip) {
        packStrip.replaceChildren();
        const label = document.createElement('span');
        label.className = 'lesson-pack-label';
        label.textContent = c.flashcardPackLabel;
        packStrip.append(label);
        for (const item of c.flashcardPacks) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'lesson-pack-btn' + (item.id === activeFlashcardPackId ? ' is-active' : '');
          btn.textContent = item.label;
          btn.addEventListener('click', () => {
            activeFlashcardPackId = item.id;
            host.openFlashcardPack(item.id);
            renderLessonBar();
          });
          packStrip.append(btn);
        }
      }
    }
  }

  function getPackProgress(pack) {
    const c = copy();
    if (pack.kind === 'closed-loop') {
      const prog = host.closedLoopStudio?.getCourseProgress?.(pack.id, pack.payload) ?? {
        totalOutcomes: pack.payload?.outcomes?.length ?? 0,
        completedOutcomes: 0,
        observedOutcomes: 0
      };
      const pct = prog.totalOutcomes ? Math.round((prog.completedOutcomes / prog.totalOutcomes) * 100) : 0;
      return {
        pct,
        started: prog.observedOutcomes > 0 || prog.completedOutcomes > 0,
        label:
          prog.observedOutcomes > 0 || prog.completedOutcomes > 0
            ? c.progressTopics(prog.completedOutcomes, prog.totalOutcomes)
            : c.notStarted,
        meta: c.metaTopics(prog.totalOutcomes, pack.estimatedMinutes ?? Math.max(3, prog.totalOutcomes * 2))
      };
    }

    const flash = host.getFlashcardProgress();
    const total = pack.id === 'quick-flashcards' ? flash.total : (pack.payload?.length ?? 0);
    const reviewed = pack.id === 'quick-flashcards' ? flash.reviewed : 0;
    const pct = total ? Math.round((reviewed / total) * 100) : 0;
    return {
      pct,
      started: reviewed > 0,
      label: reviewed > 0 ? c.progressCards(reviewed, total) : c.notStarted,
      meta: c.metaCards(total, pack.estimatedMinutes ?? Math.max(3, Math.ceil(total / 3)))
    };
  }

  function renderCatalog() {
    const grid = $('course-catalog-grid');
    if (!grid) return;
    const c = copy();
    const lang = host.getLang();

    const resumeBar = $('catalog-resume-bar');
    if (resumeBar) {
      const activePack = activeCourseId ? registry.getCoursePack(activeCourseId) : null;
      if (activePack) {
        resumeBar.hidden = false;
        const prog = getPackProgress(activePack);
        const resumeTitle = $('catalog-resume-title');
        const resumeMeta = $('catalog-resume-meta');
        const resumeBtn = $('catalog-resume-btn');
        if (resumeTitle) resumeTitle.textContent = resolveLocalizedText(activePack.title, lang);
        if (resumeMeta) resumeMeta.textContent = `${c.resumeLabel} · ${prog.label}`;
        if (resumeBtn) resumeBtn.textContent = c.resumeBtn;
      } else {
        resumeBar.hidden = true;
      }
    }

    grid.replaceChildren();
    for (const pack of registry.listCoursePacks()) {
      const prog = getPackProgress(pack);
      const isCustom = !BUILTIN_IDS.has(pack.id);
      const card = document.createElement('article');
      card.className = `course-card course-accent-${pack.accent || 'cobalt'}`;
      card.dataset.courseId = pack.id;

      const topRow = document.createElement('div');
      topRow.className = 'course-card-top';

      const emblem = document.createElement('div');
      emblem.className = 'course-emblem';
      emblem.append(createSvgIcon(pack.icon || (pack.kind === 'flashcards' ? 'cards' : 'custom')));

      topRow.append(emblem);
      if (isCustom) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'course-remove-btn';
        removeBtn.textContent = c.deletePackLabel;
        removeBtn.addEventListener('click', event => {
          event.stopPropagation();
          const title = resolveLocalizedText(pack.title, lang);
          registry.unregisterCoursePack(pack.id);
          if (activeCourseId === pack.id) activeCourseId = null;
          persistCustomPacks();
          renderCatalog();
          host.notify(c.noticeCourseRemoved(title));
        });
        topRow.append(removeBtn);
      }

      const title = document.createElement('h2');
      title.className = 'course-card-title';
      title.textContent = resolveLocalizedText(pack.title, lang);

      const desc = document.createElement('p');
      desc.className = 'course-card-desc';
      desc.textContent = resolveLocalizedText(pack.subtitle, lang);

      const meta = document.createElement('div');
      meta.className = 'course-card-meta';
      meta.textContent = isCustom ? `${c.customOriginLabel} · ${prog.meta}` : prog.meta;

      const track = document.createElement('div');
      track.className = 'course-progress-track';
      const fill = document.createElement('span');
      fill.className = 'course-progress-fill';
      fill.style.width = `${prog.pct}%`;
      track.append(fill);

      const foot = document.createElement('div');
      foot.className = 'course-card-footer';

      const status = document.createElement('span');
      status.className = 'course-card-status';
      status.textContent = prog.label;

      const cta = document.createElement('button');
      cta.type = 'button';
      cta.className = 'course-start-btn';
      cta.textContent = prog.started ? c.continueBtn : c.startBtn;
      cta.addEventListener('click', event => {
        event.stopPropagation();
        openCourse(pack.id);
      });

      foot.append(status, cta);
      card.append(topRow, title, desc, meta, track, foot);
      card.addEventListener('click', () => openCourse(pack.id));
      grid.append(card);
    }
  }

  function registerAndOpenPack(pack, shouldOpen = true) {
    const c = copy();
    const lang = host.getLang();
    const registered = registry.registerCoursePack(pack);
    persistCustomPacks();
    renderCatalog();
    host.notify(c.noticeCourseAdded(resolveLocalizedText(registered.title, lang)));
    if (shouldOpen) openCourse(registered.id);
    return registered;
  }

  async function handleFileUpload(file) {
    if (!file) return;
    const c = copy();
    try {
      const raw = await file.text();
      const { pack } = parseCoursePackFile(raw, {
        filename: file.name,
        title: file.name.replace(/\.[^.]+$/, '')
      });
      registerAndOpenPack(pack, true);
    } catch (err) {
      host.notify(c.noticeCourseError(err.message));
    }
  }

  function validatePastedCourse() {
    const c = copy();
    const lang = host.getLang();
    const statusEl = $('student-paste-status');
    const raw = ($('student-paste-input')?.value || '').trim();
    const titleOverride = ($('student-paste-title')?.value || '').trim();
    if (!raw) {
      if (statusEl) {
        statusEl.textContent = c.previewEmpty;
        statusEl.dataset.state = 'idle';
      }
      return null;
    }
    try {
      const { pack } = parseCoursePackFile(raw, {
        ...(titleOverride ? { title: titleOverride } : {}),
        filename: raw.startsWith('{') ? 'custom.json' : 'custom.md'
      });
      const modeLabel = pack.kind === 'closed-loop' ? c.modeClosedLoop : c.modeFlashcards;
      const countLabel =
        pack.kind === 'closed-loop'
          ? c.metaTopics(pack.payload.outcomes.length, pack.estimatedMinutes ?? 4)
          : c.metaCards(pack.payload.length, pack.estimatedMinutes ?? 4);
      if (statusEl) {
        statusEl.textContent = c.previewReady(resolveLocalizedText(pack.title, lang), modeLabel, countLabel);
        statusEl.dataset.state = 'ready';
      }
      return pack;
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = c.previewError(err.message);
        statusEl.dataset.state = 'error';
      }
      return null;
    }
  }

  function downloadTemplate() {
    const lang = host.getLang() === 'tr' ? 'tr' : 'en';
    host.downloadText('fark-course-template.md', TEMPLATE_MARKDOWN[lang], 'text/markdown;charset=utf-8');
    host.notify(copy().noticeTemplateDownloaded);
  }

  function applyLanguage() {
    const c = copy();
    const set = (id, text) => {
      const el = $(id);
      if (el) el.textContent = text;
    };

    set('nav-courses', c.navCourses);
    set('nav-progress', c.navProgress);
    set('nav-add-course', c.navAddCourse);
    set('catalog-heading', c.catalogTitle);
    set('catalog-subtitle', c.catalogSubtitle);
    set('catalog-import-title', c.importBannerTitle);
    set('catalog-import-body', c.importBannerBody);
    set('catalog-upload-btn', c.importBannerUpload);
    set('catalog-open-add-btn', c.importBannerOpen);
    set('catalog-template-btn', c.importBannerTemplate);

    set('student-add-heading', c.addTitle);
    set('student-add-subtitle', c.addSubtitle);
    set('student-upload-title', c.uploadTitle);
    set('student-upload-body', c.uploadBody);
    set('student-upload-btn', c.uploadBtn);
    set('student-template-btn', c.templateBtn);
    set('student-paste-title-head', c.pasteTitle);
    set('student-paste-body', c.pasteBody);
    set('label-student-paste-name', c.pasteNameLabel);
    set('student-paste-sample-btn', c.pasteSampleBtn);
    set('student-paste-check-btn', c.pastePreviewBtn);
    set('student-paste-add-btn', c.pasteAddBtn);
    set('student-dev-summary', c.devSummary);
    set('student-dev-body', c.devBody);
    set('student-open-studio-designer', c.openStudioLink);

    const nameInput = $('student-paste-title');
    if (nameInput) nameInput.placeholder = c.pasteNamePlaceholder;
    const pasteArea = $('student-paste-input');
    if (pasteArea) pasteArea.placeholder = c.pastePlaceholder;
    const codeEl = $('student-dev-code');
    if (codeEl) codeEl.textContent = DEV_SNIPPET;

    syncBodyState();
    renderCatalog();
    if (studentView === 'lesson') renderLessonBar();
  }

  // Wire navigation and actions
  $('nav-courses')?.addEventListener('click', () => setStudentView('catalog'));
  $('nav-progress')?.addEventListener('click', () => setStudentView('progress'));
  $('nav-add-course')?.addEventListener('click', () => setStudentView('add-course'));

  $('studio-mode-switch')?.addEventListener('click', () => {
    studentMode = !studentMode;
    syncBodyState();
    if (!studentMode) {
      host.switchTab('study');
      host.notify(copy().noticeStudioMode);
    } else {
      renderCatalog();
      host.notify(copy().noticeStudentMode);
    }
  });

  $('brand-home-link')?.addEventListener('click', event => {
    if (!studentMode) return;
    event.preventDefault();
    setStudentView('catalog');
  });

  $('lesson-back-btn')?.addEventListener('click', () => setStudentView('catalog'));
  $('catalog-resume-btn')?.addEventListener('click', () => {
    if (activeCourseId) openCourse(activeCourseId);
  });

  $('catalog-upload-btn')?.addEventListener('click', () => $('student-course-file')?.click());
  $('student-upload-btn')?.addEventListener('click', () => $('student-course-file')?.click());
  $('student-course-file')?.addEventListener('change', async event => {
    const file = event.target?.files?.[0];
    if (event.target) event.target.value = '';
    await handleFileUpload(file);
  });

  $('catalog-open-add-btn')?.addEventListener('click', () => setStudentView('add-course'));
  $('catalog-template-btn')?.addEventListener('click', downloadTemplate);
  $('student-template-btn')?.addEventListener('click', downloadTemplate);

  $('student-paste-sample-btn')?.addEventListener('click', () => {
    const lang = host.getLang() === 'tr' ? 'tr' : 'en';
    const area = $('student-paste-input');
    const nameInput = $('student-paste-title');
    if (area) area.value = TEMPLATE_MARKDOWN[lang];
    if (nameInput && !nameInput.value.trim()) {
      nameInput.value = lang === 'tr' ? 'Bilimsel Akıl Yürütme' : 'Scientific Reasoning';
    }
    validatePastedCourse();
  });

  $('student-paste-check-btn')?.addEventListener('click', validatePastedCourse);
  $('student-paste-add-btn')?.addEventListener('click', () => {
    const pack = validatePastedCourse();
    if (!pack) return;
    registerAndOpenPack(pack, true);
    const area = $('student-paste-input');
    const nameInput = $('student-paste-title');
    if (area) area.value = '';
    if (nameInput) nameInput.value = '';
  });

  $('student-open-studio-designer')?.addEventListener('click', () => {
    studentMode = false;
    syncBodyState();
    host.switchTab('decks');
    $('deck-submode-designer')?.click();
  });

  // Expose plug-and-play developer API on window for private apps (e.g., KPSS)
  if (typeof window !== 'undefined') {
    window.FarkCourseRegistry = Object.freeze({
      registerCoursePack(pack, { open = false } = {}) {
        return registerAndOpenPack(pack, open);
      },
      unregisterCoursePack(id) {
        if (BUILTIN_IDS.has(id)) return false;
        const removed = registry.unregisterCoursePack(id);
        if (removed) {
          if (activeCourseId === id) activeCourseId = null;
          persistCustomPacks();
          renderCatalog();
        }
        return removed;
      },
      listCoursePacks: () => registry.listCoursePacks(),
      getCoursePack: id => registry.getCoursePack(id),
      exportCoursePackJson: id => registry.exportCoursePackJson(id),
      openCourse
    });
  }

  restoreCustomPacks();
  applyLanguage();

  return {
    applyLanguage,
    refresh() {
      if (studentMode && studentView === 'catalog') renderCatalog();
      if (studentMode && studentView === 'lesson') renderLessonBar();
    },
    isStudentMode: () => studentMode,
    openCourse,
    setStudentView
  };
}
