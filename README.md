# Calculus 2 study notebook (חשבון אינפיניטיסמלי 2)

A single-page study site built from your chapter markdown files. Hebrew + LaTeX are
rendered exactly as written (KaTeX), right-to-left, with no network needed except
the two Google web fonts (the page falls back to system fonts offline).

## Open it
Open `index.html` in any modern browser. It is one self-contained file
(all code, math fonts and chapter text inside). Progress marks ("למדתי", "לחזרה")
and display settings are stored in that browser's localStorage.

## Publishing (GitHub Pages)
The site is published from the `main` branch, root folder. GitHub Pages is already
configured that way; just push and the rebuilt `index.html` goes live at
<https://yuval092.github.io/calc-2-site/> (usually within a minute).

```
python3 build.py     # rebuild the site into ./index.html
git add index.html && git commit -m "Rebuild site" && git push
```

`index.html` at the repo root is the deployed page, so it must be committed.
`.nojekyll` tells Pages to serve the files as-is (no Jekyll processing).

## Folder layout
```
build.py            builds index.html (Python 3, no packages, no npm)
content/            your chapters: unit-1.md … unit-7.md (+ optional formulas.md, cheatsheets.md)
src/index.html      page shell: header, sidebar, placeholders
src/css/*.css       styles, concatenated in file-name order (palette.css = colours, widgets2.css = new widgets)
src/js/*.js         app code, concatenated in file-name order into one closure
                    60-widgets.js       Darboux/Riemann, improper integrals, Taylor
                    62-wkit.js          widget kit (WK.*) + unit 1-2 widgets
                    63-wseries.js       unit 5 widgets   64-wfunc.js  unit 6   65-w2d.js  unit 7
                    93-rating.js        your own ratings: menu, export / import / reset
content/annotations/unit-N.txt   importance levels, reasons, key phrases, key formulas
content/calc1/unit-N.md          Calculus 1 units, reference material only (see below)
vendor/             KaTeX 0.16 (+ fonts) and marked 18, inlined at build time
index.html          the built site (committed; served by GitHub Pages)
.nojekyll           disables Jekyll processing on GitHub Pages
```

## Add a chapter
1. Save it as `content/unit-8.md` (the number is the unit number; raise `UNIT_COUNT` in `src/js/00-config.js` above 7).
2. Run `python3 build.py`.
3. Open `index.html`. The unit appears in the sidebar, search, quick jump and export.

## Markdown conventions the site understands
* `# יחידה N: title` – unit title; the following lines are the unit intro.
* Headings that start with a section number (`1.4`, `1.4.1`, `סעיף 1.4:`) are sections;
  depth comes from the number, not from the number of `#`.
* An unnumbered `##` heading (e.g. `## שאלות להערכה עצמית`) is also a section.
* `חלק N…` headings are part dividers. In a unit with no numbered sections (units 6 and 7)
  the `חלק N` headings become the sections instead.
* `תוכן עניינים…` headings become collapsible tables of contents.
* Every other heading is an item. Its first word sets the type:
  הגדרה/הגדרת → definition, משפט → theorem, למה/טענה → lemma & claim,
  דוגמה/דוגמאות → example, שאלה → question, anything else → tables, rules & background.
* Inside an item, `* **label:** …` or a line `**label:**` starts a labelled part.
  In items that have a `- **נוסח השאלה:**` line (units 6-7), `- **label:**` lines whose label contains
  נוסח / תיאור / תוצאה / מסקנה / פתרון are labelled parts too.
* Labels are coloured by role: question text (amber), result / solution (green, inside a green panel),
  proof (violet), remarks (grey), warnings (rose).
* Theorem names like `משפט *6.5` or `משפט **5.16` are shown literally; the stars are not read as bold.
* Display formulas that are a little too wide for the screen are shrunk (to at most 72%); longer ones scroll
  sideways with a fade at the edge. A prime written after a power (`[x(x-3)]^2 '`, invalid LaTeX) is displayed
  as `{[x(x-3)]^2}'`; the text itself is not changed.
  `מקור בספר` shows as the page reference. A part whose label contains
  תוצאה / מסקנה / פתרון after a נוסח / תיאור part is the "answer": hidden in
  practice mode, and selectable in the export.
* `$…$` inline math, `$$…$$` display math (one line each), `> …` exam callouts.
* The build checks every chapter for control characters (a sign that `\f`, `\b`, `\t`, `\r` in LaTeX
  were turned into escape characters, as happened in the original unit 6 file) and for lines with an odd
  number of `$`. Use `python3 build.py --strict` to fail on any problem.
* An item that repeats an earlier one word for word is kept, collapsed, and marked as a copy.

## Importance and emphasis (content/annotations/unit-N.txt)

The markdown files are never edited. Importance levels, reasons, bold key phrases and key formulas live in a
separate file per unit, and the build checks every entry against the markdown.

```
@ משפט 1.33 | ★★ | המשפט היסודי: גזירת אינטגרל עם גבול משתנה
bold: תהי $f$ פונקציה רציפה בקטע $[a,b]$
formula: F_a'(x) = f(x)
exam: 2024א שאלה 3
```

- `@ heading | level | why`: the heading is the item heading, or the part before ` (` or `:`. Use the full heading
  when that prefix is shared, and `#2` for the second item with an identical heading (e.g. `שאלה 2#2` in unit 3).
  Level is `★★★` (ליבה: must be able to state, apply and usually prove; about 5% of items), `★★` (חשוב, about 10%),
  `★` (כדאי לדעת, about 11%) or empty. `3`, `2`, `1` also work. The reason is shown only for rated items.
  The current levels come from the course structure, not from exam data, and are meant to be revised.
- `bold:` an exact phrase from the item, outside math (it may contain whole `$...$` formulas). The first
  occurrence is shown bold with a marker highlight. Field labels and the «מקור בספר» line are skipped.
- `formula:` the exact content of a `$$...$$` in the item. It is framed as «נוסחה חשובה».
- `exam:` where the item appeared in an exam. Shown as a chip on the item and on the «חשוב למבחן» page.

`python3 build.py` prints coverage per unit and every problem (phrase not found, ambiguous heading, and so on);
`python3 build.py --strict` fails on any problem. The Markdown export stays verbatim unless «לסמן בקובץ כוכבי חשיבות»
is ticked, which adds the stars, the reason and `**bold**` around the key phrases.

### Changing ratings in the page
Click the stars next to any item heading (or the faint ☆ on unrated items) to pick ★★★ / ★★ / ★ / none, or to go
back to the default. Your ratings are stored in the browser (localStorage `calc2:impOver`), marked with a small dot,
and override the annotation files everywhere (filters, core panel, «חשוב למבחן», export, quick jump).
Settings (Aa) → «הדירוגים שלך» exports them as `@ heading | level | why` lines, ready to paste over the matching
`@` lines in `content/annotations/unit-N.txt` (the `bold:` / `formula:` lines below stay as they are), imports such
text back, or resets everything. Settings → «דירוג החשיבות» can hide the whole rating layer.

## Calculus 1 reference units (content/calc1/unit-N.md)
The course is Calculus 2; Calculus 1 is included only as reference material for solutions and proofs.
Each `content/calc1/unit-N.md` is shown in a collapsed sidebar group «אינפי 1 · חומר עזר», rendered verbatim
with the same rules as the course units, but with no ratings, progress tracking or visualizations, and it is left
out of «חשוב למבחן» and the export. Quick jump finds its items (ranked after Calculus 2). Internally a Calculus 1
unit N has uid 100+N, so its items have keys like `u107|הגדרה 7.7: …|1` and links like `#/u107/u107-i-12`.

## Past exams (content/exams/*.md)
One file per exam, e.g. `content/exams/2024b-a1.md`. Files whose name starts with `_` are notes (not shown).
```
# בחינה 2024ב · מועד א1
@code: 20475 / 81
@term: 2024ב
@session: מועד א1
@order: 20241                      sort key (chronological)
@instructions: …

## שאלה 1ב                          one sub-question
@main: 5                           the unit the sub-question is mainly about (horizontal practice filters on this)
@uses: 5, c1-3, c1-6               every unit the solution uses; c1-N = Calculus 1 unit N, c1-? = unit not known yet
@type: סיווג התכנסות
@topic: one line
@tags: tag; tag; tag

### נוסח
### פתרון                           the official solution, expanded
### הערות                           lines starting (מהפתרון הרשמי) or (הערת האתר)
```
References inside the text: `[[5:משפט 5.22]]` links to that item (heading exactly, or followed by a space or `:`);
`[[3:שאלה 5#1]]` picks the first of several items with the same heading; `[[c1-8:משפט 8.10]]` is Calculus 1.
A reference into a Calculus 1 unit that is not on the site yet shows as «טרם נוסף», and the build lists all of them in
`content/exams/_pending-calc1.md` (regenerated on every build) so they can be fixed when those units arrive.
The build also writes `content/exams/_usage.md`: how many sub-questions use each item, the input for the ratings.
Every item used in a solution shows «שימש בפתרון מבחן» links on its unit page, and each unit's header links to its
exam exercises. The «מבחנים» page has a map (exam × question, coloured by main unit), a by-unit view for horizontal
practice, filters (main unit, uses unit, exam, type, tag/topic search) and practice mode.

### Ratings and exams
Ratings were revised from `_usage.md` after all 17 exams (178 sub-questions): an item that does real work in a
solution is at least ★; items that carry many solutions moved up (e.g. monotonicity of the integral 1.26 and the
comparison tests 3.16 / 5.14 → ★★★, 17 / 17 / 13 uses); ★★ items that no exam used moved down to ★. Foundational
definitions that every question in their topic uses implicitly (1.7, 6.1, 7.39) keep ★★ even without explicit
citations. Final distribution: ★★★ 39, ★★ 56, ★ 110 of 693 items. Re-run the build after adding exams and compare
`_usage.md` with the levels to revise again.

## Pages for formulas / cheat sheets
Create `content/formulas.md`, `content/cheatsheets.md` or `content/exams.md` and rebuild; the tabs
"דף נוסחאות" / "דפי סיכום" / "מבחנים" render them with the same Hebrew + LaTeX renderer.

## Extending (for future features)
* New page: in a `src/js/9x-*.js` file call
  `App.registerPage('flashcards', {title:'כרטיסיות', render(el){ … }})` → reachable at `#/flashcards`
  (add a link in `src/index.html`).
* New interactive visual: `App.registerWidget('mymode', (el, cfg)=>{ … })`, then attach it
  to an item in `WIDGETS` in `src/js/00-config.js` (`{after:'משפט 2.6', mode:'mymode', …}`).
  `after` matches the heading exactly or followed by a space or `:` (so `דוגמה 6.1` does not match `דוגמה 6.12`).
  `WK.mount(el, cfg, controlsHtml, state, draw)` in 62-wkit.js gives the standard layout (plot, controls,
  readout) and redraws on every input; `WK.frame`, `WK.axes`, `WK.cells`, `WK.range`, `WK.select` help build it.
* Unit colours: `--u1 … --u7` in `src/css/palette.css`; the current unit's hue is `--uc`.
* Events: `App.on('unitShown', u => …)`.
* Data: `window.Calc2.getUnit(n).parsed.blocks` gives every section and item with
  its heading, type, raw markdown lines and section; `Calc2.exportMarkdown(...)`
  produces the verbatim export.

## Keyboard
`/` search · `Ctrl+K` quick jump · `J`/`K` next/previous item · `M` learned ·
`B` mark for review · `S` show solution (practice mode) · `P` practice mode ·
`E` export · `?` all shortcuts. Works with a Hebrew keyboard layout too.
