'use strict';
// tests/patch-2026-08-15-titipan-explicit-owner-only.test.js
//
// Laporan user (screenshot dashboard Dana Titipan + Riwayat: BRI, 2026-08-15):
// owner "Uang motor" (Pokok Dikomit Rp 12.000.000, 100% owner tunggal akun
// BRI) menampilkan "Estimasi dari Transaksi BRI" yang ikut memasukkan
// transaksi rumah tangga biasa (Anak·sekolah, Belanja, Anak·Mainan,
// Handphone·Pulsa, Tagihan Admin dst) padahal TIDAK ADA SATU PUN dari
// transaksi itu yang secara eksplisit ditandai "Pemilik Sumber Potongan"
// (deductionOwnerId) -- cuma numpang lewat akun yang porsi kepemilikannya
// 100% "Uang motor". Permintaan user: transaksi TANPA akun potongan tetap
// boleh disimpan (0 wajib isi), tapi HANYA yang eksplisit di-set akun
// potongan yang boleh mengurangi Pokok Dikomit di Dana Titipan.
//
// ROOT CAUSE: resolveTxOwnerAssignment() (filter-laporan.js) SEBELUM fix ini
// fallback ke owners[0].ownerId kalau t.deductionOwnerId kosong -- utk akun
// 1-owner (spt BRI/Uang motor di sini), itu artinya SEMUA transaksi otomatis
// "dianggap" milik owner itu, walau user tidak pernah menandainya scr sadar.
//
// FIX: fallback owners[0] dihapus total -- transaksi tanpa deductionOwnerId/
// ownerPorsiId eksplisit yang valid sekarang balik `null` (tidak diassign ke
// siapa pun), konsisten di SEMUA konsumen (`_linkedExpenseTotalForOwner()`,
// kartu "Porsi per Pemilik", badge "Ditanggung").

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
      Aset: { _resolveLinkedInvestmentOwners() { return null; } },
    },
    ['DanaTitipanPortfolioAPI', 'resolveTxOwnerSplitForAccount', 'resolveTxOwnerAssignment', 'getAccOwnersEffective', 'sameId'],
  );
}

function baseD(extra) {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [], assets: [], transactions: [], accounts: [], titipanCommitments: [], titipanReturns: [], ...extra };
}

test('REPRO laporan user: akun BRI 1-owner ("Uang motor") -- transaksi rumah tangga TANPA deductionOwnerId eksplisit TIDAK ikut memotong Pokok Dikomit', () => {
  const D = baseD({
    accounts: [{ id: 'acc-bri', name: 'BRI', owners: [{ ownerId: 'uang-motor', porsi: 100, ownerName: 'Uang motor' }] }],
    transactions: [
      // Persis pola laporan user: 4 transaksi rumah tangga biasa, TIDAK
      // pernah ditandai deductionOwnerId sama sekali.
      { type: 'expense', accountId: 'acc-bri', amount: 75000, category: 'Anak', note: 'sekolah' },
      { type: 'expense', accountId: 'acc-bri', amount: 500000, category: 'Belanja' },
      { type: 'expense', accountId: 'acc-bri', amount: 30000, category: 'Anak', note: 'Mainan' },
      { type: 'expense', accountId: 'acc-bri', amount: 22800, category: 'Handphone', note: 'Pulsa' },
      // 1 transaksi YANG eksplisit ditandai -- ini SATU-SATUNYA yang boleh
      // ikut terhitung ke pocket "Uang motor".
      { type: 'expense', accountId: 'acc-bri', amount: 100000, category: 'Istri', deductionOwnerId: 'uang-motor' },
    ],
  });
  const ctx = makeCtx(D);
  const owner = { ownerId: 'uang-motor', holdings: [] };
  const result = ctx.DanaTitipanPortfolioAPI._linkedExpenseTotalForOwner(owner);
  assert.equal(result.total, 100000, 'hanya transaksi yang eksplisit ditandai deductionOwnerId yang boleh mengurangi Pokok Dikomit');
});

test('transaksi BOLEH disimpan tanpa deductionOwnerId di akun 1-owner (kontrak resolveTxOwnerAssignment: balik null, bukan reject/error)', () => {
  const D = baseD({ accounts: [{ id: 'acc-bri', name: 'BRI', owners: [{ ownerId: 'uang-motor', porsi: 100, ownerName: 'Uang motor' }] }] });
  const ctx = makeCtx(D);
  const resolved = ctx.resolveTxOwnerSplitForAccount('acc-bri');
  const untaggedTx = { type: 'expense', accountId: 'acc-bri', amount: 50000 };
  assert.equal(ctx.resolveTxOwnerAssignment(untaggedTx, resolved.owners), null, 'transaksi tanpa akun potongan eksplisit tidak diassign ke owner mana pun (bukan crash, bukan default owner pertama)');
});

test('kalau deductionOwnerId di-set eksplisit -> transaksi ikut terhitung penuh ke owner tsb', () => {
  const D = baseD({
    accounts: [{ id: 'acc-bri', name: 'BRI', owners: [{ ownerId: 'uang-motor', porsi: 100, ownerName: 'Uang motor' }] }],
    transactions: [{ type: 'expense', accountId: 'acc-bri', amount: 250000, deductionOwnerId: 'uang-motor' }],
  });
  const ctx = makeCtx(D);
  const owner = { ownerId: 'uang-motor', holdings: [] };
  const result = ctx.DanaTitipanPortfolioAPI._linkedExpenseTotalForOwner(owner);
  assert.equal(result.total, 250000);
  assert.equal(result.accountNames.length, 1);
  assert.equal(result.accountNames[0], 'BRI');
});
