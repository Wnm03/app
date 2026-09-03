'use strict';
// tests/cash-projection-titipan-pinjam-gap.test.js — Sesi audit-kartu-proyeksi-kas-insight
// (FIX GAP-CP-002). Cakupan: getMonthlyCashProjection() (modules/finance/cash-projection.js)
// HARUS ikut menghitung utang otomatis "Pinjam Dana Titipan" (autoTitipanOwnerId,
// cicilanBulanan:0 by design — lihat maybeCreateTitipanPinjamUtang(), piutang-utang.js)
// ke "Sisa Kewajiban", walau utang jenis ini TIDAK PERNAH disinkron ke D.bills lewat
// Debt.syncBill() (guard shouldHaveBill=!lunas&&cicilanBulanan>0 di fungsi itu).
//
// SEBELUM fix: utang ini 100% buta dari proyeksi (sisaKewajiban tidak berubah sama
// sekali walau ada utang Titipan belum lunas). SESUDAH fix: nilainya (d.nilai, outstanding)
// ikut masuk sisaKewajiban + proyeksiKas, dan muncul di kewajibanItems/topKewajiban utk
// transparansi (bukan disembunyikan jadi 1 angka gabungan yang membingungkan).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign({
    transactions: [],
    workDays: [],
    bills: [],
    debts: [],
    profile: {},
  }, overrides);
}

function makeCtx(D) {
  return loadSource(
    ['modules/business/reset-gaji-mingguan.js', 'modules/finance/tagihan-kalender.js', 'modules/finance/cash-projection.js'],
    { D }
  );
}

function titipanDebt(overrides) {
  return Object.assign({
    id: 'd1',
    name: 'Pinjam Dana Titipan: Bu Ani',
    jenis: 'pribadi',
    nilai: 500000,
    bunga: 0,
    cicilanBulanan: 0,
    lunas: false,
    autoTxId: 'tx1',
    autoTitipanOwnerId: 'owner1',
  }, overrides);
}

test('getMonthlyCashProjection() — utang Titipan-Pinjam belum lunas (cicilanBulanan:0, tanpa billId) IKUT masuk sisaKewajiban (fix GAP-CP-002)', () => {
  const D = makeD({ debts: [titipanDebt()] });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(6, 2026, {});
  assert.equal(r.sisaKewajiban, 500000);
  assert.equal(r.titipanPinjamUnscheduledTotal, 500000);
  assert.equal(r.proyeksiKas, 0 - 500000);
});

test('getMonthlyCashProjection() — utang Titipan-Pinjam SUDAH lunas TIDAK ikut sisaKewajiban', () => {
  const D = makeD({ debts: [titipanDebt({ lunas: true })] });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(6, 2026, {});
  assert.equal(r.sisaKewajiban, 0);
  assert.equal(r.titipanPinjamUnscheduledTotal, 0);
});

test('getMonthlyCashProjection() — utang manual biasa (bukan autoTitipanOwnerId) TANPA cicilan TIDAK ikut kehitung (0 perubahan perilaku lama utk utang manual)', () => {
  const D = makeD({ debts: [{ id: 'd2', name: 'Utang manual tanpa cicilan', nilai: 1000000, cicilanBulanan: 0, lunas: false }] });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(6, 2026, {});
  assert.equal(r.sisaKewajiban, 0);
  assert.equal(r.titipanPinjamUnscheduledTotal, 0);
});

test('getMonthlyCashProjection() — utang Titipan yang SUDAH punya billId (mis. sudah dikasih cicilanBulanan lewat Buku Utang manual) TIDAK dobel-hitung lewat jalur D.debts (biar D.bills yang hitung)', () => {
  const D = makeD({
    debts: [titipanDebt({ billId: 'bill1', cicilanBulanan: 100000 })],
    bills: [{ id: 'bill1', kind: 'utang', debtId: 'd1', name: 'Cicilan: Pinjam Dana Titipan: Bu Ani', amount: 100000, freq: 'bulanan', nextDue: '2026-07-20' }],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(6, 2026, {});
  // sisaKewajiban datang dari D.bills (100rb), BUKAN d.nilai (500rb) lewat jalur titipan --
  // titipanPinjamUnscheduledTotal harus 0 krn filter jalur ini butuh !billId.
  assert.equal(r.titipanPinjamUnscheduledTotal, 0);
  assert.equal(r.sisaKewajiban, 100000);
});

test('getMonthlyCashProjection() — beberapa utang Titipan-Pinjam sekaligus dijumlah semua & masuk kewajibanItems/topKewajiban', () => {
  const D = makeD({
    debts: [
      titipanDebt({ id: 'd1', name: 'Pinjam Dana Titipan: Bu Ani', nilai: 500000, autoTxId: 'tx1' }),
      titipanDebt({ id: 'd2', name: 'Pinjam Dana Titipan: Pak Budi', nilai: 300000, autoTxId: 'tx2', autoTitipanOwnerId: 'owner2' }),
    ],
    bills: [{ id: 'b1', kind: 'tagihan', freq: 'bulanan', amount: 900000, nextDue: '2026-07-05' }],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(6, 2026, {});
  assert.equal(r.titipanPinjamUnscheduledTotal, 800000);
  assert.equal(r.sisaKewajiban, 900000 + 800000);
  assert.ok(Array.isArray(r.kewajibanItems));
  assert.equal(r.kewajibanItems.length, 3);
  // topKewajiban diurutkan desc, ambil max 3 -- di sini pas 3 item, kontributor terbesar
  // (tagihan 900rb) harus di posisi pertama.
  assert.equal(r.topKewajiban[0].amount, 900000);
});

test('getMonthlyCashProjection() — 0 crash kalau D.debts tidak ada sama sekali (backward-compat, field baru tetap 0/kosong)', () => {
  const D = makeD();
  delete D.debts;
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.getMonthlyCashProjection(6, 2026, {}));
  const r = ctx.getMonthlyCashProjection(6, 2026, {});
  assert.equal(r.titipanPinjamUnscheduledTotal, 0);
  // 0 pakai assert.deepEqual di sini: array hasil balik dari vm sandbox (loadSource) beda
  // realm dari array literal di test (constructor Array beda instance) -- deepStrictEqual
  // node membandingkan cross-realm array sbg "sama struktur tapi tidak reference-equal"
  // (bukan bug kode, keterbatasan node:assert/strict thd nilai lintas vm.Context). Cek
  // length + Array.isArray saja sudah cukup utk assert "kosong".
  assert.ok(Array.isArray(r.kewajibanItems));
  assert.equal(r.kewajibanItems.length, 0);
  assert.ok(Array.isArray(r.topKewajiban));
  assert.equal(r.topKewajiban.length, 0);
});
