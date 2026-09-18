const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function load(){const a=fs.readFileSync('modules/vehicle/vehicle-model-registry-sot.js','utf8');const b=fs.readFileSync('modules/vehicle/vehicle-model-resolver-sot.js','utf8');const sandbox={window:{},console,DatabaseAPI:{vehicle:{modelGetAll:()=>[{id:'vario-125',name:'Honda Vario 125 (KZR)',matchNames:['vario 125'],manufacturerId:'honda'}]}}};vm.createContext(sandbox);vm.runInContext(a+'\n'+b,sandbox);return sandbox.window.VehicleModelResolverSOT;}
const api=load();
test('parses year and engine cc from registration text',()=>{const r=api.resolve({name:'Honda Vario 125 KZR 2014 125cc'});assert.equal(r.status,'resolved');assert.equal(r.year,2014);assert.equal(r.engineCc,125);assert.equal(r.model.id,'vario-125');});
test('explicit variant is preserved, never invented',()=>{const r=api.resolve({name:'Honda Vario 125 2014',variant:'CBS'});assert.equal(r.variant,'CBS');});
test('year outside known model range is blocked',()=>{const r=api.resolve({name:'Honda Vario 125 2018'});assert.equal(r.status,'year-conflict');assert.equal(r.model.id,'vario-125');});
test('unknown model remains unknown',()=>{const r=api.resolve({name:'Daihatsu Xenia 2018'});assert.equal(r.status,'unknown');assert.equal(r.year,2018);});
test('apply writes deterministic identity fields',()=>{const v={id:'v1',name:'Honda Vario 125 KZR 2014 125cc'};api.apply(v,api.resolve(v));assert.equal(v.modelId,'vario-125');assert.equal(v.modelYear,2014);assert.equal(v.modelEngineCc,125);});
