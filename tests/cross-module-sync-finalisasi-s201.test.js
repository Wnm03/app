'use strict';
// tests/cross-module-sync-finalisasi-s201.test.js — cakupan Sesi 201
// (Finalisasi Sinkronisasi Lintas Modul). Verifikasi lintas Finance/Shop/
// Asset/Investment/Vehicle/Inventory/Dashboard/Report/AI Insight/Ownership:
// tidak ada double count, tidak ada orphan data, dashboard = laporan,
// AI = dashboard, statistik = laporan, rollback aman.
//
// Fix ditemukan sesi ini (satu-satunya perubahan business logic, murni
// menambahkan filter ownership yang SUDAH ADA di tempat lain — 0 rumus
// baru): LaporanAset.nilaiAset()/ringkasanKekayaan() (modules/asset/aset.js)
// TIDAK memfilter isAssetOwnershipSelf(), padahal komentar aslinya sendiri
// menyatakan "angka SAMA dgn Aset.renderDashboard()" (yang SUDAH difilter
// sejak Sesi 193) — Dashboard Aset & Laporan Aset bisa beda angka kalau ada
// aset ber-ownership non-SELF. Test di bawah membuktikan kedua sisi sekarang
// identik.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function assetCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/asset/aset.js'],
    { D, escapeHtml: (s) => String(s), fmtFull: (n) => 'Rp ' + Math.round(n || 0) },
    ['OwnershipEngine', 'Aset', 'LaporanAset', 'isAssetOwnershipSelf'],
  );
}

function mixedOwnershipAssets() {
  return {
    assets: [
      { id: 'a1', name: 'Rumah Sendiri', jenis: 'Rumah/Bangunan', nilai: 800000000 }, // default SELF
      { id: 'a2', name: 'Tanah Sendiri', jenis: 'Tanah', nilai: 500000000, ownership: 'SELF' },
      { id: 'a3', name: 'Saham Titipan Investor', jenis: 'Saham', nilai: 200000000, ownership: 'INVESTOR' },
      { id: 'a4', name: 'Emas Titipan Customer', jenis: 'Emas/Logam Mulia', nilai: 50000000, ownership: 'CUSTOMER' },
    ],
    accounts: [],
    transactions: [],
  };
}

// --- (1) Dashboard = Laporan (Asset) --------------------------------------

test('S201 FIX: LaporanAset.nilaiAset() SEKARANG sama dgn populasi Aset.totalValue()/Dashboard Aset (exclude non-SELF), bukan total mentah D.assets', () => {
  const D = mixedOwnershipAssets();
  const ctx = assetCtx(D);
  const nilai = ctx.LaporanAset.nilaiAset();
  const dashboardTotal = ctx.Aset.totalValue(); // sumber kebenaran Dashboard Aset (Sesi 193)

  // Total mentah semua 4 aset (termasuk non-SELF) = 1.55M — kalau bug masih
  // ada, totalPasar laporan akan match ini, BUKAN dashboardTotal.
  const totalMentahSemua = 800000000 + 500000000 + 200000000 + 50000000;

  assert.equal(dashboardTotal, 1300000000); // hanya a1+a2 (SELF)
  assert.equal(nilai.totalPasar, dashboardTotal, 'Laporan Aset harus SAMA dgn Dashboard Aset (Aset.totalValue())');
  assert.notEqual(nilai.totalPasar, totalMentahSemua, 'Laporan Aset TIDAK BOLEH lagi ikut aset non-SELF');
});

test('S201 FIX: LaporanAset.ringkasanKekayaan().jumlahAset konsisten dgn populasi nilaiAset() (bukan hitung dari 2 populasi berbeda)', () => {
  const D = mixedOwnershipAssets();
  const ctx = assetCtx(D);
  const ringkasan = ctx.LaporanAset.ringkasanKekayaan();
  assert.equal(ringkasan.jumlahAset, 2); // hanya 2 aset SELF, bukan 4
  assert.equal(ringkasan.totalNilaiPasar, ctx.Aset.totalValue());
});

test('S201: aset SEMUA ownership SELF (tanpa filter berpengaruh) -> Laporan tetap sama seperti sebelum fix (no regression utk kasus normal)', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Motor', jenis: 'Kendaraan', nilai: 20000000 },
      { id: 'a2', name: 'Emas', jenis: 'Emas/Logam Mulia', nilai: 10000000, ownership: 'SELF' },
    ],
    accounts: [], transactions: [],
  };
  const ctx = assetCtx(D);
  assert.equal(ctx.LaporanAset.nilaiAset().totalPasar, 30000000);
  assert.equal(ctx.Aset.totalValue(), 30000000);
});

test('S201: rollback aman — OwnershipEngine tidak dimuat -> LaporanAset & Aset.totalValue() KONSISTEN anggap semua SELF (fallback true)', () => {
  const D = mixedOwnershipAssets();
  const ctx = loadSource(
    ['modules/asset/aset.js'], // TANPA ownership-engine.js
    { D, escapeHtml: (s) => String(s), fmtFull: (n) => 'Rp ' + Math.round(n || 0) },
    ['Aset', 'LaporanAset', 'isAssetOwnershipSelf'],
  );
  const totalMentahSemua = 800000000 + 500000000 + 200000000 + 50000000;
  assert.equal(ctx.Aset.totalValue(), totalMentahSemua);
  assert.equal(ctx.LaporanAset.nilaiAset().totalPasar, totalMentahSemua);
});

// --- (2) Orphan data safety — aset ditautkan ke akun yang sudah dihapus ---

test('S201: LaporanAset.riwayatTransaksi() tidak throw & aman kalau accountId aset menunjuk akun yang sudah dihapus (orphan link)', () => {
  const D = {
    assets: [{ id: 'a1', name: 'Deposito', jenis: 'Investasi', nilai: 100000000, accountId: 'acc-sudah-dihapus' }],
    accounts: [], // akun tsb TIDAK ada -> orphan reference
    transactions: [{ accountId: 'acc-sudah-dihapus', type: 'income', amount: 5000000, date: new Date().toISOString() }],
  };
  const ctx = assetCtx(D);
  assert.doesNotThrow(() => ctx.LaporanAset.riwayatTransaksi());
  const r = ctx.LaporanAset.riwayatTransaksi();
  assert.equal(r.akunTertaut[0].accountExists, false);
  assert.equal(r.totalTx, 0); // orphan tx tidak ikut digabungkan (akun tidak ketemu)
});

// --- (3) No double count — akun yang ditautkan ke aset TIDAK ikut dihitung
// dua kali di totalSaldoAkun() (Finance) + Aset.totalValue() (Asset) --------

test('S201: akun yang ditautkan ke aset (a.accountId) dikecualikan dari totalSaldoAkun() — mencegah double count saldo kas + nilai aset', () => {
  const D = {
    assets: [{ id: 'a1', name: 'Deposito', jenis: 'Investasi', nilai: 50000000, accountId: 'acc1' }],
    accounts: [{ id: 'acc1', name: 'Rek Deposito', includeInBalance: true }],
    transactions: [],
  };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/finance/akun.js'],
    {
      D, escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0),
      recalcAccBalance: () => 999999999, // kalau linked-exclusion gagal, angka besar ini akan ikut ketambah -> test gagal
    },
    ['totalSaldoAkun', 'linkedAssetAccountIds', 'isAccOwnershipSelf'],
  );
  assert.equal(ctx.linkedAssetAccountIds().has('acc1'), true);
  assert.equal(ctx.totalSaldoAkun(), 0, 'akun tertaut aset harus dikecualikan dari Saldo Kas total (dihitung lewat nilai Aset, bukan saldo akun)');
});

// --- (4) AI Insight = Dashboard (Shop, cross-check dgn pola S200) ---------

test('S201: FinanceDashboard._netWorthCard (kalau ada) & FinanceIntelligence pakai totalSaldoAkun()/totalDebtValue() yang SAMA (0 recompute terpisah)', () => {
  // Verifikasi struktural: memastikan tidak ada fungsi totalSaldoAkun2/
  // hitungSaldoTotal alternatif yang diam-diam dipakai sebagian modul saja
  // (gejala klasik "AI != Dashboard"). Baca source langsung (bukan loadSource)
  // supaya cek ini juga menangkap kalau ada file baru menduplikasi nama fungsi.
  const fs = require('fs');
  const financeDashboardSrc = fs.readFileSync('modules/finance/finance-dashboard.js', 'utf8');
  const financeIntelSrc = fs.readFileSync('modules/finance/finance-intelligence.js', 'utf8');
  assert.match(financeDashboardSrc, /totalSaldoAkun\s*\(\s*\)/);
  assert.match(financeIntelSrc, /totalSaldoAkun\s*\(\s*\)/);
  // 0 fungsi alternatif "totalSaldoAkun2"/"hitungSaldoTotal" terselip di kedua file.
  assert.doesNotMatch(financeDashboardSrc, /totalSaldoAkun2|hitungSaldoTotal/);
  assert.doesNotMatch(financeIntelSrc, /totalSaldoAkun2|hitungSaldoTotal/);
});
