const { test } = require('node:test');
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const atomicSrc = fs.readFileSync('modules/finance/finance-cross-entity-atomic.js', 'utf8');
const txSotSrc = fs.readFileSync('modules/finance/finance-tx-sot.js', 'utf8');

function browserLikeCtx() {
  const c = { console };
  vm.createContext(c);
  vm.runInContext(`let D = {
    transactions: [{id:'t1', amount:100}],
    bills: [{id:'b1', amount:100}],
    billsArchive: [],
    debts: [{id:'d1', nilai:100}],
    piutang: []
  };`, c);
  assert.strictEqual(c.D, undefined, 'fixture harus meniru top-level let D: bukan globalThis.D');
  vm.runInContext(atomicSrc, c);
  vm.runInContext(txSotSrc, c);
  return c;
}

test('FinanceTxSOT memakai top-level lexical D walau globalThis.D undefined', () => {
  const c = browserLikeCtx();
  c.FinanceTxSOT.create({id:'t2', amount:50});
  assert.strictEqual(vm.runInContext('D.transactions.length', c), 2);
});

test('FinanceCrossEntityAtomic memakai top-level lexical D walau globalThis.D undefined', () => {
  const c = browserLikeCtx();
  c.FinanceCrossEntityAtomic.run(() => {
    c.FinanceTxSOT.create({id:'t2', amount:50});
    vm.runInContext('D.debts[0].nilai = 50', c);
    vm.runInContext('D.piutang.push({id:"p1",nilai:50})', c);
  });
  assert.strictEqual(vm.runInContext('D.transactions.length', c), 2);
  assert.strictEqual(vm.runInContext('D.debts[0].nilai', c), 50);
  assert.strictEqual(vm.runInContext('D.piutang.length', c), 1);
});

test('FinanceCrossEntityAtomic rollback tetap bekerja pada lexical D', () => {
  const c = browserLikeCtx();
  const before = vm.runInContext('JSON.stringify(D)', c);
  assert.throws(() => c.FinanceCrossEntityAtomic.run(() => {
    c.FinanceTxSOT.create({id:'x'});
    vm.runInContext('D.debts[0].nilai = 1', c);
    throw new Error('simulated');
  }), /simulated/);
  assert.strictEqual(vm.runInContext('JSON.stringify(D)', c), before);
});

console.log('S2305 lexical-D Finance boundary tests PASS');
