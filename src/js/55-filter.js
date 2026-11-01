/* ================= filtering & search ================= */
function applyFilters(){
  if(current.page!=='units') return;
  const u = getUnit(current.uid); if(!u || !u.el) return;
  const p = u.parsed; const q = filters.q.trim().toLowerCase();
  const active = filters.types.size>0 || q || prefs.unlearned || prefs.starredOnly || filters.minImp>0;
  const visibleSec = new Set(); let shown=0, total=0;
  for(const b of p.blocks){
    if(b.kind!=='item') continue;
    const target = b.dupOf || b;
    let ok = true;
    if(filters.types.size && !filters.types.has(b.type)) ok=false;
    if(q && !q.split(/\s+/).every(w=>b.search.includes(w))) ok=false;
    if(prefs.unlearned && learned.has(target.key)) ok=false;
    if(prefs.starredOnly && !starred.has(target.key)) ok=false;
    if(filters.minImp && (target.imp||0) < filters.minImp) ok=false;
    if(active && b.dupOf && !q) ok=false; // duplicates only surface in explicit searches
    const el = u.el.querySelector('[data-id="'+b.id+'"]');
    if(el) el.classList.toggle('hide', !ok);
    const li = tree.querySelector('.it[data-id="'+b.id+'"]'); if(li) li.classList.toggle('hide', !ok);
    if(!b.dupOf) total++;
    if(ok){ if(!b.dupOf) shown++; if(b.sec){ visibleSec.add(b.sec.id); if(b.sec.parent) visibleSec.add(b.sec.parent.id); } }
  }
  u.el.querySelectorAll('[data-block="sec"]').forEach(el=>{ el.classList.toggle('hide', active && !visibleSec.has(el.dataset.sec)); });
  u.el.querySelectorAll('[data-block="part"],[data-block="toc"],[data-block="footer"],.widget').forEach(el=> el.classList.toggle('hide', !!active));
  tree.querySelectorAll('.sec').forEach(li=>{ li.classList.toggle('hide', active && !visibleSec.has(li.dataset.sec)); if(active && visibleSec.has(li.dataset.sec)) li.classList.add('open'); });
  tree.querySelectorAll('.partcap').forEach(li=> li.classList.toggle('hide', !!active));
  document.getElementById('noresults').classList.toggle('hide', !active || shown>0);
  const st = document.getElementById('status');
  if(st) st.textContent = active ? 'מוצגים '+shown+' מתוך '+total+' פריטים' : total+' פריטים ביחידה';
  highlight(u.el, q);
  // other units' hit counts
  document.querySelectorAll('.units .hits').forEach(h=>{
    const uid=+h.dataset.u; if(!q){ h.textContent=''; return; }
    const pu = getUnit(uid); const n = pu? pu.parsed.blocks.filter(b=>b.kind==='item'&&!b.dupOf&&q.split(/\s+/).every(w=>b.search.includes(w))).length : 0;
    h.textContent = n? n : '';
  });
}
function highlight(root, q){
  root.querySelectorAll('mark[data-hl]').forEach(m=>{ const t=document.createTextNode(m.textContent); m.replaceWith(t); t.parentNode && t.parentNode.normalize(); });
  const words = q.split(/\s+/).filter(w=>w.length>1 && HEB.test(w));
  if(!words.length) return;
  const re = new RegExp('('+words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','g');
  root.querySelectorAll('article.item:not(.hide) .md, article.item:not(.hide) h4').forEach(el=>{
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode:n=> n.parentElement.closest('.katex') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n=>{
      if(!re.test(n.nodeValue)) return; re.lastIndex=0;
      const span=document.createElement('span'); span.innerHTML = esc(n.nodeValue).replace(re,'<mark data-hl>$1</mark>');
      n.replaceWith(...span.childNodes);
    });
  });
}

