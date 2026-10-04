'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const p='modules/vehicle/sparepart-servis-ui.js';
const src=fs.readFileSync(p,'utf8');

test('S2460 category edit has atomic snapshot/rollback boundary',()=>{
  assert.match(src,/S2460: category edit is a cross-domain mutation/);
  assert.match(src,/const _categoryEditAtomicSnapshot=editMode\?/);
  assert.match(src,/const _rollbackCategoryEdit=\(\)=>/);
  assert.match(src,/const _editSotResult=VehicleCarNotesSOT\.syncLegacyCategoryProjection\(editCat,'manual-edit'\)/);
  assert.match(src,/if\(!_editSotResult\|\|!_editSotResult\.ok\)\{_rollbackCategoryEdit\(\);throw new Error/);
  assert.match(src,/const _categoryEditSaveResult=save\(\);/);
  assert.match(src,/if\(editMode&&_categoryEditSaveResult===false\)\{_rollbackCategoryEdit\(\);/);
});

console.log('S2460 1/1 PASS');
