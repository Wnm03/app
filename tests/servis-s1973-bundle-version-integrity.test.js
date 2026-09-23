'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const version='1974';
const buildVersion='s1956-service-history-audit-package-1974';

test('S1974 bundle/version gate: source, HTML, SW, and runtime bundles are synchronized',()=>{
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const prod=fs.readFileSync(path.join(root,'app_production.html'),'utf8');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  const a=fs.readFileSync(path.join(root,'app-bundle-a.min.js'),'utf8');
  const b=fs.readFileSync(path.join(root,'app-bundle-b.min.js'),'utf8');
  const render=fs.readFileSync(path.join(root,'modules/shared/modules-render.js'),'utf8');
  assert.match(index,/\?v=1974/);
  assert.match(prod,/\?v=1974/);
  assert.match(sw,/kw-cache-v1974/);
  assert.match(render,new RegExp(buildVersion.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(a,/s1956-service-history-audit-package-1974/);
  assert.match(b,/S1973: Bulk History Identity Editor hardening/);
  assert.match(b,/schemaVersion:'S1973'/);
  assert.doesNotMatch(index,/\?v=1972/);
  assert.doesNotMatch(sw,/kw-cache-v1972/);
});
console.log('S1973 bundle/version integrity: PASS');
