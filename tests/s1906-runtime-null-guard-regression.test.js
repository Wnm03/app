'use strict';
const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..');
function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}
function assert(ok,msg){if(!ok)throw new Error(msg);}

const checks=[
 ['modules/shared/features-helpers-global-security.js',[
   ["const onboard=document.getElementById('onboard'); if(onboard)", 'showMain must guard optional onboarding DOM'],
   ["const pinScreen=document.getElementById('pinScreen'); if(pinScreen)", 'showMain must guard optional PIN DOM'],
   ["const mh=document.getElementById('mainHeader'); if(mh)", 'showMain must guard mainHeader DOM'],
   ["const ma=document.getElementById('mainApp'); if(ma)", 'showMain must guard mainApp DOM'],
   ["const mn=document.getElementById('mainNav'); if(mn)", 'showMain must guard mainNav DOM'],
 ]],
 ['modules/shared/backup-restore.js',[
   ["const customRange=document.getElementById('bCustomRange'); if(customRange)", 'backup custom range must be null-safe'],
   ["if(el)el.classList.add('active')", 'backup module chips must be null-safe'],
   ["if(customRange&&periode)", 'backup period change must be null-safe'],
 ]],
 ['modules/shared/modules-render.js',[
   ["if(!D.nextPulang){const num=document.getElementById('ldrNum')", 'LDR empty state must be null-safe'],
   ["const fill=document.getElementById('ldrFill');const dateEl=document.getElementById('ldrDate')", 'LDR progress/date DOM must be null-safe'],
 ]],
 ['modules/shared/modal-navigasi.js',[
   [/function closeQS\(id\)\{const el=document\.getElementById\(id\);if\(!el\|\|!el\.classList\)return false;/, 'Quick Switcher close must be null-safe'],
 ]],
 ['modules/vehicle/vehicle-core.js',[
   ["if(el)el.classList.add('active')", 'Car Notes period chip must be null-safe'],
   ["const customRange=document.getElementById('cnCustomRange');if(customRange)", 'Car Notes custom range must be null-safe'],
 ]],
];
for(const [file,items] of checks){const s=read(file);for(const [needle,msg] of items)if(needle instanceof RegExp) assert(needle.test(s),`${file}: ${msg}`); else assert(s.includes(needle),`${file}: ${msg}`);}

// Version markers are checked for mutual consistency rather than a hardcoded
// literal, so this test doesn't go stale every time the build version bumps.
const versionSrc=read('modules/shared/features-helpers-global-security.js');
const vMatch=versionSrc.match(/APP_BUILD_VERSION\s*=\s*'([^']+)'/);
assert(vMatch,'APP_BUILD_VERSION constant not found in source');
const V=vMatch[1];
const vRe=new RegExp(V.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
const numMatch=V.match(/-(\d+)$/);
assert(numMatch,'APP_BUILD_VERSION does not end in a numeric build id');
const N=numMatch[1];
for(const f of ['app-bundle-a.min.js','app-bundle-b.min.js']){
 const s=read(f);
 assert(vRe.test(s),`${f}: current release version marker missing`);
}
for(const f of ['index.html','app_production.html']){
 const s=read(f);assert(new RegExp('\\?v='+N+'\\b').test(s),`${f}: v${N} cache-bust missing`);
}
const sw=read('sw.js');assert(sw.includes(`kw-cache-v${N}`),'sw.js: current cache name missing');
console.log('S1906 runtime null-guard regression: PASS');
