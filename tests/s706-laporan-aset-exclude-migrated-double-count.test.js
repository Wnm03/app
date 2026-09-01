'use strict';
// tests/s706-laporan-aset-exclude-migrated-double-count.test.js — Sesi S706
// (Temuan #2, lanjutan audit modul Aset sesi S705).
//
// Bug: LaporanAset.nilaiAset()/ringkasanKekayaan()/build().daftarAset
// (modules/asset/aset-reports.js) hanya memfilter isAssetOwnershipSelf(),
// TIDAK memfilter `!a._migratedToInvestmentId` / `!a.investmentId` —
// padahal Aset.totalValue() (modules/asset/aset.js) sudah memfilter
// KEDUANYA sejak fitur migrasi Buku Aset -> Holding Investasi (s476a) &
// tautan manual (Sesi B8). Efeknya: aset yang nilainya sudah "pindah" ke
// sisi Investasi tetap ikut dijumlah lagi di kartu "📑 Laporan Aset" —
// double count antara Laporan Aset & Investasi.
//
// Fix: tambah filter `!a._migratedToInvestmentId` & `!a.investmentId` di
// ketiga titik tsb, pola SAMA PERSIS Aset.totalValue(). Test di bawah
// membuktikan populasi LaporanAset sekarang identik dengan
// Aset.totalValue() walau ada aset yang sudah termigrasi/tertaut.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function assetCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js'],
    { D, escapeHtml: (s) => String(s), fmtFull: (n) => 'Rp ' + Math.round(n || 0) },
    ['OwnershipEngine', 'Aset', 'LaporanAset', 'isAssetOwnershipSelf'],
  );
}

function migratedAndLinkedAssets() {
  return {
    assets: [
      { id: 'a1', name: 'Rumah Sendiri', jenis: 'Rumah/Bangunan', nilai: 800000000 },
      { id: 'a2', name: 'Reksadana (sudah migrasi ke Holding)', jenis: 'Reksadana', nilai: 100000000, _migratedToInvestmentId: 'inv1' },
      { id: 'a3', name: 'Saham (tertaut manual ke Holding)', jenis: 'Saham', nilai: 50000000, investmentId: 'inv2' },
    ],
    investments: [
      { id: 'inv1', name: 'Holding Reksadana' },
      { id: 'inv2', name: 'Holding Saham' },
    ],
    accounts: [],
    transactions: [],
  };
}

test('S706 FIX: LaporanAset.nilaiAset() exclude aset yang sudah _migratedToInvestmentId / investmentId (sama dgn Aset.totalValue())', () => {
  const D = migratedAndLinkedAssets();
  const ctx = assetCtx(D);
  const nilai = ctx.LaporanAset.nilaiAset();

  // Total mentah semua 3 aset = 950jt — kalau bug masih ada, totalPasar akan
  // sebesar ini (double count aset yang sudah "pindah" ke Investasi).
  const totalMentahSemua = 950000000;
  assert.notEqual(nilai.totalPasar, totalMentahSemua);
  // Hanya a1 (Rumah, tidak termigrasi/tertaut) yang boleh ikut dihitung.
  assert.equal(nilai.totalPasar, 800000000);
  assert.equal(nilai.totalBuku, 800000000);
});

test('S706 FIX: LaporanAset.nilaiAset() populasinya identik dgn Aset.totalValue() walau ada aset termigrasi/tertaut', () => {
  const D = migratedAndLinkedAssets();
  const ctx = assetCtx(D);
  const nilai = ctx.LaporanAset.nilaiAset();
  const dashboardTotal = ctx.Aset.totalValue();
  assert.equal(nilai.totalPasar, dashboardTotal);
});

test('S706 FIX: LaporanAset.ringkasanKekayaan().jumlahAset tidak ikut hitung aset termigrasi/tertaut', () => {
  const D = migratedAndLinkedAssets();
  const ctx = assetCtx(D);
  const ringkasan = ctx.LaporanAset.ringkasanKekayaan();
  assert.equal(ringkasan.jumlahAset, 1);
  assert.equal(ringkasan.totalNilaiPasar, 800000000);
});

test('S706 FIX: LaporanAset.build().daftarAset tidak menampilkan aset termigrasi/tertaut', () => {
  const D = migratedAndLinkedAssets();
  const ctx = assetCtx(D);
  const data = ctx.LaporanAset.build();
  assert.equal(data.daftarAset.length, 1);
  assert.equal(data.daftarAset[0].id, 'a1');
});

test('S706 REGRESI: 0 aset termigrasi/tertaut -> perilaku sama persis sebelum fix (0 regresi utk kasus normal)', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Rumah Sendiri', jenis: 'Rumah/Bangunan', nilai: 800000000 },
      { id: 'a2', name: 'Tanah Sendiri', jenis: 'Tanah', nilai: 500000000, ownership: 'SELF' },
    ],
    accounts: [],
    transactions: [],
  };
  const ctx = assetCtx(D);
  const nilai = ctx.LaporanAset.nilaiAset();
  assert.equal(nilai.totalPasar, 1300000000);
  const ringkasan = ctx.LaporanAset.ringkasanKekayaan();
  assert.equal(ringkasan.jumlahAset, 2);
  const data = ctx.LaporanAset.build();
  assert.equal(data.daftarAset.length, 2);
});
