const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('S2651: baris item Renovasi membawa data-renov-item-id (pemetaan Lunas tidak bergantung urutan)',()=>{
  assert.match(read('modules/home/renovasi.js'),/class="tx-item" data-renov-item-id="\$\{escapeHtml\(String\(it\.id\)\)\}"/);
});
test('S2651: tombol hapus proyek di detail dipindah ke menu ⋯ tanpa mengganti data-action',()=>{
  const h=read('modules/shared/pwa-ux-performance.js');
  assert.match(h,/renovDeleteProjectCur/);assert.match(h,/Menu proyek/);
  assert.match(read('modules/shared/modals.js'),/data-action=\\"renovDeleteProjectCur\\"/);
});
