const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const b=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/servis-b.js'),'utf8');
const s=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/servis.js'),'utf8');
const bulk=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/service-history-bulk-identity-editor.js'),'utf8');

test('S1975: Audit Riwayat Terpilih opens full Audit tab, not checklist-only snapshot',()=>{
 const start=b.indexOf('openHistoryAudit(logs){');
 const end=b.indexOf('activeReminderSeverityFilter:',start);
 const block=b.slice(start,end);
 assert.match(block,/Servis\.openModal\(selected\[0\]\.id\)/);
 assert.match(block,/Servis\.setEditTab\('audit'\)/);
 assert.doesNotMatch(block,/Servis\.renderSelectedHistoryAudit\(logs\)/);
});

test('S1975: Audit selection uses the same transient SoT as Riwayat',()=>{
 assert.match(b,/_selectedHistoryIds:new Set\(\)/);
 assert.match(s,/setEditHistoryAuditSelection\(id,checked\)/);
 assert.match(b,/setHistoryAuditSelection\(id,checked,vehicleId\)/);
 assert.match(bulk,/Servis\.getHistoryAuditSelectionIds\(curVehicleId\)/);
 assert.match(bulk,/data-service-audit-id/);
});

test('S1975: advanced Audit operations read shared selection state',()=>{
 assert.match(s,/updateHistoryAuditSelection\(\)/);
 assert.match(s,/selectAllHistoryAudit\(\)/);
 assert.match(s,/clearHistoryAuditSelection\(\)/);
 assert.match(s,/createHistoryAuditPackage\(\)/);
 assert.match(bulk,/Servis\._selectedHistoryAuditIds\(\)/);
});

test('S1975: Audit surface explicitly distinguishes checklist evidence from advanced operations',()=>{
 assert.match(bulk,/Audit & Paket Pekerjaan/);
 assert.match(bulk,/Edit Kategori\/Komponen SOT/);
 assert.match(bulk,/Jenis Pekerjaan/);
 assert.match(bulk,/Jadikan Paket Pekerjaan/);
});
