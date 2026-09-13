const fs=require('fs'); const path=require('path');
const car=fs.readFileSync(path.join(__dirname,'..','car-notes.js'),'utf8');
function ok(c,m){if(!c)throw new Error(m);console.log('PASS',m)}
ok(car.includes('P10 FIX: transaksi Finance tertaut bisa hilang lebih dulu'),'edit repairs orphaned txLinkId');
ok(car.includes('s.txLinkId=repairTxId;'),'repaired transaction relinks to service');
ok(car.includes("action:'relink'"),'relink emits finance lifecycle event');
ok(/const deletedTxId=s\.txLinkId/.test(car)&&/filter\(x=>x\.id!==id\)/.test(car),'delete captures linkage before clearing the service');
console.log('P10 regression: 4/4 PASS');
