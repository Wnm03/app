const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const servis=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
const sot=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-part-sot.js'),'utf8');
const reminder=fs.readFileSync(path.join(root,'modules/vehicle/servis-b.js'),'utf8');

test('S1905 part mapping is ID-first and never guesses by name',()=>{
  assert.match(servis,/resolveServiceSOT\(log,opts\)/);
  assert.match(servis,/Part identity is ID-first/);
  assert.match(servis,/Never infer a catalog part from a similar name/);
  assert.match(servis,/resolveServiceSOTPartCandidates\(items,vehicleId,serviceComponentId\)/);
  assert.match(servis,/serviceComponentIds/);
  assert.match(servis,/componentIds/);
});

test('S1905 VehiclePartSOT remains the physical-part projection',()=>{
  assert.match(sot,/enhanceServiceCatalogSelect:vpsEnhanceServiceCatalogSelect/);
  assert.match(sot,/vpsItemsForCurrentVehicle/);
  assert.match(sot,/VehicleCatalog\.getAll\(\)/);
});

test('S1906 unified service resolver returns one category/component identity',()=>{
  assert.match(servis,/resolveServiceSOT\(log,opts\)/);
  assert.match(servis,/masterCategoryId:selection\.masterCategoryId\|\|null/);
  assert.match(servis,/serviceComponentId:selection\.serviceComponentId\|\|null/);
  assert.match(servis,/componentName:selection\.component&&selection\.component\.name/);
});

test('S1907 legacy data is read through canonical resolver without destructive migration',()=>{
  assert.match(servis,/const selection=Servis\.resolveCanonicalServiceSelection\(row\);/);
  assert.match(servis,/const row=log\|\|\{\};/);
  assert.doesNotMatch(servis,/resolveServiceSOT\([^)]*\)\s*\{[^}]*save\(/s);
});

test('S1908 integrity gate detects category/component and catalog scope drift',()=>{
  assert.match(servis,/validateServiceSOTIntegrity\(log,opts\)/);
  assert.match(servis,/master-category-component-mismatch/);
  assert.match(servis,/catalog-part-missing/);
  assert.match(servis,/catalog-part-out-of-scope/);
});

test('S1908 reminder/history continue to use canonical service component filters',()=>{
  assert.match(reminder,/r\.cat\.serviceComponentId/);
  assert.match(reminder,/Servis\.openHistoryFromReminder/);
  assert.match(servis,/activeServiceComponentFilter=componentId\|\|null/);
});
