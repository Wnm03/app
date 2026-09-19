const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
function read(p){return fs.readFileSync(path.join(__dirname,'..',p),'utf8');}

test('S1860 profiling API is opt-in and exported',()=>{
 const s=read('modules/vehicle/car-notes-performance.js');
 assert.match(s,/function profile\(name,fn,meta\)/);
 assert.match(s,/window\.__APP_PERF_ENABLED===true/);
 assert.match(s,/profileReport/);
 assert.match(s,/resetProfiles/);
 assert.match(s,/profile,resetProfiles,profileReport/);
});

test('S1860 Servis tab profiles the four measured hot paths',()=>{
 const s=read('modules/shared/modules-render-b.js');
 for(const n of ['carnotes.render.serviceIntegrity','carnotes.render.serviceReminder','carnotes.render.serviceList','carnotes.audit.service']) assert.match(s,new RegExp(n.replace(/\./g,'\\.')));
 assert.match(s,/renderServisList\(\{skipReminder:true\}\)/);
});

test('S1860 profiling retains a bounded sample buffer',()=>{
 const s=read('modules/vehicle/car-notes-performance.js');
 assert.match(s,/if\(state\.metrics\.samples\.length>200\)/);
 assert.match(s,/samples\.slice\(-50\)/);
});
