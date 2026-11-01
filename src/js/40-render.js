/* ================= rendering a unit ================= */
const main = document.getElementById('main');
const tree = document.getElementById('tree');

function typeCounts(p){
  const c = {}; TYPE_ORDER.forEach(t=>c[t]=0);
  p.blocks.forEach(b=>{ if(b.kind==='item' && !b.dupOf) c[b.type]++; });
  return c;
}
function buildUnitDom(u){
  const p = u.parsed;
  const wrap = document.createElement('div');
  const intro = p.blocks.find(b=>b.kind==='intro');
  const tm = /^(יחידה\s+\d+)\s*:\s*(.*?)(\s*\(([^()]*)\))?$/.exec(p.title);
  const titleHtml = tm
    ? '<div class="kicker">'+(isRef(p.uid)? REF_BOOK+' · ':'')+esc(tm[1])+':</div><h1>'+renderInline(tm[2])+(tm[3]? ' <span class="en">('+esc(tm[4])+')</span>':'')+'</h1>'
    : '<h1>'+renderInline(p.title)+'</h1>';
  let html = '<section class="hero"><div class="col">'+titleHtml+
    '<div class="intro md">'+(intro? renderMd(intro.lines):'')+'</div>'+
    (isRef(p.uid)
      ? '<div class="refnote"><b>חומר עזר מאינפי 1.</b> היחידה מוצגת כאן כמקור להפניות בפתרונות ובהוכחות של אינפי 2, בנוסח המקורי. אין בה דירוג חשיבות, מעקב התקדמות או המחשות.</div>'
      : '<div class="partition" id="partition"></div>'+mustKnow(p)+unitExamSummary(p.uid))+'</div></section>';
  // toolbar
  const counts = typeCounts(p);
  html += '<div class="toolbar" id="toolbar"><div class="col">'+
    '<div class="tb-top"><nav class="crumb" id="crumb" aria-label="המיקום הנוכחי"></nav><span class="status" id="status"></span>'+
    '<button type="button" class="tb-toggle" id="tbToggle" aria-expanded="false" aria-controls="tbBody">סינון ותרגול</button></div>'+
    '<div class="tb-body" id="tbBody" role="toolbar" aria-label="סינון">'+
    impChips(p)+'<span class="sep"></span>'+
    '<button class="chip all" data-type="" aria-pressed="true">הכול</button>'+
    TYPE_ORDER.filter(t=>counts[t]).map(t=>'<button class="chip" data-type="'+t+'" aria-pressed="false" style="--c:var(--'+cssVar(t)+')"><i></i>'+TYPES[t].label+' <span class="k">'+counts[t]+'</span></button>').join('')+
    '<span class="sep"></span>'+
    '<label class="switch"><input type="checkbox" id="practiceT"'+(prefs.practice?' checked':'')+'> מצב תרגול (פתרונות מוסתרים)</label>'+
    '<label class="switch"><input type="checkbox" id="unlearnedT"'+(prefs.unlearned?' checked':'')+'> רק מה שעוד לא סימנתי כנלמד</label>'+
    '<label class="switch"><input type="checkbox" id="starredT"'+(prefs.starredOnly?' checked':'')+'> רק המסומנים לחזרה</label>'+
    '</div></div></div>';
  html += '<div class="doc"><div class="col" id="doc">';
  const widgets = (WIDGETS[p.uid]||[]).slice(), usedW = new Set();
  for(const b of p.blocks){
    if(b.kind==='intro') continue;
    if(b.kind==='part'){
      html += '<div class="part" id="'+b.id+'" data-block="part"><h2>'+renderInline(b.heading)+'</h2><div class="md">'+renderMd(b.lines)+'</div></div>';
    } else if(b.kind==='toc'){
      html += '<details class="toc" id="'+b.id+'" data-block="toc"'+(b.first?' open':'')+'><summary>'+ICON_CHEV+renderInline(b.heading)+'</summary><div class="md">'+renderMd(b.lines)+'</div></details>';
    } else if(b.kind==='section'){
      const tag = b.depth===1? 'h2':'h3';
      html += '<header class="sec-h d'+b.depth+'" id="'+b.id+'" data-block="sec" data-sec="'+b.id+'"><'+tag+'>'+sectionHeadingHtml(b)+'</'+tag+'>'+
        (b.lines.some(l=>l.trim()&&!isHr(l))? '<div class="md">'+renderMd(b.lines)+'</div>':'')+
        '<div class="sec-prog" data-prog="'+b.id+'"></div></header>';
    } else if(b.kind==='item'){
      const body = renderItemBody(b);
      const imp = (!b.dupOf && b.imp) ? b.imp : 0;
      const art = '<article class="item '+b.type+(body.hasAnswer?' has-answer':'')+(imp?' imp'+imp:'')+'" id="'+(b.dupOf? b.id+'-x' : b.id)+'" data-key="'+esc(b.key)+'">'+
        '<div class="item-h"><h4>'+headingHtml(b.heading, b.type)+'</h4>'+
        (b.dupOf || isRef(b.uid) ? '' : impBadge(b))+
        (b.dupOf? '' : '<div class="acts">'+
          '<button class="act star" type="button" aria-pressed="false" title="סימון לחזרה (מקש B)" aria-label="סימון לחזרה">'+ICON_STAR+'</button>'+
          '<button class="act cpmd" type="button" title="העתקת הפריט כ-Markdown" aria-label="העתקת הפריט כ-Markdown">'+ICON_COPY+'</button>'+
          '<button class="learn" type="button" aria-pressed="false" title="סימון כנלמד (מקש M)">'+ICON_CHECK+'<span class="lt">למדתי</span></button></div>')+
        '</div>'+whyHtml(b)+examLinksHtml(b)+body.html+'</article>';
      if(b.dupOf){
        html += '<details class="dupe" id="'+b.id+'" data-block="item" data-id="'+b.id+'"><summary><b>העתק זהה</b><span>'+renderInline(b.heading)+
          ' מופיע כאן שוב בקובץ המקור בדיוק כפי שהוא מופיע בסעיף '+esc(b.dupOf.sec? (b.dupOf.sec.num || b.dupOf.sec.heading) : '')+'. לחצו להצגה.</span></summary>'+art+'</details>';
      } else {
        html += art.replace('<article ', '<article data-block="item" data-id="'+b.id+'" ');
      }
      for(let wi=0; wi<widgets.length; wi++){
        if(!b.dupOf && !usedW.has(wi) && widgetAfter(b.heading, widgets[wi].after)){ usedW.add(wi);
          html += '<div class="widget" data-widget="'+wi+'"></div>'; b.widget = widgets[wi];
        }
      }
    }
  }
  html += unitFooter(p.uid);
  html += '<div class="noresults hide" id="noresults">לא נמצאו פריטים שמתאימים לחיפוש ולסינון. נסו מילה אחרת או לחצו על «הכול».</div>';
  html += '</div></div>';
  wrap.innerHTML = html;
  // mount widgets
  wrap.querySelectorAll('.widget').forEach(el=>{ mountWidget(el, (WIDGETS[p.uid]||[])[+el.dataset.widget]); });
  return wrap;
}
function cssVar(t){ return {definition:'def',theorem:'thm',lemma:'lem',example:'ex',question:'q',note:'note'}[t]; }

function buildTree(p){
  let h='';
  const secs = p.blocks.filter(b=>b.kind==='section'||b.kind==='part');
  let open1 = false;
  for(const b of p.blocks){
    if(b.kind==='part'){ if(open1){ h+='</ul></li>'; open1=false; } h+='<li class="partcap" data-part>'+renderInline(b.heading)+'</li>'; }
    if(b.kind==='section'){
      if(b.depth===1){
        if(open1){ h+='</ul></li>'; }
        const title = b.heading.replace(/^סעיף\s+/,'').replace(b.num,'').replace(/^\s*:?\s*/,'');
        h+='<li class="sec'+(b.items.length?'':' empty')+'" data-sec="'+b.id+'"><div class="secrow"><button class="tog" aria-label="הרחבה">'+ICON_CHEV+'</button><a href="#/u'+p.uid+'/'+b.id+'">'+(b.num?'<span class="num">'+b.num+'</span>':'')+'<span>'+renderInline(title)+'</span></a><span class="cnt" data-cnt="'+b.id+'"></span></div><ul class="kids">';
        open1 = true;
      } else {
        h+='<li class="sec sub open" data-sec="'+b.id+'"><div class="secrow"><a href="#/u'+p.uid+'/'+b.id+'" style="padding-inline-start:4px"><span class="num">'+b.num+'</span><span>'+renderInline(b.heading.replace(b.num,'').trim())+'</span></a><span class="cnt" data-cnt="'+b.id+'"></span></div></li>';
      }
    }
    if(b.kind==='item'){
      const li = '<li class="it'+(b.dupOf?' dupe':'')+(!b.dupOf&&b.imp?' imp'+b.imp:'')+'" data-id="'+b.id+'" style="--c:var(--'+cssVar(b.type)+')"><a href="#/u'+p.uid+'/'+b.id+'"><span class="dot"></span><span>'+renderInline(b.heading)+(b.dupOf?' (העתק)':'')+'</span></a></li>';
      h += li;
    }
  }
  if(open1) h+='</ul></li>';
  tree.innerHTML = h;
}

/* inline formulas wider than their line scroll sideways instead of widening the page */
function fitWide(root){
  const ks = [...root.querySelectorAll('.md .katex, h4 .katex')].filter(k=>!k.closest('.katex-display'));
  ks.forEach(k=>k.classList.remove('wide'));
  const wide = ks.filter(k=>{ const box=k.parentElement.closest('p,li,h4,.md,div'); return box && k.offsetWidth > box.clientWidth + 1; });
  wide.forEach(k=>k.classList.add('wide'));
  /* display math: shrink a formula that is slightly too wide (down to 72%); if it still does not fit it scrolls, with a fade hint */
  const ds = [...root.querySelectorAll('.katex-display')].filter(d=>d.offsetParent);
  ds.forEach(d=>{ if(d.firstElementChild) d.firstElementChild.style.fontSize=''; d.classList.remove('scrolls'); });
  const meas = ds.map(d=>[d, d.scrollWidth, d.clientWidth]);
  meas.forEach(([d,sw,cw])=>{
    if(!cw || sw <= cw+2 || !d.firstElementChild) return;
    const r = cw/sw, s = Math.max(0.72, r*0.985);
    d.firstElementChild.style.fontSize = (1.12*s).toFixed(3)+'em';
    if(r < 0.72) d.classList.add('scrolls');
  });
  /* second pass: KaTeX spacing does not scale exactly, so correct what still overflows */
  meas.forEach(([d])=>{
    const k=d.firstElementChild; if(!k || d.classList.contains('scrolls')) return;
    const sw=d.scrollWidth, cw=d.clientWidth; if(!cw || sw <= cw+1) return;
    const cur = parseFloat(k.style.fontSize||'1.12')/1.12, s = Math.max(0.72, cur*cw/sw*0.98);
    k.style.fontSize = (1.12*s).toFixed(3)+'em';
    if(d.scrollWidth > d.clientWidth+1) d.classList.add('scrolls');
  });
}


function unitFooter(uid){
  const ids = isRef(uid) ? refUnits() : availableUnits(); const i = ids.indexOf(uid);
  const link = (id, dir)=>{ if(id==null) return '<span></span>'; const t = getUnit(id).parsed.title;
    return '<a class="un-'+dir+'" href="#/u'+id+'"><small>'+(dir==='next'?'היחידה הבאה':'היחידה הקודמת')+'</small><b>'+renderInline(t.replace(/\s*\([A-Za-z][^()]*\)\s*$/,''))+'</b></a>'; };
  return '<nav class="unit-nav" data-block="footer" aria-label="מעבר בין יחידות">'+link(i>0?ids[i-1]:null,'prev')+link(i<ids.length-1?ids[i+1]:null,'next')+'</nav>';
}

/* ---------- importance ---------- */
function whyHtml(b){
  if(b.dupOf || !b.ann) return '';
  const ex = (b.ann.exam||[]);
  if((!b.ann.why || !b.imp) && !ex.length) return '';
  return '<div class="why">'+(b.ann.why && b.imp? '<span class="why-t"><b>למה זה חשוב:</b> '+renderInline(b.ann.why)+'</span>' : '')+
    (ex.length? '<span class="exams"><b>הופיע במבחן:</b> '+ex.map(x=>'<span class="ex-chip">'+renderInline(x)+'</span>').join('')+'</span>' : '')+'</div>';
}
function impCounts(p){ const c={1:0,2:0,3:0}; p.blocks.forEach(b=>{ if(b.kind==='item' && !b.dupOf && b.imp) c[b.imp]++; }); return c; }
function impChips(p){
  const c = impCounts(p); if(isRef(p.uid)) return '';
  return '<span class="impf" role="group" aria-label="סינון לפי חשיבות">'+
    '<button type="button" class="chip impchip" data-imp="0" aria-pressed="true">כל הרמות</button>'+
    '<button type="button" class="chip impchip" data-imp="1" aria-pressed="false"><b class="st">★</b> ומעלה <span class="k">'+(c[1]+c[2]+c[3])+'</span></button>'+
    '<button type="button" class="chip impchip" data-imp="2" aria-pressed="false"><b class="st">★★</b> ומעלה <span class="k">'+(c[2]+c[3])+'</span></button>'+
    '<button type="button" class="chip impchip" data-imp="3" aria-pressed="false"><b class="st">★★★</b> ליבה <span class="k">'+c[3]+'</span></button></span>';
}
function mustKnow(p){
  if(isRef(p.uid)) return '';
  const top = p.blocks.filter(b=>b.kind==='item' && !b.dupOf && b.imp===3);
  const c = impCounts(p);
  return '<details class="mustknow" id="mustKnow" open><summary><b class="st">★★★</b> הליבה של היחידה <span class="mk-c">'+c[3]+' פריטי ליבה, '+c[2]+' חשובים ו-'+c[1]+' שכדאי לדעת</span></summary>'+
    (top.length ? '<div class="mk-list">'+top.map(b=>'<a class="mk" href="#/u'+p.uid+'/'+b.id+'" data-mk="'+esc(b.key)+'"><i class="tdot" style="--c:var(--'+cssVar(b.type)+')"></i><span>'+renderInline(b.heading)+'</span></a>').join('')+'</div>' : '<p class="mk-empty">אין ביחידה פריטים בדרגת ליבה.</p>')+
    '<div class="mk-acts"><button type="button" class="linkbtn" data-setimp="2">הצגת הפריטים בדרגת ★★ ומעלה</button><button type="button" class="linkbtn" data-setimp="1">הצגת כל הפריטים המדורגים</button></div></details>';
}

/* importance badge: always a button (opens the rating menu); unrated items get a faint outline star */
function impBadge(b){
  const lv = b.imp||0, custom = Object.prototype.hasOwnProperty.call(impOver, b.key), base = baseLevel(b);
  const tip = (lv? IMP[lv].long : 'ללא דירוג') + (custom ? ' · הדירוג שלך (ברירת המחדל: '+(base? IMP[base].stars : 'ללא')+')' : '') + ' · לחצו לשינוי';
  return '<button type="button" class="imp imp'+lv+(custom?' custom':'')+'" data-rate title="'+esc(tip)+'" aria-label="'+esc(tip)+'">'+
    (lv ? '<b aria-hidden="true">'+IMP[lv].stars+'</b><span class="il">'+IMP[lv].label+'</span>' : '<b aria-hidden="true">☆</b>')+'</button>';
}
