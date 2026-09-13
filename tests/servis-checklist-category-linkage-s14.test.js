'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const src=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/servis-checklist.js'),'utf8');

test('exactly 46 checklist items carry canonical masterCategoryId',()=>{
  const ctx={window:null,DatabaseAPI:{masterCategory:{getAll:()=>[]}}};
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(src+'\nthis.__groups=SERVICE_CHECKLIST_GROUPS;',ctx);
  const groups=ctx.__groups;
  const items=groups.flatMap(g=>g.items||[]);
  assert.equal(groups.length,13,'checklist must remain 13 categories');
  assert.equal(items.length,46,'checklist must remain exactly 46 items');
  assert.ok(items.every(x=>x.masterCategoryId),'every item must have masterCategoryId');
  assert.ok(items.every(x=>groups.some(g=>g.masterCategoryId===x.masterCategoryId)),'item masterCategoryId must belong to its group SoT');
});

test('checklist payload writes masterCategoryId for every checked item',()=>{
  assert.match(src,/masterCategoryId: found\.item\.masterCategoryId \|\| found\.group\.masterCategoryId \|\| null/);
});

test('categoryId is runtime-only and only emitted from a concrete vehicle-scoped category',()=>{
  assert.match(src,/resolveServisCatForVehicle\(item\.name, vehicleId \|\| this\._vehicleId\)/);
  assert.match(src,/if \(category\) row\.categoryId = category\.id/);
  assert.doesNotMatch(src,/D\.sparepartCats\.push\([^\n]*checklist/);
});

test('category resolver never falls back to another vehicle',()=>{
  const D={sparepartCats:[
    {id:'A',name:'Coolant',vehicleId:'vehicle-A'},
    {id:'U',name:'Coolant'},
    {id:'B',name:'Coolant',vehicleId:'vehicle-B'},
  ]};
  const spareSrc=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/sparepart-servis.js'),'utf8');
  const checklistSrc=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/servis-checklist.js'),'utf8');
  const ctx={D,DatabaseAPI:{masterCategory:{getAll:()=>[]}}};
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(spareSrc+'\n'+checklistSrc+'\nthis.ServisChecklist=ServisChecklist;',ctx);
  const cat=ctx.ServisChecklist.resolveCategoryForItem({name:'Coolant'},'vehicle-B');
  assert.equal(cat.id,'B');
  const cat2=ctx.ServisChecklist.resolveCategoryForItem({name:'Coolant'},'vehicle-C');
  assert.equal(cat2.id,'U');
});
