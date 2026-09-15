const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const core=fs.readFileSync('modules/vehicle/vehicle-core.js','utf8');
test('Car Notes Pro visible controls have contracts',()=>{
 assert.match(html,/data-action="openGlobalSearch"/);
 assert.match(html,/data-action="proOpenNotifications"/);
 assert.match(html,/data-pro-goto="5" aria-label="Aktivitas"/);
 assert.match(core,/function proOpenHistory\(\)/);
 assert.match(core,/proMockupPushHistory\(5\);\n    proMockupSetScreen\(5\);/);
});
