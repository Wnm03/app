const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function load(){
 const ctx={console,window:{},ServiceInputCatalog:{groups:()=>[{items:[
  {id:'oli-mesin'},{id:'busi'},{id:'filter-udara'},{id:'coolant'},{id:'pembersihan-rumah-cvt'},
  {id:'throttle-body'},{id:'ban-depan'},{id:'ban-belakang'}
 ]}]},D:{sparepartCats:[]}};
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','car-notes.js'),'utf8'),ctx,{filename:'car-notes.js'});
 return ctx;
}
test('v19 every scheduled registry axis declares an explicit action',()=>{
 const c=load(); const r=c.window.SERVICE_MAINTENANCE_RULES;
 for(const [id,x] of Object.entries(r)){
  for(const axis of ['inspect','replace']){
   const scheduled=['Km','Months','Days'].some(s=>Number.isFinite(x[axis+s])&&x[axis+s]>0);
   if(scheduled) assert.notEqual(x[axis+'Action'],undefined,`${id}:${axis}Action missing`);
  }
 }
});
test('v19 action values remain axis-safe',()=>{
 const c=load(); const r=c.window.SERVICE_MAINTENANCE_RULES;
 assert.equal(r['oli-mesin'].inspectAction,'periksa');
 assert.equal(r['oli-mesin'].replaceAction,'ganti');
 assert.equal(r['pembersihan-rumah-cvt'].inspectAction,'bersih');
 assert.equal(r['throttle-body'].inspectAction,'bersih');
 assert.equal(r['ban-depan'].inspectAction,'periksa');
});
test('v19 validator reports missing explicit action',()=>{
 const c=load();
 const bad={...c.window.SERVICE_MAINTENANCE_RULES,'oli-mesin':{...c.window.SERVICE_MAINTENANCE_RULES['oli-mesin'],inspectAction:undefined}};
 const v=c.window.validateMaintenanceRuleRegistry(bad,c.ServiceInputCatalog.groups());
 assert.equal(v.ok,false);
 assert.ok(v.missingAction.includes('oli-mesin:inspectAction'));
});
