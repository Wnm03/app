'use strict';
/**
 * boot-early.test.js — Regresi utk modules/shared/boot-early.js (SA10a,
 * v1568), blok 1-3/4. Blok 4/4 (controllerchange anti-flash) SUDAH dikunci
 * di tests/boot-pin-idempotent.test.js sejak SA10b (fallback baca file ini
 * kalau tidak ketemu inline di HTML) -- tidak diulang di sini.
 *
 * Sebelum SA10c, blok 1-3 di file ini TIDAK PUNYA test permanen sama sekali
 * (cuma diverifikasi manual/tidak sempat diverifikasi saat SA10a). Test ini
 * mengunci perilakunya lewat vm sandbox, murni dari SUMBER file (bukan
 * re-implementasi manual), supaya regresi di masa depan langsung ketahuan.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'modules', 'shared', 'boot-early.js'), 'utf8');

function makeFakeEl(tag) {
  const el = {
    tagName: tag,
    style: {},
    _attrs: {},
    _children: [],
    _removed: false,
    setAttribute(k, v) { this._attrs[k] = v; },
    appendChild(child) { this._children.push(child); },
    remove() { this._removed = true; },
  };
  return el;
}

function loadBootEarly({ locationSearch = '', debugStorage = {} } = {}) {
  const store = Object.assign({}, debugStorage);
  const headAppended = [];
  const bodyAppended = [];
  const consoleErrors = [];
  const listeners = {};
  const createdScripts = [];

  const sandbox = {};
  sandbox.window = sandbox; // window===global context, lazim di kode ini (browser-style)
  sandbox.console = { error: (...args) => consoleErrors.push(args) };
  sandbox.location = { search: locationSearch };
  sandbox.URLSearchParams = URLSearchParams;
  sandbox.setTimeout = setTimeout;
  sandbox.clearTimeout = clearTimeout;
  sandbox.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
  sandbox.document = {
    createElement(tag) {
      const el = makeFakeEl(tag);
      if (tag === 'script') createdScripts.push(el);
      return el;
    },
    head: { appendChild: (el) => headAppended.push(el) },
    body: { appendChild: (el) => bodyAppended.push(el) },
    documentElement: {},
  };
  sandbox.navigator = {}; // sengaja TANPA serviceWorker -> blok 4 return dini, tidak throw
  sandbox.sessionStorage = { getItem: () => null, setItem() {} };
  sandbox.addEventListener = (evt, cb) => { listeners[evt] = cb; };

  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'boot-early.js' });

  return { sandbox, store, headAppended, bodyAppended, consoleErrors, listeners, createdScripts };
}

// ---------------------------------------------------------------------------
// Blok 1/4 — Debug console (Eruda)
// ---------------------------------------------------------------------------
test('?debug=1 -> localStorage kw_debug_console diset "1" & script eruda disuntik ke head', () => {
  const { store, headAppended } = loadBootEarly({ locationSearch: '?debug=1' });
  assert.equal(store.kw_debug_console, '1');
  assert.equal(headAppended.length, 1);
  assert.match(headAppended[0].src, /eruda/);
});

test('?debug=0 -> localStorage kw_debug_console dihapus, tidak ada script disuntik', () => {
  const { store, headAppended } = loadBootEarly({ locationSearch: '?debug=0', debugStorage: { kw_debug_console: '1' } });
  assert.equal(store.kw_debug_console, undefined);
  assert.equal(headAppended.length, 0);
});

test('tanpa param ?debug tapi kw_debug_console sudah "1" dari sesi sebelumnya -> script tetap disuntik', () => {
  const { headAppended } = loadBootEarly({ locationSearch: '', debugStorage: { kw_debug_console: '1' } });
  assert.equal(headAppended.length, 1);
});

test('tanpa param ?debug & belum pernah diaktifkan -> tidak ada script disuntik', () => {
  const { headAppended } = loadBootEarly({ locationSearch: '' });
  assert.equal(headAppended.length, 0);
});

// ---------------------------------------------------------------------------
// Blok 2/4 — _loadScriptOnce() & ensure*() lazy-load helpers
// ---------------------------------------------------------------------------
test('_loadScriptOnce(): dipanggil 2x dgn src sama SEBELUM resolve -> promise ke-2 sama persis (cache), cuma 1 elemen <script> dibuat', () => {
  const { sandbox, createdScripts } = loadBootEarly();
  const p1 = sandbox._loadScriptOnce('https://example.com/a.js');
  const p2 = sandbox._loadScriptOnce('https://example.com/a.js');
  assert.equal(p1, p2);
  assert.equal(createdScripts.length, 1);
  createdScripts[0].onload(); // bereskan promise supaya tidak nyangkut/timeout di test lain
});

test('_loadScriptOnce(): onload sukses di percobaan pertama -> resolve, tanpa retry', async () => {
  const { sandbox, createdScripts } = loadBootEarly();
  const p = sandbox._loadScriptOnce('https://example.com/b.js');
  assert.equal(createdScripts.length, 1);
  createdScripts[0].onload();
  await assert.doesNotReject(p);
  assert.equal(createdScripts.length, 1, 'tidak seharusnya ada percobaan ke-2 kalau yg pertama sukses');
});

test('_loadScriptOnce(): gagal di percobaan pertama -> retry otomatis 1x dgn cache-buster _retry=, retry sukses -> resolve', async () => {
  const { sandbox, createdScripts } = loadBootEarly();
  const p = sandbox._loadScriptOnce('https://example.com/c.js');
  assert.equal(createdScripts.length, 1);
  createdScripts[0].onerror(); // percobaan pertama gagal
  assert.equal(createdScripts.length, 2, 'harus ada 1 elemen <script> baru utk retry');
  assert.match(createdScripts[1].src, /_retry=\d+/);
  createdScripts[1].onload(); // retry sukses
  await assert.doesNotReject(p);
});

test('_loadScriptOnce(): gagal di percobaan pertama DAN retry -> reject dgn pesan "Gagal memuat ..."', async () => {
  const { sandbox, createdScripts } = loadBootEarly();
  const p = sandbox._loadScriptOnce('https://example.com/d.js');
  createdScripts[0].onerror(); // gagal pertama -> trigger retry
  createdScripts[1].onerror(); // retry juga gagal
  await assert.rejects(p, /Gagal memuat https:\/\/example\.com\/d\.js/);
});

test('_loadScriptOnce(): src cache dihapus setelah gagal total, panggilan berikutnya coba lagi dari awal (bukan promise gagal yg di-cache)', async () => {
  const { sandbox, createdScripts } = loadBootEarly();
  const src = 'https://example.com/e.js';
  const p1 = sandbox._loadScriptOnce(src);
  createdScripts[0].onerror();
  createdScripts[1].onerror();
  await assert.rejects(p1);

  const p2 = sandbox._loadScriptOnce(src);
  assert.notEqual(p1, p2, 'panggilan setelah gagal total seharusnya bikin percobaan baru, bukan promise gagal lama');
  assert.equal(createdScripts.length, 3);
  createdScripts[2].onload();
  await assert.doesNotReject(p2);
});

test('ensureTesseract/ensureJsPDF/ensureHtml2Canvas/ensureGoogleGSI/ensureXLSX/ensureZXing terdefinisi & masing2 pakai URL CDN yang benar', () => {
  const { sandbox, createdScripts } = loadBootEarly();
  const cases = [
    ['ensureTesseract', /tesseract/],
    ['ensureJsPDF', /jspdf/],
    ['ensureHtml2Canvas', /html2canvas/],
    ['ensureGoogleGSI', /accounts\.google\.com\/gsi\/client/],
    ['ensureXLSX', /xlsx/],
    ['ensureZXing', /zxing/],
  ];
  for (const [fnName, urlRe] of cases) {
    assert.equal(typeof sandbox[fnName], 'function', `${fnName} harus terdefinisi sbg fungsi`);
    sandbox[fnName]();
    const lastScript = createdScripts[createdScripts.length - 1];
    assert.match(lastScript.src, urlRe, `${fnName}() harus load URL yg cocok ${urlRe}`);
    lastScript.onload();
  }
});

// ---------------------------------------------------------------------------
// Blok 3/4 — __moduleLoadFail & runtime error banner
// ---------------------------------------------------------------------------
test('window.__moduleLoadFail(name): menampilkan banner ke body berisi nama file, dgn tombol tutup yg menghapus banner', () => {
  const { sandbox, bodyAppended } = loadBootEarly();
  sandbox.__moduleLoadFail('app-bundle-a.min.js');
  assert.equal(bodyAppended.length, 1);
  const banner = bodyAppended[0];
  assert.equal(banner._attrs['data-module-fail-banner'], '1');
  assert.match(banner.textContent, /app-bundle-a\.min\.js/);
  assert.match(banner.textContent, /gagal dimuat/);

  const closeBtn = banner._children[0];
  closeBtn.onclick();
  assert.equal(banner._removed, true);
});

test('window.__showRuntimeErrorBanner(msg): banner cuma tampil SEKALI walau dipanggil berkali-kali (guard __runtimeErrorBannerShown)', () => {
  const { sandbox, bodyAppended } = loadBootEarly();
  sandbox.__showRuntimeErrorBanner('error pertama');
  sandbox.__showRuntimeErrorBanner('error kedua');
  sandbox.__showRuntimeErrorBanner('error ketiga');
  assert.equal(bodyAppended.length, 1, 'seharusnya cuma 1 banner walau dipanggil 3x (anti-spam)');
  assert.match(bodyAppended[0].textContent, /error pertama/);
});

test("listener window 'error' global -> log console.error & panggil __showRuntimeErrorBanner dgn pesan+lokasi", () => {
  const { listeners, consoleErrors, bodyAppended } = loadBootEarly();
  assert.equal(typeof listeners.error, 'function', "listener 'error' harus ter-register");
  listeners.error({ message: 'Boom meledak', filename: 'app-bootstrap.js', lineno: 42, error: new Error('x') });
  assert.equal(consoleErrors.length, 1);
  assert.equal(bodyAppended.length, 1);
  assert.match(bodyAppended[0].textContent, /Boom meledak/);
  assert.match(bodyAppended[0].textContent, /app-bootstrap\.js:42/);
});

test("listener window 'unhandledrejection' -> log console.error & panggil __showRuntimeErrorBanner dgn pesan reject", () => {
  const { listeners, consoleErrors, bodyAppended } = loadBootEarly();
  assert.equal(typeof listeners.unhandledrejection, 'function', "listener 'unhandledrejection' harus ter-register");
  listeners.unhandledrejection({ reason: new Error('Promise ditolak diam-diam') });
  assert.equal(consoleErrors.length, 1);
  assert.equal(bodyAppended.length, 1);
  assert.match(bodyAppended[0].textContent, /Promise ditolak diam-diam/);
});
