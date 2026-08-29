# Patch — AUDIT-UIUX-VISUAL-2026-08 (Temuan 1–3) + RENCANA-MODERNISASI-UI (s635, s636)

Patch zip ini kumulatif overlay: berisi HANYA file yang diperbaiki/baru,
tidak ada bundle/version bump (jalankan `node scripts/build.js` sendiri
di environment kamu sebelum upload — esbuild tidak tersedia di
environment sandbox ini). `app_production.html` DISERTAKAN kali ini
karena disinkronkan manual persis logika build.js step 6 (supaya gate
`html-sync` di `verify-release-ready.js` tidak memblokir).

## Riwayat isi zip

### Ronde 1 — AUDIT-UIUX-VISUAL-2026-08.md, Temuan 1–3

- `styles.css` — Temuan 1: `.stat-box--warn .stat-val{margin-top:14px}`
  (badge "⚠️ Kurang/Rugi" tidak lagi menimpa angka). Temuan 3: mask-image
  gradient di `.filter-scroll` (indikator scroll horizontal).
- `modules/shop/cobek-order.js` — Temuan 2: `Produsen.renderList()`
  tampilkan maks 3 item harga + "+N produk lain" (dulu 1 paragraf
  panjang), detail penuh tetap via `openHargaModal()`.

### Ronde 2 — RENCANA-MODERNISASI-UI.md, Sesi s635 (styles.css)

Murni token CSS, 0 markup disentuh:
- Blok tema ke-11 `[data-theme="modern"]` (fondasi Minimal — flat, 1
  aksen biru `#2f6fed`, shadow tipis), pola sama persis 10 tema lama.
- Token global `--font-mono` (system stack, zero network cost).
- Aturan scoped `[data-theme="modern"] .stat-val, ... {font-family:
  var(--font-mono)}` — menang via specificity, tanpa `!important`.
- Belum didaftarkan ke pemilihan tema di UI (scope sesi berikutnya).

### Ronde 3 — RENCANA-MODERNISASI-UI.md, Sesi s636 (pilot Beranda)

**Scope:** ticker strip ringkasan di Beranda/Dashboard Hub, di-gate
KHUSUS ke `[data-theme="modern"]` — tema lama 0 dampak (elemen selalu
`display:none` di 10 tema lama, karena tema "modern" sendiri belum
terdaftar di pemilihan tema, section ini praktis tidak terlihat user
manapun untuk saat ini).

- `index.html` — tambah container `<div class="bill-stat-pills
  dashhub-ticker" id="dashHubTickerModern"></div>` tepat setelah Hero
  Card, sebelum Quick Actions. 100% reuse class `.bill-stat-pills`/
  `.bill-stat-pill` yang sudah ada (bukan komponen baru dari nol).
- `styles.css` — 2 baris gate: `.dashhub-ticker{display:none}` +
  `[data-theme="modern"] .dashhub-ticker{display:flex}`. Nilai angka di
  dalam ticker pakai class `.stat-val` yang sudah ada, otomatis kebagian
  `font-family:var(--font-mono)` lewat aturan s635 — 0 CSS numerik baru.
- `modules/dashboard-hub/dashboard-hub.js` — presenter baru
  `DashboardHubTickerModern` (+ `_dashHubTickerModernMonthTx()`), pola
  identik `DashboardHubSummary`/`DashboardHubAnalytics`: 100% reuse
  `_dashHubMonthTxShared()` yang sudah ada, 0 rumus baru. Dipanggil dari
  `DashboardHub.render()` (guard `typeof`), visibilitas 100%
  didelegasikan ke CSS (bukan percabangan tema di JS).
- `tests/dashboard-hub-ticker-modern-s636.test.js` (BARU) — 8 test:
  render tanpa container, data kosong, reuse filter bulan-berjalan yang
  sama persis dgn Summary/Analytics (termasuk exclude transaksi bulan
  lalu), class warna bersih negatif/positif, 4 label item, pemanggilan
  di pipeline `DashboardHub.render()`, gate CSS ada, posisi container di
  index.html tepat (setelah Hero, sebelum Quick Actions).
- `app_production.html` — disinkronkan dari `index.html` (+ komentar
  AUTO-GENERATED persis format build.js) karena `verify-release-ready`
  gate `html-sync` membandingkan keduanya.

## Verifikasi (kumulatif, setelah ronde 3)
- `node --check modules/shop/cobek-order.js` → OK
- `node --check modules/dashboard-hub/dashboard-hub.js` → OK
- `node --test tests/*.test.js` → **4547/4547 pass** (0 fail), termasuk
  8 test baru s636 dan gate `verify-release-ready`/`html-sync`.
- `node scripts/build.js` TIDAK dijalankan penuh (esbuild tidak
  tersedia di sini) — `app_production.html` disinkronkan manual persis
  logikanya. Tetap jalankan `node scripts/build.js` di environment kamu
  sebelum upload utk regenerasi bundle & bump versi resmi.

## File dalam ZIP ini
- `styles.css` (Temuan 1, 3, token tema s635, gate ticker s636)
- `modules/shop/cobek-order.js` (Temuan 2)
- `index.html` (container ticker s636)
- `app_production.html` (disinkronkan dari index.html)
- `modules/dashboard-hub/dashboard-hub.js` (presenter `DashboardHubTickerModern` s636)
- `tests/dashboard-hub-ticker-modern-s636.test.js` (BARU)

### Ronde 4 — Audit UI/UX slide-tab (v1425 → v1426)

**Masalah:** semua grup tab (`.cn-tab` dan varian sub-tab: `lap-subtab`,
`kel-subtab`, `pjk-subtab`, `cni-subtab`, `cnb-subtab`, `dhb-subtab`)
memakai `flex:1` tanpa `white-space:nowrap` — begitu jumlah tab banyak
(mis. Pengaturan 7 tab, "🔔 Notif&Backup"), label ikut menyempit dan
wrap 2 baris di dalam box, terlihat berantakan.

**Fix (styles.css saja, 0 markup disentuh):**
- `.cn-tabs` (wadah, dipakai semua grup tab termasuk kombinasi
  `dhb-subtabs`/`kel-subtabs`/`lap-subtabs`/`pjk-subtabs`/
  `cni-subtabs`/`cnb-subtabs`) → `overflow-x:auto; flex-wrap:nowrap;
  scroll-snap-type:x proximity;` + scrollbar disembunyikan + mask-fade
  gradient di tepi kanan (pola sama persis `.filter-scroll`, indikator
  visual "bisa digeser").
- Semua tombol tab (`.cn-tab` + 6 varian sub-tab) → `flex:1 1
  auto` diganti `flex:0 0 auto; white-space:nowrap; scroll-snap-align:
  start;` — label selalu utuh 1 baris, kelebihan lebar digeser
  (slide), bukan disempitkan/wrap.
- `scripts/bump-version.sh` dijalankan → `?v=1425` → `?v=1426` di
  kedua HTML + `sw.js` CACHE_NAME (cache-bust, hasil CSS baru pasti
  ke-load).

**Cakupan:** berlaku otomatis di semua halaman pemakai `.cn-tabs`
(Beranda/Dashboard Hub, Uang›Kelola, Uang›Laporan, Pajak, Mobil›Insight
AI, Mobil›BBM, Pengaturan) — tidak perlu sentuh tiap page satu-satu
karena semua share class yang sama.

**Tidak diubah:** `.budget-tabbar`/`.budget-tab-btn` (hanya 2 tab,
`u-flex1`, tidak berisiko overflow) dan sistem collapse card
(`.card-collapse-body`, dipakai luas mis. Dashboard Hub, Budget) —
sudah ada dan tidak perlu perubahan.

Test terkait (`s335-bug011-gotolist-tab-active-index.test.js`, murni
query index tombol `.cn-tab`) tetap pass — perubahan hanya CSS.

### Ronde 5 — Breadcrumb konsistensi Insight AI & BBM (v1426 → v1427)

Setelah audit tambahan menyeluruh: modal accessibility (role="dialog",
aria-modal, focus-trap, Esc-to-close) TERNYATA sudah lengkap di
SEMUA 118 modal (dicek langsung ke `modules/shared/modals.js`
MODAL_HTML[] — grep awal ke `app_production.html` menyesatkan karena
modal-modal itu di-inject runtime lewat `document.write()`, bukan
statis di file HTML). Tidak ada perubahan diperlukan di sana.

Yang benar-benar masih kurang konsisten: breadcrumb "page › subtab"
(`.page-breadcrumb`, sudah ada di Kelola/Laporan/Pajak) belum
dipasang di 2 grup sub-tab sedalam itu juga:
- Mobil › 🧠 Insight AI (Ringkasan / Rekomendasi & Tren)
- Mobil › ⛽ BBM (Ringkasan / Analisis Lanjutan)

**Fix:**
- `index.html` + `app_production.html` — tambah
  `<div class="page-breadcrumb">...</div>` persis di bawah
  `.cni-subtabs` dan `.cnb-subtabs`, id `cniBreadcrumbSub` /
  `cnbBreadcrumbSub` — markup identik pola Kelola/Laporan/Pajak.
- `modules/vehicle/vehicle-core.js` — `setCnInsightTab()` &
  `setCnBbmTab()` update `textContent` breadcrumb, pola SAMA PERSIS
  `setKelolaTab()`/`setLaporanTab()` (tx-list-cashflow.js). 0 logic
  baru, cuma label teks.
- Rebuild bundle (`node scripts/build.js`) → v1426 → v1427. esbuild
  belum terpasang di sandbox ini jadi bundle belum diminify (ukuran
  lebih besar, tapi valid — `node --check` lolos).
- Full test suite: **4857/4857 pass**, 0 fail.

### Ronde 6 — Audit lanjutan "scan menyeluruh" (temuan 2/3/5/6, v1427 → v1428)

**PENTING — koreksi hasil scan sebelumnya:** scan yang menghasilkan 4
temuan (skeleton loading, toast, pagination, collapse persistence) rupanya
HANYA menyisir isi `KW-PATCH-audit-uiux-slide-tab-v1427.zip` (8 file patch
kumulatif), bukan seluruh aplikasi (`app-main` ~1390 file). Setelah audit
ulang atas kode LENGKAP (overlay patch di atas `app-main`), 3 dari 4 temuan
ternyata sudah py mekanisme luas, dan sudah bekerja:

- **Toast/notifikasi (temuan 3):** `toast()`/`toastUndo()`
  (`modules/shared/format-tema.js`) dipakai **856×** di seluruh app. Hanya
  1 `alert()` browser tersisa — fallback defensif di `showAlertModal()`
  (`modal-navigasi.js`) kalau `#infoModalOverlay` belum ada di DOM (kasus
  ekstrem, modal selalu ter-inject di app nyata) — SENGAJA tidak diubah,
  karena mengganti ke toast() di titik itu justru bikin pesan penting bisa
  gagal-diam kalau modal belum siap.
- **Pagination list panjang (temuan 5):** SUDAH ADA di 2 tempat utama —
  tab Uang list transaksi (`#allTx`/`allTxLoadMoreWrap`, `TX_PAGE_SIZE`,
  `modules-render-b.js`) dan modal Riwayat/`showFilteredTx`
  (`ftxMoreWrap`, `FTX_PAGE_SIZE`, `filter-laporan.js`) — keduanya pola
  "⬇️ Tampilkan lebih banyak (N lagi)".
- **Loading indicator scan OCR (bagian temuan 2):** setiap titik scan
  (struk, bukti transfer, odometer, dll — `scan-ocr.js`) sudah menampilkan
  toast "🔍 Memindai gambar, mohon tunggu..." begitu scan mulai.

**Temuan nyata yang DIPERBAIKI sesi ini (additive, 0 regresi):**

- `modules/dashboard-hub/dashboard-hub.js` — kartu "Lihat semua kategori"
  (Ringkasan Kepemilikan, `dashHubOwnershipZero`) pakai
  `card-collapse-toggle`/`toggleCardCollapse()` (mekanisme localStorage
  `cardCollapsePrefs` yang sama dipakai ~40+ kartu lain) tapi TIDAK
  pernah memanggil `applyOneCardCollapsePref()` setelah render — state
  buka/tutup user tidak diingat lintas render/reload. Fix: tambah 1
  panggilan guard-typeof di akhir `render()`.
- `modules/shared/modules-render-b.js` — kartu "📋 Spesifikasi Pabrik"
  (`vehSpecCard`, tab Mobil) py bug yang sama persis: toggle collapse ada,
  panggilan `applyOneCardCollapsePref('vehSpecCard')` kelewat. Fix sama.

Kedua fix ini murni menambah 1 baris (guard `typeof`) di titik yang tepat
— 0 mekanisme baru, reuse penuh `applyOneCardCollapsePref()`/
`toggleCardCollapse()`/`cardCollapsePrefs` yang sudah ada sejak Sesi 156b.

**Belum dikerjakan (butuh keputusan/scope terpisah, bukan salah scan):**
tombol scan (OCR/backup/sync) belum py state disabled+spinner PERSISTEN
selama proses berjalan (toast "mohon tunggu" saat ini transient 6 detik,
tombol masih bisa di-tap ulang) — kalau user mau, ini scope kerja
terpisah (per titik scan, bukan 1 komponen generik yang bisa ditempel
tanpa audit lebih lanjut ke tiap pemanggil).

Verifikasi: `node --test tests/*.test.js` → **4857/4857 pass** (0 fail,
tidak ada test baru diperlukan — pure guard tambahan, tidak ada logic
baru). `scripts/bump-version.sh` → v1427 → v1428.

## File dalam ZIP ini (kumulatif, Ronde 1–6)
- `styles.css`, `modules/shop/cobek-order.js`, `modules/dashboard-hub/dashboard-hub.js`,
  `modules/vehicle/vehicle-core.js`, `modules/shared/modules-render-b.js` — semua Ronde 1–6
- `index.html`, `app_production.html`, `sw.js`, `app-bundle-a.min.js`, `app-bundle-b.min.js` — v1428

### Ronde 7 — Tombol scan/backup: disabled+spinner PERSISTEN selama proses (v1429 → v1431)

Menyelesaikan item "Belum dikerjakan" dari Ronde 6: tombol scan (OCR) & tombol
Backup dulu cuma dapat toast "mohon tunggu" yang TRANSIENT (hilang otomatis
setelah 6 detik) tanpa disable — di koneksi lambat (OCR/upload bisa
10-20+ detik) tombol masih bisa di-tap ulang berkali-kali selama itu.

**Fix (per titik pemanggil, sesuai catatan scope sebelumnya — bukan 1
komponen generik yang ditempel global):**

- `modules/shared/scan-ocr.js` — helper baru `_scanBtnCapture()` /
  `_scanBtnBusy()` / `_scanBtnIdle()`. Tombol pemicu ditangkap lewat
  `document.activeElement` PAS fungsi `scan*()` dipanggil (selalu tombol yang
  barusan di-klik, krn semua dipanggil `onclick="scanXxx(...)"` inline) — jadi
  tidak perlu ubah markup HTML pemanggil satu-satu. Busy state baru dipasang
  SETELAH file dipilih (bukan saat dialog file baru dibuka), supaya tombol
  tidak nyangkut disabled kalau dialog di-Cancel. Dipasang ke 7 titik:
  `scanReceipt`, `scanBuktiTransfer`, `scanTanggalDariFoto`, `scanKmOdometer`,
  `scanAssetPortfolio`, `quickScanAsset`, `scanReceiptBelanja` — semua lewat
  `try/catch/finally` (restore state jalan di jalur sukses MAUPUN gagal).
- `modules/shared/scan-ocr-b.js` — `BillMultiScan.scan()` (sudah ada di
  scan-ocr.js, 1 file) & `UniversalScan.scan()` dipasangi pola sama.
- `modules/shared/backup-restore.js` — `runFullBackup()` (tombol
  `#backupBadge`) dulu cuma swap `textContent` jadi "⏳ Backup..." TANPA
  disable (double-tap sebenarnya sudah ditangkap `_saveGuards['fullBackup']`,
  tapi user tidak dapat sinyal visual disabled). Reuse
  `_scanBtnBusy`/`_scanBtnIdle` (scan-ocr.js dimuat lebih dulu di urutan
  build) — hasil akhir teks tombol (💾/⚠️ Backup) tetap ditentukan status
  backup seperti sebelumnya, cuma dipasangi lewat `_scanBtnIdle()` dulu.
- `modules/shared/features-helpers-global-security.js` — `#backupBadge` itu
  `<div data-action="runFullBackup">`, BUKAN `<button>`, jadi `.disabled`
  tidak berefek apa2 ke klik div. Tambah 1 guard di
  `_dataActionClickHandler()`: kalau `el.dataset.scanBusy==='1'`, klik
  diabaikan — jadi busy state beneran mencegah dispatch ulang utk elemen
  non-`<button>` juga, bukan cuma efek visual. (Cek lewat `dataset` saja,
  bukan `.disabled`/`.getAttribute`, supaya sinkron dgn kontrak elemen yang
  dites `tests/data-action-dispatcher-toast.test.js`.)
- `styles.css` — 1 class visual baru `.btn-spinner` (lingkaran kecil muter,
  `currentColor` jadi otomatis ikut warna tombol apa pun) + aturan
  `cursor:progress` saat `aria-busy="true"`. Disuntik ke `innerHTML` tombol
  oleh `_scanBtnBusy()`, bukan style per-tombol.

**Verifikasi:** `node scripts/build.js` → v1429 → v1431 (versi naik 2x krn
sempat rebuild ulang stlh 1 fix test). `node --test tests/*.test.js` →
**4857/4857 pass** (0 fail) — termasuk `tests/data-action-dispatcher-toast.test.js`
yang sempat gagal 5x di percobaan pertama (guard awal salah pakai
`el.getAttribute`/`el.disabled`, elemen tiruan di test cuma py `dataset` —
diperbaiki jadi cek `dataset` saja). `node scripts/verify-window-expose.js`
→ OK. `node scripts/verify-release-ready.js` → lolos (gate `lint`/`minify`
di-override manual, sandbox tanpa akses jaringan — eslint/esbuild tidak
bisa diinstall; sama seperti Ronde 1-6, bundle unminified tapi 100% valid).

**Catatan lingkup:** zip ini juga menyatukan ulang SEMUA file perbaikan dari
2 zip sebelumnya (`v1427`: `styles.css`, `modules/vehicle/vehicle-core.js`;
`v1429`: `modules/shared/modules-render-b.js`,
`modules/dashboard-hub/dashboard-hub.js`, `index.html`,
`app_production.html`, `sw.js`, kedua bundle) — supaya upload zip ini SAJA
sudah kumulatif penuh, tidak perlu susun manual dari 2 file lagi.

## File dalam ZIP ini (kumulatif penuh s/d Ronde 7)
- `styles.css`, `modules/vehicle/vehicle-core.js` — Ronde 1–4
- `modules/shared/modules-render-b.js`, `modules/dashboard-hub/dashboard-hub.js` — Ronde 6
- `modules/shared/scan-ocr.js`, `modules/shared/scan-ocr-b.js`,
  `modules/shared/backup-restore.js`,
  `modules/shared/features-helpers-global-security.js` — Ronde 7 (BARU)
- `index.html`, `app_production.html`, `sw.js`, `app-bundle-a.min.js`, `app-bundle-b.min.js` — v1431

### Ronde 8 — Tombol Import/Restore JSON: disabled+spinner persisten (v1431 → v1432)

Follow-up dari saran Ronde 7 ("tombol Import/Restore data juga async, pola
sama"): `importData(e)` (label "📥 Import / Restore (JSON)" di
Pengaturan → Backup & Restore) belum py state busy sama sekali, padahal
`applyRestoredData()` bisa beberapa detik (tulis IndexedDB LifeOS/EIE/
Vehicle Catalog/Honda PDF, migrasi data, `saveFlush()+init()`).

**Fix:** beda dari tombol scan/backup (elemen pemicu `<button>`/`<div
data-action>`), trigger visual di sini adalah `<label for="restoreFileInput">`
yang menaungi `<input type="file">` tersembunyi. Reuse
`_scanBtnBusy`/`_scanBtnIdle` (scan-ocr.js) lewat `inputEl.labels[0]`
(`HTMLInputElement.labels`) — plus `inputEl.disabled=true` selama proses:
klik label yang menaungi input file DISABLED itu no-op native browser (tidak
buka dialog lagi), jadi tidak perlu guard tambahan spt dispatcher
data-action. Restore ke idle di titik manapun proses berhenti (JSON invalid,
sukses, maupun gagal) lewat `finally`.

**Scope sengaja belum menyentuh** `handleImport()`/`importCarData()` (import
CSV Cashew/Money Manager/Spendee, Car Notes) — beda karakteristik (ada jeda
`askConfirm()` di tengah proses, feedback lewat `#importResult` inline bukan
toast/modal), belum diminta.

Verifikasi: `node --test tests/*.test.js` → **4857/4857 pass** (0 fail).
`node scripts/build.js` → v1431 → v1432. Gate lint/minify di-override sama
seperti ronde sebelumnya (sandbox tanpa akses jaringan).

## File dalam ZIP ini (kumulatif penuh s/d Ronde 8)
- `styles.css`, `modules/vehicle/vehicle-core.js` — Ronde 1–4
- `modules/shared/modules-render-b.js`, `modules/dashboard-hub/dashboard-hub.js` — Ronde 6
- `modules/shared/scan-ocr.js`, `modules/shared/scan-ocr-b.js`,
  `modules/shared/features-helpers-global-security.js` — Ronde 7
- `modules/shared/backup-restore.js` — Ronde 7 + Ronde 8 (BARU)
- `index.html`, `app_production.html`, `sw.js`, `app-bundle-a.min.js`, `app-bundle-b.min.js` — v1432
