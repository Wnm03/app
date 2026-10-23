'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function load(relative, globals) {
  const context = vm.createContext({ ...globals, console, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'), context, { filename: relative });
  return context;
}

test('S2719: explicit empty checklist action does not inherit session-level ganti', () => {
  const log = { id: 'h1', vehicleId: 'v1', actionType: 'ganti', checklist: [
    { itemId: 'comp-a', itemName: 'Komponen A', actionType: 'ganti' },
    { itemId: 'comp-b', itemName: 'Komponen B', actionType: '' },
  ] };
  const ctx = load('modules/vehicle/service-history-multichecklist-s2019.js', {
    D: { servisLogs: [log], sparepartCats: [] },
    Servis: { resolveLogServiceComponentId: row => row.serviceComponentId || null },
    curVehicleId: 'v1',
  });
  const api = ctx.ServiceHistoryMultiChecklistS2019;
  assert.ok(api, 'S2019 API installed');
  const components = api.componentsOf(log);
  assert.equal(components.find(c => c.serviceComponentId === 'comp-a').actionType, 'ganti');
  assert.equal(components.find(c => c.serviceComponentId === 'comp-b').actionType, '');
  const proxy = api.reminderProjection(log, components.find(c => c.serviceComponentId === 'comp-b'));
  assert.equal(proxy.actionType, '', 'reminder projection must preserve unknown component action');
  assert.equal(log.actionType, 'ganti', 'source history remains unchanged');
});

test('S2719: component-scoped reminder audit projection does not inherit session action', () => {
  const ctx = load('modules/vehicle/service-history-reminder-component-s2026.js', {
    D: { servisLogs: [] }, Servis: { editId: 'h2' }
  });
  const log = { id: 'h2', actionType: 'ganti' };
  const comp = { serviceComponentId: 'comp-b', componentName: 'Komponen B', actionType: '' };
  assert.equal(ctx.ServiceHistoryReminderComponentS2026.projection(log, comp).actionType, '');
});
