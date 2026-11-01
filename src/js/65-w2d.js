/* ================= unit 7 widgets: the plane and functions of two variables ================= */
function svgPoint(svg, e){ const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
/* heat map of f on [x0,x1]×[y0,y1] as a PNG data URL (blue < 0 < orange, darker contour lines every `step`) */
function heatURL(f, x0, x1, y0, y1, res, step){
  const c=document.createElement('canvas'); c.width=res; c.height=res; const g=c.getContext('2d'); const im=g.createImageData(res,res);
  const V=new Float64Array(res*res); let m=0;
  for(let j=0;j<res;j++) for(let i=0;i<res;i++){ const v=f(x0+(x1-x0)*(i+.5)/res, y1-(y1-y0)*(j+.5)/res); V[j*res+i]=v; if(isFinite(v)) m=Math.max(m,Math.abs(v)); }
  m=m||1;
  /* contour levels on a square-root scale: dense near 0 (where critical values usually are), sparse where |f| is large */
  const s = Math.sqrt(m)/(step||14), lv = v => Math.floor(Math.sign(v)*Math.sqrt(Math.abs(v))/s);
  for(let j=0;j<res;j++) for(let i=0;i<res;i++){
    const k=j*res+i, v=V[k], o=k*4; if(!isFinite(v)){ im.data[o+3]=0; continue; }
    const t=Math.min(1,Math.abs(v)/m), col = v>=0 ? [214,138,32] : [48,98,200];
    let line=false; if(step){ const q=lv(v); if(i>0 && lv(V[k-1])!==q) line=true; if(j>0 && lv(V[k-res])!==q) line=true; }
    im.data[o]=col[0]; im.data[o+1]=col[1]; im.data[o+2]=col[2]; im.data[o+3]= line ? 210 : Math.round(30+150*Math.pow(t,0.7));
    if(line){ im.data[o]=40; im.data[o+1]=46; im.data[o+2]=60; }
  }
  g.putImageData(im,0,0); return c.toDataURL();
}

/* ---------- vectors: sum, dot product, angle, projection, Cauchy–Schwarz (7.3–7.14) ---------- */
App.registerWidget('vectors', (el,cfg)=>{
  const st={ u:[3,1], v:[1,2.5] };
  el.innerHTML = widgetHead(cfg.title)+'<div class="plot"></div><div class="ctrl"><span class="w-note">גררו את ראשי החצים <b class="w-cu">u</b> ו-<b class="w-cv">v</b>.</span> '+WK.check('par',true,'מקבילית u+v')+WK.check('proj',true,'היטל של u על v')+'</div><div class="read"></div>';
  const plot=el.querySelector('.plot'), read=el.querySelector('.read'); let drag=null; const opt={par:true, proj:true};
  const F=WK.frame(420,420,14,14,14,14,-4.5,4.5,-4.5,4.5);
  function arrow(p,cls,id){ const x=F.X(p[0]), y=F.Y(p[1]), ox=F.X(0), oy=F.Y(0); const ang=Math.atan2(y-oy,x-ox), h=11;
    return '<line class="'+cls+'" x1="'+ox+'" y1="'+oy+'" x2="'+x+'" y2="'+y+'"/><path class="'+cls+' head" d="M'+x+' '+y+'L'+(x-h*Math.cos(ang-0.4))+' '+(y-h*Math.sin(ang-0.4))+'L'+(x-h*Math.cos(ang+0.4))+' '+(y-h*Math.sin(ang+0.4))+'Z"/>'+(id?'<circle class="w-handle" data-h="'+id+'" cx="'+x+'" cy="'+y+'" r="13"/>':''); }
  function draw(){
    const u=st.u, v=st.v, dot=u[0]*v[0]+u[1]*v[1], nu=Math.hypot(...u), nv=Math.hypot(...v), cos=nu&&nv? dot/(nu*nv):0, th=Math.acos(Math.max(-1,Math.min(1,cos)));
    let grid=''; for(let k=-4;k<=4;k++){ grid+='<line class="w-grid" x1="'+F.X(k)+'" x2="'+F.X(k)+'" y1="'+F.T+'" y2="'+(F.H-F.B)+'"/><line class="w-grid" y1="'+F.Y(k)+'" y2="'+F.Y(k)+'" x1="'+F.L+'" x2="'+(F.W-F.R)+'"/>'; }
    const s=[u[0]+v[0],u[1]+v[1]], pr = nv? [dot/(nv*nv)*v[0], dot/(nv*nv)*v[1]] : [0,0];
    const a1=Math.atan2(u[1],u[0]), a2=Math.atan2(v[1],v[0]); let d=a2-a1; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI;
    const r=28, arc='M'+(F.X(0)+r*Math.cos(a1))+' '+(F.Y(0)-r*Math.sin(a1))+'A'+r+' '+r+' 0 0 '+(d>0?0:1)+' '+(F.X(0)+r*Math.cos(a2))+' '+(F.Y(0)-r*Math.sin(a2));
    plot.innerHTML = '<div class="w-sq">'+WK.svg(F, grid+WK.axes(F)+
      (opt.par? '<path class="w-parl" d="M'+F.X(u[0])+' '+F.Y(u[1])+'L'+F.X(s[0])+' '+F.Y(s[1])+'L'+F.X(v[0])+' '+F.Y(v[1])+'"/>'+arrow(s,'w-vs') : '')+
      (opt.proj? '<line class="w-guide" x1="'+F.X(u[0])+'" y1="'+F.Y(u[1])+'" x2="'+F.X(pr[0])+'" y2="'+F.Y(pr[1])+'"/>'+arrow(pr,'w-vp') : '')+
      '<path class="w-arc" d="'+arc+'"/>'+arrow(v,'w-vv','v')+arrow(u,'w-vu','u'), 'וקטורים במישור')+'</div>';
    const csw = nu*nv ? Math.abs(dot)/(nu*nv) : 0;
    read.innerHTML = WK.cells([
      {k:'הווקטורים', tex:'\\vec u = ('+WK.n(u[0],2)+', '+WK.n(u[1],2)+'),\\ \\vec v = ('+WK.n(v[0],2)+', '+WK.n(v[1],2)+')', wide:true},
      {k:'מכפלה סקלרית', tex:'\\vec u\\cdot\\vec v = '+WK.n(dot,3)+(Math.abs(dot)<0.05?'\\ \\ (\\perp)':'')},
      {k:'אורכים', tex:'\\|\\vec u\\| = '+WK.n(nu,3)+',\\ \\|\\vec v\\| = '+WK.n(nv,3)},
      {k:'הזווית', tex:'\\cos\\theta = '+WK.n(cos,3)+',\\ \\theta \\approx '+WK.n(th*180/Math.PI,1)+'^\\circ'},
      {k:'קושי-שוורץ', html: tex('|\\vec u\\cdot\\vec v| = '+WK.n(Math.abs(dot),3)+' \\le '+WK.n(nu*nv,3)+' = \\|\\vec u\\|\\|\\vec v\\|',false)+'<div class="w-meter"><i style="width:'+(csw*100).toFixed(1)+'%"></i></div><span class="w-note">'+(csw>0.995?'כמעט שוויון: הווקטורים כמעט על אותו ישר':'היחס '+WK.n(csw,3)+'; שוויון רק כשהווקטורים מקבילים')+'</span>', wide:true}
    ]);
    WK.bidi(read);
  }
  plot.addEventListener('pointerdown', e=>{ const svg=plot.querySelector('svg'); if(!svg) return; const p=svgPoint(svg,e); const x=(p.x-F.L)/F.pw*9-4.5, y=4.5-(p.y-F.T)/F.ph*9;
    const h=e.target.dataset && e.target.dataset.h; drag = h || (Math.hypot(x-st.u[0],y-st.u[1]) < Math.hypot(x-st.v[0],y-st.v[1]) ? 'u':'v');
    plot.setPointerCapture(e.pointerId); move(e); e.preventDefault(); });
  function move(e){ if(!drag) return; const svg=plot.querySelector('svg'); const p=svgPoint(svg,e); let x=(p.x-F.L)/F.pw*9-4.5, y=4.5-(p.y-F.T)/F.ph*9; x=Math.max(-4.4,Math.min(4.4,Math.round(x*4)/4)); y=Math.max(-4.4,Math.min(4.4,Math.round(y*4)/4)); st[drag]=[x,y]; draw(); }
  plot.addEventListener('pointermove', move); plot.addEventListener('pointerup', ()=>{ drag=null; }); plot.addEventListener('pointercancel', ()=>{ drag=null; });
  el.addEventListener('input', e=>{ const k=e.target.dataset.k; if(k){ opt[k]=e.target.checked; draw(); } });
  draw();
});

/* ---------- limits along paths (7.40, דוגמה 7.14, שאלה 27) ---------- */
const PATHF = {
  xy:{ lbl:'xy/(x²+y²)', f:(x,y)=>x*y/(x*x+y*y), lim:null, why:'לאורך y = mx הערך קבוע m/(1+m²): הגבול תלוי בשיפוע ולכן אינו קיים (דוגמה 7.14).' },
  xy2:{ lbl:'xy²/(x²+y⁴)', f:(x,y)=>x*y*y/(x*x+Math.pow(y,4)), lim:null, why:'לאורך כל ישר הגבול 0, אבל לאורך הפרבולה x = y² הערך הוא 1/2: אין גבול (שאלה 27ד).' },
  x2y:{ lbl:'x²y/(x²+y²)', f:(x,y)=>x*x*y/(x*x+y*y), lim:0, why:'|f| ≤ |y| → 0: לפי סנדוויץ׳ הגבול קיים ושווה ל-0.' },
  abs:{ lbl:'xy/(|x|+|y|)', f:(x,y)=>x*y/(Math.abs(x)+Math.abs(y)), lim:0, why:'|f| ≤ |x| → 0: לפי סנדוויץ׳ הגבול 0 (דוגמה 7.13).' }
};
App.registerWidget('paths', (el,cfg)=>{
  const st={ s:'xy', m:1, par:false };
  const img={}; const F=WK.frame(360,360,10,10,10,10,-1,1,-1,1);
  WK.mount(el, cfg, WK.select('s', Object.keys(PATHF).map(k=>[k,PATHF[k].lbl]), st.s, 'f(x,y) =')+WK.range('m',-3,3,0.05,st.m,'שיפוע הישר y = mx')+WK.check('par',st.par,'גם הפרבולה x = y²'), st, (plot, read)=>{
    const P=PATHF[st.s], f=P.f, m=st.m;
    if(!img[st.s]) img[st.s]=heatURL(f,-1,1,-1,1,240,8);
    const lineVal = t => f(t, m*t), parVal = t => f(t*t, t);
    const G=WK.frame(360,220,40,10,14,28,-1,1,-1.05,1.05), id=WK.uid();
    const mini = '<path class="w-fn" d="'+pathOf(t=>Math.abs(t)<1e-6?NaN:lineVal(t),-1,1,G.X,G.Y,G.ymin,G.ymax,400)+'"/>'+(st.par? '<path class="w-par2" d="'+pathOf(t=>Math.abs(t)<1e-6?NaN:parVal(t),-1,1,G.X,G.Y,G.ymin,G.ymax,400)+'"/>':'');
    const Lline=lineVal(1e-7), Lpar=parVal(1e-5);
    plot.innerHTML = '<div class="w-two"><div>'+WK.svg(F, '<image href="'+img[st.s]+'" x="'+F.L+'" y="'+F.T+'" width="'+F.pw+'" height="'+F.ph+'" preserveAspectRatio="none"/>'+WK.axes(F).replace('class="pbg"','class="pbg clear"')+
      '<line class="w-path" x1="'+F.X(-1)+'" y1="'+F.Y(-m)+'" x2="'+F.X(1)+'" y2="'+F.Y(m)+'"/>'+
      (st.par? '<path class="w-path2" d="'+pathOf(t=>Math.sqrt(Math.max(0,t)),0,1,F.X,F.Y,-1,1,120).replace(/^M/,'M')+'"/><path class="w-path2" d="'+pathOf(t=>-Math.sqrt(Math.max(0,t)),0,1,F.X,F.Y,-1,1,120)+'"/>' : '')+
      '<circle class="w-pt" cx="'+F.X(0)+'" cy="'+F.Y(0)+'" r="4"/>', 'מפת ערכים סביב הראשית')+'<div class="w-cap">מפת הערכים ב-[−1,1]²: כתום חיובי, כחול שלילי</div></div>'+
      '<div>'+WK.svg(G, WK.clip(G,id)+WK.axes(G)+'<g clip-path="url(#'+id+')">'+mini+'</g>'+WK.xt(G,[-1,0,1])+WK.yt(G,[-1,1]), 'ערכי הפונקציה לאורך המסלולים')+'<div class="w-cap">הערך לאורך המסלול כפונקציה של הפרמטר t</div></div></div>';
    read.innerHTML = WK.cells([
      {k:'לאורך הישר y = mx', tex:'\\lim_{t\\to0} f(t, '+WK.n(m,2)+'t) = '+WK.n(Math.abs(Lline)<1e-6?0:Lline,4)},
      {k:'לאורך הפרבולה x = y²', tex: st.par ? '\\lim_{t\\to0} f(t^2, t) = '+WK.n(Math.abs(Lpar)<1e-4?0:Lpar,4) : '\\text{(כבוי)}'},
      {k:'הגבול בראשית', html: P.lim===null ? '<b class="w-bad">אינו קיים</b>' : '<b class="w-ok">קיים ושווה ל-'+P.lim+'</b>'},
      {k:'למה', html:'<span class="w-note">'+esc(P.why)+'</span>', wide:true}
    ]);
  });
});

/* ---------- contour map, gradient, directional derivative, critical points (7.67, 7.69, 7.72) ---------- */
const CONF = {
  ell:{ lbl:'x² + 2y²', box:[-2,2,-2,2], f:(x,y)=>x*x+2*y*y, g:(x,y)=>[2*x,4*y], H:()=>[2,0,4], crit:[[0,0]], step:0.5 },
  sad:{ lbl:'x² − y²', box:[-2,2,-2,2], f:(x,y)=>x*x-y*y, g:(x,y)=>[2*x,-2*y], H:()=>[2,-2,0], crit:[[0,0]], step:0.5 },
  q48:{ lbl:'x³ + y³ − 3xy (שאלה 48)', box:[-1.2,2,-1.2,2], f:(x,y)=>x*x*x+y*y*y-3*x*y, g:(x,y)=>[3*x*x-3*y,3*y*y-3*x], H:(x,y)=>[6*x,6*y,-3], crit:[[0,0],[1,1]], step:0.35 },
  e717:{ lbl:'xy² − x²y − y (דוגמה 7.17)', box:[-0.3,2.2,-0.3,2.2], f:(x,y)=>x*y*y-x*x*y-y, g:(x,y)=>[y*y-2*x*y, 2*x*y-x*x-1], H:(x,y)=>[-2*y,2*x,2*y-2*x], crit:[[1/Math.sqrt(3),2/Math.sqrt(3)]], step:0.3 },
  q37:{ lbl:'1 + 2x + 4y − x² − y² (שאלה 37)', box:[-2,2,-3,3], f:(x,y)=>1+2*x+4*y-x*x-y*y, g:(x,y)=>[2-2*x,4-2*y], H:()=>[-2,-2,0], crit:[[1,2]], step:2 },
  sc:{ lbl:'sin x · cos y', box:[-3.3,3.3,-3.3,3.3], f:(x,y)=>Math.sin(x)*Math.cos(y), g:(x,y)=>[Math.cos(x)*Math.cos(y),-Math.sin(x)*Math.sin(y)], H:(x,y)=>[-Math.sin(x)*Math.cos(y),-Math.sin(x)*Math.cos(y),-Math.cos(x)*Math.sin(y)],
       crit:(()=>{ const c=[], P=Math.PI; [-P/2,P/2].forEach(x=>[-P,0,P].forEach(y=>c.push([x,y]))); [-P,0,P].forEach(x=>[-P/2,P/2].forEach(y=>c.push([x,y]))); return c; })(), step:0.25 }
};
function classify2(H){ const D=H[0]*H[1]-H[2]*H[2]; return { D, kind: Math.abs(D)<1e-9 ? 'none' : D<0 ? 'saddle' : H[0]>0 ? 'min' : 'max' }; }
const KIND = { min:'מינימום מקומי', max:'מקסימום מקומי', saddle:'נקודת אוכף', none:'המבחן אינו מכריע' };
App.registerWidget('contour', (el,cfg)=>{
  const st={ s:cfg.fn||'ell', ang:30, P:null };
  const img={}; let F;
  const ctl = WK.select('s', Object.keys(CONF).map(k=>[k,CONF[k].lbl]), st.s, 'f(x,y) =')+WK.range('ang',0,360,5,st.ang,'כיוון u (מעלות)')+'<span class="w-note">לחצו או גררו על המפה כדי לבחור נקודה P.</span>';
  const w = WK.mount(el, cfg, ctl, st, draw, ()=>{ st.P=null; });
  function draw(plot, read){
    const C=CONF[st.s], [x0,x1,y0,y1]=C.box;
    F=WK.frame(400,400,12,12,12,12,x0,x1,y0,y1);
    if(!img[st.s]) img[st.s]=heatURL(C.f,x0,x1,y0,y1,280,10);
    if(!st.P) st.P = cfg.focus==='crit' ? [ (x0+x1)/2+(x1-x0)*0.18, (y0+y1)/2-(y1-y0)*0.2 ] : [ x0+(x1-x0)*0.7, y0+(y1-y0)*0.66 ];
    const [px,py]=st.P, g=C.g(px,py), ng=Math.hypot(g[0],g[1]), th=st.ang*Math.PI/180, u=[Math.cos(th),Math.sin(th)], Du=g[0]*u[0]+g[1]*u[1];
    const sc=(x1-x0)*0.13/Math.max(ng,1e-9)*Math.min(1,ng/1+0.4), L=(x1-x0)*0.13;
    const arr=(dx,dy,cls)=>{ const X1=F.X(px), Y1=F.Y(py), X2=F.X(px+dx), Y2=F.Y(py+dy), a=Math.atan2(Y2-Y1,X2-X1), h=10;
      return '<line class="'+cls+'" x1="'+X1+'" y1="'+Y1+'" x2="'+X2+'" y2="'+Y2+'"/><path class="'+cls+' head" d="M'+X2+' '+Y2+'L'+(X2-h*Math.cos(a-0.4))+' '+(Y2-h*Math.sin(a-0.4))+'L'+(X2-h*Math.cos(a+0.4))+' '+(Y2-h*Math.sin(a+0.4))+'Z"/>'; };
    const crit = C.crit.filter(c=>c[0]>=x0&&c[0]<=x1&&c[1]>=y0&&c[1]<=y1).map(c=>{ const k=classify2(C.H(c[0],c[1])); return {c, ...k}; });
    plot.innerHTML = '<div class="w-sq">'+WK.svg(F, '<image href="'+img[st.s]+'" x="'+F.L+'" y="'+F.T+'" width="'+F.pw+'" height="'+F.ph+'" preserveAspectRatio="none"/>'+WK.axes(F).replace('class="pbg"','class="pbg clear"')+
      crit.map(k=>'<circle class="w-crit '+k.kind+'" cx="'+F.X(k.c[0])+'" cy="'+F.Y(k.c[1])+'" r="7"/>').join('')+
      (ng>1e-9 ? arr(g[0]*L/Math.max(ng,1e-9), g[1]*L/Math.max(ng,1e-9), 'w-grad') : '')+arr(u[0]*L*0.8, u[1]*L*0.8, 'w-dir')+
      '<circle class="w-pt" cx="'+F.X(px)+'" cy="'+F.Y(py)+'" r="5"/>'+WK.t(F.X(px)+8, F.Y(py)-8, 'P', 'start', 'w-strong'), 'מפת קווי גובה')+'</div>';
    read.innerHTML = WK.cells([
      {k:'הנקודה והערך', tex:'P = ('+WK.n(px,2)+', '+WK.n(py,2)+'),\\ f(P) = '+WK.n(C.f(px,py),3), wide:true},
      {k:'הגרדיאנט (חץ ירוק)', tex:'\\nabla f(P) = ('+WK.n(g[0],3)+', '+WK.n(g[1],3)+'),\\ \\|\\nabla f\\| = '+WK.n(ng,3), wide:true},
      {k:'הנגזרת הכיוונית (חץ סגול)', tex:'\\vec u = ('+WK.n(u[0],3)+', '+WK.n(u[1],3)+'),\\ D_{\\vec u} f(P) = \\nabla f\\cdot\\vec u = '+WK.n(Du,3), wide:true},
      {k:'השוואה לגרדיאנט', html:'<span class="w-note">'+(ng<1e-6?'הגרדיאנט מתאפס, ולכן P נקודה קריטית.' : Math.abs(Du-ng)<0.02*ng+1e-6 ? 'הכיוון '+tex('\\vec u',false)+' הוא כיוון הגרדיאנט: זו העלייה המרבית, וערכה '+tex('\\|\\nabla f\\|',false)+'.' : Math.abs(Du)<0.02*ng+1e-6 ? 'הכיוון '+tex('\\vec u',false)+' ניצב לגרדיאנט, כלומר משיק לקו הגובה, והנגזרת הכיוונית מתאפסת.' : 'תמיד '+tex('|D_{\\vec u} f| \\le \\|\\nabla f\\|',false)+' (קושי-שוורץ), והמקסימום מתקבל בכיוון '+tex('\\nabla f',false)+'. סובבו את החץ הסגול כדי לראות.')+'</span>'},
      {k:'נקודות קריטיות ומבחן ההסיאן', html: crit.length ? crit.map(k=>'<span class="w-crit-l '+k.kind+'">('+WK.n(k.c[0],2)+', '+WK.n(k.c[1],2)+'): Δ = '+WK.n(k.D,2)+' → '+KIND[k.kind]+'</span>').join('') : '—', wide:true}
    ]);
  }
  const plotEl = w.plot; let down=false;
  const pick = e=>{ const svg=plotEl.querySelector('svg'); if(!svg || !F) return; const p=svgPoint(svg,e); const C=CONF[st.s];
    const x=F.xmin+(p.x-F.L)/F.pw*(F.xmax-F.xmin), y=F.ymax-(p.y-F.T)/F.ph*(F.ymax-F.ymin);
    st.P=[Math.max(C.box[0],Math.min(C.box[1],x)), Math.max(C.box[2],Math.min(C.box[3],y))]; w.redraw(); };
  plotEl.addEventListener('pointerdown', e=>{ down=true; plotEl.setPointerCapture(e.pointerId); pick(e); e.preventDefault(); });
  plotEl.addEventListener('pointermove', e=>{ if(down) pick(e); });
  plotEl.addEventListener('pointerup', ()=>{ down=false; }); plotEl.addEventListener('pointercancel', ()=>{ down=false; });
});
