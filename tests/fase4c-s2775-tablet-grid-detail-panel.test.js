'use strict';
// Fase 4C (S2775) — grid tablet + panel detail di kanan (CSS saja).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const css = read('tokens.css');
const blk = css.slice(css.indexOf('FASE 4C (S2775)'));

// Ambil isi satu blok @media (kurung kurawal seimbang) yang diawali `head`.
function media(head) {
  const a = blk.indexOf(head);
  assert.ok(a >= 0, head);
  let i = blk.indexOf('{', a), d = 0, j = i;
  for (; j < blk.length; j++) { if (blk[j] === '{') d++; else if (blk[j] === '}') { d--; if (!d) break; } }
  return blk.slice(i + 1, j);
}

test('S2775: blok 4C ada, seimbang, tanpa penimpaan paksa', () => {
  assert.ok(css.includes('FASE 4C (S2775)'));
  assert.doesNotMatch(blk, /!important/);
  assert.equal((blk.match(/\{/g) || []).length, (blk.match(/\}/g) || []).length);
});

test('S2775: tablet 768–1279px — ringkasan Aset/Mobil 2 kolom, elemen non-kartu melebar penuh', () => {
  const m = media('@media (min-width:768px) and (max-width:1279px)');
  assert.match(m, /#asetTab-ringkasan,#cniTab-ringkasan,#cniTab-rekomendasi,#cnbTab-ringkasan/);
  assert.match(m, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(m, /grid-column:1\/-1/);
});

test('S2775: tablet 768–1023px — daftar kartu Aset & Shop 2 kolom; filter/empty-state melebar penuh', () => {
  const m = media('@media (min-width:768px) and (max-width:1023px)');
  assert.match(m, /#assetList,#productList/);
  assert.match(m, /repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(m, /#assetList>:not\(\.tx-item\)/);
  assert.match(m, /#productList>:not\(\.shop-product-card\)/);
});

test('S2775: >=1280px — Transaksi/Aset/Produk jadi panel kanan 480px; modal lain tidak tersentuh', () => {
  const m = media('@media (min-width:1280px){\n  html body :is(#txModal');
  for (const id of ['#txModal', '#assetModal', '#productModal']) assert.ok(m.includes(id), id);
  assert.match(m, /justify-content:flex-end/);
  assert.match(m, /width:min\(480px,40vw\)/);
  assert.match(m, /height:100dvh/);
  assert.doesNotMatch(blk, /html body \.(overlay|modal)\b/, 'tidak boleh menyasar semua .overlay/.modal');
  assert.equal((m.match(/\.modal\{/g) || []).length, (m.match(/#txModal,#assetModal,#productModal\)\.open \.modal\{/g) || []).length);
});

test('S2775: animasi panel hanya bila prefers-reduced-motion: no-preference', () => {
  assert.match(blk, /@media \(min-width:1280px\) and \(prefers-reduced-motion:no-preference\)/);
  assert.match(blk, /@keyframes kw-drawer-in/);
});

test('S2775: id modal ada di sumber dan berkelas overlay; aturan 4A (>=1280px) tidak diubah', () => {
  const m = read('modules/shared/modals.js');
  for (const id of ['txModal', 'assetModal', 'productModal']) assert.match(m, new RegExp('overlay\\\\+" id=\\\\+"' + id), id);
  assert.match(css, /FASE 4A \(S2767\)[\s\S]*?@media \(min-width:1280px\)\{\s*html body #page-dashboard-hub\{max-width:1208px\}/);
});
