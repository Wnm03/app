'use strict';
// tests/data-action-dispatcher-toast.test.js — mengunci permanen behavior toast
// "tombol tidak berfungsi" di dispatcher klik pusat (_dataActionClickHandler,
// modules/shared/features-helpers-global-security.js). Fungsi ini sudah
// menangani 3 skenario tombol gagal (hasil 2 bugfix sebelumnya: "tombol scan
// 0 toast" dan "tombol Bayar/Riwayat macet, 0 toast"), tapi belum ada test
// yang mengunci behavior-nya -- kalau file ini direfactor nanti (mis. migrasi
// split file), toast bisa diam-diam hilang lagi tanpa ketahuan, persis pola
// regresi S326->S328 di tombol Bayar. Test ini menjalankan fungsi ASLI (bukan
// re-implementasi) lewat brace-counting manual, pola sama seperti
// tests/s303-utang-custom-pay-amount.test.js / tests/s285-bill-lunas-tanggal-
// bayar.test.js.
//
// 3 skenario yang dikunci:
//   1. data-action menunjuk fungsi yang TIDAK ADA -> toast "Tombol ini belum
//      berfungsi (...)"
//   2. fungsi target THROW SINKRON -> toast "Terjadi error saat memproses
//      tombol. Cek console."
//   3. fungsi target ASYNC & REJECT -> toast "Gagal menjalankan ...: <pesan>"

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
// _dataActionClickHandler (dataset, closest()).
function makeFakeElement(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = () => el;
  return el;
}

function loadSandbox(windowObj) {
  const toastCalls = [];
  const context = {
    console,
    toast: (msg) => { toastCalls.push(msg); },
    window: windowObj,
  };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dataActionClickHandler')}
this._dataActionClickHandler = _dataActionClickHandler;`;
  vm.runInContext(snippet, context, { filename: 'dispatcher-toast-extract.js' });
  return { context, toastCalls };
}

test('dispatcher: extractFnSource berhasil menemukan _dataActionClickHandler di source asli', () => {
  assert.doesNotThrow(() => extractFnSource('_dataActionClickHandler'));
});

test('dispatcher toast #1 — data-action menunjuk fungsi yang tidak ada -> toast "belum berfungsi"', () => {
  const { context, toastCalls } = loadSandbox({});
  const el = makeFakeElement({ action: 'TidakAda.metodeApa' });
  context._dataActionClickHandler({ target: el });

  assert.equal(toastCalls.length, 1, 'toast harus terpanggil tepat 1x');
  assert.match(toastCalls[0], /belum berfungsi/i);
  assert.match(toastCalls[0], /TidakAda\.metodeApa/);
});

test('dispatcher toast #2 — fungsi target throw sinkron -> toast "Terjadi error saat memproses tombol"', () => {
  const windowObj = {
    testSyncThrow() { throw new Error('boom sync'); },
  };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement({ action: 'testSyncThrow' });
  context._dataActionClickHandler({ target: el });

  assert.equal(toastCalls.length, 1, 'toast harus terpanggil tepat 1x');
  assert.match(toastCalls[0], /Terjadi error saat memproses tombol/);
});

test('dispatcher toast #3 — fungsi target async & reject -> toast "Gagal menjalankan ...: <pesan>"', async () => {
  const windowObj = {
    async testAsyncReject() { throw new Error('boom async'); },
  };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement({ action: 'testAsyncReject' });
  context._dataActionClickHandler({ target: el });

  // Handler tidak nge-await promise-nya (fire-and-forget + .catch), jadi
  // toast baru muncul setelah microtask queue jalan.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(toastCalls.length, 1, 'toast harus terpanggil tepat 1x setelah promise reject');
  assert.match(toastCalls[0], /Gagal menjalankan/);
  assert.match(toastCalls[0], /testAsyncReject/);
  assert.match(toastCalls[0], /boom async/);
  // Guard double-tap (dataset.pendingAction) harus dilepas lagi setelah selesai.
  assert.equal(el.dataset.pendingAction, undefined);
});

test('dispatcher toast #3b — guard double-tap: klik ulang SAAT masih pending diabaikan (tidak toast ganda)', async () => {
  let resolveFn;
  const windowObj = {
    testAsyncPending() { return new Promise((resolve) => { resolveFn = resolve; }); },
  };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement({ action: 'testAsyncPending' });

  context._dataActionClickHandler({ target: el }); // klik 1 -> mulai pending
  assert.equal(el.dataset.pendingAction, '1');
  context._dataActionClickHandler({ target: el }); // klik 2 (double-tap) -> diabaikan

  resolveFn();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(toastCalls.length, 0, 'tidak boleh ada toast error utk pemanggilan normal yang cuma di-double-tap');
  assert.equal(el.dataset.pendingAction, undefined);
});

test('dispatcher toast — fungsi target berhasil normal -> TIDAK ada toast error sama sekali', () => {
  const windowObj = {
    testOk() { return 'sukses'; },
  };
  const { context, toastCalls } = loadSandbox(windowObj);
  const el = makeFakeElement({ action: 'testOk' });
  context._dataActionClickHandler({ target: el });

  assert.deepEqual(toastCalls, [], 'fungsi yang sukses tidak boleh memicu toast apa pun');
});
