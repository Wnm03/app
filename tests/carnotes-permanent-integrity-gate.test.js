'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const fs=require('fs'); const path=require('path'); const {execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..');

test('Car Notes permanent rollback integrity gate passes',()=>{
  execFileSync(process.execPath,[path.join(ROOT,'scripts/verify-carnotes-integrity.js')],{cwd:ROOT,stdio:'pipe'});
});
test('source-size guard has no source above 1600 lines',()=>{
  execFileSync(process.execPath,[path.join(ROOT,'scripts/verify-source-size.js'),'--strict'],{cwd:ROOT,stdio:'pipe'});
});
test('Car Notes golden DOM anchors remain original-layout contracts',()=>{
  const s=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  for(const x of [
    '<div class="page" id="page-carnotes">','class="page-title">🏍️ Car Notes',
    'id="cnTab-insight"','id="cnTab-bbm"','id="cnTab-servis"','id="cnTab-pajak"','id="cnTab-jalan"',
    'class="cn-tab active"','data-action="setCnTab"','id="carNotesFab"'
  ]) assert.ok(s.includes(x),`missing golden anchor: ${x}`);
  assert.ok(!s.includes('proCnBottomNav')&&!s.includes('proMockupScreens'));
});
