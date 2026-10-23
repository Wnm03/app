'use strict';
// S2703 — tes karakterisasi (differential) untuk optimasi render Insight:
//  (1) ServiceInputCatalog.infer(): indeks nama + cache hasil (modules/vehicle/service-input-catalog.js)
//  (2) estimateKmPerDay() / getFuelFullTankSegments(): memo per render-scope (modules/vehicle/vehicle-core.js)
// Implementasi lama dibekukan di tests/fixtures/s2703-*-original.js; yang baru HARUS identik
// (nilai, urutan, perilaku error, isolasi mutasi) dan invalid otomatis saat sumber berubah.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const MASTER = require('../modules/vehicle/service-master-data.generated.js').SERVICE_CHECKLIST_GROUPS;
const J = (v) => JSON.stringify(v);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const clone = (v) => JSON.parse(J(v));

// ---------- (1) infer ----------
function loadCatalog(file, groups) {
  const ctx = { console, window: null, escapeHtml: (x) => String(x), SERVICE_CHECKLIST_GROUPS: groups };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(file, ctx);
  return ctx;
}
const NEW_CAT = read('modules/vehicle/service-input-catalog.js');
const OLD_CAT = read('tests/fixtures/s2703-service-input-catalog-original.js');
function pair(groupsFactory) {
  return { n: loadCatalog(NEW_CAT, groupsFactory()), r: loadCatalog(OLD_CAT, groupsFactory()) };
}
function sameInfer(n, r, q, msg) {
  let a, b, ea = null, eb = null;
  try { a = n.ServiceInputCatalog.infer(q); } catch (e) { ea = e.constructor.name; }
  try { b = r.ServiceInputCatalog.infer(q); } catch (e) { eb = e.constructor.name; }
  assert.equal(ea, eb, 'error ' + msg);
  assert.equal(J(a), J(b), msg + ' :: ' + q);
  return a;
}

test('infer: katalog master asli identik dengan implementasi lama (nama persis, variasi, keyword, kosong, acak)', () => {
  const { n, r } = pair(() => MASTER);
  const queries = ['', '   ', null, undefined, 0, 'zzz tidak ada', 'Oli Mesin', 'ganti oli mesin', 'v-belt', 'roller cvt', 'kampas rem depan', 'ban', 'aki', 'body', 'oli', 'xyz'];
  for (const g of MASTER) for (const it of g.items) { queries.push(it.name, '  ' + it.name.toUpperCase() + ' ', 'servis ' + it.name + ' rutin'); }
  const rnd = (() => { let s = 7; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
  for (let i = 0; i < 300; i++) queries.push(Array.from({ length: 2 + Math.floor(rnd() * 12) }, () => String.fromCharCode(97 + Math.floor(rnd() * 26))).join(''));
  for (const q of queries) { sameInfer(n, r, q, 'master'); sameInfer(n, r, q, 'master (kedua, dari cache)'); }
});

test('infer: referensi group/item sama dengan katalog, objek hasil BARU tiap panggilan (mutasi tidak mencemari)', () => {
  const { n } = pair(() => MASTER);
  const a = n.ServiceInputCatalog.infer('busi');
  assert.ok(a && a.item, 'busi harus ketemu');
  assert.ok(n.ServiceInputCatalog.groups().includes(a.group));
  assert.ok(a.group.items.includes(a.item));
  a.item = null; a.group = null; a.extra = 1;
  const b = n.ServiceInputCatalog.infer('busi');
  assert.ok(b.item && b.group && b.extra === undefined);
  assert.notEqual(a, b);
  const k1 = n.ServiceInputCatalog.infer('v-belt'), k2 = n.ServiceInputCatalog.infer('v-belt');
  assert.notEqual(k1, k2);
  assert.equal(k1.group, k2.group);
});

test('infer: invalid otomatis saat katalog berubah (array diganti, push in-place, grup baru, item dihapus)', () => {
  const mk = () => ({ g: clone(MASTER) });
  const a = mk(), b = mk();
  const n = loadCatalog(NEW_CAT, a.g), r = loadCatalog(OLD_CAT, b.g);
  sameInfer(n, r, 'kompetitor baru xx', 'sebelum');
  for (const c of [a.g, b.g]) c[0].items.push({ id: 'item-baru-xx', name: 'Kompetitor Baru XX' });
  assert.ok(sameInfer(n, r, 'kompetitor baru xx', 'push in-place').item, 'item baru harus ketemu');
  for (const c of [a.g, b.g]) c.push({ masterCategoryId: 'grup-baru', group: 'Grup Baru', items: [{ id: 'g-1', name: 'Zeta Unik' }] });
  assert.ok(sameInfer(n, r, 'zeta unik', 'grup baru').item);
  for (const c of [a.g, b.g]) c[0].items.pop();
  assert.equal(sameInfer(n, r, 'kompetitor baru xx', 'item dihapus'), null);
  for (const c of [a.g, b.g]) c[1].items = [{ id: 'ganti', name: 'Ganti Array Total' }];
  assert.ok(sameInfer(n, r, 'ganti array total', 'items diganti array baru').item);
  // groups() mengembalikan array lain total
  const alt = [{ masterCategoryId: 'x', group: 'X', items: [{ id: 'x1', name: 'Hanya Ini' }] }];
  n.SERVICE_CHECKLIST_GROUPS = alt; r.SERVICE_CHECKLIST_GROUPS = alt;
  vm.runInContext('SERVICE_CHECKLIST_GROUPS=this.SERVICE_CHECKLIST_GROUPS', n); vm.runInContext('SERVICE_CHECKLIST_GROUPS=this.SERVICE_CHECKLIST_GROUPS', r);
  assert.ok(sameInfer(n, r, 'hanya ini', 'array groups diganti').item);
  assert.equal(sameInfer(n, r, 'busi', 'array groups diganti (lama hilang)') && 0, 0);
});

test('infer: bentuk katalog tak terduga memakai jalur lama (perilaku & error identik)', () => {
  const shapes = {
    'grup null': () => [null, { masterCategoryId: 'a', items: [{ name: 'busi' }] }],
    'item null': () => [{ masterCategoryId: 'a', items: [null, { name: 'busi' }] }],
    'items bukan array': () => [{ masterCategoryId: 'a', items: 'busi' }],
    'tanpa items': () => [{ masterCategoryId: 'a' }, { masterCategoryId: 'b', items: [{ name: 'oli' }] }],
    'nama kosong': () => [{ masterCategoryId: 'a', items: [{ name: '' }, { name: 'busi' }] }],
    'nama bukan string': () => [{ masterCategoryId: 'a', items: [{ name: 123 }, { name: null }, { name: 'busi' }] }],
    'groups kosong': () => [],
  };
  for (const [label, f] of Object.entries(shapes)) {
    const { n, r } = pair(f);
    for (const q of ['busi', 'oli', '12', 'x', 'rem']) { sameInfer(n, r, q, label); sameInfer(n, r, q, label + ' (ulang)'); }
  }
  // groups() bukan array
  const n = loadCatalog(NEW_CAT, 'bukan-array'), r = loadCatalog(OLD_CAT, 'bukan-array');
  for (const q of ['busi', 'rem']) sameInfer(n, r, q, 'groups bukan array');
});

test('infer: cache dibatasi ukurannya (tidak tumbuh tanpa batas oleh teks acak) dan tetap benar sesudah reset', () => {
  const { n, r } = pair(() => MASTER);
  for (let i = 0; i < 2600; i++) sameInfer(n, r, 'teks acak ' + i, 'batas');
  sameInfer(n, r, 'busi', 'setelah banyak entri'); sameInfer(n, r, 'teks acak 5', 'setelah reset cache');
});

// ---------- (2) fuel ----------
function sliceBetween(src, a, b) { const i = src.indexOf(a), j = src.indexOf(b); assert.ok(i >= 0 && j > i, 'marker ' + a); return src.slice(i, j); }
const NEW_CORE = read('modules/vehicle/vehicle-core.js');
const NEW_FUEL = sliceBetween(NEW_CORE, 'function estimateKmPerDay(', 'function estimateServiceDateISO') + '\n' + sliceBetween(NEW_CORE, 'function getFuelFullTankSegments(', '// getFuelConsumptionSummary');
const OLD_FUEL = read('tests/fixtures/s2703-vehicle-core-fuel-original.js');

function loadFuel(code, D, withScope) {
  const ctx = { console, Date, Math, Number, Array, Object, String, Map, JSON, isFinite, D, calls: 0 };
  ctx.window = ctx; ctx.globalThis = ctx;
  if (withScope) {
    // salinan semantik persis kwRenderScope/kwScopeMemo/kwScopeInvalidate (modules-render.js)
    vm.createContext(ctx);
    vm.runInContext(`let _kwScopeDepth=0,_kwScopeCache=null;
function kwRenderScope(fn){_kwScopeDepth++;if(!_kwScopeCache)_kwScopeCache=new Map();try{return fn();}finally{_kwScopeDepth--;if(_kwScopeDepth<=0){_kwScopeDepth=0;_kwScopeCache=null;}}}
function kwScopeMemo(key,compute){if(!_kwScopeCache)return compute();if(_kwScopeCache.has(key))return _kwScopeCache.get(key);const v=compute();_kwScopeCache.set(key,v);return v;}
function kwScopeInvalidate(){if(_kwScopeCache)_kwScopeCache.clear();}`, ctx);
  } else vm.createContext(ctx);
  vm.runInContext(code + '\nthis.estimateKmPerDay=estimateKmPerDay;this.getFuelFullTankSegments=getFuelFullTankSegments;', ctx);
  return ctx;
}
function makeData(seed) {
  const rnd = (() => { let s = seed; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
  const iso = (d) => new Date(Date.UTC(2025, 0, 1) + d * 864e5).toISOString().slice(0, 10);
  const bbm = [], km = [];
  for (const vid of ['veh_1', 2, '2', 'veh_x']) {
    let odo = 1000;
    for (let i = 0; i < 80; i++) {
      odo += Math.round(rnd() * 90);
      const r = rnd();
      bbm.push({ id: bbm.length, vehicleId: vid, date: r < 0.05 ? '' : iso(Math.floor(rnd() * 400)), km: r < 0.08 ? null : odo, liter: r < 0.06 ? 0 : +(2 + rnd() * 8).toFixed(2), harga: r < 0.1 ? 0 : 10000, cost: r < 0.3 ? 0 : Math.round(20000 + rnd() * 90000), fullTank: rnd() < 0.5 });
      if (i % 5 === 0) km.push({ id: km.length, vehicleId: vid, date: iso(Math.floor(rnd() * 400)), km: odo + Math.round(rnd() * 20) });
    }
  }
  bbm.push({ id: 'dup1', vehicleId: 'veh_1', date: '2025-03-03', km: 5000, liter: 4, cost: 40000, fullTank: true }, { id: 'dup2', vehicleId: 'veh_1', date: '2025-03-03', km: 5000, liter: 4, cost: 40000, fullTank: true });
  return { bbmLogs: bbm, kmLogs: km };
}

test('fuel: estimateKmPerDay & getFuelFullTankSegments identik dgn implementasi lama (di luar & di dalam scope)', () => {
  for (const seed of [1, 2, 3, 99]) {
    const data = makeData(seed);
    const o = loadFuel(OLD_FUEL, clone(data), false);
    const nOut = loadFuel(NEW_FUEL, clone(data), true);
    const nIn = loadFuel(NEW_FUEL, clone(data), true);
    for (const vid of ['veh_1', 2, '2', 'veh_x', 'tidak-ada', null, undefined]) {
      const k = J(o.estimateKmPerDay(vid)), s = J(o.getFuelFullTankSegments(vid));
      assert.equal(J(nOut.estimateKmPerDay(vid)), k, 'kmPerDay luar scope ' + String(vid));
      assert.equal(J(nOut.getFuelFullTankSegments(vid)), s, 'segmen luar scope ' + String(vid));
      nIn.kwRenderScope(() => {
        for (let rep = 0; rep < 3; rep++) {
          assert.equal(J(nIn.estimateKmPerDay(vid)), k, 'kmPerDay dalam scope ' + String(vid));
          assert.equal(J(nIn.getFuelFullTankSegments(vid)), s, 'segmen dalam scope ' + String(vid));
        }
      });
    }
  }
});

test('fuel: tipe id dibedakan (2 vs "2") persis seperti implementasi lama di dalam scope', () => {
  const data = makeData(5);
  const o = loadFuel(OLD_FUEL, clone(data), false), n = loadFuel(NEW_FUEL, clone(data), true);
  n.kwRenderScope(() => {
    assert.equal(J(n.getFuelFullTankSegments(2)), J(o.getFuelFullTankSegments(2)));
    assert.equal(J(n.getFuelFullTankSegments('2')), J(o.getFuelFullTankSegments('2')));
    assert.equal(J(n.estimateKmPerDay(2)), J(o.estimateKmPerDay(2)));
    assert.equal(J(n.estimateKmPerDay('2')), J(o.estimateKmPerDay('2')));
  });
});

test('fuel: memo hanya hidup di dalam scope; mutasi segmen tidak mencemari; scope selesai/invalidate membuang cache', () => {
  const data = makeData(11);
  const n = loadFuel(NEW_FUEL, clone(data), true);
  let reads = 0;
  const bbm = n.D.bbmLogs;
  n.D.bbmLogs = new Proxy(bbm, { get(t, p, rcv) { if (p === 'filter') reads++; return Reflect.get(t, p, rcv); } });
  n.getFuelFullTankSegments('veh_1'); n.getFuelFullTankSegments('veh_1');
  const outsideReads = reads; assert.ok(outsideReads >= 2, 'di luar scope tiap panggilan menghitung ulang');
  reads = 0;
  n.kwRenderScope(() => {
    const a = n.getFuelFullTankSegments('veh_1');
    const afterFirst = reads;
    a.forEach((s) => { s.km = -1; s.liter = -1; }); a.pop();
    const b = n.getFuelFullTankSegments('veh_1');
    assert.equal(reads, afterFirst, 'panggilan kedua di scope tidak membaca bbmLogs lagi');
    assert.ok(b.length > 0 && b.every((s) => s.km > 0 && s.liter > 0), 'mutasi pemanggil tidak mencemari');
    n.estimateKmPerDay('veh_1'); const r1 = reads; n.estimateKmPerDay('veh_1'); assert.equal(reads, r1, 'kmPerDay di-memo dalam scope');
    n.kwScopeInvalidate(); // = save()
    n.getFuelFullTankSegments('veh_1'); assert.ok(reads > r1, 'setelah invalidate dihitung ulang');
  });
  reads = 0; n.getFuelFullTankSegments('veh_1'); assert.ok(reads > 0, 'setelah scope selesai tidak ada sisa cache');
});

test('fuel: data berubah ANTAR scope langsung terlihat (tanpa data basi)', () => {
  const data = makeData(21);
  const o = loadFuel(OLD_FUEL, clone(data), false), n = loadFuel(NEW_FUEL, clone(data), true);
  n.kwRenderScope(() => n.getFuelFullTankSegments('veh_1'));
  for (const c of [o, n]) c.D.bbmLogs.push({ id: 'baru', vehicleId: 'veh_1', date: '2026-01-01', km: 99999, liter: 5, cost: 50000, fullTank: true });
  n.kwRenderScope(() => {
    assert.equal(J(n.getFuelFullTankSegments('veh_1')), J(o.getFuelFullTankSegments('veh_1')));
    assert.equal(J(n.estimateKmPerDay('veh_1')), J(o.estimateKmPerDay('veh_1')));
  });
});

test('fuel: tanpa kwScopeMemo (konteks tes unit lain) berperilaku persis lama', () => {
  const data = makeData(31);
  const o = loadFuel(OLD_FUEL, clone(data), false), n = loadFuel(NEW_FUEL, clone(data), false);
  assert.equal(typeof n.kwScopeMemo, 'undefined');
  for (const vid of ['veh_1', 2, 'veh_x']) {
    assert.equal(J(n.estimateKmPerDay(vid)), J(o.estimateKmPerDay(vid)));
    assert.equal(J(n.getFuelFullTankSegments(vid)), J(o.getFuelFullTankSegments(vid)));
  }
});
