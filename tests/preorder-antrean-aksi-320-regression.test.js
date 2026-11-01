'use strict';
// Regresi: tombol aksi antrean preorder tidak boleh terpotong di layar 320 px.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const po=fs.readFileSync(path.join(root,'modules/shop/preorder.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
test('tombol Penuhi dan Batal antrean preorder memakai kelas preorder-act',()=>{
  assert.match(po,/class="tx-del preorder-act u-bgaccsoft u-cacc" data-action="Preorder\.beginFulfil"/);
  assert.match(po,/class="tx-del preorder-act" data-action="Preorder\.cancelUi"/);
});
test('CSS preorder-act mencegah pembungkusan label dan penyusutan tombol',()=>{
  const m=css.match(/\.preorder-act\{([^}]*)\}/);
  assert.ok(m,'aturan .preorder-act harus ada');
  assert.match(m[1],/white-space:nowrap/);
  assert.match(m[1],/flex-shrink:0/);
  assert.match(css,/#preorderPanel \.tx-del\.preorder-act\{[^}]*width:auto[^}]*min-width:44px/);
  assert.match(css,/#preorderPanel \.tx-item \.u-flex1\{[^}]*min-width:0/);
});
test('perbaikan hanya tampilan: tidak ada perubahan data-action/aksi',()=>{
  assert.match(po,/Preorder\.beginFulfil/);assert.match(po,/Preorder\.cancelUi/);
});
