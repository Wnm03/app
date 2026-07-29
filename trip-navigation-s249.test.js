'use strict';
// tests/trip-navigation-s249.test.js — cakupan Sesi 249 (Trip Navigation) +
// Sesi 250/251 (Business Flow Navigation Consistency), keduanya di
// modules/shop/business-flow-presenter.js. WIRE ONLY — TIDAK ADA
// halaman/modal/engine baru dibuat:
//   - openTripPage() (S249): tombol "🚚 Trip" 100% REUSE
//     dashHubNavigateToFeature() (dashboard-hub.js, mekanisme SAMA PERSIS
//     dipakai FEATURE_REGISTRY) ke tab Shop > Laporan + landing
//     #tripPresenterBody (TripPresenter, S204-A), fallback ke
//     DeliveryPlanUI.open() (S203) kalau dashHubNavigateToFeature belum
//     dimuat. (Sesi 264: tab dikoreksi dari 'riwayat' ke 'laporan' — lihat
//     CHANGELOG.md, container aslinya memang di #shopTab-laporan.)
//   - onClick:{action,args} per-kartu (S251, standarisasi ulang dari
//     openCard(index)+CARD_NAV_TARGETS S250) — 9 kartu Business Flow lain
//     (Purchase/Stock/Sale/KPI/Cost-Pricing/Load-Transport/Decision/
//     Finance/Transfer) SEMUA carry field onClick sendiri (ditempel di
//     masing2 _xxxCard(), reuse CARD_NAV_TARGETS sbg data), SAMA PERSIS
//     pola FinanceDashboard.render() (finance-dashboard.js) — bukan lagi
//     lewat method+index indirection (openCard() DIHAPUS S251).
// Pola test sama persis tests/trip-management-s239.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    {
      products: [], cobekKategori: [], cobek: [], produsen: [],
      accounts: [], transactions: [], profile: {}, piutang: [],
    },
    extra,
  );
}

function makeCtx(D, extraGlobals) {
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
    ],
    Object.assign(
      {
        D,
        escapeHtml: (s) => String(s),
        fmt: (n) => 'Rp ' + Math.round(n || 0),
        fmtFull: (n) => 'Rp ' + Math.round(n || 0),
        MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      },
      extraGlobals,
    ),
    ['BusinessFlowPresenter', 'OwnershipEngine', 'TripPresenter'],
  );
}

// --- openTripPage() — reuse dashHubNavigateToFeature() (jalur utama) ------

test('openTripPage() — panggil dashHubNavigateToFeature() ke Shop>Riwayat + landing tripPresenterBody, kalau tersedia', () => {
  const calls = [];
  const ctx = makeCtx(baseD(), {
    dashHubNavigateToFeature(target) { calls.push(target); },
  });
  ctx.BusinessFlowPresenter.openTripPage();
  assert.equal(calls.length, 1);
  // Objek target dibuat di dalam vm sandbox (realm terpisah) -> deepEqual
  // gagal reference-equal-check utk cross-realm object walau isinya sama
  // persis. Bandingkan field-nya satu-satu saja.
  assert.equal(calls[0].page, 'shop');
  assert.equal(calls[0].tab, 'laporan');
  assert.equal(calls[0].goTo, 'tripPresenterBody');
});

test('openTripPage() — TIDAK memanggil DeliveryPlanUI.open() kalau dashHubNavigateToFeature tersedia (0 fallback ganda)', () => {
  const navCalls = [];
  let deliveryOpened = false;
  const ctx = makeCtx(baseD(), {
    dashHubNavigateToFeature(target) { navCalls.push(target); },
    DeliveryPlanUI: { open() { deliveryOpened = true; } },
  });
  ctx.BusinessFlowPresenter.openTripPage();
  assert.equal(navCalls.length, 1);
  assert.equal(deliveryOpened, false);
});

// --- openTripPage() — fallback ke DeliveryPlanUI.open() (S203) -----------

test('openTripPage() — fallback ke DeliveryPlanUI.open() kalau dashHubNavigateToFeature belum dimuat', () => {
  let deliveryOpened = false;
  const ctx = makeCtx(baseD(), {
    DeliveryPlanUI: { open() { deliveryOpened = true; } },
  });
  ctx.BusinessFlowPresenter.openTripPage();
  assert.equal(deliveryOpened, true);
});

test('openTripPage() — aman (tidak throw) kalau dashHubNavigateToFeature & DeliveryPlanUI dua-duanya belum dimuat', () => {
  const ctx = makeCtx(baseD());
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.openTripPage());
});

// --- onClick:{action,args} per-kartu (S251) — reuse CARD_NAV_TARGETS ------
// (deepEqual gagal utk objek lintas-realm vm sandbox, sama alasan komentar
// openTripPage() di atas -> bandingkan field satu-satu.)

test('_purchaseCard() — onClick navigasi ke Shop > Etalase > stockRekoWidgetList', () => {
  const ctx = makeCtx(baseD());
  const c = ctx.BusinessFlowPresenter._purchaseCard({ ok: false });
  assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c.onClick.args[0].page, 'shop');
  assert.equal(c.onClick.args[0].tab, 'etalase');
  assert.equal(c.onClick.args[0].goTo, 'stockRekoWidgetList');
});

test('_stockCard() — onClick navigasi ke Shop > Etalase > productList', () => {
  const ctx = makeCtx(baseD());
  const c = ctx.BusinessFlowPresenter._stockCard({ ok: false });
  assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c.onClick.args[0].tab, 'etalase');
  assert.equal(c.onClick.args[0].goTo, 'productList');
});

test('_saleCard() — onClick navigasi ke Shop > Riwayat > shopList', () => {
  const ctx = makeCtx(baseD());
  const c = ctx.BusinessFlowPresenter._saleCard({ ok: false });
  assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c.onClick.args[0].tab, 'riwayat');
  assert.equal(c.onClick.args[0].goTo, 'shopList');
});

test('_financeCard() — onClick navigasi ke halaman Keuangan', () => {
  const ctx = makeCtx(baseD());
  const c = ctx.BusinessFlowPresenter._financeCard(null);
  assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c.onClick.args[0].page, 'keuangan');
});

test('_transferCard() — onClick navigasi ke Shop > Business Intelligence > businessFlowTransferList', () => {
  const ctx = makeCtx(baseD());
  const c = ctx.BusinessFlowPresenter._transferCard({ ok: false });
  assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c.onClick.args[0].page, 'shop');
  assert.equal(c.onClick.args[0].tab, 'bi');
  assert.equal(c.onClick.args[0].goTo, 'businessFlowTransferList');
});

test('_kpiCard()/_costPricingCard()/_loadCostCard()/_decisionCard() — onClick landing ke businessFlowBody', () => {
  const ctx = makeCtx(baseD());
  const cards = [
    ctx.BusinessFlowPresenter._kpiCard(null),
    ctx.BusinessFlowPresenter._costPricingCard(null),
    ctx.BusinessFlowPresenter._loadCostCard(null),
    ctx.BusinessFlowPresenter._decisionCard(null),
  ];
  cards.forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].tab, 'laporan');
    assert.equal(c.onClick.args[0].goTo, 'businessFlowBody');
  });
});

test('_tripCard() — onClick delegasi ke BusinessFlowPresenter.openTripPage (bukan dashHubNavigateToFeature langsung)', () => {
  const ctx = makeCtx(baseD());
  const c = ctx.BusinessFlowPresenter._tripCard({ ok: false });
  assert.equal(c.onClick.action, 'BusinessFlowPresenter.openTripPage');
  assert.equal(c.onClick.args.length, 0);
});

test('openCard(index) DIHAPUS (S251) — navigasi sekarang lewat onClick per-kartu, bukan method+index', () => {
  const ctx = makeCtx(baseD());
  assert.equal(typeof ctx.BusinessFlowPresenter.openCard, 'undefined');
});

// --- render() — SEMUA kartu (index 0-9) clickable & konsisten (S249/S250) ---

function renderToHtml(D, extraGlobals) {
  let html = '';
  const el = {
    set innerHTML(v) { html = v; },
    get innerHTML() { return html; },
  };
  const otherEls = { businessFlowTransferList: { innerHTML: '' } };
  const documentStub = {
    getElementById(id) {
      if (id === 'businessFlowGrid') return el;
      if (Object.prototype.hasOwnProperty.call(otherEls, id)) return otherEls[id];
      return null;
    },
  };
  const ctx = makeCtx(D, Object.assign({ document: documentStub }, extraGlobals));
  ctx.BusinessFlowPresenter.render();
  return html;
}

test('render() — kartu Trip (index 1) pakai data-action="BusinessFlowPresenter.openTripPage" (args kosong)', () => {
  const html = renderToHtml(baseD());
  const matches = html.match(/data-action="BusinessFlowPresenter\.openTripPage"/g) || [];
  assert.equal(matches.length, 1);
  assert.match(html, /class="findash-card u-pointer" data-action="BusinessFlowPresenter\.openTripPage" data-args="\[\]" aria-label="Buka Trip"/);
});

test('render() — 9 kartu lain pakai data-action="dashHubNavigateToFeature" (SAMA PERSIS pola FinanceDashboard.render())', () => {
  const html = renderToHtml(baseD());
  const matches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(matches.length, 9, '9 kartu (selain Trip) harus pakai data-action="dashHubNavigateToFeature"');
  // Total 10 kartu clickable (1 Trip + 9 dashHubNavigateToFeature).
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 10);
});

test('render() — tombol CTA di dalam kartu (Purchase/Transfer) tetap py data-action sendiri (tidak tertimpa data-action kartu)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Batu Cobek', stock: 0, minStock: 5, hargaBeli: 10000 }] });
  const html = renderToHtml(D);
  assert.match(html, /data-action="BusinessFlowPresenter\.planTripForRestock"/);
  assert.match(html, /data-action="BusinessFlowPresenter\.completeTrip"/);
  assert.match(html, /data-action="BusinessFlowPresenter\.openTransferModal"/);
});

test('render() — aman diam2 kalau container #businessFlowGrid tidak ada di halaman', () => {
  const ctx = makeCtx(baseD(), { document: { getElementById() { return null; } } });
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.render());
});
