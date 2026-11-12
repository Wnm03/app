'use strict';
// S2799 — (1) SelectSearch: logika murni (dedupe, filter, optgroup) + kontrak sumber;
//         (2) proyeksi kategori satu-sumber untuk stockCatId / txStockCategoryFilter / txStockItem.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const plain = (v) => JSON.parse(JSON.stringify(v));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SEARCH_SRC = read('modules/shared/select-search.js');
const CRUD_SRC = read('modules/vehicle/part-crud-s2041.js');

/* ---------- SelectSearch ---------- */
function loadSearch() {
  const noop = () => {};
  const document = { addEventListener: noop, body: {} };
  const win = { addEventListener: noop, matchMedia: () => ({ matches: false }) };
  const sb = { document, window: win, globalThis: win, Event: function () {}, MutationObserver: function () {} };
  sb.window = Object.assign(win, { document });
  vm.createContext(sb);
  vm.runInContext(SEARCH_SRC.replace("typeof window !== 'undefined' ? window : globalThis", 'window'), sb);
  return win.SelectSearch;
}
const opt = (value, label, extra) => Object.assign({ nodeName: 'OPTION', value, label, textContent: label, hidden: false, disabled: false }, extra || {});
const grp = (label, kids) => ({ nodeName: 'OPTGROUP', label, hidden: false, children: kids });
const fakeSelect = (children, value) => ({ nodeName: 'SELECT', children, value: value === undefined ? '' : value, multiple: false, disabled: false, size: 0, hasAttribute: () => false, classList: { contains: () => false }, closest: () => null });

test('SelectSearch: opsi dengan value kembar dilebur, value berbeda senama TIDAK dilebur', () => {
  const S = loadSearch();
  const items = S.buildItems(fakeSelect([opt('', '— Pilih —'), opt('a', 'Oli Mesin'), opt('a', 'Oli Mesin (salinan)'), opt('b', 'Oli Mesin')]));
  assert.deepStrictEqual(plain(items.map((i) => i.value)), ['', 'a', 'b']);
});

test('SelectSearch: opsi kosong dilebur hanya bila labelnya sama', () => {
  const S = loadSearch();
  assert.strictEqual(S.buildItems(fakeSelect([opt('', 'Pilih'), opt('', 'Pilih')])).length, 1);
  assert.strictEqual(S.buildItems(fakeSelect([opt('', 'Pilih'), opt('', 'Semua')])).length, 2);
});

test('SelectSearch: pencarian tanpa aksen, tanpa pengaruh huruf besar/kecil, dan mencakup optgroup', () => {
  const S = loadSearch();
  const items = S.buildItems(fakeSelect([grp('Kendaraan', [opt('v1', 'Honda Béat')]), opt('x', 'Busi')]));
  assert.strictEqual(S.filterItems(items, 'BEAT').length, 1);
  assert.strictEqual(S.filterItems(items, 'kendaraan').length, 1, 'cocok lewat nama grup');
  assert.strictEqual(S.filterItems(items, 'honda  beat').length, 1, 'spasi ganda diabaikan');
  assert.strictEqual(S.filterItems(items, 'zzz').length, 0);
  assert.strictEqual(S.filterItems(items, '').length, 2);
});

test('SelectSearch: opsi hidden dilewati, selected mengikuti select.value', () => {
  const S = loadSearch();
  const items = S.buildItems(fakeSelect([opt('a', 'A'), opt('b', 'B', { hidden: true }), opt('c', 'C')], 'c'));
  assert.deepStrictEqual(plain(items.map((i) => [i.value, i.selected])), [['a', false], ['c', true]]);
});

test('SelectSearch: select multiple / size>1 / disabled / opt-out dikecualikan', () => {
  const S = loadSearch();
  const base = () => fakeSelect([opt('a', 'A')]);
  assert.strictEqual(S.eligible(base()), true);
  assert.strictEqual(S.eligible(Object.assign(base(), { multiple: true })), false);
  assert.strictEqual(S.eligible(Object.assign(base(), { size: 4 })), false);
  assert.strictEqual(S.eligible(Object.assign(base(), { disabled: true })), false);
  assert.strictEqual(S.eligible(Object.assign(base(), { hasAttribute: (a) => a === 'data-native-select' })), false);
});

test('SelectSearch: kontrak sumber (tanpa handler inline/innerHTML data, terdaftar di kedua build, Escape hanya menutup panel)', () => {
  assert.ok(!/\.innerHTML\s*=/.test(SEARCH_SRC), 'tidak memakai innerHTML');
  assert.ok(!/\son(click|change|input|keydown)\s*=/.test(SEARCH_SRC), 'tanpa handler inline');
  assert.ok(/stopImmediatePropagation/.test(SEARCH_SRC) && /e\.key === 'Escape'/.test(SEARCH_SRC));
  assert.ok(!/catch\s*\([^)]*\)\s*\{\s*\}/.test(SEARCH_SRC), 'tanpa catch kosong');
  for (const f of ['scripts/build.js', 'build.js']) {
    const m = read(f).match(/const GROUP_A\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(m && m[1].includes("'modules/shared/select-search.js'"), f + ' GROUP_A memuat select-search.js');
  }
  assert.ok(/\.ss-panel\{/.test(read('tokens.css')));
});

/* ---------- Proyeksi kategori ---------- */
function makeCrud(D, extra) {
  const els = {};
  const document = { getElementById: (id) => els[id] || null, createElement: () => ({ dataset: {}, style: {}, addEventListener() {} }), readyState: 'complete', addEventListener() {}, body: {}, querySelectorAll: () => [] };
  const sb = Object.assign({ D, document, console, setTimeout: () => 1, MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {}; }, curVehicleId: 'v1', escapeHtml: (s) => String(s) }, extra || {});
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(CRUD_SRC, sb);
  return { api: sb.PartCrudS2041, sb, els };
}
const baseCats = () => [
  { id: 'sp_oli_mesin', name: 'Oli Mesin' },
  { id: 'sp_1700_oli-mesin', name: 'Oli Mesin', vehicleId: 'v1' },
  { id: 'sp_busi', name: 'Busi' },
  { id: 'sp_other_oli', name: 'Oli Mesin', vehicleId: 'v2' },
];

test('Proyeksi: global + salinan per-kendaraan dilebur jadi satu grup; salinan kendaraan lain tidak ikut', () => {
  const { api } = makeCrud({ sparepartCats: baseCats(), partsStock: [] });
  const groups = api.stockCategoryGroups('v1');
  assert.strictEqual(groups.length, 2);
  const oli = groups.find((g) => g.rep.name === 'Oli Mesin');
  assert.deepStrictEqual(plain(oli.ids).sort(), ['sp_1700_oli-mesin', 'sp_oli_mesin']);
  assert.strictEqual(oli.rep.id, 'sp_1700_oli-mesin', 'salinan per-kendaraan menjadi wakil');
});

test('Proyeksi: dua kategori global senama TIDAK dilebur (bisa jadi data berbeda)', () => {
  const { api } = makeCrud({ sparepartCats: [{ id: 'g1', name: 'Filter' }, { id: 'g2', name: 'Filter' }], partsStock: [] });
  assert.strictEqual(api.stockCategoryGroups('v1').length, 2);
});

test('Proyeksi: kategori yang menunjuk komponen kanonik sama dilebur walau nama berbeda', () => {
  const ServiceTaxonomySOT = { canonicalTarget: (c) => (/oli|oil/i.test(c.name) ? { serviceComponentId: 'comp_oli', masterCategoryId: 'm1' } : null) };
  const { api } = makeCrud({ sparepartCats: [{ id: 'a', name: 'Oli Mesin' }, { id: 'b', name: 'Engine Oil', vehicleId: 'v1' }, { id: 'c', name: 'Busi' }], partsStock: [] }, { ServiceTaxonomySOT });
  assert.strictEqual(api.stockCategoryGroups('v1').length, 2);
});

test('Proyeksi: kategori arsip tidak masuk grup', () => {
  const { api } = makeCrud({ sparepartCats: [{ id: 'a', name: 'X', isArchived: true }, { id: 'b', name: 'Y' }], partsStock: [] });
  assert.deepStrictEqual(plain(api.stockCategoryGroups('v1').map((g) => g.rep.id)), ['b']);
});

test('Filter stok kategori memakai SEMUA id setara (stok tertaut ke kategori global tidak hilang)', () => {
  const D = {
    sparepartCats: baseCats(),
    partsStock: [
      { id: 'st_1', name: 'Oli A', catId: 'sp_oli_mesin', vehicleId: 'v1', qty: 2 },
      { id: 'st_2', name: 'Oli B', catId: 'sp_1700_oli-mesin', vehicleId: 'v1', qty: 1 },
      { id: 'st_3', name: 'Busi', catId: 'sp_busi', vehicleId: 'v1', qty: 4 },
    ],
  };
  const { api } = makeCrud(D, { Sparepart: { isPartForVehicle: () => true } });
  for (const cat of ['sp_oli_mesin', 'sp_1700_oli-mesin']) {
    const ids = plain(api.PartPicker.list({ vehicleId: 'v1', categoryId: cat }).map((p) => p.id)).sort();
    assert.deepStrictEqual(ids, ['st_1', 'st_2'], 'filter ' + cat);
  }
  assert.deepStrictEqual(plain(api.PartPicker.list({ vehicleId: 'v1', categoryId: 'sp_busi' }).map((p) => p.id)), ['st_3']);
});

test('txStockItem: baris stok senama dengan id berbeda tetap semuanya ada, dibedakan akhiran id', () => {
  const mkSel = () => ({ id: 'txStockItem', dataset: {}, value: '', options: [], set innerHTML(h) { this._h = h; this.options = [...h.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map((m) => ({ value: m[1], textContent: m[2] })); }, get innerHTML() { return this._h; } });
  const D = {
    sparepartCats: [],
    partsStock: [
      { id: 'st_111_aaaa', name: 'Rub.Bush,Eng.Hanger', qty: 0, vehicleId: 'v1' },
      { id: 'st_222_bbbb', name: 'Rub.Bush,Eng.Hanger', qty: 0, vehicleId: 'v1' },
      { id: 'st_333_cccc', name: 'Busi', qty: 3, vehicleId: 'v1' },
    ],
  };
  const { api, els } = makeCrud(D, { Sparepart: { isPartForVehicle: () => true } });
  els.txStockItem = mkSel();
  els.txStockItem.innerHTML = '<option value="__new__">➕ Sparepart Baru</option>';
  assert.ok(api.PartPicker.refresh('txStockItem', {}));
  const texts = els.txStockItem.options.map((o) => o.textContent);
  const dup = texts.filter((t) => t.startsWith('Rub.Bush'));
  assert.strictEqual(dup.length, 2);
  assert.notStrictEqual(dup[0], dup[1], 'label duplikat dibedakan');
  assert.ok(dup.every((t) => /#\w{4}$/.test(t)));
  assert.ok(texts.some((t) => t.startsWith('Busi') && !/#/.test(t)), 'label unik tidak diberi akhiran');
});

test('Proyeksi: salinan tanpa komponen + kategori ber-komponen senama dilebur (pola backup asli: aki, kampas rem depan)', () => {
  const cats = [
    { id: 'sp_component_aki', name: 'Aki', serviceComponentId: 'aki', masterCategoryId: 'kelistrikan' },
    { id: 'sp_reko_18', name: 'Aki', vehicleId: 'v1' },
    { id: 'sp_kampas_rem_depan', name: 'Kampas Rem Depan', vehicleId: 'v1', serviceComponentId: 'kampas-rem-depan', masterCategoryId: 'sistem-pengereman' },
    { id: 'sp_1789383320818', name: 'Kampas Rem Depan' },
    { id: 'x1', name: 'Roller' }, { id: 'x2', name: 'Roller', vehicleId: 'v1', serviceComponentId: 'roller', masterCategoryId: 'cvt' },
    { id: 'y1', name: 'Dua', serviceComponentId: 'c1' }, { id: 'y2', name: 'Dua', vehicleId: 'v1', serviceComponentId: 'c2' },
  ];
  const { api } = makeCrud({ sparepartCats: cats, partsStock: [] });
  const names = plain(api.stockCategoryGroups('v1').map((g) => g.rep.name)).sort();
  assert.deepStrictEqual(names, ['Aki', 'Dua', 'Dua', 'Kampas Rem Depan', 'Roller'], 'dua komponen kanonik berbeda tidak dilebur');
  assert.deepStrictEqual(plain(api.equivalentCategoryIds('sp_1789383320818', 'v1')).sort(), ['sp_1789383320818', 'sp_kampas_rem_depan']);
});
