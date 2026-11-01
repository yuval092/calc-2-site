/* ================= routing ================= */
function navigate(h){ if(location.hash===h) route(); else location.hash=h; }
function setTabs(page){
  document.querySelectorAll('a[data-page]').forEach(a=>{ if(a.dataset.page===page) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  document.querySelectorAll('a[data-page="units"]').forEach(a=> a.setAttribute('href','#/u'+current.uid));
}
function buildUnitList(){
  const ul = document.getElementById('unitList'); let h='';
  for(let i=1;i<=UNIT_COUNT;i++){
    const u = getUnit(i);
    if(u){
      const t = u.parsed.title.replace(/^יחידה\s+\d+\s*:\s*/,'').replace(/\s*\([A-Za-z][^()]*\)\s*$/,'');
      h += '<li><a href="#/u'+i+'" data-u="'+i+'"'+(current.page==='units'&&current.uid===i?' aria-current="true"':'')+'><span class="n">'+i+'</span><span class="t">'+renderInline(t)+'</span><span class="hits" data-u="'+i+'"></span></a></li>';
    } else {
      h += '<li><span class="dis"><span class="n">'+i+'</span><span class="t">יחידה '+i+' תתווסף בהמשך</span></span></li>';
    }
  }
  ul.innerHTML = h;
  /* Calculus 1 reference units (collapsed unless one of them is open) */
  const rb = document.getElementById('refBox'), rl = document.getElementById('refList'), refs = refUnits();
  if(rb && rl){
    rb.hidden = !refs.length;
    rl.innerHTML = refs.map(uid=>{ const t=getUnit(uid).parsed.title.replace(/^יחידה\s+\d+\s*:\s*/,''); const cur = current.page==='units' && current.uid===uid;
      return '<li><a href="#/u'+uid+'" data-u="'+uid+'"'+(cur?' aria-current="true"':'')+'><span class="n">'+(uid-REF_BASE)+'</span><span class="t">'+renderInline(t)+'</span></a></li>'; }).join('');
    if(current.page==='units' && isRef(current.uid)) rb.open = true;
  }
}
function route(){
  const h = location.hash.replace(/^#\/?/,'');
  document.body.classList.remove('drawer');
  let m;
  if(App.pages[h]){ current.page=h; renderPage(h); }
  else if((m = /^([a-z]+)\/(.+)$/.exec(h)) && App.pages[m[1]]){
    /* a page with a target inside it, e.g. #/exams/x-2024b-a1-q3b: show everything so the target is visible */
    if(m[1]==='exams'){ const s = LS.get('calc2:exams', {}); LS.set('calc2:exams', Object.assign(s, {main:0, uses:'', exam:'', type:'', q:''})); }
    current.page=m[1]; renderPage(m[1]);
    const t = document.getElementById(m[2]);
    if(t){ requestAnimationFrame(()=>{ const bar=document.getElementById('exctrl'); scrollToEl(t, {extra: bar && getComputedStyle(bar).position==='sticky' ? bar.offsetHeight+8 : 0}); t.classList.add('flash'); setTimeout(()=>t.classList.remove('flash'),1600); }); }
  }
  else if((m = /^u(\d+)(?:\/(.+))?$/.exec(h)) && units[+m[1]]){
    const uid=+m[1]; const changed = current.page!=='units' || current.uid!==uid;
    current.page='units'; current.uid=uid;
    if(changed || !main.firstChild || !main.firstChild.dataset || main.firstChild.dataset.unit!=uid) showUnit(uid);
    if(m[2]) scrollToId(m[2]);
  } else {
    const first = availableUnits()[0] || allUnits()[0] || 1;
    current.page='units'; current.uid=first; showUnit(first);
  }
  setTabs(current.page); buildUnitList(); applyFilters();
}
function showUnit(uid){
  const u = getUnit(uid);
  if(!u.el){ u.el = buildUnitDom(u); u.el.dataset.unit = uid; }
  main.replaceChildren(u.el);
  document.body.dataset.unit = uid;   /* unit hue for the whole page (palette.css) */
  document.body.classList.toggle('in-ref', isRef(uid));
  document.getElementById('treeTitle').textContent = 'תוכן היחידה';
  buildTree(u.parsed);
  bindUnit(u);
  refreshProgress(); applyFilters();
  fitWide(u.el);
  window.scrollTo(0,0);
  observeSections(u);
  App.emit('unitShown', u);
}
function renderPage(key){
  delete document.body.dataset.unit; document.body.classList.remove('in-ref');
  const conf = App.pages[key];
  if(conf.render){ tree.innerHTML=''; document.getElementById('treeTitle').textContent=''; const d=document.createElement('div'); conf.render(d); main.replaceChildren(d); window.scrollTo(0,0); return; }
  tree.innerHTML=''; document.getElementById('treeTitle').textContent='';
  const d = document.createElement('div');
  if(pageSrc[key]){
    d.innerHTML = '<div class="col" style="padding-top:30px"><h1 style="font-size:2.4rem">'+esc(conf.title)+'</h1><div class="md">'+renderMd(pageSrc[key])+'</div></div>';
  } else {
    d.innerHTML = '<div class="empty"><div class="glyph">'+conf.glyph+'</div><h2>'+esc(conf.title)+'</h2><p>'+esc(conf.text)+'</p></div>';
  }
  main.replaceChildren(d); window.scrollTo(0,0);
}
function scrollToId(id){
  const u = getUnit(current.uid); if(!u || !u.el) return;
  let el = document.getElementById(id);
  if(!el) return;
  if(el.classList.contains('hide')){ filters.types.clear(); filters.q=''; document.getElementById('q').value=''; prefs.unlearned=false; syncToolbar(); applyFilters(); }
  if(el.tagName==='DETAILS') el.open = true;
  const li = tree.querySelector('[data-sec="'+id+'"]') || (tree.querySelector('.it[data-id="'+id+'"]')||{}).closest && tree.querySelector('.it[data-id="'+id+'"]').closest('.sec:not(.sub)');
  if(li && li.classList) li.classList.add('open');
  requestAnimationFrame(()=> scrollToEl(el, {smooth:true}));
}

