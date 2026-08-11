'use strict';
// tests/tagihan-kalender-negative-amt-guard-s403.test.js — cakupan
// BUG-FIN-002 lanjutan: _saveBillInner() (modules/finance/tagihan-kalender.js)
// dulu cuma guard `!rawAmt` (nangkap 0/NaN, TIDAK negatif -- angka negatif
// truthy di JS), beda dari saveBillHistoryEdit() di file yang sama yang
// sudah benar pakai `jumlah<=0`. Fix: tambah `if(rawAmt<0)` reject eksplisit.
// Pakai fakeDom (pola sama tests/inventory-transfer-chip-ui-s374.test.js) +
// implicit-global assignment (curBillType/billEditId/billEditFromArchive di
// tagihan-kalender.js TIDAK dideklarasikan let/var di file ini -- sloppy-mode
// assignment jadi properti context vm, jadi bisa di-set langsung dari luar).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function fakeDom(overrides) {
  const els = Object.assign(
    {
      billName: { value: 'Listrik' },
      billAmt: { value: '150000' },
      billDue: { value: '2026-09-01' },
      billShared: { checked: false },
      billSharedPct: { value: '50' },
      billFreq: { value: 'bulanan' },
      billCat: { value: 'Tagihan' },
      billSubCat: null,
      billAcc: { value: 'acc1' },
      billNote: { value: '' },
    },
    overrides,
  );
  return { getElementById: (id) => (id in els ? els[id] : null), _els: els };
}

function makeCtx(D, document, toasts) {
  const ctx = loadSource(
    ['modules/finance/tagihan-kalender.js'],
    {
      D,
      document,
      uid: (() => { let n = 8000; return () => ++n; })(),
      sameId: (a, b) => String(a) === String(b),
      toast: (msg) => toasts.push(msg),
      save: () => {},
      closeModal: () => {},
      renderBillList: () => {},
      renderSettings: () => {},
      renderDashboard: () => {},
      checkBills: () => {},
      renderBillHistory: () => {},
      renderBillArchive: () => {},
    },
  );
  ctx.curBillType = 'tagihan';
  ctx.billEditId = null;
  ctx.billEditFromArchive = false;
  return ctx;
}

function baseD() {
  return { bills: [], billsArchive: [], transactions: [], accounts: [{ id: 'acc1' }] };
}

test('_saveBillInner() — rawAmt negatif ditolak, TIDAK tersimpan', () => {
  const D = baseD();
  const toasts = [];
  const ctx = makeCtx(D, fakeDom({ billAmt: { value: '-150000' } }), toasts);
  ctx._saveBillInner();
  assert.equal(D.bills.length, 0, 'bill dgn jumlah negatif tidak boleh tersimpan');
  assert.ok(toasts.some((t) => /negatif/i.test(t)), 'harus ada toast peringatan negatif');
});

test('_saveBillInner() — rawAmt positif tetap tersimpan normal (0 regresi)', () => {
  const D = baseD();
  const toasts = [];
  const ctx = makeCtx(D, fakeDom(), toasts);
  ctx._saveBillInner();
  assert.equal(D.bills.length, 1);
  assert.equal(D.bills[0].amount, 150000);
});
