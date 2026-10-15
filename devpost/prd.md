---
doc: prd
status: approved
---

# TrayMath — Product Requirements

A party food planner for hosts ordering from a small caterer: it builds a platter order where every guest group, restrictions included, has enough food they can eat, and hands the caterer that order as a kitchen ticket.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Develops `scope.md > The Core Loop` and `scope.md > What "Working" Looks Like`.

1. The host opens the caterer's planner link. The page names the caterer (a fictional demo caterer, "Juniper Table") and says what TrayMath does in one sentence.
2. The host sets the party: kind of party (Drinks & nibbles, Cocktail party, Grazing meal) and the total number of guests.
3. The host adds guest groups with restrictions: how many guests, which diets (vegetarian, vegan, halal) and which allergens they avoid (gluten, dairy, nuts, egg, fish & shellfish, sesame). Everyone not in a group is "No restrictions".
4. The host presses "Plan my trays". TrayMath fills an order from the caterer's menu.
5. The coverage board shows one row per group: pieces needed, pieces they can eat in this order, and a clear covered or short state. Each row shows which trays feed that group.
6. The host removes or adds trays. The board recalculates instantly. A short group shows by how much and offers one-click fixes ("Add Hummus & crudité cups +12 pcs · $34").
7. When every group is covered, the host presses "Send to caterer". TrayMath creates a link holding the whole order; the host can copy it or open an email with it.
8. The caterer opens the link and sees the kitchen ticket: trays and quantities, what each tray contains, which group each tray feeds, coverage, total. They print table labels for the buffet.

Success: the order the caterer receives answers "how many of each tray" and "who can eat what" without a phone call.

## Screens and Layout
Two surfaces, one page each.
- **Planner** (default view). Desktop: left column is the party form and guest groups; right column is the coverage board, with the tray order under it. Phone: a single column in the same order (party, groups, board, trays), with the board's summary line pinned when scrolling the trays.
- **Kitchen ticket** (opened from the sent link). A printable order sheet; a "Print table labels" action switches the print output to one label per tray.
No other screens. No login, no settings.

## Look and Feel
Source: `scope.md > Inspiration & Identity`.
- Dark interface, calm and dense like a working tool, nothing like a generic AI app or a SaaS template.
- The look comes from catering itself: a tray seen from above, pieces counted as dots, buffet table labels, food-pick flags for diets.
- Numbers are always readable and aligned (they are the product).
- Colour carries meaning: covered, short, and one accent for the main action. Diet markers are small and consistent everywhere (planner, ticket, labels).
- Copy is plain and specific: "Short 6 pieces", never "Oops!".

## Features and Behavior

### Party setup
- As a host, I want to say what kind of party it is and how many people are coming, so the amount of food matches the occasion.
  - [ ] Choosing a party type shows its rule in plain words (e.g. "Cocktail party, 2–3 h: 10 pieces per guest") and updates every group's need.
  - [ ] Guest count accepts 1 to 300; outside that range the field explains the limit and the plan is not recalculated with a bad number.

### Guest groups
- As a host, I want to describe guests who have restrictions, so they are fed properly and not just counted.
  - [ ] A group has a count, any mix of diets and avoided allergens; its name is built from them ("Vegan · Nut-free").
  - [ ] Groups can be added, edited and removed; "No restrictions" is always the remainder and cannot go below zero.
  - [ ] If restricted guests exceed the total, the form says so and blocks planning until fixed.

### Planning trays
- As a host, I want TrayMath to propose an order, so I do not have to work out platter maths.
  - [ ] "Plan my trays" produces an order where every group is covered whenever the menu allows it.
  - [ ] The order is reasonable: it does not add trays once everyone is covered, and gives each restricted group at least two different dishes when the menu has them.
  - [ ] Each tray line shows name, pieces per tray, quantity with − and + controls, diet markers, allergens, and price.
  - [ ] Any menu item can be added from a menu list, even if the plan did not choose it.

### Coverage board (the kernel)
Implements `scope.md > The Unique Kernel`.
- As a host, I want to see for each group whether they have enough food they can actually eat, so nobody goes without.
  - [ ] Each group row shows needed pieces, available pieces, and covered or short.
  - [ ] The same tray is never counted twice: pieces given to one group are not available to another. A plan that has enough food in total can still show a group as short.
  - [ ] A short row says by how many pieces and offers up to two fixes; one click applies a fix and the row recalculates.
  - [ ] A group with only one compatible dish shows a variety note (not an error).
  - [ ] A group whose needs no menu item can meet (e.g. an avoidance no dish satisfies) says so plainly instead of offering fixes.
  - [ ] Each row shows which trays feed it, in pieces.

### Sending the order
- As a host, I want to hand the caterer the exact order, so they can confirm without calling me.
  - [ ] "Send to caterer" is available at any time; when a group is short it warns first and lets the host send anyway.
  - [ ] It produces a link that opens the kitchen ticket with the same party, groups and trays.
  - [ ] Optional fields: host name, event date, note to the caterer. They appear on the ticket.
  - [ ] "Copy link" copies it and confirms; "Email it" opens the host's email app addressed to the caterer with the link in the body.

### Kitchen ticket
- As a caterer, I want a clear order sheet, so I can cook and label the buffet.
  - [ ] Shows party type, guest count, date, host, note, trays with quantities and pieces, contains-allergens per tray, which groups each tray feeds, coverage per group, total price.
  - [ ] "Print table labels" prints one label per tray: dish name, diets it suits, what it contains, and a line saying the caterer confirms cross-contact.
  - [ ] "Open in planner" loads the same order back into the planner for changes.
  - [ ] A broken or edited link shows "This order link is incomplete" with a button to start a new plan, never a blank page.

## States and Boundaries
- **First use** — the planner opens with a sample party already filled (30 guests, cocktail party, three restricted groups) and the board empty with a prompt to press "Plan my trays", so the core moment is one click away.
- **No restrictions at all** — the board shows one row for everyone; planning still works.
- **Short** — red state with the number of missing pieces and fixes.
- **Impossible group** — explained, no fixes offered.
- **Covered** — every row green; the summary line says "Everyone is covered" with spare pieces.
- **Persistence** — the current plan lives in the page address, so a refresh or a shared link keeps it. Nothing is stored on a server.
- **Allergy boundary** — everywhere allergens appear, a short line says TrayMath uses the caterer's labels and the caterer confirms cross-contact.
- **Sample data** — the menu and prices are labelled as a demo caterer's sample data.

## Product Decisions
- Count food in pieces, per guest by party type — matches how party platters are sold ("24 pieces") and how hosts think ("about 10 bites each").
- Restricted groups are defined by the host, not inferred from names — the host knows their guests; the app does the arithmetic.
- Fixes are suggestions the host applies, never silent changes — the host owns the order and the budget.
- Link instead of an account or a backend — a small caterer can use it tomorrow without setting anything up.
- The menu, house rules and prices belong to the caterer; in the proof of concept they are fixed sample data.

## What We're Building
Planner with party setup, guest groups, auto-plan, editable tray order, coverage board with no double counting, fixes, variety note, send-to-caterer link and email; kitchen ticket with printable table labels; the plan stored in the address; phone and desktop layouts; sample caterer menu.

## Deferred From the POC
- Caterer menu editor and their own house rules — needs caterer accounts and storage.
- Order delivery to an inbox (email service or Telegram) — needs a server and spam protection.
- Kids' portions — a second per-guest rule and kids with restrictions; adds input without changing the kernel.
- Budget limit — optimisation under a price cap.
- French interface.

## Possible Later Enhancements
- Embeddable widget for the caterer's own site.
- Dessert/savoury balance rules per party type.
- Saving favourite orders for repeat office lunches.

## Non-Goals
- Taking payment or deposits — the caterer confirms and invoices as today.
- Medical or allergy guarantees — the caterer's labels and kitchen practice decide that.
- Nutrition or calorie maths — not what hosts are asking.
- Recipe or menu generation by AI — the menu is the caterer's.

## Open Questions
- None blocking `4-spec`. The sample menu's numbers must make the demo moment in `scope.md > What "Working" Looks Like` reproducible; settle the exact menu in the spec.
