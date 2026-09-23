const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
test('S1974 history is read-only while reminder remains a separate presenter and audit package stays available',()=>{
 const start=s.indexOf('renderEditHistoryTab(){'); const end=s.indexOf('createHistoryAuditPackage(){',start); const history=s.slice(start,end);
 assert.doesNotMatch(history,/renderEditCanonicalSelectors/);
 assert.doesNotMatch(history,/computeServiceUrgency/);
 assert.doesNotMatch(history,/Reminder aktif/);
 assert.match(history,/Halaman ini adalah bukti riwayat saja/);
 assert.match(s,/renderEditReminderTab\(\)/);
 assert.match(s,/createHistoryAuditPackage/);
 assert.match(s,/sourceServiceIds:ids/);
 assert.match(s,/openHistoryAuditPackage/);
 assert.match(s,/openHistorySourceFromAudit/);
});
console.log('S1961 history reminder/package coexistence: PASS');
