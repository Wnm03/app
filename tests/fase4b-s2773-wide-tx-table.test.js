'use strict';
// Fase 4B (S2773) — tabel padat transaksi (Uang + Riwayat) di >=1024px untuk semua tema; <1024px tetap kartu.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function loadHelper(win) {
  const src = read('modules/finance/tx-list-cashflow.js');
  const a = src.indexOf('function kwWideTxTable(){');
  const b = src.indexOf('function txTableRowHTML(');
  assert.ok(a > 0 && b > a);
  const ctx = vm.createContext(Object.assign({ window: win, document: { getElementById: () => null }, D: { profile: { theme: 'dark' } } }, win ? {} : {}));
  vm.runInContext(src.slice(a, b) + ';this.kwWideTxTable=kwWideTxTable;', ctx);
  return ctx;
}

test('S2773: kwWideTxTable() true hanya saat media (min-width:1024px) cocok', () => {
  const mk = (matches) => ({ matchMedia: (q) => { assert.equal(q, '(min-width:1024px)'); return { matches, addEventListener() {} }; } });
  assert.equal(loadHelper(mk(true)).kwWideTxTable(), true);
  assert.equal(loadHelper(mk(false)).kwWideTxTable(), false);
});

test('S2773: aman tanpa matchMedia (jalur kartu tetap)', () => {
  assert.equal(loadHelper({}).kwWideTxTable(), false);
});

test('S2773: listener breakpoint terpasang sekali, render ulang hanya saat Keuangan aktif & tema bukan modern', () => {
  let handler = null; let renders = 0; let adds = 0;
  const win = { matchMedia: () => ({ matches: true, addEventListener: (t, f) => { adds++; handler = f; } }) };
  const src = read('modules/finance/tx-list-cashflow.js');
  const a = src.indexOf('function kwWideTxTable(){'); const b = src.indexOf('function txTableRowHTML(');
  const pageEl = { classList: { contains: () => true } };
  const ctx = vm.createContext({ window: win, D: { profile: { theme: 'dark' } }, document: { getElementById: () => pageEl }, renderKeuangan: () => { renders++; } });
  vm.runInContext(src.slice(a, b), ctx);
  vm.runInContext(src.slice(a, b), ctx);
  assert.equal(adds, 1, 'listener tidak boleh ganda');
  handler(); assert.equal(renders, 1);
  ctx.D.profile.theme = 'modern'; handler(); assert.equal(renders, 1, 'tema modern: tidak perlu render ulang');
});

test('S2773: gating Uang & Riwayat mempertahankan kondisi modern lama dan menambah jalur lebar', () => {
  for (const [f, fn] of [['modules/shared/modules-render-b.js', 'txTableHTML'], ['modules/finance/filter-laporan.js', 'txTableHTML']]) {
    const s = read(f);
    assert.match(s, new RegExp("D\\.profile&&D\\.profile\\.theme==='modern'&&typeof " + fn + "==='function'"));
    assert.match(s, /typeof kwWideTxTable==='function'&&kwWideTxTable\(\)&&typeof txTableHTML==='function'/);
  }
  assert.match(read('modules/finance/filter-laporan.js'), /document\.querySelector\('#filterTxList \.tx-tbl'\)&&typeof txTableRowHTML==='function'/);
});

test('S2773: jalur kartu txHTML() tetap sebagai fallback; handler editTx/delTx di baris tabel tidak berubah', () => {
  assert.match(read('modules/shared/modules-render-b.js'), /allTxEl\.innerHTML=visible\.length\?visible\.map\(t=>txHTML\(t/);
  const t = read('modules/finance/tx-list-cashflow.js');
  assert.match(t, /<tr class="tx-tbl-row u-pointer" data-action="editTx"/);
  assert.match(t, /data-action="delTx"/);
});

test('S2773: CSS 4B tanpa !important; bundle hasil build memuat helper', () => {
  const css = read('tokens.css');
  const blk = css.slice(css.indexOf('FASE 4B (S2773)'));
  assert.match(blk, /\.tx-tbl-row:hover td/);
  assert.doesNotMatch(blk, /!important/);
  assert.ok(['app-bundle-a.min.js', 'app-bundle-b.min.js'].some((f) => read(f).includes('kwWideTxTable')), 'kwWideTxTable tidak ada di bundle');
});
