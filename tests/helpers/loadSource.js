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
    window: makePermissiveStub('window'),
    navigator: makePermissiveStub('navigator'),
    localStorage: makePermissiveStub('localStorage'),
    location: makePermissiveStub('location'),
    URLSearchParams: URLSearchParams,
    crypto: globalThis.crypto,
    TextEncoder: globalThis.TextEncoder,
    TextDecoder: globalThis.TextDecoder,
    btoa: globalThis.btoa,
    atob: globalThis.atob,
    ...extraGlobals,
  };
  const context = vm.createContext(sandbox);
  for (const file of files) {
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

module.exports = { loadSource, makePermissiveStub, extractFunction };
