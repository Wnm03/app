'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCard(canon) {
  return loadSource(['modules/vehicle/fuel-card.js'], { escapeHtml: (s) => String(s), getFuelCanonicalLogs: canon === undefined ? undefined : () => canon }, ['FuelCard']).FuelCard;
}
test('kartu fuel: tanpa karantina tidak menampilkan apa pun', () => {
  assert.equal(makeCard({ canonical: [], quarantined: [] })._quarantineNoticeHtml('v1'), '');
});
test('kartu fuel: tanpa SSOT kanonis (konteks lama) tidak error', () => {
  assert.equal(makeCard(undefined)._quarantineNoticeHtml('v1'), '');
});
test('kartu fuel: menampilkan jumlah, rincian, dan petunjuk koreksi tanpa mengubah data', () => {
  const html = makeCard({ canonical: [], quarantined: [
    { reason: 'duplicate', log: { date: '2026-01-01' } }, { reason: 'duplicate', log: { date: '2026-01-02' } },
    { reason: 'over-capacity', liter: 40, suggestion: { liter: 4, cost: 40000 }, log: { date: '2026-01-25' } },
  ] })._quarantineNoticeHtml('v1');
  assert.match(html, /3 log BBM dikecualikan/);
  assert.match(html, /2 duplikat/);
  assert.match(html, /1 isi melebihi kapasitas/);
  assert.match(html, /2026-01-25.*40 L.*4 L/);
  assert.match(html, /Data asli tidak diubah/);
});

test('analitik biaya BBM tidak menjumlah log karantina (duplikat), tanpa SSOT kanonis = perilaku lama', () => {
  const logs = [{ id: 1, vehicleId: 'v1', date: '2026-02-01', liter: 4, cost: 40000 }, { id: 2, vehicleId: 'v1', date: '2026-02-01', liter: 4, cost: 40000 }];
  const mk = (canon) => loadSource(['modules/vehicle/fuel-storage.js', 'modules/vehicle/fuel-cost-analytics.js'], { D: { bbmLogs: logs, vehicles: [] }, getFuelCanonicalLogs: canon }, ['FuelCostAnalytics']).FuelCostAnalytics;
  assert.equal(mk(undefined)._validLogs('v1').length, 2);
  assert.equal(mk(() => ({ canonical: [logs[0]], quarantined: [{ log: logs[1], reason: 'duplicate' }] }))._validLogs('v1').length, 1);
});
