'use strict';
// tests/s461-cross-source-titipan-total-regression.test.js — Sesi 461
// (rekomendasi #2 dari audit "dana titipan" Sesi 458, KONSOLIDASI JANGKA
// PANJANG): sebelum sesi ini TIDAK ADA test yang skenarionya "aset titipan
// (multi-owner) + investasi titipan (fundSource) + aset/investasi
// THIRD_PARTY whole-entity" SEKALIGUS dalam 1 dataset, buat mastiin total
// (Aset.totalValue(), Debt.totalValue(), DebtStrategy.activeDebts()) tetap
// benar saat ketiga sumber titipan nyala bersamaan.
//
// TEMUAN Sesi 461 (BUG-016, docs/BUG_REGISTRY.md): Aset.totalValue()/
// Investment.portfolioSummary() SUDAH mengecualikan porsi non-SELF (lewat
// MultiOwnerEngine.selfOwnedValue()/isHoldingOwnershipSelf(), Sesi
// 193/393/422d) -- tapi Aset._syncOwnerDebts()/Investment.
// _syncTitipanDebt() (Sesi 408-410/460) TETAP membuat entry Buku Utang
// senilai PORSI PENUH non-SELF itu juga, dan Debt.totalValue() (dipakai
// FI.totalDebt() -> Kekayaan.currentNetWorth()) SAAT ITU TIDAK
// mengecualikan entry titipan ini dari total utang -- porsi non-SELF/
// whole-entity terpotong DUA KALI dari Kekayaan Bersih.
//
// FIX (Sesi 463, opsi (a) dari 2 kandidat di BUG_REGISTRY.md):
// Debt.totalValue() sekarang mengecualikan entry `linkedAssetId`/
// `linkedInvestmentId` dari total utang (pola SAMA PERSIS
// DebtStrategy.activeDebts() yang sudah lebih dulu mengecualikan kedua tag
// ini). Test paling bawah di file ini (awalnya "TEMUAN — Debt.totalValue()
// TETAP menghitung PENUH...") diupdate jadi memverifikasi PERILAKU BARU
// (sudah benar, entry titipan TIDAK ikut Total Utang lagi) -- bukan lagi
// memATOK bug, sesuai catatan wajib di BUG_REGISTRY.md ("siapa pun yang
// akhirnya memperbaiki BUG-016 wajib update angka expected di test ini
// juga").

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    accounts: [],
    assets: [
      // Sumber #1: aset TITIPAN multi-owner (co-owned, owners[] eksplisit).
      { id: 'a1', name: 'Rumah Kontrakan', nilai: 4000000, owners: [
        { ownerId: 'SELF', porsi: 60, ownerName: 'Milik Sendiri', isSelf: true },
        { ownerId: 'budi', porsi: 25, ownerName: 'Budi' },
        { ownerId: 'ayah', porsi: 15, ownerName: 'Ayah' },
      ] },
      // Sumber #3: aset THIRD_PARTY whole-entity (0% SELF, harus tidak
      // nyumbang apa pun ke Aset.totalValue()).
      { id: 'a2', name: 'Ruko Titip Kelola Investor', nilai: 2000000, ownership: 'THIRD_PARTY' },
    ],
    transactions: [],
    investments: [
      // Sumber #2: holding investasi TITIPAN (fundSource, ownership tetap
      // implisit SELF -- pola paling umum di modul ini).
      { id: 'i1', name: 'Reksadana X', unit: 20, avgPrice: 50000, currentPrice: 60000, fundSource: 'titipan', titipanOwner: 'Budi' },
      // Sumber #3 (varian investasi): holding THIRD_PARTY whole-entity YANG
      // JUGA ditandai fundSource:'titipan' -- kombinasi ekstrem, harus tetap
      // 0% ke Investment.portfolioSummary().
      { id: 'i2', name: 'Saham Y (titip kelola)', unit: 10, avgPrice: 30000, currentPrice: 30000, ownership: 'THIRD_PARTY', fundSource: 'titipan', titipanOwner: 'Investor' },
    ],
    investmentTx: [],
    investmentWatchlist: [],
    debts: [
      // Utang BIASA (kontrol) -- harus tetap terhitung & tetap ikut
      // DebtStrategy apa adanya, tidak boleh ikut ter-exclude oleh filter
      // titipan manapun.
      { id: 'd0', name: 'KTA Bank X', nilai: 3000000, lunas: false, bunga: 10, cicilanBulanan: 250000 },
    ],
    bills: [],
    cobek: [],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js', 'modules/asset/investasi.js', 'modules/finance/piutang-utang.js'],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      todayStr: () => '2026-08-07',
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      sameId: (a, b) => a === b,
    },
    ['Aset', 'Investment', 'Debt', 'DebtStrategy', 'MultiOwnerEngine'],
  );
}

// Simulasikan alur save() nyata: tiap aset/holding titipan disinkron ke
// Buku Utang, pola SAMA PERSIS yang dipanggil Aset.save()/Investment.
// addHolding() di source asli (lihat komentar masing-masing fungsi).
function syncAll(ctx, D) {
  D.assets.forEach((a) => ctx.Aset._syncOwnerDebts(a));
  D.investments.forEach((h) => ctx.Investment._syncTitipanDebt(h));
}

test('S461 — 3 sumber titipan sekaligus: tiap sumber ditandai/dikecualikan sesuai jenisnya di Buku Utang', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  syncAll(ctx, D);

  // 1 utang biasa + 2 owner-debt (a1: Budi, Ayah) + 1 whole-entity debt (a2)
  // + 2 investment-debt (i1, i2) = 6 total.
  assert.equal(D.debts.length, 6);

  const budiAset = D.debts.find((d) => d.linkedAssetId === 'a1' && d.linkedOwnerId === 'budi');
  const ayahAset = D.debts.find((d) => d.linkedAssetId === 'a1' && d.linkedOwnerId === 'ayah');
  const a2Debt = D.debts.find((d) => d.linkedAssetId === 'a2');
  const i1Debt = D.debts.find((d) => d.linkedInvestmentId === 'i1');
  const i2Debt = D.debts.find((d) => d.linkedInvestmentId === 'i2');

  assert.equal(budiAset.nilai, 1000000, '25% dari 4jt (Rumah Kontrakan)');
  assert.equal(ayahAset.nilai, 600000, '15% dari 4jt (Rumah Kontrakan)');
  assert.equal(a2Debt.nilai, 2000000, 'whole-entity THIRD_PARTY -> 100% nilai jadi 1 entry utang');
  assert.equal(i1Debt.nilai, 1000000, 'cost basis holding i1 (20*50000)');
  assert.equal(i2Debt.nilai, 300000, 'cost basis holding i2 (10*30000)');
});

test('S461 — Aset.totalValue()/Investment.portfolioSummary() mengecualikan porsi non-SELF & whole-entity dari SEMUA 3 sumber', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  syncAll(ctx, D);

  // Cuma porsi SELF (60%) dari a1 yang terhitung; a2 (THIRD_PARTY, whole-
  // entity) 0% -- 0 kontribusi sama sekali.
  assert.equal(ctx.Aset.totalValue(), 2400000);

  // i2 (THIRD_PARTY, whole-entity) TIDAK boleh ikut portofolio; i1 (SELF,
  // titipan) tetap ikut PENUH (fundSource cuma soal SUMBER DANA, bukan
  // kepemilikan holding-nya).
  const summary = ctx.Investment.portfolioSummary();
  assert.equal(summary.holdingsCount, 1);
  assert.equal(summary.totalCost, 1000000, 'cuma i1 (cost basis), i2 dikecualikan penuh');
});

test('S461 — DebtStrategy.activeDebts() mengecualikan SEMUA entry titipan (linkedAssetId & linkedInvestmentId), sisa cuma utang biasa', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  syncAll(ctx, D);

  const active = ctx.DebtStrategy.activeDebts();
  assert.deepEqual(active.map((d) => d.id).sort(), ['d0']);
});

test('S461/BUG-016 FIXED (Sesi 463) — Debt.totalValue() mengecualikan SEMUA entry titipan (linkedAssetId & linkedInvestmentId), sisa cuma utang biasa d0 -- 0 double-subtraction lagi dari Kekayaan Bersih', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  syncAll(ctx, D);

  // Sebelum fix BUG-016: 7.900.000 (d0 + SEMUA entry titipan dihitung
  // penuh, termasuk a2/i2 whole-entity yang porsi asetnya sendiri sudah 0
  // di Aset.totalValue()/Investment.portfolioSummary()). Sesudah fix:
  // entry bertanda linkedAssetId/linkedInvestmentId dikecualikan dari
  // Total Utang (tetap tampil apa adanya di Debt.renderList(), cuma tidak
  // ikut diakumulasi lagi) -- sisa cuma utang biasa d0.
  assert.equal(ctx.Debt.totalValue(), 3000000 /* d0 saja */);
});
