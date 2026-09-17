'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const index=read('index.html');
const prod=read('app_production.html');
const core=read('modules/vehicle/vehicle-core.js');
const render=read('modules/shared/modules-render-b.js');
const bundle=read('app-bundle-b.min.js');
const sw=read('sw.js');
const build=read('scripts/build.js');

test('Car Notes navigation uses the canonical app history path',()=>{
  assert.doesNotMatch(sw,/pro-ui-layer|pro-mockup-presenter/i);
});

test('stale Pro history markers cannot be part of the shipped Car Notes source',()=>{
  assert.doesNotMatch(index,/pro-ui-layer\.css|proMockScreen|proCnBottomNav/i); assert.doesNotMatch(prod,/pro-ui-layer\.css|proMockScreen|proCnBottomNav/i)
});
