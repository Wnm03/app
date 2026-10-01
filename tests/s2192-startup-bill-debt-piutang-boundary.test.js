'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');

test('S2192 startup initializes bill collections before Debt.syncBill()',()=>{
  const billsInit=src.indexOf("if(!D.bills) D.bills=[];");
  const archiveInit=src.indexOf("if(!D.billsArchive) D.billsArchive=[];");
  const debtInit=src.indexOf("if(!D.debts) D.debts=[];");
  const sync=src.indexOf('D.debts.forEach(d=>{try{if(typeof Debt!==\'undefined\')Debt.syncBill(d);');
  assert.ok(billsInit>=0&&archiveInit>=0&&debtInit>=0&&sync>=0);
  assert.ok(billsInit<debtInit,'D.bills harus tersedia sebelum blok Debt');
  assert.ok(archiveInit<debtInit,'D.billsArchive harus tersedia sebelum blok Debt');
  assert.ok(debtInit<sync,'Debt.syncBill harus dijalankan setelah D.debts diinisialisasi');
});

test('S2192 startup Debt.syncBill failure is observable, not silently swallowed',()=>{
  assert.match(src,/console\.error\('Startup Debt\.syncBill gagal:'/);
  assert.doesNotMatch(src,/D\.debts\.forEach\(d=>\{try\{if\(typeof Debt!=='undefined'\)Debt\.syncBill\(d\);\}catch\(e\)\{void e;\}\}\);/);
});
