'use strict';
// tests/session04a-dana-titipan-pool-ui-summary.test.js — SESSION 4 (UI
// POOL), BAGIAN 1/2 — MASTER_HANDOFF_DANA_TITIPAN_POOL_PORSI.md §13.1-13.3
// (kartu ringkasan pool, 3 state) + Test Matrix skenario M (0 angka
// negatif ditampilkan di state manapun) sisi UI.
//
// Target: `DanaTitipanPortfolioPresenter._poolSummaryHtml()` +
// `renderInto()` (modules/finance/dana-titipan-portfolio-render.js).
// Semua test menjalankan SOURCE ASLI lewat loadSource (pola sama
// tests/s500-dana-titipan-f2-opsib-hide-gain-aset.test.js) — 0
// re-implementasi logic presenter di sini.
//
// TIDAK di-test di sini (scope Sesi 4 bagian 2 — modal Set Saldo Awal /
// Tambah Deposit): submit form, addOpeningBalance()/addDeposit() dari UI,
// wiring modals.js/index.html/app_production.html. Test ini HANYA
// memverifikasi tombol muncul/tidak muncul sesuai gate
// `typeof DanaTitipanPoolUI`.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeElement(id) {
  let _innerHTML = '';
  const el = { id, className: '', style: {}, textContent: '' };
  Object.defineProperty(el, 'innerHTML', {
    get() { return _innerHTML; },
    set(html) { _innerHTML = String(html); },
  });
  return el;
}

function makeStatefulDom() {
  const registry = new Map();
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); } };
}

function makeCtx(D, dom, extraGlobals) {
  return loadSource(
    [
      'modules/finance/dana-titipan-pool-api.js',
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    Object.assign(
      {
        D, document: dom,
        uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {},
        escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      },
      extraGlobals || {},
    ),
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPoolAPI', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'DanaTitipanPoolUI'],
  );
}

function baseD(overrides) {
  return Object.assign({
    assets: [], investments: [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: [], titipanReturns: [], titipanPool: [],
  }, overrides || {});
}

test('A1. NOT_MIGRATED: pool kosong + commitment lama -> label persis §13.1, 0 guard, principal lama tetap tampil', () => {
  const D = baseD({ titipanPool: [], titipanCommitments: [{ ownerId: 'a', ownerName: 'A', principalAmount: 7000000 }, { ownerId: 'b', ownerName: 'B', principalAmount: 2500000 }] });
  const ctx = makeCtx(D, makeStatefulDom());
  ctx.DanaTitipanPortfolioPresenter.renderInto('sum');
  const html = ctx.document.getElementById('sum').innerHTML;
  assert.match(html, /👥 Sudah Dialokasikan/);
  assert.match(html, /Rp 9500000/); // 7jt + 2.5jt
  assert.match(html, /💰 Dana Titipan Masuk/);
  assert.match(html, /Belum diset/);
  assert.match(html, /📋 Status: Data lama \/ belum dimigrasikan/);
});

test('A2. NOT_MIGRATED: tombol "Set Saldo Awal" MUNCUL by default (DanaTitipanPoolUI stub Bagian 1 satu file dgn presenter)', () => {
  const D = baseD({ titipanCommitments: [{ ownerId: 'a', ownerName: 'A', principalAmount: 7000000 }] });
  const ctx = makeCtx(D, makeStatefulDom());
  ctx.DanaTitipanPortfolioPresenter.renderInto('sum');
  const html = ctx.document.getElementById('sum').innerHTML;
  assert.match(html, /data-action="DanaTitipanPoolUI\.openSetSaldoAwal"/);
  assert.match(html, /Set Saldo Awal Dana Titipan/);
});

test('A3. openSetSaldoAwal() -> buka modal sungguhan (Sesi 4 Bagian 2, superseded dari stub Bagian 1; detail lengkap di tests/session04b-dana-titipan-pool-ui-modal.test.js)', () => {
  const D = baseD({});
  const opened = [];
  const ctx = makeCtx(D, makeStatefulDom(), { openModal: (id) => opened.push(id) });
  ctx.DanaTitipanPoolUI.openSetSaldoAwal();
  assert.deepEqual(opened, ['titipanPoolModal']);
  assert.equal(ctx.DanaTitipanPoolUI._mode, 'opening_balance');
});

test('B1. OK: pool 10jt, commitment 9.5jt -> Belum Dialokasikan 500rb, sesuai §13.2', () => {
  const D = baseD({
    titipanPool: [{ id: 'p1', amount: 10000000, date: '', notes: '', type: 'opening_balance', createdAt: 1 }],
    titipanCommitments: [{ ownerId: 'a', ownerName: 'A', principalAmount: 9500000 }],
  });
  const ctx = makeCtx(D, makeStatefulDom());
  ctx.DanaTitipanPortfolioPresenter.renderInto('sum');
  const html = ctx.document.getElementById('sum').innerHTML;
  assert.match(html, /💰 Dana Titipan Masuk[\s\S]*?Rp 10000000/);
  assert.match(html, /👥 Sudah Dialokasikan[\s\S]*?Rp 9500000/);
  assert.match(html, /🟢 Belum Dialokasikan[\s\S]*?Rp 500000/);
  assert.doesNotMatch(html, /🔴/);
});

test('B2. OK: multiple deposit (opening_balance + 2 deposit) terjumlah benar (skenario H, sisi UI)', () => {
  const D = baseD({
    titipanPool: [
      { id: 'p1', amount: 5000000, date: '', notes: '', type: 'opening_balance', createdAt: 1 },
      { id: 'p2', amount: 3000000, date: '', notes: '', type: 'deposit', createdAt: 2 },
      { id: 'p3', amount: 2000000, date: '', notes: '', type: 'deposit', createdAt: 3 },
    ],
    titipanCommitments: [{ ownerId: 'a', ownerName: 'A', principalAmount: 1000000 }],
  });
  const ctx = makeCtx(D, makeStatefulDom());
  ctx.DanaTitipanPortfolioPresenter.renderInto('sum');
  const html = ctx.document.getElementById('sum').innerHTML;
  assert.match(html, /Rp 10000000/); // 5+3+2 jt
});

test('B3. OK: tombol "+ Tambah Deposit" muncul, klik -> buka modal sungguhan (Sesi 4 Bagian 2, superseded dari stub Bagian 1; detail lengkap di tests/session04b-dana-titipan-pool-ui-modal.test.js)', () => {
  const D = baseD({
    titipanPool: [{ id: 'p1', amount: 10000000, date: '', notes: '', type: 'opening_balance', createdAt: 1 }],
    titipanCommitments: [],
  });
  const opened = [];
  const ctx = makeCtx(D, makeStatefulDom(), { openModal: (id) => opened.push(id) });
  ctx.DanaTitipanPortfolioPresenter.renderInto('sum');
  const html = ctx.document.getElementById('sum').innerHTML;
  assert.match(html, /data-action="DanaTitipanPoolUI\.openTambahDeposit"/);
  assert.match(html, /\+ Tambah Deposit/);
  ctx.DanaTitipanPoolUI.openTambahDeposit();
  assert.deepEqual(opened, ['titipanPoolModal']);
  assert.equal(ctx.DanaTitipanPoolUI._mode, 'deposit');
});

test('C1. OVER_ALLOCATED: pool 9jt, commitment 9.5jt -> §13.3 persis, Belum Dialokasikan Rp0 (bukan minus)', () => {
  const D = baseD({
    titipanPool: [{ id: 'p1', amount: 9000000, date: '', notes: '', type: 'opening_balance', createdAt: 1 }],
    titipanCommitments: [{ ownerId: 'a', ownerName: 'A', principalAmount: 9500000 }],
  });
  const ctx = makeCtx(D, makeStatefulDom());
  ctx.DanaTitipanPortfolioPresenter.renderInto('sum');
  const html = ctx.document.getElementById('sum').innerHTML;
  assert.match(html, /💰 Dana Titipan Masuk[\s\S]*?Rp 9000000/);
  assert.match(html, /👥 Sudah Dialokasikan[\s\S]*?Rp 9500000/);
  assert.match(html, /🔴 Alokasi melebihi pool[\s\S]*?Rp 500000/);
  assert.match(html, /Belum Dialokasikan[\s\S]*?Rp 0/);
  assert.doesNotMatch(html, /Rp -/); // M: tidak ada angka negatif
  assert.doesNotMatch(html, /🟢/);
});

test('C2. OVER_ALLOCATED: delete pool entry sampai commitment > pool -> status berubah otomatis (skenario G, sisi UI, 0 logic tambahan)', () => {
  const D = baseD({
    titipanPool: [
      { id: 'p1', amount: 6000000, date: '', notes: '', type: 'opening_balance', createdAt: 1 },
      { id: 'p2', amount: 3500000, date: '', notes: '', type: 'deposit', createdAt: 2 },
    ],
    titipanCommitments: [{ ownerId: 'a', ownerName: 'A', principalAmount: 9500000 }],
  });
  const ctx = makeCtx(D, makeStatefulDom());
  ctx.DanaTitipanPortfolioPresenter.renderInto('sum');
  assert.match(ctx.document.getElementById('sum').innerHTML, /🟢 Belum Dialokasikan/); // 9.5jt <= 9.5jt -> OK (pas-pasan, strict > di guard, bukan disini tapi status() pakai > juga)
  ctx.DanaTitipanPoolAPI.deleteEntry('p2'); // pool jadi 6jt < 9.5jt
  ctx.DanaTitipanPortfolioPresenter.renderInto('sum');
  const html2 = ctx.document.getElementById('sum').innerHTML;
  assert.match(html2, /🔴 Alokasi melebihi pool/);
  assert.match(html2, /Rp 3500000/); // 9.5jt - 6jt
});

test('D1. "Sudah Dialokasikan" tetap benar utk owner yang commit pokok tapi 0 holding investasi/aset (build() sudah union sejak Sesi 485c)', () => {
  // Owner "C" punya commitment tapi 0 holding investasi/aset sama sekali.
  // Diverifikasi: build() (Sesi 485c) TETAP memasukkan owner ini ke
  // projection.owners (allocatedPrincipal=0, holdings=[]) supaya
  // principalAmountTotal konsisten dgn MASTER_HANDOFF §6 (SUM SEMUA
  // titipanCommitments, independen holding) — makanya _poolSummaryHtml()
  // aman reuse projection.totals.principalAmountTotal apa adanya, 0 hitung
  // ulang terpisah.
  const D = baseD({
    titipanPool: [{ id: 'p1', amount: 20000000, date: '', notes: '', type: 'opening_balance', createdAt: 1 }],
    titipanCommitments: [{ ownerId: 'c', ownerName: 'C', principalAmount: 5000000 }],
  });
  const ctx = makeCtx(D, makeStatefulDom());
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(projection.owners.length, 1); // owner C tetap muncul (union 485c)
  assert.equal(projection.totals.principalAmountTotal, 5000000);
  ctx.DanaTitipanPortfolioPresenter.renderInto('sum');
  const html = ctx.document.getElementById('sum').innerHTML;
  assert.match(html, /👥 Sudah Dialokasikan[\s\S]*?Rp 5000000/);
});

test('E1. Container belum ada di halaman (getElementById null) -> aman diam-diam, tidak throw (pola existing)', () => {
  const D = baseD({});
  const ctx = makeCtx(D, { getElementById: () => null });
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioPresenter.renderInto('tidak-ada'));
});

test('E2. _poolSummaryHtml() balikin string kosong kalau DanaTitipanPoolAPI tidak ter-load (guard defensif)', () => {
  const D = baseD({});
  const dom = makeStatefulDom();
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D, document: dom, uid: () => 'u1', save: () => {}, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['DanaTitipanPortfolioPresenter'],
  );
  assert.equal(ctx.DanaTitipanPortfolioPresenter._poolSummaryHtml(), '');
});
