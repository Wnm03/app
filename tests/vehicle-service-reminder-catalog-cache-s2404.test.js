const assert=require('assert');const fs=require('fs');const vm=require('vm');const path=require('path');
(async()=>{
 let calls=0;const vehicles=[{id:'v1',modelId:'m1',sot:{}} ,{id:'v2',modelId:'m1',sot:{}}];
 const catalog=[{id:'p1',partName:'Oli',serviceIntervalKm:2000,compatibleModelIds:['m1'],compatibleVehicleIds:[]},{id:'p2',partName:'Ban',serviceIntervalKm:5000,compatibleVehicleIds:['v2'],compatibleModelIds:[]}];
 const D={vehicles};const sandbox={window:{},globalThis:{},console,D,VehicleCatalog:{getAll:async()=>{calls++;return catalog;}},VehicleCarNotesSOT:{getServiceSchedules:()=>[],setServiceSchedules:()=>({ok:true})}};
 sandbox.globalThis=sandbox;sandbox.window=sandbox;
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../modules/vehicle/vehicle-service-reminder-sot.js'),'utf8'),sandbox);
 const cache={allPromise:Promise.resolve(catalog),index:{byVehicle:new Map([['v2',[catalog[1]]]]),byModel:new Map([['m1',[catalog[0]]]])}};
 const a=await sandbox.VehicleServiceReminderSOT.provision('v1',{_catalogCache:cache});
 const b=await sandbox.VehicleServiceReminderSOT.provision('v2',{_catalogCache:cache});
 assert.deepStrictEqual(JSON.parse(JSON.stringify(a.summary)),{catalogPartCount:1,serviceRuleCount:1,reminderRuleCount:1});
 assert.deepStrictEqual(JSON.parse(JSON.stringify(b.summary)),{catalogPartCount:2,serviceRuleCount:2,reminderRuleCount:2});
 assert.strictEqual(calls,0,'cache index should avoid getAll');
 console.log('S2404 reminder catalog cache: PASS');
})().catch(e=>{console.error(e);process.exit(1)});
