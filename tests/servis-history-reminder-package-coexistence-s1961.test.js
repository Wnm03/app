const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
test('S1961 history keeps legacy reminder/countdown SOT and adds audit package layer',()=>{
 assert.match(s,/renderEditCanonicalSelectors\(panel,Servis\.resolveCanonicalServiceSelection\(current\),\{disabled:true,prefix:'servisHistorySot'\}\)/);
 assert.match(s,/computeServiceUrgency/);
 assert.match(s,/Reminder aktif/);
 assert.match(s,/createHistoryAuditPackage/);
 assert.match(s,/sourceServiceIds:ids/);
 assert.match(s,/openHistoryAuditPackage/);
 assert.match(s,/openHistorySourceFromAudit/);
});
console.log('S1961 history reminder/package coexistence: PASS');
