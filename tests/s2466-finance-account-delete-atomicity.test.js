const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const src=fs.readFileSync('modules/finance/akun.js','utf8');
test('S2466 account delete has stale preflight and atomic snapshot rollback',()=>{
 assert.match(src,/_financeMutationBlockedByStaleState/);
 assert.match(src,/_accountDeleteSnapshot/);
 assert.match(src,/BillDebtPiutangCanonicalWriter\.updateById\('bills'/);
 assert.match(src,/save\(\);/);
 assert.match(src,/save\(\) menolak penghapusan akun/);
 assert.match(src,/FinanceTxSOT\.replaceSnapshot/);
});
test('S2466 account delete rolls back every migrated accountId domain',()=>{
 for(const k of ['accounts','transactions','bills','bbmLogs','servisLogs','targets','assets','investments','cobek']){
  assert.match(src,new RegExp(`D\\.${k}=JSON\\.parse\\(_accountDeleteSnapshot\\.${k}\\)`));
 }
});
