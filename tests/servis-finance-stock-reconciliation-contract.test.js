const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','modules','vehicle','servis.js'),'utf8');

test('Servis split keeps finance linkage on one record only',()=>{
  assert.match(src,/txLinkId:_rowIdx===0\?txId:null/);
  assert.match(src,/cost:_rowIdx===0\?cost:0/);
});

test('Servis split keeps stock linkage on one record only',()=>{
  assert.match(src,/usedPartId:_rowIdx===0\?\(usedPartId\|\|null\):null/);
  assert.match(src,/catalogPartLinkedStockId:_rowIdx===0\?\(catalogLinkedStockId\|\|null\):null/);
});

test('Session delete restores every member stock linkage before removing logs',()=>{
  assert.match(src,/logs\.forEach\(s=>\{/);
  assert.match(src,/if\(s\.usedPartId\)Servis\.revertStockUsage/);
  assert.match(src,/if\(s\.catalogPartLinkedStockId\)Servis\.revertStockUsage/);
  assert.match(src,/D\.servisLogs=D\.servisLogs\.filter\(x=>!x\|\|x\.sessionId!==sessionId\)/);
});
