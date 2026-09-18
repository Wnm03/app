// S1840 — Service Checklist structural hardening.
// Ensures a malformed group.items cannot recreate the S1839 class of crash.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),vm=require('vm');

function load(){
  const ctx={console,escapeHtml:s=>String(s),Object,JSON,Array,String,Set,Number};
  ctx.window=ctx;
  ctx.document={getElementById(id){return id==='servisChecklistPanel'?{innerHTML:''}:null;}};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('modules/vehicle/servis-checklist.js','utf8'),ctx);
  return ctx;
}

test('itemsOfGroup() returns [] for missing/non-array items',()=>{
  const c=load();
  assert.equal(c.ServisChecklist.itemsOfGroup({group:'X'}).length,0);
  assert.equal(c.ServisChecklist.itemsOfGroup({group:'X',items:null}).length,0);
  assert.equal(c.ServisChecklist.itemsOfGroup({group:'X',items:{length:9}}).length,0);
});

test('ServisChecklist API remains non-throwing if one canonical group is malformed',()=>{
  const c=load();
  const g=c.ServisChecklist.group(0);
  const saved=g.items;
  g.items=undefined;
  assert.doesNotThrow(()=>c.ServisChecklist.findItemById('nonexistent'));
  assert.doesNotThrow(()=>c.ServisChecklist.firstCheckedGroup());
  assert.doesNotThrow(()=>c.ServisChecklist.summaryFromLog({checklist:[]}));
  assert.doesNotThrow(()=>c.ServisChecklist.checkedCount(0));
  assert.doesNotThrow(()=>c.ServisChecklist.renderHtml());
  assert.equal(c.ServisChecklist.itemsForMasterCategory(g.masterCategoryId).length,0);
  g.items=saved;
});

test('ServisChecklist renderer remains non-throwing if canonical group.items is malformed',()=>{
  const c=load();
  const g=c.ServisChecklist.group(0);
  const saved=g.items;
  g.items=undefined;
  assert.doesNotThrow(()=>c.ServisChecklist.renderHtml());
  g.items=saved;
});

test('TxServis renderer uses the same defensive group-items contract',()=>{
  const src=fs.readFileSync('modules/finance/tx-servis.js','utf8');
  assert.match(src,/ServisChecklist\.itemsOfGroup\(group\)/);
  assert.doesNotMatch(src,/const rows=group\.items\.map/);
});

// Static contract: production renderer must consume the defensive API rather
// than directly assuming wrapper.group.items exists.
test('service renderer uses defensive itemsOfGroup contract',()=>{
  const src=fs.readFileSync('modules/vehicle/servis.js','utf8');
  assert.match(src,/ServisChecklist\.itemsOfGroup\(group\)/);
  assert.doesNotMatch(src,/groups\.reduce\(\(n,g\)=>n\+g\.items\.length/);
});
