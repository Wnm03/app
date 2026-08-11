// modules/vehicle/torsi-vehicle-api.js — Torsi Vehicle Selector API (Sesi 1).
// Basis: DESIGN_torsi-vehicle-selector_shop-import-export.md, Bagian A.
// Batch: "ringan dulu" — cuma layer data (API) + migrasi, TIDAK ada perubahan
// HTML/modal/action-wrapper di sesi ini (menyusul sesi berikutnya setelah API
// ini aman dipakai — lihat "Urutan implementasi disarankan" di dokumen desain).
//
// PRINSIP (100% REUSE, sama persis pola ShopKatalogDinamisAPI):
//  - daftarKendaraan() TIDAK diduplikasi — panggil ulang
//    ShopKatalogDinamisAPI.daftarKendaraan() apa adanya, supaya daftar
//    kendaraan di Shop & di Torsi selalu identik (1 sumber kebenaran, RULE
//    "ZIP = source of truth" & anti duplikasi). File ini HARUS dimuat SETELAH
//    modules/vehicle/shop-katalog-dinamis-api.js (lihat scripts/build.js).
//  - TIDAK ada field baru ditambah ke D.vehicles.
//  - Guard berlapis (typeof X==='undefined' -> {ok:false,reason}) biar file
//    ini aman dimuat berdiri sendiri / sebelum data terkait ada.
//
// CATATAN PENTING soal bentuk data D.torsiChecklist (beda dari asumsi awal di
// dokumen desain): di build ini `Torsi` (car-notes.js) SUDAH menyimpan
// checklist per-kendaraan, bukan flat — lihat Torsi.loadPersisted()/
// Torsi.persist(): D.torsiChecklist[vehicleId] = {checked:{}, biaya:{},
// pageMode}. API ini TIDAK mengubah struktur tsb (0 perubahan skema), cuma
// jadi 1 pintu baca/tulis tambahan yang bisa dipanggil presenter TANPA
// bergantung ke variabel global `curVehicleId` — dibutuhkan utk field "Pilih
// Kendaraan" independen di torsiModal (menyusul Sesi berikutnya, lihat A.4-A.5
// di dokumen desain).
const TorsiVehicleAPI = {

  // MAX_KENDARAAN — reuse LANGSUNG konstanta ShopKatalogDinamisAPI (bukan
  // duplikasi angka) supaya kalau batasnya berubah, cukup diubah 1 tempat.
  // Fallback ke 5 kalau (skenario tidak normal) file itu belum termuat.
  get MAX_KENDARAAN() {
    return (typeof ShopKatalogDinamisAPI !== 'undefined') ? ShopKatalogDinamisAPI.MAX_KENDARAAN : 5;
  },

  // _vehicles() — satu titik akses ke D.vehicles, guard sama persis
  // ShopKatalogDinamisAPI._vehicles().
  _vehicles() {
    if (typeof D === 'undefined' || !D || !Array.isArray(D.vehicles)) return [];
    return D.vehicles;
  },

  // _checklist() — satu titik akses ke D.torsiChecklist, self-heal kalau
  // korup/belum ada (object kosong), TIDAK menimpa data valid yang sudah ada.
  _checklist() {
    if (typeof D === 'undefined' || !D) return {};
    if (!D.torsiChecklist || typeof D.torsiChecklist !== 'object' || Array.isArray(D.torsiChecklist)) {
      D.torsiChecklist = {};
    }
    return D.torsiChecklist;
  },

  // daftarKendaraan() — REUSE LANGSUNG ShopKatalogDinamisAPI.daftarKendaraan()
  // (kontrak {ok,count,totalKendaraan,list} sudah pas, tidak perlu duplikat
  // logic). Fallback minimal kalau file itu ternyata belum termuat.
  daftarKendaraan() {
    if (typeof ShopKatalogDinamisAPI !== 'undefined') return ShopKatalogDinamisAPI.daftarKendaraan();
    const list = this._vehicles().slice(0, this.MAX_KENDARAAN).map((v) => ({
      id: v.id,
      name: v.name,
      emoji: v.emoji || (v.jenis === 'mobil' ? '🚗' : v.jenis === 'listrik' ? '🔋' : '🏍️'),
      jenis: v.jenis || 'motor',
    }));
    return { ok: true, count: list.length, totalKendaraan: this._vehicles().length, list };
  },

  // checklistUntuk(vehicleId) — baca D.torsiChecklist[vehicleId] apa adanya
  // (bentuk asli: {checked, biaya, pageMode}, lihat catatan bentuk data di
  // atas), TANPA menulis apa pun kalau belum ada record (biar tidak nyampah
  // key kendaraan yang belum pernah dicek torsinya sama sekali).
  checklistUntuk(vehicleId) {
    if (!vehicleId) return { ok: false, reason: 'Kendaraan belum dipilih' };
    const veh = this._vehicles().find((v) => v.id === vehicleId);
    if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
    const rec = this._checklist()[vehicleId];
    return {
      ok: true,
      kendaraan: { id: veh.id, name: veh.name },
      checked: (rec && rec.checked) ? rec.checked : {},
      biaya: (rec && rec.biaya) ? rec.biaya : {},
      pageMode: (rec && rec.pageMode) || 'normal',
    };
  },

  // setCheck(vehicleId, partKey, patch) — tulis ke
  // D.torsiChecklist[vehicleId].checked/biaya[partKey], buat record kalau
  // belum ada (pola sama Torsi.persist()). patch: {checked?:bool, biaya?:num}.
  setCheck(vehicleId, partKey, patch) {
    if (!vehicleId || !partKey || !patch || typeof patch !== 'object') {
      return { ok: false, reason: 'Data tidak lengkap' };
    }
    const veh = this._vehicles().find((v) => v.id === vehicleId);
    if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
    const checklist = this._checklist();
    if (!checklist[vehicleId]) checklist[vehicleId] = { checked: {}, biaya: {}, pageMode: 'normal' };
    const rec = checklist[vehicleId];
    if (!rec.checked || typeof rec.checked !== 'object') rec.checked = {};
    if (!rec.biaya || typeof rec.biaya !== 'object') rec.biaya = {};
    if (patch.checked !== undefined) rec.checked[partKey] = !!patch.checked;
    if (patch.biaya !== undefined) rec.biaya[partKey] = patch.biaya;
    if (typeof save === 'function') save();
    return { ok: true };
  },

  // _migrateFlatToPerVehicle(d) — Sesi "Revisi migrasi" (lihat DESIGN dok.,
  // Bagian A.2): JARING PENGAMAN murni kalau ada backup/JSON restore dari
  // versi lebih tua & D.torsiChecklist-nya belum per-kendaraan (key BUKAN id
  // kendaraan valid & value TIDAK berbentuk {checked:{},biaya:{}} khas record
  // per-kendaraan) — data lama TIDAK dibuang, dipindah apa adanya ke
  // kendaraan pertama sbg default (`_legacyFlat`), supaya tidak ada
  // kehilangan data. Kalau `d.vehicles` kosong, dibiarkan apa adanya (tidak
  // ada tujuan migrasi). 0 logic baru dari versi sebelumnya — cuma jadi
  // fungsi murni (terima `d` sbg parameter, bukan baca D global) supaya bisa
  // dipanggil dari DATA_MIGRATIONS (features-helpers-global-security.js),
  // yang guard idempotensinya SUDAH ditangani `runDataMigrations()` lewat
  // `d.schemaVersion` — makanya TIDAK ADA lagi flag `D._migratedTorsiVehicle`
  // di sini (dihapus, digantikan mekanisme SCHEMA_VERSION yang sudah ada).
  _migrateFlatToPerVehicle(d) {
    if (!d) return;
    const raw = d.torsiChecklist;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const keys = Object.keys(raw);
    if (!keys.length) return;
    const vehicles = Array.isArray(d.vehicles) ? d.vehicles : [];
    const vehicleIds = new Set(vehicles.map((v) => v.id));
    const looksFlat = keys.every((k) => {
      if (vehicleIds.has(k)) return false; // key sudah id kendaraan valid -> bukan flat
      const v = raw[k];
      const isPerVehicleShape = v && typeof v === 'object' && !Array.isArray(v)
        && (v.checked === undefined || (typeof v.checked === 'object' && !Array.isArray(v.checked)));
      return !isPerVehicleShape;
    });
    if (looksFlat && vehicles.length) {
      d.torsiChecklist = { [vehicles[0].id]: { checked: {}, biaya: {}, pageMode: 'normal', _legacyFlat: raw } };
    }
  },

};
