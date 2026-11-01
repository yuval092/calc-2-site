#!/usr/bin/env python3
"""
Build the study site into ONE self-contained HTML file: dist/index.html

    python3 build.py

Inputs (all relative to this folder):
  src/index.html        page shell (header, sidebar, placeholders)
  src/css/*.css         styles, concatenated in file-name order
  src/js/*.js           app code, concatenated in file-name order inside one closure
  vendor/               KaTeX (+ fonts, inlined as base64) and marked
  content/unit-N.md     one markdown file per unit (N = 1..7)
  content/formulas.md   optional  -> "דף נוסחאות" page
  content/cheatsheets.md optional -> "דפי סיכום" page
  content/exams/*.md     past exams with worked solutions -> "מבחנים" page (see README)
  content/calc1/unit-N.md  Calculus 1 reference units (shown as "אינפי 1 · חומר עזר", no ratings)
  content/annotations/unit-N.txt   importance levels, reasons, key phrases, key formulas
                                   (format in README; validated here, never changes the markdown)
No network access or npm install is needed.   Use --strict to fail on annotation problems.
"""
import base64, glob, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
read = lambda f: open(f, encoding='utf-8').read()

def vendor_css():
    css = read(P('vendor', 'katex.min.css'))
    def font(m):
        b = base64.b64encode(open(P('vendor', 'fonts', m.group(1) + '.woff2'), 'rb').read()).decode()
        return 'src:url(data:font/woff2;base64,%s) format("woff2")' % b
    css, n = re.subn(r'src:url\(fonts/([\w-]+)\.woff2\) format\("woff2"\),url\(fonts/[\w-]+\.woff\) format\("woff"\),url\(fonts/[\w-]+\.ttf\) format\("truetype"\)', font, css)
    assert n == 20, 'unexpected KaTeX css layout (%d fonts)' % n
    return css

def md_block(path, attr):
    md = read(path).replace('\r\n', '\n').replace('\r', '\n').lstrip('\ufeff')
    if '</script' in md.lower():
        sys.exit('ERROR: %s contains "</script" which would break the page' % path)
    return '<script type="text/markdown" %s>\n%s\n</script>' % (attr, md)

# ---------- annotations ----------
LABEL_RE = [re.compile(r'^\*\s+\*\*([^*]+?):\*\*\s*(.*)$'), re.compile(r'^\*\*([^*]+?):\*\*\s*$'), re.compile(r'^-\s+\*\*([^*]+?):\*\*\s*(.*)$')]
MATH_RE = re.compile(r'\$\$.+?\$\$|\$[^$\n]+?\$')
HR_RE = re.compile(r'^\s{0,3}([-*_])(\s*\1){2,}\s*$')

def unit_items(md, uid):
    """Mirror of the page parser: returns [(key, heading, body_lines)] for every item."""
    items, cur, title, occ = [], None, None, {}
    for line in md.replace('\r\n', '\n').split('\n'):
        m = re.match(r'^(#{1,6})\s+(.*?)\s*$', line)
        if m:
            level, text = len(m.group(1)), m.group(2); cur = None
            if level == 1 and title is None: title = text; continue
            if re.match(r'^חלק\s+\d+', text) or re.match(r'^תוכן\s+(ה)?עניינים', text): continue
            if re.match(r'^(?:סעיף\s+)?(\d+(?:\.\d+)+)(?=[\s:.]|$)', text) or level == 2: continue
            occ[text] = occ.get(text, 0) + 1
            cur = ('u%d|%s|%d' % (uid, text, occ[text]), text, [])
            items.append(cur); continue
        if cur is not None: cur[2].append(line)
    return items

def searchable(lines):
    """Text the page can emphasise: body lines, and only the text after a field label."""
    out = []
    dash_ok = any(re.match(r'^-\s+\*\*נוסח[^*]*:\*\*', l) for l in lines)
    for l in lines:
        if HR_RE.match(l): continue
        m = LABEL_RE[0].match(l) or LABEL_RE[2].match(l)
        if m and (m.re is LABEL_RE[0] or (dash_ok and re.search('נוסח|תיאור|תוצאה|מסקנה|פתרון', m.group(1)))): out.append(m.group(2)); continue
        if LABEL_RE[1].match(l): continue
        out.append(l)
    return out

def phrase_ok(lines, ph):
    for l in lines:
        start = 0
        while True:
            i = l.find(ph, start)
            if i < 0: break
            e = i + len(ph)
            spans = [(mm.start(), mm.end()) for mm in MATH_RE.finditer(l)]
            if not any(a < i < b or a < e < b for a, b in spans): return True
            start = i + 1
    return False

def load_annotations(uid, md, problems):
    path = P('content', 'annotations', 'unit-%d.txt' % uid)
    if not os.path.exists(path): return {}
    items = unit_items(md, uid)
    out, cur = {}, None
    for n, raw in enumerate(read(path).replace('\r\n', '\n').split('\n'), 1):
        line = raw.strip()
        if not line or line.startswith('#'): continue
        where = 'unit-%d.txt:%d' % (uid, n)
        if line.startswith('@'):
            parts = [p.strip() for p in line[1:].split('|')]
            key = parts[0]; mo = re.match(r'^(.*?)#(\d+)$', key)
            base, want = (mo.group(1).strip(), int(mo.group(2))) if mo else (key, 1)
            exact = [it for it in items if it[1] == base and it[0].endswith('|%d' % want)]
            pref = [it for it in items if (it[1].startswith(base + ' (') or it[1].startswith(base + ':')) and it[0].endswith('|%d' % want)]
            hits = exact or pref
            if len(hits) != 1:
                problems.append('%s: "%s" matches %d items' % (where, key, len(hits))); cur = None; continue
            lv = parts[1] if len(parts) > 1 else ''
            level = 3 if lv in ('★★★', '3') else 2 if lv in ('★★', '2') else 1 if lv in ('★', '1') else 0
            k = hits[0][0]
            if k in out: problems.append('%s: "%s" annotated twice' % (where, key))
            cur = out[k] = {'level': level, 'why': parts[2] if len(parts) > 2 else '', 'bold': [], 'formula': [], 'exam': [], '_lines': searchable(hits[0][2]), '_all': hits[0][2]}
            continue
        if cur is None: continue
        m = re.match(r'^(bold|formula|exam)\s*:\s*(.+)$', line)
        if not m: problems.append('%s: cannot read "%s"' % (where, line)); continue
        kind, val = m.group(1), m.group(2).strip()
        if kind == 'bold':
            if '**' in val or '\uE010' in val: problems.append('%s: bold phrase contains ** : %s' % (where, val)); continue
            if val.count('$') % 2: problems.append('%s: unbalanced $ in: %s' % (where, val)); continue
            if val[0] in ' -–:,.' or val[-1] in ' -–:,': problems.append('%s: bold phrase should start and end with a word or formula: %s' % (where, val)); continue
            if not phrase_ok(cur['_lines'], val): problems.append('%s: bold phrase not found (outside math): %s' % (where, val)); continue
        if kind == 'formula':
            disp = [mm.group(0)[2:-2].strip() for l in cur['_all'] for mm in re.finditer(r'\$\$(.+?)\$\$', l)]
            if val not in disp: problems.append('%s: formula not found as display math: %s' % (where, val)); continue
        cur[kind].append(val)
    for v in out.values(): v.pop('_lines'); v.pop('_all')
    seen, missing = set(), []
    for it in items:
        sig = (it[1], '\n'.join(l for l in it[2] if not HR_RE.match(l)).strip())
        if sig in seen: continue
        seen.add(sig)
        if it[0] not in out: missing.append(it[1])
    return out, len(items), missing

# ---------- exams ----------
REF_RE = re.compile(r'\[\[(c1-(?:\d+|\?)|[1-7]):([^\]|]+?)(?:\|([^\]]+))?\]\]')
EX_META = ('main', 'uses', 'type', 'topic', 'tags')

def ref_match(heading, label):
    return heading == label or heading.startswith(label + ' ') or heading.startswith(label + ':')

def load_exams(unit_md, ref_md, problems, report):
    """content/exams/*.md (files starting with "_" are notes). Validates every [[unit:label]] reference,
    writes content/exams/_pending-calc1.md (references into Calculus 1 units not added yet) and
    content/exams/_usage.md (how often each item is used in the solutions, for the ratings)."""
    files = sorted(f for f in glob.glob(P('content', 'exams', '*.md')) if not os.path.basename(f).startswith('_'))
    if not files: return []
    heads = {}
    for uid, md in unit_md.items(): heads[str(uid)] = [(it[0], it[1]) for it in unit_items(md, uid)]
    for n, md in ref_md.items(): heads['c1-%d' % n] = [(it[0], it[1]) for it in unit_items(md, 100 + n)]
    blocks, pending, usage, nq = [], [], {}, 0
    for f in files:
        eid = os.path.splitext(os.path.basename(f))[0]
        md = read(f).replace('\r\n', '\n')
        if '</script' in md.lower(): sys.exit('ERROR: %s contains "</script"' % f)
        blocks.append('<script type="text/markdown" data-exam="%s">\n%s\n</script>' % (eid, md))
        q, meta = None, {}
        def check(q, meta, where):
            for k in ('main', 'uses', 'type', 'topic'):
                if k not in meta: problems.append('%s: %s has no @%s' % (where, q, k))
        for n, line in enumerate(md.split('\n'), 1):
            m = re.match(r'^##\s+(.*?)\s*$', line)
            if m and not line.startswith('###'):
                if q: check(q, meta, eid)
                q, meta = m.group(1), {}; nq += 1; continue
            m = re.match(r'^@(\w+):\s*(.*)$', line)
            if m and q: meta[m.group(1)] = m.group(2)
            for rm in REF_RE.finditer(line):
                u, label = rm.group(1), rm.group(2).strip()
                where = '%s.md:%d' % (eid, n)
                if u not in heads:
                    if u.startswith('c1-'): pending.append((u, label, eid, q or '')); continue
                    problems.append('%s: unit %s not found for [[%s:%s]]' % (where, u, u, label)); continue
                om = re.match(r'^(.*?)#(\d+)$', label)
                base, occ = (om.group(1).strip(), int(om.group(2))) if om else (label, 0)
                hit = [k for k, h in heads[u] if ref_match(h, base)]
                if occ: hit = hit[occ-1:occ] if len(hit) >= occ else []
                if len(hit) != 1: problems.append('%s: [[%s:%s]] matches %d items' % (where, u, label, len(hit))); continue
                usage.setdefault(hit[0], set()).add('%s %s' % (eid, q))
        if q: check(q, meta, eid)
    # notes for later
    lines = ['# הפניות לאינפי 1 שעדיין אינן באתר (נוצר אוטומטית בבנייה)', '',
             'כשיחידות אלה יתווספו (content/calc1/unit-N.md), יש לבדוק שכל הפניה מצביעה על הפריט הנכון,',
             'להחליף הפניות מסוג c1-? במספר היחידה המדויק, ולהרחיב את ההסבר בפתרון אם צריך.', '']
    for u, label, eid, q in pending: lines.append('- `[[%s:%s]]`  ←  %s, %s' % (u, label, eid, q))
    open(P('content', 'exams', '_pending-calc1.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    ul = ['# שימוש בפריטים בפתרונות המבחנים (נוצר אוטומטית בבנייה)', '', 'מספר תתי-השאלות שבפתרונן הפריט מוזכר.', '']
    for k, v in sorted(usage.items(), key=lambda kv: (-len(kv[1]), kv[0])): ul.append('- %d  %s   (%s)' % (len(v), k, ', '.join(sorted(v))))
    open(P('content', 'exams', '_usage.md'), 'w', encoding='utf-8').write('\n'.join(ul) + '\n')
    report.append('  exams: %d file(s), %d sub-questions, %d items referenced, %d pending Calculus 1 references (see content/exams/_pending-calc1.md)' % (len(files), nq, len(usage), len(pending)))
    return blocks

def main():
    shell = read(P('src', 'index.html'))
    css = '\n'.join(read(f) for f in sorted(glob.glob(P('src', 'css', '*.css'))))
    js = '\n'.join('/* ---- %s ---- */\n%s' % (os.path.basename(f), read(f)) for f in sorted(glob.glob(P('src', 'js', '*.js'))))
    vjs = read(P('vendor', 'katex.min.js')) + '\n' + re.sub(r'//# sourceMappingURL=.*', '', read(P('vendor', 'marked.umd.js')))
    blocks = []
    units = sorted(glob.glob(P('content', 'unit-*.md')), key=lambda f: int(re.search(r'unit-(\d+)', f).group(1)))
    # Calculus 1 reference units: content/calc1/unit-N.md -> uid 100+N (no annotations, no widgets)
    ref_units = sorted(glob.glob(P('content', 'calc1', 'unit-*.md')), key=lambda f: int(re.search(r'unit-(\d+)', f).group(1)))
    problems, report = [], []
    for f in units:
        uid = int(re.search(r'unit-(\d+)', f).group(1))
        for n, line in enumerate(read(f).split('\n'), 1):
            if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', line): problems.append('unit-%d.md:%d: control character (a LaTeX escape like \\f, \\b, \\t may have been interpreted)' % (uid, n))
            if line.count('$') % 2: problems.append('unit-%d.md:%d: odd number of $ on the line' % (uid, n))
        blocks.append(md_block(f, 'data-unit="%d"' % uid))
        res = load_annotations(uid, read(f), problems)
        if res:
            ann, total, missing = res
            lv = [a['level'] for a in ann.values()]
            report.append('  unit %d: %d/%d items annotated, levels ★★★ %d, ★★ %d, ★ %d, key phrases %d, key formulas %d' % (
                uid, len(ann), total, lv.count(3), lv.count(2), lv.count(1), sum(len(a['bold']) for a in ann.values()), sum(len(a['formula']) for a in ann.values())))
            if missing: report.append('    not annotated: ' + ', '.join(missing[:12]) + (' …' if len(missing) > 12 else ''))
            blocks.append('<script type="application/json" data-ann="%d">%s</script>' % (uid, json.dumps(ann, ensure_ascii=False).replace('</', '<\\/')))
    unit_md = {int(re.search(r'unit-(\d+)', f).group(1)): read(f).replace('\r\n', '\n') for f in units}
    ref_md = {int(re.search(r'unit-(\d+)', f).group(1)): read(f).replace('\r\n', '\n') for f in ref_units}
    blocks.extend(load_exams(unit_md, ref_md, problems, report))
    for f in ref_units:
        n = int(re.search(r'unit-(\d+)', f).group(1))
        blocks.append(md_block(f, 'data-unit="%d" data-book="calc1"' % (100 + n)))
        for k, line in enumerate(read(f).split('\n'), 1):
            if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', line): problems.append('calc1/unit-%d.md:%d: control character' % (n, k))
            if line.count('$') % 2: problems.append('calc1/unit-%d.md:%d: odd number of $ on the line' % (n, k))
    if ref_units: report.append('  calc1 reference units: ' + ', '.join(re.search(r'unit-(\d+)', f).group(1) for f in ref_units))
    for key in ('formulas', 'cheatsheets'):
        if os.path.exists(P('content', key + '.md')):
            blocks.append(md_block(P('content', key + '.md'), 'data-page="%s"' % key))
    for s in (vjs, js):
        assert '</script' not in s.lower()
    out = (shell.replace('/*__VENDOR_CSS__*/', vendor_css())
                .replace('/*__APP_CSS__*/', css)
                .replace('<!--__CONTENT__-->', '\n'.join(blocks))
                .replace('//__VENDOR_JS__', vjs)
                .replace('//__APP_JS__', js))
    os.makedirs(P('dist'), exist_ok=True)
    open(P('dist', 'index.html'), 'w', encoding='utf-8').write(out)
    print('built dist/index.html  (%d KB, %d unit(s))' % (len(out.encode()) // 1024, len(units)))
    if report: print('annotations:'); print('\n'.join(report))
    if problems:
        print('annotation problems (%d):' % len(problems)); print('\n'.join('  ' + p for p in problems))
        if '--strict' in sys.argv: sys.exit(1)

if __name__ == '__main__':
    main()
