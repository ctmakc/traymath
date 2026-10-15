// Kernel tests. Each test name is an acceptance criterion from devpost/prd.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MENU, SAMPLE_PARTY, menuById, SWEET_SHARE } from '../src/menu.js';
import { compatible, buildGroups, coverage, suggestFixes, autoPlan, REMAINDER_ID } from '../src/engine.js';

const party = (groups, guests = 30, partyType = 'cocktail') => ({ partyType, guests, groups });
const row = (cov, name) => cov.groups.find((g) => g.name === name);

test('vegan trays count as vegetarian; allergens exclude trays', () => {
  const { groups } = buildGroups(party([{ count: 1, diets: ['vegetarian'], avoid: [] }, { count: 1, diets: [], avoid: ['sesame'] }]));
  assert.equal(compatible(menuById['fruit-skewers'], groups[0]), true);
  assert.equal(compatible(menuById['chicken-satay'], groups[0]), false);
  assert.equal(compatible(menuById['hummus-cups'], groups[1]), false);
  assert.equal(compatible(menuById['caprese'], groups[1]), true);
});

test('the same tray is never counted twice (enough on paper, short in reality)', () => {
  // 24 vegan pieces; vegans need 20 and vegan gluten-free guests need 10.
  const p = party([{ count: 2, diets: ['vegan'], avoid: [] }, { count: 1, diets: ['vegan'], avoid: ['gluten'] }], 3);
  const cov = coverage(MENU, p, { 'fruit-skewers': 1 });
  const vegan = row(cov, 'Vegan');
  const veganGf = row(cov, 'Vegan · Gluten-free');
  assert.ok(vegan.onTable >= vegan.need && veganGf.onTable >= veganGf.need, 'each group alone looks fine');
  assert.equal(vegan.covered + veganGf.covered, 24, 'only 24 pieces exist');
  assert.equal(vegan.short + veganGf.short, 6);
  assert.ok(cov.groups.some((g) => g.fooledByTotals));
  assert.equal(cov.allCovered, false);
});

test('restricted guests are served before guests who can eat anything', () => {
  const p = party([{ count: 2, diets: ['vegan'], avoid: [] }], 10);
  const cov = coverage(MENU, p, { 'fruit-skewers': 1, 'brownie-bites': 1 });
  assert.equal(row(cov, 'Vegan').short, 0, 'vegans get the fruit');
  assert.equal(row(cov, 'No restrictions').short, 80 - 28);
});

test('pieces given to a group add up and spare pieces are reported', () => {
  const cov = coverage(MENU, SAMPLE_PARTY, autoPlan(MENU, SAMPLE_PARTY));
  for (const g of cov.groups) assert.equal(Object.values(g.feeds).reduce((a, b) => a + b, 0), g.covered);
  for (const t of cov.trays) assert.equal(Object.values(t.feeds).reduce((a, b) => a + b, 0) + t.unused, t.pieces);
  assert.equal(cov.spare, cov.totalPieces - cov.totalCovered);
});

test('a group no menu item can feed is marked impossible and gets no fixes', () => {
  // A menu without vegan trays cannot feed a vegan guest.
  const noVegan = MENU.filter((m) => !m.diets.includes('vegan'));
  const p = party([{ count: 1, diets: ['vegan'], avoid: [] }], 4);
  const cov = coverage(noVegan, p, { caprese: 1 });
  const vegan = row(cov, 'Vegan');
  assert.equal(vegan.impossible, true);
  assert.equal(vegan.short, 10);
  assert.deepEqual(suggestFixes(noVegan, p, { caprese: 1 }, vegan.id), []);
  assert.equal(row(coverage(MENU, p, {}), 'Vegan').impossible, false);
});

test('auto-plan covers the sample party with at least two dishes per restricted group', () => {
  const order = autoPlan(MENU, SAMPLE_PARTY);
  const cov = coverage(MENU, SAMPLE_PARTY, order);
  assert.equal(cov.allCovered, true);
  for (const g of cov.groups.filter((x) => x.restricted)) assert.ok(g.dishes >= 2, `${g.name} has ${g.dishes} dishes`);
  const sweet = MENU.filter((m) => m.sweet).reduce((a, m) => a + (order[m.id] || 0) * m.pieces, 0);
  assert.ok(sweet <= SWEET_SHARE * cov.totalNeed + 24, 'sweet trays stay a minority');
});

test('auto-plan does not add trays once everyone is covered', () => {
  const order = autoPlan(MENU, SAMPLE_PARTY);
  for (const id of Object.keys(order)) {
    const fewer = { ...order, [id]: order[id] - 1 };
    const cov = coverage(MENU, SAMPLE_PARTY, fewer);
    const stillFine = cov.allCovered && cov.groups.every((g) => !g.restricted || g.dishes >= 2);
    assert.equal(stillFine, false, `removing one ${id} should break coverage or variety`);
  }
});

test('auto-plan works for every party type and for a party with no restrictions', () => {
  for (const partyType of ['nibbles', 'cocktail', 'grazing']) {
    const p = { ...SAMPLE_PARTY, partyType, guests: 60 };
    assert.equal(coverage(MENU, p, autoPlan(MENU, p)).allCovered, true, partyType);
  }
  const plain = party([], 15);
  const cov = coverage(MENU, plain, autoPlan(MENU, plain));
  assert.equal(cov.allCovered, true);
  assert.equal(cov.groups.length, 1);
  assert.equal(cov.groups[0].id, REMAINDER_ID);
});

test('a suggested fix closes the gap it targets', () => {
  const p = party([{ count: 2, diets: ['vegan'], avoid: [] }, { count: 1, diets: ['vegan'], avoid: ['gluten'] }], 3);
  const order = { 'fruit-skewers': 1 };
  const cov = coverage(MENU, p, order);
  const shortRow = cov.groups.find((g) => g.short > 0);
  const fixes = suggestFixes(MENU, p, order, shortRow.id);
  assert.ok(fixes.length >= 1 && fixes.length <= 2);
  const fixed = { ...order, [fixes[0].itemId]: (order[fixes[0].itemId] || 0) + fixes[0].qty };
  assert.equal(coverage(MENU, p, fixed).groups.find((g) => g.id === shortRow.id).short, 0);
  assert.equal(fixes[0].closes, true);
});

test('invalid parties report errors instead of throwing', () => {
  assert.ok(buildGroups(party([], 0)).errors.some((e) => e.field === 'guests'));
  assert.ok(buildGroups(party([], 301)).errors.some((e) => e.field === 'guests'));
  const over = buildGroups(party([{ count: 5, diets: ['vegan'], avoid: [] }], 3));
  assert.ok(over.errors.some((e) => e.field === 'groups'));
  assert.equal(coverage(MENU, party([{ count: 5, diets: ['vegan'], avoid: [] }], 3), {}).valid, false);
  assert.deepEqual(autoPlan(MENU, party([], 0)), {});
});
