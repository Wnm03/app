'use strict';
/**
 * s572-tx-acc-change-stale-state.test.js — Sesi 572 (lanjutan audit
 * AUDIT-S572-DUPLICATE-SOURCE-STALE-STATE.md), DIPERBARUI Sesi ini
 * (AUDIT-S540/B1-B12-DOUBLECOUNT, Rekomendasi #2 follow-up) mengikuti
 * penghapusan dropdown "Porsi Pemilik (akun patungan)"
 * (#txOwnerPorsiWrap/#txOwnerPorsi) & live preview split porsi
 * (#txAssetSplitPreview, resolveTxAssetSplit()/updateTxAssetSplitPreview()/
 * updateTxOwnerPorsiOptions()) dari modal Transaksi. Kaitan #txAssetId ke
 * aset multi-owner sekarang MURNI relasi/pelacakan riwayat -- TIDAK lagi
 * menentukan pembayar, akun sumber potongan, atau split nominal per
 * pemilik. Saldo SELALU dipotong penuh dari #txAcc yang dipilih.
 *
 * ROOT CAUSE (S572 asli, TETAP RELEVAN): HTML LIVE di
 * modules/shared/modals.js untuk dropdown "Akun / Metode" (#txAcc, modal
 * txModal) harus memanggil `onchange="onTxAccChange()"` (BUKAN langsung
 * `_txAccManuallySet=true`), supaya onTxAccChange() (modules/finance/
 * transaksi.js) ikut menyinkronkan updateTxAssetWrapVisibility() --
 * visibilitas & isi dropdown "Kaitkan ke Aset Multi-Owner" (#txAssetId)
 * sesuai akun terpilih -- tiap kali user ganti akun. Fix wiring itu (S572
 * asli) TETAP berlaku & diverifikasi ulang di sini; yang berubah HANYA
 * cakupan behavioral (dropdown/preview porsi sudah tidak ada lagi utk
 * diverifikasi).
 *
 * modules/modals.js, modules/shop/modals.js, & finance/transaksi.js
 * (root) TIDAK disentuh -- ketiganya dead/orphan (tidak direferensikan
 * scripts/build.js), lihat AUDIT-S572-DUPLICATE-SOURCE-STALE-STATE.md.
 *
 * Cakupan test (6 skenario):
 *   1. Wiring statis: HTML LIVE modals.js pakai onTxAccChange() (bukan
 *      _txAccManuallySet=true langsung), & orphan files TIDAK diubah.
 *   2. Wiring statis: #txOwnerPorsiWrap/#txOwnerPorsi/#txAssetSplitPreview
 *      SUDAH TIDAK ADA lagi di HTML LIVE modals.js (bukti penghapusan
 *      Rekomendasi #2 AUDIT-S540/B1-B12-DOUBLECOUNT benar2 diterapkan).
 *   3. Account A (biasa) -> Account B (multi-owner): dropdown #txAssetId
 *      ikut menyesuaikan (self-link dikecualikan), TANPA memunculkan
 *      dropdown/preview porsi apa pun (fungsi2 itu sudah dihapus).
 *   4. Repeated change (A->B->A->B): #txAssetWrap konsisten mencerminkan
 *      akun TERAKHIR, tidak stale/terakumulasi dari akun sebelumnya.
 *   5. _txAccManuallySet tetap ke-set true (regresi lama
 *      applyLastAccForCat() tidak boleh rusak oleh perubahan ini).
 *   6. Fungsi resolveTxAssetSplit/updateTxOwnerPorsiOptions/
 *      updateTxAssetSplitPreview TIDAK LAGI ada di transaksi.js (sumber
 *      hidup) -- bukti bersih, 0 dead reference tersisa yg bisa dipanggil
 *      onTxAccChange()/onTxAssetChange()/openTxModal()/editTx().
 */
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

function makeEl(overrides = {}) {
  return Object.assign({
    value: '', checked: false, textContent: '', innerHTML: '', disabled: false,
    style: {}, classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    options: [],
  }, overrides);
}

function makeFakeDoc(initial = {}) {
  const els = {};
  Object.keys(initial).forEach(id => { els[id] = makeEl(initial[id]); });
  const doc = { getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; } };
  return { doc, els };
}

function makeCtx({ document, assets }) {
  return loadSource(
    ['modules/finance/piutang-utang.js', 'modules/finance/transaksi.js'],
    {
      document,
      curTxType: 'expense',
      D: { assets },
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => s,
      fmt: (n) => 'Rp ' + n,
      calcPreviewValue: () => 0,
      MultiOwnerEngine: {
        getOwners(a) {
          return a && a.isMultiOwner ? { ok: true, isMultiOwner: true, owners: a.owners || [] } : { ok: true, isMultiOwner: false };
        },
        splitByPorsi(nilai, owners) {
          return { ok: true, splits: (owners || []).map(o => ({ ownerName: o.ownerName, bagian: Math.round(nilai * (o.porsi / 100)) })) };
        },
      },
      getMultiOwnerAssets() { return assets.filter(a => a.isMultiOwner); },
      resolveEntryAssetSelfPorsi() { return 100; },
    },
  );
}

// --- 1-2. Wiring statis ---

test('s572 [1/6]: HTML LIVE modules/shared/modals.js #txAcc memanggil onTxAccChange() (bukan langsung _txAccManuallySet=true), & orphan modules/shop/modals.js TIDAK ikut diubah', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
  assert.match(src, /id=\\"txAcc\\"[^>]*onchange=\\"onTxAccChange\(\)\\"/, 'dropdown #txAcc harus wired ke onTxAccChange()');
  assert.doesNotMatch(src, /id=\\"txAcc\\"[^>]*onchange=\\"_txAccManuallySet=true\\"/, 'wiring lama (stale) tidak boleh tersisa lagi di HTML LIVE');

  // modules/shop/modals.js TIDAK direferensikan scripts/build.js (dead/
  // orphan, lihat AUDIT-S572-DUPLICATE-SOURCE-STALE-STATE.md) -- perubahan
  // Sesi ini (penghapusan dropdown porsi) sengaja HANYA menyentuh
  // modules/shared/modals.js (LIVE). Buktikan file orphan ini masih
  // memuat wiring `_txAccManuallySet=true` yang LAMA, sebagai bukti
  // langsung tidak ikut ter-refactor.
  const shopModals = fs.readFileSync(path.join(ROOT, 'modules/shop/modals.js'), 'utf8');
  assert.match(shopModals, /id=\\"txAcc\\"[^>]*onchange=\\"_txAccManuallySet=true\\"/,
    'modules/shop/modals.js (orphan) harus tetap memuat wiring LAMA -- bukti tidak disentuh');
});

test('s572 [2/6]: dropdown "Porsi Pemilik (akun patungan)" (#txOwnerPorsiWrap/#txOwnerPorsi) & live preview split (#txAssetSplitPreview) SUDAH DIHAPUS dari HTML LIVE modals.js', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
  assert.doesNotMatch(src, /txOwnerPorsiWrap/, '#txOwnerPorsiWrap tidak boleh tersisa di modal Transaksi');
  assert.doesNotMatch(src, /id=\\"txOwnerPorsi\\"/, '#txOwnerPorsi tidak boleh tersisa di modal Transaksi');
  assert.doesNotMatch(src, /txAssetSplitPreview/, '#txAssetSplitPreview tidak boleh tersisa di modal Transaksi');
  // #txAssetWrap/#txAssetId (kaitan relasi murni) TETAP ada
  assert.match(src, /id=\\"txAssetWrap\\"/, 'dropdown "Kaitkan ke Aset Multi-Owner" tetap ada (relasi murni)');
  assert.match(src, /id=\\"txAssetId\\"/);
});

// --- 3-4. Behavioral: onTxAccChange() tetap sync visibilitas #txAssetWrap, tanpa dropdown/preview porsi ---

test('s572 [3/6]: Account A (biasa) -> Account B (self-linked ke aset multi-owner) -- #txAssetWrap ikut menyesuaikan (self-link dikecualikan), 0 dropdown/preview porsi dipanggil', () => {
  const assets = [
    { id: 'aset-b', name: 'Ruko Patungan B', accountId: 'acc-b', isMultiOwner: true, owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 50 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 50 }] },
  ];
  const { doc, els } = makeFakeDoc({ txAcc: { value: 'acc-a' } });
  const ctx = makeCtx({ document: doc, assets });

  // Akun A: bukan self-link ke aset apa pun -> aset B tetap ditawarkan
  // sbg pilihan relasi (perilaku lama, 0 regresi).
  ctx.onTxAccChange();
  assert.equal(els.txAssetWrap.style.display, 'block', 'akun A: aset multi-owner lain (B) tetap ditawarkan sbg kaitan opsional');
  assert.match(els.txAssetId.innerHTML, /aset-b/);

  // Pindah ke akun B (self-linked langsung ke aset B via accountId) --
  // aset itu DIKECUALIKAN dari dropdown (perilaku lama patch
  // akun-majoris-selflink-redundant), & karena itu satu-satunya aset
  // multi-owner yg ada, wrap disembunyikan total.
  els.txAcc.value = 'acc-b';
  ctx.onTxAccChange();
  assert.equal(els.txAssetWrap.style.display, 'none', 'akun B self-linked: 0 aset LAIN yg relevan utk ditautkan manual');

  // Dropdown/box porsi & preview split sudah tidak ada lagi di DOM sama
  // sekali (Fake doc auto-create elemen kosong bila diminta) -- pastikan
  // onTxAccChange() TIDAK diam2 masih menulis ke situ (0 sisa referensi).
  assert.equal(els.txOwnerPorsiWrap, undefined, 'tidak ada kode yg men-touch #txOwnerPorsiWrap lagi (elemen fake tidak ter-lazy-create)');
  assert.equal(els.txAssetSplitPreview, undefined, 'tidak ada kode yg men-touch #txAssetSplitPreview lagi');
});

test('s572 [4/6]: repeated change (A->B->A->B) dalam satu sesi form -- #txAssetWrap selalu cerminkan akun TERAKHIR, tidak terakumulasi/stale', () => {
  const assets = [
    { id: 'aset-b', name: 'Ruko Patungan B', accountId: 'acc-b', isMultiOwner: true, owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 50 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 50 }] },
  ];
  const { doc, els } = makeFakeDoc({ txAcc: { value: 'acc-a' } });
  const ctx = makeCtx({ document: doc, assets });

  const seq = ['acc-a', 'acc-b', 'acc-a', 'acc-b'];
  const observed = [];
  for (const acc of seq) {
    els.txAcc.value = acc;
    ctx.onTxAccChange();
    observed.push(els.txAssetWrap.style.display);
  }
  assert.deepEqual(observed, ['block', 'none', 'block', 'none'], 'tiap perpindahan akun harus konsisten toggle sesuai akun aktif saat itu, bukan akumulasi/stale dari akun sebelumnya');
});

// --- 5. Regresi lama tetap terjaga ---

test('s572 [5/6]: _txAccManuallySet tetap ke-set true oleh onTxAccChange() (regresi lama applyLastAccForCat() tidak rusak)', () => {
  const { doc, els } = makeFakeDoc({ txAcc: { value: 'acc-a' } });
  const ctx = makeCtx({ document: doc, assets: [] });
  assert.equal(ctx._txAccManuallySet, undefined, 'sanity: sebelum dipanggil, flag belum ke-set di context baru');
  ctx.onTxAccChange();
  assert.equal(ctx._txAccManuallySet, true, 'onTxAccChange() harus tetap menandai _txAccManuallySet=true (perilaku lama dipertahankan)');
});

// --- 6. Bukti bersih di sumber hidup ---

test('s572 [6/6]: resolveTxAssetSplit()/updateTxOwnerPorsiOptions()/updateTxAssetSplitPreview() TIDAK LAGI ter-definisi sbg function di transaksi.js (0 dead call tersisa)', () => {
  const { doc } = makeFakeDoc({ txAcc: { value: 'acc-a' } });
  const ctx = makeCtx({ document: doc, assets: [] });
  assert.equal(typeof ctx.resolveTxAssetSplit, 'undefined', 'resolveTxAssetSplit sudah dihapus');
  assert.equal(typeof ctx.updateTxOwnerPorsiOptions, 'undefined', 'updateTxOwnerPorsiOptions sudah dihapus');
  assert.equal(typeof ctx.updateTxAssetSplitPreview, 'undefined', 'updateTxAssetSplitPreview sudah dihapus');
  // updateTxAssetWrapVisibility & onTxAssetChange tetap ada (relasi murni)
  assert.equal(typeof ctx.updateTxAssetWrapVisibility, 'function');
  assert.equal(typeof ctx.onTxAssetChange, 'function');
});
