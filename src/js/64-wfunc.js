/* ================= unit 6 widgets: sequences of functions, power series ================= */
/* each sequence: fn(n,x), limit f(x), domain [a,b], exact sup d(n) when known */
const USEQ = {
  xn:  { lbl:'xⁿ בקטע [0,1]', a:0, b:1, fn:(n,x)=>Math.pow(x,n), f:x=>x<1?0:1, d:n=>1, jumpAt:1, note:'הגבול אינו רציף ב-x=1, ו-sup|fₙ−f| = 1 לכל n: אין התכנסות במ"ש (דוגמה 6.7).' },
  xnc: { lbl:'xⁿ בקטע [0,0.8]', a:0, b:0.8, fn:(n,x)=>Math.pow(x,n), f:()=>0, d:n=>Math.pow(0.8,n), note:'בקטע סגור פנימי dₙ = 0.8ⁿ → 0, ולכן ההתכנסות במ"ש (דוגמה 6.7).' },
  tent:{ lbl:'דוגמת האוהל (6.12)', a:0, b:1, fn:(n,x)=> x<=1/n ? n*n*x : x<=2/n ? 2*n-n*n*x : 0, f:()=>0, d:n=>n, note:'הגבול רציף (אפס), אבל גובה האוהל הוא n → ∞: אין התכנסות במ"ש.' },
  q16: { lbl:'n·x·(1−x²)ⁿ (שאלה 16)', a:0, b:1, fn:(n,x)=>n*x*Math.pow(1-x*x,n), f:()=>0, d:n=>{ const x=1/Math.sqrt(2*n+1); return n*x*Math.pow(1-x*x,n); }, note:'המקסימום מתקבל ב-x = 1/√(2n+1) וגדל כמו √n: אין התכנסות במ"ש.' },
  expn:{ lbl:'(1 + x/n)ⁿ → eˣ בקטע [0,2]', a:0, b:2, fn:(n,x)=>Math.pow(1+x/n,n), f:Math.exp, d:n=>Math.exp(2)-Math.pow(1+2/n,n), note:'הסדרה עולה ומתכנסת לפונקציה רציפה בקטע סגור: לפי משפט דיני ההתכנסות במ"ש (דוגמה 6.13).' },
  sinn:{ lbl:'sin(nx)/n בקטע [0,2π]', a:0, b:2*Math.PI, fn:(n,x)=>Math.sin(n*x)/n, f:()=>0, d:n=>1/n, note:'|fₙ(x)| ≤ 1/n לכל x: חסם שאינו תלוי ב-x, ולכן התכנסות במ"ש (שאלה 18).' },
  inv: { lbl:'1/(1+nx) בקטע (0,4]', a:0, b:4, fn:(n,x)=>1/(1+n*x), f:()=>0, d:n=>1, open:true, note:'ליד 0 הערכים קרובים ל-1 לכל n, ולכן sup = 1: אין התכנסות במ"ש ב-(0,∞) (שאלה 8ג).' }
};
App.registerWidget('uniform', (el,cfg)=>{
  const st={ s:cfg.seq||'xn', n:5, eps:0.2 };
  WK.mount(el, cfg, WK.select('s', Object.keys(USEQ).map(k=>[k,USEQ[k].lbl]), st.s, 'סדרה')+WK.range('n',1,60,1,st.n,'n')+WK.range('eps',0.02,1,0.01,st.eps,'ε'), st, (plot, read)=>{
    const S=USEQ[st.s], n=st.n, eps=st.eps, a=S.a, b=S.b;
    const fn=x=>S.fn(n,x);
    let hi=1.15, lo=-0.1;
    if(st.s==='tent'||st.s==='q16'){ hi=Math.max(1.2, S.d(n)*1.1); }
    if(st.s==='expn'){ hi=Math.exp(2)*1.08; lo=0; }
    if(st.s==='sinn'){ hi=1.1; lo=-1.1; }
    hi=Math.max(hi, 0+eps+0.1);
    const F=WK.frame(600,280,44,14,12,30,a,b,lo,hi), id=WK.uid();
    const N=900, x0=S.open? a+(b-a)*1e-4 : a;
    const bandTop=[], bandBot=[];
    for(let i=0;i<=200;i++){ const x=a+(b-a)*i/200; const v=S.f(x); bandTop.push(F.X(x).toFixed(1)+' '+F.Y(v+eps).toFixed(1)); bandBot.unshift(F.X(x).toFixed(1)+' '+F.Y(v-eps).toFixed(1)); }
    const flim = S.jumpAt ? 'M'+F.X(a)+' '+F.Y(0)+'L'+F.X(S.jumpAt-1e-9)+' '+F.Y(0) : pathOf(S.f,a,b,F.X,F.Y,F.ymin,F.ymax);
    let sup=0, outside=false; for(let i=0;i<=N;i++){ const x=x0+(b-x0)*i/N; const d=Math.abs(fn(x)-S.f(x)); if(d>sup) sup=d; if(d>=eps) outside=true; }
    const dn = S.d(n);
    let Neps=null; for(let m=1;m<=5000;m++){ if(S.d(m)<eps){ let ok=true; for(let k=m;k<=Math.min(5000,m+400);k++) if(S.d(k)>=eps){ ok=false; break; } if(ok){ Neps=m; break; } } }
    plot.innerHTML = WK.svg(F, WK.clip(F,id)+WK.axes(F)+'<g clip-path="url(#'+id+')">'+
      '<path class="w-epsband" d="M'+bandTop.join('L')+'L'+bandBot.join('L')+'Z"/>'+
      '<path class="curve" d="'+flim+'"/>'+(S.jumpAt? '<circle class="w-pt" cx="'+F.X(S.jumpAt)+'" cy="'+F.Y(1)+'" r="4.5"/><circle class="w-open" cx="'+F.X(S.jumpAt)+'" cy="'+F.Y(0)+'" r="4.5"/>' : '')+
      '<path class="w-fn'+(outside?' out':'')+'" d="'+pathOf(fn,x0,b,F.X,F.Y,F.ymin,F.ymax,1200)+'"/></g>'+WK.xt(F,[a,b]), 'התכנסות במידה שווה');
    read.innerHTML = WK.cells([
      {k:'המרחק המרבי', tex:'d_{'+n+'} = \\sup |f_{'+n+'}(x) - f(x)| = '+WK.n(dn,4), wide:true},
      {k:'האם fₙ בתוך הרצועה?', html: outside ? '<b class="w-bad">לא: יש נקודות שבהן '+tex('|f_n - f| \\ge \\varepsilon',false)+'</b>' : '<b class="w-ok">כן: כל הגרף בתוך הרצועה</b>'},
      {k:'N(ε) שאינו תלוי ב-x', html: Neps!==null ? '<b class="w-ok">'+tex('N(\\varepsilon)='+Neps,false)+': מ-n זה והלאה כל הגרף ברצועה</b>' : '<b class="w-bad">לא קיים: dₙ אינו שואף ל-0, אין התכנסות במ"ש</b>'},
      {k:'מה רואים', html:'<span class="w-note">'+esc(S.note)+'</span>', wide:true},
      {k:'מקרא', html:'<span class="w-note"><span class="lgi"><i class="lg lg-f"></i>הגבול f</span> <span class="lgi"><i class="lg lg-fn"></i>fₙ</span> <span class="lgi"><i class="lg lg-band"></i>הרצועה f ± ε</span></span>', wide:true}
    ]);
  });
});

/* ---------- power series: partial sums and the interval of convergence (משפט 6.10) ---------- */
function li2(x){ let s=0; for(let n=1;n<=4000;n++) s+=Math.pow(x,n)/(n*n); return s; }
const PSER = {
  geo:{ lbl:'1/(1−x) = Σ xⁿ', f:x=>1/(1-x), c:n=>1, R:1, L:false, Rc:false, dom:[-1.6,1.6], tex:'\\sum_{n=0}^\\infty x^n', ends:'בשני הקצוות האיבר הכללי אינו שואף ל-0' },
  ln:{ lbl:'ln(1+x)', f:x=>Math.log(1+x), c:n=>n===0?0:(n%2?1:-1)/n, R:1, L:false, Rc:true, dom:[-1.4,1.8], tex:'\\sum_{n=1}^\\infty \\frac{(-1)^{n-1}x^n}{n}', ends:'ב-x=1 מתכנס לפי לייבניץ; ב-x=−1 מתקבל טור הרמוני מתבדר' },
  atan:{ lbl:'arctan x', f:Math.atan, c:n=>n%2? ((n-1)/2%2?-1:1)/n : 0, R:1, L:true, Rc:true, dom:[-1.8,1.8], tex:'\\sum_{n=0}^\\infty \\frac{(-1)^n x^{2n+1}}{2n+1}', ends:'בשני הקצוות מתכנס לפי לייבניץ' },
  rat:{ lbl:'1/(1+x²) = Σ (−1)ⁿx²ⁿ', f:x=>1/(1+x*x), c:n=>n%2?0:((n/2)%2?-1:1), R:1, L:false, Rc:false, dom:[-1.8,1.8], tex:'\\sum_{n=0}^\\infty (-1)^n x^{2n}', ends:'בקצוות האיבר הכללי אינו שואף ל-0, אף שהפונקציה עצמה מוגדרת בכל הישר' },
  exp:{ lbl:'eˣ', f:Math.exp, c:n=>1/factorial(n), R:Infinity, dom:[-3,3], tex:'\\sum_{n=0}^\\infty \\frac{x^n}{n!}', ends:'אין קצוות: הטור מתכנס בכל הישר' },
  li:{ lbl:'Σ xⁿ/n²', f:x=> Math.abs(x)<=1 ? li2(x) : NaN, c:n=>n===0?0:1/(n*n), R:1, L:true, Rc:true, dom:[-1.6,1.6], tex:'\\sum_{n=1}^\\infty \\frac{x^n}{n^2}', ends:'בשני הקצוות מתכנס בהחלט, כי Σ 1/n² מתכנס' }
};
App.registerWidget('powser', (el,cfg)=>{
  const st={ s:cfg.fn||'ln', N:6 };
  WK.mount(el, cfg, WK.select('s', Object.keys(PSER).map(k=>[k,PSER[k].lbl]), st.s, 'טור')+WK.range('N',0,40,1,st.N,'מעלת הסכום החלקי N'), st, (plot, read)=>{
    const P=PSER[st.s], N=st.N, [a,b]=P.dom;
    const SN=x=>{ let s=0, xp=1; for(let n=0;n<=N;n++){ s+=P.c(n)*xp; xp*=x; } return s; };
    let [lo,hi]=WK.range01(P.f, Math.max(a,-0.98), Math.min(b, P.R===1&&st.s==='geo'?0.9:b)); if(st.s==='exp'){ lo=-1; hi=Math.exp(3)*1.05; }
    const pad=(hi-lo)*.25||1; lo-=pad; hi+=pad;
    const F=WK.frame(600,280,44,14,12,34,a,b,lo,hi), id=WK.uid();
    const R=P.R, band = isFinite(R) ? '<rect class="w-conv" x="'+F.X(-R)+'" y="'+F.T+'" width="'+(F.X(R)-F.X(-R))+'" height="'+F.ph+'"/>'+
      '<circle class="'+(P.L?'w-endc':'w-endo')+'" cx="'+F.X(-R)+'" cy="'+(F.H-F.B)+'" r="5.5"/><circle class="'+(P.Rc?'w-endc':'w-endo')+'" cx="'+F.X(R)+'" cy="'+(F.H-F.B)+'" r="5.5"/>' : '<rect class="w-conv" x="'+F.L+'" y="'+F.T+'" width="'+F.pw+'" height="'+F.ph+'"/>';
    plot.innerHTML = WK.svg(F, WK.clip(F,id)+WK.axes(F)+band+'<g clip-path="url(#'+id+')">'+
      '<path class="curve" d="'+pathOf(P.f,a,b,F.X,F.Y,F.ymin,F.ymax,600)+'"/>'+
      '<path class="w-fn" d="'+pathOf(SN,a,b,F.X,F.Y,F.ymin,F.ymax,600)+'"/></g>'+WK.xt(F, isFinite(R)?[a,-R,R,b]:[a,0,b]), 'טור חזקות ותחום התכנסותו');
    const dom = !isFinite(R) ? '(-\\infty, \\infty)' : (P.L?'[':'(')+'-1, 1'+(P.Rc?']':')');
    read.innerHTML = WK.cells([
      {k:'הטור', tex:P.tex},
      {k:'רדיוס ההתכנסות', tex:'R = '+(isFinite(R)? R : '\\infty')},
      {k:'תחום ההתכנסות', tex:dom},
      {k:'הקצוות', html:'<span class="w-note">'+esc(P.ends)+'</span>'},
      {k:'מה רואים', html:'<span class="w-note">בתוך התחום הירוק הסכום החלקי (כתום) נצמד לפונקציה ככל ש-N גדל; מחוצה לו הוא מתרחק. עיגול מלא בקצה פירושו שהטור מתכנס שם.</span>', wide:true}
    ]);
  });
});
