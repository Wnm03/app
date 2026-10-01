'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');

const ROOT=path.join(__dirname,'..');
const EXCLUDED=new Set([
  'modules/vehicle/stock-command-sot.js',
  // These are isolated fixture/self-test files; they intentionally seed/reset D.
  'modules/shared/self-test-cases-a.js',
  'modules/shared/self-test-cases-b.js'
]);

function sourceFiles(){
  const out=[];
  function walk(dir){
    for(const name of fs.readdirSync(dir)){
      const full=path.join(dir,name);
      const rel=path.relative(ROOT,full).replace(/\\/g,'/');
      if(name==='tests'||name==='docs'||name==='node_modules'||name==='backups'||name==='.test-checkpoints'||name.endsWith('.min.js'))continue;
      const st=fs.statSync(full);
      if(st.isDirectory())walk(full);
      else if(name.endsWith('.js')&&!EXCLUDED.has(rel))out.push(rel);
    }
  }
  walk(ROOT);
  return out;
}
function stripComments(s){
  return s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|\\s)\/\/.*$/gm,'$1');
}
test('P4.5 zero-direct-write: runtime source has no direct D.partsStock collection writes outside StockCommandSOT',()=>{
  const violations=[];
  const patterns=[
    /D\.partsStock\s*=(?!=)/g,
    /D\.partsStock\.(?:push|splice|pop|shift|unshift|sort|reverse)\s*\(/g,
    /Object\.assign\s*\(\s*D\.partsStock/g
  ];
  for(const rel of sourceFiles()){
    const clean=stripComments(fs.readFileSync(path.join(ROOT,rel),'utf8'));
    for(const re of patterns){
      if(re.test(clean))violations.push(`${rel}: ${re}`);
    }
  }
  assert.deepEqual(violations,[]);
});

test('P4.5 zero-direct-write: runtime source does not mutate stock item fields directly',()=>{
  const violations=[];
  const re=/\b(?:p|part|row|item|autoGantiStock)\.(?:qty|price|avgPrice|lastPrice|priceHistory|txRefs|lastTxId|isArchived|archivedQtyBefore|archivedAt|archivedReason)\s*(?:[+\-]?=|\.push|\.splice)/g;
  for(const rel of sourceFiles()){
    const clean=stripComments(fs.readFileSync(path.join(ROOT,rel),'utf8'));
    if(!/D\.partsStock\b/.test(clean))continue;
    if(re.test(clean))violations.push(rel);
    re.lastIndex=0;
  }
  assert.deepEqual(violations,[]);
});

test('P4.5 StockCommandSOT is the only mutation gateway and preserves D.partsStock identity',()=>{
  delete require.cache[require.resolve('../modules/vehicle/stock-command-sot.js')];
  global.D={partsStock:[]};
  global.save=()=>{};
  const S=require('../modules/vehicle/stock-command-sot.js');
  assert.equal(S.ensureStorage(),D.partsStock);
  const ref=D.partsStock;
  assert.equal(S.create({id:'p1',qty:5}).ok,true);
  assert.equal(S.setQty('p1',3,{journal:false}).ok,true);
  assert.equal(S.adjustQty('p1',2,{journal:false}).ok,true);
  assert.equal(S.consume('p1',1,{journal:false}).ok,true);
  assert.equal(S.remove('p1').ok,true);
  assert.strictEqual(D.partsStock,ref);
});

test('P4.5 restore and rollback commands remain available without direct storage replacement',()=>{
  delete require.cache[require.resolve('../modules/vehicle/stock-command-sot.js')];
  global.D={partsStock:[{id:'p1',qty:8,name:'Oli'}]};
  global.save=()=>{};
  const S=require('../modules/vehicle/stock-command-sot.js');
  const ref=D.partsStock;
  assert.equal(S.replaceSnapshot([{id:'p1',qty:2},{id:'p2',qty:4}]).ok,true);
  assert.strictEqual(D.partsStock,ref);
  assert.equal(S.setQtyMap(new Map([['p1',7],['p2',1]])).ok,true);
  assert.deepEqual(D.partsStock.map(x=>x.qty),[7,1]);
});
