'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const servis=fs.readFileSync('modules/vehicle/servis.js','utf8');
const reminder=fs.readFileSync('modules/vehicle/servis-b.js','utf8');

test('S2055 reminder action opens the canonical Servis form instead of direct legacy completion',()=>{
  assert.match(servis,/openReminderServiceForm\(catId,actionType,conditionResult=null\)/);
  assert.match(servis,/Servis\.openModal\(null,componentName\)/);
  assert.match(servis,/Servis\.renderServiceInputSelectors\(masterCategoryId\|\|'',serviceComponentId\|\|'',actionType\|\|'ganti'\)/);
  assert.match(servis,/return Servis\.openReminderServiceForm\(catId,choices\[idx\]\.value,conditionResult\)/);
  assert.doesNotMatch(servis,/return Servis\.markServiced\(catId,choices\[idx\]\.value,\{conditionResult\}\)/);
});

test('S2055 canonical category/component names are derived from ServiceInputCatalog',()=>{
  assert.match(reminder,/canonicalComponentName=componentMeta&&componentMeta\.item\?componentMeta\.item\.name/);
  assert.match(reminder,/canonicalCategoryName=componentMeta&&componentMeta\.group\?componentMeta\.group\.group/);
  assert.match(reminder,/canonicalMasterCategoryId=componentMeta&&componentMeta\.group\?componentMeta\.group\.masterCategoryId/);
  assert.match(reminder,/canonicalCategoryName\|\|'Kategori Servis'\).*canonicalComponentName/);
});

test('S2055 reminder form seeds exactly one canonical checklist component',()=>{
  assert.match(servis,/ServisChecklist\._checked\[serviceComponentId\]=actionType/);
  assert.match(servis,/ServisChecklist\.findItemById\(serviceComponentId\)/);
  assert.match(servis,/ServisChecklist\.renderServiceChecklist|Servis\.renderServiceChecklist/);
});
