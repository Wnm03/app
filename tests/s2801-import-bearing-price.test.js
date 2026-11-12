// S2801: nomor tipe bearing bukan harga; nama gaya Honda tidak diubah.
const test = require('node:test'); const assert = require('node:assert');
const fs = require('fs'); const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'modules/vehicle/vehicle-catalog-import.js'), 'utf8');
const vm = require('vm'); const ctx = { console }; vm.createContext(ctx); vm.runInContext(src + ';this.P=vehicleImportParseCatalogRow;', ctx);
const P = (l) => ctx.P(l);
test('bearing 6201 tanpa harga: price null, nomor tipe tetap di nama', () => {
  const r = P('Bearing Radial Ball 6201');
  assert.strictEqual(r.price, null); assert.ok(r.partName.includes('6201'));
});
test('bearing dengan harga di kolom akhir: harga terambil, nomor tipe tetap di nama', () => {
  const r = P('Bearing Radial Ball 6205 45.000');
  assert.strictEqual(r.price, 45000); assert.ok(r.partName.includes('6205'));
});
test('bukan bearing: angka polos 4 digit tetap harga (perilaku lama)', () => {
  assert.strictEqual(P('KNALPOT ASSY 6201').price, 6201);
  assert.strictEqual(P('KNALPOT ASSY 185.000').price, 185000);
});
test('nama gaya Honda (koma) tidak diubah', () => {
  assert.strictEqual(P('BOLT,FLANGE,6X16').partName, 'BOLT,FLANGE,6X16');
});
