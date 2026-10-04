'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function ctx(D,saveMode){
  return loadSource(['modules/finance/titipan-reconcile.js'],{
    D,
    save:()=>{if(saveMode==='false')return false;if(saveMode==='throw')throw new Error('save failed');return true;},
    AIBus:{emit:()=>{}},
    MultiOwnerEngine:{getOwners:(x)=>({ok:true,owners:x.owners||[]})},
    Investment:{getOwners:(x)=>x.owners||[]},
    Aset:{getOwnerSettlement:()=> 'titipan'},
    resolveOwnerDefaultForAccount:()=>({ok:true,owners:[{ownerId:'o1'}]}),
  }, ['TitipanReconcile']);
}
test('S2478 repairOwnerIdConsistency rolls back assets/investments/debts on save false',()=>{
 const D={ownerRegistry:[{id:'o1',name:'Budi'}],assets:[{id:'a',owners:[{ownerId:'legacy',ownerName:'Budi',isSelf:false,porsi:100}]}],investments:[{id:'i',owners:[{ownerId:'other',ownerName:'Budi',isSelf:false,porsi:100}]}],debts:[{id:'d',linkedOwnerId:'legacy',name:'Budi'}]};
 const before=JSON.stringify(D);const c=ctx(D,'false');const r=c.TitipanReconcile.repairOwnerIdConsistency();assert.equal(r.reason,'persistence-failed');assert.equal(JSON.stringify(D),before);
});
test('S2478 repairDebtNameStaleness rolls back debt labels on save throw',()=>{
 const D={ownerRegistry:[{id:'o1',name:'Budi Baru'}],debts:[{id:'d',linkedOwnerId:'o1',name:'Budi'}]};const before=JSON.stringify(D);const c=ctx(D,'throw');const r=c.TitipanReconcile.repairDebtNameStaleness();assert.equal(r.reason,'persistence-failed');assert.equal(JSON.stringify(D),before);
});
test('S2478 repairTransactionOwnerRefs rolls back transaction owner repair on save false',()=>{
 const D={transactions:[{id:'t1',accountId:'a1',deductionOwnerId:'ghost'}]};const before=JSON.stringify(D);const c=ctx(D,'false');c.TitipanReconcile.checkTransactionOwnerRefs=()=>({orphan:[{txId:'t1'}]});const r=c.TitipanReconcile.repairTransactionOwnerRefs();assert.equal(r.reason,'persistence-failed');assert.equal(JSON.stringify(D),before);
});
