'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../data/parts-catalog-vario-techno-125-kzrj.json');
const DB=require('../modules/vehicle/parts-catalog-database.js');

test('S1865 catalog source is KZRJ and no images are embedded',()=>{
 assert.equal(D.catalogCode,'KZRJ');
 assert.deepEqual(D.years,['2013','2014','2015']);
 assert.equal(D.parts.length,103);
 assert.equal(/data:image\//.test(fs.readFileSync(path.join(__dirname,'..','data/parts-catalog-vario-techno-125-kzrj.json'),'utf8')),false);
});
test('S1865 part numbers are unique and all section refs are declared',()=>{
 assert.equal(new Set(D.parts.map(p=>p.partNumber)).size,D.parts.length);
 const sections=new Set(D.sections.map(s=>s.id));
 for(const p of D.parts)assert.equal(sections.has(p.section),true,p.partNumber);
});
test('S1865 every catalog mapping points to an existing cumulative 102-component master',()=>{
 const M=require('../modules/vehicle/service-master-data.generated.js').SERVICE_MASTER_DATA;
 const ids=new Set(M.components.map(c=>c.componentId));
 for(const p of D.parts)for(const id of p.componentIds)assert.equal(ids.has(id),true,`${p.partNumber}:${id}`);
});
test('S1865 API retrieves part, component mapping and section records',async()=>{
 const belt=await DB.getPart('23100-KZR-601');
 assert.equal(belt.componentIds.includes('v-belt-cvt'),true);
 assert.equal((await DB.getPartsByComponent('bearing-driven-face')).length,2);
 assert.equal((await DB.getPartsBySection('E-17')).length>0,true);
 assert.equal((await DB.search('6203UU')).some(x=>x.partNumber==='91051-KZR-601'),true);
 assert.equal(DB.jsonUrl,'data/parts-catalog-vario-techno-125-kzrj.json');
});
test('S1865 verified catalog includes core CVT/final-drive/PGM-FI/engine groups',()=>{
 for(const id of ['v-belt-cvt','roller-cvt','driven-face-cvt','bearing-driven-face','needle-bearing-cvt','gear-final-drive','drive-shaft','countershaft','bearing-final-gear','oil-seal-final-gear','sensor-o2','sensor-suhu-mesin','oil-pump','bearing-swingarm','seal-klep','camshaft-rocker-arm','klep-intake-exhaust']){
  assert.ok(D.parts.some(p=>p.componentIds.includes(id)),id);
 }
});
