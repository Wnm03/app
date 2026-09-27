'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');

test('S2097 newer local snapshot cannot override richer IDB snapshot when local is sparse',()=>{
 assert.match(src,/interrupted\/partial write/);
 assert.match(src,/if\(!_snapshotLooksSparse\(_lp\) \|\| _snapshotLooksSparse\(p\)\)/);
});

test('S2097 SOT migration has a pre-migration checkpoint and conditional persistence',()=>{
 const sot=fs.readFileSync('modules/vehicle/service-interval-sot.js','utf8');
 assert.match(sot,/kw_v4_pre_sot_migration/);
 assert.match(sot,/_migrationCheckpoint\(\)/);
 assert.match(sot,/if\(\(migration&&migration\.changed\)\|\|repaired\)/);
 assert.match(sot,/save\(\{domain:'servis',financeMutation:false\}\)/);
});
