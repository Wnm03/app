'use strict';
// tests/ai-service-wireevents-account-product-investment-sesi-c.test.js
//
// ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §2e/§7 Sesi C, keputusan §2d
// poin 3: "Wiring listener AIService.wireEvents() SEBELUM lanjut domain
// Event Bus baru" — event yang sudah emit tapi 0 listener sekarang lebih
// mendesak karena product.updated sudah 9/9 titik Shop/Cobek (v1662).
//
// modules/ai/ai-service.js wireEvents() SEBELUMNYA cuma listen
// 'finance.updated'/'asset.updated'/'vehicle.updated'/'delivery.created'.
// Audit ulang SEMUA `AIBus.emit(` di kode (bukan cuma yang disebut
// roadmap) nemu 3 event bisnis real yang sudah emit tapi 0 konsumen:
// 'account.updated' (Sesi C-lanjutan Akun), 'product.updated' (Sesi C
// Shop/Cobek), 'investment.updated' (modul investasi, preseden lebih
// lama tapi ketemu sekaligus saat audit). 'finance.updated{kind:zakat}'
// SENGAJA tidak dites di sini terpisah -- itu kind di dalam payload
// finance.updated, nama eventnya sama, sudah otomatis ke-cover listener
// 'finance.updated' yang sudah ada dari sesi sebelumnya (lihat baris
// terakhir describe di bawah, murni assert payload kind diteruskan apa
// adanya ke decide(), 0 logic baru).
//
// Harness: AIBus & AIDecision di-stub minimal (bukan AIBus/AIDecision
// asli) supaya wireEvents() bisa dites terisolasi tanpa perlu ai-core.js/
// ai-decision-engine.js ikut dimuat -- pola sama filosofi loadSource.js
// (ambil SOURCE ASLI ai-service.js, tapi dependency luarnya di-mock).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStubBus() {
  const handlers = {};
  return {
    on(evt, fn) {
      (handlers[evt] = handlers[evt] || []).push(fn);
    },
    emit(evt, payload) {
      (handlers[evt] || []).forEach((fn) => fn(payload));
    },
    _handlers: handlers,
  };
}

function makeCtx() {
  const decideCalls = [];
  const AIBus = makeStubBus();
  const AIDecision = {
    decide(ctx) {
      decideCalls.push(ctx);
      return Promise.resolve({ decisions: [] });
    },
  };
  const context = loadSource(['modules/ai/ai-service.js'], { AIBus, AIDecision }, ['AIService']);
  return { context, AIBus, decideCalls };
}

test('wireEvents() menyambungkan account.updated ke AIDecision.decide()', () => {
  const { context, AIBus, decideCalls } = makeCtx();
  context.AIService.wireEvents();
  const payload = { kind: 'account', action: 'edit', accId: 7 };
  AIBus.emit('account.updated', payload);
  assert.equal(decideCalls.length, 1);
  assert.equal(decideCalls[0].event, 'account.updated');
  assert.equal(decideCalls[0].payload, payload);
});

test('wireEvents() menyambungkan product.updated ke AIDecision.decide()', () => {
  const { context, AIBus, decideCalls } = makeCtx();
  context.AIService.wireEvents();
  const payload = { kind: 'price-reko', action: 'apply', productIds: [1, 2] };
  AIBus.emit('product.updated', payload);
  assert.equal(decideCalls.length, 1);
  assert.equal(decideCalls[0].event, 'product.updated');
  assert.equal(decideCalls[0].payload, payload);
});

test('wireEvents() menyambungkan investment.updated ke AIDecision.decide()', () => {
  const { context, AIBus, decideCalls } = makeCtx();
  context.AIService.wireEvents();
  const payload = { holdingId: 42 };
  AIBus.emit('investment.updated', payload);
  assert.equal(decideCalls.length, 1);
  assert.equal(decideCalls[0].event, 'investment.updated');
  assert.equal(decideCalls[0].payload, payload);
});

test('wireEvents() TIDAK regresi 4 event lama (finance/asset/vehicle/delivery)', () => {
  const { context, AIBus, decideCalls } = makeCtx();
  context.AIService.wireEvents();
  ['finance.updated', 'asset.updated', 'vehicle.updated', 'delivery.created'].forEach((evt) => {
    AIBus.emit(evt, { evt });
  });
  assert.equal(decideCalls.length, 4);
  assert.deepEqual(decideCalls.map((c) => c.event), [
    'finance.updated', 'asset.updated', 'vehicle.updated', 'delivery.created',
  ]);
  decideCalls.forEach((c, i) => {
    assert.equal(c.payload.evt, [
      'finance.updated', 'asset.updated', 'vehicle.updated', 'delivery.created',
    ][i]);
  });
});

test('finance.updated{kind:"zakat"} tetap lewat listener finance.updated yang sudah ada (0 entri baru dibutuhkan)', () => {
  const { context, AIBus, decideCalls } = makeCtx();
  context.AIService.wireEvents();
  const payload = { kind: 'zakat', action: 'save' };
  AIBus.emit('finance.updated', payload);
  assert.equal(decideCalls.length, 1);
  assert.equal(decideCalls[0].event, 'finance.updated');
  assert.equal(decideCalls[0].payload, payload);
});

test('wireEvents() idempotent -- panggilan kedua tidak dobel-wire (guard _wired)', () => {
  const { context, AIBus, decideCalls } = makeCtx();
  context.AIService.wireEvents();
  context.AIService.wireEvents();
  AIBus.emit('account.updated', { x: 1 });
  assert.equal(decideCalls.length, 1);
});
