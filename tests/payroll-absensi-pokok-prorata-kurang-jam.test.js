'use strict';
/**
 * payroll-absensi-pokok-prorata-kurang-jam.test.js — audit user (screenshot
 * Riwayat Absensi): hari Selasa (6 jam, 07:00-14:00) dan Rabu (4 jam,
 * 13:00-17:00) sama-sama tercatat Rp65.000 padahal jam kerjanya beda jauh.
 *
 * Root cause: Payroll.addWorkDay() (modules/business/payroll-absensi.js)
 * memprorata LEMBUR dgn benar utk totalJam>7 (`jamLembur=Math.max(0,
 * totalJam-7)`), tapi utk totalJam<7 `pokok` tetap dipatok flat ke
 * `gajiHari` (nilai penuh gajian 7 jam) -- tidak pernah diprorata TURUN.
 * Efeknya siapa pun yg kerja 1..7 jam dibayar sama rata flat gajiHari,
 * padahal harusnya proporsional sama seperti lembur diprorata NAIK.
 *
 * Fix: pokok = jenis==='minggu' ? tarifMinggu
 *              : Math.round(gajiHari/7*Math.min(totalJam,7))
 *
 * Test ini murni mengunci kalkulasi (bukan UI/render) -- Payroll.renderWorkDays/
 * renderDashMini/renderWeekGrid/cancelEditWorkDay di-stub no-op krn tidak
 * relevan dgn bug ini (pola sama tests/tx-stock-edit-checkbox-restore-s629b.test.js).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(overrides = {}) {
  return Object.assign({
    value: '', checked: false, textContent: '', innerHTML: '', style: {},
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
  }, overrides);
}

function makeFakeDoc(values) {
  const els = {};
  Object.keys(values).forEach((id) => { els[id] = makeEl({ value: values[id] }); });
  return { getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; } };
}

function setupPayroll(formValues, { gajiPokok = 65000, lemburMultiplier = 1.5, tarifMinggu = 139000 } = {}) {
  const D = { workDays: [], profile: { gajiPokok, lemburMultiplier, tarifMinggu } };
  const document = makeFakeDoc(formValues);
  const ctx = loadSource(
    ['modules/business/reset-gaji-mingguan.js', 'modules/shared/helper-teks.js', 'modules/business/payroll-absensi.js'],
    {
      document, D,
      uid: (() => { let n = 0; return () => ++n; })(),
      save() {}, toast() {},
      parsePzNum: (v) => parseFloat(String(v).replace(/[^\d.-]/g, '')) || 0,
      fmtFull: (n) => String(n),
      askConfirm: async () => true,
    },
    ['Payroll'],
  );
  // Panel/render lain sengaja di-stub no-op -- tidak relevan dgn kalkulasi pokok/lembur.
  ctx.Payroll.renderWorkDays = () => {};
  ctx.Payroll.renderDashMini = () => {};
  ctx.Payroll.renderWeekGrid = () => {};
  return ctx;
}

test('addWorkDay() -- Selasa 6 jam (07:00-14:00, potong istirahat 12:00-13:00) -> pokok diprorata turun, BUKAN flat gajiHari', () => {
  const ctx = setupPayroll({
    whDate: '2026-09-08', whJenisHari: 'biasa',
    whMasuk: '07:00', whPulang: '14:00', whIstMulai: '12:00', whIstSelesai: '13:00',
    whGaji: '65000', whPotongan: '', whTambahan: '',
  });
  ctx.Payroll.addWorkDay();
  assert.equal(ctx.D.workDays.length, 1);
  const w = ctx.D.workDays[0];
  assert.equal(w.totalJam, 6);
  assert.equal(w.jamLembur, 0);
  // Sebelum fix: w.pokok === 65000 (flat, sama kayak 7 jam penuh).
  assert.equal(w.pokok, Math.round(65000 / 7 * 6));
  assert.notEqual(w.pokok, 65000, 'pokok TIDAK boleh flat 65000 kalau cuma kerja 6 jam');
  assert.equal(w.total, w.pokok);
});

test('addWorkDay() -- Rabu 4 jam (13:00-17:00, di luar jam istirahat) -> pokok diprorata turun lebih jauh, TIDAK sama dgn hari 6 jam', () => {
  const ctx = setupPayroll({
    whDate: '2026-09-09', whJenisHari: 'biasa',
    whMasuk: '13:00', whPulang: '17:00', whIstMulai: '12:00', whIstSelesai: '13:00',
    whGaji: '65000', whPotongan: '', whTambahan: '',
  });
  ctx.Payroll.addWorkDay();
  const w = ctx.D.workDays[0];
  assert.equal(w.totalJam, 4);
  assert.equal(w.jamLembur, 0);
  // Sebelum fix: w.pokok === 65000, SAMA PERSIS dgn kasus 6 jam di atas -- itu bug-nya.
  assert.equal(w.pokok, Math.round(65000 / 7 * 4));
  assert.notEqual(w.pokok, 65000, 'pokok TIDAK boleh flat 65000 kalau cuma kerja 4 jam');
});

test('addWorkDay() -- 7 jam genap (07:00-15:00) -> pokok tetap flat gajiHari penuh (baseline, tidak berubah)', () => {
  const ctx = setupPayroll({
    whDate: '2026-09-07', whJenisHari: 'biasa',
    whMasuk: '07:00', whPulang: '15:00', whIstMulai: '12:00', whIstSelesai: '13:00',
    whGaji: '65000', whPotongan: '', whTambahan: '',
  });
  ctx.Payroll.addWorkDay();
  const w = ctx.D.workDays[0];
  assert.equal(w.totalJam, 7);
  assert.equal(w.jamLembur, 0);
  assert.equal(w.pokok, 65000);
});

test('addWorkDay() -- 9 jam (lembur 2 jam) -> pokok tetap flat gajiHari penuh + lembur diprorata NAIK (baseline lembur, tidak berubah oleh fix ini)', () => {
  const ctx = setupPayroll({
    whDate: '2026-09-11', whJenisHari: 'biasa',
    whMasuk: '07:00', whPulang: '17:00', whIstMulai: '12:00', whIstSelesai: '13:00',
    whGaji: '65000', whPotongan: '', whTambahan: '',
  });
  ctx.Payroll.addWorkDay();
  const w = ctx.D.workDays[0];
  assert.equal(w.totalJam, 9);
  assert.equal(w.jamLembur, 2);
  assert.equal(w.pokok, 65000);
  assert.equal(w.lembur, Math.round(2 * (65000 / 7 * 1.5)));
  assert.equal(w.total, w.pokok + w.lembur);
});

test('addWorkDay() -- jenis "minggu" -> pokok pakai tarifMinggu flat, TIDAK ikut diprorata oleh fix ini walau totalJam<7', () => {
  const ctx = setupPayroll({
    whDate: '2026-09-13', whJenisHari: 'minggu',
    whMasuk: '07:00', whPulang: '11:00', whIstMulai: '12:00', whIstSelesai: '13:00',
    whGaji: '65000', whPotongan: '', whTambahan: '',
  }, { tarifMinggu: 139000 });
  ctx.Payroll.addWorkDay();
  const w = ctx.D.workDays[0];
  assert.equal(w.jenis, 'minggu');
  assert.equal(w.pokok, 139000);
  assert.equal(w.lembur, 0);
});
