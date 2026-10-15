// The order lives in the page address: state ⇄ compact code.
import { menuById, partyTypeById, dietById, allergenById } from './menu.js';
import { MAX_GUESTS } from './engine.js';

const b64urlEncode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64urlDecode = (code) => {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

const clip = (s, n) => String(s ?? '').slice(0, n);

export function encode(state) {
  const compact = {
    v: 1,
    p: state.partyType,
    n: Number(state.guests),
    g: state.groups.map((g) => [Number(g.count), g.diets, g.avoid]),
    t: Object.entries(state.order).filter(([, q]) => q > 0),
  };
  if (state.host) compact.h = clip(state.host, 80);
  if (state.date) compact.d = clip(state.date, 10);
  if (state.note) compact.m = clip(state.note, 400);
  return b64urlEncode(JSON.stringify(compact));
}

/** Returns a valid state, or null for anything malformed. */
export function decode(code) {
  let o;
  try {
    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
    o = JSON.parse(b64urlDecode(code));
  } catch {
    return null;
  }
  if (!o || o.v !== 1 || !partyTypeById[o.p]) return null;
  if (!Number.isInteger(o.n) || o.n < 1 || o.n > MAX_GUESTS) return null;
  if (!Array.isArray(o.g) || !Array.isArray(o.t)) return null;
  const groups = [];
  for (const g of o.g) {
    if (!Array.isArray(g) || g.length !== 3) return null;
    const [count, diets, avoid] = g;
    if (!Number.isInteger(count) || count < 1) return null;
    if (!Array.isArray(diets) || !diets.every((d) => dietById[d])) return null;
    if (!Array.isArray(avoid) || !avoid.every((a) => allergenById[a])) return null;
    groups.push({ count, diets: [...diets], avoid: [...avoid] });
  }
  const order = {};
  for (const t of o.t) {
    if (!Array.isArray(t) || t.length !== 2) return null;
    const [id, q] = t;
    if (!menuById[id] || !Number.isInteger(q) || q < 1 || q > 99) return null;
    order[id] = q;
  }
  return {
    v: 1, partyType: o.p, guests: o.n, groups, order,
    host: clip(o.h, 80), date: /^\d{4}-\d{2}-\d{2}$/.test(o.d || '') ? o.d : '', note: clip(o.m, 400),
  };
}
