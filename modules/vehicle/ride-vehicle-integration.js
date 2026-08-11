// ride-vehicle-integration.js — RideVehicleIntegration (S528, "Vehicle /
// Fuel / Maintenance Integration"). HARD SCOPE sesi ini: integration/
// orchestration layer MURNI yang menghubungkan data Ride yang sudah ada
// (RideHistory/RideStorage/RideActivityMetrics, S522-S527) dengan API
// vehicle/fuel/maintenance yang SUDAH ADA di repo — TIDAK ADA rumus
// km/L, Rp/km, interval servis, atau proyeksi baru dihitung ulang di
// sini, dan TIDAK ADA storage/IndexedDB/D-mutation baru.
//
// AUDIT (sebelum menulis file ini) — API existing yang dipakai APA
// ADANYA:
//   - RideHistory.getRideSummary(rideId) (ride-history.js, S527) ->
//     { ride, summary } (summary.distanceKm dari RideActivityMetrics,
//     S522). SATU-SATUNYA cara file ini baca data ride — tidak pernah
//     panggil RideStorage/RideActivityMetrics langsung (no-touch S522-
//     S527, lihat header masing-masing file).
//   - D.vehicles (registry kendaraan, vehicle-core.js) -> dibaca
//     read-only, pola persis _vehicles()/_vehicle(vehicleId) di
//     fuel-maintenance-engine.js (S/TASK-148).
//   - FuelCostAnalytics.costPerKm(vehicleId) (fuel-cost-analytics.js,
//     TASK-147, sendiri 100% reuse fuelEfficiency() global) -> dipakai
//     APA ADANYA utk kmPerLiter/rpPerKm kendaraan saat ini.
//   - predictService({vehicleId}) (sparepart-servis.js, global SUDAH
//     ADA) -> dipakai APA ADANYA utk status mileage/jatuh-tempo servis
//     kendaraan (curKm + items per kategori sparepart).
//   - TripEngine (modules/shop/trip-engine.js) & LogisticsEngine
//     (modules/logistics/logistics-engine.js) — DIAUDIT sesuai brief,
//     TAPI keduanya domain Shop (ongkir/pengiriman toko), 0 hubungan
//     dgn Ride kendaraan pribadi (S522-S527) — TIDAK dipakai/diintegrasi
//     di sini (integrasi lintas-domain yang tidak diminta = di luar
//     scope S528).
//
// GAP TERDOKUMENTASI (tidak diimplementasikan, sesuai instruksi "kalau
// tidak ada public API yang aman: DO NOT IMPLEMENT, REPORT GAP"):
//   - "ride -> vehicle association" TIDAK bisa di-query dari rideId
//     tersimpan: RideStorage session contract (S524) HANYA
//     {rideId,status,startedAt,endedAt,updatedAt} — vehicleId SENGAJA
//     TIDAK dipersist (lihat catatan eksplisit di header ride-storage.js
//     §REPOSITORY AUDIT & ride-ui.js baris ~317-322: vehicleId cuma ada
//     di state runtime RideUI, bukan di RideStorage/RideHistory).
//     Menambah field itu berarti mengubah ride-storage.js/RideStorage
//     schema, yang eksplisit dilarang (HARD NO-TOUCH). Karena itu method
//     di bawah menerima vehicleId sebagai PARAMETER dari caller (mis.
//     RideUI runtime state saat ride masih berjalan/baru selesai),
//     BUKAN mencarinya sendiri dari storage. Kalau vehicleId tidak
//     diberikan, hasilnya tetap {ok:true} (ride summary murni, tanpa
//     konteks kendaraan) — bukan error, supaya caller yang belum punya
//     vehicleId tetap bisa pakai fungsi ini.
//
// PRINSIP:
//   - 100% read-only: tidak pernah memanggil save(), tidak pernah
//     menulis ke D/D.vehicles/D.bbmLogs/D.servisLogs, tidak pernah
//     membuat object store/IndexedDB baru.
//   - Tidak pernah mutate object yang datang dari dependency (defensive
//     shallow copy pada titik keluar, pola sama RideStorage/RideHistory).
//   - Semua dependency dicek `typeof X !== 'undefined'`/`typeof f ===
//     'function'` dulu (pola sama semua modul vehicle lain) — tidak
//     pernah throw kalau salah satu dependency belum ter-load; hasilnya
//     field terkait null + tidak menghentikan bagian lain dari respons.
//   - 0 duplicate fuel calculation (rpPerKm/kmPerLiter 100% dari
//     FuelCostAnalytics.costPerKm(), cuma diterapkan ke distanceKm ride
//     ini — bukan re-derive dari D.bbmLogs) & 0 duplicate maintenance
//     calculation (curKm/items 100% dari predictService() apa adanya).

'use strict';

const RideVehicleIntegration = {

_vehicles() {
  return (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
},

_vehicle(vehicleId) {
  return this._vehicles().find((v) => v.id === vehicleId) || null;
},

// _rideSummary(rideId) — satu-satunya titik akses ke data Ride, 100%
// forward ke RideHistory.getRideSummary() (S527). RideHistory belum
// ter-load / reject / ride tidak ditemukan -> null (caller publik yang
// menerjemahkan jadi error RIDE_NOT_FOUND).
async _rideSummary(rideId) {
  if (typeof RideHistory === 'undefined' || typeof RideHistory.getRideSummary !== 'function') return null;
  try {
    return await RideHistory.getRideSummary(rideId);
  } catch (e) {
    return null;
  }
},

// _fuelContext(vehicleId, distanceKm) — reuse FuelCostAnalytics.costPerKm()
// (yang sendiri reuse fuelEfficiency()) APA ADANYA utk rate kmPerLiter/
// rpPerKm kendaraan saat ini, lalu diterapkan (bukan dihitung ulang) ke
// distanceKm ride ini. null kalau FuelCostAnalytics belum dimuat ATAU
// data BBM kendaraan belum cukup (costPerKm().ok:false) — BUKAN error,
// field fuel di respons publik cuma jadi null (lihat "missing fuel
// data" di kontrak method publik).
_fuelContext(vehicleId, distanceKm) {
  if (typeof FuelCostAnalytics === 'undefined' || typeof FuelCostAnalytics.costPerKm !== 'function') return null;
  let cost;
  try {
    cost = FuelCostAnalytics.costPerKm(vehicleId);
  } catch (e) {
    return null;
  }
  if (!cost || !cost.ok) return null;
  const km = (typeof distanceKm === 'number' && isFinite(distanceKm)) ? distanceKm : 0;
  return {
    kmPerLiter: cost.kmPerLiter,
    rpPerKm: cost.costPerKm,
    averageFuelPrice: cost.averageFuelPrice,
    estimatedLiter: cost.kmPerLiter > 0 ? km / cost.kmPerLiter : null,
    estimatedCost: km * cost.costPerKm,
  };
},

// _maintenanceContext(vehicleId) — reuse predictService({vehicleId})
// (sparepart-servis.js) APA ADANYA (curKm + items per kategori
// sparepart) — 0 rumus interval/jatuh-tempo baru. null kalau
// predictService belum dimuat ATAU kendaraan tidak ditemukan/belum ada
// kategori sparepart terdaftar (predictService().ok:false) — field
// maintenance di respons publik jadi null (lihat "missing maintenance
// data" di kontrak method publik).
_maintenanceContext(vehicleId) {
  if (typeof predictService !== 'function') return null;
  let pred;
  try {
    pred = predictService({ vehicleId });
  } catch (e) {
    return null;
  }
  if (!pred || !pred.ok) return null;
  return {
    curKm: pred.curKm,
    kmPerDay: pred.kmPerDay,
    items: Array.isArray(pred.items) ? pred.items.map((it) => ({ ...it })) : [],
  };
},

// getRideVehicleContext({rideId, vehicleId}) — API publik utama S528.
// Gabungkan ride summary (RideHistory, S527) dgn konteks kendaraan
// (fuel/maintenance, keduanya reuse API existing) kalau vehicleId
// diberikan caller.
//
// Kontrak:
//   - rideId wajib non-empty string -> selain itu {ok:false,
//     error:{code:'INVALID_INPUT'}}.
//   - ride tidak ditemukan (RideHistory.getRideSummary() -> null, mis.
//     rideId tidak ada di RideStorage ATAU dependency belum ter-load)
//     -> {ok:false, error:{code:'RIDE_NOT_FOUND'}}.
//   - vehicleId tidak diberikan (undefined/null/'') -> {ok:true} tetap,
//     vehicle/fuel/maintenance:null + note menjelaskan GAP (lihat
//     header file) — BUKAN error, supaya ride summary murni tetap bisa
//     dipakai caller yang belum tahu vehicleId-nya.
//   - vehicleId diberikan tapi tidak ada di D.vehicles -> {ok:true},
//     vehicle/fuel/maintenance:null + note 'vehicleId tidak ditemukan'.
//   - vehicleId valid tapi data BBM/kategori servis belum cukup ->
//     fuel:null dan/atau maintenance:null (independen satu sama lain),
//     TIDAK memblokir field lain yang berhasil.
//   - hasil SELALU defensive copy (ride/summary/maintenance.items) —
//     tidak pernah reference mutable ke internal RideHistory/D.
//   - tidak pernah mutate D, tidak pernah panggil save(), tidak pernah
//     menulis apa pun (read-only murni, 0 duplicate write).
async getRideVehicleContext({ rideId, vehicleId } = {}) {
  if (typeof rideId !== 'string' || rideId.length === 0) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: 'rideId harus non-empty string' } };
  }

  const result = await this._rideSummary(rideId);
  if (!result || !result.ride || !result.summary) {
    return { ok: false, error: { code: 'RIDE_NOT_FOUND', message: `ride "${rideId}" tidak ditemukan` } };
  }

  const { ride, summary } = result;
  const base = {
    ok: true,
    rideId,
    ride: { ...ride },
    summary: { ...summary },
    vehicle: null,
    fuel: null,
    maintenance: null,
  };

  if (vehicleId === undefined || vehicleId === null || vehicleId === '') {
    return {
      ...base,
      note: 'vehicleId tidak diberikan — RideStorage (S524) tidak mempersist asosiasi kendaraan per ride (lihat header file ini, bagian GAP). Sertakan vehicleId dari caller (mis. RideUI runtime state) untuk konteks kendaraan.',
    };
  }

  const veh = this._vehicle(vehicleId);
  if (!veh) {
    return { ...base, note: `vehicleId "${vehicleId}" tidak ditemukan di D.vehicles` };
  }

  return {
    ...base,
    vehicle: { id: veh.id, name: veh.name },
    fuel: this._fuelContext(vehicleId, summary.distanceKm),
    maintenance: this._maintenanceContext(vehicleId),
  };
},

};

// pola fix sama persis window.RideHistory di ride-history.js (S527) /
// window.RideUI di ride-ui.js (S525) — supaya RideVehicleIntegration
// ketemu lewat window.<path> (top-level `const` hasil concat build TIDAK
// otomatis jadi properti window).
if (typeof RideVehicleIntegration !== 'undefined' && typeof window !== 'undefined') window.RideVehicleIntegration = RideVehicleIntegration;
