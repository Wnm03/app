'use strict';
// S2552: menjalankan bundle MINIFY terkirim (A lalu B) di VM dengan stub browser minimal.
// Dipakai tes perilaku (opsi 2): hasil eksekusi nyata, bukan pencocokan teks.
// Hanya stub; tidak ada kode produksi yang diubah. Error top-level bundle ikut dilempar.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const noop = () => {};
const mkEl = (tag) => ({
  tagName: String(tag || 'div').toUpperCase(),
  style: { setProperty: noop, removeProperty: noop, getPropertyValue: () => '' },
  dataset: {}, children: [], childNodes: [],
  classList: { add: noop, remove: noop, toggle: () => false, contains: () => false },
  setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
  appendChild: (c) => c, removeChild: (c) => c, insertBefore: (c) => c,
  addEventListener: noop, removeEventListener: noop, click: noop, focus: noop, remove: noop,
  querySelector: () => null, querySelectorAll: () => [], closest: () => null, matches: () => false,
  getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
  innerHTML: '', textContent: '', value: ''
});

function makeContext() {
  const store = {};
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, clear: noop, key: () => null, length: 0 };
  const doc = {
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    getElementsByClassName: () => [], getElementsByTagName: () => [],
    createElement: mkEl, createTextNode: (t) => ({ textContent: String(t) }), createDocumentFragment: () => mkEl('frag'),
    addEventListener: noop, removeEventListener: noop,
    body: mkEl('body'), head: mkEl('head'), documentElement: mkEl('html'),
    visibilityState: 'visible', hidden: false, cookie: '', readyState: 'complete'
  };
  const ctx = {
    console: { log: noop, warn: noop, error: noop, info: noop, debug: noop },
    setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    requestAnimationFrame: () => 0, cancelAnimationFrame: noop, queueMicrotask: noop,
    structuredClone, TextEncoder, TextDecoder, URL, URLSearchParams, Blob, Promise, crypto: webcrypto,
    btoa: (s) => Buffer.from(String(s), 'binary').toString('base64'),
    atob: (s) => Buffer.from(String(s), 'base64').toString('binary'),
    document: doc, localStorage: ls, sessionStorage: ls,
    navigator: { userAgent: 'node', onLine: true, language: 'id-ID' },
    location: { href: 'http://localhost/', protocol: 'http:', hostname: 'localhost', search: '', hash: '', pathname: '/', origin: 'http://localhost', reload: noop },
    history: { pushState: noop, replaceState: noop, state: null, back: noop },
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop }),
    addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    Event: function Event() {}, CustomEvent: function CustomEvent() {},
    fetch: () => Promise.reject(new Error('no network in test VM')),
    innerWidth: 390, innerHeight: 800, scrollTo: noop, alert: noop, confirm: () => false, prompt: () => null, open: noop,
    Image: function Image() {}, FileReader: function FileReader() {}, XMLHttpRequest: function XMLHttpRequest() {},
    MutationObserver: function MutationObserver() { this.observe = noop; this.disconnect = noop; },
    IntersectionObserver: function IntersectionObserver() { this.observe = noop; this.disconnect = noop; },
    ResizeObserver: function ResizeObserver() { this.observe = noop; this.disconnect = noop; },
    performance: { now: () => Date.now(), mark: noop, measure: noop }
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  return vm.createContext(ctx);
}

function loadBundlesVm() {
  const ctx = makeContext();
  for (const f of ['app-bundle-a.min.js', 'app-bundle-b.min.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}

const evalIn = (ctx, code) => vm.runInContext(code, ctx);
module.exports = { loadBundlesVm, evalIn };
