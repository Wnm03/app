const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const load=(file,ctx)=>vm.runInNewContext(read(file),ctx,{filename:file});

test('S2171 taxonomy reads generated browser global without window.SERVICE_CHECKLIST_GROUPS',()=>{
  const ctx={__SERVICE_CHECKLIST_GROUPS__:[{masterCategoryId:'servis-mesin',group:'Servis Mesin',items:[{id:'oli-mesin',name:'Oli Mesin'}]}]};
  ctx.globalThis=ctx;
  load('modules/vehicle/service-taxonomy-sot.js',ctx);
  assert.equal(ctx.ServiceTaxonomySOT.groups().length,1);
  assert.equal(ctx.ServiceTaxonomySOT.canonicalTarget({name:'Oli Mesin'}).serviceComponentId,'oli-mesin');
});

test('S2171 built-in reminder labels resolve to canonical components',()=>{
  const ctx={__SERVICE_CHECKLIST_GROUPS__:[{masterCategoryId:'servis-cvt',group:'Servis CVT',items:[{id:'v-belt-cvt',name:'V-Belt CVT'}]},{masterCategoryId:'kelistrikan',group:'Kelistrikan',items:[{id:'aki',name:'Aki'}]}]};
  ctx.globalThis=ctx;
  load('modules/vehicle/service-taxonomy-sot.js',ctx);
  assert.equal(ctx.ServiceTaxonomySOT.canonicalTarget({name:'V-Belt (CVT)'}).serviceComponentId,'v-belt-cvt');
  assert.equal(ctx.ServiceTaxonomySOT.canonicalTarget({name:'Aki (cek/ganti)'}).serviceComponentId,'aki');
});

test('S2171 reminder projection preserves unresolved legacy category instead of silently dropping it',()=>{
  const ctx={
    __SERVICE_CHECKLIST_GROUPS__:[],
    curVehicleId:'A',
    D:{sparepartCats:[{id:'legacy-1',vehicleId:'A',name:'Kategori Lama',intervalKm:1000,showInReminder:true}],servisLogs:[],serviceReminderPackages:[]}
  };
  ctx.globalThis=ctx;
  load('modules/vehicle/service-taxonomy-sot.js',ctx);
  load('modules/vehicle/service-runtime-projection-sot-s2166.js',ctx);
  ctx.getReminderCategoriesForVehicle=()=>ctx.D.sparepartCats.slice();
  const rows=ctx.ServiceRuntimeProjectionSOT.reminderCatalog(ctx.D,'A');
  assert.equal(rows.length,1);
  assert.equal(rows[0].name,'Kategori Lama');
  assert.equal(rows[0].vehicleId,'A');
});
