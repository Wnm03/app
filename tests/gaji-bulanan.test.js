'use strict';
// tests/gaji-bulanan.test.js — cakupan modules/business/gaji-bulanan.js:
// 1) _mgPayDate() — clamp tanggal gajian ke jumlah hari riil bulan berjalan.
// 2) checkMonthlySalaryReminder() — hanya jalan kalau tipeGaji==='bulananTetap',
//    tanggal hari ini sudah lewat/pas tanggal gajian, belum dicatat bulan ini,
//    & belum ditawarkan hari ini (guard D.lastMonthlyGajiPromptDate).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign({ transactions: [], accounts: [], profile: {} }, overrides);
}

function makeCtx(D, extra) {
  let openedModal = null;
  const stub = {
    D,
    save: () => {},
    toast: () => {},
    uid: () => 'u1',
    dateToISO: (d) => d.toISOString().slice(0, 10),
    fmtFull: (n) => String(n),
    todayStr: () => '2026-08-15',
    ensureGajiCategory: () => ({ name: 'Gaji', subs: [] }),
    populateAccFilters: () => {},
    openModal: (id) => { openedModal = id; },
    closeModal: () => {},
    renderDashboard: () => {},
    renderKeuangan: () => {},
    askConfirm: async () => true,
    document: { getElementById: () => null },
    ...extra,
  };
  const ctx = loadSource(['modules/business/gaji-bulanan.js'], stub);
  ctx.__openedModal = () => openedModal;
  return ctx;
}

// --- _mgPayDate() ---

test('_mgPayDate() — tanggal gajian normal (mis. tanggal 25) dipakai apa adanya', () => {
  const D = makeD({ profile: { gajiBulananTanggal: 25 } });
  const ctx = makeCtx(D);
  const d = ctx._mgPayDate(new Date(2026, 1, 10)); // Februari 2026
  assert.equal(d.getDate(), 25);
  assert.equal(d.getMonth(), 1);
});

test('_mgPayDate() — tanggal gajian 31 di bulan Februari (28 hari) di-clamp ke tanggal terakhir bulan itu, bukan overflow', () => {
  const D = makeD({ profile: { gajiBulananTanggal: 31 } });
  const ctx = makeCtx(D);
  const d = ctx._mgPayDate(new Date(2026, 1, 10)); // Februari 2026 = 28 hari
  assert.equal(d.getDate(), 28);
  assert.equal(d.getMonth(), 1);
});

test('_mgPayDate() — tanggal tidak diisi (undefined/0) fallback ke tanggal 1', () => {
  const D = makeD({ profile: {} });
  const ctx = makeCtx(D);
  const d = ctx._mgPayDate(new Date(2026, 2, 15));
  assert.equal(d.getDate(), 1);
});

// --- checkMonthlySalaryReminder() ---

test('checkMonthlySalaryReminder() — tipeGaji bukan "bulananTetap" -> tidak buka modal apa pun', () => {
  const D = makeD({ profile: { tipeGaji: 'harian', gajiBulananTanggal: 1 } });
  const ctx = makeCtx(D);
  ctx.checkMonthlySalaryReminder(new Date(2026, 7, 20));
  assert.equal(ctx.__openedModal(), null);
});

test('checkMonthlySalaryReminder() — sudah dicatat bulan ini (gajiBulananLastRecordedMonth cocok) -> tidak buka modal', () => {
  const D = makeD({ profile: { tipeGaji: 'bulananTetap', gajiBulananTanggal: 1, gajiBulananLastRecordedMonth: '2026-08' } });
  const ctx = makeCtx(D, { todayStr: () => '2026-08-20' });
  ctx.checkMonthlySalaryReminder(new Date(2026, 7, 20));
  assert.equal(ctx.__openedModal(), null);
});

test('checkMonthlySalaryReminder() — sudah lewat tanggal gajian, belum dicatat bulan ini, belum ditawarkan hari ini -> buka monthlyGajiModal', () => {
  const D = makeD({ profile: { tipeGaji: 'bulananTetap', gajiBulananTanggal: 10 } });
  const ctx = makeCtx(D, { todayStr: () => '2026-08-20' });
  ctx.checkMonthlySalaryReminder(new Date(2026, 7, 20));
  assert.equal(ctx.__openedModal(), 'monthlyGajiModal');
});

test('checkMonthlySalaryReminder() — sudah ditawarkan hari ini (D.lastMonthlyGajiPromptDate sama) -> tidak buka lagi', () => {
  const D = makeD({ profile: { tipeGaji: 'bulananTetap', gajiBulananTanggal: 10 }, lastMonthlyGajiPromptDate: '2026-08-20' });
  const ctx = makeCtx(D, { todayStr: () => '2026-08-20' });
  ctx.checkMonthlySalaryReminder(new Date(2026, 7, 20));
  assert.equal(ctx.__openedModal(), null);
});
