# Devpost submission: Build With AI: Basics

Hackathon: https://learn-ai-basics.devpost.com/ · deadline Oct 26, 2026, 5:00 pm EDT

## Project name
TrayMath

## Elevator pitch (≤ 200 characters)
A party platter planner that counts food per diet: it shares every tray between guest groups, restrictions first, and hands the caterer a kitchen ticket.

## Try it out links
- https://github.com/ctmakc/traymath (public repo, MIT; planning docs in `devpost/`)
- https://traymath.pages.dev (live demo, fictional caterer, sample prices)

## Video demo link
YouTube (public), 1:48: VIDEO_URL

## Built with
javascript, html5, css3, node.js, playwright, cloudflare-pages, claude-code

## About the project

### Inspiration
I run marketing for a small family party-catering business in Ottawa. Enquiries arrive as "about 30 people, a few vegetarians, one gluten-free". The kitchen guesses quantities, and the guest with two restrictions is the one who ends up with a couple of crackers. A quick check by headcount ("28 vegan pieces, the vegans need 20, the vegan gluten-free guest needs 10, fine") quietly counts the same tray twice.

### What it does
TrayMath is a planner a small caterer can share with hosts (office managers, parents planning a party).
- The host picks the kind of party (pieces per guest come from the caterer's house rule), the guest count, and the guests with restrictions: diets (vegetarian, vegan, halal) and allergens they avoid (gluten, dairy, nuts, egg, fish and shellfish, sesame).
- **Plan my trays** builds an order from the caterer's menu that covers every group and gives each restricted group at least two dishes.
- The **coverage board** shows each group twice: *On table* (pieces in the order they can eat, the naive count) and *Theirs* (what is left for them once every group is served, most restricted first). One plate per guest fills in as their pieces are covered. When "On table" is enough and "Theirs" is short, the row says so and offers one-click fixes.
- **Send to caterer** turns the whole order into a link (copy or email). The link is the order: no account, no server, nothing stored.
- The caterer opens a **kitchen ticket**: trays and quantities, allergens per tray, which guests each tray feeds, coverage per group, and printable folding **table labels** for the buffet.

### How I built it
I planned first with the Devpost Learn Skill Pack (scope → PRD → spec), then built five slices, each with a mechanical check.
- Plain HTML, CSS and JavaScript modules, no framework or build step, hosted as static files on Cloudflare Pages.
- The counting engine is a max-flow allocation: source → trays (capacity = pieces) → groups that can eat them → sink (capacity = what the group needs). Groups join most-constrained first, and the flow into a group never decreases afterwards, so restricted guests keep their food.
- 14 unit tests (Node's built-in runner) name the PRD's acceptance criteria; a Playwright journey runs the whole flow in a browser, including the phone layout and the printed labels.
- The demo video is a screencast of the live app driven by a script, with synthetic narration and captions.

### Challenges I ran into
- My first demo idea ("remove the fruit skewers and the vegans go short") never happened: because restricted guests are served first, the shortage lands on guests who can eat anything. The real double-counting case is two restricted groups competing for the same trays, so the demo and the scope were revised.
- The first allocation fed vegetarians with vegan fruit skewers while caprese went to everyone. The totals were right, but a kitchen would read the ticket as wrong; the engine now spends the trays that suit the fewest groups first.
- The first auto-plan bought three trays of meringues, the cheapest pieces per dollar. A house rule now caps sweet trays at 30% of the pieces needed.

### Accomplishments that I'm proud of
- The board makes double counting visible: two numbers per group and one plate per guest.
- The order link works as the whole backend, and the kitchen ticket prints tent-card labels that read from both sides of the table.
- Every behaviour in the PRD has a named check that runs with one command.

### What I learned
Writing the scope's "unique kernel" in one sentence (count food per diet, never count a tray twice) kept every later decision small. Writing acceptance criteria that can be checked by looking at the screen meant the plan could be tested, and the checklist shows the three places where the build proved the plan wrong and how the plan changed.

### What's next for TrayMath
A menu editor so a real caterer can load their own trays, labels and house rules; delivering orders to the caterer's inbox; French for Ottawa–Gatineau customers; kids' portions; an embeddable widget for caterers' websites.

## Additional question 1: How did you use the Devpost Learn Skill Pack?
I installed it into an empty folder (`npx skills add challengepost/learn-ai-basics --all -y`; the repo's first commit is that empty start) and ran all six skills in Claude Code. `1-start` captured my idea and background. `2-scope` cut the idea down to one kernel: count food per diet and never count a tray twice. `3-prd` turned it into a journey with checkable acceptance criteria. `4-spec` settled plain JavaScript with no backend and a max-flow counting engine. `5-build` sequenced five slices, each with a mechanical check and a hands-on check, and its checklist records the plan revisions the build forced. `6-ship` prepared the public repository and the demo video. The scope, PRD, spec, checklist and app map are in `devpost/` in the repo.

## Additional question 2: Age of majority
Checkbox: I am at least the age of majority where I reside → **check**.

## Gallery images (3:2, 1800×1200)
1. `1-planned.png`: one click plans the trays, everyone covered
2. `2-short-on-paper.png`: the vegan gluten-free guest has 28 pieces on the table and is still short
3. `3-kitchen-ticket.png`: the caterer's ticket
4. `4-table-labels.png`: printable folding table labels
5. `5-phone.png`: the board on a phone

## Disclosures
- Sample data: the caterer "Juniper Table", its menu and prices are fictional.
- Pre-existing code: none. Third-party: Recursive font (Google Fonts, OFL). Built with Claude Code as the coding agent.
