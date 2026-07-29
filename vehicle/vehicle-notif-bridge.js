// vehicle-notif-bridge.js — Vehicle Notification Bridge (Sesi 84, Batch 7).
// Target sesi: **Vehicle Dashboard Final Integration** — menutup gap
// terakhir yang tercatat di docs/BATCH_PLAN.md Sesi 83 ("wiring
// VehicleAutomationAPI/VehicleReminderScheduler ke reminder-notif.js/
// notifikasi browser ... BELUM ada wiring ke notifikasi nyata").
//
// KONTEKS: reminder-notif.js (checkAndFireReminders()) SUDAH menembak
// notifikasi browser nyata utk tagihan/LDR/pajak-kendaraan(VEHTAX_ITEMS)/
// SIM/SPT -- TAPI baca D.vehicles+VEHTAX_ITEMS langsung (ad-hoc, mendahului
// VehicleReminder Sesi 78, TIDAK diubah sesi ini krn sudah berjalan &
// mengubahnya cuma menambah risiko regresi tanpa manfaat baru). Service
// Reminder & Fuel Reminder (VehicleReminder.serviceReminders()/
// .fuelReminders(), Sesi 78) BELUM PERNAH menembak notifikasi nyata --
// itu satu-satunya gap yang ditutup sesi ini.
//
// PRINSIP (RULE #1): 100% REUSE VehicleReminder (Sesi 78) apa adanya --
// TIDAK ada ambang/rumus baru, TIDAK menghitung ulang status 'overdue' apa
// pun (severity sudah final dari layer di bawahnya). Modul ini PURE --
// tidak pernah memanggil fireNotif()/Notification/localStorage sendiri,
// tidak menyentuh DOM. Hanya MENERJEMAHKAN reminder severity 'overdue'
// (service+fuel) jadi bentuk generik {fireKey,title,body} siap pakai
// pemanggil (reminder-notif.js checkAndFireReminders(), yang SUDAH
// memanggil fireNotif()+menyimpan kw_notif_fired sendiri) -- pola sama
// persis lapisan presenter/API murni lain di modules/vehicle/* (mis.
// VehicleActionRecommendation.actionFor(), Sesi 82).
//
// taxReminders() SENGAJA TIDAK disertakan di sini -- jalur lama ad-hoc di
// reminder-notif.js sudah menembak notif pajak, menyertakannya lagi lewat
// modul ini akan dobel-tembak utk tipe yang sama (fireKey beda format,
// firedIds tidak akan saling mendeteksi).
//
// severity 'due-soon'/'info' SENGAJA TIDAK ditembak jadi notifikasi push --
// pola sama ambang tagihan/pajak yang sudah ada (hanya H-0 s/d lewat yang
// aktif menembak notif; due-soon tetap murni domain dashboard/insight feed,
// BUKAN push notification).
const VehicleNotifBridge = {

// items(vehicleId?, firedIds?) — daftar {fireKey,title,body} siap tembak
// notifikasi, dari VehicleReminder.serviceReminders()/.fuelReminders()
// severity 'overdue', difilter firedIds (default []) supaya item yang
// sudah pernah ditembak (hari yang sama, disuplai pemanggil dari
// kw_notif_fired.ids) tidak diulang.
items(vehicleId, firedIds) {
  const fired = Array.isArray(firedIds) ? firedIds : [];
  if (typeof VehicleReminder === 'undefined') return [];
  const out = [];

  const service = (typeof VehicleReminder.serviceReminders === 'function')
    ? VehicleReminder.serviceReminders(vehicleId).filter((r) => r.severity === 'overdue')
    : [];
  service.forEach((r) => {
    const fireKey = 'vehsvc_' + r.vehicleId + '_' + r.categoryName;
    if (fired.includes(fireKey)) return;
    out.push({ fireKey, title: '🔧 Servis Lewat Jatuh Tempo', body: r.message });
  });

  const fuel = (typeof VehicleReminder.fuelReminders === 'function')
    ? VehicleReminder.fuelReminders(vehicleId).filter((r) => r.severity === 'overdue')
    : [];
  fuel.forEach((r) => {
    const fireKey = 'vehfuel_' + r.vehicleId;
    if (fired.includes(fireKey)) return;
    out.push({ fireKey, title: '⛽ Estimasi BBM Terlewati', body: r.message });
  });

  return out;
},

};
