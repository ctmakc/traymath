// Routes between the planner (#plan=…) and the kitchen ticket (#order=…).
import { CATERER } from './menu.js';
import { mountPlanner, samplePlannerState } from './planner.js';
import { encode, decode } from './order-link.js';
import { buildGroups } from './engine.js';
import { sendPanel, mountTicket } from './ticket.js';

let app = document.getElementById('app');
document.getElementById('caterer-line').innerHTML = `Ordering from <b>${CATERER.name}</b><span class="tagline"> · ${CATERER.tagline}</span>`;
document.getElementById('sample-note').textContent = CATERER.sampleNotice;

function readHash() {
  const m = location.hash.match(/^#(plan|order)=(.*)$/);
  return m ? { kind: m[1], code: m[2] } : null;
}

let writing = false;
function route() {
  if (writing) { writing = false; return; }
  const h = readHash();
  const fresh = app.cloneNode(false); // drop listeners from the previous view
  app.replaceWith(fresh);
  app = fresh;
  if (h && h.kind === 'order') {
    document.title = `Kitchen ticket — ${CATERER.name} · TrayMath`;
    mountTicket(app, decode(h.code), h.code);
  } else {
    document.title = 'TrayMath — every guest gets food they can eat';
    const restored = h && h.kind === 'plan' ? decode(h.code) : null;
    mountPlanner(app, restored || samplePlannerState(), {
      onChange: (state) => {
        const next = '#plan=' + encode(state);
        if (location.hash !== next && buildGroups(state).errors.length === 0) {
          writing = true;
          history.replaceState(null, '', next);
          writing = false;
        }
      },
      onSend: sendPanel,
    });
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
