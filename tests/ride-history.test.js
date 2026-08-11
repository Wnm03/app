'use strict';
// tests/ride-history.test.js — cakupan modules/vehicle/ride-history.js
// (S527, "Ride History & Analytics"). RideHistory/RideAnalytics
// menyatukan RideActivityMetrics (S522) + RideStorage (S524, termasuk
// listRides() dari S524 CORRECTIVE PASS) — dites via loadSource dengan
// KETIGA file itu dimuat bareng (bukan mock), plus fake indexedDB (pola
// identik tests/ride-storage.test.js / tests/ride-ui.test.js), supaya
// integrasi antar modul beneran teruji, bukan cuma RideHistory sendirian.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeIndexedDB, FakeIDBKeyRange } = require('./helpers/fakeIndexedDB');

function load(fakeIdb) {
  const idb = fakeIdb || createFakeIndexedDB();
  const ctx = loadSource(
    ['modules/vehicle/ride-activity-metrics.js', 'modules/vehicle/ride-storage.js', 'modules/vehicle/ride-history.js'],
    { indexedDB: idb, IDBKeyRange: FakeIDBKeyRange },
    ['RideStorage', 'RideActivityMetrics', 'RideHistory', 'RideAnalytics'],
  );
  return {
    RideStorage: ctx.RideStorage,
    RideActivityMetrics: ctx.RideActivityMetrics,
    RideHistory: ctx.RideHistory,
    RideAnalytics: ctx.RideAnalytics,
    idb,
  };
}

function session(overrides) {
  return {
    rideId: 'ride-1',
    status: 'STOPPED',
    startedAt: 1000,
    endedAt: 5000,
    updatedAt: 5000,
    ...overrides,
  };
}

function point(overrides) {
  return {
    rideId: 'ride-1',
    sequence: 0,
    timestamp: 1000,
    latitude: -6.2,
    longitude: 106.8,
    accuracy: 5,
    altitude: 10,
    speed: 5, // m/s -> 18 km/h, di atas threshold moving default (3 km/h)
    ...overrides,
  };
}

// Dua trackpoint yang menghasilkan jarak/durasi/elevation TIDAK NOL
// (dipakai fixture beberapa test History/Analytics di bawah).
function twoPointsFor(rideId) {
  return [
    point({ rideId, sequence: 0, timestamp: 1000, latitude: -6.175392, longitude: 106.827153, altitude: 10, speed: 5 }),
    point({ rideId, sequence: 1, timestamp: 61000, latitude: -6.195000, longitude: 106.823059, altitude: 25, speed: 8 }),
  ];
}

async function seedRide(RideStorage, rideId, overrides) {
  await RideStorage.createRide(session({ rideId, ...overrides }));
  await RideStorage.saveTrackpoints(twoPointsFor(rideId));
}

// =====================================================================
// RideHistory.listRides()
// =====================================================================

test('RideHistory.listRides() — history kosong -> []', async () => {
  const { RideHistory } = load();
  const result = await RideHistory.listRides();
  assert.deepEqual(result, []);
});

test('RideHistory.listRides() — mengembalikan seluruh ride, ordering deterministic ascending by rideId', async () => {
  const { RideStorage, RideHistory } = load();
  await seedRide(RideStorage, 'b', { status: 'STOPPED' });
  await seedRide(RideStorage, 'a', { status: 'RECORDING', endedAt: null, updatedAt: 1000 });
  await seedRide(RideStorage, 'c', { status: 'PAUSED', endedAt: null, updatedAt: 1000 });
  const result = await RideHistory.listRides();
  assert.deepEqual(result.map((r) => r.rideId), ['a', 'b', 'c']);
});

test('RideHistory.listRides({ status: "STOPPED" }) — filter status persis (exact match)', async () => {
  const { RideStorage, RideHistory } = load();
  await seedRide(RideStorage, 'a', { status: 'RECORDING', endedAt: null, updatedAt: 1000 });
  await seedRide(RideStorage, 'b', { status: 'STOPPED' });
  await seedRide(RideStorage, 'c', { status: 'STOPPED' });
  const result = await RideHistory.listRides({ status: 'STOPPED' });
  assert.deepEqual(result.map((r) => r.rideId), ['b', 'c']);
});

test('RideHistory.listRides({ status: "TIDAK-ADA" }) — status yang tidak match ride manapun -> []', async () => {
  const { RideStorage, RideHistory } = load();
  await seedRide(RideStorage, 'a', { status: 'STOPPED' });
  const result = await RideHistory.listRides({ status: 'TIDAK-ADA' });
  assert.deepEqual(result, []);
});

// =====================================================================
// RideHistory.getRideDetail()
// =====================================================================

test('RideHistory.getRideDetail() — ride ditemukan -> { ride, trackpoints }', async () => {
  const { RideStorage, RideHistory } = load();
  await seedRide(RideStorage, 'ride-1');
  const detail = await RideHistory.getRideDetail('ride-1');
  assert.equal(detail.ride.rideId, 'ride-1');
  assert.equal(detail.ride.status, 'STOPPED');
  assert.equal(detail.trackpoints.length, 2);
});

test('RideHistory.getRideDetail() — ride tidak ditemukan -> null (bukan throw)', async () => {
  const { RideHistory } = load();
  const detail = await RideHistory.getRideDetail('ghost');
  assert.equal(detail, null);
});

test('RideHistory.getRideDetail() — ride ada tapi 0 trackpoints -> trackpoints []', async () => {
  const { RideStorage, RideHistory } = load();
  await RideStorage.createRide(session({ rideId: 'empty-ride' }));
  const detail = await RideHistory.getRideDetail('empty-ride');
  assert.deepEqual(detail.trackpoints, []);
});

// =====================================================================
// RideHistory.getRideSummary() — "summary per ride"
// =====================================================================

test('RideHistory.getRideSummary() — ride ditemukan -> summary numerik dari RideActivityMetrics', async () => {
  const { RideStorage, RideHistory } = load();
  await seedRide(RideStorage, 'ride-1');
  const result = await RideHistory.getRideSummary('ride-1');
  assert.equal(result.ride.rideId, 'ride-1');
  assert.ok(result.summary.distanceKm > 0);
  assert.equal(result.summary.durationSec, 60);
  assert.equal(result.summary.pointCount, 2);
});

test('RideHistory.getRideSummary() — ride tidak ditemukan -> null', async () => {
  const { RideHistory } = load();
  const result = await RideHistory.getRideSummary('ghost');
  assert.equal(result, null);
});

test('RideHistory.getRideSummary() — ride tanpa trackpoints -> summary safe-default 0 (bukan crash)', async () => {
  const { RideStorage, RideHistory } = load();
  await RideStorage.createRide(session({ rideId: 'no-points' }));
  const result = await RideHistory.getRideSummary('no-points');
  assert.equal(result.summary.distanceKm, 0);
  assert.equal(result.summary.durationSec, 0);
  assert.equal(result.summary.averageSpeedKmh, 0);
  assert.equal(result.summary.maxSpeedKmh, 0);
  assert.equal(result.summary.elevationGainM, 0);
  assert.equal(result.summary.elevationLossM, 0);
});

// =====================================================================
// RideHistory.deleteRide()
// =====================================================================

test('RideHistory.deleteRide() — menghapus ride + seluruh trackpoints-nya', async () => {
  const { RideStorage, RideHistory } = load();
  await seedRide(RideStorage, 'ride-1');
  const result = await RideHistory.deleteRide('ride-1');
  assert.equal(result.ok, true);
  assert.equal(await RideStorage.getRide('ride-1'), null);
  assert.deepEqual(await RideStorage.getTrackpoints('ride-1'), []);
});

test('RideHistory.deleteRide() — tidak menyentuh ride lain', async () => {
  const { RideStorage, RideHistory } = load();
  await seedRide(RideStorage, 'a');
  await seedRide(RideStorage, 'b');
  await RideHistory.deleteRide('a');
  assert.equal(await RideStorage.getRide('a'), null);
  const b = await RideStorage.getRide('b');
  assert.equal(b.rideId, 'b');
  assert.equal((await RideStorage.getTrackpoints('b')).length, 2);
});

// =====================================================================
// Immutability — RideHistory tidak pernah mutate data storage
// =====================================================================

test('immutability — mutasi hasil getRideDetail() tidak menembus storage', async () => {
  const { RideStorage, RideHistory } = load();
  await seedRide(RideStorage, 'ride-1');
  const detail = await RideHistory.getRideDetail('ride-1');
  detail.ride.status = 'HACKED';
  detail.trackpoints[0].latitude = 0;
  const again = await RideHistory.getRideDetail('ride-1');
  assert.equal(again.ride.status, 'STOPPED');
  assert.equal(again.trackpoints[0].latitude, -6.175392);
});

test('immutability — mutasi hasil getRideSummary() tidak menembus storage', async () => {
  const { RideStorage, RideHistory } = load();
  await seedRide(RideStorage, 'ride-1');
  const result = await RideHistory.getRideSummary('ride-1');
  result.summary.distanceKm = -999;
  result.ride.status = 'HACKED';
  const again = await RideHistory.getRideSummary('ride-1');
  assert.notEqual(again.summary.distanceKm, -999);
  assert.equal(again.ride.status, 'STOPPED');
});

test('immutability — listRides() tidak mutate storage walau hasil array dimutasi caller', async () => {
  const { RideStorage, RideHistory } = load();
  await seedRide(RideStorage, 'a');
  const first = await RideHistory.listRides();
  first[0].status = 'HACKED';
  first.push({ rideId: 'fake' });
  const second = await RideHistory.listRides();
  assert.equal(second.length, 1);
  assert.equal(second[0].status, 'STOPPED');
});

// =====================================================================
// Invalid / corrupt trackpoints — tidak pernah crash
// =====================================================================

test('getRideSummary() — trackpoint dgn koordinat invalid tidak bikin crash (dilewati RideActivityMetrics)', async () => {
  const { RideStorage, RideHistory } = load();
  await RideStorage.createRide(session({ rideId: 'ride-1' }));
  // longitude 999 (di luar rentang) -> ditolak validateTrackpoint saat
  // SAVE (kontrak S524), jadi utk mensimulasikan data "sudah corrupt di
  // storage" tanpa menyentuh ride-storage.js, titik ke-2 sengaja diberi
  // altitude/speed null (bentuk "corrupt/tidak lengkap" yang MASIH lolos
  // validateTrackpoint S524, tapi harus tetap aman di RideActivityMetrics).
  await RideStorage.saveTrackpoints([
    point({ sequence: 0, altitude: null, speed: null, accuracy: null }),
    point({ sequence: 1, timestamp: 61000, altitude: null, speed: null, accuracy: null }),
  ]);
  const result = await RideHistory.getRideSummary('ride-1');
  assert.equal(result.summary.elevationGainM, 0);
  assert.equal(result.summary.elevationLossM, 0);
  assert.equal(result.summary.averageSpeedKmh, 0);
  assert.equal(result.summary.maxSpeedKmh, 0);
});

// =====================================================================
// RideAnalytics.getAnalytics()
// =====================================================================

test('RideAnalytics.getAnalytics() — history kosong -> semua field 0', async () => {
  const { RideAnalytics } = load();
  const result = await RideAnalytics.getAnalytics();
  assert.equal(result.totalRides, 0);
  assert.equal(result.totalDistanceKm, 0);
  assert.equal(result.totalDurationSec, 0);
  assert.equal(result.totalMovingTimeSec, 0);
  assert.equal(result.averageSpeedKmh, 0);
  assert.equal(result.maxSpeedKmh, 0);
  assert.equal(result.elevationGainM, 0);
  assert.equal(result.elevationLossM, 0);
});

test('RideAnalytics.getAnalytics() — default hanya menghitung ride STOPPED (completed)', async () => {
  const { RideStorage, RideAnalytics } = load();
  await seedRide(RideStorage, 'stopped-1', { status: 'STOPPED' });
  await RideStorage.createRide(session({ rideId: 'recording-1', status: 'RECORDING', endedAt: null, updatedAt: 1000 }));
  await RideStorage.saveTrackpoints(twoPointsFor('recording-1'));
  const result = await RideAnalytics.getAnalytics();
  assert.equal(result.totalRides, 1);
});

test('RideAnalytics.getAnalytics({ status: null }) — semua status ikut dihitung', async () => {
  const { RideStorage, RideAnalytics } = load();
  await seedRide(RideStorage, 'stopped-1', { status: 'STOPPED' });
  await RideStorage.createRide(session({ rideId: 'recording-1', status: 'RECORDING', endedAt: null, updatedAt: 1000 }));
  await RideStorage.saveTrackpoints(twoPointsFor('recording-1'));
  const result = await RideAnalytics.getAnalytics({ status: null });
  assert.equal(result.totalRides, 2);
});

test('RideAnalytics.getAnalytics() — totalRides = jumlah ride yang cocok filter', async () => {
  const { RideStorage, RideAnalytics } = load();
  await seedRide(RideStorage, 'a', { status: 'STOPPED' });
  await seedRide(RideStorage, 'b', { status: 'STOPPED' });
  await seedRide(RideStorage, 'c', { status: 'STOPPED' });
  const result = await RideAnalytics.getAnalytics();
  assert.equal(result.totalRides, 3);
});

test('RideAnalytics.getAnalytics() — totalDistanceKm = jumlah distance seluruh ride', async () => {
  const { RideStorage, RideAnalytics, RideActivityMetrics } = load();
  await seedRide(RideStorage, 'a', { status: 'STOPPED' });
  await seedRide(RideStorage, 'b', { status: 'STOPPED' });
  const expectedPerRide = RideActivityMetrics.calculateTotalDistanceKm(twoPointsFor('x'));
  const result = await RideAnalytics.getAnalytics();
  assert.ok(Math.abs(result.totalDistanceKm - expectedPerRide * 2) < 1e-9);
});

test('RideAnalytics.getAnalytics() — totalDurationSec = jumlah duration seluruh ride', async () => {
  const { RideStorage, RideAnalytics } = load();
  await seedRide(RideStorage, 'a', { status: 'STOPPED' }); // 60 detik
  await seedRide(RideStorage, 'b', { status: 'STOPPED' }); // 60 detik
  const result = await RideAnalytics.getAnalytics();
  assert.equal(result.totalDurationSec, 120);
});

test('RideAnalytics.getAnalytics() — totalMovingTimeSec = jumlah moving time seluruh ride', async () => {
  const { RideStorage, RideAnalytics, RideActivityMetrics } = load();
  await seedRide(RideStorage, 'a', { status: 'STOPPED' });
  await seedRide(RideStorage, 'b', { status: 'STOPPED' });
  const expectedPerRide = RideActivityMetrics.calculateMovingTimeSec(twoPointsFor('x'));
  const result = await RideAnalytics.getAnalytics();
  assert.equal(result.totalMovingTimeSec, expectedPerRide * 2);
});

test('RideAnalytics.getAnalytics() — averageSpeedKmh = totalDistance/totalMovingTime (bukan rata-rata dari rata-rata)', async () => {
  const { RideStorage, RideAnalytics } = load();
  await seedRide(RideStorage, 'a', { status: 'STOPPED' });
  await seedRide(RideStorage, 'b', { status: 'STOPPED' });
  const result = await RideAnalytics.getAnalytics();
  const expected = result.totalDistanceKm / (result.totalMovingTimeSec / 3600);
  assert.ok(Math.abs(result.averageSpeedKmh - expected) < 1e-9);
});

test('RideAnalytics.getAnalytics() — maxSpeedKmh = MAX lintas ride (bukan dijumlah)', async () => {
  const { RideStorage, RideAnalytics } = load();
  await RideStorage.createRide(session({ rideId: 'slow' }));
  await RideStorage.saveTrackpoints([
    point({ rideId: 'slow', sequence: 0, timestamp: 1000, speed: 2 }),
    point({ rideId: 'slow', sequence: 1, timestamp: 2000, speed: 3 }),
  ]);
  await RideStorage.createRide(session({ rideId: 'fast' }));
  await RideStorage.saveTrackpoints([
    point({ rideId: 'fast', sequence: 0, timestamp: 1000, speed: 20 }),
    point({ rideId: 'fast', sequence: 1, timestamp: 2000, speed: 25 }),
  ]);
  const result = await RideAnalytics.getAnalytics();
  // 25 m/s * 3.6 = 90 km/h (tertinggi dari kedua ride), BUKAN 3*3.6 + 25*3.6.
  assert.ok(Math.abs(result.maxSpeedKmh - 90) < 1e-9);
});

test('RideAnalytics.getAnalytics() — elevationGainM = jumlah gain seluruh ride', async () => {
  const { RideStorage, RideAnalytics, RideActivityMetrics } = load();
  await seedRide(RideStorage, 'a', { status: 'STOPPED' });
  await seedRide(RideStorage, 'b', { status: 'STOPPED' });
  const expectedPerRide = RideActivityMetrics.calculateElevationGainM(twoPointsFor('x'));
  const result = await RideAnalytics.getAnalytics();
  assert.equal(result.elevationGainM, expectedPerRide * 2);
});

test('RideAnalytics.getAnalytics() — elevationLossM = jumlah loss seluruh ride', async () => {
  const { RideStorage, RideAnalytics } = load();
  await RideStorage.createRide(session({ rideId: 'descend' }));
  await RideStorage.saveTrackpoints([
    point({ rideId: 'descend', sequence: 0, timestamp: 1000, altitude: 100 }),
    point({ rideId: 'descend', sequence: 1, timestamp: 2000, altitude: 60 }),
  ]);
  const result = await RideAnalytics.getAnalytics();
  assert.equal(result.elevationLossM, 40);
  assert.equal(result.elevationGainM, 0);
});

test('RideAnalytics.getAnalytics() — ride dgn trackpoints corrupt/kosong tidak menggagalkan agregat ride lain', async () => {
  const { RideStorage, RideAnalytics } = load();
  await RideStorage.createRide(session({ rideId: 'no-points' })); // 0 trackpoints
  await seedRide(RideStorage, 'normal', { status: 'STOPPED' });
  const result = await RideAnalytics.getAnalytics();
  assert.equal(result.totalRides, 2);
  assert.ok(result.totalDistanceKm > 0);
});

// =====================================================================
// Dependency belum ter-load — tidak pernah throw
// =====================================================================

test('RideHistory.listRides() — RideStorage belum ter-load -> [] (safe default, bukan throw)', () => {
  const ctx = loadSource(['modules/vehicle/ride-history.js'], {}, ['RideHistory']);
  return ctx.RideHistory.listRides().then((result) => {
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });
});

test('RideAnalytics.getAnalytics() — dependency belum ter-load -> semua field 0', () => {
  const ctx = loadSource(['modules/vehicle/ride-history.js'], {}, ['RideAnalytics']);
  return ctx.RideAnalytics.getAnalytics().then((result) => {
    assert.equal(result.totalRides, 0);
    assert.equal(result.totalDistanceKm, 0);
  });
});
