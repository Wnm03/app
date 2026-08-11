'use strict';
// tests/shop-business-engine-integration.test.js — cakupan Sesi 199
// (Finalisasi Integrasi Shop). Menguji ShopBusinessEnginePresenter
// (modules/shop/shop-business-engine-presenter.js) yang menutup gap S198
// ("Belum digunakan UI. Belum dihubungkan ke Shop.") — 100% reuse
// InventoryEngine/PurchaseEngine/ProfitEngine (S198) + isCobekOwnershipSelf
// (OwnershipEngine, S191/S194).
//
// Pola loadSource sama persis tests/inventory-engine.test.js (butuh
// cobek-etalase.js + cobek-pricing.js utk Etalase/StockRekoWidget) +
// tests/ownership-sync-shop.test.js (butuh ownership-engine.js utk
// isCobekOwnershipSelf). summary()/render()/renderTab() dipisah — summary()
// murni (tidak sentuh DOM, sesuai batasan loadSource harness), render()/
// renderTab() hanya dites lewat guard "container tidak ada -> aman diam2"
// (permissive document stub selalu mengembalikan objek, bukan null, jadi
// yang dites di sini adalah summary() tidak error & tidak throw saat
// render()/renderTab() dipanggil).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/shop/cobek-order.js',
      'modules/shop/purchase-engine.js',
      'modules/shop/inventory-engine.js',
      'modules/shop/profit-engine.js',
      'modules/shop/shop-business-engine-presenter.js',
    ],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    },
    ['ShopBusinessEnginePresenter', 'OwnershipEngine', 'InventoryEngine', 'PurchaseEngine', 'ProfitEngine', 'isCobekOwnershipSelf'],
  );
}

function baseD(extra) {
  return Object.assign(
    {
      products: [],
      cobekKategori: [],
      cobek: [],
      produsen: [],
      accounts: [],
      transactions: [],
    },
    extra,
  );
}

// --- summary() — kondisi engine belum dimuat -----------------------------

test('summary() — kalau InventoryEngine/PurchaseEngine/ProfitEngine tidak dimuat, tetap balikin shape aman (ok:false), tidak throw', () => {
  const ctx = loadSource(
    ['modules/shop/shop-business-engine-presenter.js'],
    { D: baseD(), escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['ShopBusinessEnginePresenter'],
  );
  const s = ctx.ShopBusinessEnginePresenter.summary();
  assert.equal(s.inventory.ok, false);
  assert.equal(s.purchase.ok, false);
  assert.equal(s.profit.ok, false);
});

// --- summary() — inventory ------------------------------------------------

test('summary() — inventory.totalModal/totalNilaiJual 100% reuse InventoryEngine (produk kosong -> 0)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const s = ctx.ShopBusinessEnginePresenter.summary();
  assert.equal(s.inventory.ok, true);
  assert.equal(s.inventory.totalModal, 0);
  assert.equal(s.inventory.totalNilaiJual, 0);
});

test('summary() — inventory.totalModal/totalNilaiJual dihitung dari D.products APA ADANYA (0 recompute)', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Produk A', stock: 10, hargaBeli: 1000, hargaJual: 1500 },
      { id: 'p2', name: 'Produk B', stock: 5, hargaBeli: 2000, hargaJual: 3000 },
    ],
  });
  const ctx = makeCtx(D);
  const s = ctx.ShopBusinessEnginePresenter.summary();
  // PERSIS rumus Etalase.totalModalStok()/totalNilaiJualStok(): stock*hargaBeli / stock*hargaJual.
  assert.equal(s.inventory.totalModal, 10 * 1000 + 5 * 2000);
  assert.equal(s.inventory.totalNilaiJual, 10 * 1500 + 5 * 3000);
});

// --- summary() — purchase (restock) ---------------------------------------

test('summary() — purchase.ok true & itemCount 0 kalau tidak ada rekomendasi restock (produk kosong)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const s = ctx.ShopBusinessEnginePresenter.summary();
  assert.equal(s.purchase.ok, true);
  assert.equal(s.purchase.itemCount, 0);
  assert.equal(s.purchase.totalCost, 0);
});

// --- summary() — profit (ownership sync) ----------------------------------

test('summary() — profit HANYA hitung transaksi ownership SELF bulan berjalan (Sesi 194 pattern)', () => {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const iso = (d) => new Date(y, m, d).toISOString().split('T')[0];
  const D = baseD({
    cobek: [
      { id: 1, date: iso(1), total: 100000, profit: 20000 },
      { id: 2, date: iso(2), total: 100000, profit: 20000 },
      // Non-SELF, angka jauh lebih besar -> HARUS dikecualikan.
      { id: 3, date: iso(3), total: 999999, profit: 999999, ownership: 'INVESTOR' },
    ],
  });
  const ctx = makeCtx(D);
  const s = ctx.ShopBusinessEnginePresenter.summary();
  assert.equal(s.profit.ok, true);
  assert.equal(s.profit.trip, 2, 'transaksi INVESTOR harus dikecualikan dari jumlah trip');
  assert.equal(s.profit.omzet, 200000);
  assert.equal(s.profit.untung, 40000);
});

test('summary() — profit fallback hitung semua transaksi kalau isCobekOwnershipSelf tidak dimuat (regresi lama tetap jalan)', () => {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const iso = (d) => new Date(y, m, d).toISOString().split('T')[0];
  const D = baseD({
    cobek: [
      { id: 1, date: iso(1), total: 100000, profit: 20000, ownership: 'INVESTOR' },
    ],
  });
  const ctx = loadSource(
    ['modules/shop/purchase-engine.js', 'modules/shop/cobek-etalase.js', 'modules/shop/cobek-pricing.js', 'modules/shop/inventory-engine.js', 'modules/shop/profit-engine.js', 'modules/shop/shop-business-engine-presenter.js'],
    { D, escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['ShopBusinessEnginePresenter'],
  );
  const s = ctx.ShopBusinessEnginePresenter.summary();
  assert.equal(s.profit.trip, 1, 'tanpa OwnershipEngine, dianggap SELF (tidak exclude apa pun)');
});

// --- render()/renderTab() — tidak throw walau container tidak ada --------

test('render() — tidak throw walau dipanggil (container di-stub permisif)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 100, hargaJual: 200 }] });
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.ShopBusinessEnginePresenter.render());
});

test('renderTab() — tidak throw walau dipanggil (container di-stub permisif)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.ShopBusinessEnginePresenter.renderTab());
});

// --- AI Insight (ShopInsight) — item baru "shop-restock-modal" -----------

test('ShopInsight.compute() — item "shop-restock-modal" muncul HANYA kalau ada rekomendasi restock, 100% reuse ShopBusinessEnginePresenter.summary()', () => {
  const D = baseD();
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/shop/cobek-order.js',
      'modules/shop/purchase-engine.js',
      'modules/shop/inventory-engine.js',
      'modules/shop/profit-engine.js',
      'modules/shop/shop-business-engine-presenter.js',
      'modules/ai/feature-insights.js',
    ],
    { D, escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => String(n), MONTHS: [] },
    ['ShopInsight'],
  );
  const out = ctx.ShopInsight.compute();
  const hit = out.find((x) => x.id === 'shop-restock-modal');
  assert.equal(hit, undefined, 'tidak ada produk sama sekali -> tidak ada rekomendasi restock -> item tidak muncul');
});

test('ShopInsight.compute() — item "shop-restock-modal" punya action navigasi silang ke Shop (page/navIdx), pola sama item ShopInsight lain', () => {
  // Guard: pastikan KALAU item ini muncul, actionnya konsisten dgn pola yang
  // sudah ada (mis. 'shop-stok-menipis') — dicek langsung dari source (tidak
  // perlu memaksa StockRekoWidget merekomendasikan restock beneran di sini,
  // krn itu di luar cakupan sesi ini/logic StockRekoWidget sendiri).
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'modules/ai/feature-insights.js'),
    'utf8',
  );
  const idx = src.indexOf('shop-restock-modal');
  assert.ok(idx > -1, 'item shop-restock-modal harus ada di ShopInsight');
  const snippet = src.slice(idx, idx + 260);
  assert.match(snippet, /page:'shop',navIdx:2/, 'action navigasi silang harus konsisten dgn item ShopInsight lain');
});
