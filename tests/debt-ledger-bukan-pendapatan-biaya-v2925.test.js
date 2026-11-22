'use strict';
/** A2 poin 3 (v2925): transaksi kategori Piutang/Utang (beri/terima pinjaman + pelunasan) tidak masuk pendapatan/biaya pribadi. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('modules/finance/akun.js', 'utf8');
const grab = (n) => { const m = src.match(new RegExp('function ' + n + '\\([^\\n]*\\n')); assert.ok(m, n); return m[0]; };
function ctx(D) {
  const c = { D, sameId: (a, b) => String(a) === String(b), isAliranKlien: () => false, isTxDeductionNonSelfSafe: () => false };
  vm.createContext(c);
  vm.runInContext(grab('isAliranKlienSafe'), c);
  return c;
}
test('Piutang/Utang (income & expense) dianggap bukan aliran pribadi; kategori lain tidak terpengaruh', () => {
  const c = ctx({ accounts: [{ id: 'a1', ownership: 'SELF' }] });
  for (const cat of ['Piutang', 'Utang', ' utang ', 'PIUTANG'])
    for (const type of ['income', 'expense']) assert.equal(c.isAliranKlienSafe({ type, category: cat, accountId: 'a1', amount: 1 }), true, cat + type);
  for (const cat of ['Gaji', 'Makan', 'Utang Dagang', 'Lainnya', ''])
    assert.equal(c.isAliranKlienSafe({ type: 'expense', category: cat, accountId: 'a1', amount: 1 }), false, cat);
});
test('Sumber: filter dipasang di isAliranKlienSafe & saldo akun tidak memakainya', () => {
  assert.match(src, /\^\(piutang\|utang\)\$/);
  const calc = fs.readFileSync('modules/finance/akun.js', 'utf8');
  assert.doesNotMatch(calc.slice(calc.indexOf('function saldoPribadiSafe'), calc.indexOf('function saldoPribadiSafe') + 200), /isAliranKlienSafe/);
});
