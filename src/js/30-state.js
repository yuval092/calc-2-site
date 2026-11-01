/* ================= state ================= */
const units = {};
document.querySelectorAll('script[type="text/markdown"][data-unit]').forEach(s=>{
  const uid = +s.dataset.unit; units[uid] = { raw:s.textContent, parsed:null, el:null };
});
/* annotations (importance, reasons, key phrases, key formulas), keyed by item key; built from content/annotations */
const ANNK = {};
document.querySelectorAll('script[type="application/json"][data-ann]').forEach(s=>{ try{ Object.assign(ANNK, JSON.parse(s.textContent)); }catch(e){ console.error('annotations', e); } });
const IMP = { 3:{label:'ליבה', stars:'★★★', long:'ליבה: חובה לשלוט'}, 2:{label:'חשוב', stars:'★★', long:'חשוב'}, 1:{label:'כדאי לדעת', stars:'★', long:'כדאי לדעת'} };
/* the user's own ratings (key -> 0..3), stored in this browser; they override content/annotations */
const impOver = LS.get('calc2:impOver', {});
const baseLevel = b => (b.ann ? b.ann.level : 0);
const levelOf = b => (Object.prototype.hasOwnProperty.call(impOver, b.key) ? impOver[b.key] : baseLevel(b));
const pageSrc = {};
document.querySelectorAll('script[type="text/markdown"][data-page]').forEach(s=>{ pageSrc[s.dataset.page] = s.textContent; });
function getUnit(uid){ const u=units[uid]; if(u && !u.parsed) u.parsed = parseUnit(u.raw, uid); return u; }

const learned = new Set(LS.get('calc2:learned', []));
const starred = new Set(LS.get('calc2:starred', []));
const prefs = Object.assign({ theme:null, fs:18, practice:false, unlearned:false, starredOnly:false, lh:'normal', width:'normal', font:'serif', side:'shown', emph:'marker', stars:'on' }, LS.get('calc2:prefs', {}));
const filters = { types:new Set(), q:'', minImp:0 };
let current = { page:'units', uid:1 };

function savePrefs(){ LS.set('calc2:prefs', prefs); }
function applyPrefs(){
  if(prefs.theme) document.documentElement.setAttribute('data-theme', prefs.theme); else document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.setProperty('--fs', prefs.fs+'px');
  const de = document.documentElement; de.dataset.lh = prefs.lh; de.dataset.width = prefs.width; de.dataset.font = prefs.font; de.dataset.side = prefs.side; de.dataset.emph = prefs.emph; de.dataset.stars = prefs.stars;
  document.body.classList.toggle('practice', !!prefs.practice);
  if(typeof current!=='undefined' && current.page==='units'){ const u=units[current.uid]; if(u && u.el) requestAnimationFrame(()=>fitWide(u.el)); }
}

