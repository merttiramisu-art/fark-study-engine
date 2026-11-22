/**
 * Form-based original lesson authoring, local-only and memory-only.
 * The canonical adapter validates every pack before preview or file export.
 * User text is always inserted with textContent, never innerHTML.
 */
import {buildLessonAuthoringPack,restoreLessonAuthoringDraft} from '../../src/lesson-authoring.js';
import {importOpenContentPack} from '../../src/content-adapter.js';

const $ = id => document.getElementById(id);
const text = id => $(id).value;
const node = (tag, value, className='') => {
  const element = document.createElement(tag);
  if (value !== undefined) element.textContent = value;
  if (className) element.className = className;
  return element;
};
let validated = null;

function question(prefix) {
  const choices = ['a','b','c','d'].map(letter => text(`${prefix}-${letter}`));
  while (choices.length && !choices.at(-1).trim()) choices.pop();
  return {prompt:text(`${prefix}-prompt`), choices, correctIndex:text(`${prefix}-correct`)};
}
function visual() {
  const kind = text('visual-kind');
  if (kind === 'fraction-comparison') return {
    kind, leftNumerator:text('ln'), leftDenominator:text('ld'),
    rightNumerator:text('rn'), rightDenominator:text('rd')
  };
  if (kind === 'number-line') return {kind,min:text('min'),max:text('max'),points:text('points')};
  if (kind === 'timeline') return {kind,events:[
    {year:text('year1'),label:text('event1')},
    {year:text('year2'),label:text('event2')}
  ]};
  return {kind:'none'};
}
function draft() {
  return {
    title:text('pack-title'), creator:text('creator'),license:text('license'),
    unitLabel:text('unit'),outcomeLabel:text('outcome'),
    lessonTitle:text('lesson-title'), lessonBody:text('lesson-body'),
    visual:visual(),
    questions: $('second-question').checked ? [question('q1'),question('q2')] : [question('q1')]
  };
}
function appendText(parent,tag,textValue,className='') {
  const element=node(tag,textValue,className);
  parent.append(element);
  return element;
}
function renderVisual(parent, visualData) {
  if (!visualData) return;
  const stage=node('div',undefined,'preview-visual');
  if (visualData.kind === 'fraction-comparison') {
    for (const side of [visualData.left,visualData.right]) {
      const row=node('div',undefined,'fraction-line');
      appendText(row,'span',`${side.numerator}/${side.denominator}`);
      const bar=node('div',undefined,'fraction-bar');
      bar.setAttribute('role','img');
      bar.setAttribute('aria-label',`${side.denominator} eşit parçadan ${side.numerator} boyalı`);
      for (let i=0;i<side.denominator;i++) bar.append(node('b',undefined,i<side.numerator?'filled':''));
      row.append(bar);
      stage.append(row);
    }
  } else if (visualData.kind === 'number-line') {
    appendText(stage,'strong',`Sayı doğrusu: ${visualData.min} → ${visualData.max}`);
    const line=node('ol',undefined,'number-ticks');
    line.setAttribute('aria-label',`Sayı doğrusu. İşaretli noktalar: ${visualData.points.join(', ')}`);
    const selected=new Set(visualData.points);
    for(let n=visualData.min;n<=visualData.max;n++) {
      const tick=node('li',String(n),selected.has(n)?'picked':'');
      if(selected.has(n)) tick.setAttribute('aria-label',`${n}, işaretli`);
      line.append(tick);
    }
    stage.append(line);
    appendText(stage,'p',`İşaretli noktalar: ${visualData.points.join(', ')}`);
  } else if (visualData.kind === 'timeline') {
    const list=node('ol');
    for (const event of visualData.events) appendText(list,'li',`${event.year} — ${event.label}`);
    stage.append(list);
  }
  parent.append(stage);
}
function renderPreview(pack, imported) {
  const main=$('preview-content');main.replaceChildren();
  appendText(main,'span',imported.core.units[0].label,'eyebrow');
  appendText(main,'h3',imported.materials.lessons[0].title);
  appendText(main,'p',`Kazanım: ${imported.core.outcomes[0].label}`);
  appendText(main,'p',imported.materials.lessons[0].bodyText);
  renderVisual(main,imported.materials.lessons[0].visual);
  for (const item of imported.materials.questions) {
    appendText(main,'h4',item.prompt);
    const list=node('ul',undefined,'preview-choices');
    for (const answer of item.choices) {
      const choice=node('li');
      const prefix=node('strong',`${answer.id.toUpperCase()}. `);
      choice.append(prefix,document.createTextNode(answer.text));
      list.append(choice);
    }
    main.append(list);
  }
  appendText(main,'p','Doğru cevaplar içerik paketinde saklıdır; öğrenci önizlemesinde gösterilmez.');
  $('preview-state').textContent='Doğrulandı';
  $('preview-state').className='preview-tag ok';
}
function showUnvalidated(message) {
  const main=$('preview-content');
  main.replaceChildren(node('p',message,'empty'));
}
function invalidate() {
  validated=null;
  showUnvalidated('Taslak değişti. Güncel içeriği görmek için tekrar doğrula.');
  $('download').disabled=true;
  $('preview-state').textContent='Taslak değişti';
  $('preview-state').className='preview-tag';
  $('designer-status').textContent='Değişiklikleri önizlemek ve dışa aktarmak için tekrar doğrula.';
  $('designer-error').hidden=true;
}
function validate(event) {
  event.preventDefault();
  try {
    const pack=buildLessonAuthoringPack(draft());
    const imported=importOpenContentPack(pack);
    validated=pack;
    renderPreview(pack,imported);
    $('designer-error').hidden=true;
    $('download').disabled=false;
    $('designer-status').textContent=`Doğrulandı: ${pack.outcomes.length} kazanım, ${pack.lessons.length} ders, ${pack.questions.length} soru. Yalnızca bu cihazda bellekte tutuluyor.`;
  } catch(error) {
    validated=null;
    $('download').disabled=true;
    $('designer-error').textContent='İçerik doğrulanamadı: '+error.message;
    $('designer-error').hidden=false;
    $('designer-status').textContent='Dışa aktarma durduruldu; önce hatayı düzelt.';
    showUnvalidated('Son doğrulama başarısız. Hatalı taslak önizlenmez.');
    $('preview-state').textContent='Son doğrulama başarısız';
    $('preview-state').className='preview-tag';
  }
}
function download() {
  if (!validated) return;
  const content=JSON.stringify(validated,null,2)+'\n';
  const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='fark-original-lesson-pack.json';
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  $('designer-status').textContent='İndirme isteği oluşturuldu. JSON dosyasını açıp içeriğini Ders Deneyimi sayfasındaki içerik alanına yapıştırabilirsin.';
}
function updateVisual() {
  const kind=text('visual-kind');
  $('visual-fraction').hidden=kind!=='fraction-comparison';
  $('visual-number').hidden=kind!=='number-line';
  $('visual-timeline').hidden=kind!=='timeline';
}
function fillDraft(restored) {
  const fields={
    'pack-title':restored.title, creator:restored.creator, license:restored.license,
    unit:restored.unitLabel, outcome:restored.outcomeLabel,
    'lesson-title':restored.lessonTitle, 'lesson-body':restored.lessonBody
  };
  for(const [id,val] of Object.entries(fields)) $(id).value=val;
  $('visual-kind').value=restored.visual.kind;
  if(restored.visual.kind==='fraction-comparison') {
    for(const [id,val] of Object.entries({
      ln:restored.visual.leftNumerator,ld:restored.visual.leftDenominator,
      rn:restored.visual.rightNumerator,rd:restored.visual.rightDenominator
    })) $(id).value=val;
  } else if(restored.visual.kind==='number-line') {
    for(const [id,val] of Object.entries({
      min:restored.visual.min,max:restored.visual.max,points:restored.visual.points
    })) $(id).value=val;
  } else if(restored.visual.kind==='timeline') {
    restored.visual.events.forEach((event,i)=>{
      $(`year${i+1}`).value=event.year;
      $(`event${i+1}`).value=event.label;
    });
  }
  updateVisual();
  $('second-question').checked=restored.questions.length===2;
  $('question-two').hidden=restored.questions.length!==2;
  restored.questions.forEach((item,i)=>{
    const prefix=`q${i+1}`;
    $(`${prefix}-prompt`).value=item.prompt;
    for(let n=0;n<4;n++) $(`${prefix}-${'abcd'[n]}`).value=item.choices[n]??'';
    $(`${prefix}-correct`).value=String(item.correctIndex);
  });
}
async function importFile() {
  const input=$('import-file');
  const file=input.files?.[0];
  if(!file) return;
  $('import-error').hidden=true;
  $('import-status').textContent='Seçilen dosya doğrulanıyor…';
  try {
    if(file.size>1048576) throw new RangeError('Dosya 1 MiB sınırını aşıyor');
    const content=await file.text();
    if(new TextEncoder().encode(content).length>1048576) throw new RangeError('Dosya 1 MiB sınırını aşıyor');
    const pack=JSON.parse(content);
    // Canonical validation happens BEFORE any form field changes.
    importOpenContentPack(pack);
    const restored=restoreLessonAuthoringDraft(pack);
    // Validate the regenerated authoring output before touching existing form fields.
    importOpenContentPack(buildLessonAuthoringPack(restored));
    fillDraft(restored);
    invalidate();
    validate({preventDefault(){}});
    if(!validated) throw new Error('İçe aktarılan dosya form doğrulamasından geçemedi');
    $('import-status').textContent='Ders açıldı ve yeniden doğrulandı. Dilersen düzenleyip tekrar JSON indirebilirsin.';
  } catch(error) {
    $('import-error').textContent='İçe aktarma reddedildi: '+error.message;
    $('import-error').hidden=false;
    $('import-status').textContent='Dosya yüklenmedi. Geçerli taslak korunur.';
  } finally { input.value=''; }
}
$('import-file').addEventListener('change',importFile);
$('designer-form').addEventListener('submit',validate);
$('designer-form').addEventListener('input',invalidate);
$('designer-form').addEventListener('change',invalidate);
$('visual-kind').addEventListener('change',updateVisual);
$('second-question').addEventListener('change',()=>{$('question-two').hidden=!$('second-question').checked;});
$('download').addEventListener('click',download);
updateVisual();
