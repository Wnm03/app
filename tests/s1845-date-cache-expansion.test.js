const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');

test('S1845 calc hot paths reuse cached transaction timestamps',()=>{
  const s=fs.readFileSync(path.join(root,'modules/shared/modules-calc.js'),'utf8');
  assert.match(s,/function _calcTxDateMs\(t\)/);
  assert.match(s,/getCachedTxDateMs\(t\)/);
  assert.doesNotMatch(s,/new Date\(t\.date\)/);
});

test('S1845 report/target/bill hot paths reuse cached transaction timestamps',()=>{
  const files=['modules/finance/filter-laporan.js','modules/finance/tx-target.js','modules/finance/tagihan-kalender.js'];
  for(const f of files){
    const s=fs.readFileSync(path.join(root,f),'utf8');
    assert.match(s,/getCachedTxDateMs\(t\)/,f);
    assert.doesNotMatch(s,/new Date\(t\.date\)/,f);
  }
});

test('S1845 preserves local fallback for standalone loading',()=>{
  const pairs=[
    ['modules/shared/modules-calc.js','_calcTxDateMs'],
    ['modules/finance/filter-laporan.js','_lapTxDateMs'],
    ['modules/finance/tx-target.js','_targetTxDateMs'],
    ['modules/finance/tagihan-kalender.js','_billTxDateMs']
  ];
  for(const [f,fn] of pairs){
    const s=fs.readFileSync(path.join(root,f),'utf8');
    assert.match(s,new RegExp('function '+fn+'\\(t\\)'));
    assert.match(s,/new Date\(t&&t\.date\)\.getTime\(\)/,f);
  }
});
