const test=require('node:test');
const assert=require('node:assert/strict');
const { readServisSource } = require('./helpers/carNotesSource');
const src = readServisSource();

test('Servis session delete exists and targets all session logs',()=>{
  assert.match(src,/async delSession\(sessionId\)/);
  assert.match(src,/filter\(x=>x&&x\.sessionId===sessionId\)/);
  assert.match(src,/D\.servisLogs=D\.servisLogs\.filter\(x=>!x\|\|x\.sessionId!==sessionId\)/);
});

test('Servis session delete restores all linked stock and finance state atomically',()=>{
  assert.match(src,/txIds=new Set\(logs\.map\(x=>x&&x\.txLinkId\)\.filter\(Boolean\)\)/);
  assert.match(src,/Servis\.revertStockUsage\(s\.usedPartId,s\.usedPartQty\)/);
  assert.match(src,/Servis\.revertStockUsage\(s\.catalogPartLinkedStockId,s\.catalogPartQty\)/);
  assert.match(src,/beforeLogs=logs\.map/);
  assert.match(src,/for\(const row of beforeLogs\)/);
});

test('Grouped history exposes a session-level delete action',()=>{
  assert.match(src,/data-action="Servis\.delSession"/);
  assert.match(src,/g\.sessionId/);
});
