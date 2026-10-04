const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(){
 const src=fs.readFileSync('modules/vehicle/vehicle-sot-provisioning.js','utf8');
 const models=[{id:'m1',name:'M1',manufacturerId:'honda',torsi:{cats:[]}},{id:'m2',name:'M2',manufacturerId:'honda',torsi:{cats:[]}}];
 const catalog=[
  {id:'v1',compatibleVehicleIds:['veh1'],compatibleModelIds:[],isDraft:false},
  {id:'shared',compatibleVehicleIds:['veh1'],compatibleModelIds:['m1'],isDraft:false},
  {id:'m1only',compatibleVehicleIds:[],compatibleModelIds:['m1'],isDraft:false},
  {id:'draft',compatibleVehicleIds:['veh1'],compatibleModelIds:['m1'],isDraft:true},
  {id:'v2',compatibleVehicleIds:['veh2'],compatibleModelIds:['m2'],isDraft:false}
 ];
 let calls=0;
 const sandbox={window:{},console,DatabaseAPI:{vehicle:{modelGetAll:()=>models}},VehicleModelResolverSOT:{resolve:({modelId})=>({model:models.find(x=>x.id===modelId),profile:{name:modelId},confidence:'exact',source:'modelId'})},VehicleCatalog:{getAll:async()=>{calls++;return catalog}},VehicleCarNotesSOT:{setProvisioning(){}}};
 vm.createContext(sandbox);vm.runInContext(src,sandbox);return {sandbox,models,catalog,calls:()=>calls};
}
test('catalog index preserves compatibility, draft filtering, and ordering',async()=>{
 const h=load(); const cache={};
 const a=await h.sandbox.window.VehicleSOTProvisioning.provisionVehicle({id:'veh1',modelId:'m1',name:'M1'},{_catalogCache:cache});
 assert.equal(JSON.stringify(a.catalogParts.map(x=>x.id)),JSON.stringify(['v1','shared','m1only']));
 const b=await h.sandbox.window.VehicleSOTProvisioning.provisionVehicle({id:'veh2',modelId:'m2',name:'M2'},{_catalogCache:cache});
 assert.equal(JSON.stringify(b.catalogParts.map(x=>x.id)),JSON.stringify(['v2']));
 assert.equal(h.calls(),1);
});
test('catalog index is local to supplied cache and does not leak across runs',async()=>{
 const h=load();
 await h.sandbox.window.VehicleSOTProvisioning.provisionVehicle({id:'veh1',modelId:'m1',name:'M1'},{_catalogCache:{}});
 await h.sandbox.window.VehicleSOTProvisioning.provisionVehicle({id:'veh1',modelId:'m1',name:'M1'},{_catalogCache:{}});
 assert.equal(h.calls(),2);
});
