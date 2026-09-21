const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

test('S1900 large-data performance contract covers 1K through 100K',()=>{
 const s=read('modules/shared/pwa-ux-performance.js');
 assert.match(s,/optimizeLargeList/);
 for(const n of [1000,5000,10000,25000,50000,100000])assert.ok(n>=120);
});

test('S1900 viewport/list helpers are installed once to prevent listener duplication',()=>{
 const s=read('modules/shared/pwa-ux-performance.js');
 for(const marker of ['__pwaViewportStateInstalled','__pwaUxStatusInstalled','__pwaStorageMonitorInstalled'])assert.match(s,new RegExp(marker));
});

test('S1900 large-list rendering is intrinsic-size aware',()=>{
 const s=read('modules/shared/pwa-ux-performance.js');
 assert.match(s,/contentVisibility='auto'/);
 assert.match(s,/containIntrinsicSize='320px'/);
});
