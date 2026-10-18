'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function load(){
 return loadSource(['modules/vehicle/servis-checklist.js','modules/vehicle/service-input-catalog.js','car-notes.js'],{D:{sparepartCats:[]}},['SERVICE_CHECKLIST_GROUPS','ServiceInputCatalog','SERVICE_MAINTENANCE_RULES','validateMaintenanceRuleRegistry']);
}
test('S2153: canonical maintenance registry validates without interval, action, or catalog identity defects',()=>{
 const c=load();
 const result=c.validateMaintenanceRuleRegistry(c.SERVICE_MAINTENANCE_RULES,c.SERVICE_CHECKLIST_GROUPS);
 assert.deepEqual(JSON.parse(JSON.stringify(result.invalidInterval)),[]);
 assert.deepEqual(JSON.parse(JSON.stringify(result.duplicateCatalogId)),[]);
 assert.deepEqual(JSON.parse(JSON.stringify(result.invalidAction)),[]);
 assert.deepEqual(JSON.parse(JSON.stringify(result.missingAction)),[]);
 assert.deepEqual(JSON.parse(JSON.stringify(result.invalidSchedule)),[]);
 // Missing registry entries are a separately tracked policy-coverage backlog,
 // not silently classified as malformed intervals or invented defaults.
});
test('S2153: malformed interval values are rejected rather than silently ignored',()=>{
 const c=load(); const base=c.SERVICE_MAINTENANCE_RULES;
 for(const badValue of [0,-1,1.5,NaN,Infinity]){
  const bad={...base,'roller-cvt':{...base['roller-cvt'],inspectKm:badValue}};
  const result=c.validateMaintenanceRuleRegistry(bad,[]);
  assert.equal(result.ok,false,`expected ${String(badValue)} to fail`);
  assert.ok(result.invalidInterval.includes('roller-cvt:inspectKm'));
 }
});
test('S2153: duplicated component identities in catalog are rejected',()=>{
 const c=load();
 const result=c.validateMaintenanceRuleRegistry(c.SERVICE_MAINTENANCE_RULES,[{items:[{id:'roller-cvt'},{id:'roller-cvt'}]}]);
 assert.equal(result.ok,false);
 assert.equal(JSON.stringify(result.duplicateCatalogId),JSON.stringify(['roller-cvt']));
});
