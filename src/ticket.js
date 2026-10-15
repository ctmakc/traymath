// "Send to caterer" panel (inside the planner) and the kitchen ticket view.
import { MENU, CATERER, partyTypeById } from './menu.js';
import { coverage } from './engine.js';
import { encode } from './order-link.js';
import { esc, money, plural, picks, containsText, suitsText } from './view-helpers.js';

const linkFor = (kind, code) => `${location.origin}${location.pathname}#${kind}=${code}`;

// ---------- send panel ----------
export const sendPanel = {
  render(el, state, cov) {
    if (!el.dataset.ready) {
      el.dataset.ready = '1';
      el.innerHTML = `
        <h2 id="send-h">Send to ${esc(CATERER.name)}</h2>
        <div class="send-fields">
          <label>Your name <input class="text-in" type="text" data-f="host" data-key="f-host" maxlength="80" autocomplete="name"></label>
          <label>Event date <input class="text-in" type="date" data-f="date" data-key="f-date"></label>
          <label class="wide">Note to the caterer <input class="text-in" type="text" data-f="note" data-key="f-note" maxlength="400" placeholder="Delivery time, address, anything they should know"></label>
        </div>
        <p class="send-warn" data-part="warn" hidden></p>
        <div class="send-actions"><button type="button" class="btn btn-main" data-part="go">Send to caterer</button></div>
        <div class="send-out" data-part="out" hidden></div>`;
      for (const f of ['host', 'date', 'note']) el.querySelector(`[data-f="${f}"]`).value = state[f] || '';
      el.addEventListener('input', (e) => {
        const f = e.target.dataset.f;
        if (f) { state[f] = e.target.value; el.querySelector('[data-part="out"]').hidden = true; el._notify && el._notify(); }
      });
      el.addEventListener('click', async (e) => {
        const part = e.target.closest('[data-part]')?.dataset.part;
        const out = el.querySelector('[data-part="out"]');
        if (part === 'go') {
          const url = linkFor('order', encode(state));
          const subject = `Platter order: ${state.guests} guests${state.date ? ', ' + state.date : ''}`;
          const body = `Hello ${CATERER.name},\n\nHere is our order, with who can eat what:\n${url}\n\n${state.host ? 'Thanks,\n' + state.host : 'Thanks!'}`;
          out.innerHTML = `
            <label class="hint" for="order-link">Your order link (the link is the order)</label>
            <input class="text-in" id="order-link" readonly value="${esc(url)}">
            <div class="send-actions">
              <button type="button" class="btn btn-line" data-part="copy">Copy link</button>
              <a class="btn btn-line" href="mailto:${esc(CATERER.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}">Email it</a>
              <a class="btn btn-line" href="${esc(url)}" data-part="open">Open the kitchen ticket</a>
              <span class="toast" data-part="toast" role="status"></span>
            </div>`;
          out.hidden = false;
        } else if (part === 'copy') {
          const input = out.querySelector('#order-link');
          const toast = out.querySelector('[data-part="toast"]');
          try {
            await navigator.clipboard.writeText(input.value);
            toast.textContent = 'Copied. Paste it into your message to the caterer.';
          } catch {
            input.focus(); input.select();
            toast.textContent = 'Copy it from the box above (Ctrl/Cmd + C).';
          }
        }
      });
    }
    const warn = el.querySelector('[data-part="warn"]');
    const go = el.querySelector('[data-part="go"]');
    const hasOrder = Object.values(state.order).some((q) => q > 0);
    const shortGroups = cov.groups.filter((g) => g.short > 0).length;
    go.disabled = !cov.valid || !hasOrder;
    if (!cov.valid) { warn.hidden = false; warn.textContent = 'Fix the party details before sending.'; }
    else if (!hasOrder) { warn.hidden = false; warn.textContent = 'Plan or add trays first.'; }
    else if (shortGroups) { warn.hidden = false; warn.textContent = `${plural(shortGroups, 'group is', 'groups are')} still short. You can send anyway; the ticket will show it.`; }
    else warn.hidden = true;
    go.textContent = cov.valid && hasOrder && shortGroups ? 'Send anyway' : 'Send to caterer';
  },
};

// ---------- kitchen ticket ----------
export function mountTicket(root, state, code) {
  if (!state) {
    root.innerHTML = `
      <section class="incomplete">
        <h1>This order link is incomplete</h1>
        <p class="hint">Part of the link is missing or was changed, so TrayMath cannot read the order. Ask the host to send the link again, or start a new plan.</p>
        <a class="btn btn-main" href="./">Start a new plan</a>
      </section>`;
    return;
  }
  const cov = coverage(MENU, state, state.order);
  const type = partyTypeById[state.partyType];
  const names = Object.fromEntries(cov.groups.map((g) => [g.id, g.name]));
  const dateText = state.date ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Not given';
  const shortGroups = cov.groups.filter((g) => g.short > 0);

  root.innerHTML = `
    <div class="ticket-wrap">
      <div class="ticket-tools">
        <button type="button" class="btn btn-main" data-t="print">Print ticket</button>
        <button type="button" class="btn btn-line" data-t="labels">Print table labels</button>
        <a class="btn btn-line" href="${esc(linkFor('plan', code))}">Open in planner</a>
      </div>
      <article class="ticket" aria-labelledby="ticket-h">
        <p class="sub">Kitchen ticket · ${esc(CATERER.name)} · made with TrayMath</p>
        <h1 id="ticket-h">${plural(cov.guests, 'guest', 'guests')} · ${esc(type.label)}</h1>
        <dl class="kv">
          <div><dt>Host</dt><dd>${esc(state.host || 'Not given')}</dd></div>
          <div><dt>Date</dt><dd>${esc(dateText)}</dd></div>
          <div><dt>House rule</dt><dd class="num">${type.piecesPerGuest} pieces / guest</dd></div>
          <div><dt>Pieces</dt><dd class="num">${cov.totalPieces} for ${cov.totalNeed} needed</dd></div>
        </dl>
        ${state.note ? `<div class="note-box"><b>Note:</b> ${esc(state.note)}</div>` : ''}
        <h2>Trays</h2>
        <table>
          <thead><tr><th>Tray</th><th class="num">Qty</th><th class="num">Pieces</th><th>Feeds</th><th class="num">Price</th></tr></thead>
          <tbody>
          ${cov.trays.map((t) => `
            <tr>
              <td><span class="dish">${esc(t.item.name)}</span> ${picks(t.item)}<div class="sub">${esc(containsText(t.item))}</div></td>
              <td class="num">${t.qty}</td>
              <td class="num">${t.pieces}</td>
              <td class="sub">${Object.entries(t.feeds).map(([gid, n]) => `${esc(names[gid])} <span class="num">${n}</span>`).join('<br>') || '—'}${t.unused ? `<br>${t.unused} spare` : ''}</td>
              <td class="num">${money(t.qty * t.item.price)}</td>
            </tr>`).join('')}
            <tr class="total"><td colspan="4">Total (sample prices)</td><td class="num">${money(cov.price)}</td></tr>
          </tbody>
        </table>
        <h2>Who can eat what</h2>
        <table>
          <thead><tr><th>Group</th><th class="num">Guests</th><th class="num">Need</th><th class="num">Theirs</th><th>Status</th></tr></thead>
          <tbody>
          ${cov.groups.map((g) => `
            <tr>
              <td class="dish">${esc(g.name)}</td>
              <td class="num">${g.count}</td>
              <td class="num">${g.need}</td>
              <td class="num">${g.covered}</td>
              <td>${g.short > 0 ? `<span class="bad">Short ${g.short}</span>` : '<span class="ok">Covered</span>'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        ${shortGroups.length ? `<p class="fine bad">The host sent this order with ${plural(shortGroups.length, 'group', 'groups')} short. Worth a call before cooking.</p>` : ''}
        <p class="fine">Pieces are shared out most-restricted-first, so no tray is counted for two groups. Diets and allergens come from ${esc(CATERER.name)}'s own labels; cross-contact is the kitchen's to confirm.</p>
      </article>
      <div class="labels" aria-hidden="true">
        ${cov.trays.map((t) => {
          const half = (cls) => `<div class="label-half ${cls}"><div class="dish">${esc(t.item.name)}</div><div class="suits">${esc(suitsText(t.item))}</div><div class="contains">${esc(containsText(t.item))}</div><div class="fine">Labels from ${esc(CATERER.name)}. Ask staff about cross-contact.</div></div>`;
          return `<div class="label-card">${half('top')}${half('bottom')}</div>`;
        }).join('')}
      </div>
    </div>`;

  root.querySelector('[data-t="print"]').addEventListener('click', () => { document.body.classList.remove('print-labels'); window.print(); });
  root.querySelector('[data-t="labels"]').addEventListener('click', () => {
    document.body.classList.add('print-labels');
    window.print();
    setTimeout(() => document.body.classList.remove('print-labels'), 500);
  });
}
