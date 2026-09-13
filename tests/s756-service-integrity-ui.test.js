const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

test('S756 renders integrity card and invokes checker on service tab',()=>{
 const src=fs.readFileSync(path.join(root,'modules/modules-render.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(src,/function renderServiceIntegrityCard\(\)/);
 assert.match(src,/ServiceIntegrityReconciler\.reconcile/);
 assert.match(src,/renderServiceIntegrityCard\(\);renderServisList\(\);/);
 assert.match(html,/id="serviceIntegrityCard"/);
});
