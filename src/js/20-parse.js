/* ================= parsing a unit ================= */
function classify(heading){
  const w = heading.trim().split(/\s+/)[0].replace(/['":()]/g,'');
  for(const t of TYPE_ORDER){ if(TYPES[t].words.includes(w)) return t; }
  return 'note';
}
function parseUnit(raw, uid){
  const lines = raw.replace(/\r\n?/g,'\n').split('\n');
  const blocks=[]; let cur=null; let title='';
  const add = b => { blocks.push(b); cur=b; };
  // units without numbered sections (6, 7) are organised by "חלק N" headings: those become the sections
  const numbered = lines.some(l=>/^#{1,6}\s+(?:סעיף\s+)?\d+(?:\.\d+)+(?=[\s:.]|$)/.test(l));
  for(const line of lines){
    const m = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if(m){
      const level=m[1].length, text=m[2];
      if(level===1 && !title){ title=text; if(!(cur && cur.kind==='intro' && !cur.lines.some(l=>l.trim()))) add({kind:'intro', lines:[]}); continue; }
      const pm = /^חלק\s+(\d+)/.exec(text);
      if(pm && numbered) add({kind:'part', heading:text, lines:[]});
      else if(pm) add({kind:'section', num:'', short:'חלק '+pm[1], depth:1, heading:text, lines:[]});
      else if(/^תוכן\s+(ה)?עניינים/.test(text)) add({kind:'toc', heading:text, lines:[]});
      else{
        const sm = /^(?:סעיף\s+)?(\d+(?:\.\d+)+)(?=[\s:.]|$)/.exec(text);
        if(sm) add({kind:'section', num:sm[1], depth:Math.min(2, sm[1].split('.').length-1), heading:text, lines:[]});
        else if(level===2) add({kind:'section', num:'', short:text.split(/\s+/)[0], depth:1, heading:text, lines:[]});
        else add({kind:'item', heading:text, type:classify(text), lines:[]});
      }
      continue;
    }
    if(!cur) add({kind:'intro', lines:[]});
    cur.lines.push(line);
  }
  // ids, section membership, duplicates
  const seen = new Map(); const occ = new Map();
  let sec1=null, sec2=null, i=0, tocSeen=false;
  for(const b of blocks){
    b.uid = uid;
    if(b.kind==='section'){
      b.id = 'u'+uid+'-s-'+(b.num ? b.num.replace(/\./g,'-') : 'x'+(i++));
      if(b.depth===1){ sec1=b; sec2=null; b.parent=null; } else { sec2=b; b.parent=sec1; }
      b.items=[];
    }
    if(b.kind==='toc'){ b.first = !tocSeen && !sec1; tocSeen=true; b.id='u'+uid+'-toc-'+(i++); }
    if(b.kind==='part'){ b.id='u'+uid+'-p-'+(i++); }
    if(b.kind==='item'){
      b.id = 'u'+uid+'-i-'+(i++);
      b.sec = sec2 || sec1; b.sec1 = sec1;
      const body = b.lines.filter(l=>!isHr(l)).join('\n').trim();
      const dk = b.heading+'\n'+body;
      if(seen.has(dk)) b.dupOf = seen.get(dk); else seen.set(dk, b);
      const n = (occ.get(b.heading)||0)+1; occ.set(b.heading,n);
      b.key = 'u'+uid+'|'+b.heading+'|'+n;
      b.ann = ANNK[b.key] || null; b.imp = isRef(uid) ? 0 : levelOf(b);
      b.search = (b.heading+' '+plain(body)+' '+body).toLowerCase();
      if(b.sec){ b.sec.items.push(b); if(b.sec.parent) b.sec.parent.items.push(b); }
    }
  }
  return { uid, title: title || ('יחידה '+uid), blocks, raw };
}

/* item body -> labelled segments ("* **label:**" lines) */
/* a field label line: "* **label:** rest", "**label:**", or (units 6-7) "- **נוסח/מסקנה…:** rest" -> {label, rest} */
const SEG_DASH_WORDS = /נוסח|תיאור|תוצאה|מסקנה|פתרון/;
const dashPrompt = lines => lines.some(l=>/^-\s+\*\*נוסח[^*]*:\*\*/.test(l));
function labelMatch(line, dashOK){
  let m = /^\*\s+\*\*([^*]+?):\*\*\s*(.*)$/.exec(line) || /^\*\*([^*]+?):\*\*\s*$/.exec(line);
  if(!m && dashOK){ m = /^-\s+\*\*([^*]+?):\*\*\s*(.*)$/.exec(line); if(m && !SEG_DASH_WORDS.test(m[1])) m = null; }
  return m ? { label:m[1], rest:(m[2]||'').trim(), prefix: line.slice(0, line.length-(m[2]||'').length) } : null;
}
function segmentize(lines){
  const segs=[]; let seg={label:null, rest:'', lines:[], raw:[]}; const dashOK = dashPrompt(lines);
  const flush=()=>{ if(seg.label!==null || seg.lines.some(l=>l.trim())) segs.push(seg); };
  for(const line of lines){
    if(isHr(line)) continue;
    const m = labelMatch(line, dashOK);
    if(m){
      flush();
      seg = {label:m.label, rest:m.rest, lines:[], raw:[line]};
      if(seg.rest){ flush(); seg={label:null, rest:'', lines:[], raw:[]}; }
      continue;
    }
    seg.lines.push(line); seg.raw.push(line);
  }
  flush();
  return segs;
}
const isAnswerLabel = l => /תוצאה|מסקנה|פתרון/.test(l);
const isPromptLabel = l => /נוסח|תיאור/.test(l) && !isAnswerLabel(l);
const isAsideLabel = l => /^הער|סימון/.test(l);
const ICON_BOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ICON_STAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3.5h12v17l-6-4.2-6 4.2z"/></svg>'; /* bookmark ("לחזרה") */
const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>';
const ICON_CHEV = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2l4 4-4 4" transform="rotate(180 6 6)"/></svg>';

function renderSeg(s){
  if(s.label===null) return '<div class="seg"><div class="md">'+renderMd(s.lines)+'</div></div>';
  if(/^מקור/.test(s.label)) return '<div class="src">'+ICON_BOOK+'<span><b>'+renderInline(s.label)+':</b> '+renderInline(s.rest)+'</span></div>';
  const aside = isAsideLabel(s.label);
  const body = renderMd((s.rest? [s.rest] : []).concat(s.lines));
  /* colour role of the label: prompt (question text), answer (result/solution), proof, aside (remark), other */
  const role = aside ? 'aside' : isPromptLabel(s.label) ? 'prompt' : isAnswerLabel(s.label) ? 'answer' : /הוכח/.test(s.label) ? 'proof' : /אזהר|שים לב|חשוב/.test(s.label) ? 'warn' : 'other';
  return '<div class="seg seg-'+role+(aside?' aside':'')+'"><span class="seg-label">'+renderInline(s.label)+':</span> <div class="md">'+body+'</div></div>';
}
/* index of the first "answer" segment (result / conclusion / solution), or -1 */
function answerIndex(segs){
  let ansAt = -1, sawPrompt=false;
  segs.forEach((s,i)=>{
    if(s.label===null || /^מקור/.test(s.label)) return;
    if(isPromptLabel(s.label)) sawPrompt=true;
    else if(ansAt<0 && sawPrompt && isAnswerLabel(s.label)) ansAt=i;
  });
  return ansAt;
}
/* wrap each key phrase (first occurrence, outside math) in invisible markers; restore() turns them into <strong class="key"> */
function mathSpans(l){ const s=[]; const re=/\$\$.+?\$\$|\$[^$\n]+?\$/g; let m; while((m=re.exec(l))) s.push([m.index, m.index+m[0].length]); return s; }
function emphLine(l, pending){
  for(let k=0;k<pending.length;k++){
    const ph=pending[k]; let from=0;
    while(true){
      const i=l.indexOf(ph, from); if(i<0) break;
      const e=i+ph.length, sp=mathSpans(l);
      if(!sp.some(([a,b])=> (a<i&&i<b) || (a<e&&e<b))){ l = l.slice(0,i)+'\uE010'+ph+'\uE011'+l.slice(e); pending.splice(k,1); k--; break; }
      from=i+1;
    }
  }
  return l;
}
function applyEmphasis(segs, ann){
  if(!ann || !ann.bold || !ann.bold.length) return;
  const pending = ann.bold.slice();
  for(const s of segs){
    if(s.label!==null && /^מקור/.test(s.label)) continue;
    if(s.rest) s.rest = emphLine(s.rest, pending);
    s.lines = s.lines.map(l=> pending.length ? emphLine(l, pending) : l);
  }
}
function renderItemBody(b){
  const segs = segmentize(b.lines);
  applyEmphasis(segs, b.dupOf ? null : b.ann);
  KEYF = (!b.dupOf && b.ann && b.ann.formula && b.ann.formula.length) ? new Set(b.ann.formula) : null;
  try{ return renderItemBodyInner(b, segs); } finally { KEYF = null; }
}
function renderItemBodyInner(b, segs){
  const ansAt = answerIndex(segs);
  if(ansAt<0) return {html: segs.map(renderSeg).join(''), hasAnswer:false};
  return { hasAnswer:true,
    html: segs.slice(0,ansAt).map(renderSeg).join('') +
      '<button class="reveal" type="button">הצג פתרון</button>' +
      '<div class="answer">'+segs.slice(ansAt).map(renderSeg).join('')+'</div>' };
}
function headingHtml(h, cls){
  // type word emphasised; wording kept exactly
  const m = /^(\S+)(\s[\s\S]*)?$/.exec(h);
  if(cls!=='note' && m) return '<span class="tw">'+esc(m[1])+'</span>'+renderInline(m[2]||'');
  return renderInline(h);
}
function sectionHeadingHtml(b){
  if(!b.num) return renderInline(b.heading);
  const i = b.heading.indexOf(b.num);
  const before = b.heading.slice(0,i), after = b.heading.slice(i+b.num.length);
  return (before? renderInline(before):'') + '<span class="num">'+b.num+'</span>' + (/^\s/.test(after)?' ':'') + renderInline(after.replace(/^\s+/,''));
}

