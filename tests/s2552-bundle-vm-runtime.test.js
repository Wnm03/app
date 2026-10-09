'use strict';
// S2552 (opsi 2): perilaku NYATA bundle minify terkirim, dijalankan di VM.
// Mencakup area penting: SOT, navigasi halaman, stok. Tanpa mengubah kode produksi.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBundlesVm, evalIn } = require('./helpers/loadBundleVm');

let ctx;
test.before(() => { ctx = loadBundlesVm(); });

test('S2552 VM: bundle A lalu B dieksekusi tanpa error top-level', () => {
  assert.equal(typeof ctx.showPage, 'function');
  assert.equal(typeof ctx.renderPageContent, 'function');
});

test('S2552 VM: SOT utama terdefinisi dengan API yang dijanjikan', () => {
  for (const name of ['StockCommandSOT', 'FinanceTxSOT', 'VehicleServiceSOT']) {
    assert.equal(evalIn(ctx, `typeof ${name}`), 'object', `${name} tidak ada di bundle`);
  }
  for (const m of ['create', 'update', 'remove', 'restoreRows', 'replaceSnapshot', 'setQtyMap', 'setQty', 'adjustQty', 'consume', 'applyDeltas']) {
    assert.equal(evalIn(ctx, `typeof StockCommandSOT.${m}`), 'function', `StockCommandSOT.${m} hilang`);
  }
  assert.equal(evalIn(ctx, 'typeof FinanceTxSOT.create'), 'function');
  assert.equal(evalIn(ctx, 'typeof VehicleServiceSOT.ensureReady'), 'function');
  assert.equal(evalIn(ctx, 'typeof VehicleServiceSOT.isReady'), 'function');
});

// Spy pada fungsi global: pemanggilan di dalam bundle me-resolve lewat global VM.
function spyNav(page, tab, names) {
  const calls = [];
  const saved = {};
  for (const n of names) { saved[n] = ctx[n]; ctx[n] = () => { calls.push(n); }; }
  const savedTab = ctx.getActivePageTab;
  ctx.getActivePageTab = () => tab;
  try { ctx.renderPageContent(page); } finally {
    ctx.getActivePageTab = savedTab;
    for (const n of names) ctx[n] = saved[n];
  }
  return calls;
}

test('S2552 VM: Keuangan hanya merender presenter tab aktif', () => {
  const all = ['renderKeuangan', 'renderBillList', 'renderBudgets', 'renderLaporan', 'populateKeuFilters', 'loadKeuFilterPrefsIntoDOM', 'populateCatFilter', 'populateAccFilters'];
  const tagihan = spyNav('keuangan', 'tagihan', all);
  assert.deepEqual(tagihan, ['renderBillList']);
  const kelola = spyNav('keuangan', 'kelola', all);
  assert.ok(kelola.includes('renderKeuangan') && !kelola.includes('renderBillList') && !kelola.includes('renderBudgets') && !kelola.includes('renderLaporan'));
  const budget = spyNav('keuangan', 'budget', all);
  assert.ok(budget.includes('renderBudgets') && !budget.includes('renderKeuangan') && !budget.includes('renderBillList'));
});

test('S2552 VM: Shop tidak merender semua presenter saat masuk', () => {
  const all = ['renderShop', 'renderShopGrafik', 'renderShopRecent', 'renderProductList', 'renderProdusenList', 'renderCustomerList'];
  assert.deepEqual(spyNav('shop', 'etalase', all), ['renderProductList']);
  assert.deepEqual(spyNav('shop', 'pelanggan', all), ['renderCustomerList']);
  assert.deepEqual(spyNav('shop', 'jual', all), ['renderShopRecent']);
});

test('S2552 VM: Aset menunda presenter Manajemen/Investasi sampai tab aktif', () => {
  const core = spyNav('aset', 'ringkasan', ['renderAsetCore']);
  assert.deepEqual(core, ['renderAsetCore']);
  assert.deepEqual(spyNav('aset', 'investasi', ['renderAsetCore']), []);
  assert.deepEqual(spyNav('aset', 'manajemen', ['renderAsetCore']), []);
});

test('S2552 VM: showPage ke halaman yang tidak ada tidak mengosongkan halaman aktif', () => {
  assert.equal(ctx.showPage('halaman-tidak-ada'), false);
});
