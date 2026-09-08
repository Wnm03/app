'use strict';
// tests/s1604b-filter-archive-catcalc-dynamic-inline-attr.test.js — sesi s1604b
// Lanjutan epic migrasi "atribut event inline yang di-generate dinamis"
// (docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md, rekomendasi #3, lanjutan SA11-SA16).
// Ditemukan lewat audit tambahan setelah fix gate SA16 (bug drift di
// modules/modules-render.js): 3 titik LAIN yang belum pernah termigrasi sama
// sekali (bukan drift, tapi memang belum tersentuh SA11-SA18), sama-sama
// diblokir CSP script-src-attr 'none' -> "tap/toggle 0 reaksi":
//
//   1. modules/finance/filter-laporan.js
//      onclick="selectFilterTxOwnerSplit(${idx})" (tab pemilik split di filter
//      laporan) -> data-action="selectFilterTxOwnerSplit" data-args='[${idx}]'
//   2. modules/shared/data-archive.js
//      onchange="toggleArchiveYear(${y},this)" (checkbox pilih tahun arsip)
//      -> data-onchange="toggleArchiveYear" data-onchange-args='[${y},"$el"]'
//   3. modules/shared/modules-calc.js
//      onchange="onFiCatTotalToggle(this)" (checkbox "Total Pengeluaran" di
//      pilih-kategori budget) -> data-onchange="onFiCatTotalToggle"
//      data-onchange-args='["$el"]'
//
// Sama seperti SA11-SA16: gate statis (0 atribut inline tersisa di baris
// terkait) + fungsional end-to-end lewat dispatcher ASLI (tidak diubah lagi
// sesi ini).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---- Lapis A: gate literal per titik ----

const SRC_FILTER = fs.readFileSync(path.join(__dirname, '..', 'modules/finance/filter-laporan.js'), 'utf8');
test('s1604b gate: selectFilterTxOwnerSplit data-action + data-args tersedia di modules/finance/filter-laporan.js', () => {
  assert.ok(SRC_FILTER.includes('data-action="selectFilterTxOwnerSplit" data-args=\'[${idx}]\''));
  assert.ok(!SRC_FILTER.includes('onclick="selectFilterTxOwnerSplit('));
});

const SRC_ARCHIVE = fs.readFileSync(path.join(__dirname, '..', 'modules/shared/data-archive.js'), 'utf8');
test('s1604b gate: toggleArchiveYear data-onchange + data-onchange-args (year literal + $el) tersedia di modules/shared/data-archive.js', () => {
  assert.ok(SRC_ARCHIVE.includes('data-onchange="toggleArchiveYear" data-onchange-args=\'[${y},"$el"]\''));
  assert.ok(!SRC_ARCHIVE.includes('onchange="toggleArchiveYear('));
});

const SRC_CALC = fs.readFileSync(path.join(__dirname, '..', 'modules/shared/modules-calc.js'), 'utf8');
test('s1604b gate: onFiCatTotalToggle data-onchange + data-onchange-args ($el) tersedia di modules/shared/modules-calc.js', () => {
  assert.ok(SRC_CALC.includes('data-onchange="onFiCatTotalToggle" data-onchange-args=\'["$el"]\''));
  assert.ok(!SRC_CALC.includes('onchange="onFiCatTotalToggle('));
});

// ---- Lapis B: dispatcher asli end-to-end ----

const DISPATCHER_PATH = path.join(__dirname, '..', 'modules', 'shared', 'features-helpers-global-security.js');
const DISPATCHER_SRC = fs.readFileSync(DISPATCHER_PATH, 'utf8');

function extractFnSource(fnName) {
  const marker = `function ${fnName}(`;
  const start = DISPATCHER_SRC.indexOf(marker);
  if (start === -1) throw new Error(`"${marker}" tidak ditemukan`);
  const braceOpen = DISPATCHER_SRC.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < DISPATCHER_SRC.length && depth > 0) {
    if (DISPATCHER_SRC[i] === '{') depth++;
    else if (DISPATCHER_SRC[i] === '}') depth--;
    i++;
  }
  return DISPATCHER_SRC.slice(start, i);
}

function makeClickDispatcher(windowObj) {
  const context = { console, window: windowObj, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dataActionClickHandler')}\nthis._dataActionClickHandler = _dataActionClickHandler;`;
  vm.runInContext(snippet, context, { filename: 's1604b-click-dispatcher-extract.js' });
  return context._dataActionClickHandler;
}

function makeChangeDispatcher(windowObj) {
  const context = { console, window: windowObj, document: { querySelectorAll: () => [] }, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dataActionResolveArgs')}\n${extractFnSource('_dataActionInputChangeHandler')}\nthis._dataActionInputChangeHandler = _dataActionInputChangeHandler;`;
  vm.runInContext(snippet, context, { filename: 's1604b-change-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeClickEl(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = (sel) => (sel === '[data-action]' ? (el.dataset.action ? el : null) : null);
  return el;
}

function makeFakeChangeEl(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = () => el;
  return el;
}

test('s1604b end-to-end (click): selectFilterTxOwnerSplit(idx) dataset persis hasil migrasi -> terpanggil dgn idx', () => {
  const calls = [];
  const stub = { selectFilterTxOwnerSplit: (...args) => calls.push(args) };
  const dispatchClick = makeClickDispatcher(stub);
  const el = makeFakeClickEl({ action: 'selectFilterTxOwnerSplit', args: '[2]' });
  dispatchClick({ target: el });
  assert.deepEqual(calls, [[2]]);
});

test('s1604b end-to-end (change): toggleArchiveYear(year,$el) dataset persis hasil migrasi -> terpanggil dgn (year, elemenAsli)', () => {
  const calls = [];
  const stub = { toggleArchiveYear: (...args) => calls.push(args) };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ onchange: 'toggleArchiveYear', onchangeArgs: JSON.stringify([2025, '$el']) });
  el.checked = true;
  dispatchChange({ type: 'change', target: el });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 2025);
  assert.equal(calls[0][1], el); // $el harus resolve ke elemen asli (bukan cuma el.checked)
});

test('s1604b end-to-end (change): onFiCatTotalToggle($el) dataset persis hasil migrasi -> terpanggil dgn elemenAsli', () => {
  const calls = [];
  const stub = { onFiCatTotalToggle: (...args) => calls.push(args) };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ onchange: 'onFiCatTotalToggle', onchangeArgs: JSON.stringify(['$el']) });
  el.checked = false;
  dispatchChange({ type: 'change', target: el });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], el);
});
