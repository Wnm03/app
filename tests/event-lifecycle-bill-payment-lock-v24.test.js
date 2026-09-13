'use strict';
/**
 * V24 — action-level payment lock.
 *
 * The central data-action dispatcher already has `dataset.pendingAction`, but
 * that lock is DOM-node scoped. A render/edit can replace the Bayar element,
 * producing a new node with no pending flag while the original markBillPaid()
 * is still waiting on a modal. The canonical action therefore needs a bill-ID
 * scoped in-flight lock as well.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const SRC=fs.readFileSync(path.join(__dirname,'..','modules','finance','tagihan-kalender.js'),'utf8');
function extractFnSource(name){
 const m=[`async function ${name}(`,`function ${name}(`].map(x=>SRC.indexOf(x)).find(x=>x>=0);
 if(m==null)throw new Error(`${name} not found`);
 const b=SRC.indexOf('{',m);let d=1,i=b+1;
 while(i<SRC.length&&d){if(SRC[i]==='{')d++;else if(SRC[i]==='}')d--;i++;}
 return SRC.slice(m,i);
}
function sandbox(D){
 let resolver;
 const ctx={console,Math,Date,D,window:{},toast:()=>{},sameId:(a,b)=>String(a)===String(b),uid:()=> 'tx-'+Date.now(),
   getBillPaidThisPeriodInfo:()=>null,askConfirm:async()=>true,
   showPromptModal:async()=>new Promise(r=>{resolver=r}),
   save:()=>{},refreshBillEverywhere:()=>{},renderDebtList:()=>{},renderKekayaanBersih:()=>{},hitungZakatMaal:()=>{},
   escapeHtml:s=>s,fmtFull:n=>String(n),maybeCreateSharedPiutangFromBill:()=>{},
 };
 vm.createContext(ctx);
 vm.runInContext(`${extractFnSource('_amc015')}\n${extractFnSource('advanceBillNextDue')}\n${extractFnSource('markBillPaid')}\nthis.markBillPaid=markBillPaid;`,ctx);
 ctx.releasePrompt=()=>resolver&&resolver('2026-09-12');
 return ctx;
}

test('V24 — dua node Bayar untuk bill yang sama tidak boleh menjalankan markBillPaid concurrent',async()=>{
 const D={bills:[{id:'b1',name:'Internet',amount:100,nextDue:'2026-10-01',freq:'bulanan',kind:'tagihan',category:'Tagihan'}],transactions:[],billsArchive:[],accounts:[{id:'a1'}]};
 const ctx=sandbox(D);
 const p1=ctx.markBillPaid('b1');
 // p1 tertahan di modal tanggal. Panggilan kedua memakai node DOM berbeda,
 // sehingga dispatcher pendingAction saja tidak akan membantu; lock ID harus menahannya.
 const p2=ctx.markBillPaid('b1');
 await Promise.resolve();
 assert.equal(ctx.__kwMarkBillPaidInFlight.has('b1'),true);
 ctx.releasePrompt();
 await p1; await p2;
 assert.equal(D.transactions.length,1,'hanya satu transaksi pembayaran boleh tercatat');
 assert.equal(ctx.__kwMarkBillPaidInFlight.has('b1'),false,'lock harus dilepas setelah action selesai');
});

test('V24 — lock dilepas saat action gagal/throw async',async()=>{
 const D={bills:[{id:'b2',name:'Gagal',amount:100,nextDue:'2026-10-01',freq:'bulanan',kind:'tagihan',category:'Tagihan'}],transactions:[],billsArchive:[],accounts:[{id:'a1'}]};
 const ctx=sandbox(D);
 ctx.showPromptModal=async()=>{throw new Error('modal failure')};
 await assert.rejects(()=>ctx.markBillPaid('b2'),/modal failure/);
 assert.equal(ctx.__kwMarkBillPaidInFlight.has('b2'),false);
});
