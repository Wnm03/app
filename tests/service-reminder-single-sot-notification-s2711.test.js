'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('service prediction exposes canonical component identity for downstream SOT consumers', () => {
  const src = read('modules/vehicle/sparepart-servis-b.js');
  assert.match(src, /serviceComponentId:cat\.serviceComponentId\|\|\(typeof serviceComponentIdForCategory==='function'\?serviceComponentIdForCategory\(cat\):null\)/);
  const reminder = read('modules/vehicle/vehicle-reminder.js');
  assert.match(reminder, /serviceComponentId: it\.serviceComponentId \|\| null/);
  assert.match(reminder, /categoryId: it\.categoryId \|\| null/);
});

test('push bridge collapses aliases and identical unknown names per vehicle in one pass', () => {
  const source = read('modules/vehicle/vehicle-notif-bridge.js');
  const ctx = {
    VehicleReminder: { serviceReminders: () => [
      { vehicleId: 'v1', categoryName: 'Busi', serviceComponentId: 'spark-plug', severity: 'overdue', message: 'canonical' },
      { vehicleId: 'v1', categoryName: 'Busi NGK', serviceComponentId: 'spark-plug', severity: 'overdue', message: 'alias' },
      { vehicleId: 'v1', categoryName: 'Lampu Kabin', severity: 'overdue', message: 'unknown 1' },
      { vehicleId: 'v1', categoryName: ' lampu   kabin ', severity: 'overdue', message: 'unknown 2' },
      { vehicleId: 'v2', categoryName: 'Busi', serviceComponentId: 'spark-plug', severity: 'overdue', message: 'other vehicle' },
    ], fuelReminders: () => [] },
  };
  const bridge = vm.runInNewContext(`${source}; VehicleNotifBridge`, ctx);
  const rows = bridge.items(null, []);
  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map((r) => r.fireKey)).size, 3);
  assert.ok(rows.some((r) => r.fireKey === 'vehsvc_v1_component:spark-plug'));
  assert.ok(rows.some((r) => r.fireKey === 'vehsvc_v1_name:lampu kabin'));
  assert.ok(rows.some((r) => r.fireKey === 'vehsvc_v2_component:spark-plug'));
});

test('recommendation projection uses stable component identity and removes duplicate aliases', () => {
  const source = read('modules/vehicle/vehicle-recommendation-engine.js');
  const engine = vm.runInNewContext(`${source}; VehicleRecommendationEngine`, {});
  const rows = engine._fromReminders([
    { type: 'service', vehicleId: 'v1', categoryName: 'Busi', serviceComponentId: 'spark-plug', severity: 'overdue', message: 'one' },
    { type: 'service', vehicleId: 'v1', categoryName: 'Busi Iridium', serviceComponentId: 'spark-plug', severity: 'overdue', message: 'duplicate' },
    { type: 'service', vehicleId: 'v1', categoryName: 'Lampu Kabin', severity: 'overdue', message: 'unknown one' },
    { type: 'service', vehicleId: 'v1', categoryName: 'lampu kabin', severity: 'due-soon', message: 'unknown duplicate' },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(new Set(rows.map((r) => r.id)).size, 2);
});
