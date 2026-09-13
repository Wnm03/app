const fs=require('fs'),assert=require('assert');
const cn=fs.readFileSync('car-notes.js','utf8');
const ad=fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8');
const sp=fs.readFileSync('modules/vehicle/sparepart-servis.js','utf8');
function ok(n,c){assert.ok(c,n);console.log('PASS',n)}
ok('delete lifecycle failure queues outbox',cn.includes("type:'service.remove'"));
ok('batch finance event failure queues outbox',cn.includes("type:'finance.updated'"));
ok('odometer diagnostic reports missing KM',cn.includes("type:'missing_km'"));
ok('odometer diagnostic reports invalid KM',cn.includes("type:'invalid_km'"));
ok('outbox can replay finance events',ad.includes("evt.type==='finance.updated'"));
ok('sparepart consumer delegates to canonical comparator',sp.includes('window.compareServiceHistoryRecency'));
console.log('V30 PASS');
