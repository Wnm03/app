const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const servis=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');

test('S1967 visible canonical selectors are synchronized whenever the service form opens',()=>{
  assert.match(servis,/ServiceInputCatalog\.populateComponentSelect\(compEl,master,selectedComponentId\|\|''\);[\s\S]*?Servis\.syncVisibleServiceSotSelectors\(\);/);
  assert.match(servis,/renderServiceInputSelectors\(s\.masterCategoryId\|\|'',s\.serviceComponentId\|\|'',s\.actionType\|\|'ganti'\)/);
});

test('S1967 job-type category changes cannot leave visible SOT dropdowns stale',()=>{
  assert.match(servis,/onServiceJobTypeChange\(\)\{[\s\S]*?Servis\.renderServiceChecklist\(\);[\s\S]*?Servis\.syncVisibleServiceSotSelectors\(\);[\s\S]*?\n  \}\n\},/);
});

test('S1967 keeps one canonical identity path for visible and hidden selectors',()=>{
  assert.match(servis,/syncVisibleServiceSotSelectors\(\)[\s\S]*?populateCategorySelect\(cat,hiddenCat\?\.value\|\|''\)/);
  assert.match(servis,/onServiceCategorySotChange\(\)[\s\S]*?hidden\.value=visible\?\.value\|\|'';[\s\S]*?Servis\.onServiceCategoryChange\(\)/);
  assert.match(servis,/onServiceComponentSotChange\(\)[\s\S]*?hidden\.value=visible\?\.value\|\|'';[\s\S]*?Servis\.onServiceComponentChange\(\)/);
});
