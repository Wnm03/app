'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../modules/vehicle/service-master-data.generated.js').SERVICE_MASTER_DATA;

test('Cumulative S1864/S1865 master has 13 categories and exactly 102 unique components',()=>{
 assert.equal(D.masterCategoryCount,13);
 assert.equal(D.componentCount,102);
 assert.equal(D.masterCategories.length,13);
 assert.equal(D.components.length,102);
 assert.equal(new Set(D.components.map(x=>x.componentId)).size,102);
});

test('S1864 preserves every legacy component ID',()=>{
 const legacy=['oli-mesin','filter-oli','busi','celah-klep','rantai-keteng-tensioner','kompresi-mesin','v-belt-cvt','roller-cvt','throttle-body','injector','filter-fuel-pump','coolant','kampas-rem-depan','aki','bearing-roda','filter-udara','oli-gardan','kabel-gas-standar-kunci'];
 const ids=new Set(D.components.map(x=>x.componentId));
 for(const id of legacy) assert.equal(ids.has(id),true,id);
});

test('Cumulative category expansion matches planned counts',()=>{
 const expected={'servis-mesin':15,'servis-cvt':18,'sistem-injeksi-pgmfi':5,'sistem-bahan-bakar':4,'sistem-pendingin':6,'sistem-pengereman':11,'suspensi':8,'sistem-kemudi':3,'kelistrikan':10,'roda':7,'filter-udara':1,'final-gear':7,'body-kontrol':7};
 for(const [id,count] of Object.entries(expected)) assert.equal(D.components.filter(x=>x.masterCategoryId===id).length,count,id);
});

test('Cumulative catalog components do not invent maintenance intervals',()=>{
 const ids=['oil-pump','bearing-swingarm','seal-klep','driven-face-cvt','sensor-o2','fuel-pump-assembly','kipas-radiator','seal-piston-kaliper','shock-belakang','bearing-komstir','acg-starter','bearing-roda-depan','gear-final-drive','kunci-kontak'];
 for(const id of ids){const x=D.components.find(c=>c.componentId===id);assert.ok(x);assert.equal(x.intervalKm,null,id);assert.equal(x.intervalTimeMonths,null,id);assert.equal(x.resetType,null,id);}
});

test('Cumulative catalog provenance is present and does not embed images',()=>{
 assert.equal(Array.isArray(D.catalogSources),true);
 assert.equal(D.catalogSources[0].modelCode,'KZRJ');
 assert.match(D.catalogSources[0].url,/hondacengkareng\.com\/catalogs\/katalog-honda-vario-techno-125-2/);
 const source=fs.readFileSync(path.join(__dirname,'..','data','database-kategori-komponen-servis.json'),'utf8');
 assert.equal(/data:image\//.test(source),false);
});

test('Cumulative verified catalogRefs are arrays; blank means not yet locked',()=>{
 for(const x of D.components){assert.equal(Array.isArray(x.catalogRefs),true,x.componentId);}
 const verified=D.components.filter(x=>x.catalogRefs.length>0);
 assert.ok(verified.length>0);
});
