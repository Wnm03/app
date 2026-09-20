const assert=require('assert');const fs=require('fs');const vm=require('vm');
const code=fs.readFileSync('modules/vehicle/vehicle-model-registry-sot.js','utf8');
const sandbox={window:{},console,DatabaseAPI:{vehicleModel:{getAll:()=>[{id:'k61',name:'Honda BeAT & BeAT Street eSP',matchNames:['beat','beat street'],manufacturerId:'honda'}]}}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);const R=sandbox.window.VehicleModelRegistrySOT;
const r=R.find({name:'Honda BeAT & BeAT Street eSP'});assert(r.model&&r.model.id==='k61');assert(r.confidence==='exact');
console.log('S1868 vehicle model registry production-shape test: 1/1 PASS');
