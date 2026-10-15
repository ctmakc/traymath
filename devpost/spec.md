---
doc: spec
status: approved
---

# TrayMath — Technical Spec

## How This Works, In Plain Language
TrayMath is one web page that runs entirely in the browser. It has three pieces:

1. **The menu file**: the demo caterer's trays (name, pieces per tray, price, which diets each suits, which allergens each contains) and the party rules (pieces per guest for each kind of party).
2. **The counting engine**: a small piece of code with no screen of its own. Given the guests and a tray order, it hands out every tray's pieces to the guest groups, the most restricted groups first, so a piece given to one group can never be counted for another. It reports, per group, what they need, what is on the table that they could eat, what is actually theirs, and what is missing. It also proposes an order ("Plan my trays") and fixes for short groups.
3. **The two screens**: the planner and the kitchen ticket. They read the menu, ask the engine, and draw the result.

The whole plan is written into the page address after the `#`. That is how a refresh keeps the plan and how "Send to caterer" works: the link *is* the order. No server, no database, no account.

Why this shape: the hard part is exact counting, which fits in a small tested module. Everything else is display. A server would add hosting, cost and privacy questions without helping prove the kernel.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. Host opens the page → `src/app.js` reads the address; no order in it → shows the planner with the sample party from `src/menu.js`.
2. Host edits party type, guest count, groups → `src/planner.js` updates its state object, writes it to the address (`src/order-link.js`), and asks `src/engine.js` for coverage.
3. Host presses "Plan my trays" → `engine.autoPlan(menu, party)` returns tray quantities → planner redraws the tray list and board.
4. Host presses − / + or removes a tray → state changes → `engine.coverage()` runs again (a few milliseconds) → board redraws; short groups get `engine.suggestFixes()` buttons.
5. Host presses "Send to caterer" → `order-link.encode(state)` builds `…/#order=<code>` → copy-to-clipboard or a `mailto:` link.
6. Caterer opens that link → `src/app.js` sees `#order=` → `order-link.decode()` → `src/ticket.js` asks the engine for the same coverage and draws the ticket; "Print table labels" switches a print mode class and calls `window.print()`.

## Stack
- **Plain HTML, CSS and JavaScript modules**, no framework, no build step. Recommended for a one-page tool with two views; the learner accepted it because it opens anywhere and deploys as static files. Tradeoff: we write a little more DOM code by hand. Docs: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- **Node.js 20 built-in test runner** (`node --test`) for the engine and link code — no test library to install. Docs: https://nodejs.org/api/test.html
- **Playwright** (already installed on the build machine) only for screenshots, the browser journey check and the demo video recording — not part of the app. Docs: https://playwright.dev/docs/screenshots
- **Font**: Recursive (Google Fonts, variable: weight, casual and mono axes) — one family for labels, interface and aligned numbers. Docs: https://www.recursive.design/

## Where It Runs and How Someone Tries It
- Runtime: any modern browser (desktop or phone). No keys, no environment variables.
- Local: `npx serve .` (or `python3 -m http.server 8080`) in the project folder, open `http://localhost:8080/`. ES modules need a local server, not `file://`.
- Tests: `npm test` (runs `node --test tests/`).
- Live demo (optional, chosen for judges to click): Cloudflare Pages free plan, project `traymath`, deployed as static files with `wrangler pages deploy . --project-name traymath` → `https://traymath.pages.dev`.
- Demo recording: open the live URL (or local), follow `scope.md > What "Working" Looks Like`.

## Look and Feel
Carried from `prd.md > Look and Feel`; full locked direction in `DESIGN.md` (root).
- Dark, cool "sheet pan steel" background; panels a step lighter; never pure black or white.
- Recursive: casual axis on (`CASL 1`) for the hand-lettered feel of buffet labels in headings and tray names; linear for interface text; `MONO 1` with tabular figures for every number.
- One flat accent for the main action; covered and short have their own colours; diet markers are small flag-shaped tags with a short code (VG, V, H, GF…), identical on planner, ticket and labels.
- Signature: pieces as dots — each group's need is a row of dots that fill in from the trays that feed it, so double counting is visible.
- Dense and calm; copy plain and specific.

## Components

### Menu data (`src/menu.js`)
Exports `CATERER` (name, email, currency, sample-data notice), `PARTY_TYPES` (id, label, rule text, `piecesPerGuest`), `DIETS`, `ALLERGENS` (id, label, short code) and `MENU` (12 trays). Vegan implies vegetarian when compatibility is checked. Sample data, labelled as such in the UI.
PRD ref: `prd.md > Product Decisions`, `prd.md > Party setup`.

### Counting engine (`src/engine.js`)
Pure functions, no DOM:
- `compatible(item, group)` — the group's diets are all satisfied by the item (vegan ⇒ vegetarian) and the item contains none of the group's avoided allergens. The remainder group "No restrictions" accepts everything.
- `buildGroups(party)` — restricted groups plus the remainder; validates counts.
- `coverage(menu, party, order)` — a max-flow allocation: source → trays (capacity = quantity × pieces) → compatible groups → sink (capacity = group count × pieces per guest). Groups are connected to the sink one at a time, most constrained first (fewest compatible pieces on the table), with augmenting paths after each; flow on a group's sink edge never decreases once set, so restricted groups keep priority. Returns per group: `need`, `onTable` (compatible pieces in the order, the naive number), `covered` (pieces actually allocated), `short`, `feeds` (tray → pieces), `dishes` (distinct compatible trays in the order), `impossible` (no compatible item on the whole menu); plus totals, spare pieces and price.
- `suggestFixes(menu, party, order, groupId)` — tries adding 1–5 trays of each compatible item, keeps the smallest quantity that closes the gap (or the best partial), returns the top two by gap closed, then price.
- `autoPlan(menu, party)` — greedy from an empty order: repeatedly add the single tray with the best weighted shortfall reduction per dollar (restricted shortfall weighted ×3, repeats of the same tray discounted, sweet trays capped at `SWEET_SHARE` of the pieces needed), until no group is short or no tray helps; then a variety pass gives each restricted group a second compatible dish when the menu has one; then a trim pass removes any tray the plan no longer needs. Deterministic.
PRD ref: `prd.md > Coverage board (the kernel)`, `prd.md > Planning trays`.

### Order link (`src/order-link.js`)
`encode(state)` → compact JSON (`v`, party type, guests, groups as `[count, diets, avoid]`, trays as `[id, qty]`, optional host, date, note) → base64url. `decode(code)` → validated state or `null` on anything malformed (unknown version, unknown tray ids, bad numbers). Both views use it; the planner mirrors its state into `#plan=`, sent links use `#order=`.
PRD ref: `prd.md > Sending the order`, `prd.md > States and Boundaries` (persistence).

### Planner view (`src/planner.js`)
Renders party setup, group editor, coverage board, tray list, menu picker and send panel from one state object; every change re-renders the affected parts and rewrites `#plan=`. Validation messages inline. Clipboard via `navigator.clipboard.writeText` with a selectable-text fallback.
PRD ref: `prd.md > Party setup`, `prd.md > Guest groups`, `prd.md > Planning trays`, `prd.md > Coverage board (the kernel)`, `prd.md > Sending the order`.

### Kitchen ticket view (`src/ticket.js`)
Renders the decoded order and its coverage as an order sheet; "Print table labels" adds `print-labels` on `<body>` and prints; "Open in planner" rewrites the hash to `#plan=` with the same code. Malformed code → the "incomplete link" state.
PRD ref: `prd.md > Kitchen ticket`.

### App shell (`src/app.js`, `index.html`, `src/styles.css`)
`index.html` holds the static frame and fonts; `app.js` routes on `hashchange` between planner and ticket; `styles.css` holds tokens, both layouts, the phone breakpoint, reduced-motion rules and print styles for ticket and labels.
PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`.

## Data Model
```js
state = {
  v: 1,
  partyType: 'cocktail',            // PARTY_TYPES id
  guests: 30,                       // total, 1–300
  groups: [ { count: 2, diets: ['vegan'], avoid: [] }, … ],   // restricted only
  order:  { 'hummus-cups': 1, 'fruit-skewers': 1, … },        // tray id → quantity
  host: '', date: '', note: ''      // optional, for the ticket
}
```
Lives in memory and in the address (`#plan=` while planning, `#order=` when sent). Leaving and coming back with the same address restores it; a fresh address shows the sample party.

## File Structure
```
traymath/
├── index.html            # page frame, fonts, mount points for both views
├── src/
│   ├── app.js            # routing between planner and kitchen ticket
│   ├── menu.js           # demo caterer: trays, party rules, diet/allergen labels (sample data)
│   ├── engine.js         # counting engine: compatibility, max-flow coverage, fixes, auto-plan
│   ├── order-link.js     # state ⇄ URL code
│   ├── planner.js        # planner view
│   ├── ticket.js         # send panel, kitchen ticket + table labels view
│   ├── view-helpers.js   # escaping, money, diet pennants, plates
│   └── styles.css        # design tokens, layouts, print styles
├── tests/
│   ├── engine.test.js    # kernel tests (no double counting, priorities, fixes, auto-plan)
│   ├── order-link.test.js
│   └── journey.mjs       # Playwright: runs the core journey, saves screenshots
├── devpost/              # scope, prd, spec, checklist, app map (learner profile is git-ignored)
├── DESIGN.md             # locked visual direction
├── package.json          # "test" script only, no dependencies
├── README.md
└── LICENSE               # MIT
```

## External Services and Dependencies
- **Google Fonts** — `https://fonts.googleapis.com/css2?family=Recursive:slnt,wght,CASL,CRSV,MONO@-15..0,300..1000,0..1,0..1,0..1&display=swap`. No key, free. If blocked, the stack falls back to system fonts; layout still works.
- **Cloudflare Pages** (optional live demo) — static upload with Wrangler; free plan, no functions, no secrets in the repo. Docs: https://developers.cloudflare.com/pages/
- No APIs, no analytics.

## Important Failure Modes
- **Malformed or truncated link** → "This order link is incomplete" with "Start a new plan", never a crash.
- **Clipboard blocked** (permissions, non-HTTPS) → the link appears in a selected text field with "Copy it from here".
- **Restricted guests exceed total** → inline error, board shows the last valid result greyed, "Plan my trays" disabled.

## What Was Simplified and Why
- **Fixed sample menu** instead of a caterer editor — proves the kernel without accounts. The fuller version needs caterer sign-in and storage.
- **Link as the order** instead of an order inbox — no server. The fuller version would post orders to the caterer's email or Telegram with spam protection.
- **Greedy auto-plan** instead of a full cost optimiser — fast and explainable; the max-flow check guarantees whatever is shown is correct, even if the proposal is not the cheapest possible. A fuller version would use integer programming for the cheapest covering order.
- **Pieces per guest by party type** instead of item-by-item portion rules — one number the host understands.

## Decisions and Open Issues
- Plain JS without a framework — recommended by the agent, accepted by the learner: no build step, opens anywhere.
- No backend; link carries the order — learner's choice (`prd.md > Product Decisions`).
- Most-constrained-first allocation — implementation detail derived from the learner's rule that restricted guests must never be the ones who go without.
- Learner uncertainty discussed: *"How can I know the plan was followed without reading the code?"* (`learner-profile.md > Desired Learning Outcome`). Clarified by turning each kernel acceptance criterion into a named engine test (`tests/engine.test.js`) and a screenshot step in `tests/journey.mjs`, so each criterion has a visible pass/fail he can run with one command.
- Demo numbers: the sample menu and sample party must reproduce the "enough on paper, short in reality" moment. Check during the build and adjust the sample party if needed (recorded under checklist Revisions).
