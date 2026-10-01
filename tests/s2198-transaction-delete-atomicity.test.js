const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const atomicSrc=fs.readFileSync('modules/finance/finance-cross-entity-atomic.js','utf8');
const sotSrc=fs.readFileSync('modules/finance/finance-tx-sot.js','utf8');
const txSrc=fs.readFileSync('modules/finance/tx-list-cashflow.js','utf8');
function ctx(){
  const c={console,globalThis:null,window:null}; c.globalThis=c; c.window=c;
  c.D={
    transactions:[{id:'t1',type:'expense',amount:100,stockItems:[{productId:'p1',qty:2}]}],
    bills:[{id:'b1'}],billsArchive:[],debts:[{id:'d1',nilai:100}],piutang:[{id:'p0'}],
    bbmLogs:[],products:[{id:'p1',stock:10}],cobek:[],servisLogs:[],partsStock:[],investmentTx:[],
    renovProjects:[],sewaKios:{units:[]},tukangAbsensi:[]
  };
  c.askConfirm=async()=>true; c.toast=()=>{}; c.save=()=>true;
  c.refreshAfterMutation=()=>{}; c.renderDashboard=()=>{}; c.renderKeuangan=()=>{}; c.renderCnTab=()=>{}; c.renderProductList=()=>{};
  c.ProductRepository={mutateStockDelta(){throw new Error('simulated stock mutation failure');}};
  vm.runInNewContext(atomicSrc,c); vm.runInNewContext(sotSrc,c); vm.runInNewContext(txSrc,c);
  return c;
}
function test(name,fn){try{Promise.resolve(fn()).then(()=>console.log('PASS',name)).catch(e=>{console.error('FAIL',name,e);process.exitCode=1;});}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}

test('delete rollback restores transaction and cross-domain collections after cascade failure',async()=>{
 const c=ctx(); const before=JSON.stringify(c.D);
 await c.delTx('t1');
 assert.strictEqual(JSON.stringify(c.D),before);
});

test('successful delete commits transaction removal',async()=>{
 const c=ctx(); c.ProductRepository={mutateStockDelta(p,d){p.stock+=d;}};
 await c.delTx('t1');
 assert.strictEqual(c.D.transactions.length,0);
 assert.strictEqual(c.D.products[0].stock,8);
});

const src=fs.readFileSync('modules/finance/tx-list-cashflow.js','utf8');
test('delete path declares all mutable cascade collections in atomic boundary',()=>{
 for(const k of ['transactions','bills','billsArchive','debts','piutang','bbmLogs','products','cobek','servisLogs','partsStock','investmentTx','renovProjects','sewaKios','tukangAbsensi']){
   assert.ok(src.includes("'"+k+"'"), 'missing atomic key '+k);
 }
 assert.ok(src.includes("S2198: atomic transaction delete rollback"));
});
console.log('S2198 tests complete');
