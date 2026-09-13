const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(){
 const ctx={console,window:{},ServiceInputCatalog:{groups:()=>[{items:[{id:'oli-mesin'},{id:'busi'},{id:'filter-udara'}]}]},D:{sparepartCats:[]}};
 vm.createContext(ctx);
 const src=fs.readFileSync(require('node:path').join(__dirname,'..','car-notes.js'),'utf8');
 vm.runInContext(src,ctx,{filename:'car-notes.js'});
 return ctx;
}
test('v17 action plan keeps inspect and replace as separate axes',()=>{
 const c=load();
 const r=c.window.SERVICE_MAINTENANCE_RULES;
 assert.equal(JSON.stringify(c.window.getMaintenanceActionPlan(r['oli-mesin']).map(x=>[x.axis,x.action,x.intervalKm])),JSON.stringify([['inspect','periksa',2000],['replace','ganti',2500]]));
 assert.equal(JSON.stringify(c.window.getMaintenanceActionPlan(r['busi']).map(x=>[x.axis,x.action,x.intervalKm])),JSON.stringify([['inspect','periksa',4000],['replace','ganti',8000]]));
 assert.equal(JSON.stringify(c.window.getMaintenanceActionPlan(r['filter-udara']).map(x=>[x.axis,x.action,x.intervalKm])),JSON.stringify([['replace','ganti',16000]]));
});
test('v17 registry validation includes action-field validation',()=>{
 const c=load();
 const bad={...c.window.SERVICE_MAINTENANCE_RULES,'oli-mesin':{...c.window.SERVICE_MAINTENANCE_RULES['oli-mesin'],inspectAction:'BAD'}};
 const v=c.window.validateMaintenanceRuleRegistry(bad,c.ServiceInputCatalog.groups());
 assert.equal(v.ok,false); assert.ok(v.invalidAction.includes('oli-mesin:inspectAction'));
});
