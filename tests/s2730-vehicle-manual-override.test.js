'use strict';
// S2730 regresi: pilihan kendaraan manual / hasil restore edit tidak boleh ditimpa saat updateTxVehiclePanels()
// dipanggil ulang (blur kategori/sub, awal _saveTxInner) selama konteks kategori TIDAK berubah.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function mkSelect() {
  let opts = [], val = '';
  return { get options() { return opts; },
    set innerHTML(h) { opts = [...String(h).matchAll(/value="([^"]*)"/g)].map(m => ({ value: m[1] })); val = opts.length ? opts[0].value : ''; },
    get value() { return val; }, set value(v) { val = opts.some(o => o.value === v) ? v : ''; }, style: {} };
}
function setup() {
  const D = { vehicles: [{ id: 'v1', name: 'Vario 125', emoji: 'M' }, { id: 'v2', name: 'Vario 110', emoji: 'M' }, { id: 'v3', name: 'Xenia', emoji: 'C' }],
    categories: { expense: [
      { id: 'c1', name: 'Vario 125', linkedVehicleId: 'v1', subs: [] },
      { id: 'c3', name: 'Xenia', linkedVehicleId: 'v3', subs: [] },
      { id: 'ct', name: 'Transport', subs: [] }] }, transactions: [] };
  const els = {}; const mk = (id, v = '') => (els[id] = { id, value: v, checked: false, style: {} });
  ['txStockPanel','txBbmPanel','txShopStockPanel','txShopSalePanel','txRenovPanel','txServisPanel','txSyncBbm','txAddStock','txSyncServis','txAddShopStock'].forEach(i => mk(i));
  els.txBbmVehicle = mkSelect(); els.txServisVehicle = mkSelect(); mk('txCat'); mk('txSubCat');
  const noop = () => {};
  const g = { D, curTxType: 'expense', curVehicleId: 'v1', escapeHtml: s => String(s), document: { getElementById: id => els[id] || null },
    toggleTxBbmFields: noop, populateTxStockSelect: noop, toggleTxStockFields: noop, renderTxServisSelectors: noop, toggleTxServisFields: noop,
    isShopStockCatName: () => false, populateTxShopStockSelect: noop, resetShopStockCart: noop, toggleTxShopStockFields: noop,
    toggleTxShopSaleFields: noop, populateTxShopSaleSelect: noop, resetTxShopSaleCart: noop, toggleTxRenovFields: noop, populateTxRenovSelect: noop, toast: noop };
  const c = loadSource(['modules/finance/transaksi.js', 'modules/finance/tx-bbm.js', 'modules/finance/tx-servis.js'], g, ['updateTxVehiclePanels', '_txResetVehicleContext']);
  const pick = (cat, sub) => { els.txCat.value = cat; els.txSubCat.value = sub; };
  return { c, els, pick };
}

test('S2730 pilihan kendaraan BBM manual dipertahankan saat panel di-refresh (awal _saveTxInner)', () => {
  const { c, els, pick } = setup();
  pick('Vario 125', 'bensin'); c.updateTxVehiclePanels();
  assert.equal(els.txBbmVehicle.value, 'v1');
  els.txBbmVehicle.value = 'v2';
  c.updateTxVehiclePanels();
  assert.equal(els.txBbmVehicle.value, 'v2');
});

test('S2730 kendaraan hasil restore edit servis tidak berpindah saat simpan', () => {
  const { c, els, pick } = setup();
  c._txResetVehicleContext();
  pick('Vario 125', 'Servis & Oli'); c.updateTxVehiclePanels();
  els.txServisVehicle.value = 'v2'; // restore dari log tersimpan
  c.updateTxVehiclePanels(); c.updateTxVehiclePanels();
  assert.equal(els.txServisVehicle.value, 'v2');
});

test('S2730 ganti kategori ke kendaraan lain tetap memperbarui konteks', () => {
  const { c, els, pick } = setup();
  pick('Vario 125', 'bensin'); c.updateTxVehiclePanels();
  els.txBbmVehicle.value = 'v2';
  pick('Xenia', 'bensin'); c.updateTxVehiclePanels();
  assert.equal(els.txBbmVehicle.value, 'v3');
});

test('S2730 kembali ke kategori kendaraan setelah kategori generik menerapkan ulang konteks', () => {
  const { c, els, pick } = setup();
  pick('Vario 125', 'bensin'); c.updateTxVehiclePanels();
  pick('Transport', 'Bensin'); c.updateTxVehiclePanels();
  els.txBbmVehicle.value = 'v3';
  pick('Vario 125', 'bensin'); c.updateTxVehiclePanels();
  assert.equal(els.txBbmVehicle.value, 'v1');
});

test('S2730 panel yang tersembunyi lalu tampil lagi menerapkan konteks kategori', () => {
  const { c, els, pick } = setup();
  pick('Vario 125', 'Parkir'); c.updateTxVehiclePanels(); // BBM tersembunyi
  els.txBbmVehicle.value = 'v3'; // sisa/stale
  pick('Vario 125', 'bensin'); c.updateTxVehiclePanels();
  assert.equal(els.txBbmVehicle.value, 'v1');
});

test('S2730 reset konteks saat modal dibuka: transaksi baru memakai konteks kategori, bukan sisa sesi lalu', () => {
  const { c, els, pick } = setup();
  pick('Vario 125', 'bensin'); c.updateTxVehiclePanels();
  els.txBbmVehicle.value = 'v2';
  c._txResetVehicleContext(); // openTxModal/editTx
  c.updateTxVehiclePanels();
  assert.equal(els.txBbmVehicle.value, 'v1');
});

test('S2730 kategori generik tanpa tautan: pilihan manual tidak ditimpa', () => {
  const { c, els, pick } = setup();
  pick('Transport', 'Bensin'); c.updateTxVehiclePanels();
  els.txBbmVehicle.value = 'v3';
  c.updateTxVehiclePanels();
  assert.equal(els.txBbmVehicle.value, 'v3');
});
