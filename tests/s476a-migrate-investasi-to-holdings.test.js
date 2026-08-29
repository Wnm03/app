'use strict';
// tests/s476a-migrate-investasi-to-holdings.test.js — Regression test sesi
// s476a (docs/s476-PLAN-migrate-investasi-to-holdings.md): migrasi
// D.assets -> D.investments (SSOT baru), + Blocker A (Net Worth) & Blocker B
// (Zakat Maal) yang WAJIB fix di sesi yang SAMA (lihat rencana).
//
// Fixture dimodelkan dari data user (screenshot O): BTC, ETH, Majoris
// (zakatable, multi-owner titipan 70% SELF / 30% pihak lain), Schorder.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeAssets() {
  return [
    // BTC: hargaBeli x jumlahUnit (per-unit), self-owned, bukan zakatable
    { id: 'a-btc', name: 'BTC', jenis: 'Kripto', hargaBeli: 500000000, jumlahUnit: 0.02, nilai: 15000000, tanggal: '2025-01-01', zakatable: false },
    // ETH: modalInvestasi (lot tunggal), self-owned
    { id: 'a-eth', name: 'ETH', jenis: 'Kripto', modalInvestasi: 8000000, nilai: 10000000, tanggal: '2025-02-01', zakatable: false },
    // Majoris: modalInvestasi, zakatable, multi-owner (70% SELF / 30% Budi)
    {
      id: 'a-majoris', name: 'Majoris', jenis: 'Deposito/Investasi', modalInvestasi: 20000000, nilai: 22000000,
      tanggal: '2025-03-01', zakatable: true,
      owners: [{ ownerId: 'SELF', porsi: 70, ownerName: 'Milik Sendiri', isSelf: true }, { ownerId: 'budi', porsi: 30, ownerName: 'Budi', isSelf: false }],
    },
    // Rumah: BUKAN investasi (tidak ada modalInvestasi/hargaBeli+jumlahUnit) -- HARUS tidak ikut termigrasi
    { id: 'a-rumah', name: 'Rumah', jenis: 'Properti', nilai: 500000000, zakatable: false },
  ];
}

function makeD() {
  return {
    assets: makeAssets(),
    investments: [],
    investmentTx: [],
    debts: [],
    transactions: [],
    accounts: [],
    piutang: [],
    inventoriBisnis: [],
    finansialFreedom: {},
    pajakZakat: { hargaEmasPerGram: 1200000, utangJT: 0 },
  };
}

function makeCtx(D, extra = {}) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js'],
    { D, uid: () => 'uid_' + Math.random().toString(36).slice(2), save: () => {}, ...extra },
    ['Aset', 'Investment', 'migrateAssetInvestmentsToHoldings', 'MultiOwnerEngine']
  );
}

test('migrateAssetInvestmentsToHoldings() — memindah BTC/ETH/Majoris (tracked), TIDAK memindah Rumah', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const res = ctx.migrateAssetInvestmentsToHoldings();
  assert.equal(res.migrated, 3);
  assert.equal(D.investments.length, 3);
  assert.equal(D.assets.find((a) => a.id === 'a-rumah')._migratedToInvestmentId, undefined);
  assert.ok(D.assets.find((a) => a.id === 'a-btc')._migratedToInvestmentId);
  assert.ok(D.assets.find((a) => a.id === 'a-eth')._migratedToInvestmentId);
  assert.ok(D.assets.find((a) => a.id === 'a-majoris')._migratedToInvestmentId);
});

test('migrateAssetInvestmentsToHoldings() — idempotent, dipanggil 2x tidak dobel', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.migrateAssetInvestmentsToHoldings();
  const res2 = ctx.migrateAssetInvestmentsToHoldings();
  assert.equal(res2.migrated, 0);
  assert.equal(D.investments.length, 3);
});

test('migrateAssetInvestmentsToHoldings() — zakatable & owners[] dibawa (Majoris)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.migrateAssetInvestmentsToHoldings();
  const majorisId = D.assets.find((a) => a.id === 'a-majoris')._migratedToInvestmentId;
  const h = D.investments.find((x) => x.id === majorisId);
  assert.equal(h.zakatable, true);
  assert.equal(h.owners.length, 2);
  assert.equal(h.owners.find((o) => o.isSelf).porsi, 70);
});

test('Blocker A — Aset.totalValue()+Investment.selfOwnedTotalValue() (komponen Net Worth) IDENTIK sebelum & sesudah migrasi', () => {
  // s476a: Aset.totalValue() SENGAJA TIDAK ikut menjumlah holding (supaya
  // tidak dobel-hitung dgn AssetPortfolioAPI.investmentValue, lihat komentar
  // di aset.js/modules-calc.js) -- titik gabungnya cuma di
  // Kekayaan.currentNetWorth()/renderBersih(), makanya yang dibandingkan di
  // sini adalah PENJUMLAHAN keduanya (persis rumus di modules-calc.js),
  // bukan Aset.totalValue() sendirian.
  const D1 = makeD();
  const ctx1 = makeCtx(D1);
  const before = ctx1.Aset.totalValue() + ctx1.Investment.selfOwnedTotalValue();

  const D2 = makeD();
  const ctx2 = makeCtx(D2);
  ctx2.migrateAssetInvestmentsToHoldings();
  const after = ctx2.Aset.totalValue() + ctx2.Investment.selfOwnedTotalValue();

  // sebelum migrasi: BTC 15jt + ETH 10jt + Majoris 22jt*70% + Rumah 500jt (semua di Aset.totalValue(), Investment kosong)
  assert.equal(before, 15000000 + 10000000 + 22000000 * 0.7 + 500000000);
  assert.equal(after, before);
});

test('Blocker B — Zakat (asetZakatable + Investment.zakatableValue) IDENTIK sebelum & sesudah migrasi', () => {
  function zakatableTotal(D, ctx) {
    const asetZakatable = (D.assets || []).filter((a) => a.zakatable && !a._migratedToInvestmentId)
      .reduce((s, a) => s + ctx.MultiOwnerEngine.selfOwnedValue(a, a.nilai || 0), 0);
    return asetZakatable + ctx.Investment.zakatableValue();
  }
  const D1 = makeD();
  const ctx1 = makeCtx(D1);
  const before = zakatableTotal(D1, ctx1);

  const D2 = makeD();
  const ctx2 = makeCtx(D2);
  ctx2.migrateAssetInvestmentsToHoldings();
  const after = zakatableTotal(D2, ctx2);

  // Majoris zakatable, 70% SELF dari 22jt
  assert.equal(before, 22000000 * 0.7);
  assert.equal(after, before);
});

test('0 dobel-hitung — total D.assets (self, belum-migrasi) + Investment.selfOwnedTotalValue() = Aset.totalValue()+Investment.selfOwnedTotalValue() gabungan', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.migrateAssetInvestmentsToHoldings();
  // Aset.totalValue() SUDAH exclude aset yang termigrasi (lihat filter
  // `!a._migratedToInvestmentId` di aset.js) -- jadi manual-sum di sini
  // (filter sama) HARUS persis sama dgn Aset.totalValue(), tanpa perlu
  // ditambah apa pun lagi (holding-nya baru digabung belakangan di
  // Kekayaan.currentNetWorth(), bukan di titik ini).
  const assetsSideManual = (D.assets || []).filter((a) => !a._migratedToInvestmentId)
    .reduce((s, a) => s + ctx.MultiOwnerEngine.selfOwnedValue(a, a.nilai || 0), 0);
  assert.equal(assetsSideManual, ctx.Aset.totalValue());
  // Dan holding hasil migrasi (BTC/ETH/Majoris*70%) HARUS sama persis dgn
  // Investment.selfOwnedTotalValue() -- 0 hilang/nambah pas dipindah.
  assert.equal(ctx.Investment.selfOwnedTotalValue(), 15000000 + 10000000 + 22000000 * 0.7);
});

// ------ End-to-end lewat SSOT asli Kekayaan.currentNetWorth() (modules-calc.js) ------

function makeFullCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/finance/akun.js',
      'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js',
      'pajak-aset-ui-wrappers.js',
      'modules/asset/investasi.js',
      'modules/shared/modules-calc.js',
    ],
    {
      D,
      Etalase: { totalModalStok: () => 0 },
      Piutang: { totalValue: () => 0 },
      Debt: { totalValue: () => 0 },
      uid: () => 'uid_' + Math.random().toString(36).slice(2),
      save: () => {},
      todayStr: () => '2026-01-01',
      escapeHtml: (s) => String(s),
    },
    ['Aset', 'Investment', 'Kekayaan', 'migrateAssetInvestmentsToHoldings']
  );
}

test('E2E — Kekayaan.currentNetWorth() (SSOT asli) IDENTIK sebelum & sesudah migrasi (fixture BTC/ETH/Majoris/Rumah)', () => {
  const D1 = makeD();
  D1.accounts = [];
  const ctx1 = makeFullCtx(D1);
  const before = ctx1.Kekayaan.currentNetWorth();

  const D2 = makeD();
  D2.accounts = [];
  const ctx2 = makeFullCtx(D2);
  ctx2.migrateAssetInvestmentsToHoldings();
  const after = ctx2.Kekayaan.currentNetWorth();

  assert.equal(before, 15000000 + 10000000 + 22000000 * 0.7 + 500000000);
  assert.equal(after, before);
});
