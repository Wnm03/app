'use strict';
/**
 * loadSource.js — harness buat load file source ASLI app (bukan copy-paste
 * logic) ke dalam sandbox Node (vm) supaya fungsi murninya (escapeHtml, fmt,
 * parsePzNum, sameId, dst) bisa dites langsung tanpa browser.
 *
 * Kenapa begini, bukan cuma re-implement fungsinya di file test:
 *   - Kalau source aslinya berubah/ke-bug, test ini ikut gagal (karena
 *     benar-benar menjalankan file .js yang sama yang dipakai app.js).
 *   - smoke-test.js (browser-only, lihat catatan di file itu) cuma bisa
 *     jalan di browser nyata/dev mode; ini bisa jalan di `npm test` / CI
 *     tanpa browser sama sekali.
 *
 * Batasan yang disengaja:
 *   - Semua file app ditulis sebagai script global (bukan ES module / tidak
 *     ada module.exports), dan banyak yang bergantung ke `D`, `document`,
 *     dst pada method-method-nya. Harness ini TIDAK mencoba menjalankan
 *     app secara penuh (bukan jsdom) — dia cuma menyediakan stub permisif
 *     (no-op) untuk document/window/localStorage/navigator supaya file
 *     bisa di-load tanpa error, lalu kita ambil fungsi-fungsi MURNI (tidak
 *     baca/tulis DOM) dari sandbox itu untuk dites.
 *   - Jangan pakai harness ini buat nge-test fungsi yang baca/tulis DOM
 *     (getElementById dst) — itu ranahnya smoke-test.js / manual QA di
 *     browser, bukan test murni-logika ini.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

// Stub permisif: apa pun property/method yang diakses/dipanggil di objek
// stub ini akan balik jadi fungsi no-op (kalau dipanggil) atau stub lagi
// (kalau diakses sebagai property), supaya top-level code yang iseng
// menyentuh document/window/localStorage tidak bikin loading gagal.
function makePermissiveStub(name) {
  const fn = function permissiveStub() { return makePermissiveStub(name + '()'); };
  return new Proxy(fn, {
    get(target, prop) {
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === 'then') return undefined; // biar tidak dianggap thenable
      if (prop in target) return target[prop];
      return makePermissiveStub(`${name}.${String(prop)}`);
    },
    apply() {
      return makePermissiveStub(`${name}()`);
    },
  });
}

/**
 * Load satu atau lebih file source app ke satu sandbox vm bersama, lalu
 * kembalikan objek `context` (global sandbox) supaya fungsi/const top-level
 * di file itu bisa diambil (mis. context.escapeHtml, context.fmt).
 *
 * @param {string[]} files - nama file relatif ke root project, DIMUAT
 *   berurutan sesuai array (beberapa file saling referensi, mis.
 *   format-tema.js butuh D/save() dari features-helpers-global-security.js
 *   untuk fungsi selain yang murni — lihat catatan per file).
 * @param {object} [extraGlobals] - global tambahan yang mau di-inject
 *   duluan ke sandbox (mis. `D` versi minimal untuk file yang butuh).
 * @param {string[]} [expose] - nama-nama yang dideklarasikan dengan
 *   `const`/`let` (bukan `function`) di top-level file, yang perlu dibaca
 *   dari luar (mis. `MONTHS_FULL`). Node vm TIDAK menempelkan binding
 *   const/let ke objek context secara otomatis (beda dari `function`/`var`
 *   yang otomatis jadi properti context) — jadi harus diminta eksplisit.
 */
function loadSource(files, extraGlobals = {}, expose = []) {
  // S2186: finance Bill/Debt/Piutang modules now depend on one canonical
  // mutation boundary. Keep isolated VM tests compatible by loading that
  // dependency automatically when any affected source is requested.
  const _files = Array.from(files || []);
  const _needsBillDebtPiutangWriter = _files.some((f) => [
    'modules/finance/piutang-utang.js',
    'modules/finance/tagihan-kalender.js',
    'modules/finance/transaksi-b.js',
    'modules/finance/pajak-pbb-zakat.js',
    'modules/finance/titipan-sync.js',
    'modules/finance/titipan-reconcile.js',
  ].includes(f));
  if (_needsBillDebtPiutangWriter && !_files.includes('modules/finance/bill-debt-piutang-canonical-writer.js')) {
    _files.unshift('modules/finance/bill-debt-piutang-canonical-writer.js');
  }
  const sandbox = {
    console,
    Date,
    Math,
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    Map,
    Set,
    Promise,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    document: makePermissiveStub('document'),
    window: {},
    navigator: makePermissiveStub('navigator'),
    localStorage: makePermissiveStub('localStorage'),
    location: makePermissiveStub('location'),
    URLSearchParams: URLSearchParams,
    crypto: globalThis.crypto,
    TextEncoder: globalThis.TextEncoder,
    TextDecoder: globalThis.TextDecoder,
    btoa: globalThis.btoa,
    atob: globalThis.atob,
    parseServiceDateOnly: (value) => {
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
      const m = String(value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
        const out = new Date(y, mo, d);
        return out.getFullYear() === y && out.getMonth() === mo && out.getDate() === d ? out : null;
      }
      const out = new Date(value);
      return Number.isNaN(out.getTime()) ? null : out;
    },
    ...extraGlobals,
  };
  const context = vm.createContext(sandbox);
  // Compatibility for legacy tests that historically loaded car-notes.js as a
  // monolith. Runtime build order remains controlled by scripts/build.js;
  // this harness transparently loads the split Servis sources once, avoiding
  // duplicate lexical declarations when a caller already lists them.
  const loadFiles = [..._files];
  // P4 stock-write authority: isolated source tests that exercise modules
  // migrated to StockCommandSOT must load the canonical mutation gateway first.
  // Runtime build order remains controlled by scripts/build.js; this is only
  // test-harness dependency wiring so legacy loadSource() tests do not fail
  // merely because they omit a newly-required runtime dependency.
  const sotDependentFiles = new Set([
    'data-health-check.js',
    'chat-action-handlers.js',
    'modules/finance/transaksi-b.js',
    'modules/finance/tx-stok-sparepart.js',
    'modules/finance/tx-servis.js',
    'modules/shared/backup-restore.js',
    'modules/shared/features-helpers-global-security.js',
    'modules/shared/self-test-cases-a.js',
    'modules/shared/self-test-cases-b.js',
    'modules/shop/features-helpers-global-security.js',
    'modules/asset/features-helpers-global-security.js',
    'modules/vehicle/service-session-mutation-s2047.js',
    'modules/vehicle/service-session-recovery-s2050.js',
    'modules/vehicle/part-crud-s2041.js',
    'modules/vehicle/sparepart-servis.js',
    'modules/vehicle/sparepart-servis-ui.js',
    'modules/vehicle/servis-b.js',
    'modules/vehicle/servis.js',
    'modules/vehicle/vehicle-catalog-import-stock-push.js',
    'modules/vehicle/vehicle-catalog-migration-sot.js',
    'modules/vehicle/vehicle-stock-sot.js',
    'modules/finance/tx-transfer.js',
    'modules/finance/piutang-utang.js',
    'modules/finance/tagihan-kalender.js',
    'modules/finance/pajak-pbb-zakat.js',
    'modules/finance/titipan-sync.js',
    'modules/finance/titipan-reconcile.js',
    'modules/asset/investasi.js',
    'modules/asset/aset.js',
    'modules/asset/aset-owners.js',
    'modules/vehicle/vehicle-core.js',
    'modules/shop/cobek-order.js',
    'modules/shop/cobek-tx-cart.js',
    'modules/business/kasir.js',
    'modules/shared/scan-ocr.js',
  ]);
  if (loadFiles.some(f => sotDependentFiles.has(f)) && !loadFiles.includes('modules/vehicle/stock-command-sot.js')) {
    loadFiles.unshift('modules/vehicle/stock-command-sot.js');
  }
  const billDebtPiutangDependentFiles = new Set([
    'modules/finance/piutang-utang.js','modules/finance/tagihan-kalender.js','modules/finance/transaksi-b.js',
    'modules/finance/pajak-pbb-zakat.js','modules/finance/titipan-sync.js','modules/finance/titipan-reconcile.js',
    'modules/asset/investasi.js','modules/asset/aset.js','modules/asset/aset-owners.js','modules/vehicle/vehicle-core.js',
    'modules/shop/cobek-order.js','modules/shop/cobek-tx-cart.js','modules/business/kasir.js','modules/shared/scan-ocr.js','modules/shared/owner-registry.js',
  ]);
  if (loadFiles.some(f => billDebtPiutangDependentFiles.has(f)) && !loadFiles.includes('modules/finance/bill-debt-piutang-canonical-writer.js')) {
    loadFiles.unshift('modules/finance/bill-debt-piutang-canonical-writer.js');
  }
  if (loadFiles.some(f => f === 'modules/finance/tx-transfer.js' || f === 'modules/finance/piutang-utang.js' || f === 'modules/finance/tagihan-kalender.js' || f === 'modules/finance/titipan-expense-flow.js') && !loadFiles.includes('modules/finance/finance-tx-sot.js')) {
    loadFiles.unshift('modules/finance/finance-tx-sot.js');
  }
  // S2196+: isolated tests that execute cross-entity mutation/delete paths must
  // receive the canonical atomic boundary just like the production build.
  // Runtime order remains controlled by scripts/build.js; this is harness wiring only.
  const atomicDependentFiles = new Set([
    'modules/finance/tx-list-cashflow.js',
    'modules/shared/owner-registry.js',
    'modules/finance/tagihan-kalender.js',
    'modules/finance/titipan-expense-flow.js',
  ]);
  if (loadFiles.some(f => atomicDependentFiles.has(f)) && !loadFiles.includes('modules/finance/finance-cross-entity-atomic.js')) {
    loadFiles.unshift('modules/finance/finance-cross-entity-atomic.js');
  }
  if (loadFiles.includes('modules/vehicle/servis-checklist.js') && !loadFiles.includes('modules/vehicle/service-master-data.generated.js')) {
    loadFiles.unshift('modules/vehicle/service-master-data.generated.js');
  }
  if (loadFiles.includes('car-notes.js') || loadFiles.includes('modules/vehicle/servis.js')) {
    for (const splitFile of ['modules/vehicle/servis-checklist.js','modules/vehicle/service-input-catalog.js','modules/vehicle/service-condition-intelligence-sot.js','modules/vehicle/service-provenance-sot.js','modules/vehicle/service-condition-timeline-sot.js','modules/vehicle/service-part-compatibility-sot.js','modules/vehicle/service-event-idempotency-sot.js','modules/vehicle/service-ingestion-provenance-sot.js','modules/vehicle/service-evidence-pack-sot.js','modules/vehicle/service-roundtrip-sot.js','modules/vehicle/vehicle-isolation-audit-sot.js','modules/vehicle/maintenance-intelligence-v2-sot.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-ui.js','modules/vehicle/servis.js','modules/vehicle/servis-b.js']) {
      if (!loadFiles.includes(splitFile)) loadFiles.push(splitFile);
    }
  // The car-notes compatibility expansion above can append SOT-dependent
  // service modules after the first dependency check. Re-check after expansion
  // so legacy tests loading only car-notes.js still receive the canonical SOT.
  if (loadFiles.some(f => sotDependentFiles.has(f)) && !loadFiles.includes('modules/vehicle/stock-command-sot.js')) {
    loadFiles.unshift('modules/vehicle/stock-command-sot.js');
  }
  } else if (loadFiles.includes('modules/vehicle/sparepart-servis.js')) {
    // Sesi oversized-file S2: Sparepart UI methods live in a post-object
    // compatibility layer. Load it automatically for isolated source tests.
    if (!loadFiles.includes('modules/vehicle/sparepart-servis-ui.js')) {
      const mainIndex = loadFiles.indexOf('modules/vehicle/sparepart-servis.js');
      loadFiles.splice(mainIndex + 1, 0, 'modules/vehicle/sparepart-servis-ui.js');
    }
  }
  for (const file of loadFiles) {
    const fullPath = path.join(ROOT, file);
    const src = fs.readFileSync(fullPath, 'utf8');
    const script = new vm.Script(src, { filename: file });
    script.runInContext(context);
  }
  if (expose.length) {
    const assign = expose.map((n) => `this.${n} = ${n};`).join('\n');
    new vm.Script(assign, { filename: 'expose-bindings' }).runInContext(context);
  }
  return context;
}

/**
 * Ambil satu fungsi murni `function nama(...){...}` dari file source ASLI
 * lewat brace-counting (bukan disalin ulang manual ke file test), lalu
 * jalankan potongan itu di context vm baru supaya bisa dites terisolasi.
 *
 * Dipakai khusus untuk file besar yang top-level-nya punya baris
 * "expose ke window" yang butuh SEMUA modul app lain sudah ter-load (mis.
 * features-sheets-pwa-selftest.js) — daripada me-mock puluhan modul cuma
 * demi ngetes satu fungsi murni, kita ambil persis fungsi itu dari file
 * aslinya via posisi source, lalu jalankan sendirian.
 *
 * @param {string} file - path relatif ke root project
 * @param {string} fnName - nama fungsi, harus dideklarasikan sbg
 *   `function fnName(...) { ... }` (bukan arrow/const) di file itu
 */
function extractFunction(file, fnName) {
  const fullPath = path.join(ROOT, file);
  const src = fs.readFileSync(fullPath, 'utf8');
  const marker = `function ${fnName}(`;
  const start = src.indexOf(marker);
  if (start === -1) {
    throw new Error(`extractFunction: "${marker}" tidak ditemukan di ${file}`);
  }
  const braceOpen = src.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  const snippet = src.slice(start, i);
  const sandbox = { console };
  const context = vm.createContext(sandbox);
  new vm.Script(`${snippet}\nthis.__fn = ${fnName};`, { filename: `${file}#${fnName}` }).runInContext(context);
  return context.__fn;
}

/**
 * extractFunctionAutoStub — S679, dipakai untuk regresi 14 titik
 * scroll-fix (tests/s679-scroll-flash-14-tabswitch-regression.test.js).
 *
 * Sama seperti extractFunction()/extractFunctionWithGlobals() (S335) --
 * ambil fungsi ASLI dari source lewat brace-counting -- tapi sandbox-nya
 * pakai Proxy yang mengizinkan REFERENSI GLOBAL APAPUN (bukan cuma
 * property akses lewat document/window) supaya tidak perlu tahu/menebak
 * satu-satu semua nama global yang dipakai tiap fungsi (mis. Kasir,
 * renderProductList, curCnTab, dst di 8 file berbeda). Nama yang tidak
 * dikenal otomatis jadi permissive stub (no-op kalau dipanggil); nama yang
 * memang dikasih lewat `extraGlobals` (mis. spy `scrollTabBarIntoView`)
 * tetap dipakai apa adanya.
 *
 * Batasan yang disengaja sama seperti loadSource(): hanya untuk fungsi
 * yang TIDAK butuh DOM sungguhan (baca/tulis lewat stub permisif saja
 * cukup) -- di sini kita cuma perlu tahu APAKAH scrollTabBarIntoView()
 * dipanggil, bukan verifikasi detail render tiap tab.
 */
function extractFunctionAutoStub(file, fnName, extraGlobals = {}) {
  const fullPath = path.join(ROOT, file);
  const src = fs.readFileSync(fullPath, 'utf8');
  const marker = `function ${fnName}(`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`extractFunctionAutoStub: "${marker}" tidak ditemukan di ${file}`);
  const braceOpen = src.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  const snippet = src.slice(start, i);

  const known = { console, Date, Math, JSON, Number, String, Boolean, Array, Object, RegExp, Map, Set, Promise, setTimeout: () => 0, clearTimeout: () => {}, ...extraGlobals };
  const store = new Map(Object.entries(known));
  const proxyHandler = {
    has() { return true; },
    get(target, prop) {
      if (prop === Symbol.unscopables) return undefined;
      if (store.has(prop)) return store.get(prop);
      const stub = makePermissiveStub(String(prop));
      store.set(prop, stub);
      return stub;
    },
    set(target, prop, value) {
      store.set(prop, value);
      return true;
    },
  };
  const sandbox = new Proxy({}, proxyHandler);
  const context = vm.createContext(sandbox);
  new vm.Script(`${snippet}\nthis.__fn = ${fnName};`, { filename: `${file}#${fnName}` }).runInContext(context);
  return context.__fn;
}

module.exports = { loadSource, makePermissiveStub, extractFunction, extractFunctionAutoStub };
