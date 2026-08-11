'use strict';
// tests/s485b-titipan-commitment-crud.test.js — Sesi 485b (Gap #3 audit,
// langkah 2/5 dari rencana multi-sesi:
// RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md).
//
// Target: `DanaTitipanPortfolioAPI.saveCommitment()` + `getCommitments()`
// — CRUD backend murni (upsert by `ownerId`, existing-owner-only,
// isolasi total dari D.accounts/investments/debts/investmentTx). Sesi
// ini SENGAJA belum menguji projection (`build()` belum di-extend, itu
// Sesi 485c) & belum ada modal/UI (Sesi 485d).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  let saveCalls = 0;
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => { saveCalls++; }, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI'],
  );
  ctx._saveCalls = () => saveCalls;
  return ctx;
}

function baseD(investments) {
  return { investments, investmentTx: [], investmentWatchlist: [], debts: [], accounts: [], transactions: [] };
}

function oneOwnerD() {
  return baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
}

test('1. saveCommitment(): create baru -> push ke D.titipanCommitments, panggil save()', () => {
  const D = oneOwnerD();
  const ctx = makeCtx(D);
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 100000000, committedDate: '2026-01-01', notes: 'x' });
  assert.equal(D.titipanCommitments.length, 1);
  assert.equal(rec.ownerId, 'budi');
  assert.equal(rec.principalAmount, 100000000);
  assert.equal(rec.ownerName, 'Budi');
  assert.ok(rec.id);
  assert.equal(ctx._saveCalls(), 1);
});

test('2. saveCommitment(): upsert -> ownerId sama dipanggil 2x -> update in place, bukan push duplikat', () => {
  const D = oneOwnerD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 50000000 });
  const rec2 = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 70000000 });
  assert.equal(D.titipanCommitments.length, 1);
  assert.equal(D.titipanCommitments[0].principalAmount, 70000000);
  assert.equal(rec2.principalAmount, 70000000);
});

test('3. ownerId tersimpan persis dari pilihan (bukan hasil ketik ulang nama) -- ownerName custom tidak mengubah ownerId', () => {
  const D = oneOwnerD();
  const ctx = makeCtx(D);
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', ownerName: 'Budi Santoso (custom label)', principalAmount: 1000 });
  assert.equal(rec.ownerId, 'budi');
  assert.equal(rec.ownerName, 'Budi Santoso (custom label)');
});

test('4. owner tidak ada di listExistingOwners() -> ditolak (throw), tidak membuat ownerId baru', () => {
  const D = oneOwnerD();
  const ctx = makeCtx(D);
  assert.throws(() => ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'ghost-owner', principalAmount: 1000 }));
  assert.equal((D.titipanCommitments || []).length, 0);
});

test('5. ownerId kosong/undefined -> ditolak (throw)', () => {
  const D = oneOwnerD();
  const ctx = makeCtx(D);
  assert.throws(() => ctx.DanaTitipanPortfolioAPI.saveCommitment({ principalAmount: 1000 }));
  assert.throws(() => ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: '', principalAmount: 1000 }));
});

test('6. principal negatif -> ditolak (throw), tidak menulis apa pun', () => {
  const D = oneOwnerD();
  const ctx = makeCtx(D);
  assert.throws(() => ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: -1 }));
  assert.equal((D.titipanCommitments || []).length, 0);
});

test('7. principal non-numerik -> ditolak (throw)', () => {
  const D = oneOwnerD();
  const ctx = makeCtx(D);
  assert.throws(() => ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 'abc' }));
  assert.throws(() => ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: NaN }));
});

test('8. principal = 0 tetap diterima (bukan invalid, sesuai spec ">= 0")', () => {
  const D = oneOwnerD();
  const ctx = makeCtx(D);
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 0 });
  assert.equal(rec.principalAmount, 0);
});

test('9. saveCommitment() TIDAK mengubah D.accounts/D.transactions/D.investmentTx/D.investments/D.debts sama sekali', () => {
  const D = oneOwnerD();
  const before = JSON.stringify({
    accounts: D.accounts, transactions: D.transactions, investmentTx: D.investmentTx,
    investments: D.investments, debts: D.debts,
  });
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 12345, committedDate: '2026-02-01', notes: 'catatan' });
  const after = JSON.stringify({
    accounts: D.accounts, transactions: D.transactions, investmentTx: D.investmentTx,
    investments: D.investments, debts: D.debts,
  });
  assert.equal(before, after);
});

test('10. getCommitments(): getter read-only, init lazy TIDAK menulis D.titipanCommitments kalau belum ada', () => {
  const D = oneOwnerD();
  const ctx = makeCtx(D);
  const list = ctx.DanaTitipanPortfolioAPI.getCommitments();
  assert.equal(list.length, 0);
  assert.equal(D.titipanCommitments, undefined);
});

test('11. getCommitments(): setelah saveCommitment(), balikin array berisi record yang tersimpan', () => {
  const D = oneOwnerD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 999 });
  const list = ctx.DanaTitipanPortfolioAPI.getCommitments();
  assert.equal(list.length, 1);
  assert.equal(list[0].ownerId, 'budi');
});

test('12. multi-owner: 2 owner berbeda -> 2 record terpisah, tidak saling menimpa', () => {
  const D = baseD([
    {
      id: 'h1', name: 'Obligasi Y', unit: 100, avgPrice: 100000, currentPrice: 106000,
      owners: [
        { ownerId: 'ayah', porsi: 50, ownerName: 'Ayah', isSelf: false },
        { ownerId: 'budi', porsi: 50, ownerName: 'Budi', isSelf: false },
      ],
    },
  ]);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'ayah', principalAmount: 1000 });
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 2000 });
  assert.equal(D.titipanCommitments.length, 2);
  const ayah = D.titipanCommitments.find((c) => c.ownerId === 'ayah');
  const budi = D.titipanCommitments.find((c) => c.ownerId === 'budi');
  assert.equal(ayah.principalAmount, 1000);
  assert.equal(budi.principalAmount, 2000);
});

test('13. REGRESI: build() sekarang ikut merefleksikan commitment (Sesi 485c) tanpa mengubah allocatedPrincipal/currentValue/gain lama', () => {
  const D = oneOwnerD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 100000000 });
  const p = ctx.DanaTitipanPortfolioAPI.build();
  // UPDATE Sesi 486 (Case F): 2 field derived baru ditambahkan ke totals
  // -- returnedTotalSum/outstandingPrincipalTotal -- additive, tidak
  // menghapus/mengubah field lama di atas.
  assert.deepEqual(Object.keys(p.totals).sort(), ['allocatedPrincipalTotal', 'currentValueTotal', 'gainTotal', 'principalAmountTotal', 'estimatedUnallocatedTotal', 'overAllocatedTotal', 'returnedTotalSum', 'outstandingPrincipalTotal'].sort());
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.principalAmount, 100000000);
  assert.equal(budi.allocationStatus, 'OK');
});

test('14. guard: saveCommitment()/getCommitments() aman dipanggil tanpa Investment/MultiOwnerEngine dimuat (getCommitments aman, saveCommitment tetap menolak krn owner tak dikenal)', () => {
  const ctx = loadSource(
    ['modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D: { investments: [] } },
    ['DanaTitipanPortfolioAPI'],
  );
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioAPI.getCommitments());
  assert.throws(() => ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 1 }));
});
