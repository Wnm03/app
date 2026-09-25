const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const servis=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
const modals=fs.readFileSync(path.join(root,'modules/shared/modals.js'),'utf8');
const partSot=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-part-sot.js'),'utf8');

test('S1904/S2011: canonical category/component input is represented by the checklist, not a second visible selector surface',()=>{
  assert.match(modals,/id=\\"servisChecklistPanel\\"/);
  assert.match(modals,/id=\\"servisLegacyInputSelectors\\" class=\\"u-dnone\\"/);
  assert.match(servis,/renderServiceMasterCategoryChips\(\);/);
  assert.match(servis,/toggleServiceChecklistMasterCategory/);
  assert.match(servis,/renderServiceChecklist\(\);/);
  assert.match(servis,/setEditCanonicalSelection/);
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

test('S1974 history is evidence-only; canonical context remains available in Detail/Reminder',()=>{
  const start=servis.indexOf('renderEditHistoryTab(){');
  const end=servis.indexOf('createHistoryAuditPackage(){',start);
  const history=servis.slice(start,end);
  assert.doesNotMatch(history,/renderEditCanonicalSelectors/);
  assert.doesNotMatch(history,/Reminder aktif/);
  assert.match(servis,/renderEditReminderTab\(\)/);
  assert.match(servis,/renderEditCanonicalSelectors\(panel,reminderSelection,\{disabled:true,prefix:'servisReminderSot'\}\)/);
  assert.match(servis,/Part Katalog \(SOT\)/);
});

test('S1904 canonical selection resolver prefers serviceComponentId and its group',()=>{
  assert.match(servis,/if\(component&&typeof ServiceInputCatalog/);
  assert.match(servis,/if\(hit&&hit\.group\)master=hit\.group\.masterCategoryId;/);
  assert.match(servis,/ServiceInputCatalog\.infer\(log\.item\|\|''\)/);
});
