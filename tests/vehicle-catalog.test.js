'use strict';
// tests/vehicle-catalog.test.js — cakupan modules/vehicle/vehicle-catalog.js
// (Milestone 0 Phase 1, katalog SUKU CADANG — lihat header file source utk
// riwayat perubahan skema dari katalog kendaraan -> katalog part). Mock
// IDBStore in-memory dipakai (bukan indexedDB browser asli) supaya test
// bisa jalan murni di Node — pola sama seperti test lain yang inject
// uid()/sameId() langsung via extraGlobals daripada me-load seluruh
// aset.js/features-helpers-global-security.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

let _uidCounter = 0;
function makeIdbStoreMock(initial) {
  const db = Object.assign({}, initial || {});
  return {
    _db: db,
    calls: { get: 0, set: 0 },
    async get(key) {
      this.calls.get++;
      return db[key];
    },
    async set(key, value) {
      this.calls.set++;
      db[key] = value;
      return true;
    },
  };
}

function makeCtx(initialStore) {
  _uidCounter = 0;
  const idb = makeIdbStoreMock(initialStore ? { 'vehicle-catalog:store': initialStore } : {});
  const ctx = loadSource(
    ['modules/vehicle/vehicle-catalog.js'],
    {
      uid: () => 'uid-' + (++_uidCounter),
      sameId: (a, b) => String(a) === String(b),
      IDBStore: idb,
    },
    ['VehicleCatalog', 'VEHICLE_CATALOG_STORE_KEY']
  );
  return { ctx, idb };
}

// ------------------------------------------------------------------------
// Storage key
// ------------------------------------------------------------------------
test('VEHICLE_CATALOG_STORE_KEY — tepat "vehicle-catalog:store" (key TIDAK berubah walau skema item berubah)', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.VEHICLE_CATALOG_STORE_KEY, 'vehicle-catalog:store');
});

test('MAX_PHOTOS — batas jumlah foto per part terekspos', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.VehicleCatalog.MAX_PHOTOS, 8);
});

// ------------------------------------------------------------------------
// Validation
// ------------------------------------------------------------------------
test('validate() — data lengkap & valid -> valid:true, tanpa errors', () => {
  const { ctx } = makeCtx();
  const result = ctx.VehicleCatalog.validate({
    partName: 'Roller Vario 125',
    category: 'Roller',
    oemCode: '22127-KZR-0000',
    barcode: '8991234567890',
    compatibleVehicleIds: ['veh-1', 'veh-2'],
    photos: ['data:image/png;base64,AAA'],
    notes: 'Stok gudang A',
  });
  assert.equal(result.valid, true);
  assert.deepEqual(Array.from(result.errors), []);
});

test('validate() — nama part kosong -> invalid', () => {
  const { ctx } = makeCtx();
  const result = ctx.VehicleCatalog.validate({ partName: '  ', category: 'Roller' });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /Nama part wajib diisi/);
});

test('validate() — kategori kosong -> invalid', () => {
  const { ctx } = makeCtx();
  const result = ctx.VehicleCatalog.validate({ partName: 'V-Belt' });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /Kategori wajib diisi/);
});

test('validate() — oemCode/barcode bukan string -> invalid', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', oemCode: 123 }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', barcode: 123 }).valid, false);
});

test('validate() — compatibleVehicleIds bukan array -> invalid', () => {
  const { ctx } = makeCtx();
  const result = ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', compatibleVehicleIds: 'veh-1' });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /daftar \(array\)/);
});

test('validate() — photos bukan array, atau melebihi MAX_PHOTOS, atau berisi non-string -> invalid', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', photos: 'not-array' }).valid, false);
  const tooMany = new Array(9).fill('data:image/png;base64,AAA');
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', photos: tooMany }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', photos: [123] }).valid, false);
});

test('validate() — partName/category/oemCode/barcode/notes melebihi batas panjang -> invalid', () => {
  const { ctx } = makeCtx();
  const longName = 'A'.repeat(151);
  const longCategory = 'B'.repeat(51);
  const longOem = 'C'.repeat(51);
  const longBarcode = 'D'.repeat(65);
  const longNotes = 'E'.repeat(501);
  assert.equal(ctx.VehicleCatalog.validate({ partName: longName, category: 'ok' }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'ok', category: longCategory }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'ok', category: 'ok', oemCode: longOem }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'ok', category: 'ok', barcode: longBarcode }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'ok', category: 'ok', notes: longNotes }).valid, false);
});

// ------------------------------------------------------------------------
// Validation — Tahap 4 (kelengkapan field database part, semua opsional)
// ------------------------------------------------------------------------
test('validate() — field Tahap 4 lengkap & valid -> valid:true', () => {
  const { ctx } = makeCtx();
  const result = ctx.VehicleCatalog.validate({
    partName: 'Roller', category: 'Roller',
    aftermarketCode: 'AM-ROL-001', price: 25000, supplier: 'Toko Jaya Motor',
    location: 'Rak A2', serviceNotes: 'Ganti tiap 15rb km',
  });
  assert.equal(result.valid, true);
});

test('validate() — price negatif/non-angka -> invalid; kosong/undefined -> valid (opsional)', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', price: -1 }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', price: 'mahal' }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', price: 0 }).valid, true);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y' }).valid, true);
});

test('validate() — aftermarketCode/supplier/location/serviceNotes bukan string atau kepanjangan -> invalid', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', aftermarketCode: 1 }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', aftermarketCode: 'A'.repeat(51) }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', supplier: 'B'.repeat(101) }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', location: 'C'.repeat(101) }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', serviceNotes: 'D'.repeat(501) }).valid, false);
});

// ------------------------------------------------------------------------
// Validation — Golongan A (audit UID v1.0, field additive, semua opsional)
// ------------------------------------------------------------------------
test('validate() — field Golongan A lengkap & valid -> valid:true', () => {
  const { ctx } = makeCtx();
  const result = ctx.VehicleCatalog.validate({
    partName: 'Roller', category: 'Roller',
    oldPartNumber: '22123-KVB-900', replacementPartNumber: '22123-KVB-901',
    dimension: '15x12mm', material: 'Nylon', weight: 8.5,
    consumable: true, source: 'Parts Catalog', confidence: 'high',
  });
  assert.equal(result.valid, true);
});

test('validate() — weight negatif/non-angka -> invalid; kosong -> valid (opsional)', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', weight: -1 }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', weight: 'berat' }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y' }).valid, true);
});

test('validate() — confidence di luar HIGH/MEDIUM/LOW/UNKNOWN -> invalid', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', confidence: 'SUPER_YAKIN' }).valid, false);
  assert.equal(ctx.VehicleCatalog.validate({ partName: 'X', category: 'Y', confidence: 'low' }).valid, true);
});

test('create() — field Golongan A tersimpan (weight jadi Number, confidence jadi UPPERCASE); kosong -> default aman', async () => {
  const { ctx } = makeCtx();
  const withFields = await ctx.VehicleCatalog.create({
    partName: 'Roller', category: 'Roller',
    oldPartNumber: ' 22123-KVB-900 ', weight: '8.5', consumable: true, confidence: 'medium',
  });
  assert.equal(withFields.item.oldPartNumber, '22123-KVB-900');
  assert.equal(withFields.item.weight, 8.5);
  assert.equal(withFields.item.consumable, true);
  assert.equal(withFields.item.confidence, 'MEDIUM');

  const empty = await ctx.VehicleCatalog.create({ partName: 'Y', category: 'Z' });
  assert.equal(empty.item.oldPartNumber, '');
  assert.equal(empty.item.weight, null);
  assert.equal(empty.item.consumable, false);
  assert.equal(empty.item.confidence, '');
});

// ------------------------------------------------------------------------
// Create
// ------------------------------------------------------------------------
test('create() — data valid -> tersimpan dgn id/createdAt/updatedAt, IDBStore.set terpanggil', async () => {
  const { ctx, idb } = makeCtx();
  const res = await ctx.VehicleCatalog.create({ partName: 'Roller Vario 125', category: 'Roller' });
  assert.equal(res.success, true);
  assert.ok(res.item.id);
  assert.ok(res.item.createdAt);
  assert.equal(res.item.createdAt, res.item.updatedAt);
  assert.equal(res.item.partName, 'Roller Vario 125');
  assert.deepEqual(Array.from(res.item.compatibleVehicleIds), []);
  assert.deepEqual(Array.from(res.item.photos), []);
  assert.equal(idb.calls.set, 1);
  assert.equal(idb._db['vehicle-catalog:store'].items.length, 1);
});

test('create() — data invalid -> gagal, TIDAK memanggil IDBStore.set', async () => {
  const { ctx, idb } = makeCtx();
  const res = await ctx.VehicleCatalog.create({ partName: '', category: 'Roller' });
  assert.equal(res.success, false);
  assert.ok(res.errors.length > 0);
  assert.equal(idb.calls.set, 0);
});

test('create() — trim whitespace pada partName/category/oemCode/barcode/notes', async () => {
  const { ctx } = makeCtx();
  const res = await ctx.VehicleCatalog.create({ partName: '  Roller  ', category: '  Roller Kit  ', oemCode: '  22127-KZR  ', barcode: '  8991  ', notes: '  cek stok  ' });
  assert.equal(res.item.partName, 'Roller');
  assert.equal(res.item.category, 'Roller Kit');
  assert.equal(res.item.oemCode, '22127-KZR');
  assert.equal(res.item.barcode, '8991');
  assert.equal(res.item.notes, 'cek stok');
});

test('create() — compatibleVehicleIds & photos tersimpan apa adanya (dinormalisasi jadi string utk id)', async () => {
  const { ctx } = makeCtx();
  const res = await ctx.VehicleCatalog.create({ partName: 'V-Belt', category: 'V-Belt', compatibleVehicleIds: ['veh-1', 2], photos: ['data:a', 'data:b'] });
  assert.deepEqual(Array.from(res.item.compatibleVehicleIds), ['veh-1', '2']);
  assert.deepEqual(Array.from(res.item.photos), ['data:a', 'data:b']);
});

test('create() — 2 item berturutan -> id berbeda, keduanya tersimpan', async () => {
  const { ctx } = makeCtx();
  const a = await ctx.VehicleCatalog.create({ partName: 'A', category: 'Cat A' });
  const b = await ctx.VehicleCatalog.create({ partName: 'B', category: 'Cat B' });
  assert.notEqual(a.item.id, b.item.id);
  const all = await ctx.VehicleCatalog.getAll();
  assert.equal(all.length, 2);
});

test('create() — field Tahap 4 (aftermarketCode/price/supplier/location/serviceNotes) tersimpan; kosong -> default aman ("" / null)', async () => {
  const { ctx } = makeCtx();
  const withFields = await ctx.VehicleCatalog.create({
    partName: 'Roller', category: 'Roller',
    aftermarketCode: '  AM-001  ', price: '25000', supplier: '  Toko Jaya  ',
    location: '  Rak A2  ', serviceNotes: '  ganti tiap servis  ',
  });
  assert.equal(withFields.item.aftermarketCode, 'AM-001');
  assert.equal(withFields.item.price, 25000);
  assert.equal(withFields.item.supplier, 'Toko Jaya');
  assert.equal(withFields.item.location, 'Rak A2');
  assert.equal(withFields.item.serviceNotes, 'ganti tiap servis');

  const empty = await ctx.VehicleCatalog.create({ partName: 'V-Belt', category: 'V-Belt' });
  assert.equal(empty.item.aftermarketCode, '');
  assert.equal(empty.item.price, null);
  assert.equal(empty.item.supplier, '');
  assert.equal(empty.item.location, '');
  assert.equal(empty.item.serviceNotes, '');
});

// ------------------------------------------------------------------------
// Update
// ------------------------------------------------------------------------
test('update() — patch valid -> field berubah, updatedAt berubah, createdAt tetap', async () => {
  const { ctx } = makeCtx();
  const created = await ctx.VehicleCatalog.create({ partName: 'Roller Vario 125', category: 'Roller' });
  const before = created.item;
  const res = await ctx.VehicleCatalog.update(before.id, { partName: 'Roller Vario 150' });
  assert.equal(res.success, true);
  assert.equal(res.item.partName, 'Roller Vario 150');
  assert.equal(res.item.createdAt, before.createdAt);
  assert.equal(res.item.category, 'Roller'); // field lain tidak berubah (merge, bukan overwrite total)
});

test('update() — id tidak ditemukan -> gagal dgn errors', async () => {
  const { ctx } = makeCtx();
  const res = await ctx.VehicleCatalog.update('tidak-ada', { partName: 'X' });
  assert.equal(res.success, false);
  assert.ok(res.errors.length > 0);
});

test('update() — patch membuat data jadi invalid (mis. kategori dikosongkan) -> ditolak, data lama tidak berubah', async () => {
  const { ctx } = makeCtx();
  const created = await ctx.VehicleCatalog.create({ partName: 'Roller', category: 'Roller' });
  const res = await ctx.VehicleCatalog.update(created.item.id, { category: '' });
  assert.equal(res.success, false);
  const stillThere = await ctx.VehicleCatalog.getById(created.item.id);
  assert.equal(stillThere.category, 'Roller');
});

// ------------------------------------------------------------------------
// Remove
// ------------------------------------------------------------------------
test('remove() — id ada -> terhapus, success:true', async () => {
  const { ctx } = makeCtx();
  const created = await ctx.VehicleCatalog.create({ partName: 'Roller', category: 'Roller' });
  const res = await ctx.VehicleCatalog.remove(created.item.id);
  assert.equal(res.success, true);
  const all = await ctx.VehicleCatalog.getAll();
  assert.equal(all.length, 0);
});

test('remove() — id tidak ada -> success:false, tidak memanggil IDBStore.set tambahan', async () => {
  const { ctx, idb } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Roller', category: 'Roller' });
  const setsBefore = idb.calls.set;
  const res = await ctx.VehicleCatalog.remove('tidak-ada');
  assert.equal(res.success, false);
  assert.equal(idb.calls.set, setsBefore);
});

// ------------------------------------------------------------------------
// removeMany / removeAll (fitur "Pilih & Hapus" / "Hapus Semua")
// ------------------------------------------------------------------------
test('removeMany() — hapus beberapa id sekaligus, sisanya tetap ada', async () => {
  const { ctx } = makeCtx();
  const a = await ctx.VehicleCatalog.create({ partName: 'A', category: 'X' });
  const b = await ctx.VehicleCatalog.create({ partName: 'B', category: 'X' });
  const c = await ctx.VehicleCatalog.create({ partName: 'C', category: 'X' });
  const res = await ctx.VehicleCatalog.removeMany([a.item.id, c.item.id]);
  assert.equal(res.success, true);
  assert.equal(res.removed, 2);
  const all = await ctx.VehicleCatalog.getAll();
  assert.equal(all.length, 1);
  assert.equal(all[0].partName, 'B');
});

test('removeMany() — array kosong/tidak valid -> tidak menghapus apa pun, removed:0', async () => {
  const { ctx, idb } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'A', category: 'X' });
  const setsBefore = idb.calls.set;
  const res = await ctx.VehicleCatalog.removeMany([]);
  assert.equal(res.removed, 0);
  assert.equal(idb.calls.set, setsBefore);
  const all = await ctx.VehicleCatalog.getAll();
  assert.equal(all.length, 1);
});

test('removeMany() — id yang tidak ada di antara id yang ada tetap aman (dilewati)', async () => {
  const { ctx } = makeCtx();
  const a = await ctx.VehicleCatalog.create({ partName: 'A', category: 'X' });
  const res = await ctx.VehicleCatalog.removeMany([a.item.id, 'tidak-ada']);
  assert.equal(res.removed, 1);
  const all = await ctx.VehicleCatalog.getAll();
  assert.equal(all.length, 0);
});

test('removeAll() — menghapus seluruh part di katalog', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'A', category: 'X' });
  await ctx.VehicleCatalog.create({ partName: 'B', category: 'X' });
  const res = await ctx.VehicleCatalog.removeAll();
  assert.equal(res.removed, 2);
  const all = await ctx.VehicleCatalog.getAll();
  assert.equal(all.length, 0);
});

test('removeAll() — katalog sudah kosong -> tidak error, removed:0', async () => {
  const { ctx } = makeCtx();
  const res = await ctx.VehicleCatalog.removeAll();
  assert.equal(res.removed, 0);
});

// ------------------------------------------------------------------------
// getAll / getById
// ------------------------------------------------------------------------
test('getAll() — array kosong di awal (belum ada data)', async () => {
  const { ctx } = makeCtx();
  const all = await ctx.VehicleCatalog.getAll();
  assert.deepEqual(Array.from(all), []);
});

test('getAll() — mengembalikan copy, bukan referensi internal (mutasi luar tidak merusak store)', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Roller', category: 'Roller' });
  const all = await ctx.VehicleCatalog.getAll();
  all.push({ id: 'liar', partName: 'Susupan', category: 'X' });
  const allAgain = await ctx.VehicleCatalog.getAll();
  assert.equal(allAgain.length, 1);
});

test('getById() — ditemukan & tidak ditemukan', async () => {
  const { ctx } = makeCtx();
  const created = await ctx.VehicleCatalog.create({ partName: 'Roller', category: 'Roller' });
  const found = await ctx.VehicleCatalog.getById(created.item.id);
  assert.equal(found.partName, 'Roller');
  const notFound = await ctx.VehicleCatalog.getById('tidak-ada');
  assert.equal(notFound, null);
});

// ------------------------------------------------------------------------
// Search & Filter (Tahap 1: nama part/OEM Code/barcode, filter kendaraan+kategori)
// ------------------------------------------------------------------------
test('search() — query kosong -> semua item', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Roller Vario 125', category: 'Roller' });
  await ctx.VehicleCatalog.create({ partName: 'V-Belt Vario', category: 'V-Belt' });
  const results = await ctx.VehicleCatalog.search('');
  assert.equal(results.length, 2);
});

test('search() — substring case-insensitive di partName', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Roller Vario 125', category: 'Roller' });
  await ctx.VehicleCatalog.create({ partName: 'Kampas Kopling', category: 'Kopling' });
  const results = await ctx.VehicleCatalog.search('roller');
  assert.equal(results.length, 1);
  assert.equal(results[0].partName, 'Roller Vario 125');
});

test('search() — cocok di oemCode & barcode juga', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Part A', category: 'Cat', oemCode: '22127-KZR-0000' });
  await ctx.VehicleCatalog.create({ partName: 'Part B', category: 'Cat', barcode: '8991234567890' });
  const byOem = await ctx.VehicleCatalog.search('kzr');
  assert.equal(byOem.length, 1);
  assert.equal(byOem[0].partName, 'Part A');
  const byBarcode = await ctx.VehicleCatalog.search('1234567');
  assert.equal(byBarcode.length, 1);
  assert.equal(byBarcode[0].partName, 'Part B');
});

test('search() — filter opts.category (exact, case-insensitive)', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Roller Vario', category: 'Roller' });
  await ctx.VehicleCatalog.create({ partName: 'V-Belt Vario', category: 'V-Belt' });
  const rollers = await ctx.VehicleCatalog.search('', { category: 'roller' });
  assert.equal(rollers.length, 1);
  assert.equal(rollers[0].partName, 'Roller Vario');
});

test('search() — filter opts.vehicleId (cocok compatibleVehicleIds)', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Roller Vario', category: 'Roller', compatibleVehicleIds: ['veh-vario'] });
  await ctx.VehicleCatalog.create({ partName: 'Roller Beat', category: 'Roller', compatibleVehicleIds: ['veh-beat'] });
  const results = await ctx.VehicleCatalog.search('', { vehicleId: 'veh-vario' });
  assert.equal(results.length, 1);
  assert.equal(results[0].partName, 'Roller Vario');
});

test('search() — query + category + vehicleId digabung (AND)', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Roller Vario 125', category: 'Roller', compatibleVehicleIds: ['veh-vario'] });
  await ctx.VehicleCatalog.create({ partName: 'Roller Vario 150', category: 'Roller', compatibleVehicleIds: ['veh-vario'] });
  await ctx.VehicleCatalog.create({ partName: 'Roller Beat', category: 'Roller', compatibleVehicleIds: ['veh-beat'] });
  const results = await ctx.VehicleCatalog.search('vario', { category: 'Roller', vehicleId: 'veh-vario' });
  assert.equal(results.length, 2);
});

// ------------------------------------------------------------------------
// findByCode (bekal Tahap 2 Scanner: cari exact match barcode/OEM Code)
// ------------------------------------------------------------------------
test('findByCode() — cocok exact (case-insensitive) di barcode atau oemCode', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Roller', category: 'Roller', oemCode: '22127-KZR-0000', barcode: '8991234567890' });
  const byOem = await ctx.VehicleCatalog.findByCode('22127-kzr-0000');
  assert.equal(byOem.partName, 'Roller');
  const byBarcode = await ctx.VehicleCatalog.findByCode('8991234567890');
  assert.equal(byBarcode.partName, 'Roller');
});

test('findByCode() — tidak ditemukan atau kode kosong -> null', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Roller', category: 'Roller', oemCode: 'ABC' });
  assert.equal(await ctx.VehicleCatalog.findByCode('tidak-ada'), null);
  assert.equal(await ctx.VehicleCatalog.findByCode(''), null);
});

test('findByCode() — TIDAK partial match (beda dgn search())', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Roller', category: 'Roller', oemCode: '22127-KZR-0000' });
  assert.equal(await ctx.VehicleCatalog.findByCode('KZR'), null);
});

// ------------------------------------------------------------------------
// handleScan (Tahap 2 — logic hasil scan, TANPA kamera/library scanner)
// ------------------------------------------------------------------------
test('handleScan() — kode cocok part existing -> found:true, item existing dikembalikan, TIDAK membuat draft', async () => {
  const { ctx, idb } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Roller Vario', category: 'Roller', barcode: '8991234567890' });
  const setsBefore = idb.calls.set;
  const res = await ctx.VehicleCatalog.handleScan('8991234567890');
  assert.equal(res.found, true);
  assert.equal(res.item.partName, 'Roller Vario');
  assert.equal(idb.calls.set, setsBefore);
  const all = await ctx.VehicleCatalog.getAll();
  assert.equal(all.length, 1);
});

test('handleScan() — kode tidak ditemukan -> draft part otomatis dibuat, isDraft:true, barcode=kode apa adanya', async () => {
  const { ctx } = makeCtx();
  const res = await ctx.VehicleCatalog.handleScan('999888777');
  assert.equal(res.found, false);
  assert.equal(res.draft, true);
  assert.equal(res.item.isDraft, true);
  assert.equal(res.item.barcode, '999888777');
  assert.match(res.item.partName, /Draft/);
  const all = await ctx.VehicleCatalog.getAll();
  assert.equal(all.length, 1);
});

test('handleScan() — kode kosong/whitespace -> tidak membuat apa pun, error dikembalikan', async () => {
  const { ctx, idb } = makeCtx();
  const res = await ctx.VehicleCatalog.handleScan('   ');
  assert.equal(res.found, false);
  assert.equal(res.item, null);
  assert.ok(res.error);
  assert.equal(idb.calls.set, 0);
});

test('create() — isDraft default false kalau tidak disuplai; bisa diset true manual', async () => {
  const { ctx } = makeCtx();
  const normal = await ctx.VehicleCatalog.create({ partName: 'A', category: 'Cat' });
  assert.equal(normal.item.isDraft, false);
  const draft = await ctx.VehicleCatalog.create({ partName: 'B', category: 'Cat', isDraft: true });
  assert.equal(draft.item.isDraft, true);
});

// ------------------------------------------------------------------------
// parseLabelText() / handleOcrLabel() — Tahap 3 OCR label kemasan (logic saja)
// ------------------------------------------------------------------------
test('parseLabelText() — deteksi OEM Code alfanumerik dari teks OCR', () => {
  const { ctx } = makeCtx();
  const res = ctx.VehicleCatalog.parseLabelText('HONDA GENUINE PARTS\nP/N: AHM-12345-K12\nMADE IN INDONESIA');
  assert.equal(res.oemCode, 'AHM-12345-K12');
});

test('parseLabelText() — deteksi barcode 8-14 digit dari teks OCR', () => {
  const { ctx } = makeCtx();
  const res = ctx.VehicleCatalog.parseLabelText('KAMPAS REM\n8991234567890\nISI 1 SET');
  assert.equal(res.barcode, '8991234567890');
});

test('parseLabelText() — tidak ada kode terdeteksi -> string kosong utk keduanya', () => {
  const { ctx } = makeCtx();
  const res = ctx.VehicleCatalog.parseLabelText('SPAREPART ORIGINAL BERKUALITAS');
  assert.equal(res.oemCode, '');
  assert.equal(res.barcode, '');
});

test('parseLabelText() — teks kosong/null tidak error, hasil kosong', () => {
  const { ctx } = makeCtx();
  const empty = ctx.VehicleCatalog.parseLabelText('');
  assert.equal(empty.oemCode, '');
  assert.equal(empty.barcode, '');
  const empty2 = ctx.VehicleCatalog.parseLabelText(null);
  assert.equal(empty2.oemCode, '');
  assert.equal(empty2.barcode, '');
});

test('handleOcrLabel() — OEM Code cocok part existing -> found:true, tidak buat draft baru', async () => {
  const { ctx, idb } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Roller Vario', category: 'CVT', oemCode: 'AHM-12345-K12' });
  const setsBefore = idb.calls.set;
  const res = await ctx.VehicleCatalog.handleOcrLabel('HONDA\nP/N: AHM-12345-K12\n');
  assert.equal(res.found, true);
  assert.equal(res.item.partName, 'Roller Vario');
  assert.equal(idb.calls.set, setsBefore);
});

test('handleOcrLabel() — kode tidak cocok part manapun -> draft otomatis dgn oemCode/barcode dari OCR', async () => {
  const { ctx } = makeCtx();
  const res = await ctx.VehicleCatalog.handleOcrLabel('P/N: XYZ-99999-A1\n8991112223334\n');
  assert.equal(res.found, false);
  assert.equal(res.draft, true);
  assert.equal(res.item.isDraft, true);
  assert.equal(res.item.oemCode, 'XYZ-99999-A1');
});

test('handleOcrLabel() — teks OCR tanpa kode terdeteksi -> tidak membuat apa pun, error dikembalikan', async () => {
  const { ctx, idb } = makeCtx();
  const setsBefore = idb.calls.set;
  const res = await ctx.VehicleCatalog.handleOcrLabel('SPAREPART ORIGINAL BERKUALITAS TINGGI');
  assert.equal(res.found, false);
  assert.equal(res.item, null);
  assert.ok(res.error);
  assert.equal(idb.calls.set, setsBefore);
});

// ------------------------------------------------------------------------
// getDrafts() / resolveDraft() — lanjutan ringan dari handleScan()
// ------------------------------------------------------------------------
test('getDrafts() — hanya mengembalikan part dgn isDraft:true, part biasa tidak ikut', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Part Biasa', category: 'Cat' });
  await ctx.VehicleCatalog.handleScan('code-draft-1');
  const drafts = await ctx.VehicleCatalog.getDrafts();
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].barcode, 'code-draft-1');
});

test('getDrafts() — kosong kalau tidak ada draft sama sekali', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Part Biasa', category: 'Cat' });
  const drafts = await ctx.VehicleCatalog.getDrafts();
  assert.deepEqual(Array.from(drafts), []);
});

test('resolveDraft() — melengkapi draft jadi part biasa, isDraft jadi false, field patch tersimpan', async () => {
  const { ctx } = makeCtx();
  const scan = await ctx.VehicleCatalog.handleScan('code-draft-2');
  const res = await ctx.VehicleCatalog.resolveDraft(scan.item.id, { partName: 'Kampas Rem Depan', category: 'Rem' });
  assert.equal(res.success, true);
  assert.equal(res.item.isDraft, false);
  assert.equal(res.item.partName, 'Kampas Rem Depan');
  assert.equal(res.item.barcode, 'code-draft-2');
  const drafts = await ctx.VehicleCatalog.getDrafts();
  assert.equal(drafts.length, 0);
});

test('resolveDraft() — id tidak ditemukan -> error, tidak menulis apa pun', async () => {
  const { ctx, idb } = makeCtx();
  const setsBefore = idb.calls.set;
  const res = await ctx.VehicleCatalog.resolveDraft('id-tidak-ada', { partName: 'X' });
  assert.equal(res.success, false);
  assert.ok(res.errors && res.errors.length > 0);
  assert.equal(idb.calls.set, setsBefore);
});

test('resolveDraft() — part bukan draft (isDraft:false) -> ditolak eksplisit, tidak diubah', async () => {
  const { ctx } = makeCtx();
  const created = await ctx.VehicleCatalog.create({ partName: 'Part Biasa', category: 'Cat' });
  const res = await ctx.VehicleCatalog.resolveDraft(created.item.id, { partName: 'Ganti' });
  assert.equal(res.success, false);
  assert.match(res.errors[0], /bukan draft/);
  const all = await ctx.VehicleCatalog.getAll();
  assert.equal(all[0].partName, 'Part Biasa');
});

// ------------------------------------------------------------------------
// Load caching / IDBStore interaction
// ------------------------------------------------------------------------
test('ensureLoaded() — hanya panggil IDBStore.get() SEKALI walau dipanggil berkali-kali (cache per sesi)', async () => {
  const { ctx, idb } = makeCtx();
  await ctx.VehicleCatalog.getAll();
  await ctx.VehicleCatalog.getAll();
  await ctx.VehicleCatalog.search('x');
  assert.equal(idb.calls.get, 1);
});

test('invalidateCache() — memaksa IDBStore.get() dipanggil ulang di akses berikutnya', async () => {
  const { ctx, idb } = makeCtx();
  await ctx.VehicleCatalog.getAll();
  assert.equal(idb.calls.get, 1);
  ctx.VehicleCatalog.invalidateCache();
  await ctx.VehicleCatalog.getAll();
  assert.equal(idb.calls.get, 2);
});

test('load awal dari IDBStore yang sudah berisi data (simulasi restore/refresh) -> terbaca dgn benar', async () => {
  const existing = { items: [{ id: 'x1', partName: 'Existing Part', category: 'Cat', oemCode: '', barcode: '', compatibleVehicleIds: [], photos: [], notes: '', createdAt: 't', updatedAt: 't' }] };
  const { ctx } = makeCtx(existing);
  const all = await ctx.VehicleCatalog.getAll();
  assert.equal(all.length, 1);
  assert.equal(all[0].partName, 'Existing Part');
});

test('getStore() — data rusak/bukan array (mis. dari versi lama) dinormalisasi jadi array kosong, tidak crash', async () => {
  const { ctx } = makeCtx({ items: 'bukan-array' });
  const all = await ctx.VehicleCatalog.getAll();
  assert.deepEqual(Array.from(all), []);
});

// isLoaded() — Sesi 276 (audit sinkronisasi lintas-fitur): getter sync utk
// konsumen lain (mis. runDataHealthCheck()) cek apakah getStore() sudah
// terisi data asli, bukan default kosong bawaan modul sebelum load pertama.
test('isLoaded() — false sebelum ensureLoaded()/getAll() pernah dipanggil', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.VehicleCatalog.isLoaded(), false);
});

test('isLoaded() — true setelah getAll() (ensureLoaded implisit) pernah dipanggil', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.getAll();
  assert.equal(ctx.VehicleCatalog.isLoaded(), true);
});

test('isLoaded() — kembali false setelah invalidateCache()', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.getAll();
  assert.equal(ctx.VehicleCatalog.isLoaded(), true);
  ctx.VehicleCatalog.invalidateCache();
  assert.equal(ctx.VehicleCatalog.isLoaded(), false);
});

// ------------------------------------------------------------------------
// recommend() — Tahap 6 Sesi 4 (rekomendasi part berdasar kompatibilitas
// kendaraan & jenis servis)
// ------------------------------------------------------------------------
test('recommend() — tanpa vehicleId & item -> array kosong (tidak ada dasar rekomendasi)', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Kampas Rem', category: 'Rem' });
  const res = await ctx.VehicleCatalog.recommend({});
  assert.deepEqual(Array.from(res), []);
});

test('recommend() — vehicleId cocok compatibleVehicleIds -> ikut direkomendasikan', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Kampas Rem Depan', category: 'Rem', compatibleVehicleIds: ['veh-1'] });
  await ctx.VehicleCatalog.create({ partName: 'Busi Racing', category: 'Mesin', compatibleVehicleIds: ['veh-2'] });
  const res = await ctx.VehicleCatalog.recommend({ vehicleId: 'veh-1' });
  assert.equal(res.length, 1);
  assert.equal(res[0].partName, 'Kampas Rem Depan');
});

test('recommend() — item cocok substring di partName ATAU category (case-insensitive) -> ikut direkomendasikan', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Oli Mesin Yamalube', category: 'Mesin' });
  await ctx.VehicleCatalog.create({ partName: 'Kampas Rem', category: 'Rem' });
  const res = await ctx.VehicleCatalog.recommend({ item: 'OLI Mesin' });
  assert.equal(res.length, 1);
  assert.equal(res[0].partName, 'Oli Mesin Yamalube');
});

test('recommend() — part draft (isDraft:true) tidak pernah ikut direkomendasikan', async () => {
  const { ctx } = makeCtx();
  const scan = await ctx.VehicleCatalog.handleScan('1234567890');
  assert.equal(scan.draft, true);
  const res = await ctx.VehicleCatalog.recommend({ vehicleId: 'apa-saja', item: 'draft' });
  assert.deepEqual(Array.from(res), []);
});

test('recommend() — diurutkan skor desc (cocok vehicleId+item dulu, baru salah satu saja), lalu nama A-Z, dibatasi limit', async () => {
  const { ctx } = makeCtx();
  await ctx.VehicleCatalog.create({ partName: 'Z Kampas Rem Belakang', category: 'Rem', compatibleVehicleIds: ['veh-1'] });
  await ctx.VehicleCatalog.create({ partName: 'A Kampas Rem Depan', category: 'Rem', compatibleVehicleIds: ['veh-1'] });
  await ctx.VehicleCatalog.create({ partName: 'B Kampas Kopling', category: 'Rem', compatibleVehicleIds: ['veh-9'] });
  const res = await ctx.VehicleCatalog.recommend({ vehicleId: 'veh-1', item: 'kampas rem', limit: 2 });
  assert.equal(res.length, 2);
  assert.equal(res[0].partName, 'A Kampas Rem Depan');
  assert.equal(res[1].partName, 'Z Kampas Rem Belakang');
});

// --- filterForVehicle() -- bugfix "katalog masih menampilkan kendaraan
// lain saat pindah kendaraan" di Car Notes (VehicleCatalogUI.renderList() &
// Servis.populateCatalogPartSelect() reuse fungsi murni ini). ---
test('filterForVehicle() — hanya part yang compatibleVehicleIds-nya memuat vehicleId yang lolos', () => {
  const { ctx } = makeCtx();
  const items = [
    { id: 'p1', partName: 'Busi Vario', compatibleVehicleIds: ['veh-1'] },
    { id: 'p2', partName: 'Aki Mobil', compatibleVehicleIds: ['veh-2'] },
    { id: 'p3', partName: 'Kampas Rem Vario', compatibleVehicleIds: ['veh-1', 'veh-2'] },
  ];
  const res = ctx.VehicleCatalog.filterForVehicle(items, 'veh-1');
  assert.deepEqual(res.map((it) => it.id), ['p1', 'p3']);
});

test('filterForVehicle() — part TANPA compatibleVehicleIds (belum ditandai) dianggap universal, tetap lolos utk kendaraan manapun', () => {
  const { ctx } = makeCtx();
  const items = [
    { id: 'p1', partName: 'Oli Universal', compatibleVehicleIds: [] },
    { id: 'p2', partName: 'Baru Discan' },
    { id: 'p3', partName: 'Khusus Veh 2', compatibleVehicleIds: ['veh-2'] },
  ];
  const res = ctx.VehicleCatalog.filterForVehicle(items, 'veh-1');
  assert.deepEqual(res.map((it) => it.id), ['p1', 'p2']);
});

test('filterForVehicle() — vehicleId kosong: kembalikan apa adanya tanpa filter', () => {
  const { ctx } = makeCtx();
  const items = [
    { id: 'p1', compatibleVehicleIds: ['veh-1'] },
    { id: 'p2', compatibleVehicleIds: ['veh-2'] },
  ];
  assert.equal(ctx.VehicleCatalog.filterForVehicle(items, null).length, 2);
  assert.equal(ctx.VehicleCatalog.filterForVehicle(items, '').length, 2);
});
