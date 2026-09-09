'use strict';
// tests/sesi7b-accmodal-inline-attr.test.js —
// Sesi 7b, lanjutan PATCH-SESI1-SESI2-SESI3-SESI4-SESI5-SESI6-fix-csp-inline-handlers
// + Sesi 7a (debtModal+piutangModal). Sesi ini menutup accModal
// (modules/shared/modals.js) — 2 elemen, 3 atribut inline:
//   #accJenis (onchange, 0 arg)
//   #accBalance (oninput+onblur, 1 panggilan/event, BUTUH args)
//
// Sama seperti Sesi 7a: kedua elemen di sesi ini cuma 1 panggilan fungsi per
// event, jadi TIDAK perlu wrapper baru di JS manapun — dispatcher generik
// (_dataActionInputChangeHandler) langsung memanggil nama fungsi lewat
// data-onX + data-onX-args. onAccJenisChange() sudah berupa fungsi global
// biasa (modules/finance/akun.js) sehingga tidak ada masalah window-expose
// spt Debt di Sesi 7a.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const MODALS_SRC = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');

// ---- Lapis A: gate literal (markup) ----

const gates = [
  { id: 'accJenis', attr: 'data-onchange=\\\"onAccJenisChange\\\"' },
  { id: 'accBalance', attr: `data-oninput=\\\"updateAmtPreview\\\" data-oninput-args='[\\\"accBalance\\\",\\\"accBalancePreview\\\"]' data-onblur=\\\"evalAmtExpr\\\" data-onblur-args='[\\\"accBalance\\\"]'` },
];

for (const { id, attr } of gates) {
  test(`sesi7b gate: #${id} markup mengandung ${attr.slice(0, 60)}...`, () => {
    const marker = `id=\\\"${id}\\\"`;
    assert.ok(MODALS_SRC.includes(marker), `#${id} harus ada di modals.js`);
    const idx = MODALS_SRC.indexOf(marker);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.ok(snippet.includes(attr), `#${id} harus mengandung: ${attr}\nSNIPPET: ${snippet}`);
  });
}

test('sesi7b gate: 0 oninput/onchange/onblur inline lama tersisa utk 2 elemen accModal', () => {
  const ids = ['accJenis', 'accBalance'];
  for (const id of ids) {
    const marker = `id=\\\"${id}\\\"`;
    const idx = MODALS_SRC.indexOf(marker);
    assert.notEqual(idx, -1, `#${id} tidak ditemukan`);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.doesNotMatch(snippet, /(?<!data-)\b(oninput|onchange|onblur|onfocus)=\\"/,
      `#${id} masih punya atribut inline lama: ${snippet}`);
  }
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
  vm.runInContext(snippet, context, { filename: 'sesi7b-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeEl(dataset, value) {
  const el = { dataset: Object.assign({}, dataset), value };
  el.closest = () => el;
  return el;
}

test('sesi7b end-to-end (onchange, tanpa wrapper): #accJenis -> onAccJenisChange() lewat dispatcher', () => {
  const calls = [];
  const stub = { onAccJenisChange: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onchange: 'onAccJenisChange' });
  dispatch({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi7b end-to-end (oninput+onblur DENGAN args): #accBalance -> updateAmtPreview("accBalance","accBalancePreview") & evalAmtExpr("accBalance") lewat dispatcher', () => {
  const calls = [];
  const stub = {
    updateAmtPreview: (...args) => calls.push(['updateAmtPreview', ...args]),
    evalAmtExpr: (...args) => calls.push(['evalAmtExpr', ...args]),
  };
  const dispatch = makeDispatcher(stub);
  dispatch({ type: 'input', target: makeFakeEl({ oninput: 'updateAmtPreview', oninputArgs: '["accBalance","accBalancePreview"]' }, '1000000') });
  dispatch({ type: 'blur', target: makeFakeEl({ onblur: 'evalAmtExpr', onblurArgs: '["accBalance"]' }, '1000000') });
  assert.deepEqual(calls, [
    ['updateAmtPreview', 'accBalance', 'accBalancePreview'],
    ['evalAmtExpr', 'accBalance'],
  ]);
});
