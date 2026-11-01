/* ================= unit 5 widgets: series ================= */
function zeta(p){ let s=0; const M=2000; for(let n=1;n<=M;n++) s+=Math.pow(n,-p); return s + Math.pow(M,1-p)/(p-1) - 0.5*Math.pow(M,-p); }
const SER = {
  geo:  { lbl:'הנדסי: qⁿ (n≥0)', start:0, a:(n,s)=>Math.pow(s.q,n), tex:s=>'\\sum_{n=0}^{\\infty} ('+WK.n(s.q,2)+')^n', lim:s=> Math.abs(s.q)<1 ? 1/(1-s.q) : null, verdict:s=> Math.abs(s.q)<1 ? 'מתכנס כי |q| < 1' : 'מתבדר כי |q| ≥ 1', param:'q' },
  harm: { lbl:'הרמוני: 1/n', start:1, a:n=>1/n, tex:()=>'\\sum_{n=1}^{\\infty} \\frac{1}{n}', lim:()=>null, verdict:()=>'מתבדר ל-∞, אף ש-aₙ → 0 (דוגמה 5.3)' },
  p:    { lbl:'טור p: 1/nᵖ', start:1, a:(n,s)=>Math.pow(n,-s.p), tex:s=>'\\sum_{n=1}^{\\infty} \\frac{1}{n^{'+WK.n(s.p,2)+'}}', lim:s=> s.p>1 ? zeta(s.p) : null, verdict:s=> s.p>1 ? 'מתכנס כי p > 1' : 'מתבדר כי p ≤ 1', param:'p' },
  alt:  { lbl:'הרמוני לסירוגין', start:1, a:n=>(n%2?1:-1)/n, tex:()=>'\\sum_{n=1}^{\\infty} \\frac{(-1)^{n-1}}{n}', lim:()=>Math.LN2, verdict:()=>'מתכנס בתנאי, והסכום הוא ln 2' },
  tele: { lbl:'טלסקופי: 1/((n+1)(n+2))', start:1, a:n=>1/((n+1)*(n+2)), tex:()=>'\\sum_{n=1}^{\\infty} \\frac{1}{(n+1)(n+2)}', lim:()=>0.5, verdict:()=>'מתכנס, והסכום הוא 1/2 (שאלה 1)' },
  fact: { lbl:'1/n!', start:1, a:n=>1/factorial(n), tex:()=>'\\sum_{n=1}^{\\infty} \\frac{1}{n!}', lim:()=>Math.E-1, verdict:()=>'מתכנס, והסכום הוא e − 1' },
  osc:  { lbl:'(−1)ⁿ: טור חסום שאינו מתכנס', start:1, a:n=>n%2?-1:1, tex:()=>'\\sum_{n=1}^{\\infty} (-1)^n', lim:()=>null, verdict:()=>'מתבדר: הסכומים החלקיים מתנדנדים בין −1 ל-0 (שאלה 31)' }
};
App.registerWidget('series', (el,cfg)=>{
  const st={ s:'geo', q:0.6, p:1.5, N:25 };
  const ctl = WK.select('s', Object.keys(SER).map(k=>[k,SER[k].lbl]), st.s, 'טור')+WK.range('N',1,80,1,st.N,'מספר איברים N')+
    '<span class="w-par" data-par="q">'+WK.range('q',-1.2,1.2,0.05,st.q,'q')+'</span><span class="w-par" data-par="p">'+WK.range('p',0.5,3,0.05,st.p,'p')+'</span>';
  WK.mount(el, cfg, ctl, st, (plot, read)=>{
    const S=SER[st.s], N=st.N;
    el.querySelectorAll('.w-par').forEach(x=>{ x.hidden = x.dataset.par!==S.param; });
    const pts=[]; let sum=0;
    for(let i=0;i<N;i++){ const n=S.start+i; const an=S.a(n,st); sum+=an; pts.push([i+1, sum, an]); }
    const L=S.lim(st);
    let lo=Math.min(0,...pts.map(p=>p[1]), ...pts.map(p=>p[2])), hi=Math.max(0,...pts.map(p=>p[1]), ...pts.map(p=>p[2]));
    if(L!==null){ lo=Math.min(lo,L); hi=Math.max(hi,L); }
    hi=Math.min(hi, 40); lo=Math.max(lo,-40); const pad=(hi-lo)*.1||1;
    const F=WK.frame(600,280,48,14,12,30,0.5,N+0.5,lo-pad,hi+pad), id=WK.uid(), bw=Math.max(1.5, F.pw/N*0.5);
    plot.innerHTML = WK.svg(F, WK.clip(F,id)+WK.axes(F)+'<g clip-path="url(#'+id+')">'+
      pts.map(p=>'<rect class="w-bar'+(p[2]<0?' neg':'')+'" x="'+(F.X(p[0])-bw/2)+'" y="'+Math.min(F.Y(0),F.Y(p[2]))+'" width="'+bw+'" height="'+Math.abs(F.Y(p[2])-F.Y(0))+'"/>').join('')+
      (L!==null? '<line class="w-lim" x1="'+F.L+'" x2="'+(F.W-F.R)+'" y1="'+F.Y(L)+'" y2="'+F.Y(L)+'"/>' : '')+
      '<path class="w-sn" d="M'+pts.map(p=>F.X(p[0]).toFixed(1)+' '+F.Y(p[1]).toFixed(1)).join('L')+'"/>'+
      pts.map(p=>'<circle class="w-dot" cx="'+F.X(p[0]).toFixed(1)+'" cy="'+F.Y(p[1]).toFixed(1)+'" r="'+(N>50?2:3)+'"/>').join('')+
      '</g>'+WK.xt(F,[1,N])+WK.yt(F,[lo<0?lo:0, hi])+(L!==null? WK.t(F.W-F.R-4, F.Y(L)-6, 'S = '+WK.n(L,4),'end','w-liml') : ''), 'סכומים חלקיים של טור');
    const last=pts[pts.length-1];
    read.innerHTML = WK.cells([
      {k:'הטור', tex:S.tex(st)},
      {k:'האיבר האחרון', tex:'a_{'+(S.start+N-1)+'} = '+WK.n(last[2],5)},
      {k:'הסכום החלקי', tex:'S_{'+N+'} = '+WK.n(last[1],5)},
      {k:'מסקנה', html:'<b class="'+(L!==null?'w-ok':'w-bad')+'">'+esc(S.verdict(st))+'</b>'+(L!==null? ' '+tex('\\;S = '+WK.n(L,5),false):'')},
      {k:'מקרא', html:'<span class="w-note"><span class="lgi"><i class="lg lg-sn"></i>הסכומים החלקיים Sₙ</span> <span class="lgi"><i class="lg lg-bar"></i>האיברים aₙ</span> <span class="lgi"><i class="lg lg-lim"></i>סכום הטור</span></span>', wide:true}
    ]);
  });
});

/* ---------- integral test (משפט 5.19) ---------- */
App.registerWidget('inttest', (el,cfg)=>{
  const st={ p:1.2, N:8 };
  WK.mount(el, cfg, WK.range('p',0.5,2.5,0.05,st.p,'p בפונקציה 1/xᵖ')+WK.range('N',3,20,1,st.N,'N'), st, (plot, read)=>{
    const p=st.p, N=st.N, f=x=>Math.pow(x,-p);
    const F=WK.frame(600,270,44,14,12,30,0.6,N+1.4,0,1.12), id=WK.uid();
    let up='', dn='', Sup=0, Sdn=0;
    for(let n=1;n<=N;n++){ up+='<rect class="w-up" x="'+F.X(n)+'" y="'+F.Y(f(n))+'" width="'+(F.X(n+1)-F.X(n))+'" height="'+(F.Y(0)-F.Y(f(n)))+'"/>'; Sup+=f(n);
      dn+='<rect class="w-dn" x="'+F.X(n)+'" y="'+F.Y(f(n+1))+'" width="'+(F.X(n+1)-F.X(n))+'" height="'+(F.Y(0)-F.Y(f(n+1)))+'"/>'; Sdn+=f(n+1); }
    const I = Math.abs(p-1)<1e-9 ? Math.log(N+1) : (Math.pow(N+1,1-p)-1)/(1-p);
    const Iinf = p>1 ? 1/(p-1) : Infinity;
    plot.innerHTML = WK.svg(F, WK.clip(F,id)+WK.axes(F)+'<g clip-path="url(#'+id+')">'+up+dn+
      '<path class="curve" d="'+pathOf(f,0.6,N+1.4,F.X,F.Y,F.ymin,F.ymax)+'"/></g>'+WK.xt(F,[1,N+1]), 'מבחן האינטגרל');
    read.innerHTML = WK.cells([
      {k:'המלבנים הכתומים (חוסמים מלמעלה)', tex:'\\sum_{n=1}^{'+N+'} \\frac{1}{n^{'+WK.n(p,2)+'}} = '+WK.n(Sup,4)},
      {k:'השטח מתחת לגרף', tex:'\\int_1^{'+(N+1)+'} \\frac{dx}{x^{'+WK.n(p,2)+'}} = '+WK.n(I,4)},
      {k:'המלבנים הכחולים (חוסמים מלמטה)', tex:'\\sum_{n=2}^{'+(N+1)+'} \\frac{1}{n^{'+WK.n(p,2)+'}} = '+WK.n(Sdn,4)},
      {k:'באינסוף', html: tex('\\int_1^{\\infty} \\frac{dx}{x^{p}} = '+(isFinite(Iinf)? WK.n(Iinf,4) : '\\infty'),false)+' <b class="'+(p>1?'w-ok':'w-bad')+'">'+(p>1?'האינטגרל מתכנס, ולכן גם הטור':'האינטגרל מתבדר, ולכן גם הטור')+'</b>', wide:true}
    ]);
  });
});

/* ---------- Leibniz: alternating series zig-zag and the error bound (משפט 5.20) ---------- */
const LEIB = {
  inv:{ lbl:'aₙ = 1/n', a:n=>1/n, S:Math.LN2, tex:'\\frac{1}{n}' },
  sq:{ lbl:'aₙ = 1/√n', a:n=>1/Math.sqrt(n), S:0.6048986434216303, tex:'\\frac{1}{\\sqrt n}' },
  n2:{ lbl:'aₙ = 1/n²', a:n=>1/(n*n), S:Math.PI*Math.PI/12, tex:'\\frac{1}{n^2}' },
  odd:{ lbl:'aₙ = 1/(2n−1)', a:n=>1/(2*n-1), S:Math.PI/4, tex:'\\frac{1}{2n-1}' }
};
App.registerWidget('leibniz', (el,cfg)=>{
  const st={ s:'inv', N:9 };
  WK.mount(el, cfg, WK.select('s', Object.keys(LEIB).map(k=>[k,LEIB[k].lbl]), st.s, 'סדרה יורדת')+WK.range('N',1,40,1,st.N,'N'), st, (plot, read)=>{
    const Lb=LEIB[st.s], N=st.N, M=Math.max(N+4, 14);
    const pts=[]; let s=0; for(let n=1;n<=M;n++){ s += (n%2?1:-1)*Lb.a(n); pts.push([n,s]); }
    const S=Lb.S, err=Lb.a(N+1), SN=pts[N-1][1];
    const F=WK.frame(600,270,48,14,12,30,0.5,M+0.5,Math.min(0,...pts.map(p=>p[1]))-0.05,Math.max(...pts.map(p=>p[1]))+0.08), id=WK.uid();
    plot.innerHTML = WK.svg(F, WK.clip(F,id)+WK.axes(F)+'<g clip-path="url(#'+id+')">'+
      '<rect class="w-band" x="'+F.L+'" width="'+F.pw+'" y="'+F.Y(SN+err)+'" height="'+(F.Y(SN-err)-F.Y(SN+err))+'"/>'+
      '<line class="w-lim" x1="'+F.L+'" x2="'+(F.W-F.R)+'" y1="'+F.Y(S)+'" y2="'+F.Y(S)+'"/>'+
      '<path class="w-sn" d="M'+pts.map(p=>F.X(p[0]).toFixed(1)+' '+F.Y(p[1]).toFixed(1)).join('L')+'"/>'+
      pts.map(p=>'<circle class="'+(p[0]%2?'w-odd':'w-even')+'" cx="'+F.X(p[0]).toFixed(1)+'" cy="'+F.Y(p[1]).toFixed(1)+'" r="'+(p[0]===N?6:3.2)+'"/>').join('')+
      '</g>'+WK.xt(F,[1,M])+WK.t(F.W-F.R-4,F.Y(S)-6,'S','end','w-liml'), 'סכומים חלקיים של טור לייבניץ');
    read.innerHTML = WK.cells([
      {k:'הטור', tex:'\\sum_{n=1}^{\\infty} (-1)^{n-1}'+Lb.tex+' = '+WK.n(S,5)},
      {k:'הסכום החלקי', tex:'S_{'+N+'} = '+WK.n(SN,5)},
      {k:'השגיאה בפועל', tex:'|S - S_{'+N+'}| = '+WK.n(Math.abs(S-SN),5)},
      {k:'החסם של לייבניץ', tex:'a_{'+(N+1)+'} = '+WK.n(err,5)},
      {k:'מה רואים', html:'<span class="w-note">הסכומים האי-זוגיים (כתום) יורדים והזוגיים (כחול) עולים, והסכום S תמיד ביניהם. הרצועה סביב S<sub>N</sub> ברוחב a<sub>N+1</sub> מכילה תמיד את S.</span>', wide:true}
    ]);
  });
});

/* ---------- Riemann rearrangement (משפט 5.27) ---------- */
App.registerWidget('rearrange', (el,cfg)=>{
  const st={ T:1.5, K:120 };
  WK.mount(el, cfg, WK.range('T',-2,3,0.05,st.T,'הסכום הרצוי')+WK.range('K',20,400,10,st.K,'מספר איברים'), st, (plot, read)=>{
    const T=st.T, K=st.K; let p=1, q=2, s=0; const seq=[], pts=[], orig=[]; let so=0;
    for(let k=1;k<=K;k++){
      let t; if(s<=T){ t=1/p; p+=2; } else { t=-1/q; q+=2; }
      s+=t; seq.push(t); pts.push([k,s]); so += (k%2?1:-1)/k; orig.push([k,so]);
    }
    const all=pts.map(x=>x[1]).concat(orig.map(x=>x[1]), [T,0]);
    const F=WK.frame(600,270,48,14,12,30,0.5,K+0.5,Math.min(...all)-0.15,Math.max(...all)+0.15), id=WK.uid();
    const line=a=>'M'+a.map(x=>F.X(x[0]).toFixed(1)+' '+F.Y(x[1]).toFixed(1)).join('L');
    plot.innerHTML = WK.svg(F, WK.clip(F,id)+WK.axes(F)+'<g clip-path="url(#'+id+')">'+
      '<line class="w-lim" x1="'+F.L+'" x2="'+(F.W-F.R)+'" y1="'+F.Y(T)+'" y2="'+F.Y(T)+'"/>'+
      '<line class="w-lim2" x1="'+F.L+'" x2="'+(F.W-F.R)+'" y1="'+F.Y(Math.LN2)+'" y2="'+F.Y(Math.LN2)+'"/>'+
      '<path class="w-orig" d="'+line(orig)+'"/><path class="w-sn" d="'+line(pts)+'"/></g>'+
      WK.xt(F,[1,K])+WK.t(F.W-F.R-4,F.Y(T)-6,'היעד','end','w-liml')+WK.t(F.L+6,F.Y(Math.LN2)+14,'ln 2','start','w-liml2'), 'שינוי סדר בטור ההרמוני לסירוגין');
    const shown=seq.slice(0,9).map((t,i)=>(i===0?'':(t>0?' + ':' - '))+'\\tfrac{1}{'+Math.round(1/Math.abs(t))+'}').join('');
    read.innerHTML = WK.cells([
      {k:'תחילת הסידור החדש', tex:shown+' + \\cdots', wide:true},
      {k:'הסכום החלקי', tex:'S_{'+K+'} = '+WK.n(s,4)},
      {k:'הסכום בסדר המקורי', tex:'\\ln 2 \\approx 0.6931'},
      {k:'השיטה', html:'<span class="w-note">מוסיפים איברים חיוביים עד שעוברים את היעד, ואז איברים שליליים עד שיורדים מתחתיו, וחוזר חלילה. כך אפשר להגיע לכל מספר, כפי שקובע משפט רימן.</span>', wide:true}
    ]);
  });
});
