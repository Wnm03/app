'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

test('S1930: release/cache version is bumped together so stale Android assets cannot reuse v1908',()=>{
  const source=read('modules/shared/features-helpers-global-security.js');
  const m=source.match(/const APP_BUILD_VERSION = '([^']+)'/);
  assert.ok(m,'APP_BUILD_VERSION missing');
  assert.match(m[1],/^s1930-mobile-ui-cache-hardening-1930$/);
  const n=m[1].match(/-(\d+)$/)[1];
  for(const f of ['modules/shared/modules-render.js','modules/shared/modals.js','modules/shared/modules-calc.js','chat-action-handlers.js','app-bundle-a.min.js','app-bundle-b.min.js']){
    assert.match(read(f),new RegExp(m[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),f+' stale build identity');
  }
  for(const f of ['index.html','app_production.html']){
    assert.match(read(f),new RegExp('\\?v='+n),f+' stale query version');
  }
  assert.match(read('sw.js'),new RegExp('kw-cache-v'+n),'SW cache version not bumped');
});

test('S1930: Service Worker revalidates static assets online and keeps offline cache fallback',()=>{
  const sw=read('sw.js');
  assert.match(sw,/fetch\(request,\s*\{\s*cache:\s*'no-cache'\s*\}\)/);
  assert.match(sw,/caches\.open\(CACHE_NAME\)\.then\(\(cache\)\s*=>\s*cache\.put\(request,\s*clone\)\)/);
  assert.match(sw,/caches\.match\(request\)/);
  assert.match(sw,/status:\s*503/);
});

test('S1930: mobile page transitions cannot leave a composited blank/ghost frame',()=>{
  const css=read('styles.css');
  assert.match(css,/S1930 — Android mobile visual\/scroll stabilization/);
  assert.match(css,/@media \(max-width:899px\)\{[\s\S]*?\.page\{animation:none!important;opacity:1!important;transform:none!important;\}/);
  assert.match(css,/@media \(max-width:899px\)\{[\s\S]*?\.page\.active\{display:block!important;visibility:visible!important;opacity:1!important;transform:none!important;animation:none!important;pointer-events:auto;\}/);
  assert.match(css,/@media \(max-width:899px\)\{[\s\S]*?\.page:not\(\.active\)\{visibility:hidden;pointer-events:none;\}/);
  assert.match(css,/@media \(max-width:899px\)\{[\s\S]*?#scrollRoot\{[^}]*overflow-y:auto/);
});
