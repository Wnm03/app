'use strict';
// S1829 contract (rewritten S1877): validates the BEHAVIOR of the JSON BBM import
// (source-id retention, id/content dedupe, generated id for legacy rows, vehicleId
// fallback) by executing the real import block from backup-restore.js in a vm sandbox,
// instead of matching literal implementation strings that change with each hardening.
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'../modules/shared/backup-restore.js'),'utf8');
function ok(name,cond){if(!cond)throw new Error(name);console.log('PASS',name)}

function sliceBetween(text,startMarker,endMarker){
  const a=text.indexOf(startMarker);
  if(a<0)throw new Error('marker not found: '+startMarker);
  const b=text.indexOf(endMarker,a+startMarker.length);
  if(b<0)throw new Error('marker not found: '+endMarker);
  return text.slice(a,b);
}
function extractFunction(text,name){
  const a=text.indexOf('function '+name+'(');
  if(a<0)throw new Error('function not found: '+name);
  const b=text.indexOf('\n}\n',a);
  return text.slice(a,b+3);
}

// --- BBM JSON import: run the real block ---
const bbmBlock=sliceBetween(src,"if(Array.isArray(parsed.bbmLogs)){","if(Array.isArray(parsed.servisLogs)){");
const fpFn=extractFunction(src,'_contentImportFingerprint');
function runBbmImport(existing,incoming,vehId){
  let gen=0;
  const sandbox={
    D:{bbmLogs:existing.slice()},parsed:{bbmLogs:incoming},vehId,
    uid:()=>`new-${++gen}`,skipCount:0,bbmCount:0,console
  };
  vm.createContext(sandbox);
  vm.runInContext(fpFn+'\n'+bbmBlock,sandbox);
  return {bbm:sandbox.D.bbmLogs,skipCount:sandbox.skipCount,bbmCount:sandbox.bbmCount};
}

const existing=[{id:'bbm-1',vehicleId:'v1',date:'2026-01-01',liter:3}];
const incoming=[
  {id:'bbm-1',vehicleId:'v1',date:'2026-01-01',liter:3},   // same source id -> skipped
  {id:'bbm-2',vehicleId:'v2',date:'2026-01-02',liter:4},   // new id, explicit vehicle -> kept as-is
  {vehicleId:'v1',date:'2026-01-03',liter:5},              // legacy row without id -> generated id
  {id:'bbm-4',date:'2026-01-04',liter:6},                  // no vehicleId -> falls back to selected vehicle
  {id:'bbm-5',vehicleId:'v2',date:'2026-01-02',liter:4}    // different id, identical content to bbm-2 -> content dedupe
];
const r=runBbmImport(existing,incoming,'v-selected');
const byId=id=>r.bbm.filter(x=>x.id===id);

ok('round-trip repeated BBM id is not duplicated',byId('bbm-1').length===1);
ok('BBM JSON import preserves source id',byId('bbm-2').length===1&&byId('bbm-4').length===1);
ok('vehicleId from imported BBM is preserved',byId('bbm-2')[0].vehicleId==='v2');
ok('missing vehicleId falls back to selected vehicle',byId('bbm-4')[0].vehicleId==='v-selected');
ok('legacy BBM without id still receives generated id',r.bbm.some(x=>/^new-\d+$/.test(x.id)&&x.date==='2026-01-03'));
ok('identical-content BBM under a new id is deduped by content fingerprint',!r.bbm.some(x=>x.id==='bbm-5')&&r.skipCount>=1);
ok('import count matches rows actually added',r.bbmCount===r.bbm.length-existing.length&&r.bbmCount===3);
ok('re-importing the same file is idempotent',(()=>{
  const again=runBbmImport(r.bbm,incoming,'v-selected');
  return again.bbm.length===r.bbm.length&&again.bbmCount===0;
})());

// --- Service JSON import: contract kept structural (block is large and depends on many globals) ---
const svcBlock=sliceBetween(src,"if(Array.isArray(parsed.servisLogs)){","const _p23JsonValidation");
ok('service JSON import retains original service id',/id:\s*\(s&&s\.id\)\|\|uid\(\)/.test(svcBlock));
ok('service JSON import retains vehicleId',/const restoredVehicleId=s\.vehicleId\|\|vehId;/.test(svcBlock)&&/vehicleId:restoredVehicleId/.test(svcBlock));
ok('service JSON import dedupes by source id',/if\(s&&s\.id&&D\.servisLogs\.find\(x=>x\.id===s\.id\)\)return;/.test(svcBlock));
console.log('S1829: 11/11 PASS');
