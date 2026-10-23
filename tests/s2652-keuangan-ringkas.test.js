const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('S2652: helper Keuangan hanya presentasi (judul, lipat, filter, hint, label kepemilikan)',()=>{
  const h=read('modules/shared/pwa-ux-performance.js');
  ['Dasbor Keuangan','Skor Kesehatan Keuangan','lapFilterFold','kb-hint-fold','Milik sendiri','cardCollapsePrefs'].forEach(k=>assert.ok(h.includes(k),k));
  assert.ok(!/saveTx|FinanceTxSOT|FinanceCategorySOT/.test(h.slice(h.indexOf('S2652'),h.indexOf('S2652')+9000)),'tidak menyentuh SOT/simpan');
});
test('S2652: CSS lipat insight + filter ada, sumber judul Inggris tidak diubah',()=>{
  const c=read('modern-ui-layer.css');assert.match(c,/\.kb-peek/);assert.match(c,/\.lap-filter-fold/);
  assert.ok(read('index.html').includes('findashWrap'));
});
