'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'..','modern-ui-layer.css'),'utf8');
function rule(sel){const i=css.indexOf(sel+' {');assert.ok(i>=0,'rule tidak ditemukan: '+sel);return css.slice(i,css.indexOf('}',i)+1);}
test('S2726: wadah chip kategori servis berupa blok vertikal, bukan satu baris flex nowrap',()=>{
  const r=rule('#servisMasterCategoryChips.servis-category-chip-strip');
  assert.match(r,/display:\s*block/);
  assert.doesNotMatch(r,/flex-wrap:\s*nowrap/);
  assert.doesNotMatch(r,/overflow-x:\s*auto/);
});
test('S2726: deretan chip (anak ke-2) membungkus ke bawah dan chip tidak melebihi lebar modal',()=>{
  const r=rule('#servisMasterCategoryChips.servis-category-chip-strip > div:nth-child(2)');
  assert.match(r,/display:\s*flex/);assert.match(r,/flex-wrap:\s*wrap/);
  const c=rule('#servisMasterCategoryChips.servis-category-chip-strip .chip');
  assert.match(c,/max-width:\s*100%/);
});
test('S2726: anak wadah tidak lagi flex:0 0 auto (penyebab label+chip+hint berjejer ke kanan)',()=>{
  const r=rule('#servisMasterCategoryChips.servis-category-chip-strip > *');
  assert.doesNotMatch(r,/flex:\s*0 0 auto/);
});
