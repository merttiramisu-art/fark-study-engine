import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COURSE_PACK_FORMAT,
  COURSE_PACK_VERSION,
  createCourseRegistry,
  parseCoursePackFile,
  resolveLocalizedText,
  serializeCoursePack,
  validateCoursePack
} from '../src/course-pack.js';
import { cloneKnowledgeCorePreset } from '../examples/web/knowledge-presets.js';

const SAMPLE_MD_CLOSED_LOOP = `# Unit: Temel Kavramlar
## Outcome: Neden ve Korelasyon
Lesson: İki değişkenin birlikte artması doğrudan nedensellik kanıtlamaz.
Wrong: Güçlü korelasyonu neden-sonuç sanmak.
Right: Gizli üçüncü etken (karıştırıcı) var mı kontrol et.
Q: Yazın dondurma satışı ve güneş yanığı birlikte artıyor. En doğru çıkarım?
* Ortak üçüncü etken (sıcak hava) ikisini de artırır
- Dondurma yemek güneş yanığı yapar [misconception: korelasyon-nedensellik]
Q: Daha çok kütüphanesi olan şehirde daha çok trafik ışığı var. Neden nedensellik kurulamaz?
* Şehir nüfusu her ikisini de etkileyen ortak değişkendir
- Kütüphaneler trafik ışığı doğurur [misconception: korelasyon-nedensellik]
`;

const SAMPLE_MD_FLASHCARDS = `## Tarih
- TBMM hangi tarihte açıldı? :: 23 Nisan 1920
- Lozan Antlaşması hangi yılda imzalandı? :: 1923
`;

const SAMPLE_CSV_CLOSED_LOOP = `unit,outcome,lesson_title,lesson_summary,question,choice_a,choice_b,correct,misconception
Temeller,Öncelik Kuralı,İşlem Sırası,Önce parantez ve çarpma yapılır.,2 + 3 * 4 kaçtır?,14,20,a,soldan-saga
Temeller,Öncelik Kuralı,İşlem Sırası,Önce parantez ve çarpma yapılır.,10 - 2 * 3 kaçtır?,4,24,a,soldan-saga
`;

const SAMPLE_CSV_FLASHCARDS = `topic,question,answer
Coğrafya,Türkiye'nin en uzun akarsuyu hangisidir?,Kızılırmak
Coğrafya,Türkiye'nin en yüksek dağı hangisidir?,Ağrı Dağı
`;

test('resolveLocalizedText supports bilingual maps and single-language strings', () => {
  assert.equal(resolveLocalizedText({ en: 'English', tr: 'İngilizce' }, 'tr'), 'İngilizce');
  assert.equal(resolveLocalizedText({ en: 'English', tr: 'İngilizce' }, 'en'), 'English');
  assert.equal(resolveLocalizedText('Yalnızca Türkçe', 'en'), 'Yalnızca Türkçe');
  assert.equal(resolveLocalizedText({ tr: 'Özel Sınav' }, 'en'), 'Özel Sınav');
});

test('validateCoursePack validates closed-loop and flashcard packs and rejects malformed input', () => {
  const closedLoop = validateCoursePack({
    id: 'english-pack',
    title: { en: 'English A2', tr: 'İngilizce A2' },
    subtitle: 'Practice tenses',
    kind: 'closed-loop',
    payload: cloneKnowledgeCorePreset('english-grammar')
  });
  assert.equal(closedLoop.format, COURSE_PACK_FORMAT);
  assert.equal(closedLoop.version, COURSE_PACK_VERSION);
  assert.equal(closedLoop.kind, 'closed-loop');
  assert.ok(closedLoop.readyCount >= 1);

  const flashcards = validateCoursePack({
    id: 'tr-notes',
    title: 'Özel Kartlar',
    kind: 'flashcards',
    payload: [{ id: 'c1', topic: 'Genel', question: 'Soru 1', answer: 'Cevap 1' }]
  });
  assert.equal(flashcards.kind, 'flashcards');
  assert.equal(flashcards.payload.length, 1);

  assert.throws(() => validateCoursePack({ id: 'bad', title: 'X', kind: 'closed-loop' }), /payload/);
  assert.throws(() => validateCoursePack({ id: 'bad', title: 'X', kind: 'flashcards', payload: [] }), /cards/);
  assert.throws(() => validateCoursePack({ id: 'bad', title: '', kind: 'flashcards', payload: [{ question: 'a', answer: 'b' }] }), /title/);
});

test('parseCoursePackFile auto-detects closed-loop Markdown, flashcard Markdown, CSV, and JSON formats', () => {
  const clMd = parseCoursePackFile(SAMPLE_MD_CLOSED_LOOP, { filename: 'akil-yurutme.md' });
  assert.equal(clMd.pack.kind, 'closed-loop');
  assert.equal(clMd.pack.payload.outcomes.length, 1);
  assert.equal(clMd.pack.payload.questions.length, 2);

  const fcMd = parseCoursePackFile(SAMPLE_MD_FLASHCARDS, { filename: 'tarih.md', title: 'Tarih Kartları' });
  assert.equal(fcMd.pack.kind, 'flashcards');
  assert.equal(fcMd.pack.payload.length, 2);
  assert.equal(resolveLocalizedText(fcMd.pack.title, 'tr'), 'Tarih Kartları');

  const clCsv = parseCoursePackFile(SAMPLE_CSV_CLOSED_LOOP, { filename: 'matematik.csv' });
  assert.equal(clCsv.pack.kind, 'closed-loop');
  assert.equal(clCsv.pack.payload.questions.length, 2);

  const fcCsv = parseCoursePackFile(SAMPLE_CSV_FLASHCARDS, { filename: 'cografya.csv' });
  assert.equal(fcCsv.pack.kind, 'flashcards');
  assert.equal(fcCsv.pack.payload.length, 2);

  const coreJson = parseCoursePackFile(JSON.stringify(cloneKnowledgeCorePreset('math-foundations')), {
    filename: 'math.json'
  });
  assert.equal(coreJson.pack.kind, 'closed-loop');

  const serialized = serializeCoursePack(clMd.pack);
  const roundTripped = parseCoursePackFile(serialized, { filename: 'roundtrip.json' });
  assert.equal(roundTripped.pack.id, clMd.pack.id);
  assert.equal(roundTripped.pack.payload.questions.length, 2);

  assert.throws(() => parseCoursePackFile('x'.repeat(1_050_000)), /large|1 MB/i);
  assert.throws(() => parseCoursePackFile('   '), /empty/i);
});

test('createCourseRegistry supports registering, listing, exporting, and unregistering CoursePacks', () => {
  const registry = createCourseRegistry();
  const { pack } = parseCoursePackFile(SAMPLE_MD_CLOSED_LOOP, { title: 'Deneme Paketi', id: 'deneme-1' });
  registry.registerCoursePack(pack);

  assert.ok(registry.getCoursePack('deneme-1'));
  assert.equal(registry.listCoursePacks().length, 1);
  assert.equal(resolveLocalizedText(registry.getCoursePack('deneme-1').title, 'tr'), 'Deneme Paketi');
  assert.match(registry.exportCoursePackJson('deneme-1'), /fark-course-pack/);

  const removed = registry.unregisterCoursePack('deneme-1');
  assert.equal(removed, true);
  assert.equal(registry.getCoursePack('deneme-1'), null);
  assert.equal(registry.listCoursePacks().length, 0);
});
