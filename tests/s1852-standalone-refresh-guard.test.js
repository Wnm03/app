'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
for(const file of [
 'modules/finance/tagihan-kalender.js',
 'modules/shop/cobek-etalase.js',
 'modules/home/renovasi.js'
]){
 test(`S1852 standalone safety: ${file} guards refreshAfterMutation`,()=>{
   const s=fs.readFileSync(file,'utf8');
   assert.match(s,/if\(typeof refreshAfterMutation===['"]function['"]\)refreshAfterMutation/);
 });
}
// S1857: servis.js no longer calls the generic full Car Notes refresh pipeline;
// scoped mutations are refreshed directly via the guarded refreshCarNotesAfterMutation()
// helper instead (see PATCH-README-S1857-CARNOTES-SAVE-PERFORMANCE.md point 1).
test('S1852/S1857 standalone safety: modules/vehicle/servis.js guards refreshCarNotesAfterMutation',()=>{
 const s=fs.readFileSync('modules/vehicle/servis.js','utf8');
 assert.match(s,/if\(typeof refreshCarNotesAfterMutation===['"]function['"]\)refreshCarNotesAfterMutation/);
});
test('S1852 perf telemetry catch is not an empty catch block',()=>{
 const s=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
 assert.doesNotMatch(s,/catch\(_\)\{\s*\}/);
});
test('S1852 S1851 regression test accepts the normalized category-index fallback',()=>{
 const s=fs.readFileSync('modules/finance/tx-list-cashflow.js','utf8');
 assert.match(s,/const catsByName=renderCtx&&renderCtx\.catsByName\?renderCtx\.catsByName/);
});
