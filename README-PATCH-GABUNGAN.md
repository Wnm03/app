# Patch Gabungan — Siap Upload Manual ke GitHub

File ini menggabungkan **4 patch** jadi 1, berisi HANYA versi TERBARU dari tiap
file yang berubah (patch belakangan menimpa patch sebelumnya kalau menyentuh
file yang sama). Struktur folder di dalam ZIP ini PERSIS sama dengan struktur
repo (`modules/...`, `tests/...`, `*.md` di root) — tinggal drag-drop/extract
langsung ke root repo, timpa file yang sudah ada.

## Urutan sesi yang digabung (sesuai urutan penerapan)
1. `SESI-AF1-SESSION-NOTE.md` — Sesi AF1: Auto-fill Sisa Porsi (awal)
2. `SESI-AF1-LANJUTAN-SESSION-NOTE.md` — Sesi AF1 lanjutan
3. `SESI-AF1-LANJUTAN2-SESSION-NOTE.md` — Sesi AF1 lanjutan #2 (2 test wajib terakhir)
4. `SESI-CN-INTERVAL-KHUSUS-KATALOG-DINAMIS-SESSION-NOTE.md` — Audit interval
   Car Notes + fix gap Katalog Sparepart Dinamis (fitur terpisah, tidak terkait AF1)

## Isi (10 file kode: 6 modul + 5 test — SESI-AF1-LANJUTAN2 hanya menimpa test yang sama)

**Modules:**
- `modules/shared/modules-calc.js`
- `modules/asset/investasi-view.js`
- `modules/asset/aset.js` *(versi final gabungan sesi 1+2, aset.js sesi 2 sudah termasuk semua perubahan sesi 1)*
- `modules/finance/akun.js`
- `modules/vehicle/shop-katalog-dinamis-api.js`
- `modules/vehicle/shop-katalog-dinamis-presenter.js`

**Tests:**
- `tests/asset-owners-nominal-autodistribute-s431.test.js`
- `tests/asset-owners-nominal-autodistribute-proportional-s449.test.js`
- `tests/asset-owners-nominal-precision-s457.test.js` *(versi final — sesi lanjutan #2 menimpa versi sesi lanjutan #1 dgn 8 test round-trip + 2 test `_touched` reset tambahan)*
- `tests/modules-calc-remaining-share-af1.test.js`
- `tests/shop-katalog-dinamis-interval-override-sk.test.js`

## Verifikasi
Seluruh 10 file kode di atas sudah dicoba diterapkan bersamaan ke atas
codebase project (`app-main`) dan dijalankan penuh:

```
node --test tests/*.test.js
# tests 4268
# pass 4268
# fail 0
```

0 regresi, 0 konflik antar sesi (AF1 dan CN1 menyentuh domain & file yang
sama sekali berbeda — Buku Aset/porsi kepemilikan vs Car Notes/interval
kendaraan — jadi aman digabung dalam 1 upload).

## Belum dilakukan (sesuai catatan tiap sesi asli)
- `scripts/build.js` belum dijalankan — bundle `app-bundle-a.min.js`/
  `app-bundle-b.min.js` & `MODULE_CALC_VERSION` belum ikut ter-update.
  Jalankan build resmi setelah file ini di-merge ke riwayat sesi utama
  project (nomor sesi resmi, sesuai catatan di `SESI-AF1-SESSION-NOTE.md`).
- `npm run lint` belum bisa dijalankan di sandbox pembuatan patch ini
  (jaringan diblokir) — jalankan di lingkungan asli sebelum merge final.
