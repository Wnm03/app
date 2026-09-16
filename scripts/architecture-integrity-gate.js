#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
function fail(msg){throw new Error(msg)}
function runtimeManifest(){const s=read('scripts/build.js');const a=s.indexOf('const GROUP_A = [');const b=s.indexOf('const ALL_SOURCE = [...GROUP_A, ...GROUP_B];');if(a<0||b<0)fail('runtime manifest build.js tidak ditemukan');return [...s.slice(a,b).matchAll(/'([^']+\.js)'/g)].map(m=>m[1]);}
function check(){
 const errors=[];const files=runtimeManifest();
 const seen=new Set();for(const f of files){if(seen.has(f))errors.push(`duplicate runtime source: ${f}`);seen.add(f);if(!fs.existsSync(path.join(ROOT,f)))errors.push(`runtime source missing: ${f}`);}
 const critical=['modules/shared/features-helpers-global-security.js','modules/shared/data-default.js','modules/shared/format-tema.js','modules/shared/modal-navigasi.js','modules/shared/backup-restore.js','modules/ai/ai-core.js','modules/ai/ai-service.js','modules/vehicle/vehicle-core.js','modules/vehicle/servis.js','modules/vehicle/fuel-dashboard.js'];
 for(const f of critical)if(!seen.has(f))errors.push(`critical source tidak terdaftar di build manifest: ${f}`);
 // Sensitive legacy duplicates may exist as historical source copies, tetapi
 // tidak boleh ikut runtime manifest dan tidak boleh menjadi owner state/build.
 for(const f of ['modules/asset/features-helpers-global-security.js','modules/shop/features-helpers-global-security.js','modules/finance/features-helpers-global-security.js'])if(seen.has(f))errors.push(`legacy duplicate security source masuk runtime: ${f}`);
 const build=read('scripts/build.js');
 if(!/GROUP_A\s*=\s*\[/.test(build)||!/GROUP_B\s*=\s*\[/.test(build))errors.push('GROUP_A/GROUP_B manifest missing');
 if(!/const ALL_SOURCE = \[\.\.\.GROUP_A, \.\.\.GROUP_B\];/.test(build))errors.push('ALL_SOURCE bukan union GROUP_A/GROUP_B');
 return {ok:!errors.length,errors,entries:files.length};
}
function main(){const r=check();if(!r.ok){console.error('ARCHITECTURE-INTEGRITY: FAIL');r.errors.forEach(e=>console.error(' - '+e));process.exit(1)}console.log(`ARCHITECTURE-INTEGRITY: PASS — runtime entries=${r.entries}`)}
if(require.main===module)main();module.exports={check,runtimeManifest};
