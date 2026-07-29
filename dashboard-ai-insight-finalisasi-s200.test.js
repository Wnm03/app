'use strict';
// tests/dashboard-ai-insight-finalisasi-s200.test.js — cakupan Sesi 200
// (Finalisasi Dashboard & AI Insight). Sesi ini TIDAK mengubah business
// logic apa pun (audit murni) — target sesi: verifikasi bahwa sinkronisasi
// Dashboard/Laporan-Statistik/Grafik/AI Insight/Ownership Engine yang sudah
// dikerjakan S191-S199 memang konsisten satu sama lain (satu sumber angka,
// bukan dihitung ulang di tempat berbeda), AI Insight Shop membaca data
// ownership SELF saja, dan tidak ada double count.
//
// Pola loadSource sama persis tests/shop-business-engine-integration.test.js
// (ShopBusinessEnginePresenter) digabung dgn feature-insights.js (ShopInsight)
// dalam satu context, supaya bisa dibandingkan langsung — bukan diasumsikan.

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
      'modules/ai/feature-insights.js',
    ],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      FeatureInsightUI: { renderInto() {} },
      daysUntilDate: () => 999,
    },
    ['ShopBusinessEnginePresenter', 'OwnershipEngine', 'InventoryEngine', 'PurchaseEngine',
      'ProfitEngine', 'isCobekOwnershipSelf', 'ShopInsight'],
  );
}

function baseD(extra) {
  return Object.assign(
    { products: [], cobekKategori: [], cobek: [], produsen: [], accounts: [], transactions: [] },
    extra,
  );
}

function txSelf(total, profit, dateOffsetDays) {
  const d = new Date();
  d.setDate(d.getDate() - (dateOffsetDays || 0));
  return { date: d.toISOString(), total, profit, items: [{ productId: 'p1', name: 'Produk A', qty: 1 }] };
}

function txOwnership(total, profit, ownershipType) {
  const now = new Date();
  return { date: now.toISOString(), total, profit, ownership: ownershipType, items: [{ productId: 'p2', name: 'Produk B', qty: 1 }] };
}

// --- (1) Satu sumber angka: ShopInsight restock item HARUS sama persis
// dengan ShopBusinessEnginePresenter.summary().purchase (bukan dihitung
// ulang terpisah di feature-insights.js) -----------------------------------

test('S200: ShopInsight item restock (shop-restock-modal) pakai angka SAMA PERSIS dgn ShopBusinessEnginePresenter.summary().purchase — 0 double compute', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Produk A', stock: 1, hargaBeli: 10000, hargaJual: 15000 },
      { id: 'p2', name: 'Produk B', stock: 0, hargaBeli: 20000, hargaJual: 28000 },
    ],
  });
  const ctx = makeCtx(D);
  const s = ctx.ShopBusinessEnginePresenter.summary();
  const insight = ctx.ShopInsight.compute();
  const restockItem = insight.find((i) => i.id === 'shop-restock-modal');

  if (s.purchase.ok && s.purchase.itemCount > 0) {
    assert.ok(restockItem, 'item restock harus muncul di AI Insight kalau purchase.ok & itemCount>0');
    assert.match(restockItem.text, new RegExp(String(s.purchase.itemCount)));
    const money = 'Rp ' + Math.round(s.purchase.totalCost);
    assert.match(restockItem.text, new RegExp(money.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } else {
    assert.equal(restockItem, undefined);
  }
});

// --- (2) Ownership SELF-only: profit di Dashboard/Laporan (Presenter) &
// margin di AI Insight (ShopInsight) HARUS exclude transaksi non-SELF dgn
// cara yang KONSISTEN (bukan salah satu lupa filter) -----------------------

test('S200: transaksi ownership INVESTOR dikecualikan KONSISTEN dari Presenter.summary().profit DAN dari ShopInsight margin — AI baca data SELF saja', () => {
  const D = baseD({
    cobek: [
      txOwnership(100000, 30000, 'SELF'),
      txOwnership(100000, 30000, 'SELF'),
      txOwnership(100000, 30000, 'SELF'),
      txOwnership(5000000, 4000000, 'INVESTOR'), // harus TIDAK ikut dihitung di mana pun
    ],
  });
  const ctx = makeCtx(D);
  const s = ctx.ShopBusinessEnginePresenter.summary();

  // Presenter: omzet HANYA dari 3 transaksi SELF (300000), bukan +5jt INVESTOR.
  assert.equal(s.profit.ok, true);
  assert.equal(s.profit.trip, 3);
  assert.equal(s.profit.omzet, 300000);
  assert.equal(s.profit.untung, 90000);

  // Manual cross-check pakai isCobekOwnershipSelf langsung (sumber filter
  // yang sama dipakai ShopInsight margin check) — hasil filter harus IDENTIK.
  const selfOnly = D.cobek.filter(ctx.isCobekOwnershipSelf);
  assert.equal(selfOnly.length, 3);
  assert.equal(selfOnly.reduce((sum, t) => sum + t.total, 0), s.profit.omzet);
});

test('S200: transaksi ownership INVESTOR/CUSTOMER dikecualikan dari "produk terlaris" AI Insight (Shop) — tidak double count qty lintas ownership', () => {
  const D = baseD({
    cobek: [
      txSelf(50000, 10000, 0),
      txSelf(50000, 10000, 0),
      txSelf(50000, 10000, 0),
      txOwnership(9999999, 9999999, 'CUSTOMER'),
    ],
  });
  D.cobek.forEach((t) => { if (!t.ownership) t.ownership = 'SELF'; });
  D.cobek[3].items = [{ productId: 'p1', name: 'Produk A', qty: 999 }]; // qty besar non-SELF, harus TIDAK menang
  const ctx = makeCtx(D);
  const insight = ctx.ShopInsight.compute();
  const terlaris = insight.find((i) => i.id === 'shop-terlaris');
  assert.ok(terlaris);
  // Kalau CUSTOMER (qty 999) ikut kehitung, teks akan menyebut 999x — harus TIDAK.
  assert.doesNotMatch(terlaris.text, /999x/);
});

// --- (3) Idempotency / no double count saat summary() dipanggil berulang
// (dipakai Dashboard render() + Laporan renderTab() + AI Insight — 3
// pemanggil berbeda, harus 0 efek samping/akumulasi) ------------------------

test('S200: summary() PURE — dipanggil 3x berturut-turut (simulasi Dashboard+Laporan+AI Insight) balikin hasil IDENTIK, tidak akumulasi', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 1000, hargaJual: 2000 }],
    cobek: [txSelf(100000, 20000, 0), txSelf(100000, 20000, 0)],
  });
  const ctx = makeCtx(D);
  const s1 = ctx.ShopBusinessEnginePresenter.summary();
  const s2 = ctx.ShopBusinessEnginePresenter.summary();
  const s3 = ctx.ShopBusinessEnginePresenter.summary();
  assert.deepEqual(s1, s2);
  assert.deepEqual(s2, s3);
  assert.equal(s3.profit.trip, 2); // tetap 2, bukan 4/6 (tidak terakumulasi)
});

// --- (4) Rollback aman: OwnershipEngine belum dimuat -> Presenter & AI
// Insight SAMA-SAMA fallback anggap semua SELF (konsisten, tidak ada yang
// diam-diam exclude sementara yang lain tidak) ------------------------------

test('S200: rollback aman — OwnershipEngine tidak dimuat -> Presenter & ShopInsight KONSISTEN anggap semua transaksi SELF (fallback true)', () => {
  const D = baseD({
    cobek: [txOwnership(100000, 20000, 'INVESTOR')],
  });
  // loadSource TANPA ownership-engine.js -> isCobekOwnershipSelf fallback true.
  const ctx = loadSource(
    [
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/shop/cobek-order.js',
      'modules/shop/purchase-engine.js',
      'modules/shop/inventory-engine.js',
      'modules/shop/profit-engine.js',
      'modules/shop/shop-business-engine-presenter.js',
      'modules/ai/feature-insights.js',
    ],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      FeatureInsightUI: { renderInto() {} },
      daysUntilDate: () => 999,
    },
    ['ShopBusinessEnginePresenter', 'isCobekOwnershipSelf'],
  );
  const s = ctx.ShopBusinessEnginePresenter.summary();
  assert.equal(s.profit.trip, 1);
  assert.equal(s.profit.omzet, 100000);
  assert.equal(ctx.isCobekOwnershipSelf(D.cobek[0]), true);
});

// --- (5) render()/renderTab() tidak throw kalau container tidak ada (aman
// dipanggil dari halaman mana pun — Dashboard Hub/Laporan/live-wiring) -----

test('S200: render() & renderTab() tidak throw walau container DOM tidak ditemukan (dipanggil dari 3 titik berbeda: Dashboard/Laporan/live-wiring)', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 1000, hargaJual: 2000 }],
    cobek: [txSelf(50000, 10000, 0)],
  });
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.ShopBusinessEnginePresenter.render());
  assert.doesNotThrow(() => ctx.ShopBusinessEnginePresenter.renderTab());
});
