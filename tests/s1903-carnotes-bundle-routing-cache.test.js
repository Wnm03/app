'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
function bundleRefs(html){
 const a=html.match(/data-guard-src="app-bundle-a\.min\.js\?v=([^"]+)"/);
 const b=html.match(/data-guard-src="app-bundle-b\.min\.js\?v=([^"]+)"/);
 const guards=[...html.matchAll(/bundle-load-guard\.js\?v=([^"']+)/g)].map(m=>m[1]);
 return {a:a&&a[1],b:b&&b[1],guards};
}
test('S1903: Car Notes bundle URLs share one current numeric cache version',()=>{
 for(const file of ['index.html','app_production.html']){
  const r=bundleRefs(read(file));
  assert.ok(/^\d+$/.test(r.a||''));
  assert.equal(r.b,r.a);
  assert.ok(r.guards.every(v=>v===r.a));
 }
});
test('S1903: Car Notes page contains BBM and Servis panes',()=>{
 const html=read('index.html'); const a=html.indexOf('<div class="page" id="page-carnotes">'); const b=html.indexOf('<div class="page" id="page-pajak">',a); const page=html.slice(a,b);
 assert.match(page,/data-action="setCnTab" data-args='\["bbm", "\$el"\]'[^>]*>⛽ BBM/);
 assert.match(page,/data-action="setCnTab" data-args='\["servis", "\$el"\]'[^>]*>🔧 Servis/);
 assert.match(page,/<div id="cnTab-bbm">/); assert.match(page,/<div id="cnTab-servis" class="u-dnone">/);
});
test('S1903: bundle-B contains Servis runtime',()=>{const b=read('app-bundle-b.min.js');assert.match(b,/const Servis=/);assert.match(b,/window\.Servis\s*=\s*Servis/);});
test('S1903: active Car Notes renderers remain wired',()=>{const r=read('modules/shared/modules-render-b.js');assert.match(r,/else if\(activeTab==='bbm'\)\{[\s\S]*?FuelCard\.render\(\)/);assert.match(r,/renderBbmList\(\);/);assert.match(r,/else if\(activeTab==='servis'\)\{[\s\S]*?Servis\.renderReminder/);assert.match(r,/renderServisList\(\{skipReminder:true\}\)/);});
test('S1903: Service Worker cache matches current HTML bundle version',()=>{const r=bundleRefs(read('index.html'));assert.match(read('sw.js'),new RegExp(`CACHE_NAME\\s*=\\s*['"]kw-cache-v${r.a}['"]`));});
