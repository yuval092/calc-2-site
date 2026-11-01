/* ================= app core: registry, events, toasts, dialogs =================
   Extension points for future features:
     App.registerPage(key, {title, glyph?, text?, render?(el)})  -> reachable at #/key
     App.on(event, fn) / App.emit(event, ...args)                -> events: 'unitShown'
     App.registerWidget(mode, mountFn)                           -> used by WIDGETS config
   window.Calc2 exposes the same API plus parsed data, for the console and add-ons. */
const App = {
  pages:{}, widgets:{}, handlers:{},
  registerPage(key, def){ this.pages[key]=def; },
  registerWidget(mode, fn){ this.widgets[mode]=fn; },
  on(ev, fn){ (this.handlers[ev]=this.handlers[ev]||[]).push(fn); },
  emit(ev, ...a){ (this.handlers[ev]||[]).forEach(fn=>{ try{ fn(...a); }catch(e){ console.error(e); } }); },
  modalOpen(){ return !!document.querySelector('.modal-back'); }
};
Object.keys(PAGES).forEach(k=>App.registerPage(k, PAGES[k]));

/* vertical-only scroll to an element. (scrollIntoView also scrolls overflow-x:hidden ancestors sideways,
   which on phones exposed the off-screen sidebar drawer.) Honours the element's scroll-margin-top. */
function scrollToEl(el, opts){
  if(!el) return; opts = opts||{};
  const sm = parseFloat(getComputedStyle(el).scrollMarginTop)||0;
  const hh = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'))||56;
  const off = (sm || hh+12) + (opts.extra||0);
  const r = el.getBoundingClientRect();
  if(opts.nearest && r.top >= off && r.bottom <= innerHeight) return;
  window.scrollTo({ top: Math.max(0, r.top + window.scrollY - off), behavior: opts.smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
}
function isTyping(){ const a=document.activeElement; return a && (/INPUT|SELECT|TEXTAREA/.test(a.tagName) || a.isContentEditable); }

let toastT=null;
function toast(msg, action){
  let t = document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); document.body.appendChild(t); }
  t.innerHTML = '<span>'+msg+'</span>';
  if(action){ const b=document.createElement('button'); b.type='button'; b.innerHTML=action.label; b.onclick=()=>{ t.classList.remove('show'); action.run(); }; t.appendChild(b); }
  const x=document.createElement('button'); x.type='button'; x.className='tx'; x.setAttribute('aria-label','סגירה'); x.textContent='×'; x.onclick=()=>t.classList.remove('show'); t.appendChild(x);
  t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'), action? 12000 : 2600);
}

async function copyText(text, okMsg){
  let ok=false;
  try{ if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(text); ok=true; } }catch(e){}
  if(!ok){ try{ const ta=document.createElement('textarea'); ta.value=text; ta.setAttribute('readonly',''); ta.style.cssText='position:fixed;opacity:0;top:0;left:0'; document.body.appendChild(ta); ta.select(); ok=document.execCommand('copy'); ta.remove(); }catch(e){} }
  toast(ok? (okMsg||'הועתק') : 'ההעתקה נחסמה בדפדפן. סמנו את הטקסט והעתיקו ידנית.');
  return ok;
}

/* downloads: claude.ai "downloads" capability when published, a normal file download elsewhere */
let dlNS; const dlReady = (window.claude && typeof window.claude.use==='function') ? window.claude.use('downloads').then(n=>dlNS=n, ()=>dlNS=null) : Promise.resolve(dlNS=null);
async function saveFile(filename, text){
  if(dlNS===undefined) await Promise.race([dlReady, new Promise(r=>setTimeout(r,1500))]);
  if(dlNS){
    try{ await dlNS.save({filename, data:text}); return 'saved'; }
    catch(e){ const c=e&&e.code; if(c==='declined') return 'declined'; if(c==='rate_limited') return 'busy'; }
  }
  try{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})); a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500); return 'saved'; }
  catch(e){ return 'failed'; }
}

/* modal dialog: returns {el, close} */
function openModal(title, bodyHtml, opts){
  opts = opts||{};
  closeModal();
  const back=document.createElement('div'); back.className='modal-back';
  back.innerHTML='<div class="modal '+(opts.cls||'')+'" role="dialog" aria-modal="true" aria-label="'+esc(title)+'">'+
    (opts.noHead?'':'<div class="modal-h"><h2>'+esc(title)+'</h2><button type="button" class="iconbtn mclose" aria-label="סגירה">×</button></div>')+
    '<div class="modal-b">'+bodyHtml+'</div></div>';
  document.body.appendChild(back); document.body.classList.add('modal-on');
  const prevFocus=document.activeElement;
  const close=()=>{ back.remove(); document.body.classList.remove('modal-on'); if(prevFocus && prevFocus.focus) prevFocus.focus(); if(opts.onClose) opts.onClose(); };
  back._close=close;
  back.addEventListener('mousedown', e=>{ if(e.target===back) close(); });
  const x=back.querySelector('.mclose'); if(x) x.onclick=close;
  back.addEventListener('keydown', e=>{
    if(e.key==='Escape'){ e.stopPropagation(); close(); }
    if(e.key==='Tab'){ const f=[...back.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(x=>!x.disabled && x.offsetParent); if(!f.length) return;
      if(e.shiftKey && document.activeElement===f[0]){ e.preventDefault(); f[f.length-1].focus(); } else if(!e.shiftKey && document.activeElement===f[f.length-1]){ e.preventDefault(); f[0].focus(); } }
  });
  setTimeout(()=>{ const f=back.querySelector(opts.focus||'input,button:not(.mclose),select'); if(f) f.focus(); },0);
  return {el:back.querySelector('.modal'), close};
}
function closeModal(){ const b=document.querySelector('.modal-back'); if(b) b._close(); }
