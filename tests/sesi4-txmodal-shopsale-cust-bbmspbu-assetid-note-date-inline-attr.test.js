'use strict';
// tests/sesi4-txmodal-shopsale-cust-bbmspbu-assetid-note-date-inline-attr.test.js —
// Sesi 4, lanjutan PATCH-SESI1-SESI2-SESI3-fix-csp-inline-handlers (migrasi
// atribut event inline txModal yang diblokir CSP script-src-attr 'none').
// Sesi ini menutup 7 elemen sisa: #txShopSaleCustName, #txShopSaleCustPhone,
// #txShopSaleCustAddr (panel Pembeli ShopSale), #txBbmSpbu (panel BBM Sync),
// #txAssetId, #txNote, #txDate.
//
// Pola sama seperti Sesi 1-3: Lapis A gate literal (atribut inline lama harus
// hilang, atribut data-* baru harus ada persis) + Lapis B fungsional lewat
// dispatcher ASLI (_dataActionInputChangeHandler, diekstrak apa adanya dari
// source, TIDAK diubah sesi ini) + Lapis C unit test wrapper baru
// (_txShopSaleCustNameOnBlur, _txShopSaleCustPhoneOnBlur,
// _txShopSaleCustAddrOnBlur, _txBbmSpbuOnBlur, _txNoteOnInput, _txNoteOnBlur)
// yang menggantikan onblur/oninput inline berargumen-beda atau arrow function
// (pola sama persis _txCatOnBlur/_txSubCatOnBlur/_txCicilanTotalOnBlur dkk,
// Sesi 1-2). #txAssetId (onchange 0-argumen ke 1 fungsi top-level) dan
// #txDate (oninput 1-argumen literal) migrasi LANGSUNG ke dispatcher generik
// tanpa wrapper baru, sama seperti pola #txAcc/#txAddStock.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const MODALS_SRC = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
const COBEK_TX_CART_SRC = fs.readFileSync(path.join(ROOT, 'modules/shop/cobek-tx-cart.js'), 'utf8');
const TX_BBM_SRC = fs.readFileSync(path.join(ROOT, 'modules/finance/tx-bbm.js'), 'utf8');
const TRANSAKSI_SRC = fs.readFileSync(path.join(ROOT, 'modules/finance/transaksi.js'), 'utf8');

// ---- Lapis A: gate literal (markup) ----

const gates = [
  {
    id: 'txShopSaleCustName',
    attr: "data-oninput=\\\"onShopCustFieldInput\\\" data-oninput-args='[\\\"name\\\"]' data-onfocus=\\\"onShopCustFieldInput\\\" data-onfocus-args='[\\\"name\\\"]' data-onblur=\\\"_txShopSaleCustNameOnBlur\\\"",
  },
  {
    id: 'txShopSaleCustPhone',
    attr: "data-oninput=\\\"onShopCustFieldInput\\\" data-oninput-args='[\\\"phone\\\"]' data-onfocus=\\\"onShopCustFieldInput\\\" data-onfocus-args='[\\\"phone\\\"]' data-onblur=\\\"_txShopSaleCustPhoneOnBlur\\\"",
  },
  {
    id: 'txShopSaleCustAddr',
    attr: "data-oninput=\\\"onShopCustFieldInput\\\" data-oninput-args='[\\\"address\\\"]' data-onfocus=\\\"onShopCustFieldInput\\\" data-onfocus-args='[\\\"address\\\"]' data-onblur=\\\"_txShopSaleCustAddrOnBlur\\\"",
  },
  {
    id: 'txBbmSpbu',
    attr: "data-oninput=\\\"simpleAutocompleteInput\\\" data-oninput-args='[\\\"txBbmSpbu\\\",\\\"txBbmSpbuBox\\\",\\\"acSpbuNames\\\"]' data-onfocus=\\\"simpleAutocompleteInput\\\" data-onfocus-args='[\\\"txBbmSpbu\\\",\\\"txBbmSpbuBox\\\",\\\"acSpbuNames\\\"]' data-onblur=\\\"_txBbmSpbuOnBlur\\\"",
  },
  { id: 'txAssetId', attr: 'data-onchange=\\"onTxAssetChange\\"' },
  {
    id: 'txNote',
    attr: "data-oninput=\\\"_txNoteOnInput\\\" data-onfocus=\\\"simpleAutocompleteInput\\\" data-onfocus-args='[\\\"txNote\\\",\\\"txNoteBox\\\",\\\"acTxNotes\\\"]' data-onblur=\\\"_txNoteOnBlur\\\"",
  },
  { id: 'txDate', attr: "data-oninput=\\\"syncCicilanDate\\\" data-oninput-args='[\\\"date\\\"]'" },
];

for (const { id, attr } of gates) {
  test(`sesi4 gate: #${id} markup mengandung ${attr.slice(0, 50)}...`, () => {
    assert.ok(MODALS_SRC.includes(`id=\\"${id}\\"`), `#${id} harus ada di modals.js`);
    const idx = MODALS_SRC.indexOf(`id=\\"${id}\\"`);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.ok(snippet.includes(attr), `#${id} harus mengandung: ${attr}\nSNIPPET: ${snippet}`);
  });
}

test('sesi4 gate: 0 oninput/onchange/onblur/onfocus inline lama tersisa utk 7 elemen sesi ini', () => {
  const ids = ['txShopSaleCustName', 'txShopSaleCustPhone', 'txShopSaleCustAddr',
    'txBbmSpbu', 'txAssetId', 'txNote', 'txDate'];
  for (const id of ids) {
    const idx = MODALS_SRC.indexOf(`id=\\"${id}\\"`);
    assert.notEqual(idx, -1, `#${id} tidak ditemukan`);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.doesNotMatch(snippet, /(?<!data-)\b(oninput|onchange|onblur|onfocus)=\\"/,
      `#${id} masih punya atribut inline lama: ${snippet}`);
  }
});

test('sesi4 gate: wrapper baru ada sbg fungsi top-level (bukan method dotted, tidak perlu window-expose)', () => {
  assert.match(COBEK_TX_CART_SRC, /function _txShopSaleCustNameOnBlur\(\)\s*\{/);
  assert.match(COBEK_TX_CART_SRC, /function _txShopSaleCustPhoneOnBlur\(\)\s*\{/);
  assert.match(COBEK_TX_CART_SRC, /function _txShopSaleCustAddrOnBlur\(\)\s*\{/);
  assert.match(TX_BBM_SRC, /function _txBbmSpbuOnBlur\(\)\s*\{/);
  assert.match(TRANSAKSI_SRC, /function _txNoteOnInput\(\)\s*\{/);
  assert.match(TRANSAKSI_SRC, /function _txNoteOnBlur\(\)\s*\{/);
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
  vm.runInContext(snippet, context, { filename: 'sesi4-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeEl(dataset, value) {
  const el = { dataset: Object.assign({}, dataset), value };
  el.closest = () => el;
  return el;
}

test('sesi4 end-to-end (oninput dgn args): #txShopSaleCustName -> onShopCustFieldInput("name") lewat dispatcher', () => {
  const calls = [];
  const stub = { onShopCustFieldInput: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ oninput: 'onShopCustFieldInput', oninputArgs: '["name"]' }, 'Bu Rina');
  dispatch({ type: 'input', target: el });
  assert.deepEqual(calls, [['name']]);
});

test('sesi4 end-to-end (onfocus dgn args): #txShopSaleCustPhone -> onShopCustFieldInput("phone") lewat dispatcher', () => {
  const calls = [];
  const stub = { onShopCustFieldInput: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onfocus: 'onShopCustFieldInput', onfocusArgs: '["phone"]' });
  dispatch({ type: 'focus', target: el });
  assert.deepEqual(calls, [['phone']]);
});

test('sesi4 end-to-end (onblur wrapper): #txShopSaleCustAddr -> _txShopSaleCustAddrOnBlur() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _txShopSaleCustAddrOnBlur: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onblur: '_txShopSaleCustAddrOnBlur' });
  dispatch({ type: 'blur', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi4 end-to-end (oninput dgn args + dereferensi list): #txBbmSpbu -> simpleAutocompleteInput(...) lewat dispatcher', () => {
  const calls = [];
  const acSpbuNames = ['Pertamina Borobudur', 'Shell Magelang'];
  const stub = { simpleAutocompleteInput: (...args) => calls.push(args), acSpbuNames };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ oninput: 'simpleAutocompleteInput', oninputArgs: '["txBbmSpbu","txBbmSpbuBox","acSpbuNames"]' }, 'Perta');
  dispatch({ type: 'input', target: el });
  assert.deepEqual(calls, [['txBbmSpbu', 'txBbmSpbuBox', acSpbuNames]]);
});

test('sesi4 end-to-end (onblur wrapper): #txBbmSpbu -> _txBbmSpbuOnBlur() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _txBbmSpbuOnBlur: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onblur: '_txBbmSpbuOnBlur' });
  dispatch({ type: 'blur', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi4 end-to-end (onchange): #txAssetId -> onTxAssetChange() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { onTxAssetChange: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onchange: 'onTxAssetChange' });
  dispatch({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi4 end-to-end (oninput wrapper): #txNote -> _txNoteOnInput() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _txNoteOnInput: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ oninput: '_txNoteOnInput' }, 'bayar galon');
  dispatch({ type: 'input', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi4 end-to-end (onblur wrapper): #txNote -> _txNoteOnBlur() terpanggil 0-arg lewat dispatcher', () => {
  const calls = [];
  const stub = { _txNoteOnBlur: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onblur: '_txNoteOnBlur' });
  dispatch({ type: 'blur', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi4 end-to-end (oninput dgn args): #txDate -> syncCicilanDate("date") lewat dispatcher', () => {
  const calls = [];
  const stub = { syncCicilanDate: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ oninput: 'syncCicilanDate', oninputArgs: '["date"]' }, '2026-09-09');
  dispatch({ type: 'input', target: el });
  assert.deepEqual(calls, [['date']]);
});

// ---- Lapis C: unit test langsung ke wrapper (perilaku, bukan cuma dispatcher) ----

function loadWrapperContext(extraSrc, extraCtx) {
  const context = Object.assign({
    console,
    document: { getElementById: () => ({ value: '', checked: false }) },
  }, extraCtx);
  vm.createContext(context);
  vm.runInContext(extraSrc, context, { filename: 'sesi4-wrapper-unit.js' });
  return context;
}

function extractBody(src, fnName) {
  const m = src.match(new RegExp(`function ${fnName}\\(\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
  assert.ok(m, `${fnName} body tidak ditemukan`);
  return m[1];
}

test('sesi4 wrapper: _txShopSaleCustNameOnBlur() memanggil setTimeout(...) yg akhirnya hideSuggestBox("txShopSaleCustNameBox")', () => {
  const body = extractBody(COBEK_TX_CART_SRC, '_txShopSaleCustNameOnBlur');
  const calls = [];
  const ctx = loadWrapperContext(`function _txShopSaleCustNameOnBlur(){${body}}`, {
    setTimeout: (fn) => fn(),
    hideSuggestBox: (id) => calls.push(['hideSuggestBox', id]),
  });
  ctx._txShopSaleCustNameOnBlur();
  assert.deepEqual(calls, [['hideSuggestBox', 'txShopSaleCustNameBox']]);
});

test('sesi4 wrapper: _txShopSaleCustPhoneOnBlur() memanggil setTimeout(...) yg akhirnya hideSuggestBox("txShopSaleCustPhoneBox")', () => {
  const body = extractBody(COBEK_TX_CART_SRC, '_txShopSaleCustPhoneOnBlur');
  const calls = [];
  const ctx = loadWrapperContext(`function _txShopSaleCustPhoneOnBlur(){${body}}`, {
    setTimeout: (fn) => fn(),
    hideSuggestBox: (id) => calls.push(['hideSuggestBox', id]),
  });
  ctx._txShopSaleCustPhoneOnBlur();
  assert.deepEqual(calls, [['hideSuggestBox', 'txShopSaleCustPhoneBox']]);
});

test('sesi4 wrapper: _txShopSaleCustAddrOnBlur() memanggil setTimeout(...) yg akhirnya hideSuggestBox("txShopSaleCustAddrBox")', () => {
  const body = extractBody(COBEK_TX_CART_SRC, '_txShopSaleCustAddrOnBlur');
  const calls = [];
  const ctx = loadWrapperContext(`function _txShopSaleCustAddrOnBlur(){${body}}`, {
    setTimeout: (fn) => fn(),
    hideSuggestBox: (id) => calls.push(['hideSuggestBox', id]),
  });
  ctx._txShopSaleCustAddrOnBlur();
  assert.deepEqual(calls, [['hideSuggestBox', 'txShopSaleCustAddrBox']]);
});

test('sesi4 wrapper: _txBbmSpbuOnBlur() memanggil setTimeout(...) yg akhirnya hideSuggestBox("txBbmSpbuBox")', () => {
  const body = extractBody(TX_BBM_SRC, '_txBbmSpbuOnBlur');
  const calls = [];
  const ctx = loadWrapperContext(`function _txBbmSpbuOnBlur(){${body}}`, {
    setTimeout: (fn) => fn(),
    hideSuggestBox: (id) => calls.push(['hideSuggestBox', id]),
  });
  ctx._txBbmSpbuOnBlur();
  assert.deepEqual(calls, [['hideSuggestBox', 'txBbmSpbuBox']]);
});

test('sesi4 wrapper: _txNoteOnInput() memanggil simpleAutocompleteInput("txNote","txNoteBox",acTxNotes) lalu AutoKat.onNoteInput() — urutan & argumen sama persis dgn inline asli', () => {
  const body = extractBody(TRANSAKSI_SRC, '_txNoteOnInput');
  const calls = [];
  const acTxNotes = ['bayar galon', 'beras warung'];
  const ctx = loadWrapperContext(`function _txNoteOnInput(){${body}}`, {
    simpleAutocompleteInput: (...args) => calls.push(['simpleAutocompleteInput', ...args]),
    AutoKat: { onNoteInput: () => calls.push(['AutoKat.onNoteInput']) },
    acTxNotes,
  });
  ctx._txNoteOnInput();
  assert.deepEqual(calls, [
    ['simpleAutocompleteInput', 'txNote', 'txNoteBox', acTxNotes],
    ['AutoKat.onNoteInput'],
  ]);
});

test('sesi4 wrapper: _txNoteOnBlur() memanggil setTimeout(...) yg akhirnya hideSuggestBox("txNoteBox")', () => {
  const body = extractBody(TRANSAKSI_SRC, '_txNoteOnBlur');
  const calls = [];
  const ctx = loadWrapperContext(`function _txNoteOnBlur(){${body}}`, {
    setTimeout: (fn) => fn(),
    hideSuggestBox: (id) => calls.push(['hideSuggestBox', id]),
  });
  ctx._txNoteOnBlur();
  assert.deepEqual(calls, [['hideSuggestBox', 'txNoteBox']]);
});
