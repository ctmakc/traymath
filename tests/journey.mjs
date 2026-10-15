// Browser check of the core journey (prd.md > The Core Journey).
// Usage: serve the folder (python3 -m http.server 47811), then
//   node tests/journey.mjs [baseUrl] [screenshotDir]
// Needs the `playwright` package and a Chromium build available to it.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const BASE = process.argv[2] || 'http://localhost:47811/';
const OUT = process.argv[3] || 'test-results';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const shot = (name, p = page, opts = {}) => p.screenshot({ path: `${OUT}/${name}.png`, ...opts });
const step = (s) => console.log('✓', s);
const row = (name) => page.locator('.grow', { has: page.locator('.grow-name', { hasText: new RegExp(`^${name}\\d`) }) });

await page.goto(BASE);
await page.waitForSelector('.grow');
assert.equal(await page.locator('.grow').count(), 4);
assert.match(await page.locator('.verdict').innerText(), /Who can eat what/);
await page.waitForTimeout(900);
await shot('01-first-use');
step('first use: sample party, four groups, plan prompt');

await page.click('[data-act="plan"]');
await page.waitForTimeout(700);
assert.match(await page.locator('.verdict').innerText(), /Everyone is covered/);
await shot('02-planned');
step('Plan my trays covers everyone');

// The kernel: remove vegan trays until two vegan groups compete for the same pieces.
await page.click('[data-act="qty"][data-id="fruit-skewers"][data-d="-1"]');
await page.click('[data-act="qty"][data-id="falafel"][data-d="-1"]');
await page.click('[data-act="qty"][data-id="falafel"][data-d="-1"]');
await page.waitForTimeout(500);
const vgf = row('Vegan · Gluten-free');
assert.match(await vgf.innerText(), /Short \d+ pieces — enough on paper/);
await vgf.scrollIntoViewIfNeeded();
await shot('03-short-on-paper');
step('a group with enough pieces "on paper" is shown short');

await vgf.locator('.fix').first().click();
await page.waitForTimeout(500);
assert.doesNotMatch(await row('Vegan · Gluten-free').innerText(), /Short/);
await shot('04-fixed');
step('one-click fix closes the gap');

const hashBefore = await page.evaluate(() => location.hash);
await page.reload();
await page.waitForSelector('.grow');
assert.equal(await page.evaluate(() => location.hash), hashBefore);
assert.doesNotMatch(await row('Vegan · Gluten-free').innerText(), /Short/);
step('plan survives a reload (lives in the address)');

// validation: restricted guests above the total
await page.fill('#guests', '4');
await page.dispatchEvent('#guests', 'change');
await page.waitForTimeout(200);
assert.match(await page.locator('#groups').innerText(), /more than the 4 coming/);
assert.match(await page.locator('.verdict').innerText(), /Fix the party details first/);
assert.equal(await page.locator('[data-part="go"]').isDisabled(), true);
step('restricted > total is blocked with a clear message');
await page.fill('#guests', '30');
await page.dispatchEvent('#guests', 'change');

// group editor
await page.click('[data-act="gadd"]');
await page.click('[data-act="gdiet"][data-i="3"][data-id="halal"]');
assert.match(await page.locator('.grow-name', { hasText: 'Halal · Gluten-free' }).innerText(), /1 guest/);
await page.click('[data-act="gremove"][data-i="3"]');
assert.equal(await page.locator('.grow').count(), 4);
step('groups can be added, edited and removed');

// send to caterer
await page.fill('[data-f="host"]', 'Dana (office manager)');
await page.fill('[data-f="date"]', '2026-11-06');
await page.fill('[data-f="note"]', 'Deliver by 4:30 pm, reception desk.');
await page.click('[data-part="go"]');
const link = await page.inputValue('#order-link');
assert.match(link, /#order=/);
await page.locator('#send').scrollIntoViewIfNeeded();
await shot('05-send');
step('Send to caterer produces an order link');

const caterer = await ctx.newPage();
caterer.on('pageerror', (e) => errors.push(String(e)));
await caterer.goto(link);
await caterer.waitForSelector('.ticket');
const ticketText = await caterer.locator('.ticket').innerText();
assert.match(ticketText, /30 guests · Cocktail party/);
assert.match(ticketText, /Dana \(office manager\)/);
assert.match(ticketText, /Deliver by 4:30 pm/);
const plannerTrays = await page.locator('.tray').count();
assert.equal(await caterer.locator('.ticket tbody tr:not(.total)').count(), plannerTrays + 4);
await shot('06-ticket', caterer, { fullPage: true });
step('caterer opens the kitchen ticket with the same order');

await caterer.emulateMedia({ media: 'print' });
await caterer.evaluate(() => document.body.classList.add('print-labels'));
assert.equal(await caterer.locator('.label-card').count(), plannerTrays);
await shot('07-labels-print', caterer, { fullPage: true });
await caterer.emulateMedia({ media: 'screen' });
await caterer.evaluate(() => document.body.classList.remove('print-labels'));
step('table labels print one per tray');

await caterer.goto(link.slice(0, -12));
await caterer.waitForSelector('.incomplete, .ticket');
assert.match(await caterer.locator('main').innerText(), /This order link is incomplete/);
step('a cut-off link shows the incomplete state');

// phone
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
phone.on('pageerror', (e) => errors.push(String(e)));
await phone.goto(link.replace('#order=', '#plan='));
await phone.waitForSelector('.grow');
await phone.waitForTimeout(900);
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`);
await shot('08-phone', phone);
await phone.locator('#board').scrollIntoViewIfNeeded();
await shot('09-phone-board', phone);
step('phone layout has no horizontal scroll');

assert.deepEqual(errors, [], 'console errors: ' + errors.join('\n'));
step('no console errors');
await browser.close();
