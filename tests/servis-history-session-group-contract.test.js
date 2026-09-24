'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { readServisSource } = require('./helpers/carNotesSource');
const src = readServisSource();

test('Servis Stage 2B: history groups by sessionId and keeps legacy logs as singletons',()=>{
  assert.match(src,/const historyGroups=\[\]; const historyGroupMap=new Map\(\);/);
  assert.match(src,/const key=s\.sessionId\?`session:\$\{s\.sessionId\}`:`single:\$\{s\.id\}`/);
  assert.match(src,/if\(g\.logs\.length===1\)return renderHistoryItem\(g\.logs\[0\]\);/);
});
test('Servis Stage 2B: multi-record session renders one expandable card with component count',()=>{
  assert.match(src,/g\.logs\.length===1\).*return renderHistoryItem/s);
  assert.match(src,/Servis \$\{escapeHtml\(first\.date\|\|''\)\} — \$\{g\.logs\.length\} komponen/);
  assert.match(src,/<details class="servis-history-session"/);
  assert.match(src,/g\.logs\.map\(renderHistoryItem\)\.join\(''\)/);
});
test('Servis Stage 2B: grouped total cost is display-only and sums member records',()=>{
  assert.match(src,/const first=g\.logs\[0\],[^\n]*total=.*g\.logs\.reduce\(\(n,x\)=>n\+\(x\.cost\|\|0\),0\)/);
  assert.match(src,/fmt\(total\)/);
});
