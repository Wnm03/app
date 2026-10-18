'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

test('S2145: Slide Piece CVT interval uses latest replacement as baseline',()=>{
  const c=loadSource([
    'modules/vehicle/servis-checklist.js',
    'car-notes.js',
    'modules/vehicle/service-input-catalog.js',
    'modules/vehicle/servis.js',
    'modules/vehicle/sparepart-servis.js',
    'modules/vehicle/sparepart-servis-b.js'
  ],{D:{vehicles:[],sparepartCats:[],servisLogs:[]}},[
    'SERVICE_CHECKLIST_GROUPS','computeServiceUrgency','resolveResetActionTypeFilter','getMaintenanceSchedule'
  ]);
  const hit=c.ServiceInputCatalog.itemById('slide-piece-cvt');
  assert.ok(hit&&hit.item,'canonical Slide Piece CVT policy exists');
  assert.equal(hit.item.actionMode,'periksa-conditional');
  assert.equal(hit.item.gantiResetsInterval,true);
  for(const id of ['seal-driven-face','engine-mounting-bushing-arm']){
    const related=c.ServiceInputCatalog.itemById(id);
    assert.ok(related&&related.item,`canonical policy ${id} exists`);
    assert.equal(related.item.actionMode,'periksa-conditional',`${id} conditional policy`);
    assert.equal(related.item.gantiResetsInterval,true,`${id} replacement resets interval`);
  }
  const cat={id:'cvtslide',name:'Slide Piece CVT',serviceComponentId:'slide-piece-cvt',masterCategoryId:'servis-cvt',intervalKm:8000,showInReminder:true};
  const filter=c.resolveResetActionTypeFilter(cat);
  assert.equal(filter,'ganti');
  const d={vehicles:[{id:'v1',km:21311}],sparepartCats:[cat],servisLogs:[
    {id:'inspect-old',vehicleId:'v1',categoryId:'cvtslide',serviceComponentId:'slide-piece-cvt',item:'Slide Piece CVT',date:'2026-06-26',km:16824,actionType:'periksa'},
    {id:'replace-new',vehicleId:'v1',categoryId:'cvtslide',serviceComponentId:'slide-piece-cvt',item:'Slide Piece CVT',date:'2026-10-18',km:21311,actionType:'ganti'}
  ]};
  c.D.vehicles=d.vehicles;c.D.sparepartCats=d.sparepartCats;c.D.servisLogs=d.servisLogs;
  const u=c.computeServiceUrgency({vehicleId:'v1',cat,curKm:21311,kmPerDay:null,nowISO:'2026-10-18'});
  assert.equal(u.lastKm,21311);
  assert.equal(u.nextDueKm,29311);
  assert.equal(u.sisaKm,8000);
  assert.equal(u.sourceHistoryId,'replace-new');
});
