'use strict';
// tests/sC-titipan-majoris-expense-comparison.test.js — Sesi C
// (AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md §3 Langkah B).
//
// Target: `DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o)`
// (modules/finance/dana-titipan-portfolio-render.js) — baris pembanding
// OTOMATIS "Estimasi dari Transaksi <Akun>" di sebelah "Pokok Dikomit"
// manual. 100% REUSE `resolveTxOwnerSplitForAccount()` (filter-laporan.js,
// Sesi A) + `resolveTxOwnerAssignment()` (filter-laporan.js) — 0 rumus
// baru diuji ulang di sini, cuma kontrak wiring baru ini.
//
// FIX SESI S608 (audit user "apakah data dari akun transaksi yg ditautkan
// dari dana titipan sync otomatis ke dashboard Dana Titipan"): test 1 di
// bawah SEBELUMNYA mengasumsikan pembagian PROPORSIONAL
// (`MultiOwnerEngine.splitByPorsi`) — itu sendiri adalah bug yang membuat
// baris ini TIDAK sinkron dengan kartu "Porsi per Pemilik" di Riwayat
// Transaksi (yang sudah pakai assignment eksplisit per transaksi,
// `t.deductionOwnerId`, sejak sesi lama "Porsi per Pemilik bukan sistem
// patungan"). Diupdate sesi ini supaya konsisten dengan satu-satunya
// sumber kebenaran yang benar (explicit per-transaction assignment) —
// lihat test baru 1b/1c yang secara eksplisit membuktikan fix sync-nya
// (transaksi yang deductionOwnerId-nya milik owner MINOR tidak lagi
// "nyicip" ke owner mayoritas lewat proporsi).
//
// SENGAJA TIDAK diuji: `_principalCell()`/`_outstandingCell()`/
// `principalAmount`/`outstandingPrincipal` — Langkah B murni baris
// tambahan baca-saja, tidak menyentuh field-field itu (lihat test terakhir
// yang justru memastikan itu).
//
// CATATAN SESI s595/s596/s597: file ini SEBELUMNYA memuat
// `modules/finance/dana-titipan-portfolio-render.js` (ORPHAN, tidak
// terdaftar scripts/build.js). Migrasi s596 ke
// `modules/finance/dana-titipan-portfolio-presenter.js` (file produksi
// SATU-SATUNYA) sempat GAGAL di test 1/2/3/4/5: `_expenseComparisonForOwner`
// TIDAK ADA di file produksi — fitur "Sesi C" (baris pembanding otomatis
// "Estimasi dari Transaksi <Akun>") TIDAK PERNAH diporting dari orphan ke
// produksi, jadi TIDAK PERNAH sampai ke user meski tes lama hijau (menguji
// file yang salah). Ditandai `test.todo()` sementara di s596. SESI s597:
// fungsi `_expenseComparisonForOwner` + wiring markup (baris "Estimasi dari
// Transaksi ...", ditaruh persis setelah "Pokok Dikomit" di renderInto())
// diporting APA ADANYA ke `dana-titipan-portfolio-presenter.js` — 0
// rumus/logic diubah dari versi orphan. Semua `test.todo()` dikembalikan ke
// `test()` biasa, 6/6 PASS.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/filter-laporan.js',
      'modules/finance/akun.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      sameId: (a, b) => String(a) === String(b),
      invalidateAccBalCache: () => {},
      // Stub minimal Aset._resolveLinkedInvestmentOwners -- cuma baca `h.owners[]`
      // langsung (CATATAN: fungsi ini didefinisikan di realm Node host, BUKAN di dalam
      // vm sandbox, jadi TIDAK BISA memanggil `Investment.getOwners()` sandbox lewat
      // closure -- referensi bare identifier tetap resolve ke scope host, bukan
      // sandbox. Utk holding ber-owners[] eksplisit sederhana yang dipakai test ini,
      // hasilnya identik dgn `Investment.getOwners(h)` asli). 0 rumus baru diuji ulang
      // di sini -- murni stub dependency test, bukan bagian dari kode produksi.
      Aset: {
        _resolveLinkedInvestmentOwners(a) {
          if (!a || !a.investmentId) return null;
          const h = (D.investments || []).find((x) => String(x.id) === String(a.investmentId));
          if (!h) return null;
          return h.owners || [];
        },
      },
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'resolveTxOwnerSplitForAccount', 'resolveTxOwnerAssignment', 'getAccOwnersEffective', 'sameId'],
  );
}

function baseD(extra) {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [], assets: [], transactions: [], accounts: [], ...extra };
}

test('1. Aset multi-owner tertaut akun, ada expense -> muncul {total,accountNames}, dijumlah per ASSIGNMENT EKSPLISIT (bukan proporsi porsi %)', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 84.8781, ownerName: 'renov', isSelf: false },
      { ownerId: 'sihab', porsi: 15.1219, ownerName: 'Mas Sihab', isSelf: false },
    ] }],
    transactions: [
      // Kedua transaksi TIDAK punya deductionOwnerId eksplisit -> fallback ke
      // owner PERTAMA (renov), PERSIS pola resolveTxOwnerAssignment() (0 proporsi).
      { type: 'expense', accountId: 'acc1', amount: 100000 },
      { type: 'expense', accountId: 'acc1', amount: 54226 },
      { type: 'income', accountId: 'acc1', amount: 999999 }, // TIDAK ikut dihitung (bukan expense)
      { type: 'expense', accountId: 'acc-lain', amount: 500000 }, // TIDAK ikut (akun lain)
    ],
  });
  const ctx = makeCtx(D);
  const o = { ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] };
  const cmp = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o);
  assert.ok(cmp);
  assert.equal(cmp.accountNames.length, 1);
  assert.equal(cmp.accountNames[0], 'Majoris');
  // FIX S608: dulu (100000+54226)*0.848781 (proporsional) -- sekarang
  // fallback owner pertama (renov) dapat 100% dari kedua transaksi (0
  // deductionOwnerId eksplisit di data ini), bukan porsi 84.8781%.
  assert.equal(cmp.total, 100000 + 54226);
});

test('1b. FIX SYNC S608: transaksi dgn deductionOwnerId eksplisit ke owner MINOR -> masuk PENUH ke owner minor, 0 ke owner mayoritas (dulu bocor lewat proporsi splitByPorsi)', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 84.8781, ownerName: 'renov', isSelf: false },
      { ownerId: 'sihab', porsi: 15.1219, ownerName: 'Mas Sihab', isSelf: false },
    ] }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 200000, deductionOwnerId: 'sihab' },
    ],
  });
  const ctx = makeCtx(D);
  const oRenov = { ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] };
  const oSihab = { ownerId: 'sihab', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] };
  const cmpRenov = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(oRenov);
  const cmpSihab = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(oSihab);
  // SEBELUM fix: renov (porsi 84.8781%) akan tetap kebagian ~169.756 lewat
  // splitByPorsi walau transaksinya eksplisit ditandai milik sihab.
  assert.equal(cmpRenov.total, 0, 'renov TIDAK boleh kebagian expense yg eksplisit milik sihab');
  assert.equal(cmpSihab.total, 200000, 'sihab dapat 100% krn deductionOwnerId eksplisit menunjuk dia');
});

test('1c. konsistensi lintas-layar: total per-owner di sini HARUS sama dgn resolveTxOwnerAssignment() yg dipakai kartu "Porsi per Pemilik" (Riwayat Transaksi)', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 84.8781, ownerName: 'renov', isSelf: false },
      { ownerId: 'sihab', porsi: 15.1219, ownerName: 'Mas Sihab', isSelf: false },
    ] }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 154280, deductionOwnerId: 'renov' },
      { type: 'expense', accountId: 'acc1', amount: 51940 },
      { type: 'expense', accountId: 'acc1', amount: 500000, deductionOwnerId: 'sihab' },
    ],
  });
  const ctx = makeCtx(D);
  const resolved = ctx.resolveTxOwnerSplitForAccount('acc1');
  const manual = { renov: 0, sihab: 0 };
  D.transactions.forEach((t) => { manual[ctx.resolveTxOwnerAssignment(t, resolved.owners)] += t.amount; });
  const oRenov = { ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] };
  const oSihab = { ownerId: 'sihab', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] };
  assert.equal(ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(oRenov).total, manual.renov);
  assert.equal(ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(oSihab).total, manual.sihab);
});

test('2. owner tidak match porsi akun tsb -> null (row disembunyikan)', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
    ] }],
    transactions: [{ type: 'expense', accountId: 'acc1', amount: 100000 }],
  });
  const ctx = makeCtx(D);
  const o = { ownerId: 'orang_lain', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] };
  assert.equal(ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o), null);
});

test('3. holding investasi tertaut balik ke Aset ber-accountId -> ikut kehitung juga', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Majoris', unit: 1, avgPrice: 1000000, currentPrice: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
    ] }],
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', investmentId: 'h1', nilai: 1000000 }],
    transactions: [{ type: 'expense', accountId: 'acc1', amount: 200000 }],
  });
  const ctx = makeCtx(D);
  const o = { ownerId: 'renov', holdings: [{ type: 'investasi', linkedInvestmentId: 'h1' }] };
  const cmp = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o);
  assert.ok(cmp);
  assert.equal(cmp.total, 200000);
  assert.equal(cmp.accountNames.length, 1);
  assert.equal(cmp.accountNames[0], 'Majoris');
});

test('4. tidak ada holding tertaut akun sama sekali -> null (0 error dilempar)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const o = { ownerId: 'renov', holdings: [] };
  assert.equal(ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o), null);
});

test('5. dua holding mengarah ke akun SAMA -> dedup, tidak dihitung dobel', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
    ] }],
    transactions: [{ type: 'expense', accountId: 'acc1', amount: 100000 }],
  });
  const ctx = makeCtx(D);
  const o = { ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }, { type: 'aset', linkedAssetId: 'a1' }] };
  const cmp = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o);
  assert.equal(cmp.total, 100000);
  assert.equal(cmp.accountNames.length, 1);
});

test('6. tidak menyentuh _principalCell/_outstandingCell (masih ada & tidak berubah kontrak)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.equal(typeof ctx.DanaTitipanPortfolioPresenter._principalCell, 'function');
  assert.equal(typeof ctx.DanaTitipanPortfolioPresenter._outstandingCell, 'function');
  assert.equal(ctx.DanaTitipanPortfolioPresenter._principalCell({ principalAmount: null }), '<span class="u-t2">Belum dicatat</span>');
});

test('7. SESI S620 (twin dari s620-titipan-account-only-owner-linked-expense.test.js): owner "Uang motor" 0 holding sama sekali, owners[] LANGSUNG di akun BRI -> baris "Estimasi dari Transaksi <Akun>" tetap muncul & terhitung benar', () => {
  const D = baseD({
    accounts: [{ id: 'acc-bri', name: 'BRI', owners: [
      { ownerId: 'uang-motor', porsi: 100, ownerName: 'Uang motor' },
    ] }],
    transactions: [{ type: 'expense', accountId: 'acc-bri', amount: 100000, deductionOwnerId: 'uang-motor' }],
  });
  const ctx = makeCtx(D);
  const o = { ownerId: 'uang-motor', holdings: [] };
  const cmp = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o);
  assert.ok(cmp, 'baris pembanding tidak boleh lagi disembunyikan utk owner akun-only ini');
  assert.equal(cmp.total, 100000);
  assert.equal(cmp.accountNames.length, 1);
  assert.equal(cmp.accountNames[0], 'BRI');
});
