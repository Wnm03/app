'use strict';
// tests/eie-registry.test.js — cakupan pertama untuk economic-intelligence/
// eie-registry.js (Plugin registry EIE: registerIndicator/registerRule
// custom TANPA mengubah rule-engine.js). Sebelumnya NOL test sama sekali.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeRegistry() {
  return loadSource([
    'economic-intelligence/rules/rule-schema.js',
    'economic-intelligence/rules/rule-definitions.js',
    'economic-intelligence/eie-registry.js',
  ], {}, ['EIE_RULES', 'EIERegistry']);
}

function validRule(overrides = {}) {
  return {
    id: 'R-CUSTOM-001',
    category: 'custom',
    condition: () => true,
    action: () => ({ message: 'x', recommendationId: 'REC-X' }),
    severity: 'info',
    weight: 3,
    cooldownDays: 7,
    ...overrides,
  };
}

test('EIERegistry.getRules() — tanpa rule custom, mengembalikan persis EIE_RULES bawaan', () => {
  const { EIERegistry, EIE_RULES } = makeRegistry();
  assert.equal(EIERegistry.getRules().length, EIE_RULES.length);
});

test('EIERegistry.registerRule() — rule valid diterima, getRules() bertambah 1 & tetap membawa EIE_RULES bawaan', () => {
  const { EIERegistry, EIE_RULES } = makeRegistry();
  const before = EIE_RULES.length;
  const ok = EIERegistry.registerRule(validRule());
  assert.equal(ok, true);
  const rules = EIERegistry.getRules();
  assert.equal(rules.length, before + 1);
  assert.ok(rules.some((r) => r.id === 'R-CUSTOM-001'));
});

test('EIERegistry.registerRule() — rule tanpa field wajib (mis. condition bukan function) DITOLAK, tidak masuk getRules()', () => {
  const { EIERegistry, EIE_RULES } = makeRegistry();
  const before = EIE_RULES.length;
  const ok = EIERegistry.registerRule({ id: 'R-BAD', category: 'x', severity: 'info', weight: 1, cooldownDays: 0 });
  assert.equal(ok, false);
  assert.equal(EIERegistry.getRules().length, before, 'rule invalid TIDAK BOLEH menambah jumlah rule aktif');
});

test('EIERegistry.registerRule() — severity di luar daftar valid (info/warning/critical) DITOLAK', () => {
  const { EIERegistry } = makeRegistry();
  const ok = EIERegistry.registerRule(validRule({ severity: 'urgent' }));
  assert.equal(ok, false);
});

test('EIERegistry.registerRule() — rule.enabled default true kalau tidak diisi', () => {
  const { EIERegistry } = makeRegistry();
  const rule = validRule({ id: 'R-CUSTOM-002' });
  delete rule.enabled;
  EIERegistry.registerRule(rule);
  const found = EIERegistry.getRules().find((r) => r.id === 'R-CUSTOM-002');
  assert.equal(found.enabled, true);
});

test('EIERegistry.registerRule() — rule.enabled:false eksplisit TETAP dihormati (tidak dipaksa true)', () => {
  const { EIERegistry } = makeRegistry();
  EIERegistry.registerRule(validRule({ id: 'R-CUSTOM-003', enabled: false }));
  const found = EIERegistry.getRules().find((r) => r.id === 'R-CUSTOM-003');
  assert.equal(found.enabled, false);
});

test('EIERegistry.registerIndicator() — indicator custom tersimpan & bisa dibaca lewat getCustomIndicators()', () => {
  const { EIERegistry } = makeRegistry();
  EIERegistry.registerIndicator('nikel', { label: 'Harga Nikel', unit: 'USD/ton' });
  const indicators = EIERegistry.getCustomIndicators();
  assert.equal(indicators.nikel.label, 'Harga Nikel');
});

test('EIERegistry.registerIndicator() — dipanggil tanpa id atau def bukan object -> throw error (bukan silent fail)', () => {
  const { EIERegistry } = makeRegistry();
  assert.throws(() => EIERegistry.registerIndicator(null, { label: 'x' }));
  assert.throws(() => EIERegistry.registerIndicator('nikel', 'bukan-object'));
});
