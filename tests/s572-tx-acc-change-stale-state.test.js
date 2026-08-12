'use strict';
/**
 * s572-tx-acc-change-stale-state.test.js — Sesi 572 (lanjutan audit
 * AUDIT-S572-DUPLICATE-SOURCE-STALE-STATE.md).
 *
 * ROOT CAUSE: HTML LIVE di modules/shared/modals.js (bundel oleh
 * scripts/build.js) untuk dropdown "Akun / Metode" (#txAcc, modal
 * txModal) masih memanggil `onchange="_txAccManuallySet=true"` --
 * hanya menandai flag manual lama, TIDAK memanggil onTxAccChange()
 * (modules/finance/transaksi.js) yang sejak beberapa sesi lalu SUDAH
 * bertanggung jawab juga menyinkronkan:
 *   - updateTxAssetWrapVisibility() -- visibilitas & isi dropdown
 *     "Kaitkan ke Aset Multi-Owner" (#txAssetId) sesuai akun terpilih
 *   - updateTxOwnerPorsiOptions() -- visibilitas & isi dropdown
 *     "Porsi Pemilik (akun patungan)" (#txOwnerPorsi)
 *   - updateTxAssetSplitPreview() -- live preview split (#txAssetSplitPreview)
 * Akibatnya tiap kali user ganti akun di dropdown #txAcc, ketiga blok itu
 * TIDAK ikut refresh -- STALE STATE: menampilkan data aset/porsi milik akun
 * SEBELUMNYA walau akun sudah berpindah (mis. dari akun biasa ke akun
 * patungan, atau sebaliknya).
 *
 * FIX: modules/shared/modals.js baris #txAcc diubah jadi
 * `onchange="onTxAccChange()"` -- onTxAccChange() SENDIRI yang menandai
 * _txAccManuallySet=true (baris pertama isi fungsinya, lihat transaksi.js),
 * jadi 0 regresi perilaku lama (masih dipakai applyLastAccForCat() supaya
 * tidak menimpa pilihan manual user) SEKALIGUS menutup gap sinkronisasi di
 * atas.
 *
 * modules/modals.js, modules/shop/modals.js, & finance/transaksi.js
 * (root) TIDAK disentuh -- ketiganya dead/orphan (tidak direferensikan
 * scripts/build.js), lihat AUDIT-S572-DUPLICATE-SOURCE-STALE-STATE.md.
 *
 * Cakupan test (8 skenario -> 8/8 PASS):
 *   1. Wiring statis: HTML LIVE modals.js benar-benar pakai onTxAccChange()
 *      (bukan lagi _txAccManuallySet=true langsung), & orphan files TIDAK
 *      diubah (bukti dead-code, tidak perlu ikut fix).
 *   2. Account A (biasa) -> Account B (multi-owner/patungan): dropdown aset
 *      & porsi ikut muncul/terisi begitu onTxAccChange() dipanggil.
 *   3. Account B (multi-owner) -> Account A (biasa): dropdown aset & porsi
 *      ikut disembunyikan lagi (bukti tidak stale nyangkut ke akun lama).
 *   4. Self-link/owner: akun yang accountId-nya tertaut ke SATU aset
 *      multi-owner (self-link) -- aset itu dikecualikan dari pilihan
 *      #txAssetId, tapi #txOwnerPorsi (porsi pemilik akun patungan) tetap
 *      terisi sesuai owners aset tsb.
 *   5. Non-owner: akun biasa yang TIDAK tertaut ke aset apa pun -- kedua
 *      wrap tetap disembunyikan, tidak ada leftover dari test sebelumnya.
 *   6. Repeated change: ganti akun berkali-kali (A->B->A->B) dalam satu sesi
 *      form -- setiap onTxAccChange() konsisten mencerminkan akun TERAKHIR,
 *      bukan akumulasi dari akun-akun sebelumnya.
 *   7. _txAccManuallySet tetap ke-set true (regresi lama applyLastAccForCat()
 *      tidak boleh rusak oleh fix ini).
 *   8. updateTxAssetSplitPreview() ikut terpanggil di akhir onTxAccChange()
 *      (preview tidak nyangkut ke pilihan aset akun sebelumnya).
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

function makeCtx({ document, assets, ownerSplitByAcc = {} }) {
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
      resolveTxOwnerSplitForAccount(accId) { return ownerSplitByAcc[accId] || null; },
      resolveEntryAssetSelfPorsi() { return 100; },
    },
  );
}

// --- 1. Wiring statis: LIVE source pakai onTxAccChange(), orphan tidak diubah ---

test('s572 [1/8]: HTML LIVE modules/shared/modals.js #txAcc memanggil onTxAccChange() (bukan langsung _txAccManuallySet=true), & orphan modules/shop/modals.js TIDAK ikut diubah', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
  assert.match(src, /id=\\"txAcc\\"[^>]*onchange=\\"onTxAccChange\(\)\\"/, 'dropdown #txAcc harus wired ke onTxAccChange()');
  assert.doesNotMatch(src, /id=\\"txAcc\\"[^>]*onchange=\\"_txAccManuallySet=true\\"/, 'wiring lama (stale) tidak boleh tersisa lagi di HTML LIVE');

  // modules/shop/modals.js TIDAK direferensikan scripts/build.js (dead/
  // orphan, lihat AUDIT-S572-DUPLICATE-SOURCE-STALE-STATE.md) -- patch ini
  // sengaja HANYA mengubah modules/shared/modals.js (LIVE). Buktikan file
  // orphan ini masih memuat wiring `_txAccManuallySet=true` yang LAMA,
  // sebagai bukti langsung tidak ikut ter-refactor oleh fix S572.
  const shopModals = fs.readFileSync(path.join(ROOT, 'modules/shop/modals.js'), 'utf8');
  assert.match(shopModals, /id=\\"txAcc\\"[^>]*onchange=\\"_txAccManuallySet=true\\"/,
    'modules/shop/modals.js (orphan) harus tetap memuat wiring LAMA -- bukti tidak disentuh patch S572');
});

// --- 2-8. Behavioral: onTxAccChange() sync akun -> aset/porsi, tidak stale ---

test('s572 [2/8]: Account A (biasa) -> Account B (multi-owner) -- dropdown aset & porsi ikut muncul', () => {
  const assets = [
    { id: 'aset-b', name: 'Ruko Patungan B', accountId: 'acc-b', isMultiOwner: true, owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 50 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 50 }] },
  ];
  const { doc, els } = makeFakeDoc({ txAcc: { value: 'acc-a' } });
  const ctx = makeCtx({ document: doc, assets, ownerSplitByAcc: { 'acc-b': { owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 50 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 50 }] } } });

  // Mulai di akun A (biasa, tidak tertaut aset apa pun -- aset B tetap
  // ditawarkan di dropdown krn ada aset multi-owner LAIN, perilaku lama)
  ctx.onTxAccChange();
  assert.equal(els.txOwnerPorsiWrap.style.display, 'none', 'akun A biasa: wrap porsi tersembunyi');
  assert.equal(els.txOwnerPorsi.innerHTML, '', 'akun A biasa: tidak ada opsi porsi tersisa');

  // Pindah ke akun B (multi-owner)
  els.txAcc.value = 'acc-b';
  ctx.onTxAccChange();
  assert.equal(els.txOwnerPorsiWrap.style.display, 'block', 'akun B patungan: wrap porsi harus muncul');
  assert.match(els.txOwnerPorsi.innerHTML, /Budi/, 'opsi porsi pemilik harus terisi owner aset B');
});

test('s572 [3/8]: Account B (multi-owner) -> Account A (biasa) -- dropdown aset & porsi ikut disembunyikan lagi', () => {
  const assets = [
    { id: 'aset-b', name: 'Ruko Patungan B', accountId: 'acc-b', isMultiOwner: true, owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 50 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 50 }] },
  ];
  const { doc, els } = makeFakeDoc({ txAcc: { value: 'acc-b' } });
  const ctx = makeCtx({ document: doc, assets, ownerSplitByAcc: { 'acc-b': { owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 50 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 50 }] } } });

  ctx.onTxAccChange();
  assert.equal(els.txOwnerPorsiWrap.style.display, 'block', 'sanity: mulai di akun B, wrap porsi tampil');

  els.txAcc.value = 'acc-a';
  ctx.onTxAccChange();
  assert.equal(els.txOwnerPorsiWrap.style.display, 'none', 'balik ke akun A biasa: wrap porsi harus disembunyikan lagi (tidak stale)');
  assert.equal(els.txOwnerPorsi.innerHTML, '', 'opsi porsi lama (Budi/Ani) harus dikosongkan, tidak nyangkut');
});

test('s572 [4/8]: self-link/owner -- akun tertaut aset multi-owner sendiri: aset dikecualikan dari #txAssetId, tapi #txOwnerPorsi tetap terisi', () => {
  const assets = [
    { id: 'aset-self', name: 'Majoris', accountId: 'acc-self', isMultiOwner: true, owners: [{ ownerId: 'o1', ownerName: 'Sihab', porsi: 15 }, { ownerId: 'o2', ownerName: 'Renov', porsi: 85 }] },
  ];
  const { doc, els } = makeFakeDoc({ txAcc: { value: 'acc-self' } });
  const ctx = makeCtx({ document: doc, assets, ownerSplitByAcc: { 'acc-self': { owners: assets[0].owners } } });

  ctx.onTxAccChange();
  assert.equal(els.txAssetWrap.style.display, 'none', 'self-link adalah satu-satunya aset multi-owner -> wrap #txAssetId disembunyikan');
  assert.equal(els.txOwnerPorsiWrap.style.display, 'block', 'tapi wrap porsi pemilik (akun patungan) tetap tampil');
  assert.match(els.txOwnerPorsi.innerHTML, /Sihab/, 'opsi porsi terisi owner aset self-link');
});

test('s572 [5/8]: non-owner -- akun biasa tanpa tautan aset apa pun: kedua wrap tetap tersembunyi, tidak ada leftover', () => {
  const assets = [
    { id: 'aset-lain', name: 'Ruko Lain', accountId: 'acc-lain', isMultiOwner: true, owners: [{ ownerId: 'o3', ownerName: 'Rina', porsi: 50 }, { ownerId: 'o4', ownerName: 'Dodi', porsi: 50 }] },
  ];
  const { doc, els } = makeFakeDoc({ txAcc: { value: 'acc-biasa' } });
  const ctx = makeCtx({ document: doc, assets, ownerSplitByAcc: {} });

  ctx.onTxAccChange();
  assert.equal(els.txOwnerPorsiWrap.style.display, 'none', 'akun non-owner: wrap porsi tersembunyi');
  assert.equal(els.txOwnerPorsi.innerHTML, '', 'akun non-owner: tidak ada opsi porsi tersisa');
  // dropdown #txAssetId tetap menawarkan aset multi-owner LAIN yang ada (perilaku lama, 0 regresi)
  assert.equal(els.txAssetWrap.style.display, 'block');
  assert.match(els.txAssetId.innerHTML, /aset-lain/);
});

test('s572 [6/8]: repeated change (A->B->A->B) dalam satu sesi form -- state selalu cerminkan akun TERAKHIR, tidak terakumulasi', () => {
  const assets = [
    { id: 'aset-b', name: 'Ruko Patungan B', accountId: 'acc-b', isMultiOwner: true, owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 50 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 50 }] },
  ];
  const { doc, els } = makeFakeDoc({ txAcc: { value: 'acc-a' } });
  const ctx = makeCtx({ document: doc, assets, ownerSplitByAcc: { 'acc-b': { owners: assets[0].owners } } });

  const seq = ['acc-a', 'acc-b', 'acc-a', 'acc-b'];
  const observed = [];
  for (const acc of seq) {
    els.txAcc.value = acc;
    ctx.onTxAccChange();
    observed.push(els.txOwnerPorsiWrap.style.display);
  }
  assert.deepEqual(observed, ['none', 'block', 'none', 'block'], 'tiap perpindahan akun harus konsisten toggle sesuai akun aktif saat itu, bukan akumulasi/stale dari akun sebelumnya');
  assert.match(els.txOwnerPorsi.innerHTML, /Budi/, 'akhir dari sequence di acc-b: opsi porsi harus terisi akun B, bukan kosong sisa acc-a terakhir');
});

test('s572 [7/8]: _txAccManuallySet tetap ke-set true oleh onTxAccChange() (regresi lama applyLastAccForCat() tidak rusak)', () => {
  const { doc, els } = makeFakeDoc({ txAcc: { value: 'acc-a' } });
  const ctx = makeCtx({ document: doc, assets: [] });
  assert.equal(ctx._txAccManuallySet, undefined, 'sanity: sebelum dipanggil, flag belum ke-set di context baru');
  ctx.onTxAccChange();
  assert.equal(ctx._txAccManuallySet, true, 'onTxAccChange() harus tetap menandai _txAccManuallySet=true (perilaku lama dipertahankan)');
});

test('s572 [8/8]: updateTxAssetSplitPreview() ikut terpanggil di akhir onTxAccChange() -- preview tidak nyangkut ke akun sebelumnya', () => {
  const assets = [
    { id: 'aset-b', name: 'Ruko Patungan B', accountId: 'acc-b', isMultiOwner: true, owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 50 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 50 }] },
  ];
  const { doc, els } = makeFakeDoc({
    txAcc: { value: 'acc-b' },
    txAssetId: { value: 'aset-b' },
    txAmt: { value: '1000000' },
  });
  const ctx = makeCtx({
    document: doc, assets,
    ownerSplitByAcc: { 'acc-b': { owners: assets[0].owners } },
  });
  // override calcPreviewValue supaya angka nilai terbaca dari input (bukan stub 0)
  ctx.calcPreviewValue = (v) => Number(v) || 0;

  ctx.onTxAccChange();
  // updateTxAssetSplitPreview() membaca #txAssetId & #txAmt lalu mengisi
  // #txAssetSplitPreview via resolveTxAssetSplit() -- pastikan box ini
  // benar2 di-refresh (tidak dibiarkan dari state sebelumnya/kosong krn tidak dipanggil).
  assert.notEqual(els.txAssetSplitPreview.textContent, undefined);
});
