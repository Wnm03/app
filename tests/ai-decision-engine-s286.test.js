'use strict';
// tests/ai-decision-engine-s286.test.js — S286, prioritas tinggi dari audit
// Regression Test (temuan: ai-decision-engine.js 0 test sama sekali padahal
// jadi "otak" AI lintas modul — dipakai banyak konsumen: rule registry,
// evaluator, learn/confidence, decide() orkestrator). Cakupan sesi ini:
// kontrak generik AIDecision.rules/.recommend/.learn/.decide()/
// .formatRecommendation() (bukan rule domain spesifik yang didaftarkan
// modul lain). Pola loadSource + mock IDBStore identik
// tests/backup-restore-regression-s266.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  const stores = {};
  const IDBStore = {
    get: async (k) => stores[k],
    set: async (k, v) => { stores[k] = v; return true; },
  };
  const ctx = loadSource(
    ['modules/ai/ai-core.js', 'modules/ai/ai-decision-engine.js'],
    { IDBStore },
    ['AIDecision']
  );
  return ctx;
}

function ruleAlways(id, over = {}) {
  return Object.assign({
    id, category: 'test', severity: 'warning', weight: 5, cooldownHours: 0,
    condition: () => true,
    action: () => ({ message: `pesan ${id}` }),
  }, over);
}

// ---- rules.register/unregister/getAll ----

test('AIDecision.rules.register: rule valid diterima, muncul di getAll()', () => {
  const { AIDecision } = makeCtx();
  const ok = AIDecision.rules.register(ruleAlways('r1'));
  assert.equal(ok, true);
  assert.equal(AIDecision.rules.getAll().length, 1);
});

test('AIDecision.rules.register: rule invalid (condition bukan function) ditolak, tidak throw', () => {
  const { AIDecision } = makeCtx();
  const ok = AIDecision.rules.register(ruleAlways('r1', { condition: 'bukan-function' }));
  assert.equal(ok, false);
  assert.equal(AIDecision.rules.getAll().length, 0);
});

test('AIDecision.rules.register: id duplikat ditolak (skip diam-diam)', () => {
  const { AIDecision } = makeCtx();
  assert.equal(AIDecision.rules.register(ruleAlways('dup')), true);
  assert.equal(AIDecision.rules.register(ruleAlways('dup')), false);
  assert.equal(AIDecision.rules.getAll().length, 1);
});

test('AIDecision.rules.unregister: menghapus rule berdasar id', () => {
  const { AIDecision } = makeCtx();
  AIDecision.rules.register(ruleAlways('r1'));
  assert.equal(AIDecision.rules.unregister('r1'), true);
  assert.equal(AIDecision.rules.getAll().length, 0);
  assert.equal(AIDecision.rules.unregister('tidak-ada'), false);
});

// ---- rules.evaluate ----

test('AIDecision.rules.evaluate: rule triggered muncul di hasil, terurut severity critical>warning>info', () => {
  const { AIDecision } = makeCtx();
  AIDecision.rules.register(ruleAlways('info1', { severity: 'info' }));
  AIDecision.rules.register(ruleAlways('crit1', { severity: 'critical' }));
  AIDecision.rules.register(ruleAlways('warn1', { severity: 'warning' }));
  const triggered = AIDecision.rules.evaluate({});
  assert.equal(triggered.map((t) => t.ruleId).join(','), 'crit1,warn1,info1');
});

test('AIDecision.rules.evaluate: rule enabled=false tidak pernah dievaluasi', () => {
  const { AIDecision } = makeCtx();
  AIDecision.rules.register(ruleAlways('off1', { enabled: false }));
  assert.equal(AIDecision.rules.evaluate({}).length, 0);
});

test('AIDecision.rules.evaluate: rule yang condition()-nya throw tidak menjatuhkan rule lain', () => {
  const { AIDecision } = makeCtx();
  AIDecision.rules.register(ruleAlways('boom', { condition: () => { throw new Error('rusak'); } }));
  AIDecision.rules.register(ruleAlways('aman'));
  const triggered = AIDecision.rules.evaluate({});
  assert.equal(triggered.map((t) => t.ruleId).join(','), 'aman');
});

test('AIDecision.rules.evaluate: ctx.simulated=true tidak menandai cooldown (rule bisa trigger lagi)', async () => {
  const { AIDecision } = makeCtx();
  AIDecision.rules.register(ruleAlways('cd1', { cooldownHours: 24 }));
  AIDecision.rules.evaluate({ simulated: true });
  AIDecision.rules.evaluate({ simulated: true });
  const triggered = AIDecision.rules.evaluate({ simulated: true });
  assert.equal(triggered.length, 1); // masih trigger ke-3 kalinya
});

test('AIDecision.rules.evaluate: cooldown nyata (bukan simulated) mencegah trigger ulang', async () => {
  const { AIDecision } = makeCtx();
  AIDecision.rules.register(ruleAlways('cd2', { cooldownHours: 24 }));
  const first = AIDecision.rules.evaluate({});
  const second = AIDecision.rules.evaluate({});
  assert.equal(first.length, 1);
  assert.equal(second.length, 0); // masih dalam cooldown
});

// ---- recommend registry ----

test('AIDecision.recommend.register/getById: sukses & lookup', () => {
  const { AIDecision } = makeCtx();
  assert.equal(AIDecision.recommend.register('rec1', { label: 'Cek Restock', target: 'shop' }), true);
  const found = AIDecision.recommend.getById('rec1');
  assert.equal(found.label, 'Cek Restock');
  assert.equal(found.target, 'shop');
  assert.equal(AIDecision.recommend.getById('tidak-ada'), null);
});

test('AIDecision.recommend.register: def tanpa label ditolak', () => {
  const { AIDecision } = makeCtx();
  assert.equal(AIDecision.recommend.register('rec2', { target: 'shop' }), false);
});

// ---- learn (async, persist ke IDBStore mock) ----

test('AIDecision.learn.recordOutcome/getStats/getConfidence: siklus penuh', async () => {
  const { AIDecision } = makeCtx();
  await AIDecision.learn.recordOutcome('r1', 'accepted');
  await AIDecision.learn.recordOutcome('r1', 'accepted');
  await AIDecision.learn.recordOutcome('r1', 'rejected');
  const stats = await AIDecision.learn.getStats('r1');
  assert.equal(stats.accepted, 2);
  assert.equal(stats.rejected, 1);
  assert.equal(stats.ignored, 0);
  const conf = await AIDecision.learn.getConfidence('r1');
  assert.equal(conf, 2 / 3);
});

test('AIDecision.learn.getConfidence: default 0.5 (netral) kalau belum ada data', async () => {
  const { AIDecision } = makeCtx();
  assert.equal(await AIDecision.learn.getConfidence('belum-pernah'), 0.5);
});

test('AIDecision.learn.recordOutcome: outcome tidak valid diabaikan (return null)', async () => {
  const { AIDecision } = makeCtx();
  assert.equal(await AIDecision.learn.recordOutcome('r1', 'salah'), null);
});

// ---- decide() orkestrator ----

test('AIDecision.decide(): rule triggered -> decisionLog terisi, formatRecommendation dipanggil', async () => {
  const { AIDecision } = makeCtx();
  AIDecision.rules.register(ruleAlways('d1', { weight: 8 }));
  const result = await AIDecision.decide({});
  assert.equal(result.simulated, false);
  assert.equal(result.decisions.length, 1);
  assert.equal(result.recommendations.length, 1);
  assert.equal(result.recommendations[0].confidence, 0.8);
  const stats = await AIDecision.learn.getStats('d1'); // pastikan tidak crash lintas API
  assert.equal(stats.accepted, 0);
  assert.equal(stats.rejected, 0);
  assert.equal(stats.ignored, 0);
});

test('AIDecision.decide(): ctx.simulated=true TIDAK menulis decisionLog', async () => {
  const { AIDecision } = makeCtx();
  AIDecision.rules.register(ruleAlways('d2'));
  const result = await AIDecision.decide({ simulated: true });
  assert.equal(result.simulated, true);
  assert.equal(result.decisions.length, 0); // sengaja kosong (read-only)
  assert.equal(result.recommendations.length, 1); // tapi rekomendasi tetap terbentuk
});

test('AIDecision.decide(): tidak ada rule triggered -> decisions & recommendations kosong', async () => {
  const { AIDecision } = makeCtx();
  const result = await AIDecision.decide({});
  assert.equal(result.decisions.length, 0);
  assert.equal(result.recommendations.length, 0);
});

// ---- formatRecommendation ----

test('AIDecision.formatRecommendation: fallback title dari message kalau tidak ada title/rec', () => {
  const { AIDecision } = makeCtx();
  AIDecision.rules.register(ruleAlways('fr1', { weight: 3 }));
  const rec = AIDecision.formatRecommendation({ id: 'x', ruleId: 'fr1', severity: 'info', message: 'Pesan panjang sekali untuk dipotong jadi 60 karakter saja seharusnya' });
  assert.equal(rec.priority, 'MEDIUM');
  assert.equal(rec.confidence, 0.3);
  assert.ok(rec.title.length <= 60);
});

test('AIDecision.formatRecommendation: input null/invalid -> return null (tidak throw)', () => {
  const { AIDecision } = makeCtx();
  assert.equal(AIDecision.formatRecommendation(null), null);
  assert.equal(AIDecision.formatRecommendation('bukan-object'), null);
});
