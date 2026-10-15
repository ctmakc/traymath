// Small shared helpers for the two views.
import { CATERER, dietById, allergenById } from './menu.js';
import { itemDiets } from './engine.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmt = new Intl.NumberFormat('en-CA', { style: 'currency', currency: CATERER.currency, maximumFractionDigits: 0 });
export const money = (n) => fmt.format(n);

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Food-pick pennants for the diets a tray suits. Vegan trays show VG only. */
export function picks(item) {
  const d = itemDiets(item);
  if (d.has('vegan')) d.delete('vegetarian');
  const order = ['vegan', 'vegetarian', 'halal'].filter((x) => d.has(x));
  if (!order.length) return '';
  return `<span class="picks">${order
    .map((x) => `<span class="pick" title="${esc(dietById[x].label)}"><span>${esc(dietById[x].code)}</span></span>`)
    .join('')}</span>`;
}

export function containsText(item) {
  if (!item.contains.length) return 'No listed allergens';
  return 'Contains ' + item.contains.map((a) => allergenById[a].label.toLowerCase()).join(', ');
}

export function suitsText(item) {
  const d = itemDiets(item);
  if (d.has('vegan')) d.delete('vegetarian');
  const diets = ['vegan', 'vegetarian', 'halal'].filter((x) => d.has(x)).map((x) => dietById[x].label);
  const free = Object.values(allergenById).filter((a) => !item.contains.includes(a.id)).map((a) => a.free);
  return [...diets, ...free].join(' · ');
}

/** Plates: one per guest, filled by the share of their pieces actually covered. */
export function plates(row, ppg, animate, start = 0) {
  const max = 120;
  const n = Math.min(row.count, max);
  let left = row.covered;
  let html = '';
  for (let i = 0; i < n; i++) {
    const fill = ppg ? Math.max(0, Math.min(1, left / ppg)) : 1;
    left -= ppg;
    const cls = fill >= 1 ? 'plate' : fill > 0 ? 'plate part' : 'plate empty';
    html += `<i class="${cls}${animate ? ' anim' : ''}" style="--fill:${fill.toFixed(3)};--i:${start + i}"></i>`;
  }
  const more = row.count > max ? `<span class="hint">+${row.count - max} more guests</span>` : '';
  return `<div class="plates" role="img" aria-label="${row.count} guests, ${row.covered} of ${row.need} pieces covered">${html}${more}</div>`;
}
