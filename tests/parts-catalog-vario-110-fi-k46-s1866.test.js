'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const K46=require('../data/parts-catalog-vario-110-fi-k46.json');
const KZRJ=require('../data/parts-catalog-vario-techno-125-kzrj.json');
const DB=require('../modules/vehicle/parts-catalog-database.js');

test('S1866 K46 identity is isolated from KZRJ',()=>{
 assert.equal(K46.catalogCode,'K46');
 assert.equal(K46.model,'Honda Vario 110 FI');
 assert.deepEqual(K46.years,['2014','2015']);
 assert.deepEqual(K46.engineSerial,['JFH1E']);
 assert.deepEqual(K46.frameSerial,['MH1JFH1']);
 assert.equal(KZRJ.catalogCode,'KZRJ');
});
test('S1866 K46 dataset has unique verified part numbers and declared sections',()=>{
 assert.equal(new Set(K46.parts.map(p=>p.partNumber)).size,K46.parts.length);
 const sections=new Set(K46.sections.map(s=>s.id));
 for(const p of K46.parts)assert.ok(sections.has(p.section),p.partNumber);
});
test('S1866 all K46 component mappings point to cumulative master',()=>{
 const M=require('../modules/vehicle/service-master-data.generated.js').SERVICE_MASTER_DATA;
 const ids=new Set(M.components.map(c=>c.componentId));
 for(const p of K46.parts)for(const id of p.componentIds)assert.ok(ids.has(id),`${p.partNumber}:${id}`);
});
test('S1866 runtime exposes K46 and KZRJ as separate lazy catalogs',async()=>{
 const catalogs=DB.getAvailableCatalogs();
 assert.deepEqual(catalogs.map(x=>x.catalogCode),['KZRJ','K46']);
 assert.equal(DB.defaultCatalog,'KZRJ');
 assert.equal((await DB.getPart('16700-K46-N01','K46')).partNumber,'16700-K46-N01');
 assert.equal(await DB.getPart('23100-KZR-601','K46'),null);
 assert.equal((await DB.getPart('23100-KZR-601','KZRJ')).partNumber,'23100-KZR-601');
 assert.equal((await DB.getPart('23100-K25-901','K46')).partNumber,'23100-K25-901');
});
test('S1866 K46 search can be explicitly scoped without cross-model leakage',async()=>{
 const k46=await DB.search('fuel',{catalogId:'K46'});
 assert.ok(k46.some(x=>x.partNumber==='16700-K46-N01'));
 assert.ok(k46.every(x=>!x.partNumber.includes('KZR')));
});
test('S1866 K46 catalog contains core engine/CVT/fuel/brake/electrical/wheel groups',()=>{
 for(const id of ['oil-pump','rantai-keteng-tensioner','v-belt-cvt','roller-cvt','kampas-kopling-ganda','injector','fuel-pump-assembly','filter-udara','kampas-rem-depan','kampas-rem-belakang','ban-depan','ban-belakang','bearing-roda-depan','aki','ignition-coil','kabel-harness','kunci-kontak','sensor-o2']){
  assert.ok(K46.parts.some(p=>p.componentIds.includes(id)),id);
 }
});
test('S1866 no images/PDF payload is embedded in K46 JSON',()=>{
 const raw=fs.readFileSync(path.join(__dirname,'..','data/parts-catalog-vario-110-fi-k46.json'),'utf8');
 assert.equal(/data:image\//.test(raw),false);
 assert.equal(raw.includes('JVBERi0'),false);
});
