const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const appRoot=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(appRoot,'modules/vehicle/sparepart-servis.js'),'utf8');

function loadProjection(){
  const start=src.indexOf('function getVehicleServiceCategorySOT(');
  const end=src.indexOf('\nfunction dedupeServiceCategoriesForVehicle',start);
  assert.ok(start>=0&&end>start,'S2070 projection helper must exist');
  const code=src.slice(start,end);
  const sandbox={
    ServiceInputCatalog:{
      itemById(id){return id==='busi'?{item:{id:'busi',name:'Busi',masterCategoryId:'servis-mesin'},group:{masterCategoryId:'servis-mesin',group:'Servis Mesin'}}:null;},
      infer(name){return String(name).toLowerCase()==='busi'?{item:{id:'busi',name:'Busi',masterCategoryId:'servis-mesin'},group:{masterCategoryId:'servis-mesin',group:'Servis Mesin'}}:null;},
      groupById(id){return id==='servis-mesin'?{masterCategoryId:'servis-mesin',group:'Servis Mesin'}:null;}
    },
    VehicleServiceSOT:{resolveReminderRule(cat,vehicleId){return {intervalKm:cat.intervalByVehicle?.[vehicleId]??8000,intervalBulan:null};}},
    codeFromName(name){return String(name).slice(0,3).toUpperCase();},
    getEffectiveIntervalKm(){return 0;},
    getEffectiveIntervalBulan(){return 0;}
  };
  vm.runInNewContext(code+'\nthis.getVehicleServiceCategorySOT=getVehicleServiceCategorySOT;',sandbox);
  return sandbox.getVehicleServiceCategorySOT;
}

test('S2070: universal category is never projected into active vehicle SOT UI',()=>{
  const project=loadProjection();
  assert.equal(project({id:'u1',name:'Busi',serviceComponentId:'busi',intervalKm:8000},'veh-A'),null);
});

test('S2070: active vehicle projection uses canonical category + component + interval',()=>{
  const project=loadProjection();
  const out=project({id:'a1',vehicleId:'veh-A',name:'Busi',serviceComponentId:'busi',intervalByVehicle:{'veh-A':4000}},'veh-A');
  assert.deepEqual({vehicleId:out.vehicleId,masterCategoryId:out.masterCategoryId,categoryName:out.categoryName,serviceComponentId:out.serviceComponentId,componentName:out.componentName,intervalKm:out.intervalKm},
    {vehicleId:'veh-A',masterCategoryId:'servis-mesin',categoryName:'Servis Mesin',serviceComponentId:'busi',componentName:'Busi',intervalKm:4000});
});

test('S2070: same component on another vehicle stays isolated',()=>{
  const project=loadProjection();
  const a=project({id:'a1',vehicleId:'veh-A',name:'Busi',serviceComponentId:'busi',intervalByVehicle:{'veh-A':4000}},'veh-A');
  const b=project({id:'b1',vehicleId:'veh-B',name:'Busi',serviceComponentId:'busi',intervalByVehicle:{'veh-B':8000}},'veh-B');
  assert.equal(a.vehicleId,'veh-A');
  assert.equal(b.vehicleId,'veh-B');
  assert.equal(a.intervalKm,4000);
  assert.equal(b.intervalKm,8000);
});

test('S2070: renderCatList is strict vehicle-scoped and no longer renders universal rows',()=>{
  const start=src.indexOf('renderCatList(){');
  const end=src.indexOf('\n},\n// openRecommendBox',start);
  assert.ok(start>=0&&end>start);
  const fn=src.slice(start,end);
  assert.match(fn,/String\(c\.vehicleId\)===String\(vid\)/);
  assert.match(fn,/getVehicleServiceCategorySOT\(c,vid\)/);
  assert.match(src,/ServiceInputCatalog \+ VehicleServiceSOT/);
  assert.doesNotMatch(fn,/catVisibleForVehicle\(c,vid\)/);
  assert.doesNotMatch(fn,/Semua kendaraan/);
});
