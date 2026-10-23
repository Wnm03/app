'use strict';
// S2704 — servisLogMatchesCat: memo per render-scope (modules/vehicle/sparepart-servis.js).
// Tes diferensial terhadap implementasi lama yang dibekukan di tests/fixtures/s2704-sparepart-servis-original.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function extract(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name + ' tidak ditemukan');
  let i = src.indexOf('{', start), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(start, i + 1);
}
const scopeSrc = extract(read('modules/shared/modules-render.js'), 'kwRenderScope') + '\n' +
  extract(read('modules/shared/modules-render.js'), 'kwScopeMemo') + '\n' +
  extract(read('modules/shared/modules-render.js'), 'kwScopeInvalidate');

function load(file, withScope) {
  const ctx = { console, calls: 0, D: { sparepartCats: [] }, serviceComponentIdForCategory: (c) => (c && c.serviceComponentId) || null };
  ctx.ServiceHistoryReminderReconciliationSOT = {
    match: (s, cat) => { ctx.calls++; return { ok: !!(s && cat && s.item && cat.name && String(s.item).toLowerCase().includes(String(cat.name).toLowerCase())) }; }
  };
  vm.createContext(ctx);
  const parts = ['let _kwScopeDepth=0,_kwScopeCache=null;', withScope ? scopeSrc : ''];
  const fnNames = ['servisLogMatchesCat', '_servisLogMatchesCatImpl'];
  fnNames.forEach((n) => { if (file.includes('function ' + n + '(')) parts.push(extract(file, n)); });
  parts.push('this.servisLogMatchesCat=servisLogMatchesCat;' + (withScope ? 'this.kwRenderScope=kwRenderScope;this.kwScopeInvalidate=kwScopeInvalidate;' : ''));
  vm.runInContext(parts.join('\n'), ctx);
  return ctx;
}
const NEW = read('modules/vehicle/sparepart-servis.js');
const OLD = read('tests/fixtures/s2704-sparepart-servis-original.js');

const logs = ['Oli mesin', 'Kampas rem', 'oli', '', 'Busi'].map((item, i) => ({ id: 'l' + i, item, vehicleId: 'v1' }));
const cats = ['Oli', 'Rem', 'Busi'].map((name, i) => ({ id: 'c' + i, name }));

test('hasil identik dengan implementasi lama (di dalam & di luar scope)', () => {
  const n = load(NEW, true), r = load(OLD, false);
  for (const s of logs) for (const c of cats) {
    const expected = r.servisLogMatchesCat(s, c);
    assert.equal(n.servisLogMatchesCat(s, c), expected, 'luar scope');
    n.kwRenderScope(() => assert.equal(n.servisLogMatchesCat(s, c), expected, 'dalam scope'));
  }
});

test('di dalam scope: pemanggilan berulang hanya menghitung sekali per pasangan', () => {
  const n = load(NEW, true);
  n.kwRenderScope(() => {
    for (let k = 0; k < 10; k++) for (const s of logs) for (const c of cats) n.servisLogMatchesCat(s, c);
  });
  assert.equal(n.calls, logs.length * cats.length);
});

test('di luar scope: tidak ada memo (perilaku lama)', () => {
  const n = load(NEW, true);
  for (let k = 0; k < 3; k++) n.servisLogMatchesCat(logs[0], cats[0]);
  assert.equal(n.calls, 3);
});

test('memo dibuang saat scope selesai dan saat kwScopeInvalidate (save)', () => {
  const n = load(NEW, true);
  n.kwRenderScope(() => { n.servisLogMatchesCat(logs[0], cats[0]); });
  n.kwRenderScope(() => { n.servisLogMatchesCat(logs[0], cats[0]); });
  assert.equal(n.calls, 2);
  n.kwRenderScope(() => {
    n.servisLogMatchesCat(logs[0], cats[0]);
    n.kwScopeInvalidate();
    n.servisLogMatchesCat(logs[0], cats[0]);
  });
  assert.equal(n.calls, 4);
});

test('argumen null/non-objek memakai jalur lama tanpa melempar di memo', () => {
  const n = load(NEW, true), r = load(OLD, false);
  n.kwRenderScope(() => {
    for (const [s, c] of [[null, cats[0]], [logs[0], null], [undefined, undefined]]) {
      let a, b;
      try { a = n.servisLogMatchesCat(s, c); } catch (e) { a = 'ERR:' + e.constructor.name; }
      try { b = r.servisLogMatchesCat(s, c); } catch (e) { b = 'ERR:' + e.constructor.name; }
      assert.equal(a, b);
    }
  });
});
