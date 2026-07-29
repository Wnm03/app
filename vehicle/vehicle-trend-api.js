// vehicle-trend-api.js — Vehicle Trend API Foundation (Sesi 81, Batch 7).
// Target sesi: Vehicle Analytics Foundation — Vehicle Trend API, Vehicle
// Cost Summary, Fuel Trend Summary, Service Trend Summary, Vehicle
// Analytics Presenter. Lihat docs/BATCH_PLAN.md § Batch 7. Pola SAMA
// PERSIS modules/vehicle/vehicle-intelligence.js (Sesi 76)/vehicle-
// reminder.js (Sesi 78) — lapisan agregasi PURE (read-only) di atas data
// yang SUDAH ADA.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleIntelligence/
// VehicleReminder/VehicleAIHook, TIDAK menghitung ulang rumus (kmPerLiter/
// rpPerKm/estMonthlyCost/healthScore dst SUDAH ADA, TIDAK diulang di
// sini), TIDAK duplikasi logic, TIDAK framework baru, TIDAK mengubah
// struktur data D.
//
// VehicleTrendAPI adalah SATU-SATUNYA logic genuinely baru sesi ini (pola
// sama persis fleetSummary() jadi 1 logic baru di VehicleIntelligence
// Sesi 76, fuelReminders() di VehicleReminder Sesi 78): agregasi BIAYA
// AKTUAL per bulan (HISTORI, bukan prediksi/estimasi — beda dari
// fuelEfficiency().estMonthlyCost yang MEMPROYEKSIKAN bulan depan dari
// rata-rata harian) dari data mentah D.bbmLogs/D.servisLogs. Field
// `cost`/`date`/`vehicleId` SUDAH ADA di data model (diisi tx-bbm.js/
// sparepart-servis.js/backup-restore.js) — dibaca apa adanya, TIDAK ada
// field baru ditambahkan ke D. Satu-satunya operasi baru di sini adalah
// SUM `cost` yang sudah ada, dikelompokkan per bulan kalender — bukan
// rumus konsumsi/efisiensi/skor apa pun.
//
// Modul konsumen sesi ini (VehicleCostSummary/VehicleFuelTrendSummary/
// VehicleServiceTrendSummary, file terpisah) 100% REUSE fungsi di sini +
// VehicleIntelligence/VehicleReminder apa adanya, 0 recompute.
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM.
const VehicleTrendAPI = {

// _vehicles(vehicleId) — helper internal: baca D.vehicles apa adanya
// (array kosong kalau D/D.vehicles belum ada — guard typeof, pola sama
// persis VehicleIntelligence._vehicles()/VehicleReminder._vehicles()),
// difilter ke 1 kendaraan kalau vehicleId diberikan.
// _vehicles(vehicleId) (Sesi 196, Ownership Sync Vehicle): pola SAMA
// PERSIS VehicleReminder._vehicles() — dengan vehicleId tetap balikin
// kendaraan itu apa adanya, tanpa vehicleId (fleet-wide) HANYA kendaraan
// ownership SELF.
_vehicles(vehicleId) {
  const all = (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
  if (vehicleId) return all.filter((v) => v.id === vehicleId);
  return all.filter((v) => (typeof isVehicleOwnershipSelf !== 'function') || isVehicleOwnershipSelf(v.id));
},

// _monthKeys(months) — bangkitkan array kunci bulan 'YYYY-MM' N bulan
// terakhir (termasuk bulan berjalan), urut kronologis lama->baru. Dipakai
// supaya bulan TANPA transaksi tetap muncul di trend (total 0), bukan
// cuma bulan yang kebetulan ada datanya — penting utk grafik/list trend
// yang konsisten jumlah titiknya.
_monthKeys(months) {
  const n = (Number.isFinite(months) && months > 0) ? Math.floor(months) : 6;
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }
  return out;
},

// _monthLabel(key) — label tampilan 'MMM YYYY' dari kunci 'YYYY-MM',
// reuse MONTHS (modules/shared/helper-teks.js, SUDAH ADA & sudah dipakai
// label bulan lain di app) apa adanya — TIDAK membuat daftar nama bulan
// baru.
_monthLabel(key) {
  const parts = key.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const nm = (typeof MONTHS !== 'undefined' && MONTHS[m - 1]) ? MONTHS[m - 1] : String(m).padStart(2, '0');
  return `${nm} ${y}`;
},

// _costLogs(vehicleId, source) — helper internal: baca D.bbmLogs/
// D.servisLogs apa adanya (source = 'bbmLogs'/'servisLogs'), filter
// vehicleId (opsional, tanpa vehicleId = seluruh armada) & cost>0 &
// punya date. Field cost/date SUDAH ADA (tx-bbm.js/sparepart-servis.js),
// TIDAK ada transformasi.
// _costLogs(vehicleId, source) (Sesi 196, Ownership Sync Vehicle): TAMBAH
// 1 filter isVehicleOwnershipSelf(l.vehicleId) di atas logic lama, HANYA
// aktif kalau vehicleId TIDAK diberikan (fleet-wide/"seluruh armada").
// Dengan vehicleId eksplisit (1 kendaraan), log tetap dibaca apa adanya
// TANPA filter ownership — permintaan langsung ke 1 kendaraan tetap utuh
// sama pola recalcAccBalance() per-akun (Sesi 192) yang TIDAK disentuh.
_costLogs(vehicleId, source) {
  const arr = (typeof D !== 'undefined' && D[source]) ? D[source] : [];
  return arr.filter((l) => (!vehicleId || l.vehicleId === vehicleId)
    && l.cost > 0 && typeof l.date === 'string' && l.date.length >= 7
    && (vehicleId || typeof isVehicleOwnershipSelf !== 'function' || isVehicleOwnershipSelf(l.vehicleId)));
},

// monthlyCostTrend({vehicleId, type, months}) — LOGIC BARU sesi ini:
// total biaya AKTUAL per bulan (N bulan terakhir, default 6) utk
// type 'fuel' (SUM D.bbmLogs[].cost), 'service' (SUM D.servisLogs[].cost),
// atau 'all' (gabungan keduanya per bulan). vehicleId opsional (tanpa
// vehicleId = seluruh armada, SUM lintas kendaraan). Murni penjumlahan
// field `cost` yang sudah ada, dikelompokkan per bulan kalender — TIDAK
// ada rumus/estimasi/proyeksi baru (beda dari fuelEfficiency()/
// maintenanceForecast() yang MEMPREDIKSI masa depan — trend ini murni
// HISTORI transaksi aktual yang sudah tercatat).
monthlyCostTrend({ vehicleId, type = 'all', months = 6 } = {}) {
  const keys = this._monthKeys(months);
  const fuelLogs = (type === 'fuel' || type === 'all') ? this._costLogs(vehicleId, 'bbmLogs') : [];
  const serviceLogs = (type === 'service' || type === 'all') ? this._costLogs(vehicleId, 'servisLogs') : [];
  const rows = keys.map((key) => {
    const fuel = fuelLogs.filter((l) => l.date.slice(0, 7) === key).reduce((s, l) => s + l.cost, 0);
    const service = serviceLogs.filter((l) => l.date.slice(0, 7) === key).reduce((s, l) => s + l.cost, 0);
    return { month: key, label: this._monthLabel(key), fuel, service, total: fuel + service };
  });
  const total = rows.reduce((s, r) => s + r.total, 0);
  return { ok: true, type, months: keys.length, vehicleId: vehicleId || null, rows, total };
},

};
