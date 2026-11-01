/* ================= your own ratings =================
   Every item's stars can be changed in the page (click the stars / ☆ next to the heading).
   Changes are kept in this browser (localStorage "calc2:impOver") and override content/annotations.
   Settings → "דירוג החשיבות" exports them in the annotation-file format, imports them back, or resets them. */
function saveOver(){ LS.set('calc2:impOver', impOver); }
function findItem(key){
  const uid = +key.slice(1, key.indexOf('|')); const u = getUnit(uid);
  return u && u.parsed ? u.parsed.blocks.find(b=>b.kind==='item' && b.key===key && !b.dupOf) : null;
}
/* lv: 0..3, or null to go back to the default from the annotation file */
function setLevel(key, lv){
  const b = findItem(key); if(!b) return;
  if(lv===null || lv===baseLevel(b)) delete impOver[key]; else impOver[key] = lv;
  saveOver(); b.imp = levelOf(b); refreshImpUI(b);
}
function refreshImpUI(b){
  palIndex = null;
  const u = getUnit(b.uid); if(!u || !u.el) return;
  u.el.querySelectorAll('article.item[data-key="'+CSS.escape(b.key)+'"]').forEach(a=>{
    a.classList.remove('imp1','imp2','imp3'); if(b.imp) a.classList.add('imp'+b.imp);
    const old = a.querySelector('.item-h [data-rate]'); if(old) old.outerHTML = impBadge(b);
    const w = a.querySelector(':scope > .why'), nw = whyHtml(b);
    if(w) w.outerHTML = nw; else if(nw) a.querySelector('.item-h').insertAdjacentHTML('afterend', nw);
  });
  const li = document.querySelector('#tree li.it[data-id="'+b.id+'"]');
  if(li){ li.classList.remove('imp1','imp2','imp3'); if(b.imp) li.classList.add('imp'+b.imp); }
  const chips = u.el.querySelector('.impf'); if(chips) chips.outerHTML = impChips(u.parsed);
  const mk = u.el.querySelector('#mustKnow'); if(mk){ const open = mk.open; mk.outerHTML = mustKnow(u.parsed); const n = u.el.querySelector('#mustKnow'); if(n) n.open = open; }
  if(current.page==='units' && current.uid===b.uid){ syncToolbar(); applyFilters(); }
}

/* ---------- the menu ---------- */
let rateMenu = null;
function closeRate(){ if(rateMenu){ rateMenu.remove(); rateMenu = null; } }
function openRate(btn){
  closeRate();
  const a = btn.closest('article'); if(!a) return;
  const key = a.dataset.key, b = findItem(key); if(!b) return;
  const base = baseLevel(b), cur = b.imp||0, custom = Object.prototype.hasOwnProperty.call(impOver, key);
  const opt = (lv, txt)=>'<button type="button" role="menuitemradio" aria-checked="'+(cur===lv)+'" data-lv="'+lv+'">'+txt+(lv===base?' <small>ברירת המחדל</small>':'')+'</button>';
  const m = document.createElement('div'); m.className='ratemenu'; m.setAttribute('role','menu'); m.setAttribute('aria-label','דירוג חשיבות');
  m.innerHTML = '<div class="rm-h">דירוג חשיבות: '+renderInline(b.heading.replace(/\s*\(.*$/,'').replace(/:.*$/,''))+'</div>'+
    opt(3,'<b class="st">★★★</b> ליבה')+opt(2,'<b class="st">★★</b> חשוב')+opt(1,'<b class="st">★</b> כדאי לדעת')+opt(0,'ללא דירוג')+
    (custom ? '<button type="button" class="rm-reset" data-lv="reset">חזרה לברירת המחדל ('+(base? IMP[base].stars : 'ללא')+')</button>' : '')+
    '<div class="rm-foot">נשמר בדפדפן הזה. ייצוא וייבוא בהגדרות התצוגה.</div>';
  document.body.appendChild(m); rateMenu = m;
  const r = btn.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  let left = Math.min(innerWidth-mw-8, Math.max(8, r.right-mw)), top = r.bottom+6;
  if(top+mh > innerHeight-8) top = Math.max(8, r.top-mh-6);
  m.style.left = left+'px'; m.style.top = top+'px';
  m.addEventListener('click', e=>{
    const x = e.target.closest('[data-lv]'); if(!x) return;
    const v = x.dataset.lv; setLevel(key, v==='reset' ? null : +v); closeRate();
    toast(v==='reset' ? 'הדירוג חזר לברירת המחדל' : 'הדירוג עודכן');
  });
  const f = m.querySelector('[aria-checked="true"]') || m.querySelector('button'); if(f) f.focus();
}
document.addEventListener('click', e=>{
  const btn = e.target.closest('[data-rate]');
  if(btn){ e.preventDefault(); e.stopPropagation(); if(rateMenu && rateMenu._for===btn){ closeRate(); return; } openRate(btn); if(rateMenu) rateMenu._for = btn; return; }
  if(rateMenu && !e.target.closest('.ratemenu')) closeRate();
}, true);
document.addEventListener('keydown', e=>{
  if(!rateMenu) return;
  if(e.key==='Escape'){ closeRate(); e.stopPropagation(); e.preventDefault(); return; }
  if(e.key==='ArrowDown' || e.key==='ArrowUp'){ const bs=[...rateMenu.querySelectorAll('button')]; const i=bs.indexOf(document.activeElement); bs[(i+(e.key==='ArrowDown'?1:bs.length-1))%bs.length].focus(); e.preventDefault(); e.stopPropagation(); }
}, true);
addEventListener('scroll', closeRate, {passive:true}); addEventListener('resize', closeRate);

/* ---------- export / import / reset (used by the settings dialog) ---------- */
function overrideCount(){ return Object.keys(impOver).length; }
function overridesText(){
  const byUnit = {};
  for(const key in impOver){ const b = findItem(key); if(b) (byUnit[b.uid] = byUnit[b.uid] || []).push(b); }
  let out = '# הדירוגים שלך, מיוצאים מהאתר ('+new Date().toISOString().slice(0,10)+').\n'+
    '# כל שורת @ מחליפה את שורת ה-@ של אותו פריט בקובץ content/annotations/unit-N.txt (השורות bold/formula שמתחתיה נשארות).\n'+
    '# אפשר גם פשוט לשלוח את הקובץ הזה, או לייבא אותו חזרה בהגדרות.\n';
  Object.keys(byUnit).map(Number).sort((a,b)=>a-b).forEach(uid=>{
    out += '\n# unit-'+uid+'.txt\n';
    byUnit[uid].forEach(b=>{
      const lv = impOver[b.key], n = +b.key.split('|').pop(), base = baseLevel(b);
      out += '# ברירת המחדל: '+(base? IMP[base].stars : 'ללא דירוג')+'\n';
      out += '@ '+b.heading+(n>1?'#'+n:'')+' | '+(lv? IMP[lv].stars : '')+(b.ann && b.ann.why ? ' | '+b.ann.why : '')+'\n';
    });
  });
  return out;
}
function importOverrides(text){
  let uid = 0, ok = 0; const bad = [];
  for(const raw of text.split(/\r?\n/)){
    const line = raw.trim();
    const um = /^#\s*unit-(\d+)\.txt/.exec(line); if(um){ uid = +um[1]; continue; }
    if(!line.startsWith('@')) continue;
    const parts = line.slice(1).split('|').map(s=>s.trim()); const km = /^(.*?)#(\d+)$/.exec(parts[0]);
    const base = km ? km[1].trim() : parts[0], occ = km ? +km[2] : 1, lvS = parts[1]||'';
    const lv = lvS==='★★★'||lvS==='3' ? 3 : lvS==='★★'||lvS==='2' ? 2 : lvS==='★'||lvS==='1' ? 1 : 0;
    const cands = [];
    for(const u of (uid ? [uid] : availableUnits())){
      const p = getUnit(u) && getUnit(u).parsed; if(!p) continue;
      const exact = p.blocks.filter(b=>b.kind==='item' && !b.dupOf && b.heading===base && b.key.endsWith('|'+occ));
      const pref = exact.length ? exact : p.blocks.filter(b=>b.kind==='item' && !b.dupOf && (b.heading.startsWith(base+' (') || b.heading.startsWith(base+':')) && b.key.endsWith('|'+occ));
      cands.push(...pref);
    }
    if(cands.length!==1){ bad.push(parts[0]); continue; }
    const b = cands[0];
    if(lv===baseLevel(b)) delete impOver[b.key]; else impOver[b.key] = lv;
    ok++;
  }
  saveOver(); return {ok, bad};
}
function openRatingsIO(){
  const n = overrideCount();
  const m = openModal('הדירוגים שלך',
    '<p class="io-lead">'+(n? 'שינית את הדירוג של <b>'+n+'</b> פריטים. הקובץ שלמטה הוא בפורמט של קובצי ההערות (content/annotations), כך שאפשר להדביק אותו שם או לשלוח אותו.' : 'עדיין לא שינית דירוגים. לחיצה על הכוכבים (או ☆) ליד כותרת של פריט פותחת תפריט דירוג.')+'</p>'+
    '<textarea id="ioText" dir="rtl" spellcheck="false" aria-label="הדירוגים שלך">'+esc(n? overridesText() : '')+'</textarea>'+
    '<div class="io-acts"><button type="button" class="btn" id="ioSave"'+(n?'':' disabled')+'>הורדה כקובץ</button><button type="button" class="btn" id="ioCopy"'+(n?'':' disabled')+'>העתקה</button>'+
    '<button type="button" class="btn" id="ioImport">ייבוא מהטקסט שבתיבה</button><button type="button" class="btn danger" id="ioReset"'+(n?'':' disabled')+'>מחיקת כל השינויים</button></div>'+
    '<p class="io-note">ייבוא: הדביקו בתיבה טקסט בפורמט הזה (גם קטע מקובץ הערות) ולחצו «ייבוא». שורה שאינה מזוהה ביחידה אחת בדיוק מדולגת.</p>', {cls:'ratings-io'});
  const el = m.el, ta = el.querySelector('#ioText');
  el.addEventListener('click', async e=>{
    if(e.target.closest('#ioSave')){ const r = await saveFile('calc2-my-ratings.txt', ta.value); toast(r==='saved'?'הקובץ נשמר':'השמירה לא הצליחה'); }
    if(e.target.closest('#ioCopy')){ try{ await navigator.clipboard.writeText(ta.value); toast('הועתק'); }catch(_){ ta.select(); document.execCommand('copy'); toast('הועתק'); } }
    if(e.target.closest('#ioImport')){ const r = importOverrides(ta.value); closeModal(); toast('יובאו '+r.ok+' דירוגים'+(r.bad.length? ', '+r.bad.length+' שורות לא זוהו' : '')+'. הדף נטען מחדש.'); setTimeout(()=>location.reload(), 900); }
    if(e.target.closest('#ioReset')){ if(confirm('למחוק את כל הדירוגים ששינית ולחזור לדירוג ברירת המחדל?')){ for(const k in impOver) delete impOver[k]; saveOver(); closeModal(); toast('הדירוג חזר לברירת המחדל. הדף נטען מחדש.'); setTimeout(()=>location.reload(), 900); } }
  });
}
