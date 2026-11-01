/* ================= events ================= */
function syncToolbar(){
  const u = getUnit(current.uid); if(!u||!u.el) return;
  u.el.querySelectorAll('.impchip').forEach(c=> c.setAttribute('aria-pressed', +c.dataset.imp===filters.minImp));
  u.el.querySelectorAll('.chip:not(.impchip)').forEach(c=>{
    const t=c.dataset.type; c.setAttribute('aria-pressed', t? filters.types.has(t) : filters.types.size===0);
  });
  const ut = u.el.querySelector('#unlearnedT'); if(ut) ut.checked = !!prefs.unlearned;
  const stt = u.el.querySelector('#starredT'); if(stt) stt.checked = !!prefs.starredOnly;
  const pt = u.el.querySelector('#practiceT'); if(pt) pt.checked = !!prefs.practice;
}
function bindUnit(u){
  if(u.bound) { syncToolbar(); return; }
  u.bound = true;
  u.el.addEventListener('click', e=>{
    const ic = e.target.closest('.impchip, [data-setimp]');
    if(ic){ filters.minImp = +(ic.dataset.imp || ic.dataset.setimp); syncToolbar(); applyFilters(); if(ic.dataset.setimp){ const tb=u.el.querySelector('#toolbar'); if(tb) scrollToEl(tb); } return; }
    const chip = e.target.closest('.chip');
    if(chip){ const t=chip.dataset.type; if(!t) filters.types.clear(); else filters.types.has(t)? filters.types.delete(t) : filters.types.add(t); syncToolbar(); applyFilters(); return; }
    const lb = e.target.closest('.learn');
    if(lb){ const k = lb.closest('article').dataset.key; learned.has(k)? learned.delete(k) : learned.add(k); LS.set('calc2:learned',[...learned]); refreshProgress(); if(prefs.unlearned) applyFilters(); return; }
    const rv = e.target.closest('.reveal');
    const sb = e.target.closest('.star');
    if(sb){ toggleStar(sb.closest('article').dataset.key); return; }
    const cm = e.target.closest('.cpmd');
    if(cm){ const b = blockById(cm.closest('article').dataset.id); if(b) copyText(itemMarkdown(b, {withSource:true, qMode:'full'}), 'הפריט הועתק כ-Markdown'); return; }
    const tg = e.target.closest('#tbToggle');
    if(tg){ const tb=u.el.querySelector('#toolbar'); const o=!tb.classList.contains('open'); tb.classList.toggle('open',o); tg.setAttribute('aria-expanded',o); return; }
    if(rv){ const a=rv.closest('article'); a.classList.toggle('revealed'); rv.textContent = a.classList.contains('revealed')? 'הסתר פתרון':'הצג פתרון'; fitWide(a); return; }
  });
  u.el.addEventListener('change', e=>{
    if(e.target.id==='practiceT'){ prefs.practice=e.target.checked; savePrefs(); applyPrefs();
      u.el.querySelectorAll('article.revealed').forEach(a=>{ a.classList.remove('revealed'); const r=a.querySelector('.reveal'); if(r) r.textContent='הצג פתרון'; }); }
    if(e.target.id==='unlearnedT'){ prefs.unlearned=e.target.checked; savePrefs(); applyFilters(); }
    if(e.target.id==='starredT'){ prefs.starredOnly=e.target.checked; savePrefs(); applyFilters(); }
  });
  u.el.addEventListener('toggle', e=>{ if(e.target.open) fitWide(e.target); }, true);
  syncToolbar();
}
tree.addEventListener('click', e=>{
  const tg = e.target.closest('.tog'); if(tg){ tg.closest('.sec').classList.toggle('open'); return; }
});
let io=null;
function observeSections(u){
  if(io) io.disconnect();
  io = new IntersectionObserver(entries=>{
    entries.forEach(en=>{ if(en.isIntersecting){
      const sid = en.target.dataset.sec; tree.querySelectorAll('.secrow.active').forEach(r=>r.classList.remove('active'));
      const li = tree.querySelector('[data-sec="'+sid+'"]>.secrow'); if(li) li.classList.add('active');
      updateCrumb(u, sid);
    }});
  }, { rootMargin:'-20% 0px -70% 0px' });
  u.el.querySelectorAll('[data-block="sec"]').forEach(s=>io.observe(s));
}
const qi = document.getElementById('q'); let qt=null;
qi.addEventListener('input', ()=>{ qi.parentElement.classList.toggle('filled', !!qi.value); clearTimeout(qt); qt=setTimeout(()=>{ filters.q=qi.value; if(current.page!=='units'){ navigate('#/u'+current.uid); } applyFilters(); }, 140); });
qi.addEventListener('keydown', e=>{ if(e.key==='Escape'){ qi.value=''; qi.parentElement.classList.remove('filled'); filters.q=''; applyFilters(); qi.blur(); } });
document.addEventListener('keydown', e=>{
  if(e.code==='Slash' && !e.shiftKey && !e.ctrlKey && !e.metaKey && document.activeElement!==qi && !isTyping() && !App.modalOpen()){ e.preventDefault(); qi.focus(); }
});
document.getElementById('menuBtn').addEventListener('click', ()=> document.body.classList.toggle('drawer'));
document.getElementById('scrim').addEventListener('click', ()=> document.body.classList.remove('drawer'));
document.getElementById('side').addEventListener('click', e=>{ if(e.target.closest('a')) document.body.classList.remove('drawer'); });
const toTop = document.getElementById('toTop');
addEventListener('scroll', ()=> toTop.classList.toggle('show', scrollY>900), {passive:true});
toTop.addEventListener('click', ()=> window.scrollTo({top:0, behavior:'smooth'}));
addEventListener('hashchange', route);
let rz=null; addEventListener('resize', ()=>{ clearTimeout(rz); rz=setTimeout(()=>{ if(current.page==='units'){ const u=getUnit(current.uid); if(u&&u.parsed){ drawPartition(u.parsed); if(u.el) fitWide(u.el); } } }, 150); });
document.addEventListener('click', e=>{ const a=e.target.closest('a[href^="#/"]'); if(a && a.getAttribute('href')===location.hash){ e.preventDefault(); route(); } });

