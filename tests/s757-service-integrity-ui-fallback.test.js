const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

test('S757 guards integrity UI when checker is unavailable or throws',()=>{
 const src=fs.readFileSync(path.join(root,'modules/modules-render.js'),'utf8');
 assert.match(src,/try\{[\s\S]*ServiceIntegrityReconciler\.reconcile/);
 assert.match(src,/catch\(err\)/);
 assert.match(src,/result=\{ok:null,issues:\[\],unavailable:true\}/);
 assert.match(src,/Pemeriksaan belum tersedia/);
});
