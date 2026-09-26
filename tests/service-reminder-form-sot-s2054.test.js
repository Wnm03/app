const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const modulePath=path.join(__dirname,'..','modules','vehicle','service-reminder-form-sot-s2054.js');
function load(catalog){
  const vm=require('node:vm');
  const ctx={ServiceInputCatalog:catalog,console};ctx.globalThis=ctx;
  vm.runInNewContext(fs.readFileSync(modulePath,'utf8'),ctx,{filename:modulePath});
  return ctx.ServiceReminderFormSOT_S2054;
}
test('S2054 reminder resolves one canonical category + component + names',()=>{
  const api=load({
    itemById:id=>id==='oli-mesin'?{item:{id:'oli-mesin',name:'Oli Mesin'},group:{masterCategoryId:'servis-mesin',group:'Servis Mesin'}}:null,
    groupById:id=>id==='servis-mesin'?{masterCategoryId:id,group:'Servis Mesin'}:null,
    infer:()=>null
  });
  const r=api.resolve({id:'cat-1',name:'Oli Mesin',masterCategoryId:'servis-mesin',serviceComponentId:'oli-mesin'},'veh-1');
  assert.deepEqual({masterCategoryId:r.masterCategoryId,serviceComponentId:r.serviceComponentId,categoryName:r.categoryName,componentName:r.componentName},{masterCategoryId:'servis-mesin',serviceComponentId:'oli-mesin',categoryName:'Servis Mesin',componentName:'Oli Mesin'});
  assert.equal(api.assert({masterCategoryId:'servis-mesin',serviceComponentId:'oli-mesin',name:'Oli Mesin'},'veh-1').ok,true);
});
test('S2054 detects category/component mismatch instead of inventing a second identity',()=>{
  const api=load({itemById:id=>id==='oli-mesin'?{item:{id:'oli-mesin',name:'Oli Mesin'},group:{masterCategoryId:'servis-mesin',group:'Servis Mesin'}}:null,groupById:id=>({group:id}),infer:()=>null});
  const a=api.assert({masterCategoryId:'sistem-rem',serviceComponentId:'oli-mesin',name:'Oli Mesin'},'veh-1');
  assert.equal(a.ok,false);assert.ok(a.issues.includes('category-component-mismatch'));
});
test('S2054 chooseReminderAction opens the existing service form instead of directly creating a parallel reminder log',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','modules','vehicle','servis.js'),'utf8');
  const i=source.indexOf('async chooseReminderAction(catId)');
  const block=source.slice(i,source.indexOf('async markServiced(catId,actionType,opts)',i));
  assert.match(block,/Servis\.openReminderServiceForm\(catId,choices\[idx\]\.value,conditionResult\)/);
  assert.doesNotMatch(block,/return Servis\.markServiced\(catId,choices\[idx\]\.value/);
});
