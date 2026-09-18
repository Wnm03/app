const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(){
 const code=fs.readFileSync('modules/vehicle/vehicle-sot-provisioning.js','utf8');
 const sandbox={window:{},console,D:{vehicles:[]},DatabaseAPI:{vehicle:{modelGetAll:()=>[
  {id:'vario-125',manufacturerId:'honda',name:'Honda Vario 125 (KZR)',matchNames:['vario 125'],torsi:{cats:[{cat:'Perawatan Berkala',items:[{name:'Busi'}]},{cat:'Mesin',items:[{name:'Cylinder'}]}]}},
  {id:'beat-fi',manufacturerId:'honda',name:'Honda BeAT FI Gen 1',matchNames:['beat fi','beat-fi'],torsi:{cats:[{cat:'Perawatan Berkala',items:[{name:'Busi'}]}]}}
 ]}},VehicleCatalog:null};
 vm.createContext(sandbox);vm.runInContext(code,sandbox);return sandbox.window.VehicleSOTProvisioning;
}
const api=load();
test('identifies Vario by alias',()=>{const r=api.preview({name:'Motor Honda Vario 125'});assert.equal(r.status,'identified');assert.equal(r.model.id,'vario-125');assert.equal(r.summary.categoryCount,2);});
test('unknown model is not guessed',()=>{const r=api.preview({name:'Daihatsu Xenia'});assert.equal(r.status,'unknown');});
test('short model alias is still deterministic',()=>{const r=api.findModel({name:'beat'}); assert.equal(r.confidence,'alias'); assert.equal(r.model.id,'beat-fi');});
test('provision writes model identity and SOT metadata',async()=>{const v={id:'veh_9',name:'Honda Vario 125',jenis:'motor'};const r=await api.provisionVehicle(v);assert.equal(r.ok,true);assert.equal(v.modelId,'vario-125');assert.equal(v.manufacturerId,'honda');assert.equal(v.sot.profileId,'vehicle-model:vario-125');});
