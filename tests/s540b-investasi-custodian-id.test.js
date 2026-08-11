'use strict';
// tests/s540b-investasi-custodian-id.test.js — Sesi S540-B (Tahap 2/4,
// DESIGN-S540-CUSTODIAN-GROUPING.md). Field `custodianId` di
// `Investment.addHolding()` (modules/asset/investasi.js) — READ-ONLY tahap
// ini, 0 UI untuk mengisinya (itu S540-C). Fokus test: (1) default
// `null` untuk holding BARU, (2) backward-compat penuh untuk holding LAMA
// yang bahkan tidak punya field ini sama sekali, (3) `getHoldings()` pass-
// through apa adanya tanpa transformasi/filter.

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

test('1. addHolding() baru -> custodianId default null', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const h = ctx.Investment.addHolding({ name: 'BBCA', unit: 100, avgPrice: 8000 });
  assert.equal(h.custodianId, null);
  assert.equal(D.investments[0].custodianId, null);
});

test('2. getHoldings() -> pass-through custodianId apa adanya, 0 transformasi', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Investment.addHolding({ name: 'Emas', unit: 10, avgPrice: 1000000 });
  const holdings = ctx.Investment.getHoldings();
  assert.equal(holdings.length, 1);
  assert.equal(holdings[0].custodianId, null);
});

test('3. holding LAMA tanpa field custodianId sama sekali (data existing sebelum S540-B) -> tetap terbaca getHoldings(), 0 error, 0 field custodianId dipaksa muncul', () => {
  const D = makeD({
    investments: [
      { id: 'h-legacy', name: 'Majoris', unit: 1, avgPrice: 20000000, currentPrice: 22000000, fundSource: 'sendiri', titipanOwner: '' },
    ],
  });
  const ctx = makeCtx(D);
  const holdings = ctx.Investment.getHoldings();
  assert.equal(holdings.length, 1);
  assert.equal(holdings[0].name, 'Majoris');
  assert.equal(holdings[0].custodianId, undefined); // field lama TIDAK ada -> undefined, BUKAN dipaksa null
});

test('4. getHolding(id) untuk holding lama tanpa custodianId -> tetap ketemu, 0 error', () => {
  const D = makeD({
    investments: [{ id: 'h-legacy2', name: 'Schroder', unit: 5, avgPrice: 1000000, currentPrice: 1100000 }],
  });
  const ctx = makeCtx(D);
  const h = ctx.Investment.getHolding('h-legacy2');
  assert.ok(h);
  assert.equal(h.name, 'Schroder');
});

test('5. updateHolding() -- jalur patch.custodianId ditambahkan di S540-C (lihat tests/s540c-investasi-custodian-assign.test.js utk cakupan lengkap); baseline S540-B ini cuma pastikan patch lain (mis. notes) tetap jalan normal setelahnya', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const h = ctx.Investment.addHolding({ name: 'BNI AM', unit: 1, avgPrice: 5000000 });
  const updated = ctx.Investment.updateHolding(h.id, { custodianId: 'some-id', notes: 'test' });
  assert.equal(updated.custodianId, 'some-id'); // S540-C: sekarang DITULIS (jalur baru)
  assert.equal(updated.notes, 'test'); // field lain yang memang didukung tetap jalan normal
});

test('6. beberapa holding campur (ada custodianId null default, ada holding lama tanpa field) -> getHoldings() balikin semua, 0 filter/skip', () => {
  const D = makeD({
    investments: [{ id: 'h-old', name: 'Sucorinvest', unit: 1, avgPrice: 10000000 }],
  });
  const ctx = makeCtx(D);
  ctx.Investment.addHolding({ name: 'BBCA', unit: 100, avgPrice: 8000 });
  const holdings = ctx.Investment.getHoldings();
  assert.equal(holdings.length, 2);
  assert.equal(holdings.find((h) => h.name === 'Sucorinvest').custodianId, undefined);
  assert.equal(holdings.find((h) => h.name === 'BBCA').custodianId, null);
});
