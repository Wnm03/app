'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('S2710 normalizes legacy part aliases before canonical component matching',()=>{
 const src=fs.readFileSync(path.join(root,'modules/vehicle/service-category-sot-reconciliation-s2007.js'),'utf8');
 assert.match(src,/function componentAlias/);
 assert.match(src,/normalized-alias/);
 assert.ok(src.includes("'legacy:'+str(c.vehicleId||vehicleId)+'::'+alias"));
});
test('S2710 sparepart fallback aliases brands/specs and dedupes unknown names per vehicle',()=>{
 const src=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis.js'),'utf8');
 assert.match(src,/function _spNormalizeComponentAlias/);
 assert.ok(src.includes('const alias=_spNormalizeComponentAlias(c.name)'));
 assert.ok(src.includes("String(c.vehicleId||vehicleId||'')+'::'"));
});
