'use strict';
/**
 * s579-dl-next-6-badge-owner-lookup-source.test.js — Sesi S579,
 * implementasi DL-Next-6 (DESIGN-LOCK-OWNER-RESOLVER-AUDIT-3-6-FOLLOWUP.md
 * / AUDIT-8-11-OWNER-RESOLVER-POST-DL-NEXT-1.md Audit-9).
 *
 * Bug source-mismatch (pola sama dgn DL-Next-1/S578): badge "👤 Ditanggung:
 * <nama>" di riwayat (txHTML(), tx-list-cashflow.js) resolve nama owner
 * lewat getAccOwners(t.accountId) lalu fallback acc.owners -- KEDUANYA
 * hanya baca acc.owners[]/acc.ownership, TIDAK PERNAH cek aset tertaut.
 * Sejak DL-Next-1 (S578), lebih banyak transaksi valid punya
 * deductionOwnerId lewat sumber source:'asset' (akun tanpa acc.owners[]
 * sendiri tapi tertaut aset multi-owner) -- badge utk transaksi ini gagal
 * menemukan nama ownernya (baris kosong), walau deductionOwnerId tersimpan
 * benar.
 *
 * Fix DL-Next-6: ganti basis lookup nama ke resolveOwnerDefaultForAccount(
 * t.accountId) -- SUMBER SAMA dgn DL-Next-1 & UI. 0 perubahan
 * deductionOwnerId itu sendiri, 0 perubahan aturan pemilihan owner.
 *
 * Pola makeCtx mengikuti tests/s574-e-history-badge-datahealth-regression.
 * test.js (Harness #1, txHTML()).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeTxListCtx(D, extra) {
  return loadSource(
    ['modules/finance/tx-list-cashflow.js'],
    Object.assign(
      {
        D,
        document: { getElementById: () => null },
        escapeHtml: (s) => String(s),
        getAllCats: () => [{ name: 'Belanja', emoji: '🛒' }],
        fmt: (n) => 'Rp ' + Math.round(n || 0),
        toast: () => {},
        askConfirm: async () => true,
        save: () => {},
        renderKeuangan: () => {},
        renderDashboard: () => {},
        renderCnTab: () => {},
        renderProductList: () => {},
        renderStockList: () => {},
        renderShop: () => {},
        renderShopRecent: () => {},
        populateKeuFilters: () => {},
        openBillModal: () => {},
      },
      extra || {},
    ),
    [],
  );
}

// 1. RED (sebelum fix) / GREEN (sesudah fix): akun tanpa acc.owners[]
// sendiri + tertaut aset multi-owner valid + transaksi punya
// deductionOwnerId dari owner aset -> badge WAJIB menampilkan nama,
// bukan kosong seperti sebelum DL-Next-6.
test('DL-Next-6 [1/3]: badge menampilkan nama owner utk deductionOwnerId dari sumber aset tertaut (source-mismatch fixed)', () => {
  const D = {
    accounts: [{ id: 'acc-linked', name: 'Rekening Tertaut Aset', emoji: '🏦' }],
    assets: [{ id: 'aset-1', name: 'Ruko Patungan', accountId: 'acc-linked', owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 20 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 80 }] }],
    transactions: [], products: [], cobek: [],
  };
  const ctx = makeTxListCtx(D, {
    // getAccOwners()/acc.owners TIDAK diberi apa pun (akun benar-benar
    // tanpa owners[] sendiri) -- lookup lama pasti gagal menemukan nama.
    getAccOwners: (accId) => ({ ok: true, owners: [], isMultiOwner: false, isSynthesized: true }),
    // resolveOwnerDefaultForAccount() -- stub tipis merefleksikan kontrak
    // Sesi Res-B (transaksi.js, tidak dimuat ulang di sini demi isolasi
    // unit tx-list-cashflow.js -- kontraknya sendiri sudah diverifikasi
    // terpisah di tests/s574-d2-*.test.js & tests/s578-*.test.js). Return
    // owners dari aset tertaut, PERSIS skenario source:'asset'.
    resolveOwnerDefaultForAccount: (accId) => {
      const asset = (D.assets || []).find((a) => a.accountId === accId);
      if (asset) return { ok: true, source: 'asset', owners: asset.owners, needsConfirm: false, autoSelectId: null };
      return { ok: true, source: 'none', owners: [], needsConfirm: false, autoSelectId: null };
    },
  });
  const t = { id: 't1', type: 'expense', amount: 100000, category: 'Belanja', date: '2026-08-01', accountId: 'acc-linked', deductionOwnerId: 'o2' };
  const html = ctx.txHTML(t);
  assert.match(html, /👤 Ditanggung: Ani/);
});

// 2. Regresi: badge tetap resolve lewat getAccOwners() kalau akun memang
// punya owners[] sendiri (pola lama tetap jalan, 0 regresi utk kasus umum).
test('DL-Next-6 [2/3]: badge tetap resolve nama owner utk akun dgn acc.owners[] sendiri (regresi tidak berubah)', () => {
  const D = {
    accounts: [{ id: 'acc-multi', name: 'Rekening Bersama', emoji: '🏦', owners: [{ ownerId: 'o1', ownerName: 'Budi' }, { ownerId: 'o2', ownerName: 'Ani' }] }],
    transactions: [], products: [], cobek: [],
  };
  const ctx = makeTxListCtx(D, { getAccOwners: undefined });
  const t = { id: 't1', type: 'expense', amount: 100000, category: 'Belanja', date: '2026-08-01', accountId: 'acc-multi', deductionOwnerId: 'o2' };
  const html = ctx.txHTML(t);
  assert.match(html, /👤 Ditanggung: Ani/);
});

// 3. Regresi: transaksi lama tanpa deductionOwnerId tetap 0 badge (0
// perubahan perilaku backward-compat).
test('DL-Next-6 [3/3]: transaksi tanpa deductionOwnerId tetap tidak menampilkan badge (regresi tidak berubah)', () => {
  const D = {
    accounts: [{ id: 'acc-single', name: 'Cash', emoji: '💵' }],
    transactions: [], products: [], cobek: [],
  };
  const ctx = makeTxListCtx(D);
  const t = { id: 't1', type: 'expense', amount: 30000, category: 'Belanja', date: '2026-08-01', accountId: 'acc-single' };
  assert.doesNotMatch(ctx.txHTML(t), /Ditanggung/);
});
