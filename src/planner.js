// Planner view: party setup, guest groups, coverage board, tray order.
import { MENU, menuById, PARTY_TYPES, DIETS, ALLERGENS, CATERER, SAMPLE_PARTY } from './menu.js';
import { coverage, suggestFixes, autoPlan, buildGroups, groupName, MAX_GUESTS } from './engine.js';
import { esc, money, plural, picks, containsText, plates } from './view-helpers.js';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function samplePlannerState() {
  return { v: 1, ...structuredClone(SAMPLE_PARTY), order: {}, host: '', date: '', note: '' };
}

export function mountPlanner(root, initial, { onChange, onSend } = {}) {
  const state = initial;
  let animateNext = false;

  root.innerHTML = `
    <section class="hero" aria-labelledby="hero-h">
      <h1 id="hero-h"><span class="line"><span>Every guest gets</span></span><span class="line"><span>food they can <em>actually</em> eat.</span></span></h1>
      <p>Tell TrayMath who is coming. It shares each tray's pieces out between your guests, <b>most restricted first</b>, so the same tray is never counted twice. Then it hands ${esc(CATERER.name)} an order they can cook from.</p>
    </section>
    <div class="planner">
      <div class="col-inputs">
        <section class="step" aria-labelledby="party-h" id="party"></section>
        <section class="step" aria-labelledby="groups-h" id="groups"></section>
        <section class="step" aria-labelledby="trays-h" id="trays"></section>
      </div>
      <div class="col-board">
        <section class="board" aria-labelledby="board-h" id="board" aria-live="polite"></section>
        <section class="send" aria-labelledby="send-h" id="send"></section>
      </div>
    </div>
    <div class="verdict-pin" id="pin" aria-hidden="true"></div>`;

  const $ = (id) => root.querySelector('#' + id);

  // ---------- party ----------
  function renderParty() {
    const built = buildGroups(state);
    const guestErr = built.errors.find((e) => e.field === 'guests');
    $('party').innerHTML = `
      <div class="step-head"><h2 id="party-h"><span class="idx">1</span>The party</h2></div>
      <div class="party-types" role="group" aria-label="Kind of party">
        ${PARTY_TYPES.map((p) => `
          <button type="button" class="ptype" data-act="ptype" data-id="${p.id}" data-key="ptype-${p.id}" aria-pressed="${state.partyType === p.id}">
            <b>${esc(p.label)}</b><span>${esc(p.hours)} · <span class="num">${p.piecesPerGuest}</span> pieces each</span>
          </button>`).join('')}
      </div>
      <div class="guests-row">
        <label for="guests">Guests coming</label>
        <span class="stepper big">
          <button type="button" data-act="guests-step" data-d="-1" aria-label="One guest fewer" data-key="g-minus">−</button>
          <input id="guests" data-key="guests" type="number" inputmode="numeric" min="1" max="${MAX_GUESTS}" value="${esc(state.guests)}">
          <button type="button" data-act="guests-step" data-d="1" aria-label="One guest more" data-key="g-plus">+</button>
        </span>
        <span class="hint">1 to ${MAX_GUESTS}</span>
      </div>
      ${guestErr ? `<p class="field-error" role="alert">${esc(guestErr.message)}</p>` : ''}`;
  }

  // ---------- groups ----------
  function renderGroups() {
    const built = buildGroups(state);
    const groupErr = built.errors.find((e) => e.field === 'groups');
    const restricted = state.groups.reduce((a, g) => a + (Number(g.count) || 0), 0);
    const rest = Math.max(0, (Number(state.guests) || 0) - restricted);
    $('groups').innerHTML = `
      <div class="step-head"><h2 id="groups-h"><span class="idx">2</span>Guests with restrictions</h2><span class="hint">Everyone else eats anything</span></div>
      <div class="groups">
        ${state.groups.map((g, i) => `
          <div class="group-ed">
            <div class="group-ed-top">
              <span class="stepper">
                <button type="button" data-act="gcount" data-i="${i}" data-d="-1" aria-label="One fewer in this group" data-key="gc-m-${i}" ${g.count <= 1 ? 'disabled' : ''}>−</button>
                <input type="number" min="1" data-act="gcount-in" data-i="${i}" data-key="gc-${i}" value="${esc(g.count)}" aria-label="Guests in this group">
                <button type="button" data-act="gcount" data-i="${i}" data-d="1" aria-label="One more in this group" data-key="gc-p-${i}">+</button>
              </span>
              <span class="group-ed-name">${esc(groupName({ diets: g.diets, avoid: g.avoid }) === 'No restrictions' ? 'Pick a diet or allergen' : groupName({ diets: g.diets, avoid: g.avoid }))}</span>
              <button type="button" class="btn-x" data-act="gremove" data-i="${i}" data-key="gr-${i}">Remove</button>
            </div>
            <div class="chips" role="group" aria-label="Diet">
              ${DIETS.map((d) => `<button type="button" class="chip" data-act="gdiet" data-i="${i}" data-id="${d.id}" data-key="gd-${i}-${d.id}" aria-pressed="${g.diets.includes(d.id)}">${esc(d.label)}</button>`).join('')}
            </div>
            <div class="chips" role="group" aria-label="Avoids">
              <span class="chip-set-label">Avoids</span>
              ${ALLERGENS.map((a) => `<button type="button" class="chip" data-act="gavoid" data-i="${i}" data-id="${a.id}" data-key="ga-${i}-${a.id}" aria-pressed="${g.avoid.includes(a.id)}">${esc(a.label)}</button>`).join('')}
            </div>
          </div>`).join('')}
        <p class="remainder-line"><span class="num">${rest}</span> ${rest === 1 ? 'guest has' : 'guests have'} no restrictions</p>
        <button type="button" class="btn-quiet" data-act="gadd" data-key="gadd">+ Add a group</button>
        ${groupErr ? `<p class="field-error" role="alert">${esc(groupErr.message)}</p>` : ''}
      </div>`;
  }

  // ---------- trays ----------
  function renderTrays(cov) {
    const inOrder = MENU.filter((m) => (state.order[m.id] || 0) > 0);
    const trayById = Object.fromEntries((cov.trays || []).map((t) => [t.id, t]));
    const nameOf = Object.fromEntries(cov.groups.map((g) => [g.id, g.name]));
    $('trays').innerHTML = `
      <div class="step-head"><h2 id="trays-h"><span class="idx">3</span>Tray order</h2><span class="hint">${esc(CATERER.name)} menu · sample prices</span></div>
      <div class="trays">
        ${inOrder.length ? inOrder.map((m) => {
          const t = trayById[m.id];
          const feeds = t ? Object.entries(t.feeds).map(([gid, n]) => `${esc(nameOf[gid])} <span class="num">${n}</span>`).join(' · ') : '';
          return `
          <div class="tray" data-tray="${m.id}">
            <div class="tray-name">${esc(m.name)}</div>
            <div class="tray-meta"><span class="num">${m.pieces} pcs · ${money(m.price)}</span>${picks(m)}<span>${esc(containsText(m))}</span></div>
            <span class="stepper">
              <button type="button" data-act="qty" data-id="${m.id}" data-d="-1" aria-label="One ${esc(m.name)} fewer" data-key="q-m-${m.id}">−</button>
              <input type="number" min="0" data-act="qty-in" data-id="${m.id}" data-key="q-${m.id}" value="${state.order[m.id]}" aria-label="${esc(m.name)} trays">
              <button type="button" data-act="qty" data-id="${m.id}" data-d="1" aria-label="One ${esc(m.name)} more" data-key="q-p-${m.id}">+</button>
            </span>
            <span class="num line-total">${money(m.price * state.order[m.id])}</span>
            ${t && cov.valid ? `<div class="tray-feeds">Feeds: ${feeds || '—'}${t.unused ? ` · <span class="spare num">${t.unused} spare</span>` : ''}</div>` : ''}
          </div>`;
        }).join('') : `<p class="trays-empty">No trays yet. Press “Plan my trays” or add trays from the menu.</p>`}
      </div>
      <details class="menu-pick" ${inOrder.length ? '' : 'open'}>
        <summary>Add a tray from the menu</summary>
        ${MENU.filter((m) => !(state.order[m.id] > 0)).map((m) => `
          <div class="menu-row">
            <div class="tray-name">${esc(m.name)}</div>
            <div class="tray-meta"><span class="num">${m.pieces} pcs · ${money(m.price)}</span>${picks(m)}<span>${esc(containsText(m))}</span></div>
            <button type="button" class="btn-line btn" data-act="qty" data-id="${m.id}" data-d="1" data-key="add-${m.id}">Add</button>
          </div>`).join('')}
      </details>`;
  }

  // ---------- board ----------
  function renderBoard(cov) {
    const board = $('board');
    const oldFills = new Map([...board.querySelectorAll('.plate')].map((p) => [p.dataset.k, p.style.getPropertyValue('--fill')]));
    const hasOrder = Object.values(state.order).some((q) => q > 0);
    let html = `<div class="board-head"><h2 class="sr" id="board-h">Coverage</h2>`;
    if (!cov.valid) {
      html += `<p class="verdict bad">Fix the party details first</p><p class="verdict-sub">${esc(cov.errors[0].message)}</p></div>`;
    } else if (!hasOrder) {
      html += `<p class="verdict">Who can eat what?</p><p class="verdict-sub"><span class="num">${cov.guests}</span> guests · <span class="num">${cov.piecesPerGuest}</span> pieces each · <span class="num">${cov.totalNeed}</span> pieces needed</p></div>
        <div class="board-empty"><p>TrayMath will pick trays from ${esc(CATERER.name)}'s menu so every group below has enough food they can eat, then show you exactly who is fed by what.</p>
        <button type="button" class="btn btn-main" data-act="plan" data-key="plan">Plan my trays</button></div>`;
    } else {
      const shortRows = cov.groups.filter((g) => g.short > 0);
      html += cov.allCovered
        ? `<p class="verdict ok">Everyone is covered</p>`
        : `<p class="verdict bad">${plural(shortRows.length, 'group is', 'groups are')} short · <span class="num">${cov.totalShort}</span> pieces missing</p>`;
      html += `<p class="verdict-sub"><span class="num">${cov.totalPieces}</span> pieces on the table for <span class="num">${cov.totalNeed}</span> needed · <span class="num">${cov.spare}</span> spare · <span class="num">${money(cov.price)}</span> <button type="button" class="btn-x" data-act="plan" data-key="replan">Re-plan</button></p></div>`;
    }
    if (cov.valid) {
      html += `<p class="board-legend">${hasOrder ? '<b>On table</b>: pieces in the order this group can eat. <b>Theirs</b>: what is left for them once every group is served, most restricted first. One plate = one guest.' : 'Each row is a group of guests. One plate = one guest.'}</p>`;
      html += `<div class="board-cols" aria-hidden="true"><span>Group</span><span>Need</span><span>On table</span><span>Theirs</span></div>`;
      let plateIndex = 0;
      for (const g of cov.groups) {
        const fixes = hasOrder && g.short > 0 && !g.impossible ? suggestFixes(MENU, state, state.order, g.id) : [];
        const feeds = Object.entries(g.feeds).map(([id, n]) => `<b>${esc(menuById[id].name)}</b> <span class="num">${n}</span>`).join(' · ');
        html += `
        <div class="grow ${!hasOrder ? '' : g.short > 0 ? 'is-short' : 'is-ok'}" data-group="${g.id}">
          <div class="grow-name">${esc(g.name)}<small>${plural(g.count, 'guest', 'guests')}</small></div>
          <span class="num dim" title="Pieces needed">${g.need}</span>
          <span class="num dim" title="Pieces in the order this group can eat">${hasOrder ? g.onTable : '–'}</span>
          <span class="num theirs" title="Pieces actually theirs after everyone is served">${hasOrder ? g.covered : '–'}</span>
          <div class="grow-detail">
            ${hasOrder ? plates(g, cov.piecesPerGuest, animateNext && !reduceMotion(), (plateIndex += g.count) - g.count).replace(/<i class="plate([^"]*)" style="([^"]*)--i:(\d+)"/g, (m, c, st, i) => `<i class="plate${c}" data-k="${g.id}-${Number(i) - plateIndex + g.count}" style="${st}--i:${i}"`) : ''}
            ${g.impossible ? `<p class="flag-line short">No dish on this menu suits ${esc(g.name)}. Ask ${esc(CATERER.name)} what they can make.</p>` : ''}
            ${hasOrder && g.short > 0 && !g.impossible ? `<p class="flag-line short">Short <span class="num">${g.short}</span> pieces${g.fooledByTotals ? ` — enough on paper (<span class="num">${g.onTable}</span>), but other guests need those trays too` : ''}</p>
              ${fixes.length ? `<div class="fix-row">${fixes.map((f) => `<button type="button" class="fix" data-act="fix" data-id="${f.itemId}" data-qty="${f.qty}" data-key="fix-${g.id}-${f.itemId}">Add ${f.qty > 1 ? `${f.qty} × ` : ''}${esc(f.name)} <span class="num">+${f.pieces} pcs · ${money(f.cost)}</span></button>`).join('')}</div>` : ''}` : ''}
            ${hasOrder && g.varietyNote ? `<p class="flag-line note">Only one dish they can eat. A second would be kinder.</p>` : ''}
            ${hasOrder && feeds ? `<p class="feeds">Fed by ${feeds}</p>` : ''}
          </div>
        </div>`;
      }
    }
    board.innerHTML = html;
    // let plate fills slide from their previous value
    for (const p of board.querySelectorAll('.plate')) {
      const old = oldFills.get(p.dataset.k);
      const now = p.style.getPropertyValue('--fill');
      if (old !== undefined && old !== now && !reduceMotion()) {
        p.style.setProperty('--fill', old);
        requestAnimationFrame(() => requestAnimationFrame(() => p.style.setProperty('--fill', now)));
      }
    }
    animateNext = false;

    const pin = $('pin');
    if (cov.valid && hasOrder) {
      pin.innerHTML = cov.allCovered
        ? `<span class="ok">Everyone is covered · <span class="num">${money(cov.price)}</span></span><a href="#board">See board</a>`
        : `<span class="bad"><span class="num">${cov.totalShort}</span> pieces short</span><a href="#board">See who</a>`;
    } else pin.innerHTML = '';
  }

  // ---------- send (filled in by slice 4) ----------
  function renderSend(cov) {
    if (onSend) { $('send')._notify = () => onChange && onChange(state); onSend.render($('send'), state, cov); }
    else $('send').hidden = true;
  }

  // ---------- render cycle ----------
  function render(parts = 'all') {
    const active = document.activeElement;
    const key = active && root.contains(active) ? active.dataset.key : null;
    const caret = active && active.tagName === 'INPUT' && active.type === 'text' ? active.selectionStart : null;
    const cov = coverage(MENU, state, state.order);
    if (parts === 'all') { renderParty(); renderGroups(); }
    renderTrays(cov);
    renderBoard(cov);
    renderSend(cov);
    if (key) {
      const el = root.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (el) { el.focus({ preventScroll: true }); if (caret !== null && el.setSelectionRange) el.setSelectionRange(caret, caret); }
    }
    onChange && onChange(state);
  }

  const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'INPUT') return;
    const i = Number(b.dataset.i);
    const d = Number(b.dataset.d);
    switch (b.dataset.act) {
      case 'ptype': state.partyType = b.dataset.id; break;
      case 'guests-step': state.guests = clampInt((Number(state.guests) || 0) + d, 1, MAX_GUESTS); break;
      case 'gcount': state.groups[i].count = Math.max(1, (Number(state.groups[i].count) || 1) + d); break;
      case 'gremove': state.groups.splice(i, 1); break;
      case 'gadd': state.groups.push({ count: 1, diets: [], avoid: ['gluten'] }); break;
      case 'gdiet': toggle(state.groups[i].diets, b.dataset.id); break;
      case 'gavoid': toggle(state.groups[i].avoid, b.dataset.id); break;
      case 'qty': {
        const q = Math.max(0, (state.order[b.dataset.id] || 0) + d);
        if (q) state.order[b.dataset.id] = q; else delete state.order[b.dataset.id];
        break;
      }
      case 'fix': state.order[b.dataset.id] = (state.order[b.dataset.id] || 0) + Number(b.dataset.qty); break;
      case 'plan':
        if (!buildGroups(state).errors.length) { state.order = autoPlan(MENU, state); animateNext = true; }
        break;
      default: return;
    }
    render();
  });

  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'guests') { state.guests = t.value === '' ? '' : Math.round(Number(t.value)); render(); }
    else if (t.dataset.act === 'gcount-in') { state.groups[Number(t.dataset.i)].count = Math.round(Number(t.value)); render(); }
    else if (t.dataset.act === 'qty-in') {
      const q = clampInt(t.value, 0, 99);
      if (q) state.order[t.dataset.id] = q; else delete state.order[t.dataset.id];
      render();
    }
  });

  function toggle(list, id) {
    const at = list.indexOf(id);
    if (at >= 0) list.splice(at, 1); else list.push(id);
    // vegan already implies vegetarian: keep the label honest
    if (id === 'vegan' && list.includes('vegan')) { const v = list.indexOf('vegetarian'); if (v >= 0) list.splice(v, 1); }
    if (id === 'vegetarian' && list.includes('vegetarian')) { const v = list.indexOf('vegan'); if (v >= 0) list.splice(v, 1); }
  }

  // phone: show the pinned verdict while the board is off-screen
  const io = new IntersectionObserver(([en]) => $('pin').classList.toggle('show', !en.isIntersecting && $('pin').innerHTML !== ''), { threshold: 0 });
  io.observe($('board'));

  render();
  return { state, render };
}
