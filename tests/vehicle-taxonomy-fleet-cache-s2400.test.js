const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(){
  const registry=fs.readFileSync('modules/vehicle/vehicle-model-registry-sot.js','utf8');
  const provisioning=fs.readFileSync('modules/vehicle/vehicle-sot-provisioning.js','utf8');
  const fleet=fs.readFileSync('modules/vehicle/vehicle-sot-fleet-integrity.js','utf8');
  const vehicles=[{id:'v1',name:'Honda Vario 125',jenis:'motor'},{id:'v2',name:'Honda Vario 125',jenis:'motor'},{id:'v3',name:'Honda BeAT FI Gen 1',jenis:'motor'}];
  let taxonomyCalls=0;
  const sandbox={window:{},console,setTimeout,clearTimeout,D:{vehicles},DatabaseAPI:{vehicle:{modelGetAll:()=>[
    {id:'vario-125',manufacturerId:'honda',name:'Honda Vario 125',matchNames:['vario 125'],torsi:{cats:[{cat:'Mesin',items:[{name:'Cylinder'}]}]}},
    {id:'beat-fi',manufacturerId:'honda',name:'Honda BeAT FI Gen 1',matchNames:['beat fi'],torsi:{cats:[{cat:'Mesin',items:[{name:'Busi'}]}]}}
  ]}},VehicleCatalog:{getAll:async()=>[]},VehicleServiceReminderSOT:{getSchedules:async()=>[]},VehicleCarNotesSOT:{setProvisioning(id,p){const v=vehicles.find(x=>x.id===id);v.sot=JSON.parse(JSON.stringify(p));},getServiceSchedules:()=>[],setMaintenanceState(){}}};
  vm.createContext(sandbox);vm.runInContext(registry,sandbox);
  const original=sandbox.window.VehicleModelRegistrySOT.taxonomy;
  sandbox.window.VehicleModelRegistrySOT.taxonomy=function(model){taxonomyCalls++;return original(model);};
  vm.runInContext(provisioning,sandbox);vm.runInContext(fleet,sandbox);
  return {api:sandbox.window.VehicleSOTFleetIntegrity,vehicles,calls:()=>taxonomyCalls};
}
test('fleet provisioning reuses taxonomy per model within one run',async()=>{const h=load();const r=await h.api.provisionFleet({now:'2026-01-01T00:00:00Z'});assert.equal(r.ok,true);assert.equal(h.calls(),2);assert.ok(h.vehicles[0].sot.taxonomy.length>0);assert.deepEqual(h.vehicles[0].sot.taxonomy,h.vehicles[1].sot.taxonomy);});
