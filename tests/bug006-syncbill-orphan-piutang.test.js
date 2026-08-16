'use strict';
// tests/bug006-syncbill-orphan-piutang.test.js — Regression test utk BUG-006
// (audit 2026-08, docs/BUG_REGISTRY.md / TODO.md): Debt.syncBill(d) menghapus
// tagihan auto (D.bills) saat !shouldHaveBill (utang jadi lunas ATAU
// cicilanBulanan dinolkan) TANPA lebih dulu membersihkan piutang auto
// "Ditanggung Bersama" (D.piutang dgn autoBillId menunjuk ke tagihan tsb) --
// piutang jadi orphan permanen, tetap kehitung di Kekayaan Bersih walau
// sumbernya (tagihan) sudah tidak ada. Pola gap yg SAMA PERSIS dgn yg sudah
// diperbaiki lebih dulu utk delBill()/delBillArchive() (tagihan-kalender.js),
// lewat removeOrphanedAutoPiutangForBill() (piutang-utang.js) -- fix ini
// REUSE fungsi yang sama di syncBill(), dipanggil SEBELUM bill difilter keluar.
//
// Test ini load fungsi ASLI lewat brace-counting manual (pola sama
// tests/shared-bill-auto-piutang.test.js / tests/s303-utang-custom-pay-
// amount.test.js) supaya bisa suntik `D` tiruan.

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

// Debt.syncBill(d) adalah method dalam object literal `const Debt={...}` --
// extract body method-nya lewat marker `syncBill(d){` + brace-counting, lalu
// bungkus jadi fungsi standalone `syncBill(d)` di sandbox (semantik identik,
// method ini tidak pakai `this`).
function extractSyncBill() {
  const marker = 'syncBill(d){';
  const start = SRC.indexOf(marker);
  if (start === -1) throw new Error('"syncBill(d){" tidak ditemukan');
  const braceOpen = start + marker.length - 1;
  let depth = 1;
  let i = braceOpen + 1;
  while (i < SRC.length && depth > 0) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') depth--;
    i++;
  }
  const body = SRC.slice(braceOpen, i);
  return `function syncBill(d)${body}`;
}

function loadSandbox(D) {
  let uidCounter = 8000;
  const context = {
    console,
    Math,
    Date,
    D,
    uid: () => 'bill' + (++uidCounter),
    sameId: (a, b) => a === b,
  };
  vm.createContext(context);
  const snippet = `${extractFnSource('removeOrphanedAutoPiutangForBill')}
${extractSyncBill()}
this.syncBill = syncBill;
this.removeOrphanedAutoPiutangForBill = removeOrphanedAutoPiutangForBill;`;
  vm.runInContext(snippet, context, { filename: 'syncbill-extract.js' });
  return context;
}

function makeD() {
  return {
    bills: [{
      id: 'b1', name: 'Cicilan: Bank X', amount: 500000, nextDue: '2099-01-01',
      freq: 'bulanan', category: 'Utang', subcategory: '', accountId: 'acc1',
      note: '', kind: 'utang', debtId: 'd1',
    }],
    piutang: [
      // auto piutang, terkait bill b1 (harus ikut dibersihkan)
      { id: 'p1', name: 'Ditanggung Bersama', nominal: 250000, lunas: false, autoBillId: 'b1', autoTxId: 'tx1' },
      // piutang manual, TIDAK terkait bill apapun (tidak boleh ikut terhapus)
      { id: 'p2', name: 'Pinjaman ke Budi', nominal: 100000, lunas: false },
    ],
    debts: [{ id: 'd1', name: 'Bank X', nilai: 5000000, cicilanBulanan: 500000, lunas: false, billId: 'b1' }],
  };
}

test('Debt.syncBill() — utang jadi Lunas -> bill terhapus DAN auto-piutang terkait ikut dibersihkan, piutang manual tetap ada', () => {
  const D = makeD();
  const ctx = loadSandbox(D);
  const d = D.debts[0];
  d.lunas = true; // trigger !shouldHaveBill
  ctx.syncBill(d);

  assert.equal(D.bills.length, 0, 'bill auto harus terhapus');
  assert.equal(d.billId, null);
  assert.equal(D.piutang.length, 1, 'hanya 1 piutang tersisa (yang manual)');
  assert.equal(D.piutang[0].id, 'p2', 'piutang manual (tidak terkait bill) tidak boleh ikut terhapus');
  assert.ok(!D.piutang.some(p => p.id === 'p1'), 'auto-piutang orphan (autoBillId=b1) harus sudah dibersihkan');
});

test('Debt.syncBill() — cicilanBulanan dinolkan -> hasil sama: bill hilang, auto-piutang ikut dibersihkan', () => {
  const D = makeD();
  const ctx = loadSandbox(D);
  const d = D.debts[0];
  d.cicilanBulanan = 0; // trigger !shouldHaveBill lewat jalur cicilan, bukan lunas
  ctx.syncBill(d);

  assert.equal(D.bills.length, 0);
  assert.equal(D.piutang.length, 1);
  assert.equal(D.piutang[0].id, 'p2');
});

test('Debt.syncBill() — tidak ada piutang auto terkait sama sekali -> tetap aman, piutang manual utuh', () => {
  const D = makeD();
  D.piutang = [{ id: 'p2', name: 'Pinjaman ke Budi', nominal: 100000, lunas: false }];
  const ctx = loadSandbox(D);
  const d = D.debts[0];
  d.lunas = true;
  ctx.syncBill(d);

  assert.equal(D.bills.length, 0);
  assert.equal(D.piutang.length, 1);
  assert.equal(D.piutang[0].id, 'p2');
});

test('Debt.syncBill() — shouldHaveBill tetap true (belum lunas, cicilan>0) -> bill TIDAK dihapus, piutang tidak tersentuh', () => {
  const D = makeD();
  const ctx = loadSandbox(D);
  const d = D.debts[0]; // lunas:false, cicilanBulanan:500000 -> shouldHaveBill true
  ctx.syncBill(d);

  assert.equal(D.bills.length, 1, 'bill masih ada karena utang masih aktif');
  assert.equal(D.piutang.length, 2, 'piutang tidak tersentuh sama sekali di jalur ini');
});
