#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');const input=process.argv[2],output=process.argv[3]||path.join(__dirname,'..','AUDIT-S2034-P2-CATEGORY-COMPONENT-HISTORY.md');
if(!input||!fs.existsSync(input)){console.error('Backup tidak ditemukan:',input||'(backup.json wajib)');process.exit(2)}
const D=JSON.parse(fs.readFileSync(input,'utf8')),master=require('../modules/vehicle/service-master-data.generated.js');
global.ServiceInputCatalog={itemById:id=>{for(const g of master.SERVICE_CHECKLIST_GROUPS)for(const item of g.items||[])if(String(item.id)===String(id))return {item,group:g};return null},infer:n=>{const q=String(n||'').trim().toLowerCase();for(const g of master.SERVICE_CHECKLIST_GROUPS)for(const item of g.items||[])if(String(item.name||'').trim().toLowerCase()===q)return {item,group:g};return null}};
const A=require('../modules/vehicle/service-category-component-history-audit-s2034.js'),cats=Array.isArray(D.sparepartCats)?D.sparepartCats:[],logs=Array.isArray(D.servisLogs)?D.servisLogs:[],c=A.auditCategories(cats),h=A.auditHistoryAll(logs,cats),sev={ERROR:0,REVIEW:0,INFO:0};[...c.rows,...h.rows].forEach(r=>(r.issues||[]).forEach(i=>sev[i.severity]=(sev[i.severity]||0)+1));
const canonicalGroups=Array.isArray(master.SERVICE_CHECKLIST_GROUPS)?master.SERVICE_CHECKLIST_GROUPS:[];
const canonicalCategoryIds=new Set(canonicalGroups.map(g=>String(g&&g.masterCategoryId||'')).filter(Boolean));
const canonicalCategoryNames=new Set(canonicalGroups.map(g=>String(g&&g.group||'').trim()).filter(Boolean));
const canonicalComponentIds=new Set(canonicalGroups.flatMap(g=>Array.isArray(g&&g.items)?g.items.map(it=>String(it&&it.id||'')).filter(Boolean):[]));
const canonicalUsedCategories=new Set();
const storedResolvedComponents=new Set();
const storedUnresolved=[];
c.rows.forEach(r=>{
  if(r.masterCategoryId&&canonicalCategoryIds.has(String(r.masterCategoryId)))canonicalUsedCategories.add(String(r.masterCategoryId));
  if(r.serviceComponentId&&canonicalComponentIds.has(String(r.serviceComponentId)))storedResolvedComponents.add(String(r.serviceComponentId));
  if(!r.serviceComponentId)storedUnresolved.push(r);
});
const historyProjectedCategories=new Set();
const historyProjectedComponents=new Set();
let historyMissingComponent=0;
let historyDriftRows=0;
h.rows.forEach(r=>{
  if(r.serviceComponentId&&canonicalComponentIds.has(String(r.serviceComponentId))){
    historyProjectedComponents.add(String(r.serviceComponentId));
    const hit=master.SERVICE_CHECKLIST_GROUPS.flatMap(g=>g.items||[]).find(it=>String(it.id)===String(r.serviceComponentId));
    if(hit&&hit.masterCategoryId)historyProjectedCategories.add(String(hit.masterCategoryId));
  }else historyMissingComponent++;
  if((r.issues||[]).length)historyDriftRows++;
});
const categoryDriftRows=c.rows.filter(r=>(r.issues||[]).length).length;
const categoryIssueCounts={};
c.rows.forEach(r=>(r.issues||[]).forEach(i=>categoryIssueCounts[i.code]=(categoryIssueCounts[i.code]||0)+1));
const historyIssueCounts=h.counts||{};
const severity={ERROR:0,REVIEW:0,INFO:0};
[...c.rows,...h.rows].forEach(r=>(r.issues||[]).forEach(i=>severity[i.severity]=(severity[i.severity]||0)+1));
const projectionByCategory={};
h.rows.forEach(r=>{
  if(!r.serviceComponentId)return;
  const hit=canonicalGroups.flatMap(g=>g.items||[]).find(it=>String(it.id)===String(r.serviceComponentId));
  if(!hit)return;
  const g=canonicalGroups.find(x=>String(x.masterCategoryId)===String(hit.masterCategoryId));
  const name=g&&g.group||String(hit.masterCategoryId);
  projectionByCategory[name]=(projectionByCategory[name]||0)+1;
});
const out=['# AUDIT S2034 P2 — Kategori → Komponen → Interval → Riwayat','','Read-only; backup tidak dimutasi.','',
`- Backup schema: **${D.schemaVersion??'unknown'}**`,
`- Kendaraan: **${Array.isArray(D.vehicles)?D.vehicles.length:0}**`,
`- Canonical kategori SOT: **${canonicalGroups.length}**`,
`- Canonical komponen SOT: **${canonicalComponentIds.size}**`,
`- Kategori tersimpan (rows): **${cats.length}**`,
`- Kategori tersimpan unresolved: **${storedUnresolved.length}**`,
`- Kategori canonical yang terpakai: **${canonicalUsedCategories.size}/${canonicalCategoryIds.size}**`,
`- Komponen canonical yang terpakai di kategori: **${storedResolvedComponents.size}/${canonicalComponentIds.size}**`,
`- Riwayat servis: **${logs.length}**`,
`- Riwayat dengan component canonical: **${logs.length-historyMissingComponent}**`,
`- Riwayat tanpa component identity: **${historyMissingComponent}**`,
`- Riwayat drift (ada issue): **${historyDriftRows}**`,
`- ERROR: **${severity.ERROR||0}**`,
`- REVIEW: **${severity.REVIEW||0}**`,
`- INFO: **${severity.INFO||0}**`,
`- Duplicate canonical category projection: **${c.duplicates.length}**`,'','## Coverage canonical kategori'];
canonicalGroups.forEach(g=>out.push(`- ${g.group}: **${projectionByCategory[g.group]||0} history**`));
out.push('','## Issue kategori tersimpan');
Object.entries(categoryIssueCounts).sort().forEach(([k,v])=>out.push(`- ${k}: **${v}**`));
if(!Object.keys(categoryIssueCounts).length)out.push('- Tidak ada.');
out.push('','## Issue riwayat');
Object.entries(historyIssueCounts).sort().forEach(([k,v])=>out.push(`- ${k}: **${v}**`));
if(!Object.keys(historyIssueCounts).length)out.push('- Tidak ada.');
out.push('','## Kategori bermasalah');
c.rows.filter(r=>r.issues.length).forEach(r=>out.push(`- ${r.id} · ${r.name} · ${r.issues.map(i=>i.code).join(', ')}`));
if(!c.rows.some(r=>r.issues.length))out.push('- Tidak ada.');
out.push('','## Riwayat bermasalah');
h.rows.filter(r=>r.issues.length).forEach(r=>out.push(`- ${r.id} · ${r.issues.map(i=>i.code).join(', ')}`));
if(!h.rows.some(r=>r.issues.length))out.push('- Tidak ada.');
out.push('','## Safety','1. Nama canonical mengikuti serviceComponentId.','2. Interval kategori boleh menjadi override; tidak ditimpa otomatis.','3. Snapshot historis tidak diubah.','4. Ambiguous legacy data tetap REVIEW.','5. Dropdown UI tidak memakai TORSI_DB/GENERIC_GROUP_BY_NAME sebagai taxonomy.');
fs.writeFileSync(output,out.join('\n')+'\n');
console.log(JSON.stringify({output,categories:cats.length,history:logs.length,canonicalCategories:canonicalGroups.length,canonicalComponents:canonicalComponentIds.size,categoryUnresolved:storedUnresolved.length,historyMissingComponent,historyDriftRows,severity,duplicates:c.duplicates.length,projectionByCategory},null,2));
