#!/usr/bin/env node
/**
 * build.js — Build otomatis untuk Keluarga W
 * =============================================================
 * Jalankan skrip ini SETIAP KALI selesai edit file .js sumber
 * (modules-*.js / modals.js), SEBELUM upload ke hosting.
 *
 * Yang dikerjakan otomatis (satu perintah, satu sumber kebenaran):
 *   1. Naikkan APP_BUILD_VERSION & samakan ke SEMUA file source
 *      sekaligus (modules-render.js, modals.js, modules-calc.js,
 *      features-budget-laporan-carnotes-pelanggan.js, features-helpers-global-security.js, dst) — tidak
 *      akan ada lagi versi yang "ketinggalan" di satu file.
 *   2. Gabungkan (bundle) source ke app-bundle-a.min.js &
 *      app-bundle-b.min.js — INI FILE YANG BENERAN DIPAKAI APP,
 *      jadi tidak perlu lagi edit manual dua kali (source + bundle).
 *   3. Naikkan ?v=N di index.html/app_production.html & CACHE_NAME
 *      di sw.js (lewat bump-version.sh yang sudah ada).
 *   4. Cek sintaks kedua bundle hasil build (node --check). Kalau
 *      ada error, build DIHENTIKAN — tidak akan menghasilkan bundle
 *      yang rusak.
 *   5. Lint otomatis untuk bug class "u-dnone (!important) vs
 *      style.display" — dulu ini pernah bikin card Kebebasan
 *      Finansial (dan 26 elemen lain) judulnya tampil tapi isinya
 *      permanen kosong. Build akan DIHENTIKAN kalau ketemu elemen
 *      yang: (a) disembunyikan lewat class "u-dnone" di HTML awal,
 *      DAN (b) ditampilkan di JS cuma lewat `el.style.display=...`
 *      TANPA `el.classList.remove('u-dnone')`/`toggle` di dekatnya.
 *      Lihat fungsi lintDnoneStyleDisplayMismatch() di bawah.
 *   6. app_production.html SELALU ditulis ulang jadi salinan persis
 *      index.html di akhir build — jadi dua file itu tidak akan
 *      pernah lagi diam-diam berbeda isi (dulu ini pure manual,
 *      gampang kelupaan salah satu).
 *   7. Lint otomatis untuk regresi bug "chicken-egg" OCR: pengecekan
 *      `if(typeof Tesseract==='undefined')` sbg guard dini SEBELUM
 *      ocrRecognize()/getOcrWorker() sempat jalan. Tesseract baru
 *      terdaftar sbg global DI DALAM ensureTesseract() (dipanggil dari
 *      getOcrWorker()), jadi guard dini itu selalu true di scan
 *      pertama & OCR tidak akan pernah bisa jalan sama sekali. Bug ini
 *      pernah diperbaiki, lalu sempat ke-revert tanpa sengaja lewat
 *      patch dari branch lama — build akan DIHENTIKAN kalau pola ini
 *      muncul lagi. Lihat fungsi lintOcrPrematureTesseractCheck() di bawah.
 *   8. Lint peringatan "file source kegedean" — file .js sumber (bukan
 *      bundle/.min.js) yang sudah lewat ambang baris tertentu ditandai
 *      sbg kandidat dipecah modulnya. Ini CUMA PERINGATAN (build tetap
 *      lanjut) — sinyal dini spy blast radius edit tidak makin lebar.
 *      Lihat fungsi lintOversizedSourceFiles() di bawah.
 *
 * Pemakaian:
 *   node build.js                  → auto-increment nomor versi (…-31 → …-32)
 *   node build.js nama-versi-baru   → paksa pakai string versi custom
 *
 * Minifikasi:
 *   `esbuild` ada di `devDependencies` (package.json, sejak Sesi 424 --
 *   sebelumnya `optionalDependencies`, yang bisa gagal terpasang DIAM-DIAM).
 *   Kalau `npm install` sukses & esbuild kepakai, skrip ini otomatis
 *   menghasilkan bundle yang benar-benar diminify (ukuran kecil). Kalau
 *   esbuild TIDAK ada (mis. environment tanpa akses jaringan saat
 *   `npm install`), skrip tetap jalan & tetap menghasilkan bundle yang
 *   100% valid — cuma ukurannya lebih besar (source digabung apa adanya,
 *   belum diperkecil). Build biasa (`node build.js` / `npm run build`)
 *   TETAP boleh fallback ke non-minified (aman utk dev sehari-hari) —
 *   TAPI sebelum bikin ZIP rilis, `scripts/verify-release-ready.js`
 *   WAJIB dijalankan & akan BLOCK kalau fallback ini terjadi tanpa
 *   konfirmasi manual eksplisit (lihat file itu utk detail).
 * =============================================================
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { computeGroupHash, markerLine } = require('./bundle-hash');

const ROOT = path.join(__dirname, '..');

const GROUP_A = [
  'modules/shared/pwa-ux-performance.js',
  'modules/shared/pwa-production-hardening.js',
  'modules/shared/modules-render.js',
  // Audit ukuran file (lanjutan S589/s644): modules-render.js dipecah jadi 2 file agar
  // di bawah OVERSIZED_FILE_LINE_THRESHOLD. Separuh keduanya (renderDashboard()/
  // renderKeuangan()/renderVehicleManageList() dkk) HARUS dimuat SETELAH modules-render.js
  // (bukan sebelum, beda dari pola Object.assign mixin aset-owners.js/business-flow-presenter-
  // inventory.js) — file ini murni kelanjutan fungsi-fungsi global, tidak ada objek yang
  // di-mixin balik ke modules-render.js.
  'modules/shared/modules-render-b.js',
  'modules/shared/modals.js',
  'modules/shared/modules-calc.js',
  'modules/shop/cobek-etalase.js',
  'modules/shop/cobek-pricing.js',
  'modules/shop/cobek-order.js',
  'modules/shop/cobek-tx-cart.js',
  'modules/shop/cobek-io.js',
  // Sesi (Bagian B, DESIGN_torsi-vehicle-selector_shop-import-export-2.md):
  // ShopDataIO.commitShopRows()/parseShopCSV() + ShopCsvImport (modal
  // shopCsvImportModal) — ditaruh SETELAH cobek-io.js (dependency:
  // resolveShopKategori/uid/save/openModal/closeModal/toast/escapeHtml/
  // fmtFull/renderProductList sudah dimuat lebih dulu, pola sama
  // penempatan shop-katalog-dinamis-api.js relatif ke dependency-nya).
  'modules/business/shop-data-io-api.js',
  'modules/business/kasir.js',
  'modules/finance/piutang-utang.js',
  'modules/finance/pajak-pbb-zakat.js',
  'modules/finance/zakat-reminder.js',
  'budget.js',
  'car-notes.js',
  'chat-action-handlers.js',
  'modules/finance/edukasi-dana.js',
  // Sesi 14 Tahap 1b (lazy-load, DESIGN_lazy-load-modules.md): sewakios.js
  // SENGAJA dikeluarkan dari GROUP_A -- tidak lagi ikut ter-bundle ke
  // app-bundle-a.min.js. File-nya sekarang dimuat on-demand lewat
  // _loadScriptOnce()/ensureSewaKios() (index.html) saat tab Aset & Proyek >
  // Proyek Renovasi/Sewa Kios pertama dibuka (lihat setKeuanganTab() di
  // tx-list-cashflow.js). Prasyarat Tahap 1a (guard typeof di semua titik
  // panggil) sudah beres sebelum ini.
  'modules/home/hidup-seimbang.js',
  'modules/finance/linktx.js',
  // Sesi 13 Tahap 1b (lazy-load, DESIGN_lazy-load-modules.md): renovasi.js
  // SENGAJA dikeluarkan dari GROUP_A -- tidak lagi ikut ter-bundle ke
  // app-bundle-a.min.js. File-nya sekarang dimuat on-demand lewat
  // _loadScriptOnce()/ensureRenov() (index.html) saat tab Aset & Proyek >
  // Proyek Renovasi pertama dibuka (lihat setKeuanganTab() di
  // tx-list-cashflow.js). Prasyarat Tahap 1a (guard typeof di semua titik
  // panggil) sudah beres sebelum ini -- lihat docs/SESI-13-GUARD-RENOV-TYPEOF.md.
  // Audit ukuran file: aset.js dipecah lagi (lanjutan S589) — fitur multi-
  // owner/porsi kepemilikan-nya (AssetOwnersMixin) HARUS dimuat SEBELUM
  // aset.js karena aset.js Object.assign() mixin ini ke object Aset.
  'modules/asset/aset-owners.js',
  'modules/asset/aset.js',
  'modules/asset/aset-reports.js',
  'modules/asset/aset-misc.js',
  'modules/asset/aset-keluarga.js',
  'modules/ai/feature-insights.js',
  'modules/asset/invest-ai-widget.js',
  'modules/asset/penyusutan-ai-widget.js',
  'modules/asset/aset-emas-impor.js',

  // modules/aset.js (dependency: PropertyManagementAPI._properti() butuh
  // `PajakAset`/`Penyusutan` (modules/asset/aset-reports.js, S589) &
  // `Aset` (modules/asset/aset.js) — semua sudah dimuat lebih dulu di
  // blok ini) — TIDAK perlu forward-reference, pola sama persis
  // penempatan asset-portfolio-api.js (S101) relatif ke dependency-nya.
  'modules/asset/property-management-api.js',

  // Presenter Sesi 132 (audit): ditaruh langsung setelah API-nya, pola
  // sama persis debt-optimizer-api.js -> debt-optimizer-presenter.js.
  'modules/asset/property-management-presenter.js',

  // S103 (Batch 10): Rental Management Foundation — ditaruh SETELAH
  // property-management-api.js (dependency: RentalManagementAPI._properties()
  // butuh `PropertyManagementAPI.propertyList()`, S102, sudah dimuat
  // lebih dulu). `LaporanAset` (dependency lain, modules/asset/aset.js)
  // sudah dimuat lebih dulu juga (awal blok asset di atas) — TIDAK perlu
  // forward-reference sama sekali.
  'modules/asset/rental-management-api.js',

  // Presenter Sesi 132 (audit): ditaruh langsung setelah API-nya.
  'modules/asset/rental-management-presenter.js',

  // S104 (Batch 10): Asset Maintenance Foundation — ditaruh SETELAH
  // rental-management-api.js, bareng grouping per-domain asset.
  // Dependency `Penyusutan`/`Aset` (modules/asset/aset.js) & `todayStr`
  // (modules/shared/features-helpers-global-security.js) semuanya sudah
  // dimuat lebih dulu — TIDAK perlu forward-reference sama sekali.
  'modules/asset/asset-maintenance-api.js',

  // Presenter Sesi 132 (audit): ditaruh langsung setelah API-nya.
  'modules/asset/asset-maintenance-presenter.js',
  'modules/finance/worthit.js',
  'modules/shared/ripple-position.js',
];
const GROUP_B = [
  'modules/shared/data-default.js',
  // Sesi 191: Ownership Engine — ditaruh SEBELUM features-helpers-global-
  // security.js (0 dependency ke arah situ atau modul lain mana pun, 100%
  // pure/standalone) supaya berdekatan dgn modul shared "fondasi" lain di
  // awal GROUP_B. TIDAK disinkronkan/dipanggil dari modul lain mana pun
  // sesi ini (sesuai batasan eksplisit user) — murni terdaftar biar ikut
  // ter-bundle.
  'modules/shared/ownership-engine.js',
  // S229-230: Settings -> Ownership (read-only presenter). Ditaruh TEPAT
  // setelah ownership-engine.js (dependency: OwnershipSettingsPresenter.
  // summary()/render() memanggil OwnershipEngine.TYPES/label()/countByType()
  // — semuanya method yang SUDAH ADA sejak S191, tidak ditambah/diubah sesi
  // ini). Dipanggil dari renderSettings() (modules-render.js) via guard
  // typeof, pola sama persis DashboardSettings.renderSettingsUI() (S129).
  'modules/shared/ownership-settings-presenter.js',
  // Sesi 390: Multi-Owner Engine — fondasi porsi kepemilikan pecahan
  // (1 aset -> banyak pemilik, porsi %). Ditaruh SETELAH
  // ownership-settings-presenter.js (0 dependency wajib ke situ — hanya
  // baca OwnershipEngine via guard typeof opsional utk backward-compat
  // legacy `entity.ownership`, lihat komentar getOwners() di file itu).
  // TIDAK disinkronkan/dipanggil dari modul lain mana pun sesi ini (field
  // `owners` baru TIDAK ditambahkan ke D.assets/dst, tidak ada UI) —
  // pola sama persis ownership-engine.js S191. Split keuntungan otomatis
  // & rule reko AI jadi kerjaan sesi berikutnya.
  'modules/shared/multi-owner-engine.js',
  // Sesi 489 (langkah 1/5, PLAN-owner-registry-multi-session.md): Owner
  // Registry — fondasi `ownerId` konsisten lintas Aset/Investasi/Titipan.
  // Ditaruh SETELAH multi-owner-engine.js (dependency KONSEPTUAL saja, 0
  // dependency KODE wajib — file ini pure/standalone, 0 baca
  // MultiOwnerEngine). TANPA WIRING sesi ini (0 consumer memanggil
  // OwnerRegistry.*), pola sama persis multi-owner-engine.js S390 sendiri.
  'modules/shared/owner-registry.js',
  // Sesi 716: FilterPrefsStore — ekstraksi pola _loadFilterPrefsOnce()/
  // _saveFilterPrefs() yang sebelumnya diduplikasi 3x persis (InvestmentListUI
  // S672, Aset S715, DanaTitipanPortfolioPresenter S715). WAJIB dimuat SEBELUM
  // ketiga consumer itu (modules/asset/aset.js, modules/asset/investasi-list-
  // view.js, modules/finance/dana-titipan-portfolio-render.js) -- ditaruh di
  // sini (blok modules/shared/ awal, standalone/0 dependency) supaya jelas
  // dependency arah-nya: consumer butuh FilterPrefsStore, bukan sebaliknya.
  'modules/shared/filter-prefs-store.js',
  // Sesi 564 (R4, AUDIT-DANA-TITIPAN-OWNERSHIP-SIMPLIFIKASI.md, menutup
  // OWNREG-GATE3-001): 1 layar terpusat Settings -> tab Kepemilikan yang
  // mewiring OwnerRegistry.rename()/merge() (S561) ke tombol nyata.
  // Ditaruh TEPAT setelah owner-registry.js (dependency wajib:
  // OwnerRegistrySettingsUI.render()/renameOwner()/mergeOwner() memanggil
  // OwnerRegistry.listAll()/rename()/merge() langsung).
  //
  // S592 HOUSEKEEPING: baris ini SEBELUMNYA HILANG dari daftar GROUP_B
  // (gap sejak S564 sendiri) — file .js sumber sudah ada & sudah dites
  // (tests/s564-owner-registry-settings-ui-r4.test.js) TAPI tidak pernah
  // ikut ter-bundle lewat build.js; isinya cuma pernah ditempel manual
  // ke app-bundle-a.min.js hasil build sesi lama tanpa registrasi source
  // yang benar. Akibatnya `node scripts/build.js` bersih (tanpa ini)
  // akan diam-diam MENGHAPUS seluruh fitur "Kelola Daftar Pemilik" dari
  // bundle produksi berikutnya. Ditemukan & ditambal sesi ini (S592)
  // sebagai bagian dari verifikasi sebelum menambahkan ghost-asset-
  // cleanup-ui.js di bawah — bukan fitur baru, murni menutup gap
  // registrasi yang sudah lama ada.
  'modules/shared/owner-registry-settings-ui.js',
  // Sesi 592 (lanjutan PATCH-ghost-asset-migrated-investment.md): kartu
  // "🧹 Bersihkan Aset Ghost (Migrasi)" di Settings -> tab Kepemilikan,
  // dekat "Kelola Daftar Pemilik" di atas. Ditaruh SETELAH
  // owner-registry-settings-ui.js (0 dependency KODE ke situ — hanya
  // berdekatan secara UI/tab yang sama). Dependency KODE sebenarnya:
  // `Aset.delete()` (modules/asset/aset.js, GROUP_A) — dipanggil lewat
  // guard typeof, dependency KONSEPTUAL saja krn beda bundle (app-bundle-
  // a.min.js vs app-bundle-b.min.js), keduanya dimuat sbg <script> global
  // di index.html jadi late-bound function call ini aman walau beda file.
  'modules/shared/ghost-asset-cleanup-ui.js',
  // Sesi S540-A (Tahap 1/4, DESIGN-S540-CUSTODIAN-GROUPING.md): Custodian
  // Registry — fondasi `custodianId` untuk instrumen investasi (Dana
  // Titipan holdings), pola identik owner-registry.js di atas (registry
  // kecil {id,name} + findOrCreate()). Ditaruh SETELAH owner-registry.js
  // (dependency KONSEPTUAL saja, 0 dependency KODE — file ini pure/
  // standalone, 0 baca OwnerRegistry).
  'modules/shared/custodian-registry.js',
  // Sesi 391: split keuntungan aset otomatis per pemilik (lanjutan S390).
  // Ditaruh SETELAH multi-owner-engine.js (dependency wajib: splitFor()/
  // summary() panggil MultiOwnerEngine.getOwners()/splitByPorsi()/
  // validateOwners() lewat guard typeof). registerAssetAIRules() di
  // aset.js (GROUP_A, dimuat lebih dulu) mereferensikan
  // AssetOwnershipSplitPresenter TAPI hanya di dalam closure
  // condition/action yang baru DIPANGGIL saat runtime (self-test.js
  // init()) — jadi urutan load ttp aman meski aset.js secara TEKS
  // duluan (sama pola forward-reference lain di project ini).
  'modules/asset/asset-ownership-split-presenter.js',
  'modules/shared/features-helpers-global-security.js',
  // S264: Security Hardening — wrapper functions utk eks data-onclick,
  // dipanggil lewat data-action. Ditaruh langsung setelah dispatcher
  // (features-helpers-global-security.js) krn cuma re-wrap handler yg
  // sebelumnya inline; tidak ada dependency baru ke modul lain.
  'modules/shared/action-wrappers.js',
  'diagnostik-versi.js',
  'modules/shared/format-tema.js',
  'modules/shared/error-handler.js',
  'modules/shared/helper-teks.js',
  'modules/shared/keamanan-pin.js',
  'modules/home/refleksi-selfcare.js',
  'modules/shared/modal-navigasi.js',
  // scanner-session.js (Tahap 5 — PD-007, docs/PRODUCT_DECISIONS.md
  // "Scanner — Exclusive Scanner Mode via ScannerSession"): satu-satunya
  // titik suspend/resume UI global (modal/toast/#mainNav/#mainHeader)
  // selama scanner kamera aktif, menggantikan blok camera-scan-active yang
  // DIHAPUS dari modal-navigasi.js (di atas) sesi ini. Ditaruh TEPAT
  // setelah modal-navigasi.js (dependency: #toast/.overlay.open/openModal-
  // closeModal punya konvensi yang sama) & SEBELUM vehicle-scanner.js/
  // sparepart-scanner.js (di bawah, keduanya MEMANGGIL ScannerSession.
  // enter()/exit() — harus sudah ter-load lebih dulu).
  'modules/shared/scanner-session.js',
  'modules/business/reset-gaji-mingguan.js',
  'modules/shared/debug-console.js',
  'modules/shared/pengaturan-search.js',
  'modules/shared/onboarding.js',
  'modules/shared/kalkulator-input.js',
  'modules/shared/scan-ocr.js',
  // Audit ukuran file (sesi split lanjutan setelah transaksi.js):
  // scan-ocr.js dipecah jadi 2 -- fitur UniversalScan (Sesi 125, scan
  // screenshot Bank/E-Wallet/Bibit/Jago Pocket) pindah ke scan-ocr-b.js.
  // Murni top-level function, tidak di-mixin balik, cukup dimuat SETELAH
  // scan-ocr.js.
  'modules/shared/scan-ocr-b.js',
  'modules/finance/filter-laporan.js',
  'modules/finance/akun.js',
  'modules/business/gaji-calc.js',
  // Sesi "Bulanan Tetap": butuh ensureGajiCategory() (reset-gaji-mingguan.js)
  // & populateAccFilters() (akun.js, tepat di atas) -- dimuat setelah keduanya.
  'modules/business/gaji-bulanan.js',
  'modules/finance/cicilan.js',
  'modules/finance/tx-bbm.js',
  'modules/vehicle/service-event-lifecycle.js',
  'modules/vehicle/service-event-adapter.js',
  'modules/vehicle/service-history-integrity-audit.js',
  'modules/vehicle/finance-service-adapter.js',
  'modules/vehicle/service-photo-validator.js',
  'modules/vehicle/reminder-lifecycle.js',
  'modules/vehicle/service-integrity-reconciler.js',
  'modules/vehicle/car-notes-final-audit.js',
    'modules/vehicle/service-stock-ledger.js',
    'modules/vehicle/odometer-audit.js',
    'modules/vehicle/car-notes-integrity-suite.js',
  'modules/vehicle/fuel-integrity-reconciler.js',
  'modules/vehicle/vehicle-tax-integrity-reconciler.js',
  'modules/finance/tx-servis.js',
  'modules/finance/tx-stok-sparepart.js',
  'modules/finance/tx-renov.js',
  'modules/finance/tx-transfer.js',
  'modules/finance/tx-cobek.js',
  'modules/finance/tx-target.js',
  'modules/finance/tx-list-cashflow.js',
  'modules/finance/transaksi.js',
  // Audit ukuran file (sesi split lanjutan setelah sparepart-servis.js):
  // transaksi.js dipecah jadi 2 -- saveTx()/_saveTxInner() (mesin simpan
  // transaksi) + saveCatatan/saveReminder/saveLDR/toggleMs/delReminder
  // pindah ke transaksi-b.js. Murni top-level function, tidak di-mixin
  // balik, jadi cukup dimuat SETELAH transaksi.js.
  'modules/finance/transaksi-b.js',
  'modules/shared/profil-pengaturan.js',
  'modules/finance/kategori.js',
  'modules/ai/kategorisasi-ai.js',
  'modules/finance/tagihan-kalender.js',
  // Sesi P1 (RENCANA-KERJA-toggle-hitungkas-dan-proyeksi-kas.md, Track 2):
  // getMonthlyCashProjection() — presenter murni Proyeksi Kas Bulan Ini.
  // Ditaruh TEPAT setelah tagihan-kalender.js (dependency wajib:
  // getBillStats()/getBillPaidThisPeriodInfo(), didefinisikan di file itu,
  // dipanggil lewat guard typeof jadi urutan sebenarnya tidak wajib tapi
  // dikelompokkan berdekatan biar logis). Belum ada UI/wiring dashboard sesi
  // ini (itu Sesi P2) — murni fungsi murni + test, pola sama persis
  // ownership-engine.js S191 (terdaftar biar ikut ter-bundle, 0 consumer dulu).
  'modules/finance/cash-projection.js',
  // Sesi S724 (carry-forward S723): DeficitNotifBridge — translator murni (pola SAMA
  // PERSIS modules/vehicle/vehicle-notif-bridge.js), dependency getCashProjectionDeficitAlert()
  // wajib dimuat DULUAN (cash-projection.js tepat di atas). Dipanggil lewat guard typeof
  // dari reminder-notif.js checkAndFireReminders() (dimuat belakangan), jadi urutan load
  // relatif thd reminder-notif.js sendiri tidak wajib -- ditaruh berdekatan dgn cash-
  // projection.js biar mengelompok scr logis (finance domain).
  'modules/finance/deficit-notif-bridge.js',
  'modules/shared/backup-restore.js',

  // Data Management Core (Sesi ini): Backup History + Backup Health.
  // Ditaruh SETELAH backup-restore.js (dependency: BackupHistoryAPI.
  // recordEntry() dipanggil dari exportData()/runFullBackup()/runBackup()
  // di backup-restore.js — TAPI pemanggilannya lazy, di dalam function
  // body yg baru jalan saat backup beneran dijalankan user, BUKAN saat
  // file di-parse, jadi urutan load ini sebenarnya tidak wajib — tetap
  // ditaruh setelahnya biar mengelompok scr logis). backup-health-api.js
  // SETELAH backup-history-api.js (dependency: BackupHealthAPI.
  // reliability() memanggil BackupHistoryAPI.summary(), sama alasan
  // lazy di atas). Kedua presenter SETELAH kedua api-nya.
  'modules/shared/backup-history-api.js',
  'modules/shared/backup-health-api.js',
  'modules/shared/backup-history-presenter.js',
  'modules/shared/backup-health-presenter.js',

  'modules/business/payroll-absensi.js',
  'modules/business/tukang-absensi.js',
  // insight-target-mingguan.js (S132 — Insight Target Mingguan kirim uang ke
  // istri): logic-only, BACA D.workDays/D.profile.kiriman via getWeekRange
  // (reset-gaji-mingguan.js, sudah dimuat lebih dulu di GROUP_B) & dipanggil
  // dari Payroll.renderDashMini() (payroll-absensi.js, di atas) — ditaruh
  // tepat setelahnya krn dependency logis (dibaca setelah Payroll dimuat).
  'modules/business/insight-target-mingguan.js',
  'modules/vehicle/car-notes-performance.js',
  'modules/vehicle/vehicle-core.js',
  // fuel-price-ref.js (Sesi 749, BARU): FuelPriceRef — referensi harga BBM nasional
  // (D.fuelPriceRef, 6 jenis) + "Cek Update via AI", pola sama persis RefAI
  // (modules/finance/pajak-pbb-zakat.js, GROUP_A, sudah dimuat lebih dulu — reuse
  // RefAI._parseJSON aman). Ditaruh tepat setelah vehicle-core.js krn sama-sama
  // domain vehicle/BBM "foundational", pola sama vehicle-catalog.js di bawah.
  'modules/vehicle/fuel-price-ref.js',
  // vehicle-catalog.js (Milestone 0 Phase 1, BARU — lihat ACR-001):
  // dependency uid()/sameId() (features-helpers-global-security.js) &
  // IDBStore (modules/asset/aset.js) sudah dimuat lebih dulu di blok atas.
  // Tidak bergantung ke vehicle-core.js secara langsung, ditaruh
  // bersebelahan krn sama-sama domain vehicle "core"/foundational.
  'modules/vehicle/vehicle-catalog.js',
  // SOT rebased: canonical catalog identity/write/health/scope/e2e/lifecycle/migration.
  'modules/vehicle/vehicle-catalog-write-sot.js',
  'modules/vehicle/vehicle-catalog-health-sot.js',
  'modules/vehicle/vehicle-catalog-scope-sot.js',
  'modules/vehicle/vehicle-catalog-e2e-sot.js',
  'modules/vehicle/vehicle-catalog-lifecycle-sot.js',
  'modules/vehicle/vehicle-catalog-migration-sot.js',
  'modules/vehicle/vehicle-catalog-identity-sot.js',
  'modules/vehicle/vehicle-catalog-certification-sot.js',
  'modules/vehicle/vehicle-part-sot.js',
  'modules/vehicle/vehicle-service-sot.js',
  'modules/vehicle/vehicle-service-reminder-sot.js','modules/vehicle/service-reminder-package-sot.js',
  'modules/vehicle/vehicle-sot-fleet-integrity.js',
  'modules/vehicle/vehicle-category-sot.js',
  'modules/vehicle/vehicle-stock-sot.js',
  'modules/vehicle/vehicle-model-registry-sot.js',
  'modules/vehicle/vehicle-model-resolver-sot.js',
  'modules/vehicle/vehicle-sot-provisioning.js',

  // honda-oem-catalog-master.js (S20): adapter READ-ONLY untuk menormalkan
  // master OEM dari teks parts catalog Honda. Tidak membuat taxonomy servis
  // baru dan tidak menulis D/VehicleCatalog/IDBStore. Metadata katalog
  // (block/halaman/ref) dipertahankan sebagai provenance.
  'modules/vehicle/honda-oem-catalog-master.js',
  // vehicle-scanner.js (lanjutan ringkas Tahap 2 ACR-001 — scan Barcode/
  // QR/DataMatrix): HANYA lapisan kamera/decode (ZXing-JS), dependency
  // vehicle-catalog.js (VehicleCatalog.handleScan) & toast()/
  // _loadScriptOnce() sudah dimuat lebih dulu.
  'modules/vehicle/vehicle-scanner.js',
  // vehicle-catalog-ui.js (Sesi 181, ringkas — UI dasar Vehicle Catalog):
  // list part + tombol Scan (reuse VehicleScanner.scan()) + form tambah/
  // edit manual (reuse field VehicleCatalog yang sudah ada). Dependency
  // VehicleCatalog (vehicle-catalog.js) & openModal/closeModal/askConfirm/
  // toast/escapeHtml (modal-navigasi.js dkk) sudah dimuat lebih dulu.
  'modules/vehicle/vehicle-catalog-ui.js',
  // sparepart-scanner.js (Tahap 7B-1 — Fondasi Scanner Sparepart): adapter
  // "gallery" (upload foto, decode 1x lewat ZXing) + registry adapter utk
  // tahap kamera berikutnya. Dependency: VehicleScanner (vehicle-scanner.js,
  // reuse ensureZXing/buildHints/errorMessage) & VehicleCatalog
  // (vehicle-catalog.js, reuse handleScan) sudah dimuat lebih dulu di atas.
  'modules/vehicle/sparepart-scanner.js',
  // sparepart-scanner-ui.js: lapisan tipis tombol "Scan dari Galeri" di
  // catalogModal, dependency SparepartScanner (file di atas) &
  // VehicleCatalogUI.openForm()/renderList() (vehicle-catalog-ui.js) sudah
  // dimuat lebih dulu.
  'modules/vehicle/sparepart-scanner-ui.js',
  // sparepart-ocr.js (Tahap 7C-1 — Engine OCR Sparepart, Fondasi): baca 1
  // foto dari galeri, OCR (100% reuse ocrRecognize() di scan-ocr.js),
  // kembalikan STRING teks OCR saja — TIDAK ada parsing/integrasi Vehicle
  // Catalog (sengaja di luar cakupan sesi ini, kandidat tahap lanjutan).
  // Dependency: ocrRecognize() (scan-ocr.js) sudah dimuat lebih dulu di
  // blok atas; SparepartScanner (file di atas) opsional (reuse
  // pickImageFile() kalau ada).
  'modules/vehicle/sparepart-ocr.js',
  // sparepart-ocr-parser.js (Tahap 7C-2 — Parser Hasil OCR Sparepart):
  // logic murni, terima STRING teks OCR -> ekstrak { oemCode, partName,
  // brand, barcode }. OEM Code/Barcode reuse VehicleCatalog.parseLabelText()
  // (guard typeof); Brand & Nama Part heuristik baru (belum ada di modul
  // manapun sebelumnya). BELUM menyimpan data (tidak panggil
  // VehicleCatalog.create()) & BELUM menyentuh DOM/UI. Dependency:
  // VehicleCatalog (vehicle-catalog.js) opsional, sudah dimuat lebih dulu
  // di blok atas kalau ada.
  'modules/vehicle/sparepart-ocr-parser.js',
  // sparepart-ocr-catalog-link.js (Tahap 7C-3a — jembatan MURNI LOGIC
  // hasil SparepartOcrParser (file di atas) <-> VehicleCatalog): cari
  // part berdasar OEM Code/Barcode/Part Number (aftermarketCode), HANYA
  // kembalikan found/not found — TIDAK bikin draft, TIDAK ubah UI/form.
  // Dependency: SparepartOcrParser (file di atas) & VehicleCatalog
  // (vehicle-catalog.js) keduanya opsional (guard typeof), sudah dimuat
  // lebih dulu di blok atas.
  'modules/vehicle/sparepart-ocr-catalog-link.js',
  // sparepart-ocr-catalog-detail.js (Tahap 7C-3b — tampilkan detail part
  // KALAU hasil pencarian file di atas ditemukan): presenter MURNI
  // (field siap tampil + HTML kartu, fallback "Belum diisi"), TIDAK
  // menyentuh DOM/VehicleCatalog/parser sama sekali. Dependency:
  // escapeHtml() (helper-teks.js) & fmt() (format-tema.js) keduanya
  // opsional (guard typeof), sudah dimuat lebih dulu di blok GROUP_A.
  'modules/vehicle/sparepart-ocr-catalog-detail.js',
  // sparepart-ocr-catalog-add.js (Tahap 7C-3c — kalau part TIDAK ditemukan
  // di file 7C-3a di atas, buka form tambah part yang SUDAH ADA
  // (VehicleCatalogUI.openForm()) dalam mode "Tambah Part Baru", isi
  // otomatis field dari hasil parse OCR (SparepartOcrParser, Tahap 7C-2),
  // baru simpan (VehicleCatalogUI.save()) SETELAH user konfirmasi
  // (askConfirm()). TIDAK ubah openForm()/save()/parser/pencarian/kartu
  // detail yang sudah ada. Dependency: VehicleCatalogUI
  // (vehicle-catalog-ui.js) & askConfirm() (modal-navigasi.js) keduanya
  // opsional (guard typeof), sudah dimuat lebih dulu di blok atas.
  'modules/vehicle/sparepart-ocr-catalog-add.js',
  // sparepart-ocr-orchestrator.js (Tahap 7C-4b — orkestrator utama Scan ->
  // Parse -> Cari Vehicle Catalog -> (ditemukan -> Detail) / (tidak
  // ditemukan -> Add)): 0 logic baru, murni merangkai pemanggilan
  // SparepartOcr.scan() (7C-1) -> SparepartOcrParser.parseText() (7C-2) ->
  // SparepartOcrCatalogLink.findFromParsed() (7C-3a) -> found ?
  // SparepartOcrCatalogDetail.show() (7C-3b) :
  // SparepartOcrCatalogAdd.open() (7C-3c). Dependency: kelima file di atas,
  // semuanya opsional (guard typeof), sudah dimuat lebih dulu di blok ini.
  'modules/vehicle/sparepart-ocr-orchestrator.js',
  // vehicle-catalog-import.js (Tahap 5 — Import Katalog PDF -> OCR ->
  // Parser -> Preview -> Import): logic murni (pdf.js lazy-load, parsing
  // per baris, commitRows()). Dependency VehicleCatalog.parseLabelText()/
  // create() (vehicle-catalog.js) & ocrRecognize() (scan-ocr.js, opsional
  // guard typeof) sudah dimuat lebih dulu.
  'modules/vehicle/vehicle-catalog-import.js',
  // vehicle-catalog-import-ui.js: lapisan DOM/presenter modal
  // "vehCatalogImportModal" saja, dependency VehicleCatalogImport (file
  // di atas) & openModal/closeModal/askConfirm/toast/escapeHtml sudah
  // dimuat lebih dulu.
  'modules/vehicle/vehicle-catalog-import-ui.js',
  // vehicle-catalog-import-stock-push.js — fitur "Push ke Stok Sparepart"
  // pasca-import (jawaban: sync Katalog->Stok TIDAK otomatis dpt qty
  // nyata sebelum ini). Reuse syncPartsStockFromCatalog()
  // (tx-stok-sparepart.js, dimuat lebih dulu di atas) &
  // askConfirm()/showPromptModal() (modal-navigasi.js). Dipanggil dari
  // vehicle-catalog-import-ui.js (file di atas) SETELAH commit sukses.
  'modules/vehicle/vehicle-catalog-import-stock-push.js',
  // vehicle-catalog-web-import.js (Tahap 6 — Import Katalog dari URL Web:
  // fetch(url) -> Parser HTML -> Preview -> Import). App ini PWA
  // client-side murni tanpa backend/proxy, jadi fetch(url) ke situs
  // katalog pihak ketiga besar kemungkinan diblokir CORS — fallback-nya
  // paste HTML manual, 1 parser dipakai utk kedua jalur (lihat komentar
  // desain lengkap di file ini). Reuse VehicleCatalogImport.
  // filterCompleteRows()/commitRows() (Tahap 5, file di atas) apa adanya
  // utk preview-filter & commit — TIDAK ada logic commit baru.
  'modules/vehicle/vehicle-catalog-web-import.js',
  // vehicle-catalog-web-import-ui.js: lapisan DOM/presenter modal
  // "vehCatWebImportModal" saja, dependency VehicleCatalogWebImport (file
  // di atas), VehicleCatalogImport (Tahap 5) & openModal/closeModal/
  // askConfirm/toast/escapeHtml sudah dimuat lebih dulu.
  'modules/vehicle/vehicle-catalog-web-import-ui.js',
  // vehicle-catalog-servis-link.js (Vehicle Catalog Tahap 6, Sesi 1/3 —
  // jembatan MURNI LOGIC D.servisLogs <-> VehicleCatalog, TANPA UI).
  // Dependency: D (data-default.js) & VehicleCatalog (vehicle-catalog.js)
  // sudah dimuat lebih dulu. sparepart-servis.js/car-notes.js (pemilik
  // D.servisLogs) TIDAK bergantung ke file ini secara langsung di sesi
  // ini (baru dipakai mulai Sesi 2 — UI picker), ditaruh di sini supaya
  // mengelompok dengan file vehicle-catalog-* lain.
  'modules/vehicle/vehicle-catalog-servis-link.js',
  // vehicle-catalog-tx-link.js (Vehicle Catalog Tahap 7A — "Smart
  // Transaction Foundation": jembatan MURNI LOGIC D.transactions <->
  // VehicleCatalog, TANPA UI, pola SAMA PERSIS vehicle-catalog-servis-
  // link.js di atas). Dependency: D (data-default.js, transaksi.js sudah
  // dimuat lebih dulu) & VehicleCatalog (vehicle-catalog.js) sudah dimuat
  // lebih dulu di blok atas. transaksi.js TIDAK bergantung ke file ini
  // secara langsung sesi ini (wiring UI txModal baru dikerjakan sesi
  // berikutnya), ditaruh di sini supaya mengelompok dengan file
  // vehicle-catalog-* lain.
  'modules/finance/vehicle-catalog-tx-link.js',
  // honda-pdf-import.js (Tahap 7D-1 — Import PDF Honda, Fondasi): pilih
  // 1/banyak file PDF (input `multiple`, filter application/pdf), simpan
  // SEMENTARA (metadata+base64) ke store IndexedDB terpisah
  // (`honda-pdf-import:store`), status selalu `pending` — BELUM ada
  // parsing/OCR/integrasi VehicleCatalog sesi ini (di luar cakupan,
  // kandidat tahap lanjutan 7D-2 dst). Pola sama persis vehicle-catalog.js
  // (storage IDBStore) & sparepart-ocr.js (picker + orkestrasi, Tahap
  // 7C-1). TIDAK menyentuh D, TIDAK ada UI/modal baru di index.html/
  // app_production.html sesi ini. Dependency: uid()/sameId()
  // (features-helpers-global-security.js) & IDBStore sudah dimuat lebih
  // dulu di blok GROUP_A; toast()/scanErrorMessage() (opsional, guard
  // typeof) sudah dimuat lebih dulu juga.
  'modules/vehicle/honda-pdf-import.js',
  // honda-pdf-import-extract.js (Tahap 7D-2 — Extract Text -> Preview):
  // reuse VehicleCatalogImport.extractPdfText() (Tahap 5) apa adanya lewat
  // adapter file-like dari base64 tersimpan (HondaPdfImport, Tahap 7D-1).
  // Hasil disimpan balik via HondaPdfImport.update(). TIDAK ada parsing
  // field part/integrasi VehicleCatalog (di luar cakupan, kandidat tahap
  // lanjutan 7D-3 dst). Dependency: HondaPdfImport (file di atas) &
  // VehicleCatalogImport (vehicle-catalog-import.js) sudah dimuat lebih
  // dulu di blok atas.
  'modules/vehicle/honda-pdf-import-extract.js',
  // honda-pdf-import-parse.js (Tahap 7D-3 — Parse Text -> JSON): reuse
  // VehicleCatalogImport.parseCatalogRows() (Tahap 5) apa adanya atas
  // `record.extractedText` (HondaPdfImport, Tahap 7D-2). Hasil disimpan
  // balik via HondaPdfImport.update() sbg `parsedRows`. TIDAK ada
  // integrasi VehicleCatalog/UI (di luar cakupan, kandidat tahap lanjutan
  // 7D-4 dst). Dependency: HondaPdfImport & VehicleCatalogImport (file di
  // atas) sudah dimuat lebih dulu.
  'modules/vehicle/honda-pdf-import-parse.js',
  // honda-pdf-import-commit.js (Tahap 7D-4 — JSON -> Vehicle Catalog):
  // reuse VehicleCatalogImport.commitRows() (Tahap 5) apa adanya atas
  // `record.parsedRows` (HondaPdfImport, Tahap 7D-3) atau subset baris
  // dikirim eksplisit. Hasil disimpan balik via HondaPdfImport.update()
  // sbg `commitResult`. TIDAK ada UI/modal (di luar cakupan, kandidat
  // tahap lanjutan 7D-5 dst). Dependency: HondaPdfImport &
  // VehicleCatalogImport (file di atas) sudah dimuat lebih dulu.
  'modules/vehicle/honda-pdf-import-commit.js',
  // honda-pdf-import-ui.js (Tahap 7D-5 — "Preview Import" UI): lapisan
  // DOM/presenter modal `hondaPdfImportModal` SAJA, pola sama persis
  // vehicle-catalog-import-ui.js. Dependency: HondaPdfImport/Extract/
  // Parse/Commit (file-file di atas) & openModal/closeModal/askConfirm/
  // toast/escapeHtml sudah dimuat lebih dulu.
  'modules/vehicle/honda-pdf-import-ui.js',
  // shop-pdf-import-ui.js (Bagian B, DESIGN_torsi-vehicle-selector_shop-
  // import-export-2.md §B.3.2 Import PDF, Sesi N+7 — setelah Sesi N+6
  // commitShopRows()+Import CSV): modal `shopPdfImportModal`, 100% reuse
  // VehicleCatalogImport.extractPdfText() (Tahap 5, file di atas) +
  // ImportKatalog.parseText() (cobek-io.js, GROUP_A) + ShopDataIO.
  // commitShopRows() (shop-data-io-api.js, GROUP_A) — ditaruh SETELAH
  // honda-pdf-import-ui.js supaya VehicleCatalogImport/ImportKatalog/
  // ShopDataIO semuanya sudah termuat lebih dulu.
  'modules/business/shop-pdf-import-ui.js',
  // shop-scan-ui.js (Bagian B, DESIGN_torsi-vehicle-selector_shop-import-
  // export-2.md §B.3.1 Scan, Sesi N+8 — setelah Sesi N+7 Import PDF Shop):
  // modal `shopScanModal`, 100% reuse ocrRecognize() (scan-ocr.js, GROUP_A) +
  // ImportKatalog.parseText() (cobek-io.js, GROUP_A) + ShopDataIO.
  // commitShopRows() (shop-data-io-api.js, GROUP_A) — ditaruh SETELAH
  // shop-pdf-import-ui.js supaya mengelompok dengan modul import Shop lain
  // (dependency-nya semua sudah termuat sejak GROUP_A).
  'modules/business/shop-scan-ui.js',
  'modules/ai/chat-action.js',
  'modules/shared/data-archive.js',
  // CATEGORY-SOT cumulative: canonical taxonomy + interval policy must load
  // before vehicle sparepart/reminder logic so all runtime interval/category
  // reads pass through the same SoT helpers.
  'modules/vehicle/category-canonical-ref.js',
  'modules/vehicle/service-interval-policy.js',
  // HOUSEKEEPING (audit registrasi build.js, pola sama persis S592
  // owner-registry-settings-ui.js): service-interval-sot.js
  // (resolveCanonicalInterval — canonical interval resolver, disebut
  // sebagai SoT di komentar filenya sendiri) sudah lama punya kode +
  // test (tests/service-interval-sot-04-06.test.js) DAN sudah dipanggil
  // dari sparepart-servis.js lewat guard typeof (baris di bawah) TAPI
  // source-nya sendiri TIDAK PERNAH terdaftar di sini — akibatnya guard
  // itu diam-diam selalu jatuh ke fallback di produksi. Ditaruh SEBELUM
  // sparepart-servis.js (consumer-nya) sesuai urutan dependency.
  'modules/vehicle/service-interval-sot.js',
  // S2005: canonical history ↔ reminder identity reconciliation. Must load
  // before sparepart-servis.js so the matcher is available to all reminder consumers.
  'modules/vehicle/service-history-reminder-reconciliation-sot.js', 'modules/vehicle/service-category-sot-reconciliation-s2007.js',
  // S2034 P2 read-only category/component/interval + existing-history audit.
  'modules/vehicle/service-category-component-history-audit-s2034.js',
  'modules/vehicle/sparepart-servis.js',
  'modules/vehicle/sparepart-servis-ui.js',
  // Audit ukuran file (sesi split lanjutan): sparepart-servis.js dipecah jadi 2
  // file agar di bawah OVERSIZED_FILE_LINE_THRESHOLD. Bagian KEDUA (SparepartCsvImport/
  // TORSI_DB/VEHICLE_SPEC_DB/wrapper Servis/fitur AI kendaraan) HARUS dimuat SETELAH
  // sparepart-servis.js (dependency: fungsi-fungsi di sparepart-servis-b.js manggil
  // fungsi/const dari sparepart-servis.js). Murni top-level function/const, tidak
  // di-mixin balik ke sparepart-servis.js.
  // Database API Fase 1, Sesi 1/N: modules/engine/database-api.js HARUS
  // dimuat SEBELUM sparepart-servis-b.js -- findTorsiDb()/findVehicleSpec()
  // di file itu sekarang baca dari DatabaseAPI.vehicle kalau tersedia
  // (fallback ke TORSI_DB/VEHICLE_SPEC_DB literal kalau belum termuat,
  // mis. test terisolasi yg cuma load sparepart-servis-b.js sendirian).
  'modules/engine/database-api.js',
  // Canonical service master: generated from data/database-kategori-komponen-servis.json.
  // The DB adapter reuses the existing IDBStore key/value architecture; no second DB wrapper.
  'modules/vehicle/service-master-data.generated.js',
  'modules/vehicle/service-master-database.js',
  // Service History SOT normalizer: deterministic legacy cleanup; no catalog/price requirement.
  // S2017/S2018 compatibility runtime: canonical taxonomy must load before history context consumers.
  'modules/vehicle/service-taxonomy-sot.js',
  'modules/vehicle/service-history-context-s2018.js',
  'modules/vehicle/service-history-sot-normalizer.js',
  'modules/vehicle/service-history-sot-review.js',
  'modules/vehicle/service-session-sot.js',
  'modules/vehicle/service-history-audit-package.js',
  'modules/vehicle/service-event-sot.js',
  'modules/vehicle/service-history-lifecycle-s2027-s2030-app-main.js',
  'modules/vehicle/service-checklist-execution-sot.js',
  'modules/vehicle/service-checklist-integrity-sot.js',
  'modules/vehicle/parts-catalog-database.js',
  'modules/vehicle/vehicle-maintenance-template-engine.js',
  'modules/vehicle/honda-pdf-catalog-auto-import.js',
  'modules/vehicle/sparepart-servis-b.js',
  // Servis Checklist, Sesi 1A (BREAKDOWN-SESI-RINGAN-CHECKLIST-UI-30-ITEM.md):
  // SERVICE_CHECKLIST_GROUPS — murni konstanta data (50 item/13 grup), 0
  // state/UI di sesi ini. Ditaruh SETELAH sparepart-servis-b.js sesuai
  // RENCANA-SESI-SERVICE-CHECKLIST.md §4 Sesi 1 (file ini nantinya, di
  // Sesi 1B/1C, butuh resolveServisCatForVehicle()/servisLogMatchesCat()
  // dari sparepart-servis.js sudah termuat lebih dulu untuk sinkron
  // linkCat — belum dipakai di Sesi 1A, tapi posisinya disiapkan sekali
  // jalan supaya tidak perlu geser urutan lagi di sesi berikutnya).
  'modules/vehicle/servis-checklist.js',
  'modules/vehicle/service-input-catalog.js',
  'modules/vehicle/service-history-component-identity-sot.js',
  'modules/vehicle/servis.js',
  // S2036: reconcile checklist edits across session rows + component reminder projection.
  'modules/vehicle/service-history-checklist-edit-s2036.js',
  // S1972: bulk category/component identity editor for selected service-history records.
  'modules/vehicle/service-history-bulk-identity-editor.js',
  'modules/vehicle/service-maintenance-engine.js',
  'modules/vehicle/service-maintenance-repository.js',
  // S1812: lower-level service history/reminder methods split from servis.js.
  // Must load immediately after servis.js; public Servis API is preserved.
  'modules/vehicle/servis-b.js',
  'modules/vehicle/service-history-component-explorer-s2006.js',
  // S1811: condition/result/history/recommendation guidance layer. Loaded after
  // checklist + servis so it can consume their runtime APIs without becoming a second SoT.
  'modules/vehicle/service-maintenance-guidance.js',
  // Sesi 331 (sync-katalog-sparepart, updated): Shop Katalog Sparepart
  // Dinamis per-Kendaraan — API dulu (murni logic, reuse D.vehicles/
  // D.sparepartCats/D.servisLogs/D.partsCatalog apa adanya, guard typeof
  // berlapis), presenter SETELAHNYA (dependency: ShopKatalogDinamisAPI,
  // file di atas). Ditaruh setelah sparepart-servis.js supaya mengelompok
  // dengan modul vehicle/sparepart lain. Dipanggil via openShopKatalogDinamis()
  // (modal-navigasi.js) yang membuka shopKatalogDinamisModal (modals.js).
  'modules/vehicle/shop-katalog-dinamis-api.js',
  'modules/vehicle/shop-katalog-dinamis-presenter.js',
  // Sesi 1 (torsi-vehicle-selector, Bagian A — lihat
  // DESIGN_torsi-vehicle-selector_shop-import-export.md): TorsiVehicleAPI,
  // 100% reuse pola ShopKatalogDinamisAPI di atas (daftarKendaraan() dipanggil
  // ulang dari sana, TIDAK diduplikasi) — makanya ditaruh SETELAH kedua file
  // itu. Presenter/wiring modal HTML menyusul sesi berikutnya.
  'modules/vehicle/torsi-vehicle-api.js',
  'ai-chat.js',
  'reminder-notif.js',
  'laporan-export.js',
  'gdrive-backup.js',
  'data-health-check.js',
  'global-search.js',
  'sheets-schema.js',
  'sheets-sync.js',
  'pwa-setup.js',
  'modules/shared/app-init-runtime.js',
  'modules/shared/self-test-cases-a.js',
  'modules/shared/self-test-cases-b.js',
  'self-test.js',
  'pajak-aset-ui-wrappers.js',
  'modules/finance/finance-intelligence.js',
  // Sesi Audit Keuangan 30 Menit — Phase A: pure engine + presenter read-only.
  'modules/finance/financial-audit-engine.js',
  'modules/finance/financial-audit-presenter.js',
  'modules/finance/financial-audit-annotations.js',
  'modules/finance/finance-dashboard.js',
  // Sesi 91 (Batch 10): Financial Forecast Foundation — ditaruh SETELAH
  // finance-dashboard.js (dependency: FinancialForecastAPI butuh
  // FinanceDashboard.getAIHook() sudah dimuat lebih dulu), sebelum modul
  // vehicle (grouping per-domain finance tetap bersebelahan).
  'modules/finance/financial-forecast-api.js',
  'modules/finance/financial-forecast-presenter.js',

  // Sesi 92 (Batch 10): Budget Recommendation Foundation — ditaruh SETELAH
  // finance-intelligence.js (dependency: BudgetRecommendationAPI butuh
  // FinanceIntelligence.budgetSummary() sudah dimuat lebih dulu), bareng
  // finance-forecast (grouping per-domain finance tetap bersebelahan).
  'modules/finance/budget-recommendation-api.js',
  'modules/finance/budget-recommendation-presenter.js',

  // Sesi 93 (Batch 10): Cash Flow Projection Foundation — ditaruh SETELAH
  // financial-forecast-*.js (dependency: CashFlowProjectionAPI butuh
  // FinancialForecastAPI.summary() sudah dimuat lebih dulu), bareng
  // budget-recommendation (grouping per-domain finance tetap bersebelahan).
  //
  // S95 (lanjutan Sesi 93 — Siklus Tagihan & Settings): cashflow-projection-
  // settings.js ditaruh SEBELUM api/presenter (CashFlowProjectionPresenter
  // panel "⚙️ Atur" & computeCashflowForecast()/tx-list-cashflow.js baca
  // CashflowProjSettings lewat guard `typeof` runtime, jadi urutan load
  // sebenarnya tidak kritikal -- ditaruh di sini murni supaya grouping
  // per-fitur tetap bersebelahan di bundle, sama pola api+presenter di atas).
  'modules/finance/cashflow-projection-settings.js',
  'modules/finance/cashflow-projection-api.js',
  'modules/finance/cashflow-projection-presenter.js',

  // Sesi 94 (Batch 10): Financial Goal Planner Foundation — ditaruh
  // SETELAH cashflow-projection-*.js (dependency: FinancialGoalAPI butuh
  // CashFlowProjectionAPI.summary() sudah dimuat lebih dulu, bareng
  // grouping per-domain finance). `goalAdapterList` (dependency lain,
  // lifeos/adapters/goal-adapter.js) dimuat BELAKANGAN di bundle ini
  // (blok LifeOS di bawah) — TIDAK masalah krn hanya dipanggil di dalam
  // method (runtime, setelah seluruh bundle selesai di-parse), pola sama
  // persis modules/ai/ai-service.js yang juga forward-reference
  // goalAdapterList lebih dulu dari blok LifeOS.
  'modules/finance/financial-goal-api.js',
  'modules/finance/financial-goal-presenter.js',

  // Sesi 95 (Batch 10): Investment Planner Foundation — ditaruh SETELAH
  // financial-goal-*.js (dependency: InvestmentPlannerAPI._surplus()
  // butuh FinancialGoalAPI._surplus() sudah dimuat lebih dulu), bareng
  // grouping per-domain finance. `Investment` (dependency lain,
  // modules/asset/investasi.js) dimuat BELAKANGAN di bundle ini (blok
  // asset di bawah) — TIDAK masalah krn hanya dipanggil di dalam method
  // (runtime, setelah seluruh bundle selesai di-parse), pola sama persis
  // forward-reference `goalAdapterList` di financial-goal-api.js.
  'modules/finance/investment-planner-api.js',
  'modules/finance/investment-planner-presenter.js',

  // Sesi 96 (Batch 10): Debt Optimizer Foundation — ditaruh SETELAH
  // investment-planner-*.js, bareng grouping per-domain finance.
  // `Debt`/`DebtStrategy` (dependency, modules/finance/piutang-utang.js)
  // sudah dimuat lebih dulu (di atas, awal GROUP_A) — TIDAK perlu
  // forward-reference sama sekali (beda dari investment-planner-api.js
  // yang forward-reference `Investment`).
  'modules/finance/debt-optimizer-api.js',
  'modules/finance/debt-optimizer-presenter.js',

  // Sesi 97 (Batch 10): Retirement Planner Foundation — ditaruh SETELAH
  // debt-optimizer-*.js, bareng grouping per-domain finance. `Pensiun`
  // (dependency, modules/shared/modules-calc.js) sudah dimuat lebih
  // dulu (awal GROUP_A, baris kedua) — TIDAK perlu forward-reference
  // sama sekali (beda dari investment-planner-api.js yang
  // forward-reference `Investment`).
  'modules/finance/retirement-planner-api.js',
  'modules/finance/retirement-planner-presenter.js',

  // Sesi 98 (Batch 10): Financial Health Score Foundation — ditaruh
  // SETELAH retirement-planner-*.js, bareng grouping per-domain finance.
  // `FinanceIntelligence` (dependency, modules/finance/
  // finance-intelligence.js) sudah dimuat lebih dulu (awal GROUP_A) —
  // TIDAK perlu forward-reference sama sekali (beda dari
  // investment-planner-api.js yang forward-reference `Investment`).
  'modules/finance/financial-health-score-api.js',
  'modules/finance/financial-health-score-presenter.js',

  // Sesi 99 (Batch 10): Financial Risk Dashboard — ditaruh SETELAH
  // financial-health-score-*.js, bareng grouping per-domain finance.
  // Dependency `DebtOptimizerAPI`/`FinancialHealthScoreAPI`/
  // `FinanceIntelligence` semuanya sudah dimuat lebih dulu (di atas) —
  // TIDAK perlu forward-reference. Pola sama persis forward-reference `Investment` di
  // investment-planner-api.js.
  'modules/finance/financial-risk-dashboard-api.js',
  'modules/finance/financial-risk-dashboard-presenter.js',
  'modules/vehicle/vehicle-intelligence.js',
  'modules/vehicle/vehicle-dashboard.js',
  'modules/vehicle/vehicle-reminder.js',
  'modules/vehicle/vehicle-notif-bridge.js',
  'modules/vehicle/vehicle-ai-hook.js',
  'modules/vehicle/vehicle-insight-presenter.js',
  'modules/vehicle/vehicle-daily-brief.js',
  'modules/vehicle/vehicle-alert-panel.js',
  'modules/vehicle/vehicle-insight-feed.js',
  'modules/vehicle/vehicle-trend-api.js',
  'modules/vehicle/vehicle-cost-summary.js',
  'modules/vehicle/vehicle-fuel-trend.js',
  'modules/vehicle/vehicle-service-trend.js',
  'modules/vehicle/vehicle-analytics-presenter.js',

  // TASK-141: Fuel Intelligence Card — ditaruh SETELAH vehicle-analytics-
  // presenter.js (dependency: VehicleFuelTrendSummary/VehicleReminder/
  // VehicleIntelligence sudah dimuat lebih dulu, di atas). Urutan
  // internal: storage/engine dulu, lalu 2 presenter section (history/
  // analytics) yang konsumsi-nya, baru modal orchestrator, baru card
  // (yang membuka modal itu) — pola sama persis urutan Vehicle Analytics
  // Foundation (Sesi 81) di atas.
  'modules/vehicle/fuel-storage.js',
  // Fuel State History — ditaruh setelah fuel-storage.js (sama-sama lapisan
  // data domain fuel murni simpan+baca, 0 dependency satu sama lain).
  // Konsumennya (FuelBarCorrection.save() di fuel-intelligence-ui.js &
  // syncFuelStateFromFullTankBbm() di tx-bbm.js/GROUP_B) baca lewat guard
  // typeof di DALAM fungsi masing-masing (dipanggil runtime setelah bundle
  // selesai dimuat) — jadi urutan tepatnya di sini tidak kritikal, ditaruh
  // berdekatan murni supaya lapisan data domain fuel tetap mengelompok.
  'modules/vehicle/fuel-state-history.js',
  // TASK-142: Fuel Tank Profile — ditaruh setelah fuel-storage.js (sama-sama
  // lapisan data domain fuel, 0 dependency satu sama lain) & SEBELUM
  // fuel-intelligence-engine.js (engine baca FuelTankProfile.get() opsional,
  // guard typeof, lihat komentar di file itu).
  'modules/vehicle/fuel-tank-profile.js',
  'modules/vehicle/fuel-intelligence-engine.js',
  // TASK-143: Fuel Gauge Engine — ditaruh setelah fuel-intelligence-engine.js
  // (dependency: FuelTankProfile.get() + fuelEfficiency() global, keduanya
  // sudah dimuat sebelum titik ini) & SEBELUM fuel-history.js (tidak ada
  // dependency ke arah situ, cuma jaga urutan lapisan data domain fuel tetap
  // berdekatan).
  'modules/vehicle/fuel-gauge-engine.js',
  // Sesi 1 asli rencana "Fuel Estimation Auto-Update" (FUEL-AUTOSYNC-04):
  // Fuel State Estimator — ditaruh setelah fuel-gauge-engine.js (dependency:
  // FuelTankProfile.get() + fuelEfficiency() + getVehicleKm() global,
  // semuanya sudah dimuat sebelum titik ini via FuelTankProfile di atas &
  // vehicle-core.js di GROUP_A lebih awal) & SEBELUM fuel-history.js (tidak
  // ada dependency ke arah situ, cuma jaga urutan lapisan data/engine domain
  // fuel tetap berdekatan). FuelStorage (dependency lain) sudah dimuat lebih
  // dulu (awal blok fuel-* ini).
  'modules/vehicle/fuel-state-estimator.js',
  'modules/vehicle/fuel-history.js',
  'modules/vehicle/fuel-analytics.js',
  'modules/vehicle/fuel-modal.js',
  'modules/vehicle/fuel-card.js',
  // Sesi 156d: FuelCard._briefingHtml() (konsolidasi "Fuel Briefing", lihat
  // catatan di fuel-card.js) memanggil FuelInsightEngine.getSummary() lewat
  // guard typeof di DALAM method (runtime, dipanggil dari render() setelah
  // seluruh bundle selesai dimuat) — TIDAK perlu fuel-card.js dipindah ke
  // bawah fuel-insight-engine.js (baris di bawah), pola sama persis forward-
  // reference lain yang sudah dijelaskan di komentar atas (mis. Investment
  // di investment-planner-api.js).
  // TASK-144: Fuel Bar Correction — ditaruh SETELAH fuel-card.js (dependency:
  // FuelGaugeEngine, FuelTankProfile, FuelStorage, FuelCard, FuelModal —
  // semua sudah dimuat sebelum titik ini). Satu file tunggal
  // (fuel-intelligence-ui.js) sesuai TASK-REF-001, bukan dipecah
  // fuel-gauge-ui.js/fuel-bar-correction.js terpisah.
  'modules/vehicle/fuel-intelligence-ui.js',
  // Fuel Tank Profile UI (Atur Tangki) — ditaruh SETELAH fuel-intelligence-ui.js
  // (dependency: FuelBarCorrection.open(), dipanggil balik dari
  // FuelTankProfileUI.save() setelah Simpan sukses kalau modal ini dibuka
  // dari alur Koreksi — lihat komentar di file itu) & SETELAH fuel-card.js
  // (dependency: FuelCard.render(), dipanggil dari save() juga).
  'modules/vehicle/fuel-tank-profile-ui.js',
  // TASK-146: Fuel Consumption Prediction Engine — ditaruh SETELAH
  // fuel-intelligence-ui.js (dependency: FuelGaugeEngine/fuelEfficiency()
  // sudah dimuat di atas, DAN field D.vehicles[i].fuelState yang dibaca
  // engine ini pertama kali DITULIS oleh FuelBarCorrection.save() di file
  // itu — urutan load tidak mengubah runtime behavior krn fuelState cuma
  // dibaca saat method dipanggil, bukan saat file di-load, tapi ditaruh
  // berdekatan biar kelompok modul fuel tetap berurutan sesuai
  // dependency logicalnya). Engine-only, 0 UI, PURE/read-only.
  'modules/vehicle/fuel-prediction-engine.js',
  // TASK-147: Fuel Cost Analytics Engine — ditaruh SETELAH
  // fuel-prediction-engine.js (dependency: FuelStorage/fuelEfficiency()/
  // FuelPredictionEngine semua sudah dimuat sebelum titik ini). Engine-only,
  // 0 UI, PURE/read-only — 0 rumus km/L/Rp-per-km/proyeksi baru, 100% REUSE.
  'modules/vehicle/fuel-cost-analytics.js',
  // TASK-148: Fuel Maintenance Intelligence Engine — ditaruh SETELAH
  // fuel-cost-analytics.js (dependency: FuelCostAnalytics/fuelEfficiency()/
  // predictService()/_vehicleFuelEfficiencyDropCheck()/findVehicleSpec()
  // semua sudah dimuat sebelum titik ini). Engine-only, 0 UI, PURE/
  // read-only — 0 rumus km/L/Rp-per-km/servis/degradasi baru, 100% REUSE.
  'modules/vehicle/fuel-maintenance-engine.js',
  // TASK-149: Fuel Insight Engine — ditaruh SETELAH fuel-maintenance-engine.js
  // (dependency: FuelGaugeEngine/FuelPredictionEngine/FuelCostAnalytics/
  // FuelMaintenanceEngine semua sudah dimuat sebelum titik ini). Engine-only,
  // 0 UI, PURE/read-only — 0 rumus km/L/Rp-per-km/servis/degradasi/proyeksi
  // baru, 100% REUSE seluruh engine fuel yang sudah ada.
  'modules/vehicle/fuel-insight-engine.js',
  // TASK-151A: Fuel Fleet Brief Selector — ditaruh SETELAH
  // fuel-insight-engine.js (dependency: FuelInsightEngine.getSummary()
  // sudah dimuat sebelum titik ini). Presentation helper only, 0 UI, PURE/
  // read-only — 0 kalkulasi bisnis baru, 100% REUSE
  // FuelInsightEngine.getSummary()/highestInsight + curVehicleId (global
  // SUDAH ADA) utk tie-breaker "kendaraan aktif". Menutup gap TASK-151
  // (Fuel AI Daily Briefing Integration, di-STOP sesi sebelumnya).
  'modules/vehicle/fuel-fleet-selector.js',
  // TASK-153: Fuel Notification & Reminder — ditaruh SETELAH
  // fuel-fleet-selector.js (dependency: FuelInsightEngine.getInsights()
  // sudah dimuat sebelum titik ini; FuelModal, dipakai lewat guard typeof
  // di reminder-notif.js checkAndFireReminders() saat notifikasi diklik,
  // sudah dimuat lebih awal di modul fuel-modal.js di atas). Translator
  // murni, 0 UI, PURE/read-only — 0 ambang/rumus reserve/efisiensi/risiko/
  // prediksi baru, 100% REUSE FuelInsightEngine.getInsights(). Pola SAMA
  // PERSIS modules/vehicle/vehicle-notif-bridge.js (Sesi 84).
  'modules/vehicle/fuel-notif-bridge.js',
  // TASK-150: Fuel Dashboard Integration — ditaruh SETELAH
  // fuel-notif-bridge.js (dependency: FuelInsightEngine.getSummary()/
  // FuelModal/FuelBarCorrection semua sudah dimuat sebelum titik ini).
  // UI presenter only, 0 rumus/skoring baru — 100% REUSE
  // FuelInsightEngine.getSummary() + FuelModal.open()/
  // FuelBarCorrection.open() yang sudah ada. Mengelola kendaraan aktifnya
  // sendiri (this.curVehicleId) supaya TIDAK menyentuh FuelFleetSelector
  // ataupun FuelInsightEngine sama sekali (batasan task).
  'modules/vehicle/fuel-dashboard.js',
  // TASK-154: Multi Vehicle Fuel Comparison — ditaruh SETELAH
  // fuel-dashboard.js (dependency: FuelInsightEngine.getSummary()/
  // FuelFleetSelector.selectVehicle()/FuelModal.open() semua sudah dimuat
  // sebelum titik ini). Presentation only, 0 engine/storage baru — 100%
  // REUSE FuelInsightEngine.getSummary() (per kendaraan) +
  // FuelFleetSelector.selectVehicle() (badge prioritas fleet-wide) +
  // FuelModal.open() (buka modal saat kendaraan dipilih).
  'modules/vehicle/fuel-compare.js',
  // TASK-156: Fuel Trend Dashboard — ditaruh SETELAH fuel-compare.js
  // (dependency: FuelInsightEngine.getSummary()/FuelCostAnalytics/
  // FuelPredictionEngine/FuelMaintenanceEngine/FuelModal.open()/
  // FuelBarCorrection.open() semua sudah dimuat sebelum titik ini).
  // Presentation only, 0 engine/helper/storage/rumus baru — 100% REUSE
  // FuelInsightEngine.getSummary() (healthScore/highestInsight) +
  // FuelCostAnalytics (biaya aktual & proyeksi/rata-rata harga/frekuensi
  // isi) + FuelPredictionEngine (jarak tersisa/isi ulang berikutnya/
  // proyeksi pemakaian) + FuelMaintenanceEngine (status efisiensi &
  // dropPct/risiko perawatan/rekomendasi) yang SEMUANYA dipanggil LANGSUNG
  // (bukan hanya lewat FuelInsightEngine.getSummary()) supaya field trend
  // granular yang tidak diekspos getSummary() tetap 100% dibaca apa
  // adanya. Mengelola kendaraan aktifnya sendiri (this.curVehicleId),
  // TIDAK menyentuh FuelFleetSelector maupun engine mana pun.
  'modules/vehicle/fuel-trend-dashboard.js',

  'modules/vehicle/vehicle-decision-api.js',
  'modules/vehicle/vehicle-recommendation-engine.js',
  'modules/vehicle/vehicle-priority-scoring.js',
  'modules/vehicle/vehicle-action-recommendation.js',
  'modules/vehicle/vehicle-decision-presenter.js',
  // Sesi 156b: Vehicle Attention Card — gabungan VehicleAlertPanel/
  // VehicleInsightFeed/VehicleDecisionPresenter jadi satu card ranked.
  // Ditaruh SETELAH vehicle-decision-presenter.js (dependency:
  // VehicleRecommendationEngine/VehiclePriorityScoring/
  // VehicleActionRecommendation di atas + VehicleAIHook, lebih jauh di
  // atas, semua sudah dimuat sebelum titik ini).
  'modules/vehicle/vehicle-attention-presenter.js',
  'modules/vehicle/vehicle-automation-api.js',
  'modules/vehicle/vehicle-reminder-scheduler.js',
  'modules/vehicle/vehicle-maintenance-automation.js',
  'modules/vehicle/vehicle-tax-document-automation.js',
  'modules/vehicle/vehicle-automation-presenter.js',

  // Sesi 87 (Batch 8): Finance & Vehicle Cross Integration Foundation —
  // ditaruh SETELAH seluruh modul finance/vehicle (dependency: butuh
  // FinanceDashboard/FinanceIntelligence & VehicleAIHook/
  // VehicleIntelligence sudah dimuat lebih dulu), sebelum app-bootstrap.js.
  'modules/cross/finance-vehicle-cross-summary.js',
  'modules/cross/cross-ai-hook.js',
  'modules/cross/cross-dashboard-card.js',
  'modules/cross/cross-insight-presenter.js',

  // Sesi 88 (Batch 8): Unified AI Briefing Foundation — ditaruh SETELAH
  // cross-ai-hook.js (dependency: butuh CrossAIHook sudah dimuat lebih
  // dulu), sebelum app-bootstrap.js.
  'modules/cross/unified-summary-api.js',
  'modules/cross/unified-ai-briefing.js',
  'modules/cross/unified-briefing-presenter.js',

  // Sesi 89 (Batch 8): Personal Life Dashboard Foundation — ditaruh
  // SETELAH unified-briefing-presenter.js (dependency: butuh
  // UnifiedSummaryAPI/UnifiedAIBriefing sudah dimuat lebih dulu), sebelum
  // app-bootstrap.js. Urutan internal: summary API dulu, lalu 3 presenter
  // yang konsumsi-nya, baru orchestrator (UnifiedDashboardHome) yang
  // memanggil ketiga presenter itu.
  // HOUSEKEEPING (audit registrasi build.js, pola sama persis S592
  // owner-registry-settings-ui.js / service-interval-sot.js di atas):
  // PiutangUtangReminder & TagihanReminder sudah lama punya kode + test
  // sendiri (tests/piutang-utang-reminder*.test.js, tests/tagihan-
  // reminder.test.js) DAN sudah dipanggil dari life-dashboard-summary-
  // api.js (di bawah) lewat guard typeof — TAPI source-nya sendiri TIDAK
  // PERNAH terdaftar di sini, jadi guard itu diam-diam selalu jatuh ke
  // fallback kosong di produksi. Ditaruh SEBELUM life-dashboard-summary-
  // api.js (consumer-nya). Dependency: daysUntilDate() (vehicle-core.js)
  // & billNextDueLocalMidnight()/getBillPaidThisPeriodInfo() (tagihan-
  // kalender.js) sudah dimuat lebih dulu di atas (guard typeof, tidak
  // wajib urutan tapi sudah aman).
  'modules/finance/piutang-utang-reminder.js',
  'modules/finance/tagihan-reminder.js',
  'modules/cross/life-dashboard-summary-api.js',
  'modules/cross/priority-engine.js',
  'modules/cross/personal-overview-presenter.js',
  'modules/cross/cross-module-widgets.js',
  'modules/cross/life-priority-panel.js',
  'modules/cross/unified-dashboard-home.js',

  // Sesi 90 (Batch 8): Personal Decision Center Foundation — ditaruh
  // SETELAH unified-dashboard-home.js (dependency: DecisionCenterAPI
  // butuh LifeDashboardSummaryAPI/PriorityEngine sudah dimuat lebih
  // dulu, keduanya di atas). Urutan internal: data API dulu, lalu 2
  // presenter yang konsumsi-nya, baru orchestrator (DecisionCenterHome)
  // yang memanggil keduanya.
  'modules/cross/decision-center-api.js',
  'modules/cross/recommendation-panel.js',
  'modules/cross/action-queue.js',
  'modules/cross/decision-center-home.js',
  'app-bootstrap.js',
  'modules/shared/feature-icons.js',
  'modules/dashboard-hub/dashboard-hub-registry.js',
  'modules/dashboard-hub/dashboard-hub.js',
  'modules/dashboard-hub/dashboard-hub-search.js',
  'modules/dashboard-hub/dashboard-hub-favorit.js',
  'modules/dashboard-hub/dashboard-hub-favorit-view.js',

  // S129 (Dashboard Settings): dashboard-hub-settings.js ditaruh SETELAH
  // dashboard-hub-registry.js/dashboard-hub.js/modules-render.js (dependency:
  // DashboardSettings.applyDashCardOrder()/renderDashCardOrderUI() butuh
  // DASH_CARD_BY_KEY/DASH_RENDER_ORDER dari modules-render.js — sudah dimuat
  // lebih dulu, lihat GROUP_A). Tidak ada file lain yang bergantung ke file
  // ini saat load time (cuma dipanggil via typeof-guard dari
  // renderDashboard()/renderSettings()/DashboardHub.render()), jadi aman
  // ditaruh di titik manapun SETELAH dependency-nya.
  'modules/dashboard-hub/dashboard-hub-settings.js',
  // Dashboard Insight Dedup: presentation-only consolidation; keeps source engines/APIs intact.
  'modules/dashboard-hub/dashboard-insight-dedup.js',
  'modules/ai/ai-command-center.js',
  'modules/self-reward/self-reward-engine.js',
  'modules/self-reward/self-reward-view.js',
  'modules/self-reward/self-reward-ai-widget.js',
  'modules/asset/investasi.js',

  // S464: UI modal "⚖️ Atur Porsi Kepemilikan" utk holding investasi (AUD-008 lanjutan S462) —
  // ditaruh TEPAT SETELAH investasi.js (dependency: InvestmentUI.openOwnersModal()/saveOwners()
  // butuh `Investment` sudah dimuat lebih dulu, pola sama persis aset.js -> Aset yang dipakainya
  // sendiri, tapi di sini engine & UI-nya dipisah 2 file — lihat komentar header investasi-view.js).
  'modules/asset/investasi-view.js',

  // S466: halaman/tab "💹 Investasi" (Fase 1, BUG-INV-001 Opsi 3 — lihat
  // AUDIT-BUILD-UI-INVESTASI-OPSI3.md) — ditaruh TEPAT SETELAH investasi.js (dependency:
  // InvestmentListUI.render()/save()/openModal() butuh `Investment`/`INVESTMENT_TYPES` sudah
  // dimuat lebih dulu) DAN setelah investasi-view.js (dependency:
  // InvestmentListUI.openOwnersModalForEdit() butuh `InvestmentUI` sudah dimuat lebih dulu —
  // pola sama persis urutan aset.js -> investasi.js -> investasi-view.js di atas).
  'modules/asset/investasi-list-view.js',

  // S467: Fase 2 (UI Transaksi Beli/Jual/Dividen, §3.3 AUDIT-BUILD-UI-INVESTASI-OPSI3.md) &
  // Fase 3 (UI Watchlist, §3.5) — ditaruh TEPAT SETELAH investasi-list-view.js (dependency:
  // InvestmentTxUI.openFromEdit() butuh `InvestmentListUI.editId`, dan
  // InvestmentListUI.render() sekarang juga memanggil `InvestmentWatchUI.render()` — lihat
  // komentar di kepala kedua file). Keduanya sudah butuh `Investment`/`INVESTMENT_TYPES`
  // (investasi.js) & `InvestmentListUI` (investasi-list-view.js) dimuat lebih dulu, jadi
  // urutan ini WAJIB tepat setelah investasi-list-view.js, bukan sebelumnya.
  'modules/asset/investasi-tx-view.js',
  'modules/asset/investasi-watch-view.js',

  // S101 (Batch 10): Asset Portfolio Foundation — ditaruh SETELAH
  // investasi.js (dependency: AssetPortfolioAPI._investment() butuh
  // `Investment` sudah dimuat lebih dulu). `Aset` (aset.js)/
  // `totalSaldoAkun` (akun.js)/`Kekayaan` (modules-calc.js) sudah dimuat
  // lebih dulu (GROUP_A) — TIDAK perlu forward-reference utk ketiganya,
  // pola sama persis debt-optimizer-api.js/retirement-planner-api.js
  // yang dependency-nya juga sudah dimuat lebih dulu.
  'modules/asset/asset-portfolio-api.js',

  // Presenter Sesi 132 (audit): ditaruh langsung setelah API-nya, pola
  // sama persis debt-optimizer-api.js -> debt-optimizer-presenter.js.
  'modules/asset/asset-portfolio-presenter.js',

  // --- LifeOS: layer orkestrasi read-only di atas D (lihat
  // lifeos-data-model.md). Urutan WAJIB: store -> registry -> link-registry
  // -> adapters -> services -> ui. Jangan diacak / disisipkan di tempat lain.
  'lifeos/lifeos-store.js',
  'lifeos/lifeos-registry.js',
  'lifeos/lifeos-link-registry.js',
  'lifeos/plugins/lifeos-plugin-manifest.js',
  'lifeos/plugins/lifeos-plugin-validation.js',
  'lifeos/plugins/lifeos-plugin-registry.js',
  'lifeos/plugins/lifeos-plugin-loader.js',
  'lifeos/plugins/lifeos-plugin-runtime.js',
  'lifeos/adapters/area-adapter.js',
  'lifeos/adapters/goal-adapter.js',
  'lifeos/adapters/project-adapter.js',
  'lifeos/adapters/today-adapter.js',
  'lifeos/adapters/review-adapter.js',
  'lifeos/adapters/knowledge-adapter.js',
  'lifeos/lifeos-object-ref.js',
  'lifeos/services/project-service.js',
  'lifeos/services/review-service.js',
  'lifeos/services/knowledge-service.js',
  'lifeos/services/life-object-service.js',
  'lifeos/ui/lifeos-home.js',
  'lifeos/ui/areas.js',
  'lifeos/ui/today.js',
  'lifeos/ui/goals.js',
  'lifeos/ui/projects.js',
  'lifeos/ui/review.js',
  'lifeos/ui/life-objects.js',
  'lifeos/ui/plugins.js',
  'lifeos/ui/knowledge.js',
  'lifeos/lifeos-nav.js',

  // --- Economic Intelligence Engine (EIE): layer orkestrasi read-only di
  // atas D + LifeOS (lihat Economic-Intelligence-Engine-Technical-Design.md).
  // Fase 1 MVP: engine/data saja, TANPA UI/notifikasi aktif ("senyap") —
  // urutan WAJIB: bus -> store -> domain -> adapters -> rules -> engine ->
  // services -> scheduler -> registry (paling akhir, lihat eie-registry.js).
  'economic-intelligence/eie-bus.js',
  'economic-intelligence/eie-store.js',
  'economic-intelligence/domain/entities.js',
  'economic-intelligence/domain/scoring-formulas.js',
  'economic-intelligence/domain/status-classifier.js',
  'economic-intelligence/adapters/user-finance-adapter.js',
  'economic-intelligence/adapters/macro-data-adapter.js',
  'economic-intelligence/rules/rule-schema.js',
  'economic-intelligence/rules/rule-definitions.js',
  'economic-intelligence/engine/rule-engine.js',
  'economic-intelligence/engine/scoring-engine.js',
  'economic-intelligence/engine/insight-generator.js',
  'economic-intelligence/services/macro-sync-service.js',
  'economic-intelligence/services/notification-service.js',
  'economic-intelligence/services/recommendation-service.js',
  'economic-intelligence/scheduler/eie-scheduler.js',
  'economic-intelligence/ui/eie-dashboard.js',
  'economic-intelligence/ui/eie-insight-feed.js',
  'economic-intelligence/ui/eie-notif-settings.js',
  'economic-intelligence/eie-registry.js',

  // --- Smart Delivery Engine: AI decision layer + logistics layer, semua
  // additive (lihat RENCANA-SESI-RINGKAS.md). Sesi 1 MVP: cuma fondasi
  // (bus + storage + context), TANPA fitur, TANPA wiring ke modul lain.
  // Urutan file sesi berikutnya WAJIB ditambah SETELAH ai-core.js (decision
  // engine & service butuh AIBus/AIStore/AIContext sudah ada).
  'modules/ai/ai-core.js',
  'modules/ai/ai-decision-engine.js',
  'modules/ai/ai-service.js',

  // Sesi 3/6: logistics-engine.js/logistics-service.js TIDAK butuh ai-core
  // dkk di atas (murni baca OngkirCalc/PriceReko dari GROUP_A +
  // estimateRpPerKm dari modules/vehicle/vehicle-core.js, keduanya sudah
  // dimuat lebih dulu) — ditaruh sesudah AI cuma supaya semua "Smart
  // Delivery Engine" berurutan di satu tempat, bukan karena ketergantungan.
  'modules/logistics/logistics-engine.js',
  'modules/logistics/logistics-service.js',

  // S198 (Business Engine untuk Shop): PurchaseEngine/TripEngine/
  // InventoryEngine/ProfitEngine — TARGET EKSPLISIT USER: "Buat Business
  // Engine untuk Shop. Reuse seluruh Shop existing. Jangan ubah business
  // logic. Jangan implementasi ke modul lain. Jangan refactor... Belum
  // digunakan UI. Belum dihubungkan ke Shop." Ditaruh SETELAH seluruh
  // modules/shop/cobek-*.js (GROUP_A) & LogisticsEngine di atas (semua 4
  // engine ini memanggil fungsi dari file-file itu, mis. calculateProfit/
  // calculateVehicleCapacity/weightCalculator/Etalase.*/StockRekoWidget.*)
  // supaya 0 forward-reference. Murni terdaftar biar ikut ter-bundle
  // (sama pola ownership-engine.js S191 & logistics-engine.js Sesi 3) —
  // TIDAK dipanggil dari cobek-*.js atau modul lain mana pun sesi ini.
  'modules/shop/purchase-engine.js',
  'modules/shop/trip-engine.js',
  'modules/shop/inventory-engine.js',
  // HOUSEKEEPING (audit registrasi build.js, pola sama persis reminder
  // finance di atas): ShopRestockReminder sudah lama punya kode + test
  // sendiri (tests/shop-restock-reminder.test.js) DAN sudah dipanggil
  // dari life-dashboard-summary-api.js lewat guard typeof — TAPI
  // source-nya sendiri TIDAK PERNAH terdaftar di sini. Ditaruh SETELAH
  // inventory-engine.js (dependency wajib: restockReminders() memanggil
  // InventoryEngine.restockScan() langsung, guard typeof). Load-order
  // relatif ke life-dashboard-summary-api.js (di atas, GROUP_B) tidak
  // wajib krn ShopRestockReminder.summary() cuma dipanggil lazy saat
  // runtime, bukan saat file di-parse.
  'modules/shop/shop-restock-reminder.js',
  'modules/shop/profit-engine.js',

  // Generic Shop Engine Tahap 1 (Generic Domain Layer, lanjutan
  // AUDIT-PRA-IMPLEMENTASI-GENERIC-SHOP-ENGINE.md +
  // ARSITEKTUR-SHOP-ENGINE-GENERIC.md): CategoryStore/SupplierStore/
  // AttributeStore/ProductStore/PricingService/InventoryService — SAMA
  // POLA 4 engine S198 di atas (pure wrapper, additive, belum dihubungkan
  // ke UI/modul lain). Ditaruh SETELAH PurchaseEngine/InventoryEngine/
  // ProfitEngine (pricing-service.js & inventory-service.js delegasi ke
  // ProfitEngine/InventoryEngine) & SETELAH GROUP_A/ownership-engine.js
  // (product-store.js pakai isProductOwnershipSelf) — 0 forward-reference.
  // Urutan internal: category/supplier/attribute/product dulu (saling lepas,
  // cuma butuh D), baru pricing/inventory (butuh Profit/InventoryEngine di
  // atas + product-store tidak wajib tapi ditaruh duluan biar konsisten).
  'modules/shop/generic/category-store.js',
  'modules/shop/generic/supplier-store.js',
  'modules/shop/generic/attribute-store.js',
  'modules/shop/generic/product-store.js',
  'modules/shop/generic/pricing-service.js',
  'modules/shop/generic/inventory-service.js',

  // Generic Shop Engine Tahap 4 (Product CRUD Layer, PURE, lanjutan Tahap
  // 1-3 di atas): ProductRepository — createProduct()/updateProduct()/
  // cloneProduct()/saveProduct(). Ditaruh SETELAH attribute-store.js/
  // product-store.js (dipakai utk auto-route field atribut & default
  // ownership) di blok yang sama — 0 forward-reference. SAMA POLA Tahap 1-3:
  // pure wrapper, additive, BELUM dihubungkan ke UI/Etalase.save()/modul
  // lain mana pun sesi ini (lihat LAPORAN-TAHAP4-GENERIC-SHOP-ENGINE.md).
  'modules/shop/shop-inventory-ledger.js',
  'modules/shop/generic/product-repository.js',

  // S203 (Continue — Delivery Plan UI): DeliveryPlanUI, presenter yang
  // menutup gap TripEngine "Belum digunakan UI" dari S198 di atas. Ditaruh
  // langsung setelah TripEngine (0 forward-reference: TripEngine sudah
  // dimuat baris sebelumnya, requestAIRecommendation/calculateSmartDelivery
  // sudah dimuat lebih dulu lewat GROUP_A/cobek-order.js).
  'modules/shop/delivery-plan-ui.js',

  // S199 (Finalisasi Integrasi Shop): ShopBusinessEnginePresenter — menutup
  // gap "Belum digunakan UI. Belum dihubungkan ke Shop." dari S198 di atas.
  // Ditaruh langsung setelah ke-4 engine (pola sama persis
  // property-management-api.js -> -presenter.js / dana-kelolaan.js ->
  // -presenter.js) — 0 forward-reference (InventoryEngine/PurchaseEngine/
  // ProfitEngine sudah dimuat baris sebelumnya, isCobekOwnershipSelf sudah
  // dimuat lebih dulu di GROUP_A lewat ownership-engine.js).
  'modules/shop/shop-business-engine-presenter.js',

  // S204-A: TripPresenter — menutup gap yang dicatat eksplisit di
  // shop-business-engine-presenter.js ("TripEngine tidak dipakai di sini
  // ... tidak ada ringkasan pengiriman yang relevan ditampilkan di
  // Dashboard/Laporan"). Ditaruh langsung setelah ShopBusinessEnginePresenter
  // (0 forward-reference: TripEngine sudah dimuat 2 baris di atas,
  // isCobekOwnershipSelf & getAIDeliveryThinMarginThreshold sudah dimuat
  // lebih dulu lewat GROUP_A/ownership-engine.js/cobek-pricing.js).
  'modules/shop/trip-presenter.js',

  // Audit ukuran file: business-flow-presenter.js dipecah jadi 2 file agar
  // di bawah OVERSIZED_FILE_LINE_THRESHOLD. Bagian Purchase Order/Movement/
  // Inventory Transfer/Modal UI-nya (BusinessFlowPresenterInventoryMixin)
  // HARUS dimuat SEBELUM business-flow-presenter.js karena file itu
  // Object.assign() mixin ini ke object BusinessFlowPresenter di akhirnya.
  'modules/shop/business-flow-presenter-inventory.js',

  // S205: BusinessFlowPresenter — WIRE ONLY, menyusun 4 tahap alur bisnis
  // Purchase->Trip->Stock->Sale dari ShopBusinessEnginePresenter.summary()
  // + TripPresenter.summary() (2 baris di atas) — 0 engine/rumus baru.
  // Ditaruh langsung setelah TripPresenter (0 forward-reference: kedua
  // presenter sumber sudah dimuat baris-baris sebelumnya).
  'modules/shop/business-flow-presenter.js',

  // S251 (Business Intelligence tab, lanjutan S250): BusinessIntelligencePresenter
  // — Health Score/Decision Panel/Trend Analytics/Executive Summary/AI Insight,
  // 100% REPACKAGING dari ShopBusinessEnginePresenter/TripPresenter/
  // BusinessFlowPresenter (baris2 di atas)/InventoryEngine/PurchaseEngine/
  // ProfitEngine/ShopInsight — SEMUA sudah dimuat lebih dulu (GROUP_A lewat
  // feature-insights.js/ownership-engine.js + baris2 GROUP_B di atas), 0
  // forward-reference. Ditaruh langsung setelah BusinessFlowPresenter, pola
  // sama persis presenter-di-atas-presenter lain di blok ini.
  // Sesi 15 Tahap 1b (lazy-load, DESIGN_lazy-load-modules.md):
  // business-intelligence-presenter.js SENGAJA dikeluarkan dari GROUP_B --
  // tidak lagi ikut ter-bundle ke app-bundle-b.min.js. File-nya sekarang
  // dimuat on-demand lewat _loadScriptOnce()/ensureBusinessIntelligence()
  // (index.html) saat tab Shop > Business Intelligence pertama dibuka
  // (lihat setShopTab() di cobek-io.js). Kedua titik panggil di luar modul
  // ini SUDAH punya guard typeof sejak awal (Tahap 1a otomatis terpenuhi,
  // tidak perlu perubahan tambahan) — dan modul ini TIDAK pernah masuk
  // Object.assign(window,{...}) di app-bootstrap.js, jadi tidak perlu
  // self-registrasi window.X=X seperti Renov/SewaKios.


  // nilai per-entity yang sudah ada di akun.js/aset.js/investasi.js/
  // cobek-order.js — SEMUA sudah dimuat lebih dulu (GROUP_A + GROUP_B di
  // atas), jadi 0 forward-reference. Presenter langsung setelah engine-nya,
  // pola sama persis property-management-api.js -> -presenter.js.
  'modules/finance/dana-kelolaan.js',
  'modules/finance/dana-kelolaan-presenter.js',

  // titipan-reconcile.js (Rekomendasi #2 audit S582 closeout) — modul audit
  // PURE/baca-saja, bandingkan "harusnya ada" (a.owners[] via
  // MultiOwnerEngine, pola sync PERSIS _syncOwnerDebts() di aset.js) vs
  // "tercatat" (D.debts ber-linkedAssetId/linkedOwnerId). Ditaruh SETELAH
  // multi-owner-engine.js (dependency wajib lewat guard typeof, sama pola
  // asset-ownership-split-presenter.js di atas) — 0 mutasi ke D.assets/
  // D.debts, 0 risiko regresi. Dipanggil dari smoke-test.js (dev mode).
  'modules/finance/titipan-reconcile.js',

  // titipan-sync.js (S583 sesi-10a/10b, Rekomendasi #1) — TitipanSync.
  // reconcile(a): gerbang tunggal yang membungkus Aset._syncOwnerDebts(a),
  // menggantikan 5 call site guard-copy-paste tersebar (aset.js x4,
  // akun.js x1, lihat PATCH-NOTES sesi-10b). BEDA dependency dari
  // titipan-reconcile.js di atas: modul ini WAJIB dimuat SETELAH
  // modules/asset/aset.js (bukan cuma dependency konseptual/guard typeof
  // biasa) karena reconcile() memanggil Aset._syncOwnerDebts() langsung
  // dari titik pemanggilnya di aset.js/akun.js sendiri — aset.js/akun.js
  // sudah dimuat lebih dulu di GROUP_A di atas, jadi urutan ini aman (0
  // forward-reference).
  'modules/finance/titipan-sync.js',

  // === POOL INTEGRATION START (Sesi 6 — MASTER_HANDOFF_DANA_TITIPAN_POOL_PORSI.md §15) ===
  // `dana-titipan-pool-api.js` — object independen (`DanaTitipanPoolAPI`,
  // §14), 0 dependency ke commitment/aggregation. WAJIB dimuat SEBELUM
  // `dana-titipan-commitment-return-api.js` karena guard di
  // `saveCommitment()` (§8) memanggil `DanaTitipanPoolAPI.poolMasukTotal()`/
  // `.getEntries()` (read-only cross-call) saat file itu dieksekusi.
  // Rollback: hapus baris ini saja dari registrasi (§22 Rollback Strategy),
  // tidak ada dependency masuk ke file lain sebelum guard commitment.
  'modules/finance/dana-titipan-pool-api.js',
  // === POOL INTEGRATION END ===

  // R5 REALISASI (sesi ini, gantikan 1 entry monolit lama
  // `dana-titipan-portfolio-presenter.js`, 1789 baris, DIHAPUS — lihat
  // FIX-s598-r5-presenter-split-realized.md) — proyeksi read-only
  // per-owner/per-holding (pokok teralokasi/nilai sekarang/P&L), 100%
  // reuse Investment.getOwners()/holdingCost()/holdingValue()/
  // holdingGainLoss() + MultiOwnerEngine.splitByPorsi() (SEMUA sudah
  // dimuat di atas). Ditaruh setelah dana-kelolaan-presenter.js karena
  // memang tidak bergantung padanya (dependency langsung ke Investment/
  // MultiOwnerEngine saja), tapi secara konsep melengkapi kartu Dana
  // Kelolaan yang sama. 3 file WAJIB berurutan persis seperti ini
  // (file 2 pakai Object.assign ke object file 1; file 3 panggil
  // DanaTitipanPortfolioAPI.xxx() fully-qualified). `dana-titipan-pool-api.js`
  // di atas WAJIB tetap mendahului trio ini (lihat §15 Master Handoff):
  'modules/finance/dana-titipan-aggregation-api.js',
  'modules/finance/dana-titipan-commitment-return-api.js',
  'modules/finance/dana-titipan-portfolio-render.js',
  // SESI FIX-2026-09-01 (fitur "🔀 Alihkan sisa ke aset lain", lihat header file itu utk
  // desain lengkap): RealokasiSisaKuota — ditaruh setelah trio Dana Titipan di atas
  // (dependency KONSEPTUAL saja lewat guard typeof, 0 dependency KODE wajib saat load —
  // file ini pure/standalone, cuma baca D/MultiOwnerEngine/Investment/Aset di DALAM method,
  // saat benar-benar dipanggil runtime, bukan saat load). Dipanggil dari
  // Aset.previewRealokasiSisaKuota() (aset-owners.js, GROUP_A) & InvestmentUI.
  // previewRealokasiSisaKuota() (investasi-view.js, GROUP_A) — aman krn GROUP_A & GROUP_B
  // sama-sama sudah termuat penuh sebelum method mana pun sempat dipanggil user.
  'modules/shared/realokasi-sisa-kuota.js',
  // Audit ukuran file (sesi split lanjutan setelah scan-ocr.js):
  // dana-titipan-portfolio-render.js dipecah jadi 2 -- DanaTitipanCommitmentUI/
  // DanaTitipanReturnUI/DanaTitipanPoolUI pindah ke
  // dana-titipan-portfolio-render-b.js. Murni top-level const, tidak
  // di-mixin balik, cukup dimuat SETELAH file utama.
  'modules/finance/dana-titipan-portfolio-render-b.js',

  // titipan-expense-flow.js (Sesi 521-A) — orkestrasi pencatatan
  // pengeluaran Dana Titipan (single & multi-owner), reuse
  // DanaTitipanPortfolioAPI.listExistingOwners()/MultiOwnerEngine.
  // splitByPorsi()/applyTxTitipanLinkageOnSave() (SEMUA sudah dimuat di
  // atas). Ditaruh langsung setelah split file dana-titipan di atas
  // karena bergantung pada DanaTitipanPortfolioAPI yang didefinisikan/
  // dilengkapi di sana.
  'modules/finance/titipan-expense-flow.js',
  // titipan-expense-ui.js (Sesi 521-B2) — controller DOM tipis modal
  // `titipanExpenseModal` (HTML: modules/shared/modals.js, S521-B1).
  // Bergantung pada TitipanExpenseFlow (baris di atas) +
  // DanaTitipanPortfolioAPI/DanaTitipanPortfolioPresenter — ditaruh
  // setelah keduanya, 0 forward-reference.
  'modules/finance/titipan-expense-ui.js',

  // S529-CORRECTIVE: registrasi 7 file Ride (S522-S528) yang belum
  // pernah terdaftar ke GROUP_A/GROUP_B sejak dibuat -- lihat
  // RIDE-S522-S528-FINAL-AUDIT.md (CRITICAL FINDING). Urutan berikut
  // diverifikasi langsung dari source (grep `typeof Ride[A-Za-z]+`),
  // BUKAN ditebak:
  //   RideActivityMetrics (S522) -- 0 dependency ke module Ride lain.
  'modules/vehicle/ride-activity-metrics.js',
  //   RideGpsRecorder (S523) -- 0 dependency runtime ke module Ride lain
  //   (komentar header menyebut RideActivityMetrics, tapi tidak ada
  //   `typeof RideActivityMetrics` guard/pemanggilan di file ini).
  'modules/vehicle/ride-gps-recorder.js',
  //   RideStorage (S524, S524-C listRides()) -- 0 dependency runtime ke
  //   module Ride lain (sama seperti ride-gps-recorder.js: disebut di
  //   komentar header saja).
  'modules/vehicle/ride-storage.js',
  //   RideUI (S525) -- ditaruh SETELAH ketiga file di atas (dependency:
  //   `typeof RideGpsRecorder`/`typeof RideStorage`/
  //   `typeof RideActivityMetrics` guard di geolocationAvailable()/
  //   listRides()/dst, baris ~95-97 & ~325 & ~366).
  'modules/vehicle/ride-ui.js',
  //   RideMap (S526) -- ditaruh SETELAH ride-activity-metrics.js
  //   (dependency: `typeof RideActivityMetrics` guard opsional di
  //   calculateBoundingBox() fallback, baris ~121-122). Tidak
  //   bergantung pada RideStorage/RideUI meski disebut di komentar.
  'modules/vehicle/ride-map.js',
  //   RideHistory/RideAnalytics (S527) -- ditaruh SETELAH RideStorage &
  //   RideActivityMetrics (dependency: `typeof RideStorage`/
  //   `typeof RideActivityMetrics` guard di baris ~114 & ~147 & ~206).
  'modules/vehicle/ride-history.js',
  //   RideVehicleIntegration (S528) -- ditaruh PALING AKHIR (dependency:
  //   `typeof RideHistory`/`RideHistory.getRideSummary` guard, baris
  //   ~81). Dependency ke fuel-cost-analytics.js/fuel-maintenance-
  //   engine.js (Rp/km, predictService()) sudah dimuat jauh lebih awal
  //   di GROUP_B (lihat blok fuel di atas) -- 0 forward-reference.
  'modules/vehicle/ride-vehicle-integration.js',
];
const ALL_SOURCE = [...GROUP_A, ...GROUP_B];
const HTML_FILES = ['index.html', 'app_production.html'];

function readFile(f) {
  return fs.readFileSync(path.join(ROOT, f), 'utf8');
}
function writeFile(f, content) {
  fs.writeFileSync(path.join(ROOT, f), content);
}

const {
  detectCurrentVersion,
  computeNextVersion,
  bumpVersionEverywhere,
  verifyVersionConstantsSynced,
  buildBundle,
} = require('./build-core')({
  ROOT,
  ALL_SOURCE,
  readFile,
  writeFile,
  fs,
  path,
  computeGroupHash,
  markerLine,
  Buffer,
});

// 4b. Lint: cegah regresi bug "u-dnone (!important) vs style.display"
// Kronologi: .u-dnone dulu pakai `display:none !important`. Banyak card
// dashboard dirender awal dengan class u-dnone di HTML, lalu JS coba
// menampilkannya cuma lewat `el.style.display='block'` tanpa melepas
// class u-dnone-nya -> karena !important, elemen itu PERMANEN
// tersembunyi walau JS sudah "berhasil" jalan tanpa error. Sekarang
// !important sudah dihapus dari CSS, tapi lint ini tetap dijaga supaya
// pola kode yang sama tidak diam-diam masuk lagi di masa depan (misal
// !important ditambah lagi tanpa sadar, atau file source baru meniru
// pola lama tanpa classList.remove/toggle).
// Compatibility marker contract: the unminified bundle header text is intentionally
// kept discoverable from this entrypoint because release-gate tests verify this exact phrase.
// DIBUAT OTOMATIS oleh build.js dari: <source files>

const {
  LINT_REGISTRY,
  runLintRegistry,
  syntaxCheck,
  bumpCacheVersion,
} = require('./build-lints')({
  ROOT,
  HTML_FILES,
  ALL_SOURCE,
  readFile,
  fs,
  path,
  execSync,
});

function preflightPatchManifest() {
  const manifestPath = process.env.PATCH_MANIFEST;
  if (!manifestPath) return;
  const file = path.resolve(ROOT, manifestPath);
  if (!fs.existsSync(file)) throw new Error(`PATCH_MANIFEST tidak ditemukan: ${manifestPath}`);
  const text = fs.readFileSync(file, 'utf8');
  const a=text.lastIndexOf('\nBEGIN_APPLY_FILES\n'), b=text.indexOf('\nEND_APPLY_FILES',a);
  if(a<0 || b<a) throw new Error(`PATCH_MANIFEST ${manifestPath} tidak memiliki blok BEGIN_APPLY_FILES/END_APPLY_FILES`);
  const listed=text.slice(a+'\nBEGIN_APPLY_FILES\n'.length,b).split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
  const missing=listed.filter(rel=>!fs.existsSync(path.join(ROOT,rel)));
  if(missing.length) throw new Error('PATCH PREFLIGHT FAILED — semua file manifest harus sudah diterapkan sebelum build/version bump.\n'+missing.map(x=>'  - '+x).join('\n'));
  console.log(`✓ Patch preflight: ${listed.length} manifest files present (${manifestPath})`);
}

function main() {
  preflightPatchManifest();
  // Canonical Service Master is maintained as JSON; generate the runtime artifact
  // before lint/bundle so checklist consumers never carry a hand-maintained duplicate.
  execSync('node scripts/generate-service-master-data.js', { cwd: ROOT, stdio: 'inherit' });
  runLintRegistry(LINT_REGISTRY);

  // Ambil argumen non-flag pertama sbg explicit version (skip --flag spt --require-minify)
  const explicitVersion = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const oldVersion = detectCurrentVersion();
  const newVersion = computeNextVersion(oldVersion, explicitVersion);

  console.log(`Versi lama : ${oldVersion}`);
  console.log(`Versi baru : ${newVersion}`);
  console.log('');

  const changedFiles = bumpVersionEverywhere(oldVersion, newVersion);
  console.log(`✓ Versi disamakan di ${changedFiles.length} file source: ${changedFiles.join(', ')}`);

  const versionSyncProblems = verifyVersionConstantsSynced(newVersion);
  if (versionSyncProblems.length) {
    console.error(`\n❌ BUILD DIHENTIKAN — ${versionSyncProblems.length} konstanta versi TIDAK sinkron setelah bump:\n`);
    versionSyncProblems.forEach((p) => console.error('  - ' + p));
    console.error(
      '\nPerbaiki manual konstanta di atas supaya nilainya persis \'' + newVersion + '\', ' +
      'lalu jalankan ulang node build.js. (Lihat catatan di verifyVersionConstantsSynced() ' +
      'utk kenapa ini bisa terjadi walau bumpVersionEverywhere() sudah jalan.)'
    );
    process.exit(1);
  }
  console.log('✓ Semua konstanta versi (MODULE_RENDER_VERSION/MODAL_VERSION/MODULE_CALC_VERSION/MODULE_FEATURES_VERSION/APP_BUILD_VERSION/PRODUCTION_BUILD_SYNCED_VERSION) terverifikasi sinkron\n');

  const buildRequireMinify = process.argv.includes('--require-minify') || process.env.REQUIRE_MINIFY === '1';
  const resA = buildBundle(GROUP_A, 'app-bundle-a.min.js', oldVersion, buildRequireMinify);
  const resB = buildBundle(GROUP_B, 'app-bundle-b.min.js', oldVersion, buildRequireMinify);
  console.log(`✓ app-bundle-a.min.js ditulis (${(resA.size / 1024).toFixed(1)} KB${resA.minified ? ', diminify pakai esbuild' : ' — TANPA minifikasi, esbuild tidak ditemukan'})`);
  console.log(`✓ app-bundle-b.min.js ditulis (${(resB.size / 1024).toFixed(1)} KB${resB.minified ? ', diminify pakai esbuild' : ' — TANPA minifikasi, esbuild tidak ditemukan'})`);
  if (resA.backupName || resB.backupName) {
    console.log(`✓ Backup bundle lama disimpan di backups/ (${[resA.backupName, resB.backupName].filter(Boolean).join(', ')})`);
  }

  // Guard: di CI/rilis produksi, esbuild WAJIB ada. Sesi 424: esbuild
  // dipindah dari `optionalDependencies` ke `devDependencies` di
  // package.json -- `optionalDependencies` bisa gagal terpasang secara
  // DIAM-DIAM (mis. platform mismatch) tanpa bikin `npm install` exit
  // non-zero, jadi CI bisa lolos & menghasilkan bundle TANPA minifikasi
  // tanpa ada yang sadar. Sbg `devDependency` biasa, `npm install` yg
  // gagal masang esbuild akan exit non-zero & terlihat jelas. Guard di
  // bawah ini tetap dipertahankan sbg lapis kedua (defense in depth) --
  // aktifkan dgn flag --require-minify atau env REQUIRE_MINIFY=1 (dipakai
  // oleh ci.yml & scripts/release.sh). Build lokal tanpa flag ini tetap
  // boleh fallback ke non-minified seperti biasa (aman utk dev sehari-
  // hari). Utk alur ZIP-per-sesi project ini (docs/ZIP_RULES.md, TIDAK
  // lewat release.sh/git), gate WAJIB yg setara ada di
  // scripts/verify-release-ready.js -- lihat file itu utk detail lengkap
  // kenapa gate terpisah ini perlu (env tanpa git/tanpa akses jaringan).
  if (buildRequireMinify && (!resA.minified || !resB.minified)) {
    console.error(
      '\n❌ BUILD DIHENTIKAN — --require-minify aktif tapi esbuild tidak terdeteksi/tidak jalan,\n' +
      'jadi bundle di atas TIDAK diminify. Ini biasanya berarti `npm install` di environment ini\n' +
      'gagal memasang esbuild (optionalDependencies) secara diam-diam. Cek log `npm install`,\n' +
      'pastikan esbuild benar-benar terpasang, lalu jalankan ulang.'
    );
    process.exit(1);
  }

  console.log('');
  console.log(bumpCacheVersion(newVersion).trim());

  console.log('Mengecek sintaks bundle hasil build...');
  const checkA = syntaxCheck('app-bundle-a.min.js');
  const checkB = syntaxCheck('app-bundle-b.min.js');
  if (!checkA.ok || !checkB.ok) {
    console.error('\n❌ BUILD GAGAL — ada syntax error:');
    if (!checkA.ok) console.error('app-bundle-a.min.js:\n' + checkA.error);
    if (!checkB.ok) console.error('app-bundle-b.min.js:\n' + checkB.error);
    console.error('\nBundle di atas TIDAK ditimpa dgn versi rusak akan tetap ada di disk — cek source-nya dulu sebelum upload.');
    process.exit(1);
  }
  console.log('✓ Sintaks kedua bundle valid (node --check lolos)');

  // Sesi 425 — index.html adalah SATU-SATUNYA sumber kebenaran untuk HTML;
  // app_production.html cuma cermin yang di-generate otomatis di sini. Supaya
  // tidak ada lagi yang tanpa sadar edit app_production.html langsung (edit
  // itu akan HILANG diam-diam di build berikutnya — sebelum sesi ini tidak
  // ada penanda apapun yang bilang begitu), setiap tulis ulang menyisipkan
  // komentar HTML "AUTO-GENERATED" tepat setelah tag <head> pembuka.
  // verify-release-ready.js (Gate 3) memblokir ZIP kalau file ini (setelah
  // komentar ini dilepas) ternyata beda dari index.html — mis. karena lupa
  // `npm run build` sebelum bikin ZIP.
  const AUTOGEN_MARKER =
    '<!-- AUTO-GENERATED oleh scripts/build.js dari index.html — JANGAN edit file ini langsung.\n' +
    '     Edit index.html, lalu jalankan "node scripts/build.js" (file ini disalin ulang otomatis). -->\n';
  const productionContent = readFile('index.html').replace('<head>', '<head>\n' + AUTOGEN_MARKER);
  if (readFile('app_production.html') !== productionContent) {
    writeFile('app_production.html', productionContent);
    console.log('\n✓ app_production.html ditulis ulang jadi cermin index.html (+ penanda AUTO-GENERATED).');
  } else {
    console.log('\n✓ index.html & app_production.html sudah sinkron.');
  }

  console.log(`\n✅ Build "${newVersion}" selesai & lolos cek sintaks. Siap di-upload (jangan lupa upload SEMUA file yang berubah, bukan cuma HTML).`);

  // Regenerate FILE-MAP.md tiap build sukses supaya peta file & fungsi
  // global selalu sinkron dengan source terbaru (lihat catatan di
  // scripts/generate-file-map.js soal kenapa ini dibuat). Dibungkus
  // try/catch: kalau generator ini gagal karena sebab apapun, jangan
  // gagalkan build produksi cuma gara2 dokumentasi bantu gagal digenerate
  // — cukup kasih warning.
  try {
    // eslint-disable-next-line global-require
    const { main: generateFileMap } = require('./generate-file-map');
    generateFileMap();
  } catch (e) {
    console.log(`\n⚠️  FILE-MAP.md gagal digenerate ulang (non-fatal, build tetap lanjut): ${e.message}`);
  }

  // Regenerate COVERAGE-PER-MODULE.md tiap build sukses (S331, poin #3 dari
  // daftar saran maintainability pasca-audit S324, "coverage per modul") —
  // auto-generate dari source (sama pola dgn FILE-MAP.md) supaya angka per
  // family tidak pernah basi & tidak butuh baseline manual terpisah yg harus
  // disinkronkan. Dibungkus try/catch sama spt FILE-MAP.md: gagal generate
  // dokumentasi bantu ini TIDAK boleh menggagalkan build produksi.
  try {
    // eslint-disable-next-line global-require
    const { main: generateCoveragePerModule } = require('./generate-coverage-per-module');
    generateCoveragePerModule();
  } catch (e) {
    console.log(`\n⚠️  COVERAGE-PER-MODULE.md gagal digenerate ulang (non-fatal, build tetap lanjut): ${e.message}`);
  }

  if (!resA.minified) {
    console.log(
      '\nCatatan: esbuild belum terpasang di environment ini, jadi bundle di atas belum diminify\n' +
      '(ukurannya lebih besar dari build sebelumnya, tapi 100% valid & aman dipakai).\n' +
      'Kalau mau ukuran sekecil versi lama, jalankan sekali (butuh internet):\n' +
      '  npm install --save-dev esbuild\n' +
      'lalu jalankan ulang "node build.js" — otomatis kepakai kalau terdeteksi ada.'
    );
  }
}

main();
