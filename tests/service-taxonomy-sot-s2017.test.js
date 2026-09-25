'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function load(groups){
  const root={SERVICE_CHECKLIST_GROUPS:groups,console};
  vm.createContext(root);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','modules/vehicle/service-taxonomy-sot.js'),'utf8'),root,{filename:'service-taxonomy-sot.js'});
  return root.ServiceTaxonomySOT;
}

const groups=Array.from({length:13},(_,i)=>({masterCategoryId:'cat-'+i,group:'Kategori '+i,icon:'🔧',items:[]}));
groups[0].items=[{id:'filter-udara',name:'Filter Udara'},{id:'oli-mesin',name:'Oli Mesin'}];
groups[1].items=[{id:'v-belt-cvt',name:'V-Belt CVT'}];
const sot=load(groups);
assert.equal(sot.categories().length,13,'taxonomy must expose one canonical category list');
assert.equal(sot.components().length,3,'taxonomy must expose components under canonical categories');
assert.equal(sot.componentById('v-belt-cvt').masterCategoryId,'cat-1');
assert.equal(sot.resolve({serviceComponentId:'filter-udara'}).category.name,'Kategori 0');
assert.equal(sot.resolve({name:'Filter Udara'}).serviceComponentId,'filter-udara');
assert.equal(sot.resolve({name:'Saringan udara'}).serviceComponentId,'filter-udara');
assert.equal(sot.resolve({name:'tidak dikenal'}),null,'unknown name must not invent taxonomy');
assert.deepEqual(Array.from(sot.categoriesForComponents(['filter-udara','v-belt-cvt'])).map(x=>x.id),['cat-0','cat-1']);

const spare=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/sparepart-servis.js'),'utf8');
assert.match(spare,/ServiceTaxonomySOT\.resolve/);
assert.match(spare,/ServiceTaxonomySOT\.categories\(\)/);
assert.match(spare,/canonical:true/);

const bundle=fs.readFileSync(path.join(__dirname,'..','app-bundle-b.min.js'),'utf8');
assert.match(bundle,/SERVICE-TAXONOMY-SOT-2017/);
assert.match(bundle,/function groups\(\)\{return typeof ServiceTaxonomySOT/);
assert.match(bundle,/S2017: ServiceTaxonomySOT is the single canonical identity/);
assert.match(bundle,/const canonicalTargets=st\.targets\.map/);
assert.match(bundle,/ServiceTaxonomySOT\.resolve\(\{masterCategoryId:t\.masterCategoryId,serviceComponentId:t\.serviceComponentId/);
assert.match(bundle,/const hasSot=typeof ServiceTaxonomySOT/);

console.log('S2017 service taxonomy SOT regression: PASS');
