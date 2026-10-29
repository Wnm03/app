'use strict';
// S2728 — deteksi kategori/sub untuk panel tautan (BBM/Servis/Sparepart/Renovasi) di form transaksi.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function load(D) {
  return loadSource(['modules/finance/transaksi.js'], { D }, ['isKendaraanCatName', 'isBensinSubName', 'isServisSubName', 'isSparepartSubName', 'isRenovCatName']);
}
const baseD = () => ({
  vehicles: [{ id: 'v1', name: 'Supra X' }],
  categories: {
    income: [],
    expense: [
      { id: 'cat_supra', name: 'Supra X', linkedVehicleId: 'v1', subs: [{ id: 'sub_bensin_a1', name: 'Isi Penuh' }, { id: 'sub_servis_oli_b2', name: 'Perawatan' }, { id: 'sub_x', name: 'Lain' }] },
      { id: 'cat_makan', name: 'Makan', subs: [{ id: 's1', name: 'Jajan' }] },
      { id: 'cat_renov_9', name: 'Rumah Baru', subs: [] },
    ],
  },
});

test('S2728 kategori bernama bebas bertaut linkedVehicleId dikenali sebagai kendaraan', () => {
  const c = load(baseD());
  assert.equal(c.isKendaraanCatName('Supra X'), true);
  assert.equal(c.isKendaraanCatName('supra x '), true, 'trim + case-insensitive');
  assert.equal(c.isKendaraanCatName('Makan'), false);
  assert.equal(c.isKendaraanCatName('Kendaraan'), true, 'regex lama tetap');
});

test('S2728 linkedVehicleId ke kendaraan yang sudah tidak ada -> bukan kendaraan', () => {
  const D = baseD(); D.vehicles = [];
  assert.equal(load(D).isKendaraanCatName('Supra X'), false);
});

test('S2728 sub BBM: nama alternatif + fallback ID sub_bensin_*', () => {
  const c = load(baseD());
  ['Bensin', 'BBM', 'Dexlite', 'Premium', 'Fuel', 'Isi tangki', 'Bahan Bakar', 'Pertamax'].forEach(n => assert.equal(c.isBensinSubName(n, 'Supra X'), true, n));
  assert.equal(c.isBensinSubName('Isi Penuh', 'Supra X'), true, 'dikenali lewat ID sub_bensin_*');
  assert.equal(c.isBensinSubName('Lain', 'Supra X'), false);
  assert.equal(c.isBensinSubName('Jajan', 'Makan'), false);
});

test('S2728 sub Servis: regex diperluas + fallback ID sub_servis_*', () => {
  const c = load(baseD());
  ['Servis & Oli', 'Service', 'Ganti oli', 'Tune up'].forEach(n => assert.equal(c.isServisSubName(n, 'Supra X'), true, n));
  assert.equal(c.isServisSubName('Perawatan', 'Supra X'), true, 'dikenali lewat ID sub_servis_*');
  assert.equal(c.isServisSubName('Lain', 'Supra X'), false);
});

test('S2728 sparepart: kategori kendaraan bebas-nama + sub non-BBM; sub BBM bukan sparepart', () => {
  const c = load(baseD());
  assert.equal(c.isSparepartSubName('Supra X', 'Lain'), true);
  assert.equal(c.isSparepartSubName('Supra X', 'Dexlite'), false);
  assert.equal(c.isSparepartSubName('Makan', 'Jajan'), false);
});

test('S2728 Renovasi: regex diperluas + fallback ID kategori', () => {
  const c = load(baseD());
  assert.equal(c.isRenovCatName('Renovasi'), true);
  assert.equal(c.isRenovCatName('Bangun Rumah'), true);
  assert.equal(c.isRenovCatName('Rumah Baru'), true, 'ID cat_renov_*');
  assert.equal(c.isRenovCatName('Makan'), false);
});

// Uji perilaku updateTxVehiclePanels dengan DOM palsu.
function panelsEnv(catVal, subVal, extraD, txEditId) {
  const D = Object.assign(baseD(), { transactions: [] }, extraD || {});
  const els = {};
  const mk = (id, extra) => (els[id] = Object.assign({ id, style: {}, value: '', checked: false }, extra || {}));
  ['txStockPanel', 'txBbmPanel', 'txShopStockPanel', 'txShopSalePanel', 'txRenovPanel', 'txServisPanel', 'txSyncBbm', 'txAddStock', 'txSyncServis'].forEach(i => mk(i));
  mk('txCat', { value: catVal }); mk('txSubCat', { value: subVal });
  const noop = () => {};
  const globals = {
    D, curTxType: 'expense', txEditId: txEditId || null,
    document: { getElementById: id => els[id] || null },
    populateTxBbmVehicleSelect: noop, toggleTxBbmFields: noop, populateTxStockSelect: noop, toggleTxStockFields: noop,
    populateTxServisVehicleSelect: noop, renderTxServisSelectors: noop, toggleTxServisFields: noop,
    isShopStockCatName: () => false, toast: noop,
    populateTxShopStockSelect: noop, resetShopStockCart: noop, toggleTxShopStockFields: noop, resetTxShopSaleCart: noop, toggleTxShopSaleFields: noop, toggleTxRenovFields: noop, populateTxRenovSelect: noop,
  };
  const c = loadSource(['modules/finance/transaksi.js'], globals, ['updateTxVehiclePanels']);
  c.updateTxVehiclePanels();
  return els;
}

test('S2728 panel BBM tampil untuk kategori kendaraan bebas-nama + sub BBM', () => {
  const e = panelsEnv('Supra X', 'Dexlite');
  assert.equal(e.txBbmPanel.style.display, 'block');
  assert.equal(e.txStockPanel.style.display, 'none');
});

test('S2728 panel Servis tampil untuk kategori bertaut + sub perawatan (ID sub_servis_*)', () => {
  const e = panelsEnv('Supra X', 'Perawatan');
  assert.equal(e.txServisPanel.style.display, 'block');
  assert.equal(e.txBbmPanel.style.display, 'none');
});

test('S2728 kategori non-kendaraan tidak menampilkan panel BBM', () => {
  const e = panelsEnv('Makan', 'Bensin');
  assert.equal(e.txBbmPanel.style.display, 'none');
});

test('S2728 edit transaksi tertaut BBM: panel tetap tampil walau nama tak cocok pola', () => {
  const e = panelsEnv('Makan', 'Jajan', { transactions: [{ id: 't9', bbmLinkId: 'b1' }] }, 't9');
  assert.equal(e.txBbmPanel.style.display, 'block');
});

test('S2728 edit transaksi tertaut Servis: panel Servis tetap tampil', () => {
  const e = panelsEnv('Makan', 'Jajan', { transactions: [{ id: 't8', servisLinkId: 's1' }] }, 't8');
  assert.equal(e.txServisPanel.style.display, 'block');
});

// Uji struktur (statis) untuk guard S13 di _saveTxInner: jalur simpan terlalu berat utk ditiru penuh.
test('S2728 guard S13: kategori/sub lama dicatat SEBELUM Object.assign & dipakai sebelum hapus log servis', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'modules/finance/transaksi-b.js'), 'utf8');
  const iPrev = src.indexOf('const _prevTxCatS2728=existingTx.category');
  const iAssign = src.indexOf('Object.assign(existingTx,{type:curTxType,amount:amt,category:cat,subcategory:subCat', iPrev);
  const iSame = src.indexOf('const _sameTaxonomy=');
  const iGuard = src.indexOf('!_isNowServisTx&&!_sameTaxonomy&&D.servisLogs');
  assert.ok(iPrev > 0 && iAssign > 0 && iSame > 0 && iGuard > 0, 'semua penanda ada');
  assert.ok(iPrev < iAssign, 'nilai lama dicatat sebelum ditimpa');
  assert.ok(iAssign < iSame && iSame < iGuard, 'urutan: assign -> sameTaxonomy -> guard');
  assert.ok(src.includes("_prevTxCatS2728===cat&&_prevTxSubS2728===(subCat||'')"), 'pembanding memakai nilai lama');
});

test('S2728 saveTx memanggil updateTxVehiclePanels sebelum membaca form', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'modules/finance/transaksi-b.js'), 'utf8');
  const i = src.indexOf('async function _saveTxInner(){');
  const j = src.indexOf("updateTxVehiclePanels()", i);
  const k = src.indexOf("evalAmtExpr('txAmt')", i);
  assert.ok(i > 0 && j > i && j < k);
});

test('S2728 tukang-absensi: kategori upah tidak ditemukan -> beri tahu user (3 jalur)', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'modules/business/tukang-absensi.js'), 'utf8');
  assert.equal(src.split("Kategori upah tidak ditemukan otomatis").length - 1, 3);
});

test('S2728 import CSV: heuristik BBM mengenali Dexlite/Biosolar/Fuel', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'modules/shared/backup-restore.js'), 'utf8');
  const m = src.match(/const isBbm=jenis\?\/bbm\/\.test\(jenis\):\(liter>0\|\|(\/[^\n]*?\/)\.test\(ketLower\)\)/);
  assert.ok(m, 'baris isBbm ditemukan');
  const re = eval(m[1]);
  ['Dexlite', 'biosolar', 'isi fuel', 'Pertalite', 'spbu'].forEach(k => assert.equal(re.test(k.toLowerCase()), true, k));
  assert.equal(re.test('makan siang'), false);
});
