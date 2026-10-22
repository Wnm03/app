'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const {loadSource}=require('./helpers/loadSource');
const ROOT=path.join(__dirname,'..');
function src(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}

test('S2181 — FinanceTxSOT runtime gateway preserves create semantics',()=>{
  const D={transactions:[]};
  const c=loadSource(['modules/finance/finance-category-sot.js','modules/finance/finance-tx-sot.js'],{D},['FinanceTxSOT']);
  const tx={id:'g1',type:'income',amount:123};
  assert.equal(c.FinanceTxSOT.create(tx),tx);
  assert.equal(D.transactions[0],tx);
});

test('S2181 — salary writers use FinanceTxSOT and keep legacy transaction shape',()=>{
  const monthly=src('modules/business/gaji-bulanan.js');
  const weekly=src('modules/business/reset-gaji-mingguan.js');
  assert.match(monthly,/FinanceTxSOT\.create\(\{id:uid\(\),type:'income'/);
  assert.doesNotMatch(monthly,/D\.transactions\.push\(/);
  assert.match(weekly,/FinanceTxSOT\.create\(\{id:uid\(\),type:'income'/);
  assert.doesNotMatch(weekly,/D\.transactions\.push\(/);
  assert.match(monthly,/note:'Gaji bulanan tetap'/);
  assert.match(weekly,/Gaji mingguan dari absensi/);
});

test('S2181/S2619 — Kasir delegates payment posting to shared Shop reconciliation and SOT writers',()=>{
  const s=src('modules/business/kasir.js');
  const order=src('modules/shop/cobek-order.js');
  assert.match(s,/recordShopSale\(/);
  assert.match(s,/syncShopSalePayment\(\{shopId:result\.shopId,txId,dpRaw,total,accountId:accId,customerName:customer\.name,date,itemSummary\}\)/);
  assert.doesNotMatch(s,/FinanceTxSOT\.create\(\{id:txId,type:'income'/);
  assert.doesNotMatch(s,/D\.transactions\.push\(\{id:txId,type:'income'/);
  assert.match(order,/FinanceTxSOT\.create\(\{id:o\.txId,type:'income'/);
  assert.match(order,/BillDebtPiutangCanonicalWriter\.add\('piutang'/);
  assert.match(order,/amount:dp/);
  assert.match(order,/category:'Bisnis'/);
  assert.match(order,/subcategory:'Cobek'/);
  assert.match(order,/cobekLinkId:o\.shopId/);
});

test('S2181 — actual runtime build loads FinanceTxSOT before writer modules',()=>{
  const b=src('scripts/build.js');
  const iS=b.indexOf("'modules/finance/finance-tx-sot.js'");
  const iPi=b.indexOf("'modules/finance/piutang-utang.js'");
  const iKas=b.indexOf("'modules/business/kasir.js'");
  const iTransfer=b.indexOf("'modules/finance/tx-transfer.js'");
  const iGaji=b.indexOf("'modules/business/gaji-bulanan.js'");
  assert.ok(iS>=0 && iPi>iS && iKas>iS && iTransfer>iS && iGaji>iS);
});
