const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const src=fs.readFileSync('modules/shared/backup-restore.js','utf8');

test('S2465 Cashew import snapshots account/category taxonomy before mutation',()=>{
 assert.match(src,/_cashewTaxonomySnapshot=\(curImportType==='cashew'/);
 assert.match(src,/accounts:Array\.isArray\(D\.accounts\)\?D\.accounts\.map/);
 assert.match(src,/categories:D\.categories\?JSON\.parse\(JSON\.stringify\(D\.categories\)\):null/);
});

test('S2465 taxonomy rolls back on dedupe-to-zero, cancel, and stale-state rejection',()=>{
 assert.match(src,/_restoreCashewTaxonomySnapshot\(\);\s*document\.getElementById\('importResult'\)/);
 assert.match(src,/if\(!confirmed\)\{\s*_restoreCashewTaxonomySnapshot\(\);/);
 assert.match(src,/if\(typeof _financeMutationBlockedByStaleState==='function'&&_financeMutationBlockedByStaleState\(\)\)\{\s*_restoreCashewTaxonomySnapshot\(\);/);
});

test('S2465 persistence failure restores both transactions and taxonomy',()=>{
 const catchBlock=src.slice(src.indexOf('}catch(_importErr){'));
 assert.match(catchBlock,/_importTxSnapshot/);
 assert.match(catchBlock,/_restoreCashewTaxonomySnapshot\(\);/);
});
