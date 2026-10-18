const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'car-notes.js'), 'utf8');

test('S2146: filter fuel pump declares both inspection and replacement interval axes', () => {
  const match = source.match(/['"]filter-fuel-pump['"]\s*:\s*\{([^}]*)\}/);
  assert.ok(match, 'filter-fuel-pump maintenance rule exists');
  const rule = match[1];
  assert.match(rule, /inspectKm:\s*12000/);
  assert.match(rule, /inspectAction:\s*['"]periksa['"]/);
  assert.match(rule, /replaceKm:\s*48000/);
  assert.match(rule, /replaceAction:\s*['"]ganti['"]/);
  assert.match(rule, /maintenanceType:\s*['"]periodic_or_condition['"]/);
  const db = require('../data/database-kategori-komponen-servis.json');
  const master = db.components.find(x => x.componentId === 'filter-fuel-pump');
  assert.equal(master.intervalKm, 48000, 'single active SOT axis is replacement cadence');
  assert.equal(master.intervalAxes, 'independent', 'inspection cadence must not be erased by SOT overlay');
});

test('S2146: replace schedule is represented as an independent action plan, not an inspection reset', () => {
  assert.match(source, /function getMaintenanceActionPlan\s*\(/);
  assert.match(source, /has\('inspectKm'\)[\s\S]*?axis:'inspect'/);
  assert.match(source, /has\('replaceKm'\)[\s\S]*?axis:'replace'/);
});
