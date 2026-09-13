'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

test('KZR 125 maintenance metadata v5: every registry key exists in SERVICE_CHECKLIST_GROUPS and inspection/replacement axes stay separate', () => {
  const ctx = loadSource(['modules/vehicle/servis-checklist.js', 'car-notes.js'], {}, ['Servis','SERVICE_MAINTENANCE_RULES','SERVICE_CHECKLIST_GROUPS']);
  const ids = new Set((ctx.SERVICE_CHECKLIST_GROUPS || []).flatMap(g => (g.items || []).map(i => i.id)));
  const rules = ctx.SERVICE_MAINTENANCE_RULES || {};
  assert.ok(Object.keys(rules).length >= 20);
  for (const id of Object.keys(rules)) assert.ok(ids.has(id), `orphan maintenance rule: ${id}`);
  assert.equal(rules['busi'].inspectKm, 4000);
  assert.equal(rules['busi'].replaceKm, 8000);
  assert.equal(rules['v-belt-cvt'].inspectKm, 8000);
  assert.equal(rules['v-belt-cvt'].replaceKm, 24000);
  assert.equal(rules['paking-knalpot'].maintenanceType, 'event_based');
});
