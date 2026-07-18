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
  h += '<div class="field tr-main"><span class="lbl">Meaning</span><p>'+w.tr+'</p></div>';
  if(w.hint) h += '<div class="field"><span class="lbl">Nüans</span><p>'+w.hint+'</p></div>';
  if(w.similar){
    const m = w.similar.split(/\.\s*Fark:\s*/);
    const sh = m.length>1 ? '<b class="syn">'+linkifyWords(m[0])+'.</b><span class="diff">'+m[1]+'</span>' : '<b class="syn">'+linkifyWords(w.similar)+'</b>';
    h += '<div class="field"><span class="lbl">Benzer kelimeler</span><p>'+sh+'</p></div>';
  }
  if(w.opposite) h += '<div class="field antonyms"><span class="lbl">Zıt kelimeler</span><p><b class="ant">'+linkifyWords(w.opposite)+'</b></p></div>';
  let ex = '<p class="en-ex">'+w.ex+'</p><p class="tr-ex">'+w.exTr+'</p>';
  if(w.ex2) ex += '<p class="en-ex">'+w.ex2+'</p><p class="tr-ex">'+w.exTr2+'</p>';
  h += '<div class="field"><span class="lbl">Examples</span>'+ex+'</div>';
  if(w.coll) h += '<div class="field"><span class="lbl">Collocations</span><p class="coll-desc">En sık birlikte kullanıldığı kelimeler (fiil, edat, artikel). Bir kalıba tıkla ya da ok tuşlarıyla gez; örnek cümlesi altta açılır:</p><div class="coll">'+collFormat(w)+'</div></div>';
  if(w.detail) h += '<div class="field explanation"><span class="lbl">Explanation</span><p>'+w.detail+'</p></div>';
  if(w.note)   h += '<div class="field meta"><span class="lbl">Origin</span><p>'+w.note+'</p></div>';
  if(w.extra)  h += '<div class="field meta"><span class="lbl">Good to know</span><p>'+w.extra+'</p></div>';
  return h;
}
function cardDetailFields(w){
  return '<div class="cd-word">'+w.en+' <span class="cd-type">'+typeLabel(w.type)+'</span></div>'+detailFields(w);
}

/* ============ SKOR / DURUM (localStorage) ============ */
const SCORE_KEY = 'ns-vocab-score';
const KNOWN_AT = 2;            // skor >= 2  -> Biliyorum (sağlam)
let SCORES = {};
try{ SCORES = JSON.parse(localStorage.getItem(SCORE_KEY)) || {}; }catch(e){ SCORES = {}; }
const STATUS_LABEL = {known:'Biliyorum', shaky:'Sağlam değil', weak:'Zayıf'};
function saveScores(){ try{ localStorage.setItem(SCORE_KEY, JSON.stringify(SCORES)); }catch(e){} }
function getScore(en){ return SCORES[en] || 0; }
function addScore(en, d){ let v=(SCORES[en]||0)+d; v=Math.max(-3, Math.min(5, v)); SCORES[en]=v; saveScores(); }
function statusOf(en){ const s=getScore(en); if(s>=KNOWN_AT) return 'known'; if(s<0) return 'weak'; return 'shaky'; }
function scoreText(sc){ return sc>0 ? '+'+sc : ''+sc; }

/* cümle pratiği listesi + kullanıcının yazdığı cümleler */
const FLAG_KEY='ns-vocab-flag', SENT_KEY='ns-vocab-sentences';
let FLAGS={}, SENTS={};
try{ FLAGS=JSON.parse(localStorage.getItem(FLAG_KEY))||{}; }catch(e){ FLAGS={}; }
try{ SENTS=JSON.parse(localStorage.getItem(SENT_KEY))||{}; }catch(e){ SENTS={}; }
function saveFlags(){ try{ localStorage.setItem(FLAG_KEY,JSON.stringify(FLAGS)); }catch(e){} }
function saveSents(){ try{ localStorage.setItem(SENT_KEY,JSON.stringify(SENTS)); }catch(e){} }
function isFlagged(en){ return !!FLAGS[en]; }
function toggleFlag(en){ if(FLAGS[en]) delete FLAGS[en]; else FLAGS[en]=1; saveFlags(); }
function getSent(en){ return SENTS[en]||''; }
function setSent(en,txt){ txt=txt.trim(); if(txt) SENTS[en]=txt; else delete SENTS[en]; saveSents(); }
function escapeHTML(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* gizlenen (öğrenilmiş, rotasyondan çıkarılan) kelimeler */
const HIDE_KEY='ns-vocab-hidden';
let HIDDEN={};
try{ HIDDEN=JSON.parse(localStorage.getItem(HIDE_KEY))||{}; }catch(e){ HIDDEN={}; }
function saveHidden(){ try{ localStorage.setItem(HIDE_KEY,JSON.stringify(HIDDEN)); }catch(e){} }
function isHidden(en){ return !!HIDDEN[en]; }
function toggleHidden(en){ if(HIDDEN[en]) delete HIDDEN[en]; else HIDDEN[en]=1; saveHidden(); }

/* ============ FİLTRE ============ */
let filterVal = 'all';
function matchesFilter(w){
  if(filterVal==='hidden') return isHidden(w.en);          // yalnızca gizlenenler
  if(isHidden(w.en)) return false;                         // gizlenenler diğer görünümlerde çıkmaz
  if(filterVal==='all') return true;
  if(filterVal==='shaky') return statusOf(w.en)!=='known';  // Sağlam değil = sağlam olmayan her şey (zayıf dahil)
  return statusOf(w.en)===filterVal;
}
function activeWords(){ return WORDS.filter(matchesFilter); }

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
