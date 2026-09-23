const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const servis=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
const modals=fs.readFileSync(path.join(root,'modules/shared/modals.js'),'utf8');
const partSot=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-part-sot.js'),'utf8');

test('S1904 detail exposes canonical service category/component dropdowns',()=>{
  assert.match(modals,/id=\\"servisCategory\\" data-onchange=\\"Servis\.onServiceCategoryChange\\"/);
  assert.match(modals,/id=\\"servisComponent\\" data-onchange=\\"Servis\.onServiceComponentChange\\"/);
  assert.match(modals,/Kategori Servis .*SOT/);
  assert.match(modals,/Komponen Servis .*SOT/);
  assert.match(modals,/id=\\"servisLegacyInputSelectors\\" class=\\"u-dnone\\"/);
  assert.match(modals,/id=\\"servisCategorySot\\" data-onchange=\\"Servis.onServiceCategorySotChange\\"/);
  assert.match(modals,/id=\\"servisComponentSot\\" data-onchange=\\"Servis.onServiceComponentSotChange\\"/);
});

test('S1904 category/component changes drive the same checklist SOT state',()=>{
  assert.match(servis,/Servis\._serviceChecklistMasterCategoryIds=master\?\[master\]:\[\];/);
  assert.match(servis,/Servis\.setEditCanonicalSelection\(master,''\)/);
  assert.match(servis,/Servis\.renderServiceChecklist\(\);/);
  assert.match(servis,/ServiceInputCatalog\.onComponentChange\(compEl,catEl,itemEl\)/);
  assert.match(servis,/Servis\.setEditCanonicalSelection\(master,component\);/);
});

test('S1904 catalog part picker is delegated to VehiclePartSOT',()=>{
  assert.match(servis,/VehiclePartSOT\.enhanceServiceCatalogSelect/);
  assert.match(partSot,/enhanceServiceCatalogSelect:vpsEnhanceServiceCatalogSelect/);
  assert.match(partSot,/vpsItemsForCurrentVehicle/);
});

test('S1904 history/reminder tabs expose canonical category/component context',()=>{
  assert.match(servis,/renderEditCanonicalSelectors\(panel,Servis\.resolveCanonicalServiceSelection\(current\),\{disabled:true,prefix:'servisHistorySot'\}\)/);
  assert.match(servis,/renderEditCanonicalSelectors\(panel,reminderSelection,\{disabled:true,prefix:'servisReminderSot'\}\)/);
  assert.match(servis,/Part Katalog \(SOT\)/);
});

test('S1904 canonical selection resolver prefers serviceComponentId and its group',()=>{
  assert.match(servis,/if\(component&&typeof ServiceInputCatalog/);
  assert.match(servis,/if\(hit&&hit\.group\)master=hit\.group\.masterCategoryId;/);
  assert.match(servis,/ServiceInputCatalog\.infer\(log\.item\|\|''\)/);
});
