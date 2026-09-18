const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-catalog-write-sot.js'),'utf8');

test('SOT-3C write gate resolves identity before creating',()=>{
  assert.match(src,/catalogPartId\|\|input\.catalogId/);
  assert.match(src,/oemCode/);
  assert.match(src,/barcode/);
  assert.match(src,/aftermarketCode/);
  assert.match(src,/partName\|\|input\.name/);
  assert.match(src,/VehicleCatalog\.create/);
});

test('SOT-3C prevents ambiguous name guessing',()=>{
  assert.match(src,/if\(hits\.length===1\)return hits\[0\]/);
  assert.match(src,/compatibleVehicleIds/);
  assert.match(src,/_vcwsInflight/);
});

test('VehicleCatalog persists canonical subcategory',()=>{
  const cat=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-catalog.js'),'utf8');
  assert.match(cat,/subcategory: \(typeof data\.subcategory === 'string'/);
  assert.match(cat,/Subkategori maksimal 80 karakter/);
});

test('stock and finance manual part creation use the write gate',()=>{
  const ui=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis-ui.js'),'utf8');
  const tx=fs.readFileSync(path.join(root,'modules/finance/tx-stok-sparepart.js'),'utf8');
  assert.match(ui,/VehicleCatalogWriteSOT\.ensurePart/);
  assert.match(tx,/VehicleCatalogWriteSOT\.ensurePart/);
  assert.doesNotMatch(ui,/VehicleCatalog\.create\(\{partName:name,category/);
  assert.doesNotMatch(tx,/VehicleCatalog\.create\(\{partName:name,category/);
});

test('write gate loads before its consumers',()=>{
  const build=fs.readFileSync(path.join(root,'scripts/build.js'),'utf8');
  const w=build.indexOf("'modules/vehicle/vehicle-catalog-write-sot.js'");
  const c=build.indexOf("'modules/vehicle/vehicle-part-sot.js'");
  const ui=build.indexOf("'modules/vehicle/sparepart-servis-ui.js'");
  assert.ok(w>=0&&c>=0&&ui>=0&&w<c&&w<ui);
});
