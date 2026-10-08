'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','modules/finance/tagihan-kalender.js'),'utf8');

test('S2536 N18: form/calendar defaults in tagihan-kalender no longer use UTC date',()=>{
  assert.doesNotMatch(src,/billDue'\)\.value=new Date\(\)\.toISOString/);
  assert.doesNotMatch(src,/const todayStr=new Date\(\)\.toISOString/);
  assert.doesNotMatch(src,/billCalSelectedDate=now\.toISOString/);
});

test('S2536 N18 behavior: at local 01:00 on the 1st the default date is the local day, not UTC yesterday',()=>{
  // Local time 2026-10-01 01:00 at UTC+7 == 2026-09-30T18:00Z.
  const m=src.match(/billCalSelectedDate=(now\.getFullYear\(\)[^;]+);/);
  assert.ok(m,'local-date expression for billCalSelectedDate not found');
  const fake={getFullYear:()=>2026,getMonth:()=>9,getDate:()=>1,toISOString:()=>'2026-09-30T18:00:00.000Z'};
  const out=vm.runInNewContext(m[1],{now:fake});
  assert.equal(out,'2026-10-01');
  const d=src.match(/const defaultPayDate=(.+?);\nconst val=/s);
  assert.ok(d,'defaultPayDate expression not found');
  const out2=vm.runInNewContext(d[1],{todayStr:undefined,Date:class{getFullYear(){return 2026}getMonth(){return 9}getDate(){return 1}toISOString(){return '2026-09-30T18:00:00.000Z'}}});
  assert.equal(out2,'2026-10-01');
});
