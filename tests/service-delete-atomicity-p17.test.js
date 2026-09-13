const assert = require('assert');

function clone(v){ return JSON.parse(JSON.stringify(v)); }

async function runDelete({ failLifecycle=false, failSave=false }={}) {
  const D = {
    servisLogs:[{id:'s1',vehicleId:'v1',txLinkId:'t1',usedPartId:'p1',usedPartQty:2,catalogPartLinkedStockId:'p2',catalogPartQty:1,autoGantiStockId:'p3',categoryId:'c1'}],
    transactions:[{id:'t1',vehicleId:'v1',amount:100,servisLinkId:'s1'},{id:'other',amount:50}],
    partsStock:[{id:'p1',qty:3},{id:'p2',qty:4},{id:'p3',qty:5}]
  };
  const before=clone(D);
  const lifecycle=[];
  const ServiceEventLifecycle={remove(s,payload){lifecycle.push({s:clone(s),payload}); if(failLifecycle)throw new Error('lifecycle');}};
  const save=()=>{if(failSave)throw new Error('save');};
  const revert=(id,qty)=>{const p=D.partsStock.find(x=>x.id===id); if(p)p.qty+=qty;};
  const s=D.servisLogs.find(x=>x.id==='s1');
  const deletedTxId=s.txLinkId||null;
  try{
    if(deletedTxId)D.transactions=D.transactions.filter(tx=>tx.id!==deletedTxId);
    revert(s.usedPartId,s.usedPartQty); revert(s.catalogPartLinkedStockId,s.catalogPartQty); revert(s.autoGantiStockId,1);
    D.servisLogs=D.servisLogs.filter(x=>x.id!=='s1');
    ServiceEventLifecycle.remove(s,{deletedTxId,categoryId:s.categoryId||null,vehicleId:s.vehicleId||null});
    save();
  }catch(err){
    D.servisLogs=clone(before.servisLogs); D.transactions=clone(before.transactions); D.partsStock=clone(before.partsStock);
  }
  return {D,before,lifecycle};
}

(async()=>{
  const ok=await runDelete();
  assert.strictEqual(ok.D.servisLogs.length,0);
  assert.deepStrictEqual(ok.D.transactions,[{id:'other',amount:50}]);
  assert.deepStrictEqual(ok.D.partsStock,[{id:'p1',qty:5},{id:'p2',qty:5},{id:'p3',qty:6}]);
  assert.strictEqual(ok.lifecycle[0].payload.deletedTxId,'t1');

  for(const mode of ['lifecycle','save']){
    const r=await runDelete(mode==='lifecycle'?{failLifecycle:true}:{failSave:true});
    assert.deepStrictEqual(r.D,r.before,`rollback ${mode}`);
  }
  console.log('P17 3/3 PASS');
})();
