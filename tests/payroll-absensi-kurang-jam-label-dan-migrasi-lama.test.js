'use strict';
/**
 * payroll-absensi-kurang-jam-label-dan-migrasi-lama.test.js — dua item tambahan dari audit
 * user di luar scope fix pokok-prorata (v1684) itu sendiri, tapi masih 1 domain (payroll-absensi.js),
 * dikerjakan bareng dalam 1 sesi ringan:
 *
 * 1) Payroll.jamKurang(w) — Riwayat Absensi dulu cuma tampil "(lembur N jam)" kalau totalJam>7,
 *    tapi tidak ada info "(kurang N jam)" kalau totalJam<7, padahal sejak fix pokok-prorata
 *    nominalnya sekarang beda-beda sesuai jam kerja. Helper ini dipakai renderWorkDays() utk
 *    menambah label itu di whList.
 *
 * 2) Payroll.auditPokokProrataLama() / fixPokokProrataLama() / runPokokProrataLamaMigration() —
 *    entri D.workDays yang tersimpan SEBELUM fix pokok-prorata (v1684) masih menyimpan pokok
 *    FLAT ke gajiHariInput penuh walau totalJam<7 (bug lama). Migrasi ini mendeteksi & (dgn
 *    konfirmasi user) mengoreksi entri semacam itu jadi hasil prorata yang benar, TANPA
 *    menyentuh entri yang jenis-nya minggu/borongan atau yang sudah benar (dibuat setelah fix).
 *
 * Pola stub sama seperti tests/payroll-absensi-pokok-prorata-kurang-jam.test.js: render lain
 * di-stub no-op krn tidak relevan dgn kalkulasi/migrasi yang diuji di sini.
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

function makeFakeDoc(extraEls = {}) {
  const els = {};
  Object.keys(extraEls).forEach((id) => { els[id] = makeEl(extraEls[id]); });
  return { getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; } };
}

function setupPayroll(workDays, { askConfirmResult = true, toasts = [] } = {}) {
  const D = { workDays, profile: { gajiPokok: 65000, lemburMultiplier: 1.5, tarifMinggu: 139000 } };
  const document = makeFakeDoc({ whPokokProrataLamaBox: {} });
  const ctx = loadSource(
    ['modules/business/reset-gaji-mingguan.js', 'modules/shared/helper-teks.js', 'modules/business/payroll-absensi.js'],
    {
      document, D,
      uid: (() => { let n = 0; return () => ++n; })(),
      save() {}, toast: (msg) => toasts.push(msg),
      parsePzNum: (v) => parseFloat(String(v).replace(/[^\d.-]/g, '')) || 0,
      fmtFull: (n) => String(n),
      askConfirm: async () => askConfirmResult,
    },
    ['Payroll'],
  );
  ctx.Payroll.renderWorkDays = () => {};
  ctx.Payroll.renderDashMini = () => {};
  ctx.Payroll.renderWeekGrid = () => {};
  ctx.toasts = toasts;
  ctx.document = document;
  return ctx;
}

// ---- 1) Payroll.jamKurang() ----

test('jamKurang() -- hari biasa totalJam<7 -> selisih ke 7 jam', () => {
  const ctx = setupPayroll([]);
  assert.equal(ctx.Payroll.jamKurang({ jenis: 'biasa', totalJam: 6 }), 1);
  assert.equal(ctx.Payroll.jamKurang({ jenis: 'biasa', totalJam: 4 }), 3);
  assert.equal(ctx.Payroll.jamKurang({ jenis: 'biasa', totalJam: 6.5 }), 0.5);
});

test('jamKurang() -- 7 jam genap atau lebih -> 0 (bukan kekurangan)', () => {
  const ctx = setupPayroll([]);
  assert.equal(ctx.Payroll.jamKurang({ jenis: 'biasa', totalJam: 7 }), 0);
  assert.equal(ctx.Payroll.jamKurang({ jenis: 'biasa', totalJam: 9 }), 0);
});

test('jamKurang() -- jenis minggu/borongan tidak relevan -> selalu 0 walau totalJam<7', () => {
  const ctx = setupPayroll([]);
  assert.equal(ctx.Payroll.jamKurang({ jenis: 'minggu', totalJam: 3 }), 0);
  assert.equal(ctx.Payroll.jamKurang({ jenis: 'borongan', totalJam: 0 }), 0);
});

// ---- 2) Migrasi data lama ----

function oldFlatEntry(overrides = {}) {
  // Entri gaya SEBELUM fix v1684: pokok flat = gajiHariInput penuh walau totalJam<7.
  return Object.assign({
    id: 1, date: '2026-09-08', jenis: 'biasa', totalJam: 6, jamLembur: 0,
    gajiHariInput: 65000, pokok: 65000, lembur: 0, potongan: 0, tambahan: 0, total: 65000,
  }, overrides);
}

test('auditPokokProrataLama() -- mendeteksi entri lama yang masih flat', () => {
  const w = oldFlatEntry();
  const ctx = setupPayroll([w]);
  const affected = ctx.Payroll.auditPokokProrataLama();
  assert.equal(affected.length, 1);
  assert.equal(affected[0].id, 1);
});

test('auditPokokProrataLama() -- TIDAK menandai entri yang sudah benar (dibuat setelah fix)', () => {
  const wSudahBenar = oldFlatEntry({ id: 2, pokok: Math.round(65000 / 7 * 6), total: Math.round(65000 / 7 * 6) });
  const ctx = setupPayroll([wSudahBenar]);
  assert.equal(ctx.Payroll.auditPokokProrataLama().length, 0);
});

test('auditPokokProrataLama() -- TIDAK menandai jenis minggu/borongan atau 7 jam genap', () => {
  const wMinggu = oldFlatEntry({ id: 3, jenis: 'minggu', totalJam: 4, pokok: 139000, gajiHariInput: 65000, total: 139000 });
  const wBorongan = oldFlatEntry({ id: 4, jenis: 'borongan', totalJam: 0, pokok: 100000, gajiHariInput: null, total: 100000 });
  const wPenuh = oldFlatEntry({ id: 5, totalJam: 7, pokok: 65000, total: 65000 });
  const ctx = setupPayroll([wMinggu, wBorongan, wPenuh]);
  assert.equal(ctx.Payroll.auditPokokProrataLama().length, 0);
});

test('fixPokokProrataLama() -- mengoreksi pokok & total, tidak menyentuh entri lain', () => {
  const wLama = oldFlatEntry({ id: 1 });
  const wBenar = oldFlatEntry({ id: 2, totalJam: 4, pokok: Math.round(65000 / 7 * 4), total: Math.round(65000 / 7 * 4) });
  const ctx = setupPayroll([wLama, wBenar]);
  const n = ctx.Payroll.fixPokokProrataLama();
  assert.equal(n, 1);
  const fixed = ctx.D.workDays.find((w) => w.id === 1);
  assert.equal(fixed.pokok, Math.round(65000 / 7 * 6));
  assert.equal(fixed.total, Math.round(65000 / 7 * 6));
  const untouched = ctx.D.workDays.find((w) => w.id === 2);
  assert.equal(untouched.pokok, Math.round(65000 / 7 * 4));
});

test('fixPokokProrataLama() -- mempertahankan tambahan/potongan yang sudah ada saat menyesuaikan total', () => {
  const w = oldFlatEntry({ id: 1, tambahan: 5000, potongan: 2000, total: 65000 + 5000 - 2000 });
  const ctx = setupPayroll([w]);
  ctx.Payroll.fixPokokProrataLama();
  const fixed = ctx.D.workDays.find((x) => x.id === 1);
  const pokokBaru = Math.round(65000 / 7 * 6);
  assert.equal(fixed.pokok, pokokBaru);
  assert.equal(fixed.total, pokokBaru + 5000 - 2000);
});

test('runPokokProrataLamaMigration() -- tidak melakukan apa pun kalau tidak ada entri lama', async () => {
  const ctx = setupPayroll([oldFlatEntry({ id: 1, totalJam: 7, pokok: 65000, total: 65000 })]);
  await ctx.Payroll.runPokokProrataLamaMigration();
  assert.match(ctx.toasts[0], /Tidak ada data absensi lama/);
});

test('runPokokProrataLamaMigration() -- batal kalau user menolak konfirmasi', async () => {
  const w = oldFlatEntry({ id: 1 });
  const ctx = setupPayroll([w], { askConfirmResult: false });
  await ctx.Payroll.runPokokProrataLamaMigration();
  const untouched = ctx.D.workDays.find((x) => x.id === 1);
  assert.equal(untouched.pokok, 65000, 'batal -- pokok TIDAK boleh berubah kalau user menolak konfirmasi');
});

test('runPokokProrataLamaMigration() -- mengoreksi & toast ringkasan kalau user konfirmasi', async () => {
  const w = oldFlatEntry({ id: 1 });
  const ctx = setupPayroll([w], { askConfirmResult: true });
  await ctx.Payroll.runPokokProrataLamaMigration();
  const fixed = ctx.D.workDays.find((x) => x.id === 1);
  assert.equal(fixed.pokok, Math.round(65000 / 7 * 6));
  assert.match(ctx.toasts[0], /1 entri absensi lama dikoreksi/);
});

test('renderPokokProrataLamaBox() -- menampilkan tombol koreksi kalau ada entri lama, kosong kalau tidak', () => {
  const w = oldFlatEntry({ id: 1 });
  const ctx = setupPayroll([w]);
  ctx.Payroll.renderPokokProrataLamaBox();
  const box = ctx.document.getElementById('whPokokProrataLamaBox');
  assert.match(box.innerHTML, /Payroll\.runPokokProrataLamaMigration/);

  ctx.Payroll.fixPokokProrataLama();
  ctx.Payroll.renderPokokProrataLamaBox();
  assert.equal(box.innerHTML, '');
});
