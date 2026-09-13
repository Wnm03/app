const assert=require('assert');
const fs=require('fs');
const src=fs.readFileSync(require.resolve('../car-notes.js'),'utf8');
const m=src.match(/validateServiceOdometer\(\{vehicleId,km,date,excludeId\}=\{\}\)\{([\s\S]*?)\n\},\n\nasync _saveInner/);
assert(m,'P22 validator missing');
const validate=new Function('D','getVehicleKm',`return function validateServiceOdometer({vehicleId,km,date,excludeId}={}){${m[1]}}`);
function v(D,current){return validate(D,()=>current);}
const base={servisLogs:[
{id:'s1',vehicleId:'A',date:'2026-01-10',km:10000},
{id:'s2',vehicleId:'A',date:'2026-03-10',km:11000}
]};
assert.strictEqual(v(base,12000)({vehicleId:'A',km:10500,date:'2026-02-10'}).ok,true);
assert.strictEqual(v(base,12000)({vehicleId:'A',km:9000,date:'2026-02-10'}).code,'below_previous_service');
assert.strictEqual(v(base,12000)({vehicleId:'A',km:12000,date:'2026-02-10'}).code,'above_next_service');
assert.strictEqual(v(base,12000)({vehicleId:'A',km:12500,date:'2026-02-10'}).code,'above_current_odometer');
assert.strictEqual(v(base,12000)({vehicleId:'B',km:50000,date:'2026-02-10'}).ok,false); // current odometer guard still applies
assert.strictEqual(v({servisLogs:[]},50000)({vehicleId:'B',km:50000,date:'2026-02-10'}).ok,true);
assert.strictEqual(v({servisLogs:[]},50000)({vehicleId:'B',km:0,date:'2026-02-10'}).ok,true);
console.log('P22 service odometer integrity: 7/7 PASS');
