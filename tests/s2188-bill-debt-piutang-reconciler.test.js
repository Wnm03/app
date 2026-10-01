const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');
const ROOT=path.resolve(__dirname,'..');
function load(D){return loadSource(['modules/finance/bill-debt-piutang-reconciler.js'],{D},['BillDebtPiutangReconciler']);}

test('S2188 clean graph: Bill <-> Debt and auto Piutang/Utang links are consistent',()=>{
  const ctx=load({bills:[{id:'b1',kind:'utang',debtId:'d1'}],billsArchive:[],debts:[{id:'d1',billId:'b1',autoTxId:'t1'}],piutang:[{id:'p1',autoBillId:'b1',autoTxId:'t1'}],transactions:[{id:'t1'}],assets:[],investments:[]});
  const r=ctx.BillDebtPiutangReconciler.reconcile();
  assert.equal(r.ok,true);
  assert.equal(r.issues.length,0);
});

test('S2188 detects orphan and reverse-link mismatch without mutating D',()=>{
  const D={bills:[{id:'b1',kind:'utang',debtId:'missing'}],billsArchive:[],debts:[{id:'d1',billId:'b404',autoTxId:'t404'}],piutang:[{id:'p1',autoBillId:'b404',autoTxId:'t404'}],transactions:[],assets:[],investments:[]};
  const before=JSON.stringify(D);
  const r=load(D).BillDebtPiutangReconciler.reconcile();
  assert.equal(r.ok,false);
  for(const code of ['BILL_DEBT_ORPHAN','DEBT_BILL_ORPHAN','DEBT_AUTO_TX_ORPHAN','PIUTANG_AUTO_BILL_ORPHAN','PIUTANG_AUTO_TX_ORPHAN'])assert.ok(r.issues.some(x=>x.code===code),code);
  assert.equal(JSON.stringify(D),before);
});

test('S2188 detects duplicate IDs and active/archive collision',()=>{
  const ctx=load({bills:[{id:'b1'},{id:'b1'}],billsArchive:[{id:'b1'}],debts:[{id:'d1'},{id:'d1'}],piutang:[],transactions:[],assets:[],investments:[]});
  const r=ctx.BillDebtPiutangReconciler.reconcile();
  assert.ok(r.issues.filter(x=>x.code==='DUPLICATE_ID'&&x.key==='bills').length===1);
  assert.ok(r.issues.some(x=>x.code==='BILL_DUPLICATE_ACTIVE_ARCHIVE'));
  assert.ok(r.issues.some(x=>x.code==='DUPLICATE_ID'&&x.key==='debts'));
});

test('S2188 build order loads reconciler immediately after canonical writer',()=>{
  const build=fs.readFileSync(path.join(ROOT,'scripts/build.js'),'utf8');
  assert.ok(build.indexOf('bill-debt-piutang-canonical-writer.js') < build.indexOf('bill-debt-piutang-reconciler.js'));
});
