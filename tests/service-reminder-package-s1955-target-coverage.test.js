const assert=require('assert');const fs=require('fs');const vm=require('vm');
const code=fs.readFileSync('modules/vehicle/service-reminder-package-sot.js','utf8');
function make(){const ctx={console,D:{servisLogs:[],serviceReminderPackages:[]},__SERVICE_MASTER_DATA__:[{group:'Mesin',masterCategoryId:'servis-mesin',items:[{id:'klep',name:'Celah Klep',masterCategoryId:'servis-mesin'},{id:'oil',name:'Oli Mesin',masterCategoryId:'servis-mesin'}]}],save(){}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);return ctx;}
{
 const c=make();const p=c.ServiceReminderPackageSOT.create({vehicleId:'v1',targets:[{serviceComponentId:'klep'},{serviceComponentId:'oil'}]}).package;
 c.D.servisLogs=[{id:'s1',vehicleId:'v1',serviceComponentId:'klep',checklist:[]}];
 const r=c.ServiceReminderPackageSOT.completeFromHistory(p.id,['s1']);assert.equal(r.ok,false);assert.equal(r.code,'history_target_mismatch');
}
{
 const c=make();const p=c.ServiceReminderPackageSOT.create({vehicleId:'v1',targets:[{serviceComponentId:'klep'}]}).package;
 c.D.servisLogs=[{id:'s1',vehicleId:'v1',checklist:[{serviceComponentId:'klep'}]}];
 const r=c.ServiceReminderPackageSOT.completeFromHistory(p.id,['s1']);assert.equal(r.ok,true);
}
{
 const c=make();const p=c.ServiceReminderPackageSOT.create({vehicleId:'v1',targets:[{serviceComponentId:'klep'}]}).package;
 c.D.servisLogs=[{id:'legacy',vehicleId:'v1',item:'Cek klep',checklist:[]}];
 const r=c.ServiceReminderPackageSOT.completeFromHistory(p.id,['legacy']);assert.equal(r.ok,true);
}
console.log('S1955 reminder target coverage: 3/3 PASS');
