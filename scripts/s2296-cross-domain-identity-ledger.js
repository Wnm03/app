'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=path.join(__dirname,'..');
const checks=[];
function ok(name,pass,detail){checks.push({name,pass,detail});if(!pass)throw new Error(name+': '+detail);}
function load(file,ctx){vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});}
(async()=>{
  const events=[];
  const ctx=vm.createContext({
    console:{log(){},warn(){},error(){}},
    Date,Math,JSON,Map,Set,Promise,
    D:{partsStock:[{id:'part-1',qty:5,price:100,avgPrice:100,priceHistory:[],txRefs:[]}],transactions:[],servisLogs:[]},
    AIBus:{emit(name,payload){events.push({name,payload});}},
    save(){}
  });
  load('modules/vehicle/stock-command-sot.js',ctx);
  const S=ctx.StockCommandSOT;
  const p=ctx.D.partsStock[0];
  const a=S.applyPurchase('part-1',2,120,'2026-10-02','tx-2296');
  ok('purchase-first-applies-once',a.ok&&a.qtyAdded===2&&p.qty===7,'first purchase must add exactly 2');
  const a2=S.applyPurchase('part-1',2,120,'2026-10-02','tx-2296');
  ok('purchase-duplicate-noop',a2.ok&&a2.alreadyApplied===true&&a2.qtyAdded===0&&p.qty===7&&p.priceHistory.length===1,'duplicate purchase replay changed stock/history');
  const r=S.revertPurchase('part-1',2,'tx-2296');
  ok('purchase-revert-first-applies',r.ok&&r.replayed===true&&p.qty===5&&p.priceHistory.length===0,'first revert must restore quantity and remove history');
  const r2=S.revertPurchase('part-1',2,'tx-2296');
  ok('purchase-revert-duplicate-noop',r2.ok&&r2.alreadyReverted===true&&r2.qtyRemoved===0&&p.qty===5,'duplicate revert changed stock');
  ok('event-identity-retained',events.filter(e=>e.name==='finance.updated').length===2&&events.every(e=>e.payload.txId==='tx-2296'),'stock replay events retain transaction identity');
  // Cross-domain identity contract: same tx identity must be usable on service side.
  const serviceSource=fs.readFileSync(path.join(root,'modules/vehicle/service-event-adapter.js'),'utf8');
  ok('service-transaction-identity-contract',/findServiceEventForTransaction[\s\S]*txLinkId/.test(serviceSource)&&/findServiceEventByIdempotencyKey/.test(serviceSource),'service adapter must expose transaction/idempotency identity lookup');
  console.log(`S2296: ${checks.length}/${checks.length} PASS`);
  checks.forEach((x,i)=>console.log(`${i+1}. PASS ${x.name}`));
})().catch(err=>{console.error('S2296 FAIL:',err.message);process.exitCode=1;});
