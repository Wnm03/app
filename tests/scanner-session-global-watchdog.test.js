'use strict';
// tests/scanner-session-global-watchdog.test.js — regresi utk rekomendasi
// tier-1 (audit lanjutan v1027): watchdog global yang memanggil self-heal
// ScannerSession otomatis saat app kembali terlihat/aktif
// (visibilitychange/pageshow/focus), TANPA bergantung pada titik masuk
// overlay spesifik (openModal()/_queueDialog()/openQS()) sudah dipatch atau
// belum. Lihat catatan lengkap di modules/shared/scanner-session.js, bagian
// "WATCHDOG GLOBAL".
//
// Pola test SAMA PERSIS tests/scanner-session.test.js (fake DOM manual via
// vm.createContext, bukan loadSource.js) karena scanner-session.js baca/
// tulis document.getElementById/classList/style langsung.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function readSrc(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function makeClassList(el) {
  return {
    add(c) { if (!el._classes.includes(c)) el._classes.push(c); },
    remove(c) { el._classes = el._classes.filter((x) => x !== c); },
    contains(c) { return el._classes.includes(c); },
  };
}

function makeEl(id, classes) {
  const el = {
    id,
    tagName: '',
    textContent: '',
    style: { display: '' },
    _classes: classes ? classes.slice() : [],
    _attrs: {},
    parentNode: null,
    children: [],
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k]; },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
  };
  el.classList = makeClassList(el);
  return el;
}

// makeWatchdogCtx() — sama seperti makeCtx() di scanner-session.test.js,
// TAPI document & window di sini punya addEventListener asli (mengumpulkan
// listener per event-type) supaya test bisa memicu 'visibilitychange'/
// 'pageshow'/'focus' secara eksplisit, dan document.visibilityState bisa
// diubah test untuk mensimulasikan tab disembunyikan/ditampilkan lagi.
function makeWatchdogCtx(overlayLive) {
  const body = makeEl('body');
  const head = makeEl('head');
  const byId = { mainNav: makeEl('mainNav'), mainHeader: makeEl('mainHeader') };
  const docListeners = {};
  const winListeners = {};

  const document = {
    body,
    head,
    visibilityState: 'visible',
    getElementById(id) {
      if (id in byId && byId[id]) return byId[id];
      const found = head.children.find((c) => c.id === id) || body.children.find((c) => c.id === id);
      return found || null;
    },
    createElement: (tag) => { const el = makeEl(null); el.tagName = tag; return el; },
    querySelector(selector) {
      if (selector === '.vehicle-scanner-fullscreen' && overlayLive) {
        return makeEl(null, ['vehicle-scanner-fullscreen']);
      }
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(type, fn) {
      (docListeners[type] = docListeners[type] || []).push(fn);
    },
  };

  const window = {
    addEventListener(type, fn) {
      (winListeners[type] = winListeners[type] || []).push(fn);
    },
  };

  const sandbox = Object.assign({ console, document, window });
  const context = vm.createContext(sandbox);
  new vm.Script(readSrc('modules/shared/scanner-session.js'), { filename: 'scanner-session.js' }).runInContext(context);

  return {
    ctx: context, byId, document, window,
    fireDoc(type) { (docListeners[type] || []).forEach((fn) => fn()); },
    fireWin(type) { (winListeners[type] || []).forEach((fn) => fn()); },
  };
}

test('watchdog terdaftar: document.addEventListener("visibilitychange") & window.addEventListener("pageshow"/"focus") dipasang saat modul dimuat', () => {
  const { document, window } = makeWatchdogCtx(true);
  // Tidak throw saat dimuat = listener berhasil didaftarkan (guard typeof
  // lolos, addEventListener beneran terpanggil pada objek fake di atas).
  assert.equal(typeof document.addEventListener, 'function');
  assert.equal(typeof window.addEventListener, 'function');
});

test('visibilitychange ke "visible" memicu self-heal: state nyangkut (overlay scanner sudah lenyap) dibersihkan otomatis TANPA user menyentuh openModal()/dialog apa pun', () => {
  const { ctx, document, window, fireDoc } = makeWatchdogCtx(false); // overlayLive:false -> simulasikan stuck
  ctx.scannerSessionEnter(); // set _scannerSessionActive=true + class body
  assert.ok(document.body.classList.contains('scanner-session-active'));

  document.visibilityState = 'visible';
  fireDoc('visibilitychange');

  assert.equal(window.ScannerSession.isActive(), false);
  assert.ok(!document.body.classList.contains('scanner-session-active'), 'class nyangkut harus terhapus otomatis oleh watchdog');
});

test('visibilitychange ke "hidden" TIDAK memicu self-heal (hanya saat kembali visible, bukan saat disembunyikan)', () => {
  const { ctx, document, window, fireDoc } = makeWatchdogCtx(false);
  ctx.scannerSessionEnter();
  document.visibilityState = 'hidden';
  fireDoc('visibilitychange');
  // Masih dianggap aktif krn belum ada trigger self-heal (visibilityState
  // bukan 'visible') -- flag internal belum direset.
  assert.ok(document.body.classList.contains('scanner-session-active'));
});

test('pageshow (mis. balik dari bfcache setelah app di-minimize) memicu self-heal', () => {
  const { ctx, document, window, fireWin } = makeWatchdogCtx(false);
  ctx.scannerSessionEnter();
  fireWin('pageshow');
  assert.equal(window.ScannerSession.isActive(), false);
  assert.ok(!document.body.classList.contains('scanner-session-active'));
});

test('focus (app kembali ke foreground) memicu self-heal', () => {
  const { ctx, document, window, fireWin } = makeWatchdogCtx(false);
  ctx.scannerSessionEnter();
  fireWin('focus');
  assert.equal(window.ScannerSession.isActive(), false);
  assert.ok(!document.body.classList.contains('scanner-session-active'));
});

test('watchdog TIDAK mengganggu sesi scanner yang BENERAN masih aktif (overlay scanner masih ada di DOM)', () => {
  const { ctx, document, window, fireDoc, fireWin } = makeWatchdogCtx(true); // overlayLive:true -> sesi asli, bukan stuck
  ctx.scannerSessionEnter();
  document.visibilityState = 'visible';
  fireDoc('visibilitychange');
  fireWin('pageshow');
  fireWin('focus');
  assert.equal(window.ScannerSession.isActive(), true, 'sesi scanner yang sungguhan aktif tidak boleh ke-reset oleh watchdog');
  assert.ok(document.body.classList.contains('scanner-session-active'));
});

test('guard: modul tidak error kalau document/window tidak punya addEventListener (browser/lingkungan lama)', () => {
  const byId = { mainNav: makeEl('mainNav'), mainHeader: makeEl('mainHeader') };
  const body = makeEl('body');
  const head = makeEl('head');
  const document = {
    body, head,
    getElementById: (id) => byId[id] || null,
    createElement: (tag) => { const el = makeEl(null); el.tagName = tag; return el; },
    // sengaja TIDAK ada addEventListener sama sekali
  };
  const sandbox = Object.assign({ console, document, window: {} }); // window tanpa addEventListener juga
  const context = vm.createContext(sandbox);
  assert.doesNotThrow(() => {
    new vm.Script(readSrc('modules/shared/scanner-session.js'), { filename: 'scanner-session.js' }).runInContext(context);
  });
});
