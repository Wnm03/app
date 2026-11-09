'use strict';
// Fase 4B lanjutan (S2774) — tabel padat Aset, Dana Titipan, dan produk Shop di >=1024px untuk semua tema; <1024px tetap kartu.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('S2774: Aset — gate modern lama dipertahankan persis + jalur lebar; kartu tetap fallback', () => {
  const s = read('modules/asset/aset.js');
  assert.match(s, /D\.profile&&D\.profile\.theme==='modern'&&typeof assetTableHTML==='function'/);
  assert.match(s, /typeof kwWideTxTable==='function'&&kwWideTxTable\(\)&&typeof assetTableHTML==='function'/);
  assert.match(s, /el\.innerHTML=ownerFilterBar\+migratedBanner\+filteredList\.map\(a=>\{/);
});

function extractPresenterMethods() {
  const s = read('modules/finance/dana-titipan-portfolio-render.js');
  const grab = (name, next) => {
    const a = s.indexOf('  ' + name + '(');
    assert.ok(a > 0, name);
    const b = s.indexOf(next, a);
    assert.ok(b > a, next);
    return s.slice(a, b).replace(/,\s*$/, '');
  };
  return {
    wide: grab('_wideTable', '  // _returnsTableHtml'),
    table: grab('_returnsTableHtml', '  // _assetOptionsHtml'),
    hist: grab('_returnsHistoryHtml', '  // _wideTable'),
  };
}

function makeP(kwWide, theme, returns) {
  const m = extractPresenterMethods();
  const ctx = vm.createContext({
    D: { profile: { theme } }, escapeHtml: (x) => String(x), console,
    DanaTitipanPortfolioAPI: { getReturns: () => returns },
  });
  if (kwWide !== undefined) ctx.kwWideTxTable = () => kwWide;
  vm.runInContext('const P={' + [m.wide, m.table, m.hist].join(',\n') + ',_money(n){return "Rp "+n;}};this.P=P;', ctx);
  return ctx.P;
}

test('S2774: Dana Titipan — _wideTable() mengikuti kwWideTxTable() dan aman bila helper belum dimuat', () => {
  assert.equal(makeP(true, 'dark', [])._wideTable(), true);
  assert.equal(makeP(false, 'dark', [])._wideTable(), false);
  assert.equal(makeP(undefined, 'dark', [])._wideTable(), false);
});

test('S2774: Dana Titipan — 3 gate: lebar => tabel; gate modern lama untuk holdings & owner tidak diubah', () => {
  const s = read('modules/finance/dana-titipan-portfolio-render.js');
  assert.match(s, /D\.profile\.theme === 'modern'\) \|\| this\._wideTable\(\)\) \{\s*return this\._returnsTableHtml\(list\);/);
  assert.match(s, /if \(this\._wideTable\(\)\) \{\s*return this\._holdingsTableHtmlModern\(holdings\);/);
  assert.match(s, /if \(this\._wideTable\(\)\) \{\s*return this\._ownerListHtmlModern\(owners\);/);
  assert.match(s, /if \(typeof D !== 'undefined' && D\.profile && D\.profile\.theme === 'modern'\) \{\s*return this\._holdingsTableHtmlModern/);
  assert.match(s, /if \(typeof D !== 'undefined' && D\.profile && D\.profile\.theme === 'modern'\) \{\s*return this\._ownerListHtmlModern/);
});

test('S2774: Dana Titipan — riwayat pengembalian: tabel saat lebar, baris flex saat sempit (tema dark); modern selalu tabel', () => {
  const ret = [{ id: 'r1', returnDate: '2026-11-01', notes: 'cicilan', amount: 1500000 }];
  const wide = makeP(true, 'dark', ret)._returnsHistoryHtml('o1');
  const narrow = makeP(false, 'dark', ret)._returnsHistoryHtml('o1');
  const modernNarrow = makeP(false, 'modern', ret)._returnsHistoryHtml('o1');
  assert.match(wide, /class="tx-tbl"/);
  assert.doesNotMatch(narrow, /class="tx-tbl"/);
  assert.match(modernNarrow, /class="tx-tbl"/);
  for (const h of [wide, narrow]) { assert.match(h, /DanaTitipanReturnUI\.deleteEntry/); assert.match(h, /cicilan/); }
});

test('S2774: Shop — tabel produk di >=1024px, kartu di bawahnya; aksi baris memakai data-action yang sama dengan kartu', () => {
  const s = read('modules/shop/cobek-etalase.js');
  assert.match(s, /if\(typeof kwWideTxTable==='function'&&kwWideTxTable\(\)\)\{el\.innerHTML=this\.productTableHTML\(entries\);return;\}/);
  assert.match(s, /el\.innerHTML=entries\.map\(\(\{p,i\}\)=>\{/);
  const a = s.indexOf('productTableRowHTML(p,i){');
  const b = s.indexOf('renderList(){', a);
  assert.ok(a > 0 && b > a);
  const blk = s.slice(a, b);
  for (const act of ['openProductModal', 'Etalase.duplicateProduct', 'delProduct', 'Etalase.unlinkFromGroup']) {
    assert.ok(blk.includes('data-action="' + act + '"'), act);
  }
  assert.match(blk, /data-stop="1"/);
  assert.match(blk, /catch\(err\)/);
});

test('S2774: Shop — productTableRowHTML di sandbox: nama ter-escape, stok/harga/markup tampil, produk rusak tidak menjatuhkan tabel', () => {
  const s = read('modules/shop/cobek-etalase.js');
  const a = s.indexOf('productTableRowHTML(p,i){');
  const b = s.indexOf('renderList(){', a);
  const code = 'const E={' + s.slice(a, b).replace(/,\s*$/, '') + '};this.E=E;';
  const ctx = vm.createContext({
    escapeHtml: (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    fmt: (n) => 'Rp ' + n, shopKategoriName: () => 'Sambal', isProductOwnershipSelf: () => true,
    D: { produsen: [], inventoryTransfers: [], deliveryPlans: [] }, console: { error() {} },
  });
  vm.runInContext(code, ctx);
  ctx.E.groupSiblings = () => [];
  const p = { id: 'p1', name: 'Cobek <b>Batu</b>', hargaBeli: 10000, hargaJual: 15000, stock: 4, kategoriId: 'k1' };
  const row = ctx.E.productTableRowHTML(p, 3);
  assert.match(row, /Cobek &lt;b&gt;Batu&lt;\/b&gt;/);
  assert.doesNotMatch(row, /<b>Batu/);
  assert.match(row, /Rp 15000/);
  assert.match(row, /4 pcs/);
  assert.match(row, /\+Rp 5000 · 50%/);
  assert.match(row, /data-args="\[3\]"/);
  ctx.D.produsen = null;
  const bad = ctx.E.productTableRowHTML({ id: 'x', name: 'Rusak', produsenId: 'z', hargaBeli: 1, hargaJual: 2, stock: 1 }, 0);
  assert.match(bad, /Rusak/);
  assert.match(bad, /data-action="openProductModal"/);
});

test('S2774: listener breakpoint — Aset & Shop dirender ulang; modern hanya Shop; tidak ada listener ganda', () => {
  let handler = null; let adds = 0; const calls = [];
  const win = { matchMedia: () => ({ matches: true, addEventListener: (t, f) => { adds++; handler = f; } }) };
  const src = read('modules/finance/tx-list-cashflow.js');
  const a = src.indexOf('function kwWideTxTable(){'); const b = src.indexOf('function txTableRowHTML(');
  const active = { classList: { contains: () => true } };
  const ctx = vm.createContext({
    window: win, D: { profile: { theme: 'dark' } }, document: { getElementById: () => active },
    renderKeuangan: () => calls.push('keu'), Aset: { renderList: () => calls.push('aset') }, Etalase: { renderList: () => calls.push('shop') },
  });
  vm.runInContext(src.slice(a, b), ctx);
  vm.runInContext(src.slice(a, b), ctx);
  assert.equal(adds, 1);
  handler(); assert.deepEqual(calls, ['keu', 'aset', 'shop']);
  calls.length = 0; ctx.D.profile.theme = 'modern';
  handler(); assert.deepEqual(calls, ['shop']);
});

test('S2774: CSS 4B2 tanpa penimpaan paksa; bundle hasil build memuat tabel produk', () => {
  const css = read('tokens.css');
  const blk = css.slice(css.indexOf('FASE 4B2 (S2774)'));
  assert.match(blk, /\.tx-tbl-name-btn/);
  assert.match(blk, /\.shop-ptbl/);
  assert.doesNotMatch(blk, /!important/);
  assert.ok(['app-bundle-a.min.js', 'app-bundle-b.min.js'].some((f) => read(f).includes('productTableHTML')), 'productTableHTML tidak ada di bundle');
});
