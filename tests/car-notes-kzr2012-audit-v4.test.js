import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const car = [
  fs.readFileSync(path.join(process.cwd(), 'car-notes.js'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'modules/vehicle/servis-checklist.js'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'modules/vehicle/service-input-catalog.js'), 'utf8'),
  fs.readFileSync(path.join(process.cwd(), 'modules/vehicle/servis.js'), 'utf8')
].join('\n');

assert.match(car, /ServiceInputCatalog\.groups\(\)/);
assert.match(car, /Belum dikategorikan/);
assert.match(car, /SERVICE_MAINTENANCE_RULES/);
assert.match(car, /inspectKm/);
assert.match(car, /replaceKm/);
assert.match(car, /replaceMonths/);
assert.match(car, /maintenanceType/);
assert.doesNotMatch(car, /ServiceInputCatalog\.groups\s*\|\|\s*\[\]/);

console.log('PASS: Car Notes KZR 2012 UI/taxonomy/maintenance contract');
