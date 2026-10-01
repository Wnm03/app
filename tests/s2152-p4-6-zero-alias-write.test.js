'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..');
const RUNTIME_EXCLUDE=new Set(['modules/vehicle/stock-command-sot.js']);
function runtimeFiles(){
 const out=[];
 function walk(dir){for(const n of fs.readdirSync(dir)){const f=path.join(dir,n),r=path.relative(ROOT,f).replace(/\\/g,'/'); if(n==='tests'||n==='docs'||n==='node_modules'||n.endsWith('.min.js'))continue; const st=fs.statSync(f); if(st.isDirectory())walk(f); else if(n.endsWith('.js')&&!RUNTIME_EXCLUDE.has(r))out.push(r);}}
 walk(ROOT); return out;
}
function stripComments(s){return s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|\s)\/\/.*$/gm,'$1');}

test('P4.6 known stock mutator modules do not mutate stock fields outside StockCommandSOT',()=>{
 const files=[
  'modules/vehicle/vehicle-stock-sot.js',
  'modules/vehicle/vehicle-catalog-migration-sot.js',
  'data-health-check.js',
  'modules/vehicle/part-crud-s2041.js',
  'modules/vehicle/sparepart-servis-ui.js',
  'modules/finance/tx-stok-sparepart.js'
 ];
 const violations=[];
 const re=/\b(?:stock|p|part|row|item)\.(?:qty|price|avgPrice|lastPrice|priceHistory|txRefs|lastTxId|isArchived|archivedQtyBefore|archivedAt|archivedReason|catalogId|catalogPartId|catalogPartName|catalogPartOemCode|catalogCategory|catalogSubcategory)\s*(?:\+=|-=|=(?!=)|\.push|\.splice|\.pop|\.shift|\.unshift)/g;
 for(const rel of files){
  const clean=stripComments(fs.readFileSync(path.join(ROOT,rel),'utf8'));
  if(rel==='modules/vehicle/vehicle-stock-sot.js'||rel==='modules/vehicle/vehicle-catalog-migration-sot.js'){}
  if(re.test(clean))violations.push(rel);
  re.lastIndex=0;
 }
 assert.deepEqual(violations,[]);
});

test('P4.6 VehicleStockSOT delegates catalog-stock mutation to StockCommandSOT',()=>{
 const s=fs.readFileSync(path.join(ROOT,'modules/vehicle/vehicle-stock-sot.js'),'utf8');
 assert.match(s,/StockCommandSOT\.update\(stock\.id,patch/);
 assert.doesNotMatch(s,/stock\.(catalogPartId|catalogId|catalogPartName|catalogPartOemCode|catalogCategory|catalogSubcategory)\s*=/);
});

test('P4.6 bundled self-tests do not directly replace or push D.partsStock',()=>{
 for(const rel of ['modules/shared/self-test-cases-a.js','modules/shared/self-test-cases-b.js']){
  const s=stripComments(fs.readFileSync(path.join(ROOT,rel),'utf8'));
  assert.doesNotMatch(s,/D\.partsStock\s*=(?!=)/);
  assert.doesNotMatch(s,/D\.partsStock\.(?:push|splice|pop|shift|unshift)\s*\(/);
 }
});
