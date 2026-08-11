// fuel-storage.js — Fuel Storage (TASK-141, Fuel Intelligence Card).
//
// PRINSIP: 100% REUSE D.bbmLogs (data mentah yang SUDAH ADA, diisi
// tx-bbm.js/car-notes.js BBM._saveInner/recordBbmLog) — TIDAK ada field
// baru ditambahkan ke D, TIDAK ada penyimpanan/state baru. Satu-satunya
// hal baru di sini adalah lapisan AKSES (query helper: filter per
// kendaraan, urut terbaru, ambil N terakhir) supaya FuelIntelligenceEngine/
// FuelHistory tidak menulis ulang `D.bbmLogs.filter(...)` masing-masing
// (pola sama seperti *-api.js lain di project ini yang jadi lapisan data
// tipis di atas D). PURE (read-only) — tidak pernah memanggil save() atau
// menulis ke D/localStorage.
const FuelStorage = {

// logs(vehicleId?) — semua log BBM (D.bbmLogs apa adanya), difilter ke 1
// kendaraan kalau vehicleId diberikan. Array kosong kalau D/D.bbmLogs
// belum ada (guard typeof, pola sama persis _vehicles() di VehicleIntelligence/
// VehicleReminder/VehicleTrendAPI).
logs(vehicleId) {
  const all = (typeof D !== 'undefined' && D.bbmLogs) ? D.bbmLogs : [];
  return vehicleId ? all.filter((b) => b.vehicleId === vehicleId) : all.slice();
},

// sortedByDate(vehicleId?) — logs() diurutkan tanggal terbaru dulu (desc).
// Tidak mengubah array asli (slice sebelum sort).
sortedByDate(vehicleId) {
  return this.logs(vehicleId).slice().sort((a, b) => (a.date < b.date ? 1 : (a.date > b.date ? -1 : 0)));
},

// latest(vehicleId?) — 1 log BBM terbaru (atau null kalau belum ada).
latest(vehicleId) {
  const rows = this.sortedByDate(vehicleId);
  return rows.length ? rows[0] : null;
},

// recent(vehicleId?, n=10) — N log BBM terbaru, urut terbaru dulu.
recent(vehicleId, n = 10) {
  return this.sortedByDate(vehicleId).slice(0, n);
},

// count(vehicleId?) — jumlah log BBM.
count(vehicleId) {
  return this.logs(vehicleId).length;
},

};
