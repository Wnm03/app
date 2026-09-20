#!/usr/bin/env node
'use strict';
const fs=require('fs');const path=require('path');const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const src=path.join(root,'data','database-kategori-komponen-servis.json');
const out=path.join(root,'modules','vehicle','service-master-data.generated.js');
const data=JSON.parse(fs.readFileSync(src,'utf8'));
if(data.masterCategoryCount!==13||data.componentCount!==102||!Array.isArray(data.masterCategories)||!Array.isArray(data.components))throw new Error('Master service data schema/count invalid');
const ids=new Set();for(const x of data.components){if(!x.componentId||ids.has(x.componentId))throw new Error('Duplicate/invalid componentId: '+x.componentId);ids.add(x.componentId);}
const by=new Map();const groups=data.masterCategories.map(c=>{const g={group:c.masterCategory,masterCategoryId:c.masterCategoryId,items:[]};by.set(c.masterCategoryId,g);return g;});
for(const x of data.components){const g=by.get(x.masterCategoryId);if(!g)throw new Error('Unknown masterCategoryId: '+x.masterCategoryId);g.items.push({id:x.componentId,name:x.componentName,linkCat:x.linkCat,actionMode:x.actionMode,resetType:x.resetType,intervalKm:x.intervalKm,intervalTimeMonths:x.intervalTimeMonths,gantiResetsInterval:x.gantiResetsInterval,intervalLabel:x.intervalLabel,sumber:x.sumber,needsReview:x.needsReview,catatan:x.catatan,catatanTambahan:x.catatanTambahan,masterCategoryId:x.masterCategoryId,catalogRefs:Array.isArray(x.catalogRefs)?x.catalogRefs.slice():[]});}
const checksum=crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex');
const js=`// GENERATED FILE — source: data/database-kategori-komponen-servis.json\n// DO NOT EDIT MANUALLY. Regenerate with scripts/generate-service-master-data.js.\n'use strict';\nconst SERVICE_MASTER_DATA_GENERATED=${JSON.stringify(data)};\nconst SERVICE_CHECKLIST_GROUPS_GENERATED=${JSON.stringify(groups)};\nconst SERVICE_MASTER_CHECKSUM_GENERATED=${JSON.stringify(checksum)};\nif(typeof globalThis!=='undefined'){globalThis.__SERVICE_MASTER_DATA__=SERVICE_MASTER_DATA_GENERATED;globalThis.__SERVICE_CHECKLIST_GROUPS__=SERVICE_CHECKLIST_GROUPS_GENERATED;globalThis.__SERVICE_MASTER_CHECKSUM__=SERVICE_MASTER_CHECKSUM_GENERATED;}\nif(typeof module!=='undefined')module.exports={SERVICE_MASTER_DATA:SERVICE_MASTER_DATA_GENERATED,SERVICE_CHECKLIST_GROUPS:SERVICE_CHECKLIST_GROUPS_GENERATED,SERVICE_MASTER_CHECKSUM:SERVICE_MASTER_CHECKSUM_GENERATED};\n`;
fs.writeFileSync(out,js);
console.log(`Generated ${path.relative(root,out)} (${data.masterCategoryCount} categories, ${data.componentCount} components, sha256 ${checksum})`);
