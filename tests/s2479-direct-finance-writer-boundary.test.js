const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const akun=fs.readFileSync('modules/finance/akun.js','utf8');
const ocr=fs.readFileSync('modules/shared/scan-ocr-b.js','utf8');
test('S2479 saveAcc has rollback boundary around account mutation',()=>{
 assert.match(akun,/function _accountMutationSnapshot\(\)/);
 assert.match(akun,/function _accountPersistOrRollback\(s\)/);
 assert.match(akun,/if\(!_accountPersistOrRollback\(_snap\)\)return false;/);
});
test('S2479 Universal OCR account import blocks stale state and rolls back on persistence failure',()=>{
 assert.match(ocr,/_financeMutationBlockedByStaleState/);
 assert.match(ocr,/const _persisted=save\(\);/);
 assert.match(ocr,/if\(_persisted===false\)\{D\.accounts=_snap;return false;\}/);
});
