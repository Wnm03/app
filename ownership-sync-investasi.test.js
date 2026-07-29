'use strict';
// tests/ownership-sync-investasi.test.js — cakupan Sesi 193 (Ownership Sync
// — Asset & Investasi) khusus bagian Investasi/Portfolio
// (modules/asset/investasi.js).
//
// Target: isHoldingOwnershipSelf() (helper baru, reuse OwnershipEngine),
// Investment.portfolioSummary() & Investment.assetAllocation() — SEMUA cuma
// nambah 1 filter holdings by ownership di atas logic lama, 0 rumus diubah.
//
// RULE yang dites di sini:
//   - SELF (eksplisit atau default/tanpa field ownership) -> dihitung normal.
//   - INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY -> DIKECUALIKAN dari
//     portfolioSummary()/assetAllocation() (Investasi & Portfolio), TAPI
//     TIDAK dihapus dari D.investments/D.investmentTx (histori & transaksi
//     tetap tersimpan, tetap bisa diakses lewat Investment.getHoldings()/
//     getTransactions()).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    investments: [
      // SELF (default, tanpa field ownership): unit 100 @ avgPrice 10000 = cost 1jt, currentPrice 15000 -> value 1.5jt
      { id: 'h1', name: 'Saham BBRI', type: 'Saham', unit: 100, avgPrice: 10000, currentPrice: 15000 },
      // SELF eksplisit: unit 50 @ avgPrice 20000 = cost 1jt, currentPrice 20000 -> value 1jt
      { id: 'h2', name: 'Reksadana ABC', type: 'Reksa Dana', unit: 50, avgPrice: 20000, currentPrice: 20000, ownership: 'SELF' },
      // INVESTOR: harus dikecualikan
      { id: 'h3', name: 'Saham Modal Investor', type: 'Saham', unit: 1000, avgPrice: 5000, currentPrice: 8000, ownership: 'INVESTOR' },
      // CUSTOMER (lowercase): harus dikecualikan
      { id: 'h4', name: 'Emas Titipan Customer', type: 'Emas', unit: 10, avgPrice: 900000, currentPrice: 1000000, ownership: 'customer' },
    ],
    investmentTx: [
      { id: 't1', investmentId: 'h1', type: 'dividen', date: '2026-01-01', amount: 50000, createdAt: 1 },
      { id: 't2', investmentId: 'h3', type: 'dividen', date: '2026-01-01', amount: 999999, createdAt: 1 }, // milik INVESTOR, harus dikecualikan
    ],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/asset/investasi.js'],
    { D },
    ['OwnershipEngine', 'Investment', 'isHoldingOwnershipSelf']
  );
}

test('isHoldingOwnershipSelf() — holding tanpa field ownership -> true (default SELF)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isHoldingOwnershipSelf(D.investments[0]), true);
});

test('isHoldingOwnershipSelf() — holding ownership eksplisit SELF -> true', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isHoldingOwnershipSelf(D.investments[1]), true);
});

test('isHoldingOwnershipSelf() — INVESTOR/CUSTOMER -> false', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isHoldingOwnershipSelf(D.investments[2]), false);
  assert.equal(ctx.isHoldingOwnershipSelf(D.investments[3]), false);
});

test('Investment.portfolioSummary() — HANYA holding SELF yang dijumlah ke totalValue/totalCost/holdingsCount', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const res = ctx.Investment.portfolioSummary();
  // h1: value=100*15000=1.5jt, cost=100*10000=1jt
  // h2: value=50*20000=1jt, cost=50*20000=1jt
  // h3/h4 (non-SELF) dikecualikan.
  assert.equal(res.holdingsCount, 2);
  assert.equal(res.totalValue, 2500000);
  assert.equal(res.totalCost, 2000000);
  assert.equal(res.totalGainLoss, 500000);
});

test('Investment.portfolioSummary() — totalDividend HANYA dari dividen holding SELF', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const res = ctx.Investment.portfolioSummary();
  assert.equal(res.totalDividend, 50000, 'dividen 999999 dari holding INVESTOR (h3) harus dikecualikan');
});

test('Investment.assetAllocation() — HANYA holding SELF yang masuk breakdown per tipe', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const res = ctx.Investment.assetAllocation();
  const types = res.map((r) => r.type).sort();
  assert.deepEqual(types, ['Reksa Dana', 'Saham']);
  const saham = res.find((r) => r.type === 'Saham');
  assert.equal(saham.value, 1500000, 'Saham SELF cuma h1 (1.5jt), h3 (INVESTOR) dikecualikan');
});

test('Investment.getHoldings()/getTransactions() — TIDAK terpengaruh filter ownership, histori tetap utuh', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Investment.portfolioSummary();
  ctx.Investment.assetAllocation();
  assert.equal(ctx.Investment.getHoldings().length, 4, 'semua 4 holding (termasuk non-SELF) tetap ada');
  assert.equal(D.investmentTx.length, 2, 'semua transaksi (termasuk milik holding non-SELF) tetap tersimpan');
});

test('portfolioSummary()/assetAllocation() — kalau OwnershipEngine tidak dimuat, fallback hitung semua holding (regresi lama tetap jalan)', () => {
  const D = makeD();
  const ctx = loadSource(['modules/asset/investasi.js'], { D }, ['Investment']);
  const res = ctx.Investment.portfolioSummary();
  assert.equal(res.holdingsCount, 4);
});
