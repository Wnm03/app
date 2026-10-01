#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const matrix=JSON.parse(fs.readFileSync(path.join(root,'docs/SOT-OWNERSHIP-MATRIX-S2153.json'),'utf8'));
const required={
  serviceEvent:['ServiceEventSOT','D.servisLogs'],
  stock:['StockCommandSOT','D.partsStock'],
  activeVehicleContext:['VehicleScopedSOT','curVehicleId'],
  serviceTaxonomy:['ServiceTaxonomySOT','SERVICE_CHECKLIST_GROUPS'],
  reminderPlan:['ServiceReminderPackageSOT','D.serviceReminderPackages']
};
const text=(p)=>fs.readFileSync(p,'utf8');
const checks=[];
const all=fs.readdirSync(path.join(root,'modules'),{withFileTypes:true});
function walk(dir){let out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','backups','dist'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())out=out.concat(walk(p));else if(e.isFile()&&p.endsWith('.js'))out.push(p);}return out;}
const files=walk(path.join(root,'modules'));
for(const [domain,[owner,storage]] of Object.entries(required)){
  const ownerHits=files.filter(f=>text(f).includes(owner));
  const storageHits=files.filter(f=>text(f).includes(storage));
  checks.push({domain,owner,storage,ownerFiles:ownerHits.length,storageConsumerFiles:storageHits.length,ok:ownerHits.length>0&&storageHits.length>0});
}
const matrixDomains=new Set(matrix.domains.map(x=>x.domain));
checks.push({domain:'matrixCoverage',ok:Object.keys(required).every(k=>matrixDomains.has(k))});
const failed=checks.filter(x=>!x.ok);
console.log(`S2153 SOT ARCHITECTURE MAP: ${failed.length?'FAIL':'PASS'} — ${checks.length-failed.length}/${checks.length} checks`);
for(const c of checks)console.log(`${c.ok?'✓':'✗'} ${c.domain}${c.ownerFiles!=null?` ownerFiles=${c.ownerFiles} storageConsumers=${c.storageConsumerFiles}`:''}`);
process.exitCode=failed.length?1:0;
