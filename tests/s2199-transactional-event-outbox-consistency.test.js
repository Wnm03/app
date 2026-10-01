const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const atomicSrc=fs.readFileSync('modules/finance/finance-cross-entity-atomic.js','utf8');
function ctx(){
  const events=[];
  const c={console,globalThis:null,window:null}; c.globalThis=c; c.window=c;
  c.D={transactions:[{id:'t1'}],bills:[],billsArchive:[],debts:[],piutang:[]};
  c.AIBus={emit(type,payload){events.push({type,payload});}};
  vm.runInNewContext(atomicSrc,c);
  c.events=events;
  return c;
}
function test(name,fn){try{fn();console.log('PASS',name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}

test('event emitted inside atomic scope is deferred until commit',()=>{
 const c=ctx();
 const tx=c.FinanceCrossEntityAtomic.begin(['transactions']);
 tx.emit('finance.updated',{action:'delete'});
 assert.strictEqual(c.events.length,0);
 tx.commit();
 assert.strictEqual(c.events.length,1);
 assert.strictEqual(c.events[0].type,'finance.updated');
});

test('event emitted inside failed atomic scope is discarded on rollback',()=>{
 const c=ctx();
 const tx=c.FinanceCrossEntityAtomic.begin(['transactions']);
 tx.emit('finance.updated',{action:'delete'});
 tx.rollback();
 assert.strictEqual(c.events.length,0);
});

test('outside atomic scope emit keeps legacy immediate behavior',()=>{
 const c=ctx();
 c.FinanceCrossEntityAtomic.emit('finance.updated',{action:'direct'});
 assert.strictEqual(c.events.length,1);
});

test('deferred listener failure does not reopen committed state',()=>{
 const c=ctx(); let calls=0;
 c.AIBus.emit=(type,payload)=>{calls++;throw new Error('listener failure');};
 const tx=c.FinanceCrossEntityAtomic.begin(['transactions']);
 c.D.transactions=[];
 tx.emit('finance.updated',{action:'delete'});
 tx.commit();
 assert.strictEqual(calls,1);
 assert.deepStrictEqual(c.D.transactions,[]);
});
console.log('S2199 tests complete');
