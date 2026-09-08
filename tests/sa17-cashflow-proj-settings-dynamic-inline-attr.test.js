'use strict';
// tests/sa17-cashflow-proj-settings-dynamic-inline-attr.test.js — SA17,
// lanjutan SA11-SA16 (lihat SESSION-NOTE-SA17-cashflow-proj-settings-dynamic-inline-attr.md),
// bagian dari epic migrasi "123 atribut event inline yang di-generate dinamis
// di modules/*.js" (docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md, rekomendasi #3).
// SA11-SA16 sudah tuntas (84 dari 123 titik audit). Rencana SA17 (dicatat di
// SESSION-NOTE-SA16, tabel "Next TODO") menyebut 4 file/8 titik:
// `modules/finance/cashflow-projection-presenter.js`, `tx-bbm.js`,
// `cicilan.js`, `tx-stok-sparepart.js`.
//
// **Audit ulang sesi ini** (dicek satu-satu isi ke-4 file, bukan cuma
// percaya angka di tabel — sama seperti peringatan yang sudah dicatat di
// CLAUDE.md "cek ulang daftar ini ... jangan cuma percaya daftar tercatat"):
// regex audit S1588 murni tekstual (`on(click|change|...)="`), TIDAK
// membedakan kode asli dari KOMENTAR yang kebetulan menyebut pola lama
// (mis. `// pakai oninput="syncCicilanPreview()"`, dokumentasi yang
// menjelaskan pemanggil di modals.js). Hasil audit ulang:
//   - `cashflow-projection-presenter.js`: 4 kemunculan regex, TAPI cuma 3
//     yang kode ASLI (dalam `_fillSettingsPanel()`) — 1 sisanya (baris
//     komentar "pola sama dgn onchange=\"resetTxPageAndRender()\"") adalah
//     teks dokumentasi, bukan atribut HTML yang di-generate.
//   - `tx-bbm.js` (2), `cicilan.js` (1), `tx-stok-sparepart.js` (1): SEMUA
//     4 kemunculan ini adalah KOMENTAR yang menjelaskan pemanggil ASLI di
//     `modules/shared/modals.js` (mis. "dipanggil dari onchange=\"...\" di
//     txBbmVehicle (modals.js)") — bukan kode yang mereka generate sendiri.
//     Ketiga file ini murni fungsi logic (tidak membangun string HTML apa
//     pun), jadi TIDAK ADA titik migrasi nyata di dalamnya.
//
// Migrasi nyata sesi ini HANYA 3 titik, semuanya di
// `cashflow-projection-presenter.js._fillSettingsPanel()`, semuanya pola
// "0 argumen" (fungsi baca DOM sendiri lewat getElementById, sama seperti
// varian ke-3 SA16 -- `_onMonthsChange`/`_onAccChange`/`_onCycleDayChange`):
//   onchange="CashFlowProjectionPresenter._onMonthsChange()"
//     -> data-onchange="CashFlowProjectionPresenter._onMonthsChange"
//   onchange="CashFlowProjectionPresenter._onAccChange()"
//     -> data-onchange="CashFlowProjectionPresenter._onAccChange"
//   onchange="CashFlowProjectionPresenter._onCycleDayChange()"
//     -> data-onchange="CashFlowProjectionPresenter._onCycleDayChange"
//
// 2 lapis (pola sama SA11-SA16):
//   A. Gate statis permanen -- 0 kemunculan onclick=/onchange=/dst (bukan
//      data-*) di KODE `_fillSettingsPanel()` (gate literal per titik,
//      bukan gate file-wide seperti SA11-SA16 -- file ini SENGAJA masih
//      py 1 baris komentar lama yang menyebut pola `onchange="..."`,
//      dipertahankan apa adanya karena itu teks dokumentasi valid soal
//      keuFilterPanel, bukan soal titik yang dimigrasi sesi ini).
//   B. Fungsional end-to-end -- dispatcher ASLI (_dataActionResolveArgs +
//      _dataActionInputChangeHandler, diekstrak dari
//      modules/shared/features-helpers-global-security.js, TIDAK diubah
//      lagi sesi ini) benar-benar memanggil ketiga fungsi target tanpa
//      argumen (dataset TANPA data-onchange-args sama sekali, persis pola
//      "0 argumen" SA16).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PRESENTER_PATH = path.join(__dirname, '..', 'modules', 'finance', 'cashflow-projection-presenter.js');
const PRESENTER_SRC = fs.readFileSync(PRESENTER_PATH, 'utf8');

const INLINE_RE = /(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)=\"/g;

// ---- Lapis A: gate literal per titik (bukan gate file-wide, lihat komentar
// header di atas soal 1 baris komentar lama yang sengaja dipertahankan) ----

test('SA17 gate: 0 atribut event inline tersisa di dalam _fillSettingsPanel() (cashflow-projection-presenter.js)', () => {
  const start = PRESENTER_SRC.indexOf('_fillSettingsPanel(panel) {');
  assert.ok(start !== -1, '_fillSettingsPanel tidak ditemukan');
  const end = PRESENTER_SRC.indexOf('\n  },', start);
  const body = PRESENTER_SRC.slice(start, end === -1 ? undefined : end);
  const matches = body.match(INLINE_RE) || [];
  assert.deepEqual(matches, []);
});

test('SA17 gate sanity: regex di atas memang mendeteksi pola asli & tidak salah tangkap data-onchange=', () => {
  const positive = 'onchange="Foo.bar()"';
  const negative = 'data-onchange="Foo.bar"';
  assert.equal((positive.match(INLINE_RE) || []).length, 1);
  assert.equal((negative.match(INLINE_RE) || []).length, 0);
});

test('SA17 gate: _onMonthsChange data-onchange (0 argumen, tanpa data-onchange-args) tersedia', () => {
  assert.ok(PRESENTER_SRC.includes('data-onchange="CashFlowProjectionPresenter._onMonthsChange">'));
});

test('SA17 gate: _onAccChange data-onchange (0 argumen, tanpa data-onchange-args) tersedia', () => {
  assert.ok(PRESENTER_SRC.includes('data-onchange="CashFlowProjectionPresenter._onAccChange">'));
});

test('SA17 gate: _onCycleDayChange data-onchange (0 argumen, tanpa data-onchange-args) tersedia', () => {
  assert.ok(PRESENTER_SRC.includes('data-onchange="CashFlowProjectionPresenter._onCycleDayChange">'));
});

test('SA17 audit ulang: tx-bbm.js/cicilan.js/tx-stok-sparepart.js — kemunculan on*=" di file cuma di dalam komentar (0 titik migrasi nyata)', () => {
  const FILES = [
    'modules/finance/tx-bbm.js',
    'modules/finance/cicilan.js',
    'modules/finance/tx-stok-sparepart.js',
  ];
  for (const relPath of FILES) {
    const src = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, idx) => {
      const matches = line.match(INLINE_RE);
      if (!matches) return;
      const trimmed = line.trim();
      assert.ok(
        trimmed.startsWith('//'),
        `${relPath}:${idx + 1} — ditemukan atribut event inline di LUAR komentar (butuh migrasi nyata, bukan cuma dokumentasi): ${trimmed}`,
      );
    });
  }
});

// ---- Lapis B: dispatcher asli end-to-end ----

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
  vm.runInContext(snippet, context, { filename: 'sa17-change-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeChangeEl(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = () => el;
  return el;
}

for (const fn of ['_onMonthsChange', '_onAccChange', '_onCycleDayChange']) {
  test(`SA17 end-to-end (change, 0 argumen): CashFlowProjectionPresenter.${fn} dataset tanpa data-onchange-args -> tetap terpanggil (args kosong)`, () => {
    const calls = [];
    const stub = { CashFlowProjectionPresenter: { [fn]: (...args) => calls.push(args) } };
    const dispatchChange = makeChangeDispatcher(stub);
    // Persis hasil migrasi: TIDAK ada atribut data-onchange-args sama sekali
    // di source (lihat gate literal di atas) -- dataset.onchangeArgs undefined.
    const el = makeFakeChangeEl({ onchange: `CashFlowProjectionPresenter.${fn}` });
    dispatchChange({ type: 'change', target: el });
    assert.deepEqual(calls, [[]]);
  });
}
