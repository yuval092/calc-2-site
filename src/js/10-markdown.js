/* ================= markdown + math ================= */
const md = new marked.Marked({ gfm:true, breaks:true });
md.use({ tokenizer:{ code(){ return undefined; } } }); // no indented code blocks — indentation is structure here
const kcache = new Map();
let KEYF = null; // key formulas of the item being rendered
function tex(src, display){
  const key = (display?'D':'I') + src;
  if(kcache.has(key)) return kcache.get(key);
  // keep Hebrew inside \text{} reading right-to-left (invisible RLM marks, wording unchanged)
  const t = src.replace(/\\text\{([^{}]*)\}/g, (m,c)=> HEB.test(c) ? '\\text{'+c.replace(/^(\s*)([\s\S]*?)(\s*)$/, '$1\u200F$2\u200F$3')+'}' : m);
  let out;
  const opts = { displayMode:display, throwOnError:true, strict:'ignore', output:'html' };
  try{ out = katex.renderToString(t, opts); }
  catch(e){
    /* known source slip: a prime after a power, e.g. "[x(x-3)]^2 '" -> render as "{[x(x-3)]^2}'" (display only; the text is unchanged) */
    const fixed = /Double superscript/.test(e.message) ? t.replace(/(\S+\^(?:\{[^{}]*\}|\\?\w))\s*'/g, "{$1}'") : null;
    try{ if(!fixed || fixed===t) throw e; out = katex.renderToString(fixed, opts); }
    catch(e2){ out = katex.renderToString(t, Object.assign({}, opts, {throwOnError:false})); }
  }
  kcache.set(key,out); return out;
}
function esc(s){ return s.replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function protect(src, store){
  return src
    .replace(/\$\$([\s\S]+?)\$\$/g, (_,t)=>{ store.push([t,true]); return '\uE002'+(store.length-1)+'\uE003'; })
    .replace(/\$([^$\n]+?)\$/g, (_,t)=>{ store.push([t,false]); return '\uE000'+(store.length-1)+'\uE001'; })
    /* theorem names like "משפט *6.5" / "משפט **5.16": the stars are part of the name, not emphasis */
    .replace(/((?:משפט|הגדרה|למה|טענה)\s)(\*{1,2})(?=\d)/g, (_,w,s)=> w+s.replace(/\*/g,'\\*'));
}
function restore(html, store){
  return html
    .replace(/(?:<br\s*\/?>\s*)?\uE002(\d+)\uE003(?:\s*<br\s*\/?>)?/g, (_,i)=> '<span class="mathwrap'+(KEYF && KEYF.has(store[+i][0].trim())?' keyf':'')+'">'+tex(store[+i][0], true)+'<button type="button" class="cpy" data-tex="'+esc(store[+i][0])+'" aria-label="העתקת קוד LaTeX" title="העתקת קוד ה-LaTeX"></button></span>')
    .replace(/\uE000(\d+)\uE001/g, (_,i)=> tex(store[+i][0], false))
    .replace(/\uE010/g, '<strong class="key">').replace(/\uE011/g, '</strong>');
}
function isHr(l){ return /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(l); }
function dedent(lines){
  let min = Infinity;
  for(const l of lines){ if(l.trim()) min = Math.min(min, l.match(/^ */)[0].length); }
  if(!isFinite(min) || !min) return lines;
  return lines.map(l=> l.slice(Math.min(min, l.match(/^ */)[0].length)));
}
/* a non-indented line right after a list item starts a new paragraph (instead of being glued to the bullet) */
function fixLazy(lines){
  const out=[]; let inList=false;
  for(const l of lines){
    if(!l.trim()){ inList=false; out.push(l); continue; }
    if(/^\s*([*+-]|\d+[.)])\s+/.test(l)){ inList=true; out.push(l); continue; }
    if(inList && !/^\s/.test(l)){ out.push(''); inList=false; }
    out.push(l);
  }
  return out;
}
function renderMd(lines){
  if(typeof lines === 'string') lines = lines.split('\n');
  lines = fixLazy(dedent(lines.filter(l=>!isHr(l))));
  const src = lines.join('\n').trim();
  if(!src) return '';
  const store=[];
  return restore(md.parse(protect(src, store)), store);
}
function renderInline(text){
  const store=[];
  return restore(md.parseInline(protect(text, store)), store);
}
function plain(s){ return s.replace(/\$\$?([^$]+)\$\$?/g,' $1 ').replace(/[*_#>`]/g,'').replace(/\s+/g,' ').trim(); }

