'use strict';
// tests/sesi7a-debtmodal-piutangmodal-inline-attr.test.js —
// Sesi 7a, lanjutan PATCH-SESI1-SESI2-SESI3-SESI4-SESI5-SESI6-fix-csp-inline-handlers
// (migrasi atribut event inline yang diblokir CSP script-src-attr 'none').
//
// Sesi ini adalah PECAHAN PERTAMA dari rencana migrasi Sesi 7 (yang aslinya
// mencakup debtModal, piutangModal, accModal, vehicleModal, simModal, &
// keluarga tukangModal sekaligus, total 19 atribut inline) — dipecah jadi
// beberapa sesi ringan supaya tiap sesi kecil & mudah diverifikasi sendiri.
// Sesi 7a HANYA menutup debtModal + piutangModal (modules/shared/modals.js):
//   #debtJenis (onchange, dotted, 0 arg)
//   #debtSyncTx (onchange, 0 arg)
//   #debtNilai (oninput+onblur, 1 panggilan/event, BUTUH args)
//   #debtCicilan (oninput+onblur, 1 panggilan/event, BUTUH args)
//   #piutangNilai (oninput+onblur, 1 panggilan/event, BUTUH args)
//   #piutangSyncTx (onchange, 0 arg)
//
// Beda dari Sesi 6 (assetModal): SEMUA 6 elemen di sesi ini cuma 1 panggilan
// fungsi per event (bukan 2), jadi TIDAK perlu wrapper baru di JS manapun —
// dispatcher generik (_dataActionInputChangeHandler) langsung memanggil nama
// fungsi dotted/non-dotted dgn data-onX-args (mis. data-oninput="updateAmtPreview"
// data-oninput-args='["debtNilai","debtNilaiPreview"]'), pola sama persis
// #assetHargaBeli/#assetJumlahUnit di Sesi 6 tapi kali ini DENGAN argumen.
//
// Fix tambahan: window.Debt = Debt; ditambahkan di modules/finance/piutang-utang.js
// (sebelumnya HILANG — const Debt={...} top-level TIDAK otomatis jadi properti
// window, jadi data-onchange="Debt.onJenisChange" akan gagal resolve diam-diam
// tanpa baris expose ini; lihat pola window.Bill=Bill yang sudah ada di file yang
// sama, & window.Aset=Aset di modules/asset/aset.js Sesi 6).
//
// Pola sama seperti Sesi 1-6: Lapis A gate literal (atribut inline lama harus
// hilang, atribut data-* baru harus ada persis) + Lapis B fungsional lewat
// dispatcher ASLI (_dataActionInputChangeHandler, diekstrak apa adanya dari
// source, TIDAK diubah sesi ini) + Lapis C: window.Debt expose check.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const MODALS_SRC = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
const PIUTANG_UTANG_SRC = fs.readFileSync(path.join(ROOT, 'modules/finance/piutang-utang.js'), 'utf8');

// ---- Lapis A: gate literal (markup) ----

const gates = [
  { id: 'debtJenis', attr: 'data-onchange=\\\"Debt.onJenisChange\\\"' },
  { id: 'debtSyncTx', attr: 'data-onchange=\\\"toggleDebtSyncTxFields\\\"' },
  { id: 'debtNilai', attr: `data-oninput=\\\"updateAmtPreview\\\" data-oninput-args='[\\\"debtNilai\\\",\\\"debtNilaiPreview\\\"]' data-onblur=\\\"evalAmtExpr\\\" data-onblur-args='[\\\"debtNilai\\\"]'` },
  { id: 'debtCicilan', attr: `data-oninput=\\\"updateAmtPreview\\\" data-oninput-args='[\\\"debtCicilan\\\",\\\"debtCicilanPreview\\\"]' data-onblur=\\\"evalAmtExpr\\\" data-onblur-args='[\\\"debtCicilan\\\"]'` },
  { id: 'piutangNilai', attr: `data-oninput=\\\"updateAmtPreview\\\" data-oninput-args='[\\\"piutangNilai\\\",\\\"piutangNilaiPreview\\\"]' data-onblur=\\\"evalAmtExpr\\\" data-onblur-args='[\\\"piutangNilai\\\"]'` },
  { id: 'piutangSyncTx', attr: 'data-onchange=\\\"togglePiutangSyncTxFields\\\"' },
];

for (const { id, attr } of gates) {
  test(`sesi7a gate: #${id} markup mengandung ${attr.slice(0, 60)}...`, () => {
    const marker = `id=\\\"${id}\\\"`;
    assert.ok(MODALS_SRC.includes(marker), `#${id} harus ada di modals.js`);
    const idx = MODALS_SRC.indexOf(marker);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.ok(snippet.includes(attr), `#${id} harus mengandung: ${attr}\nSNIPPET: ${snippet}`);
  });
}

test('sesi7a gate: 0 oninput/onchange/onblur inline lama tersisa utk 6 elemen debtModal+piutangModal', () => {
  const ids = ['debtJenis', 'debtSyncTx', 'debtNilai', 'debtCicilan', 'piutangNilai', 'piutangSyncTx'];
  for (const id of ids) {
    const marker = `id=\\\"${id}\\\"`;
    const idx = MODALS_SRC.indexOf(marker);
    assert.notEqual(idx, -1, `#${id} tidak ditemukan`);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.doesNotMatch(snippet, /(?<!data-)\b(oninput|onchange|onblur|onfocus)=\\"/,
      `#${id} masih punya atribut inline lama: ${snippet}`);
  }
});

test('sesi7a gate: window.Debt = Debt; ditambahkan di piutang-utang.js (fix dispatch Debt.onJenisChange)', () => {
  assert.match(PIUTANG_UTANG_SRC, /if\s*\(\s*typeof\s+Debt\s*!==\s*'undefined'\s*\)\s*window\.Debt\s*=\s*Debt\s*;/);
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
  vm.runInContext(snippet, context, { filename: 'sesi7a-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeEl(dataset, value) {
  const el = { dataset: Object.assign({}, dataset), value };
  el.closest = () => el;
  return el;
}

test('sesi7a end-to-end (onchange dotted, tanpa wrapper): #debtJenis -> Debt.onJenisChange() lewat dispatcher', () => {
  const calls = [];
  const stub = { Debt: { onJenisChange: (...args) => calls.push(args) } };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onchange: 'Debt.onJenisChange' });
  dispatch({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi7a end-to-end (onchange, tanpa wrapper): #debtSyncTx -> toggleDebtSyncTxFields() lewat dispatcher', () => {
  const calls = [];
  const stub = { toggleDebtSyncTxFields: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onchange: 'toggleDebtSyncTxFields' });
  dispatch({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi7a end-to-end (onchange, tanpa wrapper): #piutangSyncTx -> togglePiutangSyncTxFields() lewat dispatcher', () => {
  const calls = [];
  const stub = { togglePiutangSyncTxFields: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onchange: 'togglePiutangSyncTxFields' });
  dispatch({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi7a end-to-end (oninput+onblur DENGAN args): #debtNilai -> updateAmtPreview("debtNilai","debtNilaiPreview") & evalAmtExpr("debtNilai") lewat dispatcher', () => {
  const calls = [];
  const stub = {
    updateAmtPreview: (...args) => calls.push(['updateAmtPreview', ...args]),
    evalAmtExpr: (...args) => calls.push(['evalAmtExpr', ...args]),
  };
  const dispatch = makeDispatcher(stub);
  dispatch({ type: 'input', target: makeFakeEl({ oninput: 'updateAmtPreview', oninputArgs: '["debtNilai","debtNilaiPreview"]' }, '5000000') });
  dispatch({ type: 'blur', target: makeFakeEl({ onblur: 'evalAmtExpr', onblurArgs: '["debtNilai"]' }, '5000000') });
  assert.deepEqual(calls, [
    ['updateAmtPreview', 'debtNilai', 'debtNilaiPreview'],
    ['evalAmtExpr', 'debtNilai'],
  ]);
});

test('sesi7a end-to-end (oninput+onblur DENGAN args): #debtCicilan -> updateAmtPreview("debtCicilan","debtCicilanPreview") & evalAmtExpr("debtCicilan") lewat dispatcher', () => {
  const calls = [];
  const stub = {
    updateAmtPreview: (...args) => calls.push(['updateAmtPreview', ...args]),
    evalAmtExpr: (...args) => calls.push(['evalAmtExpr', ...args]),
  };
  const dispatch = makeDispatcher(stub);
  dispatch({ type: 'input', target: makeFakeEl({ oninput: 'updateAmtPreview', oninputArgs: '["debtCicilan","debtCicilanPreview"]' }, '100000') });
  dispatch({ type: 'blur', target: makeFakeEl({ onblur: 'evalAmtExpr', onblurArgs: '["debtCicilan"]' }, '100000') });
  assert.deepEqual(calls, [
    ['updateAmtPreview', 'debtCicilan', 'debtCicilanPreview'],
    ['evalAmtExpr', 'debtCicilan'],
  ]);
});

test('sesi7a end-to-end (oninput+onblur DENGAN args): #piutangNilai -> updateAmtPreview("piutangNilai","piutangNilaiPreview") & evalAmtExpr("piutangNilai") lewat dispatcher', () => {
  const calls = [];
  const stub = {
    updateAmtPreview: (...args) => calls.push(['updateAmtPreview', ...args]),
    evalAmtExpr: (...args) => calls.push(['evalAmtExpr', ...args]),
  };
  const dispatch = makeDispatcher(stub);
  dispatch({ type: 'input', target: makeFakeEl({ oninput: 'updateAmtPreview', oninputArgs: '["piutangNilai","piutangNilaiPreview"]' }, '2000000') });
  dispatch({ type: 'blur', target: makeFakeEl({ onblur: 'evalAmtExpr', onblurArgs: '["piutangNilai"]' }, '2000000') });
  assert.deepEqual(calls, [
    ['updateAmtPreview', 'piutangNilai', 'piutangNilaiPreview'],
    ['evalAmtExpr', 'piutangNilai'],
  ]);
});
