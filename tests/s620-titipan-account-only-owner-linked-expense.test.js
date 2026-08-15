'use strict';
// tests/s620-titipan-account-only-owner-linked-expense.test.js — Sesi S620
// (laporan user, skenario "Uang motor": owner Dana Titipan yang cuma punya
// Pokok Dikomit tertaut LANGSUNG ke `owners[]` sebuah akun bank multi-owner
// (BRI) -- 0 Holding/Aset sama sekali di antaranya).
//
// Root cause & fix lengkap: lihat komentar di
// `resolveTxOwnerSplitForAccount()` (modules/finance/filter-laporan.js) &
// `DanaTitipanPortfolioAPI._linkedExpenseTotalForOwner()`
// (modules/finance/dana-titipan-aggregation-api.js). Ringkas: 2 fungsi itu
// SEBELUM sesi ini hanya pernah menemukan akun tertaut lewat Holding
// Investasi atau Aset -- owner yang owners-nya di-set LANGSUNG di
// `D.accounts[].owners[]` (dropdown "Porsi Kepemilikan Akun") tanpa
// Holding/Aset perantara tidak pernah kepotong pengeluarannya di dashboard
// Dana Titipan walau `deductionOwnerId` transaksinya sudah benar.
//
// Twin render-side test: lihat
// tests/sC-titipan-majoris-expense-comparison.test.js (test 7).

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
      'modules/finance/dana-titipan-aggregation-api.js',
    ],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      sameId: (a, b) => String(a) === String(b),
      invalidateAccBalCache: () => {},
      Aset: {
        _resolveLinkedInvestmentOwners(a) {
          if (!a || !a.investmentId) return null;
          const h = (D.investments || []).find((x) => String(x.id) === String(a.investmentId));
          if (!h) return null;
          return h.owners || [];
        },
      },
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'resolveTxOwnerSplitForAccount', 'resolveTxOwnerAssignment', 'getAccOwnersEffective', 'sameId'],
  );
}

function baseD(extra) {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [], assets: [], transactions: [], accounts: [], titipanCommitments: [], titipanReturns: [], ...extra };
}

test('1. REPRO bug laporan: owner tanpa Holding/Aset sama sekali (akun BRI multi-owner langsung) — resolveTxOwnerSplitForAccount() sekarang mengenali via owners[] akun', () => {
  const D = baseD({
    accounts: [{ id: 'acc-bri', name: 'BRI', owners: [
      { ownerId: 'uang-motor', porsi: 100, ownerName: 'Uang motor' },
    ] }],
  });
  const ctx = makeCtx(D);
  const resolved = ctx.resolveTxOwnerSplitForAccount('acc-bri');
  assert.ok(resolved, 'harus ketemu lewat fallback tier-3 (owners akun sendiri)');
  assert.equal(resolved.owners.length, 1);
  assert.equal(resolved.owners[0].ownerId, 'uang-motor');
});

test('2. REPRO bug laporan penuh: expense Rp100.000 (deductionOwnerId=uang-motor) di akun BRI sekarang IKUT mengurangi linkedExpenseTotal & estimatedUnallocated', () => {
  const D = baseD({
    accounts: [{ id: 'acc-bri', name: 'BRI', owners: [
      { ownerId: 'uang-motor', porsi: 100, ownerName: 'Uang motor' },
    ] }],
    titipanCommitments: [{ ownerId: 'uang-motor', ownerName: 'Uang motor', principalAmount: 5000000 }],
    transactions: [
      { type: 'expense', accountId: 'acc-bri', amount: 100000, deductionOwnerId: 'uang-motor' },
    ],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const owner = projection.owners.find((o) => o.ownerId === 'uang-motor');
  assert.ok(owner, 'owner uang-motor harus muncul di projection walau 0 holding');
  assert.equal(owner.holdings.length, 0, 'owner ini memang sengaja 0 holding (skenario laporan)');
  assert.equal(owner.linkedExpenseTotal, 100000);
  assert.equal(owner.estimatedUnallocated, 5000000 - 100000);
});

test('3. owner lain di akun multi-owner yang sama TIDAK ikut kepotong (dedup per-owner, bukan per-akun)', () => {
  const D = baseD({
    accounts: [{ id: 'acc-bri', name: 'BRI', owners: [
      { ownerId: 'uang-motor', porsi: 60, ownerName: 'Uang motor' },
      { ownerId: 'lain', porsi: 40, ownerName: 'Lain' },
    ] }],
    titipanCommitments: [
      { ownerId: 'uang-motor', ownerName: 'Uang motor', principalAmount: 5000000 },
      { ownerId: 'lain', ownerName: 'Lain', principalAmount: 2000000 },
    ],
    transactions: [
      { type: 'expense', accountId: 'acc-bri', amount: 100000, deductionOwnerId: 'uang-motor' },
    ],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const uangMotor = projection.owners.find((o) => o.ownerId === 'uang-motor');
  const lain = projection.owners.find((o) => o.ownerId === 'lain');
  assert.equal(uangMotor.linkedExpenseTotal, 100000);
  assert.equal(lain.linkedExpenseTotal, 0);
  assert.equal(lain.estimatedUnallocated, 2000000);
});

test('4. guard anti-doublecount titipanLinkId tetap berlaku di jalur akun-langsung ini (bukan cuma jalur holdings)', () => {
  const D = baseD({
    accounts: [{ id: 'acc-bri', name: 'BRI', owners: [
      { ownerId: 'uang-motor', porsi: 100, ownerName: 'Uang motor' },
    ] }],
    titipanCommitments: [{ ownerId: 'uang-motor', ownerName: 'Uang motor', principalAmount: 5000000 }],
    transactions: [
      { type: 'expense', accountId: 'acc-bri', amount: 100000, deductionOwnerId: 'uang-motor' },
      // Sudah dihitung terpisah lewat jalur "Catat Pengeluaran Dana Titipan" (usedMap) -> harus dikecualikan di sini.
      { type: 'expense', accountId: 'acc-bri', amount: 300000, deductionOwnerId: 'uang-motor', titipanLinkId: 'link-1' },
    ],
  });
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const owner = projection.owners.find((o) => o.ownerId === 'uang-motor');
  assert.equal(owner.linkedExpenseTotal, 100000, 'transaksi ber-titipanLinkId TIDAK boleh ikut di linkedExpenseTotal');
});
