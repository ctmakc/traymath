---
doc: scope
status: approved
---

# TrayMath

A party food planner that checks every guest can eat, then hands the caterer an order they can cook from.

## The Unique Kernel
TrayMath counts food per diet, not per head. A platter that feeds the vegans cannot also feed the gluten-free guests if it is the same 24 pieces, and TrayMath catches that double counting: it proves (or disproves) that every group of guests can be fed from food they can eat at the same time. If any group is short, it says which group, by how many pieces, and which platter would fix it.

## Who It's For
Two people on either side of one catering order.
- **The host**: an office manager or a parent planning a party of 15 to 60 people. Today they email a small caterer "about 30 people, a few vegetarians, one gluten-free, one nut allergy" and hope.
- **The small caterer**: a one- or two-person party catering business that receives those emails, phones back to ask what "a few" means, and guesses quantities. Today the guess is made in the kitchen, and the guest with two restrictions is the one who goes without.

## The Core Loop
The host opens the caterer's planner link, enters the guest count and the guests with restrictions ("2 vegan", "1 gluten-free + nut-free"), and picks the kind of party. TrayMath fills a tray order from that caterer's menu and shows a coverage board: one row per guest group, with pieces they need against pieces they can eat. The host adds or removes platters and watches the rows go green or red. When everything is green, they send the order to the caterer as a link.
They come back for the next party; the caterer's planner link stays the same.

## Inspiration & Identity
A calm, dark, kitchen-ticket feel: the clarity of a printed order slip, warm accent colours from food, no generic "AI app" gradients. The owner works in dark interfaces and wants nothing that looks like a template.

## Why This Matters to the Learner
He runs marketing for a small family party-catering business and sees the enquiries: vague headcounts, restrictions mentioned in passing, and a kitchen that has to guess. He wants a tool real customers can use, and wants to see that a written plan turns into checks he can verify on screen.

## What "Working" Looks Like
Open the planner for a demo caterer. Enter 30 guests: 3 vegetarian, 2 vegan, 1 vegan and gluten-free. Choose "Cocktail party, 2–3 hours". Press "Plan my trays": the coverage board is all green. Take away the fruit skewers and the falafel: the vegan gluten-free guest still has 28 pieces "on the table" for the 10 they need, yet turns red, short 2 pieces, because the two vegans need the same trays. TrayMath offers the fix ("Add Fruit skewers +24 pcs"). Press "Send to caterer", open the link: the caterer sees the same order as a kitchen ticket with quantities, allergens per tray and printable table labels.
The "oh, that's cool" beat: a plan that looks fine by total headcount turns red because the same tray was being counted twice, and TrayMath names the fix.

## The POC Boundary
- One demo caterer with a fixed sample menu (about ten platters, invented prices, clearly labelled as sample data).
- Host planner: guest count, guest groups with diets and allergens, party type, auto-plan, add/remove platters, live coverage board, total price.
- Coverage check that cannot double count food between groups.
- "Send to caterer": the whole order encoded in a link; opening it shows the kitchen ticket with allergens and printable table labels.
- Works in a browser, on a phone and on a laptop. No accounts, no server.

## Later
- Caterer self-service: edit their own menu, prices and house rules.
- Order inbox for the caterer (email or Telegram delivery instead of a copied link).
- French version for Ottawa–Gatineau customers.
- Budget mode: "best coverage under $X".

## Explicitly Cut
- Payments and checkout: a caterer confirms by phone or email anyway; payments add trust and legal work that proves nothing about the kernel.
- Accounts and saved history: the link is the record for a proof of concept.
- AI-generated menus or chat: the problem is arithmetic with constraints, not language; a model would add cost and uncertainty to the part that must be exact.
- Allergy safety claims: TrayMath plans servings from the caterer's own labels; cross-contact is the caterer's to confirm, and the app says so.
