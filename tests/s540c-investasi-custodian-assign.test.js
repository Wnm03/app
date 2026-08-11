'use strict';
// tests/s540c-investasi-custodian-assign.test.js — Sesi S540-C (Tahap 3/4,
// DESIGN-S540-CUSTODIAN-GROUPING.md). UI assignment kustodian per holding:
// dropdown "Pilih/Buat Kustodian" di investmentModal (InvestmentListUI,
// investasi-list-view.js) konsumsi CustodianRegistry.findOrCreate() (S540-A)
// & menulis lewat Investment.updateHolding({custodianId}) (jalur BARU sesi
// ini, lihat komentar di investasi.js). 0 grouping, 0 perubahan formula
// portfolio -- scope test ini murni jalur baca/tulis custodianId di
// Investment.updateHolding().

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/asset/investasi.js'],
    { D, uid: (() => { let n = 0; return () => 'inv_' + (n += 1); })(), save: () => { D._saved = (D._saved || 0) + 1; } },
    ['Investment'],
  );
}

function makeD(extra = {}) {
  return { investments: [], investmentTx: [], investmentWatchlist: [], assets: [], debts: [], accounts: [], ...extra };
}

test('1. updateHolding({custodianId}) -> menulis id ke holding (jalur baru S540-C)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Sucorinvest Money Market', unit: 100, avgPrice: 1000 });
  const updated = ctx.Investment.updateHolding(h.id, { custodianId: 'cust_1' });
  assert.equal(updated.custodianId, 'cust_1');
  assert.equal(D.investments[0].custodianId, 'cust_1');
});

test('2. updateHolding({custodianId: ""}) -> ditulis sbg null (lepas kustodian), bukan string kosong', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Schroder Dana Prestasi', unit: 10, avgPrice: 5000 });
  ctx.Investment.updateHolding(h.id, { custodianId: 'cust_2' });
  const cleared = ctx.Investment.updateHolding(h.id, { custodianId: '' });
  assert.equal(cleared.custodianId, null);
});

test('3. updateHolding({custodianId: null}) -> tetap null, 0 error', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const h = ctx.Investment.addHolding({ name: 'BNI AM Dana Likuid', unit: 1, avgPrice: 1000000 });
  const updated = ctx.Investment.updateHolding(h.id, { custodianId: null });
  assert.equal(updated.custodianId, null);
});

test('4. patch TANPA custodianId sama sekali -> field custodianId holding TIDAK berubah (undefined guard)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const h = ctx.Investment.addHolding({ name: 'BBCA', unit: 100, avgPrice: 8000 });
  ctx.Investment.updateHolding(h.id, { custodianId: 'cust_3' });
  const untouched = ctx.Investment.updateHolding(h.id, { notes: 'update lain, bukan custodian' });
  assert.equal(untouched.custodianId, 'cust_3'); // tidak ikut ke-reset
  assert.equal(untouched.notes, 'update lain, bukan custodian');
});

test('5. holding LEGACY (belum pernah punya field custodianId sama sekali) -> updateHolding({custodianId}) tetap bisa assign, 0 crash', () => {
  const D = makeD({
    investments: [{ id: 'h-legacy', name: 'Majoris', unit: 1, avgPrice: 20000000, currentPrice: 22000000 }],
  });
  const ctx = makeCtx(D);
  const updated = ctx.Investment.updateHolding('h-legacy', { custodianId: 'cust_majoris' });
  assert.equal(updated.custodianId, 'cust_majoris');
});

test('6. custodianId TIDAK ikut mempengaruhi _syncTitipanDebt()/fundSource -- assign kustodian pada holding titipan tetap hasilkan 1 entry utang seperti biasa', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const h = ctx.Investment.addHolding({
    name: 'Reksadana Titipan Ayah', unit: 1, avgPrice: 5000000, fundSource: 'titipan', titipanOwner: 'Ayah',
  });
  ctx.Investment.updateHolding(h.id, { custodianId: 'cust_majoris' });
  const debtEntries = (D.debts || []).filter((d) => d.linkedInvestmentId === h.id);
  assert.equal(debtEntries.length, 1);
  assert.equal(D.investments[0].custodianId, 'cust_majoris');
  assert.equal(D.investments[0].fundSource, 'titipan'); // 0 regresi ke jalur titipan yang sudah ada
});

test('7. build()-equivalent (getHoldings/getHolding) tetap pass-through custodianId apa adanya setelah assign, 0 transformasi tambahan', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Emas Antam', unit: 5, avgPrice: 1000000 });
  ctx.Investment.updateHolding(h.id, { custodianId: 'cust_pegadaian' });
  assert.equal(ctx.Investment.getHolding(h.id).custodianId, 'cust_pegadaian');
  assert.equal(ctx.Investment.getHoldings()[0].custodianId, 'cust_pegadaian');
});
