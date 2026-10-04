const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function run(source){
  const vehicles=[
    {id:'v1',name:'Honda Vario 125',modelId:'vario-125',jenis:'motor'},
    {id:'v2',name:'Honda Vario 125',modelId:'vario-125',jenis:'motor'},
    {id:'v3',name:'Honda BeAT FI Gen 1',modelId:'beat-fi',jenis:'motor'}
  ];
  let catsReads=0;
  function model(id,name,cat){
    const holder={};
    const m={id,manufacturerId:'honda',name,matchNames:[name.toLowerCase()]};
    Object.defineProperty(m,'torsi',{enumerable:false,value:holder});
    Object.defineProperty(m.torsi,'cats',{enumerable:true,get(){catsReads++;return [{cat,items:[{name:'item'}]}];}});
    return m;
  }
  const models=[model('vario-125','Honda Vario 125','Mesin'),model('beat-fi','Honda BeAT FI Gen 1','Mesin')];
  const sandbox={window:{},console,setTimeout,clearTimeout,
    D:{vehicles,servisLogs:[],kmLogs:[],transactions:[],spareparts:[],carNotes:[]},
    VehicleModelResolverSOT:{resolve:({modelId})=>{const m=models.find(x=>x.id===modelId);return {model:m,profile:{id:modelId,name:m.name},confidence:'exact',source:'modelId'};}},
    VehicleCatalog:{getAll:async()=>[]},
    VehicleServiceReminderSOT:{getSchedules:async()=>[]},
    VehicleCarNotesSOT:{setProvisioning(id,p){const v=vehicles.find(x=>x.id===id);v.sot=JSON.parse(JSON.stringify(p));},getServiceSchedules:()=>[],setMaintenanceState(){}},
    VehicleModelRegistrySOT:{taxonomy:()=>[]}
  };
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);
  return sandbox.window.VehicleSOTFleetIntegrity.provisionFleet({now:'2026-01-01T00:00:00Z'}).then(r=>{const clone=JSON.parse(JSON.stringify(r,(k,v)=>k==='provisionedAt'||k==='calculatedAt'?'__TIMESTAMP__':v)); for(const x of clone.results||[])if(x.provision&&x.provision.identification&&x.provision.identification.model)delete x.provision.identification.model.torsi; return {result:clone,catsReads};});
}

test('S2411 reuses categories per model within one fleet run without changing output',async()=>{
  const oldSource=fs.readFileSync(path.resolve(__dirname,'fixtures/replay-reference/modules/vehicle/vehicle-sot-fleet-integrity.js'),'utf8');
  const oldProvisioning=fs.readFileSync(path.resolve(__dirname,'fixtures/replay-reference/modules/vehicle/vehicle-sot-provisioning.js'),'utf8');
  const newFleet=fs.readFileSync(path.resolve(__dirname,'../modules/vehicle/vehicle-sot-fleet-integrity.js'),'utf8');
  const newProvisioning=fs.readFileSync(path.resolve(__dirname,'../modules/vehicle/vehicle-sot-provisioning.js'),'utf8');
  // compose both modules for each run; fleet is the only changed caller of provisioning options.
  const old=await run(oldProvisioning+'\n'+oldSource);
  const freshSandboxRun=async()=>run(newProvisioning+'\n'+newFleet);
  const neu=await freshSandboxRun();
  assert.deepEqual(neu.result,old.result);
  assert.ok(old.catsReads>neu.catsReads);
  assert.equal(old.catsReads-neu.catsReads,8);
});
