const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const load=(file,ctx)=>vm.runInNewContext(read(file),ctx,{filename:file});

function browserCtx(){
  const ctx={__SERVICE_CHECKLIST_GROUPS__:[
    {masterCategoryId:'servis-mesin',group:'Servis Mesin',items:[{id:'oli-mesin',name:'Oli Mesin',linkCat:true}]},
    {masterCategoryId:'servis-cvt',group:'Servis CVT',items:[{id:'v-belt-cvt',name:'V-Belt CVT',linkCat:true}]}
  ]};
  ctx.globalThis=ctx;
  ctx.window=ctx;
  return ctx;
}

test('S2172 ServiceInputCatalog uses generated browser taxonomy global without SERVICE_CHECKLIST_GROUPS',()=>{
  const c=browserCtx();
  load('modules/vehicle/service-input-catalog.js',c);
  assert.equal(c.ServiceInputCatalog.groups().length,2);
  assert.equal(c.ServiceInputCatalog.itemById('v-belt-cvt').item.name,'V-Belt CVT');
});

test('S2172 Honda OEM adapter uses generated browser taxonomy global without SERVICE_CHECKLIST_GROUPS',()=>{
  const c=browserCtx();
  load('modules/vehicle/honda-oem-service-mapping.js',c);
  assert.match(read('modules/vehicle/honda-oem-service-mapping.js'),/__SERVICE_CHECKLIST_GROUPS__/);
  assert.equal(typeof c.HondaOemServiceMapping,'object');
  assert.match(read('modules/vehicle/honda-oem-service-mapping.js'),/__SERVICE_CHECKLIST_GROUPS__/);
});

test('S2172 history normalizer reads generated browser taxonomy global',()=>{
  const c=browserCtx();
  c.global=c;
  c.ServiceInputCatalog={itemById:()=>null,infer:()=>null};
  load('modules/vehicle/service-history-sot-normalizer.js',c);
  assert.equal(typeof c.ServiceHistorySOTNormalizer,'object');
  const fn=c.ServiceHistorySOTNormalizer.normalizeOne;
  assert.equal(typeof fn,'function');
  const out=fn({id:'x',serviceComponentId:'oli-mesin',item:'Oli Mesin'});
  assert.equal(out.serviceComponentId,'oli-mesin');
});

test('S2172 source guards the remaining checklist consumers against missing direct browser binding',()=>{
  const checks=[
    ['modules/vehicle/servis.js','__SERVICE_CHECKLIST_GROUPS__'],
    ['modules/vehicle/sparepart-servis.js','__SERVICE_CHECKLIST_GROUPS__']
  ];
  for(const [file,needle] of checks)assert.match(read(file),new RegExp(needle.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')));
});
