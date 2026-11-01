/* ================= study features: bookmarks, export, quick jump, settings, keyboard, resume ================= */
function blockById(id, uid){ const u=getUnit(uid||current.uid); return u && u.parsed.blocks.find(b=>b.id===id); }
function toggleStar(key){ starred.has(key)? starred.delete(key) : starred.add(key); LS.set('calc2:starred',[...starred]); refreshProgress(); if(prefs.starredOnly) applyFilters(); }
function toggleLearned(key){ learned.has(key)? learned.delete(key) : learned.add(key); LS.set('calc2:learned',[...learned]); refreshProgress(); if(prefs.unlearned) applyFilters(); }
function allUnits(){ return Object.keys(units).map(Number).sort((a,b)=>a-b); }
function availableUnits(){ return allUnits().filter(u=>!isRef(u)); }   /* the course units (Calculus 2) */
function refUnits(){ return allUnits().filter(isRef); }
const isSource = s => s.label!==null && /^מקור/.test(s.label);

/* ---------- verbatim markdown of one item ---------- */
function itemMarkdown(b, o){
  const segs = segmentize(b.lines), ans = answerIndex(segs);
  const marks = o.marks && b.ann;
  let chosen = segs;
  if(ans>=0 && o.qMode==='prompt') chosen = segs.slice(0, ans);
  if(ans>=0 && o.qMode==='result') chosen = segs.filter((s,i)=> i>=ans || isSource(s));
  if(!o.withSource) chosen = chosen.filter(s=>!isSource(s));
  let lines = chosen.flatMap(s=>s.raw);
  if(marks && b.ann.bold && b.ann.bold.length){
    const pending=b.ann.bold.slice();
    const bold = s => emphLine(s, pending).replace(/\uE010|\uE011/g,'**'); const dashOK = dashPrompt(b.lines);
    lines = lines.map(l=>{
      if(!pending.length) return l;
      const m = labelMatch(l, dashOK);
      if(!m) return bold(l);
      if(/^מקור/.test(m.label) || !m.rest) return l;
      return m.prefix + bold(l.slice(m.prefix.length)); });
  }
  while(lines.length && !lines[0].trim()) lines.shift();
  while(lines.length && !lines[lines.length-1].trim()) lines.pop();
  let head = '#### '+b.heading+(marks && b.imp ? ' '+IMP[b.imp].stars : '');
  if(marks && b.ann.why) head += '\n> **למה זה חשוב:** '+b.ann.why;
  if(marks && b.ann.exam && b.ann.exam.length) head += '\n> **הופיע במבחן:** '+b.ann.exam.join('; ');
  return head+(lines.length? '\n'+lines.join('\n') : '');
}
function exportMarkdown(uids, types, o){
  const out=[]; let count=0;
  for(const uid of uids){
    const p = getUnit(uid).parsed;
    const intro = p.blocks.find(b=>b.kind==='intro');
    out.push('# '+p.title);
    if(intro) out.push(...intro.lines.filter(l=>!isHr(l)));
    let s1=null, s2=null;
    for(const b of p.blocks){
      if(b.kind!=='item' || b.dupOf || !types.has(b.type)) continue;
      if(o.minImp && (b.imp||0) < o.minImp) continue;
      if(b.sec1 && b.sec1!==s1){ out.push('', '## '+b.sec1.heading); s1=b.sec1; s2=null; }
      if(b.sec && b.sec.depth===2 && b.sec!==s2){ out.push('', '### '+b.sec.heading); s2=b.sec; }
      out.push('', itemMarkdown(b, o)); count++;
    }
    out.push('', '');
  }
  return { text: out.join('\n').replace(/\n{3,}/g,'\n\n').trim()+'\n', count };
}

/* ---------- export dialog ---------- */
function openExport(init){
  init = init||{};
  const us = availableUnits();
  const unitBoxes = us.map(uid=>{ const t=getUnit(uid).parsed.title.replace(/\s*\([A-Za-z][^()]*\)\s*$/,'');
    return '<label class="ck"><input type="checkbox" name="exU" value="'+uid+'"'+(init.allUnits||current.page!=='units'||uid===current.uid?' checked':'')+'> '+renderInline(t)+'</label>'; }).join('');
  const typeBoxes = TYPE_ORDER.map(t=>'<label class="ck"><input type="checkbox" name="exT" value="'+t+'" checked> <i class="tdot" style="--c:var(--'+cssVar(t)+')"></i>'+TYPES[t].label+'</label>').join('');
  const m = openModal('ייצוא ל-Markdown', 
    '<p class="lead">הפריטים מיוצאים מילה במילה מקובצי המקור, כולל ה-LaTeX, מסודרים לפי סעיפים.</p>'+
    '<div class="presets"><span>בחירה מהירה:</span><button type="button" data-pre="all">הכול</button><button type="button" data-pre="imp">המדורגים (★★ ומעלה), עם הדגשות</button><button type="button" data-pre="theory">רק הגדרות, משפטים ולמות</button><button type="button" data-pre="concl">רק מסקנות ותוצאות</button></div>'+
    '<div class="ex-grid">'+
      '<fieldset><legend>יחידות</legend>'+unitBoxes+'<button type="button" class="linkbtn" data-all="exU">בחירת כל היחידות</button></fieldset>'+
      '<fieldset><legend>סוגי פריטים</legend>'+typeBoxes+'</fieldset>'+
      '<fieldset><legend>בשאלות ובדוגמאות שיש להן פתרון</legend>'+
        '<label class="ck"><input type="radio" name="exQ" value="full" checked> הנוסח והפתרון</label>'+
        '<label class="ck"><input type="radio" name="exQ" value="prompt"> רק הנוסח</label>'+
        '<label class="ck"><input type="radio" name="exQ" value="result"> רק התוצאה והמסקנה</label>'+
        '<label class="ck sep"><input type="checkbox" id="exSrc" checked> לכלול את שורת «מקור בספר»</label></fieldset>'+
      '<fieldset><legend>חשיבות</legend>'+
        '<label class="ck"><input type="radio" name="exI" value="0"'+(init.minImp?'':' checked')+'> כל הפריטים</label>'+
        '<label class="ck"><input type="radio" name="exI" value="1"'+(init.minImp===1?' checked':'')+'> <b class="st">★</b> ומעלה</label>'+
        '<label class="ck"><input type="radio" name="exI" value="2"'+(init.minImp===2?' checked':'')+'> <b class="st">★★</b> ומעלה</label>'+
        '<label class="ck"><input type="radio" name="exI" value="3"'+(init.minImp===3?' checked':'')+'> <b class="st">★★★</b> ליבה בלבד</label>'+
        '<label class="ck sep"><input type="checkbox" id="exMarks"'+(init.marks?' checked':'')+'> לסמן בקובץ כוכבי חשיבות, «למה זה חשוב» והדגשות</label></fieldset>'+
    '</div>'+
    '<div class="ex-prev"><div class="ex-meta" id="exMeta"></div><textarea id="exOut" readonly spellcheck="false" dir="rtl" aria-label="תצוגה מקדימה של הקובץ"></textarea></div>'+
    '<div class="modal-f"><button type="button" class="btn primary" id="exSave">הורדת קובץ Markdown</button><button type="button" class="btn" id="exCopy">העתקת הטקסט</button></div>',
    {cls:'wide', focus:'#exSave'});
  const el = m.el; let result=null, fname='';
  const vals = n => [...el.querySelectorAll('input[name="'+n+'"]:checked')].map(i=>i.value);
  function update(){
    const uids = vals('exU').map(Number), types = new Set(vals('exT'));
    const o = { qMode: vals('exQ')[0], withSource: el.querySelector('#exSrc').checked, minImp: +vals('exI')[0], marks: el.querySelector('#exMarks').checked };
    result = uids.length && types.size ? exportMarkdown(uids, types, o) : {text:'', count:0};
    fname = 'calc2-'+(uids.length===us.length && us.length>1 ? 'all-units' : 'unit-'+uids.join('-'))+(o.minImp===3?'-core':o.minImp===2?'-important':o.minImp===1?'-rated':'')+'.md';
    el.querySelector('#exOut').value = result.text;
    el.querySelector('#exMeta').innerHTML = result.count ? '<b>'+result.count+'</b> פריטים, <bdi>'+Math.max(1,Math.round(new Blob([result.text]).size/1024))+' KB</bdi>, בקובץ <code>'+fname+'</code>' : 'בחרו לפחות יחידה אחת וסוג פריט אחד.';
    el.querySelector('#exSave').disabled = el.querySelector('#exCopy').disabled = !result.count;
  }
  el.addEventListener('change', update);
  el.addEventListener('click', async e=>{
    const pre = e.target.closest('[data-pre]');
    if(pre){ const k=pre.dataset.pre;
      el.querySelectorAll('input[name="exT"]').forEach(i=> i.checked = k==='all' ? true : k==='theory' ? ['definition','theorem','lemma'].includes(i.value) : ['question','example'].includes(i.value));
      el.querySelector('input[name="exQ"][value="'+(k==='concl'?'result':'full')+'"]').checked = true;
      el.querySelector('input[name="exI"][value="'+(k==='imp'?2:0)+'"]').checked = true; el.querySelector('#exMarks').checked = k==='imp'; update(); }
    const all = e.target.closest('[data-all]'); if(all){ el.querySelectorAll('input[name="'+all.dataset.all+'"]').forEach(i=>i.checked=true); update(); }
    if(e.target.closest('#exCopy')) copyText(result.text, 'הטקסט הועתק ('+result.count+' פריטים)');
    if(e.target.closest('#exSave')){
      const r = await saveFile(fname, result.text);
      toast(r==='saved' ? 'הקובץ '+fname+' נשמר' : r==='declined' ? 'השמירה בוטלה' : r==='busy' ? 'חלון שמירה כבר פתוח' : 'לא ניתן לשמור כאן. השתמשו בכפתור ההעתקה.');
    }
  });
  update();
}

/* ---------- quick jump (Ctrl+K) ---------- */
let palIndex=null;
function buildIndex(){
  const idx=[];
  for(const uid of allUnits()){
    for(const b of getUnit(uid).parsed.blocks){
      if(b.kind==='section') idx.push({uid, id:b.id, sec:true, ref:isRef(uid), h:b.heading, t:plain(b.heading).toLowerCase(), where:unitName(uid)});
      if(b.kind==='item' && !b.dupOf) idx.push({uid, id:b.id, type:b.type, key:b.key, ref:isRef(uid), imp:b.imp||0, h:b.heading, t:plain(b.heading).toLowerCase(), body:b.search, where:unitName(uid)+(b.sec? ', '+(b.sec.num? 'סעיף '+b.sec.num : b.sec.short||b.sec.heading) : '')});
    }
  }
  return idx;
}
function openPalette(){
  palIndex = palIndex || buildIndex();
  const m = openModal('קפיצה מהירה', '<div class="pal-in"><input type="search" id="palQ" placeholder="שם או מספר: משפט 1.29, טיילור, דיריכלה…" autocomplete="off" aria-label="חיפוש פריט או סעיף" role="combobox" aria-expanded="true" aria-controls="palList"></div><div class="pal-list" id="palList" role="listbox"></div><div class="pal-foot">↑ ↓ לבחירה, Enter למעבר, Esc לסגירה</div>', {cls:'pal', noHead:true, focus:'#palQ'});
  const el=m.el, q=el.querySelector('#palQ'), list=el.querySelector('#palList'); let rows=[], act=0;
  function row(r){ return '<div class="pal-row" role="option" data-go="#/u'+r.uid+'/'+r.id+'">'+(r.sec? '<span class="pal-sec">§</span>' : '<i class="tdot" style="--c:var(--'+cssVar(r.type)+')"></i>')+'<span class="pal-t">'+renderInline(r.h)+(r.imp? ' <b class="st">'+IMP[r.imp].stars+'</b>':'')+'</span><span class="pal-m">'+esc(r.where)+'</span></div>'; }
  function render(){
    const s = q.value.trim().toLowerCase(); let html='';
    if(!s){
      const st = palIndex.filter(r=>r.key && starred.has(r.key)).slice(0,20);
      const secs = palIndex.filter(r=>r.sec && r.uid===current.uid);
      const top = palIndex.filter(r=>r.imp===3 && r.uid===current.uid);
      rows = st.concat(top, secs);
      html = (st.length? '<div class="pal-cap">מסומנים לחזרה</div>'+st.map(row).join('') : '') + (top.length? '<div class="pal-cap">★★★ הליבה של היחידה הנוכחית</div>'+top.map(row).join(''):'') + (secs.length? '<div class="pal-cap">סעיפי היחידה הנוכחית</div>'+secs.map(row).join(''):'');
    } else {
      const ws = s.split(/\s+/);
      rows = palIndex.map((r,i)=>{ let sc=0; if(ws.every(w=>r.t.includes(w))) sc = 3 + (r.t.startsWith(s)?2:0) + (r.t.includes(s)?1:0) + (r.uid===current.uid?.5:0) + (r.imp||0)*.4; else if(r.body && ws.every(w=>r.body.includes(w))) sc = 1; if(sc && r.ref && r.uid!==current.uid) sc -= 0.9; return {r, sc, i}; })
        .filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc || a.i-b.i).slice(0,60).map(x=>x.r);
      html = rows.length ? rows.map(row).join('') : '<div class="pal-empty">אין פריט או סעיף בשם הזה. נסו מספר, למשל 2.11.</div>';
    }
    list.innerHTML = html; act=0; mark();
  }
  function mark(){ const els=list.querySelectorAll('.pal-row'); els.forEach((e,i)=>{ e.classList.toggle('on', i===act); e.setAttribute('aria-selected', i===act); }); if(els[act]) els[act].scrollIntoView({block:'nearest'}); }
  function go(i){ const els=list.querySelectorAll('.pal-row'); if(!els[i]) return; const h=els[i].dataset.go; m.close(); navigate(h); }
  q.addEventListener('input', render);
  q.addEventListener('keydown', e=>{ const n=list.querySelectorAll('.pal-row').length;
    if(e.key==='ArrowDown'){ e.preventDefault(); act=Math.min(n-1,act+1); mark(); }
    if(e.key==='ArrowUp'){ e.preventDefault(); act=Math.max(0,act-1); mark(); }
    if(e.key==='Enter'){ e.preventDefault(); go(act); } });
  list.addEventListener('click', e=>{ const r=e.target.closest('.pal-row'); if(r) go([...list.children].filter(c=>c.classList.contains('pal-row')).indexOf(r)); });
  render();
}

/* ---------- display settings ---------- */
function openSettings(){
  const seg = (k, opts)=> '<div class="segc" role="group">'+opts.map(([v,l])=>'<button type="button" data-k="'+k+'" data-v="'+v+'" aria-pressed="'+(String(prefs[k])===String(v))+'">'+l+'</button>').join('')+'</div>';
  const m = openModal('הגדרות תצוגה',
    '<div class="setrow"><span>ערכת צבעים</span>'+seg('theme',[['null','לפי המערכת'],['light','בהירה'],['dark','כהה']])+'</div>'+
    '<div class="setrow"><span>גודל הטקסט</span><div class="rng"><input type="range" min="15" max="24" step="1" id="fsR" value="'+prefs.fs+'" aria-label="גודל הטקסט"><b id="fsV">'+prefs.fs+'</b></div></div>'+
    '<div class="setrow"><span>הדגשת המושגים החשובים</span>'+seg('emph',[['marker','מודגש עם מרקר'],['bold','מודגש בלבד'],['off','ללא הדגשה']])+'</div>'+
    '<div class="setrow"><span>מרווח בין השורות</span>'+seg('lh',[['normal','רגיל'],['airy','מרווח']])+'</div>'+
    '<div class="setrow"><span>רוחב עמודת הטקסט</span>'+seg('width',[['normal','רגיל'],['wide','רחב']])+'</div>'+
    '<div class="setrow"><span>גופן הטקסט</span>'+seg('font',[['serif','עם תגים (סריף)'],['sans','ללא תגים']])+'</div>'+
    '<div class="setrow"><span>תפריט הצד (מסך רחב)</span>'+seg('side',[['shown','מוצג'],['hidden','מוסתר']])+'</div>'+
    '<div class="setrow"><span>דירוג החשיבות (כוכבים, סימון בשוליים והסבר)</span>'+seg('stars',[['on','מוצג'],['off','מוסתר']])+'</div>'+
    '<div class="setrow"><span>הדירוגים שלך <small class="ovn">'+(overrideCount()? overrideCount()+' שינויים' : 'ללא שינויים')+'</small></span><button type="button" class="btn" id="ratingsIO">ייצוא, ייבוא ואיפוס</button></div>'+
    '<div class="setrow danger"><span>ההתקדמות נשמרת בדפדפן הזה בלבד</span><button type="button" class="btn" id="resetP">מחיקת כל הסימונים</button></div>', {cls:'settings'});
  const el=m.el;
  el.addEventListener('click', e=>{
    const b=e.target.closest('[data-k]');
    if(b){ const k=b.dataset.k, v=b.dataset.v; prefs[k] = v==='null'? null : v; savePrefs(); applyPrefs();
      el.querySelectorAll('[data-k="'+k+'"]').forEach(x=>x.setAttribute('aria-pressed', x===b)); if(k==='width'||k==='side'){ const u=units[current.uid]; if(u&&u.parsed) setTimeout(()=>drawPartition(u.parsed),60); } }
    if(e.target.closest('#ratingsIO')){ closeModal(); openRatingsIO(); return; }
    if(e.target.closest('#resetP')){ if(confirm('למחוק את כל הסימונים «למדתי» ו«לחזרה» בכל היחידות?')){ learned.clear(); starred.clear(); LS.set('calc2:learned',[]); LS.set('calc2:starred',[]); refreshProgress(); applyFilters(); toast('כל הסימונים נמחקו'); } }
  });
  el.querySelector('#fsR').addEventListener('input', e=>{ prefs.fs=+e.target.value; el.querySelector('#fsV').textContent=prefs.fs; savePrefs(); applyPrefs(); });
}

/* ---------- keyboard ---------- */
const KEYS = [['/','חיפוש בתוך היחידה'],['Ctrl + K','קפיצה מהירה לכל פריט או סעיף'],['J','הפריט הבא'],['K','הפריט הקודם'],['M','סימון הפריט הנוכחי כנלמד'],['B','סימון הפריט הנוכחי לחזרה'],['S','הצגה או הסתרה של הפתרון (במצב תרגול)'],['P','הפעלה או כיבוי של מצב תרגול'],['E','ייצוא ל-Markdown'],['?','רשימת הקיצורים'],['Esc','סגירת חלון או ניקוי החיפוש']];
function openKeys(){ openModal('קיצורי מקלדת', '<table class="keys">'+KEYS.map(([k,d])=>'<tr><td><kbd>'+esc(k)+'</kbd></td><td>'+esc(d)+'</td></tr>').join('')+'</table><p class="lead">הקיצורים פועלים בכל פריסת מקלדת, גם בעברית.</p>'); }
let cursorEl=null;
function visibleItems(){ const u=units[current.uid]; return u&&u.el ? [...u.el.querySelectorAll('article.item[data-id]')].filter(a=>a.offsetParent) : []; }
function headerOffset(){ const tb=document.getElementById('toolbar'); return (document.querySelector('.topbar').offsetHeight) + (tb && getComputedStyle(tb).position==='sticky' ? tb.offsetHeight : 0); }
function moveCursor(d){
  const its=visibleItems(); if(!its.length) return;
  let i = cursorEl ? its.indexOf(cursorEl) : -1;
  const top=headerOffset()+4;
  if(i<0 || Math.abs(cursorEl.getBoundingClientRect().top-top) > innerHeight){ i = its.findIndex(a=>a.getBoundingClientRect().bottom > top+30); if(d<0) i=Math.max(0,i); else i=i-1; }
  i = Math.max(0, Math.min(its.length-1, i+d));
  setCursor(its[i]);
}
function setCursor(a){ if(cursorEl) cursorEl.classList.remove('cursor'); cursorEl=a; if(!a) return; a.classList.add('cursor'); scrollToEl(a, {smooth:true}); }
function cursorOrTop(){ if(cursorEl && cursorEl.isConnected && cursorEl.offsetParent) return cursorEl; const top=headerOffset(); return visibleItems().find(a=>a.getBoundingClientRect().bottom > top+30); }
document.addEventListener('keydown', e=>{
  if((e.ctrlKey||e.metaKey) && e.code==='KeyK'){ e.preventDefault(); if(App.modalOpen()) closeModal(); else openPalette(); return; }
  if(App.modalOpen() || isTyping() || e.ctrlKey || e.metaKey || e.altKey) return;
  if(e.key==='?' || (e.code==='Slash' && e.shiftKey)){ e.preventDefault(); openKeys(); return; }
  if(e.code==='KeyE'){ e.preventDefault(); openExport(); return; }
  if(current.page!=='units') return;
  const a = ['KeyM','KeyB','KeyS'].includes(e.code) ? cursorOrTop() : null;
  switch(e.code){
    case 'KeyJ': e.preventDefault(); moveCursor(1); break;
    case 'KeyK': e.preventDefault(); moveCursor(-1); break;
    case 'KeyM': if(a){ toggleLearned(a.dataset.key); a.classList.add('cursor'); cursorEl=a; } break;
    case 'KeyB': if(a){ toggleStar(a.dataset.key); a.classList.add('cursor'); cursorEl=a; } break;
    case 'KeyS': if(a && a.classList.contains('has-answer') && prefs.practice){ const r=a.querySelector('.reveal'); if(r) r.click(); } break;
    case 'KeyP': { const t=document.getElementById('practiceT'); if(t){ t.click(); toast(prefs.practice?'מצב תרגול פעיל: הפתרונות מוסתרים':'מצב תרגול כבוי'); } } break;
  }
});

/* ---------- breadcrumb ---------- */
function updateCrumb(u, sid){
  const c=document.getElementById('crumb'); if(!c) return;
  const b=u.parsed.blocks.find(x=>x.id===sid); if(!b) return;
  const chain=[b.parent, b].filter(Boolean);
  c.innerHTML='<span>'+esc(unitName(u.parsed.uid))+'</span>'+chain.map(s=>'<i>›</i><a href="#/u'+u.parsed.uid+'/'+s.id+'">'+renderInline(s.heading.replace(/^סעיף\s+/,''))+'</a>').join('');
}

/* ---------- resume where you left off ---------- */
const lastPos = LS.get('calc2:pos', {}); const offered = new Set(); let posT=null;
addEventListener('scroll', ()=>{ if(posT) return; posT=setTimeout(()=>{ posT=null;
  if(current.page!=='units') return; const top=headerOffset();
  const a = visibleItems().find(x=>x.getBoundingClientRect().bottom > top+40);
  if(a && lastPos[current.uid]!==a.dataset.id){ lastPos[current.uid]=a.dataset.id; LS.set('calc2:pos', lastPos); }
}, 500); }, {passive:true});
App.on('unitShown', u=>{
  const uid=u.parsed.uid, id=lastPos[uid];
  if(offered.has(uid) || !id || /^#\/u\d+\/./.test(location.hash)) return; offered.add(uid);
  const b = blockById(id, uid); const first = u.parsed.blocks.find(x=>x.kind==='item');
  if(!b || b===first) return;
  toast('בפעם הקודמת עצרת ב«'+renderInline(b.heading)+'»', {label:'המשך משם', run:()=>navigate('#/u'+uid+'/'+id)});
});

/* ---------- buttons & misc ---------- */
document.addEventListener('click', e=>{
  const c=e.target.closest('.cpy'); if(c){ copyText(c.dataset.tex, 'קוד ה-LaTeX הועתק'); return; }
  const t=e.target.closest('[data-open]'); if(!t) return;
  document.body.classList.remove('drawer');
  ({palette:openPalette, export:openExport, settings:openSettings, keys:openKeys})[t.dataset.open]();
});

window.Calc2 = { App, units, getUnit, exportMarkdown, itemMarkdown, openExport, openPalette, openSettings };
