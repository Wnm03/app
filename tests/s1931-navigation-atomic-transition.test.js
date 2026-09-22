'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

test('S1931: showPage keeps the previous page painted until destination rendering commits',()=>{
  const src=read('modules/shared/modal-navigasi.js');
  const start=src.indexOf('function showPage(name,el,opts){');
  const end=src.indexOf('\n/* moved to modules-render.js',start);
  const body=src.slice(start,end);
  const pending=body.indexOf("pageEl.classList.add('nav-transition-pending')");
  const render=body.indexOf('renderPageContent(name);');
  const commit=body.indexOf("pageEl.classList.remove('nav-transition-pending')");
  const navCommit=body.lastIndexOf("n.classList.remove('active')");
  assert.ok(pending>=0,'destination pending state missing');
  assert.ok(render>pending,'destination must be prepared before render');
  assert.ok(commit>render,'destination must stay pending until render completes');
  assert.ok(navCommit>render,'bottom-nav state must commit after destination render');
});

test('S1931: navigation has an explicit visual hold/pending contract and no mobile page fade',()=>{
  const css=read('styles.css');
  assert.match(css,/\.page\.nav-transition-hold\{display:block!important;visibility:visible!important;pointer-events:none!important;\}/);
  assert.match(css,/\.page\.nav-transition-pending\{visibility:hidden!important;pointer-events:none!important;\}/);
  assert.match(css,/\.page\{animation:none!important;opacity:1!important;transform:none!important;\}/);
  assert.match(css,/\.page\.active\{display:block!important;visibility:visible!important;opacity:1!important;transform:none!important;animation:none!important;pointer-events:auto;\}/);
});

test('S1931: styles.css is back under the release UI budget',()=>{
  const bytes=fs.statSync(path.join(ROOT,'styles.css')).size;
  assert.ok(bytes<=180000,`styles.css is ${bytes} bytes; budget is 180000`);
});

test('S1931: shared navigation remains the single bundled showPage owner',()=>{
  const build=read('scripts/build.js');
  assert.match(build,/['\"]modules\/shared\/modal-navigasi\.js['\"]/);
  assert.doesNotMatch(build,/['\"]modules\/asset\/modal-navigasi\.js['\"]/);
});
