// ride-storage.js — RideStorage (S524, "Ride Storage & Recovery
// Foundation"). HARD SCOPE sesi ini: persistence layer IndexedDB murni
// buat menyimpan & memulihkan ride recording — TIDAK mengubah GPS
// recorder (S523, ride-gps-recorder.js), metrics engine (S522,
// ride-activity-metrics.js), UI, atau business engine mana pun.
//
// TIDAK ADA di file ini (sengaja, sesuai scope S524):
//   - 0 navigator.geolocation/RideGpsRecorder.create()/watchPosition()/
//     clearWatch() — 0 integrasi GPS
//   - 0 RideActivityMetrics/calculateDistanceMeters/
//     calculateAverageSpeedKmh/calculateMovingTimeSec — 0 integrasi metrics
//   - 0 DOM/HTML/UI/Dashboard/Map/Route/History/Analytics
//   - 0 localStorage/sessionStorage/cookies/Cache API/service worker/
//     filesystem — IndexedDB SATU-SATUNYA mekanisme persistence di sini
//   - 0 offline/cloud sync, compression, encryption, geospatial indexing,
//     route reconstruction, automatic cleanup policy — itu future concern
//   - 0 auto delete/finalize/restart GPS pada ride yang belum selesai —
//     storage cuma persist/detect/return (lihat getRecoverableRides()),
//     keputusan resume/stop/finalize milik layer berikutnya
//
// REPOSITORY AUDIT (sebelum menulis file ini):
//   - Satu-satunya IndexedDB helper existing di repo adalah `IDBStore`
//     (modules/asset/aset.js) — TAPI itu generic single-object-store
//     key/value blob (1 database `kw_idb_v1`, 1 object store `kv`,
//     get(key)/set(key,value)/clear() polos). Tidak ada object store
//     kedua, tidak ada index, tidak ada compound key/ordering — tidak
//     cocok dipakai apa adanya utk kontrak S524 (ride session +
//     trackpoint terpisah, trackpoint harus deterministic-ordered per
//     rideId+sequence, bulk write atomic, recovery query by status).
//     Makanya S524 bikin database IndexedDB SENDIRI (nama & version
//     eksplisit, lihat DB_NAME/DB_VERSION di bawah), bukan menumpang di
//     `kv` store IDBStore — tapi pola retry/timeout connection-nya
//     (lihat openDatabase() di bawah) SENGAJA meniru gaya IDBStore._open()
//     (onblocked di-log, onversionchange/onclose men-invalidasi cache
//     koneksi) karena itu sudah pola yang terbukti dipakai di repo ini.
//   - Tidak ada ID-generator utility yang aman utk dipakai storage
//     men-generate rideId sendiri (satu-satunya kandidat, `uid()` di
//     modules/shared/features-helpers-global-security.js, adalah bagian
//     dari modul app-state besar yang TIDAK BOLEH jadi dependency baru
//     modul zero-dependency ini). Sesuai §6 dari brief sesi ini: rideId
//     dibuat oleh CALLER (mis. layer yang memulai ride recording),
//     storage HANYA memvalidasi (lihat validateRideId()) — storage tidak
//     pernah men-generate rideId sendiri.
//   - Tidak ada test double IndexedDB asli di repo (test IndexedDB yang
//     ada cuma mock di level IDBStore.get/set, bukan indexedDB API asli)
//     — lihat tests/helpers/fakeIndexedDB.js (dibuat bareng sesi ini)
//     utk detail kenapa & apa yang di-scope.
//
// SCHEMA (version 1 — lihat §14 brief: cuma v1, tapi struktur upgrade
// (onupgradeneeded) sudah disiapkan utk migrasi versi berikutnya):
//   database: kw_ride_storage_v1
//   object store "rides"        — keyPath: 'rideId' (in-line primary key)
//   object store "trackpoints"  — keyPath: ['rideId','sequence']
//     (compound in-line primary key -> otomatis unique per rideId+sequence
//     DAN otomatis ke-sort ascending per rideId lalu sequence kalau dibaca
//     lewat IDBKeyRange.bound([rideId,-Infinity],[rideId,Infinity]) —
//     inilah cara getTrackpoints() memenuhi kontrak "deterministic
//     ascending order" tanpa perlu index/cursor manual tambahan.)
//
// PRINSIP UMUM (berlaku semua fungsi publik):
//   - Semua operasi publik PROMISE-based, tidak pernah throw sinkron utk
//     kegagalan storage biasa (reject dgn Error ber-`.code`, lihat
//     ERROR CONTRACT di bawah) — kecuali argumen yang jelas salah tipe
//     dari awal (mis. saveTrackpoints(bukan array)) juga di-reject, BUKAN
//     throw, supaya caller selalu bisa .catch() satu pola yang sama.
//   - Tidak pernah mutate object yang diberikan caller (defensive copy
//     shallow di titik masuk SEBELUM ditulis) — createRide/updateRide/
//     saveTrackpoint/saveTrackpoints tidak menyimpan reference caller.
//   - Tidak pernah mengembalikan reference mutable ke internal storage —
//     getRide/getTrackpoints/getRecoverableRides selalu return defensive
//     copy shallow baru (pola sama seperti getTrackpoints() di
//     ride-gps-recorder.js S523: `{...obj}`/`points.map(p=>({...p}))`).
//
// ERROR CONTRACT (§27 brief — minimal, tidak dibuat taksonomi besar):
//   INVALID_INPUT     — argumen/shape tidak valid (validasi sebelum tulis
//                        ke DB sama sekali, jadi TIDAK ADA partial write).
//   NOT_FOUND         — updateRide() dipanggil utk rideId yang belum ada.
//   DATABASE_ERROR     — gagal membuka/upgrade database itu sendiri.
//   TRANSACTION_ERROR — transaction IndexedDB gagal/abort (mis. duplicate
//                        key constraint saat createRide()/saveTrackpoints()
//                        batch) SETELAH validasi input lolos.
//   STORAGE_ERROR      — fallback generic utk kegagalan object-store level
//                        yang tidak masuk kategori di atas.

'use strict';

const DB_NAME = 'kw_ride_storage_v1';
const DB_VERSION = 1;
const STORE_RIDES = 'rides';
const STORE_TRACKPOINTS = 'trackpoints';

// Status yang dianggap "belum selesai" oleh getRecoverableRides(). Sengaja
// TIDAK mengarang state baru di luar yang sudah didefinisikan S523 —
// "RECORDING" adalah satu-satunya status in-progress yang relevan utk
// recovery (lihat §11/§12 brief: storage cuma detect & return, bukan
// definisikan state machine baru).
const RECOVERABLE_STATUS = 'RECORDING';

let _dbPromise = null;

function makeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function isNullish(v) {
  return v === null || v === undefined;
}

function isNonNegativeInteger(v) {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function validateRideId(rideId) {
  if (!isNonEmptyString(rideId)) {
    throw makeError('INVALID_INPUT', 'rideId harus non-empty string');
  }
}

// Ride session contract (§5 brief): { rideId, status, startedAt, endedAt,
// updatedAt }. endedAt boleh null/undefined (ride belum selesai).
function validateSession(session) {
  if (!session || typeof session !== 'object' || Array.isArray(session)) {
    throw makeError('INVALID_INPUT', 'session harus berupa object');
  }
  validateRideId(session.rideId);
  if (!isNonEmptyString(session.status)) {
    throw makeError('INVALID_INPUT', 'session.status harus non-empty string');
  }
  if (!isFiniteNumber(session.startedAt)) {
    throw makeError('INVALID_INPUT', 'session.startedAt harus epoch ms (number)');
  }
  if (!isNullish(session.endedAt) && !isFiniteNumber(session.endedAt)) {
    throw makeError('INVALID_INPUT', 'session.endedAt harus null atau epoch ms (number)');
  }
  if (!isFiniteNumber(session.updatedAt)) {
    throw makeError('INVALID_INPUT', 'session.updatedAt harus epoch ms (number)');
  }
}

function cloneSession(session) {
  return {
    rideId: session.rideId,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: isNullish(session.endedAt) ? null : session.endedAt,
    updatedAt: session.updatedAt,
  };
}

// Trackpoint contract identik dgn kontrak S522/S523 (lihat header
// ride-gps-recorder.js) + rideId & sequence yang jadi primary key S524.
function validateTrackpoint(point) {
  if (!point || typeof point !== 'object' || Array.isArray(point)) {
    throw makeError('INVALID_INPUT', 'trackpoint harus berupa object');
  }
  validateRideId(point.rideId);
  if (!isNonNegativeInteger(point.sequence)) {
    throw makeError('INVALID_INPUT', 'trackpoint.sequence harus integer >= 0');
  }
  if (!isFiniteNumber(point.timestamp)) {
    throw makeError('INVALID_INPUT', 'trackpoint.timestamp harus epoch ms (number)');
  }
  if (!isFiniteNumber(point.latitude) || point.latitude < -90 || point.latitude > 90) {
    throw makeError('INVALID_INPUT', 'trackpoint.latitude harus -90..90');
  }
  if (!isFiniteNumber(point.longitude) || point.longitude < -180 || point.longitude > 180) {
    throw makeError('INVALID_INPUT', 'trackpoint.longitude harus -180..180');
  }
  if (!isNullish(point.accuracy) && !isFiniteNumber(point.accuracy)) {
    throw makeError('INVALID_INPUT', 'trackpoint.accuracy harus null atau number');
  }
  if (!isNullish(point.altitude) && !isFiniteNumber(point.altitude)) {
    throw makeError('INVALID_INPUT', 'trackpoint.altitude harus null atau number');
  }
  if (!isNullish(point.speed) && (!isFiniteNumber(point.speed) || point.speed < 0)) {
    throw makeError('INVALID_INPUT', 'trackpoint.speed harus null atau number >= 0');
  }
}

function cloneTrackpoint(point) {
  return {
    rideId: point.rideId,
    sequence: point.sequence,
    timestamp: point.timestamp,
    latitude: point.latitude,
    longitude: point.longitude,
    accuracy: isNullish(point.accuracy) ? null : point.accuracy,
    altitude: isNullish(point.altitude) ? null : point.altitude,
    speed: isNullish(point.speed) ? null : point.speed,
  };
}

// --- koneksi database -----------------------------------------------------
//
// Pola cache + onblocked/onversionchange/onclose meniru IDBStore._open()
// (modules/asset/aset.js) yang sudah terbukti dipakai di repo ini utk
// menghindari koneksi "gantung"/stale — lihat komentar audit di atas.
function openDatabase() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined' || !indexedDB) {
      reject(makeError('DATABASE_ERROR', 'IndexedDB tidak tersedia di environment ini'));
      return;
    }
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(makeError('DATABASE_ERROR', (e && e.message) || 'Gagal membuka RideStorage IndexedDB'));
      return;
    }
    req.onblocked = () => {
      // eslint-disable-next-line no-console
      console.warn('RideStorage: IndexedDB open() diblokir (kemungkinan ada koneksi lain masih terbuka).');
    };
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE_RIDES)) {
        db.createObjectStore(STORE_RIDES, { keyPath: 'rideId' });
      }
      if (!db.objectStoreNames.contains(STORE_TRACKPOINTS)) {
        db.createObjectStore(STORE_TRACKPOINTS, { keyPath: ['rideId', 'sequence'] });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        try { db.close(); } catch (e) { /* noop */ }
        _dbPromise = null;
      };
      db.onclose = () => {
        _dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      _dbPromise = null;
      reject(makeError('DATABASE_ERROR', (req.error && req.error.message) || 'Gagal membuka RideStorage IndexedDB'));
    };
  });
  return _dbPromise;
}

// Jalankan `executor(storeObjects)` di dalam satu transaction IndexedDB
// (satu transaction utk SEMUA storeNames yang diminta -> atomic boundary
// sesuai §15 brief). executor bisa mengembalikan nilai apa pun (dikumpulkan
// via `results`, bukan lewat closure luar transaction) -- resolve terjadi
// di tx.oncomplete (BUKAN begitu request individual sukses), supaya
// caller cuma dapat hasil kalau transaction BENAR-BENAR commit.
function runTransaction(storeNames, mode, executor) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        let tx;
        try {
          tx = db.transaction(storeNames, mode);
        } catch (e) {
          reject(makeError('TRANSACTION_ERROR', (e && e.message) || 'Gagal membuka transaction'));
          return;
        }
        // resolve() HARUS menunggu DUA hal: (1) executor's promise selesai
        // dgn hasilnya, DAN (2) transaction benar-benar `complete` — dua
        // event ini tidak dijamin urutannya (tx.oncomplete bisa terpicu
        // sebelum microtask .then() terakhir dari request Promise-nya
        // sempat jalan), jadi resolve/reject cuma boleh terjadi setelah
        // KEDUANYA settle, bukan salah satu duluan.
        let settled = false;
        let txCompleted = false;
        let execSettled = false;
        let execResult;
        let execError = null;

        function finalize() {
          if (settled || !txCompleted) return;
          if (execError) {
            settled = true;
            reject(execError);
            return;
          }
          if (!execSettled) return;
          settled = true;
          resolve(execResult);
        }

        tx.oncomplete = () => {
          txCompleted = true;
          finalize();
        };
        tx.onabort = () => {
          if (settled) return;
          settled = true;
          const raw = tx.error;
          reject(execError || makeError('TRANSACTION_ERROR', (raw && raw.message) || 'Transaction dibatalkan (abort)'));
        };
        const stores = {};
        for (const name of storeNames) stores[name] = tx.objectStore(name);
        try {
          const maybePromise = executor(stores, tx);
          Promise.resolve(maybePromise).then(
            (r) => {
              execSettled = true;
              execResult = r;
              finalize();
            },
            (e) => {
              execError = e instanceof Error && e.code ? e : makeError('TRANSACTION_ERROR', (e && e.message) || 'Operasi transaction gagal');
              try { tx.abort(); } catch (e2) { /* noop -- sudah/akan abort sendiri lewat request error */ }
              finalize();
            },
          );
        } catch (e) {
          execError = e instanceof Error && e.code ? e : makeError('TRANSACTION_ERROR', (e && e.message) || 'Operasi transaction gagal');
          try { tx.abort(); } catch (e2) { /* noop */ }
          finalize();
        }
      }),
  );
}

// Bungkus 1 IDBRequest jadi Promise.
function reqToPromise(req, errorCode, errorMessage) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(makeError(errorCode, (req.error && req.error.message) || errorMessage));
  });
}

// --- API publik: ride session ---------------------------------------------

function createRide(session) {
  return new Promise((resolve, reject) => {
    let clone;
    try {
      validateSession(session);
      clone = cloneSession(session);
    } catch (e) {
      reject(e);
      return;
    }
    runTransaction([STORE_RIDES], 'readwrite', (stores) =>
      reqToPromise(stores[STORE_RIDES].add(clone), 'TRANSACTION_ERROR', 'Gagal membuat ride (rideId mungkin sudah ada)'),
    )
      .then(() => resolve({ ...clone }))
      .catch(reject);
  });
}

function updateRide(session) {
  return new Promise((resolve, reject) => {
    let clone;
    try {
      validateSession(session);
      clone = cloneSession(session);
    } catch (e) {
      reject(e);
      return;
    }
    runTransaction([STORE_RIDES], 'readwrite', (stores) =>
      reqToPromise(stores[STORE_RIDES].get(clone.rideId), 'STORAGE_ERROR', 'Gagal membaca ride existing').then((existing) => {
        if (!existing) {
          const err = makeError('NOT_FOUND', `ride "${clone.rideId}" tidak ditemukan`);
          return Promise.reject(err);
        }
        return reqToPromise(stores[STORE_RIDES].put(clone), 'TRANSACTION_ERROR', 'Gagal update ride');
      }),
    )
      .then(() => resolve({ ...clone }))
      .catch(reject);
  });
}

function getRide(rideId) {
  return new Promise((resolve, reject) => {
    try {
      validateRideId(rideId);
    } catch (e) {
      reject(e);
      return;
    }
    runTransaction([STORE_RIDES], 'readonly', (stores) =>
      reqToPromise(stores[STORE_RIDES].get(rideId), 'STORAGE_ERROR', 'Gagal membaca ride'),
    )
      .then((record) => resolve(record ? { ...record } : null))
      .catch(reject);
  });
}

function deleteRide(rideId) {
  return new Promise((resolve, reject) => {
    try {
      validateRideId(rideId);
    } catch (e) {
      reject(e);
      return;
    }
    runTransaction([STORE_RIDES, STORE_TRACKPOINTS], 'readwrite', (stores) => {
      const range = IDBKeyRange.bound([rideId, -Infinity], [rideId, Infinity]);
      return Promise.all([
        reqToPromise(stores[STORE_RIDES].delete(rideId), 'TRANSACTION_ERROR', 'Gagal menghapus ride'),
        reqToPromise(stores[STORE_TRACKPOINTS].delete(range), 'TRANSACTION_ERROR', 'Gagal menghapus trackpoints ride'),
      ]);
    })
      .then(() => resolve(true))
      .catch(reject);
  });
}

function clearRideStorage() {
  return runTransaction([STORE_RIDES, STORE_TRACKPOINTS], 'readwrite', (stores) =>
    Promise.all([
      reqToPromise(stores[STORE_RIDES].clear(), 'TRANSACTION_ERROR', 'Gagal mengosongkan rides'),
      reqToPromise(stores[STORE_TRACKPOINTS].clear(), 'TRANSACTION_ERROR', 'Gagal mengosongkan trackpoints'),
    ]),
  ).then(() => true);
}

// --- API publik: trackpoints ------------------------------------------------

function saveTrackpoint(point) {
  return saveTrackpoints([point]).then((saved) => saved[0]);
}

// Bulk write all-or-nothing (§10 brief): validasi SEMUA record dulu
// SEBELUM menyentuh DB sama sekali -> kalau ada 1 saja invalid, TIDAK ADA
// write yang terjadi (bukan cuma "rollback setelah nyoba"). Kalau
// validasi lolos tapi transaction IndexedDB-nya sendiri gagal/abort (mis.
// duplicate rideId+sequence constraint), seluruh batch tetap dianggap
// gagal (runTransaction hanya resolve di tx.oncomplete, tidak pernah
// partial).
function saveTrackpoints(points) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(points)) {
      reject(makeError('INVALID_INPUT', 'points harus berupa array'));
      return;
    }
    if (points.length === 0) {
      resolve([]);
      return;
    }
    let clones;
    try {
      clones = points.map((p) => {
        validateTrackpoint(p);
        return cloneTrackpoint(p);
      });
    } catch (e) {
      reject(e);
      return;
    }
    runTransaction([STORE_TRACKPOINTS], 'readwrite', (stores) =>
      Promise.all(
        clones.map((c) =>
          reqToPromise(stores[STORE_TRACKPOINTS].add(c), 'TRANSACTION_ERROR', 'Gagal menyimpan trackpoint (duplicate rideId+sequence?)'),
        ),
      ),
    )
      .then(() => resolve(clones.map((c) => ({ ...c }))))
      .catch(reject);
  });
}

function getTrackpoints(rideId) {
  return new Promise((resolve, reject) => {
    try {
      validateRideId(rideId);
    } catch (e) {
      reject(e);
      return;
    }
    const range = IDBKeyRange.bound([rideId, -Infinity], [rideId, Infinity]);
    runTransaction([STORE_TRACKPOINTS], 'readonly', (stores) =>
      reqToPromise(stores[STORE_TRACKPOINTS].getAll(range), 'STORAGE_ERROR', 'Gagal membaca trackpoints'),
    )
      .then((records) => resolve((records || []).map((r) => ({ ...r }))))
      .catch(reject);
  });
}

// --- API publik: recovery ---------------------------------------------------
//
// Cuma persist/detect/return (§12 brief) — TIDAK PERNAH delete/finalize/
// restart GPS apa pun di sini, dan TIDAK mutate state ride yang ditemukan.
function getRecoverableRides() {
  return runTransaction([STORE_RIDES], 'readonly', (stores) =>
    reqToPromise(stores[STORE_RIDES].getAll(), 'STORAGE_ERROR', 'Gagal membaca daftar ride'),
  ).then((records) => (records || []).filter((r) => r.status === RECOVERABLE_STATUS).map((r) => ({ ...r })));
}

// --- API publik: listing (S524 CORRECTIVE PASS — buka blocker S527) --------
//
// listRides(options?) — enumerasi ride, opsional filter by status. Dipakai
// layer History/Analytics (S527) sebagai satu-satunya cara baca "semua
// ride" via RideStorage (bukan getRecoverableRides() yang hardcoded ke
// status RECORDING, dan bukan akses IndexedDB langsung).
//
// Kontrak:
//   - read-only, tidak pernah mutate data tersimpan;
//   - listRides() / listRides(undefined) / listRides(null) -> SELURUH ride;
//   - listRides({ status: 'STOPPED' }) -> hanya ride dgn status tsb persis
//     (exact match, case-sensitive, sama seperti perbandingan status di
//     getRecoverableRides());
//   - status yang tidak match ride manapun -> [] (bukan error);
//   - options.status wajib non-empty string kalau diisi (selain itu
//     INVALID_INPUT, konsisten dgn validasi field lain di file ini);
//   - options sendiri (kalau diisi) wajib object biasa (bukan array/null
//     dianggap "tidak ada filter", lihat isNullish di bawah);
//   - hasil SELALU defensive copy shallow per record (pola sama dgn
//     getRide/getTrackpoints/getRecoverableRides) — tidak pernah
//     mengembalikan reference mutable ke internal storage;
//   - urutan hasil DETERMINISTIC: ascending by rideId (urutan native dari
//     IDBObjectStore.getAll() tanpa range pada store dgn keyPath 'rideId'
//     — sama seperti urutan yang sudah dipakai getRecoverableRides() di
//     atas, cuma di sini urutannya didokumentasikan & dites eksplisit
//     karena repo belum punya convention ordering utk multi-ride listing).
//     TIDAK dibuat sort tambahan by startedAt/updatedAt supaya tidak
//     menambah rumus/asumsi baru di luar kontrak S524 existing.
function listRides(options) {
  return new Promise((resolve, reject) => {
    let statusFilter;
    if (isNullish(options)) {
      statusFilter = null;
    } else if (typeof options !== 'object' || Array.isArray(options)) {
      reject(makeError('INVALID_INPUT', 'options harus berupa object'));
      return;
    } else if (!isNullish(options.status) && !isNonEmptyString(options.status)) {
      reject(makeError('INVALID_INPUT', 'options.status harus non-empty string'));
      return;
    } else {
      statusFilter = isNullish(options.status) ? null : options.status;
    }
    runTransaction([STORE_RIDES], 'readonly', (stores) =>
      reqToPromise(stores[STORE_RIDES].getAll(), 'STORAGE_ERROR', 'Gagal membaca daftar ride'),
    )
      .then((records) => {
        const all = records || [];
        const filtered = isNullish(statusFilter) ? all : all.filter((r) => r.status === statusFilter);
        resolve(filtered.map((r) => ({ ...r })));
      })
      .catch(reject);
  });
}

// --- RideStorage -------------------------------------------------------

const RideStorage = {
  DB_NAME,
  DB_VERSION,
  createRide,
  updateRide,
  getRide,
  saveTrackpoint,
  saveTrackpoints,
  getTrackpoints,
  deleteRide,
  clearRideStorage,
  getRecoverableRides,
  listRides,
};
