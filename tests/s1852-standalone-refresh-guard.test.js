'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
for(const file of [
 'modules/finance/tagihan-kalender.js',
 'modules/shop/cobek-etalase.js',
 'modules/vehicle/servis.js',
 'modules/home/renovasi.js'
]){
 test(`S1852 standalone safety: ${file} guards refreshAfterMutation`,()=>{
   const s=fs.readFileSync(file,'utf8');
   assert.match(s,/if\(typeof refreshAfterMutation===['"]function['"]\)refreshAfterMutation/);
 });
}
test('S1852 perf telemetry catch is not an empty catch block',()=>{
 const s=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
 assert.doesNotMatch(s,/catch\(_\)\{\s*\}/);
});
test('S1852 S1851 regression test accepts the normalized category-index fallback',()=>{
 const s=fs.readFileSync('modules/finance/tx-list-cashflow.js','utf8');
 assert.match(s,/const catsByName=renderCtx&&renderCtx\.catsByName\?renderCtx\.catsByName/);
});
