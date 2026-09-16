'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const fs=require('fs'); const path=require('path');
const ROOT=path.join(__dirname,'..');
const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const prod=fs.readFileSync(path.join(ROOT,'app_production.html'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');

test('fresh-install SW precache contains both production entry points and bundles',()=>{
  for(const p of ['./index.html','./app_production.html','./app-bundle-a.min.js','./app-bundle-b.min.js']) assert.ok(sw.includes(`'${p}'`),`SW precache missing ${p}`);
  assert.match(sw,/addEventListener\('install'/); assert.match(sw,/caches\.open\(CACHE_NAME\)/); assert.match(sw,/cache\.addAll\(PRECACHE_URLS\)/);
});
test('SW cache version and HTML cache-busting versions are identical',()=>{
  const versions=[...idx.matchAll(/\?v=(\d+)/g)].map(m=>m[1]);
  const prodVersions=[...prod.matchAll(/\?v=(\d+)/g)].map(m=>m[1]);
  const m=sw.match(/CACHE_NAME\s*=\s*['"]kw-cache-v(\d+)['"]/);
  assert.ok(m); assert.ok(versions.length); assert.deepEqual([...new Set(versions)],[m[1]]); assert.deepEqual([...new Set(prodVersions)],[m[1]]);
});
test('offline fetch never returns undefined Response',()=>{
  assert.match(sw,/if\s*\(cached\)\s*return cached;/); assert.match(sw,/return new Response\('Offline/);
});
