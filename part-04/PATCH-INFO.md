# Patch: repo-main (GitHub) → kw_release_v1165_s446-diagnostic-longpress-gauge

## Ringkasan Audit

Repo GitHub (`repo-main.zip`) dibandingkan langsung terhadap release
`kw_release_v1165_s446-diagnostic-longpress-gauge.zip`. Hasilnya: **repo
GitHub jauh tertinggal** dari release — repo berhenti kira-kira di sekitar
sesi s404 (`v1108-v1111`), sedangkan release sudah di sesi **s446** (build
`v1165`). Release adalah versi terbaru/otoritatif.

- Total file di release: 838
- Total file di repo: 714
- File sama persis: 629
- **File berubah (modified)**: 78
- **File baru di release, belum ada di repo (added)**: 127
  (di luar folder `backups/` — snapshot bundle historis, tidak perlu
  ikut di-patch)
- **File yang HANYA ada di repo (stale/tidak dipakai di release ini)**: 7
  — lihat bagian "Tidak disertakan" di bawah, ini bukan bagian dari patch,
  tapi perlu diketahui saat audit.

## Isi patch ini

Folder/zip ini HANYA berisi file yang baru ditambahkan atau berubah isinya
dibanding repo saat ini, lengkap dengan struktur foldernya (self-contained,
sama seperti pola `PATCH-INFO.md` versi sebelumnya di repo). Tidak ada file
lama yang otomatis terhapus — lihat catatan penghapusan manual di bawah.

- File baru (added): 127
- File berubah (modified): 78
- **Total: 205 file**

Tinggal extract dan overwrite/tambahkan ke folder `repo-main` yang sudah ada.

### Sorotan perubahan penting (modified)
- `index.html`, `app_production.html`, `app-bundle-a.min.js`,
  `app-bundle-b.min.js` — hasil rebuild terbaru (versi bundle naik ke
  v1165, mengikuti seluruh perubahan sesi s375–s446).
- `modules/shared/modals.js`, `modules-render.js`, `modules-calc.js`,
  `features-helpers-global-security.js` — versi terbaru (constant versi +
  banyak perbaikan modal/UI, termasuk perubahan terakhir
  `s446-diagnostic-longpress-gauge`).
- `modules/asset/asset-ownership-split-presenter.js` — file BARU
  (fitur pemisahan porsi kepemilikan aset multi-owner).
- `modules/vehicle/fuel-state-history.js` — file BARU (riwayat estimasi
  BBM, bagian dari rangkaian fitur `fuel-state-*` s412–s421).
- `scripts/verify-release-ready.js`, `scripts/verify-window-expose.js` —
  script gate rilis baru (s423–s425).
- Puluhan file `FIX-v*.md` (s375 s/d s446) — dokumentasi histori
  perbaikan tiap sesi yang belum tercatat di repo.
- Puluhan file `tests/*.test.js` baru — regression test untuk fitur-fitur
  yang ditambahkan sesudah baseline repo saat ini (multi-owner, fuel
  estimation, asset owners, tx-renov, data-health-check, dll).

Daftar lengkap ada di `CHANGED-FILES.txt` (78 file) dan `ADDED-FILES.txt`
(127 file) yang disertakan di root patch ini.

## Tidak disertakan dalam patch (perlu tindakan manual)

7 file berikut ADA di repo GitHub tapi TIDAK ADA di release v1165 s446 —
kemungkinan besar sisa file usang/duplikat yang sudah tidak relevan.
Patch ini **tidak menghapusnya secara otomatis**; disarankan dihapus manual
setelah patch di-apply, setelah dicek ulang tidak ada referensi lain yang
memakainya:

- `PATCH-INFO.md` (lama, dari sesi jauh lebih awal — v1039→v1067;
  digantikan oleh file `PATCH-INFO.md` ini)
- `FIX-v1108-to-v1111-s404-lint-overlay-open-reflow-guard.md` — sudah
  diarsipkan/dibersihkan di release (lihat `docs/STALE-DOC-SCHEDULE.md` di
  release, ada mekanisme pembersihan dokumen FIX lama secara berkala)
- `modules/shop/features-helpers-global-security.js` — **DUPLIKAT USANG**.
  Versi yang benar & terbaru ada di `modules/shared/features-helpers-global-security.js`
  (sudah termasuk di patch ini). Isi versi `modules/shop/` masih memakai
  `MODAL_VERSION='s404-...'`, jauh tertinggal.
- `modules/shop/modals.js` — **DUPLIKAT USANG**, sama seperti di atas;
  versi benar di `modules/shared/modals.js`.
- `modules/shop/modules-calc.js` — **DUPLIKAT USANG**; versi benar di
  `modules/shared/modules-calc.js`.
- `modules/shop/modules-render.js` — **DUPLIKAT USANG**; versi benar di
  `modules/shared/modules-render.js`.
- `modules/shop/multi-owner-engine.js` — **DUPLIKAT**, isinya kebetulan
  identik dengan `modules/shared/multi-owner-engine.js` (tidak ada
  perbedaan konten), tapi tetap file berlebih karena kode aplikasi
  seharusnya hanya mereferensikan folder `modules/shared/`.

> ⚠️ Cek dulu di build/bundler config (`scripts/build.js` di release) folder
> mana yang benar-benar di-load ke bundle sebelum menghapus, supaya tidak
> menghapus file yang ternyata masih direferensikan oleh path lama.

## Cara pasang

1. Extract isi zip ini ke root folder `repo-main` (overwrite file yang
   sudah ada, tambahkan file yang belum ada).
2. (Opsional, disarankan) Hapus 7 file "Tidak disertakan" di atas setelah
   dikonfirmasi tidak dipakai.
3. Jalankan `node scripts/build.js` bila ingin rebuild ulang bundle dari
   source (opsional — bundle hasil release v1165 sudah disertakan langsung
   di `app-bundle-a.min.js` / `app-bundle-b.min.js` / `index.html`).
4. Jalankan test suite (`npm test` atau setara) untuk verifikasi.

## Sumber

- Baseline lama : `repo-main.zip` (GitHub, tidak diketahui versi persis,
  konten setara ~s404/v1108-v1111)
- Baseline baru : `kw_release_v1165_s446-diagnostic-longpress-gauge.zip`
  (v1165, sesi s446 — "diagnostic longpress gauge")
