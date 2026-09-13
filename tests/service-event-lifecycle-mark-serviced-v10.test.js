'use strict';
// v10: lifecycle contract test for the Reminder -> D.servisLogs -> ServiceEventLifecycle path.
// Static by design: this patch ZIP is deployable without the full app test harness.
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const car=fs.readFileSync(path.join(root,'car-notes.js'),'utf8');
const bundle=fs.readFileSync(path.join(root,'app-bundle-b.min.js'),'utf8');
let pass=0;
function ok(c,m){if(!c)throw new Error(m);pass++;console.log('PASS',m);}

ok(car.includes('D.servisLogs.push(entry);'),'markServiced persists the canonical service event in D.servisLogs');
ok(car.includes("if(typeof ServiceEventLifecycle!=='undefined')ServiceEventLifecycle.create(entry);"),'markServiced calls the canonical lifecycle create bridge');
ok(car.includes("AIBus.emit(\"vehicle.updated\",{kind:\"servis\",action:\"create\""),'fallback vehicle.updated bridge remains present');
ok(car.includes("if(entry.txLinkId&&typeof AIBus!=="),'finance event remains limited to transactions created by markServiced');
ok(bundle.includes('ServiceEventLifecycle={'),'production bundle contains ServiceEventLifecycle bridge');
ok(bundle.includes('service.updated'),'production bundle emits service.updated');
ok(bundle.includes('vehicle.updated'),'production bundle retains backward-compatible vehicle.updated bridge');

// Guard against accidentally creating a second persisted service-event store.
const forbiddenStorePatterns=[/D\.serviceEvents\s*=/,/D\.serviceEvents\.push\(/,/SERVICE_EVENTS\s*=\s*\[\]/];
for(const re of forbiddenStorePatterns)ok(!re.test(car),'no secondary persisted service-event store: '+re);

console.log(`${pass} PASS`);
