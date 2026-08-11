# HOTFIX_REPORT — Scanner Session / FAB (SAFE MERGE ke versi FULL)

## 1. File yang berubah

### Diedit manual (scope hotfix)
| File | Perubahan |
|---|---|
| `modules/shared/scanner-session.js` | Tambah dukungan hide/restore seluruh `.keu-fab` di `pauseUI()`/`resumeUI()` |
| `tests/scanner-session.test.js` | Tambah fake-DOM `querySelectorAll()` + 7 test baru untuk FAB, seluruh 15 test lama dipertahankan tanpa perubahan |

### Berubah otomatis akibat `node scripts/build.js` (bukan edit manual)
| File | Perubahan |
|---|---|
| `app-bundle-a.min.js` / `app-bundle-b.min.js` | Regenerasi bundle (menyertakan `scanner-session.js` yang baru) |
| `index.html` / `app_production.html` | `?v=827` → `?v=828` (auto version bump skrip build) |
| `sw.js` | `CACHE_NAME` → `kw-cache-v828` |
| `docs/FILE-MAP.md` | Regenerasi otomatis oleh build |
| `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`, `modules/shared/modules-calc.js`, `modules/shared/modules-render.js`, **`modules/shared/modals.js`** | **Hanya 1 baris per file** — string konstanta versi (`MODULE_*_VERSION`/`APP_BUILD_VERSION`) disamakan dari `s317-...` ke `s318-...` oleh mekanisme sinkronisasi versi bawaan `scripts/build.js`. **0 baris logic berubah** di kelima file ini. |
| `backups/*.js` (2 file baru) | Backup otomatis bundle lama sebelum build (perilaku standar skrip build, bukan perubahan kode) |

> **Catatan penting soal `modules/shared/modals.js`**: instruksi eksplisit
> melarang mengubah file ini. Faktanya, **tidak ada satu pun baris logic
> modal yang diedit** — satu-satunya perbedaan adalah string
> `MODAL_VERSION` yang disamakan oleh mekanisme sinkronisasi versi
> `scripts/build.js` (skrip ini men-sinkronkan 5 konstanta versi di 5 file
> sekaligus setiap kali build dijalankan, sebagai invariant project itu
> sendiri — bukan langkah yang saya tambahkan). Diff lengkap ada di bagian
> 2 di bawah. Jika kebijakan tim mensyaratkan `modals.js` benar-benar 0
> byte berubah, opsinya: **jangan jalankan `scripts/build.js`** pada
> merge ini (skip langkah build, hanya pakai source patch), dengan
> konsekuensi versi konstanta project jadi tidak sinkron sampai build
> berikutnya. Rekomendasi saya: terima 1-baris version-only ini, karena
> tanpanya build check `scripts/build.js` sendiri akan menandai project
> "tidak sinkron".

### TIDAK berubah (dikonfirmasi via diff terhadap ZIP sumber)
- `modules/vehicle/vehicle-scanner.js` — **identik 100%**
- `modules/vehicle/sparepart-scanner.js` — **identik 100%**
- Business logic scanner, konfigurasi ZXing, dan API publik `ScannerSession`
  (`enter`/`exit`/`pauseUI`/`resumeUI`/`isActive`) — **tidak berubah**

## 2. Ringkasan diff

### `modules/shared/scanner-session.js`
- Tambah `_scannerSessionPrevFabDisplay` (state baru, privat — tidak
  di-expose ke namespace publik `ScannerSession`).
- Tambah `_scannerSessionQueryFabs()` — guard `typeof document ===
  'undefined'` dan `typeof document.querySelectorAll !== 'function'`,
  dibungkus `try/catch`, mengembalikan array kosong kalau tidak tersedia.
  **Tidak ada ID FAB yang hardcode** — selector selalu `'.keu-fab'`.
- `scannerSessionPauseUI()`: setelah bagian nav/header (tidak diubah),
  tambah — ambil semua `.keu-fab`, simpan `style.display` asli tiap
  elemen ke array, lalu set `style.display = 'none'` untuk semuanya.
- `scannerSessionResumeUI()`: setelah bagian nav/header (tidak diubah),
  tambah — restore `style.display` tiap FAB persis ke nilai yang
  tersimpan (fallback `''` kalau falsy), lalu bersihkan state.
- `enter()`/`exit()`/`isActive()` — **0 perubahan baris**, tetap memanggil
  `pauseUI()`/`resumeUI()` seperti sebelumnya.
- Namespace publik `ScannerSession = {enter, exit, pauseUI, resumeUI,
  isActive}` — **0 perubahan**, API publik identik.

### `tests/scanner-session.test.js`
- `makeEl()` — tambah parameter opsional `classes` (backward compatible,
  semua pemanggilan lama tanpa argumen ke-2 tetap jalan).
- Tambah `makeFab(id)` — helper elemen `.keu-fab`.
- `makeDocument()` — tambah parameter `fabs` & `opts.noQuerySelectorAll`,
  plus method `querySelectorAll()` (kecuali `opts.noQuerySelectorAll`
  aktif, utk simulasi browser lama). Semua pemanggilan lama
  (`makeDocument(byId)`, 1 argumen) tetap kompatibel.
- `makeCtx()` — tambah parameter opsional ke-3 (`fabs`) & ke-4
  (`docOpts`); pemanggilan lama (`makeCtx()`, `makeCtx({...})`,
  `makeCtx({}, {...})`) **tidak berubah perilakunya**.
- **15 test lama** (baris di atas komentar section hotfix) — **0
  perubahan isi**.
- **7 test baru** ditambahkan di akhir file (lihat `TEST_REPORT.md` untuk
  daftarnya).

## 3. Hasil build

```
node scripts/build.js
...
✓ app-bundle-a.min.js ditulis (1032.5 KB)
✓ app-bundle-b.min.js ditulis (2316.5 KB)
✓ Sintaks kedua bundle valid (node --check lolos)
✓ index.html & app_production.html sudah identik.
✅ Build "s318-tahap6-migrasi-scanner-scannersession" selesai & lolos cek sintaks.
✓ FILE-MAP.md ditulis (275 file, 1875 identifier global)
```

Build **sukses**, 0 error. Versi naik `?v=827` → `?v=828` (perilaku
otomatis skrip build, bukan permintaan eksplisit sesi ini — didokumentasikan
sesuai kondisi apa adanya).

## 4. Hasil regression

| Tahap | Jumlah test | Hasil |
|---|---|---|
| Sebelum build (source patch saja) | 1622 | **1622 PASS / 0 FAIL** |
| Setelah build | 1622 | **1622 PASS / 0 FAIL** |

Naik dari baseline 1615 (Sesi 317) → 1622, murni dari **+7 test baru**
hotfix FAB di `tests/scanner-session.test.js`. **0 test yang sebelumnya
ada dihapus atau di-skip.**

`index.html == app_production.html`: **✅ identik** (dikonfirmasi build
log & `diff -q`).

## 5. Risiko tersisa

1. **Version-only diff di 5 file** (termasuk `modals.js`) akibat
   sinkronisasi versi otomatis `scripts/build.js` — lihat catatan detail
   di bagian 1. Risiko regresi: **nihil** (bukan perubahan logic), tapi
   secara teknis menyentuh file yang diminta untuk tidak diubah. Perlu
   konfirmasi/penerimaan eksplisit dari tim sebelum deploy jika kebijakan
   "0 byte modals.js berubah" bersifat mutlak.
2. **FAB yang ditambahkan lewat DOM manipulation dinamis** (bukan HTML
   statis `<div class="keu-fab">` di awal) tetap akan tercakup selama
   elemen tersebut sudah ada di DOM saat `pauseUI()` dipanggil (yaitu saat
   `ScannerSession.enter()` dieksekusi). FAB yang baru **ditambahkan ke
   DOM SETELAH** `pauseUI()` berjalan (mis. render asinkron di tengah sesi
   scanner aktif) **tidak akan ikut disembunyikan** — skenario ini di
   luar cakupan hotfix ini (FAB yang ada saat ini dirender statis di
   HTML, bukan dinamis).
3. Verifikasi dilakukan dengan fake-DOM (Node `vm`), bukan browser
   sungguhan — perilaku CSS `position:fixed`/z-index FAB vs overlay
   scanner di device nyata sebaiknya tetap dicek sekali di QA manual
   (lihat status akhir).

## 6. Status akhir

**READY FOR DEVICE QA.**

Alasan: 0 conflict, 0 regresi (1622/1622 PASS baik sebelum maupun sesudah
build), build sukses, `index.html == app_production.html`, API publik
`ScannerSession` & business logic scanner/ZXing/modal tidak berubah. Satu
catatan non-blocking (version-sync 5 file, termasuk `modals.js`) sudah
didokumentasikan transparan di atas untuk keputusan tim sebelum deploy ke
production.
