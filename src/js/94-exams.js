/* ================= past exams (content/exams/*.md) =================
   One file per exam. "## שאלה 1א" starts a sub-question; its metadata lines:
     @main: 5            the unit the sub-question is mainly about (used for the horizontal practice)
     @uses: 5, 4, c1-8   every unit whose material the solution uses (c1-N = Calculus 1 unit N, c1-? = not added yet)
     @type / @topic / @tags (tags separated by ";")
   then "### נוסח", "### פתרון", "### הערות". Inside the text, [[5:משפט 5.22]] links to that item (Calculus 1: [[c1-8:משפט 8.10]]). */
const EXAMS = [];
document.querySelectorAll('script[type="text/markdown"][data-exam]').forEach(s=>{ try{ EXAMS.push(parseExam(s.dataset.exam, s.textContent)); }catch(e){ console.error('exam', s.dataset.exam, e); } });
EXAMS.sort((a,b)=>(+a.meta.order||0)-(+b.meta.order||0));

function parseExam(id, raw){
  const ex = { id, title:'', meta:{}, qs:[] }; let q=null, sec=null;
  for(const line of raw.replace(/\r\n?/g,'\n').split('\n')){
    let m;
    if(!q && (m=/^#\s+(.*)$/.exec(line))){ ex.title=m[1].trim(); continue; }
    if((m=/^##\s+(.*?)\s*$/.exec(line)) && !/^###/.test(line)){ q={ exam:ex, heading:m[1], meta:{}, secs:{}, order:[] }; ex.qs.push(q); sec=null; continue; }
    if(q && (m=/^###\s+(.*?)\s*$/.exec(line))){ sec=m[1]; q.secs[sec]=[]; q.order.push(sec); continue; }
    if((m=/^@(\w+):\s*(.*)$/.exec(line)) && !sec){ (q? q.meta : ex.meta)[m[1]] = m[2].trim(); continue; }
    if(q && sec) q.secs[sec].push(line);
  }
  const heb = {'א':'a','ב':'b','ג':'c','ד':'d','ה':'e'};
  ex.short = (ex.meta.term||'')+' '+(ex.meta.session||'').replace(/^מועד\s*/,'');
  ex.qs.forEach(q=>{
    const m = /(\d+)\s*([א-ה])?(\d*)/.exec(q.heading) || [];   /* "שאלה 5ב2" = question 5, part ב, variant 2 */
    q.num = +m[1] || 0; q.part = (m[2] || '') + (m[3] || '');
    q.id = 'x-'+ex.id+'-q'+q.num+(m[2]? heb[m[2]]||'' : '')+(m[3]||'');
    q.main = +q.meta.main || 0;
    q.uses = (q.meta.uses||'').split(/[,\s]+/).filter(Boolean).map(t=> /^c1/.test(t) ? 'c1' : +t).filter((v,i,a)=>v && a.indexOf(v)===i);
    q.type = q.meta.type || ''; q.topic = q.meta.topic || '';
    q.tags = (q.meta.tags||'').split(';').map(s=>s.trim()).filter(Boolean);
    q.label = ex.short+' · '+q.num+q.part;
    q.text = (q.heading+' '+q.topic+' '+q.tags.join(' ')+' '+q.type+' '+Object.values(q.secs).flat().join(' ')).toLowerCase();
  });
  return ex;
}
const allExamQs = () => EXAMS.flatMap(e=>e.qs);

/* ---------- references [[unit:label]] ---------- */
const XREF_RE = /\[\[(c1-(?:\d+|\?)|[1-7]):([^\]|]+?)(?:\|([^\]]+))?\]\]/g;
function refUid(u){ return /^c1-/.test(u) ? (u==='c1-?' ? null : REF_BASE + +u.slice(3)) : +u; }
function resolveRef(u, label){
  const uid = refUid(u); if(uid===null || !units[uid]) return { pending:true, uid };
  const p = getUnit(uid).parsed, om = /^(.*?)#(\d+)$/.exec(label), base = om ? om[1].trim() : label;
  let hit = p.blocks.filter(b=>b.kind==='item' && !b.dupOf && (b.heading===base || b.heading.startsWith(base+' ') || b.heading.startsWith(base+':')));
  if(om) hit = hit.slice(+om[2]-1, +om[2]);   /* "שאלה 5#2" = the second item with that heading */
  return hit.length===1 ? { uid, b:hit[0] } : { missing:true, uid };
}
function refChip(u, label, text){
  const r = resolveRef(u, label), where = /^c1/.test(u) ? 'אינפי 1'+(u==='c1-?'?'':' · יחידה '+u.slice(3)) : 'יחידה '+u;
  const shown = renderInline(text || label.replace(/#\d+$/,''));
  if(r.b) return '<a class="xref'+(isRef(r.uid)?' c1':' u'+r.uid)+'" href="#/u'+r.uid+'/'+r.b.id+'" title="'+esc(unitName(r.uid)+': '+plain(r.b.heading))+'">'+shown+'<small>'+esc(where)+'</small></a>';
  if(r.pending) return '<span class="xref pending" title="'+esc(where+' עדיין לא נוספה לאתר; ההפניה תעודכן כשתתווסף')+'">'+shown+'<small>'+esc(where)+' · טרם נוסף</small></span>';
  return '<span class="xref missing" title="הפניה שלא נמצאה">'+shown+'</span>';
}
/* render markdown lines with [[…]] references turned into links (placeholders survive the markdown step) */
function renderExMd(lines){
  const chips=[]; const src = lines.map(l=>l.replace(XREF_RE, (m,u,label,text)=>{ chips.push(refChip(u,label.trim(),text)); return '\uE030'+(chips.length-1)+'\uE031'; }));
  return renderMd(src).replace(/\uE030(\d+)\uE031/g, (m,i)=>chips[+i]);
}
function qRefs(q){
  const seen=new Map();
  Object.values(q.secs).flat().forEach(l=>{ let m; XREF_RE.lastIndex=0; while((m=XREF_RE.exec(l))){ const k=m[1]+':'+m[2].trim(); if(!seen.has(k)) seen.set(k,[m[1],m[2].trim()]); } });
  return [...seen.values()];
}
/* item key -> exam sub-questions whose solution refers to it (computed once) */
let EXBACK = null;
function examBacklinks(){
  if(EXBACK) return EXBACK; EXBACK = {};
  allExamQs().forEach(q=> qRefs(q).forEach(([u,label])=>{ const r=resolveRef(u,label); if(r.b) (EXBACK[r.b.key] = EXBACK[r.b.key]||[]).push(q); }));
  return EXBACK;
}
function examLinksHtml(b){
  if(b.dupOf || !EXAMS.length) return '';
  const qs = examBacklinks()[b.key]; if(!qs || !qs.length) return '';
  return '<div class="exlinks"><b>שימש בפתרון מבחן:</b> '+qs.map(q=>'<a href="#/exams/'+q.id+'">'+esc(q.label)+'</a>').join('')+'</div>';
}
function unitExamSummary(uid){
  if(!EXAMS.length || isRef(uid)) return '';
  const qs = allExamQs(), main = qs.filter(q=>q.main===uid).length, uses = qs.filter(q=>q.main!==uid && q.uses.includes(uid)).length;
  if(!main && !uses) return '';
  return '<a class="exsum" href="#/exams" data-exgo="'+uid+'"><b>'+main+'</b> תרגילי מבחן שעיקרם ביחידה'+(uses? ' · עוד <b>'+uses+'</b> שמשתמשים בה' : '')+' ←</a>';
}

/* ---------- the page ---------- */
const UNIT_TITLES = u => { const x=getUnit(u); return x ? x.parsed.title.replace(/^יחידה\s+\d+\s*:\s*/,'').replace(/\s*\([A-Za-z][^()]*\)\s*$/,'') : ''; };
App.registerPage('exams', { title:'מבחנים', render(el){
  const st = Object.assign({ view:'exam', main:0, uses:'', exam:'', type:'', q:'' }, LS.get('calc2:exams', {}));
  if(EXAMS.length===0){ el.innerHTML='<div class="empty"><div class="glyph">✎</div><h2>מבחנים</h2><p>עדיין לא נוספו מבחנים.</p></div>'; return; }
  const qsAll = allExamQs(), cus = availableUnits();
  const types = [...new Set(qsAll.map(q=>q.type).filter(Boolean))];
  const uc = u => ' style="--uc:var(--u'+u+')"';

  function pass(q){
    if(st.main && q.main!==st.main) return false;
    if(st.uses){ if(st.uses==='c1'){ if(!q.uses.includes('c1')) return false; } else if(!q.uses.includes(+st.uses)) return false; }
    if(st.exam && q.exam.id!==st.exam) return false;
    if(st.type && q.type!==st.type) return false;
    if(st.q){ const w=st.q.toLowerCase().split(/\s+/).filter(Boolean); if(!w.every(x=>q.text.includes(x))) return false; }
    return true;
  }
  function card(q){
    const usesOther = q.uses.filter(u=>u!==q.main);
    const refs = qRefs(q);
    const sec = name => q.secs[name] ? renderExMd(q.secs[name]) : '';
    return '<article class="item question exq has-answer'+(pass(q)?'':' hide')+'" id="'+q.id+'" data-key="exam|'+q.id+'">'+
      '<div class="item-h"><h4><span class="tw">'+esc(q.heading.replace(/\s.*$/,''))+'</span> '+esc(q.heading.replace(/^\S+\s*/,''))+'</h4>'+
        '<span class="exsrc">'+esc(q.exam.short)+'</span>'+
        (q.main? '<span class="uc main"'+uc(q.main)+' title="היחידה העיקרית: '+esc(UNIT_TITLES(q.main))+'">יחידה '+q.main+'</span>' : '')+'</div>'+
      '<div class="exmeta">'+(q.type? '<span class="extype">'+esc(q.type)+'</span>' : '')+'<span class="extopic">'+renderInline(q.topic)+'</span></div>'+
      '<div class="exmeta2">'+(usesOther.length? '<span class="exl">משתמש גם ב:</span>'+usesOther.map(u=>u==='c1'? '<span class="uc c1">אינפי 1</span>' : '<span class="uc"'+uc(u)+'>יחידה '+u+'</span>').join('') : '')+
        (q.tags.length? '<span class="extags">'+q.tags.map(t=>'<button type="button" class="extag" data-tag="'+esc(t)+'">'+esc(t)+'</button>').join('')+'</span>' : '')+'</div>'+
      '<div class="seg seg-prompt"><span class="seg-label">נוסח:</span> <div class="md">'+sec('נוסח')+'</div></div>'+
      '<button class="reveal" type="button">הצג פתרון</button>'+
      '<div class="answer"><div class="seg seg-answer"><span class="seg-label">פתרון (הפתרון הרשמי, בהרחבה):</span> <div class="md">'+sec('פתרון')+'</div></div>'+
        (q.secs['הערות'] ? '<div class="seg seg-aside aside"><span class="seg-label">הערות:</span> <div class="md">'+sec('הערות')+'</div></div>' : '')+
        (refs.length? '<div class="exrefs"><b>הפריטים שהפתרון נשען עליהם:</b> '+refs.map(([u,l])=>refChip(u,l)).join('')+'</div>' : '')+
      '</div></article>';
  }
  function matrix(){
    const maxQ = Math.max(...EXAMS.map(e=>Math.max(...e.qs.map(q=>q.num))));
    const head = '<tr><th>מבחן</th>'+Array.from({length:maxQ},(_,i)=>'<th>שאלה '+(i+1)+'</th>').join('')+'</tr>';
    const rows = EXAMS.map(e=>'<tr><th><button type="button" class="linkbtn" data-exam="'+e.id+'">'+esc(e.short)+'</button></th>'+Array.from({length:maxQ},(_,i)=>{
      const parts = e.qs.filter(q=>q.num===i+1);
      return '<td>'+parts.map(q=>'<a class="mcell'+(pass(q)?'':' dim')+'" href="#/exams/'+q.id+'"'+uc(q.main)+' title="'+esc(q.num+q.part+': '+q.topic)+'">'+(q.part||'·')+'<b>'+q.main+'</b></a>').join('')+'</td>';
    }).join('')+'</tr>').join('');
    const counts = cus.map(u=>[u, qsAll.filter(q=>q.main===u).length]);
    const mx = Math.max(1,...counts.map(c=>c[1]));
    return '<section class="exmap"><h2>מפת המבחנים</h2><p class="ip-lead">כל תא הוא סעיף, והמספר והצבע הם היחידה העיקרית שלו. כך רואים אילו יחידות חוזרות באיזו שאלה.</p>'+
      '<div class="mtab"><table>'+head+rows+'</table></div>'+
      '<div class="ubars">'+counts.map(([u,c])=>'<button type="button" class="ubar'+(st.main===u?' on':'')+'" data-main="'+u+'"'+uc(u)+' title="'+esc(UNIT_TITLES(u))+'"><i style="height:'+Math.round(8+72*c/mx)+'px"></i><b>'+c+'</b><span>יחידה '+u+'</span></button>').join('')+'</div></section>';
  }
  function draw(){
    LS.set('calc2:exams', st);
    const vis = qsAll.filter(pass);
    let list = '';
    if(st.view==='unit'){
      cus.forEach(u=>{ const qs = qsAll.filter(q=>q.main===u); if(!qs.length) return;
        list += '<section class="exgroup'+(qs.some(pass)?'':' hide')+'"'+uc(u)+'><h2><span class="num">'+u+'</span> '+renderInline(UNIT_TITLES(u))+' <small>'+qs.filter(pass).length+' סעיפים</small></h2>'+qs.map(card).join('')+'</section>'; });
    } else {
      EXAMS.forEach(e=>{ const qs = e.qs;
        list += '<section class="exgroup'+(qs.some(pass)?'':' hide')+'"><h2>'+esc(e.title)+' <small>'+esc(e.meta.code||'')+'</small></h2>'+(e.meta.instructions? '<p class="exinstr">'+esc(e.meta.instructions)+'</p>' : '')+qs.map(card).join('')+'</section>'; });
    }
    const chip = (k,v,l,extra)=>'<button type="button" class="chip exf" data-k="'+k+'" data-v="'+v+'" aria-pressed="'+(String(st[k])===String(v))+'"'+(extra||'')+'>'+l+'</button>';
    el.innerHTML = '<div class="col exams">'+
      '<h1>מבחנים</h1>'+
      '<p class="ip-lead">'+EXAMS.length+' מבחנים, '+qsAll.length+' סעיפים. כל פתרון הוא הפתרון הרשמי, בהרחבה, עם הפניה מדויקת לכל הגדרה, משפט או שאלה שהוא נשען עליהם (לחיצה על הפניה פותחת את הפריט). לכל סעיף מסומנת היחידה העיקרית שלו ושאר היחידות שהפתרון משתמש בהן, כדי שאפשר יהיה לתרגל יחידה אחת לרוחב כל המבחנים. הפניות אפורות מסומנות «טרם נוסף» מצביעות על יחידות של אינפי 1 שעוד לא נוספו לאתר.</p>'+
      matrix()+
      '<div class="exctrl" id="exctrl">'+
        '<div class="exrow"><span class="exlab">תצוגה</span>'+chip('view','exam','לפי מבחן')+chip('view','unit','לפי יחידה (תרגול לרוחב)')+
          '<label class="switch"><input type="checkbox" id="exPractice"'+(prefs.practice?' checked':'')+'> מצב תרגול (פתרונות מוסתרים)</label></div>'+
        '<div class="exrow"><span class="exlab">היחידה העיקרית</span>'+chip('main',0,'הכול')+cus.map(u=>chip('main',u,'יחידה '+u, uc(u))).join('')+'</div>'+
        '<div class="exrow"><span class="exlab">מסננים נוספים</span>'+
          '<select data-k="uses" aria-label="משתמש ביחידה"><option value="">משתמש בכל יחידה</option>'+cus.map(u=>'<option value="'+u+'"'+(String(st.uses)===String(u)?' selected':'')+'>משתמש ביחידה '+u+'</option>').join('')+'<option value="c1"'+(st.uses==='c1'?' selected':'')+'>משתמש באינפי 1</option></select>'+
          '<select data-k="exam" aria-label="מבחן"><option value="">כל המבחנים</option>'+EXAMS.map(e=>'<option value="'+e.id+'"'+(st.exam===e.id?' selected':'')+'>'+esc(e.short)+'</option>').join('')+'</select>'+
          '<select data-k="type" aria-label="סוג שאלה"><option value="">כל סוגי השאלות</option>'+types.map(t=>'<option'+(st.type===t?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select>'+
          '<input type="search" data-k="q" value="'+esc(st.q)+'" placeholder="נושא או תגית: דיריכלה, טיילור…" aria-label="חיפוש בנושאים ובתגיות">'+
          '<span class="excount"><b>'+vis.length+'</b> מתוך '+qsAll.length+' סעיפים</span>'+
          ((st.main||st.uses||st.exam||st.type||st.q)? '<button type="button" class="linkbtn" id="exClear">ניקוי מסננים</button>' : '')+'</div>'+
      '</div>'+list+
      (vis.length? '' : '<p class="ip-lead">אין סעיפים שעונים על המסננים.</p>')+'</div>';
    fitWide(el);
  }
  el.addEventListener('click', e=>{
    const rv = e.target.closest('.reveal'); if(rv){ const a=rv.closest('article'); a.classList.toggle('revealed'); rv.textContent = a.classList.contains('revealed')? 'הסתר פתרון':'הצג פתרון'; fitWide(a); return; }
    const f = e.target.closest('.exf'); if(f){ const k=f.dataset.k, v=f.dataset.v; st[k] = (k==='main')? (+v===st.main && +v? 0 : +v) : v; draw(); return; }
    const bar = e.target.closest('.ubar'); if(bar){ st.main = (+bar.dataset.main===st.main)? 0 : +bar.dataset.main; st.view='unit'; draw(); scrollToEl(document.getElementById('exctrl')); return; }
    const ex = e.target.closest('[data-exam]'); if(ex && ex.tagName==='BUTTON'){ st.exam = st.exam===ex.dataset.exam? '' : ex.dataset.exam; st.view='exam'; draw(); return; }
    const tg = e.target.closest('.extag'); if(tg){ st.q = tg.dataset.tag; draw(); scrollToEl(document.getElementById('exctrl')); return; }
    if(e.target.closest('#exClear')){ Object.assign(st,{main:0, uses:'', exam:'', type:'', q:''}); draw(); }
  });
  el.addEventListener('change', e=>{
    if(e.target.id==='exPractice'){ prefs.practice = e.target.checked; savePrefs(); applyPrefs(); return; }
    const k=e.target.dataset.k; if(k && e.target.tagName==='SELECT'){ st[k]=e.target.value; draw(); }
  });
  let qt=null;
  el.addEventListener('input', e=>{ if(e.target.dataset.k==='q'){ clearTimeout(qt); const v=e.target.value; qt=setTimeout(()=>{ st.q=v; draw(); const i=el.querySelector('input[data-k="q"]'); if(i){ i.focus(); i.setSelectionRange(v.length,v.length); } }, 250); } });
  draw();
}});
/* links from unit pages: "N תרגילי מבחן שעיקרם ביחידה" */
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-exgo]'); if(!a) return;
  const st = Object.assign({}, LS.get('calc2:exams', {}), { main:+a.dataset.exgo, view:'unit', uses:'', exam:'', type:'', q:'' });
  LS.set('calc2:exams', st);
});
