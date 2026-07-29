# Ringkasan Penggabungan — 26 Juli 2026

Dokumen ini mencatat bagaimana 6 paket rilis terpisah dari aplikasi **Keluarga W**
(dikirim sebagai 6 file `.zip` berbeda) digabungkan jadi **1 codebase final** yang
konsisten dan lolos build + test suite.

## Kenapa perlu digabung manual (bukan tinggal timpa file terbaru)

Ke-6 paket ini bukan versi linear (v1 → v2 → v3) dari 1 hal yang sama, melainkan
**2 jalur pengembangan paralel** dari codebase yang sama:

| Jalur | Paket | Isi |
|---|---|---|
| **Mainline** (banyak sesi bug-fix berurutan: S249, S252–S269) | `kw_release_s269_finance-engine-validation.zip` | Snapshot PALING LENGKAP & PALING BANYAK FIX — termasuk **S264 Security Hardening** (migrasi semua `data-onclick` inline jadi `data-action` dispatcher, CSP diperketat) dan **S268 Net Worth SSOT bug-fix** (rumus Kekayaan Bersih yang dulu beda-beda angka antar panel, sekarang 1 sumber kebenaran) |
| **Cabang fitur A — Business Intelligence** | `kw_sesi250_business-intelligence-tab.zip` → `..._sesi251_..._extension.zip` → `..._sesi252_..._drilldown.zip` | Menambahkan tab "🧠 Business Intelligence" baru di Shop (pindahan 3 widget dari Beranda + drilldown detail). **Cabang ini di-branch SEBELUM sesi S264/S268 selesai**, jadi kalau ditimpa langsung akan MENGHILANGKAN fix keamanan & fix Net Worth dari mainline. |
| **Cabang fitur B — PDF Import Harga Opsional** | `..._v751_fixed.zip` → `..._v752_stitch-multiline.zip` | Perbaikan parser import katalog PDF (baris kode part yang "yatim" akibat page-break PDF, sampai kasus 3-baris terpisah) |

Bukti konkret: file `modules/shared/modules-calc.js` di paket `sesi250` punya mtime
LEBIH BARU dari `s269`, tapi isinya **tidak** punya fix S268 — kalau saya asal pakai
"file terbaru menang", bug Net Worth yang sudah diperbaiki akan **muncul lagi**.
Ada 46 file dengan pola serupa (divergensi cabang BI vs mainline).

## Strategi penggabungan

1. **Base** = `s269` (finance-engine-validation) — mainline paling matang, 469 file.
2. **Tempel murni-tambahan** dari cabang PDF Import: `modules/vehicle/vehicle-catalog-import.js`
   + test-nya diambil utuh dari `v752` (perubahan v751→v752 sudah terbukti murni
   tambahan lookahead 3-baris, tidak menghapus apa pun dari base).
3. **Tempel murni-tambahan** dari cabang Business Intelligence (sesi252, versi terakhir):
   - File baru: `modules/shop/business-intelligence-presenter.js` + test-nya
   - Diff manual (bukan timpa file) untuk 6 file yang disentuh KEDUA cabang:
     `modules/shared/modules-render.js`, `modules/dashboard-hub/dashboard-hub.js`,
     `modules/shop/cobek-io.js`, `scripts/build.js`, `styles.css`, `index.html`
     (+ cermin `app_production.html`) — setiap potongan BI ditambahkan tanpa
     menghapus baris S264/S268 dari base.
4. **Rebuild resmi**: `node scripts/build.js` (regenerasi `app-bundle-a/b.min.js`,
   sinkronisasi versi `?v=`, `FILE-MAP.md`) — lolos cek sintaks.
5. **Test suite**: `node --test tests/*.test.js` → **1359/1361 lolos**.

## 2 test yang sempat gagal (sudah diperbaiki)

```
tests/business-intelligence-presenter.test.js
  - _drillContent("trend",7) — daftar harian ...
  - _drillContent("exec","bulan") — 100% reuse executiveSummary()...
```

Sudah diverifikasi: kedua test ini **gagal juga di kombinasi asli** (paket
`sesi250` + patch `sesi252` saja, tanpa base `s269` sama sekali) — jadi ini bug
bawaan di fitur drilldown sesi252 itu sendiri, bukan hasil penggabungan.

**Sudah diperbaiki** (26 Juli 2026, di `modules/shop/business-intelligence-presenter.js`):

1. `_drillTrend()` — baris total ("Total 7 hari terakhir: ...") dulu tidak
   ikut kehitung sebagai baris "N trip" karena tag `<b>` membungkus "N trip"
   jadi satu (`<b>2 trip</b> ·`), beda pola dari baris-baris harian di
   bawahnya yang polos (`1 trip · ...`). Diseragamkan jadi plain text
   (tidak di-bold) supaya format baris total konsisten dgn baris harian.
2. `_drillExec()` — utk period `'bulan'`, field `trip` datanya dari
   `businessKPI().tripBulanIni` yang artinya **jumlah trip pengiriman**
   (beda makna dgn hari/minggu/tahun yang field `trip`-nya = jumlah
   **transaksi**, dari `ProfitEngine.summarize()`). Akibatnya kalau bulan
   ini ada omzet/untung penjualan tapi 0 trip pengiriman, kode salah
   menyimpulkan "belum ada transaksi". Cek presence data sekarang ikut
   melihat `omzet`/`untung`, tidak cuma `trip`.

Setelah fix ini, test suite penuh: **1361/1361 lolos**.


## File yang TIDAK dipakai dari paket lama (superseded)

- Semua `app-bundle-a.min.js` / `app-bundle-b.min.js` / `index.html` /
  `app_production.html` / `sw.js` dari 5 paket selain hasil akhir ini — sudah
  digantikan oleh hasil `node scripts/build.js` di atas.
- `docs/FILE-MAP.md` versi lama — sudah digenerasi ulang otomatis oleh build.

## Catatan build

Bundle di file final ini **belum di-minify** (esbuild tidak tersedia di
environment penggabungan ini, jaringan luar dimatikan). Kalau mau ukuran
sekecil versi produksi lama, jalankan sekali di environment yang ada internet:

```
npm install --save-dev esbuild
node scripts/build.js
```
