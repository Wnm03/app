'use strict';
// tests/s575-tx-deduction-owner-visibility.test.js — S575: revisi syarat
// tampil "Pemilik Sumber Potongan" di Transaksi.
//
// Sebelumnya (S574-C): field tampil hanya kalau owners.length>1
// (isMultiOwner, via getAccOwners()/MultiOwnerEngine.getOwners() yang
// membungkus validateOwners() -- total porsi HARUS 100% atau owners asli
// diganti diam-diam jadi sintesis SELF).
//
// Sekarang (S575): field tampil kalau akun punya owners[] asli dengan
// minimal 1 baris ber-ownerId, dibaca lewat getAccOwnersRaw() (akun.js) --
// TIDAK PERNAH mensyaratkan isMultiOwner (owners.length>1) maupun total
// porsi 100%. 1 owner -> tampil & auto-select. 2+ owner -> tampil dropdown,
// value direset (tidak boleh terbawa dari akun sebelumnya).
//
// Test ini load SOURCE ASLI akun.js (getAccOwnersRaw) + transaksi.js
// (updateTxDeductionOwnerVisibility), bukan stub, supaya integrasi 2 file
// itu benar-benar diverifikasi (bukan cuma kontrak masing-masing).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(initial) {
  const els = {};
  Object.keys(initial).forEach((id) => { els[id] = { value: initial[id], innerHTML: '', style: {} }; });
  return { doc: { getElementById: (id) => els[id] || null }, els };
}

function makeCtx({ document, D }) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js', 'modules/finance/transaksi.js'],
    {
      D,
      document,
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
    },
    ['getAccOwners', 'getAccOwnersRaw', 'updateTxDeductionOwnerVisibility'],
  );
}

test('S575 [1/6]: akun tanpa owners[] sama sekali -> field disembunyikan (0 regresi akun lama)', () => {
  const D = { accounts: [{ id: 'acc-none', name: 'Dompet' }] };
  const { doc, els } = makeFakeDoc({ txAcc: 'acc-none', txDeductionOwnerWrap: '', txDeductionOwner: '' });
  els.txDeductionOwnerWrap = { style: {} };
  const ctx = makeCtx({ document: doc, D });
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwnerWrap.style.display, 'none');
  assert.equal(els.txDeductionOwner.value, '');
});

test('S575 [2/6]: akun dengan owners[] TEPAT 1 baris -> field TETAP tampil, auto-select (bukan isMultiOwner)', () => {
  const D = { accounts: [{ id: 'acc-one', name: 'Tabungan', owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 100 }] }] };
  const { doc, els } = makeFakeDoc({ txAcc: 'acc-one', txDeductionOwnerWrap: '', txDeductionOwner: '' });
  els.txDeductionOwnerWrap = { style: {} };
  const ctx = makeCtx({ document: doc, D });
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwnerWrap.style.display, 'block', 'wrap harus tampil walau cuma 1 owner');
  assert.equal(els.txDeductionOwner.value, 'o1', '1 owner harus otomatis terpilih');
  assert.match(els.txDeductionOwner.innerHTML, /Budi/);
});

test('S575 [3/6]: akun dengan owners[] 2+ baris -> dropdown tampil, value TIDAK auto-select (tetap harus pilih manual)', () => {
  const D = { accounts: [{ id: 'acc-multi', name: 'Rekening Bersama', owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 40 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 60 }] }] };
  const { doc, els } = makeFakeDoc({ txAcc: 'acc-multi', txDeductionOwnerWrap: '', txDeductionOwner: '' });
  els.txDeductionOwnerWrap = { style: {} };
  const ctx = makeCtx({ document: doc, D });
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwnerWrap.style.display, 'block');
  assert.equal(els.txDeductionOwner.value, '', '2+ owner tetap wajib pilih manual');
  assert.match(els.txDeductionOwner.innerHTML, /Budi/);
  assert.match(els.txDeductionOwner.innerHTML, /Ani/);
});

test('S575 [4/6]: owners[] 1 baris TOTAL PORSI BUKAN 100% -> field TETAP tampil (larangan eksplisit: total 100% bukan syarat)', () => {
  const D = { accounts: [{ id: 'acc-partial', name: 'Kas Renov', owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 30 }] }] };
  const { doc, els } = makeFakeDoc({ txAcc: 'acc-partial', txDeductionOwnerWrap: '', txDeductionOwner: '' });
  els.txDeductionOwnerWrap = { style: {} };
  const ctx = makeCtx({ document: doc, D });
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwnerWrap.style.display, 'block', 'total porsi != 100% tidak boleh menyembunyikan field');
  assert.equal(els.txDeductionOwner.value, 'o1');
});

test('S575 [5/6]: owners[] 2 baris TOTAL PORSI BUKAN 100% -> dropdown tetap tampil dgn kedua opsi (bukan fallback sintesis SELF)', () => {
  const D = { accounts: [{ id: 'acc-partial2', name: 'Kas Renov 2', owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 20 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 20 }] }] };
  const { doc, els } = makeFakeDoc({ txAcc: 'acc-partial2', txDeductionOwnerWrap: '', txDeductionOwner: '' });
  els.txDeductionOwnerWrap = { style: {} };
  const ctx = makeCtx({ document: doc, D });
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwnerWrap.style.display, 'block');
  assert.doesNotMatch(els.txDeductionOwner.innerHTML, /SELF|Milik Sendiri/, 'tidak boleh jatuh ke owner sintetis SELF');
  assert.match(els.txDeductionOwner.innerHTML, /Budi/);
  assert.match(els.txDeductionOwner.innerHTML, /Ani/);
});

test('S575 [6/6]: pindah akun 1-owner (A) -> akun 2-owner (B) -> pilihan owner A tidak terbawa ke B', () => {
  const D = {
    accounts: [
      { id: 'acc-a', name: 'A', owners: [{ ownerId: 'oa', ownerName: 'Eka', porsi: 100 }] },
      { id: 'acc-b', name: 'B', owners: [{ ownerId: 'ob1', ownerName: 'Fani', porsi: 50 }, { ownerId: 'ob2', ownerName: 'Gita', porsi: 50 }] },
    ],
  };
  const { doc, els } = makeFakeDoc({ txAcc: 'acc-a', txDeductionOwnerWrap: '', txDeductionOwner: '' });
  els.txDeductionOwnerWrap = { style: {} };
  const ctx = makeCtx({ document: doc, D });
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwner.value, 'oa');
  els.txAcc.value = 'acc-b';
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwner.value, '', 'pindah ke akun B (2 owner) tidak boleh mewarisi pilihan owner A');
  assert.doesNotMatch(els.txDeductionOwner.innerHTML, /Eka/, 'opsi harus murni owners akun B');
});
