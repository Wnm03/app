const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const src=fs.readFileSync('modules/shared/backup-restore.js','utf8');

test('S2464 import dedup rejects existing and intra-batch transaction ID collisions',()=>{
 assert.match(src,/const existingIds=new Set\(existingRows\.map\(t=>t&&t\.id\)/);
 assert.match(src,/existingIds\.has\(sid\)\|\|acceptedIds\.has\(sid\)/);
});

test('S2464 Finance import uses SOT with stale preflight and rollback on save rejection',()=>{
 assert.match(src,/typeof _financeMutationBlockedByStaleState==='function'/);
 assert.match(src,/_restoreCashewTaxonomySnapshot\(\);\s*return;/);
 assert.match(src,/FinanceTxSOT\.createMany\(imported\)/);
 assert.match(src,/const _importSaveOk=save\(\);/);
 assert.match(src,/_importSaveOk===false/);
 assert.match(src,/FinanceTxSOT\.replaceSnapshot\(_importTxSnapshot\)/);
});
