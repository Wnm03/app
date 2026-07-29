'use strict';
// tests/lifeos-areas-icon-s281.test.js — cakupan baru untuk KNOWN-ISSUES.md
// §4.1 (Sesi 281): LifeOSAreas.render() sekarang pakai FeatureIcons.render()
// utk ikon area (pola sama dashboard-hub.js), + 2 mapping SVG baru
// (👨‍👩‍👧 family, 🏃 health) yang sebelumnya belum ada di FeatureIcons._MAP.
// Sebelum sesi ini LifeOSAreas.render() (lifeos/ui/areas.js) 0 test sama
// sekali.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeGrid() {
  const el = { innerHTML: '' };
  const doc = { getElementById: (id) => (id === 'lifeOSAreasGrid' ? el : null) };
  return { el, doc };
}

function makeContext(D, doc) {
  return loadSource(
    ['modules/shared/helper-teks.js', 'modules/shared/feature-icons.js', 'lifeos/lifeos-registry.js', 'lifeos/adapters/area-adapter.js', 'lifeos/ui/areas.js'],
    { document: doc, D },
    ['LifeOSAreas', 'FeatureIcons']
  );
}

test('FeatureIcons._MAP — punya mapping SVG utk semua emoji LIFEOS_AREAS (finance/business/kendaraan/family/health/spiritual)', () => {
  const { FeatureIcons } = loadSource(['modules/shared/feature-icons.js'], {}, ['FeatureIcons']);
  for (const emoji of ['💰', '🛒', '🚗', '👨‍👩‍👧', '🏃', '🕌']) {
    assert.ok(FeatureIcons._MAP[emoji], `emoji ${emoji} harus punya mapping SVG`);
  }
});

test('FeatureIcons.render() — emoji yang belum terpetakan -> fallback ke emoji aslinya (tidak pernah kosong/pecah)', () => {
  const { FeatureIcons } = loadSource(['modules/shared/feature-icons.js'], {}, ['FeatureIcons']);
  assert.equal(FeatureIcons.render('🆕'), '🆕');
  assert.equal(FeatureIcons.render(''), '');
});

test('LifeOSAreas.render() — ikon area dirender via FeatureIcons.render() (SVG), bukan emoji literal lagi', () => {
  const { doc, el } = makeFakeGrid();
  const D = {};
  const ctx = makeContext(D, doc);
  ctx.LifeOSAreas.render();
  assert.match(el.innerHTML, /<svg/, 'harus mengandung markup <svg>, bukan cuma emoji polos');
  assert.match(el.innerHTML, /lifeos-area-card/);
});

test('LifeOSAreas.render() — guard FeatureIcons tidak tersedia -> fallback escapeHtml(emoji), tidak error', () => {
  const { doc, el } = makeFakeGrid();
  const D = {};
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'lifeos/lifeos-registry.js', 'lifeos/adapters/area-adapter.js', 'lifeos/ui/areas.js'],
    { document: doc, D },
    ['LifeOSAreas']
  );
  assert.doesNotThrow(() => ctx.LifeOSAreas.render());
  assert.ok(el.innerHTML.length > 0);
  assert.doesNotMatch(el.innerHTML, /<svg/);
});

test('LifeOSAreas.render() — grid tidak ada di DOM -> return diam-diam, tidak error', () => {
  const doc = { getElementById: () => null };
  const D = {};
  const ctx = makeContext(D, doc);
  assert.doesNotThrow(() => ctx.LifeOSAreas.render());
});
