'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
test('Car Notes runtime hardening contracts pass',()=>{
 execFileSync(process.execPath,[path.join(ROOT,'scripts/verify-carnotes-runtime-contracts.js')],{cwd:ROOT,stdio:'pipe'});
});
test('Car Notes build manifest has no duplicate source entries',()=>{
 const s=read('scripts/build.js');
 const a=s.match(/'modules\/[^']+\.js'/g)||[];const counts=new Map();for(const x of a)counts.set(x,(counts.get(x)||0)+1);
 const dup=[...counts].filter(([,n])=>n>1);assert.deepEqual(dup,[]);
});
test('Car Notes reminder list has a bounded internal scroll container',()=>{
 const css=read('styles.css');assert.match(css,/servisReminderCard-cbody \.servis-reminder-list\s*\{[^}]*max-height\s*:\s*420px[^}]*overflow-y\s*:\s*auto/);
 const servis=read('modules/vehicle/servis.js');assert.match(servis,/class=\\?"servis-reminder-list\\?"/);
});
test('Car Notes performance API is defined in source and registered before vehicle consumers',()=>{
 const build=read('scripts/build.js');assert.ok(build.indexOf("'modules/vehicle/car-notes-performance.js'")<build.indexOf("'modules/vehicle/vehicle-core.js'"));
 const perf=read('modules/vehicle/car-notes-performance.js');for(const n of ['inventory','memo','auditCurrent','snapshot'])assert.match(perf,new RegExp('\\b'+n+'\\b'));
});
