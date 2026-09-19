const {test}=require('node:test');
const fs=require('fs');
const assert=require('assert');
const path=require('path');
const root=path.join(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('S1857: save() accepts scoped finance mutation options',()=>{
  const s=read('modules/shared/features-helpers-global-security.js');
  assert.match(s,/function save\(opts\)/);
  assert.match(s,/_saveFinanceMutation=opts\.financeMutation!==false/);
  assert.match(s,/TitipanSync\.reconcileAccounts\(\{accountIds:_saveAccountIds\}\)/);
  assert.match(s,/syncLinkedAssetNilaiFromAkun\(\{accountIds:_saveAccountIds\}\)/);
});

test('S1857: Servis save/mark/delete use targeted finance scope',()=>{
  const s=read('modules/vehicle/servis.js');
  assert.match(s,/save\(\{domain:'servis',financeMutation:!!_postCommitFinanceEvent/);
  assert.match(s,/save\(\{domain:'servis',financeMutation:!!entry\.txLinkId,accountIds:entry\.txLinkId\?\[entry\.accountId\]:\[\]\}\)/);
  assert.match(s,/save\(\{domain:'servis',financeMutation:!!deletedTxId,accountIds:_deletedAccountId\?/);
});

test('S1857: Servis rollback no longer serializes entire domain arrays',()=>{
  const s=read('modules/vehicle/servis.js');
  assert.doesNotMatch(s,/servisLogs:Array\.isArray\(D\.servisLogs\)\?JSON\.stringify\(D\.servisLogs\):null/);
  assert.doesNotMatch(s,/transactions:Array\.isArray\(D\.transactions\)\?JSON\.stringify\(D\.transactions\):null/);
  assert.match(s,/_markStockBefore/);
  assert.match(s,/batchStockBefore/);
});

test('S1857: Car Notes mutation refresh is scoped to active service UI',()=>{
  const h=read('modules/shared/features-helpers-global-security.js');
  assert.match(h,/function refreshCarNotesAfterMutation\(opts\)/);
  assert.match(h,/if\(tab==='servis'\)/);
  assert.match(h,/renderServiceIntegrityCard/);
  assert.match(h,/renderServisList/);
  const s=read('modules/vehicle/servis.js');
  assert.match(s,/refreshCarNotesAfterMutation\(\{stock:/);
});
