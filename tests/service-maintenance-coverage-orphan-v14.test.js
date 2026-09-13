const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const car=fs.readFileSync(path.join(root,'car-notes.js'),'utf8');
const bundle=fs.readFileSync(path.join(root,'app-bundle-a.min.js'),'utf8');
const checklist=fs.readFileSync(path.join(root,'modules/vehicle/servis-checklist.js'),'utf8');
let pass=0;
function ok(c,m){if(!c)throw new Error(m);pass++;console.log('PASS',m);}
const ids=[...checklist.matchAll(/\bid:\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
const registry=car.match(/const SERVICE_MAINTENANCE_RULES\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/);
ok(!!registry,'maintenance registry exists');
const rules=[...registry[1].matchAll(/^\s*['"]([^'"]+)['"]\s*:\s*\{/gm)].map(m=>m[1]);
ok(ids.length===30,'KZR checklist contains exactly 30 components');
ok(new Set(ids).size===ids.length,'checklist component IDs are unique');
for(const id of ids)ok(rules.includes(id),'maintenance rule covers '+id);
for(const id of rules)ok(ids.includes(id),'maintenance rule has no orphan '+id);
const conditionOnly=['rantai-keteng-tensioner','kompresi-mesin','selang-tutup-tangki','radiator-water-pump','selang-rem','kebocoran-shock','thermostat'];
for(const id of conditionOnly){const re=new RegExp("['\"]"+id+"['\"]\\s*:\\s*\\{[^}]*maintenanceType:\\s*['\"]condition['\"]");ok(re.test(car),'condition-only component is explicitly classified: '+id);}
ok(bundle.includes("'rantai-keteng-tensioner'"),'bundle A contains condition coverage registry');
ok(/1676/.test(fs.readFileSync(path.join(root,'sw.js'),'utf8')),'cache version bumped to current build');
console.log(`${pass} PASS`);
