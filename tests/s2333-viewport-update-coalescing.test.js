'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'modules/shared/pwa-ux-performance.js'), 'utf8');

test('S2333 coalesces viewport event bursts into one animation-frame update', () => {
  const windowListeners = {};
  const viewportListeners = {};
  const writes = [];
  const toggles = [];
  const callbacks = [];
  const root = { clientWidth: 320, style: { setProperty: (name, value) => writes.push([name, value]) } };
  const body = { classList: { toggle: (name, value) => toggles.push([name, value]) } };
  const document = {
    documentElement: root,
    body,
    readyState: 'complete',
    addEventListener() {},
    querySelectorAll() { return []; },
    getElementById() { return null; }
  };
  const window = {
    innerWidth: 320,
    innerHeight: 640,
    visualViewport: { height: 640, addEventListener: (name, fn) => { viewportListeners[name] = fn; } },
    addEventListener: (name, fn) => { windowListeners[name] = fn; }
  };
  const context = {
    window, document, navigator: { onLine: true }, globalThis: window,
    requestAnimationFrame: (fn) => { callbacks.push(fn); return callbacks.length; },
    setTimeout, clearTimeout, setInterval() { return 1; },
    WeakMap, Math, Number, Array, String, Object
  };
  vm.runInNewContext(SOURCE, context, { filename: 'pwa-ux-performance.js' });
  assert.equal(writes.length, 2, 'initial state is applied synchronously once');
  writes.length = 0;
  window.innerWidth = 480;
  windowListeners.resize();
  window.innerWidth = 500;
  windowListeners.orientationchange();
  window.visualViewport.height = 300;
  viewportListeners.resize();
  assert.equal(callbacks.length, 1, 'a burst should schedule only one frame');
  callbacks[0]();
  assert.deepEqual(writes, [['--pwa-vw', '500px'], ['--pwa-vh', '300px']]);
  assert.deepEqual(toggles.slice(-2), [['pwa-landscape', false], ['pwa-keyboard-open', true]]);
});

test('S2333 keeps a timer fallback when requestAnimationFrame is unavailable', async () => {
  const listeners = {};
  const writes = [];
  const root = { clientWidth: 320, style: { setProperty: (name, value) => writes.push([name, value]) } };
  const document = { documentElement: root, body: { classList: { toggle() {} } }, readyState: 'complete', addEventListener() {}, querySelectorAll() { return []; }, getElementById() { return null; } };
  const window = { innerWidth: 320, innerHeight: 640, addEventListener: (name, fn) => { listeners[name] = fn; } };
  const context = { window, document, navigator: { onLine: true }, globalThis: window, setTimeout, clearTimeout, setInterval() { return 1; }, WeakMap, Math, Number, Array, String, Object };
  vm.runInNewContext(SOURCE, context, { filename: 'pwa-ux-performance.js' });
  writes.length = 0;
  listeners.resize();
  listeners.orientationchange();
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(writes.length, 2, 'timer fallback coalesces event bursts too');
});
