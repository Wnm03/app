'use strict';
// tests/ownership-sync-debt-piutang.test.js — cakupan Sesi 255 (Ownership
// Sync — Piutang & Utang). Menutup gap yang ditemukan audit S254/S255:
// Debt & Receivable belum pakai OwnershipEngine, pola SAMA PERSIS
// isAssetOwnershipSelf()/Aset.totalValue() (Sesi 193) & DanaKelolaan
// (Sesi 195) — 0 rumus baru, 0 UI diubah, 0 business logic baru selain
// nambah 1 filter ownership di atas logic lama.
//
// Target: isPiutangOwnershipSelf()/isDebtOwnershipSelf() (helper baru,
// reuse OwnershipEngine), Piutang.totalValue(), Debt.totalValue(),
// Debt.totalCicilanBulanan() (modules/finance/piutang-utang.js), cascade ke
// Kekayaan.currentNetWorth() (Net Worth), DanaKelolaan.sumPiutang()/
// sumDebt()/summary() (Dana Kelolaan).
//
// RULE yang dites di sini:
//   - SELF (eksplisit atau default/tanpa field ownership) -> dihitung normal.
//   - INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY -> DIKECUALIKAN dari Total
//     Piutang/Total Utang/DSR/Net Worth, TAPI TIDAK dihapus dari D.piutang/
//     D.debts (histori tetap tersimpan, masih tampil di renderList()).
//   - Piutang non-SELF ikut dijumlah ke DanaKelolaan.byType()/summary().total
//     (analog Aset — asset-like, uang yang ditagih ke pihak lain).
//   - Utang non-SELF TIDAK ikut summary().total (beda sifat — kewajiban,
//     bukan dana), tapi tetap terlihat lewat summary().utangNonSelf.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    piutang: [
      { id: 'p1', name: 'Piutang Sendiri', nilai: 1000000, lunas: false }, // default SELF
      { id: 'p2', name: 'Piutang Investor', nilai: 2000000, lunas: false, ownership: 'INVESTOR' },
      { id: 'p3', name: 'Piutang Keluarga', nilai: 500000, lunas: false, ownership: 'family' },
      { id: 'p4', name: 'Piutang Lunas Non-SELF', nilai: 900000, lunas: true, ownership: 'CUSTOMER' },
    ],
    debts: [
      { id: 'd1', name: 'Utang Sendiri', nilai: 3000000, cicilanBulanan: 300000, lunas: false }, // default SELF
      { id: 'd2', name: 'Utang Titipan', nilai: 4000000, cicilanBulanan: 400000, lunas: false, ownership: 'THIRD_PARTY' },
      { id: 'd3', name: 'Utang Keluarga', nilai: 1000000, cicilanBulanan: 100000, lunas: false, ownership: 'FAMILY' },
    ],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/finance/piutang-utang.js'],
    { D, escapeHtml: (s) => String(s), fmt: (n) => String(n), save: () => {}, sameId: (a, b) => a === b },
    ['OwnershipEngine', 'Piutang', 'Debt', 'isPiutangOwnershipSelf', 'isDebtOwnershipSelf'],
  );
}

test('isPiutangOwnershipSelf() — tanpa field ownership -> true (default SELF)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isPiutangOwnershipSelf(D.piutang[0]), true);
});

test('isPiutangOwnershipSelf() — INVESTOR/FAMILY (lowercase) -> false', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isPiutangOwnershipSelf(D.piutang[1]), false);
  assert.equal(ctx.isPiutangOwnershipSelf(D.piutang[2]), false, 'lowercase "family" harus dinormalisasi via OwnershipEngine');
});

test('isDebtOwnershipSelf() — tanpa field ownership -> true, THIRD_PARTY/FAMILY -> false', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isDebtOwnershipSelf(D.debts[0]), true);
  assert.equal(ctx.isDebtOwnershipSelf(D.debts[1]), false);
  assert.equal(ctx.isDebtOwnershipSelf(D.debts[2]), false);
});

test('Piutang.totalValue() — HANYA piutang SELF & belum lunas yang dijumlah', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // p1 (1jt, SELF, belum lunas). p2/p3 non-SELF dikecualikan. p4 non-SELF & lunas (dobel alasan dikecualikan).
  assert.equal(ctx.Piutang.totalValue(), 1000000);
});

test('Piutang.totalValue() — D.piutang ASLI tidak berubah (histori non-SELF tetap tersimpan)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Piutang.totalValue();
  assert.equal(D.piutang.length, 4);
});

test('Debt.totalValue() — HANYA utang SELF & belum lunas yang dijumlah', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // d1 (3jt, SELF). d2/d3 non-SELF dikecualikan.
  assert.equal(ctx.Debt.totalValue(), 3000000);
});

test('Debt.totalCicilanBulanan() — HANYA cicilan utang SELF yang dijumlah (mempengaruhi DSR)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // d1 cicilan 300rb (SELF). d2/d3 non-SELF dikecualikan.
  assert.equal(ctx.Debt.totalCicilanBulanan(), 300000);
});

test('Debt.totalValue()/totalCicilanBulanan() — kalau OwnershipEngine tidak dimuat, fallback hitung semua utang (regresi lama tetap jalan)', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/finance/piutang-utang.js'],
    { D, escapeHtml: (s) => String(s), fmt: (n) => String(n), save: () => {}, sameId: (a, b) => a === b },
    ['Debt', 'Piutang'],
  );
  assert.equal(ctx.Debt.totalValue(), 3000000 + 4000000 + 1000000);
  assert.equal(ctx.Debt.totalCicilanBulanan(), 300000 + 400000 + 100000);
  assert.equal(ctx.Piutang.totalValue(), 1000000 + 2000000 + 500000);
});

// --- Cascade: Net Worth (Kekayaan.currentNetWorth()) ---

test('cascade — Kekayaan.currentNetWorth() (Net Worth) otomatis exclude piutang/utang non-SELF TANPA perubahan tambahan di modules-calc.js', () => {
  const D = makeD();
  D.accounts = [];
  D.assets = [];
  D.pajakZakat = {};
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/finance/akun.js',
      'modules/asset/aset.js',
      'modules/finance/piutang-utang.js',
      'pajak-aset-ui-wrappers.js',
      'modules/shared/modules-calc.js',
    ],
    {
      D,
      Etalase: { totalModalStok: () => 0 },
      uid: () => 'x',
      save: () => {},
      todayStr: () => '2026-01-01',
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      sameId: (a, b) => a === b,
    },
    ['OwnershipEngine', 'Kekayaan', 'Piutang', 'Debt'],
  );
  // netWorth = saldoAkun(0) + aset(0) + inventori(0) + piutangSELF(1jt) - utangJT(0) - utangSELF(3jt)
  assert.equal(ctx.Kekayaan.currentNetWorth(), 1000000 - 3000000);
});

// --- Cascade: Dana Kelolaan ---

function makeDanaCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/finance/piutang-utang.js', 'modules/finance/dana-kelolaan.js'],
    { D, escapeHtml: (s) => String(s), fmt: (n) => String(n), save: () => {}, sameId: (a, b) => a === b, uid: () => 'x' },
    ['OwnershipEngine', 'DanaKelolaan'],
  );
}

test('DanaKelolaan.sumPiutang() — HANYA piutang belum lunas ber-ownership tipe yang diminta', () => {
  const D = makeD();
  D.accounts = []; D.assets = []; D.cobek = [];
  const ctx = makeDanaCtx(D);
  assert.equal(ctx.DanaKelolaan.sumPiutang('INVESTOR'), 2000000);
  assert.equal(ctx.DanaKelolaan.sumPiutang('FAMILY'), 500000, 'lowercase "family" harus dinormalisasi');
  assert.equal(ctx.DanaKelolaan.sumPiutang('CUSTOMER'), 0, 'p4 CUSTOMER tapi sudah lunas -> tidak dihitung');
});

test('DanaKelolaan.sumDebt() — HANYA utang belum lunas ber-ownership tipe yang diminta', () => {
  const D = makeD();
  D.accounts = []; D.assets = []; D.cobek = [];
  const ctx = makeDanaCtx(D);
  assert.equal(ctx.DanaKelolaan.sumDebt('THIRD_PARTY'), 4000000);
  assert.equal(ctx.DanaKelolaan.sumDebt('FAMILY'), 1000000);
  assert.equal(ctx.DanaKelolaan.sumDebt('INVESTOR'), 0);
});

test('DanaKelolaan.byType()/summary().total — piutang non-SELF ikut dijumlah (analog Aset)', () => {
  const D = makeD();
  D.accounts = []; D.assets = []; D.cobek = [];
  const ctx = makeDanaCtx(D);
  assert.equal(ctx.DanaKelolaan.byType('INVESTOR'), 2000000, 'hanya dari sumPiutang, 4 sumber lain 0');
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.investor, 2000000);
  assert.equal(s.keluarga, 500000);
  assert.equal(s.total, 2000000 + 500000);
});

test('DanaKelolaan.summary().utangNonSelf — utang non-SELF terlihat terpisah, TIDAK ikut summary().total', () => {
  const D = makeD();
  D.accounts = []; D.assets = []; D.cobek = [];
  const ctx = makeDanaCtx(D);
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.utangNonSelf, 4000000 + 1000000);
  assert.equal(s.total, 2000000 + 500000, 'utangNonSelf TIDAK ikut ditambahkan ke total (beda sifat: kewajiban, bukan dana)');
});

test('DanaKelolaan — D.piutang/D.debts ASLI tidak berubah setelah summary() dipanggil', () => {
  const D = makeD();
  D.accounts = []; D.assets = []; D.cobek = [];
  const ctx = makeDanaCtx(D);
  ctx.DanaKelolaan.summary();
  assert.equal(D.piutang.length, 4);
  assert.equal(D.debts.length, 3);
});
