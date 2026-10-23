'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('S2709: ServiceMasterDB has a private loader name while preserving public API', () => {
  const src = read('modules/vehicle/service-master-database.js');
  assert.match(src, /async function _smdEnsureLoaded\(/);
  assert.match(src, /ensureLoaded:_smdEnsureLoaded/);
  assert.doesNotMatch(src, /async function ensureLoaded\(/);
});

test('S2709: only actionable service statuses enter unified reminders', () => {
  const src = read('modules/vehicle/vehicle-reminder.js');
  assert.match(src, /\['terlewat', 'jatuh_tempo', 'segera', 'mendekati'\]\.includes\(it\.status\)/);
  assert.match(src, /documentType: 'sim'/);
});

test('S2709: unknown maintenance is excluded from fuel impact and health score denominator', () => {
  const fuel = read('modules/vehicle/fuel-maintenance-engine.js');
  const intel = read('modules/vehicle/vehicle-intelligence.js');
  assert.match(fuel, /\['terlewat', 'jatuh_tempo', 'segera', 'mendekati'\]\.includes\(it\.status\)/);
  assert.match(intel, /const known = pred\.items\.filter/);
  assert.match(intel, /if \(known\.length\)/);
});

test('S2709: canonical category chip label matches Service Master', () => {
  const src = read('modules/engine/database-api.js');
  assert.match(src, /id: 'body-kontrol', name: 'Body & Kontrol'/);
});

test('S2709: SIM H-20 enters unified tax reminders without changing D.simList', () => {
  const vm = require('node:vm');
  const sandbox = {
    console, Date, Math, JSON, Number, String, Boolean, Array, Object, Map, Set,
    D: { vehicles: [{ id: 'v1', name: 'Vario', ownership: 'SELF', stnk: '' }], simList: [{ id: 'sim1', jenis: 'SIM C', nama: 'Pemilik', tglAkhir: '2026-11-12' }] },
    VEHTAX_ITEMS: {},
    dateStatusBadge(date) { return date === '2026-11-12' ? { col: 'orange', label: 'H-20' } : { col: '', label: 'Aktif' }; },
    daysUntilDate() { return 20; },
    isVehicleOwnershipSelf() { return true; },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('modules/vehicle/vehicle-reminder.js'), sandbox);
  const before = JSON.stringify(sandbox.D.simList);
  const reminders = vm.runInContext('VehicleReminder.taxReminders()', sandbox);
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].documentType, 'sim');
  assert.equal(reminders[0].severity, 'due-soon');
  assert.equal(reminders[0].daysUntil, 20);
  assert.equal(JSON.stringify(sandbox.D.simList), before);
});
