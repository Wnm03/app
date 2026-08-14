'use strict';
// tests/patch-2026-08-14-titipan-unallocated-linked-expense.test.js
// SESI PATCH-2026-08-14 — audit user: "kenapa masih ada estimasi belum
// teralokasi padahal di akun keuangan tertaut pemilik terpotong sudah ada
// modal pengeluaran total". Reproduksi skenario laporan (dashboard "Dana
// Titipan" owner "renov": Pokok Dikomit Rp11.000.000, sudah ada
// pengeluaran tercatat di akun tertaut atas nama "renov" — tapi
// "Estimasi Belum Teralokasi" TETAP > 0 seolah uang itu masih menganggur).
//
// Target: `DanaTitipanPortfolioAPI.build()` (dana-titipan-aggregation-api.js)
// — field baru `o.linkedExpenseTotal`/`o.linkedExpenseAccountNames`
// (`_linkedExpenseTotalForOwner()`) sekarang IKUT MENGURANGI
// `estimatedUnallocated`/menaikkan risiko `allocationStatus:
// 'OVER_ALLOCATED'`, bukan cuma tampil pasif di baris "Estimasi dari
// Transaksi <Akun>" (dana-titipan-portfolio-render.js).
//
// 0 rumus `allocatedPrincipal`/`currentValue`/`gain`/`outstandingPrincipal`
// lama disentuh — murni menambah 1 komponen pengurang baru ke
// `estimatedUnallocated`/`overAllocatedAmount`/`available`.

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

test('1. REPRO bug laporan: pengeluaran di akun tertaut (deductionOwnerId) sekarang ikut mengurangi estimatedUnallocated, bukan cuma tampil pasif', () => {
  const D = baseD({
    assets: [{
      id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 9422790,
      owners: [
        { ownerId: 'renov', porsi: 84.89, ownerName: 'renov', isSelf: false },
        { ownerId: 'sihab', porsi: 15.11, ownerName: 'Mas Sihab', isSelf: false },
      ],
    }],
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'renov', principalAmount: 11000000 }],
    transactions: [
      // Belanja/renov yang sudah "Ditanggung: renov" di akun tertaut --
      // persis kartu "Porsi per Pemilik" di screenshot laporan user.
      { type: 'expense', accountId: 'acc1', amount: 154280, deductionOwnerId: 'renov' },
      { type: 'expense', accountId: 'acc1', amount: 500000, deductionOwnerId: 'renov' },
    ],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const renov = projection.owners.find((o) => o.ownerId === 'renov');
  assert.ok(renov, 'owner renov harus muncul di projection');

  // Sebelum fix: estimatedUnallocated = principal - allocatedPrincipal
  // SAJA (mengabaikan 654.280 yang SUDAH terpotong di akun tertaut).
  const buggyOldValue = 11000000 - renov.allocatedPrincipal;

  // Sesudah fix: linkedExpenseTotal harus kebaca (654.280) DAN ikut
  // mengurangi estimatedUnallocated.
  assert.equal(renov.linkedExpenseTotal, 654280);
  assert.equal(renov.estimatedUnallocated, 11000000 - renov.allocatedPrincipal - 654280);
  assert.notEqual(renov.estimatedUnallocated, buggyOldValue, 'estimatedUnallocated TIDAK BOLEH lagi mengabaikan pengeluaran akun tertaut');
  assert.equal(renov.allocationStatus, 'OK');
});

test('2. total pengeluaran akun tertaut melebihi sisa pokok -> OVER_ALLOCATED (bukan tetap tampil "belum teralokasi" positif)', () => {
  const D = baseD({
    assets: [{
      id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 9893370,
      owners: [{ ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false }],
    }],
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'renov', principalAmount: 11000000 }],
    transactions: [
      // Total pengeluaran akun tertaut milik renov: 1.506.415 (> sisa
      // 1.106.630 = 11.000.000 - 9.893.370) -> harus over-allocated.
      { type: 'expense', accountId: 'acc1', amount: 154280, deductionOwnerId: 'renov' },
      { type: 'expense', accountId: 'acc1', amount: 51940, deductionOwnerId: 'renov' },
      { type: 'expense', accountId: 'acc1', amount: 500000, deductionOwnerId: 'renov' },
      { type: 'expense', accountId: 'acc1', amount: 124760, deductionOwnerId: 'renov' },
      { type: 'expense', accountId: 'acc1', amount: 56972, deductionOwnerId: 'renov' },
      { type: 'expense', accountId: 'acc1', amount: 51564, deductionOwnerId: 'renov' },
      { type: 'expense', accountId: 'acc1', amount: 41550, deductionOwnerId: 'renov' },
      { type: 'expense', accountId: 'acc1', amount: 525349, deductionOwnerId: 'renov' },
    ],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const renov = projection.owners.find((o) => o.ownerId === 'renov');
  assert.equal(renov.linkedExpenseTotal, 1506415);
  assert.equal(renov.allocationStatus, 'OVER_ALLOCATED');
  assert.equal(renov.estimatedUnallocated, 0);
  assert.equal(renov.overAllocatedAmount, 9893370 + 1506415 - 11000000);
});

test('3. transaksi ber-titipanLinkId (jalur "Catat Pengeluaran Dana Titipan") TIDAK dihitung dobel di linkedExpenseTotal', () => {
  const D = baseD({
    assets: [{
      id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 5000000,
      owners: [{ ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false }],
    }],
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'renov', principalAmount: 11000000 }],
    transactions: [
      // Sudah dihitung usedTotal (jalur titipanLinkId) -- HARUS dikecualikan
      // dari linkedExpenseTotal walau accountId-nya sama & type expense.
      { type: 'expense', accountId: 'acc1', amount: 200000, titipanLinkId: 'renov' },
      // Pengeluaran biasa (bukan lewat jalur titipan expense) -- INI yang
      // masuk linkedExpenseTotal.
      { type: 'expense', accountId: 'acc1', amount: 300000, deductionOwnerId: 'renov' },
    ],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const renov = projection.owners.find((o) => o.ownerId === 'renov');
  assert.equal(renov.usedTotal, 200000);
  assert.equal(renov.linkedExpenseTotal, 300000, 'transaksi ber-titipanLinkId tidak boleh ikut kehitung lagi di linkedExpenseTotal');
  assert.equal(renov.estimatedUnallocated, 11000000 - 5000000 - 200000 - 300000);
});

test('4. tidak ada pengeluaran di akun tertaut -> linkedExpenseTotal 0, estimatedUnallocated TIDAK berubah dari perilaku lama (0 regresi)', () => {
  const D = baseD({
    assets: [{
      id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 7000000,
      owners: [{ ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false }],
    }],
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'renov', principalAmount: 10000000 }],
    transactions: [],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const renov = projection.owners.find((o) => o.ownerId === 'renov');
  assert.equal(renov.linkedExpenseTotal, 0);
  // Holding-nya TETAP tertaut ke akun multi-owner "Majoris" (nama akun
  // ikut kebaca) walau total pengeluarannya 0 -- pola sama
  // `_expenseComparisonForOwner()` lama (akun tertaut tercatat, bukan
  // "tidak ada akun tertaut sama sekali").
  assert.equal(JSON.stringify(renov.linkedExpenseAccountNames), JSON.stringify(['Majoris']));
  assert.equal(renov.estimatedUnallocated, 3000000);
  assert.equal(renov.allocationStatus, 'OK');
});
