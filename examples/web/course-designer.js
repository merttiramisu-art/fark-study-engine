/** FARK Course Designer V1.2: local, memory-only, safe DOM authoring. */
import {buildCourseAuthoringPack,restoreCourseAuthoringDraft,addCourseEntity,removeCourseEntity,COURSE_DESIGNER_LIMITS} from '../../src/course-authoring.js';
import {importOpenContentPack} from '../../src/content-adapter.js';
const $=id=>document.getElementById(id);
const GROUPS=[['unit','units','Üniteler'],['outcome','outcomes','Kazanımlar'],['lesson','lessons','Dersler'],['question','questions','Sorular']];
const SAMPLE={
  format:'fark-open-content-pack',version:1,
  attribution:{title:'Özgün Sayılar Atölyesi',creator:'FARK örnek eğitimci',license:'MIT'},
  units:[{id:'fractions',label:'Kesirleri anlamak'},{id:'numbers',label:'Sayı doğrusu'}],
  outcomes:[{id:'unit-fractions',unitId:'fractions',label:'Birim kesirleri tanır'},
    {id:'fraction-compare',unitId:'fractions',label:'Birim kesirleri karşılaştırır',prerequisiteIds:['unit-fractions']},
    {id:'number-order',unitId:'numbers',label:'Tam sayıları sıralar'}],
  lessons:[{id:'fractions-lesson',revision:'1',title:'Parça sayısı ve büyüklük',outcomeIds:['unit-fractions','fraction-compare'],
    bodyText:'Bir bütünü eşit parçalara ayırdığımızda, parça sayısı arttıkça her bir parça küçülür. Örnek: 1/3, 1/4’ten büyüktür.',
    visual:{kind:'fraction-comparison',left:{numerator:1,denominator:3},right:{numerator:1,denominator:4}}},
    {id:'numbers-lesson',revision:'1',title:'Sayı doğrusunda sıra',outcomeIds:['number-order'],
    bodyText:'Sağa doğru gidildikçe tam sayılar büyür. Örneğin −2, 1’den küçüktür.',
    visual:{kind:'number-line',min:-5,max:5,points:[-2,1,4]}}],
  questions:[{id:'q-unit',revision:'1',outcomeIds:['unit-fractions'],prompt:'Bütünü dört eşit parçaya ayırırsan her parçanın adı nedir?',correctChoiceId:'a',choices:[{id:'a',text:'Bir çeyrek'},{id:'b',text:'Bir yarım'}]},
    {id:'q-compare',revision:'1',outcomeIds:['fraction-compare'],prompt:'Hangi birim kesir büyüktür?',correctChoiceId:'a',choices:[{id:'a',text:'1/3'},{id:'b',text:'1/4'}]},
    {id:'q-order',revision:'1',outcomeIds:['number-order'],prompt:'Hangi sayı daha büyüktür?',correctChoiceId:'b',choices:[{id:'a',text:'−2'},{id:'b',text:'1'}]}],
  mappings:[]
};
let draft=restoreCourseAuthoringDraft(SAMPLE);
let selected={kind:'lesson',id:'fractions-lesson'};
let validated=null;
const element=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e;};
function msg(message,isError=false){$('editor-status').textContent=isError?'Dışa aktarma durduruldu.':'Yerel taslak: '+message; $('editor-error').hidden=!isError; if(isError)$('editor-error').textContent=message;}
function invalidate(){
  validated=null;
  $('download-course').disabled=true;
  $('preview-badge').textContent='Taslak değişti';
  $('preview-content').replaceChildren(element('p','Değişikliklerden sonra yeniden doğrula. Eski önizleme gösterilmez.','placeholder'));
  msg('değişti; önizleme için yeniden doğrula.');
}
function field(parent,labelText,value,onChange,{type='text',rows=0,readOnly=false,maxlength,placeholder}={}){
  const label=element('label',undefined,'field');
  label.append(element('span',labelText));
  const input=element(rows?'textarea':'input');
  if(rows)input.rows=rows;
  else input.type=type;
  input.value=String(value??'');input.readOnly=readOnly;
  if(maxlength)input.maxLength=maxlength;
  if(placeholder)input.placeholder=placeholder;
  if(onChange)input.addEventListener('input',()=>{onChange(input.value);invalidate();});
  label.append(input);parent.append(label);return input;
}
function select(parent,labelText,choices,value,onChange){
  const label=element('label',undefined,'field');label.append(element('span',labelText));
  const input=element('select');
  for(const [v,t] of choices){const o=element('option',t);o.value=v;input.append(o);}
  input.value=value;
  input.addEventListener('change',()=>{onChange(input.value);invalidate();renderNavigation();renderStats();});
  label.append(input);parent.append(label);return input;
}
function heading(parent,text){parent.append(element('h3',text,'subhead'));}
function action(parent,label,handler,cls='mini'){
  const b=element('button',label,cls);b.type='button';b.addEventListener('click',()=>{
    try{handler();invalidate();renderAll();}catch(error){msg(error.message,true);}
  });parent.append(b);return b;
}
function linkChoices(parent,labelText,available,entry,key){
  heading(parent,labelText);
  const group=element('div',undefined,'checks');
  if(!available.length)group.append(element('span','Bağlanabilecek başka kayıt yok.','empty-choice'));
  for(const candidate of available){
    const wrapper=element('label');const cb=element('input');cb.type='checkbox';cb.value=candidate.id;
    cb.checked=(entry[key]??[]).includes(candidate.id);
    cb.addEventListener('change',()=>{
      if(!Object.hasOwn(entry,key))entry[key]=[];
      if(cb.checked){if(!entry[key].includes(candidate.id))entry[key].push(candidate.id);}
      else entry[key]=entry[key].filter(x=>x!==candidate.id);
      invalidate();
    });
    wrapper.append(cb,document.createTextNode(candidate.label??candidate.title??candidate.prompt??candidate.id));group.append(wrapper);
  }
  parent.append(group);
}
function visualDefault(kind){
  if(kind==='fraction-comparison')return {kind,left:{numerator:1,denominator:3},right:{numerator:1,denominator:4}};
  if(kind==='number-line')return {kind,min:-5,max:5,points:[-2,1]};
  if(kind==='timeline')return {kind,events:[{id:'event-1',year:2000,label:'Kurgu başlangıç'},{id:'event-2',year:2010,label:'Kurgu devam'}]};
  return undefined;
}
function n(value){return value.trim()===''?Number.NaN:Number(value);}
function renderVisualEditor(parent,lesson){
  heading(parent,'Görsel model');
  const kinds=[['none','Görsel kullanma'],['fraction-comparison','Kesir karşılaştırması'],['number-line','Sayı doğrusu'],['timeline','Zaman çizelgesi']];
  select(parent,'Görsel türü',kinds,lesson.visual?.kind??'none',kind=>{
    if(kind==='none')delete lesson.visual;else lesson.visual=visualDefault(kind);
    renderEditor();
  });
  const v=lesson.visual;if(!v)return;
  const area=element('div',undefined,'visual-options');
  if(v.kind==='fraction-comparison'){
    for(const [key,title] of [['left','Sol kesir'],['right','Sağ kesir']]){
      heading(area,title);const wrap=element('div',undefined,'two');
      field(wrap,'Pay',v[key].numerator,x=>v[key].numerator=n(x),{type:'number'});
      field(wrap,'Payda',v[key].denominator,x=>v[key].denominator=n(x),{type:'number'});
      area.append(wrap);
    }
  }else if(v.kind==='number-line'){
    const wrap=element('div',undefined,'two');
    field(wrap,'Başlangıç',v.min,x=>v.min=n(x),{type:'number'});
    field(wrap,'Bitiş',v.max,x=>v.max=n(x),{type:'number'});area.append(wrap);
    field(area,'Noktalar (virgülle)',v.points.join(','),x=>v.points=x.split(',').map(n),{placeholder:'-3,0,4'});
  }else if(v.kind==='timeline'){
    const list=element('div',undefined,'event-list');
    for(const ev of v.events){
      const row=element('div',undefined,'event-row');const top=element('div',undefined,'row-actions');top.append(element('strong',ev.id,'badge-id'));
      if(v.events.length>2)action(top,'Olayı kaldır',()=>{v.events=v.events.filter(e=>e.id!==ev.id);},'danger mini');row.append(top);
      const wrap=element('div',undefined,'two');field(wrap,'Yıl',ev.year,x=>ev.year=n(x),{type:'number'});field(wrap,'Olay adı',ev.label,x=>ev.label=x,{maxlength:120});row.append(wrap);list.append(row);
    }
    area.append(list);
    if(v.events.length<8)action(area,'+ Olay ekle',()=>{let i=1;while(v.events.some(e=>e.id==='event-'+i))i++;v.events.push({id:'event-'+i,year:2020,label:'Özgün olay'});});
    area.append(element('p','Örnek olaylar tarihsel doğruluk kanıtı değildir.','help'));
  }
  parent.append(area);
}
function renderQuestionEditor(parent,q){
  field(parent,'Soru kökü',q.prompt,v=>q.prompt=v,{rows:3,maxlength:2000});
  field(parent,'Soru revizyonu',q.revision,v=>q.revision=v,{maxlength:80});
  linkChoices(parent,'Soru hangi kazanımları ölçüyor?',draft.outcomes,q,'outcomeIds');
  heading(parent,'Seçenekler ve yanılgılar');
  const list=element('div',undefined,'choices');
  for(const choice of q.choices){
    const row=element('div',undefined,'choice-row');const top=element('div',undefined,'row-actions');top.append(element('strong',choice.id.toUpperCase(),'badge-id'));
    if(q.choices.length>2)action(top,'Şıkkı kaldır',()=>{
      q.choices=q.choices.filter(c=>c.id!==choice.id);
      if(q.correctChoiceId===choice.id)q.correctChoiceId=q.choices[0].id;
    },'danger mini');row.append(top);
    field(row,'Şık metni',choice.text,v=>choice.text=v,{maxlength:1000});
    field(row,'Yanılgı kimliği (isteğe bağlı)',choice.misconceptionId??'',v=>{
      if(v)choice.misconceptionId=v;else delete choice.misconceptionId;
    },{maxlength:80});
    list.append(row);
  }
  parent.append(list);
  if(q.choices.length<8)action(parent,'+ Şık ekle',()=>{
    let i=0;while(q.choices.some(c=>c.id==='abcdefgh'[i]))i++;
    q.choices.push({id:'abcdefgh'[i],text:'Yeni seçenek'});
  });
  select(parent,'Doğru cevap',q.choices.map(c=>[c.id,c.id.toUpperCase()+' — '+c.text]),q.correctChoiceId,v=>q.correctChoiceId=v);
}
function current(){const [,plural]=GROUPS.find(([k])=>k===selected.kind)??[];return draft[plural]?.find(e=>e.id===selected.id);}
function renderEditor(){
  const wrap=$('editor-fields');wrap.replaceChildren();const e=current();if(!e){$('editor-heading').textContent='Kayıt bulunamadı';return;}
  const label={unit:'Ünite',outcome:'Kazanım',lesson:'Ders',question:'Soru'}[selected.kind];
  $('editor-heading').textContent=label+' · '+e.id;
  field(wrap,'Değişmez kimlik',e.id,null,{readOnly:true});
  if(selected.kind==='unit'){
    field(wrap,'Ünite adı',e.label,v=>e.label=v,{maxlength:240});
    linkChoices(wrap,'Ön koşul üniteler',draft.units.filter(u=>u.id!==e.id),e,'prerequisiteIds');
  }else if(selected.kind==='outcome'){
    field(wrap,'Kazanım adı',e.label,v=>e.label=v,{maxlength:240});
    select(wrap,'Bağlı olduğu ünite',draft.units.map(u=>[u.id,u.label]),e.unitId,v=>e.unitId=v);
    linkChoices(wrap,'Ön koşul kazanımlar',draft.outcomes.filter(o=>o.id!==e.id),e,'prerequisiteIds');
  }else if(selected.kind==='lesson'){
    field(wrap,'Ders başlığı',e.title,v=>e.title=v,{maxlength:240});
    field(wrap,'Sürüm / revizyon',e.revision,v=>e.revision=v,{maxlength:80});
    linkChoices(wrap,'Bu dersin bağlandığı kazanımlar',draft.outcomes,e,'outcomeIds');
    field(wrap,'Ders anlatımı (düz metin)',e.bodyText,v=>e.bodyText=v,{rows:9,maxlength:10000});
    field(wrap,'Yanılgı kimlikleri (virgülle, isteğe bağlı)',(e.misconceptionIds??[]).join(','),v=>{
      if(v.trim())e.misconceptionIds=v.split(',').map(s=>s.trim());else delete e.misconceptionIds;
    });
    renderVisualEditor(wrap,e);
  }else if(selected.kind==='question')renderQuestionEditor(wrap,e);
  $('remove-record').disabled=['unit','outcome','question'].includes(selected.kind) && draft[GROUPS.find(([k])=>k===selected.kind)[1]].length===1;
}
function renderNavigation(){
  const nav=$('entity-navigation');nav.replaceChildren();
  for(const [kind,plural,label] of GROUPS){
    const group=element('section',undefined,'group');const head=element('div',undefined,'group-head');
    head.append(element('h3',label+' ('+draft[plural].length+')'));
    const plus=element('button','+ Ekle','add');plus.type='button';plus.setAttribute('aria-label',label+' ekle');
    plus.addEventListener('click',()=>{try{const updated=addCourseEntity(draft,kind);draft=updated.draft;selected={kind,id:updated.selectedId};invalidate();renderAll();}catch(e){msg(e.message,true);}});
    head.append(plus);group.append(head);
    const items=element('div',undefined,'items');
    for(const entry of draft[plural]){
      const b=element('button',undefined,'item'+(selected.kind===kind&&selected.id===entry.id?' active':''));b.type='button';
      b.setAttribute('aria-pressed',String(selected.kind===kind&&selected.id===entry.id));
      b.append(element('strong',entry.label??entry.title??entry.prompt??entry.id),element('span',entry.id));
      b.addEventListener('click',()=>{selected={kind,id:entry.id};renderNavigation();renderEditor();});items.append(b);
    }
    group.append(items);nav.append(group);
  }
}
function renderMeta(){
  const meta=$('meta-fields');meta.replaceChildren();
  for(const [prop,title,max] of [['title','Paket adı',240],['creator','İçerik üreticisi',240],['license','Lisans / kullanım izni',80]]){
    field(meta,title,draft.attribution[prop],v=>draft.attribution[prop]=v,{maxlength:max});
  }
  field(meta,'Kaynak URL (isteğe bağlı)',draft.attribution.sourceUrl??'',v=>{
    if(v)draft.attribution.sourceUrl=v;else delete draft.attribution.sourceUrl;
  },{maxlength:2000,placeholder:'https://...'});
}
function renderStats(){
  $('stats').textContent=`${draft.units.length} ünite · ${draft.outcomes.length} kazanım · ${draft.lessons.length} ders · ${draft.questions.length} soru`;
}
function renderAll(){renderStats();renderMeta();renderNavigation();renderEditor();}
function renderVisual(parent,raw){
  if(!raw)return;
  const stage=element('div',undefined,'visual-preview');stage.append(element('strong','Dersin görsel modeli'));
  if(raw.kind==='fraction-comparison'){
    for(const f of [raw.left,raw.right]){
      stage.append(element('p',`${f.numerator}/${f.denominator}`));const bar=element('div',undefined,'fraction-bar');
      for(let i=0;i<f.denominator;i++)bar.append(element('i',undefined,i<f.numerator?'filled':''));stage.append(bar);
    }
  }else if(raw.kind==='number-line'){
    const ol=element('ol',undefined,'number-ticks');ol.setAttribute('aria-label','İşaretli noktalar: '+raw.points.join(', '));
    for(let i=raw.min;i<=raw.max;i++)ol.append(element('li',String(i),raw.points.includes(i)?'marked':''));stage.append(ol);
  }else if(raw.kind==='timeline'){
    const ol=element('ol',undefined,'timeline');for(const item of raw.events)ol.append(element('li',item.year+' — '+item.label));stage.append(ol);
  }
  parent.append(stage);
}
function renderPreview(pack,imported){
  const root=$('preview-content');root.replaceChildren();
  root.append(element('p',`Yazar: ${pack.attribution.creator} · ${pack.attribution.license}`,'pill'));
  root.append(element('h3',pack.attribution.title));
  let lesson=pack.lessons.find(l=>l.id===selected.id&&selected.kind==='lesson')??pack.lessons[0];
  if(selected.kind==='outcome')lesson=pack.lessons.find(l=>l.outcomeIds.includes(selected.id))??lesson;
  if(selected.kind==='question')lesson=pack.lessons.find(l=>l.outcomeIds.some(id=>pack.questions.find(q=>q.id===selected.id)?.outcomeIds.includes(id)))??lesson;
  if(!lesson){root.append(element('p','Bu pakette anlatımlı ders henüz yok.','placeholder'));}
  else{
    const teaching=imported.materials.lessons.find(l=>l.id===lesson.id);
    root.append(element('p',lesson.outcomeIds.map(id=>pack.outcomes.find(o=>o.id===id)?.label??id).join(' · '),'pill'));
    root.append(element('h3',teaching.title),element('p',teaching.bodyText));
    renderVisual(root,teaching.visual);
  }
  root.append(element('h3','Özgün sorular ('+pack.questions.length+')'));
  for(const question of imported.materials.questions){
    root.append(element('h4',question.prompt));const ul=element('ul');
    for(const c of question.choices)ul.append(element('li',c.id.toUpperCase()+'. '+c.text));root.append(ul);
  }
  root.append(element('p','Cevap anahtarları ve öğrenme geçmişi öğrenci önizlemesinde açıklanmaz.','help'));
  $('preview-badge').textContent='Doğrulandı';
}
function validate(){
  try{
    const pack=buildCourseAuthoringPack(draft);
    const imported=importOpenContentPack(pack);
    validated=pack;
    renderPreview(pack,imported);
    $('download-course').disabled=false;
    $('editor-error').hidden=true;
    msg(`Doğrulandı: ${pack.units.length} ünite, ${pack.outcomes.length} kazanım, ${pack.lessons.length} ders, ${pack.questions.length} soru. JSON indirilebilir.`);
  }catch(error){
    invalidate();
    $('preview-badge').textContent='Hatalı taslak';
    $('preview-content').replaceChildren(element('p','Hatalı içerik gösterilmez; dosya oluşturulmadı.','placeholder'));
    msg('Doğrulama reddedildi: '+error.message,true);
  }
}
async function importFile(){
  const control=$('import-course'),file=control.files?.[0];if(!file)return;
  try{
    if(file.size>COURSE_DESIGNER_LIMITS.maxBytes)throw new RangeError('Dosya 1 MiB sınırını aşıyor');
    const source=await file.text();
    if(new TextEncoder().encode(source).length>COURSE_DESIGNER_LIMITS.maxBytes)throw new RangeError('Dosya 1 MiB sınırını aşıyor');
    const parsed=JSON.parse(source);
    importOpenContentPack(parsed); // canonical check BEFORE changing the current working draft.
    const restored=restoreCourseAuthoringDraft(parsed);
    importOpenContentPack(buildCourseAuthoringPack(restored));
    draft=restored;selected={kind:'lesson',id:draft.lessons[0]?.id??draft.questions[0].id};
    if(!draft.lessons.length)selected.kind='question';
    invalidate();renderAll();validate();msg('Dosya kayıpsız açıldı ve yeniden doğrulandı.');
  }catch(error){msg('Dosya açılmadı. Eski taslak korunuyor: '+error.message,true);}
  finally{control.value='';}
}
function download(){
  if(!validated)return;
  const content=JSON.stringify(validated,null,2)+'\n';
  const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
  const anchor=element('a');anchor.href=url;anchor.download='fark-original-course-pack.json';
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  msg('JSON indirme isteği oluşturuldu. Dosya cihazında saklanabilir.');
}
$('remove-record').addEventListener('click',()=>{
  try{draft=removeCourseEntity(draft,selected.kind,selected.id);
    const plural=GROUPS.find(([k])=>k===selected.kind)[1];selected.id=draft[plural][0]?.id??draft.outcomes[0].id;
    if(!draft[plural].length)selected={kind:'outcome',id:draft.outcomes[0].id};
    invalidate();renderAll();
  }catch(error){msg('Silme reddedildi: '+error.message,true);}
});
$('validate-course').addEventListener('click',validate);
$('download-course').addEventListener('click',download);
$('import-course').addEventListener('change',importFile);
renderAll();
