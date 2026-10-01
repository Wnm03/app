const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const atomicSrc=fs.readFileSync('modules/finance/finance-cross-entity-atomic.js','utf8');
const sotSrc=fs.readFileSync('modules/finance/finance-tx-sot.js','utf8');
function ctx(){const c={console,globalThis:null};c.globalThis=c;c.D={transactions:[{id:'t1',amount:100}],bills:[{id:'b1',amount:100}],billsArchive:[],debts:[{id:'d1',nilai:100}],piutang:[]};vm.runInNewContext(atomicSrc,c);vm.runInNewContext(sotSrc,c);return c;}
function test(name,fn){try{fn();console.log('PASS',name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}

test('rollback restores all cross-entity collections after mid-commit failure',()=>{
 const c=ctx(); const before=JSON.stringify(c.D);
 assert.throws(()=>c.FinanceCrossEntityAtomic.run(()=>{
   c.FinanceTxSOT.create({id:'t2',amount:50});
   c.D.debts[0].nilai=50;
   c.D.piutang.push({id:'p1',nilai:50});
   throw new Error('simulated failure after transaction+debt+piutang mutation');
 }));
 assert.strictEqual(JSON.stringify(c.D),before);
});

test('successful commit keeps transaction and linked debt/piutang mutations',()=>{
 const c=ctx();
 c.FinanceCrossEntityAtomic.run(()=>{
   c.FinanceTxSOT.create({id:'t2',amount:50});
   c.D.debts[0].nilai=50;
   c.D.piutang.push({id:'p1',nilai:50});
 });
 assert.strictEqual(c.D.transactions.length,2);
 assert.strictEqual(c.D.debts[0].nilai,50);
 assert.strictEqual(c.D.piutang.length,1);
});

test('rollback preserves D object identity and collection identity',()=>{
 const c=ctx(); const d=c.D, tx=c.D.transactions, debt=c.D.debts;
 assert.throws(()=>c.FinanceCrossEntityAtomic.run(()=>{c.FinanceTxSOT.create({id:'x'});c.D.debts[0].nilai=1;throw Error('x');}));
 assert.strictEqual(c.D,d); assert.strictEqual(c.D.transactions,tx); assert.strictEqual(c.D.debts,debt);
 assert.strictEqual(JSON.stringify(c.D.transactions),JSON.stringify([{id:'t1',amount:100}]));
 assert.strictEqual(JSON.stringify(c.D.debts),JSON.stringify([{id:'d1',nilai:100}]));
});

const tagihan=fs.readFileSync('modules/finance/tagihan-kalender.js','utf8');
test('bill payment mutation uses atomic boundary and FinanceTxSOT',()=>{
 assert.ok(tagihan.includes("FinanceCrossEntityAtomic.begin(['transactions','bills','billsArchive','debts','piutang'])"));
 assert.ok(tagihan.includes('FinanceTxSOT.create({id:_payTxId'));
 assert.ok(tagihan.includes("console.error('S2196: atomic bill payment rollback'"));
});
console.log('S2196 tests complete');
