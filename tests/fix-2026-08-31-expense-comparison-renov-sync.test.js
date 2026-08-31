'use strict';
// tests/fix-2026-08-31-expense-comparison-renov-sync.test.js
// SESI FIX-2026-08-31 (lanjutan) — audit user: baris display "Estimasi
// dari Transaksi <Akun>" di kartu owner
// (`DanaTitipanPortfolioPresenter._expenseComparisonForOwner()`,
// dana-titipan-portfolio-render.js) adalah rumus terpisah dari
// `linkedExpenseTotal`/`renovExpenseTotal`
// (`DanaTitipanPortfolioAPI.build()`, dana-titipan-aggregation-api.js) —
// SEBELUM fix ini, `_expenseComparisonForOwner()` belum tahu soal jalur
// ketiga (`_renovExpenseTotalForOwner()`, sesi
// fix-2026-08-31-renov-project-unassigned-expense-sync) sehingga angka
// pembanding di kartu owner LEBIH KECIL dari "Kuota sisa" stlh fix itu.
//
// Fix ini MENAMBAH jalur renov-unassigned yg SAMA PERSIS ke
// `_expenseComparisonForOwner()` (guard identik: akun 1 non-self-owner,
// transaksi `renovProjectLinkId && !titipanLinkId && !resolveTxOwnerAssignment(...)`)
// — 0 rumus `ownerExpenseTotal` (assignment-based) lama diubah, murni
// komponen tambahan yg mutually exclusive (syaratnya justru assignment
// KOSONG, sedangkan `ownerExpenseTotal` mensyaratkan assignment MATCH).
//
// SENGAJA TIDAK mengubah kontrak lama
// (`tests/sC-titipan-majoris-expense-comparison.test.js`, 7/7 test lama
// harus tetap PASS tanpa modifikasi — semua transaksinya pakai
// `deductionOwnerId` eksplisit, jadi tidak overlap dgn jalur baru).

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

test('1. REPRO: transaksi renovProjectLinkId TANPA deductionOwnerId, akun 1 non-self-owner -> sekarang IKUT ke "Estimasi dari Transaksi <Akun>" (sinkron dgn Kuota sisa)', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
    ] }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 377000, renovProjectLinkId: 'proj1' }, // TANPA deductionOwnerId
    ],
  });
  const ctx = makeCtx(D);
  const o = { ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] };
  const cmp = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o);
  assert.ok(cmp);
  assert.equal(cmp.total, 377000);
  assert.equal(cmp.accountNames[0], 'Majoris');
});

test('2. konsistensi lintas-fungsi: total di sini == allocatedPrincipal-independent sum dari linkedExpenseTotal+renovExpenseTotal via build()', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
    ] }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 100000, deductionOwnerId: 'renov' }, // assignment-based
      { type: 'expense', accountId: 'acc1', amount: 54226, renovProjectLinkId: 'proj1' }, // renov-unassigned
    ],
    titipanCommitments: [{ id: 'c1', ownerId: 'renov', linkedAssetId: 'a1', principalAmount: 0 }],
  });
  const ctx = makeCtx(D);
  const built = ctx.DanaTitipanPortfolioAPI.build();
  const oBuilt = built.owners.find((x) => x.ownerId === 'renov');
  const o = { ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] };
  const cmp = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o);
  assert.equal(cmp.total, oBuilt.linkedExpenseTotal + oBuilt.renovExpenseTotal);
  assert.equal(cmp.total, 100000 + 54226);
});

test('3. transaksi renovProjectLinkId TAPI sudah ber-deductionOwnerId -> TIDAK dobel dihitung (sudah masuk lewat ownerExpenseTotal assignment-based)', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 100, ownerName: 'renov', isSelf: false },
    ] }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 200000, renovProjectLinkId: 'proj1', deductionOwnerId: 'renov' },
    ],
  });
  const ctx = makeCtx(D);
  const o = { ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] };
  const cmp = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o);
  assert.equal(cmp.total, 200000, 'tidak boleh 400000 (dobel)');
});

test('4. akun 2+ non-self-owner (majoris/patungan) -> jalur renov-unassigned TETAP dilewati (ambigu, konsisten S620 "0 tebak-tebakan"); baris tetap muncul (kontrak lama: owner dikenali di split) tapi total 0, BUKAN 100000', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 84.8781, ownerName: 'renov', isSelf: false },
      { ownerId: 'sihab', porsi: 15.1219, ownerName: 'Mas Sihab', isSelf: false },
    ] }],
    transactions: [
      { type: 'expense', accountId: 'acc1', amount: 100000, renovProjectLinkId: 'proj1' }, // TANPA deductionOwnerId, akun 2-owner
    ],
  });
  const ctx = makeCtx(D);
  const o = { ownerId: 'renov', holdings: [{ type: 'aset', linkedAssetId: 'a1' }] };
  const cmp = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o);
  assert.ok(cmp, 'kontrak lama: owner "renov" tetap dikenali sbg bagian split akun ini (idx>=0), baris tidak disembunyikan');
  assert.equal(cmp.total, 0, 'renov-unassigned SENGAJA dilewati krn akun 2-owner (ambigu) -- 0, bukan 100000');
});

test('5. jalur renov-unassigned juga jalan lewat loop D.accounts (owner 0 holding, S620-style)', () => {
  const D = baseD({
    accounts: [{ id: 'acc-bri', name: 'BRI', owners: [
      { ownerId: 'uang-motor', porsi: 100, ownerName: 'Uang motor' },
    ] }],
    transactions: [{ type: 'expense', accountId: 'acc-bri', amount: 75000, renovProjectLinkId: 'proj1' }],
  });
  const ctx = makeCtx(D);
  const o = { ownerId: 'uang-motor', holdings: [] };
  const cmp = ctx.DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o);
  assert.ok(cmp);
  assert.equal(cmp.total, 75000);
  assert.equal(cmp.accountNames[0], 'BRI');
});
