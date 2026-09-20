const fs=require('fs');
const {readCarNotesSource}=require('./helpers/carNotesSource');
const path=require('path');
const root=path.resolve(__dirname,'..');
const car=readCarNotesSource();
const a=fs.readFileSync(path.join(root,'app-bundle-a.min.js'),'utf8');
const b=fs.readFileSync(path.join(root,'app-bundle-b.min.js'),'utf8');
let pass=0;
function ok(c,m){if(!c)throw new Error(m);pass++;console.log('PASS',m);}
// S1863+: checklist adalah proyeksi Service Master (102 komponen = 50 legacy KZR + 52 katalog).
// Registry aturan KZR (SERVICE_MAINTENANCE_RULES) memang hanya mencakup 50 komponen legacy.
const F=require('./helpers/serviceMasterFixture');
const legacyIds=F.LEGACY_CHECKLIST_IDS;
const ids=F.masterItems().map(i=>i.id);
ok(ids.length===F.MASTER_COMPONENT_COUNT,'canonical checklist contains 102 components (50 legacy + 52 catalog expansion)');
ok(legacyIds.length===50&&legacyIds.every(id=>ids.includes(id)),'canonical checklist keeps all 50 legacy components');
const scheduled=['oli-mesin','filter-oli','busi','filter-udara','coolant','celah-klep','oli-gardan','roller-cvt','slide-piece-cvt','boss-pulley-drive-face','v-belt-cvt','kampas-kopling-ganda','mangkok-kopling-ganda','seal-driven-face','per-sentri','pelumasan-cvt-grease','per-cvt','pembersihan-rumah-cvt','bearing-bak-cvt','busa-filter-cvt','throttle-body','isc','injector','filter-fuel-pump','kampas-rem-depan','minyak-rem','kampas-rem-belakang','cakram-rem-depan','kaliper-rem-depan','master-rem-reservoir','tromol-rem-belakang','selang-rem','oli-shockbreaker','engine-mounting-bushing-arm','stel-grease-komstir','bearing-roda','aki','saklar-sistem-penerangan','relay-sekring','filter-kawat-oli-mesin','kabel-gas-standar-kunci','ban-depan','ban-belakang'];
for(const id of scheduled)ok(ids.includes(id),'checklist contains '+id);
for(const id of scheduled)ok(new RegExp("['\"]"+id+"['\"]\s*:").test(car),'maintenance rule contains '+id);
ok(car.includes('_maintenanceProjection?`<span'),'projected category does not expose persisted interval editor');
ok(car.includes('Setiap ${u.intervalHari} hari'),'day-only schedule label exists');
ok(car.includes('resolveReminderCategory(catId,curVehicleId)'),'markServiced resolves projected category');
ok(car.includes('ServiceEventLifecycle.create(entry)'),'markServiced emits canonical service lifecycle');
ok(b.includes('Setiap ${u.intervalHari} hari'),'bundle B contains day-only schedule fix');
console.log(`${pass} PASS`);
