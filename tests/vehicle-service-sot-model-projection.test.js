const assert=require('assert');const fs=require('fs');const vm=require('vm');
const sandbox={window:{},console,D:{vehicles:[{id:'veh_2',modelId:'vario-125'}]},VehicleCatalog:{getStore:()=>({items:[{id:'p1',compatibleVehicleIds:['veh_1'],compatibleModelIds:['vario-125']},{id:'p2',compatibleVehicleIds:['veh_9'],compatibleModelIds:['beat-fi']} ]})}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('modules/vehicle/vehicle-service-sot.js','utf8'),sandbox);
const got=sandbox.vehicleServiceSotVehicleItems('veh_2');
assert.strictEqual(got.length,1);assert.strictEqual(got[0].id,'p1');console.log('SOT-4E service model projection PASS');
