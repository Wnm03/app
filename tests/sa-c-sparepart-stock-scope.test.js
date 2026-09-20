const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const servis=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis-ui.js'),'utf8');
const catalogUI=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-catalog-ui.js'),'utf8');
const ocr=fs.readFileSync(path.join(root,'modules/shared/scan-ocr.js'),'utf8');
const txStock=fs.readFileSync(path.join(root,'modules/finance/tx-stok-sparepart.js'),'utf8');

test('SA-C: catalog-linked stock matching is vehicle-scoped',()=>{
  assert.match(servis,/findMatchingStockByCatalogId\(catalogId,vehicleId\)/);
  assert.match(servis,/String\(p\.catalogPartId\|\|p\.catalogId\|\|'\'\)===String\(catalogId\)/);
  assert.match(servis,/Sparepart\.isPartForVehicle\(p,vehicleId\)/);
  assert.match(servis,/findMatchingStockByCatalogId\(catalogPartId,curVehicleId\)\|\|Servis\.findMatchingStockByName\(catalogPartName,curVehicleId\)/);
});

test('SA-C: name fallback is also vehicle-scoped and ambiguous matches are not guessed',()=>{
  assert.match(servis,/findMatchingStockByName\(name,vehicleId\)/);
  assert.match(servis,/const rows=\(D\.partsStock\|\|\[\]\)\.filter\(p=>p&&String\(p\.name\|\|'\'\)\.trim\(\)\.toLowerCase\(\)===n\)/);
  assert.match(servis,/if\(scoped\.length>1\)\{\s*const exact=scoped\.find\(p=>p\.vehicleId&&String\(p\.vehicleId\)===String\(vehicleId\)\);\s*return exact\|\|null;/);
});

test('SA-C: editing stock preserves an existing hidden/private category instead of silently clearing catId',()=>{
  assert.match(ui,/populateStockCatSelect\(selectedId\)/);
  assert.match(ui,/const selectedCat=cur\?\(D\.sparepartCats\|\|\[\]\)\.find\(c=>c&&c\.id===cur\):null;/);
  assert.match(ui,/selectedCat&&!visible\.some\(c=>c\.id===selectedCat\.id\)\?\[selectedCat,\.\.\.visible\]:visible/);
  assert.match(ui,/Sparepart\.populateStockCatSelect\(isEdit&&p\?p\.catId:null\)/);
});

test('SA-C: catalog screen stock badge uses active-vehicle stock, not another vehicle row',()=>{
  assert.match(catalogUI,/const catalogMatches = D\.partsStock\.filter/);
  assert.match(catalogUI,/Sparepart\.isPartForVehicle\(p, vid\)/);
});

test('SA-C: OCR sparepart autocomplete does not select another vehicle stock row',()=>{
  assert.match(ocr,/const vid=\(typeof curVehicleId!=='undefined'\)\?curVehicleId:null;/);
  assert.match(ocr,/Sparepart\.isPartForVehicle\(p,vid\)/);
});

test('SA-C: Finance -> stock catalog bridge reuses the active vehicle row when duplicates exist',()=>{
  assert.match(txStock,/const catalogRows=D\.partsStock\.filter\(p=>p&&String\(p\.catalogPartId\|\|p\.catalogId\|\|'\'\)===String\(catalogItem\.id\)\)/);
  assert.match(txStock,/const catalogVisible=catalogRows\.filter/);
  assert.match(txStock,/catalogVisible\.find\(p=>p\.vehicleId&&String\(p\.vehicleId\)===String\(vidCatalog\)\)\|\|catalogVisible\[0\]\|\|null/);
});
