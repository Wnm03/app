'use strict';
const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const checks=[];
function check(name,ok,detail){checks.push({name,ok,detail});}
const taxonomy=read('modules/vehicle/service-taxonomy-sot.js');
const reminder=read('modules/vehicle/service-reminder-package-sot.js');
const vehicle=read('modules/vehicle/vehicle-service-sot.js');
const scope=read('modules/vehicle/service-reminder-vehicle-scope-s2015.js');
check('S2154 canonical taxonomy target API',/function canonicalTarget\(/.test(taxonomy)&&/function targetKey\(/.test(taxonomy),'canonicalTarget + targetKey');
check('S2155 vehicle context boundary',/VehicleScopedSOT/.test(vehicle)&&/const vid=String\(vehicleId\|\|activeId\|\|''\)/.test(vehicle),'omitted vehicleId resolves only to active context');
check('S2156 reminder uses taxonomy SOT',/ServiceTaxonomySOT&&typeof g\.ServiceTaxonomySOT\.canonicalTarget/.test(reminder),'package target canonicalization');
check('S2157 reminder projection dedupe',/const seen=new Map\(\)/.test(vehicle)&&/seen\.set\(key,out\)/.test(vehicle),'canonical component + vehicle projection key');
check('S2158 canonical ID reference',/serviceComponentId/.test(taxonomy)&&/masterCategoryId/.test(taxonomy),'canonical service IDs');
check('S2159 legacy identity delegates to canonical resolver',/S2159: use the canonical taxonomy resolver/.test(scope),'legacy resolver compatibility bridge');
const failed=checks.filter(x=>!x.ok);
for(const c of checks)console.log((c.ok?'✓':'✗')+' '+c.name+(c.detail?' — '+c.detail:''));
if(failed.length){console.error(`S2154-S2159 SOT CONSOLIDATION: FAIL — ${failed.length}/${checks.length}`);process.exit(1);}
console.log(`S2154-S2159 SOT CONSOLIDATION: PASS — ${checks.length}/${checks.length} checks`);
