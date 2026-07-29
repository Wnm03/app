// modules/vehicle/vehicle-ai-hook.js — Vehicle AI Hook Foundation
// (Sesi 79, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE, TIDAK ada rumus baru, TIDAK
// duplikasi logic, TIDAK mengubah struktur data D. VehicleAIHook HANYA
// menggabungkan hasil yang SUDAH ADA dari 2 lapisan agregasi vehicle:
//   - VehicleIntelligence.summary()/.fleetSummary() (Sesi 76)
//   - VehicleReminder.summary()                     (Sesi 78)
// getAIHook()-style wrapper SUDAH ADA per-modul (FinanceDashboard/
// VehicleDashboard, masing2 fleet-level saja, TANPA reminder). VehicleAIHook
// BUKAN pengganti keduanya — objek BARU yg tugasnya SATU: jadi satu pintu
// masuk read-only gabungan Intelligence+Reminder utk konsumen AI/briefing
// masa depan (ai-chat.js dst, di luar scope sesi ini — TIDAK ada wiring AI
// baru sesi ini), sesuai kandidat lama yg tercatat di BATCH_PLAN.md
// ("wiring VehicleReminder.summary() ke UI/notifikasi/AI briefing").
//
// 2 API baru sesi ini:
//   - fleetSummary()        — gabungan VehicleIntelligence.summary() (fleet-
//                              level, tanpa vehicleId) + VehicleReminder.
//                              summary() (fleet-level, tanpa vehicleId)
//   - vehicleInsight(id)    — gabungan VehicleIntelligence.summary(id) +
//                              VehicleReminder.summary(id) utk 1 kendaraan
// Keduanya WRAPPER TIPIS — 0 transformasi angka, 0 sorting/filtering
// tambahan atas hasil summary() masing2 modul, cuma disatukan jadi satu
// objek. Guard {ok:false} kalau salah satu/kedua modul belum dimuat (pola
// sama persis getAIHook() FinanceDashboard/VehicleDashboard).
//
// TIDAK ada UI/panel/dashboard di file ini — presenter-nya file terpisah
// (modules/vehicle/vehicle-insight-presenter.js, sesi ini juga tapi murni
// presenter, 100% reuse VehicleAIHook di sini, lihat komentar di file itu).
const VehicleAIHook = {

// fleetSummary() — Fleet Summary API. Gabungan VehicleIntelligence.
// summary() (fleet + insights fleet-level) dan VehicleReminder.summary()
// (service+tax+fuel reminder + overdueCount/dueSoonCount/infoCount)
// TANPA vehicleId di kedua sisi — 0 recompute, murni pemanggilan ulang.
// {ok:false} kalau VehicleIntelligence ATAU VehicleReminder belum dimuat
// (guard urutan load / dipakai headless di test, pola sama persis
// getAIHook() FinanceDashboard/VehicleDashboard).
fleetSummary() {
  if (typeof VehicleIntelligence === 'undefined') {
    return { ok: false, reason: 'VehicleIntelligence belum dimuat' };
  }
  if (typeof VehicleReminder === 'undefined') {
    return { ok: false, reason: 'VehicleReminder belum dimuat' };
  }
  const intelligence = VehicleIntelligence.summary();
  const reminder = VehicleReminder.summary();
  return { ok: true, intelligence, reminder };
},

// vehicleInsight(vehicleId) — Vehicle Insight API. Gabungan VehicleIntelligence.
// summary(vehicleId) (vehicleOverview+healthScore+insights kendaraan itu) &
// VehicleReminder.summary(vehicleId) (reminder kendaraan itu saja) — 0
// recompute, murni pemanggilan ulang dgn vehicleId yg sama ke kedua modul.
// {ok:false} kalau VehicleIntelligence/VehicleReminder belum dimuat (guard
// sama persis fleetSummary() di atas), ATAU kalau vehicleId tidak
// ditemukan (reuse {ok:false} vehicleOverview() milik VehicleIntelligence
// sendiri — TIDAK menduplikasi pengecekan "kendaraan ada/tidak").
vehicleInsight(vehicleId) {
  if (typeof VehicleIntelligence === 'undefined') {
    return { ok: false, reason: 'VehicleIntelligence belum dimuat' };
  }
  if (typeof VehicleReminder === 'undefined') {
    return { ok: false, reason: 'VehicleReminder belum dimuat' };
  }
  const intelligence = VehicleIntelligence.summary(vehicleId);
  if (!intelligence.vehicle || !intelligence.vehicle.ok) {
    return { ok: false, reason: (intelligence.vehicle && intelligence.vehicle.reason) || 'Kendaraan tidak ditemukan' };
  }
  const reminder = VehicleReminder.summary(vehicleId);
  return { ok: true, vehicleId, intelligence, reminder };
},

};
