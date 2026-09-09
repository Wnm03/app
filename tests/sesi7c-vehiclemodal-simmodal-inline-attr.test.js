'use strict';
// tests/sesi7c-vehiclemodal-simmodal-inline-attr.test.js —
// Sesi 7c, lanjutan PATCH-SESI1..SESI6 + Sesi 7a (debtModal+piutangModal) +
// Sesi 7b (accModal). Sesi ini menutup vehicleModal + simModal
// (modules/shared/modals.js) — 4 elemen, 4 atribut inline:
//   #vehOwnFilter (onchange, 0 arg)
//   #vehJenis     (onchange, 0 arg)
//   #vehNilai     (onblur, 1 panggilan/event, BUTUH args)
//   #simJenis     (onchange, 0 arg)
//
// Sama seperti Sesi 7a/7b: tiap elemen di sesi ini cuma 1 panggilan
// fungsi/event, jadi TIDAK perlu wrapper baru di JS manapun — dispatcher
// generik (_dataActionInputChangeHandler) langsung memanggil nama fungsi
// lewat data-onX + data-onX-args. renderVehicleManageList(), onVehJenisChange(),
// dan onSimJenisChange() sudah berupa fungsi global biasa (modules-render*.js /
// modules/vehicle/vehicle-core.js) sehingga tidak ada masalah window-expose
// spt Debt di Sesi 7a.
//
// Field lain di vehicleModal (vehName, vehEmoji, vehKmAwal, vehOwnership,
// vehAssetId, dll) sudah pakai data-action / tanpa event inline sejak awal —
// tidak disentuh sesi ini. Konten dinamis vehJenisFieldsWrap &
// simJenisFieldsWrap (dirender via innerHTML dari vehicle-core.js) sudah
// diperiksa — tidak ada atribut event inline di dalamnya (hanya value=""
// biasa), jadi tidak masuk cakupan sesi ini.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const MODALS_SRC = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');

// ---- Lapis A: gate literal (markup) ----

const gates = [
  { id: 'vehOwnFilter', attr: 'data-onchange=\\"renderVehicleManageList\\"' },
  { id: 'vehJenis', attr: 'data-onchange=\\"onVehJenisChange\\"' },
  { id: 'vehNilai', attr: `data-onblur=\\"evalAmtExpr\\" data-onblur-args='[\\"vehNilai\\"]'` },
  { id: 'simJenis', attr: 'data-onchange=\\"onSimJenisChange\\"' },
];

for (const { id, attr } of gates) {
  test(`sesi7c gate: #${id} markup mengandung ${attr.slice(0, 60)}...`, () => {
    const marker = `id=\\"${id}\\"`;
    assert.ok(MODALS_SRC.includes(marker), `#${id} harus ada di modals.js`);
    const idx = MODALS_SRC.indexOf(marker);
    const snippet = MODALS_SRC.slice(idx, idx + 400);
    assert.ok(snippet.includes(attr), `#${id} harus mengandung: ${attr}\nSNIPPET: ${snippet}`);
  });
}

test('sesi7c gate: 0 oninput/onchange/onblur inline lama tersisa utk 4 elemen vehicleModal+simModal', () => {
  const ids = ['vehOwnFilter', 'vehJenis', 'vehNilai', 'simJenis'];
  for (const id of ids) {
    const marker = `id=\\"${id}\\"`;
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
  vm.runInContext(snippet, context, { filename: 'sesi7c-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeEl(dataset, value) {
  const el = { dataset: Object.assign({}, dataset), value };
  el.closest = () => el;
  return el;
}

test('sesi7c end-to-end (onchange, tanpa wrapper): #vehOwnFilter -> renderVehicleManageList() lewat dispatcher', () => {
  const calls = [];
  const stub = { renderVehicleManageList: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onchange: 'renderVehicleManageList' });
  dispatch({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi7c end-to-end (onchange, tanpa wrapper): #vehJenis -> onVehJenisChange() lewat dispatcher', () => {
  const calls = [];
  const stub = { onVehJenisChange: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onchange: 'onVehJenisChange' });
  dispatch({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});

test('sesi7c end-to-end (onblur DENGAN args): #vehNilai -> evalAmtExpr("vehNilai") lewat dispatcher', () => {
  const calls = [];
  const stub = { evalAmtExpr: (...args) => calls.push(['evalAmtExpr', ...args]) };
  const dispatch = makeDispatcher(stub);
  dispatch({ type: 'blur', target: makeFakeEl({ onblur: 'evalAmtExpr', onblurArgs: '["vehNilai"]' }, '1000000') });
  assert.deepEqual(calls, [
    ['evalAmtExpr', 'vehNilai'],
  ]);
});

test('sesi7c end-to-end (onchange, tanpa wrapper): #simJenis -> onSimJenisChange() lewat dispatcher', () => {
  const calls = [];
  const stub = { onSimJenisChange: (...args) => calls.push(args) };
  const dispatch = makeDispatcher(stub);
  const el = makeFakeEl({ onchange: 'onSimJenisChange' });
  dispatch({ type: 'change', target: el });
  assert.deepEqual(calls, [[]]);
});
