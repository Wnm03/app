'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
global.ServiceMasterDB={getAllComponents:async()=>[
 {componentId:'oli-mesin',componentName:'Oli Mesin',masterCategoryId:'servis-mesin'},
 {componentId:'v-belt-cvt',componentName:'V-Belt CVT',masterCategoryId:'servis-cvt'},
 {componentId:'aki',componentName:'Aki',masterCategoryId:'kelistrikan'},
 {componentId:'oil-pump',componentName:'Oil Pump',masterCategoryId:'servis-mesin'},
]};
global.VehicleCatalogImport={parseCatalogRows:(text)=>String(text||'').split('\n').filter(Boolean).map((x)=>{const m=x.match(/^([^|]+)\|([^|]+)\|?(.*)$/);return m?{oemCode:m[1],partName:m[2],category:m[3]||'',price:null,raw:x}:{partName:x,oemCode:'',category:'',price:null,raw:x};})};
const api=require('../modules/vehicle/honda-pdf-catalog-auto-import.js');
test('detect K61 BeAT catalog metadata',async()=>{const p=await api.analyze({fileName:'Katalog-Suku-Cadang-Honda-BeAT-POP-eSP-K61.pdf',text:'BEAT & BEAT STREET ESP (ACH110CBF)\nInstruksi penggunaan parts catalog ini telah dibuat pertanggal 10 November 2018.'});assert.equal(p.meta.catalogCode,'K61');assert.match(p.meta.model,/BeAT/);assert.equal(p.meta.catalogDate,'10 November 2018');});
test('build dry run never proposes service-master write',async()=>{const p=await api.analyze({fileName:'K61.pdf',text:'BEAT & BEAT STREET ESP\n12345-ABC-001|Engine Oil|E-1'});const d=api.buildDryRun(p);assert.equal(d.noWrite,true);assert.equal(d.proposedWrites.serviceMasterChanges,false);assert.equal(d.partsDetected,1);});
test('component mapping uses evidence-oriented confidence',async()=>{const p=await api.analyze({fileName:'K61.pdf',text:'12346-ABC-002|Oil Pump|E-11'});assert.equal(p.parts[0].mapping.componentId,'oil-pump');assert.equal(p.parts[0].mapping.confidence,'HIGH');});
