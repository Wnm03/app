'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
for(const file of ['index.html','app_production.html']){
  const s=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(s,/service-history-context-s2018\.js\?v=2019/);
  assert.match(s,/service-history-multichecklist-s2019\.js\?v=2019/);
  assert.match(s,/service-history-context-hardening-s2020\.js\?v=2020/);
  assert.match(s,/app-bundle-b\.min\.js\?v=2019/);
}
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert.match(sw,/kw-cache-v2030/);
assert.match(sw,/service-history-context-s2018\.js/);
assert.match(sw,/service-history-multichecklist-s2019\.js/);
assert.match(sw,/service-history-context-hardening-s2020\.js/);
for(const file of ['service-history-context-s2018.js','service-history-multichecklist-s2019.js']){
  const source=fs.readFileSync(path.join(root,'modules/vehicle',file),'utf8');
  assert.doesNotMatch(source,/TODO/i);
}
console.log('S2019 HTML/SW wiring regression: PASS');
