'use strict';
// tests/fix-2026-08-31-renov-project-unassigned-expense-sync.test.js
// SESI FIX-2026-08-31 — audit user: "renov" Kuota sisa masih Rp377rb
// padahal sudah teralokasi ke beberapa holding/aset.
//
// ROOT CAUSE: transaksi ber-`renovProjectLinkId` ("🔨 Catat juga ke Proyek
// Renovasi?") TANPA `deductionOwnerId` ("👤 Ditanggung: <owner>") tidak
// pernah kehitung ke `linkedExpenseTotal` (fix PATCH-2026-08-14, filter
// `resolveTxOwnerAssignment()` -> `deductionOwnerId`), sehingga TIDAK ikut
// mengurangi `estimatedUnallocated`/"Kuota sisa" walau uangnya sudah
// keluar dari akun — divergensi ini sudah lama terlihat lewat
// `majorisRenovReconciliation().synced===false` (lihat
// `patch-2026-08-14-b-majoris-deductionowner-sync.test.js` kasus #2) tapi
// SEBELUM sesi ini tidak pernah jadi INPUT formula, cuma sinyal pasif.
//
// Target: `DanaTitipanPortfolioAPI._renovExpenseTotalForOwner()`
// (dana-titipan-aggregation-api.js) — jalur pengeluaran KETIGA, wiring ke
// `build()` (`o.renovExpenseTotal`, `spent`/`available`,
// `majorisRenovReconciliation().deductionOwnerTotal`).
//
// 0 rumus `allocatedPrincipal`/`usedTotal`/`linkedExpenseTotal` lama
// disentuh — murni komponen pengurang baru yang SALING EKSKLUSIF dgn
// keduanya (guard `!t.titipanLinkId` & `!resolveTxOwnerAssignment(...)`).

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
      'modules/finance/dana-titipan-aggregation-api.js',
    ],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      sameId: (a, b) => String(a) === String(b),
      Aset: {
        _resolveLinkedInvestmentOwners(a) {
          if (!a || !a.investmentId) return null;
          const h = (D.investments || []).find((x) => String(x.id) === String(a.investmentId));
          if (!h) return null;
          return h.owners || [];
        },
      },
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'resolveTxOwnerSplitForAccount', 'resolveTxOwnerAssignment', 'sameId'],
  );
}

function baseD(extra) {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [], assets: [], transactions: [], accounts: [], titipanCommitments: [], titipanReturns: [], ...extra };
}

test('1. REPRO laporan user: transaksi renovProjectLinkId TANPA deductionOwnerId, akun 1-owner -> sekarang ikut mengurangi estimatedUnallocated/Kuota sisa', () => {
  const D = baseD({
    assets: [{
      id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 9145761,
      owners: [{ ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false }],
    }],
    // Pokok Dikomit = persis allocatedPrincipal (9.145.761) + pengeluaran
    // renov (377.244), supaya kalau fix ini TIDAK ada, sisa 377.244 itu
    // akan tampil sbg "belum teralokasi" (skenario asli laporan user).
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'renov', principalAmount: 9145761 + 377244 }],
    transactions: [
      // Ditandai "Proyek Renovasi" tapi TIDAK juga "Ditanggung: renov" --
      // persis skenario laporan user (owner "renov", Majoris).
      { type: 'expense', accountId: 'acc1', amount: 377244, renovProjectLinkId: 'p1' },
    ],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const renov = projection.owners.find((o) => o.ownerId === 'renov');
  assert.ok(renov, 'owner renov harus muncul di projection');
  assert.equal(renov.allocatedPrincipal, 9145761);

  const buggyOldValue = renov.principalAmount - renov.allocatedPrincipal; // sebelum fix: 377244
  assert.equal(renov.renovExpenseTotal, 377244);
  assert.equal(renov.linkedExpenseTotal, 0, 'tidak boleh dobel-hitung ke linkedExpenseTotal (assignment eksplisit tetap kosong)');
  assert.equal(renov.estimatedUnallocated, 0, 'sesudah fix, 377.244 yg sudah keluar utk renovasi tidak boleh lagi tampil "belum teralokasi"');
  assert.notEqual(renov.estimatedUnallocated, buggyOldValue, 'estimatedUnallocated TIDAK BOLEH lagi mengabaikan pengeluaran ber-renovProjectLinkId');
  assert.equal(renov.allocationStatus, 'OK');
});

test('2. akun patungan 2+ owner non-SELF TANPA deductionOwnerId -> SENGAJA dilewati (0 tebak-tebakan assignment), renovExpenseTotal=0 utk keduanya', () => {
  const D = baseD({
    assets: [{
      id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 9422790,
      owners: [
        { ownerId: 'renov', porsi: 84.89, ownerName: 'renov', isSelf: false },
        { ownerId: 'sihab', porsi: 15.11, ownerName: 'Mas Sihab', isSelf: false },
      ],
    }],
    titipanCommitments: [
      { ownerId: 'renov', ownerName: 'renov', principalAmount: 9522244 },
      { ownerId: 'sihab', ownerName: 'Mas Sihab', principalAmount: 1700000 },
    ],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 377244, renovProjectLinkId: 'p1' },
    ],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const renov = projection.owners.find((o) => o.ownerId === 'renov');
  const sihab = projection.owners.find((o) => o.ownerId === 'sihab');
  assert.equal(renov.renovExpenseTotal, 0, 'akun 2+ owner tanpa assignment eksplisit -- ambigu, jangan ditebak');
  assert.equal(sihab.renovExpenseTotal, 0);
});

test('3. transaksi renovProjectLinkId YANG SUDAH ber-deductionOwnerId eksplisit -- TIDAK dihitung dobel (sudah masuk linkedExpenseTotal)', () => {
  const D = baseD({
    assets: [{
      id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 5000000,
      owners: [{ ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false }],
    }],
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'renov', principalAmount: 11000000 }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 300000, renovProjectLinkId: 'p1', deductionOwnerId: 'renov' },
    ],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const renov = projection.owners.find((o) => o.ownerId === 'renov');
  assert.equal(renov.linkedExpenseTotal, 300000);
  assert.equal(renov.renovExpenseTotal, 0, 'transaksi yg sudah diassign eksplisit tidak boleh kehitung dobel di renovExpenseTotal');
  assert.equal(renov.estimatedUnallocated, 11000000 - 5000000 - 300000);
});

test('4. transaksi ber-titipanLinkId (jalur "Catat Pengeluaran Dana Titipan") TIDAK dihitung dobel di renovExpenseTotal walau juga ber-renovProjectLinkId', () => {
  const D = baseD({
    assets: [{
      id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 5000000,
      owners: [{ ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false }],
    }],
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'renov', principalAmount: 11000000 }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 200000, titipanLinkId: 'renov', renovProjectLinkId: 'p1' },
    ],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const renov = projection.owners.find((o) => o.ownerId === 'renov');
  assert.equal(renov.usedTotal, 200000);
  assert.equal(renov.renovExpenseTotal, 0, 'transaksi ber-titipanLinkId sudah kehitung usedTotal, tidak boleh dobel di renovExpenseTotal');
  assert.equal(renov.estimatedUnallocated, 11000000 - 5000000 - 200000);
});

test('5. majorisRenovReconciliation().deductionOwnerTotal sekarang ikutkan renovExpenseTotal -> synced kembali true stlh fix (skenario test #1)', () => {
  const D = baseD({
    assets: [{
      id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 9145761,
      owners: [{ ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false }],
    }],
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'renov', principalAmount: 9145761 + 377244 }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 377244, renovProjectLinkId: 'p1' },
    ],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const r = ctx.DanaTitipanPortfolioAPI.majorisRenovReconciliation(projection.owners, projection.totals.principalAmountTotal);
  assert.equal(r.pengeluaranMajoris, 377244);
  assert.equal(r.deductionOwnerTotal, 377244);
  assert.equal(r.synced, true, 'sesudah fix, tag Renov & Kuota sisa harus sinkron lagi utk transaksi 1-owner tanpa deductionOwnerId');
});

test('6. o.holdings kosong / owner belum py holding sama sekali -> renovExpenseTotal 0, 0 crash (pola sama linkedExpenseTotal)', () => {
  const D = baseD({
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'renov', principalAmount: 5000000 }],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const renov = projection.owners.find((o) => o.ownerId === 'renov');
  assert.ok(renov);
  assert.equal(renov.renovExpenseTotal, 0);
  assert.equal(renov.estimatedUnallocated, 5000000);
});
