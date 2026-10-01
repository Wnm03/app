const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'modules/vehicle/servis.js'),'utf8');
const bundle=fs.readFileSync(path.join(ROOT,'app-bundle-b.min.js'),'utf8');

test('P27 applyStockUsages now delegates atomic batch mutation to StockCommandSOT',()=>{
  assert.match(src,/async applyStockUsages\(entries\)\{[\s\S]*?const net=new Map\(\);[\s\S]*?StockCommandSOT\.applyDeltas\(\[\.\.\.net\]/);
  assert.doesNotMatch(src,/async applyStockUsages\(entries\)\{[\s\S]*?p\.qty=restoreQty;/);
});

test('P27 replaceStockUsages delegates netted delta mutation to StockCommandSOT with rollback authority',()=>{
  const start=src.indexOf('async replaceStockUsages(oldEntries,newEntries)');
  const end=src.indexOf('/** Cari 1 item Stok Sparepart',start);
  const fn=src.slice(start,end);
  assert.match(fn,/const net=new Map\(\);/);
  assert.match(fn,/add\(oldEntries,-1\);add\(newEntries,1\);/);
  assert.match(fn,/StockCommandSOT\.applyDeltas\(\[\.\.\.net\]/);
  assert.doesNotMatch(fn,/p\.qty=restoreQty;/);
});

test('P27 Bundle-B mirrors SOT rollback authority',()=>{
  assert.match(bundle,/async applyStockUsages\(entries\)\{[\s\S]*?StockCommandSOT\.applyDeltas\(/);
  assert.match(bundle,/async replaceStockUsages\(oldEntries,newEntries\)\{[\s\S]*?StockCommandSOT\.applyDeltas\(/);
  assert.doesNotMatch(bundle,/async applyStockUsages\(entries\)\{[\s\S]*?p\.qty=restoreQty;/);
});
