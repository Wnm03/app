const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('SA-C: category CSV preview does not treat another vehicle private category as the current vehicle match', () => {
  const src = read('modules/vehicle/sparepart-servis-b.js');
  assert.match(src, /const vid=\(typeof curVehicleId!=='undefined'\)\?curVehicleId:null;/);
  assert.match(src, /c\.name\.toLowerCase\(\)===r\.nama\.toLowerCase\(\)&&\(!c\.vehicleId\|\|String\(c\.vehicleId\)===String\(vid\)\)/);
});

test('SA-C: category CSV commit prefers current-vehicle category, then global category, and scopes new category', () => {
  const src = read('modules/vehicle/sparepart-servis-ui.js');
  assert.match(src, /const vidCsv=\(typeof curVehicleId!=='undefined'\)\?curVehicleId:null;/);
  assert.match(src, /c\.vehicleId&&String\(c\.vehicleId\)===String\(vidCsv\)/);
  assert.match(src, /!c\.vehicleId/);
  assert.match(src, /const vehicleIdCsv=\(vidCsv&&Array\.isArray\(D\.vehicles\)&&D\.vehicles\.some\(v=>v\.id===vidCsv\)\)\?vidCsv:null;/);
  assert.match(src, /vehicleId:vehicleIdCsv/);
});
