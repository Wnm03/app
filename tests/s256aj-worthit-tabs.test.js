'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = rd('modules/shared/a11y-tabs-worthit.js');
function node(id, active) {
  const attrs = {}, cls = new Set(active ? ['active'] : []);
  return { id, attrs, cls, clicked: 0, focused: 0, listeners: {}, parentElement: null,
    classList: { contains: (c) => cls.has(c), toggle: (c, f) => { f ? cls.add(c) : cls.delete(c); } },
    getAttribute: (k) => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = String(v); },
    addEventListener(t, f) { this.listeners[t] = f; }, click() { this.clicked++; }, focus() { this.focused++; } };
}
function setup() {
  const els = {}; const list = node('list'); const mos = [];
  ['wiTabBtnSingle', 'wiTabBtnList', 'wiTabBtnWatch'].forEach((id, i) => { els[id] = node(id, i === 0); els[id].parentElement = list; });
  ['wiTabSingle', 'wiTabList', 'wiTabWatch'].forEach((id) => { els[id] = node(id); });
  class MO { constructor(cb) { this.cb = cb; this.o = []; mos.push(this); } observe(t, o) { this.o.push([t, o]); } }
  const document = { getElementById: (id) => els[id] || null };
  const api = new Function('document', 'MutationObserver', src + ';return {sync:_a11yWorthItTabsSync,key:_a11yWiKey};')(document, MO);
  return { api, els, list, mos };
}
test('S256AJ: roles, aria-controls/labelledby and initial selection', () => {
  const { api, els, list } = setup();
  assert.ok(api.sync() > 0);
  assert.strictEqual(list.attrs.role, 'tablist');
  assert.strictEqual(els.wiTabBtnList.attrs.role, 'tab'); assert.strictEqual(els.wiTabBtnList.attrs['aria-controls'], 'wiTabList');
  assert.strictEqual(els.wiTabList.attrs.role, 'tabpanel'); assert.strictEqual(els.wiTabList.attrs['aria-labelledby'], 'wiTabBtnList');
  assert.deepStrictEqual(['wiTabBtnSingle', 'wiTabBtnList', 'wiTabBtnWatch'].map((i) => els[i].attrs['aria-selected'] + '/' + els[i].attrs.tabindex), ['true/0', 'false/-1', 'false/-1']);
});
test('S256AJ: idempotent; class-only single observer; follows class change', () => {
  const { api, els, mos } = setup(); api.sync();
  assert.strictEqual(api.sync(), 0); assert.strictEqual(mos.length, 1);
  assert.deepStrictEqual(mos[0].o[0][1].attributeFilter, ['class']); assert.ok(!mos[0].o[0][1].childList);
  els.wiTabBtnSingle.classList.toggle('active', false); els.wiTabBtnWatch.classList.toggle('active', true); mos[0].cb([]);
  assert.strictEqual(els.wiTabBtnWatch.attrs['aria-selected'], 'true'); assert.strictEqual(els.wiTabBtnWatch.attrs.tabindex, '0');
  assert.strictEqual(els.wiTabBtnSingle.attrs.tabindex, '-1');
});
test('S256AJ: arrow/Home/End keys activate via click() and move focus; other keys ignored', () => {
  const { api, els } = setup(); api.sync();
  const ev = (key, target) => ({ key, target, preventDefault() { this.p = true; } });
  const e1 = ev('ArrowRight', els.wiTabBtnSingle); assert.ok(api.key(e1)); assert.strictEqual(els.wiTabBtnList.clicked, 1); assert.strictEqual(els.wiTabBtnList.focused, 1); assert.ok(e1.p);
  api.key(ev('ArrowLeft', els.wiTabBtnSingle)); assert.strictEqual(els.wiTabBtnWatch.clicked, 1);
  api.key(ev('Home', els.wiTabBtnWatch)); assert.strictEqual(els.wiTabBtnSingle.clicked, 1);
  api.key(ev('End', els.wiTabBtnSingle)); assert.strictEqual(els.wiTabBtnWatch.clicked, 2);
  assert.strictEqual(api.key(ev('a', els.wiTabBtnSingle)), false);
});
test('S256AJ: absent modal -> 0, never writes class', () => {
  const api = new Function('document', 'MutationObserver', src + ';return _a11yWorthItTabsSync;')({ getElementById: () => null }, undefined);
  assert.strictEqual(api(), 0);
  assert.ok(!/classList\.(add|remove|toggle)/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
});
test('S256AJ: hooks (install + rAF) and single registration in build.js', () => {
  assert.strictEqual((rd('modules/shared/a11y-action-controls.js').match(/_a11yWorthItTabsSync/g) || []).length, 4);
  const b = rd('scripts/build.js'); assert.strictEqual((b.match(/a11y-tabs-worthit\.js/g) || []).length, 1);
});
test('S256AJ: markup contract — 3 tab buttons + 3 panels exist in modal HTML', () => {
  const m = rd('modules/modals.js'); ['wiTabBtnSingle', 'wiTabBtnList', 'wiTabBtnWatch', 'wiTabSingle', 'wiTabList', 'wiTabWatch'].forEach((id) => assert.ok(m.includes(id), id));
});
