const assert=require('assert');const fs=require('fs');const vm=require('vm');
(async()=>{
 const sandbox={window:{},console,D:{vehicles:[{id:'veh_1',modelId:'vario-125'}]},VehicleCatalog:{getAll:async()=>[
  {id:'p1',partName:'Oli Mesin',oemCode:'X1',category:'Fast Moving & Fluida',subcategory:'Fluida',serviceIntervalKm:2000,serviceIntervalMonths:3,serviceShowInReminder:true,compatibleModelIds:['vario-125']},
  {id:'p2',partName:'Busi',oemCode:'X2',category:'Mesin',subcategory:'Pengapian',serviceIntervalKm:8000,serviceShowInReminder:true,compatibleVehicleIds:['veh_1']},
  {id:'p3',partName:'No Rule',category:'Body',compatibleModelIds:['vario-125']},
  {id:'p4',partName:'Other',category:'Other',serviceIntervalKm:1000,compatibleModelIds:['beat-fi']}
 ]}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync('modules/vehicle/vehicle-service-reminder-sot.js','utf8'),sandbox);
 const r=await sandbox.window.VehicleServiceReminderSOT.provision('veh_1');
 assert.strictEqual(r.ok,true);assert.strictEqual(r.summary.serviceRuleCount,2);assert.strictEqual(r.summary.reminderRuleCount,2);
 assert.strictEqual(sandbox.D.vehicles[0].sot.serviceSchedules[0].catalogPartId,'p1');
 const rs=await sandbox.window.VehicleServiceReminderSOT.getReminderSchedules('veh_1');assert.strictEqual(rs.length,2);
 console.log('SOT-4F service/reminder provisioning PASS');
})().catch(e=>{console.error(e);process.exit(1)});
