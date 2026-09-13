const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const car=fs.readFileSync(path.join(root,'car-notes.js'),'utf8');
const a=fs.readFileSync(path.join(root,'app-bundle-a.min.js'),'utf8');
const checklist=fs.readFileSync(path.join(root,'modules/vehicle/servis-checklist.js'),'utf8');
let pass=0;
function ok(c,m){if(!c)throw new Error(m);pass++;console.log('PASS',m);}
const ids=[...checklist.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
ok(ids.length===46,'canonical checklist contains 46 components');
const scheduled=['oli-mesin','filter-oli','busi','filter-udara','coolant','celah-klep','oli-gardan','roller-cvt','slide-piece-cvt','boss-pulley-drive-face','v-belt-cvt','kampas-kopling-ganda','mangkok-kopling-ganda','seal-driven-face','per-sentri','pelumasan-cvt-grease','per-cvt','pembersihan-rumah-cvt','bearing-bak-cvt','busa-filter-cvt','throttle-body','isc','injector','filter-fuel-pump','kampas-rem-depan','minyak-rem','kampas-rem-belakang','oli-shockbreaker','engine-mounting-bushing-arm','stel-grease-komstir','bearing-roda','aki','saklar-sistem-penerangan','relay-sekring','filter-kawat-oli-mesin','kabel-gas-standar-kunci','ban-depan','ban-belakang'];
for(const id of scheduled)ok(ids.includes(id),'checklist contains '+id);
for(const id of scheduled)ok(new RegExp("['\"]"+id+"['\"]\s*:").test(car),'maintenance rule contains '+id);
ok(car.includes('_maintenanceProjection?`<span'),'projected category does not expose persisted interval editor');
ok(car.includes('Setiap ${u.intervalHari} hari'),'day-only schedule label exists');
ok(car.includes('resolveReminderCategory(catId,curVehicleId)'),'markServiced resolves projected category');
ok(car.includes('ServiceEventLifecycle.create(entry)'),'markServiced emits canonical service lifecycle');
ok(a.includes('Setiap ${u.intervalHari} hari'),'bundle A contains day-only schedule fix');
console.log(`${pass} PASS`);
