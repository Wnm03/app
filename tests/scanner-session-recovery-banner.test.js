'use strict';
// tests/scanner-session-recovery-banner.test.js — regresi utk tier-3
// (rekomendasi FIX-s362-scannersession-global-watchdog.md): banner recovery
// visual yang muncul otomatis kalau body.scanner-session-active nyangkut
// LEBIH LAMA dari ambang wajar & overlay scanner sungguhan sudah tidak ada
// di DOM — TIDAK bergantung pada class .overlay/.qs-modal-overlay/
// .calc-overlay/#toast (yang justru disembunyikan CSS suppression saat
// state nyangkut), jadi tetap kelihatan user walau watchdog tier-1 belum
// sempat/tidak bisa jalan.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
function readSrc(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

function makeClassList(el) {
  return {
    add(c) { if (!el._classes.includes(c)) el._classes.push(c); },
    remove(c) { el._classes = el._classes.filter((x) => x !== c); },
    contains(c) { return el._classes.includes(c); },
  };
}

function makeEl(id, classes) {
  const el = {
    id, tagName: '', textContent: '', style: { display: '' },
    _classes: classes ? classes.slice() : [], _attrs: {}, parentNode: null, children: [],
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k]; },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    removeChild(child) { this.children = this.children.filter((c) => c !== child); child.parentNode = null; return child; },
  };
  el.classList = makeClassList(el);
  return el;
}

// makeRecoveryCtx(overlayLive, nowRef) — `nowRef` objek { value } yang bisa
// diubah test utk mensimulasikan waktu berjalan (Date.now() di source
// membaca nowRef.value lewat fake Date yang disuntik ke sandbox).
function makeRecoveryCtx(overlayLive, nowRef) {
  const body = makeEl('body');
  const head = makeEl('head');
  const byId = { mainNav: makeEl('mainNav'), mainHeader: makeEl('mainHeader') };
  const intervalCallbacks = [];

  const document = {
    body, head,
    getElementById(id) { return byId[id] || (head.children.find((c) => c.id === id)) || (body.children.find((c) => c.id === id)) || null; },
    createElement(tag) { const el = makeEl(null); el.tagName = tag; return el; },
    querySelector(selector) {
      if (selector === '.vehicle-scanner-fullscreen' && overlayLive.value) return makeEl(null, ['vehicle-scanner-fullscreen']);
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
  };
  const window = {
    addEventListener() {},
    setInterval(fn) { intervalCallbacks.push(fn); return intervalCallbacks.length; },
  };
  const FakeDate = { now: () => nowRef.value };

  const sandbox = Object.assign({ console, document, window, Date: FakeDate });
  const context = vm.createContext(sandbox);
  new vm.Script(readSrc('modules/shared/scanner-session.js'), { filename: 'scanner-session.js' }).runInContext(context);

  return { ctx: context, byId, document, tick: () => intervalCallbacks.forEach((fn) => fn()) };
}

test('banner TIDAK muncul segera setelah enter() (belum lewat ambang waktu)', () => {
  const now = { value: 1000 };
  const overlay = { value: false };
  const { ctx, document, tick } = makeRecoveryCtx(overlay, now);
  ctx.scannerSessionEnter();
  tick(); // tick pertama cuma mencatat enteredAt, belum menilai stuck
  assert.equal(document.getElementById('_scannerSessionRecoveryBanner'), null);
});

test('banner MUNCUL setelah nyangkut > 10 detik DAN overlay scanner sudah tidak live', () => {
  const now = { value: 1000 };
  const overlay = { value: false };
  const { ctx, document, tick } = makeRecoveryCtx(overlay, now);
  ctx.scannerSessionEnter();
  tick(); // catat enteredAt=1000
  now.value += 11000; // lewat ambang 10 detik
  tick();
  const banner = document.getElementById('_scannerSessionRecoveryBanner');
  assert.ok(banner, 'banner harus muncul di DOM');
  assert.match(banner.textContent, /reset/);
});

test('banner TIDAK muncul kalau overlay scanner MASIH live (sesi asli, bukan nyangkut), walau sudah lama', () => {
  const now = { value: 1000 };
  const overlay = { value: true }; // scan beneran masih berlangsung
  const { ctx, document, tick } = makeRecoveryCtx(overlay, now);
  ctx.scannerSessionEnter();
  tick();
  now.value += 30000;
  tick();
  assert.equal(document.getElementById('_scannerSessionRecoveryBanner'), null);
});

test('klik banner memicu self-heal (ScannerSession.isActive() jadi false) & banner hilang dari DOM', () => {
  const now = { value: 1000 };
  const overlay = { value: false };
  const { ctx, document, tick } = makeRecoveryCtx(overlay, now);
  ctx.scannerSessionEnter();
  tick();
  now.value += 11000;
  tick();
  const banner = document.getElementById('_scannerSessionRecoveryBanner');
  assert.ok(banner);
  banner.onclick();
  assert.equal(document.body.classList.contains('scanner-session-active'), false);
  assert.equal(document.getElementById('_scannerSessionRecoveryBanner'), null);
});

test('banner otomatis hilang kalau sesi berakhir normal (exit()) sebelum sempat dianggap stuck', () => {
  const now = { value: 1000 };
  const overlay = { value: true };
  const { ctx, document, tick } = makeRecoveryCtx(overlay, now);
  ctx.scannerSessionEnter();
  tick();
  now.value += 11000;
  overlay.value = false; // overlay teardown normal
  ctx.scannerSessionExit();
  tick();
  assert.equal(document.getElementById('_scannerSessionRecoveryBanner'), null);
});
