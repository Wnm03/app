# Audit & Merge Report — Baseline v835 + hotfix_scanner-session-fab_patch

Tanggal audit: 2026-07-28

## 1. Baseline terbaru
Dibandingkan dua kandidat baseline:

| ZIP | Build version (`?v=`) | Struktur |
|---|---|---|
| kw_release_sesi319_sim-tarif-refai_v832.zip | 832 | root: `kw_v832_full/` |
| kw_release_sesi322_sewakios-harga-dinamis_v835.zip | 835 | root langsung (flat) |

**Hasil:** `v835` dikonfirmasi sebagai baseline terbaru (nomor build lebih tinggi,
sesi lebih baru — sesi322 vs sesi319). v832 tidak digunakan lebih lanjut.

## 2. Perbandingan hotfix vs v835
File dalam `hotfix_scanner-session-fab_patch.zip`:

| File | Status vs v835 | Checksum (MD5) |
|---|---|---|
| `modules/shared/scanner-session.js` | **IDENTIK** | `c39db6f2bffc5aee905af7344e544591` (sama) |
| `tests/scanner-session.test.js` | **IDENTIK** | `0a3d74eb3b0460d5c328a045f52936e0` (sama) |
| `HOTFIX_REPORT.md` | **IDENTIK** dengan `RELEASE_REPORTS_HOTFIX_SCANNER_FAB/HOTFIX_REPORT.md` di v835 | `65acaa4cfcbdbf96453b0f008ba90534` (sama) |
| `modules/vehicle/` | Direktori kosong, tidak ada file | – |

## 3. Kesimpulan
Hotfix ini **sudah terintegrasi penuh** ke dalam v835 sebelum audit ini dijalankan
(byte-for-byte identik pada seluruh file yang dibawa hotfix, termasuk laporannya
yang sudah tersimpan di `RELEASE_REPORTS_HOTFIX_SCANNER_FAB/HOTFIX_REPORT.md`).

- **File yang berubah / perlu di-merge:** 0
- **Konflik ditemukan:** 0
- **Tindakan merge:** tidak ada perubahan konten yang diperlukan; paket akhir = v835
  (baseline) diverifikasi ulang, tanpa modifikasi tambahan.

## 4. Paket hasil (audit awal)
`kw_v835_merged-verified.zip` — identik dengan baseline v835 asli, telah diverifikasi
tidak ada file hotfix yang tertinggal/konflik.

---

# Lampiran — Fitur baru: Sinkron Kategori/Stok dari Katalog Suku Cadang

Permintaan lanjutan user: pisahkan tanggung jawab 3 sumber data yang ada di
repo ini —

- **TORSI_DB** (`modules/vehicle/sparepart-servis.js`) — tetap MURNI referensi
  torsi kunci & interval servis per model motor, tidak diubah sama sekali.
- **Katalog Suku Cadang / VehicleCatalog** (`modules/vehicle/vehicle-catalog.js`)
  — jadi SATU-SATUNYA sumber "part apa saja yang ada", per kendaraan
  (`compatibleVehicleIds`).
- **Kelola Kategori & Stok Sparepart** (`D.sparepartCats` / `D.partsStock`) —
  dibuat/disinkron DARI Katalog Suku Cadang, dengan interval servis diambil
  dari TORSI_DB.

## Implementasi
File yang diubah:
- `modules/vehicle/sparepart-servis.js` — tambah method baru
  `Sparepart.syncFromCatalog()` + wrapper global `syncSparepartFromCatalog()`.
- `index.html` / `app_production.html` — tombol baru "🔄 Sinkron dari Katalog
  Suku Cadang" di bagian 🔧 Kelola Kategori Sparepart & Interval Servis.
- `tests/sparepart-sync-from-catalog-s331.test.js` — 9 test baru (filter per
  kendaraan, interval dari TORSI_DB, idempotensi, tidak menimpa interval
  manual, draft diabaikan, batal di preview, dll).

## Cara kerja
1. Ambil semua item `VehicleCatalog.getAll()` yang **bukan draft** dan
   `compatibleVehicleIds`-nya memuat kendaraan aktif (`curVehicleId`) — sesuai
   keputusan user "beda kendaraan beda katalog".
2. Lewati part yang sudah pernah disinkron (`D.partsStock` dengan `catalogId`
   yang sama) — idempotent, aman dipanggil berkali-kali.
3. Tampilkan preview (daftar part + kategori + interval yang akan dibuat)
   lewat dialog konfirmasi, sebelum commit apa pun.
4. Setelah dikonfirmasi: buat/lengkapi `D.sparepartCats` (kategori dengan nama
   sama TIDAK dibuat ulang; interval yang sudah diisi manual oleh user TIDAK
   pernah ditimpa) dan `D.partsStock` (qty awal 0, tertaut lewat `catalogId`).
   Interval kategori baru dicari dari TORSI_DB via `suggestServiceIntervalKm()`
   yang sudah ada di file yang sama (read-only, TORSI_DB tidak disentuh).

## Verifikasi
```
node scripts/build.js sesi331-sync-katalog-kategori-stok
✓ Build selesai, ?v=837, index.html & app_production.html identik

node --test tests/*.test.js
# tests 1638 / pass 1638 / fail 0   (naik dari 1629, 9 test baru, 0 regresi)
```

## Paket hasil akhir
`kw_v837_sync-katalog-sparepart.zip` — v835 + hotfix (sudah terverifikasi
identik) + fitur sinkron Katalog Suku Cadang → Kategori/Stok Sparepart di
atas, build v837, semua test lolos.
