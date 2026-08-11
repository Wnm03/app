// fuel-modal.js — Fuel Modal (TASK-141, Fuel Intelligence Card).
//
// PRINSIP: orkestrasi TIPIS saja. Buka overlay #fuelIntelModal (markup di
// modals.js, sesi ini) & panggil FuelAnalytics.render()/FuelHistory.render()
// (sesi ini, keduanya 100% reuse FuelIntelligenceEngine/FuelStorage) utk
// isi bodinya. Reuse openModal()/closeModal() (SUDAH ADA, dipakai semua
// modal lain di project ini) apa adanya — TIDAK ada mekanisme modal baru.
const FuelModal = {

curVehicleId: null,

// open(vehicleId?) — vehicleId opsional, default curVehicleId (kendaraan
// aktif di tab Car Notes, SUDAH ADA — sama seperti default vehicleId di
// BBM.openModal()/txBbmVehicle). {ok:false} (toast, tidak jadi buka
// modal) kalau kendaraan tidak ditemukan.
open(vehicleId) {
  const vid = vehicleId || (typeof curVehicleId !== 'undefined' ? curVehicleId : null);
  if (typeof FuelIntelligenceEngine === 'undefined') return;
  const insight = FuelIntelligenceEngine.vehicleInsight(vid);
  if (!insight.ok) {
    if (typeof toast === 'function') toast('⚠️ Kendaraan tidak ditemukan');
    return;
  }
  this.curVehicleId = vid;
  const titleEl = document.getElementById('fuelIntelModalVeh');
  if (titleEl) titleEl.textContent = (insight.emoji ? insight.emoji + ' ' : '') + insight.name;
  if (typeof FuelAnalytics !== 'undefined') FuelAnalytics.render(vid);
  if (typeof FuelHistory !== 'undefined') FuelHistory.render(vid);
  if (typeof openModal === 'function') openModal('fuelIntelModal');
},

};

// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['FuelModal']['open']. `const FuelModal = {...}` di atas HANYA
// membuat binding lexical-scope (bukan properti window), pola fix sama
// persis window.DashboardHub di dashboard-hub-search.js (bug yang sama
// pernah terjadi & diperbaiki di sana). Tanpa baris ini, tombol
// "📊 Lihat Detail" tidak akan pernah berfungsi meski test lolos, karena
// test memanggil FuelModal.open() langsung (referensi lexical, bukan
// lewat window), tidak lewat jalur klik data-action yang sesungguhnya.
if (typeof FuelModal !== 'undefined') window.FuelModal = FuelModal;
