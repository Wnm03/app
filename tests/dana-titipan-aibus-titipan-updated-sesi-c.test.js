'use strict';
// tests/dana-titipan-aibus-titipan-updated-sesi-c.test.js — Sesi C: Dana
// Titipan (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §2i urutan poin 1 /
// §7 Sesi C Prioritas Sedang, AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md
// temuan #5). Domain ini SEBELUMNYA 0% Event Bus. Nama event: BARU
// `titipan.updated` (diputuskan di roadmap §2d poin 2, belum ada
// presedennya). 10 titik `save()` di 4 file ditambah emit, pola payload
// {kind, action, ...id} SAMA PERSIS account.updated/product.updated:
//   - dana-titipan-pool-api.js (2x): _addEntry() (opening_balance/deposit),
//     deleteEntry()
//   - dana-titipan-commitment-return-api.js (4x): saveCommitment()
//     (create/edit), deleteCommitment(), recordReturn(), deleteReturn()
//   - titipan-reconcile.js (3x): repairOwnerIdConsistency(),
//     repairDebtNameStaleness(), repairTransactionOwnerRefs()
//   - titipan-expense-flow.js (1x): submit()
// Listener `AIService.wireEvents()` disambungkan ke `titipan.updated`
// sekalian di sesi ini (pola sama §2e/§2f — hindari "pemancar tanpa
// radio" baru).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// ====================================================================
// Bagian 1 — dana-titipan-pool-api.js
// ====================================================================
function makePoolCtx(D) {
  let uidCounter = 0;
  const events = [];
  const ctx = loadSource(
    ['modules/finance/dana-titipan-pool-api.js'],
    {
      D,
      uid: () => 'p' + (++uidCounter),
      save: () => {},
      AIBus: { emit(name, payload) { events.push({ name, payload }); } },
    },
    ['DanaTitipanPoolAPI'],
  );
  ctx._events = events;
  return ctx;
}

test('DanaTitipanPoolAPI.addOpeningBalance() emit titipan.updated {kind:"pool",action:"opening_balance"}', () => {
  const D = { titipanPool: [] };
  const ctx = makePoolCtx(D);
  const rec = ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 1000000 });
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].name, 'titipan.updated');
  assert.equal(ctx._events[0].payload.kind, 'pool');
  assert.equal(ctx._events[0].payload.action, 'opening_balance');
  assert.equal(ctx._events[0].payload.entryId, rec.id);
});

test('DanaTitipanPoolAPI.addDeposit() emit titipan.updated {kind:"pool",action:"deposit"}', () => {
  const D = { titipanPool: [] };
  const ctx = makePoolCtx(D);
  const rec = ctx.DanaTitipanPoolAPI.addDeposit({ amount: 500000 });
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].payload.action, 'deposit');
  assert.equal(ctx._events[0].payload.entryId, rec.id);
});

test('DanaTitipanPoolAPI.deleteEntry() emit titipan.updated {kind:"pool",action:"delete"}', () => {
  const D = { titipanPool: [{ id: 'p1', amount: 1, type: 'deposit' }] };
  const ctx = makePoolCtx(D);
  const ok = ctx.DanaTitipanPoolAPI.deleteEntry('p1');
  assert.equal(ok, true);
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].payload.kind, 'pool');
  assert.equal(ctx._events[0].payload.action, 'delete');
  assert.equal(ctx._events[0].payload.entryId, 'p1');
});

test('DanaTitipanPoolAPI.deleteEntry() id tidak ditemukan -- 0 emit', () => {
  const D = { titipanPool: [] };
  const ctx = makePoolCtx(D);
  const ok = ctx.DanaTitipanPoolAPI.deleteEntry('tidak-ada');
  assert.equal(ok, false);
  assert.equal(ctx._events.length, 0);
});

test('DanaTitipanPoolAPI: AIBus tidak ada (typeof AIBus==="undefined") -- tidak throw', () => {
  const D = { titipanPool: [] };
  const ctx = loadSource(
    ['modules/finance/dana-titipan-pool-api.js'],
    { D, uid: () => 'p1', save: () => {} },
    ['DanaTitipanPoolAPI'],
  );
  assert.doesNotThrow(() => ctx.DanaTitipanPoolAPI.addDeposit({ amount: 1 }));
});

// ====================================================================
// Bagian 2 — dana-titipan-commitment-return-api.js
// ====================================================================
function makeCommitmentCtx(D) {
  const events = [];
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      AIBus: { emit(name, payload) { events.push({ name, payload }); } },
    },
    ['DanaTitipanPortfolioAPI'],
  );
  ctx._events = events;
  return ctx;
}

function baseCommitmentD(overrides) {
  return Object.assign({
    investments: [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1, currentPrice: 1, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    investmentTx: [], investmentWatchlist: [], assets: [], debts: [], titipanCommitments: [], titipanReturns: [],
  }, overrides || {});
}

test('saveCommitment() create emit titipan.updated {kind:"commitment",action:"create"}', () => {
  const D = baseCommitmentD();
  const ctx = makeCommitmentCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 1000000 });
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].payload.kind, 'commitment');
  assert.equal(ctx._events[0].payload.action, 'create');
  assert.equal(ctx._events[0].payload.ownerId, 'budi');
});

test('saveCommitment() edit (ownerId sudah ada) emit titipan.updated action:"edit"', () => {
  const D = baseCommitmentD({ titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }] });
  const ctx = makeCommitmentCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 1500000 });
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].payload.action, 'edit');
  assert.equal(ctx._events[0].payload.ownerId, 'budi');
});

test('deleteCommitment() emit titipan.updated {kind:"commitment",action:"delete"}', () => {
  const D = baseCommitmentD({ titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }] });
  const ctx = makeCommitmentCtx(D);
  const ok = ctx.DanaTitipanPortfolioAPI.deleteCommitment('budi');
  assert.equal(ok, true);
  assert.equal(ctx._events[0].payload.kind, 'commitment');
  assert.equal(ctx._events[0].payload.action, 'delete');
  assert.equal(ctx._events[0].payload.ownerId, 'budi');
});

test('removeOwnerLinkage() (delegasi ke deleteCommitment()) ikut emit -- 0 emit dobel', () => {
  const D = baseCommitmentD({ titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }] });
  const ctx = makeCommitmentCtx(D);
  ctx.DanaTitipanPortfolioAPI.removeOwnerLinkage('budi');
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].payload.action, 'delete');
});

test('recordReturn() emit titipan.updated {kind:"return",action:"create"}', () => {
  const D = baseCommitmentD({ titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }] });
  const ctx = makeCommitmentCtx(D);
  const rec = ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 100000 });
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].payload.kind, 'return');
  assert.equal(ctx._events[0].payload.action, 'create');
  assert.equal(ctx._events[0].payload.returnId, rec.id);
  assert.equal(ctx._events[0].payload.ownerId, 'budi');
});

test('deleteReturn() emit titipan.updated {kind:"return",action:"delete"}', () => {
  const D = baseCommitmentD({ titipanReturns: [{ id: 'r1', ownerId: 'budi', amount: 1 }] });
  const ctx = makeCommitmentCtx(D);
  const ok = ctx.DanaTitipanPortfolioAPI.deleteReturn('r1');
  assert.equal(ok, true);
  assert.equal(ctx._events[0].payload.kind, 'return');
  assert.equal(ctx._events[0].payload.action, 'delete');
  assert.equal(ctx._events[0].payload.returnId, 'r1');
});

test('deleteCommitment()/deleteReturn() id tidak ditemukan -- 0 emit', () => {
  const D = baseCommitmentD();
  const ctx = makeCommitmentCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.deleteCommitment('tidak-ada'), false);
  assert.equal(ctx.DanaTitipanPortfolioAPI.deleteReturn('tidak-ada'), false);
  assert.equal(ctx._events.length, 0);
});

// ====================================================================
// Bagian 3 — titipan-reconcile.js (require langsung, pola sama
// tests/titipan-reconcile.test.js / tests/s635-titipan-reconcile-
// transaction-owner-refs.test.js -- global.D/global.save/global.AIBus)
// ====================================================================
const TitipanReconcile = require('../modules/finance/titipan-reconcile.js');

function resetReconcileGlobals() {
  delete global.save;
  delete global.AIBus;
  delete global.resolveOwnerDefaultForAccount;
}

test('repairOwnerIdConsistency() emit titipan.updated {kind:"reconcile",action:"repair-owner-id"} kalau ada yg diunify', () => {
  resetReconcileGlobals();
  const events = [];
  global.AIBus = { emit(name, payload) { events.push({ name, payload }); } };
  global.save = () => {};
  global.D = {
    ownerRegistry: [{ id: 'budi_canon', name: 'Budi' }],
    assets: [{ id: 'a1', owners: [{ ownerId: 'budi_typo', ownerName: 'Budi', isSelf: false }] }],
    investments: [],
    debts: [],
  };
  // divergent group butuh checkOwnerIdConsistency() nemu >1 id utk nama sama
  global.D.assets.push({ id: 'a2', owners: [{ ownerId: 'budi_canon', ownerName: 'Budi', isSelf: false }] });
  const res = TitipanReconcile.repairOwnerIdConsistency();
  if (res.unified > 0) {
    assert.equal(events.length, 1);
    assert.equal(events[0].name, 'titipan.updated');
    assert.equal(events[0].payload.kind, 'reconcile');
    assert.equal(events[0].payload.action, 'repair-owner-id');
    assert.equal(events[0].payload.unified, res.unified);
  } else {
    assert.equal(events.length, 0);
  }
  resetReconcileGlobals();
});

test('repairDebtNameStaleness() emit titipan.updated {kind:"reconcile",action:"repair-debt-name"}', () => {
  resetReconcileGlobals();
  const events = [];
  global.AIBus = { emit(name, payload) { events.push({ name, payload }); } };
  global.save = () => {};
  global.D = {
    ownerRegistry: [{ id: 'o1', name: 'Budi Baru' }],
    assets: [{ id: 'a1', owners: [{ ownerId: 'o1', ownerName: 'Budi Baru', isSelf: false }] }],
    investments: [],
    debts: [{ id: 'd1', linkedOwnerId: 'o1', linkedAssetId: 'a1', name: 'Budi Lama' }],
  };
  const res = TitipanReconcile.repairDebtNameStaleness();
  assert.equal(res.synced, 1);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].payload, { kind: 'reconcile', action: 'repair-debt-name', synced: 1 });
  resetReconcileGlobals();
});

test('repairDebtNameStaleness() 0 stale -- 0 emit', () => {
  resetReconcileGlobals();
  const events = [];
  global.AIBus = { emit(name, payload) { events.push({ name, payload }); } };
  global.save = () => {};
  global.D = { ownerRegistry: [], assets: [], investments: [], debts: [] };
  const res = TitipanReconcile.repairDebtNameStaleness();
  assert.equal(res.synced, 0);
  assert.equal(events.length, 0);
  resetReconcileGlobals();
});

test('repairTransactionOwnerRefs() emit titipan.updated {kind:"reconcile",action:"repair-tx-owner-refs"}', () => {
  resetReconcileGlobals();
  const events = [];
  global.AIBus = { emit(name, payload) { events.push({ name, payload }); } };
  global.save = () => {};
  global.D = {
    assets: [], investments: [], debts: [],
    transactions: [{ id: 'tx1', accountId: 'acc1', deductionOwnerId: 'owner_lama' }],
  };
  global.resolveOwnerDefaultForAccount = () => ({ ok: true, owners: [{ ownerId: 'owner_baru' }] });
  const res = TitipanReconcile.repairTransactionOwnerRefs();
  assert.equal(res.fixed, 1);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].payload, { kind: 'reconcile', action: 'repair-tx-owner-refs', fixed: 1, cleared: 0 });
  resetReconcileGlobals();
});

test('titipan-reconcile.js: AIBus tidak ada -- repair tetap jalan tanpa throw', () => {
  resetReconcileGlobals();
  global.save = () => {};
  global.D = {
    ownerRegistry: [{ id: 'o1', name: 'Budi Baru' }],
    assets: [{ id: 'a1', owners: [{ ownerId: 'o1', ownerName: 'Budi Baru', isSelf: false }] }],
    investments: [],
    debts: [{ id: 'd1', linkedOwnerId: 'o1', linkedAssetId: 'a1', name: 'Budi Lama' }],
  };
  assert.doesNotThrow(() => TitipanReconcile.repairDebtNameStaleness());
  resetReconcileGlobals();
});

// ====================================================================
// Bagian 4 — titipan-expense-flow.js
// ====================================================================
function makeExpenseFlowCtx(D) {
  const events = [];
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/shared/filter-prefs-store.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
      'modules/finance/piutang-utang.js',
      'modules/finance/transaksi.js',
      'modules/finance/tx-list-cashflow.js',
      'modules/finance/titipan-expense-flow.js',
    ],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      todayStr: () => '2026-08-09',
      save: () => {},
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      sameId: (a, b) => a === b,
      askConfirm: async () => true,
      toast: () => {},
      renderDashboard: () => {}, renderKeuangan: () => {}, renderCnTab: () => {}, renderProductList: () => {},
      renderShop: () => {}, renderShopRecent: () => {}, renderStockList: () => {},
      AIBus: { emit(name, payload) { events.push({ name, payload }); } },
    },
    [
      'DanaTitipanPortfolioAPI', 'resolveTxTitipanOwner', 'applyTxTitipanLinkageOnSave',
      'maybeCreateTitipanTalanganPiutang', 'syncTitipanTalanganPiutangOnEdit',
      'removeUnpaidTitipanTalanganPiutangForTx', 'delTx', 'MultiOwnerEngine',
      'TitipanExpenseFlow',
    ],
  );
  ctx._events = events;
  return ctx;
}

function baseExpenseD(overrides) {
  return Object.assign({
    investments: [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1, currentPrice: 1, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    investmentTx: [], investmentWatchlist: [], debts: [], accounts: [{ id: 'acc1', name: 'Cash' }],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 1000000 }],
    titipanReturns: [], transactions: [], piutang: [], assets: [],
  }, overrides || {});
}

test('TitipanExpenseFlow.submit() emit titipan.updated {kind:"expense",action:"create"}', () => {
  const D = baseExpenseD();
  const ctx = makeExpenseFlowCtx(D);
  const res = ctx.TitipanExpenseFlow.submit({
    nominal: 100000, owners: [{ ownerId: 'budi' }], category: 'Belanja', subcategory: '',
    accountId: 'acc1', date: '2026-08-09', note: 'test',
  });
  assert.equal(res.ok, true);
  assert.equal(ctx._events.length, 1);
  assert.equal(ctx._events[0].name, 'titipan.updated');
  assert.equal(ctx._events[0].payload.kind, 'expense');
  assert.equal(ctx._events[0].payload.action, 'create');
  assert.equal(ctx._events[0].payload.txIds.length, res.txIds.length);
  assert.equal(ctx._events[0].payload.txIds[0], res.txIds[0]);
});

test('TitipanExpenseFlow.submit() validasi gagal (porsi multi-owner bukan 100) -- 0 emit', () => {
  const D = baseExpenseD({
    titipanCommitments: [
      { id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 1000000 },
      { id: 'c2', ownerId: 'cici', ownerName: 'Cici', principalAmount: 1000000 },
    ],
  });
  const ctx = makeExpenseFlowCtx(D);
  const res = ctx.TitipanExpenseFlow.submit({
    nominal: 100000, owners: [{ ownerId: 'budi', porsi: 50 }, { ownerId: 'cici', porsi: 40 }],
    category: 'Belanja', subcategory: '', accountId: 'acc1', date: '2026-08-09', note: 'test',
  });
  assert.equal(res.ok, false);
  assert.equal(ctx._events.length, 0);
});

// ====================================================================
// Bagian 5 — AIService.wireEvents() listener utk titipan.updated
// ====================================================================
function makeStubBus() {
  const handlers = {};
  return {
    on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); },
    emit(evt, payload) { (handlers[evt] || []).forEach((fn) => fn(payload)); },
  };
}

test('AIService.wireEvents() menyambungkan titipan.updated ke AIDecision.decide()', () => {
  const decideCalls = [];
  const AIBus = makeStubBus();
  const AIDecision = { decide(ctx) { decideCalls.push(ctx); return Promise.resolve({ decisions: [] }); } };
  const context = loadSource(['modules/ai/ai-service.js'], { AIBus, AIDecision }, ['AIService']);
  context.AIService.wireEvents();
  const payload = { kind: 'commitment', action: 'create', ownerId: 'budi' };
  AIBus.emit('titipan.updated', payload);
  assert.equal(decideCalls.length, 1);
  assert.equal(decideCalls[0].event, 'titipan.updated');
  assert.equal(decideCalls[0].payload, payload);
});

test('AIService.wireEvents() TIDAK regresi 7 event lama saat titipan.updated ditambah', () => {
  const decideCalls = [];
  const AIBus = makeStubBus();
  const AIDecision = { decide(ctx) { decideCalls.push(ctx); return Promise.resolve({ decisions: [] }); } };
  const context = loadSource(['modules/ai/ai-service.js'], { AIBus, AIDecision }, ['AIService']);
  context.AIService.wireEvents();
  const olds = ['finance.updated', 'asset.updated', 'vehicle.updated', 'delivery.created', 'account.updated', 'product.updated', 'investment.updated'];
  olds.forEach((evt) => AIBus.emit(evt, { evt }));
  assert.equal(decideCalls.length, olds.length);
  assert.deepEqual(decideCalls.map((c) => c.event), olds);
});
