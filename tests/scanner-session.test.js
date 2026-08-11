'use strict';
// tests/scanner-session.test.js — cakupan modules/shared/scanner-session.js
// (Tahap 6 — Migrasi Scanner, lanjutan Tahap 5 ScannerSession, docs/
// PRODUCT_DECISIONS.md § "Scanner — Exclusive Scanner Mode via
// ScannerSession (FINAL — Sesi 316, PD-007)").
//
// Menggantikan tests/scanner-lifecycle-baseline-s317.test.js (characterization
// test kode ASLI SEBELUM refactor, sengaja DIHAPUS sesi ini — persis seperti
// yang diprediksi di komentar file itu sendiri: "kalau nanti dipindah ke
// ScannerSession, test 'reuse hideChrome/restoreChrome milik dirinya sendiri'
// SEHARUSNYA gagal/hilang, sinyal migrasi sudah terjadi"). Behavior EKSTERNAL
// yang diamati user (nav/header + modal/toast hilang saat scanner buka,
// kembali saat scanner tutup) sekarang dites di sini lewat ScannerSession,
// BUKAN lagi lewat vehicleScannerHideChrome()/RestoreChrome() (fungsi itu
// sendiri sudah dihapus dari vehicle-scanner.js — lihat tests/vehicle-
// scanner.test.js, yang sekarang HANYA mencakup errorMessage()/buildHints(),
// 0 referensi hideChrome tersisa).
//
// Fake DOM manual (bukan loadSource.js) — pola SAMA PERSIS
// tests/scanner-lifecycle-baseline-s317.test.js (sekarang dihapus) &
// tests/dash-card-show-hide.test.js, karena scanner-session.js baca/tulis
// document.getElementById/classList/style langsung.
//
// AUDIT (menggantikan hotfix querySelectorAll('.keu-fab') lama): FAB & semua
// varian overlay (.overlay.open/.qs-modal-overlay/.calc-overlay) sekarang
// disembunyikan MURNI lewat CSS (stylesheet yang disuntik
// _scannerSessionEnsureStyle()) — pauseUI()/resumeUI() tidak lagi
// menyimpan/menulis style.display FAB. `querySelectorAll()` di fake DOM di
// bawah dipertahankan (masih dipakai test lama yang membangun fabs via
// makeFab()) walau source tidak lagi memanggilnya utk FAB.

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

// makeFab(id) — helper elemen `.keu-fab` (pola nyata: `<div class="keu-fab"
// id="...">`, position:fixed, lihat styles.css). display awal '' (kosong,
// dikontrol CSS), sama seperti elemen FAB asli sebelum JS menyentuhnya.
function makeFab(id) {
  return makeEl(id, ['keu-fab']);
}

// makeDocument(byId, fabs, opts) — `fabs`: array elemen `.keu-fab` yang
// dikembalikan `querySelectorAll('.keu-fab')`. `opts.noQuerySelectorAll`:
// simulasikan lingkungan/browser lama yang TIDAK punya
// `document.querySelectorAll` sama sekali (properti dihapus total, bukan
// cuma dikosongkan) — utk menguji guard `typeof document.querySelectorAll
// !== 'function'` di source.
function makeDocument(byId, fabs, opts) {
  const body = makeEl('body');
  const head = makeEl('head');
  const options = opts || {};
  const doc = {
    body,
    head,
    // getElementById juga mencari elemen yg dibuat dinamis (createElement +
    // appendChild ke head/body dgn .id di-set, mis. style injection
    // _scannerSessionStyle) — supaya guard `if(document.getElementById(id))
    // return;` di source (idempotency) benar2 teruji, bukan cuma lookup
    // static byId map.
    getElementById(id) {
      if (id in byId && byId[id]) return byId[id];
      const found = head.children.find((c) => c.id === id) || body.children.find((c) => c.id === id);
      return found || null;
    },
    createElement: (tag) => { const el = makeEl(null); el.tagName = tag; return el; },
  };
  if (!options.noQuerySelectorAll) {
    // Implementasi minimal — cukup utk kebutuhan source (satu selector class
    // sederhana, `.keu-fab`). Return array biasa (punya .forEach, sama
    // seperti NodeList asli di browser).
    doc.querySelectorAll = (selector) => {
      const cls = String(selector).replace(/^\./, '');
      return (fabs || []).filter((el) => el._classes.includes(cls));
    };
  }
  // querySelector('.vehicle-scanner-fullscreen') — dipakai self-healing
  // guard (_scannerSessionHasLiveOverlay()) utk cek apakah overlay scanner
  // BENERAN masih ada di DOM. `opts.overlayLive`: true/false mensimulasikan
  // overlay masih ada / sudah lenyap (kasus stuck: tab suspend sebelum
  // teardown sempat lepas overlay dari DOM). `opts.noQuerySelector`:
  // simulasikan browser lama yang tidak punya querySelector sama sekali.
  if (!options.noQuerySelector) {
    // Default overlayLive: true (kecuali eksplisit di-set false) — merefleksikan
    // kondisi NORMAL (overlay scanner beneran masih ada selama sesi aktif);
    // hanya test self-healing yang sengaja set overlayLive:false utk
    // mensimulasikan kasus stuck (overlay lenyap sebelum exit() sempat jalan).
    const overlayLive = options.overlayLive !== false;
    doc.querySelector = (selector) => {
      if (selector === '.vehicle-scanner-fullscreen' && overlayLive) {
        return makeEl(null, ['vehicle-scanner-fullscreen']);
      }
      return null;
    };
  }
  return doc;
}

function makeCtx(byIdOverrides, extraGlobals, fabs, docOpts) {
  const byId = Object.assign(
    { mainNav: makeEl('mainNav'), mainHeader: makeEl('mainHeader') },
    byIdOverrides || {},
  );
  const document = makeDocument(byId, fabs, docOpts);
  const sandbox = Object.assign({ console, document, window: {} }, extraGlobals || {});
  const context = vm.createContext(sandbox);
  new vm.Script(readSrc('modules/shared/scanner-session.js'), { filename: 'scanner-session.js' }).runInContext(context);
  return { ctx: context, byId, document };
}

// ============================================================
// scannerSessionPauseUI() / scannerSessionResumeUI()
// ============================================================

test('scannerSessionPauseUI() — #mainNav & #mainHeader disembunyikan (style.display="none")', () => {
  const { ctx, byId } = makeCtx();
  byId.mainNav.style.display = 'flex';
  byId.mainHeader.style.display = 'grid';
  ctx.scannerSessionPauseUI();
  assert.equal(byId.mainNav.style.display, 'none');
  assert.equal(byId.mainHeader.style.display, 'none');
});

test('scannerSessionPauseUI() — body diberi class scanner-session-active', () => {
  const { ctx, document } = makeCtx();
  ctx.scannerSessionPauseUI();
  assert.ok(document.body.classList.contains('scanner-session-active'));
});

test('scannerSessionPauseUI() — style suspend modal/toast disuntik sekali (idempotent, guard by id)', () => {
  const { ctx, document } = makeCtx();
  ctx.scannerSessionPauseUI();
  ctx.scannerSessionPauseUI();
  const styleEls = document.head.children.filter((c) => c.id === '_scannerSessionStyle');
  assert.equal(styleEls.length, 1);
  assert.match(styleEls[0].textContent, /scanner-session-active/);
});

test('scannerSessionResumeUI() — mengembalikan display persis ke nilai SEBELUM pause (round-trip)', () => {
  const { ctx, byId } = makeCtx();
  byId.mainNav.style.display = 'flex';
  byId.mainHeader.style.display = 'grid';
  ctx.scannerSessionPauseUI();
  ctx.scannerSessionResumeUI();
  assert.equal(byId.mainNav.style.display, 'flex');
  assert.equal(byId.mainHeader.style.display, 'grid');
});

test('scannerSessionResumeUI() — body class scanner-session-active dilepas', () => {
  const { ctx, document } = makeCtx();
  ctx.scannerSessionPauseUI();
  ctx.scannerSessionResumeUI();
  assert.ok(!document.body.classList.contains('scanner-session-active'));
});

test('scannerSessionPauseUI()/ResumeUI() — guard: #mainNav/#mainHeader tidak ada di DOM -> tidak throw', () => {
  const { ctx } = makeCtx({ mainNav: null, mainHeader: null });
  assert.doesNotThrow(() => ctx.scannerSessionPauseUI());
  assert.doesNotThrow(() => ctx.scannerSessionResumeUI());
});

// ============================================================
// scannerSessionEnter() / scannerSessionExit() — state eksplisit, guard anti-dobel
// ============================================================

test('scannerSessionEnter() — mem-pause UI global & return true', () => {
  const { ctx, byId } = makeCtx();
  byId.mainNav.style.display = 'flex';
  const result = ctx.scannerSessionEnter();
  assert.equal(result, true);
  assert.equal(byId.mainNav.style.display, 'none');
  assert.equal(ctx.scannerSessionIsActive(), true);
});

test('scannerSessionEnter() — guard anti-dobel: enter() ke-2 sebelum exit() -> no-op, return false', () => {
  const { ctx, byId } = makeCtx();
  byId.mainNav.style.display = 'flex';
  ctx.scannerSessionEnter();
  byId.mainNav.style.display = 'CUSTOM'; // simulasikan scanner engine lain menimpa manual
  const result2 = ctx.scannerSessionEnter();
  assert.equal(result2, false, 'enter() ke-2 harus no-op, tidak menimpa _scannerSessionPrevChrome asli');
});

test('scannerSessionExit() — resume UI global & return true, state jadi tidak aktif', () => {
  const { ctx, byId } = makeCtx();
  byId.mainNav.style.display = 'flex';
  ctx.scannerSessionEnter();
  const result = ctx.scannerSessionExit();
  assert.equal(result, true);
  assert.equal(byId.mainNav.style.display, 'flex');
  assert.equal(ctx.scannerSessionIsActive(), false);
});

test('scannerSessionExit() — aman dipanggil walau enter() belum pernah -> no-op, return false, tidak throw', () => {
  const { ctx } = makeCtx();
  let result;
  assert.doesNotThrow(() => { result = ctx.scannerSessionExit(); });
  assert.equal(result, false);
});

test('enter() -> exit() round-trip penuh: nav/header + body class kembali seperti semula', () => {
  const { ctx, byId, document } = makeCtx();
  byId.mainNav.style.display = 'flex';
  byId.mainHeader.style.display = 'grid';
  ctx.scannerSessionEnter();
  assert.equal(byId.mainNav.style.display, 'none');
  assert.ok(document.body.classList.contains('scanner-session-active'));
  ctx.scannerSessionExit();
  assert.equal(byId.mainNav.style.display, 'flex');
  assert.equal(byId.mainHeader.style.display, 'grid');
  assert.ok(!document.body.classList.contains('scanner-session-active'));
});

test('scannerSessionIsActive() — false sebelum enter(), true setelah enter(), false lagi setelah exit()', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.scannerSessionIsActive(), false);
  ctx.scannerSessionEnter();
  assert.equal(ctx.scannerSessionIsActive(), true);
  ctx.scannerSessionExit();
  assert.equal(ctx.scannerSessionIsActive(), false);
});

// ============================================================
// AIBus.emit('Scanner:opened'/'Scanner:closed') — guarded (typeof), opsional
// ============================================================

test('enter()/exit() — AIBus.emit dipanggil dgn event Scanner:opened/closed kalau AIBus tersedia', () => {
  const emitted = [];
  const { ctx } = makeCtx({}, { AIBus: { emit: (name, payload) => emitted.push([name, payload]) } });
  ctx.scannerSessionEnter();
  ctx.scannerSessionExit();
  assert.deepEqual(emitted.map((e) => e[0]), ['Scanner:opened', 'Scanner:closed']);
});

test('enter()/exit() — guard: AIBus TIDAK tersedia -> tidak throw', () => {
  const { ctx } = makeCtx();
  assert.doesNotThrow(() => ctx.scannerSessionEnter());
  assert.doesNotThrow(() => ctx.scannerSessionExit());
});

// ============================================================
// Namespace publik ScannerSession — expose ke window
// ============================================================

test('window.ScannerSession expose semua method publik', () => {
  const { ctx } = makeCtx();
  assert.equal(typeof ctx.window.ScannerSession.enter, 'function');
  assert.equal(typeof ctx.window.ScannerSession.exit, 'function');
  assert.equal(typeof ctx.window.ScannerSession.pauseUI, 'function');
  assert.equal(typeof ctx.window.ScannerSession.resumeUI, 'function');
  assert.equal(typeof ctx.window.ScannerSession.isActive, 'function');
});

// ============================================================
// AUDIT (menggantikan blok "HOTFIX Scanner Session/FAB" lama) — FAB
// (.keu-fab) & overlay (.overlay.open/.qs-modal-overlay/.calc-overlay)
// SEKARANG disembunyikan murni lewat CSS (rule di stylesheet yang disuntik
// _scannerSessionEnsureStyle()), BUKAN lagi JS snapshot/restore per elemen
// (querySelectorAll('.keu-fab') + style.display dihapus dari pauseUI()/
// resumeUI()). Konsekuensinya: pauseUI()/resumeUI() TIDAK LAGI menyentuh
// style.display FAB sama sekali — tesnya dibalik jadi "style.display FAB
// TIDAK berubah", dan cakupan CSS-nya dites lewat isi stylesheet yang
// disuntik.
// ============================================================

test('scannerSessionEnter() — style.display .keu-fab TIDAK disentuh JS (disembunyikan via CSS, bukan inline style)', () => {
  const keuFab = makeFab('keuFab');
  const shopFab = makeFab('shopFab');
  keuFab.style.display = 'flex';
  shopFab.style.display = 'flex';
  const { ctx } = makeCtx({}, {}, [keuFab, shopFab]);
  ctx.scannerSessionEnter();
  assert.equal(keuFab.style.display, 'flex', 'pauseUI() tidak boleh lagi menulis style.display FAB');
  assert.equal(shopFab.style.display, 'flex');
  ctx.scannerSessionExit();
  assert.equal(keuFab.style.display, 'flex', 'resumeUI() juga tidak menyentuh — tidak ada apa pun utk di-restore');
  assert.equal(shopFab.style.display, 'flex');
});

test('_scannerSessionEnsureStyle() — stylesheet berisi rule suppression utk .keu-fab, .overlay.open, .qs-modal-overlay, .calc-overlay, #toast', () => {
  const { ctx, document } = makeCtx();
  ctx.scannerSessionPauseUI();
  const styleEl = document.head.children.find((c) => c.id === '_scannerSessionStyle');
  assert.ok(styleEl, 'style _scannerSessionStyle harus ada di <head>');
  const css = styleEl.textContent;
  assert.match(css, /body\.scanner-session-active \.keu-fab\{display:none !important;\}/);
  assert.match(css, /body\.scanner-session-active \.overlay\.open\{display:none !important;\}/);
  assert.match(css, /body\.scanner-session-active \.qs-modal-overlay\{display:none !important;\}/);
  assert.match(css, /body\.scanner-session-active \.calc-overlay\{display:none !important;\}/);
  assert.match(css, /body\.scanner-session-active #toast\{display:none !important;\}/);
  // Rule lama pakai child combinator `body.scanner-session-active > .overlay.open`
  // — dihapus krn cuma match kalau `.overlay` direct child <body>. Pastikan
  // TIDAK ada lagi `>` di rule .overlay.open.
  assert.doesNotMatch(css, />\s*\.overlay\.open/);
});

test('enter()/exit() — tidak ada .keu-fab sama sekali di DOM -> tidak throw, nav/header tetap normal', () => {
  const { ctx, byId } = makeCtx({}, {}, []);
  byId.mainNav.style.display = 'flex';
  assert.doesNotThrow(() => ctx.scannerSessionEnter());
  assert.equal(byId.mainNav.style.display, 'none');
  assert.doesNotThrow(() => ctx.scannerSessionExit());
  assert.equal(byId.mainNav.style.display, 'flex');
});

test('enter()/exit() — document.querySelectorAll tidak tersedia (browser lama) -> tidak throw, nav/header tetap berfungsi (FAB tidak lagi butuh querySelectorAll sama sekali)', () => {
  const { ctx, byId, document } = makeCtx({}, {}, [], { noQuerySelectorAll: true });
  assert.equal(typeof document.querySelectorAll, 'undefined');
  byId.mainNav.style.display = 'flex';
  assert.doesNotThrow(() => ctx.scannerSessionEnter());
  assert.equal(byId.mainNav.style.display, 'none');
  assert.doesNotThrow(() => ctx.scannerSessionExit());
  assert.equal(byId.mainNav.style.display, 'flex');
});

// ============================================================
// Reference counter — enter()/exit() nested (TARGET IMPLEMENTASI #1)
// ============================================================

test('reference counter — enter() x2 lalu exit() x1: sesi TETAP aktif (counter 1), pauseUI TIDAK diulang', () => {
  const { ctx, byId, document } = makeCtx();
  byId.mainNav.style.display = 'flex';
  ctx.scannerSessionEnter(); // counter=1, pauseUI() jalan
  byId.mainNav.style.display = 'CUSTOM'; // simulasikan enter() ke-2 TIDAK menimpa lagi
  const r2 = ctx.scannerSessionEnter(); // counter=2, no-op pauseUI
  assert.equal(r2, false);
  assert.equal(byId.mainNav.style.display, 'CUSTOM', 'enter() ke-2 tidak boleh pauseUI() ulang');
  const r3 = ctx.scannerSessionExit(); // counter=1, belum resumeUI
  assert.equal(r3, false, 'exit() pertama dari 2 enter() belum boleh resumeUI()');
  assert.ok(document.body.classList.contains('scanner-session-active'), 'sesi masih aktif selama counter > 0');
  assert.equal(ctx.scannerSessionIsActive(), true);
});

test('reference counter — enter() x2 lalu exit() x2: baru resumeUI() & class dilepas pada exit() ke-2 (counter 0)', () => {
  const { ctx, byId, document } = makeCtx();
  byId.mainNav.style.display = 'flex';
  ctx.scannerSessionEnter();
  ctx.scannerSessionEnter();
  ctx.scannerSessionExit();
  assert.ok(document.body.classList.contains('scanner-session-active'), 'masih aktif setelah exit() pertama');
  const r = ctx.scannerSessionExit();
  assert.equal(r, true, 'exit() kedua (counter jadi 0) harus resumeUI() & return true');
  assert.equal(byId.mainNav.style.display, 'flex');
  assert.ok(!document.body.classList.contains('scanner-session-active'));
  assert.equal(ctx.scannerSessionIsActive(), false);
});

test('reference counter — exit() berlebih (lebih banyak dari enter()) tidak membuat counter negatif (enter() berikutnya tetap 1x pauseUI, bukan butuh 2x exit())', () => {
  const { ctx, byId } = makeCtx();
  byId.mainNav.style.display = 'flex';
  ctx.scannerSessionEnter();
  ctx.scannerSessionExit();
  // exit() ekstra tanpa enter() yang menyertainya — harus no-op, tidak turun ke -1.
  const extra = ctx.scannerSessionExit();
  assert.equal(extra, false);
  // enter() baru sesudahnya harus tetap 1x pauseUI() & 1x exit() saja cukup
  // utk resumeUI() (bukti counter tidak "berhutang" dari exit() berlebih tadi).
  byId.mainNav.style.display = 'CUSTOM';
  ctx.scannerSessionEnter();
  assert.equal(byId.mainNav.style.display, 'none');
  const r = ctx.scannerSessionExit();
  assert.equal(r, true);
  assert.equal(byId.mainNav.style.display, 'CUSTOM');
});

test('reference counter — enter() x3 / exit() x3: hanya transisi 0->1 dan 1->0 yang memicu pauseUI()/resumeUI()', () => {
  const emitted = [];
  const { ctx } = makeCtx({}, { AIBus: { emit: (name) => emitted.push(name) } });
  ctx.scannerSessionEnter();
  ctx.scannerSessionEnter();
  ctx.scannerSessionEnter();
  ctx.scannerSessionExit();
  ctx.scannerSessionExit();
  ctx.scannerSessionExit();
  assert.deepEqual(emitted, ['Scanner:opened', 'Scanner:closed'], 'AIBus.emit hanya sekali per transisi, bukan per enter()/exit() individual');
});

// ============================================================
// SELF-HEALING GUARD — bugfix: ScannerSession nyangkut aktif selamanya kalau
// proses tutup kamera terputus di tengah jalan (exit() tidak pernah
// terpanggil, tapi overlay .vehicle-scanner-fullscreen sudah lenyap dari DOM
// lebih dulu, mis. tab di-suspend browser saat prompt izin kamera muncul).
// ============================================================

test('isActive() — overlay masih ada (sesi beneran aktif) -> tetap true, TIDAK direset', () => {
  const { ctx, byId } = makeCtx({}, {}, [], { overlayLive: true });
  ctx.scannerSessionEnter();
  assert.equal(ctx.scannerSessionIsActive(), true);
  // Bukti tidak direset: class body & style nav masih dalam kondisi "aktif".
  assert.equal(byId.mainNav.style.display, 'none');
  ctx.scannerSessionExit();
});

test('isActive() — nyangkut (flag true, overlay SUDAH lenyap dari DOM) -> self-heal: reset paksa & return false', () => {
  const { ctx, byId } = makeCtx({}, {}, [], { overlayLive: false });
  ctx.scannerSessionEnter();
  // Simulasikan overlay hilang dari DOM tanpa exit() sempat jalan (tab
  // suspend, dsb) — dokumen fake sudah overlayLive:false dari awal, mewakili
  // kondisi ini persis.
  assert.equal(ctx.scannerSessionIsActive(), false, 'self-heal harus mengembalikan false, bukan state nyangkut true selamanya');
  // Bukti reset PENUH: chrome nav/header dikembalikan, class body dilepas —
  // sama seperti kalau exit() normal terpanggil.
  assert.equal(byId.mainNav.style.display, '');
});

test('isActive() — self-heal melepas class scanner-session-active dari body (overlay/toast/FAB tidak lagi nyangkut tersembunyi)', () => {
  const { ctx, document } = makeCtx({}, {}, [], { overlayLive: false });
  ctx.scannerSessionEnter();
  assert.equal(document.body.classList.contains('scanner-session-active'), true);
  ctx.scannerSessionIsActive();
  assert.equal(document.body.classList.contains('scanner-session-active'), false);
});

test('enter() baru setelah state nyangkut ter-self-heal -> pauseUI() tetap jalan normal (bukan no-op guard anti-dobel)', () => {
  const { ctx, byId } = makeCtx({}, {}, [], { overlayLive: false });
  ctx.scannerSessionEnter();
  // State sekarang nyangkut (overlay sudah tidak ada tapi belum pernah
  // dicek/di-self-heal). Pemanggil baru (pola nyata vehicle-scanner.js):
  // cek isActive() dulu -> harusnya false (ter-self-heal), lalu enter() lagi
  // beneran men-trigger pauseUI() baru, bukan dianggap "nested enter()".
  assert.equal(ctx.scannerSessionIsActive(), false);
  byId.mainNav.style.display = 'CUSTOM';
  const entered = ctx.scannerSessionEnter();
  assert.equal(entered, true);
  assert.equal(byId.mainNav.style.display, 'none');
});

test('self-heal — document.querySelector tidak tersedia (browser lama) -> konservatif, TIDAK memaksa reset (anggap overlay masih ada)', () => {
  const { ctx, byId } = makeCtx({}, {}, [], { noQuerySelector: true });
  ctx.scannerSessionEnter();
  // Tanpa querySelector, guard tidak bisa memverifikasi DOM -> tidak boleh
  // sok tahu memaksa reset (bisa menutup sesi yang beneran masih aktif).
  assert.equal(ctx.scannerSessionIsActive(), true);
  assert.equal(byId.mainNav.style.display, 'none');
  ctx.scannerSessionExit();
});

test('isActive() — flag memang sudah false dari awal (belum pernah enter()) -> self-heal tidak melakukan apa-apa, tidak throw', () => {
  const { ctx } = makeCtx({}, {}, [], { overlayLive: false });
  assert.equal(ctx.scannerSessionIsActive(), false);
});
