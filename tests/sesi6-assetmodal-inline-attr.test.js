'use strict';
// tests/sesi6-assetmodal-inline-attr.test.js —
// Sesi 6, lanjutan PATCH-SESI1-SESI2-SESI3-SESI4-SESI5-fix-csp-inline-handlers
// (migrasi atribut event inline yang diblokir CSP script-src-attr 'none').
// Sesi ini menutup assetModal (modules/shared/modals.js) — item berikutnya di
// antrian "belum dikerjakan" Sesi 5: 6 elemen, 8 atribut event inline:
//   #assetJenis (onchange), #assetInvestmentId (onchange),
//   #assetHargaBeli (onblur), #assetJumlahUnit (onblur),
//   #assetNilai (oninput+onblur, 2 wrapper baru),
//   #assetModalInvestasi (oninput+onblur, 2 wrapper baru).
//
// Pola sama seperti Sesi 1-5: Lapis A gate literal (atribut inline lama harus
// hilang, atribut data-* baru harus ada persis) + Lapis B fungsional lewat
// dispatcher ASLI (_dataActionInputChangeHandler, diekstrak apa adanya dari
// source, TIDAK diubah sesi ini) + Lapis C unit test wrapper baru
// (_assetNilaiOnInput/_assetNilaiOnBlur/_assetModalInvestasiOnInput/
// _assetModalInvestasiOnBlur, modules/asset/aset.js) yang menggantikan
// oninput/onblur inline berargumen-beda (2 panggilan tiap event, pola sama
// persis _bbmCostOnInput dkk Sesi 5).
//
// #assetJenis/#assetInvestmentId (onchange 1 panggilan) & #assetHargaBeli/
// #assetJumlahUnit (onblur 1 panggilan) TIDAK butuh wrapper baru -- dispatcher
// generik bisa langsung panggil `Aset.onJenisChange`/`Aset.onInvestmentLinkChange`/
// `Aset.updateProfitPreview` (nama method dotted, sudah didukung dispatcher
// sejak SA1, lihat resolusi `path.split('.')` di
// features-helpers-global-security.js).

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const MODALS_SRC = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
const ASET_SRC = fs.readFileSync(path.join(ROOT, 'modules/asset/aset.js'), 'utf8');

// ---- Lapis A: gate literal (markup) ----

const gates = [
  { id: 'assetJenis', attr: 'data-onchange=\\\"Aset.onJenisChange\\\"' },
  { id: 'assetInvestmentId', attr: 'data-onchange=\\\"Aset.onInvestmentLinkChange\\\"' },
  { id: 'assetHargaBeli', attr: 'data-onblur=\\\"Aset.updateProfitPreview\\\"' },
  { id: 'assetJumlahUnit', attr: 'data-onblur=\\\"Aset.updateProfitPreview\\\"' },
  { id: 'assetNilai', attr: 'data-oninput=\\\"_assetNilaiOnInput\\\" data-onblur=\\\"_assetNilaiOnBlur\\\"' },
  { id: 'assetModalInvestasi', attr: 'data-oninput=\\\"_assetModalInvestasiOnInput\\\" data-onblur=\\\"_assetModalInvestasiOnBlur\\\"' },
];

for (const { id, attr } of gates) {
  test(`sesi6 gate: #${id} markup mengandung ${attr.slice(0, 60)}...`, () => {
    assert.ok(MODALS_SRC.includes(`id=\\\"${id}\\\"`), `#${id} harus ada di modals.js`);
    const idx = MODALS_SRC.indexOf(`id=\\\"${id}\\\"`);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.ok(snippet.includes(attr), `#${id} harus mengandung: ${attr}\nSNIPPET: ${snippet}`);
  });
}

test('sesi6 gate: 0 oninput/onchange/onblur/onfocus inline lama tersisa utk 6 elemen assetModal', () => {
  const ids = ['assetJenis', 'assetInvestmentId', 'assetHargaBeli', 'assetJumlahUnit', 'assetNilai', 'assetModalInvestasi'];
  for (const id of ids) {
    const idx = MODALS_SRC.indexOf(`id=\\\"${id}\\\"`);
    assert.notEqual(idx, -1, `#${id} tidak ditemukan`);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.doesNotMatch(snippet, /(?<!data-)\b(oninput|onchange|onblur|onfocus)=\\\"/,
      `#${id} masih punya atribut inline lama: ${snippet}`);
  }
});

test('sesi6 gate: 4 wrapper baru ada sbg fungsi top-level di modules/asset/aset.js', () => {
  assert.match(ASET_SRC, /function _assetNilaiOnInput\(\)\s*\{/);
  assert.match(ASET_SRC, /function _assetNilaiOnBlur\(\)\s*\{/);
  assert.match(ASET_SRC, /function _assetModalInvestasiOnInput\(\)\s*\{/);
  assert.match(ASET_SRC, /function _assetModalInvestasiOnBlur\(\)\s*\{/);
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
  vm.runInContext(snippet, context, { filename: 'sesi6-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeEl(dataset, value) {
  const el = { dataset: Object.assign({}, dataset), value };
  el.closest = () => el;
  return el;
}

test('sesi6 end-to-end (onchange dotted, tanpa wrapper): #assetJenis -> Aset.onJenisChange() lewat dispatcher', () => {
  const calls = [];
  const stub = { Aset: { onJenisChange: (...args) => calls.push(args) } };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onchange: 'Aset.onJenisChange' });
  dispatch({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi6 end-to-end (onchange dotted, tanpa wrapper): #assetInvestmentId -> Aset.onInvestmentLinkChange() lewat dispatcher', () => {
  const calls = [];
  const stub = { Aset: { onInvestmentLinkChange: (...args) => calls.push(args) } };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onchange: 'Aset.onInvestmentLinkChange' });
  dispatch({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi6 end-to-end (onblur dotted, tanpa wrapper): #assetHargaBeli & #assetJumlahUnit -> Aset.updateProfitPreview() lewat dispatcher', () => {
  const calls = [];
  const stub = { Aset: { updateProfitPreview: (...args) => calls.push(args) } };
  const dispatch = makeDispatcher(stub);
  dispatch({ type: 'blur', target: makeFakeEl({ onblur: 'Aset.updateProfitPreview' }) });
  dispatch({ type: 'blur', target: makeFakeEl({ onblur: 'Aset.updateProfitPreview' }) });
  assert.deepEqual(calls, [[], []]);
});

test('sesi6 end-to-end (oninput wrapper): #assetNilai -> _assetNilaiOnInput() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _assetNilaiOnInput: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ oninput: '_assetNilaiOnInput' }, '5000000');
  dispatch({ type: 'input', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi6 end-to-end (onblur wrapper): #assetNilai -> _assetNilaiOnBlur() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _assetNilaiOnBlur: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onblur: '_assetNilaiOnBlur' }, '5000000');
  dispatch({ type: 'blur', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi6 end-to-end (oninput wrapper): #assetModalInvestasi -> _assetModalInvestasiOnInput() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _assetModalInvestasiOnInput: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ oninput: '_assetModalInvestasiOnInput' }, '4000000');
  dispatch({ type: 'input', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi6 end-to-end (onblur wrapper): #assetModalInvestasi -> _assetModalInvestasiOnBlur() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _assetModalInvestasiOnBlur: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onblur: '_assetModalInvestasiOnBlur' }, '4000000');
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
  vm.runInContext(extraSrc, context, { filename: 'sesi6-wrapper-unit.js' });
  return context;
}

function extractBody(src, fnName) {
  const m = src.match(new RegExp(`function ${fnName}\\(\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
  assert.ok(m, `${fnName} body tidak ditemukan`);
  return m[1];
}

test('sesi6 wrapper: _assetNilaiOnInput() memanggil updateAmtPreview("assetNilai","assetNilaiPreview") lalu Aset.updateProfitPreview() — urutan & argumen sama persis dgn inline asli', () => {
  const body = extractBody(ASET_SRC, '_assetNilaiOnInput');
  const calls = [];
  const ctx = loadWrapperContext(`function _assetNilaiOnInput(){${body}}`, {
    updateAmtPreview: (...args) => calls.push(['updateAmtPreview', ...args]),
    Aset: { updateProfitPreview: () => calls.push(['Aset.updateProfitPreview']) },
  });
  ctx._assetNilaiOnInput();
  assert.deepEqual(calls, [
    ['updateAmtPreview', 'assetNilai', 'assetNilaiPreview'],
    ['Aset.updateProfitPreview'],
  ]);
});

test('sesi6 wrapper: _assetNilaiOnBlur() memanggil evalAmtExpr("assetNilai") lalu Aset.updateProfitPreview() — urutan & argumen sama persis dgn inline asli', () => {
  const body = extractBody(ASET_SRC, '_assetNilaiOnBlur');
  const calls = [];
  const ctx = loadWrapperContext(`function _assetNilaiOnBlur(){${body}}`, {
    evalAmtExpr: (...args) => calls.push(['evalAmtExpr', ...args]),
    Aset: { updateProfitPreview: () => calls.push(['Aset.updateProfitPreview']) },
  });
  ctx._assetNilaiOnBlur();
  assert.deepEqual(calls, [
    ['evalAmtExpr', 'assetNilai'],
    ['Aset.updateProfitPreview'],
  ]);
});

test('sesi6 wrapper: _assetModalInvestasiOnInput() memanggil updateAmtPreview("assetModalInvestasi","assetModalInvestasiPreview") lalu Aset.updateProfitPreview() — urutan & argumen sama persis dgn inline asli', () => {
  const body = extractBody(ASET_SRC, '_assetModalInvestasiOnInput');
  const calls = [];
  const ctx = loadWrapperContext(`function _assetModalInvestasiOnInput(){${body}}`, {
    updateAmtPreview: (...args) => calls.push(['updateAmtPreview', ...args]),
    Aset: { updateProfitPreview: () => calls.push(['Aset.updateProfitPreview']) },
  });
  ctx._assetModalInvestasiOnInput();
  assert.deepEqual(calls, [
    ['updateAmtPreview', 'assetModalInvestasi', 'assetModalInvestasiPreview'],
    ['Aset.updateProfitPreview'],
  ]);
});

test('sesi6 wrapper: _assetModalInvestasiOnBlur() memanggil evalAmtExpr("assetModalInvestasi") lalu Aset.updateProfitPreview() — urutan & argumen sama persis dgn inline asli', () => {
  const body = extractBody(ASET_SRC, '_assetModalInvestasiOnBlur');
  const calls = [];
  const ctx = loadWrapperContext(`function _assetModalInvestasiOnBlur(){${body}}`, {
    evalAmtExpr: (...args) => calls.push(['evalAmtExpr', ...args]),
    Aset: { updateProfitPreview: () => calls.push(['Aset.updateProfitPreview']) },
  });
  ctx._assetModalInvestasiOnBlur();
  assert.deepEqual(calls, [
    ['evalAmtExpr', 'assetModalInvestasi'],
    ['Aset.updateProfitPreview'],
  ]);
});
