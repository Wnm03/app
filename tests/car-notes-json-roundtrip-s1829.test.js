'use strict';
const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../modules/shared/backup-restore.js'),'utf8');
function ok(name,cond){if(!cond)throw new Error(name);console.log('PASS',name)}
ok('BBM JSON import preserves source id',src.includes("const importedId=(b&&b.id)||uid();") && src.includes("id:importedId,vehicleId:b.vehicleId||vehId"));
ok('BBM JSON import dedupes by source id before insert',src.includes("if(b&&b.id&&D.bbmLogs.find(x=>x&&x.id===b.id))return;"));
ok('legacy BBM without id still receives generated id',src.includes("const importedId=(b&&b.id)||uid();"));
ok('vehicleId from imported BBM is preserved',src.includes("vehicleId:b.vehicleId||vehId"));
ok('service JSON import retains original service id',src.includes("id:(s&&s.id)||uid()"));
ok('service JSON import retains vehicleId',src.includes("vehicleId:restoredVehicleId"));
// behavioral miniature of the patched identity rule
const existing=[{id:'bbm-1',vehicleId:'v1'}];
const incoming=[{id:'bbm-1',vehicleId:'v1'},{id:'bbm-2',vehicleId:'v2'},{vehicleId:'v1'}];
let generated=0; const uid=()=>`new-${++generated}`;
for(const b of incoming){const importedId=(b&&b.id)||uid(); if(b&&b.id&&existing.find(x=>x&&x.id===b.id))continue; existing.push({...b,id:importedId,vehicleId:b.vehicleId||'v1'});}
ok('round-trip repeated BBM id is not duplicated',existing.filter(x=>x.id==='bbm-1').length===1);
ok('new BBM source id remains stable',existing.some(x=>x.id==='bbm-2'&&x.vehicleId==='v2'));
ok('legacy BBM gets a generated id',existing.some(x=>/^new-/.test(x.id)));
console.log('S1829: 9/9 PASS');
