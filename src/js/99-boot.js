/* ================= boot ================= */
applyPrefs();
route();
if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ if(current.page==='units'){ const u=units[current.uid]; if(u&&u.el){ fitWide(u.el); drawPartition(u.parsed); } } });
