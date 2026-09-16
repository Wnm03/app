#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const ROOT=path.join(__dirname,'..');
function src(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}
function verify(){
 const errors=[];
 const security=src('modules/shared/features-helpers-global-security.js');
 const vehicle=src('modules/vehicle/vehicle-core.js');
 const aiCore=src('modules/ai/ai-core.js');const aiService=src('modules/ai/ai-service.js');
 if((security.match(/setInterval\s*\(/g)||[]).length>1) errors.push('lebih dari satu maintenance setInterval di global security');
 if(!/__cnOfflineStatus1747/.test(vehicle)) errors.push('offline-status listener guard hilang');
 if(!/if\s*\(this\._wired\)\s*return;/.test(aiService)||!/_subscriptions/.test(aiService)||!/unwireEvents/.test(aiService)) errors.push('AIService lifecycle subscription guard/cleanup hilang');
 if(!/includes\(handler\)/.test(aiCore)||!/delete this\._listeners\[eventName\]/.test(aiCore)) errors.push('AIBus subscription dedupe/empty-list cleanup hilang');
 return {ok:errors.length===0,errors};
}
function main(){const r=verify();if(!r.ok){console.error('❌ RUNTIME-LIFECYCLE GAGAL');r.errors.forEach(e=>console.error('  - '+e));process.exit(1)}console.log('✓ RUNTIME-LIFECYCLE PASS — singleton listeners/timers dan AIBus cleanup terjaga')}
module.exports={verify};if(require.main===module)main();
