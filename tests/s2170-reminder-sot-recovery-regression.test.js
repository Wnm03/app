const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const load=(file,ctx)=>vm.runInNewContext(read(file),ctx);

function baseContext(){
  const ctx={
    D:{
      vehicles:[
        {id:'A',name:'Vario 125',vehicleType:'motor',sot:{serviceCategories:[{id:'cat-a',vehicleId:'A',name:'Oli Mesin',serviceComponentId:'oli-mesin',masterCategoryId:'servis-mesin',intervalKm:2500,showInReminder:true}]}},
        {id:'B',name:'Scoopy',vehicleType:'motor',sot:{serviceCategories:[{id:'cat-b',vehicleId:'B',name:'Oli Mesin',serviceComponentId:'oli-mesin',masterCategoryId:'servis-mesin',intervalKm:3000,showInReminder:true}]}}
      ],
      sparepartCats:[]
    },
    curVehicleId:'A'
  };
  ctx.globalThis=ctx;
  return ctx;
}

test('S2170 canonical category survives when legacy projection is empty',()=>{
  const c=baseContext();
  load('modules/vehicle/vehicle-car-notes-sot-s2071.js',c);
  assert.equal(c.VehicleCarNotesSOT.getServiceCategories('A').length,1);
  const r=c.VehicleCarNotesSOT.reconcileLegacyCategoryProjection('A');
  assert.equal(r.ok,true);
  assert.equal(r.changed,1);
  assert.equal(c.D.sparepartCats.length,1);
  assert.equal(c.D.sparepartCats[0].vehicleId,'A');
  assert.equal(c.D.sparepartCats[0].serviceComponentId,'oli-mesin');
});

test('S2170 reconciliation is idempotent and never imports another vehicle',()=>{
  const c=baseContext();
  load('modules/vehicle/vehicle-car-notes-sot-s2071.js',c);
  c.D.sparepartCats=[{id:'legacy-b',vehicleId:'B',name:'Oli Mesin',serviceComponentId:'oli-mesin'}];
  const first=c.VehicleCarNotesSOT.reconcileLegacyCategoryProjection('A');
  const second=c.VehicleCarNotesSOT.reconcileLegacyCategoryProjection('A');
  assert.equal(first.changed,1);
  assert.equal(second.changed,0);
  assert.deepEqual(c.D.sparepartCats.map(x=>x.vehicleId).sort(),['A','B']);
});

test('S2170 reminder read does not mutate legacy storage',()=>{
  const c=baseContext();
  c.D.vehicles[0].sot.serviceCategories=[];
  c.D.sparepartCats=[{id:'legacy-a',vehicleId:'A',name:'Oli Mesin',serviceComponentId:'oli-mesin',masterCategoryId:'servis-mesin',intervalKm:2500,showInReminder:true}];
  load('modules/vehicle/vehicle-car-notes-sot-s2071.js',c);
  load('modules/vehicle/vehicle-service-sot.js',c);
  const before=JSON.stringify(c.D.sparepartCats);
  const rows=c.getReminderCategoriesForVehicle('A');
  assert.equal(rows.length,1);
  assert.equal(JSON.stringify(c.D.sparepartCats),before);
  assert.equal(rows[0].vehicleId,'A');
});

test('S2170 reminder source cannot perform a canonical upsert as a render side effect',()=>{
  const src=read('modules/vehicle/vehicle-service-sot.js');
  const pos=src.indexOf('function getReminderCategoriesForVehicle(vehicleId)');
  assert.ok(pos>=0);
  const block=src.slice(pos,pos+2600);
  assert.doesNotMatch(block,/VehicleCarNotesSOT\.upsertServiceCategory\s*\(/);
  assert.match(block,/getServiceCategories\(vehicleId\)/);
});

test('S2170 Kelola Pengingat reconciles canonical SOT before rendering legacy consumer list',()=>{
  const src=read('modules/vehicle/sparepart-servis.js');
  const pos=src.indexOf('renderCatList(){');
  assert.ok(pos>=0);
  const block=src.slice(pos,pos+2600);
  assert.match(block,/VehicleCarNotesSOT\.reconcileLegacyCategoryProjection\(vid\)/);
  assert.match(block,/String\(c\.vehicleId\)===String\(vid\)/);
});
