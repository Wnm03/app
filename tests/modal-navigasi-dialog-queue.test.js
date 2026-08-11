'use strict';
// tests/modal-navigasi-dialog-queue.test.js — regresi utk bugfix "tombol
// Bayar/Riwayat macet, 0 toast" (laporan user). Sebelum fix, askConfirm()/
// showPromptModal()/dst di modules/shared/modal-navigasi.js cuma punya SATU
// variabel resolver module-scope: kalau fungsi show-nya terpanggil 2x
// sebelum jawaban pertama masuk (mis. double-tap tombol "Bayar"), panggilan
// kedua MENIMPA resolver panggilan pertama -> Promise pertama jadi orphan,
// tidak pernah resolve, tanpa toast/error apa pun. Test ini membuktikan:
// (1) 2 panggilan askConfirm() concurrent SAMA-SAMA resolve (tidak ada yang
//     orphan/hang selamanya), dengan jawaban yang benar utk masing-masing.
// (2) urutan tampil dialog kedua BARU setelah dialog pertama dijawab
//     (antrean, bukan overwrite/serentak).
// Menjalankan file source ASLI (bukan re-implementasi) lewat harness
// loadSource yang sama dipakai test lain di repo ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeOverlay() {
  const classes = new Set();
  return {
    _classes: classes,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    textContent: '',
    className: '',
    style: {},
    value: '',
    _validateFn: null,
    focus() {},
    select() {},
  };
}

function makeFakeDocument(ids) {
  const els = {};
  for (const id of ids) els[id] = makeFakeOverlay();
  return {
    _els: els,
    getElementById(id) {
      if (!els[id]) els[id] = makeFakeOverlay();
      return els[id];
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener() {},
    removeEventListener() {},
  };
}

function loadModalNavigasi() {
  const fakeDoc = makeFakeDocument([
    'confirmModalIcon', 'confirmModalTitle', 'confirmModalMsg', 'confirmModalOk',
    'confirmModalCancel', 'confirmModalOverlay',
    'promptModalOverlay', 'promptModalIcon', 'promptModalTitle', 'promptModalMsg',
    'promptModalInput', 'promptModalError', 'promptModalOkBtn', 'promptModalCancelBtn',
  ]);
  const ctx = loadSource(
    ['modules/shared/modal-navigasi.js'],
    {
      document: fakeDoc,
      // BUGFIX loadSource default: setTimeout di-stub no-op (tidak pernah
      // memanggil callback-nya) -- _resolveDialog() di source butuh
      // setTimeout ASLI supaya dialog berikutnya di antrean benar-benar
      // ditampilkan setelah yang sekarang dijawab.
      setTimeout,
      clearTimeout,
      escapeHtml: (s) => String(s == null ? '' : s),
    },
  );
  return { ctx, fakeDoc };
}

test('askConfirm() — 2 panggilan concurrent (double-tap) SAMA-SAMA resolve, tidak ada yang orphan/hang', async () => {
  const { ctx, fakeDoc } = loadModalNavigasi();

  // Simulasi double-tap: dua askConfirm() dipanggil sebelum jawaban pertama masuk.
  const p1 = ctx.askConfirm('Bayar tagihan A?');
  const p2 = ctx.askConfirm('Bayar tagihan A?'); // panggilan "ganda" dari double-tap

  // Dialog pertama harus langsung tampil (overlay 'open').
  assert.equal(fakeDoc._els.confirmModalOverlay.classList.contains('open'), true);

  // Jawab dialog pertama (tap "Ya").
  ctx._confirmModalAnswer(true);
  const r1 = await p1;
  assert.equal(r1, true, 'panggilan pertama harus resolve dgn jawaban pertama');

  // Beri kesempatan microtask/setTimeout(0) utk menampilkan dialog kedua di antrean.
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(fakeDoc._els.confirmModalOverlay.classList.contains('open'), true,
    'dialog kedua di antrean harus otomatis ditampilkan lagi, BUKAN diam/orphan');

  // Jawab dialog kedua (tap "Batal").
  ctx._confirmModalAnswer(false);
  const r2 = await p2;
  assert.equal(r2, false, 'panggilan kedua (dari double-tap) tetap resolve dgn jawabannya sendiri, TIDAK hilang');
});

test('showPromptModal() — 3 panggilan beruntun semua resolve dgn nilainya masing-masing (tidak ada yang saling menimpa)', async () => {
  const { ctx, fakeDoc } = loadModalNavigasi();
  const input = fakeDoc._els.promptModalInput;

  const p1 = ctx.showPromptModal({ title: 'A' });
  const p2 = ctx.showPromptModal({ title: 'B' });
  const p3 = ctx.showPromptModal({ title: 'C' });

  input.value = 'jawaban-1';
  ctx._promptModalSubmit();
  assert.equal(await p1, 'jawaban-1');

  await new Promise((r) => setTimeout(r, 5));
  input.value = 'jawaban-2';
  ctx._promptModalSubmit();
  assert.equal(await p2, 'jawaban-2');

  await new Promise((r) => setTimeout(r, 5));
  input.value = 'jawaban-3';
  ctx._promptModalSubmit();
  assert.equal(await p3, 'jawaban-3');
});
