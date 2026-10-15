# DESIGN — TrayMath

Subject & audience: party hosts ordering platters from a small caterer, and the caterer reading that order. · Page job: prove that every guest group, restrictions included, has food they can eat, and hand the caterer a ticket.

## Directions considered
1. **Buffet label on a sheet pan** (chosen). Dark cool steel of a sheet pan as the ground; the type of hand-lettered buffet labels and printed order slips from one variable family (Recursive: casual axis for labels, linear for UI, mono for numbers); pieces drawn as dots that drop onto a group's row; diets as tiny food-pick pennants.
2. **Banquet event order (BEO) sheet.** Swiss grid on paper, grotesk, ruled rows, red mark. Rejected: light paper, and a ruled-sheet signature the ledger already has many times.
3. **Chalkboard menu.** Green-black chalk, script face, doodles. Rejected: costume, low legibility for numbers, which are the product.

## Locked decision
Direction: off-kit, "buffet label on a sheet pan". Why: catering vocabulary (trays seen from above, counted pieces, pick flags, buffet labels) carries the kernel: you can *see* pieces being shared out.
Unexpected pairing / risk: a hand-lettered casual face on a precise counting tool; the casual axis is used only for food and group names, never for numbers.

Palette (cool):
- `--pan` `#13191D` page ground (sheet pan steel)
- `--pan-raised` `#1A2227` panels · `--pan-high` `#232D33` inputs/hover · `--seam` `#2F3B42` hairlines
- `--rice` `#E8EDE9` primary text · `--steam` `#9DAAB0` secondary text
- `--saffron` `#F2B544` the one action colour (Plan, Send) — ≤3 per viewport
- `--basil` `#6FCF8E` covered · `--radish` `#FF6F7F` short · `--yolk` `#E9D46B` variety note

Type: Recursive variable. Display/food names: `CASL 1, wght 750, slnt 0`; UI text `CASL 0, wght 420`; numbers `MONO 1` + `tabular-nums`. Scale 13 / 15 / 17 / 22 / 34 / 56.
Layout primitive: the **group row** — name on the left, a run of piece-dots, numbers in a right-aligned mono column. Repeated on the board, the ticket, and (as the tray row) in the order list.
Radius: 3px for controls, pennants are clipped shapes; no rounded cards. Separation: background lightness steps, hairline seams last.
Motion personality: "pieces placed on a tray" — dots arrive with a short drop (translateY −6px → 0, scale .4 → 1, 180ms, `cubic-bezier(.2,.9,.3,1.3)`), staggered 4ms per dot; a short row's missing dots pulse their outline once; hero entrance: headline lines rise out of a mask, then the board's dots fill row by row. Everything ≤300ms except the entrance. `prefers-reduced-motion`: no drops, instant state.
Signature elements: (1) piece-dots split per tray (dots coloured by the tray that feeds them, hollow when missing); (2) food-pick pennant diet tags; (3) "enough on paper / actually theirs" double column; (4) printable tent-card labels with a fold line; (5) the ticket's perforated tear edge.
Ledger check: differs from every row on ≥3 axes — font (Recursive is unused in the ledger), signature (piece-dot split), motion (dot drop placement); background family and amber-like accent overlap with some dark tool rows, which is allowed by the rule.
Forbidden here: gradients, glass, glow, emoji icons, cards-in-cards, centered hero with badge, uniform fade-up, pure black/white, more than one accent.
