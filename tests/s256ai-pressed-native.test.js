'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = rd('modules/shared/a11y-pressed-native.js');
const ag = rd('modules/shared/a11y-action-controls.js');

function el(tag, opts) {
  opts = opts || {};
  const attrs = Object.assign({}, opts.attrs); const cls = new Set(opts.classes || []);
  const node = { tagName: tag, id: opts.id, attrs, cls, writes: [],
    classList: { contains: (c) => cls.has(c), toggle: (c, f) => { const on = f === undefined ? !cls.has(c) : !!f; on ? cls.add(c) : cls.delete(c); return on; }, add: (c) => cls.add(c), remove: (c) => cls.delete(c) },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    setAttribute: (k, v) => { attrs[k] = String(v); node.writes.push(k); },
    closest: (sel) => (opts.inSegmented && sel === '.segmented-control' ? {} : null),
    querySelectorAll: () => opts.kids || [] };
  return node;
}
function load(docExtra, seg) {
  const created = [];
  class FakeMO { constructor(cb) { this.cb = cb; this.targets = []; this.optsList = []; created.push(this); } observe(t, o) { this.targets.push(t); this.optsList.push(o); } disconnect() {} }
  const els = {};
  const doc = Object.assign({ getElementById: (id) => els[id] || null }, docExtra);
  const api = new Function('document', 'MutationObserver', 'SegmentedControl', 'WeakSet',
    src + '; return {sel:_A11Y_NATIVE_SELECTOR, C:_A11Y_NATIVE_CONTAINERS, S:_A11Y_NATIVE_SELF, A:_A11Y_NATIVE_ACTIONS, X:_A11Y_NATIVE_EXCLUDED_ACTIONS, elig:_a11yNativeEligible, sync:_a11yNativeSync, all:_a11yNativePressedSyncAll, observe:_a11yNativeObserve};')(doc, FakeMO, seg, WeakSet);
  return Object.assign(api, { created, els, doc });
}
const rootOf = (list) => ({ querySelectorAll: () => list });
const nb = (o) => el('BUTTON', o);

test('S256AI: active -> "true", inactive -> "false", no role/tabindex written', () => {
  const { sync } = load();
  const on = nb({ classes: ['chip-btn', 'active'] }), off = nb({ classes: ['chip-btn'] });
  assert.strictEqual(sync(rootOf([on, off])), 2);
  assert.strictEqual(on.attrs['aria-pressed'], 'true'); assert.strictEqual(off.attrs['aria-pressed'], 'false');
  assert.deepStrictEqual([...on.writes, ...off.writes], ['aria-pressed', 'aria-pressed']);
});
test('S256AI: skips non-BUTTON and anything inside .segmented-control; never writes class', () => {
  const { sync, elig } = load();
  const div = el('DIV', { classes: ['chip-btn', 'active'] }), seg = nb({ classes: ['chip-btn', 'active'], inSegmented: true });
  assert.strictEqual(elig(div), false); assert.strictEqual(elig(seg), false);
  assert.strictEqual(sync(rootOf([div, seg])), 0);
  assert.strictEqual(div.writes.length + seg.writes.length, 0);
  const b = nb({ classes: ['chip-btn'] }); sync(rootOf([b])); assert.strictEqual(b.cls.has('active'), false);
});
test('S256AI: idempotent (second pass writes nothing) and follows class changes', () => {
  const { sync } = load();
  const b = nb({ classes: ['chip-btn'] });
  assert.strictEqual(sync(rootOf([b])), 1); assert.strictEqual(sync(rootOf([b])), 0);
  b.classList.add('active'); assert.strictEqual(sync(rootOf([b])), 1); assert.strictEqual(b.attrs['aria-pressed'], 'true');
});
test('S256AI: observer = ONE instance, class-only, allowlisted targets only, idempotent, never body/childList', () => {
  const api = load();
  const c = nb({ id: 'periodeChips' }), s = nb({ id: 'assetZakatableBtn' });
  api.els.periodeChips = c; api.els.assetZakatableBtn = s;
  assert.strictEqual(api.observe(), 2); assert.strictEqual(api.observe(), 0);
  assert.strictEqual(api.created.length, 1);
  const o = api.created[0];
  assert.deepStrictEqual(o.targets, [c, s]);
  o.optsList.forEach((x) => { assert.deepStrictEqual(x.attributeFilter, ['class']); assert.strictEqual(x.attributes, true); assert.ok(!x.childList); });
  assert.ok(!/document\.body|observe\(document\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
});
test('S256AI: class toggle inside an observed container is mirrored via the observer callback', () => {
  const api = load();
  const a = nb({ classes: ['chip-btn', 'active'] }), b = nb({ classes: ['chip-btn'] });
  const cont = el('DIV', { id: 'periodeChips', kids: [a, b] });
  api.els.periodeChips = cont; api.observe();
  api.sync(rootOf([a, b]));
  a.classList.toggle('active', false); b.classList.toggle('active', true);
  api.created[0].cb([{ target: cont }]);
  assert.deepStrictEqual([a.attrs['aria-pressed'], b.attrs['aria-pressed']], ['false', 'true']);
});
test('S256AI: single toggle button (self target) mirrors its own className rewrite', () => {
  const api = load();
  const t = nb({ id: 'piutangLunasBtn', classes: ['chip-btn'] });
  api.els.piutangLunasBtn = t; api.observe(); api.sync(rootOf([t]));
  t.cls.add('active'); api.created[0].cb([{ target: t }]);
  assert.strictEqual(t.attrs['aria-pressed'], 'true');
});
test('S256AI: late-rendered segmented roots are processed via public SegmentedControl.scan (decision 2)', () => {
  const calls = []; const api = load({}, { scan: (r) => calls.push(r) });
  const d = {}; api.all(Object.assign(rootOf([]), d));
  assert.strictEqual(calls.length, 1);
  assert.doesNotThrow(() => load({}, undefined).all(rootOf([])));
  assert.doesNotThrow(() => load({}, { scan() { throw new Error('x'); } }).all(rootOf([])));
  assert.ok(!/segmented-control\.js/.test(ag), 'S1934 file is not touched');
});
test('S256AI: hook lines exist in S256AG enhancer (install + rAF run), guarded by typeof', () => {
  assert.strictEqual((ag.match(/_a11yNativePressedSyncAll/g) || []).length, 4);
  assert.ok(/typeof _a11yNativePressedSyncAll==='function'/.test(ag));
});
test('S256AI: registered once in build.js GROUP_A after a11y-pressed-state.js', () => {
  const b = rd('scripts/build.js');
  assert.strictEqual((b.match(/a11y-pressed-native\.js/g) || []).length, 1);
  assert.ok(b.indexOf('a11y-pressed-state.js') < b.indexOf('a11y-pressed-native.js'));
});

// ---- Contract: every chip-btn template must be classified (allowlist cannot silently go stale) ----
function staticCensus() {
  const sb = {}; vm.createContext(sb);
  vm.runInContext(rd('modules/modals.js') + ';this.__M=typeof MODAL_HTML!=="undefined"?MODAL_HTML:null', sb);
  const all = rd('index.html') + '\n' + (Array.isArray(sb.__M) ? sb.__M.join('\n') : String(sb.__M || ''));
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, vd = new Set(['input', 'br', 'img', 'hr', 'meta', 'link']);
  const stack = [], out = []; let m;
  while ((m = re.exec(all))) {
    const close = m[1], t = m[2].toLowerCase(), attrs = m[3];
    if (close) { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].t === t) { stack.length = i; break; } continue; }
    const id = (attrs.match(/\bid="([^"]+)"/) || [])[1], cls = (attrs.match(/\bclass="([^"]*)"/) || [])[1] || '';
    if (/\bchip-btn\b/.test(cls)) out.push({ t, id, anc: ([...stack].reverse().find((s) => s.id) || {}).id, act: (attrs.match(/data-action="([^"]+)"/) || [])[1], seg: stack.some((s) => /segmented-control/.test(s.cls)) || /segmented-control/.test(cls) });
    if (!vd.has(t) && !/\/\s*$/.test(attrs)) stack.push({ t, id, cls });
  }
  return out;
}
test('S256AI contract: every static chip-btn is allowlisted, segmented (S1934), or an excluded tab', () => {
  const { C, S, X } = load();
  const bad = staticCensus().filter((o) => !o.seg && !(o.id && S.includes(o.id)) && !(o.anc && C.includes(o.anc)) && !(o.act && X.includes(o.act)));
  assert.deepStrictEqual(bad.map((o) => (o.id || o.anc) + ':' + o.act), []);
});
test('S256AI contract: every allowlisted container/self id still exists in static HTML (no dead entries)', () => {
  const { C, S } = load(); const cen = staticCensus();
  [...C, ...S].forEach((id) => assert.ok(cen.some((o) => o.id === id || o.anc === id), 'dead allowlist id: ' + id));
});
function walk(d, acc) { for (const f of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = d ? d + '/' + f.name : f.name; if (f.isDirectory()) { if (!/node_modules|^docs|^tests|regression-evidence|audit-sesi7/.test(f.name)) walk(p, acc); } else if (/\.js$/.test(f.name) && !/\.min\.js$/.test(f.name)) acc.push(p); } return acc; }
test('S256AI contract: every JS-rendered chip-btn template with data-action is classified', () => {
  const { A, X } = load(); const files = walk('modules', []).concat(['budget.js', 'laporan-export.js']);
  const found = new Set();
  files.forEach((f) => { if (/modals\.js$|a11y-|segmented-control/.test(f)) return;
    const s = rd(f); const re = /class=\\?"chip-btn[^"\\]*\\?"[^>]*?data-action=\\?"([^"\\]+)/g; let m; while ((m = re.exec(s))) found.add(m[1]); });
  const bad = [...found].filter((a) => !A.includes(a) && !X.includes(a));
  assert.deepStrictEqual(bad, []);
  assert.ok(found.size >= 8, 'scan found templates: ' + found.size);
});
