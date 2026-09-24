'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const canonicalSrc=fs.readFileSync(path.join(root,'modules/shared/features-helpers-global-security.js'),'utf8');
const buildVersion=canonicalSrc.match(/APP_BUILD_VERSION\s*=\s*'([^']+)'/)[1];
const version=buildVersion.match(/(\d+)$/)[1];
assert.ok(Number(version)>=1974,'canonical version must not regress below S1974');

test('S1974 bundle/version gate: source, HTML, SW, and runtime bundles are synchronized',()=>{
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const prod=fs.readFileSync(path.join(root,'app_production.html'),'utf8');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  const a=fs.readFileSync(path.join(root,'app-bundle-a.min.js'),'utf8');
  const b=fs.readFileSync(path.join(root,'app-bundle-b.min.js'),'utf8');
  const render=fs.readFileSync(path.join(root,'modules/shared/modules-render.js'),'utf8');
  assert.match(index,new RegExp('\\?v='+version));
  assert.match(prod,new RegExp('\\?v='+version));
  assert.match(sw,new RegExp('kw-cache-v'+version));
  assert.match(render,new RegExp(buildVersion.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(a,new RegExp(buildVersion.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(b,/S1973: Bulk History Identity Editor hardening/);
  assert.match(b,/schemaVersion:'S1973'/);
  assert.doesNotMatch(index,/\?v=1972/);
  assert.doesNotMatch(sw,/kw-cache-v1972/);
});
console.log('S1973 bundle/version integrity: PASS');
