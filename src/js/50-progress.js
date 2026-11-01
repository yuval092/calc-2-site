/* ================= progress ================= */
function itemsOf(p){ return p.blocks.filter(b=>b.kind==='item' && !b.dupOf); }
function refreshProgress(){
  if(current.page!=='units') return;
  const u = getUnit(current.uid); if(!u || !u.el) return;
  const p = u.parsed;
  u.el.querySelectorAll('article.item[data-key]').forEach(a=>{
    const on = learned.has(a.dataset.key);
    a.classList.toggle('learned', on);
    const btn = a.querySelector('.learn'); if(btn) btn.setAttribute('aria-pressed', on);
    const st = starred.has(a.dataset.key); a.classList.toggle('starred', st);
    const sb = a.querySelector('.star'); if(sb) sb.setAttribute('aria-pressed', st);
  });
  tree.querySelectorAll('.it').forEach(li=>{
    const b = p.blocks.find(x=>x.id===li.dataset.id);
    li.classList.toggle('learned', !!b && learned.has((b.dupOf||b).key));
    li.classList.toggle('starred', !!b && starred.has((b.dupOf||b).key));
  });
  p.blocks.filter(b=>b.kind==='section').forEach(s=>{
    const its = s.items.filter(b=>!b.dupOf); const done = its.filter(b=>learned.has(b.key)).length;
    const c = tree.querySelector('[data-cnt="'+s.id+'"]');
    if(c){ c.textContent = its.length? done+'/'+its.length : ''; c.classList.toggle('done', its.length>0 && done===its.length); }
    const g = u.el.querySelector('[data-prog="'+s.id+'"]');
    if(g) g.textContent = its.length? 'סימנת '+done+' מתוך '+its.length+' פריטים בסעיף' : '';
  });
  drawPartition(p);
}
function drawPartition(p){
  const host = document.getElementById('partition'); if(!host) return;
  const secs = p.blocks.filter(b=>b.kind==='section' && b.depth===1 && b.items.length);   /* sections with no items (e.g. "מבוא ותוכן עניינים") are left out */
  if(!secs.length){ host.innerHTML=''; return; }
  const W=Math.max(340, Math.min(900, host.clientWidth||720)), H=132, base=92, top=14, left=10, right=10;
  const weights = secs.map(s=>Math.max(2, s.items.filter(b=>!b.dupOf).length));
  const tot = weights.reduce((a,b)=>a+b,0);
  let x = W-right; // RTL: first section on the right like the page
  let svg = '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="מפת היחידה: כל קטע הוא סעיף, והגובה מראה כמה ממנו סומן כנלמד">';
  svg += '<line class="axis" x1="'+left+'" y1="'+base+'" x2="'+(W-right)+'" y2="'+base+'"/>';
  let totalItems=0, totalDone=0;
  secs.forEach((s,i)=>{
    const w = (W-left-right)*weights[i]/tot; const x1 = x-w;
    const its = s.items.filter(b=>!b.dupOf); const done = its.filter(b=>learned.has(b.key)).length;
    totalItems+=its.length; totalDone+=done;
    const frac = its.length? done/its.length : 0;
    const hgt = Math.max(3, frac*(base-top));
    const t = s.heading.replace(/^סעיף\s+/,'').replace(s.num,'').replace(/^\s*:?\s*/,'');
    svg += '<g class="seg" data-go="'+s.id+'" tabindex="0" role="link" aria-label="'+esc((s.num||'')+' '+plain(t))+'"><title>'+esc((s.num||'')+' '+plain(t)+' — '+done+'/'+its.length)+'</title>'+
      '<rect class="bg" x="'+x1+'" y="'+top+'" width="'+w+'" height="'+(base-top)+'"/>'+
      '<rect class="ghost" x="'+(x1+2)+'" y="'+top+'" width="'+Math.max(0,w-4)+'" height="'+(base-top)+'"/>'+
      '<rect class="fill" x="'+(x1+2)+'" y="'+(base-hgt)+'" width="'+Math.max(0,w-4)+'" height="'+hgt+'"/>'+
      '<text class="num" x="'+(x1+w/2)+'" y="'+(base+20)+'" text-anchor="middle">'+esc(s.num||s.short||'')+'</text>'+
      (w>36? '<text x="'+(x1+w/2)+'" y="'+(base+37)+'" text-anchor="middle">'+(its.length? Math.round(frac*100)+'%':'')+'</text>':'')+
      '</g>';
    svg += '<line class="tick" x1="'+x+'" y1="'+(base-6)+'" x2="'+x+'" y2="'+(base+6)+'"/>';
    x = x1;
  });
  svg += '<line class="tick" x1="'+x+'" y1="'+(base-6)+'" x2="'+x+'" y2="'+(base+6)+'"/></svg>';
  host.innerHTML = svg + '<div class="cap"><span>כל קטע בחלוקה הוא סעיף (או חלק) ביחידה, ורוחבו לפי מספר הפריטים בו. גובה המלבן הוא החלק שסימנת כנלמד.</span><span><b>'+totalDone+'</b> מתוך <b>'+totalItems+'</b> פריטים</span></div>';
  host.querySelectorAll('.seg').forEach(g=>{
    const go=()=>navigate('#/u'+p.uid+'/'+g.dataset.go);
    g.addEventListener('click', go); g.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } });
  });
}

