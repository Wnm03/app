const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function load(){const code=fs.readFileSync('modules/vehicle/vehicle-model-registry-sot.js','utf8');const sandbox={window:{},console,DatabaseAPI:{vehicle:{modelGetAll:()=>[{id:'vario-125',name:'Honda Vario 125 (KZR)',matchNames:['vario 125']},{id:'beat-fi',name:'Honda BeAT FI Gen 1',matchNames:['beat fi','beat-fi']}]}}};vm.createContext(sandbox);vm.runInContext(code,sandbox);return sandbox.window.VehicleModelRegistrySOT;}
const api=load();
test('registry enriches known Vario profile',()=>{const r=api.find({name:'Honda Vario Techno 125 KZR'});assert.equal(r.model.id,'vario-125');assert.equal(r.profile.vehicleType,'motor');assert.equal(r.profile.bodyType,'matic');assert.equal(r.profile.generation,'KZR');});
test('registry does not guess unknown model',()=>assert.equal(api.find({name:'Daihatsu Xenia'}).confidence,'none'));
test('explicit model id wins over name matching',()=>{const r=api.find({modelId:'beat-fi',name:'Vario 125'});assert.equal(r.model.id,'beat-fi');assert.equal(r.confidence,'explicit');});
test('profile aliases are normalized',()=>assert.equal(api.normalize('Honda Vario-125 (KZR)'),'honda vario 125 kzr'));
