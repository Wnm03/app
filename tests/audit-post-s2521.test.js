'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

test('monthly bill anchor-day is explicitly left as a product/SOT decision',()=>{
 const fs=require('node:fs'); const s=fs.readFileSync('modules/finance/tagihan-kalender.js','utf8');
 assert.match(s,/function advanceBillNextDue\(nextDue,freq,today\)/);
 assert.doesNotMatch(s,/anchorDay/);
});

test('DSR excludes installment bills with zero or negative remaining tenor',()=>{
 const D={bills:[
  {kind:'cicilan',sisaTenor:0,amount:500},
  {kind:'cicilan',sisaTenor:-2,amount:700},
  {kind:'cicilan',sisaTenor:3,amount:800}
 ],debts:[]};
 const src=require('node:fs').readFileSync('modules/finance/piutang-utang.js','utf8');
 assert.match(src,/b\.kind==='cicilan'&&Number\(b\.sisaTenor\)>0/);
});

test('obvious current-date UI paths no longer use UTC date-only extraction',()=>{
 const fs=require('node:fs');
 for(const f of ['modules/shared/modules-calc.js','modules/vehicle/vehicle-core.js','modules/vehicle/servis.js','modules/finance/tagihan-kalender.js']){
  const s=fs.readFileSync(f,'utf8');
  assert.doesNotMatch(s,/const (?:date|todayStr|_taxDate)=new Date\(\)\.toISOString\(\)\.(?:split\('T'\)\[0\]|slice\(0,10\))/,'UTC current-date assignment remains in '+f);
 }
});
