'use strict';
// tests/s1605-budget-scanocr-titipan-autokat-tukang-cobek-carnotes-dynamic-inline-attr.test.js
// Sesi s1605 (SESI 1 dari 2 sesi yang direncanakan) — lanjutan epic migrasi
// "atribut event inline yang di-generate dinamis" (docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md,
// rekomendasi #3, lanjutan SA11-SA18/s1603/s1604/s1604b).
//
// Audit ulang repo-wide (grep regex non-data- on(click|change|input|blur|keydown|...)="
// di semua *.js, dikurangi baris komentar) menemukan 9 file dgn titik nyata yang belum
// pernah termigrasi. Sesi ini (s1605) menuntaskan 7 dari 9 file -- titik-titik yang
// murni SWAP ATRIBUT (0 perubahan logic, fungsi target tidak disentuh sama sekali):
//
//   1. budget.js -- 3 titik (checkbox "Total Pengeluaran" butuh $el, 2x child-toggle 0-arg)
//   2. modules/shared/scan-ocr-b.js -- 3 titik (nama/nominal/target akun scan universal)
//   3. modules/finance/titipan-expense-ui.js -- 3 titik (split mode, porsi input, toggle owner)
//   4. modules/ai/kategorisasi-ai.js -- 2 titik (tombol saran AI "Pakai"/"Abaikan") +
//      window.AutoKat=AutoKat BARU (AutoKat sebelumnya cuma `const` top-level, TIDAK pernah
//      di-window-expose -- dispatcher data-action resolve lewat window[X][method], tanpa
//      baris ini kedua tombol gagal DIAM-DIAM persis bug class s345-s348, lihat
//      scripts/verify-window-expose.js)
//   5. modules/business/tukang-absensi.js -- 1 titik (checkbox borongan bersama, 0-arg)
//   6. modules/shop/cobek-order.js -- 1 titik (updateOrderItemHarga, titik ke-2, BEDA dari
//      selectShopCustomer yang sudah difix di s1603)
//   7. car-notes.js -- 1 titik (Torsi.updateBiaya, key string arbitrer -> literal lewat
//      escapeHtml(JSON.stringify([key,'$value'])), pola sama Penyusutan.updateParam SA18a)
//
// DITUNDA ke sesi 2 (TIDAK dikerjakan sesi ini, sesuai keputusan pemilik project --
// blast radius kecil per patch): modules/asset/aset-emas-impor.js (onblur rangkap 2
// pemanggilan fungsi, perlu wrapper baru) & modules/vehicle/vehicle-core.js (onkeydown
// Enter/Escape BUKAN pemanggilan fungsi bernama, perlu fungsi named baru dulu) -- keduanya
// beda kelas risiko (bukan swap atribut murni), sengaja dipisah dari patch ini.
//
// Sama seperti SA11-SA18/s1603-s1604b: gate statis (0 atribut inline tersisa + literal
// pattern persis) + fungsional end-to-end lewat dispatcher ASLI (_dataActionClickHandler /
// _dataActionInputChangeHandler, diekstrak dari source, tidak diubah lagi sesi ini).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function readSrc(relFile) {
  return fs.readFileSync(path.join(__dirname, '..', relFile), 'utf8');
}

// ---- Lapis A: gate literal per titik (pola lama harus hilang, pola baru harus ada) ----

const SRC_BUDGET = readSrc('budget.js');
test('s1605 gate: onBudgetCatTotalToggle data-onchange + $el tersedia di budget.js', () => {
  assert.ok(SRC_BUDGET.includes(`data-onchange="onBudgetCatTotalToggle" data-onchange-args='["$el"]'`));
  assert.ok(!SRC_BUDGET.includes('onchange="onBudgetCatTotalToggle('));
});
test('s1605 gate: onBudgetCatChildToggle (0-arg, 2 titik) data-onchange tersedia di budget.js', () => {
  const matches = SRC_BUDGET.match(/data-onchange="onBudgetCatChildToggle"/g) || [];
  assert.equal(matches.length, 2);
  assert.ok(!SRC_BUDGET.includes('onchange="onBudgetCatChildToggle('));
});

const SRC_SCANOCRB = readSrc('modules/shared/scan-ocr-b.js');
test('s1605 gate: UniversalScan.updateItemField (nama) data-onchange tersedia di scan-ocr-b.js', () => {
  assert.ok(SRC_SCANOCRB.includes(`data-onchange="UniversalScan.updateItemField" data-onchange-args='[${'${i}'},"nama","$value"]'`));
});
test('s1605 gate: UniversalScan.updateItemField (nominal) data-onchange tersedia di scan-ocr-b.js', () => {
  assert.ok(SRC_SCANOCRB.includes(`data-onchange="UniversalScan.updateItemField" data-onchange-args='[${'${i}'},"nominal","$value"]'`));
});
test('s1605 gate: UniversalScan.setTarget data-onchange tersedia di scan-ocr-b.js', () => {
  assert.ok(SRC_SCANOCRB.includes(`data-onchange="UniversalScan.setTarget" data-onchange-args='[${'${i}'},"$value"]'`));
  assert.ok(!SRC_SCANOCRB.includes('onchange="UniversalScan.setTarget('));
  assert.ok(!SRC_SCANOCRB.includes(`onchange="UniversalScan.updateItemField(`));
});

const SRC_TITIPAN = readSrc('modules/finance/titipan-expense-ui.js');
test('s1605 gate: TitipanExpenseUI.onSplitModeChange data-onchange tersedia', () => {
  assert.ok(SRC_TITIPAN.includes(`data-onchange="TitipanExpenseUI.onSplitModeChange" data-onchange-args='["$value"]'`));
  assert.ok(!SRC_TITIPAN.includes('onchange="TitipanExpenseUI.onSplitModeChange('));
});
test('s1605 gate: TitipanExpenseUI.onPorsiInput data-oninput tersedia', () => {
  assert.ok(SRC_TITIPAN.includes(`data-oninput="TitipanExpenseUI.onPorsiInput" data-oninput-args='[${'${i}'},"$value"]'`));
  assert.ok(!SRC_TITIPAN.includes('oninput="TitipanExpenseUI.onPorsiInput('));
});
test('s1605 gate: TitipanExpenseUI.toggleOwner data-onchange + $checked tersedia', () => {
  assert.ok(SRC_TITIPAN.includes(`data-onchange="TitipanExpenseUI.toggleOwner" data-onchange-args='[${'${i}'},"$checked"]'`));
  assert.ok(!SRC_TITIPAN.includes('onchange="TitipanExpenseUI.toggleOwner('));
});

const SRC_AUTOKAT = readSrc('modules/ai/kategorisasi-ai.js');
test('s1605 gate: AutoKat.apply / AutoKat.hideSuggest data-action tersedia di kategorisasi-ai.js', () => {
  assert.ok(SRC_AUTOKAT.includes('data-action="AutoKat.apply"'));
  assert.ok(SRC_AUTOKAT.includes('data-action="AutoKat.hideSuggest"'));
  assert.ok(!SRC_AUTOKAT.includes('onclick="AutoKat.apply()"'));
  assert.ok(!SRC_AUTOKAT.includes('onclick="AutoKat.hideSuggest()"'));
});
test('s1605 gate: window.AutoKat=AutoKat ditambahkan (bug class s345-s348)', () => {
  assert.match(SRC_AUTOKAT, /window(?:\.AutoKat|\['AutoKat'\]|\["AutoKat"\])\s*=\s*AutoKat\b/);
});
test('s1605 gate: verify-window-expose.js tidak lagi melaporkan AutoKat sebagai gagal', () => {
  const { verify } = require('../scripts/verify-window-expose.js');
  const result = verify();
  const failedNames = result.failures.map((f) => f.name);
  assert.ok(!failedNames.includes('AutoKat'), `AutoKat masih gagal window-expose: ${JSON.stringify(result.failures)}`);
});

const SRC_TUKANG = readSrc('modules/business/tukang-absensi.js');
test('s1605 gate: Tukang.calcSharedBorongan (0-arg) data-onchange tersedia di tukang-absensi.js', () => {
  assert.ok(SRC_TUKANG.includes('data-onchange="Tukang.calcSharedBorongan"'));
  assert.ok(!SRC_TUKANG.includes('onchange="Tukang.calcSharedBorongan()"'));
});

const SRC_COBEKORDER = readSrc('modules/shop/cobek-order.js');
test('s1605 gate: updateOrderItemHarga data-oninput tersedia di cobek-order.js (titik ke-2, beda dari s1603)', () => {
  assert.ok(SRC_COBEKORDER.includes(`data-oninput="updateOrderItemHarga" data-oninput-args='[${'${i}'},"$value"]'`));
  assert.ok(!SRC_COBEKORDER.includes('oninput="updateOrderItemHarga('));
});

const SRC_CARNOTES = readSrc('car-notes.js');
test('s1605 gate: Torsi.updateBiaya data-oninput (key literal via escapeHtml(JSON.stringify)) tersedia di car-notes.js', () => {
  assert.ok(SRC_CARNOTES.includes(`data-oninput="Torsi.updateBiaya" data-oninput-args='${'${escapeHtml(JSON.stringify([key,\'$value\']))}'}'`));
  assert.ok(!SRC_CARNOTES.includes("oninput=\"Torsi.updateBiaya("));
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

function makeClickDispatcher(windowObj) {
  const context = { console, window: windowObj, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dataActionClickHandler')}\nthis._dataActionClickHandler = _dataActionClickHandler;`;
  vm.runInContext(snippet, context, { filename: 's1605-click-dispatcher-extract.js' });
  return context._dataActionClickHandler;
}

function makeChangeDispatcher(windowObj) {
  const context = { console, window: windowObj, document: { querySelectorAll: () => [] }, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dataActionResolveArgs')}\n${extractFnSource('_dataActionInputChangeHandler')}\nthis._dataActionInputChangeHandler = _dataActionInputChangeHandler;`;
  vm.runInContext(snippet, context, { filename: 's1605-change-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeClickEl(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = (sel) => (sel === '[data-action]' ? (el.dataset.action ? el : null) : null);
  return el;
}

function makeFakeChangeEl(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = () => el;
  return el;
}

test('s1605 end-to-end (click): AutoKat.apply dataset persis hasil migrasi -> terpanggil 0-arg', () => {
  const calls = [];
  const stub = { AutoKat: { apply: (...args) => calls.push(args) } };
  const dispatchClick = makeClickDispatcher(stub);
  const el = makeFakeClickEl({ action: 'AutoKat.apply' });
  dispatchClick({ target: el });
  assert.deepEqual(calls, [[]]);
});

test('s1605 end-to-end (click): AutoKat.hideSuggest dataset persis hasil migrasi -> terpanggil 0-arg', () => {
  const calls = [];
  const stub = { AutoKat: { hideSuggest: (...args) => calls.push(args) } };
  const dispatchClick = makeClickDispatcher(stub);
  const el = makeFakeClickEl({ action: 'AutoKat.hideSuggest' });
  dispatchClick({ target: el });
  assert.deepEqual(calls, [[]]);
});

test('s1605 end-to-end (change): onBudgetCatTotalToggle($el) dataset persis hasil migrasi -> terpanggil dgn elemenAsli', () => {
  const calls = [];
  const stub = { onBudgetCatTotalToggle: (...args) => calls.push(args) };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ onchange: 'onBudgetCatTotalToggle', onchangeArgs: JSON.stringify(['$el']) });
  dispatchChange({ type: 'change', target: el });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], el);
});

test('s1605 end-to-end (change): onBudgetCatChildToggle (0-arg) dataset persis hasil migrasi -> terpanggil tanpa args', () => {
  const calls = [];
  const stub = { onBudgetCatChildToggle: (...args) => calls.push(args) };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ onchange: 'onBudgetCatChildToggle' });
  dispatchChange({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});

test('s1605 end-to-end (change): UniversalScan.updateItemField(i,field,$value) dataset persis hasil migrasi', () => {
  const calls = [];
  const stub = { UniversalScan: { updateItemField: (...args) => calls.push(args) } };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ onchange: 'UniversalScan.updateItemField', onchangeArgs: JSON.stringify([2, 'nominal', '$value']) });
  el.value = '150000';
  dispatchChange({ type: 'change', target: el });
  assert.deepEqual(calls, [[2, 'nominal', '150000']]);
});

test('s1605 end-to-end (change): UniversalScan.setTarget(i,$value) dataset persis hasil migrasi', () => {
  const calls = [];
  const stub = { UniversalScan: { setTarget: (...args) => calls.push(args) } };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ onchange: 'UniversalScan.setTarget', onchangeArgs: JSON.stringify([1, '$value']) });
  el.value = 'acc_kas';
  dispatchChange({ type: 'change', target: el });
  assert.deepEqual(calls, [[1, 'acc_kas']]);
});

test('s1605 end-to-end (change): TitipanExpenseUI.onSplitModeChange($value) dataset persis hasil migrasi', () => {
  const calls = [];
  const stub = { TitipanExpenseUI: { onSplitModeChange: (...args) => calls.push(args) } };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ onchange: 'TitipanExpenseUI.onSplitModeChange', onchangeArgs: JSON.stringify(['$value']) });
  el.value = 'manual';
  dispatchChange({ type: 'change', target: el });
  assert.deepEqual(calls, [['manual']]);
});

test('s1605 end-to-end (input): TitipanExpenseUI.onPorsiInput(i,$value) dataset persis hasil migrasi', () => {
  const calls = [];
  const stub = { TitipanExpenseUI: { onPorsiInput: (...args) => calls.push(args) } };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ oninput: 'TitipanExpenseUI.onPorsiInput', oninputArgs: JSON.stringify([1, '$value']) });
  el.value = '60';
  dispatchChange({ type: 'input', target: el });
  assert.deepEqual(calls, [[1, '60']]);
});

test('s1605 end-to-end (change): TitipanExpenseUI.toggleOwner(i,$checked) dataset persis hasil migrasi -> $checked, BUKAN $value', () => {
  const calls = [];
  const stub = { TitipanExpenseUI: { toggleOwner: (...args) => calls.push(args) } };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ onchange: 'TitipanExpenseUI.toggleOwner', onchangeArgs: JSON.stringify([0, '$checked']) });
  el.checked = true;
  dispatchChange({ type: 'change', target: el });
  assert.deepEqual(calls, [[0, true]]);
});

test('s1605 end-to-end (change): Tukang.calcSharedBorongan (0-arg) dataset persis hasil migrasi -> terpanggil tanpa args', () => {
  const calls = [];
  const stub = { Tukang: { calcSharedBorongan: (...args) => calls.push(args) } };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ onchange: 'Tukang.calcSharedBorongan' });
  dispatchChange({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});

test('s1605 end-to-end (input): updateOrderItemHarga(i,$value) dataset persis hasil migrasi', () => {
  const calls = [];
  const stub = { updateOrderItemHarga: (...args) => calls.push(args) };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ oninput: 'updateOrderItemHarga', oninputArgs: JSON.stringify([3, '$value']) });
  el.value = '12000';
  dispatchChange({ type: 'input', target: el });
  assert.deepEqual(calls, [[3, '12000']]);
});

test('s1605 end-to-end (input): Torsi.updateBiaya(key,$value) dataset persis hasil migrasi, key string arbitrer (kutip) aman', () => {
  const calls = [];
  const stub = { Torsi: { updateBiaya: (...args) => calls.push(args) } };
  const dispatchChange = makeChangeDispatcher(stub);
  const key = "kampas rem 'depan'";
  const el = makeFakeChangeEl({ oninput: 'Torsi.updateBiaya', oninputArgs: JSON.stringify([key, '$value']) });
  el.value = '30000';
  dispatchChange({ type: 'input', target: el });
  assert.deepEqual(calls, [[key, '30000']]);
});
