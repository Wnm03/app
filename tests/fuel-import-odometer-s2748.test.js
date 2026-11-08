'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

test('BBM import odometer accepts monotonic same-day rows and later days', () => {
  const D = { kmLogs: [], servisLogs: [] };
  const ctx = loadSource(['modules/shared/backup-restore.js'], { D }, ['validateBbmOdometerImportIntegrity']);
  const result = ctx.validateBbmOdometerImportIntegrity([
    { id: 'a', vehicleId: 'v1', date: '2026-11-08', km: 1200 },
    { id: 'b', vehicleId: 'v1', date: '2026-11-08', km: 1210 },
    { id: 'c', vehicleId: 'v1', date: '2026-11-09', km: 1250 },
  ], []);
  assert.equal(result.ok, true);
  assert.equal(result.checked, 3);
});

test('BBM import rejects same-day KM regression because CSV has no event timestamp', () => {
  const D = { kmLogs: [], servisLogs: [] };
  const ctx = loadSource(['modules/shared/backup-restore.js'], { D }, ['validateBbmOdometerImportIntegrity']);
  const result = ctx.validateBbmOdometerImportIntegrity([
    { id: 'a', vehicleId: 'v1', date: '2026-11-08', km: 1210 },
    { id: 'b', vehicleId: 'v1', date: '2026-11-08', km: 1200 },
  ], []);
  assert.equal(result.ok, false);
  assert.equal(result.invalid[0].code, 'BBM_ODOMETER_BACKSTEP');
});

test('BBM import rejects a reading lower than existing same-day or later-domain odometer', () => {
  const D = { kmLogs: [{ id: 'k1', vehicleId: 'v1', date: '2026-11-08', km: 1250 }], servisLogs: [] };
  const ctx = loadSource(['modules/shared/backup-restore.js'], { D }, ['validateBbmOdometerImportIntegrity']);
  const result = ctx.validateBbmOdometerImportIntegrity([{ id: 'a', vehicleId: 'v1', date: '2026-11-08', km: 1240 }], []);
  assert.equal(result.ok, false);
});
