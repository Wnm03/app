const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

test('S1900 service worker has explicit install/activate/update lifecycle',()=>{
 const s=read('sw.js');
 assert.match(s,/addEventListener\('install'/);
 assert.match(s,/skipWaiting\(\)/);
 assert.match(s,/addEventListener\('activate'/);
 assert.match(s,/clients\.claim\(\)/);
 assert.match(read('pwa-setup.js'),/registration|register\('sw\.js'/);
});

test('S1900 update UX is opt-in reload rather than forced reload',()=>{
 const s=read('pwa-setup.js');
 assert.match(s,/Versi aplikasi baru tersedia/);
 assert.match(s,/data-pwa-update-dismiss/);
 assert.match(s,/data-pwa-update-reload/);
 assert.match(s,/window\.location\.reload\(\)/);
});
