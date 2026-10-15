import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode } from '../src/order-link.js';

const state = {
  v: 1, partyType: 'cocktail', guests: 30,
  groups: [{ count: 2, diets: ['vegan'], avoid: [] }, { count: 1, diets: ['vegan'], avoid: ['gluten'] }],
  order: { 'fruit-skewers': 2, caprese: 1 },
  host: 'Dana — office', date: '2026-11-06', note: 'Reception desk, 4:30 pm. Café crème ☕',
};

test('an order survives the round trip through the link', () => {
  assert.deepEqual(decode(encode(state)), state);
});

test('the code is URL-safe', () => {
  assert.match(encode(state), /^[A-Za-z0-9_-]+$/);
});

test('malformed or cut-off codes return null instead of throwing', () => {
  const code = encode(state);
  for (const bad of ['', 'abc', code.slice(0, -8), code + '!!', '%%%', null, undefined, 42]) assert.equal(decode(bad), null, String(bad).slice(0, 20));
});

test('unknown trays, diets, party types and bad numbers are rejected', () => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const ok = { v: 1, p: 'cocktail', n: 30, g: [[2, ['vegan'], []]], t: [['caprese', 1]] };
  assert.ok(decode(b64(ok)));
  assert.equal(decode(b64({ ...ok, t: [['lobster', 1]] })), null);
  assert.equal(decode(b64({ ...ok, g: [[2, ['keto'], []]] })), null);
  assert.equal(decode(b64({ ...ok, p: 'rave' })), null);
  assert.equal(decode(b64({ ...ok, n: 0 })), null);
  assert.equal(decode(b64({ ...ok, n: 1e6 })), null);
  assert.equal(decode(b64({ ...ok, t: [['caprese', -3]] })), null);
  assert.equal(decode(b64({ ...ok, v: 2 })), null);
});
