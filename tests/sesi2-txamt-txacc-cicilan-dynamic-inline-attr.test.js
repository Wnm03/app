'use strict';
// tests/sesi2-txamt-txacc-cicilan-dynamic-inline-attr.test.js — Sesi 2, lanjutan
// PATCH-SESI1-fix-csp-inline-handlers (migrasi atribut event inline txModal/
// bbmModal yang diblokir CSP script-src-attr 'none'). Sesi ini menutup 11
// elemen: #txAmt, #txAcc, dan seluruh panel Cicilan (#txCicilanNama,
// #txCicilanTotal, #txCicilanPerBulan, #txCicilanTenor, #txCicilanBunga,
// #txCicilanShared, #txCicilanSharedPct, #txCicilanSharedNominal,
// #txCicilanDue).
//
// Pola sama seperti SA1-SA18/s1603-s1606: Lapis A gate literal (atribut
// inline lama harus hilang, atribut data-* baru harus ada persis) + Lapis B
// fungsional lewat dispatcher ASLI (_dataActionInputChangeHandler, diekstrak
// apa adanya dari source, TIDAK diubah sesi ini) + Lapis C unit test wrapper
// baru (_txAmtOnInput, _txCicilanTotalOnBlur, _txCicilanPerBulanOnBlur,
// _txCicilanSharedNominalOnBlur, _txCicilanDueOnInput) yang menggantikan
// onblur/oninput inline berargumen-beda (pola sama persis _gzHargaOnBlur s1606).

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const MODALS_SRC = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
const CICILAN_SRC = fs.readFileSync(path.join(ROOT, 'modules/finance/cicilan.js'), 'utf8');
const TRANSAKSI_SRC = fs.readFileSync(path.join(ROOT, 'modules/finance/transaksi.js'), 'utf8');

// ---- Lapis A: gate literal (markup) ----

test('sesi2 gate: #txAmt sudah pakai data-oninput/data-onblur, oninput/onblur inline lama hilang', () => {
  assert.match(MODALS_SRC, /id=\\"txAmt\\"[^>]*data-oninput=\\"_txAmtOnInput\\"/);
  assert.match(MODALS_SRC, /id=\\"txAmt\\"[^>]*data-onblur=\\"evalAmtExpr\\" data-onblur-args='\[\\"txAmt\\"\]'/);
  assert.ok(!MODALS_SRC.includes('oninput=\\"syncTxAmtToLiter();updateAmtPreview(\\\'txAmt\\\',\\\'txAmtPreview\\\')\\"'));
  assert.ok(!MODALS_SRC.includes('onblur=\\"evalAmtExpr(\\\'txAmt\\\')\\"'));
});

test('sesi2 gate: #txAcc sudah pakai data-onchange="onTxAccChange", onchange inline lama hilang', () => {
  assert.match(MODALS_SRC, /id=\\"txAcc\\"[^>]*data-onchange=\\"onTxAccChange\\"/);
  assert.doesNotMatch(MODALS_SRC, /id=\\"txAcc\\"[^>]*onchange=\\"onTxAccChange\(\)\\"/);
});

const cicilanFieldGates = [
  { id: 'txCicilanNama', attr: 'data-oninput=\\"syncCicilanPreview\\"' },
  { id: 'txCicilanTotal', attr: "data-oninput=\\\"syncCicilanPreview\\\" data-oninput-args='[\\\"total\\\"]' data-onblur=\\\"_txCicilanTotalOnBlur\\\"" },
  { id: 'txCicilanPerBulan', attr: "data-oninput=\\\"syncCicilanPreview\\\" data-oninput-args='[\\\"perbulan\\\"]' data-onblur=\\\"_txCicilanPerBulanOnBlur\\\"" },
  { id: 'txCicilanTenor', attr: 'data-onchange=\\"onCicilanTenorSelectChange\\"' },
  { id: 'txCicilanBunga', attr: 'data-oninput=\\"syncCicilanPreview\\"' },
  { id: 'txCicilanShared', attr: 'data-onchange=\\"toggleCicilanSharedFields\\"' },
  { id: 'txCicilanSharedPct', attr: "data-oninput=\\\"syncCicilanPreview\\\" data-oninput-args='[\\\"sharedPct\\\"]'" },
  { id: 'txCicilanSharedNominal', attr: "data-oninput=\\\"syncCicilanPreview\\\" data-oninput-args='[\\\"sharedNominal\\\"]' data-onblur=\\\"_txCicilanSharedNominalOnBlur\\\"" },
  { id: 'txCicilanDue', attr: 'data-oninput=\\"_txCicilanDueOnInput\\"' },
];

for (const { id, attr } of cicilanFieldGates) {
  test(`sesi2 gate: #${id} markup mengandung ${attr.slice(0, 40)}...`, () => {
    assert.ok(MODALS_SRC.includes(`id=\\"${id}\\"`), `#${id} harus ada di modals.js`);
    const idx = MODALS_SRC.indexOf(`id=\\"${id}\\"`);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.ok(snippet.includes(attr), `#${id} harus mengandung: ${attr}\nSNIPPET: ${snippet}`);
  });
}

test('sesi2 gate: 0 oninput/onchange/onblur inline lama tersisa utk 11 elemen sesi ini', () => {
  const ids = ['txAmt', 'txAcc', 'txCicilanNama', 'txCicilanTotal', 'txCicilanPerBulan',
    'txCicilanTenor', 'txCicilanBunga', 'txCicilanShared', 'txCicilanSharedPct',
    'txCicilanSharedNominal', 'txCicilanDue'];
  for (const id of ids) {
    const idx = MODALS_SRC.indexOf(`id=\\"${id}\\"`);
    assert.notEqual(idx, -1, `#${id} tidak ditemukan`);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.doesNotMatch(snippet, /(?<!data-)\b(oninput|onchange|onblur)=\\"/,
      `#${id} masih punya atribut inline lama: ${snippet}`);
  }
});

test('sesi2 gate: wrapper baru ada sbg fungsi top-level di cicilan.js/transaksi.js (bukan method dotted, tidak perlu window-expose)', () => {
  assert.match(CICILAN_SRC, /function _txCicilanTotalOnBlur\(\)\s*\{/);
  assert.match(CICILAN_SRC, /function _txCicilanPerBulanOnBlur\(\)\s*\{/);
  assert.match(CICILAN_SRC, /function _txCicilanSharedNominalOnBlur\(\)\s*\{/);
  assert.match(CICILAN_SRC, /function _txCicilanDueOnInput\(\)\s*\{/);
  assert.match(TRANSAKSI_SRC, /function _txAmtOnInput\(\)\s*\{/);
});

// ---- Lapis B: dispatcher ASLI end-to-end (diekstrak dari source, tidak diubah sesi ini) ----

const DISPATCHER_PATH = path.join(ROOT, 'modules/shared/features-helpers-global-security.js');
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

function makeDispatcher(windowObj) {
  const context = { console, window: windowObj, document: { querySelectorAll: () => [] }, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dataActionResolveArgs')}\n${extractFnSource('_dataActionInputChangeHandler')}\nthis._dataActionInputChangeHandler = _dataActionInputChangeHandler;`;
  vm.runInContext(snippet, context, { filename: 'sesi2-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeEl(dataset, value) {
  const el = { dataset: Object.assign({}, dataset), value };
  el.closest = () => el;
  return el;
}

test('sesi2 end-to-end (oninput): #txAmt -> _txAmtOnInput() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _txAmtOnInput: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ oninput: '_txAmtOnInput' }, '150000');
  dispatch({ type: 'input', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi2 end-to-end (onblur): #txAmt -> evalAmtExpr("txAmt") terpanggil lewat dispatcher', () => {
  const calls = [];
  const stub = { evalAmtExpr: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onblur: 'evalAmtExpr', onblurArgs: '["txAmt"]' });
  dispatch({ type: 'blur', target: el });
  assert.deepEqual(calls, [['txAmt']]);
});

test('sesi2 end-to-end (onchange): #txAcc -> onTxAccChange() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { onTxAccChange: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onchange: 'onTxAccChange' });
  dispatch({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi2 end-to-end (oninput dgn args): #txCicilanTotal -> syncCicilanPreview("total") lewat dispatcher', () => {
  const calls = [];
  const stub = { syncCicilanPreview: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ oninput: 'syncCicilanPreview', oninputArgs: '["total"]' }, '6000000');
  dispatch({ type: 'input', target: el });
  assert.deepEqual(calls, [['total']]);
});

test('sesi2 end-to-end (onblur wrapper): #txCicilanTotal -> _txCicilanTotalOnBlur() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _txCicilanTotalOnBlur: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onblur: '_txCicilanTotalOnBlur' });
  dispatch({ type: 'blur', target: el });
  assert.deepEqual(calls, [[]]);
});

// ---- Lapis C: unit test langsung ke wrapper (perilaku, bukan cuma dispatcher) ----

function loadWrapperContext(extraSrc, extraCtx) {
  const context = Object.assign({
    console,
    document: { getElementById: () => ({ value: '', checked: false }) },
  }, extraCtx);
  vm.createContext(context);
  vm.runInContext(extraSrc, context, { filename: 'sesi2-wrapper-unit.js' });
  return context;
}

test('sesi2 wrapper: _txAmtOnInput() memanggil syncTxAmtToLiter() lalu updateAmtPreview("txAmt","txAmtPreview") -- urutan & argumen sama persis dgn inline asli', () => {
  const m = TRANSAKSI_SRC.match(/function _txAmtOnInput\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, '_txAmtOnInput body tidak ditemukan');
  const calls = [];
  const ctx = loadWrapperContext(`function _txAmtOnInput(){${m[1]}}`, {
    syncTxAmtToLiter: () => calls.push(['syncTxAmtToLiter']),
    updateAmtPreview: (a, b) => calls.push(['updateAmtPreview', a, b]),
  });
  ctx._txAmtOnInput();
  assert.deepEqual(calls, [['syncTxAmtToLiter'], ['updateAmtPreview', 'txAmt', 'txAmtPreview']]);
});

test('sesi2 wrapper: _txCicilanTotalOnBlur() memanggil evalAmtExpr("txCicilanTotal") lalu syncCicilanPreview("total")', () => {
  const m = CICILAN_SRC.match(/function _txCicilanTotalOnBlur\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, '_txCicilanTotalOnBlur body tidak ditemukan');
  const calls = [];
  const ctx = loadWrapperContext(`function _txCicilanTotalOnBlur(){${m[1]}}`, {
    evalAmtExpr: (id) => calls.push(['evalAmtExpr', id]),
    syncCicilanPreview: (src) => calls.push(['syncCicilanPreview', src]),
  });
  ctx._txCicilanTotalOnBlur();
  assert.deepEqual(calls, [['evalAmtExpr', 'txCicilanTotal'], ['syncCicilanPreview', 'total']]);
});

test('sesi2 wrapper: _txCicilanPerBulanOnBlur() memanggil evalAmtExpr("txCicilanPerBulan") lalu syncCicilanPreview("perbulan")', () => {
  const m = CICILAN_SRC.match(/function _txCicilanPerBulanOnBlur\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, '_txCicilanPerBulanOnBlur body tidak ditemukan');
  const calls = [];
  const ctx = loadWrapperContext(`function _txCicilanPerBulanOnBlur(){${m[1]}}`, {
    evalAmtExpr: (id) => calls.push(['evalAmtExpr', id]),
    syncCicilanPreview: (src) => calls.push(['syncCicilanPreview', src]),
  });
  ctx._txCicilanPerBulanOnBlur();
  assert.deepEqual(calls, [['evalAmtExpr', 'txCicilanPerBulan'], ['syncCicilanPreview', 'perbulan']]);
});

test('sesi2 wrapper: _txCicilanSharedNominalOnBlur() memanggil evalAmtExpr("txCicilanSharedNominal") lalu syncCicilanPreview("sharedNominal")', () => {
  const m = CICILAN_SRC.match(/function _txCicilanSharedNominalOnBlur\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, '_txCicilanSharedNominalOnBlur body tidak ditemukan');
  const calls = [];
  const ctx = loadWrapperContext(`function _txCicilanSharedNominalOnBlur(){${m[1]}}`, {
    evalAmtExpr: (id) => calls.push(['evalAmtExpr', id]),
    syncCicilanPreview: (src) => calls.push(['syncCicilanPreview', src]),
  });
  ctx._txCicilanSharedNominalOnBlur();
  assert.deepEqual(calls, [['evalAmtExpr', 'txCicilanSharedNominal'], ['syncCicilanPreview', 'sharedNominal']]);
});

test('sesi2 wrapper: _txCicilanDueOnInput() memanggil syncCicilanPreview() (0-arg) lalu syncCicilanDate("due")', () => {
  const m = CICILAN_SRC.match(/function _txCicilanDueOnInput\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, '_txCicilanDueOnInput body tidak ditemukan');
  const calls = [];
  const ctx = loadWrapperContext(`function _txCicilanDueOnInput(){${m[1]}}`, {
    syncCicilanPreview: (...args) => calls.push(['syncCicilanPreview', ...args]),
    syncCicilanDate: (src) => calls.push(['syncCicilanDate', src]),
  });
  ctx._txCicilanDueOnInput();
  assert.deepEqual(calls, [['syncCicilanPreview'], ['syncCicilanDate', 'due']]);
});
