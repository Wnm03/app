const assert=require('assert');const fs=require('fs');const vm=require('vm');
async function load(){
 const sandbox={window:{},console,D:{vehicles:[{id:'veh_2',modelId:'vario-125'}]},VehiclePartSOT:{seed:[]},VehicleCatalog:{getAll:async()=>[
  {id:'p1',partName:'V-Belt',category:'CVT',subcategory:'Drive',isDraft:false,compatibleModelIds:['vario-125'],compatibleVehicleIds:['veh_1']},
  {id:'p2',partName:'Other',category:'Other',isDraft:false,compatibleModelIds:['beat-fi'],compatibleVehicleIds:['veh_9']}
 ]},DatabaseAPI:{vehicle:{modelGetAll:()=>[{id:'vario-125',manufacturerId:'honda',name:'Honda Vario 125 KZR',matchNames:['vario 125'],torsi:{cats:[{cat:'CVT',items:[{name:'V-Belt'}]}]}}]}}};
 vm.createContext(sandbox);
 for(const f of ['modules/vehicle/vehicle-model-registry-sot.js','modules/vehicle/vehicle-model-resolver-sot.js','modules/vehicle/vehicle-sot-provisioning.js'])vm.runInContext(fs.readFileSync(f,'utf8'),sandbox);
 return sandbox;
}
(async()=>{const s=await load();const v={id:'veh_2',name:'Honda Vario 125 KZR',modelId:'vario-125'};const r=await s.window.VehicleSOTProvisioning.provisionVehicle(v);assert.strictEqual(r.summary.catalogPartCount,1);assert.strictEqual(Array.from(r.vehicle.sot.catalogPartIds).join(','),'p1');assert.strictEqual(r.vehicle.sot.catalogModelId,'vario-125');console.log('SOT-4E model provisioning PASS');})().catch(e=>{console.error(e);process.exit(1)});
