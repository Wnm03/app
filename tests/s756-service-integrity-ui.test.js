const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

test('S756 live service tab keeps integrity-card hook guarded',()=>{
 const src=fs.readFileSync(path.join(root,'modules/shared/modules-render-b.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(src,/if\(typeof renderServiceIntegrityCard===['"]function['"]\)_cnProfile\('carnotes\.render\.serviceIntegrity',renderServiceIntegrityCard/);
 assert.match(src,/getElementById\('serviceIntegrityCard'\)/);
 assert.match(html,/id="serviceIntegrityCard"/);
});
