const assert = require('assert');

async function run(){
  const D={
    servisLogs:[{id:'s1',vehicleId:'v1',usedPartId:'old',usedPartQty:2,catalogPartLinkedStockId:'cold',catalogPartQty:1,categoryId:'cat-old'}],
    transactions:[{id:'tx1',servisLinkId:'s1',amount:100}],
    partsStock:[{id:'old',qty:5},{id:'cold',qty:3},{id:'new',qty:10}],
    sparepartCats:[{id:'cat-old',intervalKm:5000}]
  };
  const before=JSON.stringify(D);
  // Simulate the exact P18 invariant: if a later stock operation fails,
  // restore the complete pre-edit domain snapshot instead of manually
  // replaying partial stock operations.
  function restore(snapshot){Object.assign(D,JSON.parse(snapshot));}
  D.sparepartCats.push({id:'cat-new',intervalKm:7500});
  D.partsStock.find(x=>x.id==='old').qty=7;
  D.partsStock.find(x=>x.id==='cold').qty=4;
  D.partsStock.find(x=>x.id==='new').qty=8;
  restore(before);
  assert.strictEqual(JSON.stringify(D),before);

  // Save failure must also be able to persist the restored snapshot on retry.
  let saves=0; let persisted=JSON.parse(before);
  function save(){
    saves++;
    if(saves===1) throw new Error('simulated save failure');
    persisted=JSON.parse(JSON.stringify(D));
  }
  D.servisLogs[0].cost=999;
  try{save();}catch(e){
    restore(before);
    save();
  }
  assert.deepStrictEqual(persisted,JSON.parse(before));
  console.log('P18 edit atomicity regression: PASS');
}
run().catch(e=>{console.error(e);process.exit(1);});
