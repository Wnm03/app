'use strict';
// V26 — regression untuk attachLifecycle scanner: re-attach pada video DOM yang
// sama wajib melepas listener lama terlebih dahulu; detach lalu benar-benar
// mengosongkan registry. Ini mencegah callback ganda/leak bila lifecycle hook
// terpanggil ulang secara defensif.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(source, names) {
  const listeners = { document: [], window: [] };
  const doc = {
    addEventListener(type, fn) { listeners.document.push([type, fn]); },
    removeEventListener(type, fn) {
      listeners.document = listeners.document.filter(([t, f]) => t !== type || f !== fn);
    },
  };
  const win = {
    addEventListener(type, fn) { listeners.window.push([type, fn]); },
    removeEventListener(type, fn) {
      listeners.window = listeners.window.filter(([t, f]) => t !== type || f !== fn);
    },
  };
  const ctx = loadSource([source], { document: doc, window: win }, names);
  return { ctx, listeners };
}

for (const [source, attachName, detachName] of [
  ['modules/vehicle/vehicle-scanner.js', 'vehicleScannerAttachLifecycle', 'vehicleScannerDetachLifecycle'],
  ['modules/vehicle/sparepart-scanner.js', 'sparepartScannerAttachLifecycle', 'sparepartScannerDetachLifecycle'],
]) {
  test(`V26 ${attachName}: re-attach video yang sama tidak menggandakan listener`, () => {
    const { ctx, listeners } = makeCtx(source, [attachName, detachName]);
    const video = {};
    const page1 = () => {};
    const page2 = () => {};
    const h1 = ctx[attachName](video, page1);
    assert.equal(listeners.document.length, 3);
    assert.equal(listeners.window.length, 1);

    const h2 = ctx[attachName](video, page2);
    assert.equal(listeners.document.length, 3);
    assert.equal(listeners.window.length, 1);
    assert.equal(listeners.window[0][1], page2);
    assert.notEqual(h1, h2);
  });

  test(`V26 ${detachName}: detach setelah re-attach membersihkan semua listener`, () => {
    const { ctx, listeners } = makeCtx(source, [attachName, detachName]);
    const video = {};
    const handlers = ctx[attachName](video, () => {});
    ctx[attachName](video, () => {});
    ctx[detachName](handlers);
    // handlers lama tidak boleh menghapus registry/listener milik handlers baru.
    assert.equal(listeners.document.length, 3);
    assert.equal(listeners.window.length, 1);
    const current = ctx[attachName](video, () => {});
    ctx[detachName](current);
    assert.equal(listeners.document.length, 0);
    assert.equal(listeners.window.length, 0);
  });
}
