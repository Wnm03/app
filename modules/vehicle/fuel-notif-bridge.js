// fuel-notif-bridge.js — Fuel Notification Bridge (TASK-153, Fuel
// Notification & Reminder).
//
// KONTEKS: reminder-notif.js (checkAndFireReminders()) SUDAH menembak
// notifikasi browser nyata utk tagihan/LDR/pajak-kendaraan/SIM/SPT +
// (Sesi 84) servis/BBM estimasi lewat VehicleNotifBridge -- TAPI insight
// Fuel Intelligence (FuelInsightEngine, TASK-149/150A) BELUM PERNAH
// menembak notifikasi nyata. Itu satu-satunya gap yang ditutup sesi ini.
//
// PRINSIP (RULE #1 task): 100% REUSE FuelInsightEngine.getInsights() apa
// adanya -- TIDAK ada ambang/rumus baru, TIDAK menghitung ulang reserve/
// efisiensi/risiko servis/prediksi apa pun (priority & angka sudah final
// dari FuelInsightEngine, yang sendiri 100% REUSE FuelGaugeEngine/
// FuelPredictionEngine/FuelMaintenanceEngine). Modul ini PURE -- tidak
// pernah memanggil fireNotif()/Notification/localStorage sendiri, tidak
// menyentuh DOM. Hanya MENERJEMAHKAN insight FuelInsightEngine yang
// "actionable" (lihat NOTIFY_RULES di bawah) jadi bentuk generik
// {fireKey,title,body,vehicleId} siap pakai pemanggil (reminder-notif.js
// checkAndFireReminders(), yang SUDAH memanggil fireNotif()+menyimpan
// kw_notif_fired sendiri) -- pola SAMA PERSIS
// modules/vehicle/vehicle-notif-bridge.js (Sesi 84).
//
// 4 Behavior task dipetakan ke insight FuelInsightEngine yang SUDAH ADA
// (0 insight/type baru ditambahkan ke FuelInsightEngine, engine itu
// TIDAK disentuh sama sekali):
//   - "Fuel reserve reached"                  -> insight id 'reserve-fuel',
//     ditembak kalau priority CRITICAL (reserve.inReserve true, dari
//     FuelGaugeEngine.getReserveStatus()).
//   - "Fuel efficiency drops significantly"   -> insight id
//     'fuel-efficiency', ditembak kalau degradationDetected true
//     (priority CRITICAL/HIGH, dari
//     FuelMaintenanceEngine.fuelEfficiencyHealth()).
//   - "Maintenance affects fuel efficiency"   -> insight id 'maintenance',
//     ditembak kalau priority CRITICAL (riskLevel 'tinggi' --  overdue
//     servis relevan BBM DAN degradasi efisiensi terdeteksi BERSAMAAN,
//     dari FuelMaintenanceEngine.maintenanceRisk() -- persis definisi
//     "maintenance affects fuel efficiency", bukan sekadar servis lewat
//     jatuh tempo tanpa korelasi efisiensi).
//   - "Predicted fuel refill reminder"        -> insight id 'next-refuel',
//     ditembak kalau priority CRITICAL/HIGH (estimatedRemainingDays <= 3,
//     dari FuelPredictionEngine.predictNextRefuel()).
// Insight lain (fuel-consumption/monthly-cost/prediction, semua selalu
// INFO) & priority MEDIUM/LOW/INFO pada 4 insight di atas SENGAJA TIDAK
// ditembak jadi notifikasi push -- pola SAMA PERSIS VehicleNotifBridge
// (hanya severity 'overdue' yang aktif menembak, bukan 'due-soon'/'info')
// supaya notifikasi tetap actionable, bukan noise harian.
const FuelNotifBridge = {

// NOTIFY_RULES — 1 fungsi per insight id yang didukung, balikin true
// kalau insight tsb cukup mendesak utk ditembak jadi notifikasi push
// (lihat pemetaan di komentar atas). Insight id di luar daftar ini
// (fuel-consumption/monthly-cost/prediction) TIDAK PERNAH ditembak.
NOTIFY_RULES: {
  'reserve-fuel': (insight) => insight.priority === 'CRITICAL',
  'fuel-efficiency': (insight) => insight.priority === 'CRITICAL' || insight.priority === 'HIGH',
  maintenance: (insight) => insight.priority === 'CRITICAL',
  'next-refuel': (insight) => insight.priority === 'CRITICAL' || insight.priority === 'HIGH',
},

// TITLE_MAP — judul notifikasi siap tampil per insight id (body dari
// insight.description apa adanya, 100% REUSE teks yang sudah disusun
// FuelInsightEngine -- 0 penyusunan kalimat baru di sini selain judul).
TITLE_MAP: {
  'reserve-fuel': '⛽ BBM Masuk Cadangan (Reserve)',
  'fuel-efficiency': '📉 Penurunan Efisiensi BBM Signifikan',
  maintenance: '🔧 Servis Jatuh Tempo Memengaruhi Efisiensi BBM',
  'next-refuel': '🔮 Perkiraan Waktu Isi BBM Berikutnya',
},

// _vehicles(vehicleId) — pola SAMA PERSIS VehicleReminder._vehicles():
// baca D.vehicles apa adanya lewat guard typeof, difilter ke 1 kendaraan
// kalau vehicleId diberikan, atau SELURUH kendaraan kalau tidak (dipakai
// checkAndFireReminders() yang menembak lintas SELURUH kendaraan, sama
// persis pola VehicleNotifBridge.items(undefined, ...)).
_vehicles(vehicleId) {
  const list = (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
  if (vehicleId) return list.filter((v) => v.id === vehicleId);
  return list.filter((v) => (typeof isVehicleOwnershipSelf !== 'function') || isVehicleOwnershipSelf(v.id));
},

// items(vehicleId?, firedIds?) — daftar {fireKey,title,body,vehicleId}
// siap tembak notifikasi, dari FuelInsightEngine.getInsights() per
// kendaraan, difilter NOTIFY_RULES (di atas) + firedIds (default [],
// supaya item yang sudah pernah ditembak hari yang sama, disuplai
// pemanggil dari kw_notif_fired.ids, tidak diulang -- 100% REUSE
// mekanisme dedup kw_notif_fired yang SUDAH ADA di reminder-notif.js, 0
// storage/dedup baru dibuat di sini).
items(vehicleId, firedIds) {
  const fired = Array.isArray(firedIds) ? firedIds : [];
  if (typeof FuelInsightEngine === 'undefined' || typeof FuelInsightEngine.getInsights !== 'function') return [];
  const out = [];
  this._vehicles(vehicleId).forEach((v) => {
    if (!v || !v.id) return;
    const res = FuelInsightEngine.getInsights(v.id);
    if (!res.ok) return;
    res.insights.forEach((insight) => {
      const rule = this.NOTIFY_RULES[insight.id];
      if (!rule || !rule(insight)) return;
      const fireKey = 'fuel_' + insight.id + '_' + v.id;
      if (fired.includes(fireKey)) return;
      out.push({
        fireKey,
        title: this.TITLE_MAP[insight.id],
        body: insight.description,
        vehicleId: v.id,
      });
    });
  });
  return out;
},

};
