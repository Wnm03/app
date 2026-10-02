'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const persistence=fs.readFileSync(path.join(root,'modules/shared/features-helpers-global-security.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'modules/shared/app-init-runtime.js'),'utf8');

test('S2320: failed startup persistence enters recovery protection instead of accepting empty state',()=>{
 assert.match(persistence,/__kwPersistenceRecoveryRequired=true/);
 assert.match(persistence,/state kosong TIDAK menimpa data lama/);
 assert.match(persistence,/localStorage\.getItem\('kw_setup'\)\|\|localStorage\.getItem\('kw_pin'\)/);
});

test('S2320: save and saveFlush are blocked while persistence recovery is required',()=>{
 assert.match(persistence,/__kwPersistenceRecoveryRequired===true[\s\S]{0,700}return false;/);
 assert.match(persistence,/function saveFlush\(\)[\s\S]{0,500}__kwPersistenceRecoveryRequired===true[\s\S]{0,500}return _blockSaveFlushOnRecovery\(\);/);
});

test('S2320: runtime boot stops before showMain when persistence recovery is required',()=>{
 assert.match(runtime,/await load\(\);[\s\S]{0,400}__kwPersistenceRecoveryRequired===true[\s\S]{0,300}return;/);
});
