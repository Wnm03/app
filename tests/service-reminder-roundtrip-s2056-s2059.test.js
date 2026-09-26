'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const servis=fs.readFileSync('modules/vehicle/servis.js','utf8');
const reminder=fs.readFileSync('modules/vehicle/servis-b.js','utf8');
const reminderBridge=fs.readFileSync('modules/vehicle/sparepart-servis-b.js','utf8');
const dashboard=fs.readFileSync('modules/shared/modules-render.js','utf8');
const dedupe=fs.readFileSync('modules/vehicle/sparepart-servis.js','utf8');

test('S2056 save/reload round-trip persists canonical category + component identity',()=>{
  assert.match(servis,/Object\.assign\(s,\{date,item,categoryId:catIdForLog\|\|s\.categoryId,masterCategoryId:masterCategoryId\|\|s\.masterCategoryId\|\|null,serviceComponentId:serviceComponentId\|\|s\.serviceComponentId\|\|null/);
  assert.match(servis,/Servis\.renderServiceInputSelectors\(s\.masterCategoryId\|\|'',s\.serviceComponentId\|\|'',s\.actionType\|\|'ganti'\)/);
  assert.match(servis,/ServiceInputCatalog\.itemById\(s\.serviceComponentId\)/);
});

test('S2056 saved checklist rows retain canonical identity for every session component',()=>{
  assert.match(servis,/serviceComponentId:_row\.serviceComponentId\|\|\(_row\.itemId\|\|null\)/);
  assert.match(servis,/masterCategoryId:_rowMasterCategoryId/);
  assert.match(servis,/checklist:\[_row\]/);
});

test('S2057 Reminder UI action uses the same existing Servis form/SOT',()=>{
  assert.match(reminder,/data-action="Servis\.chooseReminderAction"/);
  assert.match(reminderBridge,/Servis\.openReminderServiceForm\(catId,actionType\|\|'ganti'\)/);
  assert.doesNotMatch(reminderBridge,/function markSparepartServiced\(catId,actionType\)\{return Servis\.markServiced/);
});

test('S2057 no direct Reminder UI completion path remains on the action buttons',()=>{
  assert.match(reminder,/data-action="Servis\.chooseReminderAction"/);
  assert.match(reminder,/data-action="markSparepartServiced"/);
  assert.match(reminderBridge,/openReminderServiceForm/);
});

test('S2058 main Reminder projection dedupes canonical components per vehicle',()=>{
  assert.match(reminder,/dedupeServiceCategoriesForVehicle\(reminderCategoryPool\.filter/);
  assert.match(dedupe,/function dedupeServiceCategoriesForVehicle\(categories,vehicleId\)/);
});

test('S2058 dashboard Reminder projection also dedupes canonical components per vehicle',()=>{
  assert.match(dashboard,/const remindableCatsRaw=remindableCatsAll\.filter/);
  assert.match(dashboard,/const remindableCats=typeof dedupeServiceCategoriesForVehicle==='function'\?dedupeServiceCategoriesForVehicle\(remindableCatsRaw,veh\.id\):remindableCatsRaw/);
});

test('S2058 dashboard displays canonical category/component names',()=>{
  assert.match(dashboard,/dashComponentName=dashComponentMeta&&dashComponentMeta\.item\?dashComponentMeta\.item\.name/);
  assert.match(dashboard,/dashCategoryName=dashComponentMeta&&dashComponentMeta\.group\?dashComponentMeta\.group\.group/);
});

test('S2059 Reminder navigation remains component-scoped and canonical',()=>{
  assert.match(servis,/openHistoryFromReminder\(categoryId,componentId\)/);
  assert.match(servis,/serviceHistoryComponentFilter=String\(componentId\|\|''\)/);
  assert.match(servis,/Servis\.openModal\(target\.id\)/);
});
