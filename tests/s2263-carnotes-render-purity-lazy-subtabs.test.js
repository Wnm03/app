'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('S2263 service history renderers do not invoke normalizers or legacy migration', () => {
  const s = read('modules/vehicle/servis-b.js');
  const list = s.slice(s.indexOf('renderList(opts){'), s.indexOf('\n},', s.indexOf('renderList(opts){')));
  const reminder = s.slice(s.indexOf('renderReminder(){'), s.indexOf('\n},', s.indexOf('renderReminder(){')));
  assert.doesNotMatch(list, /ServiceHistorySOTNormalizer\.apply|normalizeLegacyServiceLogs/);
  assert.doesNotMatch(reminder, /ServiceHistorySOTNormalizer\.apply|normalizeLegacyServiceLogs/);
});

test('S2263 sparepart category renderer is presentation-only', () => {
  const s = read('modules/vehicle/sparepart-servis.js');
  const start = s.indexOf('renderCatList(){');
  const end = s.indexOf('\n},', start);
  const renderer = s.slice(start, end);
  assert.doesNotMatch(renderer, /ensureCanonicalSparepartComponentCategories|reconcileLegacyCategoryProjection|\bsave\s*\(/);
});

test('S2263 nested Insight and BBM renderers branch on visible subtab', () => {
  const s = read('modules/shared/modules-render-b.js');
  assert.match(s, /cniTab-rekomendasi[\s\S]{0,200}showingRecommendations/);
  assert.match(s, /cnbTab-analisis[\s\S]{0,200}showingFuelAnalysis/);
  assert.match(s, /function renderServiceIntegrityCard\s*\(/);
});

test('S2264 unrelated tabs do not run fuel repair and Servis does not request duplicate audit', () => {
  const s = read('modules/shared/modules-render-b.js');
  const renderStart = s.indexOf('function renderCnTab(){');
  const renderEnd = s.indexOf('\nfunction ', renderStart + 1);
  const renderer = s.slice(renderStart, renderEnd > renderStart ? renderEnd : undefined);
  const fuelBranch = renderer.indexOf("}else if(activeTab==='bbm'){");
  const serviceBranch = renderer.indexOf("}else if(activeTab==='servis'){");
  assert.ok(fuelBranch >= 0 && serviceBranch > fuelBranch, 'expected explicit BBM and Servis branches');
  assert.ok(renderer.indexOf('healFuelStateReferenceKm', fuelBranch) < serviceBranch, 'fuel repair should be in BBM branch before Servis branch');
  assert.doesNotMatch(renderer.slice(renderStart, fuelBranch), /healFuelStateReferenceKm/, 'pre-branch code must not repair fuel state');
  const service = renderer.slice(serviceBranch);
  assert.doesNotMatch(service, /CarNotesPerformance\.auditCurrent/, 'service audit is already obtained by integrity card renderer');
});
