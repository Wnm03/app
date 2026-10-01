const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const {loadSource}=require('./helpers/loadSource');

function load(D){
  return loadSource(['modules/finance/bill-debt-piutang-reconciler.js'],{D},['BillDebtPiutangReconciler']);
}

test('S2191 restore reconciliation accepts a complete reciprocal Bill/Debt snapshot',()=>{
  const D={transactions:[{id:'tx1'}],bills:[{id:'b1',kind:'utang',debtId:'d1'}],billsArchive:[],debts:[{id:'d1',billId:'b1',autoTxId:'tx1'}],piutang:[]};
  const r=load(D).BillDebtPiutangReconciler.reconcile(D);
  assert.equal(r.ok,true);
  assert.equal(r.issues.length,0);
});

test('S2191 restore reconciliation rejects orphan reciprocal state before persistence',()=>{
  const D={transactions:[],bills:[{id:'b1',kind:'utang',debtId:'missing'}],billsArchive:[],debts:[],piutang:[]};
  const r=load(D).BillDebtPiutangReconciler.reconcile(D);
  assert.equal(r.ok,false);
  assert.ok(r.issues.some(x=>x.code==='BILL_DEBT_ORPHAN'));
});

test('S2191 restore path runs Bill/Debt/Piutang reconciliation before save flush',()=>{
  const src=fs.readFileSync('modules/shared/backup-restore.js','utf8');
  const reconcileAt=src.indexOf("__s2013SetStage('bill-debt-piutang-reconciliation')");
  const persistAt=src.indexOf("__s2013SetStage('atomic-restore-persist')",reconcileAt);
  assert.ok(reconcileAt>=0);
  assert.ok(persistAt>reconcileAt);
});

test('S2191 restore rollback remains after reconciliation guard',()=>{
  const src=fs.readFileSync('modules/shared/backup-restore.js','utf8');
  const guardAt=src.indexOf("__s2013SetStage('bill-debt-piutang-reconciliation')");
  const rollbackAt=src.indexOf('D=prevD;',guardAt);
  assert.ok(guardAt>=0);
  assert.ok(rollbackAt>guardAt);
});
