'use strict';
// tests/session05-dana-titipan-fill-remaining.test.js — SESSION 5 ("ISI
// DARI SISA") — MASTER_HANDOFF_DANA_TITIPAN_POOL_PORSI.md §11 (rules) +
// §13.2 (tombol muncul saat status OK) + §18 skenario J/K + §19
// (acceptance: tombol HANYA muncul saat status OK dan sisa>0).
//
// Target: `DanaTitipanCommitmentUI.open()` (refresh tombol saat modal
// dibuka) + `DanaTitipanCommitmentUI.fillFromRemaining()` (baca ulang
// live saat diklik, §11 rule 2) — keduanya di
// modules/finance/dana-titipan-portfolio-render.js. Dijalankan bareng
// SOURCE ASLI dana-titipan-pool-api.js/aggregation-api.js/commitment-
// return-api.js (Sesi 1-3, TIDAK diubah di sini) lewat loadSource.
//
// TIDAK di-test di sini: modal `titipanCommitmentModal` HTML utuh (§13.4
// modal Set Saldo Awal itu modal LAIN, sudah dites session04b) —
// tombol "Isi dari Sisa" di sini nempel di modal `titipanCommitmentModal`
// (Sesi 485d, existing, TIDAK dibuat ulang), test ini hanya menambah
// coverage utk 2 method baru + 1 elemen HTML baru di modal itu.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeElement(id) {
  return { id, className: '', style: {}, textContent: '', value: '', innerHTML: '' };
}

function makeStatefulDom() {
  const registry = new Map();
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); } };
}

function baseD(overrides) {
  return Object.assign({
    assets: [], investments: [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: [], titipanReturns: [], titipanPool: [],
  }, overrides || {});
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
        escapeHtml: (s) => String(s), fmt: (n) => 'Rp' + Math.round(n || 0), fmtFull: (n) => 'Rp' + Math.round(n || 0),
      },
      extraGlobals || {},
    ),
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPoolAPI', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'DanaTitipanCommitmentUI'],
  );
}

// Owner "existing di holding investasi" -- DanaTitipanCommitmentUI.open()
// mengisi dropdown dari listExistingOwners(), yang bersumber dari
// D.investments porsi kepemilikan (S485a). Investasi minimal 1 biar owner
// "budi" dikenali listExistingOwners().
function investasiD(overrides) {
  return baseD(Object.assign({
    investments: [{ id: 'inv1', name: 'Reksadana X', ownerIds: ['budi'], ownerNames: { budi: 'Budi' }, ownerPercents: { budi: 100 }, value: 1000000 }],
  }, overrides || {}));
}

test('J. Owner baru buka modal, status OK sisa>0 -> tombol "Isi dari Sisa" muncul dgn label sesuai sisa live', () => {
  const D = investasiD({ titipanPool: [{ id: 'p1', amount: 10000000, date: '', notes: '', type: 'opening_balance', createdAt: 1 }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanCommitmentUI.open('budi');
  const btn = dom.getElementById('titipanCommitFillRemainingBtn');
  assert.notEqual(btn.style.display, 'none');
  const label = dom.getElementById('titipanCommitFillRemainingLabel');
  assert.match(label.textContent, /Isi dari Sisa/);
  assert.match(label.textContent, /10000000/);
});

test('J. Klik "Isi dari Sisa" -> field principal terisi sisa, TETAP editable', () => {
  const D = investasiD({ titipanPool: [{ id: 'p1', amount: 10000000, date: '', notes: '', type: 'opening_balance', createdAt: 1 }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanCommitmentUI.open('budi');
  ctx.DanaTitipanCommitmentUI.fillFromRemaining();
  const principalEl = dom.getElementById('titipanCommitPrincipal');
  assert.equal(principalEl.value, 10000000);
  // masih editable -- set manual lagi tidak dilarang apa pun
  principalEl.value = 7000000;
  assert.equal(principalEl.value, 7000000);
});

test('13.1/19. Status NOT_MIGRATED (pool kosong) -> tombol "Isi dari Sisa" TIDAK muncul', () => {
  const D = investasiD({ titipanPool: [] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanCommitmentUI.open('budi');
  const btn = dom.getElementById('titipanCommitFillRemainingBtn');
  assert.equal(btn.style.display, 'none');
});

test('13.3/19. Status OVER_ALLOCATED (sisa=0) -> tombol "Isi dari Sisa" TIDAK muncul', () => {
  const D = investasiD({
    titipanPool: [{ id: 'p1', amount: 5000000, date: '', notes: '', type: 'opening_balance', createdAt: 1 }],
    titipanCommitments: [{ ownerId: 'lain', ownerName: 'Lain', principalAmount: 6000000 }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanCommitmentUI.open('budi');
  const btn = dom.getElementById('titipanCommitFillRemainingBtn');
  assert.equal(btn.style.display, 'none');
});

test('19. Status OK tapi sisa persis 0 (pool == sudah dialokasikan) -> tombol TIDAK muncul', () => {
  const D = investasiD({
    titipanPool: [{ id: 'p1', amount: 6000000, date: '', notes: '', type: 'opening_balance', createdAt: 1 }],
    titipanCommitments: [{ ownerId: 'lain', ownerName: 'Lain', principalAmount: 6000000 }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanCommitmentUI.open('budi');
  const btn = dom.getElementById('titipanCommitFillRemainingBtn');
  assert.equal(btn.style.display, 'none');
});

test('K. Data berubah di antara open() dan klik (sisa jadi 0 stlh owner lain disimpan) -> fillFromRemaining() TIDAK isi angka basi, toast peringatan, tombol auto-refresh sembunyi', () => {
  const D = investasiD({ titipanPool: [{ id: 'p1', amount: 6000000, date: '', notes: '', type: 'opening_balance', createdAt: 1 }] });
  const dom = makeStatefulDom();
  const toasts = [];
  const ctx = makeCtx(D, dom, { toast: (m) => toasts.push(m) });
  ctx.DanaTitipanCommitmentUI.open('budi'); // saat ini sisa = 6jt, tombol muncul
  const btnBefore = dom.getElementById('titipanCommitFillRemainingBtn');
  assert.notEqual(btnBefore.style.display, 'none');
  // Simulasikan perubahan data DI ANTARA modal dibuka & tombol diklik
  // (skenario K): owner lain baru saja disimpan lewat jalur lain,
  // menghabiskan sisa pool -- TANPA memanggil open() lagi (modal ini
  // tidak otomatis tahu, makanya fillFromRemaining() WAJIB baca ulang).
  D.titipanCommitments.push({ ownerId: 'lain', ownerName: 'Lain', principalAmount: 6000000 });
  ctx.DanaTitipanCommitmentUI.fillFromRemaining();
  const principalEl = dom.getElementById('titipanCommitPrincipal');
  assert.notEqual(principalEl.value, 6000000); // TIDAK terisi angka basi (sisa lama)
  assert.ok(toasts.some((m) => m.startsWith('⚠️')));
  assert.equal(dom.getElementById('titipanCommitFillRemainingBtn').style.display, 'none');
});

test('fillFromRemaining() guard: DanaTitipanPoolAPI belum dimuat -> toast peringatan, tidak crash', () => {
  const D = investasiD({});
  const dom = makeStatefulDom();
  const toasts = [];
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    { D, document: dom, uid: () => 'u1', save: () => {}, escapeHtml: (s) => String(s), fmt: (n) => 'Rp' + n, fmtFull: (n) => 'Rp' + n, toast: (m) => toasts.push(m) },
    ['DanaTitipanCommitmentUI'],
  );
  assert.doesNotThrow(() => ctx.DanaTitipanCommitmentUI.fillFromRemaining());
  assert.ok(toasts.some((m) => m.includes('belum siap dimuat')));
});
