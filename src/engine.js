// TrayMath counting engine. Pure functions, no DOM.
//
// The kernel: food is shared out between guest groups with a max-flow
// allocation, so a piece given to one group is never counted for another.
// Each group reports two numbers:
//   onTable — compatible pieces in the order (what a naive check counts)
//   covered — pieces actually theirs after everyone is served
// A group is short when `covered < need`, even if `onTable >= need`.

import { partyTypeById, dietById, allergenById, SWEET_SHARE } from './menu.js';

export const MAX_GUESTS = 300;
export const REMAINDER_ID = 'all';

/** Diets an item satisfies, with vegan implying vegetarian. */
export function itemDiets(item) {
  const d = new Set(item.diets);
  if (d.has('vegan')) d.add('vegetarian');
  return d;
}

/** Can every guest in `group` eat `item`? */
export function compatible(item, group) {
  if (!group.restricted) return true;
  const diets = itemDiets(item);
  for (const d of group.diets) if (!diets.has(d)) return false;
  for (const a of group.avoid) if (item.contains.includes(a)) return false;
  return true;
}

/** Human name for a group: "Vegan · Gluten-free". */
export function groupName(group) {
  const parts = [
    ...group.diets.map((d) => dietById[d]?.label ?? d),
    ...group.avoid.map((a) => allergenById[a]?.free ?? `${a}-free`),
  ];
  return parts.length ? parts.join(' · ') : 'No restrictions';
}

/**
 * Validate the party and return restricted groups plus the remainder.
 * Never throws; problems come back in `errors`.
 */
export function buildGroups(party) {
  const errors = [];
  const type = partyTypeById[party.partyType];
  if (!type) errors.push({ field: 'partyType', message: 'Choose a kind of party.' });
  const guests = Number(party.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS) {
    errors.push({ field: 'guests', message: `Guests must be a whole number from 1 to ${MAX_GUESTS}.` });
  }
  const groups = [];
  let restrictedTotal = 0;
  (party.groups || []).forEach((g, i) => {
    const count = Number(g.count);
    if (!Number.isInteger(count) || count < 1) {
      errors.push({ field: `group-${i}`, message: 'Each group needs at least 1 guest.' });
      return;
    }
    const diets = [...new Set(g.diets || [])].filter((d) => dietById[d]);
    const avoid = [...new Set(g.avoid || [])].filter((a) => allergenById[a]);
    const group = { id: `g${i}`, index: i, count, diets, avoid, restricted: diets.length + avoid.length > 0 };
    group.name = groupName(group);
    restrictedTotal += count;
    groups.push(group);
  });
  if (Number.isInteger(guests) && restrictedTotal > guests) {
    errors.push({
      field: 'groups',
      message: `Groups add up to ${restrictedTotal} guests, more than the ${guests} coming. Raise the guest count or lower a group.`,
    });
  }
  const remainderCount = Number.isInteger(guests) ? Math.max(0, guests - restrictedTotal) : 0;
  if (remainderCount > 0) {
    groups.push({ id: REMAINDER_ID, index: groups.length, count: remainderCount, diets: [], avoid: [], restricted: false, name: 'No restrictions' });
  }
  return { groups, guests, piecesPerGuest: type ? type.piecesPerGuest : 0, type, errors };
}

// ---- max flow (Edmonds–Karp on a small dense graph) -----------------------

function makeGraph(n) {
  return { n, cap: Array.from({ length: n }, () => new Array(n).fill(0)), flow: Array.from({ length: n }, () => new Array(n).fill(0)) };
}

function augmentAll(g, s, t) {
  let total = 0;
  for (;;) {
    const prev = new Array(g.n).fill(-1);
    prev[s] = s;
    const queue = [s];
    while (queue.length && prev[t] === -1) {
      const u = queue.shift();
      for (let v = 0; v < g.n; v++) {
        if (prev[v] === -1 && g.cap[u][v] - g.flow[u][v] > 0) {
          prev[v] = u;
          queue.push(v);
        }
      }
    }
    if (prev[t] === -1) return total;
    let push = Infinity;
    for (let v = t; v !== s; v = prev[v]) push = Math.min(push, g.cap[prev[v]][v] - g.flow[prev[v]][v]);
    for (let v = t; v !== s; v = prev[v]) {
      g.flow[prev[v]][v] += push;
      g.flow[v][prev[v]] -= push;
    }
    total += push;
  }
}

/**
 * Share the order's pieces out between groups.
 * @param menu  array of trays
 * @param party { partyType, guests, groups }
 * @param order { trayId: quantity }
 */
export function coverage(menu, party, order) {
  const built = buildGroups(party);
  const { groups, piecesPerGuest } = built;
  // Trays that suit the fewest groups come first, so the search spends them
  // first and keeps widely-edible trays (vegan, allergen-free) for the guests
  // who need them. Totals are the same either way; the "fed by" lists read better.
  const reach = (m) => groups.filter((gr) => compatible(m, gr)).length;
  const trays = menu
    .filter((m) => (order[m.id] || 0) > 0)
    .map((m) => ({ item: m, qty: order[m.id], pieces: order[m.id] * m.pieces, reach: reach(m) }))
    .sort((a, b) => a.reach - b.reach);

  // nodes: 0 = source, 1..T = trays, T+1..T+G = groups, last = sink
  const T = trays.length;
  const G = groups.length;
  const s = 0;
  const t = T + G + 1;
  const g = makeGraph(T + G + 2);
  trays.forEach((tr, i) => {
    g.cap[s][1 + i] = tr.pieces;
    groups.forEach((gr, j) => {
      if (compatible(tr.item, gr)) g.cap[1 + i][1 + T + j] = tr.pieces;
    });
  });

  const rows = groups.map((gr, j) => {
    const need = gr.count * piecesPerGuest;
    const onTable = trays.reduce((sum, tr) => sum + (compatible(tr.item, gr) ? tr.pieces : 0), 0);
    const dishes = trays.filter((tr) => compatible(tr.item, gr)).length;
    const menuOptions = menu.filter((m) => compatible(m, gr)).length;
    return { ...gr, node: 1 + T + j, need, onTable, dishes, menuOptions, impossible: menuOptions === 0 };
  });

  // Most constrained first: restricted groups by onTable/need, the remainder last.
  const priority = [...rows].sort((a, b) => {
    if (a.restricted !== b.restricted) return a.restricted ? -1 : 1;
    const ra = a.need ? a.onTable / a.need : Infinity;
    const rb = b.need ? b.onTable / b.need : Infinity;
    return ra - rb || a.index - b.index;
  });
  for (const row of priority) {
    g.cap[row.node][t] = row.need;
    augmentAll(g, s, t);
  }

  const trayRows = trays.map((tr, i) => {
    const feeds = {};
    let used = 0;
    rows.forEach((row) => {
      const f = g.flow[1 + i][row.node];
      if (f > 0) {
        feeds[row.id] = f;
        used += f;
      }
    });
    return { id: tr.item.id, item: tr.item, qty: tr.qty, pieces: tr.pieces, feeds, unused: tr.pieces - used };
   }).sort((a, b) => menu.indexOf(a.item) - menu.indexOf(b.item));

  const groupRows = rows.map((row) => {
    const feeds = {};
    trays.forEach((tr, i) => {
      const f = g.flow[1 + i][row.node];
      if (f > 0) feeds[tr.item.id] = f;
    });
    const covered = g.flow[row.node][t];
    const { node, ...rest } = row;
    return {
      ...rest,
      covered,
      short: row.need - covered,
      feeds,
      fooledByTotals: row.onTable >= row.need && covered < row.need,
      varietyNote: row.restricted && row.dishes === 1 && row.menuOptions >= 2,
    };
  });

  const totalNeed = groupRows.reduce((a, r) => a + r.need, 0);
  const totalPieces = trays.reduce((a, tr) => a + tr.pieces, 0);
  const totalCovered = groupRows.reduce((a, r) => a + r.covered, 0);
  const price = trays.reduce((a, tr) => a + tr.qty * tr.item.price, 0);
  return {
    valid: built.errors.length === 0,
    errors: built.errors,
    piecesPerGuest,
    type: built.type,
    guests: built.guests,
    groups: groupRows,
    trays: trayRows,
    totalNeed,
    totalPieces,
    totalCovered,
    totalShort: totalNeed - totalCovered,
    spare: totalPieces - totalCovered,
    price,
    allCovered: built.errors.length === 0 && groupRows.every((r) => r.short === 0),
  };
}

// ---- fixes and auto-plan ----------------------------------------------------

function weightedShort(cov) {
  return cov.groups.reduce((a, r) => a + r.short * (r.restricted ? 3 : 1), 0);
}

function withAdded(order, id, qty) {
  return { ...order, [id]: (order[id] || 0) + qty };
}

/**
 * Up to two ways to close a short group's gap: "add k × tray".
 * Smallest k (1–5) that closes the gap; otherwise the best partial.
 */
export function suggestFixes(menu, party, order, groupId, limit = 2) {
  const base = coverage(menu, party, order);
  const row = base.groups.find((r) => r.id === groupId);
  if (!row || row.short <= 0 || row.impossible) return [];
  const options = [];
  for (const item of menu) {
    if (!compatible(item, row)) continue;
    let best = null;
    for (let k = 1; k <= 5; k++) {
      const cov = coverage(menu, party, withAdded(order, item.id, k));
      const after = cov.groups.find((r) => r.id === groupId);
      const closed = row.short - after.short;
      if (closed <= 0) continue;
      best = { itemId: item.id, name: item.name, qty: k, pieces: k * item.pieces, cost: k * item.price, closes: after.short === 0, closed, totalShortAfter: cov.totalShort };
      if (after.short === 0) break;
    }
    if (best) options.push(best);
  }
  options.sort((a, b) => Number(b.closes) - Number(a.closes) || b.closed - a.closed || a.totalShortAfter - b.totalShortAfter || a.cost - b.cost);
  return options.slice(0, limit);
}

/** Propose a tray order that covers every group when the menu allows. */
export function autoPlan(menu, party) {
  let order = {};
  const built = buildGroups(party);
  if (built.errors.length) return order;

  // 1. Greedy: best weighted shortfall reduction per dollar, repeats discounted.
  for (let step = 0; step < 120; step++) {
    const cov = coverage(menu, party, order);
    const current = weightedShort(cov);
    if (current === 0) break;
    let pick = null;
    const sweetPieces = menu.reduce((a, m) => a + (m.sweet ? (order[m.id] || 0) * m.pieces : 0), 0);
    for (const item of menu) {
      if (item.sweet && sweetPieces + item.pieces > SWEET_SHARE * cov.totalNeed) continue;
      const reduction = current - weightedShort(coverage(menu, party, withAdded(order, item.id, 1)));
      if (reduction <= 0) continue;
      const score = reduction / item.price / (1 + 0.35 * (order[item.id] || 0));
      if (!pick || score > pick.score) pick = { id: item.id, score };
    }
    if (!pick) break;
    order = withAdded(order, pick.id, 1);
  }

  // 2. Variety: every restricted group gets a second dish when the menu has one.
  for (let pass = 0; pass < 10; pass++) {
    const cov = coverage(menu, party, order);
    const lacking = cov.groups.find((r) => r.restricted && !r.impossible && r.dishes < 2 && r.menuOptions >= 2);
    if (!lacking) break;
    const candidates = menu
      .filter((m) => compatible(m, lacking) && !(order[m.id] > 0))
      .sort((a, b) => a.price - b.price || b.pieces - a.pieces);
    if (!candidates.length) break;
    order = withAdded(order, candidates[0].id, 1);
  }

  // 3. Trim: drop trays that are no longer needed, most expensive first.
  const keeps = (o) => {
    const c = coverage(menu, party, o);
    return c.groups.every((r) => r.short === 0 || r.impossible) &&
      c.groups.every((r) => !r.restricted || r.impossible || r.dishes >= Math.min(2, r.menuOptions));
  };
  const goal = coverage(menu, party, order);
  if (goal.groups.every((r) => r.short === 0 || r.impossible)) {
    let changed = true;
    while (changed) {
      changed = false;
      const ids = Object.keys(order).sort((a, b) => menu.find((m) => m.id === b).price - menu.find((m) => m.id === a).price);
      for (const id of ids) {
        const trial = { ...order, [id]: order[id] - 1 };
        if (trial[id] === 0) delete trial[id];
        if (keeps(trial)) {
          order = trial;
          changed = true;
          break;
        }
      }
    }
  }
  return order;
}
