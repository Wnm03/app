'use strict';
// S2041.3: the a11y body observer must sweep only the PARENTS of newly added element nodes, never the whole document,
// and must ignore removal-only / text-only mutation records (they cannot create a new control).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'modules/shared/a11y-action-controls.js'), 'utf8');

function boot() {
  const calls = { enhance: [], pressed: [], native: [], tabs: 0, exp: 0 };
  let cb = null; const rafQ = [];
  const mkRoot = (name, parent) => ({ name, isConnected: true, querySelectorAll: () => { calls.enhance.push(name); return []; },
    contains(o) { for (let p = o; p; p = p.parent) if (p === this) return true; return false; }, parent });
  const doc = Object.assign(mkRoot('document'), { readyState: 'complete', body: {}, addEventListener() {} });
  function MO(fn) { cb = fn; this.observe = () => {}; }
  const run = new Function('document', 'MutationObserver', 'requestAnimationFrame', '_a11yPressedSyncAll', '_a11yNativePressedSyncAll', '_a11yWorthItTabsSync', '_a11yExpandedTogglesSync',
    src + '\n;return 1;');
  run(doc, MO, f => rafQ.push(f), r => calls.pressed.push(r.name), r => calls.native.push(r.name), () => { calls.tabs++; }, () => { calls.exp++; });
  const reset = () => { calls.enhance.length = calls.pressed.length = calls.native.length = 0; calls.tabs = calls.exp = 0; };
  const flush = () => { while (rafQ.length) rafQ.shift()(); };
  return { calls, mkRoot, fire: recs => cb(recs), flush, reset, pending: () => rafQ.length };
}
const el = () => ({ nodeType: 1 });
const txt = () => ({ nodeType: 3 });

test('S2041.3: install pass still sweeps the document once', () => {
  const h = boot();
  assert.deepStrictEqual(h.calls.native, ['document']);
});

test('S2041.3: removal-only and text-only records schedule nothing', () => {
  const h = boot(); h.reset();
  const t = h.mkRoot('a');
  h.fire([{ target: t, addedNodes: [], removedNodes: [el()] }, { target: t, addedNodes: [txt()] }]);
  assert.strictEqual(h.pending(), 0);
  h.flush();
  assert.deepStrictEqual(h.calls.native, []);
});

test('S2041.3: added element -> sweeps its parent only (not document), nested roots are deduped, hooks run once', () => {
  const h = boot(); h.reset();
  const outer = h.mkRoot('outer'), inner = h.mkRoot('inner', outer), other = h.mkRoot('other');
  h.fire([{ target: inner, addedNodes: [el()] }, { target: outer, addedNodes: [el()] }, { target: other, addedNodes: [el()] }, { target: outer, addedNodes: [el()] }]);
  assert.strictEqual(h.pending(), 1, 'single rAF for a burst');
  h.flush();
  assert.deepStrictEqual(h.calls.native.sort(), ['other', 'outer']);
  assert.deepStrictEqual(h.calls.pressed.sort(), ['other', 'outer']);
  assert.ok(!h.calls.native.includes('document'));
  assert.strictEqual(h.calls.tabs, 1); assert.strictEqual(h.calls.exp, 1);
});

test('S2041.3: roots detached before the frame runs are skipped; records arriving while queued are not lost', () => {
  const h = boot(); h.reset();
  const a = h.mkRoot('a'), b = h.mkRoot('b');
  h.fire([{ target: a, addedNodes: [el()] }]);
  h.fire([{ target: b, addedNodes: [el()] }]);
  a.isConnected = false;
  h.flush();
  assert.deepStrictEqual(h.calls.native, ['b']);
});
