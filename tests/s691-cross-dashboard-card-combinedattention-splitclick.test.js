'use strict';
// tests/s691-cross-dashboard-card-combinedattention-splitclick.test.js —
// cakupan modules/cross/cross-dashboard-card.js (S691, lanjutan audit
// "kartu klik->sumber data" — AUDIT-RENCANA-kartu-klik-ke-sumber-v1503.md
// GAP #2). Keputusan produk (dipilih user): _combinedAttentionCard PECAH
// jadi 2 subParts clickable terpisah (bukan 1 onClick gabungan di level
// kartu) — lihat catatan header cross-dashboard-card.js. Test ini MURNI
// cakupan baru, file baru (belum ada test file utk cross-dashboard-card.js
// sebelum sesi ini), pola sama tests/s690-finance-dashboard-cardclick-
// tosource.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  // Load 3 file bareng, urutan SAMA PERSIS scripts/build.js (finance ->
  // vehicle -> cross), supaya FINANCE_DASHBOARD_CARD_NAV_TARGETS &
  // VEHICLE_DASHBOARD_NAV_TARGETS beneran ada sbg global saat
  // cross-dashboard-card.js dievaluasi (pola sungguhan di app).
  const extra = { D: { partsStock: [], servisLogs: [] }, fmt: (n) => 'Rp ' + Math.round(n || 0) };
  return loadSource(
    ['modules/finance/finance-dashboard.js', 'modules/vehicle/vehicle-dashboard.js', 'modules/cross/cross-dashboard-card.js'],
    extra,
    ['CrossDashboardCard', 'FINANCE_DASHBOARD_CARD_NAV_TARGETS', 'VEHICLE_DASHBOARD_NAV_TARGETS'],
  );
}

test('_combinedAttentionCard() -> subParts (bukan sub string) berisi 2 bagian dgn onClick masing2', () => {
  const { CrossDashboardCard: c } = makeCtx();
  const card = c._combinedAttentionCard(
    { ok: true, budget: { ok: true, overCount: 3 } },
    { ok: true, reminder: { overdueCount: 2 } },
  );
  assert.equal(card.value, '5');
  assert.equal(card.sub, undefined);
  assert.equal(Array.isArray(card.subParts), true);
  assert.equal(card.subParts.length, 2);
  assert.match(card.subParts[0].text, /^3 anggaran lewat batas$/);
  assert.match(card.subParts[1].text, /^2 servis\/pajak\/BBM lewat jatuh tempo$/);
});

test('subParts[0] (budget) -> onClick dashHubNavigateToFeature, target = FINANCE_DASHBOARD_CARD_NAV_TARGETS.budget (reuse, 0 duplikat literal)', () => {
  const { CrossDashboardCard: c, FINANCE_DASHBOARD_CARD_NAV_TARGETS: T } = makeCtx();
  const card = c._combinedAttentionCard({ ok: true, budget: { ok: true, overCount: 1 } }, { ok: false });
  const p = card.subParts[0];
  assert.equal(p.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(p.onClick.args[0].page, T.budget.page);
  assert.equal(p.onClick.args[0].tab, T.budget.tab);
});

test('subParts[1] (vehicle) -> onClick dashHubNavigateToFeature, target = VEHICLE_DASHBOARD_NAV_TARGETS.service (reuse, 0 duplikat literal)', () => {
  const { CrossDashboardCard: c, VEHICLE_DASHBOARD_NAV_TARGETS: T } = makeCtx();
  const card = c._combinedAttentionCard({ ok: false }, { ok: true, reminder: { overdueCount: 4 } });
  const p = card.subParts[1];
  assert.equal(p.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(p.onClick.args[0].page, T.service.page);
  assert.equal(p.onClick.args[0].tab, T.service.tab);
  assert.equal(p.onClick.args[0].goTo, T.service.goTo);
});

test('_combinedAttentionCard() -> tetap aman & carry onClick di kedua sisi saat finance/vehicle sama2 belum ok (0 crash, counter 0)', () => {
  const { CrossDashboardCard: c } = makeCtx();
  const card = c._combinedAttentionCard({ ok: false }, { ok: false });
  assert.equal(card.value, '0');
  assert.equal(card.subParts[0].text, '0 anggaran lewat batas');
  assert.equal(card.subParts[1].text, '0 servis/pajak/BBM lewat jatuh tempo');
  assert.equal(card.subParts[0].onClick.action, 'dashHubNavigateToFeature');
  assert.equal(card.subParts[1].onClick.action, 'dashHubNavigateToFeature');
});

test('_combinedAttentionCard() -> subParts.onClick null (bukan crash) kalau NAV_TARGETS dependency belum dimuat (file di-load sendirian)', () => {
  const extra = {};
  const { CrossDashboardCard: c } = loadSource(['modules/cross/cross-dashboard-card.js'], extra, ['CrossDashboardCard']);
  const card = c._combinedAttentionCard({ ok: true, budget: { ok: true, overCount: 1 } }, { ok: true, reminder: { overdueCount: 1 } });
  assert.equal(card.subParts[0].onClick, null);
  assert.equal(card.subParts[1].onClick, null);
  // Teks tetap benar walau onClick null -- render() (_renderSub) yang akan
  // fallback ke span tanpa data-action, bukan tanggung jawab fungsi ini.
  assert.equal(card.subParts[0].text, '1 anggaran lewat batas');
});

test('_financeHealthCard()/_vehicleHealthCard() -> TIDAK berubah (masih pakai field `sub` string biasa, 0 breaking change dari S691)', () => {
  const { CrossDashboardCard: c } = makeCtx();
  const fh = c._financeHealthCard({ ok: true, healthScore: { score: 90, label: 'Sangat Baik' } });
  const vh = c._vehicleHealthCard({ ok: true, intelligence: { fleet: { totalVehicles: 2, avgHealth: 85 } } });
  assert.equal(typeof fh.sub, 'string');
  assert.equal(fh.subParts, undefined);
  assert.equal(typeof vh.sub, 'string');
  assert.equal(vh.subParts, undefined);
});
