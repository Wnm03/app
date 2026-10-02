import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadServiceOutbox() {
  const src = fs.readFileSync('modules/vehicle/service-event-adapter.js', 'utf8');
  const storage = new Map();
  const ctx = {
    module: { exports: {} }, exports: {},
    localStorage: {
      getItem: k => storage.has(k) ? storage.get(k) : null,
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: k => storage.delete(k),
    },
    window: {},
  };
  vm.runInNewContext(src, ctx);
  return ctx.module.exports.ServiceEventOutbox;
}

test('S2310: ServiceEventOutbox duplicate identity is idempotent', () => {
  const outbox = loadServiceOutbox();
  const evt = { type: 'vehicle.updated', payload: { id: 'v1', vehicleId: 'v1', action: 'edit', kind: 'vehicle' } };
  assert.equal(outbox.enqueue(evt), true);
  assert.equal(outbox.enqueue(evt), false);
  assert.equal(outbox.pending().length, 1);
});

test('S2310: ServiceEventOutbox preserves distinct vehicle actions', () => {
  const outbox = loadServiceOutbox();
  assert.equal(outbox.enqueue({ type: 'vehicle.updated', payload: { id: 'v1', vehicleId: 'v1', action: 'edit', kind: 'vehicle' } }), true);
  assert.equal(outbox.enqueue({ type: 'vehicle.updated', payload: { id: 'v1', vehicleId: 'v1', action: 'delete', kind: 'vehicle' } }), true);
  assert.equal(outbox.pending().length, 2);
});

test('S2310: failed async replay retains the failed head and does not skip later events', async () => {
  const outbox = loadServiceOutbox();
  outbox.enqueue({ type: 'finance.updated', payload: { id: 'f1' } });
  outbox.enqueue({ type: 'finance.updated', payload: { id: 'f2' } });
  const seen = [];
  const n = await outbox.drainAsync(async evt => {
    seen.push(evt.payload.id);
    throw new Error('simulated consumer failure');
  });
  assert.equal(n, 0);
  assert.deepEqual(Array.from(seen), ['f1']);
  assert.deepEqual(Array.from(outbox.pending().map(x => x.payload.id)), ['f1', 'f2']);
});

test('S2310: AIBus source contract provides stable metadata to durable replay', () => {
  const bus = fs.readFileSync('modules/ai/ai-core.js', 'utf8');
  const outbox = fs.readFileSync('modules/finance/finance-event-outbox.js', 'utf8');
  assert.match(bus, /emit\(eventName, payload, meta\)/);
  assert.match(bus, /optional delivery metadata carries a stable outbox eventId/);
  assert.match(outbox, /eventId:item\.eventId\|\|item\.id/);
  assert.match(outbox, /source:'finance-event-outbox'/);
});
