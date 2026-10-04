/* ============================================================
   English Lab — shared core (state, render helpers, popover)
   Depends on data.js. Loaded before each page's own script.
   ============================================================ */

// İngilizce sözcükleri (parantez dışı) tıklanabilir yap
function linkifyWords(str){
  let out='', word='', depth=0;
  function flush(){
    if(!word) return;
    if(depth===0 && word.length>1 && /^[A-Za-z][A-Za-z'-]*$/.test(word))
      out += '<span class="wordref" data-w="'+word.toLowerCase()+'">'+word+'</span>';
    else out += word;
    word='';
  }
  for(const ch of str){
    if(/[A-Za-z'-]/.test(ch)){ word+=ch; continue; }
    flush();
    if(ch==='(') depth++;
    else if(ch===')') depth=Math.max(0,depth-1);
    out += ch;
  }
  flush();
  return out;
}

const TYPE_EN = {'kelime':'Word','sıfat':'Adjective','kalıp':'Phrase','deyim':'Idiom','phrasal fiil':'Phrasal verb','cümle':'Sentence'};
function typeLabel(t){ return TYPE_EN[t] || t; }
function ipaBlock(w){
  if(!w.uk && !w.us) return '';
  let out = '<div class="ipa">';
  if(w.uk) out += '<span class="uk"><b>UK</b>'+w.uk+'</span>';
  if(w.us) out += '<span class="us"><b>US</b>'+w.us+'</span>';
  out += '<a class="ipa-link" href="'+cambridgeURL(w.en)+'" target="_blank" rel="noopener" aria-label="Cambridge Dictionary\'de aç" title="Cambridge Dictionary\'de aç"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>';
  return out + '</div>';
}
function collFormat(w){
  const chips=collList(w), ex=collExList(w), wEsc=escapeHTML(w.en);
  const chipHTML=chips.map(function(p,i){
    return '<button type="button" class="coll-chip'+(i===0?' active':'')+'" data-w="'+wEsc+'" data-i="'+i+'" tabindex="'+(i===0?'0':'-1')+'">'+collPhraseHTML(p)+'</button>';
  }).join('');
  const first=ex.length?escapeHTML(ex[0]):'';
  return '<div class="coll-chips" role="group" aria-label="Collocations">'+chipHTML+'</div>'+
    '<div class="coll-ex"'+(first?'':' hidden')+'>'+first+'</div>';
}
/* odaklanan / tıklanan collocation'ın örnek cümlesini gösterir + roving tabindex */
function collExShow(chip){
  const group=chip.closest('.coll-chips'); if(!group) return;
  let exEl=group.nextElementSibling;
  while(exEl && !exEl.classList.contains('coll-ex')) exEl=exEl.nextElementSibling;
  const arr=COLL_EX[chip.getAttribute('data-w')]||[];
  const txt=arr[+chip.getAttribute('data-i')]||'';
  if(exEl){ if(txt){ exEl.textContent=txt; exEl.hidden=false; } else { exEl.hidden=true; } }
  Array.prototype.forEach.call(group.querySelectorAll('.coll-chip'), function(c){ const on=c===chip; c.tabIndex=on?0:-1; c.classList.toggle('active',on); });
  /* odaklı/aktif collocation ve örneği her zaman görünür kalsın */
  const seen=(exEl && !exEl.hidden) ? exEl : chip;
  if(seen && seen.scrollIntoView) seen.scrollIntoView({block:'nearest'});
}
/* bir satırdaki collocation'lar arasında ilerle: odağı satırda bırakır, sadece aktif kalıbı ve örnek cümleyi değiştirir */
function stepRowColl(row,dir){
  if(!row) return false;
  const chips=Array.prototype.slice.call(row.querySelectorAll('.coll-chip'));
  if(!chips.length) return false;
  let cur=chips.findIndex(function(c){ return c.classList.contains('active'); });
  if(cur<0) cur=0;
  collExShow(chips[(cur+dir+chips.length)%chips.length]);
  return true;
}
document.addEventListener('focusin', function(e){
  const chip=e.target.closest && e.target.closest('.coll-chip');
  if(chip) collExShow(chip);
});
document.addEventListener('click', function(e){
  const chip=e.target.closest && e.target.closest('.coll-chip');
  if(chip){ chip.focus(); collExShow(chip); }
});
document.addEventListener('keydown', function(e){
  const chip=e.target.closest && e.target.closest('.coll-chip');
  if(!chip) return;
  const chips=Array.prototype.slice.call(chip.closest('.coll-chips').querySelectorAll('.coll-chip'));
  const i=chips.indexOf(chip); let n=-1;
  if(e.key==='ArrowDown'||e.key==='ArrowRight') n=(i+1)%chips.length;
  else if(e.key==='ArrowUp'||e.key==='ArrowLeft') n=(i-1+chips.length)%chips.length;
  else if(e.key==='Home') n=0;
  else if(e.key==='End') n=chips.length-1;
  if(n>=0){ e.preventDefault(); e.stopPropagation(); chips[n].focus(); }
});
function detailFields(w){
  let h = ipaBlock(w);
  h += '<div class="field tr-main"><span class="lbl">Meaning</span><p>'+w.tr+'</p>'+(w.detail?'<p class="tr-detail">'+w.detail+'</p>':'')+'</div>';
  if(w.hint) h += '<div class="field"><span class="lbl">Nüans</span><p>'+w.hint+'</p></div>';
  let ex = '<p class="en-ex">'+w.ex+'</p><p class="tr-ex">'+w.exTr+'</p>';
  if(w.ex2) ex += '<p class="en-ex">'+w.ex2+'</p><p class="tr-ex">'+w.exTr2+'</p>';
  h += '<div class="field"><span class="lbl">Examples</span>'+ex+'</div>';

  let more = '';
  if(w.similar){
    const m = w.similar.split(/\.\s*Fark:\s*/);
    const sh = m.length>1 ? '<b class="syn">'+linkifyWords(m[0])+'.</b><span class="diff">'+m[1]+'</span>' : '<b class="syn">'+linkifyWords(w.similar)+'</b>';
    more += '<div class="field"><span class="lbl">Benzer kelimeler</span><p>'+sh+'</p></div>';
  }
  if(w.opposite) more += '<div class="field antonyms"><span class="lbl">Zıt kelimeler</span><p><b class="ant">'+linkifyWords(w.opposite)+'</b></p></div>';
  if(w.coll) more += '<div class="field"><span class="lbl">Collocations</span><details class="coll-desc"><summary>Nasıl kullanılır?</summary><p>En sık birlikte kullanıldığı kelimeler (fiil, edat, artikel). Bir kalıba tıkla ya da ok tuşlarıyla gez; örnek cümlesi altta açılır.</p></details><div class="coll">'+collFormat(w)+'</div></div>';
  if(w.note)  more += '<div class="field meta"><span class="lbl">Origin</span><p>'+w.note+'</p></div>';
  if(w.extra) more += '<div class="field meta"><span class="lbl">Good to know</span><p>'+w.extra+'</p></div>';
  if(more) h += '<details class="more-fields"><summary>Daha fazla</summary>'+more+'</details>';
  return h;
}
function cardDetailFields(w){
  return '<div class="cd-word">'+w.en+' <span class="cd-type">'+typeLabel(w.type)+'</span></div>'+detailFields(w);
}

/* ============ SKOR / DURUM (localStorage) ============ */
/* Depolar NSStore üzerinden yazılır: yazma anında disk taban alınır ve
   yalnızca bu sayfanın dokunduğu kelimeler üstüne konur. Aksi halde
   saatlerdir açık duran bir sekme tek bir cevapla kendi eski anlık
   görüntüsünü diske basar. Değişen her kelimede touch() şart. */
const SCORE_KEY = 'ns-vocab-score';
const KNOWN_AT = 2;            // skor >= 2  -> Biliyorum (sağlam)
let SCORES = {};
const SCORE_STORE = NSStore.map(SCORE_KEY, SCORES);
const STATUS_LABEL = {known:'Biliyorum', shaky:'Sağlam değil', weak:'Zayıf'};
function saveScores(){ SCORE_STORE.commit(); }
function getScore(en){ return SCORES[en] || 0; }
function resetScoresForGroups(ids){
  WORDS.forEach(function(w){ if(ids.indexOf(w.grp)>=0){ delete SCORES[w.en]; SCORE_STORE.touch(w.en); } });
  saveScores();
}
function addScore(en, d){
  let v=(SCORES[en]||0)+d; v=Math.max(-3, Math.min(5, v)); SCORES[en]=v; SCORE_STORE.touch(en); saveScores();
  // akış sayacı ayrı tutulur: farklı 2 günde doğru -> cümle aşaması (bkz. journey-core.js)
  if(typeof NSJourney!=='undefined' && NSJourney.recordPractice(en, d>0)==='sentence') setFlag(en, true);
}
/* Akış aşaması rozeti (yalnızca bilgi): pratik skorundan bağımsız —
   skor +2 olsa da akış farklı 2 gün ister. Boş: henüz bir gün bile yok. */
function flowBadgeHTML(en){
  if(typeof NSJourney==='undefined') return '';
  const st=NSJourney.stageOf(en);
  if(st==='review') return '<span class="flow-badge f-review" title="In Review">Review</span>';
  if(st==='sentence') return '<span class="flow-badge f-sentence" title="Ready for sentence practice">Sentences</span>';
  const c=NSJourney.daysCount(en);
  return c ? '<span class="flow-badge" title="Known on '+c+' of '+NSJourney.NEED_DAYS+' different days">Day '+c+'/'+NSJourney.NEED_DAYS+'</span>' : '';
}
function statusOf(en){ const s=getScore(en); if(s>=KNOWN_AT) return 'known'; if(s<0) return 'weak'; return 'shaky'; }
function scoreText(sc){ return sc>0 ? '+'+sc : ''+sc; }

/* cümle pratiği listesi + kullanıcının yazdığı cümleler */
const FLAG_KEY='ns-flow-sentence', SENT_KEY='ns-vocab-sentences';
let FLAGS={}, SENTS={};
const FLAG_STORE = NSStore.map(FLAG_KEY, FLAGS);
const SENT_STORE = NSStore.map(SENT_KEY, SENTS);
function saveFlags(){ FLAG_STORE.commit(); }
function saveSents(){ SENT_STORE.commit(); }
function isFlagged(en){ return !!FLAGS[en]; }
/* Cümle listesinde olmak = akışta sentence aşamasında olmak. setFlag yalnızca
   işareti yazar; toggleFlag kullanıcının elle yaptığı değişikliktir ve aşamayı
   da taşır (elle eklenen kelime cümle aşamasına geçer, çıkarılan baştan başlar). */
function setFlag(en, on){ if(!!FLAGS[en]===!!on) return; if(on) FLAGS[en]=1; else delete FLAGS[en]; FLAG_STORE.touch(en); saveFlags(); }
function toggleFlag(en){
  const on=!FLAGS[en]; setFlag(en, on);
  if(typeof NSJourney!=='undefined'){ if(on) NSJourney.promote(en); else NSJourney.demote(en); }
}
function getSent(en){ return SENTS[en]||''; }
function setSent(en,txt){ txt=txt.trim(); if(txt) SENTS[en]=txt; else delete SENTS[en]; SENT_STORE.touch(en); saveSents(); }
function escapeHTML(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* gizlenen (öğrenilmiş, rotasyondan çıkarılan) kelimeler */
const HIDE_KEY='ns-flow-learned';
let HIDDEN={};
const HIDE_STORE = NSStore.map(HIDE_KEY, HIDDEN);
function saveHidden(){ HIDE_STORE.commit(); }
function isHidden(en){ return !!HIDDEN[en]; }
function toggleHidden(en){
  if(HIDDEN[en]) delete HIDDEN[en]; else HIDDEN[en]=1; HIDE_STORE.touch(en); saveHidden();
  // Learned = Review'a giriş (cümle listesinden düşer); geri almak Review'dan
  // çıkarır ve kelime geldiği aşamaya döner — sentence ise listeye geri girer
  if(typeof NSJourney!=='undefined'){
    if(HIDDEN[en]){ NSJourney.learn(en); setFlag(en, false); }
    else setFlag(en, NSJourney.unlearn(en)==='sentence');
  }
}


/* ============ FİLTRE (faset: gruplar + skor + kaydedilenler) ============
   Üç bağımsız faset. Her faset boşsa o boyutta kısıt yoktur.
   Gruplar/durumlar kendi içinde VEYA, fasetler arası VE ile birleşir. */
const FILTER_KEY='ns-vocab-filter';
let selGroups=[], selStatus=[], selSaved=[];   // grp id'leri · 'weak'/'shaky'/'known' · 'flagged'/'learned' (dahil) veya '!flagged'/'!learned' (hariç)
let selBelow=null;                              // skor < selBelow olanlar (null: kısıt yok)
const BELOW_MIN=-2, BELOW_MAX=5;                // skor -3..5 aralığında; <-2 ve <6 anlamsız
try{
  const f=JSON.parse(localStorage.getItem(FILTER_KEY))||{};
  if(Array.isArray(f.g)) selGroups=f.g.slice();
  if(Array.isArray(f.s)) selStatus=f.s.slice();
  if(Array.isArray(f.v)) selSaved=f.v.slice();
  if(typeof f.b==='number' && f.b>=BELOW_MIN && f.b<=BELOW_MAX) selBelow=f.b;
}catch(e){}
if(typeof WORD_GROUPS!=='undefined') selGroups=selGroups.filter(id=>WORD_GROUPS.some(g=>g.id===id));   // geçersiz grupları at
function saveFilter(){ try{ localStorage.setItem(FILTER_KEY, JSON.stringify({g:selGroups,s:selStatus,v:selSaved,b:selBelow})); }catch(e){} }
function filterSig(){ return JSON.stringify([selGroups,selStatus,selSaved,selBelow]); }   // torba/önbellek kimliği
function clearFilter(){ selGroups=[]; selStatus=[]; selSaved=[]; selBelow=null; saveFilter(); }

function matchesGroup(w){ return selGroups.length===0 || selGroups.indexOf(w.grp)>=0; }
/* 'kaydedilenler' fasetinin her satırı 3 durumlu: boş (kısıt yok) · dahil (yalnızca o) · hariç (o olmayanlar) */
function matchesSaved(val, isOn){
  if(selSaved.indexOf(val)>=0) return isOn;         // dahil et
  if(selSaved.indexOf('!'+val)>=0) return !isOn;    // hariç tut
  return true;                                       // nötr: kısıt yok
}
function matchesFilter(w){
  if(!matchesGroup(w)) return false;
  if(!matchesSaved('learned', isHidden(w.en))) return false;
  if(!matchesSaved('flagged', isFlagged(w.en))) return false;
  if(selStatus.length && selStatus.indexOf(statusOf(w.en))<0) return false;
  if(selBelow!==null && getScore(w.en)>=selBelow) return false;
  return true;
}
function activeWords(){ return WORDS.filter(matchesFilter); }

/* ============ FİLTRE PANELİ (paylaşılan buton + popover) ============ */
const FILTER_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';
const FLT_INC_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
const FLT_EXC_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
/* panel metinleri: Vocabulary Türkçe, akışın yeni (İngilizce) sayfaları İngilizce */
const FLT_TXT = {
  tr: { filter:'Filtrele', panel:'Filtre', clear:'Temizle', groups:'Gruplar', group:'Grup ', reset:'Seçili grubun istatistiğini sıfırla',
        resetAsk:' kelimenin skor geçmişi silinsin mi? Bu işlem geri alınamaz.', status:'Skor durumu',
        weak:'Zayıf', shaky:'Sağlam değil', known:'Biliyorum', below:'Skoru şunun altında', belowGroup:'Skor üst sınırı',
        dec:'Azalt', inc:'Artır', belowOff:'Skor sınırını kaldır', saved:'Kaydedilenler',
        flagged:'Cümlede çalışacaklarım', learned:'Öğrendiklerim', include:'Dahil et', exclude:'Hariç tut', match:' kelime eşleşiyor' },
  en: { filter:'Filter', panel:'Filter', clear:'Clear', groups:'Groups', group:'Group ', reset:'Reset practice score for the selected groups',
        resetAsk:' words will lose their practice score. This cannot be undone. Continue?', status:'Practice score',
        weak:'Weak', shaky:'Shaky', known:'Known', below:'Score below', belowGroup:'Score limit',
        dec:'Decrease', inc:'Increase', belowOff:'Remove score limit', saved:'Marked',
        flagged:'In Sentences', learned:'Learned', include:'Include', exclude:'Exclude', match:' words match' }
};
function _fltArr(kind){ return kind==='g'?selGroups : kind==='s'?selStatus : selSaved; }
function _fltChip(kind,val,label){
  const on=_fltArr(kind).indexOf(val)>=0;
  return '<button type="button" class="flt-chip'+(on?' on':'')+'" data-k="'+kind+'" data-v="'+val+'" aria-pressed="'+(on?'true':'false')+'">'+label+'</button>';
}
/* 'kaydedilenler' satırı: etiket + dahil et/hariç tut ikon toggle çifti (3 durum: nötr · dahil · hariç) */
function _fltTriRow(val,label,T){
  const inc=selSaved.indexOf(val)>=0, exc=selSaved.indexOf('!'+val)>=0;
  return '<div class="flt-tri-row"><span class="flt-tri-label">'+label+'</span>'+
    '<div class="flt-tri" role="group" aria-label="'+label+'">'+
      '<button type="button" class="flt-tri-btn inc'+(inc?' on':'')+'" data-v="'+val+'" data-m="inc" aria-pressed="'+(inc?'true':'false')+'" title="'+T.include+'" aria-label="'+T.include+'">'+FLT_INC_ICON+'</button>'+
      '<button type="button" class="flt-tri-btn exc'+(exc?' on':'')+'" data-v="'+val+'" data-m="exc" aria-pressed="'+(exc?'true':'false')+'" title="'+T.exclude+'" aria-label="'+T.exclude+'">'+FLT_EXC_ICON+'</button>'+
    '</div></div>';
}
/* host: içine buton+panel basılacak eleman · onChange: değişince çağrılır · sections: ['groups','status','saved']
   count: o sayfanın listesinde kaç kelime kaldığını döner (varsayılan: activeWords).
   lang: 'tr' (varsayılan) | 'en' — panel metinlerinin dili.
   Filtre durumu sayfalar arasında ortak; rozet ve Temizle yalnızca bu panelde
   GÖRÜNEN bölümlere bakar, yoksa başka sayfada seçilmiş, burada görünmeyen
   bir filtre sayılıp kafa karıştırır. */
function mountFilter(host, onChange, sections, count, lang){
  const T = FLT_TXT[lang] || FLT_TXT.tr;
  sections = sections || ['groups','status','saved'];
  count = count || function(){ return activeWords().length; };
  const has = k => sections.indexOf(k)>=0;
  function shownCount(){
    return (has('groups')?selGroups.length:0) +
      (has('status')?selStatus.length+(selBelow===null?0:1):0) +
      (has('saved')?selSaved.length:0);
  }
  function clearShown(){
    if(has('groups')) selGroups=[];
    if(has('status')){ selStatus=[]; selBelow=null; }
    if(has('saved')) selSaved=[];
    saveFilter();
  }
  host.innerHTML =
    '<div class="filter-wrap">'+
      '<button type="button" class="filter-btn" id="fltBtn" aria-haspopup="dialog" aria-expanded="false" aria-label="'+T.filter+'">'+
        FILTER_ICON+'<span class="flt-badge" id="fltBadge" hidden></span>'+
      '</button>'+
      '<div class="filter-panel" id="fltPanel" role="dialog" aria-label="'+T.panel+'" hidden></div>'+
    '</div>';
  const btn=host.querySelector('#fltBtn'), panel=host.querySelector('#fltPanel'), badge=host.querySelector('#fltBadge');
  function updateBadge(){
    const n=shownCount();
    if(n){ badge.textContent=n; badge.hidden=false; btn.classList.add('on'); }
    else { badge.hidden=true; btn.classList.remove('on'); }
  }
  function renderPanel(){
    let h='<div class="flt-head"><span>'+T.filter+'</span><button type="button" class="flt-clear" id="fltClear"'+(shownCount()?'':' disabled')+'>'+T.clear+'</button></div>';
    if(sections.indexOf('groups')>=0 && typeof WORD_GROUPS!=='undefined' && WORD_GROUPS.length>1){
      h+='<div class="flt-sec"><div class="flt-lbl">'+T.groups+'</div><div class="flt-chips">'+
        WORD_GROUPS.map(g=>_fltChip('g',g.id,(typeof g.id==='number'?T.group+g.id:g.id)+' <i>'+g.count+'</i>')).join('')+'</div>'+
        (selGroups.length ? '<button type="button" class="flt-reset" id="fltResetGroup">'+T.reset+'</button>' : '')+
      '</div>';
    }
    if(sections.indexOf('status')>=0){
      h+='<div class="flt-sec"><div class="flt-lbl">'+T.status+'</div><div class="flt-chips">'+
        _fltChip('s','weak',T.weak)+_fltChip('s','shaky',T.shaky)+_fltChip('s','known',T.known)+'</div>'+
        '<div class="flt-below'+(selBelow===null?'':' on')+'"><span class="flt-tri-label">'+T.below+'</span>'+
          '<div class="flt-step" role="group" aria-label="'+T.belowGroup+'">'+
            '<button type="button" class="flt-step-btn" data-d="-1" aria-label="'+T.dec+'"'+(selBelow!==null&&selBelow<=BELOW_MIN?' disabled':'')+'>'+FLT_EXC_ICON+'</button>'+
            '<span class="flt-step-val">'+(selBelow===null?'—':scoreText(selBelow))+'</span>'+
            '<button type="button" class="flt-step-btn" data-d="1" aria-label="'+T.inc+'"'+(selBelow!==null&&selBelow>=BELOW_MAX?' disabled':'')+'>'+FLT_INC_ICON+'</button>'+
          '</div>'+
          (selBelow===null?'':'<button type="button" class="flt-step-off" id="fltBelowOff" aria-label="'+T.belowOff+'">&times;</button>')+
        '</div></div>';
    }
    if(sections.indexOf('saved')>=0){
      h+='<div class="flt-sec"><div class="flt-lbl">'+T.saved+'</div><div class="flt-tri-list">'+
        _fltTriRow('flagged',T.flagged,T)+_fltTriRow('learned',T.learned,T)+'</div></div>';
    }
    h+='<div class="flt-foot" id="fltFoot"></div>';
    panel.innerHTML=h;
    const foot=panel.querySelector('#fltFoot');
    if(foot) foot.textContent = count()+T.match;
  }
  function apply(){ saveFilter(); updateBadge(); renderPanel(); if(onChange) onChange(); }
  panel.addEventListener('click', function(e){
    e.stopPropagation();   // panel içi tıklama dış "kapat" tetiklemesin (re-render öğeyi koparıyor)
    if(e.target.closest('#fltClear')){ clearShown(); apply(); return; }
    if(e.target.closest('#fltResetGroup')){
      const n = WORDS.filter(w=>selGroups.indexOf(w.grp)>=0).length;
      if(confirm(n+T.resetAsk)){
        resetScoresForGroups(selGroups.slice());
        renderPanel();
        if(onChange) onChange();
      }
      return;
    }
    if(e.target.closest('#fltBelowOff')){ selBelow=null; apply(); return; }
    const step=e.target.closest('.flt-step-btn');
    if(step){
      // ilk dokunuşta Biliyorum eşiğinin bir üstünden başla (+3 altı = +2 dahil herkes)
      if(selBelow===null) selBelow=KNOWN_AT+1;
      else selBelow=Math.max(BELOW_MIN, Math.min(BELOW_MAX, selBelow+(+step.getAttribute('data-d'))));
      apply();
      return;
    }
    const tri=e.target.closest('.flt-tri-btn');
    if(tri){
      const val=tri.getAttribute('data-v'), key=(tri.getAttribute('data-m')==='inc'?'':'!')+val, oppKey=(tri.getAttribute('data-m')==='inc'?'!':'')+val;
      const oi=selSaved.indexOf(oppKey); if(oi>=0) selSaved.splice(oi,1);   // karşıt modu her zaman kaldır
      const i=selSaved.indexOf(key);
      if(i>=0) selSaved.splice(i,1); else selSaved.push(key);              // tekrar tıklama -> nötr
      apply();
      return;
    }
    const chip=e.target.closest('.flt-chip'); if(!chip) return;
    const k=chip.getAttribute('data-k'), raw=chip.getAttribute('data-v');
    const v = (k==='g' && raw!=='' && !isNaN(+raw)) ? +raw : raw;   // grup id sayıysa sayıya çevir
    const arr=_fltArr(k), i=arr.indexOf(v);
    if(i>=0) arr.splice(i,1); else arr.push(v);
    apply();
  });
  function open(){
    renderPanel(); panel.hidden=false; btn.setAttribute('aria-expanded','true');
    // ekran dışına taşarsa (mobilde buton solda kalınca) viewport içine kaydır
    panel.style.left=''; panel.style.right='';
    const pad=8, wrap=host.querySelector('.filter-wrap'), r=panel.getBoundingClientRect();
    if(r.left < pad && wrap){
      panel.style.right='auto';
      panel.style.left = (pad - wrap.getBoundingClientRect().left) + 'px';
    } else if(r.right > window.innerWidth - pad){
      panel.style.left='auto'; panel.style.right='0';
    }
  }
  function close(){ panel.hidden=true; btn.setAttribute('aria-expanded','false'); }
  btn.addEventListener('click', function(e){ e.stopPropagation(); panel.hidden?open():close(); });
  document.addEventListener('click', function(e){ if(!e.target.closest('.filter-wrap')) close(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') close(); });
  updateBadge();
  return { updateBadge:updateBadge, renderPanel:renderPanel, close:close };
}

/* ============ ORTAK ARAÇLAR ============ */
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function coreForms(en){ return en.split('/').map(x=>x.trim()).filter(Boolean); }
function normalize(s){ return (s||'').toLowerCase().trim().replace(/\s+/g,' ').replace(/[.,!?;:'"]/g,''); }
function reEscape(f){ return f.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function wordRegex(f){ return new RegExp('\\b'+reEscape(f)+'[a-z]*', 'i'); }

/* ---- collocation formatting helpers (used by detailFields) ---- */
function collExList(w){ return COLL_EX[w.en] || []; }
const UPPER_RE=/\b[A-Z][A-Z\/'\-]*(?:\s+[A-Z][A-Z\/'\-]*)*\b/;
function collList(w){ return (w.coll||'').split(' · ').map(s=>s.trim()).filter(Boolean); }
function collPhraseHTML(p){ return escapeHTML(p).replace(new RegExp(UPPER_RE.source,'g'), function(m){ return '<b class="cw-key">'+m.toLowerCase()+'</b>'; }); }

/* ============ WORD POPOVER + MODAL (shared, self-injecting) ============ */
const wordpop=document.createElement('div');
wordpop.className='wordpop'; wordpop.id='wordpop'; wordpop.setAttribute('role','menu'); wordpop.hidden=true;
document.body.appendChild(wordpop);
const modalBack=document.createElement('div');
modalBack.className='wordmodal-backdrop'; modalBack.id='wordModalBack'; modalBack.hidden=true;
modalBack.innerHTML='<div class="wordmodal" role="dialog" aria-modal="true"><button class="wordmodal-close" id="wordModalClose" type="button" aria-label="Kapat">&times;</button><div class="wordmodal-body" id="wordModalBody"></div></div>';
document.body.appendChild(modalBack);
const modalBody=modalBack.querySelector('#wordModalBody'), modalClose=modalBack.querySelector('#wordModalClose');
let popTimer=null;
function cambridgeURL(w){ return 'https://dictionary.cambridge.org/dictionary/english/'+encodeURIComponent(w.trim().toLowerCase().replace(/\s+/g,'-')); }
function showWordPop(target){
  const wtext=target.dataset.w; if(!wtext) return;
  const entry=LOOKUP[wtext.toLowerCase()];
  let html='<div class="wp-title">'+wtext+'</div>';
  html+='<a class="wp-btn" href="'+cambridgeURL(wtext)+'" target="_blank" rel="noopener">Cambridge <span aria-hidden="true">&#8599;</span></a>';
  if(entry) html+='<button class="wp-btn wp-detail" type="button" data-en="'+entry._i+'">İçeriği göster</button>';
  else html+='<div class="wp-note">Kelime listesinde yok</div>';
  wordpop.innerHTML=html; wordpop.hidden=false;
  const r=target.getBoundingClientRect(), pw=wordpop.offsetWidth, ph=wordpop.offsetHeight;
  const vw=document.documentElement.clientWidth, vh=document.documentElement.clientHeight;
  let left=r.left, top=r.bottom+6;
  if(left+pw>vw-8) left=vw-pw-8;
  if(left<8) left=8;
  if(top+ph>vh-8) top=r.top-ph-6;
  wordpop.style.left=left+'px'; wordpop.style.top=Math.max(8,top)+'px';
}
function hideWordPop(){ wordpop.hidden=true; }
function scheduleHide(){ clearTimeout(popTimer); popTimer=setTimeout(hideWordPop, 260); }
function cancelHide(){ clearTimeout(popTimer); }
document.addEventListener('mouseover', e=>{ const t=e.target.closest('.wordref'); if(t){ cancelHide(); showWordPop(t); } });
document.addEventListener('mouseout', e=>{ if(e.target.closest('.wordref')) scheduleHide(); });
wordpop.addEventListener('mouseenter', cancelHide);
wordpop.addEventListener('mouseleave', scheduleHide);
document.addEventListener('click', e=>{
  const t=e.target.closest('.wordref');
  if(t){ e.preventDefault(); cancelHide(); showWordPop(t); return; }
  const d=e.target.closest('.wp-detail');
  if(d){ openWordModal(WORDS[+d.dataset.en]); hideWordPop(); return; }
  if(!e.target.closest('#wordpop') && !e.target.closest('.wp-btn')) hideWordPop();
});
function openWordModal(w){ modalBody.innerHTML=cardDetailFields(w); modalBack.hidden=false; document.body.style.overflow='hidden'; }
function closeWordModal(){ modalBack.hidden=true; document.body.style.overflow=''; }
modalClose.addEventListener('click', closeWordModal);
modalBack.addEventListener('click', e=>{ if(e.target===modalBack) closeWordModal(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ if(!modalBack.hidden) closeWordModal(); hideWordPop(); } });
