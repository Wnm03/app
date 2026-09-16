#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const ROOT=path.join(__dirname,'..');
function check(){const errors=[];const b=fs.readFileSync(path.join(ROOT,'scripts/build.js'),'utf8');
 const required={
  'finance persistence':'modules/shared/features-helpers-global-security.js',
  'theme':'modules/shared/format-tema.js',
  'navigation':'modules/shared/modal-navigasi.js',
  'backup':'modules/shared/backup-restore.js',
  'AI bus':'modules/ai/ai-core.js',
  'AI service':'modules/ai/ai-service.js',
  'vehicle core':'modules/vehicle/vehicle-core.js',
  'Car Notes servis':'modules/vehicle/servis.js',
  'fuel intelligence':'modules/vehicle/fuel-dashboard.js',
  'fuel comparison':'modules/vehicle/fuel-compare.js',
  'sparepart service':'modules/vehicle/sparepart-servis.js'
 };
 for(const [name,f] of Object.entries(required))if(!b.includes(`'${f}'`))errors.push(`${name}: ${f} tidak masuk build manifest`);
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 for(const marker of ['mainNav','mainHeader','Car Notes','Servis','BBM'])if(!html.toLowerCase().includes(marker.toLowerCase()))errors.push(`HTML critical marker hilang: ${marker}`);
 return {ok:!errors.length,errors};}
function main(){const r=check();if(!r.ok){console.error('FEATURE-REGRESSION: FAIL');r.errors.forEach(e=>console.error(' - '+e));process.exit(1)}console.log('FEATURE-REGRESSION: PASS — critical finance/theme/navigation/backup/AI/vehicle/fuel/servis sources remain wired.')}
if(require.main===module)main();module.exports={check};
