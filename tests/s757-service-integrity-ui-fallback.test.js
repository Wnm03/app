const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

test('S757 live renderer does not call an unavailable integrity card renderer',()=>{
 const src=fs.readFileSync(path.join(root,'modules/shared/modules-render-b.js'),'utf8');
 const idx=src.indexOf("if(typeof renderServiceIntegrityCard==='function')");
 assert.ok(idx>=0,'live renderer must guard the optional integrity renderer');
 assert.match(src.slice(idx,idx+180),/if\(typeof renderServiceIntegrityCard===['"]function['"]\)_cnProfile\('carnotes\.render\.serviceIntegrity',renderServiceIntegrityCard,/);
});
