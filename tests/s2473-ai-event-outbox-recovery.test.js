const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function loadCore() {
  const db = new Map();
  const ctx = {
    console,
    Date,
    Promise,
    Map,
    Object,
    Array,
    String,
    Number,
    JSON,
    IDBStore: {
      async get(k) { return db.get(k); },
      async set(k,v) { db.set(k, JSON.parse(JSON.stringify(v))); return true; },
    },
    window: {},
    D: null,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('modules/ai/ai-core.js','utf8'), ctx, {filename:'ai-core.js'});
  return {ctx, db};
}

test('S2473: async AI consumer failure becomes durable recovery event', async () => {
  const {ctx, db} = loadCore();
  let calls = 0;
  ctx.window.AIBus.on('product.updated', async () => {
    calls++;
    if (calls === 1) throw new Error('consumer-down');
  });
  ctx.window.AIBus.emit('product.updated', {productId:'p1'});
  await new Promise(r => setTimeout(r, 10));
  const q = db.get('ai:event-outbox:v1');
  assert.equal(Array.isArray(q), true);
  assert.equal(q.length, 1);
  assert.equal(q[0].type, 'product.updated');
  assert.equal(q[0].payload.productId, 'p1');
  assert.ok(q[0].eventId);
});

test('S2473: replay removes only after async consumer succeeds and is idempotent', async () => {
  const {ctx, db} = loadCore();
  let calls = 0;
  ctx.window.AIBus.on('asset.updated', async (_payload, meta) => {
    calls++;
    assert.ok(meta && meta.eventId);
  });
  db.set('ai:event-outbox:v1', [{eventId:'ai-replay-1',type:'asset.updated',payload:{assetId:'a1'},meta:{eventId:'ai-replay-1'},attempts:0}]);
  const n = await ctx.aiReplayEventOutbox();
  assert.equal(n, 1);
  assert.equal(db.get('ai:event-outbox:v1').length, 0);
  assert.equal(calls, 1);
  const n2 = await ctx.aiReplayEventOutbox();
  assert.equal(n2, 0);
  assert.equal(calls, 1);
});

test('S2473: failed replay keeps head event for retry', async () => {
  const {ctx, db} = loadCore();
  let fail = true;
  ctx.window.AIBus.on('investment.updated', async () => { if (fail) throw new Error('still-down'); });
  db.set('ai:event-outbox:v1', [{eventId:'ai-retry-1',type:'investment.updated',payload:{holdingId:'h1'},meta:{eventId:'ai-retry-1'},attempts:0}]);
  const n = await ctx.aiReplayEventOutbox();
  assert.equal(n, 0);
  assert.equal(db.get('ai:event-outbox:v1').length, 1);
  assert.equal(db.get('ai:event-outbox:v1')[0].attempts, 1);
  fail = false;
  const n2 = await ctx.aiReplayEventOutbox();
  assert.equal(n2, 1);
  assert.equal(db.get('ai:event-outbox:v1').length, 0);
});

test('S2473: replay and a concurrent enqueue cannot overwrite each other', async () => {
  const {ctx, db} = loadCore();
  let release;
  const gate = new Promise(r => { release = r; });
  ctx.window.AIBus.on('vehicle.updated', async () => { await gate; });
  ctx.window.AIBus.on('asset.updated', async () => { throw new Error('asset-down'); });
  db.set('ai:event-outbox:v1', [{eventId:'ai-race-1',type:'vehicle.updated',payload:{vehicleId:'v1'},meta:{eventId:'ai-race-1'},attempts:0}]);
  const replay = ctx.aiReplayEventOutbox();
  const enqueue = new Promise(resolve => setTimeout(() => { ctx.window.AIBus.emit('asset.updated',{assetId:'a2'}); resolve(); }, 0));
  release();
  await Promise.all([replay, enqueue]);
  await new Promise(r => setTimeout(r, 10));
  const q = db.get('ai:event-outbox:v1') || [];
  assert.equal(q.some(x => x.eventId === 'ai-race-1'), false);
  assert.equal(q.some(x => x.type === 'asset.updated' && x.payload.assetId === 'a2'), true);
});
