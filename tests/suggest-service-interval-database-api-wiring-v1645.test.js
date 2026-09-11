'use strict';
// tests/suggest-service-interval-database-api-wiring-v1645.test.js — lanjutan
// backlog Database API Fase 1 (sesi v1643/v1644, "Sengaja TIDAK dikerjakan":
// migrasi TORSI_DB/VEHICLE_SPEC_DB literal di sparepart-servis-b.js).
//
// Target sesi ini: suggestServiceIntervalKm() (modules/vehicle/sparepart-servis-b.js)
// -- loop scan-semua-entri (dipakai kalau kendaraan aktif user tidak match
// TORSI_DB) sekarang baca lewat _allTorsiEntries(), fungsi baru dengan pola
// guard SAMA PERSIS findTorsiDb()/findVehicleSpec() di file yang sama: baca
// DatabaseAPI.vehicle.getAll().map(r=>r.torsi) kalau DatabaseAPI sudah
// termuat, fallback ke literal TORSI_DB kalau belum. 0 perubahan kontrak
// suggestServiceIntervalKm() itu sendiri (signature/return shape sama).
//
// RULE yang dites di sini:
//   - DatabaseAPI TIDAK termuat -> _allTorsiEntries() balikin TORSI_DB
//     literal (fallback), suggestServiceIntervalKm() tetap jalan seperti
//     sebelumnya (0 regresi).
//   - DatabaseAPI termuat -> _allTorsiEntries() baca dari
//     DatabaseAPI.vehicle.getAll() (bukan TORSI_DB literal langsung).
//   - suggestServiceIntervalKm() dg vehicleId yg TIDAK match TORSI_DB
//     (mis. mobil, sedangkan TORSI_DB isinya data motor) tetap fallback ke
//     scan-semua-entri lewat _allTorsiEntries() dan ketemu hasil yang sama
//     baik lewat DatabaseAPI maupun fallback literal.
//   - Kalau DatabaseAPI.vehicle.getAll() dipatch supaya balikin array
//     record custom (bukan data asli), suggestServiceIntervalKm() ikut
//     baca data custom itu -- bukti loop-nya benar2 lewat DatabaseAPI, bukan
//     diam-diam tetap baca TORSI_DB.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides = {}) {
  return Object.assign({
    vehicles: [],
  }, overrides);
}

function makeCtx({ D, withDatabaseAPI }) {
  const files = withDatabaseAPI
    ? ['modules/engine/database-api.js', 'modules/vehicle/sparepart-servis-b.js']
    : ['modules/vehicle/sparepart-servis-b.js'];
  return loadSource(
    files,
    // MY_WRENCH -- dideklarasikan di car-notes.js (bukan file yang dites di
    // sini), tapi dibaca top-level oleh MY_WRENCH_SCALE di
    // sparepart-servis-b.js. Di-inject minimal stub-nya saja supaya file
    // bisa di-load terisolasi tanpa ikut load seluruh car-notes.js -- tidak
    // relevan sama sekali dengan _allTorsiEntries()/suggestServiceIntervalKm()
    // yang dites di file ini.
    { D, MY_WRENCH: { minLbft: 10, maxLbft: 80 } },
    withDatabaseAPI ? ['DatabaseAPI', 'TORSI_DB'] : ['TORSI_DB'],
  );
}

test('DatabaseAPI TIDAK termuat -- _allTorsiEntries() fallback ke TORSI_DB literal', () => {
  const D = makeD();
  const ctx = makeCtx({ D, withDatabaseAPI: false });
  assert.equal(typeof ctx.DatabaseAPI, 'undefined');
  const entries = ctx._allTorsiEntries();
  assert.ok(Array.isArray(entries));
  assert.ok(entries.length > 0);
  assert.equal(entries, ctx.TORSI_DB);
});

test('DatabaseAPI termuat -- _allTorsiEntries() baca dari DatabaseAPI.vehicle.getAll(), bukan TORSI_DB literal langsung', () => {
  const D = makeD();
  const ctx = makeCtx({ D, withDatabaseAPI: true });
  assert.equal(typeof ctx.DatabaseAPI, 'object');
  const entries = ctx._allTorsiEntries();
  const expected = ctx.DatabaseAPI.vehicle.getAll().map((r) => r.torsi).filter(Boolean);
  assert.deepEqual(entries.map((e) => e.sourceNote), expected.map((e) => e.sourceNote));
  assert.ok(entries.length > 0);
});

test('suggestServiceIntervalKm() -- kendaraan tidak match TORSI_DB, tetap ketemu via scan-semua-entri (fallback literal)', () => {
  const D = makeD({ vehicles: [{ id: 'veh_1', name: 'Toyota Avanza (tidak ada di TORSI_DB)' }] });
  const ctx = makeCtx({ D, withDatabaseAPI: false });
  const result = ctx.suggestServiceIntervalKm('Pin brake pad (kampas rem)', 'veh_1');
  assert.ok(result, 'harus tetap ketemu lewat scan-semua-entri TORSI_DB');
  assert.equal(result.km, 4000);
});

test('suggestServiceIntervalKm() -- kendaraan tidak match, hasil sama persis baik lewat DatabaseAPI maupun fallback literal', () => {
  const partName = 'Pin brake pad (kampas rem)';
  const vehicleId = 'veh_1';
  const vehName = 'Toyota Avanza (tidak ada di TORSI_DB)';

  const ctxFallback = makeCtx({ D: makeD({ vehicles: [{ id: vehicleId, name: vehName }] }), withDatabaseAPI: false });
  const resultFallback = ctxFallback.suggestServiceIntervalKm(partName, vehicleId);

  const ctxApi = makeCtx({ D: makeD({ vehicles: [{ id: vehicleId, name: vehName }] }), withDatabaseAPI: true });
  const resultApi = ctxApi.suggestServiceIntervalKm(partName, vehicleId);

  assert.ok(resultFallback);
  assert.ok(resultApi);
  // Bandingkan lewat JSON, bukan assert.deepEqual langsung -- kedua objek
  // berasal dari 2 vm context (realm) berbeda, jadi prototype Object-nya
  // tidak sama persis walau isinya identik (assert.deepEqual/deepStrictEqual
  // ikut membandingkan itu, bikin false-negative "not reference-equal").
  assert.equal(JSON.stringify(resultApi), JSON.stringify(resultFallback));
});

test('suggestServiceIntervalKm() -- loop scan-semua-entri benar2 lewat DatabaseAPI (bukti: data custom via getAll() ikut kepakai)', () => {
  const D = makeD({ vehicles: [{ id: 'veh_1', name: 'Kendaraan Tidak Dikenal' }] });
  const ctx = makeCtx({ D, withDatabaseAPI: true });

  // Ganti implementasi getAll() supaya balikin 1 record custom dengan
  // interval yang TIDAK ada di TORSI_DB asli manapun -- kalau
  // suggestServiceIntervalKm() masih ketemu angka ini, berarti loop-nya
  // sungguh2 baca DatabaseAPI.vehicle.getAll(), bukan diam2 tetap pakai
  // TORSI_DB literal yang di-load duluan ke sandbox.
  ctx.DatabaseAPI.vehicle.getAll = () => [{
    torsi: {
      matchNames: ['kendaraan custom xyz'],
      sourceNote: 'Sumber Custom Test',
      cats: [{
        cat: 'Custom', icon: '🔧', items: [
          { name: 'Part Custom Unik Sekali', ulir: '10 mm', nm: 10, kgf: 1, interval: 'Ganti tiap 12.345 km' },
        ],
      }],
    },
  }];

  const result = ctx.suggestServiceIntervalKm('Part Custom Unik Sekali', 'veh_1');
  assert.ok(result, 'harus ketemu lewat data custom DatabaseAPI, bukan TORSI_DB literal asli');
  assert.equal(result.km, 12345);
  assert.equal(result.source, 'Sumber Custom Test');
});
