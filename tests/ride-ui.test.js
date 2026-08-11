'use strict';
// tests/ride-ui.test.js — cakupan modules/vehicle/ride-ui.js (S525, "Ride
// UI Foundation"). RideUI menyatukan RideActivityMetrics (S522) +
// RideGpsRecorder (S523) + RideStorage (S524) — dites via loadSource
// dengan KETIGA file itu dimuat bareng (bukan mock), plus fake
// navigator.geolocation (pola sama tests/ride-gps-recorder.test.js) &
// fake indexedDB (pola sama tests/ride-storage.test.js), supaya integrasi
// antar 3 modul itu benar2 teruji, bukan cuma RideUI sendirian.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeIndexedDB, FakeIDBKeyRange } = require('./helpers/fakeIndexedDB');

// --- fake Geolocation provider (identik pola tests/ride-gps-recorder.test.js) ---
function createFakeGeolocation() {
  let nextId = 1;
  const calls = [];
  const clearedIds = new Set();
  return {
    calls,
    clearedIds,
    watchPosition(success, error, options) {
      const id = nextId++;
      calls.push({ id, success, error, options });
      return id;
    },
    clearWatch(id) {
      clearedIds.add(id);
    },
    unavailable: false,
  };
}

function makePosition(overrides) {
  const coords = {
    latitude: -6.175392,
    longitude: 106.827153,
    accuracy: 5,
    altitude: 10,
    speed: 2.5,
    ...(overrides && overrides.coords),
  };
  return {
    coords,
    timestamp: (overrides && overrides.timestamp) !== undefined ? overrides.timestamp : 1000,
  };
}

const KNOWN_IDS = new Set([
  'rideStatusText', 'rideStartBtn', 'ridePauseBtn', 'rideResumeBtn', 'rideStopBtn',
  'rideDiscardBtn', 'rideDistanceText', 'rideDurationText', 'rideAvgSpeedText',
  'rideMaxSpeedText', 'rideErrorText',
]);

function makeDocument() {
  const elements = new Map();
  function el(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        textContent: '',
        _hidden: false,
        classList: {
          toggle(cls, force) {
            if (cls !== 'u-dnone') return;
            el(id)._hidden = force === undefined ? !el(id)._hidden : force;
          },
          contains(cls) {
            return cls === 'u-dnone' && el(id)._hidden;
          },
        },
      });
    }
    return elements.get(id);
  }
  return {
    elements,
    getElementById: (id) => ((elements.has(id) || KNOWN_IDS.has(id)) ? el(id) : null),
  };
}

function load(opts) {
  const fakeGeo = (opts && opts.geo) || createFakeGeolocation();
  const idb = (opts && opts.idb) || createFakeIndexedDB();
  const D = (opts && opts.D) || { vehicles: [] };
  const toasts = [];
  const doc = (opts && opts.document) || makeDocument();

  const ctx = loadSource(
    [
      'modules/vehicle/ride-activity-metrics.js',
      'modules/vehicle/ride-gps-recorder.js',
      'modules/vehicle/ride-storage.js',
      'modules/vehicle/ride-ui.js',
    ],
    {
      navigator: opts && opts.noGeo ? {} : { geolocation: fakeGeo },
      indexedDB: idb,
      IDBKeyRange: FakeIDBKeyRange,
      D,
      document: doc,
      toast: (msg) => toasts.push(msg),
      window: {},
    },
    ['RideActivityMetrics', 'RideGpsRecorder', 'RideStorage', 'RideUI'],
  );
  // deterministic clock
  let clock = (opts && opts.startClock) || 1_000_000;
  ctx.RideUI._nowFn = () => clock;
  const advanceClock = (ms) => { clock += ms; };

  return { ctx, RideUI: ctx.RideUI, RideStorage: ctx.RideStorage, fakeGeo, idb, D, toasts, doc, advanceClock };
}

function vehicle(overrides) {
  return { id: 'veh_1', name: 'Motor Harian', emoji: '🏍️', ...overrides };
}

// --- start() -----------------------------------------------------------

test('start() — sukses tanpa vehicleId, status jadi RECORDING & ride tersimpan di storage', async () => {
  const { RideUI, RideStorage } = load();
  const result = RideUI.start();
  assert.equal(result.ok, true);
  assert.equal(RideUI.getState().status, 'RECORDING');
  assert.ok(RideUI.getState().rideId);
  await RideUI._lastWrite;
  const stored = await RideStorage.getRide(RideUI.getState().rideId);
  assert.equal(stored.status, 'RECORDING');
});

test('start() — sukses dengan vehicleId valid, tersimpan di state runtime (bukan di RideStorage)', async () => {
  const { RideUI } = load({ D: { vehicles: [vehicle()] } });
  const result = RideUI.start('veh_1');
  assert.equal(result.ok, true);
  assert.equal(RideUI.getState().vehicleId, 'veh_1');
});

test('start() — vehicleId tidak ditemukan -> VEHICLE_NOT_FOUND, status tetap IDLE', () => {
  const { RideUI, toasts } = load({ D: { vehicles: [vehicle()] } });
  const result = RideUI.start('veh_ghost');
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'VEHICLE_NOT_FOUND');
  assert.equal(RideUI.getState().status, 'IDLE');
  assert.ok(toasts.some((t) => t.includes('tidak ditemukan')));
});

test('start() — sudah RECORDING -> ALREADY_ACTIVE, tidak membuat ride kedua', () => {
  const { RideUI } = load();
  RideUI.start();
  const firstRideId = RideUI.getState().rideId;
  const result = RideUI.start();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'ALREADY_ACTIVE');
  assert.equal(RideUI.getState().rideId, firstRideId);
});

test('start() — sudah PAUSED -> ALREADY_ACTIVE', () => {
  const { RideUI } = load();
  RideUI.start();
  RideUI.pause();
  const result = RideUI.start();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'ALREADY_ACTIVE');
});

test('start() — geolocation tidak tersedia -> recorder.start() gagal, status tetap IDLE', () => {
  const { RideUI, toasts } = load({ noGeo: true });
  const result = RideUI.start();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'API_UNAVAILABLE');
  assert.equal(RideUI.getState().status, 'IDLE');
  assert.ok(toasts.some((t) => t.includes('Gagal mulai rekam')));
});

// --- module-missing guard ------------------------------------------------

test('start() — RideStorage belum ter-load -> MODULE_MISSING, tidak throw', () => {
  const fakeGeo = createFakeGeolocation();
  const toasts = [];
  const ctx = loadSource(
    ['modules/vehicle/ride-activity-metrics.js', 'modules/vehicle/ride-gps-recorder.js', 'modules/vehicle/ride-ui.js'],
    { navigator: { geolocation: fakeGeo }, D: { vehicles: [] }, toast: (m) => toasts.push(m), window: {} },
    ['RideUI'],
  );
  const result = ctx.RideUI.start();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'MODULE_MISSING');
  assert.ok(toasts.some((t) => t.includes('belum lengkap dimuat')));
});

// --- trackpoint flow (integrasi GPS -> storage) --------------------------

test('trackpoint dari GPS -> ditempeli rideId+sequence lalu tersimpan di RideStorage berurutan', async () => {
  const { RideUI, RideStorage, fakeGeo } = load();
  RideUI.start();
  const rideId = RideUI.getState().rideId;
  const watcher = fakeGeo.calls[0];

  watcher.success(makePosition({ timestamp: 1000, coords: { latitude: -6.1, longitude: 106.8 } }));
  await RideUI._lastWrite;
  watcher.success(makePosition({ timestamp: 2000, coords: { latitude: -6.2, longitude: 106.9 } }));
  await RideUI._lastWrite;

  const points = await RideStorage.getTrackpoints(rideId);
  assert.equal(points.length, 2);
  assert.equal(points[0].sequence, 0);
  assert.equal(points[1].sequence, 1);
  assert.equal(points[0].rideId, rideId);
  assert.equal(RideUI.getState().sequence, 2);
});

test('trackpoint yang datang SETELAH stop() diabaikan (tidak menambah sequence/storage)', async () => {
  const { RideUI, RideStorage, fakeGeo } = load();
  RideUI.start();
  const rideId = RideUI.getState().rideId;
  const watcher = fakeGeo.calls[0];
  watcher.success(makePosition({ timestamp: 1000 }));
  await RideUI._lastWrite;

  RideUI.stop();
  watcher.success(makePosition({ timestamp: 5000 }));
  await RideUI._lastWrite;

  const points = await RideStorage.getTrackpoints(rideId);
  assert.equal(points.length, 1); // trackpoint kedua TIDAK masuk
});

// --- pause() / resume() ---------------------------------------------------

test('pause() — RECORDING->PAUSED, session di-touch (status PAUSED juga di storage)', async () => {
  const { RideUI, RideStorage } = load();
  RideUI.start();
  const rideId = RideUI.getState().rideId;
  const result = RideUI.pause();
  assert.equal(result.ok, true);
  assert.equal(RideUI.getState().status, 'PAUSED');
  await RideUI._lastWrite;
  const stored = await RideStorage.getRide(rideId);
  assert.equal(stored.status, 'PAUSED');
});

test('pause() — dari IDLE -> INVALID_STATE', () => {
  const { RideUI } = load();
  const result = RideUI.pause();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'INVALID_STATE');
});

test('pause() — dari PAUSED (sudah di-pause) -> INVALID_STATE, tidak double-clear', () => {
  const { RideUI } = load();
  RideUI.start();
  RideUI.pause();
  const result = RideUI.pause();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'INVALID_STATE');
});

test('resume() — PAUSED->RECORDING, trackpoint baru sesudahnya tetap tersimpan lanjut sequence lama', async () => {
  const { RideUI, RideStorage, fakeGeo } = load();
  RideUI.start();
  const rideId = RideUI.getState().rideId;
  fakeGeo.calls[0].success(makePosition({ timestamp: 1000 }));
  await RideUI._lastWrite;
  RideUI.pause();
  const result = RideUI.resume();
  assert.equal(result.ok, true);
  assert.equal(RideUI.getState().status, 'RECORDING');

  const watcher2 = fakeGeo.calls[fakeGeo.calls.length - 1]; // watcher baru dari resume()
  watcher2.success(makePosition({ timestamp: 3000 }));
  await RideUI._lastWrite;

  const points = await RideStorage.getTrackpoints(rideId);
  assert.equal(points.length, 2);
  assert.equal(points[1].sequence, 1); // sequence lanjut, bukan reset ke 0
});

test('resume() — dari IDLE -> INVALID_STATE', () => {
  const { RideUI } = load();
  const result = RideUI.resume();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'INVALID_STATE');
});

// --- stop() & summary (integrasi RideActivityMetrics) ----------------------

test('stop() — menghitung summary via RideActivityMetrics dari trackpoints yang direkam, update storage jadi STOPPED', async () => {
  const { RideUI, RideStorage, fakeGeo, advanceClock } = load();
  RideUI.start();
  const rideId = RideUI.getState().rideId;
  const watcher = fakeGeo.calls[0];

  watcher.success(makePosition({
    timestamp: 1000, coords: { latitude: -6.175392, longitude: 106.827153, speed: 0, accuracy: 5, altitude: 10 },
  }));
  await RideUI._lastWrite;
  watcher.success(makePosition({
    timestamp: 11000, coords: { latitude: -6.195000, longitude: 106.823059, speed: 5, accuracy: 5, altitude: 20 },
  }));
  await RideUI._lastWrite;

  advanceClock(15000);
  const result = RideUI.stop();
  assert.equal(result.ok, true);
  assert.equal(RideUI.getState().status, 'STOPPED');
  assert.equal(result.summary.pointCount, 2);
  assert.ok(result.summary.distanceKm > 2 && result.summary.distanceKm < 3); // Monas->HI ~2.29km
  assert.equal(result.summary.elevationGainM, 10);
  assert.ok(result.summary.boundingBox);

  await RideUI._lastWrite;
  const stored = await RideStorage.getRide(rideId);
  assert.equal(stored.status, 'STOPPED');
  assert.ok(stored.endedAt);
});

test('stop() — bisa dipanggil dari status PAUSED', () => {
  const { RideUI } = load();
  RideUI.start();
  RideUI.pause();
  const result = RideUI.stop();
  assert.equal(result.ok, true);
  assert.equal(RideUI.getState().status, 'STOPPED');
});

test('stop() — dari IDLE -> INVALID_STATE', () => {
  const { RideUI } = load();
  const result = RideUI.stop();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'INVALID_STATE');
});

test('stop() — 0 trackpoint sama sekali -> summary tetap angka aman (0), tidak throw', () => {
  const { RideUI } = load();
  RideUI.start();
  const result = RideUI.stop();
  assert.equal(result.ok, true);
  assert.equal(result.summary.distanceKm, 0);
  assert.equal(result.summary.pointCount, 0);
  assert.equal(result.summary.boundingBox, null);
});

// --- discard() -------------------------------------------------------------

test('discard() — menghapus ride+trackpoints dari storage & reset state ke IDLE', async () => {
  const { RideUI, RideStorage, fakeGeo } = load();
  RideUI.start();
  const rideId = RideUI.getState().rideId;
  fakeGeo.calls[0].success(makePosition({ timestamp: 1000 }));
  await RideUI._lastWrite;

  const result = RideUI.discard();
  assert.equal(result.ok, true);
  assert.equal(RideUI.getState().status, 'IDLE');
  assert.equal(RideUI.getState().rideId, null);

  await RideUI._lastWrite;
  const stored = await RideStorage.getRide(rideId);
  assert.equal(stored, null);
  const points = await RideStorage.getTrackpoints(rideId);
  assert.equal(points.length, 0);
});

test('discard() — tanpa ride aktif -> INVALID_STATE', () => {
  const { RideUI } = load();
  const result = RideUI.discard();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'INVALID_STATE');
});

test('start() setelah discard() bisa mulai ride baru dengan rideId berbeda', () => {
  const { RideUI } = load();
  RideUI.start();
  const firstId = RideUI.getState().rideId;
  RideUI.discard();
  const result = RideUI.start();
  assert.equal(result.ok, true);
  assert.notEqual(RideUI.getState().rideId, firstId);
});

// --- recovery ----------------------------------------------------------

test('checkRecoverable() — kosong kalau tidak ada ride RECORDING tertinggal', async () => {
  const { RideUI } = load();
  const rides = await RideUI.checkRecoverable();
  assert.deepEqual(rides, []);
});

test('checkRecoverable() — menemukan ride RECORDING yang "ditinggal" (mis. app ditutup paksa)', async () => {
  const { RideUI, idb } = load();
  RideUI.start(); // status RECORDING, belum di-stop
  await RideUI._lastWrite;

  // sesi baru (mis. app dibuka lagi) — instance RideUI beda, idb "fisik" sama
  const second = load({ idb });
  const rides = await second.RideUI.checkRecoverable();
  assert.equal(rides.length, 1);
  assert.equal(rides[0].rideId, RideUI.getState().rideId);
});

test('finalizeRecovered() — hitung summary dari trackpoints tersimpan & tandai STOPPED', async () => {
  const { RideUI, fakeGeo, idb } = load();
  RideUI.start();
  const rideId = RideUI.getState().rideId;
  fakeGeo.calls[0].success(makePosition({ timestamp: 1000 }));
  await RideUI._lastWrite;
  fakeGeo.calls[0].success(makePosition({ timestamp: 6000, coords: { latitude: -6.18, longitude: 106.83 } }));
  await RideUI._lastWrite;
  // TIDAK dipanggil stop() -> simulasi ride yang "ditinggal"

  const second = load({ idb });
  const result = await second.RideUI.finalizeRecovered(rideId);
  assert.equal(result.ok, true);
  assert.equal(result.summary.pointCount, 2);
  assert.equal(result.ride.status, 'STOPPED');

  const rides = await second.RideStorage.getRecoverableRides();
  assert.equal(rides.length, 0); // tidak lagi recoverable setelah finalize
});

test('finalizeRecovered() — rideId tidak ditemukan -> ok:false NOT_FOUND, tidak throw', async () => {
  const { RideUI } = load();
  const result = await RideUI.finalizeRecovered('ride_ghost');
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'NOT_FOUND');
});

test('discardRecovered() — menghapus ride lama tanpa finalize', async () => {
  const { RideUI, idb } = load();
  RideUI.start();
  const rideId = RideUI.getState().rideId;
  await RideUI._lastWrite;

  const second = load({ idb });
  const result = await second.RideUI.discardRecovered(rideId);
  assert.equal(result.ok, true);
  const rides = await second.RideStorage.getRecoverableRides();
  assert.equal(rides.length, 0);
});

// --- render() (DOM sync, guarded) -------------------------------------------

test('render() — tidak throw walau semua elemen target belum ada di markup', () => {
  const doc = { getElementById: () => null };
  const { RideUI } = load({ document: doc });
  assert.doesNotThrow(() => RideUI.start());
  assert.doesNotThrow(() => RideUI.render());
});

test('render() — update teks status & toggle tombol sesuai state berjalan', () => {
  const { RideUI, doc } = load();
  RideUI.start();
  assert.equal(doc.getElementById('rideStatusText').textContent, '🔴 Merekam');
  assert.equal(doc.getElementById('rideStartBtn')._hidden, true);
  assert.equal(doc.getElementById('ridePauseBtn')._hidden, false);
  assert.equal(doc.getElementById('rideStopBtn')._hidden, false);

  RideUI.pause();
  assert.equal(doc.getElementById('rideStatusText').textContent, '⏸ Dijeda');
  assert.equal(doc.getElementById('ridePauseBtn')._hidden, true);
  assert.equal(doc.getElementById('rideResumeBtn')._hidden, false);
});

test('render() — status IDLE default sebelum ride dimulai', () => {
  const { RideUI, doc } = load();
  RideUI.render();
  assert.equal(doc.getElementById('rideStatusText').textContent, 'Siap merekam');
  assert.equal(doc.getElementById('rideStartBtn')._hidden, false);
  assert.equal(doc.getElementById('ridePauseBtn')._hidden, true);
});

test('render() — summary tersedia sesudah stop() ditampilkan di elemen distance/duration/speed', () => {
  const { RideUI, doc, fakeGeo, advanceClock } = load();
  RideUI.start();
  fakeGeo.calls[0].success(makePosition({ timestamp: 1000, coords: { latitude: -6.175392, longitude: 106.827153, speed: 3 } }));
  advanceClock(10000);
  RideUI.stop();
  assert.match(doc.getElementById('rideDistanceText').textContent, /km$/);
  assert.match(doc.getElementById('rideDurationText').textContent, /dtk$/);
});

// --- getState() defensive copy ----------------------------------------------

test('getState() — mengembalikan copy, bukan reference internal (mutasi luar tidak memengaruhi RideUI)', () => {
  const { RideUI } = load();
  RideUI.start();
  const s1 = RideUI.getState();
  s1.status = 'RUSAK';
  assert.equal(RideUI.getState().status, 'RECORDING'); // tidak ikut berubah
});
