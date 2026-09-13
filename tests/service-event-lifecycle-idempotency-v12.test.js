// v12: prevent duplicate concurrent markServiced() from double-writing service/finance/stock.
const fs=require('fs'),assert=require('assert'),path=require('path');
const car=fs.readFileSync(path.join(__dirname,'..','car-notes.js'),'utf8');
const bundle=fs.readFileSync(path.join(__dirname,'..','app-bundle-a.min.js'),'utf8');
function ok(c,m){assert.ok(c,m);console.log('PASS',m)}
ok(car.includes('Servis._markServicedInFlight=Servis._markServicedInFlight instanceof Set?Servis._markServicedInFlight:new Set();'),'source has in-flight Set');
ok(car.includes('if(Servis._markServicedInFlight.has(_markGuardKey))return;'),'duplicate concurrent call is ignored');
ok(car.includes('Servis._markServicedInFlight.add(_markGuardKey);'),'guard is armed before async confirmation');
ok(car.includes('const _clearMarkGuard=()=>Servis._markServicedInFlight.delete(_markGuardKey);'),'guard cleanup exists');
ok(car.includes("_clearMarkGuard();return;"),'cancel paths release the guard');
ok(car.includes('_clearMarkGuard();\nreturn entry;'),'successful path releases the guard');
ok(car.includes("const _markGuardKey=`${curVehicleId||''}::${cat.id}::${actionType||'default'}`;"),'guard is isolated by vehicle/category/action');
ok(bundle.includes('Servis._markServicedInFlight')&&bundle.includes('_markGuardKey'),'production bundle contains the same idempotency guard');
console.log('TOTAL 8 PASS');
