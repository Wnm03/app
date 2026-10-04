const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function load(){
  let findCalls=0;
  const model={id:'vario-125',manufacturerId:'honda',name:'Honda Vario 125',matchNames:['vario 125'],torsi:{cats:[{cat:'CVT',items:[{name:'V-Belt'}]}]}};
  const sandbox={window:{},console,setTimeout,D:{
    vehicles:[
      {id:'v1',name:'Honda Vario 125',modelId:'vario-125',jenis:'motor'},
      {id:'v2',name:'Honda Vario 125',modelId:'vario-125',jenis:'motor'},
      {id:'v3',name:'Honda Vario 125',modelId:'vario-125',jenis:'motor'}
    ],servisLogs:[],kmLogs:[]
  },
  DatabaseAPI:{vehicle:{modelGetAll:()=>[model]}},
  VehicleModelRegistrySOT:{
    find:input=>{findCalls++;return {model,profile:{manufacturerId:'honda',name:'Honda Vario 125',vehicleType:'motor'},confidence:'id',matched:'id'}},
    profile:()=>({manufacturerId:'honda',name:'Honda Vario 125',vehicleType:'motor'}),
    taxonomy:()=>[]
  },
  VehicleCatalog:{getAll:async()=>[]},
  VehicleServiceReminderSOT:{getSchedules:async()=>[]}
  };
  vm.createContext(sandbox);
  for(const f of ['modules/vehicle/vehicle-model-resolver-sot.js','modules/vehicle/vehicle-sot-provisioning.js','modules/vehicle/vehicle-sot-fleet-integrity.js'])vm.runInContext(fs.readFileSync(f,'utf8'),sandbox);
  return {sandbox,getFindCalls:()=>findCalls};
}

test('fleet provisioning reuses model registry base lookup only within one fleet run',async()=>{
  const {sandbox,getFindCalls}=load();
  const r=await sandbox.window.VehicleSOTFleetIntegrity.provisionFleet();
  assert.equal(r.ok,true);
  assert.equal(r.results.length,3);
  assert.equal(getFindCalls(),1);
  assert.equal(JSON.stringify(r.results.map(x=>x.provision.identification.model.id)),JSON.stringify(['vario-125','vario-125','vario-125']));
  sandbox.window.VehicleModelResolverSOT.resolve({modelId:'vario-125',name:'Honda Vario 125'});
  assert.equal(getFindCalls(),2);
});
