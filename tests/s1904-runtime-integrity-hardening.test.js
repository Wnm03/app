'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..'); const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
const RELEASE_VERSION=(read('modules/shared/features-helpers-global-security.js').match(/s\d+-[a-z0-9-]+-\d+/)||[])[0];
assert.ok(RELEASE_VERSION);
test('S1904 canonical release version remains consistent across source and bundles',()=>{
 for(const f of ['modules/shared/features-helpers-global-security.js','modules/shared/modules-render.js','modules/shared/modals.js','modules/shared/modules-calc.js','chat-action-handlers.js','app-bundle-a.min.js','app-bundle-b.min.js']) assert.match(read(f),new RegExp(RELEASE_VERSION.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
test('S1904 HTML and Service Worker share current cache version',()=>{
 const m=read('index.html').match(/app-bundle-a\.min\.js\?v=(\d+)/); assert.ok(m);
 for(const f of ['index.html','app_production.html']){const s=read(f);assert.match(s,new RegExp(`app-bundle-a\\.min\\.js\\?v=${m[1]}`));assert.match(s,new RegExp(`app-bundle-b\\.min\\.js\\?v=${m[1]}`));}
 assert.match(read('sw.js'),new RegExp(`CACHE_NAME\\s*=\\s*['"]kw-cache-v${m[1]}['"]`));
});
test('S1904 Car Notes subtab switches guard missing panes',()=>{const s=read('modules/vehicle/vehicle-core.js');for(const id of ['cniRingkasanEl','cniRekomendasiEl','cnbRingkasanEl','cnbAnalisisEl'])assert.match(s,new RegExp(`const ${id}=document\\.getElementById`+"\\('"+id.replace('El','').replace('cniRingkasan','cniTab-ringkasan').replace('cniRekomendasi','cniTab-rekomendasi').replace('cnbRingkasan','cnbTab-ringkasan').replace('cnbAnalisis','cnbTab-analisis')+"'\\);\\s*if\\("+id+"\\)"));});
