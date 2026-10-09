'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = rd('modules/shared/a11y-pressed-state.js');
const ag = rd('modules/shared/a11y-action-controls.js');

// Minimal fake DOM: enough for the module's contract (class/attr/closest), no jsdom dependency.
function el(tag, opts) {
  opts = opts || {};
  const attrs = Object.assign({}, opts.attrs);
  const cls = new Set(opts.classes || []);
  const node = {
    tagName: tag, attrs, cls,
    classList: { contains: (c) => cls.has(c), toggle: (c, f) => { const on = f === undefined ? !cls.has(c) : !!f; on ? cls.add(c) : cls.delete(c); return on; }, add: (c) => cls.add(c), remove: (c) => cls.delete(c) },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    setAttribute: (k, v) => { attrs[k] = String(v); node.writes.push(k); },
    hasAttribute: (k) => k in attrs,
    closest: (sel) => (opts.inSegmented && sel === '.segmented-control' ? {} : null),
    writes: [],
  };
  return node;
}
function load(extra) {
  const created = [];
  class FakeMO { constructor(cb) { this.cb = cb; this.opts = null; this.target = null; this.disconnected = false; created.push(this); } observe(t, o) { this.target = t; this.opts = o; } disconnect() { this.disconnected = true; } }
  const grid = { id: 'themeGrid', cards: [], querySelectorAll() { return this.cards; } };
  const doc = Object.assign({ getElementById: (id) => (id === 'themeGrid' ? grid : null) }, extra);
  const api = new Function('document', 'MutationObserver',
    src + '; return {sel:_A11Y_PRESSED_SELECTOR, elig:_a11yPressedEligible, sync:_a11yPressedSync, all:_a11yPressedSyncAll, obs:_a11yPressedObserveThemeGrid};')(doc, FakeMO);
  return Object.assign(api, { created, grid, doc });
}
const rootOf = (list) => ({ querySelectorAll: () => list });
const btn = (extra) => el('DIV', { attrs: Object.assign({ role: 'button', 'data-action': 'x' }, extra && extra.attrs), classes: extra && extra.classes, inSegmented: extra && extra.inSegmented });

test('S256AH: inactive -> aria-pressed="false", active -> "true"', () => {
  const { sync } = load();
  const off = btn(), on = btn({ classes: ['active'] });
  assert.strictEqual(sync(rootOf([off, on])), 2);
  assert.strictEqual(off.attrs['aria-pressed'], 'false');
  assert.strictEqual(on.attrs['aria-pressed'], 'true');
});

test('S256AH: classList.toggle("active") on a theme card is mirrored by the single grid observer', () => {
  const api = load();
  const a = btn({ classes: ['theme-card'] }), b = btn({ classes: ['theme-card', 'active'] });
  api.grid.cards = [a, b];
  api.all(rootOf([a, b]));
  assert.deepStrictEqual([a.attrs['aria-pressed'], b.attrs['aria-pressed']], ['false', 'true']);
  a.classList.toggle('active', true); b.classList.toggle('active', false);
  api.created[0].cb([]);
  assert.deepStrictEqual([a.attrs['aria-pressed'], b.attrs['aria-pressed']], ['true', 'false']);
});

test('S256AH: re-render (fresh elements) gets aria-pressed from class on the next sync', () => {
  const { sync } = load();
  const gen1 = [btn({ classes: ['active'] }), btn()];
  sync(rootOf(gen1));
  const gen2 = [btn(), btn({ classes: ['active'] })]; // innerHTML replaced, active moved
  sync(rootOf(gen2));
  assert.deepStrictEqual(gen2.map((n) => n.attrs['aria-pressed']), ['false', 'true']);
});

test('S256AH: one-way (class -> ARIA). Setting ARIA never changes class and module never writes class', () => {
  const { sync } = load();
  const n = btn({ classes: ['chip'] });
  n.attrs['aria-pressed'] = 'true'; // ARIA says pressed, class says not active
  sync(rootOf([n]));
  assert.strictEqual(n.attrs['aria-pressed'], 'false'); // class wins
  assert.deepStrictEqual([...n.cls], ['chip']);
  assert.ok(!/classList\.(add|remove|toggle)|className\s*=|setAttribute\('class'/.test(src), 'module must not write class');
});

test('S256AH: allowlist is exact; native, un-enhanced, chip-btn and acc-chip targets are untouched', () => {
  const { sel, sync } = load();
  assert.strictEqual(sel, '.chip[data-action],.vehicle-chip[data-action],.theme-card[data-action]');
  assert.ok(!/chip-btn|acc-chip|trs-chip|\.ai-q|segmented/.test(sel));
  const nativeBtn = el('BUTTON', { attrs: { role: 'button' } });
  const noRole = el('DIV', {});
  const otherRole = el('DIV', { attrs: { role: 'tab' } });
  const insideA = el('A', { attrs: { role: 'button' } });
  sync(rootOf([nativeBtn, noRole, otherRole, insideA]));
  for (const n of [nativeBtn, noRole, otherRole, insideA]) assert.deepStrictEqual(n.writes, [], n.tagName);
});

test('S256AH: S1934 ownership respected -- controls inside .segmented-control are skipped (no overwrite)', () => {
  const { sync } = load();
  const s = btn({ classes: ['active'], inSegmented: true, attrs: { 'aria-pressed': 'false' } });
  sync(rootOf([s]));
  assert.deepStrictEqual(s.writes, []);
  assert.strictEqual(s.attrs['aria-pressed'], 'false'); // S1934 value left as is
  assert.ok(!rd('modules/shared/segmented-control.js').includes('a11y-pressed-state'), 'S1934 untouched');
});

test('S256AH: no duplicate observer; one class-only observer on #themeGrid; no global/body observer', () => {
  const api = load();
  api.obs(); api.obs(); api.all(rootOf([])); api.all(rootOf([]));
  assert.strictEqual(api.created.length, 1);
  assert.strictEqual(api.created[0].target, api.grid);
  assert.deepStrictEqual(api.created[0].opts, { attributes: true, attributeFilter: ['class'], subtree: true });
  assert.ok(!/document\.body|childList/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'no body/childList observer in module');
  // grid replaced -> old observer disconnected, still exactly one live observer
  api.doc.getElementById = () => ({ id: 'themeGrid', querySelectorAll: () => [] });
  api.obs();
  assert.strictEqual(api.created.length, 2);
  assert.ok(api.created[0].disconnected);
});

test('S256AH: S256AG hooks the single sync entry point (install + rAF run), keeps its own childList-only observer', () => {
  // S2041.3: install sweeps document once; the observer pass sweeps only the parents of newly added elements (root var), never document.
  assert.strictEqual((ag.match(/_a11yPressedSyncAll\(document\)/g) || []).length, 1);
  assert.strictEqual((ag.match(/_a11yPressedSyncAll\(r\)/g) || []).length, 1);
  assert.ok(/observe\(document\.body,\{childList:true,subtree:true\}\)/.test(ag));
  assert.ok(ag.indexOf('_a11yEnhanceActionControls(document);\nif(typeof _a11yPressedSyncAll') > 0, 'sync runs after enhance');
});

test('S256AH: every <div|span> .chip/.vehicle-chip/.theme-card[data-action] template carries an active state (toggle contract)', () => {
  const files = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      if (f.name === 'node_modules' || f.name === 'tests' || f.name === 'regression-evidence' || f.name === 'docs') continue;
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else if (/\.(js|html)$/.test(f.name) && !/\.min\.js$|^app_production|^sw\.js$/.test(f.name)) files.push(p);
    }
  })(root);
  const re = /<(?:div|span)\b[^>]*class=["']([^"']*)["'][^>]*data-action/g;
  let found = 0; const bad = [];
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8'); let m;
    while ((m = re.exec(t))) {
      const cls = m[1].split(/\s+/);
      if (!cls.includes('chip') && !cls.includes('vehicle-chip') && !cls.includes('theme-card')) continue;
      found++;
      const isThemeCard = cls.includes('theme-card'); // theme cards: state set via classList (static markup has none)
      if (!isThemeCard && !/active/.test(m[0])) bad.push(path.relative(root, f) + ': ' + m[0].slice(0, 90));
    }
  }
  assert.ok(found >= 8, 'expected the known div chip/vehicle-chip/theme-card templates, found ' + found);
  assert.deepStrictEqual(bad, []);
});

test('S256AH: registered once in scripts/build.js GROUP_A right after S256AG module, and present in bundle A', () => {
  const b = rd('scripts/build.js');
  const a = b.slice(b.indexOf('const GROUP_A'), b.indexOf('const GROUP_B'));
  const k = "'modules/shared/a11y-pressed-state.js'";
  assert.strictEqual(a.split(k).length - 1, 1);
  assert.ok(a.indexOf("'modules/shared/a11y-action-controls.js'") < a.indexOf(k));
  assert.strictEqual(b.split(k).length - 1, 1, 'no duplicate registration anywhere in build.js');
  assert.ok(rd('app-bundle-a.min.js').includes('_A11Y_PRESSED_SELECTOR'));
});
