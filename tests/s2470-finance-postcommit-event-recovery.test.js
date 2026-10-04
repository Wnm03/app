'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const outbox=fs.readFileSync('modules/finance/finance-event-outbox.js','utf8');
const financeFiles=[
 'modules/finance/transaksi-b.js','modules/finance/tx-transfer.js','modules/finance/piutang-utang.js',
 'modules/finance/dana-titipan-commitment-return-api.js','modules/finance/titipan-expense-flow.js',
 'modules/finance/tagihan-kalender.js','modules/finance/titipan-reconcile.js','modules/finance/pajak-pbb-zakat.js',
 'modules/finance/akun.js','modules/finance/dana-titipan-pool-api.js','modules/finance/tx-renov.js'
];
function load(extra={}){
 const store={}; const ctx={console,Date,Math,JSON,setTimeout:()=>{},clearTimeout(){},
  localStorage:{getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},...extra};
 ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx); vm.runInContext(outbox,ctx); return {ctx,store};
}
let pass=0,total=0;
async function t(name,fn){total++;try{await fn();pass++;console.log('PASS',name)}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}
(async()=>{
 await t('post-commit synchronous listener failure is queued with stable event identity',async()=>{
  const x=load(); let calls=0;
  x.ctx.AIBus={emit:()=>{calls++;throw new Error('consumer failed')}};
  assert.strictEqual(x.ctx.FinanceEventOutbox.emitOrEnqueue('finance.updated',{txId:'tx-1'}),true);
  assert.strictEqual(calls,1);
  const pending=x.ctx.FinanceEventOutbox.pending();
  assert.strictEqual(pending.length,1); assert.strictEqual(pending[0].payload.txId,'tx-1'); assert.ok(pending[0].eventId);
 });
 await t('queued post-commit event retries after consumer recovers',async()=>{
  const x=load(); x.ctx.AIBus={emit:()=>{throw new Error('down')}};
  x.ctx.FinanceEventOutbox.emitOrEnqueue('account.updated',{accountId:'a1'});
  const first=x.ctx.FinanceEventOutbox.pending()[0].eventId;
  x.ctx.AIBus={emit:()=>{}};
  assert.strictEqual(await x.ctx.FinanceEventOutbox.replay(),true);
  assert.strictEqual(x.ctx.FinanceEventOutbox.pending().length,0);
  assert.ok(first);
 });
 await t('Finance production direct post-commit emissions use durable fallback path',async()=>{
  for(const f of financeFiles){
   const s=fs.readFileSync(f,'utf8');
   const lines=s.split('\n');
   for(let i=0;i<lines.length;i++){
    if(lines[i].includes('AIBus.emit(') && !lines[i].includes('FinanceEventOutbox.emitOrEnqueue(') && !lines[i].includes('FinanceCrossEntityAtomic.emit(') && !lines[i].includes('emitAsync(')){
      // Existing try/catch paths are intentionally allowed; direct uncaught emit is not.
      const c=lines.slice(Math.max(0,i-3),Math.min(lines.length,i+4)).join('\n');
      if(!/try\s*\{[\s\S]*catch/.test(c)) throw new Error(`${f}:${i+1} direct uncaught AIBus.emit`);
    }
   }
  }
 });
 console.log(`${pass}/${total} PASS`); if(pass!==total)process.exitCode=1;
})();
