'use strict';
// tests/sC-titipan-majoris-expense-comparison.test.js — Sesi C
// (AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md §3 Langkah B).
//
// Target: `DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o)`
// (modules/finance/dana-titipan-portfolio-render.js) — baris pembanding
// OTOMATIS "Estimasi dari Transaksi <Akun>" di sebelah "Pokok Dikomit"
// manual. 100% REUSE `resolveTxOwnerSplitForAccount()` (filter-laporan.js,
// Sesi A) + `MultiOwnerEngine.splitByPorsi()` — 0 rumus baru diuji ulang
// di sini, cuma kontrak wiring baru ini.
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
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'resolveTxOwnerSplitForAccount', 'sameId'],
  );
}

function baseD(extra) {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [], assets: [], transactions: [], accounts: [], ...extra };
}

test('1. Aset multi-owner tertaut akun, ada expense -> muncul {total,accountNames}', () => {
  const D = baseD({
    assets: [{ id: 'a1', name: 'Majoris', accountId: 'acc1', nilai: 1000000, owners: [
      { ownerId: 'renov', porsi: 84.8781, ownerName: 'renov', isSelf: false },
      { ownerId: 'sihab', porsi: 15.1219, ownerName: 'Mas Sihab', isSelf: false },
    ] }],
    transactions: [
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
  assert.equal(cmp.total, (100000 + 54226) * 0.848781);
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
