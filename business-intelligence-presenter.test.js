'use strict';
// tests/business-intelligence-presenter.test.js — cakupan Sesi 251
// (Business Intelligence tab, lanjutan S250): BusinessIntelligencePresenter
// (modules/shop/business-intelligence-presenter.js). 100% reuse
// ShopBusinessEnginePresenter (S199) + TripPresenter (S204-A) +
// BusinessFlowPresenter (S205-S243) + InventoryEngine/PurchaseEngine/
// ProfitEngine (S198) + ShopInsight (feature-insights.js) — TIDAK ada
// rumus/engine baru. Pola loadSource sama persis
// tests/business-flow-presenter.test.js — fungsi murni (healthScore()/
// decisionPanel()/trend()/executiveSummary()/aiInsight()) dites tanpa DOM,
// render() hanya dites lewat guard "container tidak ada -> aman diam2"
// (permissive document stub).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    {
      products: [], cobekKategori: [], cobek: [], produsen: [],
      accounts: [], transactions: [], profile: {},
    },
    extra,
  );
}

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
      'modules/shop/trip-presenter.js',
      'modules/shop/business-flow-presenter.js',
      'modules/ai/feature-insights.js',
      'modules/shop/business-intelligence-presenter.js',
    ],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    },
    [
      'BusinessIntelligencePresenter', 'BusinessFlowPresenter', 'ShopBusinessEnginePresenter',
      'TripPresenter', 'InventoryEngine', 'PurchaseEngine', 'ProfitEngine', 'ShopInsight',
      'OwnershipEngine', 'isCobekOwnershipSelf',
    ],
  );
}

function isoDaysAgo(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

// --- healthScore() ---------------------------------------------------------

test('healthScore() — kalau BusinessFlowPresenter tidak dimuat, tetap balikin shape aman (ok:false), tidak throw', () => {
  const ctx = loadSource(
    ['modules/shop/business-intelligence-presenter.js'],
    { D: baseD(), escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['BusinessIntelligencePresenter'],
  );
  const hs = ctx.BusinessIntelligencePresenter.healthScore();
  assert.equal(hs.ok, false);
  assert.equal(hs.score, null);
});

test('healthScore() — skor 100 kalau semua sinyal sehat (margin tinggi, restock clear, tidak ada trip margin tipis/tidak efisien)', () => {
  const D = baseD({
    cobek: [
      { id: 1, date: isoDaysAgo(1), total: 100000, profit: 30000, ongkir: 5000 },
      { id: 2, date: isoDaysAgo(2), total: 100000, profit: 30000, ongkir: 5000 },
    ],
  });
  const ctx = makeCtx(D);
  const hs = ctx.BusinessIntelligencePresenter.healthScore();
  assert.equal(hs.ok, true);
  assert.equal(hs.score, 100);
  assert.equal(hs.label, 'Sehat');
});

test('healthScore() — skor turun kalau ada produk perlu restock (komponen restock 0/25)', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 1000, hargaJual: 2000 }],
    cobek: [
      { id: 1, date: isoDaysAgo(1), total: 100000, profit: 30000, ongkir: 5000 },
    ],
  });
  const ctx = makeCtx(D);
  const hs = ctx.BusinessIntelligencePresenter.healthScore();
  assert.equal(hs.ok, true);
  assert.ok(hs.score < 100, 'skor harus turun krn ada rekomendasi restock');
});

// --- decisionPanel() ---------------------------------------------------------

test('decisionPanel().restock — needed:false kalau stok semua produk aman', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const d = ctx.BusinessIntelligencePresenter.decisionPanel();
  assert.equal(d.restock.ok, true);
  assert.equal(d.restock.needed, false);
});

test('decisionPanel().restock — needed:true & totalCost 100% reuse ShopBusinessEnginePresenter.summary().purchase', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 1000, hargaJual: 2000 }],
  });
  const ctx = makeCtx(D);
  const d = ctx.BusinessIntelligencePresenter.decisionPanel();
  const expected = ctx.ShopBusinessEnginePresenter.summary().purchase;
  assert.equal(d.restock.needed, expected.itemCount > 0);
  assert.equal(d.restock.totalCost, expected.totalCost);
});

test('decisionPanel().inventory — potensiMarginPct 100% reuse ProfitEngine.margin() (0 rumus baru)', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'A', stock: 10, hargaBeli: 1000, hargaJual: 1500 }],
  });
  const ctx = makeCtx(D);
  const d = ctx.BusinessIntelligencePresenter.decisionPanel();
  const totalModal = 10 * 1000;
  const totalNilaiJual = 10 * 1500;
  const expectedMargin = ctx.ProfitEngine.margin(totalNilaiJual, totalNilaiJual - totalModal);
  assert.equal(d.inventory.totalModal, totalModal);
  assert.equal(d.inventory.totalNilaiJual, totalNilaiJual);
  assert.equal(d.inventory.potensiMarginPct, expectedMargin);
});

test('decisionPanel().supplier — itemCount 0 kalau tidak ada restock aktif', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const d = ctx.BusinessIntelligencePresenter.decisionPanel();
  assert.equal(d.supplier.ok, true);
  assert.equal(d.supplier.itemCount, 0);
});

test('decisionPanel().supplier — cheapestSupplier ditemukan dari harga produsen yang sudah tersimpan (product.hargaByProdusen)', () => {
  const D = baseD({
    produsen: [{ id: 'pr1', name: 'Toko Murah' }, { id: 'pr2', name: 'Toko Mahal' }],
    products: [{
      id: 'p1', name: 'A', stock: 1, hargaBeli: 1000, hargaJual: 2000,
      hargaByProdusen: { pr1: 900, pr2: 1200 },
    }],
  });
  const ctx = makeCtx(D);
  const d = ctx.BusinessIntelligencePresenter.decisionPanel();
  assert.equal(d.supplier.itemCount, 1);
  assert.equal(d.supplier.withPriceCount, 1);
  assert.equal(d.supplier.cheapestSupplier.name, 'Toko Murah');
});

// --- trend(days) -------------------------------------------------------------

test('trend(7) — kelompokkan transaksi 7 hari terakhir per hari, total 100% reuse ProfitEngine.summarize()', () => {
  const D = baseD({
    cobek: [
      { id: 1, date: isoDaysAgo(1), total: 100000, profit: 20000 },
      { id: 2, date: isoDaysAgo(2), total: 50000, profit: 10000 },
      { id: 3, date: isoDaysAgo(20), total: 999999, profit: 999999 }, // di luar window 7 hari
    ],
  });
  const ctx = makeCtx(D);
  const t = ctx.BusinessIntelligencePresenter.trend(7);
  assert.equal(t.ok, true);
  assert.equal(t.total.trip, 2, 'transaksi 20 hari lalu harus dikecualikan dari window 7 hari');
  assert.equal(t.total.omzet, 150000);
  assert.equal(t.total.untung, 30000);
  assert.equal(t.series.length, 2, 'dikelompokkan jadi 2 bucket hari berbeda');
});

test('trend(30) — window lebih lebar mencakup transaksi 20 hari lalu', () => {
  const D = baseD({
    cobek: [
      { id: 1, date: isoDaysAgo(20), total: 100000, profit: 20000 },
    ],
  });
  const ctx = makeCtx(D);
  const t = ctx.BusinessIntelligencePresenter.trend(30);
  assert.equal(t.total.trip, 1);
});

// --- executiveSummary() -------------------------------------------------------

test('executiveSummary().bulan — 100% reuse BusinessFlowPresenter.businessKPI() APA ADANYA (0 recompute)', () => {
  const now = new Date();
  const iso = (d) => new Date(now.getFullYear(), now.getMonth(), d).toISOString();
  const D = baseD({
    cobek: [{ id: 1, date: iso(1), total: 100000, profit: 25000, ongkir: 5000 }],
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessIntelligencePresenter.executiveSummary();
  const kpi = ctx.BusinessFlowPresenter.businessKPI();
  assert.equal(s.ok, true);
  assert.equal(s.bulan.omzet, kpi.omzetBulanIni);
  assert.equal(s.bulan.untung, kpi.untungBulanIni);
  assert.equal(s.bulan.trip, kpi.tripBulanIni);
});

test('executiveSummary().hari — hanya transaksi hari ini', () => {
  const D = baseD({
    cobek: [
      { id: 1, date: new Date().toISOString(), total: 100000, profit: 20000 },
      { id: 2, date: isoDaysAgo(3), total: 999999, profit: 999999 },
    ],
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessIntelligencePresenter.executiveSummary();
  assert.equal(s.hari.trip, 1);
  assert.equal(s.hari.omzet, 100000);
});

test('executiveSummary().minggu — 100% reuse trend(7).total (metodologi bucket sama)', () => {
  const D = baseD({
    cobek: [{ id: 1, date: isoDaysAgo(2), total: 70000, profit: 15000 }],
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessIntelligencePresenter.executiveSummary();
  const t7 = ctx.BusinessIntelligencePresenter.trend(7);
  assert.deepEqual(s.minggu, t7.total);
});

test('executiveSummary().tahun — mencakup transaksi tahun berjalan di luar window 30 hari', () => {
  const now = new Date();
  const D = baseD({
    cobek: [{ id: 1, date: new Date(now.getFullYear(), 0, 2).toISOString(), total: 80000, profit: 10000 }],
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessIntelligencePresenter.executiveSummary();
  assert.equal(s.tahun.trip, 1);
  assert.equal(s.tahun.omzet, 80000);
});

// --- aiInsight() ---------------------------------------------------------------

test('aiInsight() — maksimal 3 item, 100% reuse ShopInsight.compute() (0 rule baru)', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'A', stock: 1, hargaBeli: 1000, hargaJual: 2000 },
      { id: 'p2', name: 'B', stock: 1, hargaBeli: 1000, hargaJual: 2000 },
    ],
  });
  const ctx = makeCtx(D);
  const items = ctx.BusinessIntelligencePresenter.aiInsight();
  assert.ok(items.length <= 3, 'tidak boleh lebih dari 3 rekomendasi');
  const computed = ctx.ShopInsight.compute();
  items.forEach((it) => {
    assert.ok(computed.some((c) => c.id === it.id), 'tiap item harus berasal dari ShopInsight.compute(), bukan rule baru');
  });
});

test('aiInsight() — kosong (bukan throw) kalau tidak ada insight & ShopInsight tidak dimuat', () => {
  const ctx = loadSource(
    ['modules/shop/business-intelligence-presenter.js'],
    { D: baseD(), escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['BusinessIntelligencePresenter'],
  );
  assert.equal(ctx.BusinessIntelligencePresenter.aiInsight().length, 0);
});

// --- render() — tidak throw walau container tidak ada (stub permisif) ---------

test('render() — tidak throw walau dipanggil (container di-stub permisif)', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 1000, hargaJual: 2000 }],
    produsen: [{ id: 'pr1', name: 'Toko A' }],
    cobek: [{ id: 1, date: isoDaysAgo(1), total: 100000, profit: 20000, ongkir: 5000 }],
  });
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.render());
});

test('render() — tidak throw kalau semua sumber kosong/belum dimuat', () => {
  const ctx = loadSource(
    ['modules/shop/business-intelligence-presenter.js'],
    { D: baseD(), escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['BusinessIntelligencePresenter'],
  );
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.render());
});

// --- Sesi 252 — Drill Down --------------------------------------------------
// openDrillDown()/_drillContent()/_drillHealth()/_drillDecision()/_drillTrend()/
// _drillExec()/_drillInsight() — SEMUA fungsi murni (0 DOM kecuali
// _showDrillModal, dites terpisah lewat guard permisif), 100% reuse
// healthScore()/decisionPanel()/trend()/executiveSummary()/aiInsight()/
// ShopInsight.compute() yang SUDAH dites di atas — 0 rumus baru.

test('_drillContent("health") — ok:false balikin pesan "belum ada data", tidak throw', () => {
  const ctx = loadSource(
    ['modules/shop/business-intelligence-presenter.js'],
    { D: baseD(), escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['BusinessIntelligencePresenter'],
  );
  const { title, html } = ctx.BusinessIntelligencePresenter._drillContent('health');
  assert.match(title, /Business Health Score/);
  assert.match(html, /Belum ada data/);
});

test('_drillContent("health") — skor & breakdown 100% reuse healthScore() (0 recompute)', () => {
  const D = baseD({
    cobek: [
      { id: 1, date: isoDaysAgo(1), total: 100000, profit: 30000, ongkir: 5000 },
      { id: 2, date: isoDaysAgo(2), total: 100000, profit: 30000, ongkir: 5000 },
    ],
  });
  const ctx = makeCtx(D);
  const hs = ctx.BusinessIntelligencePresenter.healthScore();
  const { html } = ctx.BusinessIntelligencePresenter._drillContent('health');
  assert.match(html, new RegExp(`${hs.score}/100`));
  hs.parts.forEach((p) => {
    const pct = Math.round((p.score / p.weight) * 100);
    assert.match(html, new RegExp(`${pct}%`), `breakdown komponen ${p.key} harus muncul apa adanya dari healthScore()`);
  });
});

test('_drillContent("decision","restock") — 100% reuse decisionPanel().restock, angka sama persis', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 1000, hargaJual: 2000 }] });
  const ctx = makeCtx(D);
  const d = ctx.BusinessIntelligencePresenter.decisionPanel();
  const { title, html } = ctx.BusinessIntelligencePresenter._drillContent('decision', 'restock');
  assert.match(title, /Restock/);
  assert.match(html, new RegExp(String(d.restock.itemCount)));
  assert.match(html, new RegExp(String(d.restock.totalQty)));
});

test('_drillContent("decision","pricing") — 100% reuse decisionPanel().pricing', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const { title, html } = ctx.BusinessIntelligencePresenter._drillContent('decision', 'pricing');
  assert.match(title, /Pricing/);
  assert.match(html, /Belum ada data trip/);
});

test('_drillContent("decision","inventory") — potensiMarginPct 100% reuse decisionPanel().inventory (0 rumus baru)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'A', stock: 10, hargaBeli: 1000, hargaJual: 1500 }] });
  const ctx = makeCtx(D);
  const d = ctx.BusinessIntelligencePresenter.decisionPanel();
  const { title, html } = ctx.BusinessIntelligencePresenter._drillContent('decision', 'inventory');
  assert.match(title, /Inventory/);
  assert.match(html, new RegExp(`${Math.round(d.inventory.potensiMarginPct)}%`));
});

test('_drillContent("decision","supplier") — cheapestSupplier 100% reuse decisionPanel().supplier', () => {
  const D = baseD({
    produsen: [{ id: 'pr1', name: 'Toko Murah' }, { id: 'pr2', name: 'Toko Mahal' }],
    products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 1000, hargaJual: 2000, hargaByProdusen: { pr1: 900, pr2: 1200 } }],
  });
  const ctx = makeCtx(D);
  const { title, html } = ctx.BusinessIntelligencePresenter._drillContent('decision', 'supplier');
  assert.match(title, /Supplier/);
  assert.match(html, /Toko Murah/);
});

test('_drillContent("trend",7) — daftar harian 100% reuse trend(7).series & total (0 rumus baru)', () => {
  const D = baseD({
    cobek: [
      { id: 1, date: isoDaysAgo(1), total: 100000, profit: 20000 },
      { id: 2, date: isoDaysAgo(2), total: 50000, profit: 10000 },
      { id: 3, date: isoDaysAgo(20), total: 999999, profit: 999999 },
    ],
  });
  const ctx = makeCtx(D);
  const t7 = ctx.BusinessIntelligencePresenter.trend(7);
  const { title, html } = ctx.BusinessIntelligencePresenter._drillContent('trend', 7);
  assert.match(title, /7 Hari/);
  assert.match(html, new RegExp(`${t7.total.trip} trip`));
  assert.equal((html.match(/trip ·/g) || []).length, t7.series.length + 1, 'tiap bucket harian + 1 baris total harus muncul, tidak lebih/kurang');
});

test('_drillContent("trend",30) — window lebih lebar, konsisten dgn trend(30)', () => {
  const D = baseD({ cobek: [{ id: 1, date: isoDaysAgo(20), total: 100000, profit: 20000 }] });
  const ctx = makeCtx(D);
  const t30 = ctx.BusinessIntelligencePresenter.trend(30);
  const { html } = ctx.BusinessIntelligencePresenter._drillContent('trend', 30);
  assert.match(html, new RegExp(`${t30.total.trip} trip`));
});

test('_drillContent("exec","bulan") — 100% reuse executiveSummary().bulan (0 recompute)', () => {
  const now = new Date();
  const iso = (d) => new Date(now.getFullYear(), now.getMonth(), d).toISOString();
  const D = baseD({ cobek: [{ id: 1, date: iso(1), total: 100000, profit: 25000, ongkir: 5000 }] });
  const ctx = makeCtx(D);
  const s = ctx.BusinessIntelligencePresenter.executiveSummary();
  const { title, html } = ctx.BusinessIntelligencePresenter._drillContent('exec', 'bulan');
  assert.match(title, /Bulan/);
  assert.match(html, new RegExp(`${s.bulan.trip}`));
  assert.match(html, new RegExp(`${Math.round(s.bulan.marginPct)}%`));
});

test('_drillContent("exec","hari"/"minggu"/"tahun") — masing2 100% reuse executiveSummary() field yang sama', () => {
  const D = baseD({
    cobek: [
      { id: 1, date: new Date().toISOString(), total: 100000, profit: 20000 },
      { id: 2, date: isoDaysAgo(2), total: 70000, profit: 15000 },
    ],
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessIntelligencePresenter.executiveSummary();
  ['hari', 'minggu', 'tahun'].forEach((period) => {
    const { title, html } = ctx.BusinessIntelligencePresenter._drillContent('exec', period);
    assert.ok(title.length > 0);
    if (s[period] && s[period].trip) assert.match(html, new RegExp(`${s[period].trip}`));
  });
});

test('_drillContent("insight") — 100% reuse ShopInsight.compute() TANPA dipotong 3 (beda dgn aiInsight())', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'A', stock: 1, hargaBeli: 1000, hargaJual: 2000 },
      { id: 'p2', name: 'B', stock: 1, hargaBeli: 1000, hargaJual: 2000 },
    ],
  });
  const ctx = makeCtx(D);
  const computed = ctx.ShopInsight.compute();
  const { html } = ctx.BusinessIntelligencePresenter._drillContent('insight');
  computed.forEach((it) => {
    assert.ok(html.indexOf(it.text) !== -1, 'tiap insight dari ShopInsight.compute() harus muncul, tidak dipotong 3 seperti aiInsight()');
  });
});

test('_drillContent("insight") — kalau ShopInsight tidak dimuat, balikin pesan aman, tidak throw', () => {
  const ctx = loadSource(
    ['modules/shop/business-intelligence-presenter.js'],
    { D: baseD(), escapeHtml: (s) => String(s), fmt: (n) => String(n) },
    ['BusinessIntelligencePresenter'],
  );
  const { html } = ctx.BusinessIntelligencePresenter._drillContent('insight');
  assert.match(html, /Belum ada data/);
});

test('_drillContent(kunci tidak dikenal) — fallback aman, tidak throw', () => {
  const ctx = makeCtx(baseD());
  const { title, html } = ctx.BusinessIntelligencePresenter._drillContent('tidak-ada', null);
  assert.equal(title, 'Detail');
  assert.match(html, /tidak tersedia/);
});

test('openDrillDown() — tidak throw walau dipanggil utk tiap section (container/openModal tidak ada, guard permisif)', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 1000, hargaJual: 2000 }],
    produsen: [{ id: 'pr1', name: 'Toko A' }],
    cobek: [{ id: 1, date: isoDaysAgo(1), total: 100000, profit: 20000, ongkir: 5000 }],
  });
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.openDrillDown('health'));
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.openDrillDown('decision', 'restock'));
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.openDrillDown('decision', 'pricing'));
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.openDrillDown('decision', 'inventory'));
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.openDrillDown('decision', 'supplier'));
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.openDrillDown('trend', 7));
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.openDrillDown('trend', 30));
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.openDrillDown('exec', 'hari'));
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.openDrillDown('exec', 'minggu'));
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.openDrillDown('exec', 'bulan'));
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.openDrillDown('exec', 'tahun'));
  assert.doesNotThrow(() => ctx.BusinessIntelligencePresenter.openDrillDown('insight'));
});

test('render() — kartu ter-render tetap punya field drillSub/days/period internal yang benar (0 regression pada builder kartu lama)', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'A', stock: 1, hargaBeli: 1000, hargaJual: 2000 }],
    cobek: [{ id: 1, date: isoDaysAgo(1), total: 100000, profit: 20000, ongkir: 5000 }],
  });
  const ctx = makeCtx(D);
  const d = ctx.BusinessIntelligencePresenter.decisionPanel();
  assert.equal(ctx.BusinessIntelligencePresenter._restockCard(d.restock).drillSub, 'restock');
  assert.equal(ctx.BusinessIntelligencePresenter._pricingCard(d.pricing).drillSub, 'pricing');
  assert.equal(ctx.BusinessIntelligencePresenter._inventoryCard(d.inventory).drillSub, 'inventory');
  assert.equal(ctx.BusinessIntelligencePresenter._supplierCard(d.supplier).drillSub, 'supplier');
  const t7 = ctx.BusinessIntelligencePresenter.trend(7);
  assert.equal(ctx.BusinessIntelligencePresenter._trendCard('7 Hari Terakhir', t7, 7).days, 7);
  const s = ctx.BusinessIntelligencePresenter.executiveSummary();
  assert.equal(ctx.BusinessIntelligencePresenter._execCard('📅 Hari Ini', s.hari, 'hari').period, 'hari');
});
