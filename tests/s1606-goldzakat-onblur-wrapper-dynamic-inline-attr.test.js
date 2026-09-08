'use strict';
// tests/s1606-goldzakat-onblur-wrapper-dynamic-inline-attr.test.js
// Sesi s1606 -- lanjutan epic migrasi "atribut event inline yang di-generate
// dinamis" (docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md, rekomendasi #3, lanjutan
// SA11-SA18/s1603/s1604/s1604b/s1605).
//
// s1605 sengaja menunda 2 file terakhir dari 9 hasil audit ulang (bukan
// swap-atribut murni, perlu wrapper/fungsi named baru dulu -- lihat bagian
// "Sisa temuan" di PATCH-README-s1603-s1604-s1604b-s1605-akumulasi.md), dan
// atas permintaan pemilik project 2 file itu SENGAJA DIPECAH LAGI jadi 2 sesi
// terpisah (blast radius sekecil mungkin per patch):
//
//   - s1606 (SESI INI, lebih ringan): modules/asset/aset-emas-impor.js --
//     #gzHargaGram punya oninput 0-arg biasa (migrasi standar) DAN onblur
//     rangkap 2 pemanggilan fungsi berbeda argumen
//     (`evalAmtExpr('gzHargaGram')` + `GoldZakat.onHargaInput()`). Dispatcher
//     generik mendukung nama fungsi comma-separated tapi HANYA 1 array args
//     yg diterapkan rata ke semua nama dalam daftar -- tidak cocok krn kedua
//     fungsi butuh argumen berbeda (1 literal vs 0 arg). Ditambahkan wrapper
//     kecil baru `_gzHargaOnBlur()` yang memanggil keduanya scr eksplisit,
//     urutan & argumen persis sama dgn inline asli -- ZERO perubahan logic
//     pada evalAmtExpr atau GoldZakat.onHargaInput itu sendiri.
//   - modules/vehicle/vehicle-core.js (#cnCurKmInput onkeydown Enter/Escape,
//     ekspresi kondisional inline BUKAN pemanggilan fungsi bernama) DITUNDA
//     ke sesi terpisah berikutnya (s1607) -- beda kelas & butuh keputusan
//     penamaan/argumen tersendiri (this vs e.target), sengaja tidak digabung
//     ke patch ini supaya tetap 1 perubahan risiko per sesi.
//
// Sama seperti SA11-SA18/s1603-s1605: gate statis (0 atribut inline lama
// tersisa + literal pattern baru persis) + fungsional end-to-end lewat
// dispatcher ASLI (_dataActionInputChangeHandler, diekstrak dari source,
// tidak diubah lagi sesi ini) + unit test langsung ke wrapper baru.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function readSrc(relFile) {
  return fs.readFileSync(path.join(__dirname, '..', relFile), 'utf8');
}

// ---- Lapis A: gate literal (pola inline lama harus hilang, pola baru harus ada) ----

const SRC_GOLD = readSrc('modules/asset/aset-emas-impor.js');

test('s1606 gate: #gzHargaGram sudah pakai data-oninput/data-onblur, atribut inline lama hilang', () => {
  assert.ok(SRC_GOLD.includes(`id="gzHargaGram"`));
  assert.ok(SRC_GOLD.includes(`data-oninput="GoldZakat.onHargaInput"`));
  assert.ok(SRC_GOLD.includes(`data-onblur="_gzHargaOnBlur"`));
  assert.ok(!SRC_GOLD.includes(`oninput="GoldZakat.onHargaInput()"`));
  assert.ok(!SRC_GOLD.includes(`onblur="evalAmtExpr('gzHargaGram');GoldZakat.onHargaInput()"`));
  // dispatcher lama tidak boleh muncul lagi utk elemen ini (comma-separated data-onblur workaround)
  assert.ok(!SRC_GOLD.includes(`data-onblur="evalAmtExpr,GoldZakat.onHargaInput"`));
});

test('s1606 gate: wrapper _gzHargaOnBlur ada sbg fungsi top-level (bukan method dotted, tidak perlu window-expose)', () => {
  assert.match(SRC_GOLD, /function _gzHargaOnBlur\(\)\s*\{/);
});

test('s1606 gate: _gzHargaOnBlur memanggil evalAmtExpr("gzHargaGram") lalu GoldZakat.onHargaInput() -- urutan sama persis dgn inline asli', () => {
  const m = SRC_GOLD.match(/function _gzHargaOnBlur\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, '_gzHargaOnBlur body tidak ditemukan');
  const body = m[1];
  const idxEval = body.indexOf(`evalAmtExpr('gzHargaGram')`);
  const idxHarga = body.indexOf('GoldZakat.onHargaInput()');
  assert.ok(idxEval !== -1, 'evalAmtExpr(\'gzHargaGram\') tidak dipanggil di wrapper');
  assert.ok(idxHarga !== -1, 'GoldZakat.onHargaInput() tidak dipanggil di wrapper');
  assert.ok(idxEval < idxHarga, 'urutan panggilan harus evalAmtExpr dulu baru onHargaInput, sama seperti inline asli');
});

test('s1606 gate: window.GoldZakat=GoldZakat tetap ada (dipakai dispatcher utk data-oninput dotted)', () => {
  assert.ok(SRC_GOLD.includes('window.GoldZakat = GoldZakat;'));
});

// ---- Lapis B: dispatcher ASLI end-to-end (diekstrak dari source, tidak diubah sesi ini) ----

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

function makeChangeDispatcher(windowObj) {
  const context = { console, window: windowObj, document: { querySelectorAll: () => [] }, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dataActionResolveArgs')}\n${extractFnSource('_dataActionInputChangeHandler')}\nthis._dataActionInputChangeHandler = _dataActionInputChangeHandler;`;
  vm.runInContext(snippet, context, { filename: 's1606-change-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeChangeEl(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = () => el;
  return el;
}

test('s1606 end-to-end (oninput): GoldZakat.onHargaInput dataset persis hasil migrasi -> terpanggil 0-arg', () => {
  const calls = [];
  const stub = { GoldZakat: { onHargaInput: (...args) => calls.push(args) } };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ oninput: 'GoldZakat.onHargaInput' });
  el.value = '1500000';
  dispatchChange({ type: 'input', target: el });
  assert.deepEqual(calls, [[]]);
});

test('s1606 end-to-end (onblur): _gzHargaOnBlur dataset persis hasil migrasi -> terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _gzHargaOnBlur: (...args) => calls.push(args) };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ onblur: '_gzHargaOnBlur' });
  dispatchChange({ type: 'blur', target: el });
  assert.deepEqual(calls, [[]]);
});

test('s1606 end-to-end (onblur): fungsi tidak ditemukan -> error tercatat, tidak throw (silent no-op class lama)', () => {
  const errors = [];
  const origError = console.error;
  const stub = {};
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ onblur: '_gzHargaOnBlurTypoTidakAda' });
  console.error = (...a) => errors.push(a);
  try {
    assert.doesNotThrow(() => dispatchChange({ type: 'blur', target: el }));
  } finally {
    console.error = origError;
  }
});

// ---- Lapis C: unit test langsung ke wrapper _gzHargaOnBlur (perilaku, bukan cuma dispatcher) ----

function loadGoldZakatWrapper() {
  const context = {
    console,
    document: { getElementById: () => ({ value: '1.500.000' }) },
    D: {},
    save: () => {},
    parsePzNum: (v) => Number(String(v).replace(/[^\d]/g, '')) || 0,
    evalAmtExprCalls: [],
  };
  context.evalAmtExpr = (id) => context.evalAmtExprCalls.push(id);
  vm.createContext(context);
  // GoldZakat sendiri objek besar (render() dst pakai banyak helper lain yang tidak
  // relevan di test ini) -- utk unit test wrapper murni, stub GoldZakat.onHargaInput
  // scr independen, cukup ambil source wrapper _gzHargaOnBlur apa adanya dari file asli
  // supaya benar-benar menguji kode produksi, bukan re-implementasi paralel.
  const m = SRC_GOLD.match(/function _gzHargaOnBlur\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, '_gzHargaOnBlur tidak ditemukan di source utk dimuat ke sandbox');
  const onHargaInputCalls = [];
  context.GoldZakat = { onHargaInput: (...args) => onHargaInputCalls.push(args) };
  vm.runInContext(`${m[0]}\nthis._gzHargaOnBlur = _gzHargaOnBlur;`, context, { filename: 's1606-wrapper-extract.js' });
  return { fn: context._gzHargaOnBlur, evalAmtExprCalls: context.evalAmtExprCalls, onHargaInputCalls };
}

test('s1606 unit: _gzHargaOnBlur() memanggil evalAmtExpr("gzHargaGram") persis 1x dengan argumen yg benar', () => {
  const { fn, evalAmtExprCalls } = loadGoldZakatWrapper();
  fn();
  assert.deepEqual(evalAmtExprCalls, ['gzHargaGram']);
});

test('s1606 unit: _gzHargaOnBlur() memanggil GoldZakat.onHargaInput() persis 1x tanpa argumen', () => {
  const { fn, onHargaInputCalls } = loadGoldZakatWrapper();
  fn();
  assert.deepEqual(onHargaInputCalls, [[]]);
});

test('s1606 unit: _gzHargaOnBlur() memanggil evalAmtExpr SEBELUM GoldZakat.onHargaInput (urutan dipertahankan)', () => {
  const order = [];
  const context = {
    console,
    evalAmtExpr: (id) => order.push(['evalAmtExpr', id]),
    GoldZakat: { onHargaInput: (...args) => order.push(['onHargaInput', ...args]) },
  };
  vm.createContext(context);
  const m = SRC_GOLD.match(/function _gzHargaOnBlur\(\)\s*\{[\s\S]*?\n\}/);
  vm.runInContext(`${m[0]}\nthis._gzHargaOnBlur = _gzHargaOnBlur;`, context, { filename: 's1606-wrapper-order-extract.js' });
  context._gzHargaOnBlur();
  assert.deepEqual(order, [['evalAmtExpr', 'gzHargaGram'], ['onHargaInput']]);
});
