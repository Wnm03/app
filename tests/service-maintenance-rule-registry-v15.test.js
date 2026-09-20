const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const car=fs.readFileSync(path.join(root,'car-notes.js'),'utf8');
const bundle=fs.readFileSync(path.join(root,'app-bundle-a.min.js'),'utf8');
let pass=0;
function ok(c,m){if(!c)throw new Error(m);pass++;console.log('PASS',m);}
// S1863+: checklist adalah proyeksi Service Master (102 komponen = 50 legacy KZR + 52 katalog).
// Registry aturan KZR (SERVICE_MAINTENANCE_RULES) memang hanya mencakup 50 komponen legacy.
const F=require('./helpers/serviceMasterFixture');
const legacyIds=F.LEGACY_CHECKLIST_IDS;
const ids=F.masterItems().map(i=>i.id);
const registry=car.match(/const SERVICE_MAINTENANCE_RULES\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/);
ok(!!registry,'maintenance registry exists');
ok(ids.length===F.MASTER_COMPONENT_COUNT,'cumulative checklist contains 102 components (50 legacy KZR + 52 catalog expansion)');
ok(legacyIds.length===50&&legacyIds.every(id=>ids.includes(id)),'KZR checklist keeps its 50 legacy components');
const rules=[...registry[1].matchAll(/^\s*['"]([^'"]+)['"]\s*:\s*\{/gm)].map(m=>m[1]);
ok(rules.length===50,'maintenance registry contains 50 rules');
ok(new Set(rules).size===rules.length,'maintenance rule IDs are unique');
for(const id of legacyIds)ok(rules.includes(id),'rule covers '+id);
for(const id of rules)ok(ids.includes(id),'no orphan rule '+id);
ok(car.includes('function validateMaintenanceRuleRegistry'),'validator exists in source');
ok(bundle.includes('function validateMaintenanceRuleRegistry'),'validator exists in bundle A');
ok(/window\.validateMaintenanceRuleRegistry/.test(car),'validator exposed globally');
ok(/kw-cache-v\d+/.test(fs.readFileSync(path.join(root,'sw.js'),'utf8')),'service-worker cache uses a numeric build version');
console.log(`${pass} PASS`);
