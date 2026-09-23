const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'); const vm=require('vm');
const src=fs.readFileSync('modules/vehicle/service-session-sot.js','utf8');
function api(D){const ctx={console,D,curVehicleId:'v1',save:()=>{}};vm.createContext(ctx);vm.runInContext(src,ctx);return ctx.ServiceSessionSOT;}
test('Overhaul/Turun Mesin is a job type under Servis Mesin, not a component',()=>{
 const A=api({servisLogs:[]}); const j=A.jobType('overhaul_turun_mesin');
 assert.equal(j.masterCategoryId,'servis-mesin'); assert.equal(j.label,'Overhaul / Turun Mesin');
});
test('candidate grouping only uses explicit transaction/batch evidence',()=>{
 const D={servisLogs:[{id:'a',vehicleId:'v1',date:'2025-01-01',txLinkId:'tx1'},{id:'b',vehicleId:'v1',date:'2025-01-01',txLinkId:'tx1'},{id:'c',vehicleId:'v1',date:'2025-01-01'}]};
 const A=api(D); const gs=A.candidateGroups('v1'); assert.equal(gs.length,1); assert.equal(JSON.stringify(gs[0].ids),JSON.stringify(['a','b']));
});
test('manual session linking preserves record ids and requires same vehicle',()=>{
 const D={servisLogs:[{id:'a',vehicleId:'v1'},{id:'b',vehicleId:'v1'}]}; const A=api(D); const r=A.linkManual(['a','b'],'overhaul_turun_mesin');
 assert.equal(r.ok,true); assert.equal(D.servisLogs[0].id,'a'); assert.equal(D.servisLogs[0].sessionId,D.servisLogs[1].sessionId); assert.equal(D.servisLogs[0].serviceJobType,'overhaul_turun_mesin');
});
test('existing sessions are not re-grouped',()=>{
 const D={servisLogs:[{id:'a',vehicleId:'v1',sessionId:'s1'},{id:'b',vehicleId:'v1',txLinkId:'tx1'}]}; const A=api(D); const r=A.linkManual(['a','b'],'repair'); assert.equal(r.ok,false); assert.equal(r.code,'already_sessionized');
});
