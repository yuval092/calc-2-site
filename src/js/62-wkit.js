/* ================= widget kit + unit 1-2 widgets =================
   Each widget: App.registerWidget(mode, (el, cfg) => ...). Configured in WIDGETS (00-config.js). */
const WK = {
  uid(){ return 'w'+Math.random().toString(36).slice(2,8); },
  frame(W,H,L,R,T,B,xmin,xmax,ymin,ymax){
    const p = plotFrame(W,H,L,R,T,B,xmin,xmax,ymin,ymax);
    return Object.assign(p,{W,H,L,R,T,B,xmin,xmax,ymin,ymax, pw:W-L-R, ph:H-T-B});
  },
  svg(F, inner, label){ return '<svg viewBox="0 0 '+F.W+' '+F.H+'" role="img" aria-label="'+esc(label||'')+'">'+inner+'</svg>'; },
  clip(F, id){ return '<defs><clipPath id="'+id+'"><rect x="'+F.L+'" y="'+F.T+'" width="'+F.pw+'" height="'+F.ph+'"/></clipPath></defs>'; },
  axes(F){
    const y0 = (F.ymin<=0 && F.ymax>=0) ? F.Y(0) : F.H-F.B, x0 = (F.xmin<=0 && F.xmax>=0) ? F.X(0) : F.L;
    return '<rect class="pbg" x="'+F.L+'" y="'+F.T+'" width="'+F.pw+'" height="'+F.ph+'"/>'+
      '<line class="axis" x1="'+F.L+'" y1="'+y0+'" x2="'+(F.W-F.R)+'" y2="'+y0+'"/>'+
      '<line class="axis" x1="'+x0+'" y1="'+F.T+'" x2="'+x0+'" y2="'+(F.H-F.B)+'"/>';
  },
  t(x,y,s,anchor,cls){ return '<text class="lbl'+(cls?' '+cls:'')+'" x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" text-anchor="'+(anchor||'middle')+'">'+esc(String(s))+'</text>'; },
  n(v,d){ if(!isFinite(v)) return v>0?'∞':'−∞'; const a=Math.abs(v); if(a!==0 && (a<1e-3 || a>=1e5)) return v.toExponential(2); return String(+v.toFixed(d===undefined?3:d)); },
  xt(F, vals){ return vals.map(v=>WK.t(F.X(v), F.H-F.B+16, WK.n(v,2))).join(''); },
  yt(F, vals){ return vals.map(v=>WK.t(F.L-6, F.Y(v)+4, WK.n(v,2), 'end')).join(''); },
  cells(list){ return list.map(c=>'<div'+(c.wide?' style="grid-column:1/-1"':'')+(c.cls?' class="'+c.cls+'"':'')+'><small>'+esc(c.k)+'</small>'+(c.tex!==undefined ? tex(c.tex.replace(/(\d(?:\.\d+)?)e([+-]?)(\d+)/g, (_,m,s,e)=>m+'\\cdot 10^{'+(s==='-'?'-':'')+e+'}'),false) : c.html)+'</div>').join(''); },
  range(k,min,max,step,val,label){ return '<label>'+label+' <input type="range" data-k="'+k+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"> <span class="nval" data-v="'+k+'"></span></label>'; },
  select(k,opts,val,label){ return '<label>'+label+' <select data-k="'+k+'">'+opts.map(o=>'<option value="'+o[0]+'"'+(o[0]===val?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></label>'; },
  check(k,val,label){ return '<label class="tg"><input type="checkbox" data-k="'+k+'"'+(val?' checked':'')+'> '+label+'</label>'; },
  /* standard layout: head, plot, controls, readout. draw(plot, read, st) is called on every input */
  mount(el, cfg, controls, st, draw, onSel){
    el.innerHTML = widgetHead(cfg.title)+'<div class="plot"></div><div class="ctrl">'+controls+'</div><div class="read"></div>';
    const plot=el.querySelector('.plot'), read=el.querySelector('.read');
    const redraw=()=>{ el.querySelectorAll('[data-v]').forEach(s=>{ s.textContent = WK.n(st[s.dataset.v],2); }); draw(plot, read, st); WK.bidi(read); fitWide(read); };
    el.addEventListener('input', e=>{
      const k=e.target.dataset.k; if(!k) return;
      st[k] = e.target.type==='range' ? +e.target.value : e.target.type==='checkbox' ? e.target.checked : e.target.value;
      if(e.target.tagName==='SELECT' && onSel){ onSel(st, k); el.querySelectorAll('input[type=range]').forEach(r=>{ if(r.dataset.k in st) r.value = st[r.dataset.k]; }); }
      redraw();
    });
    redraw();
    return { el, plot, read, redraw };
  },
  /* isolate left-to-right runs (formulas like |fₙ − f| ≥ ε) inside Hebrew notes so bidi does not scramble them */
  bidi(root){
    const run = /[A-Za-z0-9ₙₐₖˣ²³ᵖ∑√∞πεδθ‖∇|(\[][A-Za-z0-9ₙₐₖˣ²³ᵖ∑√∞πεδθ‖∇|()\[\]=≤≥<>+−\-·/.,'′∈±×→ ]*[A-Za-z0-9ₙₐₖˣ²³ᵖ∑√∞πεδθ‖∇|)\]]|[A-Za-z0-9ₙₐₖˣ²³ᵖ∑√∞πεδθ]/g;
    const needs = s => /[A-Za-z|=≤≥∑√∞επ‖∇<>]/.test(s) && !/^\d+(\.\d+)?$/.test(s);
    root.querySelectorAll('.w-note, .w-ok, .w-bad, .w-crit-l').forEach(host=>{
      const tw=document.createTreeWalker(host, NodeFilter.SHOW_TEXT, { acceptNode:n=> n.parentElement.closest('.katex, bdi') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      const nodes=[]; while(tw.nextNode()) nodes.push(tw.currentNode);
      nodes.forEach(n=>{
        const s=n.nodeValue; let last=0, m, frag=null; run.lastIndex=0;
        while((m=run.exec(s))){ if(!needs(m[0])) continue; frag=frag||document.createDocumentFragment();
          frag.appendChild(document.createTextNode(s.slice(last,m.index))); const b=document.createElement('bdi'); b.dir='ltr'; b.textContent=m[0]; frag.appendChild(b); last=m.index+m[0].length; }
        if(frag){ frag.appendChild(document.createTextNode(s.slice(last))); n.parentNode.replaceChild(frag, n); }
      });
    });
  },
  simpson(f,a,b,n){ n=n||400; if(n%2) n++; const h=(b-a)/n; let s=f(a)+f(b); for(let i=1;i<n;i++) s+=(i%2?4:2)*f(a+i*h); return s*h/3; },
  range01(fn,a,b,N){ let lo=Infinity, hi=-Infinity; N=N||300; for(let i=0;i<=N;i++){ const y=fn(a+(b-a)*i/N); if(isFinite(y)){ if(y<lo) lo=y; if(y>hi) hi=y; } } return [lo,hi]; },
  /* area between curve and y=0 as closed paths, split by sign (for shading positive / negative parts) */
  areaPaths(fn, a, b, F, N){
    N=N||240; let pos='', neg='';
    const pts=[]; for(let i=0;i<=N;i++){ const x=a+(b-a)*i/N; pts.push([x, fn(x)]); }
    const seg=(s)=>{ let d='M'+F.X(pts[s[0]][0]).toFixed(1)+' '+F.Y(0).toFixed(1); for(let i=s[0];i<=s[1];i++) d+='L'+F.X(pts[i][0]).toFixed(1)+' '+F.Y(Math.max(F.ymin,Math.min(F.ymax,pts[i][1]))).toFixed(1); return d+'L'+F.X(pts[s[1]][0]).toFixed(1)+' '+F.Y(0).toFixed(1)+'Z'; };
    let start=0;
    for(let i=1;i<=N;i++){ if(i===N || Math.sign(pts[i][1])!==Math.sign(pts[start][1])){ const d=seg([start,i]); if(pts[Math.min(start+1,N)][1]>=0) pos+=d; else neg+=d; start=i; } }
    return {pos, neg};
  }
};

/* ---------- unit 1: integral mean value theorem (משפט 1.29) ---------- */
const MVTF = {
  sin:{ lbl:'sin x', f:Math.sin, lo:0, hi:Math.PI, a:0, b:Math.PI },
  sq: { lbl:'x²', f:x=>x*x, lo:0, hi:2, a:0, b:2 },
  sqrt:{ lbl:'√x', f:Math.sqrt, lo:0, hi:4, a:0, b:4 },
  cub:{ lbl:'x³ − 3x + 3', f:x=>x*x*x-3*x+3, lo:-2, hi:2, a:-1.8, b:1.8 },
  exp:{ lbl:'eˣ', f:Math.exp, lo:-1, hi:1.5, a:-1, b:1.5 }
};
App.registerWidget('mvt', (el,cfg)=>{
  const st={ fn:cfg.fn||'sin', a:0, b:1 };
  const setAB=()=>{ const F=MVTF[st.fn]; st.a=F.a; st.b=F.b; };
  setAB();
  const ctl = WK.select('fn', Object.keys(MVTF).map(k=>[k,MVTF[k].lbl]), st.fn, 'פונקציה')+
    '<label>a <input type="range" data-k="ra" min="0" max="1" step="0.01" value="0"></label><label>b <input type="range" data-k="rb" min="0" max="1" step="0.01" value="1"></label>';
  const w = WK.mount(el, cfg, ctl, st, draw, ()=>{ setAB(); syncSliders(); });
  function syncSliders(){ const F=MVTF[st.fn]; st.ra=(st.a-F.lo)/(F.hi-F.lo); st.rb=(st.b-F.lo)/(F.hi-F.lo); el.querySelector('[data-k="ra"]').value=st.ra; el.querySelector('[data-k="rb"]').value=st.rb; }
  /* capture phase: map the 0..1 sliders to the function's domain before the generic handler redraws */
  el.addEventListener('input', e=>{ const k=e.target.dataset.k; if(k!=='ra' && k!=='rb') return; const F=MVTF[st.fn], key=k==='ra'?'a':'b'; st[key]=F.lo+(F.hi-F.lo)*(+e.target.value); if(st.b-st.a<0.05){ if(key==='a') st.a=st.b-0.05; else st.b=st.a+0.05; } }, true);
  syncSliders(); w.redraw();
  function draw(plot, read){
    const Fn=MVTF[st.fn], f=Fn.f, a=st.a, b=st.b;
    const I=WK.simpson(f,a,b), avg=I/(b-a);
    let [lo,hi]=WK.range01(f,Fn.lo,Fn.hi); lo=Math.min(lo,0); hi=Math.max(hi,0); const pad=(hi-lo)*.12;
    const F=WK.frame(600,290,44,14,12,30,Fn.lo,Fn.hi,lo-pad,hi+pad), id=WK.uid();
    const cs=[]; const N=600; for(let i=0;i<N;i++){ const x1=a+(b-a)*i/N, x2=a+(b-a)*(i+1)/N, d1=f(x1)-avg, d2=f(x2)-avg; if(d1===0) cs.push(x1); else if(d1*d2<0) cs.push(x1-d1*(x2-x1)/(d2-d1)); }
    const ar=WK.areaPaths(f,a,b,F);
    plot.innerHTML = WK.svg(F, WK.clip(F,id)+WK.axes(F)+'<g clip-path="url(#'+id+')">'+
      '<path class="a-pos" d="'+ar.pos+'"/><path class="a-neg" d="'+ar.neg+'"/>'+
      '<rect class="w-rect" x="'+F.X(a)+'" y="'+Math.min(F.Y(avg),F.Y(0))+'" width="'+(F.X(b)-F.X(a))+'" height="'+Math.abs(F.Y(avg)-F.Y(0))+'"/>'+
      '<line class="w-avg" x1="'+F.L+'" x2="'+(F.W-F.R)+'" y1="'+F.Y(avg)+'" y2="'+F.Y(avg)+'"/>'+
      '<path class="curve" d="'+pathOf(f,Fn.lo,Fn.hi,F.X,F.Y,F.ymin,F.ymax)+'"/>'+
      cs.map(c=>'<line class="w-guide" x1="'+F.X(c)+'" x2="'+F.X(c)+'" y1="'+F.Y(0)+'" y2="'+F.Y(avg)+'"/><circle class="w-pt2" cx="'+F.X(c)+'" cy="'+F.Y(avg)+'" r="5"/>').join('')+
      '</g>'+WK.xt(F,[Fn.lo,Fn.hi])+WK.t(F.X(a),F.H-F.B+16,'a','middle','w-strong')+WK.t(F.X(b),F.H-F.B+16,'b','middle','w-strong')+
      WK.t(F.W-F.R-4,F.Y(avg)-6,'f(c) = ממוצע','end','w-avgl'), 'משפט הערך הממוצע האינטגרלי');
    read.innerHTML = WK.cells([
      {k:'השטח (האינטגרל)', tex:'\\int_{'+WK.n(a,2)+'}^{'+WK.n(b,2)+'} f(x)\\,dx = '+WK.n(I,4)},
      {k:'הערך הממוצע', tex:'\\frac{1}{b-a}\\int_a^b f = '+WK.n(avg,4)},
      {k:'נקודות c שבהן f(c) שווה לממוצע', tex: cs.length ? 'c \\approx '+cs.map(c=>WK.n(c,3)).join(',\\ ') : '\\text{—}'},
      {k:'מה רואים', html:'<span class="w-note">שטח המלבן הכתום (בגובה הממוצע) שווה לשטח שמתחת לגרף.</span>', wide:true}
    ]);
  }
});

/* ---------- unit 1: accumulation function F(x)=∫_a^x f (משפט 1.33) ---------- */
const FTCF = {
  cos:{ lbl:'cos t', f:Math.cos, a:0, b:2*Math.PI },
  lin:{ lbl:'t − 1', f:t=>t-1, a:0, b:3 },
  sinp:{ lbl:'sin t + 0.4', f:t=>Math.sin(t)+0.4, a:0, b:2*Math.PI },
  jump:{ lbl:'מדרגה: 1 לפני t=1, 2 אחרי', f:t=>t<1?1:2, a:0, b:2, jump:1 }
};
App.registerWidget('ftc', (el,cfg)=>{
  const st={ fn:cfg.fn||'cos', x:0.6 };
  const w = WK.mount(el, cfg, WK.select('fn', Object.keys(FTCF).map(k=>[k,FTCF[k].lbl]), st.fn, 'f(t) =')+WK.range('x',0,1,0.005,st.x,'המיקום x (יחסי)'), st, draw);
  function draw(plot, read){
    const Fn=FTCF[st.fn], f=Fn.f, a=Fn.a, b=Fn.b, x=a+(b-a)*st.x;
    const Fa=t=>WK.simpson(f,a,t,Fn.jump?2000:300);
    const tab=[]; for(let i=0;i<=160;i++){ const t=a+(b-a)*i/160; tab.push([t,Fa(t)]); }
    const Fx=Fa(x);
    let [l1,h1]=WK.range01(f,a,b); l1=Math.min(l1,0); h1=Math.max(h1,0);
    let l2=Math.min(0,...tab.map(p=>p[1])), h2=Math.max(0,...tab.map(p=>p[1]));
    const p1=(h1-l1)*.12||1, p2=(h2-l2)*.12||1;
    const T=WK.frame(600,170,44,14,10,20,a,b,l1-p1,h1+p1), B=WK.frame(600,170,44,14,10,26,a,b,l2-p2,h2+p2), id1=WK.uid(), id2=WK.uid();
    const ar=WK.areaPaths(f,a,x,T,Math.max(2,Math.round(240*st.x)));
    const slopeL = Fn.jump && Math.abs(x-Fn.jump)<1e-9 ? null : f(x);
    const tl = slopeL===null ? '' : (()=>{ const dx=(b-a)*.12; return '<line class="w-tan" x1="'+B.X(x-dx)+'" y1="'+B.Y(Fx-slopeL*dx)+'" x2="'+B.X(x+dx)+'" y2="'+B.Y(Fx+slopeL*dx)+'"/>'; })();
    const Fpath = 'M'+tab.map(p=>B.X(p[0]).toFixed(1)+' '+B.Y(p[1]).toFixed(1)).join('L');
    plot.innerHTML =
      '<div class="w-cap">f(t) והשטח המסומן מ-a עד x</div>'+
      WK.svg(T, WK.clip(T,id1)+WK.axes(T)+'<g clip-path="url(#'+id1+')"><path class="a-pos" d="'+ar.pos+'"/><path class="a-neg" d="'+ar.neg+'"/>'+
        '<path class="curve" d="'+pathOf(f,a,b,T.X,T.Y,T.ymin,T.ymax,Fn.jump?2000:300)+'"/>'+
        '<line class="w-guide" x1="'+T.X(x)+'" x2="'+T.X(x)+'" y1="'+T.T+'" y2="'+(T.H-T.B)+'"/><circle class="w-pt" cx="'+T.X(x)+'" cy="'+T.Y(f(x))+'" r="4.5"/></g>', 'הפונקציה והשטח')+
      '<div class="w-cap">F(x) = ∫ₐˣ f(t) dt, והמשיק בנקודה x</div>'+
      WK.svg(B, WK.clip(B,id2)+WK.axes(B)+'<g clip-path="url(#'+id2+')"><path class="curve w-F" d="'+Fpath+'"/>'+tl+
        '<line class="w-guide" x1="'+B.X(x)+'" x2="'+B.X(x)+'" y1="'+B.T+'" y2="'+(B.H-B.B)+'"/><circle class="w-pt2" cx="'+B.X(x)+'" cy="'+B.Y(Fx)+'" r="5"/></g>'+WK.xt(B,[a,b]), 'הפונקציה הצוברת');
    const onJump = Fn.jump && Math.abs(x-Fn.jump) < (b-a)*0.006;
    read.innerHTML = WK.cells([
      {k:'x', tex:'x = '+WK.n(x,3)},
      {k:'הערך הצבור', tex:'F(x) = \\int_{'+WK.n(a,2)+'}^{x} f(t)\\,dt = '+WK.n(Fx,4)},
      {k:'שיפוע המשיק', tex: onJump ? '\\text{בנקודת הקפיצה } F \\text{ אינה גזירה}' : "F'(x) = f(x) = "+WK.n(f(x),4)},
      {k:'מה רואים', html:'<span class="w-note">'+(Fn.jump? 'בנקודת הקפיצה של f יש ל-F «שבירה»: F רציפה אך אינה גזירה שם (ראו דוגמה 1.19).' : 'השטח הכחול מוסיף ל-F והאדום מפחית; השיפוע של F בכל נקודה הוא הגובה של f.')+'</span>', wide:true}
    ]);
  }
});

/* ---------- unit 2: odd / even functions on a symmetric interval (שאלה 43) ---------- */
const SYMF = {
  x3:{ lbl:'x³ (אי-זוגית)', f:x=>x*x*x, odd:true },
  sin:{ lbl:'sin x (אי-זוגית)', f:Math.sin, odd:true },
  xcos:{ lbl:'x·cos x (אי-זוגית)', f:x=>x*Math.cos(x), odd:true },
  x3x:{ lbl:'x³ − 2x (אי-זוגית)', f:x=>x*x*x-2*x, odd:true },
  x2:{ lbl:'x² − 1 (זוגית)', f:x=>x*x-1, odd:false },
  cos:{ lbl:'cos x (זוגית)', f:Math.cos, odd:false }
};
App.registerWidget('oddsym', (el,cfg)=>{
  const st={ fn:'xcos', a:2.5 };
  WK.mount(el, cfg, WK.select('fn', Object.keys(SYMF).map(k=>[k,SYMF[k].lbl]), st.fn, 'פונקציה')+WK.range('a',0.2,3,0.05,st.a,'a'), st, (plot, read)=>{
    const S=SYMF[st.fn], f=S.f, a=st.a;
    let [lo,hi]=WK.range01(f,-3.2,3.2); lo=Math.min(lo,0); hi=Math.max(hi,0); const pad=(hi-lo)*.1;
    const F=WK.frame(600,270,44,14,10,28,-3.2,3.2,lo-pad,hi+pad), id=WK.uid(), ar=WK.areaPaths(f,-a,a,F);
    const I=WK.simpson(f,-a,a), Ih=WK.simpson(f,0,a);
    plot.innerHTML = WK.svg(F, WK.clip(F,id)+WK.axes(F)+'<g clip-path="url(#'+id+')"><path class="a-pos" d="'+ar.pos+'"/><path class="a-neg" d="'+ar.neg+'"/>'+
      '<path class="curve" d="'+pathOf(f,-3.2,3.2,F.X,F.Y,F.ymin,F.ymax)+'"/></g>'+WK.xt(F,[-a,0,a]), 'פונקציה זוגית או אי-זוגית בקטע סימטרי');
    read.innerHTML = WK.cells([
      {k:'על כל הקטע', tex:'\\int_{-'+WK.n(a,2)+'}^{'+WK.n(a,2)+'} f(x)\\,dx = '+WK.n(Math.abs(I)<1e-9?0:I,4)},
      {k:'על החצי הימני', tex:'\\int_{0}^{'+WK.n(a,2)+'} f(x)\\,dx = '+WK.n(Ih,4)},
      {k:'מה רואים', html:'<span class="w-note">'+(S.odd? 'בפונקציה אי-זוגית כל שטח כחול בצד אחד מתקזז מול שטח אדום זהה בצד השני, ולכן האינטגרל הוא 0.' : 'בפונקציה זוגית שני החצאים שווים, ולכן האינטגרל שווה לפעמיים האינטגרל מ-0 עד a.')+'</span>', wide:true}
    ]);
  });
});
