'use strict';
// tests/sesi5-bbmmodal-bbmcost-bbmspbu-inline-attr.test.js —
// Sesi 5, lanjutan PATCH-SESI1-SESI2-SESI3-SESI4-fix-csp-inline-handlers (migrasi
// atribut event inline yang diblokir CSP script-src-attr 'none'). Sesi ini
// menutup 2 elemen sisa di bbmModal (BUKAN txBbmPanel di txModal, yang sudah
// dikerjakan Sesi 4): #bbmCost, #bbmSpbu.
//
// Pola sama seperti Sesi 1-4: Lapis A gate literal (atribut inline lama harus
// hilang, atribut data-* baru harus ada persis) + Lapis B fungsional lewat
// dispatcher ASLI (_dataActionInputChangeHandler, diekstrak apa adanya dari
// source, TIDAK diubah sesi ini) + Lapis C unit test wrapper baru
// (_bbmCostOnInput, _bbmSpbuOnBlur) yang menggantikan oninput/onblur inline
// berargumen-beda atau arrow function (pola sama persis _txAmtOnInput/
// _txBbmSpbuOnBlur dkk, Sesi 1-4).
//
// #bbmCost butuh wrapper baru krn oninput aslinya 2 panggilan argumen
// berbeda-jumlah (syncBbmLiterFromCost() + updateAmtPreview('bbmCost',
// 'bbmCostPreview')). #bbmSpbu butuh wrapper baru krn onblur aslinya arrow
// function (setTimeout(()=>hideSuggestBox('bbmSpbuBox'),150)) -- keduanya
// tidak bisa langsung di-eval dispatcher generik.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const MODALS_SRC = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
const VEHICLE_CORE_SRC = fs.readFileSync(path.join(ROOT, 'modules/vehicle/vehicle-core.js'), 'utf8');

// ---- Lapis A: gate literal (markup) ----

const gates = [
  { id: 'bbmCost', attr: 'data-oninput=\\"_bbmCostOnInput\\"' },
  {
    id: 'bbmSpbu',
    attr: "data-oninput=\\\"simpleAutocompleteInput\\\" data-oninput-args='[\\\"bbmSpbu\\\",\\\"bbmSpbuBox\\\",\\\"acSpbuNames\\\"]' data-onfocus=\\\"simpleAutocompleteInput\\\" data-onfocus-args='[\\\"bbmSpbu\\\",\\\"bbmSpbuBox\\\",\\\"acSpbuNames\\\"]' data-onblur=\\\"_bbmSpbuOnBlur\\\"",
  },
];

for (const { id, attr } of gates) {
  test(`sesi5 gate: #${id} markup mengandung ${attr.slice(0, 50)}...`, () => {
    assert.ok(MODALS_SRC.includes(`id=\\"${id}\\"`), `#${id} harus ada di modals.js`);
    const idx = MODALS_SRC.indexOf(`id=\\"${id}\\"`);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.ok(snippet.includes(attr), `#${id} harus mengandung: ${attr}\nSNIPPET: ${snippet}`);
  });
}

test('sesi5 gate: 0 oninput/onchange/onblur/onfocus inline lama tersisa utk #bbmCost & #bbmSpbu', () => {
  const ids = ['bbmCost', 'bbmSpbu'];
  for (const id of ids) {
    const idx = MODALS_SRC.indexOf(`id=\\"${id}\\"`);
    assert.notEqual(idx, -1, `#${id} tidak ditemukan`);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.doesNotMatch(snippet, /(?<!data-)\b(oninput|onchange|onblur|onfocus)=\\"/,
      `#${id} masih punya atribut inline lama: ${snippet}`);
  }
});

test('sesi5 gate: wrapper baru ada sbg fungsi top-level (bukan method dotted, tidak perlu window-expose)', () => {
  assert.match(VEHICLE_CORE_SRC, /function _bbmCostOnInput\(\)\s*\{/);
  assert.match(VEHICLE_CORE_SRC, /function _bbmSpbuOnBlur\(\)\s*\{/);
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
  vm.runInContext(snippet, context, { filename: 'sesi5-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeEl(dataset, value) {
  const el = { dataset: Object.assign({}, dataset), value };
  el.closest = () => el;
  return el;
}

test('sesi5 end-to-end (oninput wrapper): #bbmCost -> _bbmCostOnInput() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _bbmCostOnInput: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ oninput: '_bbmCostOnInput' }, '35000');
  dispatch({ type: 'input', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi5 end-to-end (oninput dgn args + dereferensi list): #bbmSpbu -> simpleAutocompleteInput(...) lewat dispatcher', () => {
  const calls = [];
  const acSpbuNames = ['Pertamina Borobudur', 'Shell Magelang'];
  const stub = { simpleAutocompleteInput: (...args) => calls.push(args), acSpbuNames };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ oninput: 'simpleAutocompleteInput', oninputArgs: '["bbmSpbu","bbmSpbuBox","acSpbuNames"]' }, 'Perta');
  dispatch({ type: 'input', target: el });
  assert.deepEqual(calls, [['bbmSpbu', 'bbmSpbuBox', acSpbuNames]]);
});

test('sesi5 end-to-end (onfocus dgn args + dereferensi list): #bbmSpbu -> simpleAutocompleteInput(...) lewat dispatcher', () => {
  const calls = [];
  const acSpbuNames = ['Pertamina Borobudur', 'Shell Magelang'];
  const stub = { simpleAutocompleteInput: (...args) => calls.push(args), acSpbuNames };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onfocus: 'simpleAutocompleteInput', onfocusArgs: '["bbmSpbu","bbmSpbuBox","acSpbuNames"]' });
  dispatch({ type: 'focus', target: el });
  assert.deepEqual(calls, [['bbmSpbu', 'bbmSpbuBox', acSpbuNames]]);
});

test('sesi5 end-to-end (onblur wrapper): #bbmSpbu -> _bbmSpbuOnBlur() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _bbmSpbuOnBlur: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onblur: '_bbmSpbuOnBlur' });
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
  vm.runInContext(extraSrc, context, { filename: 'sesi5-wrapper-unit.js' });
  return context;
}

function extractBody(src, fnName) {
  const m = src.match(new RegExp(`function ${fnName}\\(\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
  assert.ok(m, `${fnName} body tidak ditemukan`);
  return m[1];
}

test('sesi5 wrapper: _bbmCostOnInput() memanggil syncBbmLiterFromCost() lalu updateAmtPreview("bbmCost","bbmCostPreview") — urutan & argumen sama persis dgn inline asli', () => {
  const body = extractBody(VEHICLE_CORE_SRC, '_bbmCostOnInput');
  const calls = [];
  const ctx = loadWrapperContext(`function _bbmCostOnInput(){${body}}`, {
    syncBbmLiterFromCost: () => calls.push(['syncBbmLiterFromCost']),
    updateAmtPreview: (...args) => calls.push(['updateAmtPreview', ...args]),
  });
  ctx._bbmCostOnInput();
  assert.deepEqual(calls, [
    ['syncBbmLiterFromCost'],
    ['updateAmtPreview', 'bbmCost', 'bbmCostPreview'],
  ]);
});

test('sesi5 wrapper: _bbmSpbuOnBlur() memanggil setTimeout(...) yg akhirnya hideSuggestBox("bbmSpbuBox")', () => {
  const body = extractBody(VEHICLE_CORE_SRC, '_bbmSpbuOnBlur');
  const calls = [];
  const ctx = loadWrapperContext(`function _bbmSpbuOnBlur(){${body}}`, {
    setTimeout: (fn) => fn(),
    hideSuggestBox: (id) => calls.push(['hideSuggestBox', id]),
  });
  ctx._bbmSpbuOnBlur();
  assert.deepEqual(calls, [['hideSuggestBox', 'bbmSpbuBox']]);
});
