'use strict';
// tests/fuel-jenis-unknown-edit-legacy.test.js — Lanjutan Sesi s753 (fuel-ref
// wiring): FuelPriceRef.selectUnknown() (modules/vehicle/fuel-price-ref.js).
//
// Latar: saat mengedit catatan BBM lama (dari sebelum fitur "Jenis BBM" ada,
// b.jenis/linkedBbm.jenis undefined), FuelPriceRef.populateSelect() yang
// dipanggil lebih dulu (BBM.openModal di car-notes.js / editTx di
// transaksi.js) selalu mengisi dropdown dengan default D.fuelPriceRef.lastType
// (fallback 'pertalite') -- tanpa placeholder "belum diketahui". Kalau user
// langsung Simpan tanpa mengubah dropdown, catatan lama yang aslinya TIDAK
// diketahui jenisnya diam-diam ketiban jenis default itu.
//
// Fix: selectUnknown(selectId) dipanggil SESUDAH populateSelect() di kedua
// titik edit (car-notes.js BBM.openModal, transaksi.js editTx) saat
// b.jenis/linkedBbm.jenis falsy -- menambah 1 opsi placeholder value="" &
// memilihnya, murni UI. Guard opts.jenis!=='' di recordBbmLog() (sudah ada
// sejak s753 wiring) menjamin value kosong ini TIDAK pernah menimpa apa pun
// saat disimpan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// Mock <select> minimal: cukup untuk innerHTML (diabaikan), value, dan
// operasi yang dipakai selectUnknown() (querySelector/insertBefore).
function makeSelect() {
  const options = [];
  return {
    _options: options,
    innerHTML: '',
    value: '',
    get firstChild() { return options[0] || null; },
    querySelector(sel) {
      const m = /option\[value="([^"]*)"\]/.exec(sel);
      if (!m) return null;
      return options.find((o) => o.value === m[1]) || null;
    },
    insertBefore(newNode) {
      options.unshift(newNode);
      return newNode;
    },
  };
}

function makeDoc(predefined) {
  return {
    getElementById: (id) => (id in predefined ? predefined[id] : undefined),
    createElement: (tag) => ({ tagName: tag, value: '', textContent: '' }),
  };
}

function makeCtx({ document }) {
  return loadSource(['modules/vehicle/fuel-price-ref.js'], { document }, ['FuelPriceRef']);
}

test('selectUnknown(): elemen tidak ada -> tidak throw, no-op', () => {
  const ctx = makeCtx({ document: makeDoc({}) });
  assert.doesNotThrow(() => ctx.FuelPriceRef.selectUnknown('tidakAda'));
});

test('selectUnknown(): tambah 1 opsi placeholder value="" & pilih opsi itu', () => {
  const sel = makeSelect();
  const ctx = makeCtx({ document: makeDoc({ jenisBbmSelect: sel }) });
  ctx.FuelPriceRef.selectUnknown('jenisBbmSelect');
  assert.equal(sel.value, '');
  assert.equal(sel._options.length, 1);
  assert.equal(sel._options[0].value, '');
  assert.match(sel._options[0].textContent, /Belum Diketahui/i);
});

test('selectUnknown(): dipanggil 2x -- tidak menambah opsi placeholder dobel (idempotent)', () => {
  const sel = makeSelect();
  const ctx = makeCtx({ document: makeDoc({ jenisBbmSelect: sel }) });
  ctx.FuelPriceRef.selectUnknown('jenisBbmSelect');
  ctx.FuelPriceRef.selectUnknown('jenisBbmSelect');
  assert.equal(sel._options.length, 1);
  assert.equal(sel.value, '');
});

test('selectUnknown(): dipanggil setelah dropdown sudah punya value lain -- value direset ke kosong', () => {
  const sel = makeSelect();
  sel.value = 'pertalite';
  const ctx = makeCtx({ document: makeDoc({ jenisBbmSelect: sel }) });
  ctx.FuelPriceRef.selectUnknown('jenisBbmSelect');
  assert.equal(sel.value, '');
});

// recordBbmLog() guard (tx-bbm.js, sudah ada sejak s753) -- konfirmasi ulang
// value kosong dari selectUnknown() tidak pernah menimpa jenis tersimpan.
function loadTxBbm(D) {
  let n = 1000;
  const uid = () => String(n++);
  return loadSource(['modules/finance/tx-bbm.js'], { D, uid });
}

test('recordBbmLog(): jenis kosong ("" dari selectUnknown) tidak menimpa jenis lama yang sudah tersimpan', () => {
  const D = { bbmLogs: [{ id: 'b1', jenis: 'pertamax' }] };
  const ctx = loadTxBbm(D);
  ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-01-01', km: 100, liter: 2, harga: 10000, cost: 20000, jenis: '', existingBbmId: 'b1' });
  assert.equal(D.bbmLogs[0].jenis, 'pertamax');
});
