'use strict';
// tests/s686-data-health-check-dsr-warning.test.js — S686 (audit rekomendasi
// fitur DSR/rasio cicilan, lihat chat audit "cek foto audit langkah
// implementasi"): DSR merah (>35%, threshold SAMA PERSIS dgn debt-optimizer-
// api.js/debt-optimizer-presenter.js) sekarang ikut muncul sbg warning di
// Data Health Check, bukan cuma kelihatan kalau user buka halaman Debt
// Strategy/kartu Debt Optimizer sendiri.
//
// Sengaja MOCK DebtStrategy.computeDSR() langsung lewat extraGlobals
// (bukan load piutang-utang.js+worthit.js penuh) -- unit test ini cuma
// mau pastikan data-health-check.js MEMANGGIL DebtStrategy.computeDSR()
// apa adanya & merender issue-nya dgn benar, BUKAN nge-test ulang formula
// DSR itu sendiri (itu ranahnya test piutang-utang.js/DebtStrategy
// terpisah, di luar cakupan sesi ini).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign({
    accounts: [], vehicles: [], transactions: [], bills: [], assets: [],
    bbmLogs: [], piutang: [], partsStock: [], debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [],
    products: [], servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [],
    investments: [], targets: [], eduFunds: [], renovProjects: [], sewaKios: [],
  }, overrides);
}

function run(dsrResult) {
  const D = makeD({});
  const DebtStrategy = { computeDSR: () => dsrResult };
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'data-health-check.js'],
    {
      D, DebtStrategy, openModal: () => {}, sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s), fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    }
  );
  return ctx.runDataHealthCheck();
}

test('runDataHealthCheck: warn kalau DSR > 35% (zona merah)', () => {
  const issues = run({ totalCicilanUtang: 3000000, totalCicilanLain: 800000, totalCicilan: 3800000, incAvg: 10000000, pct: 38 });
  const found = issues.filter((i) => i.title === 'DSR (Rasio Cicilan) di zona merah');
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /38%/);
  assert.equal(found[0].actions[0].action, 'dashHubNavigateToFeature');
  // Cross-realm (vm sandbox) object -- JSON round-trip, bukan assert.deepEqual
  // langsung (pola sama dgn known issue S674, lihat catatan sesi).
  assert.equal(JSON.stringify(found[0].actions[0].args[0]), JSON.stringify({ page: 'keuangan', tab: 'laporan', goTo: 'debtOptimizerWrap' }));
});

test('runDataHealthCheck: TIDAK warn kalau DSR persis di batas 35%', () => {
  const issues = run({ totalCicilanUtang: 3500000, totalCicilanLain: 0, totalCicilan: 3500000, incAvg: 10000000, pct: 35 });
  const found = issues.filter((i) => i.title === 'DSR (Rasio Cicilan) di zona merah');
  assert.equal(found.length, 0);
});

test('runDataHealthCheck: TIDAK warn kalau DSR masih di zona aman/kuning (<=35%)', () => {
  const issues = run({ totalCicilanUtang: 2000000, totalCicilanLain: 0, totalCicilan: 2000000, incAvg: 10000000, pct: 20 });
  const found = issues.filter((i) => i.title === 'DSR (Rasio Cicilan) di zona merah');
  assert.equal(found.length, 0);
});

test('runDataHealthCheck: TIDAK warn kalau belum ada data income (incAvg 0, pct null) -- hindari false positive', () => {
  const issues = run({ totalCicilanUtang: 3000000, totalCicilanLain: 0, totalCicilan: 3000000, incAvg: 0, pct: null });
  const found = issues.filter((i) => i.title === 'DSR (Rasio Cicilan) di zona merah');
  assert.equal(found.length, 0);
});

test('runDataHealthCheck: TIDAK error kalau DebtStrategy belum dimuat (guard typeof)', () => {
  const D = makeD({});
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) }
  );
  assert.doesNotThrow(() => ctx.runDataHealthCheck());
});
