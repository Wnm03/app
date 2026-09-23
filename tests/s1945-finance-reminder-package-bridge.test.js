const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('modules/vehicle/service-reminder-package-sot.js','utf8');
const ctx={console,D:{servisLogs:[],serviceReminderPackages:[]},__SERVICE_MASTER_DATA__:[{group:'Mesin',masterCategoryId:'servis-mesin',items:[{id:'klep',name:'Celah Klep',masterCategoryId:'servis-mesin'},{id:'oil',name:'Oli Mesin',masterCategoryId:'servis-mesin'}]}],save(){}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);
const p=ctx.ServiceReminderPackageSOT.create({vehicleId:'v1',title:'Servis Mesin Paket',targets:[{masterCategoryId:'servis-mesin',serviceComponentId:'klep',componentName:'Celah Klep'},{masterCategoryId:'cvt',serviceComponentId:'belt',componentName:'V-Belt'}]}).package;
assert.equal(p.targets.length,2); assert.equal(ctx.ServiceReminderPackageSOT.plan(p.id).multiCategory,true);
ctx.D.servisLogs.push({id:'s1',vehicleId:'v1',checklist:[],sessionId:null});
const done=ctx.ServiceReminderPackageSOT.completeFromHistory(p.id,['s1']); assert.equal(done.ok,true); assert.equal(ctx.D.servisLogs[0].reminderPackageId,p.id); assert.equal(ctx.D.servisLogs[0].sessionId,done.sessionId); assert.equal(p.status,'COMPLETED');
console.log('S1945 reminder package bridge contract: PASS');
