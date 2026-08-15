'use strict';
// tests/session04b-dana-titipan-pool-ui-modal.test.js — SESSION 4 (UI
// POOL), BAGIAN 2/2 — MASTER_HANDOFF_DANA_TITIPAN_POOL_PORSI.md §13.4
// (modal Set Saldo Awal / Tambah Deposit) + §19 (acceptance criteria UI).
//
// Target: `DanaTitipanPoolUI.openSetSaldoAwal()`/`.openTambahDeposit()`/
// `.save()` (modules/finance/dana-titipan-portfolio-render.js), dijalankan
// bareng SOURCE ASLI `dana-titipan-pool-api.js` (Sesi 1/2, TIDAK diubah di
// sini) lewat loadSource — 0 re-implementasi logic API di sini.
//
// TIDAK di-test di sini (di luar scope Bagian 2 / harness Node):
//   - Drift-lint MODAL_HTML[] vs document.write(MODAL_HTML[N]) di
//     index.html/app_production.html — itu dicek scripts/build.js sendiri
//     (dijalankan manual sbg bagian test Bagian 2, lihat SESSION-NOTES).
//   - Rendering visual modal sesungguhnya (browser/DOM nyata) — harness
//     ini cuma stub document.getElementById permisif (lihat helper).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDocument() {
  const elements = new Map();
  function makeEl(id) {
    const el = { id, value: '', textContent: '', style: {} };
    return el;
  }
  return {
    _elements: elements,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeEl(id));
      return elements.get(id);
    },
  };
}

function makeContext() {
  const D = { titipanPool: [] };
  const calls = { toast: [], openModal: [], closeModal: [], render: 0, renderInto: [] };
  const doc = makeFakeDocument();
  const context = loadSource(
    ['modules/finance/dana-titipan-pool-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    {
      D,
      save: () => {},
      uid: (() => { let n = 0; return () => 'test-uid-' + (++n); })(),
      todayStr: () => '2026-08-15',
      document: doc,
      toast: (msg) => { calls.toast.push(msg); },
      openModal: (id) => { calls.openModal.push(id); },
      closeModal: (id) => { calls.closeModal.push(id); },
      DanaTitipanPortfolioPresenter: {
        render: () => { calls.render++; },
        renderInto: (containerId) => { calls.renderInto.push(containerId); },
      },
    },
    ['DanaTitipanPoolUI', 'DanaTitipanPoolAPI']
  );
  return { context, D, calls, doc };
}

test('openSetSaldoAwal() set mode opening_balance, judul benar, buka modal, reset form', () => {
  const { context, calls, doc } = makeContext();
  doc.getElementById('titipanPoolAmt').value = '999';
  doc.getElementById('titipanPoolNotes').value = 'sisa lama';
  context.DanaTitipanPoolUI.openSetSaldoAwal();
  assert.equal(context.DanaTitipanPoolUI._mode, 'opening_balance');
  assert.equal(doc.getElementById('titipanPoolModalTitle').textContent, '💰 Set Saldo Awal Dana Titipan');
  assert.deepEqual(calls.openModal, ['titipanPoolModal']);
  assert.equal(doc.getElementById('titipanPoolAmt').value, '');
  assert.equal(doc.getElementById('titipanPoolNotes').value, '');
  assert.equal(doc.getElementById('titipanPoolDate').value, '2026-08-15');
});

test('openTambahDeposit() set mode deposit, judul benar, buka modal', () => {
  const { context, calls, doc } = makeContext();
  context.DanaTitipanPoolUI.openTambahDeposit();
  assert.equal(context.DanaTitipanPoolUI._mode, 'deposit');
  assert.equal(doc.getElementById('titipanPoolModalTitle').textContent, '➕ Tambah Deposit Dana Titipan');
  assert.deepEqual(calls.openModal, ['titipanPoolModal']);
});

test('save() mode opening_balance memanggil DanaTitipanPoolAPI.addOpeningBalance() dgn field form, tutup modal, toast sukses', () => {
  // CATATAN: `DanaTitipanPortfolioPresenter` yang dipanggil di dalam
  // save() (utk re-render) adalah objek NYATA yang didefinisikan sendiri
  // di dana-titipan-portfolio-render.js (const top-level meng-shadow
  // stub yang di-inject lewat extraGlobals -- perilaku vm.Script
  // runInContext yang sudah diketahui, lihat komentar loadSource.js).
  // Test ini karena itu TIDAK menghitung panggilan render()/renderInto()
  // (itu re-render dashboard, sudah tercakup test session04a lain), fokus
  // ke: entry tersimpan benar ke D.titipanPool, modal tertutup, toast
  // sukses muncul -- 3 hal yang jadi tanggung jawab save() itu sendiri.
  const { context, D, calls, doc } = makeContext();
  context.DanaTitipanPoolUI.openSetSaldoAwal();
  doc.getElementById('titipanPoolAmt').value = '10000000';
  doc.getElementById('titipanPoolDate').value = '2026-01-01';
  doc.getElementById('titipanPoolNotes').value = 'saldo awal';
  context.DanaTitipanPoolUI.save();
  assert.equal(D.titipanPool.length, 1);
  assert.equal(D.titipanPool[0].type, 'opening_balance');
  assert.equal(D.titipanPool[0].amount, 10000000);
  assert.equal(D.titipanPool[0].notes, 'saldo awal');
  assert.deepEqual(calls.closeModal, ['titipanPoolModal']);
  assert.ok(calls.toast.some((m) => m.includes('Saldo awal dana titipan tersimpan')));
});

test('save() mode deposit memanggil DanaTitipanPoolAPI.addDeposit() dgn type benar', () => {
  const { context, D, calls } = makeContext();
  context.DanaTitipanPoolUI.openTambahDeposit();
  document_setValue(context, 'titipanPoolAmt', '2500000');
  context.DanaTitipanPoolUI.save();
  assert.equal(D.titipanPool.length, 1);
  assert.equal(D.titipanPool[0].type, 'deposit');
  assert.equal(D.titipanPool[0].amount, 2500000);
  assert.ok(calls.toast.some((m) => m.includes('Deposit dana titipan tersimpan')));
});

test('save() nominal invalid (negatif) -> toast error, TIDAK menambah entry, modal TIDAK ditutup', () => {
  const { context, D, calls } = makeContext();
  context.DanaTitipanPoolUI.openSetSaldoAwal();
  document_setValue(context, 'titipanPoolAmt', '-500');
  context.DanaTitipanPoolUI.save();
  assert.equal(D.titipanPool.length, 0);
  assert.equal(calls.closeModal.length, 0);
  assert.ok(calls.toast.some((m) => m.startsWith('⚠️')));
});

test('save() guard: DanaTitipanPoolAPI belum dimuat -> toast peringatan, tidak crash, tidak menyentuh D', () => {
  const D = { titipanPool: [] };
  const calls = { toast: [] };
  const doc = makeFakeDocument();
  const context = loadSource(
    ['modules/finance/dana-titipan-portfolio-render.js'],
    {
      D,
      document: doc,
      toast: (msg) => { calls.toast.push(msg); },
      openModal: () => {},
      closeModal: () => {},
    },
    ['DanaTitipanPoolUI']
  );
  context.DanaTitipanPoolUI.openSetSaldoAwal();
  document_setValue(context, 'titipanPoolAmt', '1000');
  assert.doesNotThrow(() => context.DanaTitipanPoolUI.save());
  assert.equal(D.titipanPool.length, 0);
  assert.ok(calls.toast.some((m) => m.includes('belum siap dimuat')));
});

// helper kecil dipakai beberapa test di atas -- set value elemen form via
// context yang sama (elemen sudah dibuat lazy oleh makeFakeDocument saat
// pertama diakses lewat open*()).
function document_setValue(context, id, value) {
  const el = context.document.getElementById(id);
  el.value = value;
}
