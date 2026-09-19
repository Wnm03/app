#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const ROOT=path.resolve(__dirname,'..');
const roots=['modules/vehicle','modules/shared'];const patterns=[/localStorage\.(?:getItem|setItem|removeItem)/g,/JSON\.(?:parse|stringify)\s*\(/g,/renderServisList\s*\(/g,/renderDashboardServisReminder\s*\(/g,/save\s*\(/g];
let hits=[];function walk(rel){const abs=path.join(ROOT,rel);if(!fs.existsSync(abs))return;for(const n of fs.readdirSync(abs)){const p=path.join(abs,n),s=fs.statSync(p);if(s.isDirectory())walk(path.relative(ROOT,p));else if(/\.js$/.test(n)){const lines=fs.readFileSync(p,'utf8').split(/\r?\n/);lines.forEach((line,i)=>patterns.forEach((re,pi)=>{re.lastIndex=0;if(re.test(line))hits.push({file:path.relative(ROOT,p),line:i+1,type:pi+1,text:line.trim().slice(0,180)});}));}}}
roots.forEach(walk);const counts={storage:0,json:0,serviceList:0,reminder:0,save:0};for(const h of hits)counts[Object.keys(counts)[h.type-1]]++;
console.log('RUNTIME I/O / RENDER AUDIT');console.log(counts);console.log('Potential hotspots (manual review):');for(const h of hits.filter(x=>x.type!==2).slice(0,120))console.log(`${h.file}:${h.line} [${h.type}] ${h.text}`);
