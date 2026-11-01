/* ================= configuration ================= */
const UNIT_COUNT = 7;
/* Calculus 1 reference book: its units are stored with uid 100+N (content/calc1/unit-N.md) */
const REF_BASE = 100, REF_BOOK = 'אינפי 1';
const isRef = uid => uid > REF_BASE;
const unitName = uid => isRef(uid) ? REF_BOOK+' · יחידה '+(uid-REF_BASE) : 'יחידה '+uid;
const PAGES = { formulas:{title:'דף נוסחאות', glyph:'∫', text:'כאן יופיעו הנוסחאות של כל היחידות, מסודרות לפי יחידה וסעיף. הדף יתמלא ברגע שקובץ הנוסחאות יתווסף.'},
                exams:{title:'מבחנים', glyph:'✎', text:'כאן יופיעו מבחנים קודמים עם פתרונות מלאים, לעתים בכמה דרכים, והפניות לפריטים ביחידות. כל שאלת מבחן תסמן גם אילו פריטים הופיעו בה.'},
                cheatsheets:{title:'דפי סיכום', glyph:'Σ', text:'כאן יופיעו דפי הסיכום לחזרה מהירה לפני המבחן. הדף יתמלא ברגע שקובצי הסיכום יתווספו.'} };
/* interactive visualisations attached to specific items: unit -> list */
const WIDGETS = {
  1: [
    { after:'רקע היסטורי', mode:'darboux', fn:'sq', n:5, title:'המחשה: סכום עליון וסכום תחתון' },
    { after:'משפט 1.29', mode:'mvt', fn:'sin', title:'המחשה: משפט הערך הממוצע האינטגרלי' },
    { after:'משפט 1.33', mode:'ftc', fn:'cos', title:'המחשה: הפונקציה הצוברת F(x) והמשיק שלה' },
    { after:'הגדרה 1.35', mode:'riemann', fn:'sin', n:8, xi:'rand', title:'המחשה: סכום רימן בין הסכום התחתון לעליון' }
  ],
  2: [
    { after:'שאלה 43', mode:'oddsym', title:'המחשה: פונקציה זוגית ואי-זוגית בקטע סימטרי' }
  ],
  3: [
    { after:'למה 3.2', mode:'improper', kind:2, alpha:0.5, title:'המחשה: התכנסות אינטגרל מוכלל מסוג שני' },
    { after:'למה 3.12', mode:'improper', kind:1, alpha:2, title:'המחשה: התכנסות אינטגרל מוכלל מסוג ראשון' }
  ],
  4: [
    { after:'טבלת פולינומי מקלורן', mode:'taylor', fn:'sin', n:3, title:'המחשה: פולינומי מקלורן מתקרבים לפונקציה' }
  ],
  5: [
    { after:'הגדרה 5.2', mode:'series', title:'המחשה: סכומים חלקיים של טורים מתכנסים ומתבדרים' },
    { after:'משפט 5.19', mode:'inttest', title:'המחשה: מבחן האינטגרל, המלבנים חוסמים את השטח' },
    { after:'משפט 5.20', mode:'leibniz', title:'המחשה: טור לייבניץ וחסם השגיאה' },
    { after:'משפט 5.27', mode:'rearrange', title:'המחשה: שינוי סדר האיברים משנה את הסכום' }
  ],
  6: [
    { after:'למה 6.3', mode:'uniform', seq:'xn', title:'המחשה: התכנסות נקודתית לעומת התכנסות במידה שווה' },
    { after:'משפט 6.10', mode:'powser', fn:'ln', title:'המחשה: טור חזקות ותחום ההתכנסות שלו' },
    { after:'דוגמה 6.12', mode:'uniform', seq:'tent', title:'המחשה: דוגמת האוהל' }
  ],
  7: [
    { after:'טענה 7.12', mode:'vectors', title:'המחשה: וקטורים, מכפלה סקלרית וקושי-שוורץ' },
    { after:'הגדרה 7.40', mode:'paths', title:'המחשה: גבול לאורך מסלולים שונים' },
    { after:'משפט 7.69', mode:'contour', fn:'ell', focus:'grad', title:'המחשה: הגרדיאנט ניצב לקווי הגובה' },
    { after:'משפט 7.72', mode:'contour', fn:'q48', focus:'crit', title:'המחשה: נקודות קריטיות ומבחן ההסיאן' }
  ]
};
/* does a widget's "after" match this heading (exact, or followed by a space, ":" or " (") */
const widgetAfter = (h, a) => h===a || h.startsWith(a+' ') || h.startsWith(a+':');
const TYPES = {
  definition:{label:'הגדרות', words:['הגדרה','הגדרות','הגדרת','סימון']},
  theorem:{label:'משפטים', words:['משפט','משפטים']},
  lemma:{label:'למות וטענות', words:['למה','למות','טענה','טענות']},
  example:{label:'דוגמאות', words:['דוגמה','דוגמאות','דוגמא']},
  question:{label:'שאלות', words:['שאלה','שאלות']},
  note:{label:'טבלאות, כללים ורקע', words:[]}
};
const TYPE_ORDER = ['definition','theorem','lemma','example','question','note'];
const HEB = /[\u0590-\u05FF]/;
const LS = {
  get(k,d){ try{ const v = localStorage.getItem(k); return v==null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

