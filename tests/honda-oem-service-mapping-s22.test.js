'use strict';
const assert=require('assert'); const fs=require('fs'); const path=require('path');
function load(files,names){const vm=require('vm');const c={console,require,module:{exports:{}},exports:{},window:{}};let code='';for(const f of files)code+=fs.readFileSync(path.join(__dirname,'..',f),'utf8')+'\n';vm.runInNewContext(code,c);return Object.fromEntries(names.map(n=>[n,c.window[n]||c.module.exports]));}
const FIX=fs.readFileSync(path.join(__dirname,'fixtures','vario-125-2-full-catalog-main-pages.txt'),'utf8');
const c=load(['modules/vehicle/servis-checklist.js','modules/vehicle/honda-oem-catalog-master.js','modules/vehicle/honda-oem-service-mapping.js'],['HondaOemCatalogMaster','HondaOemServiceMapping']);
const rows=c.HondaOemCatalogMaster.parse(FIX,{startPage:34,endPage:94});
const out=c.HondaOemServiceMapping.mapRows(rows); const stats=c.HondaOemServiceMapping.stats(out);
assert.deepEqual(stats,{mapped:55,ambiguous:3,unmapped:492,total:550});
assert.equal(out.find(r=>r.oemCode==='19300-KZR-601').serviceComponentId,'thermostat');
for(const code of ['90545-300-000','28223-KZL-840','91002-GA7-701','89216-KVY-960','50381-KZR-600','50382-KZR-600','17510-KZL-C00','91475-GFC-770']) assert.equal(out.find(r=>r.oemCode===code).status,'unmapped',code);
for(const code of ['45126-KZR-601','45156-KZL-940','45157-KZL-940']) { const r=out.find(x=>x.oemCode===code); assert.equal(r.status,'ambiguous'); assert.equal(r.serviceComponentId,null); assert.deepEqual(r.candidates,['selang-rem','minyak-rem']); }
assert.ok(out.filter(r=>r.status==='mapped').every(r=>r.auditReason==='direct part-name evidence'));
const before=JSON.stringify(rows[0]); c.HondaOemServiceMapping.map(rows[0]); assert.equal(JSON.stringify(rows[0]),before);
console.log('S22 Honda OEM mapping quality gate: PASS',stats);
