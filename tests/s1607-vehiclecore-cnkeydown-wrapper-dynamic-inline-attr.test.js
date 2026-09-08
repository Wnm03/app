'use strict';
// tests/s1607-vehiclecore-cnkeydown-wrapper-dynamic-inline-attr.test.js
// Sesi s1607 -- penutup epic migrasi "atribut event inline yang di-generate
// dinamis" (docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md, rekomendasi #3,
// lanjutan SA11-SA18/s1603/s1604/s1604b/s1605/s1606).
//
// File terakhir dari 9 hasil audit ulang s1605 yang sengaja ditunda (bukan
// swap-atribut murni): modules/vehicle/vehicle-core.js -- #cnCurKmInput
// onkeydown BUKAN pemanggilan fungsi bernama sama sekali, melainkan
// ekspresi kondisional inline (Enter -> blur, Escape -> tandai batal lalu
// blur), pakai `this` utk elemen input. Ditambahkan fungsi named baru
// `_vehCnCurKmKeydown(e)` yang membungkus logic yang SAMA PERSIS (cuma
// `this` -> `e.target`, elemen yang sama, didapat dari event yang dikirim
// dispatcher lewat data-onkeydown-args='["$event"]') -- pola identik dengan
// `chatInputEnterSend(e)` untuk #chatInput yang sudah ada di ai-chat.js.
//
// Sama seperti sesi-sesi sebelumnya: gate statis (atribut inline lama
// hilang, pola baru persis sesuai) + fungsional end-to-end lewat dispatcher
// ASLI (_dataActionResolveArgs/_dataActionInputChangeHandler, diekstrak dari
// source, tidak diubah lagi sesi ini) + unit test langsung ke wrapper baru
// utk semua cabang (Enter/Escape/tombol lain).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function readSrc(relFile) {
  return fs.readFileSync(path.join(__dirname, '..', relFile), 'utf8');
}

// ---- Lapis A: gate literal (pola inline lama harus hilang, pola baru harus ada) ----

const SRC_VEH = readSrc('modules/vehicle/vehicle-core.js');

test('s1607 gate: #cnCurKmInput sudah pakai data-onkeydown + args $event, atribut inline lama hilang', () => {
  assert.ok(SRC_VEH.includes(`id="cnCurKmInput"`));
  // string HTML ini dibangun di dalam literal JS ber-tanda-kutip-tunggal, jadi
  // tanda kutip tunggal di dalam atribut data-onkeydown-args di-escape (\') di
  // source -- browser/JS engine akan meng-unescape-nya jadi ' biasa saat string
  // literal dievaluasi, hasil akhirnya persis data-onkeydown-args='["$event"]'.
  assert.ok(SRC_VEH.includes(`data-onkeydown="_vehCnCurKmKeydown" data-onkeydown-args=\\'["$event"]\\'`));
  assert.ok(!SRC_VEH.includes(`onkeydown="if(event.key`));
  assert.ok(!SRC_VEH.includes(`this.blur()`));
  assert.ok(!SRC_VEH.includes(`this.dataset.cancel`));
});

test('s1607 gate: data-action="vehCnCurKmInputStop" (migrasi sesi sebelumnya) tetap ada, tidak tersentuh', () => {
  assert.ok(SRC_VEH.includes(`data-action="vehCnCurKmInputStop"`));
});

test('s1607 gate: wrapper _vehCnCurKmKeydown(e) ada sbg fungsi named top-level (bukan dotted, tidak perlu window-expose)', () => {
  assert.match(SRC_VEH, /function _vehCnCurKmKeydown\(e\)\s*\{/);
});

test('s1607 gate: _vehCnCurKmKeydown memakai e.target (bukan this) utk Enter & Escape', () => {
  const m = SRC_VEH.match(/function _vehCnCurKmKeydown\(e\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, '_vehCnCurKmKeydown body tidak ditemukan');
  const body = m[1];
  assert.ok(body.includes(`e.key==='Enter'`));
  assert.ok(body.includes(`e.key==='Escape'`));
  assert.ok(body.includes('e.target.blur()'));
  assert.ok(body.includes(`e.target.dataset.cancel='1'`));
  assert.ok(!body.includes('this.'));
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

function makeChangeDispatcher(windowObj) {
  const context = { console, window: windowObj, document: { querySelectorAll: () => [] }, toast: () => {} };
  vm.createContext(context);
  const snippet = `${extractFnSource('_dataActionResolveArgs')}\n${extractFnSource('_dataActionInputChangeHandler')}\nthis._dataActionInputChangeHandler = _dataActionInputChangeHandler;`;
  vm.runInContext(snippet, context, { filename: 's1607-change-dispatcher-extract.js' });
  return context._dataActionInputChangeHandler;
}

function makeFakeKeydownEl(dataset) {
  const el = { dataset: Object.assign({}, dataset) };
  el.closest = () => el;
  return el;
}

test('s1607 end-to-end (keydown): _vehCnCurKmKeydown dataset persis hasil migrasi -> terpanggil dgn $event asli', () => {
  const calls = [];
  const stub = { _vehCnCurKmKeydown: (...args) => calls.push(args) };
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeKeydownEl({ onkeydown: '_vehCnCurKmKeydown', onkeydownArgs: JSON.stringify(['$event']) });
  const evt = { type: 'keydown', target: el, key: 'Enter' };
  dispatchChange(evt);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], evt);
});

test('s1607 end-to-end (keydown): fungsi tidak ditemukan -> error tercatat, tidak throw', () => {
  const stub = {};
  const dispatchChange = makeChangeDispatcher(stub);
  const el = makeFakeKeydownEl({ onkeydown: '_vehCnCurKmKeydownTypo', onkeydownArgs: JSON.stringify(['$event']) });
  const origError = console.error;
  console.error = () => {};
  try {
    assert.doesNotThrow(() => dispatchChange({ type: 'keydown', target: el, key: 'Enter' }));
  } finally {
    console.error = origError;
  }
});

// ---- Lapis C: unit test langsung ke wrapper _vehCnCurKmKeydown (semua cabang) ----

function loadWrapper() {
  const m = SRC_VEH.match(/function _vehCnCurKmKeydown\(e\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, '_vehCnCurKmKeydown tidak ditemukan di source utk dimuat ke sandbox');
  const context = { console };
  vm.createContext(context);
  vm.runInContext(`${m[0]}\nthis._vehCnCurKmKeydown = _vehCnCurKmKeydown;`, context, { filename: 's1607-wrapper-extract.js' });
  return context._vehCnCurKmKeydown;
}

test('s1607 unit: Enter -> memanggil blur() pada e.target, TIDAK menyentuh dataset.cancel', () => {
  const fn = loadWrapper();
  let blurCalls = 0;
  const target = { dataset: {}, blur: () => { blurCalls++; } };
  fn({ key: 'Enter', target });
  assert.equal(blurCalls, 1);
  assert.equal(target.dataset.cancel, undefined);
});

test('s1607 unit: Escape -> set dataset.cancel="1" lalu memanggil blur() pada e.target', () => {
  const fn = loadWrapper();
  const order = [];
  const target = {
    dataset: {},
    blur: () => order.push('blur'),
  };
  Object.defineProperty(target.dataset, 'cancel', {
    set(v) { order.push('cancel=' + v); },
    get() { return order.includes('cancel=1') ? '1' : undefined; },
    configurable: true,
  });
  fn({ key: 'Escape', target });
  assert.deepEqual(order, ['cancel=1', 'blur']);
});

test('s1607 unit: tombol lain (mis. huruf biasa) -> tidak memanggil blur() sama sekali, tidak error', () => {
  const fn = loadWrapper();
  let blurCalls = 0;
  const target = { dataset: {}, blur: () => { blurCalls++; } };
  assert.doesNotThrow(() => fn({ key: 'a', target }));
  assert.equal(blurCalls, 0);
  assert.equal(target.dataset.cancel, undefined);
});

test('s1607 unit: perilaku identik dgn ekspresi inline asli utk ketiga kasus (Enter/Escape/lainnya) -- tabel kebenaran', () => {
  const fn = loadWrapper();
  function legacyInlineBehavior(key) {
    // ekspresi inline asli, "this" diganti objek target lokal utk perbandingan
    const target = { dataset: {}, blurCount: 0, blur() { this.blurCount++; } };
    if (key === 'Enter') { target.blur(); }
    else if (key === 'Escape') { target.dataset.cancel = '1'; target.blur(); }
    return { blurCount: target.blurCount, cancel: target.dataset.cancel };
  }
  function wrapperBehavior(key) {
    const target = { dataset: {}, blurCount: 0, blur() { this.blurCount++; } };
    fn({ key, target });
    return { blurCount: target.blurCount, cancel: target.dataset.cancel };
  }
  for (const key of ['Enter', 'Escape', 'Tab', 'a', undefined]) {
    assert.deepEqual(wrapperBehavior(key), legacyInlineBehavior(key), `mismatch utk key=${key}`);
  }
});
