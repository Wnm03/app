const assert=require('assert');

async function withServiceAtomicity(state,work){
 const snap={servisLogs:JSON.stringify(state.servisLogs),transactions:JSON.stringify(state.transactions),partsStock:JSON.stringify(state.partsStock),sparepartCats:JSON.stringify(state.sparepartCats)};
 try{return await work();}catch(e){Object.assign(state,{servisLogs:JSON.parse(snap.servisLogs),transactions:JSON.parse(snap.transactions),partsStock:JSON.parse(snap.partsStock),sparepartCats:JSON.parse(snap.sparepartCats)});throw e;}
}
(async()=>{
 const state={servisLogs:[{id:'s1',cost:100}],transactions:[{id:'t1',amount:100}],partsStock:[{id:'p1',qty:3}],sparepartCats:[{id:'c1',intervalKm:5000}]};
 let threw=false;
 try{await withServiceAtomicity(state,async()=>{state.servisLogs[0].cost=250;state.transactions[0].amount=250;state.partsStock[0].qty=1;state.sparepartCats[0].intervalKm=7500;throw new Error('simulated lifecycle failure');});}catch(e){threw=true;}
 assert.equal(threw,true);
 assert.deepEqual(state,{servisLogs:[{id:'s1',cost:100}],transactions:[{id:'t1',amount:100}],partsStock:[{id:'p1',qty:3}],sparepartCats:[{id:'c1',intervalKm:5000}]});
 console.log('P16 atomic rollback: PASS');
 console.log('P16 PASS 1/1');
})().catch(e=>{console.error(e);process.exit(1);});
