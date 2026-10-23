'use strict';
// S2641 P0-6..P0-9 — tampilan saja: scroll-padding sticky, --kb-h keyboard, kontras light, lipatan Status Order.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const CSS = read('modern-ui-layer.css');
const UX = read('modules/shared/pwa-ux-performance.js');
const MODALS = read('modules/shared/modals.js');

test('S2641 P0-6: .modal punya scroll-padding-bottom untuk tombol sticky', () => {
  assert.match(CSS, /\.modal\s*\{\s*scroll-padding-bottom:\s*96px;\s*\}/);
});

test('S2641 P0-7: aturan CSS --kb-h tidak mengubah tinggi bawaan saat keyboard tertutup', () => {
  assert.match(CSS, /\.overlay\.open\s*\{\s*padding-bottom:\s*var\(--kb-h,\s*0px\)/);
  assert.match(CSS, /max-height:\s*min\(90dvh,\s*calc\(100dvh - var\(--kb-h,\s*0px\) - 8px\)\)/);
});

function runUx(vv, innerHeight) {
  const writes = [];
  const listeners = {};
  const root = { clientWidth: 390, style: { setProperty: (n, v) => writes.push([n, v]) } };
  const window = {
    innerWidth: 390, innerHeight, addEventListener() {},
    visualViewport: vv && Object.assign({ addEventListener: (n, f) => { (listeners[n] = listeners[n] || []).push(f); } }, vv)
  };
  const document = { documentElement: root, body: { classList: { toggle() {} } }, readyState: 'complete', addEventListener() {}, querySelectorAll() { return []; }, getElementById() { return null; } };
  vm.runInNewContext(UX, { window, document, navigator: { onLine: true }, globalThis: window, requestAnimationFrame: (f) => 1, setTimeout, clearTimeout, setInterval() { return 1; }, WeakMap, Math, Number, Array, String, Object, MutationObserver: undefined, getComputedStyle: () => ({ display: 'none' }) }, { filename: 'pwa-ux-performance.js' });
  return { writes, listeners, window };
}

test('S2641 P0-7: --kb-h = tinggi window - visual viewport, 0 bila kecil / zoom', () => {
  const r = runUx({ height: 844, offsetTop: 0, scale: 1 }, 844);
  assert.deepEqual(r.writes.filter((w) => w[0] === '--kb-h'), [], 'tidak menulis saat keyboard tertutup');
  r.window.visualViewport.height = 514;
  r.listeners.resize.forEach((f) => f());
  assert.deepEqual(r.writes.filter((w) => w[0] === '--kb-h').pop(), ['--kb-h', '330px']);
  r.window.visualViewport.scale = 2; // pinch-zoom bukan keyboard
  r.listeners.resize.forEach((f) => f());
  assert.deepEqual(r.writes.filter((w) => w[0] === '--kb-h').pop(), ['--kb-h', '0px']);
  r.window.visualViewport.scale = 1; r.window.visualViewport.height = 800; // URL bar kecil (<80px)
  r.listeners.resize.forEach((f) => f());
  assert.deepEqual(r.writes.filter((w) => w[0] === '--kb-h').pop(), ['--kb-h', '0px']);
});

test('S2641 P0-8: blok kontras Light/Modern ada dan Dark tidak disentuh', () => {
  assert.match(CSS, /\[data-theme="light"\] \.gaji-result-main,\s*\n\[data-theme="modern"\] \.gaji-result-main\s*\{\s*color:\s*var\(--accent3-onlight\)/);
  assert.match(CSS, /\[data-theme="light"\] \.btn-primary,\s*\n\[data-theme="modern"\] \.btn-primary\s*\{\s*\n\s*background:\s*linear-gradient/);
  assert.match(CSS, /input::placeholder, textarea::placeholder/);
  assert.match(CSS, /\[data-theme="dark"\], \[data-theme="graphite"\] \{ color-scheme: dark; \}/);
  assert.match(CSS, /\[data-theme="light"\], \[data-theme="modern"\] \{ color-scheme: light; \}/);
  assert.doesNotMatch(CSS, /\[data-theme="dark"\] \.btn-primary/);
});

test('S2641 P0-9: Status & Profit Summary Order dilipat, id & tombol Hapus tetap', () => {
  const i = MODALS.indexOf('id=\\"orderModal\\"');
  const seg = MODALS.slice(i, MODALS.indexOf('customerDetailModal', i));
  assert.match(seg, /<details class=\\"sheet-fold\\" id=\\"orderStatusFold\\">/);
  assert.ok(!/<details[^>]*\sopen[\s>]/.test(seg), 'tertutup bawaan');
  const fold = seg.slice(seg.indexOf('orderStatusFold'), seg.indexOf('</details>'));
  assert.ok(fold.includes('id=\\"orderBusinessStatusList\\"') && fold.includes('id=\\"orderProfitSummaryList\\"'));
  assert.ok(seg.indexOf('</details>') < seg.indexOf('id=\\"orderDelBtn\\"'), 'tombol Hapus tetap anak langsung modal, di luar lipatan');
  assert.ok(seg.includes('data-action=\\"saveOrder\\"') && seg.includes('data-action=\\"Order.deleteFromModal\\"'));
});

test('S2641 P0-9: helper lipatan hanya membaca (mengatur atribut open) dan dilepas aman tanpa MutationObserver', () => {
  assert.match(UX, /PWAUX\.installOrderStatusFold=function/);
  assert.match(UX, /fold\.open=edit/);
});
