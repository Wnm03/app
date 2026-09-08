'use strict';
// tests/sa16-dashboard-settings-dynamic-inline-attr.test.js — SA16, lanjutan
// SA11-SA15 (lihat SESSION-NOTE-SA16-dashboard-settings-dynamic-inline-attr.md),
// bagian dari epic migrasi "123 atribut event inline yang di-generate dinamis
// di modules/*.js" (docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md, rekomendasi #3).
// SA11-SA15 sudah tuntas (67 titik). Sesi ini: "dashboard settings", 4 file,
// 17 titik total:
//
//   - modules/shared/modules-render.js (9 titik)
//   - modules/shop/modules-render.js (3 titik)
//   - modules/modules-render.js (3 titik)
//   - modules/dashboard-hub/dashboard-hub-settings.js (2 titik)
//
// Pola migrasi (2 varian di sesi ini, beda dari SA11-SA15):
//   1. onclick="setAllDashCardPrefs(true|false)" (literal boolean, 0 token)
//      -> data-action="setAllDashCardPrefs" data-args='[true|false]'
//   2. onchange="toggleDashCardPref('${key}',this.checked)"
//      -> data-onchange="toggleDashCardPref" data-onchange-args='["${key}","$checked"]'
//   3. onchange="_dashCashProjSetXxx()" (0 argumen, fungsi baca DOM sendiri
//      lewat getElementById) -> data-onchange="_dashCashProjSetXxx" (TANPA
//      atribut data-onchange-args sama sekali -- dispatcher default ke [])
//   4. onclick="DashboardSettings.reorderCard('${key}','up'|'down')"
//      -> data-action="DashboardSettings.reorderCard" data-args='["${key}","up"|"down"]'
//
// 2 lapis (pola sama SA11-SA15):
//   A. Gate statis permanen -- 0 kemunculan onclick=/onchange=/dst (bukan
//      data-*) di keempat file.
//   B. Fungsional end-to-end -- dispatcher ASLI (_dataActionClickHandler utk
//      klik, _dataActionInputChangeHandler utk change, keduanya diekstrak
//      dari modules/shared/features-helpers-global-security.js, TIDAK
//      diubah lagi sesi ini) benar-benar memanggil fungsi target dengan
//      argumen yang tepat -- termasuk varian 0-arg (poin 3) yang belum
//      pernah diuji pola ini di SA11-SA15 (semua sesi itu selalu >=1 arg).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILES = [
  'modules/shared/modules-render.js',
  'modules/shop/modules-render.js',
  'modules/modules-render.js',
  'modules/dashboard-hub/dashboard-hub-settings.js',
];

const INLINE_RE = /(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)=\"/g;

for (const relPath of FILES) {
  const SRC_PATH = path.join(__dirname, '..', relPath);
  const SRC = fs.readFileSync(SRC_PATH, 'utf8');

  test(`SA16 gate: 0 atribut event inline tersisa di ${relPath}`, () => {
    const matches = SRC.match(INLINE_RE) || [];
    assert.deepEqual(matches, []);
  });
}

test('SA16 gate sanity: regex di atas memang mendeteksi pola asli & tidak salah tangkap data-onchange=/data-action=', () => {
  const positiveOnclick = 'onclick="Foo.bar(1)"';
  const positiveOnchange = 'onchange="Foo.baz(this.checked)"';
  const negativeDataAction = 'data-action="Foo.bar"';
  const negativeDataOnchange = 'data-onchange="Foo.baz"';
  assert.equal((positiveOnclick.match(INLINE_RE) || []).length, 1);
  assert.equal((positiveOnchange.match(INLINE_RE) || []).length, 1);
  assert.equal((negativeDataAction.match(INLINE_RE) || []).length, 0);
  assert.equal((negativeDataOnchange.match(INLINE_RE) || []).length, 0);
});

// ---- Gate literal per titik ----

const DASH_PREFS_FILES = [
  'modules/shared/modules-render.js',
  'modules/shop/modules-render.js',
  'modules/modules-render.js',
];
for (const relPath of DASH_PREFS_FILES) {
  const SRC = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  test(`SA16 gate: setAllDashCardPrefs(true/false) data-action + data-args tersedia di ${relPath}`, () => {
    assert.ok(SRC.includes(`data-action="setAllDashCardPrefs" data-args='[true]'`));
    assert.ok(SRC.includes(`data-action="setAllDashCardPrefs" data-args='[false]'`));
  });
  test(`SA16 gate: toggleDashCardPref data-onchange + data-onchange-args (key literal + $checked) tersedia di ${relPath}`, () => {
    assert.ok(SRC.includes('data-onchange="toggleDashCardPref" data-onchange-args=\'["${c.key}","$checked"]\''));
  });
}

const SRC_SHARED_RENDER = fs.readFileSync(path.join(__dirname, '..', 'modules/shared/modules-render.js'), 'utf8');
for (const fn of [
  '_dashCashProjSetCycleDay', '_dashCashProjSetKirimanVal', '_dashCashProjSetIncludeKiriman',
  '_dashCashProjSetIncludePendingGaji', '_dashCashProjSetSurplusMonths', '_dashCashProjSetPolaAbsenWeeks',
]) {
  test(`SA16 gate: ${fn} data-onchange (0 argumen, tanpa data-onchange-args) tersedia di modules/shared/modules-render.js`, () => {
    assert.ok(SRC_SHARED_RENDER.includes(`data-onchange="${fn}">`));
  });
}

const SRC_DASH_SETTINGS = fs.readFileSync(path.join(__dirname, '..', 'modules/dashboard-hub/dashboard-hub-settings.js'), 'utf8');
test('SA16 gate: DashboardSettings.reorderCard(key,"up") data-action + data-args tersedia', () => {
  assert.ok(SRC_DASH_SETTINGS.includes('data-action="DashboardSettings.reorderCard" data-args=\'["${key}","up"]\''));
});
test('SA16 gate: DashboardSettings.reorderCard(key,"down") data-action + data-args tersedia', () => {
  assert.ok(SRC_DASH_SETTINGS.includes('data-action="DashboardSettings.reorderCard" data-args=\'["${key}","down"]\''));
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

function makeClickDispatcher(windowObj) {
  const context = { console, window: windowObj, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dataActionClickHandler')}\nthis._dataActionClickHandler = _dataActionClickHandler;`;
  vm.runInContext(snippet, context, { filename: 'sa16-click-dispatcher-extract.js' });
  return context._dataActionClickHandler;
}

function makeChangeDispatcher(windowObj) {
  const context = { console, window: windowObj, document: { querySelectorAll: () => [] }, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dataActionResolveArgs')}\n${extractFnSource('_dataActionInputChangeHandler')}\nthis._dataActionInputChangeHandler = _dataActionInputChangeHandler;`;
  vm.runInContext(snippet, context, { filename: 'sa16-change-dispatcher-extract.js' });
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

test('SA16 end-to-end (click): setAllDashCardPrefs(true) dataset persis hasil migrasi -> terpanggil dgn true', () => {
  const calls = [];
  const stub = { setAllDashCardPrefs: (...args) => calls.push(args) };
  const dispatchClick = makeClickDispatcher(stub);
  const el = makeFakeClickEl({ action: 'setAllDashCardPrefs', args: '[true]' });
  dispatchClick({ target: el });
  assert.deepEqual(calls, [[true]]);
});

test('SA16 end-to-end (click): setAllDashCardPrefs(false) dataset persis hasil migrasi -> terpanggil dgn false', () => {
  const calls = [];
  const stub = { setAllDashCardPrefs: (...args) => calls.push(args) };
  const dispatchClick = makeClickDispatcher(stub);
  const el = makeFakeClickEl({ action: 'setAllDashCardPrefs', args: '[false]' });
  dispatchClick({ target: el });
  assert.deepEqual(calls, [[false]]);
});

test('SA16 end-to-end (change): toggleDashCardPref dataset persis hasil migrasi (key literal + $checked) -> terpanggil dgn (key, checked)', () => {
  const calls = [];
  const stub = { toggleDashCardPref: (...args) => calls.push(args) };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeChangeEl({ onchange: 'toggleDashCardPref', onchangeArgs: JSON.stringify(['pensiun', '$checked']) });
  el.checked = true;
  dispatchChange({ type: 'change', target: el });
  assert.deepEqual(calls, [['pensiun', true]]);
});

for (const fn of [
  '_dashCashProjSetCycleDay', '_dashCashProjSetKirimanVal', '_dashCashProjSetIncludeKiriman',
  '_dashCashProjSetIncludePendingGaji', '_dashCashProjSetSurplusMonths', '_dashCashProjSetPolaAbsenWeeks',
]) {
  test(`SA16 end-to-end (change, 0 argumen): ${fn} dataset tanpa data-onchange-args -> tetap terpanggil (args kosong)`, () => {
    const calls = [];
    const stub = { [fn]: (...args) => calls.push(args) };
    const dispatchChange = makeChangeDispatcher(stub);
    // Persis hasil migrasi: TIDAK ada atribut data-onchange-args sama sekali
    // di source (lihat gate literal di atas) -- dataset.onchangeArgs undefined.
    const el = makeFakeChangeEl({ onchange: fn });
    dispatchChange({ type: 'change', target: el });
    assert.deepEqual(calls, [[]]);
  });
}

test('SA16 end-to-end (click): DashboardSettings.reorderCard(key,"up") dataset persis hasil migrasi -> terpanggil dgn (key,"up")', () => {
  const calls = [];
  const stub = { DashboardSettings: { reorderCard: (...args) => calls.push(args) } };
  const dispatchClick = makeClickDispatcher(stub);
  const el = makeFakeClickEl({ action: 'DashboardSettings.reorderCard', args: JSON.stringify(['refleksi', 'up']) });
  dispatchClick({ target: el });
  assert.deepEqual(calls, [['refleksi', 'up']]);
});

test('SA16 end-to-end (click): DashboardSettings.reorderCard(key,"down") dataset persis hasil migrasi -> terpanggil dgn (key,"down")', () => {
  const calls = [];
  const stub = { DashboardSettings: { reorderCard: (...args) => calls.push(args) } };
  const dispatchClick = makeClickDispatcher(stub);
  const el = makeFakeClickEl({ action: 'DashboardSettings.reorderCard', args: JSON.stringify(['absensi', 'down']) });
  dispatchClick({ target: el });
  assert.deepEqual(calls, [['absensi', 'down']]);
});
