// ride-history.js — RideHistory + RideAnalytics (S527, "Ride History &
// Analytics"). HARD SCOPE sesi ini: presenter/aggregator TIPIS di atas
// fondasi ride yang sudah ada (S522 RideActivityMetrics, S524 RideStorage
// — termasuk listRides() dari S524 CORRECTIVE PASS) — TIDAK ADA rumus
// distance/speed/elevation baru, TIDAK ADA akses IndexedDB langsung,
// TIDAK ADA object store/schema/registry ride baru di sini. 100% REUSE.
//
// TIDAK ADA di file ini (sengaja, sesuai scope S527):
//   - 0 perubahan ke modules/vehicle/ride-activity-metrics.js (S522),
//     ride-gps-recorder.js (S523), ride-storage.js (S524),
//     ride-ui.js (S525), ride-map.js (S526) — reuse murni, HARD NO-TOUCH.
//   - 0 perubahan ke scripts/build.js / modules/shared/modals.js /
//     TripEngine/LogisticsEngine/vehicle-core/fuel/maintenance.
//   - 0 indexedDB.open()/transaction() langsung — SATU-SATUNYA jalan baca
//     data ride di file ini adalah RideStorage.listRides()/getRide()/
//     getTrackpoints()/deleteRide() (kontrak publik S524, termasuk
//     listRides() yang baru dibuka lewat S524 CORRECTIVE PASS).
//   - 0 rumus distance/speed/duration/elevation baru — SEMUA angka
//     agregat (History summary maupun Analytics) 100% dihitung lewat
//     RideActivityMetrics (S522), file ini cuma menjumlah/mengambil-max
//     dari hasil RideActivityMetrics per ride (lihat catatan
//     "AGREGASI ANALYTICS" di bawah kenapa itu BUKAN rumus baru).
//
// PRINSIP UMUM (berlaku semua fungsi publik):
//   - Semua fungsi publik ASYNC/PROMISE-based, tidak pernah throw
//     sinkron — kegagalan modul dependency belum ter-load atau storage
//     reject selalu berujung ke hasil "aman" (lihat kontrak per fungsi),
//     bukan exception yang menembus ke caller.
//   - Read-only murni: TIDAK PERNAH memanggil RideStorage.createRide/
//     updateRide/saveTrackpoint/saveTrackpoints — satu-satunya operasi
//     tulis yang dipakai file ini adalah RideStorage.deleteRide()
//     (fungsi "delete" yang diminta scope History), dan itu pun cuma
//     forward ke RideStorage, 0 logic tulis baru.
//   - Tidak pernah mutate object yang dikembalikan RideStorage/
//     RideActivityMetrics — RideStorage sendiri sudah selalu
//     mengembalikan defensive copy (lihat ride-storage.js), file ini
//     TIDAK menambah mutasi apa pun di atasnya (tidak assign balik field
//     apa pun ke object hasil baca).
//   - Semua dependency dicek `typeof X !== 'undefined'` dulu (pola sama
//     RideUI._modulesReady() di ride-ui.js S525) — tidak pernah throw
//     kalau RideStorage/RideActivityMetrics belum ter-load.
//
// RIDE HISTORY — daftar/detail/summary/delete (§ brief S527):
//   - listRides(options) — forward APA ADANYA ke RideStorage.listRides()
//     (options.status opsional, exact match, sama kontrak persis S524).
//     Ordering deterministic (ascending by rideId) 100% warisan dari
//     RideStorage.listRides(), TIDAK ditambah sort lain di sini (supaya
//     tidak menambah asumsi ordering baru di luar kontrak S524 existing).
//   - getRideDetail(rideId) — { ride, trackpoints } utk 1 ride. Ride yang
//     tidak ada -> null (BUKAN error/throw) — kontrak "missing ride ->
//     safe result" scope S527.
//   - getRideSummary(rideId) — { ride, summary } dgn summary dihitung
//     RideActivityMetrics dari trackpoints ride tsb (pola identik
//     RideUI._computeSummary(), TIDAK diduplikasi ulang rumusnya — lihat
//     buildSummary() di bawah, dipakai bareng oleh History & Analytics
//     supaya satu-satunya sumber "bentuk summary per ride"). Ride tidak
//     ada -> null.
//   - deleteRide(rideId) — forward APA ADANYA ke RideStorage.deleteRide()
//     (sudah menghapus ride + seluruh trackpoints-nya sekaligus, atomic,
//     lihat ride-storage.js). Idempotent mengikuti kontrak IndexedDB
//     delete() milik RideStorage sendiri (rideId yang tidak ada pun tetap
//     resolve true, 0 penambahan validasi "harus ada dulu" di layer ini).
//
// RIDE ANALYTICS — agregat lintas-ride (§ brief S527):
//   - getAnalytics(options) — agregat SEMUA ride yang cocok filter
//     status (default 'STOPPED', lihat "COMPLETED RIDE DEFAULT" di
//     bawah) lewat RideStorage.listRides({status}) lalu
//     RideStorage.getTrackpoints(rideId) + RideActivityMetrics per ride.
//   - Field: totalRides, totalDistanceKm, totalDurationSec,
//     totalMovingTimeSec, averageSpeedKmh, maxSpeedKmh, elevationGainM,
//     elevationLossM. Ride kosong / tidak ada yang cocok filter -> semua
//     field 0 (safe default, konsisten dgn safe-default RideActivityMetrics
//     sendiri, lihat header ride-activity-metrics.js), totalRides 0.
//
// COMPLETED RIDE DEFAULT (§ brief S527: "Completed ride default =
// STOPPED"): getAnalytics() TANPA options / options.status diisi undefined
// menghitung HANYA ride berstatus 'STOPPED' (ride yang sudah selesai
// direkam & difinalisasi RideUI.stop()/finalizeRecovered() — lihat
// ride-ui.js). Ride yang masih RECORDING/PAUSED sengaja TIDAK ikut
// default agregat (datanya belum final, trackpoints masih bisa
// bertambah) — supaya caller yang memang butuh menghitung status lain
// (mis. debugging ride yang sedang berjalan) tetap bisa lewat
// `options.status` eksplisit (termasuk `options.status: null` -> SEMUA
// ride tanpa filter, sama kontrak RideStorage.listRides()).
//
// AGREGASI ANALYTICS BUKAN RUMUS BARU: totalDistanceKm/totalDurationSec/
// totalMovingTimeSec/elevationGainM/elevationLossM adalah SEKEDAR
// penjumlahan (Σ) hasil RideActivityMetrics per ride — bukan geometri/
// klasifikasi baru. maxSpeedKmh adalah MAX (bukan Σ) dari
// calculateMaxSpeedKmh per ride — konsisten secara semantik dgn makna
// "kecepatan tertinggi", menjumlahkan max per-ride tidak akan berarti
// apa pun. averageSpeedKmh agregat memakai definisi RASIO YANG SAMA
// PERSIS dgn RideActivityMetrics.calculateAverageSpeedKmh (distance/
// movingTime), tapi di atas TOTAL Σdistance & Σmovingtime seluruh ride
// (bukan rata-rata dari rata-rata per ride, yang secara matematis salah
// utk rate/ratio) — 0 konstanta/threshold/formula geometris baru
// ditambahkan, cuma re-derive rasio yang sudah didefinisikan S522 di
// atas total yang sudah dijumlah.
//
// INVALID/CORRUPT TRACKPOINTS: RideActivityMetrics (S522) sudah 100%
// null-safe/tidak pernah throw utk titik dengan shape aneh/koordinat di
// luar rentang/timestamp invalid (lihat header ride-activity-metrics.js)
// — file ini TIDAK menambah validasi/filtering titik apa pun sebelum
// diteruskan (supaya tidak duplikasi logic validasi S522). Kegagalan di
// LEVEL STORAGE (mis. RideStorage.getTrackpoints() reject krn
// STORAGE_ERROR utk 1 ride tertentu saat agregasi Analytics lintas-ride)
// DITANGKAP per-ride (ride itu tetap dihitung ke totalRides, tapi
// kontribusi metrik numeriknya 0 utk ride itu) supaya 1 ride bermasalah
// tidak menggagalkan seluruh agregat.

'use strict';

function modulesReady() {
  return typeof RideStorage !== 'undefined' && typeof RideActivityMetrics !== 'undefined';
}

// buildSummary(points) — SATU-SATUNYA tempat "bentuk summary per ride"
// didefinisikan di file ini (dipakai getRideSummary() & getAnalytics()),
// pola & field identik RideUI._computeSummary() (ride-ui.js S525) supaya
// History/Analytics dan RideUI konsisten — 100% call RideActivityMetrics,
// 0 rumus baru.
function buildSummary(points) {
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
    pointCount: Array.isArray(points) ? points.length : 0,
  };
}

// --- RideHistory -----------------------------------------------------------

const RideHistory = {

// listRides(options) — forward apa adanya ke RideStorage.listRides()
// (lihat kontrak lengkap di ride-storage.js: options?.status opsional,
// exact match, ordering ascending by rideId). Modul dependency belum
// ter-load / storage reject -> [] (safe default, TIDAK PERNAH throw ke
// caller, konsisten pola RideUI.checkRecoverable()).
async listRides(options) {
  if (typeof RideStorage === 'undefined') return [];
  try {
    return await RideStorage.listRides(options);
  } catch (e) {
    return [];
  }
},

// getRideDetail(rideId) — { ride, trackpoints } utk 1 ride (defensive
// copy warisan RideStorage, tidak dimutasi/di-reshape di sini). Ride
// tidak ditemukan ATAU dependency belum ter-load -> null (BUKAN error).
async getRideDetail(rideId) {
  if (!modulesReady()) return null;
  let ride;
  try {
    ride = await RideStorage.getRide(rideId);
  } catch (e) {
    return null;
  }
  if (!ride) return null;
  let trackpoints;
  try {
    trackpoints = await RideStorage.getTrackpoints(rideId);
  } catch (e) {
    trackpoints = [];
  }
  return { ride, trackpoints };
},

// getRideSummary(rideId) — { ride, summary } dgn summary dari
// buildSummary() (100% RideActivityMetrics). Ride tidak ditemukan ATAU
// dependency belum ter-load -> null. Trackpoint invalid/corrupt tidak
// pernah bikin ini crash (lihat catatan header "INVALID/CORRUPT
// TRACKPOINTS" — RideActivityMetrics sendiri sudah null-safe).
async getRideSummary(rideId) {
  if (!modulesReady()) return null;
  let ride;
  try {
    ride = await RideStorage.getRide(rideId);
  } catch (e) {
    return null;
  }
  if (!ride) return null;
  let trackpoints;
  try {
    trackpoints = await RideStorage.getTrackpoints(rideId);
  } catch (e) {
    trackpoints = [];
  }
  return { ride, summary: buildSummary(trackpoints) };
},

// deleteRide(rideId) — forward apa adanya ke RideStorage.deleteRide()
// (sudah atomic menghapus ride + trackpoints-nya, lihat ride-storage.js).
// Dependency belum ter-load -> { ok:false, error:{code:'MODULE_MISSING'} }
// (pola sama RideUI.discardRecovered()), storage reject -> { ok:false,
// error } (code diteruskan apa adanya dari RideStorage), sukses ->
// { ok:true }. TIDAK PERNAH throw ke caller.
async deleteRide(rideId) {
  if (typeof RideStorage === 'undefined') {
    return { ok: false, error: { code: 'MODULE_MISSING' } };
  }
  try {
    await RideStorage.deleteRide(rideId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: { code: e.code || 'STORAGE_ERROR', message: e.message } };
  }
},

};

// --- RideAnalytics -----------------------------------------------------

const RideAnalytics = {

// getAnalytics(options) — agregat lintas-ride. options.status default
// 'STOPPED' (lihat catatan header "COMPLETED RIDE DEFAULT"); isi
// options.status:null eksplisit utk agregat SEMUA status (sama kontrak
// RideStorage.listRides()). Dependency belum ter-load / listRides()
// reject -> semua field 0 (safe default), TIDAK PERNAH throw.
async getAnalytics(options) {
  const empty = () => ({
    totalRides: 0,
    totalDistanceKm: 0,
    totalDurationSec: 0,
    totalMovingTimeSec: 0,
    averageSpeedKmh: 0,
    maxSpeedKmh: 0,
    elevationGainM: 0,
    elevationLossM: 0,
  });

  if (!modulesReady()) return empty();

  const hasOwnStatus = !!options && typeof options === 'object' && Object.prototype.hasOwnProperty.call(options, 'status');
  const statusFilter = hasOwnStatus ? options.status : 'STOPPED';

  let rides;
  try {
    rides = await RideStorage.listRides(isFilterAll(statusFilter) ? null : { status: statusFilter });
  } catch (e) {
    return empty();
  }
  if (!Array.isArray(rides) || rides.length === 0) return empty();

  let totalDistanceKm = 0;
  let totalDurationSec = 0;
  let totalMovingTimeSec = 0;
  let maxSpeedKmh = 0;
  let elevationGainM = 0;
  let elevationLossM = 0;

  for (const ride of rides) {
    let points;
    try {
      points = await RideStorage.getTrackpoints(ride.rideId);
    } catch (e) {
      points = [];
    }
    totalDistanceKm += RideActivityMetrics.calculateTotalDistanceKm(points);
    totalDurationSec += RideActivityMetrics.calculateDurationSec(points);
    totalMovingTimeSec += RideActivityMetrics.calculateMovingTimeSec(points);
    elevationGainM += RideActivityMetrics.calculateElevationGainM(points);
    elevationLossM += RideActivityMetrics.calculateElevationLossM(points);
    const rideMaxSpeedKmh = RideActivityMetrics.calculateMaxSpeedKmh(points);
    if (rideMaxSpeedKmh > maxSpeedKmh) maxSpeedKmh = rideMaxSpeedKmh;
  }

  const averageSpeedKmh = totalMovingTimeSec > 0
    ? totalDistanceKm / (totalMovingTimeSec / 3600)
    : 0;

  return {
    totalRides: rides.length,
    totalDistanceKm,
    totalDurationSec,
    totalMovingTimeSec,
    averageSpeedKmh,
    maxSpeedKmh,
    elevationGainM,
    elevationLossM,
  };
},

};

// isFilterAll(statusFilter) — helper kecil: null/undefined berarti "semua
// status", sama kontrak persis isNullish() di ride-storage.js (TIDAK
// diimpor krn ride-storage.js sengaja zero-dependency/tidak mengekspor
// helper internal — logic 2 baris ini bukan "rumus baru", cuma re-cek
// null/undefined).
function isFilterAll(statusFilter) {
  return statusFilter === null || statusFilter === undefined;
}

// pola fix sama persis window.RideUI di ride-ui.js (S525) / window.RideMap
// di ride-map.js (S526) — tanpa baris ini, RideHistory/RideAnalytics tidak
// akan pernah ketemu lewat window.<path> walau const-nya sudah ada di
// scope module (top-level `const` hasil concat TIDAK otomatis jadi
// properti window, beda dari `var`/function declaration).
if (typeof RideHistory !== 'undefined' && typeof window !== 'undefined') window.RideHistory = RideHistory;
if (typeof RideAnalytics !== 'undefined' && typeof window !== 'undefined') window.RideAnalytics = RideAnalytics;
