'use strict';
// tests/data-oninput-onchange-dispatcher.test.js — mengunci permanen behavior
// dispatcher input/change pusat (_dataActionInputChangeHandler +
// _dataActionResolveArgs, modules/shared/features-helpers-global-security.js).
// Fondasi ini dibangun sesi SA1 SEBELUM index.html disentuh (lihat
// SESSION-NOTE-AKUMULASI-SA1-SA8.md, bagian "SA1 — Detail") supaya sesi
// migrasi per-halaman berikutnya (SA2-SA9) tinggal ganti atribut inline
// oninput/onchange -> data-oninput/data-onchange tanpa perlu mikirin
// infrastruktur. Test ini menjalankan fungsi ASLI (bukan re-implementasi)
// lewat brace-counting manual, pola sama seperti
// tests/data-action-dispatcher-toast.test.js.
//
// 10 test yang dikunci:
//   1.  extractFnSource menemukan kedua fungsi di source asli
//   2.  fungsi target TIDAK ADA -> toast "belum berfungsi"
//   3.  token $value -> el.value diteruskan sebagai argumen
//   4.  token $checked -> el.checked diteruskan sebagai argumen
//   5.  comma-separated function names -> kedua fungsi terpanggil, urutan benar
//   6.  JSON args tidak valid -> silent no-op (bukan throw, bukan toast)
//   7.  fungsi target async & reject -> toast "Gagal menjalankan ...: <pesan>"
//   8.  fungsi target throw sinkron -> toast "Terjadi error saat memproses input"
//   9.  routing 'input' vs 'change' tidak saling tertukar pada elemen yang
//       punya data-oninput DAN data-onchange sekaligus
//   10. jalur sukses (fungsi ada, tidak throw) -> tidak ada toast sama sekali

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'shared', 'features-helpers-global-security.js'),
  'utf8'
);

function extractFnSource(fnName) {
  const asyncMarker = `async function ${fnName}(`;
  const plainMarker = `function ${fnName}(`;
  let start = SRC.indexOf(asyncMarker);
  if (start === -1) start = SRC.indexOf(plainMarker);
  if (start === -1) throw new Error(`"${plainMarker}" tidak ditemukan`);
  const braceOpen = SRC.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < SRC.length && depth > 0) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') depth--;
    i++;
  }
  return SRC.slice(start, i);
}

// Elemen tiruan minimal: cuma properti yang benar-benar dibaca oleh
// _dataActionInputChangeHandler (dataset, closest(), value, checked).
function makeFakeElement(dataset, extra) {
  const el = Object.assign({ dataset: Object.assign({}, dataset) }, extra || {});
  el.closest = () => el;
  return el;
}

function loadSandbox(windowObj) {
  const toastCalls = [];
  const context = {
    console,
    toast: (msg) => { toastCalls.push(msg); },
    window: windowObj,
    document: { querySelectorAll: () => [] },
  };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dataActionResolveArgs')}
${extractFnSource('_dataActionInputChangeHandler')}
this._dataActionResolveArgs = _dataActionResolveArgs;
this._dataActionInputChangeHandler = _dataActionInputChangeHandler;`;
  vm.runInContext(snippet, context, { filename: 'dispatcher-input-change-extract.js' });
  return { context, toastCalls };
}

test('dispatcher input/change: extractFnSource berhasil menemukan kedua fungsi di source asli', () => {
  assert.doesNotThrow(() => extractFnSource('_dataActionResolveArgs'));
  assert.doesNotThrow(() => extractFnSource('_dataActionInputChangeHandler'));
});

test('dispatcher input/change #1 — fungsi target tidak ada -> toast "belum berfungsi"', () => {
  const { context, toastCalls } = loadSandbox({});
  const el = makeFakeElement({ oninput: 'TidakAda.metodeApa' });
  context._dataActionInputChangeHandler({ type: 'input', target: el });

  assert.equal(toastCalls.length, 1, 'toast harus terpanggil tepat 1x');
  assert.match(toastCalls[0], /belum berfungsi/i);
  assert.match(toastCalls[0], /TidakAda\.metodeApa/);
});

test('dispatcher input/change #2 — token $value diteruskan sebagai el.value', () => {
  let received = null;
  const windowObj = { catatNilai(v) { received = v; } };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement(
    { oninput: 'catatNilai', oninputArgs: '["$value"]' },
    { value: 'nilai-uji-123' }
  );
  context._dataActionInputChangeHandler({ type: 'input', target: el });

  assert.equal(received, 'nilai-uji-123');
  assert.equal(toastCalls.length, 0);
});

test('dispatcher input/change #3 — token $checked diteruskan sebagai el.checked', () => {
  let received = null;
  const windowObj = { catatCentang(c) { received = c; } };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement(
    { onchange: 'catatCentang', onchangeArgs: '["$checked"]' },
    { checked: true }
  );
  context._dataActionInputChangeHandler({ type: 'change', target: el });

  assert.equal(received, true);
  assert.equal(toastCalls.length, 0);
});

test('dispatcher input/change #4 — comma-separated function names terpanggil berurutan', () => {
  const order = [];
  const windowObj = {
    fnA() { order.push('A'); },
    fnB() { order.push('B'); },
  };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement({ onchange: 'fnA,fnB' });
  context._dataActionInputChangeHandler({ type: 'change', target: el });

  assert.deepEqual(order, ['A', 'B']);
  assert.equal(toastCalls.length, 0);
});

test('dispatcher input/change #5 — JSON args tidak valid -> silent no-op (bukan throw, bukan toast)', () => {
  let called = false;
  const windowObj = { jangan_terpanggil() { called = true; } };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement({ oninput: 'jangan_terpanggil', oninputArgs: '{ini bukan json valid' });

  assert.doesNotThrow(() => context._dataActionInputChangeHandler({ type: 'input', target: el }));
  assert.equal(called, false, 'fungsi target tidak boleh terpanggil kalau args JSON invalid');
  assert.equal(toastCalls.length, 0, 'tidak boleh ada toast utk JSON args invalid (silent no-op)');
});

test('dispatcher input/change #6 — fungsi target async & reject -> toast "Gagal menjalankan ...: <pesan>"', async () => {
  const windowObj = {
    async testAsyncReject() { throw new Error('boom async input'); },
  };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement({ oninput: 'testAsyncReject' });
  context._dataActionInputChangeHandler({ type: 'input', target: el });

  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(toastCalls.length, 1, 'toast harus terpanggil tepat 1x setelah promise reject');
  assert.match(toastCalls[0], /Gagal menjalankan/);
  assert.match(toastCalls[0], /testAsyncReject/);
  assert.match(toastCalls[0], /boom async input/);
});

test('dispatcher input/change #7 — fungsi target throw sinkron -> toast "Terjadi error saat memproses input"', () => {
  const windowObj = { testSyncThrow() { throw new Error('boom sync input'); } };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement({ onchange: 'testSyncThrow' });
  context._dataActionInputChangeHandler({ type: 'change', target: el });

  assert.equal(toastCalls.length, 1, 'toast harus terpanggil tepat 1x');
  assert.match(toastCalls[0], /Terjadi error saat memproses input/);
});

test('dispatcher input/change #8 — routing input vs change tidak saling tertukar pada elemen yang punya keduanya', () => {
  const order = [];
  const windowObj = {
    onInputFn() { order.push('input-fn'); },
    onChangeFn() { order.push('change-fn'); },
  };
  const { context } = loadSandbox(windowObj);
  const el = makeFakeElement({ oninput: 'onInputFn', onchange: 'onChangeFn' });

  context._dataActionInputChangeHandler({ type: 'input', target: el });
  assert.deepEqual(order, ['input-fn'], 'event input harus panggil data-oninput saja');

  context._dataActionInputChangeHandler({ type: 'change', target: el });
  assert.deepEqual(order, ['input-fn', 'change-fn'], 'event change harus panggil data-onchange saja');
});

test('dispatcher input/change #9 — jalur sukses (fungsi ada, tidak throw) -> tidak ada toast sama sekali', () => {
  const windowObj = { fnSukses() { return 'ok'; } };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement({ oninput: 'fnSukses' });
  context._dataActionInputChangeHandler({ type: 'input', target: el });

  assert.equal(toastCalls.length, 0);
});

// SA1-REKONSTRUKSI (sesi lanjutan) — dispatcher diperluas ke 'blur' &
// 'keydown' utk menutup 3 dari 5 inline handler di luar cakupan audit 92
// (lihat SESSION-NOTE-SA1-REKONSTRUKSI-BASELINE.md "Temuan tambahan").

test('dispatcher blur — data-onblur dgn args statis terpanggil, event input/change TIDAK ikut terpanggil', () => {
  let received = null;
  const order = [];
  const windowObj = {
    evalAmtExpr(id) { received = id; order.push('blur'); },
    onDsExtraInput() { order.push('input'); },
  };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement({ oninput: 'onDsExtraInput', onblur: 'evalAmtExpr', onblurArgs: '["dsExtra"]' });

  context._dataActionInputChangeHandler({ type: 'blur', target: el });
  assert.equal(received, 'dsExtra');
  assert.deepEqual(order, ['blur'], 'event blur harus panggil data-onblur saja, bukan data-oninput');
  assert.equal(toastCalls.length, 0);
});

test('dispatcher keydown — data-onkeydown dgn token $event, kondisi Enter ditangani DI DALAM fungsi target', () => {
  const calls = [];
  const windowObj = {
    chatInputEnterSend(e) { if (e && e.key === 'Enter') calls.push('sent'); },
  };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement({ onkeydown: 'chatInputEnterSend', onkeydownArgs: '["$event"]' });

  context._dataActionInputChangeHandler({ type: 'keydown', key: 'Tab', target: el });
  assert.deepEqual(calls, [], 'tombol selain Enter tidak boleh memicu sendChat');

  context._dataActionInputChangeHandler({ type: 'keydown', key: 'Enter', target: el });
  assert.deepEqual(calls, ['sent']);
  assert.equal(toastCalls.length, 0);
});

test('dispatcher — event.type di luar input/change/blur/keydown diabaikan (tidak throw, tidak ada efek)', () => {
  const windowObj = { seharusnyaTidakTerpanggil() { throw new Error('tidak boleh jalan'); } };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement({ onfocus: 'seharusnyaTidakTerpanggil' });

  assert.doesNotThrow(() => context._dataActionInputChangeHandler({ type: 'focus', target: el }));
  assert.equal(toastCalls.length, 0);
});
