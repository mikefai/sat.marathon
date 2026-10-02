# SAT-24H-Marathon — last-day sprint to 1300+

Zero-dependency, offline-first cram tool. Double-click `index.html` — no `npm install`, no server required.

Merged from your existing work:
- `../DSAT-Math-2026-Guide/src/modules.js` → math type structure + Desmos dual-solve habit
- `../DSAT-2026-RW-Mock/src/data/questions.json` → RW skill taxonomy (transfer rules → recognition cues)
- `../SATDesmos/` → 12 Desmos moves condensed into `content/desmos.js`
- `sat-practice-test-4` … `11-digital.pdf` in this folder → pacing + difficulty reference (not copied verbatim)

## Run

```powershell
# Option A (easiest): double-click index.html
# Option B (recommended for drills): serve locally so timers/keys behave like Bluebook
python -m http.server 8000
# then open http://127.0.0.1:8000/SAT-24H-Marathon/
```

Progress (answers, flags, misses, flashcard state) stays in this browser under `sat-marathon-v1`. Reset button in header clears it.

## What's inside

| Tab | What it does | Source |
|---|---|---|
| Sprint Plan | Hour-by-hour 24h schedule, 1300+ score math | `content/schedule.md` |
| Types | 12 RW + 14 Math unchanging structures: stem pattern, 3-sec cue, steps, wrong-answer shape | `content/rw-types.js`, `content/math-types.js` |
| Drills | 27 seeded original questions, filter by section/type/Hard-only, timer, flag, instant dual explanation | `content/questions-rw.js`, `content/questions-math.js` |
| Flashcards | 39 flip cards, shuffle + miss-only | `content/flashcards.js` |
| Strategies | Expert-tested habits for RW, Math, pacing, and study method | built in `index.html` |

| Formulas | Printable 1-page Math + RW rules | `content/formulas.md` |
| Desmos | 18 copy-paste moves | `content/desmos.js` |
| Traps | 30 classic baits with 5-sec checks | `content/traps.js` |
| Mini-Mock | 20Q / 35-min sampler drawn from bank, 1300-pace check | built in `app.js` |

| Exam Day | Bluebook + pacing checklist | built in `index.html` |

## Add more questions (the marathon part)

All questions are original, DSAT-style — not verbatim College Board copies. To grow the bank:

1. Copy any entry in `content/questions-rw.js` / `questions-math.js`.
2. Keep the schema: `id, section, type, difficulty, stem, options[4] or null, answer, trap, why, desmos, secs`.
3. Run `node scripts/validate.mjs` before sharing with friends.

Outside sources to mine for *structure* (rewrite stems in your own words):
- College Board Question Bank + Bluebook practice tests 4–11 (you have the PDFs one folder up)
- Khan Academy DSAT skill breakdown (topic frequency, not wording)

## Score math for 1300+

Digital SAT = RW 200–800 + Math 200–800. 1300 ≈ 650 + 650.
That requires: (a) unlocking Hard Module 2 in each section, (b) ~85% on high-frequency types. The app marks those types with `highYield: true` — drill those first, Hard-only, timed.

Independent study material. Not affiliated with College Board. "SAT", "Bluebook", "Desmos" used descriptively.
