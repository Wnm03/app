'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

function loadMigrations(D){
  const ctx={D,SCHEMA_VERSION:11,uid:()=>`uid_${Date.now()}_${Math.random()}`,console};
  vm.createContext(ctx);
  const src=fs.readFileSync(path.join(__dirname,'../modules/shared/features-helpers-global-security.js'),'utf8');
  const start=src.indexOf('const SCHEMA_VERSION = 11;');
  const end=src.indexOf('// isDevMode()');
  const chunk=src.slice(start,end)+";this.DATA_MIGRATIONS=DATA_MIGRATIONS;this.runDataMigrations=runDataMigrations;";
  vm.runInContext(chunk,ctx);
  return ctx;
}

function reconciler(){
  const src=fs.readFileSync(path.join(__dirname,'../modules/finance/bill-debt-piutang-reconciler.js'),'utf8');
  const ctx={console};
  vm.createContext(ctx);
  vm.runInContext(src+';this.R=BillDebtPiutangReconciler;',ctx);
  return ctx.R;
}

test('S2194: clean legacy state remains reconciliation-clean after migrations',()=>{
  const D={schemaVersion:4,bills:[{id:101,kind:'utang',debtId:'d1'}],billsArchive:[],debts:[{id:'d1',billId:101}],piutang:[],transactions:[{id:'tx1',billLinkId:'101'}]};
  loadMigrations(D).runDataMigrations(4);
  const r=reconciler().reconcile(D);
  assert.equal(r.ok,true,JSON.stringify(r.issues));
  assert.equal(D.transactions[0].billLinkId,'101');
  assert.equal(D.schemaVersion,11);
});

test('S2194: migration cleanup removes only truly dangling billLinkId and final reconciliation stays clean',()=>{
  const D={schemaVersion:4,bills:[{id:101}],billsArchive:[{id:'202'}],debts:[],piutang:[],transactions:[
    {id:'tx1',billLinkId:'101'},
    {id:'tx2',billLinkId:202},
    {id:'tx3',billLinkId:'999'}
  ]};
  loadMigrations(D).runDataMigrations(4);
  const r=reconciler().reconcile(D);
  assert.equal(r.ok,true,JSON.stringify(r.issues));
  assert.equal(D.transactions[0].billLinkId,'101');
  assert.equal(D.transactions[1].billLinkId,202);
  assert.equal('billLinkId' in D.transactions[2],false);
});

test('S2194: post-migration reconciliation detects duplicate Bill identity instead of silently accepting it',()=>{
  const D={schemaVersion:4,bills:[{id:'b1'},{id:'b1'}],billsArchive:[],debts:[],piutang:[],transactions:[]};
  loadMigrations(D).runDataMigrations(4);
  const r=reconciler().reconcile(D);
  assert.equal(r.ok,false);
  assert.ok(r.issues.some(x=>x.code==='DUPLICATE_ID'&&x.key==='bills'));
});

test('S2194: post-migration reconciliation detects reciprocal Bill/Debt mismatch',()=>{
  const D={schemaVersion:4,bills:[{id:'b1',kind:'utang',debtId:'d1'}],billsArchive:[],debts:[{id:'d1',billId:'other'}],piutang:[],transactions:[]};
  loadMigrations(D).runDataMigrations(4);
  const r=reconciler().reconcile(D);
  assert.equal(r.ok,false);
  assert.ok(r.issues.some(x=>x.code==='BILL_DEBT_REVERSE_MISMATCH'));
});
