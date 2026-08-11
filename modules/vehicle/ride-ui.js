// ride-ui.js — RideUI (S525, "Ride UI Foundation"). HARD SCOPE sesi ini:
// PRESENTER/orkestrasi tipis yang menyatukan 3 fondasi ride yang sudah ada
// (S522 RideActivityMetrics, S523 RideGpsRecorder, S524 RideStorage) jadi
// satu alur start/pause/resume/stop/recover yang bisa dipakai UI — TIDAK
// ADA rumus/persistence/GPS-lifecycle baru di sini, 100% REUSE 3 modul
// tsb apa adanya.
//
// TIDAK ADA di file ini (sengaja, sesuai scope S525):
//   - 0 perubahan ke modules/vehicle/ride-activity-metrics.js (S522),
//     ride-gps-recorder.js (S523), ride-storage.js (S524) — reuse murni.
//   - 0 perubahan ke TripEngine/LogisticsEngine/vehicle-core/fuel/
//     maintenance/Map/Route/History/Analytics.
//   - 0 perubahan ke index.html/app_production.html/MODAL_HTML/build.js/
//     modules/shared/modals.js — lihat catatan "WIRING STATUS" di bawah.
//
// WIRING STATUS (tab 'jalan'): tab id `jalan` di setCnTab()
// (modules/vehicle/vehicle-core.js) sudah lama jadi "dead id" (tidak ada
// pane #cnTab-jalan di index.html/app_production.html — dicatat eksplisit
// di komentar setCnTab() sblm sesi ini). Menyalakan tab itu perlu markup
// HTML baru + entri MODAL_HTML baru, yang wajib divalidasi lewat
// `node scripts/build.js` (lint drift index/MODAL_HTML). Build itu SUDAH
// GAGAL di baseline sebelum sesi ini disentuh sama sekali, gara-gara drift
// versi pre-existing di modules/shared/modals.js (MODAL_VERSION tidak
// sinkron thd versi lain) — bukan sesuatu yang dibuat sesi ini. Sesuai
// instruksi sesi ("Jangan sentuh modals.js" + "Build blocker" -> revert
// wiring yang tidak terverifikasi), markup HTML/tab wiring TIDAK
// disertakan sesi ini — RideUI ini murni presenter module yang siap
// dipanggil dari markup manapun nanti (data-action="RideUI.start"/
// "RideUI.pause"/dst, pola sama persis FuelTankProfileUI/VehicleCatalogUI)
// begitu blocker modals.js sudah diperbaiki di sesi lain & build bisa
// diverifikasi ulang.
//
// PRINSIP UMUM:
//   - render() SELALU guard `document.getElementById(...)` (bisa null,
//     krn pane belum ada di markup — lihat WIRING STATUS di atas), TIDAK
//     PERNAH throw kalau elemen target belum ada.
//   - Semua dependency modul lain dicek `typeof X !== 'undefined'` dulu
//     (pola sama semua UI module lain di repo ini) — RideUI tidak pernah
//     throw kalau salah satu dari RideActivityMetrics/RideGpsRecorder/
//     RideStorage belum ter-load.
//   - rideId dibuat oleh CALLER (RideUI), BUKAN oleh RideStorage (sesuai
//     kontrak S524 §6) — lihat _genRideId().
//   - RideStorage session contract HANYA {rideId,status,startedAt,endedAt,
//     updatedAt} (lihat validateSession() ride-storage.js) — vehicleId
//     TIDAK ikut dipersist ke RideStorage (di luar kontrak S524), disimpan
//     di state runtime RideUI saja.
//   - Trackpoint dari RideGpsRecorder TIDAK punya rideId/sequence (kontrak
//     S522/S523 murni) — RideUI yang menempelkan rideId+sequence sebelum
//     diteruskan ke RideStorage.saveTrackpoint (kontrak S524).
//   - Storage write per trackpoint fire-and-forget dari sisi caller GPS
//     (tidak boleh block callback watchPosition), tapi promise-nya selalu
//     disimpan di `_lastWrite` supaya test/caller lain bisa `await` sampai
//     tulis storage selesai kalau perlu determinism.
//   - Ride yang gagal di-recover (mis. storage error) TIDAK PERNAH bikin
//     RideUI throw — selalu balik `{ok:false,error}` + toast, sama pola
//     semua UI module lain.

'use strict';

const RideUI = {

// --- state runtime (bukan D, bukan persisted langsung — lihat catatan
// vehicleId di atas) --------------------------------------------------
_recorder: null,
_state: {
  rideId: null,
  vehicleId: null,
  status: 'IDLE', // IDLE | RECORDING | PAUSED | STOPPED
  startedAt: null,
  endedAt: null,
  sequence: 0,
  lastError: null,
  summary: null,
},
_lastWrite: null, // promise tulis storage terakhir (trackpoint/session) — awaitable

// _nowFn — dipisah supaya test bisa override determinstic (bukan
// Date.now() langsung dipanggil di seluruh file), pola umum dipakai utk
// modul yang butuh timestamp tapi harus dites deterministic.
_nowFn: () => Date.now(),

_genRideId() {
  return 'ride_' + this._nowFn() + '_' + Math.random().toString(36).slice(2, 8);
},

_vehicles() {
  return (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
},

_vehicle(vehicleId) {
  return this._vehicles().find((v) => v.id === vehicleId) || null;
},

_modulesReady() {
  return typeof RideGpsRecorder !== 'undefined'
    && typeof RideStorage !== 'undefined'
    && typeof RideActivityMetrics !== 'undefined';
},

_toast(msg) {
  if (typeof toast === 'function') toast(msg);
},

// getState() — defensive copy shallow, pola sama getTrackpoints()
// RideGpsRecorder/getRide() RideStorage (caller tidak bisa mutate state
// internal RideUI secara tidak sengaja).
getState() {
  return { ...this._state };
},

// --- lifecycle: start/pause/resume/stop -------------------------------

// start(vehicleId?) — mulai rekaman baru. vehicleId opsional (boleh null
// kalau UI belum kasih pilihan kendaraan); kalau diisi, divalidasi
// terhadap D.vehicles (0 rekaman untuk kendaraan yang tidak ada).
start(vehicleId) {
  if (this._state.status === 'RECORDING' || this._state.status === 'PAUSED') {
    return { ok: false, error: { code: 'ALREADY_ACTIVE', message: 'ride lain sedang berjalan' } };
  }
  if (!this._modulesReady()) {
    this._toast('⚠️ Modul Ride belum lengkap dimuat');
    return { ok: false, error: { code: 'MODULE_MISSING', message: 'RideGpsRecorder/RideStorage/RideActivityMetrics belum ter-load' } };
  }
  if (vehicleId && !this._vehicle(vehicleId)) {
    this._toast('⚠️ Kendaraan tidak ditemukan');
    return { ok: false, error: { code: 'VEHICLE_NOT_FOUND', message: 'vehicleId tidak ditemukan di D.vehicles' } };
  }

  const rideId = this._genRideId();
  const now = this._nowFn();
  this._recorder = RideGpsRecorder.create({
    onTrackpoint: (point) => this._onTrackpoint(point),
    onError: (err) => this._onRecorderError(err),
    onStateChange: () => { /* state RideUI sendiri yang jadi source of truth, bukan echo recorder */ },
  });

  const result = this._recorder.start();
  if (!result.ok) {
    this._state = { ...this._state, rideId: null, vehicleId: vehicleId || null, status: 'IDLE', lastError: result.error };
    this._toast('⚠️ Gagal mulai rekam: ' + ((result.error && result.error.message) || 'unknown'));
    this.render();
    return result;
  }

  this._state = {
    rideId,
    vehicleId: vehicleId || null,
    status: 'RECORDING',
    startedAt: now,
    endedAt: null,
    sequence: 0,
    lastError: null,
    summary: null,
  };

  this._lastWrite = RideStorage.createRide({
    rideId, status: 'RECORDING', startedAt: now, endedAt: null, updatedAt: now,
  }).catch((e) => { this._state.lastError = { code: e.code || 'STORAGE_ERROR', message: e.message }; });

  this._toast('🚴 Rekaman perjalanan dimulai');
  this.render();
  return { ok: true, rideId };
},

// _onTrackpoint(rawPoint) — callback dari RideGpsRecorder (kontrak
// S522/S523, TANPA rideId/sequence) -> tempelkan rideId+sequence lalu
// persist via RideStorage.saveTrackpoint (kontrak S524). Sequence dijaga
// selalu naik walau storage gagal (retry sequence yang sama akan bentrok
// primary key kalau di-retry manual — bukan tanggung jawab sesi ini).
_onTrackpoint(rawPoint) {
  if (this._state.status !== 'RECORDING') return; // trackpoint basi (race pause/stop), diabaikan
  const point = { ...rawPoint, rideId: this._state.rideId, sequence: this._state.sequence };
  this._state.sequence += 1;
  this._lastWrite = RideStorage.saveTrackpoint(point).catch((e) => {
    this._state.lastError = { code: e.code || 'STORAGE_ERROR', message: e.message };
  });
  this.render();
},

_onRecorderError(err) {
  this._state.lastError = err;
  this.render();
},

// pause() — jeda rekaman GPS (recorder RECORDING->PAUSED), trackpoints
// yang sudah terekam TETAP tersimpan (0 clear). Session storage
// di-touch (updatedAt) tapi status TETAP 'RECORDING' pada state RideUI
// diganti 'PAUSED' — session storage disamakan status-nya juga (lihat
// _touchSession()), TIDAK ada state baru di luar yang sudah didukung
// storage.
pause() {
  if (!this._recorder || this._state.status !== 'RECORDING') {
    return { ok: false, error: { code: 'INVALID_STATE', message: `cannot pause() from status ${this._state.status}` } };
  }
  const result = this._recorder.pause();
  if (!result.ok) {
    this._state.lastError = result.error;
    this.render();
    return result;
  }
  this._state.status = 'PAUSED';
  this._touchSession();
  this.render();
  return { ok: true };
},

// resume() — lanjut rekaman GPS (PAUSED->RECORDING), trackpoints lama
// dipertahankan (RideGpsRecorder.resume() sendiri tidak reset points).
resume() {
  if (!this._recorder || this._state.status !== 'PAUSED') {
    return { ok: false, error: { code: 'INVALID_STATE', message: `cannot resume() from status ${this._state.status}` } };
  }
  const result = this._recorder.resume();
  if (!result.ok) {
    this._state.lastError = result.error;
    this.render();
    return result;
  }
  this._state.status = 'RECORDING';
  this._touchSession();
  this.render();
  return { ok: true };
},

// stop() — selesaikan rekaman: hentikan GPS, hitung summary via
// RideActivityMetrics dari trackpoints yang sudah direkam recorder
// (defensive copy, bukan baca ulang dari storage — deterministic & 0
// round-trip tambahan), lalu update session storage jadi status
// 'STOPPED' + endedAt. Aman dipanggil dari RECORDING maupun PAUSED
// (sama seperti RideGpsRecorder.stop() sendiri, idempotent kalau
// dipanggil berkali-kali stlh STOPPED).
stop() {
  if (!this._recorder || (this._state.status !== 'RECORDING' && this._state.status !== 'PAUSED')) {
    return { ok: false, error: { code: 'INVALID_STATE', message: `cannot stop() from status ${this._state.status}` } };
  }
  this._recorder.stop();
  const points = this._recorder.getTrackpoints();
  const endedAt = this._nowFn();
  const summary = this._computeSummary(points);

  this._state.status = 'STOPPED';
  this._state.endedAt = endedAt;
  this._state.summary = summary;

  this._lastWrite = RideStorage.updateRide({
    rideId: this._state.rideId, status: 'STOPPED', startedAt: this._state.startedAt, endedAt, updatedAt: endedAt,
  }).catch((e) => { this._state.lastError = { code: e.code || 'STORAGE_ERROR', message: e.message }; });

  this._toast('🏁 Rekaman perjalanan selesai');
  this.render();
  return { ok: true, summary };
},

// discard() — batalkan ride yang sedang berjalan/di-pause TANPA
// menyimpan summary: stop recorder, hapus ride+trackpoints dari storage
// (RideStorage.deleteRide, sudah menghapus dua object store sekaligus),
// lalu reset state ke IDLE. Beda dari stop(): tidak pernah menghitung
// summary, ride dianggap tidak pernah terjadi.
discard() {
  if (!this._state.rideId) {
    return { ok: false, error: { code: 'INVALID_STATE', message: 'tidak ada ride aktif' } };
  }
  const rideId = this._state.rideId;
  if (this._recorder) this._recorder.stop();
  this._lastWrite = RideStorage.deleteRide(rideId).catch((e) => {
    this._state.lastError = { code: e.code || 'STORAGE_ERROR', message: e.message };
  });
  this._resetState();
  this._toast('🗑 Rekaman perjalanan dibatalkan');
  this.render();
  return { ok: true };
},

_resetState() {
  this._recorder = null;
  this._state = {
    rideId: null, vehicleId: null, status: 'IDLE', startedAt: null,
    endedAt: null, sequence: 0, lastError: null, summary: null,
  };
},

_touchSession() {
  if (!this._modulesReady() || !this._state.rideId) return;
  const now = this._nowFn();
  this._lastWrite = RideStorage.updateRide({
    rideId: this._state.rideId, status: this._state.status, startedAt: this._state.startedAt,
    endedAt: this._state.endedAt, updatedAt: now,
  }).catch((e) => { this._state.lastError = { code: e.code || 'STORAGE_ERROR', message: e.message }; });
},

// _computeSummary(points) — 100% REUSE RideActivityMetrics (S522), 0
// rumus baru. Semua field selalu angka (safe default 0/null bawaan
// RideActivityMetrics sendiri, lihat catatan header modul itu).
_computeSummary(points) {
  return {
    distanceKm: RideActivityMetrics.calculateTotalDistanceKm(points),
    durationSec: RideActivityMetrics.calculateDurationSec(points),
    movingTimeSec: RideActivityMetrics.calculateMovingTimeSec(points),
    stoppedTimeSec: RideActivityMetrics.calculateStoppedTimeSec(points),
    averageSpeedKmh: RideActivityMetrics.calculateAverageSpeedKmh(points),
    maxSpeedKmh: RideActivityMetrics.calculateMaxSpeedKmh(points),
    elevationGainM: RideActivityMetrics.calculateElevationGainM(points),
    elevationLossM: RideActivityMetrics.calculateElevationLossM(points),
    boundingBox: RideActivityMetrics.calculateBoundingBox(points),
    pointCount: points.length,
  };
},

// --- recovery (§12 brief ride-storage.js: "storage cuma detect &
// return, keputusan resume/stop/finalize milik layer berikutnya" — RideUI
// ADALAH layer itu) ------------------------------------------------------

// checkRecoverable() — daftar ride berstatus RECORDING yang belum
// di-finalisasi (mis. app ditutup paksa saat rekaman). TIDAK PERNAH throw
// (reject storage -> [] aman), TIDAK mutate apa pun.
//
// CATATAN vehicleId: RideStorage session contract (§5 brief S524, lihat
// validateSession() ride-storage.js) HANYA {rideId,status,startedAt,
// endedAt,updatedAt} — vehicleId TIDAK ikut dipersist (lihat catatan
// header file ini). Akibatnya checkRecoverable() TIDAK BISA difilter per
// kendaraan sesi ini — selalu mengembalikan SEMUA ride recoverable lintas
// kendaraan. Filter per-vehicleId butuh perluasan kontrak storage S524
// (di luar scope S525, sengaja tidak dikerjakan di sini).
async checkRecoverable() {
  if (typeof RideStorage === 'undefined') return [];
  try {
    return await RideStorage.getRecoverableRides();
  } catch (e) {
    return [];
  }
},

// finalizeRecovered(rideId) — untuk ride yang ditemukan checkRecoverable():
// GPS recorder LAMA sudah hilang (reload halaman), jadi tidak bisa
// "resume" watch asli — pilihan yang tersedia cuma finalize (hitung
// summary dari trackpoints yang SUDAH tersimpan di storage, tandai
// STOPPED) atau discardRecovered() (hapus). 0 GPS baru dimulai di sini.
async finalizeRecovered(rideId) {
  if (!this._modulesReady()) {
    this._toast('⚠️ Modul Ride belum lengkap dimuat');
    return { ok: false, error: { code: 'MODULE_MISSING' } };
  }
  try {
    const points = await RideStorage.getTrackpoints(rideId);
    const ride = await RideStorage.getRide(rideId);
    if (!ride) {
      this._toast('⚠️ Ride tidak ditemukan');
      return { ok: false, error: { code: 'NOT_FOUND' } };
    }
    const summary = this._computeSummary(points);
    const endedAt = this._nowFn();
    const updated = await RideStorage.updateRide({
      rideId, status: 'STOPPED', startedAt: ride.startedAt, endedAt, updatedAt: endedAt,
    });
    this._toast('🏁 Rekaman perjalanan lama diselesaikan');
    return { ok: true, summary, ride: updated };
  } catch (e) {
    this._state.lastError = { code: e.code || 'STORAGE_ERROR', message: e.message };
    this._toast('⚠️ Gagal menyelesaikan rekaman lama');
    return { ok: false, error: this._state.lastError };
  }
},

// discardRecovered(rideId) — hapus ride+trackpoints lama tanpa finalize.
async discardRecovered(rideId) {
  if (typeof RideStorage === 'undefined') {
    return { ok: false, error: { code: 'MODULE_MISSING' } };
  }
  try {
    await RideStorage.deleteRide(rideId);
    this._toast('🗑 Rekaman perjalanan lama dihapus');
    return { ok: true };
  } catch (e) {
    this._state.lastError = { code: e.code || 'STORAGE_ERROR', message: e.message };
    this._toast('⚠️ Gagal menghapus rekaman lama');
    return { ok: false, error: this._state.lastError };
  }
},

// --- render (pure DOM sync, 0 logic baru — semua angka dari state/summary
// yang sudah dihitung method lain) --------------------------------------

// render() — sinkron elemen DOM (kalau ADA — lihat catatan "WIRING
// STATUS" di header file, pane #cnTab-jalan belum ada di markup sesi ini)
// dengan state berjalan. SELALU guard getElementById null, TIDAK PERNAH
// throw kalau target belum ada di markup.
render() {
  const s = this._state;
  const set = (id, text) => {
    const el = (typeof document !== 'undefined') ? document.getElementById(id) : null;
    if (el) el.textContent = text;
  };
  const toggle = (id, show) => {
    const el = (typeof document !== 'undefined') ? document.getElementById(id) : null;
    if (el && el.classList && typeof el.classList.toggle === 'function') el.classList.toggle('u-dnone', !show);
  };

  set('rideStatusText', this._statusLabel(s.status));
  toggle('rideStartBtn', s.status === 'IDLE' || s.status === 'STOPPED');
  toggle('ridePauseBtn', s.status === 'RECORDING');
  toggle('rideResumeBtn', s.status === 'PAUSED');
  toggle('rideStopBtn', s.status === 'RECORDING' || s.status === 'PAUSED');
  toggle('rideDiscardBtn', s.status === 'RECORDING' || s.status === 'PAUSED');

  if (s.summary) {
    set('rideDistanceText', s.summary.distanceKm.toFixed(2) + ' km');
    set('rideDurationText', Math.round(s.summary.durationSec) + ' dtk');
    set('rideAvgSpeedText', s.summary.averageSpeedKmh.toFixed(1) + ' km/j');
    set('rideMaxSpeedText', s.summary.maxSpeedKmh.toFixed(1) + ' km/j');
  }

  if (s.lastError) {
    set('rideErrorText', s.lastError.message || String(s.lastError.code || ''));
  }
},

_statusLabel(status) {
  switch (status) {
    case 'RECORDING': return '🔴 Merekam';
    case 'PAUSED': return '⏸ Dijeda';
    case 'STOPPED': return '✅ Selesai';
    default: return 'Siap merekam';
  }
},

};

// pola fix sama persis window.FuelTankProfileUI di fuel-tank-profile-ui.js
// — tanpa baris ini, data-action="RideUI.start"/"RideUI.pause"/dst tidak
// pernah ditemukan lewat window.<path> walau const-nya sudah ada di scope
// module (top-level `const` hasil concat TIDAK otomatis jadi properti
// window, beda dari `var`/function declaration).
if (typeof RideUI !== 'undefined') window.RideUI = RideUI;
