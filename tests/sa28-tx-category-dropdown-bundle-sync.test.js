'use strict';
// SA28 — guard terhadap regresi "Kategori/Subkategori transaksi tidak muncul".
// Root cause yang diaudit: source modal/dispatcher sudah diperbaiki tetapi
// app-bundle masih stale, sehingga browser menjalankan HTML/JS lama.
const fs=require('fs');
const path=require('path');
const assert=require('node:assert/strict');
const test=require('node:test');
const ROOT=path.join(__dirname,'..');
const modals=fs.readFileSync(path.join(ROOT,'modules/shared/modals.js'),'utf8');
const tx=fs.readFileSync(path.join(ROOT,'modules/finance/transaksi.js'),'utf8');
const dispatcher=fs.readFileSync(path.join(ROOT,'modules/shared/features-helpers-global-security.js'),'utf8');
const bundle=fs.readFileSync(path.join(ROOT,'app-bundle-a.min.js'),'utf8');

function fieldSnippet(src,id){
  const i=src.indexOf(`id=\\"${id}\\"`);
  assert.notEqual(i,-1,`#${id} tidak ditemukan`);
  return src.slice(i,i+700);
}

test('SA28: txCat memakai data-oninput + data-onfocus + named blur, tanpa inline handler',()=>{
  const s=fieldSnippet(modals,'txCat');
  assert.match(s,/data-oninput=\\"onTxCatInput\\"/);
  assert.match(s,/data-onfocus=\\"onTxCatInput\\"/);
  assert.match(s,/data-onblur=\\"_txCatOnBlur\\"/);
  assert.doesNotMatch(s,/(?<!data-)on(?:input|focus|blur)=\\"/);
});

test('SA28: txSubCat memakai data-oninput + data-onfocus + named blur, tanpa inline handler',()=>{
  const s=fieldSnippet(modals,'txSubCat');
  assert.match(s,/data-oninput=\\"onTxSubCatInput\\"/);
  assert.match(s,/data-onfocus=\\"onTxSubCatInput\\"/);
  assert.match(s,/data-onblur=\\"_txSubCatOnBlur\\"/);
  assert.doesNotMatch(s,/(?<!data-)on(?:input|focus|blur)=\\"/);
});

test('SA28: dispatcher menangani focus + input + blur dan resolver $value',()=>{
  assert.match(dispatcher,/focus:'onfocus'/);
  assert.match(dispatcher,/input:'oninput'/);
  assert.match(dispatcher,/blur:'onblur'/);
  assert.match(dispatcher,/if\(a===\x27\$value\x27\) return el\.value/);
});

test('SA28: handler kategori membaca nilai field tanpa mengganti value user',()=>{
  assert.match(tx,/function onTxCatInput\(\)\{[\s\S]*?const raw=document\.getElementById\('txCat'\)\.value/);
  assert.match(tx,/function onTxSubCatInput\(\)\{[\s\S]*?const q=document\.getElementById\('txSubCat'\)\.value\.trim\(\)\.toLowerCase\(\)/);
});

test('SA28: production bundle benar-benar membawa wiring txCat/txSubCat terbaru',()=>{
  assert.match(bundle,/id=\\"txCat\\"[^]*?data-oninput=\\"onTxCatInput\\"[^]*?data-onfocus=\\"onTxCatInput\\"[^]*?data-onblur=\\"_txCatOnBlur\\"/);
  assert.match(bundle,/id=\\"txSubCat\\"[^]*?data-oninput=\\"onTxSubCatInput\\"[^]*?data-onfocus=\\"onTxSubCatInput\\"[^]*?data-onblur=\\"_txSubCatOnBlur\\"/);
});
