const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
function load(file,sandbox){vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),sandbox,{filename:file});}

test('S2168: category-only canonical rules provision reminders without catalog component links',async()=>{
  const vehicle={id:'veh-1',modelId:'vario-125',sot:{serviceCategories:[
    {id:'cat-oil',vehicleId:'veh-1',name:'Oli Mesin',serviceComponentId:'oli-mesin',masterCategoryId:'servis-mesin',intervalKm:1500,showInReminder:true},
    {id:'cat-busi',vehicleId:'veh-1',name:'Busi',serviceComponentId:'busi',masterCategoryId:'servis-mesin',intervalKm:8000,showInReminder:true},
    {id:'cat-no-rule',vehicleId:'veh-1',name:'Tanpa Interval',serviceComponentId:'tanpa-interval',intervalKm:0,showInReminder:true},
    {id:'cat-hidden',vehicleId:'veh-1',name:'Hidden',serviceComponentId:'hidden',intervalKm:4000,showInReminder:false}
  ]}};
  const sandbox={window:{},console,D:{vehicles:[vehicle]},VehicleCatalog:{getAll:async()=>[
    {id:'part-unlinked',partName:'part unrelated',compatibleModelIds:['vario-125']}
  ]},VehicleServiceSOT:{getReminderCategoriesForVehicle:()=>vehicle.sot.serviceCategories,resolveReminderRule:()=>null},VehicleCarNotesSOT:{
    getServiceSchedules:()=>vehicle.sot.serviceSchedules||[],
    setServiceSchedules:(id,rules)=>{vehicle.sot.serviceSchedules=JSON.parse(JSON.stringify(rules));return {ok:true};}
  }};
  vm.createContext(sandbox);load('modules/vehicle/vehicle-service-reminder-sot.js',sandbox);
  const result=await sandbox.window.VehicleServiceReminderSOT.provision('veh-1');
  assert.equal(result.ok,true);assert.equal(result.summary.serviceRuleCount,3);assert.equal(result.summary.reminderRuleCount,2);
  const rules=vehicle.sot.serviceSchedules;
  assert.deepEqual(rules.map(r=>r.serviceComponentId).sort(),['busi','hidden','oli-mesin']);
  assert.equal(rules.find(r=>r.serviceComponentId==='oli-mesin').intervalKm,1500);
  assert.equal(rules.find(r=>r.serviceComponentId==='oli-mesin').catalogPartId,null);
  assert.equal(rules.some(r=>r.serviceComponentId==='tanpa-interval'),false);
});

test('S2168: fleet maintenance state resolves category/component-only service history by vehicle',async()=>{
  const vehicle={id:'veh-1',sot:{}};
  const sandbox={console,Date,D:{vehicles:[vehicle],kmLogs:[{vehicleId:'veh-1',km:6000}],servisLogs:[
    {id:'foreign',vehicleId:'veh-2',date:'2026-09-01',km:5900,serviceComponentId:'filter-udara'},
    {id:'local',vehicleId:'veh-1',date:'2026-08-01',km:5000,checklist:[{serviceComponentId:'filter-udara',actionType:'ganti'}]}
  ]},VehicleServiceReminderSOT:{getSchedules:async()=>[{serviceComponentId:'filter-udara',categoryId:'cat-filter',partName:'Filter Udara',intervalKm:2000,showInReminder:true}]},VehicleCarNotesSOT:{setMaintenanceState:(id,state)=>{vehicle.sot.maintenanceState=state;return {ok:true};}}};
  vm.createContext(sandbox);load('modules/vehicle/vehicle-sot-fleet-integrity.js',sandbox);
  const result=await sandbox.VehicleSOTFleetIntegrity.serviceState('veh-1',{now:'2026-10-19T00:00:00Z'});
  assert.equal(result.ok,true);assert.equal(result.projection.items.length,1);
  assert.equal(result.projection.items[0].lastService.id,'local');
  assert.equal(result.projection.items[0].nextDueKm,7000);
  assert.equal(result.projection.items[0].status,'aman');
});


test('S2168: matching checklist action overrides a conflicting legacy root action for interval reset',()=>{
  const {loadSource}=require('./helpers/loadSource');
  const cat={id:'cat-busi',name:'Busi',serviceComponentId:'busi',intervalKm:8000,showInReminder:true};
  const data={vehicles:[{id:'veh-1'}],sparepartCats:[cat],servisLogs:[
    {id:'old-replacement',vehicleId:'veh-1',categoryId:'cat-busi',serviceComponentId:'busi',item:'Busi',date:'2026-01-01',km:1000,actionType:'ganti',checklist:[{itemId:'busi',serviceComponentId:'busi',categoryId:'cat-busi',actionType:'ganti'}]},
    {id:'inspection-with-stale-root',vehicleId:'veh-1',categoryId:'cat-busi',serviceComponentId:'busi',item:'Busi',date:'2026-02-01',km:2000,actionType:'ganti',checklist:[{itemId:'busi',serviceComponentId:'busi',categoryId:'cat-busi',actionType:'periksa'}]}
  ]};
  const c=loadSource(['modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D:data},['matchesActionTypeForReset','computeServiceUrgency']);
  assert.equal(c.matchesActionTypeForReset(data.servisLogs[1],cat,'ganti',true),false);
  assert.equal(c.matchesActionTypeForReset(data.servisLogs[1],cat,'periksa',true),true);
  const urgency=c.computeServiceUrgency({vehicleId:'veh-1',cat,curKm:3000,kmPerDay:null,nowISO:'2026-03-01'});
  assert.equal(urgency.lastKm,1000);
  assert.equal(urgency.nextDueKm,9000);
});

