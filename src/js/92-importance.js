/* ================= "חשוב למבחן" page =================
   Levels and reasons come from content/annotations/unit-N.txt (see README).
   When exams are added, each annotation can list "exam:" lines; they show as chips here and on the item. */
App.registerPage('important', { title:'חשוב למבחן', render(el){
  const st = Object.assign({ lvl:3, uid:0 }, LS.get('calc2:impPage', {}));
  const us = availableUnits();
  function draw(){
    LS.set('calc2:impPage', st);
    let body='', total=0, done=0;
    for(const uid of us){
      if(st.uid && st.uid!==uid) continue;
      const p = getUnit(uid).parsed;
      const its = p.blocks.filter(b=>b.kind==='item' && !b.dupOf && (b.imp||0) >= st.lvl);
      if(!its.length) continue;
      total += its.length; done += its.filter(b=>learned.has(b.key)).length;
      let rows='', lastSec=null;
      for(const b of its){
        const s = b.sec1 || b.sec;
        if(s && s!==lastSec){ rows += '<div class="ip-sec">'+renderInline(s.heading.replace(/^סעיף\s+/,''))+'</div>'; lastSec=s; }
        rows += '<a class="ip-row'+(learned.has(b.key)?' done':'')+'" href="#/u'+uid+'/'+b.id+'">'+
          '<b class="st ip-st">'+IMP[b.imp].stars+'</b><i class="tdot" style="--c:var(--'+cssVar(b.type)+')"></i>'+
          '<span class="ip-main"><span class="ip-h">'+renderInline(b.heading)+'</span>'+
          (b.ann && b.ann.why ? '<span class="ip-why">'+renderInline(b.ann.why)+'</span>' : '')+
          ((examBacklinks()[b.key]||[]).length ? '<span class="ip-ex">שימש בפתרון של '+examBacklinks()[b.key].length+' סעיפי מבחן: '+examBacklinks()[b.key].map(q=>esc(q.label)).join(', ')+'</span>' : '')+
          '</span>'+(learned.has(b.key)?'<span class="ip-done">נלמד</span>':'')+'</a>';
      }
      body += '<section class="ip-unit"><h2>'+renderInline(p.title)+'</h2>'+rows+'</section>';
    }
    const seg = (k, opts)=> '<div class="segc" role="group">'+opts.map(([v,l])=>'<button type="button" data-k="'+k+'" data-v="'+v+'" aria-pressed="'+(st[k]===v)+'">'+l+'</button>').join('')+'</div>';
    el.innerHTML = '<div class="col ip">'+
      '<h1>חשוב למבחן</h1>'+
      '<p class="ip-lead">שלוש דרגות, בכוונה מצומצמות: <b>★★★ ליבה</b>, כחמישה אחוזים מהפריטים: הגדרות ומשפטים שחייבים לדעת לנסח, להפעיל ולרוב גם להוכיח. <b>★★ חשוב</b>, כעשרה אחוזים: כלים מרכזיים ודוגמאות נגדיות חשובות. <b>★ כדאי לדעת</b>: שימושי, כולל תרגילים מייצגים. כל השאר ללא דירוג. הדירוג עודכן לפי הפתרונות של 17 מבחני עבר (178 סעיפים): פריט שנשען עליו בפתרונות רבים עלה בדרגה, ופריט מדורג שלא שימש באף מבחן ירד. ליד כל פריט מופיע «שימש בפתרון של N סעיפי מבחן». אפשר לשנות כל דירוג בלחיצה על הכוכבים שליד הפריט, והשינויים נשמרים בדפדפן (ראו הגדרות תצוגה ← דירוג החשיבות).</p>'+
      '<div class="ip-ctrl">'+seg('lvl',[[3,'★★★ ליבה'],[2,'★★ ומעלה'],[1,'★ ומעלה']])+
        '<select id="ipU" aria-label="יחידה"><option value="0">כל היחידות</option>'+us.map(u=>'<option value="'+u+'"'+(st.uid===u?' selected':'')+'>יחידה '+u+'</option>').join('')+'</select>'+
        '<span class="ip-count">'+total+' פריטים, מתוכם '+done+' סומנו כנלמדו</span>'+
        '<button type="button" class="btn" id="ipExport">ייצוא הרשימה ל-Markdown</button></div>'+
      (body || '<p class="ip-lead">אין עדיין פריטים מסומנים ברמה הזו.</p>')+'</div>';
  }
  el.addEventListener('click', e=>{
    const b=e.target.closest('[data-k]'); if(b){ st[b.dataset.k] = +b.dataset.v; draw(); return; }
    if(e.target.closest('#ipExport')) openExport({ minImp: st.lvl, marks:true, allUnits: !st.uid });
  });
  el.addEventListener('change', e=>{ if(e.target.id==='ipU'){ st.uid = +e.target.value; draw(); } });
  draw();
}});
