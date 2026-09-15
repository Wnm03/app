const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'modules/vehicle/servis.js'),'utf8');
const bundle=fs.readFileSync(path.join(ROOT,'app-bundle-b.min.js'),'utf8');

test('P27 applyStockUsages compensates earlier deductions when a later stock operation rejects',()=>{
  assert.match(src,/const before=new Map\(\);[\s\S]*?if\(!await Servis\.applyStockUsage\(id,qty\)\)\{[\s\S]*?p\.qty=restoreQty;/);
});

test('P27 replaceStockUsages compensates all touched rows when a positive delta rejects',()=>{
  const start=src.indexOf('async replaceStockUsages(oldEntries,newEntries)');
  const end=src.indexOf('/** Cari 1 item Stok Sparepart',start);
  const fn=src.slice(start,end);
  assert.match(fn,/const before=new Map\(\);/);
  assert.match(fn,/if\(!await Servis\.applyStockUsage\(id,delta\)\)\{[\s\S]*?return false;/);
  assert.match(fn,/for\(const \[restoreId,restoreQty\] of before\)/);
});

test('P27 Bundle-B mirrors rollback compensation guards',()=>{
  assert.match(bundle,/async applyStockUsages\(entries\)\{[\s\S]*?const before=new Map\(\);[\s\S]*?p\.qty=restoreQty;/);
  assert.match(bundle,/async replaceStockUsages\(oldEntries,newEntries\)\{[\s\S]*?const before=new Map\(\);[\s\S]*?p\.qty=restoreQty;/);
});
