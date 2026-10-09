'use strict';
// S2550 — fuel bar/analisis hilang di Car Notes BBM.
// Akar: DashboardInsightDedup role-hide (el.hidden) tidak dipulihkan saat pindah ke Car Notes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('S2550 renderCnTab menjadwalkan ulang DashboardInsightDedup bila ada kartu role-hidden', () => {
  const s = read('modules/shared/modules-render-b.js');
  const start = s.indexOf('function renderCnTab(){');
  const end = s.indexOf('\nfunction ', start + 1);
  const body = s.slice(start, end);
  assert.match(body, /data-dashboard-role-hidden="1"[\s\S]{0,80}DashboardInsightDedup\.schedule\(\)|DashboardInsightDedup\.schedule\(\)/);
  assert.match(body, /\[data-dashboard-role-hidden="1"\]/);
});

test('S2550 role carnotes TIDAK menyembunyikan kartu fuel & memulihkan yang role-hidden', () => {
  const s = read('modules/dashboard-hub/dashboard-insight-dedup.js');
  const carnotes = s.slice(s.indexOf('carnotes:'), s.indexOf('carnotes:') + 900);
  const keep = carnotes.slice(carnotes.indexOf('keep:'), carnotes.indexOf('hide:'));
  ['fuelIntelWrap', 'fuelDashWrap', 'fuelCompareWrap', 'fuelTrendWrap'].forEach((id) => assert.ok(keep.includes(id), id));
  assert.match(s, /restoreRoleVisibility\(\)[\s\S]*el\.hidden = false/);
});

function ctxFor(vehicle) {
  return loadSource(['modules/vehicle/fuel-card.js'], {
    document: { getElementById: () => null },
    escapeHtml: (x) => String(x),
    FuelTankProfile: { get: () => vehicle },
    FuelGaugeEngine: {},
  }, ['FuelCard']);
}

test('S2550 hint fuel bar: profil tangki belum diatur -> tombol Atur Tangki', () => {
  const html = ctxFor({ tankCapacityLiter: null }).FuelCard._gaugeEmptyHintHtml('v1');
  assert.match(html, /profil tangki/);
  assert.match(html, /FuelTankProfileUI\.open/);
});

test('S2550 hint fuel bar: profil ada tapi belum ada estimasi -> tombol Koreksi Bar', () => {
  const html = ctxFor({ tankCapacityLiter: 5.5 }).FuelCard._gaugeEmptyHintHtml('v1');
  assert.match(html, /belum ada estimasi/);
  assert.match(html, /FuelBarCorrection\.open/);
});

test('S2550 _body memakai hint hanya saat gauge kosong', () => {
  const s = read('modules/vehicle/fuel-card.js');
  assert.match(s, /_gaugeHtml\(insight\.vehicleId\) \|\| this\._gaugeEmptyHintHtml\(insight\.vehicleId\)/);
});

test('S2550 DashboardInsightDedup memantau perpindahan halaman & jalan ulang hanya saat role berubah', () => {
  const s = read('modules/dashboard-hub/dashboard-insight-dedup.js');
  assert.match(s, /observePages\(\)/);
  assert.match(s, /attributeFilter: \['class'\]/);
  assert.match(s, /if \(role === this\._lastRole\) return;/);
  assert.match(s, /_startPageObserver/);
});

test('S2550 observePages: ganti role memicu schedule(), role sama tidak', () => {
  let cb; let role = 'dashboard-hub'; let scheduled = 0;
  class MO { constructor(f) { cb = f; } observe() {} disconnect() {} }
  const ctx = loadSource(['modules/dashboard-hub/dashboard-insight-dedup.js'], {
    MutationObserver: MO,
    window: {},
    document: { querySelectorAll: () => [{}], readyState: 'complete', addEventListener() {}, getElementById: () => null, documentElement: { dataset: {} } },
  }, ['DashboardInsightDedup']);
  const D = ctx.DashboardInsightDedup;
  D._pageObserver = null; D._activeRole = () => role; D.schedule = () => { scheduled++; };
  D.observePages();
  cb(); assert.equal(scheduled, 0);
  role = 'carnotes'; cb(); assert.equal(scheduled, 1);
  cb(); assert.equal(scheduled, 1);
});
