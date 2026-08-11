'use strict';
/**
 * s327 — audit integritas Tagihan/Cicilan/Langganan:
 * 1) hapus pembayaran terakhir setelah bill nunggak beberapa periode harus
 *    mengembalikan nextDue EXACT ke nilai sebelum pembayaran, bukan sekadar -1 periode.
 * 2) hapus arsip tagihan memutus billLinkId transaksi tanpa menghapus transaksi.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

test('revertBillFromDeletedTx() — cicilan nunggak beberapa periode mengembalikan nextDue snapshot persis',()=>{
  const D={
    bills:[{id:'b1',kind:'cicilan',name:'Motor',sisaTenor:4,nextDue:'2026-12-01'}],
    billsArchive:[],
    transactions:[{id:20,billLinkId:'b1',amount:100000,billPrevNextDue:'2026-07-01'}],
    piutang:[]
  };
  const ctx=loadSource(['modules/finance/tagihan-kalender.js'],{D,isLatestBillPaymentTx:()=>true},['revertBillFromDeletedTx']);
  const res=ctx.revertBillFromDeletedTx(D.transactions[0]);
  assert.equal(res.isLatest,true);
  assert.equal(D.bills[0].sisaTenor,5);
  assert.equal(D.bills[0].nextDue,'2026-07-01');
});

test('revertBillFromDeletedTx() — langganan nunggak mengembalikan nextDue snapshot, bukan -1 periode',()=>{
  const D={
    bills:[{id:'b2',kind:'langganan',name:'Internet',freq:'bulanan',nextDue:'2026-11-01'}],
    billsArchive:[],
    transactions:[{id:30,billLinkId:'b2',amount:300000,billPrevNextDue:'2026-08-01'}],
    piutang:[]
  };
  const ctx=loadSource(['modules/finance/tagihan-kalender.js'],{D,isLatestBillPaymentTx:()=>true},['revertBillFromDeletedTx']);
  ctx.revertBillFromDeletedTx(D.transactions[0]);
  assert.equal(D.bills[0].nextDue,'2026-08-01');
});

test('delBillArchive() — arsip dihapus tetapi transaksi historis tetap ada dan billLinkId dilepas',async()=>{
  const D={
    bills:[],
    billsArchive:[{id:'arch1',name:'PBB',kind:'tagihan'}],
    transactions:[
      {id:1,billLinkId:'arch1',amount:50000},
      {id:2,billLinkId:'other',amount:20000},
      {id:3,amount:10000}
    ],
    piutang:[]
  };
  const ctx=loadSource(['modules/finance/tagihan-kalender.js'],{
    D,
    askConfirm:async()=>true,escapeHtml:(x)=>String(x),
    save:()=>{},renderBillArchive:()=>{},renderKeuangan:()=>{},renderDashboard:()=>{},renderBillList:()=>{},renderSettings:()=>{},renderBillHistory:()=>{},checkBills:()=>{},renderKekayaanBersih:()=>{},hitungZakatMaal:()=>{},toast:()=>{},
    removeOrphanedAutoPiutangForBill:()=>false
  },['delBillArchive']);
  await ctx.delBillArchive('arch1');
  assert.equal(D.billsArchive.length,0);
  assert.equal(D.transactions.length,3);
  assert.equal(D.transactions[0].billLinkId,undefined);
  assert.equal(D.transactions[1].billLinkId,'other');
});
