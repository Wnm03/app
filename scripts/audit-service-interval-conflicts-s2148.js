#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const db=JSON.parse(fs.readFileSync(path.join(root,'data','database-kategori-komponen-servis.json'),'utf8'));
const findings=[];
for(const c of (db.components||[])){
  const text=[c.intervalLabel,c.catatan,c.catatanTambahan].filter(Boolean).join(' ');
  const declared=Number(c.intervalKm)>0?Number(c.intervalKm):null;
  const matches=[...text.matchAll(/(?:ganti|penggantian|periksa|pemeriksaan|bersihkan|pelumasan)[^.;\n]{0,70}?(\d[\d.]*)\s*km/gi)]
    .map(m=>Number(String(m[1]).replace(/\./g,''))).filter(n=>Number.isFinite(n)&&n>0);
  const distinct=[...new Set(matches)];
  if(declared&&distinct.some(n=>n!==declared)) findings.push({componentId:c.componentId,name:c.componentName,declaredIntervalKm:declared,mentionedIntervalsKm:distinct,needsReview:!!c.needsReview,source:c.sumber||null,reason:'interval-label-or-notes-conflict'});
  else if(!declared&&distinct.length>0) findings.push({componentId:c.componentId,name:c.componentName,declaredIntervalKm:null,mentionedIntervalsKm:distinct,needsReview:!!c.needsReview,source:c.sumber||null,reason:'interval-mentioned-but-not-canonicalized'});
}
const report={version:'S2148',mode:'read-only-audit',source:'data/database-kategori-komponen-servis.json',componentsScanned:(db.components||[]).length,findings};
if(require.main===module){
  console.log(JSON.stringify(report,null,2));
  if(process.argv.includes('--strict')&&findings.length)process.exitCode=2;
}
module.exports={audit:()=>report};
