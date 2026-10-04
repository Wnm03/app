const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function buildHarness(){
 const provisioning=fs.readFileSync('modules/vehicle/vehicle-sot-provisioning.js','utf8');
 const fleet=fs.readFileSync('modules/vehicle/vehicle-sot-fleet-integrity.js','utf8');
 const vehicles=[
  {id:'v1',name:'Honda Vario 125',jenis:'motor'},
  {id:'v2',name:'Honda Vario 125',jenis:'motor'},
  {id:'v3',name:'Honda BeAT FI Gen 1',jenis:'motor'}
 ];
 let catalogCalls=0;
 const catalog=[
  {id:'c1',compatibleVehicleIds:['v1'],compatibleModelIds:[],isDraft:false},
  {id:'c2',compatibleVehicleIds:[],compatibleModelIds:['vario-125'],isDraft:false},
  {id:'c3',compatibleVehicleIds:['v3'],compatibleModelIds:['beat-fi'],isDraft:false}
 ];
 const models=[
  {id:'vario-125',manufacturerId:'honda',name:'Honda Vario 125',matchNames:['vario 125'],torsi:{cats:[{cat:'Mesin',items:[{name:'Cylinder'}]}]}},
  {id:'beat-fi',manufacturerId:'honda',name:'Honda BeAT FI Gen 1',matchNames:['beat fi'],torsi:{cats:[{cat:'Mesin',items:[{name:'Busi'}]}]}}
 ];
 const sandbox={window:{},console,setTimeout,clearTimeout,D:{vehicles},DatabaseAPI:{vehicle:{modelGetAll:()=>models}},VehicleCatalog:{getAll:async()=>{catalogCalls++;return catalog;}},VehicleServiceReminderSOT:{getSchedules:async()=>[]},VehicleCarNotesSOT:{setProvisioning(id,p){const v=vehicles.find(x=>x.id===id);v.sot=JSON.parse(JSON.stringify(p));},getServiceSchedules:()=>[],setMaintenanceState(){}}};
 vm.createContext(sandbox);vm.runInContext(provisioning,sandbox);vm.runInContext(fleet,sandbox);
 return {sandbox,vehicles,calls:()=>catalogCalls};
}

test('fleet provisioning reuses one catalog read per run and preserves model/vehicle compatibility',async()=>{
 const h=buildHarness();
 const r=await h.sandbox.window.VehicleSOTFleetIntegrity.provisionFleet({now:'2026-01-01T00:00:00Z'});
 assert.equal(r.ok,true);
 assert.equal(h.calls(),1);
 assert.deepEqual(h.vehicles[0].sot.catalogPartIds,['c1','c2']);
 assert.deepEqual(h.vehicles[1].sot.catalogPartIds,['c2']);
 assert.deepEqual(h.vehicles[2].sot.catalogPartIds,['c3']);
});

test('individual provision does not retain catalog cache across separate calls',async()=>{
 const vehicles=[{id:'v1',name:'Honda Vario 125',jenis:'motor'}];
 let calls=0;
 const model={id:'vario-125',manufacturerId:'honda',name:'Honda Vario 125',matchNames:['vario 125'],torsi:{cats:[]}};
 const sandbox={window:{},console,D:{vehicles},DatabaseAPI:{vehicle:{modelGetAll:()=>[model]}},VehicleModelResolverSOT:{resolve:()=>({model,profile:{id:model.id,name:model.name},confidence:'exact',source:'modelId'})},VehicleCatalog:{getAll:async()=>{calls++;return[];}},VehicleCarNotesSOT:{setProvisioning(){}}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync('modules/vehicle/vehicle-sot-provisioning.js','utf8'),sandbox);
 await sandbox.window.VehicleSOTProvisioning.provisionVehicle(vehicles[0]);
 await sandbox.window.VehicleSOTProvisioning.provisionVehicle(vehicles[0]);
 assert.equal(calls,2);
});
