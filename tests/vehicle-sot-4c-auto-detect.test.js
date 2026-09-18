const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function load(){const code=fs.readFileSync('modules/vehicle/vehicle-model-registry-sot.js','utf8');const sandbox={window:{},console,DatabaseAPI:{vehicle:{modelGetAll:()=>[]}}};vm.createContext(sandbox);vm.runInContext(code,sandbox);return sandbox.window.VehicleModelRegistrySOT;}
const api=load();
test('detects Daihatsu pickup type without inventing model',()=>{const r=api.inferMeta({name:'Daihatsu Grand Max Pickup'});assert.equal(r.manufacturer.id,'daihatsu');assert.equal(r.vehicleType,'mobil');assert.equal(r.bodyType,'pickup');});
test('detects Daihatsu Xenia as MPV without model SOT',()=>{const r=api.inferMeta({name:'Daihatsu Xenia'});assert.equal(r.manufacturer.id,'daihatsu');assert.equal(r.vehicleType,'mobil');assert.equal(r.bodyType,'mpv');});
test('detects generic matic as motor but does not assign a model',()=>{const r=api.inferMeta({name:'Motor Matic'});assert.equal(r.vehicleType,'motor');assert.equal(r.bodyType,'matic');assert.equal(r.manufacturer,null);});
test('ambiguous type hints do not invent a body type',()=>{const r=api.inferMeta({name:'Toyota Honda'});assert.equal(r.vehicleType,null);assert.equal(r.bodyType,null);});
