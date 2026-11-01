/* ================= widget: Darboux / Riemann sums ================= */
const FUNCS = {
  sq:  { tex:'x^2', a:0, b:1, ab:'[0,1]', f:x=>x*x, F:x=>x*x*x/3, crit:[] },
  lin: { tex:'x', a:0, b:1, ab:'[0,1]', f:x=>x, F:x=>x*x/2, crit:[] },
  sqrt:{ tex:'\\sqrt{x}', a:0, b:9, ab:'[0,9]', f:x=>Math.sqrt(x), F:x=>2/3*Math.pow(x,1.5), crit:[] },
  par: { tex:'(x-2)^2', a:0, b:4, ab:'[0,4]', f:x=>(x-2)*(x-2), F:x=>Math.pow(x-2,3)/3, crit:[2] },
  cub: { tex:'16-x^2', a:0, b:4, ab:'[0,4]', f:x=>16-x*x, F:x=>16*x-x*x*x/3, crit:[] },
  sin: { tex:'\\sin x', a:0, b:Math.PI, ab:'[0,\\pi]', f:Math.sin, F:x=>-Math.cos(x), crit:[Math.PI/2] }
};
function infsup(fn,l,r){
  let lo=Infinity, hi=-Infinity; const pts=[l,r].concat(fn.crit.filter(c=>c>l&&c<r));
  for(let k=1;k<24;k++) pts.push(l+(r-l)*k/24);
  for(const x of pts){ const y=fn.f(x); if(y<lo)lo=y; if(y>hi)hi=y; }
  return [lo,hi];
}
function mountWidget(el, cfg){
  if(!cfg) return;
  if(App.widgets[cfg.mode]) return App.widgets[cfg.mode](el, cfg);
  if(cfg.mode==='taylor') return mountTaylor(el, cfg);
  if(cfg.mode==='improper') return mountImproper(el, cfg);
  return mountSums(el, cfg);
}
function widgetHead(title){ return '<div class="wh"><b>'+esc(title)+'</b><span>תוספת אינטראקטיבית של האתר, לא מתוך הספר</span></div>'; }
function fmt(v){ if(!isFinite(v)) return '\\infty'; const a=Math.abs(v); if(a!==0 && (a<1e-4 || a>=1e6)) { const e=Math.floor(Math.log10(a)); return (v/Math.pow(10,e)).toFixed(3)+'\\cdot 10^{'+e+'}'; } return (Math.round(v*1e5)/1e5).toString(); }
function plotFrame(W,H,L,R,T,B,xmin,xmax,ymin,ymax){
  const X=x=>L+(x-xmin)/(xmax-xmin)*(W-L-R), Y=y=>T+(ymax-y)/(ymax-ymin)*(H-T-B);
  return {X,Y};
}
function pathOf(fn, a, b, X, Y, ymin, ymax, N){
  let d='', pen=false; N=N||300;
  for(let k=0;k<=N;k++){ const x=a+(b-a)*k/N, y=fn(x);
    if(!isFinite(y) || y>ymax+ (ymax-ymin)*2 || y<ymin-(ymax-ymin)*2){ pen=false; continue; }
    d += (pen?'L':'M')+X(x).toFixed(1)+' '+Y(y).toFixed(1); pen=true; }
  return d;
}

/* Taylor / Maclaurin polynomials */
const TAY = {
  exp: { tex:'e^x', lo:-3, hi:3, f:Math.exp, c:k=>1/factorial(k), term:k=> k===0?'1':k===1?'x':'\\frac{x^{'+k+'}}{'+k+'!}', sg:k=>1 },
  sin: { tex:'\\sin x', lo:-2*Math.PI, hi:2*Math.PI, f:Math.sin, c:k=> k%2? Math.pow(-1,(k-1)/2)/factorial(k):0, term:k=> k===1?'x':'\\frac{x^{'+k+'}}{'+k+'!}', sg:k=>Math.pow(-1,(k-1)/2) },
  cos: { tex:'\\cos x', lo:-2*Math.PI, hi:2*Math.PI, f:Math.cos, c:k=> k%2?0:Math.pow(-1,k/2)/factorial(k), term:k=> k===0?'1':'\\frac{x^{'+k+'}}{'+k+'!}', sg:k=>Math.pow(-1,k/2) },
  ln:  { tex:'\\ln(1+x)', lo:-0.95, hi:2.5, f:x=>Math.log(1+x), c:k=> k===0?0:Math.pow(-1,k-1)/k, term:k=> k===1?'x':'\\frac{x^{'+k+'}}{'+k+'}', sg:k=>Math.pow(-1,k-1) },
  geo: { tex:'\\frac{1}{1-x}', lo:-1.6, hi:0.95, f:x=>1/(1-x), c:k=>1, term:k=> k===0?'1':k===1?'x':'x^{'+k+'}', sg:k=>1 }
};
function factorial(k){ let r=1; for(let i=2;i<=k;i++) r*=i; return r; }
function mountTaylor(el, cfg){
  const st={ fn:cfg.fn, n:cfg.n, x0:1 };
  el.innerHTML = widgetHead(cfg.title)+'<div class="plot"></div>'+
    '<div class="ctrl"><label>פונקציה <select data-k="fn">'+Object.keys(TAY).map(k=>'<option value="'+k+'"'+(k===st.fn?' selected':'')+'>'+{exp:'e^x',sin:'sin x',cos:'cos x',ln:'ln(1+x)',geo:'1/(1−x)'}[k]+'</option>').join('')+'</select></label>'+
    '<label>מעלת הפולינום <input type="range" min="0" max="15" value="'+st.n+'" data-k="n"> <span class="nval"></span></label>'+
    '<label>נקודת בדיקה <input type="range" min="0" max="1000" value="600" data-k="x0"></label></div><div class="read"></div>';
  const plot=el.querySelector('.plot'), read=el.querySelector('.read'), nval=el.querySelector('.nval'), xs=el.querySelector('[data-k="x0"]');
  function draw(){
    const F=TAY[st.fn], n=st.n, P=x=>{ let s=0; for(let k=0;k<=n;k++) s+=F.c(k)*Math.pow(x,k); return s; };
    const x0 = F.lo + (F.hi-F.lo)*(+xs.value)/1000;
    let ymin=Infinity,ymax=-Infinity; for(let k=0;k<=200;k++){ const y=F.f(F.lo+(F.hi-F.lo)*k/200); if(isFinite(y)){ ymin=Math.min(ymin,y); ymax=Math.max(ymax,y);} }
    const pad=(ymax-ymin)*.25||1; ymin-=pad; ymax+=pad;
    const W=640,H=300,L=40,R=14,T=12,B=30; const {X,Y}=plotFrame(W,H,L,R,T,B,F.lo,F.hi,ymin,ymax);
    const id='cl'+Math.random().toString(36).slice(2,7);
    plot.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="גרף הפונקציה ופולינום מקלורן"><defs><clipPath id="'+id+'"><rect x="'+L+'" y="'+T+'" width="'+(W-L-R)+'" height="'+(H-T-B)+'"/></clipPath></defs>'+
      '<line class="axis" x1="'+L+'" y1="'+Y(0)+'" x2="'+(W-R)+'" y2="'+Y(0)+'"/><line class="axis" x1="'+X(0)+'" y1="'+T+'" x2="'+X(0)+'" y2="'+(H-B)+'"/>'+
      '<g clip-path="url(#'+id+')"><path class="curve" d="'+pathOf(F.f,F.lo,F.hi,X,Y,ymin,ymax)+'"/>'+
      '<path d="'+pathOf(P,F.lo,F.hi,X,Y,ymin,ymax)+'" fill="none" stroke="var(--upper)" stroke-width="2.4" stroke-dasharray="7 4"/>'+
      '<line x1="'+X(x0)+'" y1="'+T+'" x2="'+X(x0)+'" y2="'+(H-B)+'" stroke="var(--ink-3)" stroke-dasharray="2 4"/>'+
      '<circle cx="'+X(x0)+'" cy="'+Y(F.f(x0))+'" r="4" fill="var(--ink)"/><circle cx="'+X(x0)+'" cy="'+Y(P(x0))+'" r="4" fill="var(--upper)"/></g>'+
      '<text class="lbl" x="'+(L)+'" y="'+(H-B+18)+'" text-anchor="start">'+(+F.lo.toFixed(2))+'</text><text class="lbl" x="'+(W-R)+'" y="'+(H-B+18)+'" text-anchor="end">'+(+F.hi.toFixed(2))+'</text></svg>';
    nval.textContent=n;
    const terms=[]; for(let k=0;k<=n;k++){ if(F.c(k)!==0) terms.push(k); }
    const show = terms.length>5 ? terms.slice(0,3).concat(['…'], terms.slice(-1)) : terms;
    let poly=''; show.forEach((k,i)=>{ if(k==='…'){ poly+=' + \\cdots'; return; } const s=F.sg(k); poly += (i===0? (s<0?'-':'') : (s<0?' - ':' + ')) + F.term(k); });
    if(!poly) poly='0';
    read.innerHTML='<div style="grid-column:1/-1"><small>פולינום מקלורן</small>'+tex('P_{'+n+'}(x) = '+poly,false)+'</div>'+
      '<div><small>ערך הפונקציה</small>'+tex('f('+fmt(x0)+') = '+fmt(F.f(x0)),false)+'</div>'+
      '<div><small>ערך הפולינום</small>'+tex('P_{'+n+'}('+fmt(x0)+') = '+fmt(P(x0)),false)+'</div>'+
      '<div><small>השארית</small>'+tex('|R_{'+n+'}('+fmt(x0)+')| = '+fmt(Math.abs(F.f(x0)-P(x0))),false)+'</div>';
    fitWide(read);
  }
  el.addEventListener('input', e=>{ const k=e.target.dataset.k; if(!k) return; if(k==='fn') st.fn=e.target.value; if(k==='n') st.n=+e.target.value; draw(); });
  draw();
}

/* improper integrals: F(t) = ∫ x^{-α} and its limit */
function mountImproper(el, cfg){
  const st={ kind:cfg.kind, alpha:cfg.alpha, tv:cfg.kind===1?300:300 };
  el.innerHTML = widgetHead(cfg.title)+'<div class="plot"></div>'+
    '<div class="ctrl"><label>סוג <select data-k="kind"><option value="1"'+(st.kind===1?' selected':'')+'>ראשון: הקטע [1,∞)</option><option value="2"'+(st.kind===2?' selected':'')+'>שני: הקטע (0,1]</option></select></label>'+
    '<label>α <input type="range" min="10" max="300" value="'+Math.round(st.alpha*100)+'" data-k="alpha"> <span class="nval"></span></label>'+
    '<label>גבול עליון/תחתון t <input type="range" min="1" max="1000" value="'+st.tv+'" data-k="tv"></label></div><div class="read"></div>';
  const plot=el.querySelector('.plot'), read=el.querySelector('.read'), nval=el.querySelector('.nval');
  function Fk(t){ const a=st.alpha;
    if(st.kind===1) return Math.abs(a-1)<1e-9 ? Math.log(t) : (Math.pow(t,1-a)-1)/(1-a);
    return Math.abs(a-1)<1e-9 ? -Math.log(t) : (1-Math.pow(t,1-a))/(1-a); }
  function draw(){
    const a=st.alpha, conv = st.kind===1 ? a>1 : a<1;
    const lim = conv ? (st.kind===1 ? 1/(a-1) : 1/(1-a)) : Infinity;
    const t = st.kind===1 ? 1+ (st.tv/1000)*99 : Math.max(0.001, st.tv/1000);
    const tmin = st.kind===1? 1 : 0.001, tmax = st.kind===1? 100 : 1;
    let ymax = conv? lim*1.3 : Math.max(Fk(st.kind===1?tmax:tmin), 1)*1.1; ymax=Math.min(Math.max(ymax,1),40);
    const W=640,H=290,L=40,R=14,T=12,B=30; const {X,Y}=plotFrame(W,H,L,R,T,B, st.kind===1?1:0, tmax, 0, ymax);
    const id='cl'+Math.random().toString(36).slice(2,7);
    plot.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="גרף של האינטגרל החלקי כפונקציה של t"><defs><clipPath id="'+id+'"><rect x="'+L+'" y="'+T+'" width="'+(W-L-R)+'" height="'+(H-T-B)+'"/></clipPath></defs>'+
      '<line class="axis" x1="'+L+'" y1="'+Y(0)+'" x2="'+(W-R)+'" y2="'+Y(0)+'"/><line class="axis" x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+(H-B)+'"/>'+
      '<g clip-path="url(#'+id+')">'+(conv? '<line x1="'+L+'" y1="'+Y(lim)+'" x2="'+(W-R)+'" y2="'+Y(lim)+'" stroke="var(--ex)" stroke-width="1.5" stroke-dasharray="6 4"/>':'')+
      '<path class="curve" d="'+pathOf(Fk,tmin,tmax,X,Y,0,ymax,400)+'"/>'+
      '<line x1="'+X(t)+'" y1="'+Y(0)+'" x2="'+X(t)+'" y2="'+Y(Fk(t))+'" stroke="var(--upper)" stroke-width="2"/><circle cx="'+X(t)+'" cy="'+Y(Fk(t))+'" r="4.5" fill="var(--upper)"/></g>'+
      '<text class="lbl" x="'+(W-R)+'" y="'+(H-B+18)+'" text-anchor="end">t = '+tmax+'</text><text class="lbl" x="'+L+'" y="'+(H-B+18)+'" text-anchor="start">t = '+(st.kind===1?1:0)+'</text>'+
      (conv? '<text class="lbl" x="'+(W-R-4)+'" y="'+(Y(lim)-6)+'" text-anchor="end" style="fill:var(--ex)">'+(+lim.toFixed(3))+'</text>':'')+'</svg>';
    nval.textContent=a.toFixed(2);
    const I = st.kind===1 ? '\\int_1^{'+fmt(t)+'} \\frac{dx}{x^{'+a.toFixed(2)+'}}' : '\\int_{'+fmt(t)+'}^{1} \\frac{dx}{x^{'+a.toFixed(2)+'}}';
    const LIM = st.kind===1 ? '\\lim_{t \\to \\infty}' : '\\lim_{t \\to 0^+}';
    read.innerHTML='<div><small>האינטגרל החלקי</small>'+tex(I+' = '+fmt(Fk(t)),false)+'</div>'+
      '<div><small>'+(conv?'מתכנס':'מתבדר')+'</small>'+tex(LIM+' F(t) = '+(conv? fmt(lim) : '\\infty'),false)+'</div>'+
      '<div><small>התנאי</small>'+tex(st.kind===1 ? '\\alpha > 1' : '\\alpha < 1',false)+'</div>';
    fitWide(read);
  }
  el.addEventListener('input', e=>{ const k=e.target.dataset.k; if(!k) return; if(k==='kind'){ st.kind=+e.target.value; } if(k==='alpha') st.alpha=+e.target.value/100; if(k==='tv') st.tv=+e.target.value; draw(); });
  draw();
}
function mountSums(el, cfg){
  const st = { fn:cfg.fn, n:cfg.n, mode:cfg.mode, xi:cfg.xi||'mid', showLo:true, showUp:cfg.mode==='darboux', showRi:cfg.mode==='riemann', seed:1 };
  el.innerHTML =
    '<div class="wh"><b>'+esc(cfg.title)+'</b><span>תוספת אינטראקטיבית של האתר, לא מתוך הספר</span></div>'+
    '<div class="plot"></div>'+
    '<div class="ctrl">'+
      '<label>פונקציה <select data-k="fn">'+Object.keys(FUNCS).map(k=>'<option value="'+k+'"'+(k===st.fn?' selected':'')+'>'+plainTex(FUNCS[k].tex)+' ב־'+plainTex(FUNCS[k].ab)+'</option>').join('')+'</select></label>'+
      '<label>מספר קטעים <input type="range" min="1" max="60" value="'+st.n+'" data-k="n"> <span class="nval"></span></label>'+
      '<label class="tg" style="--c:var(--lower)"><input type="checkbox" data-k="showLo"'+(st.showLo?' checked':'')+'> סכום תחתון</label>'+
      '<label class="tg" style="--c:var(--upper)"><input type="checkbox" data-k="showUp"'+(st.showUp?' checked':'')+'> סכום עליון</label>'+
      '<label class="tg" style="--c:var(--riem)"><input type="checkbox" data-k="showRi"'+(st.showRi?' checked':'')+'> סכום רימן</label>'+
      '<label>נקודות ביניים <select data-k="xi"><option value="left">קצה שמאלי</option><option value="mid">אמצע</option><option value="right">קצה ימני</option><option value="rand">אקראיות</option></select></label>'+
      '<button class="w" data-act="roll" type="button">הגרלה מחדש</button>'+
      '<button class="w" data-act="play" type="button">הרצה מ־1 עד 60</button>'+
    '</div><div class="read"></div>';
  el.querySelector('[data-k="xi"]').value = st.xi;
  const plot = el.querySelector('.plot'), read = el.querySelector('.read'), nval = el.querySelector('.nval'), range = el.querySelector('[data-k="n"]');
  let rnd = [];
  function rng(){ let s = st.seed*9301+49297; return ()=> (s = (s*9301+49297)%233280)/233280; }
  function draw(){
    const fn = FUNCS[st.fn], n=st.n, a=fn.a, b=fn.b, dx=(b-a)/n;
    const W=640, H=300, L=44, R=16, T=14, B=34;
    let ymin=0, ymax=0; for(let k=0;k<=200;k++){ const y=fn.f(a+(b-a)*k/200); ymin=Math.min(ymin,y); ymax=Math.max(ymax,y); }
    ymax = ymax*1.08 || 1;
    const X = x=> L+(x-a)/(b-a)*(W-L-R), Y = y=> T+(ymax-y)/(ymax-ymin)*(H-T-B);
    const r = rng(); if(rnd.length!==n || st.xi!=='rand') rnd = Array.from({length:n}, ()=>r());
    let s=0,S=0,sig=0, rects='';
    for(let i=0;i<n;i++){
      const l=a+i*dx, rr=l+dx; const [m,M]=infsup(fn,l,rr);
      s+=m*dx; S+=M*dx;
      const t = st.xi==='left'?0: st.xi==='right'?1: st.xi==='mid'?.5: rnd[i];
      const xi = l+t*dx, fx=fn.f(xi); sig+=fx*dx;
      if(st.showUp) rects += '<rect class="r-up" x="'+X(l)+'" y="'+Math.min(Y(M),Y(0))+'" width="'+(X(rr)-X(l))+'" height="'+Math.abs(Y(M)-Y(0))+'"/>';
      if(st.showRi) rects += '<rect class="r-ri" x="'+X(l)+'" y="'+Math.min(Y(fx),Y(0))+'" width="'+(X(rr)-X(l))+'" height="'+Math.abs(Y(fx)-Y(0))+'"/><circle class="xi" cx="'+X(xi)+'" cy="'+Y(fx)+'" r="'+(n>30?2:3)+'"/>';
      if(st.showLo) rects += '<rect class="r-lo" x="'+X(l)+'" y="'+Math.min(Y(m),Y(0))+'" width="'+(X(rr)-X(l))+'" height="'+Math.abs(Y(m)-Y(0))+'"/>';
    }
    let path=''; for(let k=0;k<=240;k++){ const x=a+(b-a)*k/240; path += (k?'L':'M')+X(x).toFixed(1)+' '+Y(fn.f(x)).toFixed(1); }
    const xt = [a,b].concat(st.fn==='sin'?[Math.PI/2]:[]);
    plot.innerHTML = '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="גרף הפונקציה עם מלבני הסכומים">'+
      '<line class="axis" x1="'+L+'" y1="'+Y(0)+'" x2="'+(W-R)+'" y2="'+Y(0)+'"/><line class="axis" x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+(H-B)+'"/>'+
      rects+'<path class="curve" d="'+path+'"/>'+
      xt.map(v=>'<text class="lbl" x="'+X(v)+'" y="'+(H-B+18)+'" text-anchor="middle">'+(st.fn==='sin'? (v===0?'0':v===Math.PI?'π':'π/2') : +v.toFixed(2))+'</text>').join('')+
      '<text class="lbl" x="'+(L-6)+'" y="'+(Y(ymax/1.08)+4)+'" text-anchor="end">'+(+(ymax/1.08).toFixed(2))+'</text></svg>';
    nval.textContent = n;
    const I = fn.F(b)-fn.F(a), f4 = v=> (Math.round(v*1e4)/1e4).toString();
    read.innerHTML =
      '<div><small>סכום תחתון</small>'+tex('s(P_{'+n+'}) = '+f4(s),false)+'</div>'+
      '<div><small>סכום עליון</small>'+tex('S(P_{'+n+'}) = '+f4(S),false)+'</div>'+
      '<div><small>סכום רימן</small>'+tex('\\sigma = '+f4(sig),false)+'</div>'+
      '<div><small>ההפרש</small>'+tex('S(P_{'+n+'}) - s(P_{'+n+'}) = '+f4(S-s),false)+'</div>'+
      '<div><small>ערך האינטגרל</small>'+tex('\\int_{'+(st.fn==='sin'?'0':a)+'}^{'+(st.fn==='sin'?'\\pi':b)+'} '+fn.tex+'\\,dx = '+f4(I),false)+'</div>';
  }
  el.addEventListener('input', e=>{
    const k = e.target.dataset.k; if(!k) return;
    st[k] = e.target.type==='checkbox' ? e.target.checked : (k==='n'? +e.target.value : e.target.value);
    if(k==='xi' && st.xi==='rand'){ st.seed++; rnd=[]; }
    draw();
  });
  let timer=null;
  el.addEventListener('click', e=>{
    const act = e.target.dataset && e.target.dataset.act; if(!act) return;
    if(act==='roll'){ st.seed++; rnd=[]; if(st.xi!=='rand'){ st.xi='rand'; el.querySelector('[data-k="xi"]').value='rand'; } draw(); }
    if(act==='play'){
      if(timer){ clearInterval(timer); timer=null; return; }
      st.n=1; timer=setInterval(()=>{ range.value=st.n; draw(); if(++st.n>60){ clearInterval(timer); timer=null; st.n=60; } }, 90);
    }
  });
  draw();
}
function plainTex(t){ return t.replace('\\sqrt{x}','√x').replace('\\sin x','sin x').replace('\\pi','π').replace('^2','²'); }

