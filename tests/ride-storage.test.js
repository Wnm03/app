'use strict';
// tests/ride-storage.test.js — cakupan modules/vehicle/ride-storage.js
// (S524, "Ride Storage & Recovery Foundation"). RideStorage dites via
// loadSource dengan extraGlobals `indexedDB`/`IDBKeyRange` PALSU (fake
// in-memory IndexedDB double, lihat tests/helpers/fakeIndexedDB.js) —
// TANPA IndexedDB browser asli, sama pola dgn tests/ride-gps-recorder.test.js
// yang memakai fake navigator.geolocation.
//
// "Reopen database preserves data" (test #29) disimulasikan dgn load()
// DUA KALI memakai instance fake indexedDB yang SAMA (data "fisik"
// tersimpan di situ) tapi sandbox module RideStorage yang BEDA (cache
// koneksi _dbPromise internal ke-reset otomatis krn load() baru = top-level
// state baru) — persis meniru "app ditutup lalu dibuka lagi".

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeIndexedDB, FakeIDBKeyRange } = require('./helpers/fakeIndexedDB');

function load(fakeIdb) {
  const idb = fakeIdb || createFakeIndexedDB();
  const ctx = loadSource(
    ['modules/vehicle/ride-storage.js'],
    { indexedDB: idb, IDBKeyRange: FakeIDBKeyRange },
    ['RideStorage'],
  );
  return { RideStorage: ctx.RideStorage, idb };
}

function session(overrides) {
  return {
    rideId: 'ride-1',
    status: 'RECORDING',
    startedAt: 1000,
    endedAt: null,
    updatedAt: 1000,
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
    speed: 1.5,
    ...overrides,
  };
}

async function assertRejectsCode(promise, code) {
  await assert.rejects(promise, (err) => {
    assert.equal(err.code, code);
    return true;
  });
}

// --- Database ---------------------------------------------------------

test('database opens successfully', async () => {
  const { RideStorage } = load();
  const result = await RideStorage.getRecoverableRides();
  assert.deepEqual(result, []);
});

test('schema initializes with rides + trackpoints stores', async () => {
  const { RideStorage, idb } = load();
  await RideStorage.createRide(session());
  const db = idb._databases.get(RideStorage.DB_NAME);
  assert.ok(db.objectStoreNames.contains('rides'));
  assert.ok(db.objectStoreNames.contains('trackpoints'));
});

test('schema version is correct (v1)', async () => {
  const { RideStorage, idb } = load();
  await RideStorage.createRide(session());
  const db = idb._databases.get(RideStorage.DB_NAME);
  assert.equal(db.version, 1);
  assert.equal(RideStorage.DB_VERSION, 1);
});

// --- Ride ---------------------------------------------------------------

test('createRide() — data valid tersimpan', async () => {
  const { RideStorage } = load();
  const saved = await RideStorage.createRide(session());
  assert.equal(saved.rideId, 'ride-1');
  assert.equal(saved.status, 'RECORDING');
});

test('getRide() — mengembalikan ride yang sudah dibuat', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  const found = await RideStorage.getRide('ride-1');
  assert.equal(found.rideId, 'ride-1');
  assert.equal(found.startedAt, 1000);
});

test('updateRide() — mengubah status/updatedAt ride existing', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  const updated = await RideStorage.updateRide(session({ status: 'STOPPED', endedAt: 2000, updatedAt: 2000 }));
  assert.equal(updated.status, 'STOPPED');
  const found = await RideStorage.getRide('ride-1');
  assert.equal(found.status, 'STOPPED');
  assert.equal(found.endedAt, 2000);
});

test('updateRide() — rideId belum ada -> NOT_FOUND, tidak membuat record baru', async () => {
  const { RideStorage } = load();
  await assertRejectsCode(RideStorage.updateRide(session({ rideId: 'ghost' })), 'NOT_FOUND');
  const found = await RideStorage.getRide('ghost');
  assert.equal(found, null);
});

test('getRide() — ride tidak ada -> null (bukan crash)', async () => {
  const { RideStorage } = load();
  const found = await RideStorage.getRide('does-not-exist');
  assert.equal(found, null);
});

test('getRide()/createRide()/updateRide() — invalid rideId -> INVALID_INPUT', async () => {
  const { RideStorage } = load();
  await assertRejectsCode(RideStorage.getRide(''), 'INVALID_INPUT');
  await assertRejectsCode(RideStorage.getRide(null), 'INVALID_INPUT');
  await assertRejectsCode(RideStorage.createRide(session({ rideId: '' })), 'INVALID_INPUT');
  await assertRejectsCode(RideStorage.updateRide(session({ rideId: 42 })), 'INVALID_INPUT');
});

test('createRide() — duplicate rideId -> TRANSACTION_ERROR, tidak menimpa data lama', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  await assertRejectsCode(RideStorage.createRide(session({ status: 'PAUSED' })), 'TRANSACTION_ERROR');
  const found = await RideStorage.getRide('ride-1');
  assert.equal(found.status, 'RECORDING');
});

test('deleteRide() — menghapus ride', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  await RideStorage.deleteRide('ride-1');
  const found = await RideStorage.getRide('ride-1');
  assert.equal(found, null);
});

test('deleteRide() — ride tidak ada -> tetap resolve (idempotent, bukan error)', async () => {
  const { RideStorage } = load();
  await assert.doesNotReject(RideStorage.deleteRide('does-not-exist'));
});

// --- Trackpoints ----------------------------------------------------------

test('saveTrackpoint() — menyimpan satu trackpoint', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  await RideStorage.saveTrackpoint(point());
  const pts = await RideStorage.getTrackpoints('ride-1');
  assert.equal(pts.length, 1);
  assert.equal(pts[0].sequence, 0);
});

test('saveTrackpoints() — menyimpan banyak trackpoint sekaligus', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  await RideStorage.saveTrackpoints([point({ sequence: 0 }), point({ sequence: 1 }), point({ sequence: 2 })]);
  const pts = await RideStorage.getTrackpoints('ride-1');
  assert.equal(pts.length, 3);
});

test('getTrackpoints() — mengembalikan trackpoints terurut ascending per sequence', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  await RideStorage.saveTrackpoints([point({ sequence: 2 }), point({ sequence: 0 }), point({ sequence: 1 })]);
  const pts = await RideStorage.getTrackpoints('ride-1');
  assert.deepEqual(pts.map((p) => p.sequence), [0, 1, 2]);
});

test('getTrackpoints() — ride tanpa trackpoint -> array kosong', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  const pts = await RideStorage.getTrackpoints('ride-1');
  assert.deepEqual(pts, []);
});

test('saveTrackpoints() — trackpoint invalid ditolak, tidak masuk database', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  await assertRejectsCode(
    RideStorage.saveTrackpoints([point({ sequence: 0 }), point({ sequence: 1, latitude: 999 })]),
    'INVALID_INPUT',
  );
  const pts = await RideStorage.getTrackpoints('ride-1');
  assert.deepEqual(pts, []);
});

test('getTrackpoints() — rideId yang tidak punya ride sama sekali -> array kosong (bukan crash)', async () => {
  const { RideStorage } = load();
  const pts = await RideStorage.getTrackpoints('never-created');
  assert.deepEqual(pts, []);
});

test('saveTrackpoint()/saveTrackpoints() — input tidak dimutasi', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  const original = [point({ sequence: 0 }), point({ sequence: 1 })];
  const snapshot = JSON.parse(JSON.stringify(original));
  await RideStorage.saveTrackpoints(original);
  assert.deepEqual(original, snapshot);
});

// --- Bulk transaction -------------------------------------------------

test('saveTrackpoints() — bulk write atomic: semua record masuk sekaligus', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  const many = Array.from({ length: 20 }, (_, i) => point({ sequence: i }));
  await RideStorage.saveTrackpoints(many);
  const pts = await RideStorage.getTrackpoints('ride-1');
  assert.equal(pts.length, 20);
});

test('saveTrackpoints() — 1 record invalid membatalkan SELURUH batch (all-or-nothing)', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  const batch = [point({ sequence: 0 }), point({ sequence: 1 }), point({ sequence: 2, longitude: 999 })];
  await assertRejectsCode(RideStorage.saveTrackpoints(batch), 'INVALID_INPUT');
  const pts = await RideStorage.getTrackpoints('ride-1');
  assert.equal(pts.length, 0, 'tidak boleh ada partial write dari batch yang gagal');
});

test('saveTrackpoints() — duplicate rideId+sequence dalam DB membatalkan seluruh batch baru', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  await RideStorage.saveTrackpoint(point({ sequence: 0 }));
  await assertRejectsCode(
    RideStorage.saveTrackpoints([point({ sequence: 1 }), point({ sequence: 0 })]),
    'TRANSACTION_ERROR',
  );
  const pts = await RideStorage.getTrackpoints('ride-1');
  // sequence 1 dari batch yang gagal TIDAK boleh nyangkut walau request
  // sebelumnya di batch itu sempat "berhasil" di dalam transaction.
  assert.deepEqual(pts.map((p) => p.sequence), [0]);
});

// --- Recovery -------------------------------------------------------------

test('getRecoverableRides() — mendeteksi ride berstatus RECORDING', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a', status: 'RECORDING' }));
  const recoverable = await RideStorage.getRecoverableRides();
  assert.equal(recoverable.length, 1);
  assert.equal(recoverable[0].rideId, 'a');
});

test('getRecoverableRides() — ride yang sudah STOPPED tidak dianggap recoverable', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a', status: 'STOPPED', endedAt: 5000, updatedAt: 5000 }));
  const recoverable = await RideStorage.getRecoverableRides();
  assert.deepEqual(recoverable, []);
});

test('getRecoverableRides() — tidak mengubah state ride yang ditemukan', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a', status: 'RECORDING' }));
  await RideStorage.getRecoverableRides();
  const found = await RideStorage.getRide('a');
  assert.equal(found.status, 'RECORDING');
  assert.equal(found.updatedAt, 1000);
});

test('getRecoverableRides() — mendeteksi banyak ride recoverable sekaligus', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a', status: 'RECORDING' }));
  await RideStorage.createRide(session({ rideId: 'b', status: 'RECORDING' }));
  await RideStorage.createRide(session({ rideId: 'c', status: 'STOPPED', endedAt: 1, updatedAt: 1 }));
  const recoverable = await RideStorage.getRecoverableRides();
  assert.deepEqual(recoverable.map((r) => r.rideId).sort(), ['a', 'b']);
});

// --- Defensive behavior -----------------------------------------------

test('getRide() — hasil adalah defensive copy (mutasi caller tidak menembus storage)', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  const found = await RideStorage.getRide('ride-1');
  found.status = 'HACKED';
  const foundAgain = await RideStorage.getRide('ride-1');
  assert.equal(foundAgain.status, 'RECORDING');
});

test('getTrackpoints() — hasil adalah defensive copy per titik', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  await RideStorage.saveTrackpoint(point());
  const pts = await RideStorage.getTrackpoints('ride-1');
  pts[0].latitude = 0;
  const ptsAgain = await RideStorage.getTrackpoints('ride-1');
  assert.equal(ptsAgain[0].latitude, -6.2);
});

test('repeated reads mengembalikan hasil yang deterministic/identik', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  await RideStorage.saveTrackpoints([point({ sequence: 0 }), point({ sequence: 1 })]);
  const first = await RideStorage.getTrackpoints('ride-1');
  const second = await RideStorage.getTrackpoints('ride-1');
  assert.deepEqual(first, second);
});

// --- Lifecycle / cleanup ------------------------------------------------

test('deleteRide() — turut menghapus semua trackpoints milik ride tsb', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  await RideStorage.saveTrackpoints([point({ sequence: 0 }), point({ sequence: 1 })]);
  await RideStorage.deleteRide('ride-1');
  const pts = await RideStorage.getTrackpoints('ride-1');
  assert.deepEqual(pts, []);
});

test('deleteRide() — tidak menyentuh trackpoints milik ride lain', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a' }));
  await RideStorage.createRide(session({ rideId: 'b' }));
  await RideStorage.saveTrackpoints([point({ rideId: 'a', sequence: 0 }), point({ rideId: 'b', sequence: 0 })]);
  await RideStorage.deleteRide('a');
  const ptsA = await RideStorage.getTrackpoints('a');
  const ptsB = await RideStorage.getTrackpoints('b');
  assert.deepEqual(ptsA, []);
  assert.equal(ptsB.length, 1);
});

test('clearRideStorage() — mengosongkan seluruh rides + trackpoints', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a' }));
  await RideStorage.saveTrackpoint(point({ rideId: 'a', sequence: 0 }));
  await RideStorage.clearRideStorage();
  assert.equal(await RideStorage.getRide('a'), null);
  assert.deepEqual(await RideStorage.getTrackpoints('a'), []);
  assert.deepEqual(await RideStorage.getRecoverableRides(), []);
});

test('reopen database (instance module baru, fake indexedDB fisik sama) tetap mempertahankan data', async () => {
  const sharedIdb = createFakeIndexedDB();
  const first = load(sharedIdb);
  await first.RideStorage.createRide(session());
  await first.RideStorage.saveTrackpoint(point());

  const second = load(sharedIdb);
  const found = await second.RideStorage.getRide('ride-1');
  const pts = await second.RideStorage.getTrackpoints('ride-1');
  assert.equal(found.rideId, 'ride-1');
  assert.equal(pts.length, 1);
});

// --- listRides() (S524 CORRECTIVE PASS — buka blocker S527) --------------

test('listRides() — database kosong -> []', async () => {
  const { RideStorage } = load();
  const result = await RideStorage.listRides();
  assert.deepEqual(result, []);
});

test('listRides() — tanpa argumen mengembalikan seluruh ride', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a', status: 'RECORDING' }));
  await RideStorage.createRide(session({ rideId: 'b', status: 'STOPPED', endedAt: 2000, updatedAt: 2000 }));
  await RideStorage.createRide(session({ rideId: 'c', status: 'PAUSED' }));
  const result = await RideStorage.listRides();
  assert.deepEqual(result.map((r) => r.rideId), ['a', 'b', 'c']);
});

test('listRides(null) / listRides(undefined) — diperlakukan sama seperti tanpa argumen', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a', status: 'STOPPED', endedAt: 1, updatedAt: 1 }));
  const viaNull = await RideStorage.listRides(null);
  const viaUndefined = await RideStorage.listRides(undefined);
  assert.deepEqual(viaNull.map((r) => r.rideId), ['a']);
  assert.deepEqual(viaUndefined.map((r) => r.rideId), ['a']);
});

test('listRides({ status: "STOPPED" }) — hanya ride STOPPED', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a', status: 'RECORDING' }));
  await RideStorage.createRide(session({ rideId: 'b', status: 'STOPPED', endedAt: 2000, updatedAt: 2000 }));
  await RideStorage.createRide(session({ rideId: 'c', status: 'STOPPED', endedAt: 3000, updatedAt: 3000 }));
  const result = await RideStorage.listRides({ status: 'STOPPED' });
  assert.deepEqual(result.map((r) => r.rideId), ['b', 'c']);
});

test('listRides({ status: "RECORDING" }) — hanya ride RECORDING (setara getRecoverableRides)', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a', status: 'RECORDING' }));
  await RideStorage.createRide(session({ rideId: 'b', status: 'STOPPED', endedAt: 1, updatedAt: 1 }));
  const result = await RideStorage.listRides({ status: 'RECORDING' });
  assert.deepEqual(result.map((r) => r.rideId), ['a']);
});

test('listRides({ status: "PAUSED" }) — status lain di luar RECORDING/STOPPED tetap kefilter benar', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a', status: 'PAUSED' }));
  await RideStorage.createRide(session({ rideId: 'b', status: 'RECORDING' }));
  const result = await RideStorage.listRides({ status: 'PAUSED' });
  assert.deepEqual(result.map((r) => r.rideId), ['a']);
});

test('listRides() — filter status tanpa match -> []', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a', status: 'RECORDING' }));
  const result = await RideStorage.listRides({ status: 'STOPPED' });
  assert.deepEqual(result, []);
});

test('listRides() — options tidak dimutasi', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a', status: 'STOPPED', endedAt: 1, updatedAt: 1 }));
  const options = { status: 'STOPPED' };
  const snapshot = JSON.parse(JSON.stringify(options));
  await RideStorage.listRides(options);
  assert.deepEqual(options, snapshot);
});

test('listRides() — hasil adalah defensive copy (mutasi caller tidak menembus storage)', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a' }));
  const result = await RideStorage.listRides();
  result[0].status = 'HACKED';
  const found = await RideStorage.getRide('a');
  assert.equal(found.status, 'RECORDING');
});

test('listRides() — urutan hasil deterministic ascending by rideId, konsisten antar pemanggilan', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'zulu', status: 'STOPPED', endedAt: 1, updatedAt: 1 }));
  await RideStorage.createRide(session({ rideId: 'alpha', status: 'STOPPED', endedAt: 1, updatedAt: 1 }));
  await RideStorage.createRide(session({ rideId: 'mike', status: 'STOPPED', endedAt: 1, updatedAt: 1 }));
  const first = await RideStorage.listRides();
  const second = await RideStorage.listRides();
  assert.deepEqual(first.map((r) => r.rideId), ['alpha', 'mike', 'zulu']);
  assert.deepEqual(first, second);
});

test('listRides() — options bukan object (mis. string/array) -> INVALID_INPUT', async () => {
  const { RideStorage } = load();
  await assertRejectsCode(RideStorage.listRides('STOPPED'), 'INVALID_INPUT');
  await assertRejectsCode(RideStorage.listRides(['STOPPED']), 'INVALID_INPUT');
});

test('listRides() — options.status bukan non-empty string -> INVALID_INPUT', async () => {
  const { RideStorage } = load();
  await assertRejectsCode(RideStorage.listRides({ status: '' }), 'INVALID_INPUT');
  await assertRejectsCode(RideStorage.listRides({ status: 42 }), 'INVALID_INPUT');
});

test('listRides() — tidak mengubah state ride yang ditemukan (read-only)', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session({ rideId: 'a', status: 'RECORDING' }));
  await RideStorage.listRides();
  const found = await RideStorage.getRide('a');
  assert.equal(found.status, 'RECORDING');
  assert.equal(found.updatedAt, 1000);
});

// --- Session validation edge cases -----------------------------------

test('createRide() — session shape tidak lengkap -> INVALID_INPUT', async () => {
  const { RideStorage } = load();
  await assertRejectsCode(RideStorage.createRide({ rideId: 'x' }), 'INVALID_INPUT');
  await assertRejectsCode(RideStorage.createRide(null), 'INVALID_INPUT');
  await assertRejectsCode(RideStorage.createRide(session({ startedAt: 'not-a-number' })), 'INVALID_INPUT');
});

test('saveTrackpoints() — bukan array -> INVALID_INPUT', async () => {
  const { RideStorage } = load();
  await assertRejectsCode(RideStorage.saveTrackpoints('nope'), 'INVALID_INPUT');
  await assertRejectsCode(RideStorage.saveTrackpoints(null), 'INVALID_INPUT');
});

test('saveTrackpoints() — array kosong ditangani dengan aman', async () => {
  const { RideStorage } = load();
  await RideStorage.createRide(session());
  const result = await RideStorage.saveTrackpoints([]);
  // .length, bukan deepEqual thd literal [] -- result ini literal array
  // dari realm vm sandbox (loadSource), beda realm dgn literal [] di file
  // test ini; deepStrictEqual menganggap array lintas-realm TIDAK
  // reference-equal walau structurally sama (lihat catatan serupa di
  // tests/ride-activity-metrics.test.js).
  assert.equal(result.length, 0);
  const pts = await RideStorage.getTrackpoints('ride-1');
  assert.equal(pts.length, 0);
});
