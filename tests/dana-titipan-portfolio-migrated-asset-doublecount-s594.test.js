'use strict';
// tests/dana-titipan-portfolio-migrated-asset-doublecount-s594.test.js — Sesi
// 594 (audit user, Agustus 2026 — laporan "🏦 Majoris" masih tampil di Dana
// Titipan walau sudah tidak ada di Buku Aset). Cakupan fix `_assetSplits()` di
// modules/finance/dana-titipan-portfolio-presenter.js: aset yang sudah
// ditandai `a._migratedToInvestmentId` (dipindah OTOMATIS ke Holding
// Investasi lewat `migrateAssetInvestmentsToHoldings()`, aset-misc.js s476a —
// flag ADITIF, aset asal TETAP ADA di D.assets, cuma disembunyikan dari Buku
// Aset) sekarang JUGA DIKECUALIKAN dari domain Aset di
// `build()`/`allocatedExcluding()` — logic exclude SAMA PERSIS
// `Aset.totalValue()` (aset.js, `.filter(a=>!a._migratedToInvestmentId)`),
// dan pola SAMA PERSIS fix `investmentId` sesi 554
// (dana-titipan-portfolio-linked-asset-doublecount-s554.test.js).
//
// CATATAN AUDIT SESI 594 (temuan sampingan, DICATAT tapi TIDAK dikerjakan
// di sini — di luar scope 1 fix ini): tests/s484-*.test.js,
// dana-titipan-portfolio-linked-asset-doublecount-s554.test.js, dan test
// Dana Titipan lain yang memakai pola `makeCtx()` SAMA (load
// `dana-titipan-aggregation-api.js` + `dana-titipan-portfolio-render.js`)
// TERNYATA menguji 2 FILE ORPHAN yang TIDAK terdaftar di scripts/build.js
// sama sekali (masing2 mendefinisikan ULANG `const DanaTitipanPortfolioAPI`/
// `DanaTitipanPortfolioPresenter` sendiri, isinya fork/duplikat lama dari
// SEBELUM sesi split — persis pola yang sudah diflag di
// CHANGED-FILES-s593.txt utk `dana-titipan-portfolio-render.js`, ternyata
// `dana-titipan-aggregation-api.js` & `dana-titipan-commitment-return-api.js`
// JUGA orphan yang sama). File PRODUKSI SATU-SATUNYA yang benar2 dibundle
// (lihat scripts/build.js) adalah `dana-titipan-portfolio-presenter.js`
// SENDIRIAN (berisi LENGKAP API+Presenter, belum benar2 di-split) — jadi
// test SEBELUMNYA yang pakai pola lama itu TIDAK PERNAH menguji kode yang
// benar2 jalan di app. Test INI sengaja load `dana-titipan-portfolio-
// presenter.js` langsung (bukan pola lama) supaya benar2 menguji fix s594.
// Disarankan: audit+perbaiki SEMUA test Dana Titipan lain ke pola ini di
// sesi terpisah (TIDAK digabung ke sini sesuai disiplin "1 task = 1 sesi").

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {}, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI'],
  );
}

test('build(): aset ber-_migratedToInvestmentId (pindah otomatis s476a) TIDAK dobel-hitung -- kasus persis laporan user "Majoris"', () => {
  const D = {
    investments: [
      { id: 'h1', name: 'Majoris', unit: 1, avgPrice: 10133585, currentPrice: 10133585, owners: [
        { ownerId: 'renov', ownerName: 'renov', porsi: 84.8781, isSelf: false },
        { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 15.1219, isSelf: false },
      ] },
    ],
    assets: [
      { id: 'a1', name: 'Majoris', nilai: 10133585, _migratedToInvestmentId: 'h1', owners: [
        { ownerId: 'renov', ownerName: 'renov', porsi: 84.8781, isSelf: false },
        { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 15.1219, isSelf: false },
      ] },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
  };
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 2);
  const renov = p.owners.find((o) => o.ownerId === 'renov');
  const sihab = p.owners.find((o) => o.ownerId === 'sihab');
  // SEBELUM fix: masing2 dobel (1x dari holding + 1x dari aset yg sudah migrasi).
  assert.equal(renov.holdings.length, 1);
  assert.equal(sihab.holdings.length, 1);
  assert.ok(Math.abs(renov.allocatedPrincipal - 8601194.5) < 1);
  assert.ok(Math.abs(sihab.allocatedPrincipal - 1532390.5) < 1);
});

test('build(): aset TANPA _migratedToInvestmentId dgn nama sama tapi instrumen BEDA tetap dihitung terpisah (0 regresi kasus normal)', () => {
  const D = {
    investments: [
      { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 100, isSelf: false }] },
    ],
    assets: [
      { id: 'a1', name: 'Tanah Kavling', nilai: 500000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 100, isSelf: false }] },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
  };
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  const o = p.owners[0];
  assert.equal(o.allocatedPrincipal, 800000 + 500000);
  assert.equal(o.holdings.length, 2);
});

test('allocatedExcluding(): aset ber-_migratedToInvestmentId juga dikecualikan (fix di _assetSplits() otomatis ikut ke caller ke-2 ini, 0 logic ganda)', () => {
  const D = {
    investments: [],
    assets: [
      { id: 'a1', name: 'Majoris', nilai: 10133585, _migratedToInvestmentId: 'h1', owners: [{ ownerId: 'renov', ownerName: 'renov', porsi: 84.8781, isSelf: false }] },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
  };
  const ctx = makeCtx(D);
  const total = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('renov', null);
  assert.equal(total, 0);
});
