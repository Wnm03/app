const assert=require('assert'),fs=require('fs'),vm=require('vm');
const D={transactions:[{id:'base'}]};
const ctx={console,D,FinanceEventOutbox:{stageBatch:()=>false},AIBus:{emit:()=>{}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('modules/finance/finance-cross-entity-atomic.js','utf8'),ctx);
const tx=ctx.FinanceCrossEntityAtomic.begin(['transactions']);D.transactions.push({id:'new'});tx.emit('finance.updated',{id:'new'});let failed=false;try{tx.commit()}catch(e){failed=true}assert.strictEqual(failed,true);assert.strictEqual(JSON.stringify(D.transactions),JSON.stringify([{id:'base'}]));console.log('S2205 atomic capacity rollback PASS');
