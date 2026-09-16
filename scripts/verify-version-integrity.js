#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const constantFiles=[
 ['modules/shared/modules-render.js','MODULE_RENDER_VERSION'],
 ['modules/shared/modals.js','MODAL_VERSION'],
 ['modules/shared/modules-calc.js','MODULE_CALC_VERSION'],
 ['chat-action-handlers.js','MODULE_FEATURES_VERSION'],
 ['modules/shared/features-helpers-global-security.js','APP_BUILD_VERSION'],
];
function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}
function findConstant(rel,name){const re=new RegExp(name+"\\s*=\\s*'([^']+)'"),m=read(rel).match(re);return m&&m[1];}
function verify(){
 const errors=[]; const constants=constantFiles.map(([file,name])=>({file,name,value:findConstant(file,name)}));
 if(constants.some(x=>!x.value)) errors.push('konstanta versi runtime hilang');
 const values=[...new Set(constants.map(x=>x.value).filter(Boolean))];
 if(values.length!==1) errors.push(`konstanta versi tidak seragam: ${values.join(', ')}`);
 const appVersion=values[0]||''; const tail=(appVersion.match(/(\d+)$/)||[])[1];
 const html=[];
 for(const rel of ['index.html','app_production.html']) if(fs.existsSync(path.join(ROOT,rel))) html.push(...[...read(rel).matchAll(/\?v=(\d+)/g)].map(m=>({file:rel,value:m[1]})));
 const htmlValues=[...new Set(html.map(x=>x.value))];
 if(!tail||htmlValues.length!==1||htmlValues[0]!==tail) errors.push(`versi HTML tidak cocok dengan APP_BUILD_VERSION: app=${appVersion}, html=${htmlValues.join(',')}`);
 const sw=read('sw.js').match(/CACHE_NAME\s*=\s*'kw-cache-v(\d+)'/);
 if(!sw||sw[1]!==tail) errors.push(`CACHE_NAME sw.js tidak cocok: ${sw&&sw[1]} vs ${tail}`);
 return {ok:errors.length===0,errors,appVersion,htmlValues,swVersion:sw&&sw[1]};
}
function main(){const r=verify();if(!r.ok){console.error('❌ VERSION-INTEGRITY GAGAL');r.errors.forEach(e=>console.error('  - '+e));process.exit(1)}console.log(`✓ VERSION-INTEGRITY PASS — ${r.appVersion} / ?v=${r.htmlValues[0]} / kw-cache-v${r.swVersion}`)}
module.exports={verify};if(require.main===module)main();
