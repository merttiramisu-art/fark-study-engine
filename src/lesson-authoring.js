/**
 * FARK Lesson Designer V1.1 — narrowly scoped dependency-free round-trip adapter.
 * Learning evidence, remote APIs, script evaluation and browser storage are out of scope.
 * Call importOpenContentPack on EVERY generated/loaded pack before use or export.
 */
const TYPES = new Set(['none', 'fraction-comparison', 'number-line', 'timeline']);
const OWN = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
function value(input, field, max = 240) {
  if (typeof input !== 'string' || !input.trim() || input.length > max) {
    throw new TypeError(`${field}: 1–${max} karakter arasında metin gerekli`);
  }
  return input.trim();
}
function integer(input, field) {
  const text = String(input ?? '').trim();
  if (!/^-?(?:0|[1-9][0-9]*)$/.test(text)) throw new TypeError(`${field}: tam sayı gerekli`);
  const number = Number(text);
  if (!Number.isSafeInteger(number)) throw new RangeError(`${field}: sayı sınır dışında`);
  return number;
}
function visualFromForm(raw) {
  if (!raw || raw.kind === 'none') return undefined;
  if (!TYPES.has(raw.kind)) throw new RangeError('Desteklenmeyen görsel türü');
  if (raw.kind === 'fraction-comparison') {
    return {
      kind: raw.kind,
      left: { numerator: integer(raw.leftNumerator, 'Sol pay'), denominator: integer(raw.leftDenominator, 'Sol payda') },
      right: { numerator: integer(raw.rightNumerator, 'Sağ pay'), denominator: integer(raw.rightDenominator, 'Sağ payda') }
    };
  }
  if (raw.kind === 'number-line') {
    const points = value(raw.points, 'İşaretli sayılar', 120)
      .split(',').map(x => integer(x, 'İşaretli sayı'));
    return {kind: raw.kind, min: integer(raw.min, 'Başlangıç'), max: integer(raw.max, 'Bitiş'), points};
  }
  if (!Array.isArray(raw.events) || raw.events.length !== 2) {
    throw new RangeError('Bu tasarımcı zaman çizelgesinde tam iki olay düzenler');
  }
  return {kind: raw.kind, events: raw.events.map((event, index) => ({
    id: `event-${index + 1}`,
    year: integer(event.year, `Olay ${index + 1} yılı`),
    label: value(event.label, `Olay ${index + 1} açıklaması`)
  }))};
}
function makeQuestion(source, index) {
  const options = source?.choices;
  if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
    throw new RangeError(`Soru ${index + 1}: 2–4 seçenek gerekli`);
  }
  const choices = options.map((option, i) => ({
    id: 'abcd'[i], text: value(option, `Soru ${index + 1} / Seçenek ${i + 1}`, 1000)
  }));
  const selectedIndex = integer(source.correctIndex, `Soru ${index + 1} / Doğru seçenek`);
  if (selectedIndex < 0 || selectedIndex >= choices.length) {
    throw new RangeError(`Soru ${index + 1}: cevap anahtarı mevcut seçeneklerden biri olmalı`);
  }
  return {
    id: `question-${index + 1}`, revision: '1', outcomeIds: ['outcome-1'],
    prompt: value(source.prompt, `Soru ${index + 1} metni`, 2000),
    correctChoiceId: choices[selectedIndex].id, choices
  };
}
/**
 * V1.1 intentionally supports one unit/outcome/lesson and 1-2 questions.
 * This builds the EXISTING fark-open-content-pack v1 format; not a new core.
 */
export function buildLessonAuthoringPack(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    throw new TypeError('Ders taslağı bir nesne olmalı');
  }
  if (!Array.isArray(draft.questions) || draft.questions.length < 1 || draft.questions.length > 2) {
    throw new RangeError('1 veya 2 soru gerekli');
  }
  const lesson = {
    id: 'lesson-1', revision: '1', title: value(draft.lessonTitle, 'Ders başlığı'),
    outcomeIds: ['outcome-1'], bodyText: value(draft.lessonBody, 'Ders anlatımı', 10000)
  };
  const visual = visualFromForm(draft.visual);
  if (visual) lesson.visual = visual;
  return {
    format: 'fark-open-content-pack', version: 1,
    attribution: {
      title: value(draft.title, 'Paket başlığı'),
      creator: value(draft.creator, 'İçerik üreticisi'),
      license: value(draft.license, 'Lisans', 80)
    },
    units: [{id: 'unit-1', label: value(draft.unitLabel, 'Ünite')}],
    outcomes: [{id: 'outcome-1', unitId: 'unit-1', label: value(draft.outcomeLabel, 'Kazanım')}],
    lessons: [lesson],
    questions: draft.questions.map(makeQuestion),
    mappings: []
  };
}

function shape(row, allowed, label) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new TypeError(`${label}: nesne bekleniyor`);
  }
  const unknown = Object.keys(row).filter(key => !allowed.includes(key));
  if (unknown.length) throw new RangeError(`${label}: düzenleyicinin koruyamayacağı alan: ${unknown[0]}`);
  return row;
}
function rows(rows, count, label) {
  if (!Array.isArray(rows) || rows.length !== count) {
    throw new RangeError(`${label}: tasarımcının desteklemediği kayıt sayısı`);
  }
  return rows;
}
function exact(value, expected, label) {
  if (value !== expected) throw new RangeError(`${label}: tasarımcının desteklemediği kimlik veya sürüm`);
}
function oneOutcome(value, label) {
  if (!Array.isArray(value) || value.length !== 1 || value[0] !== 'outcome-1') {
    throw new RangeError(`${label}: tek kazanım bağlantısı bekleniyor`);
  }
}
function restoreVisual(raw) {
  if (raw === undefined) return {kind:'none'};
  shape(raw,['kind','left','right','min','max','points','events'],'Görsel');
  if (raw.kind === 'fraction-comparison') {
    shape(raw,['kind','left','right'],'Kesir görseli');
    shape(raw.left,['numerator','denominator'],'Sol kesir');
    shape(raw.right,['numerator','denominator'],'Sağ kesir');
    return {kind:raw.kind,leftNumerator:String(raw.left.numerator),leftDenominator:String(raw.left.denominator),
      rightNumerator:String(raw.right.numerator),rightDenominator:String(raw.right.denominator)};
  }
  if (raw.kind === 'number-line') {
    shape(raw,['kind','min','max','points'],'Sayı doğrusu');
    if (!Array.isArray(raw.points)) throw new TypeError('Sayı doğrusu noktaları geçersiz');
    return {kind:raw.kind,min:String(raw.min),max:String(raw.max),points:raw.points.join(',')};
  }
  if (raw.kind === 'timeline') {
    shape(raw,['kind','events'],'Zaman çizelgesi');
    return {kind:raw.kind,events:rows(raw.events,2,'Olaylar').map((event,i)=>{
      shape(event,['id','year','label'],`Olay ${i+1}`);
      exact(event.id,`event-${i+1}`,'Olay kimliği');
      return {year:String(event.year),label:event.label};
    })};
  }
  throw new RangeError('Görsel: desteklenmeyen tür');
}
/**
 * Restore only packs whose entire authored structure can be preserved by V1.1.
 * IMPORTER CALLER MUST first validate pack through importOpenContentPack.
 * Refusing unknown fields avoids silent loss of attribution, links, or corrections.
 */
export function restoreLessonAuthoringDraft(pack) {
  shape(pack,['format','version','attribution','units','outcomes','lessons','questions','mappings'],'Paket');
  exact(pack.format,'fark-open-content-pack','Paket biçimi');
  exact(pack.version,1,'Paket sürümü');
  const attribution=shape(pack.attribution,['title','creator','license'],'Kaynak ve lisans');
  const unit=shape(rows(pack.units,1,'Ünite')[0],['id','label'],'Ünite');
  exact(unit.id,'unit-1','Ünite kimliği');
  const outcome=shape(rows(pack.outcomes,1,'Kazanım')[0],['id','unitId','label'],'Kazanım');
  exact(outcome.id,'outcome-1','Kazanım kimliği');
  exact(outcome.unitId,'unit-1','Kazanım/ünite bağı');
  const lesson=shape(rows(pack.lessons,1,'Ders')[0],['id','revision','title','outcomeIds','bodyText','visual'],'Ders');
  exact(lesson.id,'lesson-1','Ders kimliği');
  exact(lesson.revision,'1','Ders revizyonu');
  oneOutcome(lesson.outcomeIds,'Ders bağlantısı');
  if (!Array.isArray(pack.mappings) || pack.mappings.length) {
    throw new RangeError('Harici öğrenci kartı eşleştirmesi bu tasarımcıda düzenlenmez');
  }
  if (!Array.isArray(pack.questions) || pack.questions.length < 1 || pack.questions.length > 2) {
    throw new RangeError('Bu tasarımcı yalnızca 1–2 soruyu düzenler');
  }
  const questions=pack.questions.map((source,index)=>{
    shape(source,['id','revision','outcomeIds','prompt','correctChoiceId','choices'],`Soru ${index+1}`);
    exact(source.id,`question-${index+1}`,'Soru kimliği');
    exact(source.revision,'1','Soru revizyonu');
    oneOutcome(source.outcomeIds,'Soru/kazanım bağlantısı');
    if (!Array.isArray(source.choices) || source.choices.length < 2 || source.choices.length > 4) {
      throw new RangeError(`Soru ${index+1}: 2–4 seçenek olmalı`);
    }
    const choices=source.choices.map((choice,i)=>{
      shape(choice,['id','text'],`Seçenek ${i+1}`);
      exact(choice.id,'abcd'[i],'Şık kimliği');
      return choice.text;
    });
    const correctIndex=source.choices.findIndex(choice=>choice.id===source.correctChoiceId);
    if (correctIndex<0) throw new RangeError('Soru cevap anahtarı bulunamadı');
    return {prompt:source.prompt,choices,correctIndex};
  });
  const draft={
    title:attribution.title,creator:attribution.creator,license:attribution.license,
    unitLabel:unit.label,outcomeLabel:outcome.label,lessonTitle:lesson.title,lessonBody:lesson.bodyText,
    visual:restoreVisual(lesson.visual), questions
  };
  // Preserve all supported authored values; fail closed if the pack cannot round-trip.
  const recreated=buildLessonAuthoringPack(draft);
  if (JSON.stringify(recreated) !== JSON.stringify(pack)) {
    // Order-insensitive comparison: key ordering must not cause data-loss rejection.
    const normalize=obj=>Array.isArray(obj)?obj.map(normalize):obj && typeof obj==='object'?
      Object.fromEntries(Object.keys(obj).sort().map(key=>[key,normalize(obj[key])])):obj;
    if (JSON.stringify(normalize(recreated))!==JSON.stringify(normalize(pack))) {
      throw new RangeError('Paket içeriği kayıpsız düzenlenemiyor; orijinal dosyan korunuyor');
    }
  }
  return draft;
}
