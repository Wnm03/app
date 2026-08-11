// fuel-state-history.js — Fuel State History (lanjutan rencana "Fuel
// Estimation Auto-Update", "Saran tambahan" #3: histori estimasi,
// opsional/bukan prioritas menurut rencana asli, tapi dipilih duluan di
// antara sisa item krn ringan & tidak bergantung ke estimateCurrentLiter()
// yang belum ada -- murni menyalin apa yang SUDAH ditulis 2 jalur yang
// sudah ada).
//
// TUJUAN: simpan snapshot tiap kali veh.fuelState ditulis (bukan cuma
// overwrite `current`), biar nanti ada bahan buat validasi akurasi rumus
// atau fitur "seberapa akurat estimasi vs realita" jangka panjang. TIDAK
// ada UI/konsumen di sesi ini -- murni lapisan simpan+baca, pola sama
// persis FuelStorage (D.bbmLogs): koleksi FLAT baru `D.fuelStateHistory`
// (field vehicleId per entry, BUKAN nested per-kendaraan) supaya gampang
// query lintas kendaraan kalau nanti dibutuhkan & konsisten dgn D.bbmLogs.
//
// PRINSIP: 0 rumus baru -- record() murni menyalin field fuelState APA
// ADANYA. record() dipanggil SETELAH veh.fuelState ditulis (menambah,
// bukan menggantikan) dari 2 jalur yang sudah ada:
//  - FuelBarCorrection.save() (TASK-144, manual, fuel-intelligence-ui.js)
//  - syncFuelStateFromFullTankBbm() (tx-bbm.js, sesi FUEL-AUTOSYNC-01,
//    auto full-tank)
// Guard typeof D di semua method (pola sama persis FuelStorage) -- diam
// (return/array kosong) kalau D belum ada, TIDAK PERNAH bikin pemanggil
// (save BBM/koreksi manual) gagal gara-gara histori opsional ini.
const FuelStateHistory = {

// MAX_ENTRIES_PER_VEHICLE — cap panjang histori PER kendaraan supaya
// D.fuelStateHistory tidak tumbuh tanpa batas selamanya (localStorage ada
// limit, lihat safeSetItem() di features-helpers-global-security.js).
// 200 dipilih supaya cukup panjang utk analisis tren jangka menengah
// (jauh lebih banyak dari cadangan histori lain di project ini, mis.
// D.gajiMingguanHistory yang di-cap 26) tanpa berlebihan.
MAX_ENTRIES_PER_VEHICLE: 200,

// record(vehicleId, fuelState) — tambah 1 snapshot ke D.fuelStateHistory.
// fuelState diambil APA ADANYA (currentFuelBar/currentFuelLiter/
// correctedAt/estimatedSource/confidenceScore) -- 0 kalkulasi baru di
// sini. Diam (return, tidak menulis apa pun) kalau: D belum ada,
// vehicleId kosong, atau fuelState bukan object dgn currentFuelLiter
// berupa angka (snapshot tanpa liter tidak ada gunanya utk validasi
// akurasi, lebih baik tidak dicatat sama sekali daripada catat data
// rusak).
record(vehicleId, fuelState) {
  if (typeof D === 'undefined') return;
  if (!vehicleId || !fuelState || typeof fuelState.currentFuelLiter !== 'number') return;
  if (!Array.isArray(D.fuelStateHistory)) D.fuelStateHistory = [];
  D.fuelStateHistory.push({
    vehicleId,
    currentFuelBar: typeof fuelState.currentFuelBar === 'number' ? fuelState.currentFuelBar : null,
    currentFuelLiter: fuelState.currentFuelLiter,
    estimatedSource: fuelState.estimatedSource || null,
    confidenceScore: typeof fuelState.confidenceScore === 'number' ? fuelState.confidenceScore : null,
    recordedAt: fuelState.correctedAt || new Date().toISOString(),
  });
  this._trim(vehicleId);
},

// _trim(vehicleId) — buang entry TERLAMA milik vehicleId ini kalau sudah
// melebihi MAX_ENTRIES_PER_VEHICLE (urutan insert = urutan waktu, jadi
// entry di indeks kemunculan PERTAMA dalam array = paling lama). Entry
// milik kendaraan LAIN tidak pernah disentuh -- cap per kendaraan, bukan
// global.
_trim(vehicleId) {
  const forVehicleCount = D.fuelStateHistory.reduce((n, h) => (h.vehicleId === vehicleId ? n + 1 : n), 0);
  const excess = forVehicleCount - this.MAX_ENTRIES_PER_VEHICLE;
  if (excess <= 0) return;
  let removed = 0;
  D.fuelStateHistory = D.fuelStateHistory.filter((h) => {
    if (h.vehicleId !== vehicleId) return true;
    if (removed < excess) { removed++; return false; }
    return true;
  });
},

// list(vehicleId?) — semua snapshot (urut lama->baru, urutan insert asli),
// difilter ke 1 kendaraan kalau vehicleId diberikan. Array kosong kalau
// D/D.fuelStateHistory belum ada (guard typeof, pola sama persis
// FuelStorage.logs()).
list(vehicleId) {
  const all = (typeof D !== 'undefined' && D.fuelStateHistory) ? D.fuelStateHistory : [];
  return vehicleId ? all.filter((h) => h.vehicleId === vehicleId) : all.slice();
},

// latest(vehicleId?) — snapshot PALING BARU (atau null kalau belum ada).
latest(vehicleId) {
  const rows = this.list(vehicleId);
  return rows.length ? rows[rows.length - 1] : null;
},

// count(vehicleId?) — jumlah snapshot tersimpan.
count(vehicleId) {
  return this.list(vehicleId).length;
},

};
