'use strict';
/**
 * eslint.config.js — konfigurasi ESLint (flat config, ESLint v9+) untuk
 * project Keluarga W.
 *
 * Install dulu (perlu koneksi internet, belum ter-install di environment
 * ini): npm install
 * Lalu jalankan: npm run lint   (atau: npm run lint:fix)
 *
 * Kenapa globals-nya di-generate otomatis, bukan daftar manual:
 * App ini terdiri dari puluhan file <script> global yang saling
 * mereferensi function/const satu sama lain secara langsung (didokumentasikan
 * di banyak komentar source, mis. "dipakai sbg variabel global saat
 * runtime") lalu digabung build.js jadi 1 bundle sebelum di-deploy. Artinya
 * `Zakat`, `D`, `save()`, `fmt()`, dst yang dideklarasikan di satu file sah
 * dipakai tanpa import di file lain. Daftar manual gampang basi tiap kali
 * ada modul/fungsi baru; scripts/collect-app-globals.js men-scan ulang
 * source tiap kali lint dijalankan, jadi otomatis ikut update.
 */
const { collectAppGlobals } = require('./scripts/collect-app-globals');

// Global bawaan browser/PWA yang dipakai app ini tapi bukan bagian dari
// source-nya sendiri (API browser + beberapa library eksternal yang
// dimuat lewat <script src> di index.html: html2canvas, Google
// Identity Services/Drive/Sheets API via `google`/`gapi`).
const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  location: 'readonly',
  history: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  requestIdleCallback: 'readonly',
  cancelIdleCallback: 'readonly',
  URLSearchParams: 'readonly',
  URL: 'readonly',
  Blob: 'readonly',
  FormData: 'readonly',
  Image: 'readonly',
  Notification: 'readonly',
  indexedDB: 'readonly',
  caches: 'readonly',
  self: 'readonly',
  crypto: 'readonly',
  atob: 'readonly',
  btoa: 'readonly',
  performance: 'readonly',
  matchMedia: 'readonly',
  ResizeObserver: 'readonly',
  MutationObserver: 'readonly',
  IntersectionObserver: 'readonly',
  CustomEvent: 'readonly',
  Event: 'readonly',
  XMLHttpRequest: 'readonly',
  WebSocket: 'readonly',
  Worker: 'readonly',
  alert: 'readonly',
  confirm: 'readonly',
  prompt: 'readonly',
  screen: 'readonly',
  getComputedStyle: 'readonly',
  structuredClone: 'readonly',
  BroadcastChannel: 'readonly',
  IDBKeyRange: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  Response: 'readonly',
  queueMicrotask: 'readonly',
  globalThis: 'readonly',
  CSS: 'readonly',
  event: 'readonly',
  // Service worker (sw.js) only:
  clients: 'readonly',
  registration: 'readonly',
  skipWaiting: 'readonly',
  // Library eksternal dimuat lewat <script src> di index.html:
  html2canvas: 'readonly',
  google: 'readonly',
  gapi: 'readonly',
  require: 'readonly',
  module: 'readonly',
  // External/lazy browser libraries and browser APIs used by feature modules.
  ZXing: 'readonly',
  pdfjsLib: 'readonly',
  Tesseract: 'readonly',
  eruda: 'readonly',
  XLSX: 'readonly',
  FileReader: 'readonly',
  // Intentional runtime global from the service-history SOT/lazy module.
  compareServiceHistoryRecency: 'readonly',
  // Optional legacy hooks intentionally referenced behind typeof guards.
  resolveTxAssetSplit: 'readonly',
  getServiceFinanceOwnershipIntegrity: 'readonly',
  aiEventOutboxFlush: 'readonly',
  aiEventOutboxRevision: 'readonly',
  aiEventOutboxSnapshot: 'readonly',
  aiEventOutboxClearFallback: 'readonly',
};

const appGlobals = collectAppGlobals();

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'backups/**',
      'app-bundle-a.min.js',
      'app-bundle-b.min.js',
      '**/*.min.js',
      'archive/**',
      '**/*.html',
      'docs/**',
      'tests/fixtures/**',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...browserGlobals, ...appGlobals },
    },
    rules: {
      // --- Bug class nyata yang pernah kejadian di project ini -----------
      'no-undef': 'error', // pernah ada file lupa urutan load -> ReferenceError di prod
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-redeclare': ['error', { builtinGlobals: false }],
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'no-fallthrough': 'error',
      'no-const-assign': 'error',
      'no-self-compare': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': ['error', 'except-parens'],
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'eqeqeq': ['warn', 'smart'],
      'no-var': 'off', // codebase konsisten pakai const/let, tapi tidak fatal kalau ada var lama
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-extra-semi': 'warn',
      'no-debugger': 'error',
    },
  },
  {
    // Node globals for repository tests/scripts and the service worker.
    files: ['sw.js', 'docs/sw.js', 'build.js', 'eslint.config.js', 'collect-app-globals.js', 'scripts/**/*.js', 'e2e/**/*.js', 'tests/**/*.js', 's2228-accumulated-baseline-integrity.test.js', 'test-runner-checkpoint-integrity-s1777.test.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setImmediate: 'readonly',
        queueMicrotask: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        Response: 'readonly',
      },
    },
  },
  {
    // Sebagian test memakai import/export ESM tetapi secara historis tercakup
    // override commonjs di atas. Override ini sengaja diletakkan paling bawah
    // agar sourceType: module menang atas commonjs tanpa mengubah runtime app.
    files: [
      'tests/accumulation-chain-replay-s2224.test.js',
      'tests/audit-post-s2529.test.js',
      'tests/car-notes-kzr2012-audit-v4.test.js',
      'tests/mockup-layout-v2-ui-audit.test.js',
      'tests/s2131-global-card-list-actions.test.js',
      'tests/s2184-shop-canonical-writer.test.js',
      'tests/s2206-residual-writer-sweep.test.js',
      'tests/s2309-direct-write-sot-bypass.test.js',
      'tests/s2310-event-outbox-duplicate-replay.test.js',
    ],
    languageOptions: { sourceType: 'module' },
  },
];
