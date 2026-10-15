---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [ ] **1. The coverage board tells the truth for a tray order you edit**
  Becomes usable: The planner opens with the sample party and a starter tray order; − / + on any tray instantly redraws the coverage board, and a group can be short even when the totals look fine.
  Why now: This is the kernel (`scope.md > The Unique Kernel`). If the counting is wrong, nothing else matters, so it is built and tested first, with the page scaffold inside the same slice.
  PRD ref: `prd.md > Coverage board (the kernel)`, `prd.md > The Core Journey` (steps 1, 5, 6)
  Spec ref: `spec.md > Menu data (src/menu.js)`, `spec.md > Counting engine (src/engine.js)`, `spec.md > Planner view (src/planner.js)`, `spec.md > App shell (src/app.js, index.html, src/styles.css)`, `spec.md > File Structure`
  Build: Scaffold files per the spec, sample menu and party rules, `compatible`, `buildGroups`, max-flow `coverage`, planner with tray list (− / +, remove) and coverage board (need, on paper, actually theirs, short, feeds), base tokens and layout from `DESIGN.md`.
  Verify (mechanical): `npm test` passes engine tests for: no double counting (a tray shared by two groups that each look fine alone), restricted groups served first, impossible group, spare pieces; Playwright opens the page with no console errors and the board shows the sample party's rows.
  Learner check: Open the planner, remove the fruit skewers and watch the vegan rows: "enough on paper" stays, "actually theirs" drops, and the row turns short.
  Commit: `Coverage board with max-flow counting`

- [ ] **2. "Plan my trays" proposes an order and short groups get one-click fixes**
  Becomes usable: One button fills a reasonable order; any short group offers up to two fixes that close the gap when clicked; a menu picker adds any tray.
  Why now: It makes the kernel useful to a host who does not want to do platter maths, and depends only on slice 1.
  PRD ref: `prd.md > Planning trays`, `prd.md > Coverage board (the kernel)` (fixes, variety note)
  Spec ref: `spec.md > Counting engine (src/engine.js)` (`suggestFixes`, `autoPlan`), `spec.md > Planner view (src/planner.js)`
  Build: `autoPlan` greedy with variety pass, `suggestFixes`, fix buttons on short rows, variety note, menu picker, summary line ("Everyone is covered · 18 spare pieces · $412").
  Verify (mechanical): Engine tests: auto-plan covers the sample party and every restricted group has ≥2 dishes; auto-plan stops when covered; a fix closes the gap it targets. Playwright: click "Plan my trays", board all covered.
  Learner check: Press "Plan my trays", remove a tray until a row goes short, press the suggested fix.
  Commit: `Auto-plan and fixes`

- [ ] **3. The host describes their own party and it survives a refresh**
  Becomes usable: Party type, guest count and guest groups (count, diets, allergens) are editable with validation; the plan is in the address, so refresh or copying the address keeps it.
  Why now: Needed before sending; the link format defined here is reused by the ticket in slice 4.
  PRD ref: `prd.md > Party setup`, `prd.md > Guest groups`, `prd.md > States and Boundaries` (persistence, first use)
  Spec ref: `spec.md > Order link (src/order-link.js)`, `spec.md > Data Model`, `spec.md > Planner view (src/planner.js)`
  Build: Party controls, group editor (add / edit / remove), remainder group, validation messages, `encode` / `decode` with strict validation, `#plan=` mirroring and restore on load.
  Verify (mechanical): `order-link` tests (round trip, malformed codes return null, unknown tray ids rejected); Playwright: edit a group, reload, same state; restricted > total shows the error and disables planning.
  Learner check: Add a "1 · Vegan · Gluten-free" group, change guests to 40, reload the page, and see everything still there.
  Commit: `Party editor and plan in the address`

- [ ] **4. The caterer receives a kitchen ticket and prints table labels**
  Becomes usable: "Send to caterer" gives a link and an email; opening it shows the ticket; labels print one per tray; the ticket can reopen in the planner.
  Why now: Closes the core journey end to end (`prd.md > The Core Journey` steps 7–8).
  PRD ref: `prd.md > Sending the order`, `prd.md > Kitchen ticket`
  Spec ref: `spec.md > Kitchen ticket view (src/ticket.js)`, `spec.md > Order link (src/order-link.js)`, `spec.md > Important Failure Modes`
  Build: Send panel (host, date, note, short-group warning, copy link with fallback, mailto), ticket view, label print mode, "Open in planner", incomplete-link state.
  Verify (mechanical): Playwright: send → open link in a new page → ticket shows the same trays and groups; label print mode renders one label per tray (print-media screenshot); a truncated link shows the incomplete state.
  Learner check: Send the order, open the link, press "Print table labels" and look at the preview.
  Commit: `Kitchen ticket and table labels`

- [ ] **5. It looks and moves like TrayMath on a laptop and a phone**
  Becomes usable: Finished visual design from `DESIGN.md`, phone layout, motion, focus states, contrast checked.
  Why now: Behaviour is complete, so the polish pass cannot be undone by later feature work.
  PRD ref: `prd.md > Look and Feel`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Look and Feel`, `spec.md > App shell (src/app.js, index.html, src/styles.css)`
  Build: Screenshot-critique loop (desktop hero, scrolled, phone; at least two rounds), dot-drop motion with reduced-motion fallback, pinned summary on phone, contrast and anti-slop gates.
  Verify (mechanical): contrast gate passes; no horizontal scroll at 390 px; Playwright journey still passes; screenshots reviewed for each round.
  Learner check: Open it on a phone and run the whole journey once.
  Commit: `Visual design, phone layout and motion`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (plan, break, fix)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: 
Route and stops: 
Edit outcome: 
Reflection: 
Activity mode: 

## Revisions
