const assert=require('assert');const fs=require('fs');const path=require('path');
const servis=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
const modals=fs.readFileSync(path.join(__dirname,'../modules/shared/modals.js'),'utf8');
assert.match(servis,/tab==='history'\?'history':tab==='audit'\?'audit':'detail'/);
assert.match(servis,/Servis\.renderEditHistoryTab\(\)/);
assert.match(servis+fs.readFileSync(path.join(__dirname,'../modules/vehicle/service-history-bulk-identity-editor.js'),'utf8'),/data-service-audit-id/); // S1974: UI audit pindah ke tab Audit
assert.match(servis,/api\.create\(\{vehicleId:/);
assert.match(servis,/sourceServiceIds:ids/);
assert.match(modals,/id=\\"servisEditTabHistory\\"/);
assert.match(modals,/id=\\"servisHistoryPanel\\" style=\\"display:none\\"/);
console.log('S1956 history package UI wiring: PASS');
