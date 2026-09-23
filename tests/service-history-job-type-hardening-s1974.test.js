const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../modules/vehicle/service-history-bulk-identity-editor.js'),'utf8');

test('S1974+: bulk jenis pekerjaan menunggu persistence dan mencatat audit perubahan',()=>{
 assert.match(src,/async commitHistoryJobTypeEditor\(\)/);
 assert.match(src,/await Promise\.resolve\(save\(/);
 assert.match(src,/history-job-type-editor-s1974/);
 assert.match(src,/editHistory/);
});

test('S1974+: bulk jenis pekerjaan memiliki rollback dan validasi kendaraan',()=>{
 assert.match(src,/const vehicles=new Set\(logs\.map/);
 assert.match(src,/vehicles\.size>1/);
 assert.match(src,/logs\.forEach\(\(log,i\)=>Object\.assign\(log,before\[i\]\)\)/);
});

test('S1974+: clearing jenis pekerjaan tidak menyentuh kategori/komponen SOT',()=>{
 assert.match(src,/log\.serviceJobType=null;log\.serviceJobLabel=null;log\.serviceJobEvidence=null/);
 assert.doesNotMatch(src,/log\.masterCategoryId=null/);
 assert.doesNotMatch(src,/log\.serviceComponentId=null/);
});
