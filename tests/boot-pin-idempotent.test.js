'use strict';
/**
 * boot-pin-idempotent.test.js — Regresi utk AUDIT_BUG_PIN_BARCODE_2_SESI (SESI 1).
 *
 * Audit menemukan pola: init() -> showPinScreen() bisa "ketembak" 2x lewat 2 jalur
 * berbeda dalam SATU boot:
 *   (a) init() terpanggil ulang di DOKUMEN YANG SAMA (mis. re-entrancy/race lain)
 *       -> showPinScreen() dipanggil 2x -> guard window.__kwPinScreenShown (S275,
 *          keamanan-pin.js) harus membuat panggilan ke-2 no-op.
 *   (b) Service Worker controllerchange memicu reload() SETELAH init() sudah mulai
 *       (dan showPinScreen() sudah tampil) -> user sudah lihat PIN, tiba2 di-reload
 *       paksa -> boot ulang dari nol -> PIN "muncul lagi" di reload baru. Guard
 *       window.__kwBooted (FIX 2026-07-30, di-set PALING AWAL di init()/self-test.js,
 *       dibaca oleh listener controllerchange di index.html/app_production.html)
 *       harus membuat listener itu skip reload kalau boot sudah lewat titik itu.
 *
 * Test ini TIDAK mengubah perilaku apa pun -- murni mengunci kedua guard di atas
 * supaya regresi di masa depan (mis. seseorang menghapus guard karena dikira tidak
 * perlu) langsung ketahuan lewat test gagal, sesuai instruksi audit "jangan
 * mengklaim bug selesai tanpa test reproduksi".
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// ---------------------------------------------------------------------------
// (a) showPinScreen() harus idempoten dalam satu pemuatan halaman.
// ---------------------------------------------------------------------------
test('showPinScreen() dipanggil 2x dalam 1 pemuatan halaman -> hanya render sekali (guard __kwPinScreenShown)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules', 'shared', 'keamanan-pin.js'), 'utf8');

  let renderCount = 0;
  const onboardEl = { style: {} };
  const pinScreenEl = {
    _classes: new Set(['u-dnone']),
    classList: {
      remove(c) { pinScreenEl._classes.delete(c); },
      add(c) { pinScreenEl._classes.add(c); }
    },
    style: {}
  };
  const titleEl = { textContent: '' };

  const fakeDocument = {
    getElementById(id) {
      if (id === 'onboard') return onboardEl;
      if (id === 'pinScreen') { renderCount++; return pinScreenEl; }
      if (id === 'pinScreenTitle') return titleEl;
      return null;
    }
  };

  const sandbox = {
    window: {},
    document: fakeDocument,
    D: { profile: { nama: 'Test' } },
    pinBuffer: 'xxxx',
    updatePinLockUI() {}
  };
  sandbox.window.window = sandbox.window; // window.window self-ref, lazim di kode ini
  vm.createContext(sandbox);
  // hanya ambil definisi function showPinScreen (hindari menjalankan sisa file yang
  // butuh banyak dependency lain / event listener DOM sungguhan).
  const m = src.match(/function showPinScreen\(\)\{[\s\S]*?updatePinLockUI\(\);\}/);
  assert.ok(m, 'Tidak menemukan function showPinScreen() di keamanan-pin.js -- cek apakah signature berubah');
  vm.runInContext(m[0] + '\nthis.__showPinScreen__ = showPinScreen;', sandbox, { filename: 'keamanan-pin.js' });

  sandbox.__showPinScreen__();
  sandbox.__showPinScreen__();
  sandbox.__showPinScreen__();

  assert.equal(renderCount, 1, 'showPinScreen() seharusnya hanya benar2 me-render 1x walau dipanggil berkali-kali (guard window.__kwPinScreenShown hilang/rusak?)');
  assert.equal(sandbox.window.__kwPinScreenShown, true, 'guard window.__kwPinScreenShown seharusnya ter-set true setelah showPinScreen() pertama');
});

// ---------------------------------------------------------------------------
// (b) listener controllerchange di index.html/app_production.html harus skip
//     reload kalau window.__kwBooted sudah true, & hanya reload SEKALI (guard
//     sessionStorage) kalau belum booted.
// ---------------------------------------------------------------------------
function extractControllerChangeIIFE(html) {
  const m = html.match(/\(function\(\)\{\s*try\{\s*if\(!\('serviceWorker' in navigator\)\)return;[\s\S]*?\}catch\(e\)\{\}\s*\}\)\(\);/);
  return m ? m[0] : null;
}

function runControllerChangeScenario(html, { booted, alreadyReloadedThisSession }) {
  const iife = extractControllerChangeIIFE(html);
  assert.ok(iife, 'Tidak menemukan IIFE listener controllerchange di HTML -- cek apakah struktur script berubah');

  let registeredHandler = null;
  let reloadCalls = 0;
  const store = {};
  if (alreadyReloadedThisSession) store['kw_sw_reloaded'] = '1';

  const sandbox = {
    window: {
      __kwBooted: booted,
      location: { reload() { reloadCalls++; } }
    },
    navigator: {
      serviceWorker: {
        addEventListener(evt, cb) { if (evt === 'controllerchange') registeredHandler = cb; }
      }
    },
    sessionStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = v; }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(iife, sandbox, { filename: 'controllerchange-iife.html' });

  assert.ok(typeof registeredHandler === 'function', 'listener controllerchange tidak ter-register');
  // simulasikan event controllerchange nyala (bisa lebih dari 1x pada SW yang flaky)
  registeredHandler();
  registeredHandler();
  registeredHandler();

  return { reloadCalls };
}


// ---------------------------------------------------------------------------
// (c) Integration ringan: init() menandai __kwBooted SEBELUM await load().
// Ini mensimulasikan race nyata: saat load() masih pending, controllerchange
// terjadi. Listener harus melihat booted=true dan TIDAK reload.
// ---------------------------------------------------------------------------
test('integration — init() menandai __kwBooted sebelum load(), sehingga controllerchange saat load pending tidak reload', async () => {
  const selfTest = fs.readFileSync(path.join(ROOT, 'self-test.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  const initStart = selfTest.indexOf('function init(){');
  const initEnd = selfTest.indexOf('\n}', selfTest.indexOf('showMain();', initStart));
  const initSource = initStart >= 0 && initEnd >= 0 ? selfTest.slice(initStart, initEnd + 2) : null;
  assert.ok(initSource, 'Tidak menemukan function init() di self-test.js');
  const iife = extractControllerChangeIIFE(html);
  assert.ok(iife, 'Tidak menemukan IIFE controllerchange di index.html');

  let registeredHandler = null;
  let reloadCalls = 0;
  let releaseLoad;
  const loadGate = new Promise(resolve => { releaseLoad = resolve; });

  const sandbox = {
    window: {
      __kwBooted: false,
      location: { reload() { reloadCalls++; } },
      addEventListener() {},
    },
    navigator: {
      serviceWorker: {
        addEventListener(evt, cb) {
          if (evt === 'controllerchange') registeredHandler = cb;
        }
      },
      storage: { persist() { return Promise.resolve(); } }
    },
    sessionStorage: {
      getItem() { return null; },
      setItem() {}
    },
    localStorage: {
      getItem(k) { return k === 'kw_pin' ? '1234' : '1'; }
    },
    document: {
      getElementById() { return { textContent: '', classList: { remove() {} }, style: {} }; },
      addEventListener() {},
      visibilityState: 'visible'
    },
    D: { googleDrive: { autoSync: false } },
    gdriveAccessToken: null,
    AIService: undefined,
    registerFinanceAIRules: undefined,
    registerVehicleAIRules: undefined,
    registerAssetAIRules: undefined,
    registerDeliveryAIRules: undefined,
    registerCrossModuleAIRules: undefined,
    applyEffectiveTheme() {},
    setupPWA() {},
    enableSwipeToDismiss() {},
    setInterval() {},
    saveFlush() {},
    uploadBackupToDrive() {},
    checkAndFireReminders() {},
    updateOnboardPreview() {},
    showMain() {},
    showPinScreen() {}
  };

  // load() sengaja menahan init() di await agar event controllerchange
  // dapat ditembak tepat di tengah boot.
  sandbox.load = async () => { await loadGate; };
  vm.createContext(sandbox);

  vm.runInContext(iife, sandbox, { filename: 'controllerchange-iife.html' });
  assert.ok(typeof registeredHandler === 'function', 'listener controllerchange tidak ter-register');

  vm.runInContext(initSource.replace(/^function init\(\)/, 'async function init()') + '\nthis.__init__ = init;', sandbox, { filename: 'self-test.js' });
  const initPromise = vm.runInContext('__init__()', sandbox);

  assert.equal(
    sandbox.window.__kwBooted,
    true,
    'init() harus men-set window.__kwBooted=true SEBELUM await load()'
  );

  registeredHandler();
  assert.equal(
    reloadCalls,
    0,
    'controllerchange saat load() masih pending tidak boleh reload karena boot sudah ditandai'
  );

  releaseLoad();
  await initPromise;
});

for (const file of ['index.html', 'app_production.html']) {
  test(`${file} — controllerchange TIDAK reload kalau window.__kwBooted sudah true (PIN sudah sempat tampil)`, () => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const { reloadCalls } = runControllerChangeScenario(html, { booted: true, alreadyReloadedThisSession: false });
    assert.equal(reloadCalls, 0, `${file}: controllerchange masih memicu reload() walau window.__kwBooted true -- ini penyebab PIN "muncul 2x" yang dilaporkan audit`);
  });

  test(`${file} — controllerchange reload maksimal 1x per sesi kalau boot belum mulai (guard sessionStorage)`, () => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const { reloadCalls } = runControllerChangeScenario(html, { booted: false, alreadyReloadedThisSession: false });
    assert.equal(reloadCalls, 1, `${file}: reload() seharusnya terpanggil tepat 1x walau event controllerchange nyala berkali-kali`);
  });

  test(`${file} — controllerchange tidak reload lagi kalau sesi ini sudah pernah reload sebelumnya`, () => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const { reloadCalls } = runControllerChangeScenario(html, { booted: false, alreadyReloadedThisSession: true });
    assert.equal(reloadCalls, 0, `${file}: reload() tidak seharusnya terpanggil lagi kalau sessionStorage kw_sw_reloaded sudah "1"`);
  });
}
