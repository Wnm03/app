const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('SA-E: Katalog→Stok sync deduplicates by catalogId + vehicle scope', () => {
  const src = read('modules/vehicle/sparepart-servis-ui.js');
  assert.match(src, /D\.partsStock\.some\(p=>p\.catalogId===it\.id&&\(!p\.vehicleId\|\|String\(p\.vehicleId\)===String\(curVehicleId\)\)\)/);
  assert.match(src, /catalogId:it\.id,vehicleId:curVehicleId/);
});

test('SA-E: Finance→Stok __new__ lookup and creation stay vehicle-scoped', () => {
  const src = read('modules/finance/tx-stok-sparepart.js');
  assert.match(src, /p\.catId===cat\.id&&p\.name\.toLowerCase\(\)===name\.toLowerCase\(\)&&\(!p\.vehicleId\|\|String\(p\.vehicleId\)===String\(vidNewCat\)\)/);
  assert.match(src, /note:'Otomatis dari transaksi keuangan',vehicleId:vehicleIdNew/);
});

test('SA-E: Service prefill never selects stock outside active vehicle scope', () => {
  const src = read('modules/vehicle/servis.js');
  assert.match(src, /const vehicleIdPrefill=curVehicleId;/);
  assert.match(src, /const visibleStock=\(D\.partsStock\|\|\[\]\)\.filter\(p=>\{/);
  assert.match(src, /Sparepart\.isPartForVehicle\(p,vehicleIdPrefill\)/);
  assert.match(src, /!p\.vehicleId\|\|String\(p\.vehicleId\)===String\(vehicleIdPrefill\)/);
  assert.match(src, /const matchStock=visibleStock\.find\(/);
});
