'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const files=['modules/vehicle/vehicle-core.js','modules/shared/modules-render-b.js','modules/shared/features-helpers-global-security.js','car-notes.js'];
let bad=0;
for(const rel of files){
 const s=fs.readFileSync(path.join(ROOT,rel),'utf8');
 if(/function\s+renderCnTab\s*\([^)]*\)\s*\{[\s\S]{0,12000}?(?:window|document)\.addEventListener\s*\(/.test(s)){console.error(`FAIL repeated listener risk in renderCnTab: ${rel}`);bad++;}
}
const core=fs.readFileSync(path.join(ROOT,'modules/vehicle/vehicle-core.js'),'utf8');
if(!/window\.__cnOfflineStatus1747\b/.test(core)){console.error('FAIL offline listener installation guard missing');bad++;}
if(!/let\s+_lifecycleFlushInstalled\s*=\s*false/.test(fs.readFileSync(path.join(ROOT,'modules/shared/features-helpers-global-security.js'),'utf8'))){console.error('FAIL persistence lifecycle guard missing');bad++;}
console.log(`Car Notes performance guard: ${bad?'FAIL':'PASS'} (${files.length} core files checked)`);
process.exit(bad?1:0);
