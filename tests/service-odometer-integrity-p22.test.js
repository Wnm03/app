const assert=require('assert');
const fs=require('fs');
const {readServisSource}=require('./helpers/carNotesSource');
const src=readServisSource();
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
// P24 regression: production defines compareServiceHistoryRecency globally.
// The comparator returns <0 when `a` is newer than `b` (newer-first sort).
// Validator must therefore treat rel<0 as `next`, rel>0 as `previous`.
global.compareServiceHistoryRecency=(a,b)=>{
  const da=Date.parse(String(a&&a.date||'')+'T00:00:00');
  const db=Date.parse(String(b&&b.date||'')+'T00:00:00');
  if(Number.isFinite(da)&&Number.isFinite(db)&&da!==db)return db-da;
  const ak=Number(a&&a.km),bk=Number(b&&b.km);
  if(Number.isFinite(ak)&&Number.isFinite(bk)&&ak!==bk)return bk-ak;
  return String(b&&b.id||'').localeCompare(String(a&&a.id||''));
};
const prod=validate(base,12000);
assert.strictEqual(prod({vehicleId:'A',km:10500,date:'2026-02-10'}).ok,true);
assert.strictEqual(prod({vehicleId:'A',km:9000,date:'2026-02-02'}).code,'below_previous_service');
assert.strictEqual(prod({vehicleId:'A',km:12000,date:'2026-02-10'}).code,'above_next_service');
delete global.compareServiceHistoryRecency;
console.log('P22/P24 service odometer integrity: 10/10 PASS');
