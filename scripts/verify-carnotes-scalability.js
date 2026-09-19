#!/usr/bin/env node
'use strict';
/** Static scalability gate: measures source hot-path complexity proxies without mutating app data. */
const fs=require('node:fs');const path=require('node:path');const ROOT=path.resolve(__dirname,'..');
const targets=['modules/vehicle/car-notes-performance.js','modules/vehicle/servis.js','modules/vehicle/servis-b.js','modules/shared/modules-render-b.js'];
const rows=targets.map(f=>{const s=fs.readFileSync(path.join(ROOT,f),'utf8');return {file:f,lines:s.split(/\r?\n/).length,json:String(s.match(/JSON\.(?:parse|stringify)/g)||[]).split(',').filter(Boolean).length,storage:String(s.match(/localStorage\./g)||[]).split(',').filter(Boolean).length,loops:(s.match(/\.map\(|\.filter\(|\.reduce\(|for\s*\(/g)||[]).length,renders:(s.match(/renderServisList\s*\(|renderDashboardServisReminder\s*\(/g)||[]).length};});
console.table(rows);console.log('Scalability audit is a proxy gate; run browser profiling for wall-clock budgets.');
