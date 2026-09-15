const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const prod=fs.readFileSync(path.join(ROOT,'app_production.html'),'utf8');
const core=fs.readFileSync(path.join(ROOT,'modules/vehicle/vehicle-core.js'),'utf8');
const modal=fs.readFileSync(path.join(ROOT,'modules/shared/modal-navigasi.js'),'utf8');
const bundle=fs.readFileSync(path.join(ROOT,'app-bundle-b.min.js'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'pro-ui-layer.css'),'utf8');
function section(h){const a=h.indexOf('<div class="page pro-vehicle-page" id="page-carnotes">');const b=h.indexOf('<div class="page" id="page-settings">',a);assert.ok(a>=0&&b>a);return h.slice(a,b);}
test('breadcrumb and offline status exist in both shipped HTML variants',()=>{
 for(const h of [index,prod]){const cn=section(h);assert.match(cn,/Aplikasi Utama <span[^>]*>›<\/span> Car Notes/);assert.match(cn,/id="cnOfflineStatus"/);}
 assert.match(css,/pro-carnotes-breadcrumb/);assert.match(css,/pro-offline-status/);
});
test('Car Notes return route protects unsaved modal edits',()=>{
 assert.match(core,/function proReturnToMainNav\(\)/);assert.match(core,/proHasUnsavedChanges\(\)/);assert.match(core,/Perubahan belum disimpan/);assert.match(core,/Tetap di sini/);
 assert.match(modal,/function proHasUnsavedChanges\(\)/);assert.match(modal,/_proModalEditSnapshot/);
 assert.match(bundle,/function proHasUnsavedChanges\(\)/);assert.match(bundle,/_proModalEditSnapshot/);
});
test('contextual Back contract remains intact',()=>{
 assert.match(core,/__carnotesPro/);assert.match(core,/popstate/);assert.match(core,/proReturnToMainNav\(\)/);assert.match(modal,/__kwModalStack/);
});
test('offline indicator is event-driven and non-blocking',()=>{
 assert.match(core,/addEventListener\('online',_cnUpdateOfflineStatus\)/);assert.match(core,/addEventListener\('offline',_cnUpdateOfflineStatus\)/);assert.match(core,/navigator\.onLine===false/);
});
