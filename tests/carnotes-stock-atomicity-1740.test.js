const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

function servisSource(){return read('modules/vehicle/servis.js');}
function bundleSource(){return read('app-bundle-b.min.js');}

test('Servis stock usage is netted per physical stock id to prevent double deduction',()=>{
  const src=servisSource();
  assert.match(src,/async applyStockUsages\(entries\)\{[\s\S]*?const net=new Map\(\);/);
  assert.match(src,/async replaceStockUsages\(oldEntries,newEntries\)\{[\s\S]*?add\(oldEntries,-1\); add\(newEntries,1\);/);
  assert.match(src,/if\(!await Servis\.replaceStockUsages\(\s*\[\s*\{partId:s\.usedPartId,qty:s\.usedPartQty\},\s*\{partId:s\.catalogPartLinkedStockId,qty:s\.catalogPartQty\}/);
  assert.doesNotMatch(src,/Servis\.revertStockUsage\(s\.usedPartId,s\.usedPartQty\);\s*Servis\.revertStockUsage\(s\.catalogPartLinkedStockId,s\.catalogPartQty\);\s*if\(usedPartId&&!await Servis\.applyStockUsage/);
});

test('Servis create uses one aggregated stock mutation for legacy and catalog selectors',()=>{
  const src=servisSource();
  assert.match(src,/const _createStockEntries=/);
  assert.match(src,/if\(!await Servis\.applyStockUsages\(_createStockEntries\)\)return;/);
});

test('Servis empty-input validation occurs before any stock or Finance mutation',()=>{
  const src=servisSource();
  const guard=src.indexOf('const _preSaveChecklistPayload=');
  const stock=src.indexOf('if(!await Servis.applyStockUsages(_createStockEntries))return;');
  const tx=src.indexOf('D.transactions.push({id:txId,type:\'expense\'');
  assert.ok(guard>=0 && stock>guard && tx>guard,'pre-save guard must precede stock and Finance writes');
  assert.match(src,/if\(!_preSaveEffectiveItem\)\{toast\('⚠️ Pilih minimal satu komponen checklist yang dikerjakan'\);return;\}/);
});

test('Bundle-B carries the same stock atomicity hardening',()=>{
  const b=bundleSource();
  assert.match(b,/async applyStockUsages\(entries\)\{/);
  assert.match(b,/async replaceStockUsages\(oldEntries,newEntries\)\{/);
  assert.match(b,/if\(!await Servis\.replaceStockUsages\(/);
  assert.match(b,/if\(!await Servis\.applyStockUsages\(_createStockEntries\)/);
  assert.match(b,/const _preSaveEffectiveItem=/);
});

test('Stock qty guards reject non-positive/invalid quantities without mutation',()=>{
  const src=servisSource();
  assert.match(src,/revertStockUsage\(partId,qty\)\{\s*const n=Number\(qty\);\s*if\(!partId\|\|!Number\.isFinite\(n\)\|\|n<=0\)return;/);
  assert.match(src,/applyStockUsage\(partId,qty\)\{\s*if\(!partId\|\|!qty\)return true;/);
  assert.match(src,/const qty=Number\(e&&e\.qty\);\s*if\(!id\|\|!Number\.isFinite\(qty\)\|\|qty<=0\)return;/);
});
