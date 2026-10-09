'use strict';
// S2288 — regresi perbaikan performa boot/navigasi/Dashboard/Car Notes
// (lihat AUDIT-S2288-PERFORMA-BOOT-NAV-DASHBOARD-CARNOTES.md).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function loadTaxonomy(groups) {
  const g = { SERVICE_CHECKLIST_GROUPS: groups };
  g.globalThis = g;
  vm.runInNewContext(read('modules/vehicle/service-taxonomy-sot.js'), g);
  return g;
}
const mkGroups = () => [
  { masterCategoryId: 'servis-mesin', group: 'Mesin', icon: 'M', items: [{ id: 'oli-mesin', name: 'Oli Mesin' }, { id: 'busi', name: 'Busi' }] },
  { masterCategoryId: 'servis-cvt', group: 'CVT', items: [{ id: 'v-belt-cvt', name: 'V-Belt' }] },
];

test('S2288 taxonomy: components()/categories() di-cache (identitas sama) & lookup via Map', () => {
  const g = loadTaxonomy(mkGroups());
  const T = g.ServiceTaxonomySOT;
  assert.equal(T.components(), T.components());
  assert.equal(T.categories(), T.categories());
  assert.equal(T.componentById('busi').masterCategoryId, 'servis-mesin');
  assert.equal(T.componentById(' busi ').id, 'busi');
  assert.equal(T.categoryById('servis-cvt').name, 'CVT');
  assert.equal(T.componentById('tidak-ada'), null);
  assert.equal(T.resolve({ name: 'v-belt (cvt)' }).serviceComponentId, 'v-belt-cvt');
});

test('S2288 taxonomy: cache tervalidasi ulang saat sumber grup berubah / invalidate()', () => {
  const groups = mkGroups();
  const g = loadTaxonomy(groups);
  const T = g.ServiceTaxonomySOT;
  const before = T.components();
  assert.equal(before.length, 3);
  groups[1].items.push({ id: 'roller', name: 'Roller' });
  assert.equal(T.components().length, 4, 'jumlah item berubah -> cache dibangun ulang');
  assert.equal(T.componentById('roller').masterCategoryId, 'servis-cvt');
  g.SERVICE_CHECKLIST_GROUPS = [groups[0]];
  assert.equal(T.components().length, 2, 'array sumber diganti -> cache dibangun ulang');
  T.invalidate();
  assert.equal(T.components().length, 2);
});

test('S2288 input-catalog: itemById memakai indeks Map & mengikuti perubahan sumber', () => {
  const groups = mkGroups();
  const g = { SERVICE_CHECKLIST_GROUPS: groups, escapeHtml: x => x };
  g.globalThis = g; g.window = g;
  vm.runInNewContext(read('modules/vehicle/service-input-catalog.js'), g);
  const C = g.ServiceInputCatalog;
  assert.equal(C.itemById('busi').group.masterCategoryId, 'servis-mesin');
  assert.equal(C.itemById('nope'), null);
  groups[0].items.push({ id: 'filter-oli', name: 'Filter Oli' });
  assert.equal(C.itemById('filter-oli').item.name, 'Filter Oli');
});

test('S2288 render scope: memo hanya di dalam kwRenderScope, dibuang sesudahnya & saat invalidate', () => {
  const src = read('modules/shared/modules-render.js');
  const start = src.indexOf('let _kwScopeDepth=0');
  const end = src.indexOf('function renderPageContent(name){');
  const ctx = {};
  vm.runInNewContext(src.slice(start, end) + ';this.kwRenderScope=kwRenderScope;this.kwScopeMemo=kwScopeMemo;this.kwScopeInvalidate=kwScopeInvalidate;', ctx);
  let n = 0;
  const f = () => ++n;
  assert.equal(ctx.kwScopeMemo('k', f), 1);
  assert.equal(ctx.kwScopeMemo('k', f), 2, 'di luar scope: tidak ada memo (perilaku lama)');
  n = 0;
  ctx.kwRenderScope(() => {
    assert.equal(ctx.kwScopeMemo('k', f), 1);
    assert.equal(ctx.kwScopeMemo('k', f), 1);
    ctx.kwRenderScope(() => assert.equal(ctx.kwScopeMemo('k', f), 1, 'scope bersarang berbagi cache'));
    ctx.kwScopeInvalidate();
    assert.equal(ctx.kwScopeMemo('k', f), 2, 'invalidate (save()) membuang memo');
  });
  assert.equal(ctx.kwScopeMemo('k', f), 3, 'scope terluar selesai -> cache dibuang');
});

test('S2288 wiring: renderPageContent di-scope, save() invalidate, predictService & last-km memakai memo', () => {
  assert.match(read('modules/shared/modules-render.js'), /function renderPageContent\(name\)\{\s*return kwRenderScope\(/);
  assert.match(read('modules/shared/features-helpers-global-security.js'), /function save\(opts\)\{\s*if\(typeof kwScopeInvalidate==='function'\)kwScopeInvalidate\(\);/);
  const sb = read('modules/vehicle/sparepart-servis-b.js');
  assert.match(sb, /function predictService\(args\)\{[\s\S]{0,400}kwScopeMemo\('predict\|'/);
  assert.match(read('modules/vehicle/servis-b.js'), /getLastServiceKmForCat\(vehicleId,cat,actionTypeFilter,forReminder\)\{[\s\S]{0,900}kwScopeMemo\('histRows\|'/);
});

test('S2288 getLastServiceKmForCat: satu lintasan memilih baris terbaru (tanpa sort penuh), hasil sama dgn definisi lama', () => {
  const s = read('modules/vehicle/servis-b.js');
  const i = s.indexOf('getLastServiceKmForCat(vehicleId,cat,actionTypeFilter,forReminder){');
  const body = s.slice(i, s.indexOf('_matchesActionTypeForReset(log,cat'));
  assert.doesNotMatch(body, /\.sort\(/);
  // eksekusi: ambil method sebagai fungsi mandiri
  const Servis = {};
  const code = 'this.m={' + body.replace(/\},\s*$/, '}') + '}';
  const ctx = {
    D: { servisLogs: [] },
    Servis,
    servisLogMatchesCat: (s2, cat) => s2.cat === cat.id,
    compareServiceHistoryRecency: (a, b) => String(b.date).localeCompare(String(a.date)) || Number(b.km) - Number(a.km),
  };
  vm.runInNewContext(code, ctx);
  Object.assign(Servis, ctx.m, { _matchesActionTypeForReset: () => true });
  ctx.D.servisLogs = [
    { vehicleId: 'v1', cat: 'c1', date: '2026-01-01', km: 1000 },
    { vehicleId: 'v1', cat: 'c1', date: '2026-05-01', km: 5000 },
    { vehicleId: 'v1', cat: 'c2', date: '2026-09-01', km: 9000 },
    { vehicleId: 'v1', cat: 'c1', date: '2026-03-01', km: 0 },
    { vehicleId: 'v2', cat: 'c1', date: '2026-10-01', km: 12000 },
  ];
  assert.equal(Servis.getLastServiceKmForCat('v1', { id: 'c1' }), 5000);
  assert.equal(Servis.getLastServiceKmForCat('v1', { id: 'c2' }), 9000);
  assert.equal(Servis.getLastServiceKmForCat('v1', { id: 'c9' }), null);
});

test('S2288 self-test otomatis OPT-IN, penanda build ditulis sebelum run, catch aman', () => {
  const be = read('modules/shared/boot-early.js');
  assert.match(be, /function _kwSelfTestAutoEnabled\(\)/);
  assert.match(be, /setTimeout\(\(\)=>\{\s*if\(!_kwSelfTestAutoEnabled\(\)\)return;/);
  const st = read('self-test.js');
  assert.ok(st.indexOf("safeSetItem('kw_selftest_build',APP_BUILD_VERSION);") < st.indexOf('const data=await computeSelfTestResults();\nsaveSelfTestState(data);'));
  assert.match(st, /name:\(c&&c\.name\)\|\|/);
});

test('S2288 smoke-test: banner merah hanya utk dev eksplisit', () => {
  assert.match(read('modules/shared/smoke-test.js'), /function showBanner\(text\) \{\s*if \(!explicitDev\(\)\) return;/);
});

// ---- S2288 sesi lanjutan: B1 + B4 ----
const _fs2 = require('node:fs'), _path2 = require('node:path');
const _rd = (f) => _fs2.readFileSync(_path2.join(__dirname, '..', f), 'utf8');
test('S2288 B1: renderCnTab dibungkus kwRenderScope saat runtime TANPA mengubah teks fungsi aslinya', () => {
  const src = _rd('modules/shared/modules-render-b.js');
  assert.match(src, /window\.renderCnTab=function renderCnTabScoped\(\)/);
  assert.match(src, /kwRenderScope\(function\(\)\{return _renderCnTabRaw\.apply\(self,args\);\}\)/);
  assert.match(src, /function renderCnTab\(\)\{\n\/\/ CAR NOTES PERFORMANCE GUARD/);
});
test('S2288 B4: dispatcher data-action punya loader utk pemilik modal lazy (RenovCalc & katalog/scanner kendaraan)', () => {
  const src = _rd('modules/shared/features-helpers-global-security.js');
  const i = src.indexOf('const lazyOwnerLoaders={');
  const blk = src.slice(i, src.indexOf('};', i));
  for (const k of ['RenovCalc', 'VehicleCatalogImportUI', 'VehicleCatalogWebImportUI', 'SparepartScannerUI', 'SparepartOcrCatalogAdd']) {
    assert.match(blk, new RegExp(k + ':\\s*typeof ensure'), k + ' harus punya loader lazy');
  }
});

// S2288-d B1: Servis.renderList/renderReminder dibungkus kwRenderScope saat runtime (jalur sub-tab/riwayat langsung).
test('S2288-d: Servis.renderList/renderReminder dibungkus scope & tetap meneruskan this/args/return', () => {
  const src = read('modules/vehicle/servis-b.js');
  const tail = src.slice(src.indexOf('S2288-d B1 PERF'));
  assert.ok(tail.length > 0, 'blok wrapper S2288-d harus ada');
  let depthSeen = 0;
  const calls = [];
  const Servis = {
    renderList(o) { calls.push(['list', this === Servis, o]); return 'L'; },
    renderReminder() { calls.push(['rem', this === Servis]); return 'R'; },
  };
  const sandbox = { Servis, kwRenderScope(fn) { depthSeen++; return fn(); } };
  vm.runInNewContext(tail.replace(/^[^\n]*\n[^\n]*\n[^\n]*\n/, ''), sandbox);
  assert.equal(Servis.renderList({ skipReminder: true }), 'L');
  assert.equal(Servis.renderReminder(), 'R');
  assert.equal(depthSeen, 2, 'kedua jalur harus lewat kwRenderScope');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['list', true, { skipReminder: true }], ['rem', true]]);
  assert.ok(Servis.renderList.__kwScoped && Servis.renderReminder.__kwScoped);
  // idempoten: menjalankan blok kedua kali tidak membungkus ganda
  const w1 = Servis.renderList;
  vm.runInNewContext(tail.replace(/^[^\n]*\n[^\n]*\n[^\n]*\n/, ''), sandbox);
  assert.equal(Servis.renderList, w1);
});

// S2288-d B4: #nextPulang tidak ada di HTML manapun; lookup tanpa guard melempar TypeError.
test('S2288-d: lookup #nextPulang null-safe di renderLDR & saveLDR', () => {
  const r = read('modules/shared/modules-render.js');
  const t = read('modules/finance/transaksi-b.js');
  assert.ok(!/document\.getElementById\('nextPulang'\)\.value/.test(r), 'renderLDR tidak boleh deref langsung');
  assert.ok(!/document\.getElementById\('nextPulang'\)\.value/.test(t), 'saveLDR tidak boleh deref langsung');
  assert.ok(/_np=document\.getElementById\('nextPulang'\)/.test(r) && /_np=document\.getElementById\('nextPulang'\)/.test(t));
});
