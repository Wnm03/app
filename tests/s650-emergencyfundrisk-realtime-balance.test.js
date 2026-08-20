'use strict';
// tests/s650-emergencyfundrisk-realtime-balance.test.js — regresi BUG-013
// (TODO.md, "FinanceIntelligence & Risk Dashboard"):
//   _emergencyFundRisk() (financial-risk-dashboard-api.js) dulu pakai
//   `dd.saved` MENTAH utk cek status Target Dana Darurat -- padahal utk
//   target yang tertaut ke akun (dd.accountId), `dd.saved` cuma snapshot
//   manual yang bisa STALE (saldo akun sebenarnya sudah naik/turun lewat
//   transaksi, field `saved` tidak ikut ter-update otomatis). Akibatnya
//   Financial Risk Dashboard bisa salah nampilkan "Dana Darurat belum
//   tercapai" padahal saldo akun real sudah capai/lewat target (atau
//   sebaliknya).
// Fix: reuse pola SAMA PERSIS DanaDaruratAI.currentSaved()
// (modules-calc.js) / invest-ai-widget.js._checkDanaDarurat() -- kalau
// dd.accountId ada & recalcAccBalance tersedia, baca saldo real-time;
// kalau tidak (saldo manual/fungsi belum dimuat), fallback ke dd.saved.
// Pakai loadSource harness, pola sama tests/financial-risk-dashboard-api.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(targets) { return { targets: targets || [] }; }

function makeCtx({ D, recalcAccBalance }) {
  const extra = { D: D || makeD() };
  if (recalcAccBalance !== undefined) extra.recalcAccBalance = recalcAccBalance;
  return loadSource(['modules/finance/financial-risk-dashboard-api.js'], extra, ['FinancialRiskDashboardAPI']);
}

test('_emergencyFundRisk() — target tertaut akun (accountId), dd.saved stale RENDAH tapi saldo akun REAL sudah capai target -> [] (tidak ikut dd.saved basi)', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([{ isDanaDarurat: true, amount: 10000000, accountId: 'acc1', saved: 1000000 }]),
    recalcAccBalance: (id) => (id === 'acc1' ? 12000000 : 0),
  });
  assert.equal(api._emergencyFundRisk().length, 0, 'saldo akun real (12jt) sudah lewat target (10jt), walau dd.saved (1jt) basi rendah');
});

test('_emergencyFundRisk() — target tertaut akun, saldo akun REAL belum capai target -> 1 warning, persen dihitung dari saldo real (bukan dd.saved)', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([{ isDanaDarurat: true, amount: 10000000, accountId: 'acc1', saved: 9000000 }]),
    recalcAccBalance: (id) => (id === 'acc1' ? 4000000 : 0),
  });
  const r = api._emergencyFundRisk();
  assert.equal(r.length, 1);
  assert.match(r[0].message, /40% dari target/, 'persen harus dari saldo real 4jt/10jt, bukan dd.saved 9jt/10jt');
});

test('_emergencyFundRisk() — target TIDAK tertaut akun (tanpa accountId) -> tetap pakai dd.saved apa adanya (0 regresi)', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([{ isDanaDarurat: true, amount: 10000000, saved: 4000000 }]),
    recalcAccBalance: () => 999999999,
  });
  const r = api._emergencyFundRisk();
  assert.equal(r.length, 1);
  assert.match(r[0].message, /40% dari target/, 'tanpa accountId, recalcAccBalance tidak boleh dipakai sama sekali');
});

test('_emergencyFundRisk() — target tertaut akun TAPI recalcAccBalance belum dimuat (guard typeof) -> fallback ke dd.saved, tidak throw', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([{ isDanaDarurat: true, amount: 10000000, accountId: 'acc1', saved: 4000000 }]),
  });
  const r = api._emergencyFundRisk();
  assert.equal(r.length, 1);
  assert.match(r[0].message, /40% dari target/);
});

test('_emergencyFundRisk() — target tertaut akun, saldo real PAS SAMA dengan target -> [] (batas >=, 0 regresi kondisi tepi)', () => {
  const { FinancialRiskDashboardAPI: api } = makeCtx({
    D: makeD([{ isDanaDarurat: true, amount: 5000000, accountId: 'acc1', saved: 1 }]),
    recalcAccBalance: () => 5000000,
  });
  assert.equal(api._emergencyFundRisk().length, 0);
});
