/**
 * FARK Course Designer V1.2 — bounded, lossless multi-entity authoring contract.
 * Creates the EXISTING fark-open-content-pack v1, never an alternative knowledge core.
 * This module is UI-agnostic, offline and has no dependencies. The caller MUST run
 * importOpenContentPack(pack) before preview/export to check graph and visual rules.
 */
const MAX_BYTES=1_048_576;
export const COURSE_DESIGNER_LIMITS=Object.freeze({maxBytes:MAX_BYTES,units:20,outcomes:80,lessons:100,questions:120});
const ID=/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
function record(x,keys,name) {
  if(!x||typeof x!=='object'||Array.isArray(x))throw new TypeError(name+': nesne gerekli');
  const extra=Object.keys(x).find(k=>!keys.includes(k));
  if(extra!==undefined)throw new RangeError(name+': desteklenmeyen alan '+extra+'; veri kaybı önlendi');
  return x;
}
function string(x,name,max=240) {
  if(typeof x!=='string'||!x.trim()||x.length>max||x.trim()!==x) {
    throw new TypeError(name+': boş olmayan, kenar boşluksuz, en fazla '+max+' karakter gerekli');
  }
  return x;
}
function id(x,name){string(x,name,80);if(!ID.test(x))throw new RangeError(name+': geçersiz kimlik');return x;}
function rows(x,name,min,max){if(!Array.isArray(x)||x.length<min||x.length>max)throw new RangeError(name+': '+min+'–'+max+' kayıt gerekli');return x;}
function idList(x,name,min=0,max=1000){
  const result=rows(x,name,min,max).map((v,i)=>id(v,name+'['+i+']'));
  if(new Set(result).size!==result.length)throw new RangeError(name+': yinelenen bağlantı');
  return result;
}
function unique(x,name){if(new Set(x.map(o=>o.id)).size!==x.length)throw new RangeError(name+': yinelenen kimlik');return x;}
function visual(x){
  record(x,['kind','left','right','min','max','points','events'],'Görsel');
  switch(x.kind){
    case 'fraction-comparison':{
      record(x,['kind','left','right'],'Kesir görseli');
      const frac=(o,k)=>{record(o,['numerator','denominator'],k);if(!Number.isSafeInteger(o.numerator)||!Number.isSafeInteger(o.denominator))throw new RangeError(k+': tam sayı gerekli');return {...o};};
      return {kind:x.kind,left:frac(x.left,'Sol kesir'),right:frac(x.right,'Sağ kesir')};
    }
    case 'number-line':{
      record(x,['kind','min','max','points'],'Sayı doğrusu');
      if(!Number.isSafeInteger(x.min)||!Number.isSafeInteger(x.max))throw new RangeError('Sayı doğrusu: tam sayı gerekli');
      const points=rows(x.points,'Sayı doğrusu noktaları',1,8).map((v,i)=>{if(!Number.isSafeInteger(v))throw new TypeError('Nokta '+i+': tam sayı gerekli');return v;});
      return {kind:x.kind,min:x.min,max:x.max,points};
    }
    case 'timeline': {
      record(x,['kind','events'],'Zaman çizelgesi');
      return {kind:x.kind,events:unique(rows(x.events,'Zaman çizelgesi olayları',2,8).map((event,i)=>{
        record(event,['id','year','label'],'Olay '+i);
        if(!Number.isSafeInteger(event.year))throw new TypeError('Olay yılı: tam sayı gerekli');
        return {id:id(event.id,'Olay kimliği'),year:event.year,label:string(event.label,'Olay etiketi',120)};
      }),'Olaylar')};
    }
    default:throw new RangeError('Görsel türü desteklenmiyor');
  }
}
function cloneAndValidate(input) {
  record(input,['format','version','attribution','units','outcomes','lessons','questions','mappings'],'Paket');
  if(input.format!=='fark-open-content-pack'||input.version!==1)throw new RangeError('Desteklenmeyen içerik paketi sürümü');
  record(input.attribution,['title','creator','license','sourceUrl'],'Atıf');
  const attribution={title:string(input.attribution.title,'Paket adı'),creator:string(input.attribution.creator,'Üretici'),license:string(input.attribution.license,'Lisans',80)};
  if(own(input.attribution,'sourceUrl')){
    const url=string(input.attribution.sourceUrl,'Kaynak URL',2000);
    let parsed;try{parsed=new URL(url);}catch{throw new RangeError('Kaynak URL geçersiz');}
    if(parsed.protocol!=='https:')throw new RangeError('Kaynak URL HTTPS olmalı');
    attribution.sourceUrl=url;
  }
  const units=unique(rows(input.units,'Üniteler',1,COURSE_DESIGNER_LIMITS.units).map((u,i)=>{
    record(u,['id','label','prerequisiteIds'],'Ünite '+i);
    return {id:id(u.id,'Ünite kimliği'),label:string(u.label,'Ünite adı'),...(own(u,'prerequisiteIds')?{prerequisiteIds:idList(u.prerequisiteIds,'Ünite ön koşulları')}: {})};
  }),'Üniteler');
  const outcomes=unique(rows(input.outcomes,'Kazanımlar',1,COURSE_DESIGNER_LIMITS.outcomes).map((o,i)=>{
    record(o,['id','unitId','label','prerequisiteIds'],'Kazanım '+i);
    return {id:id(o.id,'Kazanım kimliği'),unitId:id(o.unitId,'Kazanım ünitesi'),label:string(o.label,'Kazanım adı'),...(own(o,'prerequisiteIds')?{prerequisiteIds:idList(o.prerequisiteIds,'Kazanım ön koşulları')}: {})};
  }),'Kazanımlar');
  const lessons=unique(rows(input.lessons,'Dersler',0,COURSE_DESIGNER_LIMITS.lessons).map((l,i)=>{
    record(l,['id','revision','title','outcomeIds','bodyText','visual','misconceptionIds'],'Ders '+i);
    return {id:id(l.id,'Ders kimliği'),revision:id(l.revision,'Ders sürümü'),title:string(l.title,'Ders başlığı'),outcomeIds:idList(l.outcomeIds,'Ders kazanımları',1),bodyText:string(l.bodyText,'Ders anlatımı',10000),
      ...(own(l,'visual')?{visual:visual(l.visual)}:{}),
      ...(own(l,'misconceptionIds')?{misconceptionIds:idList(l.misconceptionIds,'Ders yanılgıları')}: {})};
  }),'Dersler');
  const questions=unique(rows(input.questions,'Sorular',1,COURSE_DESIGNER_LIMITS.questions).map((q,i)=>{
    record(q,['id','revision','outcomeIds','prompt','correctChoiceId','choices'],'Soru '+i);
    const choices=unique(rows(q.choices,'Soru şıkları',2,8).map((c,j)=>{
      record(c,['id','text','misconceptionId'],'Şık '+j);
      return {id:id(c.id,'Şık kimliği'),text:string(c.text,'Şık metni',1000),...(own(c,'misconceptionId')?{misconceptionId:id(c.misconceptionId,'Yanılgı kimliği')}: {})};
    }),'Şıklar');
    const correctChoiceId=id(q.correctChoiceId,'Doğru şık');
    if(!choices.some(c=>c.id===correctChoiceId))throw new RangeError('Soru doğru şıkkı mevcut değil');
    return {id:id(q.id,'Soru kimliği'),revision:id(q.revision,'Soru sürümü'),outcomeIds:idList(q.outcomeIds,'Soru kazanımları',1),prompt:string(q.prompt,'Soru kökü',2000),correctChoiceId,choices};
  }),'Sorular');
  rows(input.mappings,'Harici kart eşleştirmeleri',0,0); // v1.2 cannot preserve/edit these. Fail closed.
  return {format:'fark-open-content-pack',version:1,attribution,units,outcomes,lessons,questions,mappings:[]};
}
/** Fail closed on unsupported fields and bounds. Original object never changes. */
export function buildCourseAuthoringPack(draft){
  const result=cloneAndValidate(draft);
  if(new TextEncoder().encode(JSON.stringify(result)).byteLength>MAX_BYTES)throw new RangeError('İçerik paketi 1 MiB sınırını aşıyor');
  return result;
}
/** Restore ALL supported original fields without changing IDs or relationship order. */
export function restoreCourseAuthoringDraft(pack){return buildCourseAuthoringPack(pack);}
export function addCourseEntity(draft,kind){
  const next=buildCourseAuthoringPack(draft),plural={unit:'units',outcome:'outcomes',lesson:'lessons',question:'questions'}[kind];
  if(!plural)throw new RangeError('Bilinmeyen kayıt türü');
  if(next[plural].length>=COURSE_DESIGNER_LIMITS[plural])throw new RangeError('Tasarımcı kayıt sınırına ulaşıldı');
  const stem={unit:'unit',outcome:'outcome',lesson:'lesson',question:'question'}[kind];
  let i=1;while(next[plural].some(e=>e.id===stem+'-'+i))i++;
  const uid=stem+'-'+i, defaultUnit=next.units[0]?.id, defaultOutcome=next.outcomes[0]?.id;
  if(kind==='unit')next.units.push({id:uid,label:'Yeni ünite'});
  if(kind==='outcome'){if(!defaultUnit)throw new RangeError('Önce ünite ekle');next.outcomes.push({id:uid,unitId:defaultUnit,label:'Yeni kazanım'});}
  if(kind==='lesson'){if(!defaultOutcome)throw new RangeError('Önce kazanım ekle');next.lessons.push({id:uid,revision:'1',title:'Yeni ders',outcomeIds:[defaultOutcome],bodyText:'Özgün ders anlatımını buraya yaz.'});}
  if(kind==='question'){if(!defaultOutcome)throw new RangeError('Önce kazanım ekle');next.questions.push({id:uid,revision:'1',outcomeIds:[defaultOutcome],prompt:'Yeni özgün soru?',correctChoiceId:'a',choices:[{id:'a',text:'Birinci seçenek'},{id:'b',text:'İkinci seçenek'}]});}
  return {draft:next,selectedId:uid};
}
/** Explicitly refuse cascades: cross-linked data must never disappear silently. */
export function removeCourseEntity(draft,kind,uid){
  const next=buildCourseAuthoringPack(draft),plural={unit:'units',outcome:'outcomes',lesson:'lessons',question:'questions'}[kind];
  if(!plural)throw new RangeError('Bilinmeyen kayıt türü');
  const index=next[plural].findIndex(e=>e.id===uid);
  if(index<0)throw new RangeError('Silinecek kayıt bulunamadı');
  if((kind==='unit'&&next.units.length===1)||(kind==='outcome'&&next.outcomes.length===1)||(kind==='question'&&next.questions.length===1))throw new RangeError('Son zorunlu kayıt silinemez');
  let count=0;
  if(kind==='unit')count+=next.outcomes.filter(o=>o.unitId===uid).length+next.units.filter(u=>(u.prerequisiteIds||[]).includes(uid)).length;
  if(kind==='outcome')count+=next.outcomes.filter(o=>(o.prerequisiteIds||[]).includes(uid)).length+next.lessons.filter(l=>l.outcomeIds.includes(uid)).length+next.questions.filter(q=>q.outcomeIds.includes(uid)).length;
  if(count)throw new RangeError('Kayıt '+count+' bağlantıda kullanılıyor; önce bağlantıları düzenle');
  next[plural].splice(index,1);
  return next;
}
/** Two-output relation check. Editor may show explicit prior requirements, not infer mastery. */
export function relationshipSummary(draft){
  const pack=buildCourseAuthoringPack(draft);
  return {units:pack.units.length,outcomes:pack.outcomes.length,lessons:pack.lessons.length,questions:pack.questions.length,
    orphanLessons:pack.lessons.filter(l=>l.outcomeIds.length===0).map(l=>l.id)};
}
