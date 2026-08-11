'use strict';
/**
 * shared-bill-auto-piutang.test.js — Sesi 341: fitur baru "Ditanggung
 * Bersama" pada Tagihan/Langganan (billModal, tagihan-kalender.js) sekarang
 * bisa otomatis mencatat sisa porsi pihak lain sebagai Piutang begitu
 * tagihan tsb dibayar (markBillPaid), lewat helper murni
 * maybeCreateSharedPiutangFromBill(b, txId) (piutang-utang.js).
 *
 * Field baru pada Bill: sharedOtherName (opsional), sharedAutoPiutang
 * (bool, toggle). Field baru pada Piutang entry: autoBillId, autoTxId
 * (audit-trail, tidak dipakai fungsi lain -- 100% additive/backward
 * compatible, bill/piutang LAMA yang tidak punya field ini otomatis
 * di-skip oleh guard di awal fungsi).
 *
 * Test ini load fungsi ASLI lewat brace-counting manual (pola sama
 * tests/dash-card-show-hide.test.js) supaya bisa suntik `D` tiruan &
 * skip pemanggilan render/typeof-guarded (Piutang.renderList dst tidak
 * didefinisikan di sandbox -> otomatis di-skip, sesuai guard di source).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'finance', 'piutang-utang.js'),
  'utf8'
);

function extractFnSource(fnName) {
  const marker = `function ${fnName}(`;
  const start = SRC.indexOf(marker);
  if (start === -1) throw new Error(`"${marker}" tidak ditemukan`);
  const braceOpen = SRC.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < SRC.length && depth > 0) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') depth--;
    i++;
  }
  return SRC.slice(start, i);
}

function loadSandbox(D) {
  let uidCounter = 9000;
  const context = {
    console,
    Math,
    D,
    uid: () => String(++uidCounter),
    todayStr: () => '2026-07-30',
  };
  vm.createContext(context);
  const snippet = `${extractFnSource('maybeCreateSharedPiutangFromBill')}
this.maybeCreateSharedPiutangFromBill = maybeCreateSharedPiutangFromBill;`;
  vm.runInContext(snippet, context, { filename: 'shared-piutang-extract.js' });
  return context;
}

test('maybeCreateSharedPiutangFromBill() — bill tidak shared -> tidak buat piutang', () => {
  const D = { piutang: [] };
  const ctx = loadSandbox(D);
  const b = { id: 'b1', name: 'Listrik', shared: false, sharedAutoPiutang: true, amount: 50000, totalAmount: 100000 };
  ctx.maybeCreateSharedPiutangFromBill(b, 'tx1');
  assert.equal(D.piutang.length, 0);
});

test('maybeCreateSharedPiutangFromBill() — shared tapi sharedAutoPiutang mati -> tidak buat piutang', () => {
  const D = { piutang: [] };
  const ctx = loadSandbox(D);
  const b = { id: 'b1', name: 'STNK Tahunan', shared: true, sharedAutoPiutang: false, amount: 114750, totalAmount: 229500 };
  ctx.maybeCreateSharedPiutangFromBill(b, 'tx1');
  assert.equal(D.piutang.length, 0);
});

test('maybeCreateSharedPiutangFromBill() — bill LAMA tanpa field baru sama sekali (undefined) -> aman, tidak throw, tidak buat piutang', () => {
  const D = { piutang: [] };
  const ctx = loadSandbox(D);
  const b = { id: 'b1', name: 'Wifi', amount: 300000 };
  assert.doesNotThrow(() => ctx.maybeCreateSharedPiutangFromBill(b, 'tx1'));
  assert.equal(D.piutang.length, 0);
});

test('maybeCreateSharedPiutangFromBill() — shared + auto aktif -> buat 1 piutang sebesar (totalAmount - amount), nama dari sharedOtherName', () => {
  const D = { piutang: [] };
  const ctx = loadSandbox(D);
  const b = { id: 'bill-stnk', name: 'STNK Tahunan - Vario 125', shared: true, sharedAutoPiutang: true, sharedOtherName: 'Istri', amount: 114750, totalAmount: 229500 };
  ctx.maybeCreateSharedPiutangFromBill(b, 'tx-abc');
  assert.equal(D.piutang.length, 1);
  const p = D.piutang[0];
  assert.equal(p.nilai, 114750);
  assert.equal(p.name, 'Istri');
  assert.equal(p.lunas, false);
  assert.equal(p.autoBillId, 'bill-stnk');
  assert.equal(p.autoTxId, 'tx-abc');
  assert.equal(p.tanggal, '2026-07-30');
});

test('maybeCreateSharedPiutangFromBill() — sharedOtherName kosong -> fallback nama otomatis dari nama tagihan', () => {
  const D = { piutang: [] };
  const ctx = loadSandbox(D);
  const b = { id: 'b1', name: 'Internet Rumah', shared: true, sharedAutoPiutang: true, sharedOtherName: '', amount: 100000, totalAmount: 200000 };
  ctx.maybeCreateSharedPiutangFromBill(b, 'tx1');
  assert.equal(D.piutang.length, 1);
  assert.match(D.piutang[0].name, /Internet Rumah/);
});

test('maybeCreateSharedPiutangFromBill() — sisa porsi 0 atau negatif (mis. porsi 100%) -> tidak buat piutang', () => {
  const D = { piutang: [] };
  const ctx = loadSandbox(D);
  const b = { id: 'b1', name: 'Netflix', shared: true, sharedAutoPiutang: true, amount: 50000, totalAmount: 50000 };
  ctx.maybeCreateSharedPiutangFromBill(b, 'tx1');
  assert.equal(D.piutang.length, 0);
});

test('maybeCreateSharedPiutangFromBill() — dipanggil berkali-kali (mis. tiap periode cicilan/langganan dibayar) -> tiap panggilan buat entri piutang BARU (bukan digabung/di-update), masing-masing tertaut txId beda', () => {
  const D = { piutang: [] };
  const ctx = loadSandbox(D);
  const b = { id: 'bill-x', name: 'Cicilan Kulkas', shared: true, sharedAutoPiutang: true, amount: 100000, totalAmount: 200000 };
  ctx.maybeCreateSharedPiutangFromBill(b, 'tx-periode-1');
  ctx.maybeCreateSharedPiutangFromBill(b, 'tx-periode-2');
  assert.equal(D.piutang.length, 2);
  assert.equal(D.piutang[0].autoTxId, 'tx-periode-1');
  assert.equal(D.piutang[1].autoTxId, 'tx-periode-2');
});

test('maybeCreateSharedPiutangFromBill() — s286: dipanggil 2x dengan txId SAMA (mis. transaksi cicilan diedit lalu disimpan ulang) -> HANYA buat 1 piutang, panggilan ke-2 di-skip (guard anti-dobel)', () => {
  const D = { piutang: [] };
  const ctx = loadSandbox(D);
  const b = { id: 'bill-edit', name: 'Septictank', shared: true, sharedAutoPiutang: true, amount: 122100, totalAmount: 222000 };
  ctx.maybeCreateSharedPiutangFromBill(b, 'tx-edit-1');
  ctx.maybeCreateSharedPiutangFromBill(b, 'tx-edit-1');
  ctx.maybeCreateSharedPiutangFromBill(b, 'tx-edit-1');
  assert.equal(D.piutang.length, 1);
  assert.equal(D.piutang[0].autoTxId, 'tx-edit-1');
  assert.equal(D.piutang[0].nilai, 99900);
});

test('maybeCreateSharedPiutangFromBill() — D.piutang belum ada (undefined) -> otomatis dibuat, tidak throw', () => {
  const D = {};
  const ctx = loadSandbox(D);
  const b = { id: 'b1', name: 'Tagihan Baru', shared: true, sharedAutoPiutang: true, amount: 40000, totalAmount: 100000 };
  assert.doesNotThrow(() => ctx.maybeCreateSharedPiutangFromBill(b, 'tx1'));
  assert.equal(D.piutang.length, 1);
});
