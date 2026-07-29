// modules/vehicle/shop-katalog-dinamis-api.js — Shop Katalog Sparepart
// Dinamis (per-Kendaraan) API. Batch: "ringan dulu" — cuma layer data
// (API), TIDAK ada presenter/modal baru di sesi ini (menyusul kalau API
// ini sudah aman dipakai).
//
// PRINSIP (100% REUSE, sama persis pola AssetMaintenanceAPI/
// PropertyManagementAPI):
//  - TIDAK ada field baru ditambah ke D.vehicles / D.sparepartCats /
//    D.partsCatalog / D.servisLogs.
//  - TIDAK ada rumus interval baru — intervalKm tetap dari
//    D.sparepartCats (kategori sparepart, sudah ada, lihat
//    modules/shared/data-default.js DEFAULT_SPAREPARTS).
//  - Guard berlapis (typeof X==='undefined' -> {ok:false,reason}) biar
//    file ini aman dimuat berdiri sendiri / sebelum data terkait ada.
//  - Nama koleksi part katalog per-kendaraan belum pasti seragam di
//    seluruh build (kandidat: D.partsCatalog / D.vehiclePartsCatalog).
//    _catalogList() cek KEDUANYA apa adanya, TIDAK memutuskan satu nama
//    "benar" secara sepihak — supaya tidak salah asumsi struktur data
//    yang sudah berjalan di produksi.
//  - Pencocokan part↔kendaraan & part↔kategori sparepart dilakukan
//    read-only (tidak menulis apa pun), pakai pola matching TOLERAN
//    (cek beberapa nama field kandidat) karena skema field persis milik
//    modul Vehicle Catalog (catalogModal, VehicleCatalogUI) tidak
//    tercakup di batch file ini.
const ShopKatalogDinamisAPI = {

  // MAX_KENDARAAN — batas tampil selector kendaraan di UI shop (S/K:
  // "kalau ada 5 kendaraan"). Cuma batas TAMPILAN daftar pilihan, bukan
  // batas jumlah D.vehicles yang boleh ada (lebih dari 5 tetap aman,
  // sisanya cukup discroll — lihat daftarKendaraan()).
  MAX_KENDARAAN: 5,

  // _vehicles() — satu titik akses ke D.vehicles, guard sama persis
  // AssetMaintenanceAPI._assets().
  _vehicles() {
    if (typeof D === 'undefined' || !D || !Array.isArray(D.vehicles)) return [];
    return D.vehicles;
  },

  // _catalogList() — satu titik akses ke katalog part per-kendaraan.
  // Cek 2 nama koleksi kandidat (lihat catatan PRINSIP di atas), pakai
  // yang pertama ADA & berisi array — TIDAK menggabung keduanya supaya
  // tidak dobel kalau ternyata sinonim.
  _catalogList() {
    if (typeof D === 'undefined' || !D) return [];
    if (Array.isArray(D.partsCatalog)) return D.partsCatalog;
    if (Array.isArray(D.vehiclePartsCatalog)) return D.vehiclePartsCatalog;
    return [];
  },

  // _sparepartCats() — satu titik akses ke D.sparepartCats (kategori +
  // intervalKm, SUDAH ADA — DEFAULT_SPAREPARTS).
  _sparepartCats() {
    if (typeof D === 'undefined' || !D || !Array.isArray(D.sparepartCats)) return [];
    return D.sparepartCats;
  },

  // _servisLogs() — satu titik akses ke D.servisLogs (riwayat servis,
  // SUDAH ADA — dipakai servisModal/onServisItemAutofillInterval()).
  _servisLogs() {
    if (typeof D === 'undefined' || !D || !Array.isArray(D.servisLogs)) return [];
    return D.servisLogs;
  },

  // daftarKendaraan() — field "Pilih Kendaraan" utk fitur Shop. Dipotong
  // ke MAX_KENDARAAN item TERBARU (kendaraan lain tetap ada di
  // D.vehicles, cuma tidak dimasukkan array ini — UI bisa tambah
  // "lainnya" sendiri kalau perlu, TIDAK di-handle di sini).
  daftarKendaraan() {
    const list = this._vehicles().slice(0, this.MAX_KENDARAAN).map((v) => ({
      id: v.id,
      name: v.name,
      emoji: v.emoji || (v.jenis === 'mobil' ? '🚗' : v.jenis === 'listrik' ? '🔋' : '🏍️'),
      jenis: v.jenis || 'motor',
    }));
    return { ok: true, count: list.length, totalKendaraan: this._vehicles().length, list };
  },

  // _cocokKendaraan(part, vehicleId) — TOLERAN thd 2 skema compat yang
  // mungkin dipakai: array id (part.compatVehicleIds) ATAU array objek
  // {id,...} (part.compatVehicles). Part TANPA daftar compat sama
  // sekali dianggap "berlaku umum" (cocok semua kendaraan) — konsisten
  // dgn UI catalogModal yang menandai field ini opsional.
  _cocokKendaraan(part, vehicleId) {
    const a = Array.isArray(part.compatVehicleIds) ? part.compatVehicleIds : null;
    const b = Array.isArray(part.compatVehicles) ? part.compatVehicles : null;
    if (!a && !b) return true;
    if (a && a.includes(vehicleId)) return true;
    if (b && b.some((x) => (x && x.id) === vehicleId)) return true;
    return false;
  },

  // _kategoriUntukPart(part) — cocokkan nama part ke D.sparepartCats
  // (case-insensitive substring, pola sama persis
  // onServisItemAutofillInterval()/guessSparepartFromReceiptText() yang
  // sudah ada) supaya dapat intervalKm APA ADANYA, TIDAK dikarang baru.
  _kategoriUntukPart(part) {
    const nama = (part.name || '').toLowerCase();
    const cats = this._sparepartCats();
    if (!nama || !cats.length) return null;
    return cats.find((c) => c.name && (nama.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(nama))) || null;
  },

  // _servisTerakhir(vehicleId, part) — entri D.servisLogs paling baru
  // utk kendaraan+part ini (match by vehicleId + nama item mengandung
  // nama part, TOLERAN thd penamaan bebas user di field "Jenis
  // Servis/Item"), diurutkan by tanggal desc, APA ADANYA (0 rumus baru).
  _servisTerakhir(vehicleId, part) {
    const nama = (part.name || '').toLowerCase();
    if (!nama) return null;
    const logs = this._servisLogs()
      .filter((s) => s && s.vehicleId === vehicleId && (s.item || '').toLowerCase().includes(nama));
    if (!logs.length) return null;
    logs.sort((x, y) => String(y.tanggal || '').localeCompare(String(x.tanggal || '')));
    return logs[0];
  },

  // katalogUntuk(vehicleId) — INTI fitur: "kendaraan mana -> katalog
  // part item interval mana", dinamis. Guard berlapis; kalau koleksi
  // katalog part belum ada di build ini, balikin {ok:false,reason}
  // TANPA melempar error (aman dipanggil dari presenter manapun).
  katalogUntuk(vehicleId) {
    if (!vehicleId) return { ok: false, reason: 'Kendaraan belum dipilih' };
    const veh = this._vehicles().find((v) => v.id === vehicleId);
    if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
    const catalog = this._catalogList();
    if (!catalog.length) return { ok: false, reason: 'Katalog part belum tersedia di perangkat ini' };

    const items = catalog
      .filter((p) => p && this._cocokKendaraan(p, vehicleId))
      .map((p) => {
        const kategori = this._kategoriUntukPart(p);
        const last = this._servisTerakhir(vehicleId, p);
        const lastKm = last ? (last.km || null) : null;
        const kmSekarang = (veh.kmAwal != null) ? veh.kmAwal : null; // apa adanya, 0 estimasi baru
        const kmSejakServis = (lastKm != null && kmSekarang != null) ? Math.max(0, kmSekarang - lastKm) : null;
        const intervalKm = kategori ? kategori.intervalKm : null;
        const status = (intervalKm && kmSejakServis != null)
          ? (kmSejakServis >= intervalKm ? 'perlu-ganti' : 'aman')
          : 'belum-diketahui';
        return {
          id: p.id,
          nama: p.name,
          oemCode: p.oemCode || null,
          kategori: kategori ? kategori.name : null,
          intervalKm,
          lastServisTanggal: last ? last.tanggal : null,
          lastServisKm: lastKm,
          kmSejakServis,
          status,
        };
      });

    return { ok: true, kendaraan: { id: veh.id, name: veh.name }, count: items.length, items };
  },

};
