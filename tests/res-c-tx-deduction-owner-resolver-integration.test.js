'use strict';
// tests/res-c-tx-deduction-owner-resolver-integration.test.js — Sesi Res-C
// (DESIGN-LOCK-LINKED-ASSET-ACCOUNT-OWNER-DEFAULT.md §4). Verifikasi
// updateTxDeductionOwnerVisibility() (transaksi.js) SEKARANG bersumber dari
// resolveOwnerDefaultForAccount() (Sesi Res-B), bukan lagi getAccOwnersRaw()
// langsung -- load SOURCE ASLI (akun.js + transaksi.js + ownership/multi-
// owner engine), bukan stub, supaya integrasi lintas-sesi (Res-B -> Res-C)
// benar-benar diverifikasi.

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
    ['updateTxDeductionOwnerVisibility', 'TxDeductionOwner', 'setAccOwners'],
  );
}

function baseDoc(accId) {
  const { doc, els } = makeFakeDoc({ txAcc: accId, txDeductionOwnerWrap: '', txDeductionOwner: '', txDeductionOwnerStatus: '' });
  els.txDeductionOwnerWrap = { style: {} };
  els.txDeductionOwnerStatus = { style: {}, innerHTML: '' };
  return { doc, els };
}

test('Res-C [1/6]: akun tanpa aset tertaut & tanpa owners[] apa pun -> field disembunyikan (0 regresi, identik S575 [1/6])', () => {
  const D = { accounts: [{ id: 'acc-none', name: 'Dompet' }], assets: [] };
  const { doc, els } = baseDoc('acc-none');
  const ctx = makeCtx({ document: doc, D });
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwnerWrap.style.display, 'none');
  assert.equal(els.txDeductionOwner.value, '');
  assert.equal(els.txDeductionOwnerStatus.style.display, 'none');
});

test('Res-C [2/6]: akun tanpa owners[] TAPI ada aset tertaut dengan a.owners[] 1 baris eksplisit -> field tampil, auto-select, source:asset (0 needsConfirm)', () => {
  const D = {
    accounts: [{ id: 'acc1', name: 'Rekening Investasi' }],
    assets: [{ id: 'as1', accountId: 'acc1', owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 100 }] }],
  };
  const { doc, els } = baseDoc('acc1');
  const ctx = makeCtx({ document: doc, D });
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwnerWrap.style.display, 'block');
  // FIX SESI (laporan user 2026-08-15): auto-select dihapus utk akun/aset
  // 1-owner juga -- field ini sekarang murni opsional (lihat s575 [2/6]).
  assert.equal(els.txDeductionOwner.value, '');
  assert.match(els.txDeductionOwner.innerHTML, /Budi/);
  assert.equal(els.txDeductionOwnerStatus.style.display, 'none', 'source:asset tidak pernah needsConfirm');
});

test('Res-C [3/6]: akun tanpa owners[] + aset tertaut dengan a.owners[] 2+ baris -> dropdown tampil, TIDAK auto-select', () => {
  const D = {
    accounts: [{ id: 'acc1', name: 'Rekening Bersama' }],
    assets: [{ id: 'as1', accountId: 'acc1', owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 60 }, { ownerId: 'wisnu', ownerName: 'Wisnu', porsi: 40 }] }],
  };
  const { doc, els } = baseDoc('acc1');
  const ctx = makeCtx({ document: doc, D });
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwnerWrap.style.display, 'block');
  assert.equal(els.txDeductionOwner.value, '', '2+ owner dari aset tetap wajib pilih manual');
  assert.match(els.txDeductionOwner.innerHTML, /Budi/);
  assert.match(els.txDeductionOwner.innerHTML, /Wisnu/);
});

test('Res-C [4/6]: akun tanpa owners[] + aset tertaut TANPA owners eksplisit (cuma ownership legacy) -> fallback ke account.ownership sintesis, needsConfirm:true + status tampil', () => {
  const D = {
    accounts: [{ id: 'acc1', name: 'Tabungan', ownership: 'SELF' }],
    assets: [{ id: 'as1', accountId: 'acc1', ownership: 'SELF' }],
  };
  const { doc, els } = baseDoc('acc1');
  const ctx = makeCtx({ document: doc, D });
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwnerWrap.style.display, 'block');
  assert.equal(els.txDeductionOwnerStatus.style.display, 'block', 'source:account+needsConfirm harus tampilkan status');
  assert.match(els.txDeductionOwnerStatus.innerHTML, /belum dikonfirmasi/i);
  assert.match(els.txDeductionOwnerStatus.innerHTML, /Jadikan permanen/i);
});

test('Res-C [5/6]: akun owners[] raw ada (tanpa aset tertaut) -> perilaku S575 dipertahankan (source:account, needsConfirm:false)', () => {
  const D = {
    accounts: [{ id: 'acc1', name: 'Rekening Bersama', owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 40 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 60 }] }],
    assets: [],
  };
  const { doc, els } = baseDoc('acc1');
  const ctx = makeCtx({ document: doc, D });
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwnerWrap.style.display, 'block');
  assert.equal(els.txDeductionOwner.value, '');
  assert.equal(els.txDeductionOwnerStatus.style.display, 'none');
});

test('Res-C [6/6]: TxDeductionOwner.makePermanent() menulis owners[] sintesis ke akun & status hilang setelahnya', () => {
  const D = {
    accounts: [{ id: 'acc1', name: 'Tabungan', ownership: 'SELF' }],
    assets: [],
  };
  const { doc, els } = baseDoc('acc1');
  const ctx = makeCtx({ document: doc, D });
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwnerStatus.style.display, 'block');
  ctx.TxDeductionOwner.makePermanent('acc1');
  assert.ok(Array.isArray(D.accounts[0].owners) && D.accounts[0].owners.length === 1, 'owners[] harus tertulis permanen ke akun');
  assert.equal(els.txDeductionOwnerStatus.style.display, 'none', 'status harus hilang setelah dipermanenkan (needsConfirm jadi false)');
});
