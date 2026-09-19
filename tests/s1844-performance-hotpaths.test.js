const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');

test('S1844 date cache is present and invalidates when date changes',()=>{
  const s=fs.readFileSync(path.join(root,'modules/shared/features-helpers-global-security.js'),'utf8');
  assert.match(s,/function getCachedTxDateMs\(t\)/);
  assert.match(s,/hit\.raw===raw/);
  assert.match(s,/const _txDateCache=.*WeakMap/);
});

test('S1844 hot render paths use cached date parsing',()=>{
  const files=['modules/shared/modules-render-b.js','modules/finance/tx-list-cashflow.js'];
  for(const f of files){
    const s=fs.readFileSync(path.join(root,f),'utf8');
    assert.match(s,/getCachedTxDateMs\(t\)/,f);
  }
  const render=fs.readFileSync(path.join(root,'modules/shared/modules-render-b.js'),'utf8');
  assert.doesNotMatch(render,/sort\(\(a,b\)=>new Date\(b\.date\)-new Date\(a\.date\)\)/);
});

test('S1844 transaction render batches reuse category/account indexes',()=>{
  const render=fs.readFileSync(path.join(root,'modules/shared/modules-render-b.js'),'utf8');
  const ledger=fs.readFileSync(path.join(root,'modules/finance/tx-list-cashflow.js'),'utf8');
  const report=fs.readFileSync(path.join(root,'modules/finance/filter-laporan.js'),'utf8');
  const target=fs.readFileSync(path.join(root,'modules/finance/tx-target.js'),'utf8');
  assert.match(render,/catsByName:\(typeof _getPerfCategoryIndex/);
  assert.match(ledger,/renderCtx\.catsByName/);
  assert.match(report,/_ftxRenderCtx/);
  assert.match(target,/_targetRenderCtx/);
});
