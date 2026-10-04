const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function harness(){
  const provisioning=fs.readFileSync('modules/vehicle/vehicle-sot-provisioning.js','utf8');
  const fleet=fs.readFileSync('modules/vehicle/vehicle-sot-fleet-integrity.js','utf8');
  const reminder=fs.readFileSync('modules/vehicle/vehicle-service-reminder-sot.js','utf8');
  const vehicles=[
    {id:'v1',name:'Honda Vario 125',modelId:'vario-125',jenis:'motor'},
    {id:'v2',name:'Honda Vario 125',modelId:'vario-125',jenis:'motor'}
  ];
  const models=[{id:'vario-125',manufacturerId:'honda',name:'Honda Vario 125',matchNames:['vario 125'],torsi:{cats:[]}}];
  const catalog=[{id:'c1',compatibleVehicleIds:[],compatibleModelIds:['vario-125'],isDraft:false}];
  let calls=0;
  const sandbox={window:{},console,setTimeout,clearTimeout,
    D:{vehicles,servisLogs:[],kmLogs:[],transactions:[],spareparts:[],carNotes:[]},
    DatabaseAPI:{vehicle:{modelGetAll:()=>models}},
    VehicleModelResolverSOT:{resolve:({modelId})=>({model:models.find(x=>x.id===modelId),profile:{id:modelId,name:'Honda Vario 125'},confidence:'exact',source:'modelId'})},
    VehicleCatalog:{getAll:async()=>{calls++; return catalog;}},
    VehicleCarNotesSOT:{
      setProvisioning(id,p){const v=vehicles.find(x=>x.id===id);v.sot=Object.assign({},v.sot,p);},
      getServiceSchedules(id){const v=vehicles.find(x=>x.id===id);return (v&&v.sot&&v.sot.serviceSchedules)||[];},
      setMaintenanceState(id,p){const v=vehicles.find(x=>x.id===id);v.sot=v.sot||{};v.sot.maintenanceState=p;}
    },
    getVehicleKm:()=>0
  };
  vm.createContext(sandbox);
  vm.runInContext(provisioning,sandbox);
  vm.runInContext(reminder,sandbox);
  vm.runInContext(fleet,sandbox);
  return {sandbox,vehicles,calls:()=>calls};
}

test('fleet provision shares one catalog cache across provisioning and service-state reads',async()=>{
  const h=harness();
  const r=await h.sandbox.window.VehicleSOTFleetIntegrity.provisionFleet({now:'2026-01-01T00:00:00Z'});
  assert.equal(r.ok,true);
  assert.equal(h.calls(),1);
  assert.equal(JSON.stringify(h.vehicles[0].sot.catalogPartIds),JSON.stringify(['c1']));
  assert.equal(JSON.stringify(h.vehicles[1].sot.catalogPartIds),JSON.stringify(['c1']));
});

test('separate fleet runs do not retain catalog cache',async()=>{
  const h=harness();
  await h.sandbox.window.VehicleSOTFleetIntegrity.provisionFleet();
  await h.sandbox.window.VehicleSOTFleetIntegrity.provisionFleet();
  assert.equal(h.calls(),2);
});
