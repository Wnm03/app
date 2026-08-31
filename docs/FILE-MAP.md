# FILE-MAP.md — peta file & fungsi global (AUTO-GENERATED, JANGAN EDIT MANUAL)

> Di-generate otomatis oleh `node scripts/generate-file-map.js` — dipanggil
> juga otomatis di akhir setiap `node build.js` yang sukses, jadi peta ini
> SELALU sinkron dengan source terbaru. Kalau kamu (manusia atau Claude sesi
> lain) mau tahu "fungsi X ada di file mana" atau "file Y isinya apa", cek di
> sini dulu SEBELUM grep manual ke puluhan file — jauh lebih cepat & akurat
> daripada dokumen prosa manual (yang gampang basi, lihat `archive/`).
>
> Kalau file ini kelihatan tidak sinkron dengan source (mis. abis rename/split
> file tapi lupa `node build.js`), jalankan ulang generatornya, JANGAN diedit
> tangan — editan manual bakal ketimpa lagi di build berikutnya.

Terakhir digenerate: 2026-08-31T04:21:05.168Z
Total file source: 324 · Total identifier global: 2316

## 1. Urutan load & ringkasan tiap file

Urutan sesuai `GROUP_A`+`GROUP_B` di `build.js` (urutan ini yang dipakai
bundler menggabungkan semua file jadi `app-bundle-a.min.js`/`app-bundle-b.min.js`).

| # | File | Baris | Ringkasan |
|---|------|------:|-----------|
| 1 | `modules/shared/modules-render.js` | 1278 | Fungsi render (85 fungsi) dipisah dari app_production.html untuk pemerataan ukuran file. Dipindah ke modules/shared/modules-render.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & … |
| 2 | `modules/shared/modules-render-b.js` | 1191 | modules/shared/modules-render-b.js — lanjutan modules/shared/modules-render.js (Audit ukuran file, lanjutan S589/s644): file modules-render.js dipecah jadi 2 supaya di bawah OVERSIZED_FILE_LINE_THRESHOLD (1600 baris, … |
| 3 | `modules/shared/modals.js` | 8 | Modal HTML dipisah dari app_production.html untuk pemerataan ukuran file. Dipindah ke modules/shared/modals.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 4 | `modules/shared/modules-calc.js` | 1195 | _(tidak ada komentar header)_ |
| 5 | `modules/shop/cobek-etalase.js` | 893 | Domain Shop bagian Etalase: katalog produk (tambah/edit/hapus, Dipindah ke modules/shop/cobek-etalase.js (Sesi 10 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 6 | `modules/shop/cobek-pricing.js` | 881 | Domain Shop bagian rekomendasi harga & ongkir: PriceReko (kalkulator Dipindah ke modules/shop/cobek-pricing.js (Sesi 10 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, … |
| 7 | `modules/shop/cobek-order.js` | 941 | Domain Shop bagian order & pelanggan: Produsen (supplier), SiapPulang Dipindah ke modules/shop/cobek-order.js (Sesi 10 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, … |
| 8 | `modules/shop/cobek-tx-cart.js` | 615 | Domain Shop bagian integrasi form Transaksi: cart Stok Masuk & Penjualan Dipindah ke modules/shop/cobek-tx-cart.js (Sesi 10 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 9 | `modules/shop/cobek-io.js` | 628 | Domain Shop bagian impor/ekspor: ImportKatalog (impor massal produk+harga Dipindah ke modules/shop/cobek-io.js (Sesi 10 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, … |
| 10 | `modules/business/shop-data-io-api.js` | 657 | Bagian B (Shop Import/Export: Scan/PDF/CSV/JSON) dari DESIGN_torsi-vehicle-selector_shop-import-export-2.md. Bagian B (Scan, Import PDF, Import CSV, Import/Export JSON) SUDAH SELESAI 4/4. Sesi ini (lanjutan opsional, … |
| 11 | `modules/business/kasir.js` | 395 | Modul "🧠 Kasir AI" (v127, kw81-kasir-ai-pos): Dipindah ke modules/business/kasir.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder). Tab … |
| 12 | `modules/finance/piutang-utang.js` | 1054 | Domain Piutang & Utang: catatan piutang (uang dipinjamkan), utang (uang dipinjam) beserta status lunas/cicilan, dan DebtStrategy (simulasi strategi pelunasan Avalanche/Snowball). Dipindah ke … |
| 13 | `modules/finance/pajak-pbb-zakat.js` | 396 | Kalkulator Pajak Bumi & Bangunan (PBB), Zakat (penghasilan, maal, fitrah), Referensi AI (cek harga emas/nisab via AI), Pajak UMKM, dan PPh 21 (Orang Pribadi) Dipindah ke modules/finance/pajak-pbb-zakat.js (Sesi 16 … |
| 14 | `budget.js` | 547 | Anggaran Budget (batas pengeluaran per kategori, tab List/Rekomendasi, drill-down transaksi). Dipisah dari features-budget-laporan-carnotes-pelanggan.js (Sesi 6 restrukturisasi folder, bagian budget/laporan — lihat … |
| 15 | `car-notes.js` | 1341 | Catatan Kendaraan (Car Notes): pajak kendaraan (VEHTAX), log BBM, log servis + pengingat interval, kalkulator Torsi baut. Dipisah dari features-budget-laporan-carnotes-pelanggan.js (Sesi 6 restrukturisasi folder, bagian … |
| 16 | `chat-action-handlers.js` | 107 | Aksi AI Chat/RefAI: label & handler eksekusi usulan aksi dari balasan AI (blok [[ACTION]]). Dipisah dari features-budget-laporan-carnotes-pelanggan.js (Sesi 7 restrukturisasi folder — file lama SELESAI dihapus total, … |
| 17 | `modules/finance/edukasi-dana.js` | 185 | Dana Pendidikan (EduFund): kalkulator target biaya sekolah/kuliah & nabung/bulan Dipindah ke modules/finance/edukasi-dana.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 18 | `modules/home/hidup-seimbang.js` | 228 | Domain Skor Hidup Seimbang: skor gabungan dari Dana Darurat, DSR cicilan, No-Spend 30 hari, & keseimbangan kerja-istirahat, plus riwayat snapshot bulanan. Dipindah ke modules/home/hidup-seimbang.js (Sesi 13 … |
| 19 | `modules/finance/linktx.js` | 264 | Transaksi tertaut (LinkTx): hubungkan transaksi lama di Keuangan ke Renov/Wishlist/Bill Dipindah ke modules/finance/linktx.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 20 | `modules/asset/aset-owners.js` | 1426 | modules/asset/aset-owners.js — Aset: fitur multi-owner / porsi kepemilikan (Owners Modal, rebalance, quota, migrate-to-registry, dll). DIPECAH dari modules/asset/aset.js (audit ukuran file, lanjutan S589 yang sudah … |
| 21 | `modules/asset/aset.js` | 1357 | Domain Aset & Kekayaan (INTI): const Aset={} — Buku Aset, form/modal, CRUD, dashboard, bridge Investasi, export/import Excel, owners split-modal (multi-owner porsi kepemilikan). S589: file ini dipecah dari 1 file 3175 … |
| 22 | `modules/asset/aset-reports.js` | 488 | Domain Aset & Kekayaan (LAPORAN): Penyusutan (estimasi nilai buku aset yg menurun: Garis Lurus/Saldo Menurun/Manual), PajakAset (estimasi PBB properti & Zakat Maal per aset zakatable), LaporanAset (Laporan Aset … |
| 23 | `modules/asset/aset-misc.js` | 871 | Domain Aset & Kekayaan (LAIN-LAIN): ALOKASI_PRESETS/AlokasiAset (rekomendasi alokasi dana), isAssetOwnershipSelf & helper migrasi Investasi, AssetInsight (insight kepemilikan aset), … |
| 24 | `modules/asset/aset-keluarga.js` | 101 | Laporan gabungan lintas-modul: 🏠 Aset Keluarga Dipindah ke modules/asset/aset-keluarga.js (Sesi 9 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder). … |
| 25 | `modules/ai/feature-insights.js` | 447 | Kartu "💡 Insight ..." di PALING ATAS/dekat 7 fitur (Keuangan, Pajak & Dipindah ke modules/ai/feature-insights.js (Sesi 14 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 26 | `modules/asset/invest-ai-widget.js` | 205 | Widget "🤖 Rekomendasi AI" otomatis di kartu 🧭 Dipindah ke modules/asset/invest-ai-widget.js (Sesi 9 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 27 | `modules/asset/penyusutan-ai-widget.js` | 166 | Widget "🤖 Rekomendasi AI" utk kartu 📉 Penyusutan Dipindah ke modules/asset/penyusutan-ai-widget.js (Sesi 9 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 28 | `modules/asset/aset-emas-impor.js` | 396 | FITUR BARU: GoldImport (impor massal nota emas via paste teks ATAU Dipindah ke modules/asset/aset-emas-impor.js (Sesi 9 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, … |
| 29 | `modules/asset/property-management-api.js` | 205 | modules/asset/property-management-api.js — Property Management API (S102, Batch 10). Target sesi: Property Management Foundation. PRINSIP (RULE #1 sesi ini): 100% REUSE modul Asset yang SUDAH ADA — TIDAK ada rumus … |
| 30 | `modules/asset/property-management-presenter.js` | 155 | modules/asset/property-management-presenter.js — Property Management Presenter (Sesi 132, Batch 10 lanjutan). Target sesi: audit menemukan `PropertyManagementAPI` (S102) sudah lengkap + ada test, tapi TIDAK PERNAH … |
| 31 | `modules/asset/rental-management-api.js` | 162 | modules/asset/rental-management-api.js — Rental Management API (S103, Batch 10). Target sesi: Rental Management Foundation. PRINSIP (RULE #1 sesi ini): 100% REUSE modul Asset yang SUDAH ADA — TIDAK ada rumus keuangan … |
| 32 | `modules/asset/rental-management-presenter.js` | 144 | modules/asset/rental-management-presenter.js — Rental Management Presenter (Sesi 132, Batch 10 lanjutan). Target sesi: audit menemukan `RentalManagementAPI` (S103) sudah lengkap + ada test, tapi TIDAK PERNAH dipanggil … |
| 33 | `modules/asset/asset-maintenance-api.js` | 132 | modules/asset/asset-maintenance-api.js — Asset Maintenance API (S104, Batch 10). Target sesi: Asset Maintenance Foundation. PRINSIP (RULE #1 sesi ini): 100% REUSE modul Asset yang SUDAH ADA — TIDAK ada rumus baru, TIDAK … |
| 34 | `modules/asset/asset-maintenance-presenter.js` | 124 | modules/asset/asset-maintenance-presenter.js — Asset Maintenance Presenter (Sesi 132, Batch 10 lanjutan). Target sesi: audit menemukan `AssetMaintenanceAPI` (S104) sudah lengkap + ada test, tapi TIDAK PERNAH dipanggil … |
| 35 | `modules/finance/worthit.js` | 761 | Domain Worth It? & Prioritas Belanja: cek kondisi keuangan sebelum belanja + daftar prioritas barang yang mau dibeli Dipindah ke modules/finance/worthit.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & … |
| 36 | `modules/shared/ripple-position.js` | 64 | ROADMAP-v1.1.md item #8 (KNOWN-ISSUES.md §5.2): ripple berbasis koordinat sentuh/klik ASLI, bukan selalu pulsa dari tengah elemen. Murni aditif: CSS ripple Tahap 7 (styles.css, radial-gradient via ::after) sebelumnya … |
| 37 | `modules/shared/data-default.js` | 70 | Domain Data Default: kategori shop bawaan (DEFAULT_COBEK_KATEGORI), Dipindah ke modules/shared/data-default.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 38 | `modules/shared/ownership-engine.js` | 208 | Ownership Engine (Sesi 191, fondasi lintas-domain). TARGET EKSPLISIT USER: "Implementasikan hanya Ownership Engine. Reuse seluruh modul existing. Jangan ubah business logic. Jangan refactor besar... Buat satu Ownership … |
| 39 | `modules/shared/ownership-settings-presenter.js` | 82 | Sesi 229-230: Settings → Ownership (tampilan read-only 5 tipe kepemilikan). Target eksplisit user: "Reuse existing: OwnershipEngine. No new engine. No business logic changes... Show existing ownership: SELF/INVESTOR/ … |
| 40 | `modules/shared/multi-owner-engine.js` | 416 | Multi-Owner Engine (Sesi 390, fondasi porsi kepemilikan pecahan lintas-domain). TARGET EKSPLISIT USER sesi ini: "audit ownership agar 1 aset bisa dimiliki beberapa orang dengan porsi beda-beda, hitung otomatis … |
| 41 | `modules/shared/owner-registry.js` | 182 | Owner Registry (Sesi 489, langkah 1/5 rencana PLAN-owner-registry-multi-session.md). TARGET: satu sumber kebenaran `ownerId` lintas Aset/Investasi/Titipan. Audit S488 menemukan `assetOwnersModal`/`investmentOwnersModal` … |
| 42 | `modules/shared/owner-registry-settings-ui.js` | 156 | R4 UI wiring (audit ownership/titipan, AUDIT-DANA-TITIPAN-OWNERSHIP-SIMPLIFIKASI.md, menutup OWNREG-GATE3-001 SEPENUHNYA). `OwnerRegistry.rename()`/`merge()` (modules/shared/ owner-registry.js) sudah ditulis & diuji … |
| 43 | `modules/shared/ghost-asset-cleanup-ui.js` | 81 | Sesi 592 (lanjutan patch PATCH-ghost-asset-migrated-investment.md). Patch S591/ghost-asset sudah menyaring record ber-flag `_migratedToInvestmentId` dari dropdown "Kaitkan ke Aset Multi-Owner" (getMultiOwnerAssets(), … |
| 44 | `modules/shared/custodian-registry.js` | 130 | Custodian Registry (Sesi S540-A, Tahap 1/4 DESIGN-S540-CUSTODIAN-GROUPING.md, Design Lock disetujui user dengan keputusan final: Opsi A/registry, seed kosong, 0 backfill, assign manual, build() tidak berubah untuk … |
| 45 | `modules/asset/asset-ownership-split-presenter.js` | 100 | Sesi 391: split keuntungan aset per pemilik berdasarkan porsi (lanjutan Sesi 390, Multi-Owner Engine). Target eksplisit user: "hitung otomatis keuntungan berdasarkan porsi". PRINSIP SESI INI (sama disiplin dgn … |
| 46 | `modules/shared/features-helpers-global-security.js` | 744 | Helper global (migrasi data, state D, save/load, event dispatcher) Dipindah ke modules/shared/features-helpers-global-security.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama … |
| 47 | `modules/shared/action-wrappers.js` | 239 | S264 Security Hardening — wrapper functions untuk eks data-onclick. Semua inline handler (data-onclick + new Function()) diganti data-action yang manggil fungsi bernama di sini. Tidak ada logic baru, cuma re-wrap kode … |
| 48 | `diagnostik-versi.js` | 77 | Domain Diagnostik & Sinkronisasi Versi: snapshot HTML utk self-test (getHtmlSnapshotForSelfTest), cek status sinkron versi produksi vs master (computeProductionSyncStatus), cek status sinkron versi antar file modul … |
| 49 | `modules/shared/format-tema.js` | 241 | Domain Format Angka & Tema: format rupiah singkat (fmt, mis. "Rp 1.5 jt"), Dipindah ke modules/shared/format-tema.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 50 | `modules/shared/error-handler.js` | 39 | Domain Error Handler Global: tangkap error tak tertangani (uncaught error & Dipindah ke modules/shared/error-handler.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 51 | `modules/shared/helper-teks.js` | 26 | Domain Helper Teks & Kalender: escape karakter HTML berbahaya biar aman Dipindah ke modules/shared/helper-teks.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 52 | `modules/shared/keamanan-pin.js` | 457 | Domain Keamanan: layar PIN (showPinScreen/checkPin/pinPress/pinBack/updatePinDots), Dipindah ke modules/shared/keamanan-pin.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama … |
| 53 | `modules/home/refleksi-selfcare.js` | 264 | Domain Refleksi & Self-Care: Jurnal Syukur, Checklist Self-Care harian Dipindah ke modules/home/refleksi-selfcare.js (Sesi 13 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 54 | `modules/shared/modal-navigasi.js` | 621 | Domain Modal Generik & Navigasi Halaman: modal konfirmasi/prompt/pilihan/info/pin Dipindah ke modules/shared/modal-navigasi.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama … |
| 55 | `modules/shared/scanner-session.js` | 336 | modules/shared/scanner-session.js — ScannerSession (Tahap 5, docs/ PRODUCT_DECISIONS.md § "Scanner — Exclusive Scanner Mode via ScannerSession (FINAL — Sesi 316, PD-007)"). PD-007 — Scanner WAJIB berjalan lewat … |
| 56 | `modules/business/reset-gaji-mingguan.js` | 133 | Domain Reset Gaji Mingguan: hitung rentang minggu berjalan (getWeekRange), Dipindah ke modules/business/reset-gaji-mingguan.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 57 | `modules/shared/debug-console.js` | 50 | Domain Debug Console: toggle tombol status (updateDebugConsoleBtn) & aktifkan/matikan Dipindah ke modules/shared/debug-console.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama … |
| 58 | `modules/shared/pengaturan-search.js` | 167 | Domain Pencarian Pengaturan: buka/tutup grup pengaturan (toggleStgGroup), cari Dipindah ke modules/shared/pengaturan-search.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama … |
| 59 | `modules/shared/onboarding.js` | 55 | Domain Onboarding: preview perkiraan kasar gaji/kiriman saat setup awal Dipindah ke modules/shared/onboarding.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 60 | `modules/shared/kalkulator-input.js` | 142 | Kalkulator ekspresi angka: parser aman (safeCalc), popup kalkulator (openCalc/calcPress/dst), Dipindah ke modules/shared/kalkulator-input.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; … |
| 61 | `modules/shared/scan-ocr.js` | 1138 | Scan struk belanja (OCR): struk belanja, bukti transfer, tanggal dari foto, odometer, portofolio aset, kategori & sparepart otomatis dari struk Dipindah ke modules/shared/scan-ocr.js (Sesi 17-18 restrukturisasi folder — … |
| 62 | `modules/shared/scan-ocr-b.js` | 643 | bagian KEDUA dari modules/shared/scan-ocr.js (audit ukuran file, sesi lanjutan setelah split transaksi.js). Titik potong bersih: TEPAT SETELAH `function scanBillMultiItems(){return BillMultiScan.scan();}` (di depan … |
| 63 | `modules/finance/filter-laporan.js` | 543 | Filter transaksi/keuangan (panel filter Keuangan & Laporan), pencarian, paginasi list transaksi, navigasi antar-list (goToList/showFilteredTx) Dipindah ke modules/finance/filter-laporan.js (Sesi 16 restrukturisasi … |
| 64 | `modules/finance/akun.js` | 1007 | Kelola Akun (Cash/Bank/Ewallet dll): saldo, filter dropdown akun di seluruh app, CRUD akun Dipindah ke modules/finance/akun.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 65 | `modules/business/gaji-calc.js` | 59 | Kalkulator gaji harian/borongan (Tukang & karyawan lepas), catat sbg pemasukan Dipindah ke modules/business/gaji-calc.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 66 | `modules/finance/cicilan.js` | 114 | logika form Cicilan pada txModal (Tambah/Edit Transaksi Keuangan). Dipindah ke modules/finance/cicilan.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 67 | `modules/finance/tx-bbm.js` | 215 | logika panel "Sinkron ke Catatan Mobil (BBM)" pada txModal Dipindah ke modules/finance/tx-bbm.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 68 | `modules/finance/tx-servis.js` | 235 | logika panel "Sinkron ke Catatan Servis juga?" pada txModal (Tambah/Edit Transaksi Keuangan). Dipisah dari transaksi.js (Sesi ini, "sync sparepart -> servis"), pola SAMA PERSIS tx-bbm.js (populateTxBbmVehicleSelect/ … |
| 69 | `modules/finance/tx-stok-sparepart.js` | 426 | logika panel "Tambah ke Stok Sparepart juga?" pada Dipindah ke modules/finance/tx-stok-sparepart.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 70 | `modules/finance/tx-renov.js` | 165 | logika panel "🔨 Catat juga ke Proyek Renovasi?" pada txModal (Tambah/Edit Transaksi Keuangan). Pola panel kondisional PERSIS SAMA dengan tx-stok-sparepart.js (lihat file itu utk pola aslinya "Tambah ke Stok Sparepart … |
| 71 | `modules/finance/tx-transfer.js` | 66 | logika modal "⇄ Transfer Antar Akun" (transferModal). Dipindah ke modules/finance/tx-transfer.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 72 | `modules/finance/tx-cobek.js` | 30 | domain "Stok/Penjualan Shop (Shop)" pada form Transaksi. Dipindah ke modules/finance/tx-cobek.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 73 | `modules/finance/tx-target.js` | 69 | domain "Target Tabungan" (modal tambah target, deteksi Dana Dipindah ke modules/finance/tx-target.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 74 | `modules/finance/tx-list-cashflow.js` | 902 | domain "List Transaksi (kartu tx, hapus tx), filter Dipindah ke modules/finance/tx-list-cashflow.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 75 | `modules/finance/transaksi.js` | 1245 | Form Tambah/Edit Transaksi Keuangan: autocomplete kategori/produk, Dipindah ke modules/finance/transaksi.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 76 | `modules/finance/transaksi-b.js` | 681 | bagian KEDUA dari modules/finance/transaksi.js (audit ukuran file, sesi lanjutan setelah split modules/vehicle/sparepart-servis.js). Titik potong bersih: TEPAT SEBELUM `async function saveTx(){` (sisa deklarasi … |
| 77 | `modules/shared/profil-pengaturan.js` | 120 | Profil pengguna di Pengaturan: auto-save profil, status Dipindah ke modules/shared/profil-pengaturan.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 78 | `modules/finance/kategori.js` | 171 | Modal Kategori & Subkategori (tambah/edit/hapus, filter tampilan) Dipindah ke modules/finance/kategori.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 79 | `modules/ai/kategorisasi-ai.js` | 187 | AI Auto-Kategorisasi Transaksi dari Catatan Bebas Dipindah ke modules/ai/kategorisasi-ai.js (Sesi 14 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder). … |
| 80 | `modules/finance/tagihan-kalender.js` | 1525 | Modul Tagihan/Bill (CRUD, riwayat, filter, arsip) & Kalender Jatuh Tempo Dipindah ke modules/finance/tagihan-kalender.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 81 | `modules/finance/cash-projection.js` | 181 | Sesi P1 (RENCANA-KERJA-toggle-hitungkas-dan-proyeksi-kas.md, Track 2). Presenter READ-ONLY: 0 ubah Finance/Accounting Engine, 0 baca/tulis D.debts langsung (utang berjadwal sudah auto-sync jadi D.bills kind:'utang' … |
| 82 | `modules/shared/backup-restore.js` | 852 | Export/import/backup data (satu domain penuh: CSV/JSON export laporan, backup Dipindah ke modules/shared/backup-restore.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 83 | `modules/shared/backup-history-api.js` | 93 | modules/shared/backup-history-api.js — Backup History API (Data Management Core). Target: catat histori tiap kali proses backup dijalankan (sukses/sebagian/gagal), lalu sediakan API baca murni di atasnya. PRINSIP: REUSE … |
| 84 | `modules/shared/backup-health-api.js` | 60 | modules/shared/backup-health-api.js — Backup Health API (Data Management Core). Target: status kesehatan backup (kapan terakhir, terlambat atau tidak) + keandalan (persentase sukses dari histori). PRINSIP: REUSE … |
| 85 | `modules/shared/backup-history-presenter.js` | 49 | modules/shared/backup-history-presenter.js — Backup History Presenter (Data Management Core). Lihat catatan lengkap di modules/shared/backup-history-api.js. PRINSIP: UI HANYA presenter. 100% REUSE … |
| 86 | `modules/shared/backup-health-presenter.js` | 45 | modules/shared/backup-health-presenter.js — Backup Health Presenter (Data Management Core). Lihat catatan lengkap di modules/shared/backup-health-api.js. PRINSIP: UI HANYA presenter. 100% REUSE … |
| 87 | `modules/business/payroll-absensi.js` | 494 | Payroll: Absensi Harian & Kalkulator Gaji Mingguan (const Payroll={...}) Dipindah ke modules/business/payroll-absensi.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 88 | `modules/business/tukang-absensi.js` | 735 | Domain Tukang (absensi/payroll harian & borongan) ONLY. Dipindah ke modules/business/tukang-absensi.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 89 | `modules/business/insight-target-mingguan.js` | 71 | S132: Insight Target Mingguan (kirim uang ke istri). Domain BARU, tapi 100% reuse data & fungsi yang sudah ada: - Target = D.profile.kiriman (field "Kiriman Mingguan (Rp)" yang SUDAH ADA di Pengaturan → Profil, dulu … |
| 90 | `modules/vehicle/vehicle-core.js` | 1091 | Domain Vehicle core: CRUD kendaraan, KM (log & estimasi konsumsi/rp-per-km), Pajak Kendaraan (STNK tahunan/5-tahunan + SPT Tahunan pribadi), SIM, proactive reminders (dashboard), dan Car Notes tab (filter periode, edit … |
| 91 | `modules/vehicle/vehicle-catalog.js` | 612 | Parts Catalog (Katalog Suku Cadang), Milestone 0 Phase 1: fondasi murni (storage + CRUD + validation + search + filter), TANPA UI/wiring page baru. PERUBAHAN SESI INI (TASK-007 — Tahap 3 OCR label kemasan, logic saja, … |
| 92 | `modules/vehicle/vehicle-scanner.js` | 531 | Scan Barcode/QR/DataMatrix untuk Vehicle Catalog (lanjutan dari ACR-001/Tahap 2 — lihat komentar handleScan() di vehicle-catalog.js: "itu butuh keputusan produk terpisah: pilih library, izin kamera, dsb — di luar … |
| 93 | `modules/vehicle/vehicle-catalog-ui.js` | 434 | UI dasar Vehicle Catalog (Katalog Suku Cadang), lanjutan ringkas Tahap 2 ACR-001. Scan (vehicle-scanner.js) & storage/CRUD (vehicle-catalog.js) SUDAH ADA dari sesi sebelumnya — sesi ini isinya HANYA lapisan UI, scope … |
| 94 | `modules/vehicle/sparepart-scanner.js` | 618 | Scanner Sparepart (Tahap 7B-1 Fondasi + Tahap 7B-2 Kamera Real-Time) CAKUPAN TAHAP 7B-1 (fondasi, disepakati eksplisit — RULE #1: 100% reuse, TIDAK ada formula/skema baru, UI presenter layer saja): - Adapter "gallery": … |
| 95 | `modules/vehicle/sparepart-scanner-ui.js` | 94 | UI tipis Scanner Sparepart (Tahap 7B-1 Fondasi + Tahap 7B-2 Kamera Real-Time), tombol "📷 Scan" (kamera) & "🖼️ Scan dari Galeri" di catalogModal (modules/shared/modals.js) yang SUDAH ADA (VehicleCatalogUI/catalogModal, … |
| 96 | `modules/vehicle/sparepart-ocr.js` | 125 | Engine OCR Sparepart Scanner (Tahap 7C-1, Fondasi) CAKUPAN TAHAP 7C-1 (disepakati eksplisit — RULE #1: 100% reuse, TIDAK ada OCR engine baru, TIDAK ada integrasi Vehicle Catalog): - Engine baca 1 foto dari GALERI (input … |
| 97 | `modules/vehicle/sparepart-ocr-parser.js` | 151 | Parser Hasil OCR Sparepart (Tahap 7C-2, logic murni) CAKUPAN TAHAP 7C-2 (disepakati eksplisit — parsing MURNI, BELUM menyimpan data, BELUM ubah UI): - Terima STRING teks OCR mentah (hasil SparepartOcr.scan(), Tahap … |
| 98 | `modules/vehicle/sparepart-ocr-catalog-link.js` | 124 | Sparepart OCR Tahap 7C-3a: jembatan MURNI LOGIC antara hasil SparepartOcrParser (Tahap 7C-2, modules/vehicle/sparepart-ocr-parser.js) dan VehicleCatalog (modules/vehicle/vehicle-catalog.js). CAKUPAN TAHAP 7C-3a … |
| 99 | `modules/vehicle/sparepart-ocr-catalog-detail.js` | 160 | Sparepart OCR Tahap 7C-3b: tampilkan detail part KALAU hasil pencarian (Tahap 7C-3a, SparepartOcrCatalogLink) ditemukan. CAKUPAN TAHAP 7C-3b (disepakati eksplisit — hanya presentasi detail part, TIDAK ubah parser & … |
| 100 | `modules/vehicle/sparepart-ocr-catalog-add.js` | 211 | Sparepart OCR: kalau part TIDAK ditemukan (SparepartOcrCatalogLink.findFromParsed()/findFromText(), Tahap 7C-3a, `found:false`), buka form tambah part yang SUDAH ADA (`VehicleCatalogUI.openForm()`, Sesi 181) dalam mode … |
| 101 | `modules/vehicle/sparepart-ocr-orchestrator.js` | 118 | Sparepart OCR Tahap 7C-4b: orkestrator utama Scan -> Parse -> Cari Vehicle Catalog -> (ditemukan -> Detail) / (tidak ditemukan -> Add). CAKUPAN TAHAP 7C-4b (disepakati eksplisit — orkestrasi saja, 0 logic baru, 100% … |
| 102 | `modules/vehicle/vehicle-catalog-import.js` | 602 | Tahap 5: Import Katalog (PDF -> OCR -> Parser -> Preview -> Import), logic murni (parsing/orchestration), TIDAK menyentuh DOM. Lanjutan dari ACR-001/Vehicle Catalog, mengikuti Project Decision sesi ini. KEPUTUSAN PRODUK … |
| 103 | `modules/vehicle/vehicle-catalog-import-ui.js` | 204 | UI Tahap 5 "Import Katalog" (PDF -> OCR -> Parser -> Preview -> Import). Lapisan DOM/presenter SAJA, seluruh logic parsing/commit ada di vehicle-catalog-import.js (TIDAK diduplikasi/diubah di sini) — pola sama persis … |
| 104 | `modules/vehicle/vehicle-catalog-import-stock-push.js` | 117 | "Push ke Stok Sparepart" pasca Import Katalog (jawaban langsung atas pertanyaan user: sync Katalog -> Stok Sparepart TIDAK otomatis dapat qty nyata, cuma dapat baris kosong qty:0 lewat syncUnlinkedCatalogPartsToStock() … |
| 105 | `modules/vehicle/vehicle-catalog-web-import.js` | 186 | Tahap 6: Import Katalog dari URL Web (fetch HTML -> Parser -> Preview -> Import), lanjutan dari Tahap 5 (vehicle-catalog-import.js, PDF -> OCR -> Parser -> Preview -> Import). Logic murni (fetch/parsing), TIDAK … |
| 106 | `modules/vehicle/vehicle-catalog-web-import-ui.js` | 156 | UI Tahap 6 "Import Katalog dari URL Web" (fetch/paste HTML -> Parser -> Preview -> Import). Lapisan DOM/presenter SAJA, logic ada di vehicle-catalog-web-import.js — pola sama persis vehicle-catalog-import-ui.js vs … |
| 107 | `modules/vehicle/vehicle-catalog-servis-link.js` | 138 | Vehicle Catalog Tahap 6, Sesi 1/3 (paling ringan): jembatan MURNI LOGIC antara D.servisLogs (catatan servis, dimiliki car-notes.js/data-default.js) dan VehicleCatalog (katalog suku cadang, IDBStore terpisah, … |
| 108 | `modules/finance/vehicle-catalog-tx-link.js` | 234 | Vehicle Catalog Tahap 7A: "Smart Transaction Foundation", jembatan MURNI LOGIC antara D.transactions (transaksi keuangan, dimiliki modules/finance/transaksi.js) dan VehicleCatalog (katalog suku cadang, IDBStore … |
| 109 | `modules/vehicle/honda-pdf-import.js` | 288 | Import PDF Honda (Tahap 7D-1, Fondasi) CAKUPAN TAHAP 7D-1 (disepakati eksplisit — IMPLEMENTATION ONLY): - Pilih 1 ATAU BANYAK file PDF sekaligus (input file `multiple`, filter `accept="application/pdf"`), pola picker … |
| 110 | `modules/vehicle/honda-pdf-import-extract.js` | 152 | Import PDF Honda: Extract Text -> Preview (Tahap 7D-2), lanjutan Tahap 7D-1 (honda-pdf-import.js, pilih+simpan sementara). Logic murni orkestrasi + 1 helper decode base64 -> pdf.js; TIDAK ada parsing OEM/harga/nama-part … |
| 111 | `modules/vehicle/honda-pdf-import-parse.js` | 98 | Import PDF Honda: Parse Text -> JSON (Tahap 7D-3), lanjutan Tahap 7D-2 (honda-pdf-import-extract.js, extract teks -> preview). Logic murni orkestrasi, TIDAK ada engine parsing baru: 100% reuse … |
| 112 | `modules/vehicle/honda-pdf-import-commit.js` | 76 | Import PDF Honda: JSON -> Vehicle Catalog (Tahap 7D-4), lanjutan Tahap 7D-3 (honda-pdf-import-parse.js, parse teks -> JSON). Logic murni orkestrasi, TIDAK ada engine commit baru: 100% reuse … |
| 113 | `modules/vehicle/honda-pdf-import-ui.js` | 236 | UI Tahap 7D-5 "Import PDF Honda" (Preview Import). Lapisan DOM/presenter SAJA di atas HondaPdfImport (Tahap 7D-1, pilih+simpan sementara), HondaPdfImportExtract (Tahap 7D-2, extract teks), HondaPdfImportParse (Tahap … |
| 114 | `modules/business/shop-pdf-import-ui.js` | 203 | Bagian B (Shop Import/Export: Scan/PDF/CSV/JSON) dari DESIGN_torsi-vehicle-selector_shop-import-export-2.md, §B.3.2 Import PDF (Sesi N+7, urutan implementasi disarankan di dokumen tsb — setelah Sesi N+6 … |
| 115 | `modules/business/shop-scan-ui.js` | 195 | Bagian B (Shop Import/Export: Scan/PDF/CSV/JSON) dari DESIGN_torsi-vehicle-selector_shop-import-export-2.md, §B.3.1 Scan (Sesi N+8, urutan implementasi disarankan di dokumen tsb — setelah Sesi N+7 Import PDF Shop). … |
| 116 | `modules/ai/chat-action.js` | 84 | Parsing & UI blok [[ACTION]] dari balasan AI Chat (RefAI), murni ekstraksi/format teks, Dipindah ke modules/ai/chat-action.js (Sesi 14 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 117 | `modules/shared/data-archive.js` | 162 | Storage usage estimate & Archive (export lalu hapus data lama per tahun). Dipindah ke modules/shared/data-archive.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 118 | `modules/vehicle/sparepart-servis.js` | 1351 | Domain Sparepart & Servis kendaraan: kategori & stok sparepart (Sparepart), catatan servis (wrapper ke Servis di car-notes.js), interval servis per-kategori & override per-kendaraan, katalog referensi … |
| 119 | `modules/vehicle/sparepart-servis-b.js` | 728 | modules/vehicle/sparepart-servis-b.js — lanjutan modules/vehicle/sparepart-servis.js (Audit ukuran file, lanjutan sesi split modules-render.js): file sparepart-servis.js dipecah jadi 2 supaya di bawah … |
| 120 | `modules/vehicle/shop-katalog-dinamis-api.js` | 182 | modules/vehicle/shop-katalog-dinamis-api.js — Shop Katalog Sparepart Dinamis (per-Kendaraan) API. Batch: "ringan dulu" — cuma layer data (API), TIDAK ada presenter/modal baru di sesi ini (menyusul kalau API ini sudah … |
| 121 | `modules/vehicle/shop-katalog-dinamis-presenter.js` | 83 | modules/vehicle/shop-katalog-dinamis-presenter.js — Shop Katalog Sparepart Dinamis Presenter. 100% REUSE ShopKatalogDinamisAPI (modules/vehicle/shop-katalog-dinamis-api.js) — TIDAK ada query/hitungan baru di sini, murni … |
| 122 | `modules/vehicle/torsi-vehicle-api.js` | 138 | modules/vehicle/torsi-vehicle-api.js — Torsi Vehicle Selector API (Sesi 1). Basis: DESIGN_torsi-vehicle-selector_shop-import-export.md, Bagian A. Batch: "ringan dulu" — cuma layer data (API) + migrasi, TIDAK ada … |
| 123 | `ai-chat.js` | 1183 | Chat AI (RefAI): UI edit aksi chat, kirim pesan ke provider AI (sendChat/ callAIProviderRaw), Advisor (rule-based tips) & AIWidget (widget rekomendasi AI generik dipakai modul lain). Dipisah dari … |
| 124 | `reminder-notif.js` | 163 | resetApp (reset total data, disatukan di sini krn tidak ada domain lain yang cocok & cuma 1 fungsi kecil), share ke WhatsApp (phoneToWaId/waShareLink/openWaShare), notifikasi browser … |
| 125 | `laporan-export.js` | 146 | Ekspor Laporan Keuangan ke PDF (exportLaporanPDF) & gambar (exportLaporanImage), plus builder data laporan (buildLaporanExportData: filter periode, total income/expense, breakdown per kategori). Dipisah dari … |
| 126 | `gdrive-backup.js` | 293 | Integrasi Google Drive: OAuth connect/disconnect, backup manual/otomatis (uploadBackupToDrive), restore (gdriveDownloadBackup). Dipisah dari features-aiwidget-reminder-gdrive-search.js (Sesi 5 restrukturisasi folder, … |
| 127 | `data-health-check.js` | 802 | Cek integritas data lintas-domain (runDataHealthCheck): transaksi dengan akun/tanggal/jumlah tidak valid, ID duplikat, tagihan/aset/BBM dengan tautan akun atau kendaraan yang sudah dihapus, dll. Dipisah dari … |
| 128 | `global-search.js` | 58 | Pencarian DATA milik user lintas halaman (openGlobalSearch/runGlobalSearch), beda tujuan dari Feature Search (dashboard-hub-search.js) yang cari FITUR/MENU. Dipisah dari features-aiwidget-reminder-gdrive-search.js (Sesi … |
| 129 | `sheets-schema.js` | 228 | Skema kolom Google Sheets per modul (SHEETS_SCHEMAS/SHEETS_MODULES) & helper konversi item<->baris (sheetsHeaderFor/sheetsItemToCells/sheetsCellsToItem dst), dipakai oleh sheets-sync.js. Dipisah dari … |
| 130 | `sheets-sync.js` | 239 | Integrasi Google Sheets: koneksi OAuth, sinkronisasi push/pull data D.* ke/dari Google Spreadsheet. Dipisah dari features-sheets-pwa-selftest.js (Sesi 2 restrukturisasi folder, blok 1/5 — lihat … |
| 131 | `pwa-setup.js` | 62 | Setup PWA: registrasi manifest (via Blob kalau tidak di-hosting https) & service worker (sw.js, fallback inline Blob). Dipisah dari features-sheets-pwa-selftest.js (Sesi 2 restrukturisasi folder, blok 2/5 — lihat … |
| 132 | `self-test.js` | 2455 | CATATAN (Sesi 297): file ini adalah runtime app (bukan file test Node), tapi namanya cocok pola default `node --test` (*-test.js) sehingga bisa ke-load & "gagal" kalau `node --test` dijalankan TANPA argumen di root. … |
| 133 | `pajak-aset-ui-wrappers.js` | 183 | Wrapper UI tipis: parser angka (parsePzNum/parseDecStr/ normalizeOcrNumber), ganti tab pajak/zakat (setPajakTab/setPjkTab/savePajakSettings), dan delegasi tipis ke modul … |
| 134 | `modules/finance/finance-intelligence.js` | 238 | Finance Intelligence Foundation (Sesi 74, Batch 6). Target sesi: Cash Flow Summary, Budget Summary, Income vs Expense, Financial Health Score, Insight dasar — lihat docs/BATCH_PLAN.md § Batch 6. PRINSIP (RULE #1 sesi … |
| 135 | `modules/finance/finance-dashboard.js` | 213 | modules/finance/finance-dashboard.js — Finance Dashboard & AI Hook Foundation (Sesi 75, Batch 6). Lihat docs/BATCH_PLAN.md § Batch 6. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 136 | `modules/finance/financial-forecast-api.js` | 114 | modules/finance/financial-forecast-api.js — Financial Forecast API (Sesi 91, Batch 10). Target sesi: Financial Forecast Foundation — lihat docs/BATCH_PLAN.md § Batch 10. PRINSIP (RULE #1 sesi ini): 100% REUSE … |
| 137 | `modules/finance/financial-forecast-presenter.js` | 133 | modules/finance/financial-forecast-presenter.js — Financial Forecast Presenter (Sesi 91, Batch 10). Target sesi: Financial Forecast Foundation — lihat docs/BATCH_PLAN.md § Batch 10. PRINSIP (RULE #1 sesi ini): UI HANYA … |
| 138 | `modules/finance/budget-recommendation-api.js` | 241 | modules/finance/budget-recommendation-api.js — Budget Recommendation API (Sesi 92, Batch 10). Target sesi: Budget Recommendation Foundation — lihat docs/BATCH_PLAN.md § Batch 10. PRINSIP (RULE #1 sesi ini): 100% REUSE … |
| 139 | `modules/finance/budget-recommendation-presenter.js` | 136 | modules/finance/budget-recommendation-presenter.js — Budget Recommendation Presenter (Sesi 92, Batch 10). Target sesi: Budget Recommendation Foundation — lihat docs/BATCH_PLAN.md § Batch 10. PRINSIP (RULE #1 sesi ini): … |
| 140 | `modules/finance/cashflow-projection-settings.js` | 88 | modules/finance/cashflow-projection-settings.js — Cash Flow Projection Settings (lanjutan Sesi 93/Batch 10 — CashFlowProjectionAPI/Presenter). LATAR: kartu "🏦 Proyeksi Saldo Kas" (CashFlowProjectionPresenter) selama … |
| 141 | `modules/finance/cashflow-projection-api.js` | 112 | modules/finance/cashflow-projection-api.js — Cash Flow Projection API (Sesi 93, Batch 10). Target sesi: Cash Flow Projection Foundation — lihat docs/BATCH_PLAN.md § Batch 10. PRINSIP (RULE #1 sesi ini): 100% REUSE … |
| 142 | `modules/finance/cashflow-projection-presenter.js` | 292 | modules/finance/cashflow-projection-presenter.js — Cash Flow Projection Presenter (Sesi 93, Batch 10). Target sesi: Cash Flow Projection Foundation — lihat docs/BATCH_PLAN.md § Batch 10. PRINSIP (RULE #1 sesi ini): UI … |
| 143 | `modules/finance/financial-goal-api.js` | 224 | modules/finance/financial-goal-api.js — Financial Goal API (Sesi 94, Batch 10). Target sesi: Financial Goal Planner Foundation — Financial Goal API, Goal Progress, Target Projection, Goal Recommendation, Goal Presenter. … |
| 144 | `modules/finance/financial-goal-presenter.js` | 149 | modules/finance/financial-goal-presenter.js — Financial Goal Presenter (Sesi 94, Batch 10). Target sesi: Financial Goal Planner Foundation — lihat catatan lengkap di modules/finance/financial-goal-api.js. PRINSIP (RULE … |
| 145 | `modules/finance/investment-planner-api.js` | 256 | modules/finance/investment-planner-api.js — Investment Planner API (Sesi 95, Batch 10; REWIRED Sesi 161 dari `Investment.*` ke `Aset.investmentPerformance()`; REWIRED KEMBALI s476b — lihat catatan panjang di atas … |
| 146 | `modules/finance/investment-planner-presenter.js` | 169 | modules/finance/investment-planner-presenter.js — Investment Planner Presenter (Sesi 95, Batch 10). Target sesi: Investment Planner Foundation — lihat catatan lengkap di modules/finance/investment-planner-api.js. … |
| 147 | `modules/finance/debt-optimizer-api.js` | 191 | modules/finance/debt-optimizer-api.js — Debt Optimizer API (Sesi 96, Batch 10). Target sesi: Debt Optimizer Foundation — Debt Overview, DSR (Debt Service Ratio), Payoff Plan, Debt Recommendation, Presenter. PRINSIP … |
| 148 | `modules/finance/debt-optimizer-presenter.js` | 141 | modules/finance/debt-optimizer-presenter.js — Debt Optimizer Presenter (Sesi 96, Batch 10). Target sesi: Debt Optimizer Foundation — lihat catatan lengkap di modules/finance/debt-optimizer-api.js. PRINSIP (RULE #1 sesi … |
| 149 | `modules/finance/retirement-planner-api.js` | 173 | modules/finance/retirement-planner-api.js — Retirement Planner API (Sesi 97, Batch 10). Target sesi: Retirement Planner Foundation — Retirement Overview, Gap Analysis, Contribution Recommendation, Retirement … |
| 150 | `modules/finance/retirement-planner-presenter.js` | 142 | modules/finance/retirement-planner-presenter.js — Retirement Planner Presenter (Sesi 97, Batch 10). Target sesi: Retirement Planner Foundation — lihat catatan lengkap di modules/finance/ retirement-planner-api.js. … |
| 151 | `modules/finance/financial-health-score-api.js` | 138 | modules/finance/financial-health-score-api.js — Financial Health Score API (Sesi 98, Batch 10). Target sesi: Financial Health Score Foundation — Score Overview, Component Breakdown, Recommendation, Presenter. PRINSIP … |
| 152 | `modules/finance/financial-health-score-presenter.js` | 140 | modules/finance/financial-health-score-presenter.js — Financial Health Score Presenter (Sesi 98, Batch 10). Target sesi: Financial Health Score Foundation — lihat catatan lengkap di modules/finance/ … |
| 153 | `modules/finance/financial-risk-dashboard-api.js` | 178 | modules/finance/financial-risk-dashboard-api.js — Financial Risk Dashboard API (Sesi 99, Batch 10). Target sesi: Financial Risk Dashboard — Risk Factors, Risk Level, Presenter. PRINSIP (RULE #1 sesi ini): 100% REUSE … |
| 154 | `modules/finance/financial-risk-dashboard-presenter.js` | 151 | modules/finance/financial-risk-dashboard-presenter.js — Financial Risk Dashboard Presenter (Sesi 99, Batch 10). Target sesi: Financial Risk Dashboard — lihat catatan lengkap di modules/finance/ … |
| 155 | `modules/vehicle/vehicle-intelligence.js` | 181 | Vehicle Intelligence Foundation (Sesi 76, Batch 7). Target sesi: lapisan agregasi domain VEHICLE — vehicle overview, health score per kendaraan, ringkasan armada (fleet), insight dasar — lihat docs/BATCH_PLAN.md § Batch … |
| 156 | `modules/vehicle/vehicle-dashboard.js` | 142 | modules/vehicle/vehicle-dashboard.js — Vehicle Dashboard Foundation (Sesi 77, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE VehicleIntelligence.summary() … |
| 157 | `modules/vehicle/vehicle-reminder.js` | 216 | Vehicle Reminder Foundation (Sesi 78, Batch 7). Target sesi: lapisan reminder domain VEHICLE — Service Reminder, Tax Reminder, Fuel Reminder, + Reminder Summary API. Lihat docs/BATCH_PLAN.md § Batch 7. Pola SAMA PERSIS … |
| 158 | `modules/vehicle/vehicle-notif-bridge.js` | 70 | Vehicle Notification Bridge (Sesi 84, Batch 7). Target sesi: **Vehicle Dashboard Final Integration** — menutup gap terakhir yang tercatat di docs/BATCH_PLAN.md Sesi 83 ("wiring … |
| 159 | `modules/vehicle/vehicle-ai-hook.js` | 76 | modules/vehicle/vehicle-ai-hook.js — Vehicle AI Hook Foundation (Sesi 79, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE, TIDAK ada rumus baru, TIDAK duplikasi logic, TIDAK mengubah … |
| 160 | `modules/vehicle/vehicle-insight-presenter.js` | 124 | modules/vehicle/vehicle-insight-presenter.js — Vehicle Insight Presenter (Sesi 79, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE VehicleAIHook.fleetSummary() … |
| 161 | `modules/vehicle/vehicle-daily-brief.js` | 68 | modules/vehicle/vehicle-daily-brief.js — Vehicle Daily Brief (Sesi 80, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE VehicleAIHook.fleetSummary() … |
| 162 | `modules/vehicle/vehicle-alert-panel.js` | 51 | modules/vehicle/vehicle-alert-panel.js — Vehicle Alert Panel (Sesi 80, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE VehicleAIHook.fleetSummary() … |
| 163 | `modules/vehicle/vehicle-insight-feed.js` | 71 | modules/vehicle/vehicle-insight-feed.js — Vehicle Insight Feed (Sesi 80, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE VehicleAIHook.fleetSummary() … |
| 164 | `modules/vehicle/vehicle-trend-api.js` | 118 | Vehicle Trend API Foundation (Sesi 81, Batch 7). Target sesi: Vehicle Analytics Foundation — Vehicle Trend API, Vehicle Cost Summary, Fuel Trend Summary, Service Trend Summary, Vehicle Analytics Presenter. Lihat … |
| 165 | `modules/vehicle/vehicle-cost-summary.js` | 58 | Vehicle Cost Summary (Sesi 81, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleTrendAPI.monthlyCostTrend() (modules/vehicle/vehicle-trend-api.js, sesi ini) — TIDAK menghitung … |
| 166 | `modules/vehicle/vehicle-fuel-trend.js` | 50 | Fuel Trend Summary (Sesi 81, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleTrendAPI.monthlyCostTrend() (type:'fuel', modules/vehicle/vehicle-trend-api.js, sesi ini) utk … |
| 167 | `modules/vehicle/vehicle-service-trend.js` | 43 | Service Trend Summary (Sesi 81, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleTrendAPI.monthlyCostTrend() (type:'service', modules/vehicle/vehicle-trend-api.js, sesi ini) … |
| 168 | `modules/vehicle/vehicle-analytics-presenter.js` | 158 | modules/vehicle/vehicle-analytics-presenter.js — Vehicle Analytics Presenter (Sesi 81, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 169 | `modules/vehicle/fuel-storage.js` | 46 | Fuel Storage (TASK-141, Fuel Intelligence Card). PRINSIP: 100% REUSE D.bbmLogs (data mentah yang SUDAH ADA, diisi tx-bbm.js/car-notes.js BBM._saveInner/recordBbmLog) — TIDAK ada field baru ditambahkan ke D, TIDAK ada … |
| 170 | `modules/vehicle/fuel-state-history.js` | 96 | Fuel State History (lanjutan rencana "Fuel Estimation Auto-Update", "Saran tambahan" #3: histori estimasi, opsional/bukan prioritas menurut rencana asli, tapi dipilih duluan di antara sisa item krn ringan & tidak … |
| 171 | `modules/vehicle/fuel-tank-profile.js` | 128 | Fuel Tank Profile (TASK-142). PRINSIP: field baru & OPSIONAL di D.vehicles[i].fuelTankProfile (ADDITIVE — kendaraan lama tanpa field ini tetap jalan normal, get() balikin DEFAULTS penuh). TIDAK ada storage baru di luar … |
| 172 | `modules/vehicle/fuel-intelligence-engine.js` | 82 | Fuel Engine (TASK-141, Fuel Intelligence Card). PRINSIP: 100% REUSE service yang SUDAH ADA — TIDAK ada rumus kmPerLiter/rpPerKm/estMonthlyCost baru (fuelEfficiency(), vehicle-core.js), TIDAK menghitung ulang tren biaya … |
| 173 | `modules/vehicle/fuel-gauge-engine.js` | 272 | Fuel Gauge Engine (TASK-143). PRINSIP: 100% REUSE FuelTankProfile.get() (TASK-142, kalibrasi tangki per kendaraan) + fuelEfficiency() global (vehicle-core.js, SUDAH ADA, dipakai … |
| 174 | `modules/vehicle/fuel-state-estimator.js` | 237 | FuelStateEstimator (Sesi 1 asli rencana "Fuel Estimation Auto-Update", FUEL-AUTOSYNC-04): estimateCurrentLiter(vehicleId) pure engine, fondasi Sesi 2-6 lanjutan rencana yang sama. TUJUAN: satu rumus terpusat "berapa … |
| 175 | `modules/vehicle/fuel-history.js` | 51 | Fuel History (TASK-141, Fuel Intelligence Card). PRINSIP: UI HANYA presenter. 100% REUSE FuelStorage.recent() (sesi ini — sendiri 100% reuse D.bbmLogs apa adanya) utk daftar catatan isi BBM terbaru. Tap 1 baris membuka … |
| 176 | `modules/vehicle/fuel-analytics.js` | 88 | Fuel Analytics (TASK-141, Fuel Intelligence Card). PRINSIP: UI HANYA presenter. 100% REUSE VehicleFuelTrendSummary.summary() (Sesi 81, Batch 7 — sendiri 100% reuse VehicleTrendAPI.monthlyCostTrend() utk histori biaya … |
| 177 | `modules/vehicle/fuel-modal.js` | 44 | Fuel Modal (TASK-141, Fuel Intelligence Card). PRINSIP: orkestrasi TIPIS saja. Buka overlay #fuelIntelModal (markup di modals.js, sesi ini) & panggil FuelAnalytics.render()/FuelHistory.render() (sesi ini, keduanya 100% … |
| 178 | `modules/vehicle/fuel-card.js` | 506 | Fuel Card (TASK-141, Fuel Intelligence Card). PRINSIP: UI HANYA presenter. 100% REUSE FuelIntelligenceEngine.vehicleInsight() (sesi ini) utk kendaraan aktif (curVehicleId, SUDAH ADA — variabel yang sama dipakai … |
| 179 | `modules/vehicle/fuel-intelligence-ui.js` | 311 | Fuel Bar Correction (TASK-144). PRINSIP: UI/orkestrasi TIPIS saja, 100% REUSE FuelGaugeEngine (TASK-143, konversi bar<->liter<->persen) + FuelTankProfile (TASK-142, kapasitas tangki & jumlah bar) — TIDAK ada rumus … |
| 180 | `modules/vehicle/fuel-tank-profile-ui.js` | 135 | Atur Tangki UI (companion untuk TASK-142 FuelTankProfile & TASK-144 FuelBarCorrection). PRINSIP: UI/orkestrasi TIPIS saja, 100% REUSE FuelTankProfile.get()/ validate()/save() (SUDAH ADA) — TIDAK ada rumus/validasi baru … |
| 181 | `modules/vehicle/fuel-prediction-engine.js` | 257 | Fuel Consumption Prediction Engine (TASK-146). PRINSIP: engine-only, 0 UI, PURE (read-only, tidak pernah panggil save() atau menulis ke D). 100% REUSE modul fuel yang SUDAH ADA — 0 rumus bar/liter/persen/km/L/Rp per km … |
| 182 | `modules/vehicle/fuel-cost-analytics.js` | 255 | Fuel Cost Analytics Engine (TASK-147). PRINSIP: engine-only, 0 UI, PURE (read-only, tidak pernah panggil save() atau menulis ke D/D.bbmLogs/D.vehicles). 100% REUSE modul fuel yang SUDAH ADA — 0 rumus km/L, Rp/km, atau … |
| 183 | `modules/vehicle/fuel-maintenance-engine.js` | 283 | Fuel Maintenance Intelligence Engine (TASK-148). PRINSIP: engine-only, 0 UI, PURE (read-only, tidak pernah panggil save() atau menulis ke D). 100% REUSE modul & fungsi yang SUDAH ADA — 0 rumus km/L, Rp/km, … |
| 184 | `modules/vehicle/fuel-insight-engine.js` | 534 | Fuel Insight Engine (TASK-149; diperluas TASK-150A "Expand FuelInsightEngine Summary API"). PRINSIP: engine-only, 0 UI, PURE (read-only, tidak pernah panggil save() atau menulis ke D). 100% REUSE SELURUH engine fuel … |
| 185 | `modules/vehicle/fuel-fleet-selector.js` | 130 | Fuel Fleet Brief Selector (TASK-151A). KONTEKS: TASK-151 (Fuel AI Daily Briefing Integration) di-STOP krn pipeline briefing yang ada beroperasi fleet-wide, sedangkan FuelInsightEngine.getSummary()/getInsights() wajib 1 … |
| 186 | `modules/vehicle/fuel-notif-bridge.js` | 113 | Fuel Notification Bridge (TASK-153, Fuel Notification & Reminder). KONTEKS: reminder-notif.js (checkAndFireReminders()) SUDAH menembak notifikasi browser nyata utk tagihan/LDR/pajak-kendaraan/SIM/SPT + (Sesi 84) … |
| 187 | `modules/vehicle/fuel-dashboard.js` | 333 | Fuel Dashboard (TASK-150, Fuel Dashboard Integration). + Export Fuel Dashboard (TASK-155A, exportVehicleHTML()/exportVehicleJSON(), lihat blok "TASK-155A: Export (Single Vehicle)" di bawah). PRINSIP: UI HANYA presenter, … |
| 188 | `modules/vehicle/fuel-compare.js` | 399 | Multi Vehicle Fuel Comparison (TASK-154). + Export All FuelCompare (TASK-155A, exportFleetHTML()/exportFleetJSON(), lihat blok "TASK-155A: Export (Fleet)" di bawah). PRINSIP: presentation only, 0 UI baru … |
| 189 | `modules/vehicle/fuel-trend-dashboard.js` | 296 | Fuel Trend Dashboard (TASK-156). PRINSIP: UI HANYA presenter, 0 rumus/skoring/engine/storage baru. 100% REUSE (persis 4 dependency yang diminta task, dipanggil LANGSUNG — bukan cuma lewat FuelInsightEngine.getSummary() … |
| 190 | `modules/vehicle/vehicle-decision-api.js` | 45 | modules/vehicle/vehicle-decision-api.js — Vehicle Decision API (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleAIHook.fleetSummary()/ .vehicleInsight(vehicleId) … |
| 191 | `modules/vehicle/vehicle-recommendation-engine.js` | 92 | modules/vehicle/vehicle-recommendation-engine.js — Vehicle Recommendation Engine (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleDecisionAPI.context() … |
| 192 | `modules/vehicle/vehicle-priority-scoring.js` | 58 | modules/vehicle/vehicle-priority-scoring.js — Vehicle Priority Scoring (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE field `severity` yang SUDAH ADA di tiap … |
| 193 | `modules/vehicle/vehicle-action-recommendation.js` | 65 | modules/vehicle/vehicle-action-recommendation.js — Vehicle Action Recommendation (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE field `type`/`severity` yang SUDAH ADA di … |
| 194 | `modules/vehicle/vehicle-decision-presenter.js` | 87 | modules/vehicle/vehicle-decision-presenter.js — Vehicle Decision Presenter (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 195 | `modules/vehicle/vehicle-attention-presenter.js` | 123 | modules/vehicle/vehicle-attention-presenter.js — Vehicle Attention Card (Sesi 156b, permintaan eksplisit user: gabungkan VehicleAlertPanel + VehicleInsightFeed + VehicleDecisionPresenter jadi SATU card ranked "🧭 Perlu … |
| 196 | `modules/vehicle/vehicle-automation-api.js` | 51 | modules/vehicle/vehicle-automation-api.js — Vehicle Automation API (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleRecommendationEngine. recommendations() + … |
| 197 | `modules/vehicle/vehicle-reminder-scheduler.js` | 70 | modules/vehicle/vehicle-reminder-scheduler.js — Smart Reminder Scheduler (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleAutomationAPI.context() … |
| 198 | `modules/vehicle/vehicle-maintenance-automation.js` | 36 | modules/vehicle/vehicle-maintenance-automation.js — Maintenance Automation (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleReminderScheduler. schedule() … |
| 199 | `modules/vehicle/vehicle-tax-document-automation.js` | 36 | modules/vehicle/vehicle-tax-document-automation.js — Tax & Document Automation (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleReminderScheduler. schedule() … |
| 200 | `modules/vehicle/vehicle-automation-presenter.js` | 141 | modules/vehicle/vehicle-automation-presenter.js — Automation Presenter (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 201 | `modules/cross/finance-vehicle-cross-summary.js` | 45 | modules/cross/finance-vehicle-cross-summary.js — Finance & Vehicle Cross Summary API (Sesi 87, Batch 8). Target sesi: Finance & Vehicle Cross Integration Foundation — lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 … |
| 202 | `modules/cross/cross-ai-hook.js` | 37 | modules/cross/cross-ai-hook.js — Finance & Vehicle Unified AI Hook (Sesi 87, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): 100% REUSE CrossSummaryAPI.summary() … |
| 203 | `modules/cross/cross-dashboard-card.js` | 117 | modules/cross/cross-dashboard-card.js — Finance & Vehicle Unified Dashboard Card (Sesi 87, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE CrossAIHook.getAIHook() … |
| 204 | `modules/cross/cross-insight-presenter.js` | 59 | modules/cross/cross-insight-presenter.js — Finance & Vehicle Shared Insight Presenter (Sesi 87, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 205 | `modules/cross/unified-summary-api.js` | 52 | modules/cross/unified-summary-api.js — Finance & Vehicle Unified Summary API (Sesi 88, Batch 8). Target sesi: Unified AI Briefing Foundation — lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): 100% REUSE … |
| 206 | `modules/cross/unified-ai-briefing.js` | 93 | modules/cross/unified-ai-briefing.js — Finance & Vehicle Unified AI Briefing (Sesi 88, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): 100% REUSE UnifiedSummaryAPI.summary() … |
| 207 | `modules/cross/unified-briefing-presenter.js` | 60 | modules/cross/unified-briefing-presenter.js — Finance & Vehicle Dashboard Briefing Presenter (Sesi 88, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 208 | `modules/cross/life-dashboard-summary-api.js` | 60 | modules/cross/life-dashboard-summary-api.js — Personal Life Dashboard Summary API (Sesi 89, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): 100% REUSE UnifiedSummaryAPI.summary() … |
| 209 | `modules/cross/priority-engine.js` | 62 | modules/cross/priority-engine.js — Priority Engine (Sesi 90, Batch 8). Target sesi: Personal Decision Center Foundation. PRINSIP (RULE #1 sesi ini): 100% REUSE LifeDashboardSummaryAPI.summary() … |
| 210 | `modules/cross/personal-overview-presenter.js` | 37 | modules/cross/personal-overview-presenter.js — Personal Overview Presenter (Sesi 89, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 211 | `modules/cross/cross-module-widgets.js` | 57 | modules/cross/cross-module-widgets.js — Cross Module Widgets (Sesi 89, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE LifeDashboardSummaryAPI.summary() … |
| 212 | `modules/cross/life-priority-panel.js` | 74 | modules/cross/life-priority-panel.js — Priority Panel (Sesi 89, Batch 8, direfaktor Sesi 90 — Personal Decision Center Foundation). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. … |
| 213 | `modules/cross/unified-dashboard-home.js` | 32 | modules/cross/unified-dashboard-home.js — Unified Dashboard Home (Sesi 89, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8 — "Personal Life Dashboard Foundation". PRINSIP (RULE #1 sesi ini): UI HANYA presenter, TIDAK ada … |
| 214 | `modules/cross/decision-center-api.js` | 78 | modules/cross/decision-center-api.js — Personal Decision Center API (Sesi 90, Batch 8). Target sesi: Personal Decision Center Foundation. PRINSIP (RULE #1 sesi ini): 100% REUSE LifeDashboardSummaryAPI.summary() … |
| 215 | `modules/cross/recommendation-panel.js` | 71 | modules/cross/recommendation-panel.js — Recommendation Panel (Sesi 90, Batch 8). Target sesi: Personal Decision Center Foundation. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE DecisionCenterAPI.summary() … |
| 216 | `modules/cross/action-queue.js` | 106 | modules/cross/action-queue.js — Action Queue (Sesi 90, Batch 8). Target sesi: Personal Decision Center Foundation. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE DecisionCenterAPI.summary() … |
| 217 | `modules/cross/decision-center-home.js` | 28 | modules/cross/decision-center-home.js — Decision Center Home (Sesi 90, Batch 8). Target sesi: Personal Decision Center Foundation — Dashboard Integration. PRINSIP (RULE #1 sesi ini): UI HANYA presenter, TIDAK ada … |
| 218 | `app-bootstrap.js` | 60 | Titik bootstrap utama app: expose modul-modul ke window (Object.assign) lalu panggil init(). Dipisah dari features-sheets-pwa-selftest.js (Sesi 3 restrukturisasi folder, blok 5 — lihat … |
| 219 | `modules/shared/feature-icons.js` | 108 | Migrasi Icon Emoji -> SVG (KNOWN-ISSUES.md §4.1 / ROADMAP-v1.1.md #3) Dipindah ke modules/shared/feature-icons.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 220 | `modules/dashboard-hub/dashboard-hub-registry.js` | 279 | FEATURE_REGISTRY: sumber data tunggal taksonomi Dipindah ke modules/dashboard-hub/dashboard-hub-registry.js (Sesi 11 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 221 | `modules/dashboard-hub/dashboard-hub.js` | 978 | Dashboard Feature Hub (blueprint-dashboard-hub.md §5) Dipindah ke modules/dashboard-hub/dashboard-hub.js (Sesi 11 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 222 | `modules/dashboard-hub/dashboard-hub-search.js` | 129 | Feature Search: cari FITUR/MENU (bukan data Dipindah ke modules/dashboard-hub/dashboard-hub-search.js (Sesi 11 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 223 | `modules/dashboard-hub/dashboard-hub-favorit.js` | 40 | Favorit (Tahap 3, Langkah 6): storage + service Dipindah ke modules/dashboard-hub/dashboard-hub-favorit.js (Sesi 11 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 224 | `modules/dashboard-hub/dashboard-hub-favorit-view.js` | 114 | Favorit (Tahap 3, Langkah 7-8): render + Dipindah ke modules/dashboard-hub/dashboard-hub-favorit-view.js (Sesi 11 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 225 | `modules/dashboard-hub/dashboard-hub-settings.js` | 193 | S129: "Pengaturan Dashboard" (Dashboard Settings). Presenter layer MURNI di atas mekanisme yang SUDAH ADA — RULE #1 sesi ini: ZIP sesi lalu adalah source of truth, 100% reuse modul existing, ZERO formula/framework baru, … |
| 226 | `modules/ai/ai-command-center.js` | 142 | Sprint 3 Tahap 3.1: AI Command Center Foundation. Dipindah ke modules/ai/ai-command-center.js (Sesi 14 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 227 | `modules/self-reward/self-reward-engine.js` | 217 | Domain Self Reward Engine: cek kelayakan self reward Dipindah ke modules/self-reward/self-reward-engine.js (Sesi 12 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 228 | `modules/self-reward/self-reward-view.js` | 221 | UI layer untuk Self Reward Engine. Memisahkan render/DOM Dipindah ke modules/self-reward/self-reward-view.js (Sesi 12 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, … |
| 229 | `modules/self-reward/self-reward-ai-widget.js` | 236 | Widget Rekomendasi AI di dalam modal Self Reward. Dipindah ke modules/self-reward/self-reward-ai-widget.js (Sesi 12 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 230 | `modules/asset/investasi.js` | 963 | Domain Investment: Portfolio, Dividend, Capital Gain/Loss, ROI, Dipindah ke modules/asset/investasi.js (Sesi 9 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 231 | `modules/asset/investasi-view.js` | 982 | InvestmentUI: modal "⚖️ Atur Porsi Kepemilikan" untuk holding investasi (S464, lanjutan AUD-008/S462). File BARU, terpisah dari investasi.js (logika murni, 0 DOM) — pola sama persis dashboard-hub-favorit.js vs … |
| 232 | `modules/asset/investasi-list-view.js` | 908 | InvestmentListUI: halaman/tab "💹 Investasi" di bawah #page-aset (Fase 1, implementasi BUG-INV-001 Opsi 3 — lihat AUDIT-BUILD-UI-INVESTASI-OPSI3.md & docs/BUG_REGISTRY.md §0a-8). File BARU, terpisah dari investasi.js … |
| 233 | `modules/asset/investasi-tx-view.js` | 206 | InvestmentTxUI: UI riwayat transaksi Beli/Jual/Dividen per holding investasi (Fase 2, implementasi BUG-INV-001 Opsi 3 -- lihat AUDIT-BUILD-UI-INVESTASI-OPSI3.md §3.3 "UI Transaksi Beli/Jual/Dividen"). Backend 100% … |
| 234 | `modules/asset/investasi-watch-view.js` | 166 | InvestmentWatchUI: UI Watchlist instrumen investasi (Fase 3, implementasi BUG-INV-001 Opsi 3 -- lihat AUDIT-BUILD-UI-INVESTASI-OPSI3.md §3.5 "UI Watchlist"). Backend 100% reuse: … |
| 235 | `modules/asset/asset-portfolio-api.js` | 205 | modules/asset/asset-portfolio-api.js — Asset Portfolio API (S101, Batch 10). Target sesi: Asset Portfolio Foundation. PRINSIP (RULE #1 sesi ini): 100% REUSE modul Asset/Finance yang SUDAH ADA — TIDAK ada rumus keuangan … |
| 236 | `modules/asset/asset-portfolio-presenter.js` | 142 | modules/asset/asset-portfolio-presenter.js — Asset Portfolio Presenter (Sesi 132, Batch 10 lanjutan). Target sesi: audit menemukan `AssetPortfolioAPI` (S101) sudah lengkap + ada test, tapi TIDAK PERNAH dipanggil dari … |
| 237 | `lifeos/lifeos-store.js` | 66 | SATU-SATUNYA tempat Life OS boleh MENULIS. ATURAN WAJIB: - Tidak pernah menyentuh D. Tidak ada property baru di D, tidak ada perubahan struktur D sedikit pun. - Tidak pernah memanggil save() milik D. - Persist lewat … |
| 238 | `lifeos/lifeos-registry.js` | 187 | taksonomi FUNGSIONAL Life OS (beda dari FEATURE_REGISTRY yang taksonomi NAVIGASI — keduanya sengaja terpisah, lihat personal-life-os-blueprint.md Langkah 1). PENTING: file ini MURNI DATA. Tidak ada logic, tidak ada … |
| 239 | `lifeos/lifeos-link-registry.js` | 25 | relasi implisit-by-convention di D dibuat eksplisit di SATU tempat (Gap #9, personal-life-os-blueprint.md). PENTING: murni data deklaratif. `match`/lookup di sini hanya MEMBACA D — tidak pernah menulis. Dikonsumsi oleh … |
| 240 | `lifeos/plugins/lifeos-plugin-manifest.js` | 35 | Plugin Manifest, LifeOS Plugin System MVP (Sesi 65, Batch 5). Scope MVP sesi ini SENGAJA sempit: manifest MURNI METADATA (id/name/version/areaKey/description) — TIDAK ada `entry`/kode eksekusi apa pun. Plugin Runtime … |
| 241 | `lifeos/plugins/lifeos-plugin-validation.js` | 55 | Plugin Validation, LifeOS Plugin System MVP (Sesi 65, Batch 4). Validasi MURNI bentuk manifest (tidak menulis apa pun, tidak menyentuh registry) — dipakai oleh LifeOSPluginRegistry. register() SEBELUM plugin apa pun … |
| 242 | `lifeos/plugins/lifeos-plugin-registry.js` | 51 | Plugin Registry, LifeOS Plugin System MVP (Sesi 65, Batch 5). SATU-SATUNYA tempat menyimpan plugin yang berhasil terdaftar (in-memory, `_plugins` map by id) — pola sama dgn EIERegistry … |
| 243 | `lifeos/plugins/lifeos-plugin-loader.js` | 28 | Plugin Loader, LifeOS Plugin System MVP (Sesi 65, Batch 5). Loader MURNI batch-register: terima array manifest, panggil LifeOSPluginRegistry.register() satu-satu, dan kumpulkan hasil —TIDAK menjalankan/mengeksekusi kode … |
| 244 | `lifeos/plugins/lifeos-plugin-runtime.js` | 168 | Plugin Runtime MVP, LifeOS Plugin System (Sesi 69, Batch 5, target eksplisit user: "Plugin Runtime" di atas Registry + Manifest + Loader yang sudah ada — TIDAK Marketplace, TIDAK Plugin UI baru). Layer BARU murni … |
| 245 | `lifeos/adapters/area-adapter.js` | 31 | adapters/area-adapter.js — READ-ONLY. Ringkasan per AREA (lifeos-registry.js: LIFEOS_AREAS) — murni menjumlah panjang tiap D.* yang terdaftar di `dSources` per area. Tidak ada skor/logic bisnis baru, cuma menghitung … |
| 246 | `lifeos/adapters/goal-adapter.js` | 167 | adapters/goal-adapter.js — READ-ONLY. Menyeragamkan sumber goal lama (D.targets, D.eduFunds, D.pensiun, D.finansialFreedom, D.wishlist, D.debtStrategy) jadi satu bentuk "goal card". Tidak menyimpan apa pun, dihitung … |
| 247 | `lifeos/adapters/project-adapter.js` | 63 | adapters/project-adapter.js — merge READ-ONLY antara dua sumber: 1. D.renovProjects (legacy, milik renovasi.js — tidak disentuh) 2. LifeOSStore.projects (generic, milik Life OS — lihat services/project-service.js untuk … |
| 248 | `lifeos/adapters/today-adapter.js` | 129 | adapters/today-adapter.js — READ-ONLY. TODAY bukan penyimpanan sendiri, cuma lensa waktu di atas AREAS/PROJECTS/GOALS (lihat personal-life-os-blueprint.md Langkah 2). Depends on: lifeos-registry.js … |
| 249 | `lifeos/adapters/review-adapter.js` | 74 | adapters/review-adapter.js — READ-ONLY. Menggabungkan histori pasif existing (D.wealthSnapshots, D.lifeBalanceSnapshots, D.assetAllocation) dengan sesi review Life OS sendiri (LifeOSStore.reviewLog). Tidak pernah … |
| 250 | `lifeos/adapters/knowledge-adapter.js` | 52 | adapters/knowledge-adapter.js — READ-ONLY. D.catatan (catatan privat manual, milik keamanan-pin.js/refleksi-selfcare.js dll) dibaca sebagai REFERENSI saja — Knowledge base Life OS yang sebenarnya (insight AI tersimpan) … |
| 251 | `lifeos/lifeos-object-ref.js` | 72 | resolver & validator utk `sourceRef` milik Life Object `kind:"ref"`. Sesi 58 (Batch 4, keputusan produk FINAL — lihat docs/PRODUCT_DECISIONS.md § LifeOS — Life Object sourceRef): sourceRef = { domain: "...", id: "..." } … |
| 252 | `lifeos/services/project-service.js` | 48 | services/project-service.js — SATU-SATUNYA tempat menulis LifeOSStore.projects (generic project). Tidak pernah menulis ke D.renovProjects atau array D.* lain — kalau butuh baca renovasi, pakai … |
| 253 | `lifeos/services/review-service.js` | 34 | services/review-service.js — SATU-SATUNYA tempat menulis LifeOSStore.reviewLog. Boleh MEMBACA D.wealthSnapshots/ D.lifeBalanceSnapshots (lewat adapters/review-adapter.js) untuk menyimpan referensi id-nya, tapi tidak … |
| 254 | `lifeos/services/knowledge-service.js` | 29 | services/knowledge-service.js — SATU-SATUNYA tempat menulis LifeOSStore.knowledge. Tidak pernah menulis ke D.catatan — kalau butuh baca catatan lama, pakai adapters/knowledge-adapter.js (knowledgeAdapterCatatanRef). |
| 255 | `lifeos/services/life-object-service.js` | 98 | services/life-object-service.js — SATU-SATUNYA tempat menulis LifeOSStore.objects (Life Object). Sesi 58 (Batch 4, lanjutan Sesi 57 — registry+resolver+validator sourceRef). Tidak pernah menulis ke D atau array D.* … |
| 256 | `lifeos/ui/lifeos-home.js` | 160 | ui/lifeos-home.js — halaman masuk Life OS. Hanya membaca lewat adapter, menulis (kalau ada aksi) hanya lewat services/*.js. Tidak pernah akses D atau LifeOSStore langsung dari file UI — selalu lewat adapter/service. … |
| 257 | `lifeos/ui/areas.js` | 40 | ui/areas.js — render-only lewat areaAdapterList(D). Ringkasan jumlah item per AREA (lihat adapters/area-adapter.js — LIFEOS_AREAS, lifeos-registry.js). Sebelum Sesi 39, area-adapter.js sudah ADA & sudah dites (Sesi 24) … |
| 258 | `lifeos/ui/today.js` | 20 | ui/today.js — render-only lewat todayAdapterList(D). Aksi "selesaikan" tetap dispatch ke fungsi modul LAMA (mis. dismiss bill), Life OS tidak menduplikasi logic itu. |
| 259 | `lifeos/ui/goals.js` | 23 | ui/goals.js — render-only lewat goalAdapterList(D). Tidak ada goal-service.js karena Goals tidak punya data tulis sendiri di Life OS (murni agregasi 6 sumber lama, lihat Gap #2). Aksi "tambah tabungan" dsb tetap … |
| 260 | `lifeos/ui/projects.js` | 41 | ui/projects.js — render lewat projectAdapterList(D, store); aksi tulis (create/toggle checklist/dsb) HANYA lewat services/project-service.js. |
| 261 | `lifeos/ui/review.js` | 33 | ui/review.js — render lewat review-adapter.js; aksi mulai/selesai sesi review HANYA lewat services/review-service.js. |
| 262 | `lifeos/ui/life-objects.js` | 357 | ui/life-objects.js — panel ke-7 Life OS (LifeOSLifeObjects). Render lewat lifeObjectServiceList(); aksi tulis (create/update/delete) HANYA lewat services/life-object-service.js. Fase 1 (Sesi 61) + Fase 2 (Sesi 62) + … |
| 263 | `lifeos/ui/plugins.js` | 83 | ui/plugins.js — Plugin UI, LifeOS Plugin System (Sesi 66, Batch 5, lanjutan Plugin System MVP Sesi 65 — Registry/Manifest/Loader/ Validation). Scope MVP UI: list + empty state + register (manual, via showPromptModal() … |
| 264 | `lifeos/ui/knowledge.js` | 46 | ui/knowledge.js — render lewat knowledge-adapter.js; aksi simpan/hapus HANYA lewat services/knowledge-service.js. D.catatan ditampilkan sebagai referensi read-only, tidak pernah dimigrasikan ke sini. |
| 265 | `lifeos/lifeos-nav.js` | 188 | "Jump to source": item Life OS (Today/Goals/Projects) hanyalah LENSA baca di atas data lama (lihat komentar di adapters/today-adapter.js & adapters/goal-adapter.js: tiap item sudah bawa `sourceKind`/`sourceId`). File … |
| 266 | `economic-intelligence/eie-bus.js` | 41 | Event bus internal Economic Intelligence Engine (EIE). Pola pub/sub sederhana, TIDAK bergantung pada library luar, TIDAK menyentuh IndexedDB/D. Dipakai supaya macro-sync-service/scoring-engine bisa "memancarkan" event … |
| 267 | `economic-intelligence/eie-store.js` | 71 | SATU-SATUNYA tempat EIE boleh MENULIS/MEMBACA persistensi. ATURAN WAJIB (sama persis dgn pola lifeos-store.js yang sudah terbukti): - Tidak pernah menyentuh D. Tidak ada property baru di D, tidak ada perubahan struktur … |
| 268 | `economic-intelligence/domain/entities.js` | 70 | domain/entities.js — Definisi bentuk data EIE (JSDoc typedef murni). ATURAN DOMAIN LAYER: file ini TIDAK BOLEH import/reference apa pun dari adapters/ atau eie-store.js. Tidak ada I/O. Tidak ada IndexedDB/API. 100% … |
| 269 | `economic-intelligence/domain/scoring-formulas.js` | 129 | domain/scoring-formulas.js — Pure function rumus EES/PEHS/ERI. ATURAN DOMAIN LAYER: TIDAK ADA I/O di file ini. Semua fungsi murni menerima UserFinanceSnapshot/MacroSnapshot dan mengembalikan angka — 100% unit-testable … |
| 270 | `economic-intelligence/domain/status-classifier.js` | 23 | domain/status-classifier.js — Pure function skor -> Economic Status. (Sebelumnya "weather-classifier.js"/istilah "Economic Weather" — diganti ke istilah "status"/"kondisi" ekonomi, konsisten dgn label yang memang sudah … |
| 271 | `economic-intelligence/adapters/user-finance-adapter.js` | 117 | adapters/user-finance-adapter.js — READ-ONLY. Menerjemahkan D.* (state finance existing app) jadi UserFinanceSnapshot (lihat domain/entities.js). ATURAN (sama seperti adapters/goal-adapter.js LifeOS): tidak menyimpan … |
| 272 | `economic-intelligence/adapters/macro-data-adapter.js` | 192 | adapters/macro-data-adapter.js — Normalisasi data makro dari berbagai sumber, dgn fallback cache (offline-first, §16 dokumen desain). FASE 1 (MVP, "senyap"): TIDAK ada fetch ke API eksternal apa pun. Nilai makro diisi … |
| 273 | `economic-intelligence/rules/rule-schema.js` | 19 | rules/rule-schema.js — Validasi struktur Rule (§9.1). Dipakai oleh EIERegistry.registerRule() supaya rule custom (plugin, §20) tidak bisa masuk dalam bentuk yang salah dan mendiamkan error di tengah evaluasi. |
| 274 | `economic-intelligence/rules/rule-definitions.js` | 287 | rules/rule-definitions.js — rule IF-THEN prioritas tertinggi. 16 rule awal dari fase 1 MVP (§22 dokumen desain) + 7 rule tambahan fase 3 (ditandai FASE 3 di komentar masing-masing, per kategori yang sudah ada — tidak … |
| 275 | `economic-intelligence/engine/rule-engine.js` | 56 | engine/rule-engine.js — Evaluator IF-THEN generik (§9.2). SATU-SATUNYA tempat yang menjalankan condition/action dari rules/rule-definitions.js + rule custom hasil EIERegistry.registerRule() (§20). Cooldown anti-spam … |
| 276 | `economic-intelligence/engine/scoring-engine.js` | 69 | engine/scoring-engine.js — Orkestrasi EES/PEHS/ERI + Status Ekonomi (§5-8), memanggil RuleEngine (§9) untuk insight, lalu PERSIST hasil ke eie-store. Ini SATU-SATUNYA tempat yang menulis EIEScoreSnapshot & Insight[] ke … |
| 277 | `economic-intelligence/engine/insight-generator.js` | 43 | engine/insight-generator.js — Fase 1: template + slot filling SUDAH dilakukan langsung di dalam rule.action() (rules/rule-definitions.js), jadi file ini fokus jadi helper baca/kelola Insight[] tersimpan, dengan … |
| 278 | `economic-intelligence/services/macro-sync-service.js` | 25 | services/macro-sync-service.js — Orkestrasi refresh macro + recompute skor. Ini titik masuk utama yang dipanggil UI/scheduler (§2: "SATU- SATUNYA tempat menulis ke EIEStore.*" ada di layer services/engine). FASE 1 … |
| 279 | `economic-intelligence/services/notification-service.js` | 50 | services/notification-service.js — Event listener -> Notification API / in-app toast (§2, §14 dokumen desain). FASE 1 ("senyap", sesuai permintaan implementasi bertahap): service ini TIDAK subscribe ke EIEBus secara … |
| 280 | `economic-intelligence/services/recommendation-service.js` | 39 | services/recommendation-service.js — mapping recommendationId -> aksi konkret (deep link ke fitur app existing yang SUDAH ada, bukan fitur baru). Data-only map + 1 fungsi baca, tidak ada state/I/O. `target` di sini … |
| 281 | `economic-intelligence/scheduler/eie-scheduler.js` | 26 | scheduler/eie-scheduler.js — Trigger periodik untuk MacroSyncService (§14). FASE 1 ("senyap"): TIDAK ada setInterval yang otomatis jalan saat file ini dimuat. start()/stop() harus dipanggil eksplisit — supaya … |
| 282 | `economic-intelligence/ui/eie-dashboard.js` | 277 | ui/eie-dashboard.js — Kartu Status Ekonomi (§19). HANYA render, tidak pernah akses EIEStore/adapter langsung — selalu lewat EIEScoringEngine/ MacroSyncService. Dipanggil dari DashboardHub.render() (pola "tambahan murni" … |
| 283 | `economic-intelligence/ui/eie-insight-feed.js` | 50 | ui/eie-insight-feed.js — Feed insight & rekomendasi (§3, §19). HANYA render, akses data lewat InsightGenerator/RecommendationService (bukan EIEStore langsung). Baris rekomendasi ("→ ...") DAPAT DIKLIK — fase 2 UI yang … |
| 284 | `economic-intelligence/ui/eie-notif-settings.js` | 72 | ui/eie-notif-settings.js — Toggle notifikasi EIE di Pengaturan (fase 3). HANYA render + baca/tulis toggle lewat eie-store; tidak pernah menyentuh D (sama seperti ui/eie-dashboard.js & ui/eie-insight-feed.js). Menyalakan … |
| 285 | `economic-intelligence/eie-registry.js` | 43 | Plugin registry EIE. Dimuat PALING AKHIR (lihat urutan load di scripts/build.js), supaya EIE_RULES bawaan (rules/rule-definitions.js) sudah tersedia untuk diregistrasi sbg default. - registerIndicator(): daftar sumber … |
| 286 | `modules/ai/ai-core.js` | 313 | Smart Delivery Engine, Sesi 1/6: fondasi murni. Lihat RENCANA-SESI-RINGKAS.md (Smart Delivery Engine) untuk peta 6 sesi lengkap. Sesi ini CUMA fondasi (bus + storage + context) — TANPA fitur, TANPA … |
| 287 | `modules/ai/ai-decision-engine.js` | 381 | Smart Delivery Engine, Sesi 2/6: "otak" AI. Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. Sesi ini butuh Sesi 1 (ai-core.js: AIBus, AIStore/aiEnsureLoaded/aiGetStore/aiSave, AIContext) SUDAH dimuat lebih dulu — lihat … |
| 288 | `modules/ai/ai-service.js` | 665 | Smart Delivery Engine, Sesi 2/6: facade tunggal. Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. Butuh ai-core.js (Sesi 1) & ai-decision-engine.js (di atas, Sesi 2 ini) sudah dimuat lebih dulu — lihat urutan di … |
| 289 | `modules/logistics/logistics-engine.js` | 415 | Smart Delivery Engine, Sesi 3/6: mesin hitung logistik. Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. Sesi ini TIDAK butuh ai-core.js/ai-decision-engine.js/ai-service.js (Sesi 1-2) sama sekali — murni fungsi hitung … |
| 290 | `modules/logistics/logistics-service.js` | 130 | Smart Delivery Engine, Sesi 3/6: facade logistik. Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. Butuh logistics-engine.js (di atas, Sesi 3 ini) sudah dimuat lebih dulu — lihat urutan di scripts/build.js. Kenapa 1 … |
| 291 | `modules/shop/purchase-engine.js` | 94 | Shop Business Engine, S198 (Business Engine untuk Shop). TARGET EKSPLISIT USER (S198): "Buat Business Engine untuk Shop. Reuse seluruh Shop existing. Jangan ubah business logic. Jangan implementasi ke modul lain. Jangan … |
| 292 | `modules/shop/trip-engine.js` | 91 | Shop Business Engine, S198 (Business Engine untuk Shop). TripEngine = lapisan pengiriman/rit (ongkir, berat/volume/packing, muatan kendaraan, BBM). SAMA POLA dgn PurchaseEngine (file sebelah) & LogisticsEngine … |
| 293 | `modules/shop/inventory-engine.js` | 111 | Shop Business Engine, S198 (Business Engine untuk Shop). InventoryEngine = lapisan stok/katalog (nilai stok tertanam, status stok per produk, grup harga ukuran/gabungan, & rekomendasi restock). SAMA POLA dgn … |
| 294 | `modules/shop/profit-engine.js` | 74 | Shop Business Engine, S198 (Business Engine untuk Shop). ProfitEngine = lapisan profit/margin (untung per transaksi, rekap omzet periode, & rekomendasi harga jual). SAMA POLA dgn PurchaseEngine/ … |
| 295 | `modules/shop/generic/category-store.js` | 143 | Generic Shop Engine, Tahap 1 (Generic Domain Layer). KONTEKS: lanjutan dari AUDIT-PRA-IMPLEMENTASI-GENERIC-SHOP-ENGINE.md + ARSITEKTUR-SHOP-ENGINE-GENERIC.md. Karena KW tidak punya database SQL (PWA client-side murni, … |
| 296 | `modules/shop/generic/supplier-store.js` | 212 | Generic Shop Engine, Tahap 1 (Generic Domain Layer). SupplierStore = Master Supplier (setara `master_supplier` + `product_supplier` di skema SQL yang diusulkan) — AREA MIGRASI PERTAMA sesuai rekomendasi audit §6 (paling … |
| 297 | `modules/shop/generic/attribute-store.js` | 107 | Generic Shop Engine, Tahap 1 (Generic Domain Layer). AttributeStore = Master Product bagian sifat dinamis (setara `attribute_definition` + `product_attribute_value`/EAV di skema SQL yang diusulkan) — TAPI diterjemahkan … |
| 298 | `modules/shop/generic/product-store.js` | 135 | Generic Shop Engine, Tahap 1 (Generic Domain Layer). ProductStore = Master Product bagian identitas (setara `master_product` di skema SQL yang diusulkan, TANPA sisi atribut dinamis — lihat attribute-store.js utk itu). … |
| 299 | `modules/shop/generic/pricing-service.js` | 83 | Generic Shop Engine, Tahap 1 (Generic Domain Layer). PricingService = Master Pricing (setara `price_type` + `master_pricing` di skema SQL yang diusulkan) — "tipe harga sbg data, bukan kolom", diterjemahkan jadi PEMETAAN … |
| 300 | `modules/shop/generic/inventory-service.js` | 54 | Generic Shop Engine, Tahap 1 (Generic Domain Layer). InventoryService = Master Inventory (setara `master_inventory` + `inventory_movement` di skema SQL yang diusulkan) — versi yang cocok utk KW: TIDAK ada ledger … |
| 301 | `modules/shop/generic/product-repository.js` | 603 | Generic Shop Engine, Tahap 4 (Product CRUD Layer, PURE). Lanjutan Tahap 1-3 (category-store.js/supplier-store.js/attribute-store.js/ product-store.js/pricing-service.js/inventory-service.js) yang SEMUA cuma baca … |
| 302 | `modules/shop/delivery-plan-ui.js` | 207 | modules/shop/delivery-plan-ui.js — Delivery Plan UI (Sesi 203, Continue). Menutup gap yang dicatat di trip-engine.js ("Belum digunakan UI. Belum dihubungkan ke Shop.") & shop-business-engine-presenter.js ("TripEngine … |
| 303 | `modules/shop/shop-business-engine-presenter.js` | 232 | modules/shop/shop-business-engine-presenter.js — Shop Business Engine Presenter (Sesi 199, Finalisasi Integrasi Shop). Target sesi: audit menemukan PurchaseEngine/TripEngine/InventoryEngine/ProfitEngine (S198, … |
| 304 | `modules/shop/trip-presenter.js` | 166 | modules/shop/trip-presenter.js — Trip Presenter (Sesi 204-A). Menutup gap yang dicatat eksplisit di shop-business-engine-presenter.js: "TripEngine (S198) tidak dipakai di sini — tidak ada ringkasan 'pengiriman' yang … |
| 305 | `modules/shop/business-flow-presenter-inventory.js` | 1215 | modules/shop/business-flow-presenter-inventory.js — Business Flow Presenter, bagian Purchase Order / Movement / Inventory Transfer / Modal UI. DIPECAH dari modules/shop/business-flow-presenter.js (S205 dkk, audit ukuran … |
| 306 | `modules/shop/business-flow-presenter.js` | 1599 | modules/shop/business-flow-presenter.js — Business Flow Presenter (Sesi 205). WIRE ONLY: menyusun 4 tahap alur bisnis Shop — Purchase -> Trip -> Stock -> Sale — dari 2 presenter yang SUDAH ADA: … |
| 307 | `modules/finance/dana-kelolaan.js` | 287 | Dana Kelolaan / Managed Funds (Sesi 195). TARGET EKSPLISIT USER: "S195 Managed Funds. Reuse OwnershipEngine. Implementasikan Dana Kelolaan... Reuse existing modules. No audit. No refactor. No business logic changes." … |
| 308 | `modules/finance/dana-kelolaan-presenter.js` | 200 | Dana Kelolaan / Managed Funds Presenter (Sesi 195). Pola SAMA PERSIS PropertyManagementPresenter.render() (modules/asset/property-management-presenter.js, S102/Sesi 132): UI HANYA presenter, 100% reuse … |
| 309 | `modules/finance/titipan-reconcile.js` | 581 | Audit konsistensi Dana Titipan (Rekomendasi #2, S582 closeout; cabang Investasi ditambah S583 sesi-2; audit OwnerRegistry cross-domain Rekomendasi #3 ditambah S583 sesi-4; audit staleness nama Buku Utang pasca-rename … |
| 310 | `modules/finance/titipan-sync.js` | 210 | S583 Sesi 10a ("titipan-sync-single-gate", DESAIN AWAL). LATAR (Rekomendasi #1 dari 5 rekomendasi audit TitipanReconcile awal, tercatat "belum dikerjakan" di PATCH-NOTES sesi-2 s/d sesi-6): Aset._syncOwnerDebts(a) -- … |
| 311 | `modules/finance/dana-titipan-pool-api.js` | 193 | Dana Titipan: Pool (dana masuk aktual), entitas BARU terpisah dari `D.titipanCommitments[]` (porsi/alokasi per owner, sudah ada). Lihat `MASTER_HANDOFF_DANA_TITIPAN_POOL_PORSI.md` §5 (New Data Model), §14 (API … |
| 312 | `modules/finance/dana-titipan-aggregation-api.js` | 1041 | Dana Titipan dalam Investasi: Portfolio Allocation Projection (Sesi 484 + Sesi 485a-e + Sesi 486 + Sesi 499/B1 + Sesi B2 + Sesi E + Sesi 554 + Sesi 594). SESI R5 — REALISASI (sesi ini, menggantikan percobaan split … |
| 313 | `modules/finance/dana-titipan-commitment-return-api.js` | 282 | Dana Titipan: CRUD Commitment (pokok dikomit manual per owner, Sesi 485b/523) + CRUD Return (Sesi 486). SESI R5 — REALISASI (sesi ini). PECAHAN KEDUA dari `dana-titipan-portfolio-presenter.js` (versi produksi s597) — … |
| 314 | `modules/finance/dana-titipan-portfolio-render.js` | 1319 | Dana Titipan: render/UI (`DanaTitipanPortfolioPresenter`, `DanaTitipanCommitmentUI`, `DanaTitipanReturnUI`), termasuk baris pembanding otomatis "Estimasi dari Transaksi <Akun>" (`_expenseComparisonForOwner()`, Sesi … |
| 315 | `modules/finance/dana-titipan-portfolio-render-b.js` | 548 | bagian KEDUA dari modules/finance/dana-titipan-portfolio-render.js (audit ukuran file, sesi lanjutan setelah split scan-ocr.js). Titik potong bersih: TEPAT SETELAH penutup object `DanaTitipanPortfolioPresenter` (`};`), … |
| 316 | `modules/finance/titipan-expense-flow.js` | 250 | Sesi 521 (S521-A, implementasi Design Lock DESIGN-S520-DANA-TITIPAN-UI-MULTIOWNER.md, baseline v1251/S519). Scope: flow pencatatan pengeluaran Dana Titipan (single-owner & multi-owner) yang dipanggil dari modal khusus … |
| 317 | `modules/finance/titipan-expense-ui.js` | 380 | Sesi 521 (S521-B2, UI ONLY, DESIGN-S520-DANA- TITIPAN-UI-MULTIOWNER.md, baseline v1251/S519 + S521-A/S521-B1). Scope: SATU-SATUNYA hal baru di sesi ini adalah `TitipanExpenseUI` — controller DOM tipis buat modal … |
| 318 | `modules/vehicle/ride-activity-metrics.js` | 385 | RideActivityMetrics (S522, "Ride Activity Metrics Foundation"). HARD SCOPE sesi ini: PURE deterministic math functions saja — fondasi buat Ride Activity GPS recorder yang akan dibangun sesi-sesi berikutnya (S523+). … |
| 319 | `modules/vehicle/ride-gps-recorder.js` | 326 | RideGpsRecorder (S523, "GPS Recorder + Permission Foundation"). HARD SCOPE sesi ini: PRODUCER trackpoint via browser Geolocation API + lifecycle permission/start/pause/resume/stop yang deterministic. File ini TIDAK … |
| 320 | `modules/vehicle/ride-storage.js` | 569 | RideStorage (S524, "Ride Storage & Recovery Foundation"). HARD SCOPE sesi ini: persistence layer IndexedDB murni buat menyimpan & memulihkan ride recording — TIDAK mengubah GPS recorder (S523, ride-gps-recorder.js), … |
| 321 | `modules/vehicle/ride-ui.js` | 434 | RideUI (S525, "Ride UI Foundation"). HARD SCOPE sesi ini: PRESENTER/orkestrasi tipis yang menyatukan 3 fondasi ride yang sudah ada (S522 RideActivityMetrics, S523 RideGpsRecorder, S524 RideStorage) jadi satu alur … |
| 322 | `modules/vehicle/ride-map.js` | 404 | RideMap (S526, "Map / Route Foundation"). HARD SCOPE sesi ini: MAP ABSTRACTION murni buat menggambar rute (polyline) + posisi terkini dari trackpoints yang sudah ada (S522 RideActivityMetrics, S523 RideGpsRecorder, S524 … |
| 323 | `modules/vehicle/ride-history.js` | 310 | RideHistory + RideAnalytics (S527, "Ride History & Analytics"). HARD SCOPE sesi ini: presenter/aggregator TIPIS di atas fondasi ride yang sudah ada (S522 RideActivityMetrics, S524 RideStorage — termasuk listRides() dari … |
| 324 | `modules/vehicle/ride-vehicle-integration.js` | 210 | RideVehicleIntegration (S528, "Vehicle / Fuel / Maintenance Integration"). HARD SCOPE sesi ini: integration/ orchestration layer MURNI yang menghubungkan data Ride yang sudah ada … |

## 2. Index fungsi/variabel global → file (urut abjad)

Semua identifier top-level (`function`, `const`, `let`, `var`) yang
dideklarasikan langsung di level file (bukan di dalam fungsi lain) — ini yang
bisa dipanggil sebagai "global" dari file manapun lewat bundel gabungan.

| Nama | File |
|------|------|
| `_accBalCache` | `modules/finance/akun.js` |
| `_aiContextAsset` | `modules/ai/ai-core.js` |
| `_aiContextFinance` | `modules/ai/ai-core.js` |
| `_aiContextShop` | `modules/ai/ai-core.js` |
| `_aiContextVehicle` | `modules/ai/ai-core.js` |
| `_aiFindBrokenRecommendationRefs` | `modules/ai/ai-service.js` |
| `_aiFindDeadRuleIds` | `modules/ai/ai-service.js` |
| `_aiFindDuplicateRecommendations` | `modules/ai/ai-service.js` |
| `_aiFindDuplicateRuleIds` | `modules/ai/ai-service.js` |
| `_aiFindOrphanedStorageKeys` | `modules/ai/ai-service.js` |
| `_aiLastPendingCobekOrder` | `modules/ai/ai-service.js` |
| `_aiLoaded` | `modules/ai/ai-core.js` |
| `_aiMeasureMs` | `modules/ai/ai-core.js` |
| `_aiMeasureMsAsync` | `modules/ai/ai-core.js` |
| `_aiOwnerSig` | `modules/asset/investasi.js` |
| `_aiReminderAndTargetSummary` | `modules/ai/ai-service.js` |
| `_amc015` | `modules/finance/piutang-utang.js` |
| `_amc015` | `modules/shared/scan-ocr.js` |
| `_amc015` | `modules/finance/transaksi.js` |
| `_amc015` | `modules/finance/tagihan-kalender.js` |
| `_apiKeyEncSaveTimer` | `modules/shared/keamanan-pin.js` |
| `_assetAIRulesRegistered` | `modules/asset/aset-misc.js` |
| `_assetNetWorthDeclineCheck` | `modules/asset/aset-misc.js` |
| `_assetZakatDueCheck` | `modules/asset/aset-misc.js` |
| `_autoCreateVehicleAsset` | `modules/vehicle/vehicle-core.js` |
| `_b64FromBuf` | `modules/shared/keamanan-pin.js` |
| `_bigDataWarnShown` | `modules/shared/features-helpers-global-security.js` |
| `_billMultiDefaultChecked` | `modules/shared/scan-ocr.js` |
| `_billMultiIsNoiseLine` | `modules/shared/scan-ocr.js` |
| `_billMultiParseDateLine` | `modules/shared/scan-ocr.js` |
| `_bufFromB64` | `modules/shared/keamanan-pin.js` |
| `_buildSaveJson` | `modules/shared/features-helpers-global-security.js` |
| `_bulanIndoMap` | `modules/shared/scan-ocr.js` |
| `_cardCollapseShouldBeCollapsed` | `modules/shared/modal-navigasi.js` |
| `_cashflowForecastCache` | `modules/finance/tx-list-cashflow.js` |
| `_catalogWebImportUiProcessHtml` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `_catEditId` | `modules/vehicle/vehicle-catalog-ui.js` |
| `_catPhotos` | `modules/vehicle/vehicle-catalog-ui.js` |
| `_catPhotoToDataUrl` | `modules/vehicle/vehicle-catalog-ui.js` |
| `_catSelectedIds` | `modules/vehicle/vehicle-catalog-ui.js` |
| `_catSelectMode` | `modules/vehicle/vehicle-catalog-ui.js` |
| `_choiceModalAnswer` | `modules/shared/modal-navigasi.js` |
| `_choiceStore` | `modules/shared/modal-navigasi.js` |
| `_confirmModalAnswer` | `modules/shared/modal-navigasi.js` |
| `_confirmStore` | `modules/shared/modal-navigasi.js` |
| `_cpInMonth` | `modules/finance/cash-projection.js` |
| `_cpLocalDate` | `modules/finance/cash-projection.js` |
| `_cpWeeksInMonth` | `modules/finance/cash-projection.js` |
| `_crossFinanceDeliveryCheck` | `modules/ai/ai-decision-engine.js` |
| `_crossModuleAIRulesRegistered` | `modules/ai/ai-decision-engine.js` |
| `_dashCashProjFillSettingsPanel` | `modules/shared/modules-render.js` |
| `_dashCashProjGoToAbsensi` | `modules/shared/modules-render.js` |
| `_dashCashProjGoToTagihan` | `modules/shared/modules-render.js` |
| `_dashCashProjOpenDetail` | `modules/shared/modules-render.js` |
| `_dashCashProjRefreshAll` | `modules/shared/modules-render.js` |
| `_dashCashProjResetSettings` | `modules/shared/modules-render.js` |
| `_dashCashProjSetBillWindowMode` | `modules/shared/modules-render.js` |
| `_dashCashProjSetCycleDay` | `modules/shared/modules-render.js` |
| `_dashCashProjSetIncludeKiriman` | `modules/shared/modules-render.js` |
| `_dashCashProjSetIncludePendingGaji` | `modules/shared/modules-render.js` |
| `_dashCashProjSetKirimanVal` | `modules/shared/modules-render.js` |
| `_dashCashProjSetSurplusMonths` | `modules/shared/modules-render.js` |
| `_dashCashProjSettingsToggle` | `modules/shared/modules-render.js` |
| `_dashCashProjToggleSettings` | `modules/shared/modules-render.js` |
| `_dashHubAnalyticsMonthTx` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubCallAction` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubHeroMonthTx` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubIsFav` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubMonthTxShared` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubResolveGoToSection` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubSummaryMonthTx` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubTickerModernMonthTx` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashMonthlyIncExp` | `modules/shared/modules-render-b.js` |
| `_dashServisSelfVehicles` | `modules/shared/modules-render.js` |
| `_dataActionClickHandler` | `modules/shared/features-helpers-global-security.js` |
| `_dbPromise` | `modules/vehicle/ride-storage.js` |
| `_deliveryAIRulesRegistered` | `modules/shop/cobek-pricing.js` |
| `_deliveryLowStockCheck` | `modules/shop/cobek-pricing.js` |
| `_deliveryThinMarginCheck` | `modules/shop/cobek-pricing.js` |
| `_deriveApiKeyCryptoKey` | `modules/shared/keamanan-pin.js` |
| `_dialogSelfHeal` | `modules/shared/modal-navigasi.js` |
| `_digestSha256Hex` | `modules/shared/keamanan-pin.js` |
| `_eieComputeTrend` | `economic-intelligence/adapters/macro-data-adapter.js` |
| `_eieDebtStats` | `economic-intelligence/adapters/user-finance-adapter.js` |
| `_eieEmergencyFundMonths` | `economic-intelligence/adapters/user-finance-adapter.js` |
| `_eieExpenseMonthly` | `economic-intelligence/adapters/user-finance-adapter.js` |
| `_eieImportDependencyRatio` | `economic-intelligence/adapters/user-finance-adapter.js` |
| `_eieInvestmentBreakdown` | `economic-intelligence/adapters/user-finance-adapter.js` |
| `_eieLoaded` | `economic-intelligence/eie-store.js` |
| `_eieMonthsBack` | `economic-intelligence/adapters/user-finance-adapter.js` |
| `_eieSeedMacro` | `economic-intelligence/adapters/macro-data-adapter.js` |
| `_financeAIRulesRegistered` | `modules/finance/tx-list-cashflow.js` |
| `_financeLowBalanceCheck` | `modules/finance/tx-list-cashflow.js` |
| `_financeOverspendCheck` | `modules/finance/tx-list-cashflow.js` |
| `_focusTrapActivate` | `modules/shared/modal-navigasi.js` |
| `_focusTrapDeactivate` | `modules/shared/modal-navigasi.js` |
| `_focusTrapFocusableEls` | `modules/shared/modal-navigasi.js` |
| `_focusTrapKeydown` | `modules/shared/modal-navigasi.js` |
| `_focusTrapStack` | `modules/shared/modal-navigasi.js` |
| `_formatLockDuration` | `modules/shared/keamanan-pin.js` |
| `_friendlyErrorNotice` | `modules/shared/error-handler.js` |
| `_fuzzyAccountMatch` | `modules/shared/scan-ocr-b.js` |
| `_gcLastTotal` | `modules/business/gaji-calc.js` |
| `_gdriveDownloadBackupInner` | `gdrive-backup.js` |
| `_gdriveFindExistingBackupFileId` | `gdrive-backup.js` |
| `_gdriveLocalDataLooksEmpty` | `gdrive-backup.js` |
| `_gdriveSilentReconnectInProgress` | `gdrive-backup.js` |
| `_genId` | `modules/finance/tx-stok-sparepart.js` |
| `_genIdLocalLast` | `modules/finance/tx-stok-sparepart.js` |
| `_getOrCreatePinSalt` | `modules/shared/keamanan-pin.js` |
| `_getTxByAccIndex` | `modules/finance/akun.js` |
| `_globalSearchDebounce` | `global-search.js` |
| `_hondaImportCurrentId` | `modules/vehicle/honda-pdf-import-ui.js` |
| `_hondaImportHidePreview` | `modules/vehicle/honda-pdf-import-ui.js` |
| `_hondaImportRows` | `modules/vehicle/honda-pdf-import-ui.js` |
| `_hondaImportSetStatus` | `modules/vehicle/honda-pdf-import-ui.js` |
| `_hondaImportStatusLabel` | `modules/vehicle/honda-pdf-import-ui.js` |
| `_hondaPdfImportLoaded` | `modules/vehicle/honda-pdf-import.js` |
| `_hondaPdfImportNormalize` | `modules/vehicle/honda-pdf-import.js` |
| `_iaEsc` | `modules/asset/invest-ai-widget.js` |
| `_iaFmtRp` | `modules/asset/invest-ai-widget.js` |
| `_infoModalAnswer` | `modules/shared/modal-navigasi.js` |
| `_infoStore` | `modules/shared/modal-navigasi.js` |
| `_instances` | `modules/vehicle/ride-map.js` |
| `_invSave` | `modules/asset/investasi.js` |
| `_invToday` | `modules/asset/investasi.js` |
| `_invUid` | `modules/asset/investasi.js` |
| `_keuFilterPrefsLoaded` | `modules/finance/filter-laporan.js` |
| `_lapLastFilterSig` | `modules/finance/filter-laporan.js` |
| `_lastErrorToastAt` | `modules/shared/error-handler.js` |
| `_lastModalSweepData` | `self-test.js` |
| `_lastNavSmokeData` | `self-test.js` |
| `_lastSelfTestData` | `self-test.js` |
| `_lastUid` | `modules/shared/features-helpers-global-security.js` |
| `_lifeObjectValidateInput` | `lifeos/services/life-object-service.js` |
| `_lifeOSHighlightSettingsCard` | `lifeos/lifeos-nav.js` |
| `_lifeOSLoaded` | `lifeos/lifeos-store.js` |
| `_magnitudeScore` | `economic-intelligence/domain/scoring-formulas.js` |
| `_normalizeAccNameForMatch` | `modules/shared/scan-ocr-b.js` |
| `_normalizeInstrumentName` | `modules/asset/aset-misc.js` |
| `_ocrWorkerPromise` | `modules/shared/scan-ocr.js` |
| `_onTxShopSaleItemChangeInner` | `modules/shop/cobek-tx-cart.js` |
| `_onTxShopStockItemChangeInner` | `modules/shop/cobek-tx-cart.js` |
| `_openDialogOverlay` | `modules/shared/modal-navigasi.js` |
| `_paEsc` | `modules/asset/penyusutan-ai-widget.js` |
| `_paFmtRp` | `modules/asset/penyusutan-ai-widget.js` |
| `_pajakZakatRenderedOnce` | `pajak-aset-ui-wrappers.js` |
| `_parseIntervalKmFromText` | `modules/vehicle/sparepart-servis-b.js` |
| `_pendingChatActions` | `modules/ai/chat-action.js` |
| `_pinAutolockCheckOnResume` | `modules/shared/keamanan-pin.js` |
| `_pinLockRemainingMs` | `modules/shared/keamanan-pin.js` |
| `_pinLockState` | `modules/shared/keamanan-pin.js` |
| `_pinLockTimer` | `modules/shared/keamanan-pin.js` |
| `_pinPromptAnswer` | `modules/shared/modal-navigasi.js` |
| `_pinPromptStore` | `modules/shared/modal-navigasi.js` |
| `_pinPromptSubmit` | `modules/shared/modal-navigasi.js` |
| `_populateTxShopSaleSelectInner` | `modules/shop/cobek-tx-cart.js` |
| `_populateTxShopStockSelectInner` | `modules/shop/cobek-tx-cart.js` |
| `_populateVehAssetLinkSelect` | `modules/vehicle/vehicle-core.js` |
| `_populateVehOwnershipSelect` | `modules/vehicle/vehicle-core.js` |
| `_predictMonthlySeries` | `modules/finance/tx-list-cashflow.js` |
| `_promptModalAnswer` | `modules/shared/modal-navigasi.js` |
| `_promptModalSubmit` | `modules/shared/modal-navigasi.js` |
| `_promptStore` | `modules/shared/modal-navigasi.js` |
| `_queueDialog` | `modules/shared/modal-navigasi.js` |
| `_renderCashProjectionCard` | `modules/shared/modules-render.js` |
| `_renderSuggestBox` | `modules/vehicle/sparepart-servis.js` |
| `_repairLooseJson` | `modules/ai/chat-action.js` |
| `_resolveDialog` | `modules/shared/modal-navigasi.js` |
| `_resolveServisCategoryId` | `modules/finance/tx-servis.js` |
| `_saveAccInner` | `modules/finance/akun.js` |
| `_saveBillInner` | `modules/finance/tagihan-kalender.js` |
| `_saveDebounceTimer` | `modules/shared/features-helpers-global-security.js` |
| `_saveErrorShown` | `modules/shared/features-helpers-global-security.js` |
| `_saveGuards` | `modules/shared/features-helpers-global-security.js` |
| `_saveImmediate` | `modules/shared/features-helpers-global-security.js` |
| `_saveTxInner` | `modules/finance/transaksi-b.js` |
| `_scanBtnBusy` | `modules/shared/scan-ocr.js` |
| `_scanBtnCapture` | `modules/shared/scan-ocr.js` |
| `_scanBtnIdle` | `modules/shared/scan-ocr.js` |
| `_scanEpochNow` | `modules/shared/scan-ocr.js` |
| `_scanEpochStale` | `modules/shared/scan-ocr.js` |
| `_scannerSessionActive` | `modules/shared/scanner-session.js` |
| `_scannerSessionCount` | `modules/shared/scanner-session.js` |
| `_scannerSessionEnsureStyle` | `modules/shared/scanner-session.js` |
| `_scannerSessionEnteredAt` | `modules/shared/scanner-session.js` |
| `_scannerSessionHasLiveOverlay` | `modules/shared/scanner-session.js` |
| `_scannerSessionHideRecoveryBanner` | `modules/shared/scanner-session.js` |
| `_scannerSessionPrevChrome` | `modules/shared/scanner-session.js` |
| `_scannerSessionRecoveryEl` | `modules/shared/scanner-session.js` |
| `_scannerSessionRecoveryTick` | `modules/shared/scanner-session.js` |
| `_scannerSessionSelfHeal` | `modules/shared/scanner-session.js` |
| `_scannerSessionShowRecoveryBanner` | `modules/shared/scanner-session.js` |
| `_selfTestAssert` | `self-test.js` |
| `_sendChatInner` | `ai-chat.js` |
| `_servisAutoLinkAdjustStock` | `modules/finance/tx-servis.js` |
| `_sessionRawPin` | `modules/shared/keamanan-pin.js` |
| `_sha256Fallback` | `modules/shared/keamanan-pin.js` |
| `_sheetsPullInner` | `sheets-sync.js` |
| `_sheetsSyncInner` | `sheets-sync.js` |
| `_shopPdfImportRows` | `modules/business/shop-pdf-import-ui.js` |
| `_shopPdfImportSetStatus` | `modules/business/shop-pdf-import-ui.js` |
| `_shopPdfImportTarget` | `modules/business/shop-pdf-import-ui.js` |
| `_shopScanRows` | `modules/business/shop-scan-ui.js` |
| `_shopScanRun` | `modules/business/shop-scan-ui.js` |
| `_shopScanSetStatus` | `modules/business/shop-scan-ui.js` |
| `_shopScanTarget` | `modules/business/shop-scan-ui.js` |
| `_sparepartOcrCatalogAddSetSaveAction` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `_sparepartOcrCatalogAddStr` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `_sparepartOcrCatalogAddWritePrefill` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `_sparepartOcrCatalogDetailEsc` | `modules/vehicle/sparepart-ocr-catalog-detail.js` |
| `_sparepartOcrCatalogDetailFmtPrice` | `modules/vehicle/sparepart-ocr-catalog-detail.js` |
| `_sparepartScannerAdapters` | `modules/vehicle/sparepart-scanner.js` |
| `_sparepartScannerBusy` | `modules/vehicle/sparepart-scanner.js` |
| `_sparepartScannerLastTimestamp` | `modules/vehicle/sparepart-scanner.js` |
| `_sparepartScannerLastValue` | `modules/vehicle/sparepart-scanner.js` |
| `_sraiEsc` | `modules/self-reward/self-reward-ai-widget.js` |
| `_sraiFmtRp` | `modules/self-reward/self-reward-ai-widget.js` |
| `_srEsc` | `modules/self-reward/self-reward-view.js` |
| `_srFmtRp` | `modules/self-reward/self-reward-view.js` |
| `_stgOpenExternal` | `modules/shared/pengaturan-search.js` |
| `_stgSearchHighlighted` | `modules/shared/pengaturan-search.js` |
| `_syncNavVisibilityForModals` | `modules/shared/modal-navigasi.js` |
| `_syncServisUsedPartFromPurchase` | `modules/finance/tx-servis.js` |
| `_syncVehNilaiWrap` | `modules/vehicle/vehicle-core.js` |
| `_TOAST_GAP_MS` | `modules/shared/format-tema.js` |
| `_TOAST_QUEUE_MAX` | `modules/shared/format-tema.js` |
| `_toastGapTimer` | `modules/shared/format-tema.js` |
| `_toastHideTimer` | `modules/shared/format-tema.js` |
| `_toastQueue` | `modules/shared/format-tema.js` |
| `_toastShowing` | `modules/shared/format-tema.js` |
| `_toastShowNext` | `modules/shared/format-tema.js` |
| `_toastSuppressed` | `modules/shared/format-tema.js` |
| `_totalSaldoCache` | `modules/finance/akun.js` |
| `_txAccManuallySet` | `modules/shared/features-helpers-global-security.js` |
| `_txAssetManuallySet` | `modules/shared/features-helpers-global-security.js` |
| `_txByAccIndex` | `modules/finance/akun.js` |
| `_txCatLearnSource` | `modules/shared/features-helpers-global-security.js` |
| `_txHTMLInner` | `modules/finance/tx-list-cashflow.js` |
| `_txPayMethodTouchedByUser` | `modules/finance/transaksi.js` |
| `_txRenovStatus` | `modules/finance/tx-renov.js` |
| `_txSaving` | `modules/shared/features-helpers-global-security.js` |
| `_universalScanEmoji` | `modules/shared/scan-ocr-b.js` |
| `_uploadBackupToDriveInner` | `gdrive-backup.js` |
| `_vehCapacityFieldsHtml` | `modules/vehicle/vehicle-core.js` |
| `_vehicleAIRulesRegistered` | `modules/vehicle/sparepart-servis-b.js` |
| `_vehicleCatalogLoaded` | `modules/vehicle/vehicle-catalog.js` |
| `_vehicleCatalogNormalize` | `modules/vehicle/vehicle-catalog.js` |
| `_vehicleFuelEfficiencyDropCheck` | `modules/vehicle/sparepart-servis-b.js` |
| `_vehicleImportExtractCategory` | `modules/vehicle/vehicle-catalog-import.js` |
| `_vehicleImportFixOcrDigits` | `modules/vehicle/vehicle-catalog-import.js` |
| `_vehicleImportIsCategoryOnlyLine` | `modules/vehicle/vehicle-catalog-import.js` |
| `_vehicleImportIsOrphanCodeRow` | `modules/vehicle/vehicle-catalog-import.js` |
| `_vehicleImportParsePrice` | `modules/vehicle/vehicle-catalog-import.js` |
| `_vehicleImportParsePricePlain` | `modules/vehicle/vehicle-catalog-import.js` |
| `_vehicleImportRenderPageToBlob` | `modules/vehicle/vehicle-catalog-import.js` |
| `_vehicleImportSafeCategory` | `modules/vehicle/vehicle-catalog-import.js` |
| `_vehicleImportStitchOrphanCategoryRows` | `modules/vehicle/vehicle-catalog-import.js` |
| `_vehicleImportStitchOrphanCodeRows` | `modules/vehicle/vehicle-catalog-import.js` |
| `_vehicleImportStripNoiseLines` | `modules/vehicle/vehicle-catalog-import.js` |
| `_vehicleOverdueCheck` | `modules/vehicle/sparepart-servis-b.js` |
| `_vehicleScannerBusy` | `modules/vehicle/vehicle-scanner.js` |
| `_vehicleScannerLastTimestamp` | `modules/vehicle/vehicle-scanner.js` |
| `_vehicleScannerLastValue` | `modules/vehicle/vehicle-scanner.js` |
| `_vehicleWebImportIsNameCandidate` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `_vehicleWebImportIsPriceLine` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `_vehicleWebImportNormalizeToLines` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `_vehicleWebImportParsePriceLine` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `_vehImportRows` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `_vehImportSetStatus` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `_vehWebImportRows` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `_vehWebImportSetStatus` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `_writeLocalSnapshot` | `modules/shared/features-helpers-global-security.js` |
| `_wrLastTotal` | `modules/business/reset-gaji-mingguan.js` |
| `acBillNames` | `modules/finance/transaksi.js` |
| `AccOwners` | `modules/finance/akun.js` |
| `acProductNames` | `modules/finance/transaksi.js` |
| `acProdusenNames` | `modules/finance/transaksi.js` |
| `acShopCustomers` | `modules/shop/cobek-tx-cart.js` |
| `acSparepartCatCodes` | `modules/finance/transaksi.js` |
| `acSparepartCatNames` | `modules/finance/transaksi.js` |
| `acSpbuNames` | `modules/finance/transaksi.js` |
| `acStockCodes` | `modules/finance/transaksi.js` |
| `acStockNames` | `modules/finance/transaksi.js` |
| `ActionQueue` | `modules/cross/action-queue.js` |
| `actionQueueChatContext` | `ai-chat.js` |
| `actualWealthCAGR` | `pajak-aset-ui-wrappers.js` |
| `acTxNotes` | `modules/finance/transaksi.js` |
| `addMonthsClamped` | `modules/shared/features-helpers-global-security.js` |
| `addNewCatFromInput` | `modules/finance/transaksi.js` |
| `addOrderItem` | `modules/shop/cobek-io.js` |
| `addShopStockCartItem` | `modules/shop/cobek-tx-cart.js` |
| `addTarget` | `modules/finance/tx-target.js` |
| `addTxShopSaleCartItem` | `modules/shop/cobek-tx-cart.js` |
| `addWorkDay` | `modules/business/payroll-absensi.js` |
| `advanceBillNextDue` | `modules/finance/tagihan-kalender.js` |
| `Advisor` | `ai-chat.js` |
| `aggregateCustomers` | `modules/shop/cobek-io.js` |
| `aggregateOwnersAcrossHoldings` | `modules/finance/transaksi.js` |
| `AI_ASSET_ZAKAT_MIN_DEFAULT_RP` | `modules/asset/aset-misc.js` |
| `AI_DELIVERY_LOW_STOCK_DEFAULT_THRESHOLD` | `modules/shop/cobek-pricing.js` |
| `AI_DELIVERY_THIN_MARGIN_DEFAULT_PCT` | `modules/shop/cobek-pricing.js` |
| `AI_FINANCE_LOW_BALANCE_DEFAULT_MULTIPLIER` | `modules/finance/tx-list-cashflow.js` |
| `AI_FINANCE_OVERSPEND_DEFAULT_PCT` | `modules/finance/tx-list-cashflow.js` |
| `AI_PRIORITY_FROM_SEVERITY` | `modules/ai/ai-decision-engine.js` |
| `AI_REMINDER_DOMAIN_ORDER` | `modules/ai/ai-service.js` |
| `AI_SEVERITY_ORDER` | `modules/ai/ai-decision-engine.js` |
| `AI_STORE_DEFAULT` | `modules/ai/ai-core.js` |
| `AI_STORE_KEY` | `modules/ai/ai-core.js` |
| `AI_VALID_OUTCOMES` | `modules/ai/ai-decision-engine.js` |
| `AI_VALID_SEVERITIES` | `modules/ai/ai-decision-engine.js` |
| `AI_VEHICLE_FUEL_DROP_DEFAULT_PCT` | `modules/vehicle/sparepart-servis-b.js` |
| `AIBus` | `modules/ai/ai-core.js` |
| `AICommandCenter` | `modules/ai/ai-command-center.js` |
| `AIContext` | `modules/ai/ai-core.js` |
| `AIDailyBriefingCard` | `ai-chat.js` |
| `AIDecision` | `modules/ai/ai-decision-engine.js` |
| `aiEnsureLoaded` | `modules/ai/ai-core.js` |
| `aiErrorHint` | `ai-chat.js` |
| `aiGetStore` | `modules/ai/ai-core.js` |
| `AIHealthCheckWidget` | `ai-chat.js` |
| `aiInvalidateCache` | `modules/ai/ai-core.js` |
| `aiLoad` | `modules/ai/ai-core.js` |
| `aiQ` | `ai-chat.js` |
| `AIRecommendCard` | `ai-chat.js` |
| `aiSave` | `modules/ai/ai-core.js` |
| `AIScenarioWidget` | `ai-chat.js` |
| `AIService` | `modules/ai/ai-service.js` |
| `AISimulateWidget` | `ai-chat.js` |
| `AIStatusCard` | `ai-chat.js` |
| `AIStore` | `modules/ai/ai-core.js` |
| `AIWidget` | `ai-chat.js` |
| `ALOKASI_PRESETS` | `modules/asset/aset-misc.js` |
| `AlokasiAset` | `modules/asset/aset-misc.js` |
| `API_KEY_ENC_STORAGE_KEY` | `modules/shared/keamanan-pin.js` |
| `API_KEY_PBKDF2_ITER` | `modules/shared/keamanan-pin.js` |
| `APP_BUILD_VERSION` | `modules/shared/features-helpers-global-security.js` |
| `applyBillFilter` | `modules/finance/tagihan-kalender.js` |
| `applyBillPaymentTxSync` | `modules/finance/tagihan-kalender.js` |
| `applyBundleLinkedStock` | `modules/shop/cobek-tx-cart.js` |
| `applyCardCollapsePrefs` | `modules/shared/modal-navigasi.js` |
| `applyDashHubMainGridDefaultCollapse` | `modules/shared/features-helpers-global-security.js` |
| `applyEffectiveTheme` | `modules/shared/format-tema.js` |
| `applyLastAccForCat` | `modules/finance/transaksi.js` |
| `applyOneCardCollapsePref` | `modules/shared/modal-navigasi.js` |
| `applyPriceRekoWidgetOne` | `modules/shop/cobek-io.js` |
| `applyQuickScan` | `modules/shared/scan-ocr.js` |
| `applyRipplePosition` | `modules/shared/ripple-position.js` |
| `applySparepartIntervalSuggestion` | `modules/vehicle/sparepart-servis-b.js` |
| `applyStockPurchase` | `modules/finance/tx-stok-sparepart.js` |
| `applyStockUsage` | `modules/vehicle/sparepart-servis-b.js` |
| `applyTxBbmFromTx` | `modules/finance/tx-bbm.js` |
| `applyTxRenovFromTx` | `modules/finance/tx-renov.js` |
| `applyTxServisFromTx` | `modules/finance/tx-servis.js` |
| `applyTxShopSaleFromTx` | `modules/shop/cobek-tx-cart.js` |
| `applyTxShopStockFromTx` | `modules/shop/cobek-tx-cart.js` |
| `applyTxStockFromTx` | `modules/finance/tx-stok-sparepart.js` |
| `applyTxTitipanLinkageOnSave` | `modules/finance/transaksi.js` |
| `ARCHIVE_MODULES` | `modules/shared/data-archive.js` |
| `archiveAvailableYears` | `modules/shared/data-archive.js` |
| `archiveCollectByYears` | `modules/shared/data-archive.js` |
| `archiveExportedYears` | `modules/shared/data-archive.js` |
| `archiveExportStep` | `modules/shared/data-archive.js` |
| `archiveGetYear` | `modules/shared/data-archive.js` |
| `archiveSelectedYears` | `modules/shared/data-archive.js` |
| `areaAdapterFindOne` | `lifeos/adapters/area-adapter.js` |
| `areaAdapterList` | `lifeos/adapters/area-adapter.js` |
| `asArray` | `modules/vehicle/ride-activity-metrics.js` |
| `asArray` | `modules/vehicle/ride-map.js` |
| `Aset` | `modules/asset/aset.js` |
| `ASET_TAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `ASET_TAB_LABEL` | `modules/asset/aset-misc.js` |
| `ASET_TAB_ORDER` | `modules/asset/aset-misc.js` |
| `AsetKeluarga` | `modules/asset/aset-keluarga.js` |
| `askConfirm` | `modules/shared/modal-navigasi.js` |
| `ASSET_JENIS_KEYWORDS` | `modules/shared/scan-ocr.js` |
| `ASSET_JENIS_TO_INVESTMENT_TYPE` | `modules/asset/aset-misc.js` |
| `ASSET_MAINTENANCE_CARD_NAV_TARGETS` | `modules/asset/asset-maintenance-presenter.js` |
| `ASSET_NAME_EXCLUDE_RE` | `modules/shared/scan-ocr.js` |
| `ASSET_NAME_LABEL_RE` | `modules/shared/scan-ocr.js` |
| `ASSET_PORTFOLIO_CARD_NAV_TARGETS` | `modules/asset/asset-portfolio-presenter.js` |
| `assetActionDelete` | `modules/shared/action-wrappers.js` |
| `assetActionHistory` | `modules/shared/action-wrappers.js` |
| `assetActionScan` | `modules/shared/action-wrappers.js` |
| `assetActionViewVehicle` | `modules/shared/action-wrappers.js` |
| `assetCrossCheckWarning` | `modules/asset/investasi.js` |
| `AssetInsight` | `modules/asset/aset-misc.js` |
| `assetInvestmentLinkOptionsHtml` | `modules/asset/aset-misc.js` |
| `assetInvestmentMismatch` | `modules/asset/investasi.js` |
| `AssetMaintenanceAPI` | `modules/asset/asset-maintenance-api.js` |
| `AssetMaintenancePresenter` | `modules/asset/asset-maintenance-presenter.js` |
| `assetOwnerCellHtml` | `modules/asset/aset.js` |
| `AssetOwnershipSplitPresenter` | `modules/asset/asset-ownership-split-presenter.js` |
| `AssetOwnersMixin` | `modules/asset/aset-owners.js` |
| `AssetPortfolioAPI` | `modules/asset/asset-portfolio-api.js` |
| `AssetPortfolioPresenter` | `modules/asset/asset-portfolio-presenter.js` |
| `assetTableHTML` | `modules/asset/aset.js` |
| `assetTableRowHTML` | `modules/asset/aset.js` |
| `ATTR_FORM_MAP` | `modules/shop/cobek-etalase.js` |
| `AttributeStore` | `modules/shop/generic/attribute-store.js` |
| `autoBudgetName` | `budget.js` |
| `autoFillSparepartCode` | `modules/vehicle/sparepart-servis-b.js` |
| `autoFillStockCode` | `modules/vehicle/sparepart-servis-b.js` |
| `autoFillVehTaxBiaya` | `car-notes.js` |
| `AutoKat` | `modules/ai/kategorisasi-ai.js` |
| `autoSaveProfile` | `modules/shared/profil-pengaturan.js` |
| `autoSnapshotLifeBalanceIfNeeded` | `pajak-aset-ui-wrappers.js` |
| `autoSnapshotWealthIfNeeded` | `pajak-aset-ui-wrappers.js` |
| `backToSettingsPage` | `modules/shared/action-wrappers.js` |
| `BACKUP_HEALTH_OVERDUE_DAYS` | `modules/shared/backup-health-api.js` |
| `BACKUP_HISTORY_LIST_LIMIT` | `modules/shared/backup-history-presenter.js` |
| `BACKUP_HISTORY_MAX_ENTRIES` | `modules/shared/backup-history-api.js` |
| `BACKUP_REMINDER_DATA_THRESHOLD` | `modules/shared/modules-render.js` |
| `BACKUP_REMINDER_DISMISS_KEY` | `modules/shared/modules-render.js` |
| `BackupHealthAPI` | `modules/shared/backup-health-api.js` |
| `BackupHealthPresenter` | `modules/shared/backup-health-presenter.js` |
| `BackupHistoryAPI` | `modules/shared/backup-history-api.js` |
| `BackupHistoryPresenter` | `modules/shared/backup-history-presenter.js` |
| `backupModules` | `modules/shared/backup-restore.js` |
| `bayarPajakKendaraan` | `modules/vehicle/vehicle-core.js` |
| `BBM` | `car-notes.js` |
| `BIBIT_DETAIL_LABELS` | `modules/shared/scan-ocr-b.js` |
| `Bill` | `modules/finance/piutang-utang.js` |
| `BILL_ANOMALY_THRESHOLD_PCT` | `modules/finance/tagihan-kalender.js` |
| `BILL_MULTI_AMOUNT_RE` | `modules/shared/scan-ocr.js` |
| `BILL_MULTI_DATE_RE` | `modules/shared/scan-ocr.js` |
| `BILL_MULTI_NOISE_LINE_RE` | `modules/shared/scan-ocr.js` |
| `billActionDelete` | `modules/shared/action-wrappers.js` |
| `billActionDeleteArchive` | `modules/shared/action-wrappers.js` |
| `billActionEdit` | `modules/shared/action-wrappers.js` |
| `billActionHistory` | `modules/shared/action-wrappers.js` |
| `billActionPayAdvance` | `modules/shared/action-wrappers.js` |
| `billActionShareWA` | `modules/shared/action-wrappers.js` |
| `billArchiveActionButtonsHtml` | `modules/shared/modules-render.js` |
| `BILLCAL_MAX_ITER` | `modules/finance/tagihan-kalender.js` |
| `billCalYear` | `modules/finance/tagihan-kalender.js` |
| `BillFallbackScan` | `modules/finance/tagihan-kalender.js` |
| `billFilterStatus` | `modules/finance/tagihan-kalender.js` |
| `billingCycleRange` | `modules/finance/tx-list-cashflow.js` |
| `BillMultiScan` | `modules/shared/scan-ocr.js` |
| `billNextDueLocalMidnight` | `modules/finance/tagihan-kalender.js` |
| `billStatMonth` | `modules/finance/tagihan-kalender.js` |
| `billStatNavActive` | `modules/finance/tagihan-kalender.js` |
| `Budget` | `budget.js` |
| `budgetMatchesTx` | `budget.js` |
| `BUDGETRECO_NAV_TARGETS` | `modules/finance/budget-recommendation-presenter.js` |
| `BudgetRecommendationAPI` | `modules/finance/budget-recommendation-api.js` |
| `BudgetRecommendationPresenter` | `modules/finance/budget-recommendation-presenter.js` |
| `BudgetReko` | `budget.js` |
| `BudgetTabs` | `budget.js` |
| `buildBackupPayload` | `modules/shared/backup-restore.js` |
| `buildEvaluationView` | `modules/self-reward/self-reward-view.js` |
| `buildHeaderErrorMsg` | `modules/shop/cobek-io.js` |
| `buildLaporanExportData` | `laporan-export.js` |
| `buildModalBodyHtml` | `modules/self-reward/self-reward-view.js` |
| `buildPolylineAttr` | `modules/vehicle/ride-map.js` |
| `buildRouteMarkup` | `modules/vehicle/ride-map.js` |
| `buildSettingsFormHtml` | `modules/self-reward/self-reward-view.js` |
| `buildSummary` | `modules/vehicle/ride-history.js` |
| `BUSINESS_LIFECYCLE_STATUSES` | `modules/shop/business-flow-presenter.js` |
| `BusinessFlowPresenter` | `modules/shop/business-flow-presenter.js` |
| `BusinessFlowPresenterInventoryMixin` | `modules/shop/business-flow-presenter-inventory.js` |
| `byteSize` | `modules/shared/data-archive.js` |
| `calcBackspace` | `modules/shared/kalkulator-input.js` |
| `calcCicilanPerBulanFromTotal` | `modules/finance/cicilan.js` |
| `calcCicilanTotalFromPerBulan` | `modules/finance/cicilan.js` |
| `calcClear` | `modules/shared/kalkulator-input.js` |
| `calcEES` | `economic-intelligence/domain/scoring-formulas.js` |
| `calcEquals` | `modules/shared/kalkulator-input.js` |
| `calcERI` | `economic-intelligence/domain/scoring-formulas.js` |
| `calcGaji` | `modules/business/gaji-calc.js` |
| `calcPEHS` | `economic-intelligence/domain/scoring-formulas.js` |
| `calcPress` | `modules/shared/kalkulator-input.js` |
| `calcPreviewValue` | `modules/shared/kalkulator-input.js` |
| `calcRenderDisplay` | `modules/shared/kalkulator-input.js` |
| `calcTargetId` | `modules/shared/kalkulator-input.js` |
| `calculateFuel` | `modules/shop/cobek-pricing.js` |
| `calculateProfit` | `modules/shop/cobek-pricing.js` |
| `calculateRebalance` | `modules/shared/modules-calc.js` |
| `calculateRemainingShare` | `modules/shared/modules-calc.js` |
| `calculateSmartDelivery` | `modules/shop/cobek-order.js` |
| `calculateVehicleCapacity` | `modules/shop/cobek-pricing.js` |
| `calcUseResult` | `modules/shared/kalkulator-input.js` |
| `callAIProviderRaw` | `ai-chat.js` |
| `cancelCatModal` | `modules/shared/action-wrappers.js` |
| `cancelChatAction` | `ai-chat.js` |
| `cancelChatActionEdit` | `ai-chat.js` |
| `cancelEditWorkDay` | `modules/business/payroll-absensi.js` |
| `CARD_COLLAPSE_DEFAULT_CLOSED` | `modules/shared/modal-navigasi.js` |
| `CARD_NAV_TARGET` | `modules/shop/trip-presenter.js` |
| `CARD_NAV_TARGETS` | `modules/shop/business-flow-presenter.js` |
| `carNotesFabOpenBbm` | `modules/shared/action-wrappers.js` |
| `carNotesFabOpenServis` | `modules/shared/action-wrappers.js` |
| `carNotesFabToggleMain` | `modules/shared/action-wrappers.js` |
| `CASHFLOW_PROJ_SETTINGS_DEFAULT` | `modules/finance/cashflow-projection-settings.js` |
| `cashflowActionSuggestion` | `modules/finance/tagihan-kalender.js` |
| `CASHFLOWPROJ_NAV_TARGETS` | `modules/finance/cashflow-projection-presenter.js` |
| `CashFlowProjectionAPI` | `modules/finance/cashflow-projection-api.js` |
| `CashFlowProjectionPresenter` | `modules/finance/cashflow-projection-presenter.js` |
| `CashflowProjSettings` | `modules/finance/cashflow-projection-settings.js` |
| `CAT_LEARN_KEY_BLOCKLIST` | `modules/shared/scan-ocr.js` |
| `catalogImportUiCommit` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `catalogImportUiEditField` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `catalogImportUiOnFileChange` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `catalogImportUiOpen` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `catalogImportUiPickFile` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `catalogImportUiRenderPreview` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `catalogImportUiToggleRow` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `catalogUiAddPhoto` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiClearSelection` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiCloseForm` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiOnScanResult` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiOpen` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiOpenForm` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiPickPhoto` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiRemove` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiRemoveAllConfirm` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiRemovePhoto` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiRemoveSelected` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiRenderList` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiRenderPhotos` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiRenderVehicleChecklist` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiSave` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiSelectAll` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiToggleSelectItem` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogUiToggleSelectMode` | `modules/vehicle/vehicle-catalog-ui.js` |
| `catalogWebImportUiCommit` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `catalogWebImportUiEditField` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `catalogWebImportUiFetch` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `catalogWebImportUiOpen` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `catalogWebImportUiProcessPaste` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `catalogWebImportUiRenderPreview` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `catalogWebImportUiToggleRow` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `catatZakatDibayar` | `pajak-aset-ui-wrappers.js` |
| `CategoryStore` | `modules/shop/generic/category-store.js` |
| `catLearnKey` | `modules/shared/scan-ocr.js` |
| `catVisibleForVehicle` | `modules/vehicle/sparepart-servis.js` |
| `changeAbsensiWeek` | `modules/business/gaji-calc.js` |
| `changeBillStatMonth` | `modules/finance/tagihan-kalender.js` |
| `changeMonth` | `modules/finance/tx-list-cashflow.js` |
| `changeOrderQty` | `modules/shop/cobek-io.js` |
| `changeTxListMonth` | `modules/finance/tx-list-cashflow.js` |
| `CHAT_ACTION_EDIT_FIELDS` | `chat-action-handlers.js` |
| `CHAT_ACTION_HANDLERS` | `chat-action-handlers.js` |
| `CHAT_ACTION_LABELS` | `chat-action-handlers.js` |
| `chatActionEditFormHTML` | `ai-chat.js` |
| `chatActionSummary` | `modules/ai/chat-action.js` |
| `chatInited` | `modules/ai/chat-action.js` |
| `checkAndFireReminders` | `reminder-notif.js` |
| `checkBills` | `modules/finance/tagihan-kalender.js` |
| `CHECKOUT_ADDR_RE` | `modules/shared/scan-ocr.js` |
| `CHECKOUT_PRICE_CUT_RE` | `modules/shared/scan-ocr.js` |
| `CHECKOUT_RATING_PREFIX_RE` | `modules/shared/scan-ocr.js` |
| `CHECKOUT_TOTAL_FALLBACK_RE` | `modules/shared/scan-ocr.js` |
| `CHECKOUT_TOTAL_RE` | `modules/shared/scan-ocr.js` |
| `CHECKOUT_UI_EXCLUDE_RE` | `modules/shared/scan-ocr.js` |
| `checkPin` | `modules/shared/keamanan-pin.js` |
| `checkWeeklySalaryReset` | `modules/business/reset-gaji-mingguan.js` |
| `CICILAN_PATTERNS` | `modules/shared/scan-ocr.js` |
| `cicilanDateLinked` | `modules/shared/features-helpers-global-security.js` |
| `cicilanLastInput` | `modules/shared/features-helpers-global-security.js` |
| `cicilanSharedLastInput` | `modules/shared/features-helpers-global-security.js` |
| `clamp` | `economic-intelligence/domain/scoring-formulas.js` |
| `classifyEconomicStatus` | `economic-intelligence/domain/status-classifier.js` |
| `classifyIntervalSpeed` | `modules/vehicle/ride-activity-metrics.js` |
| `cleanCatOptText` | `budget.js` |
| `clear` | `modules/vehicle/ride-map.js` |
| `clearChat` | `modules/shared/features-helpers-global-security.js` |
| `clearRideStorage` | `modules/vehicle/ride-storage.js` |
| `clickAssetImportFile` | `modules/shared/action-wrappers.js` |
| `clickElById` | `modules/shared/action-wrappers.js` |
| `cloneSession` | `modules/vehicle/ride-storage.js` |
| `cloneTrackpoint` | `modules/vehicle/ride-storage.js` |
| `closeAllKeuFabs` | `modules/shared/action-wrappers.js` |
| `closeCalc` | `modules/shared/kalkulator-input.js` |
| `closeModal` | `modules/shared/modal-navigasi.js` |
| `closeQS` | `modules/shared/modal-navigasi.js` |
| `CN_TAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `CN_TAB_LABEL` | `modules/vehicle/vehicle-core.js` |
| `CN_TAB_ORDER` | `modules/finance/filter-laporan.js` |
| `CNB_SUBTAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `CNB_SUBTAB_LABEL` | `modules/vehicle/vehicle-core.js` |
| `CNB_SUBTAB_ORDER` | `modules/vehicle/vehicle-core.js` |
| `CNI_SUBTAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `CNI_SUBTAB_LABEL` | `modules/vehicle/vehicle-core.js` |
| `CNI_SUBTAB_ORDER` | `modules/vehicle/vehicle-core.js` |
| `codeFromName` | `modules/vehicle/sparepart-servis.js` |
| `commitCurKmEdit` | `modules/vehicle/vehicle-core.js` |
| `commitGoldImport` | `modules/asset/aset-emas-impor.js` |
| `commitImportKatalog` | `modules/shop/cobek-io.js` |
| `commitImportShopExcel` | `modules/shop/cobek-io.js` |
| `commitShopCsvImport` | `modules/business/shop-data-io-api.js` |
| `commitShopJsonImport` | `modules/business/shop-data-io-api.js` |
| `commitSparepartCsvImport` | `modules/vehicle/sparepart-servis-b.js` |
| `computeAccRunningBalances` | `modules/finance/akun.js` |
| `computeBounds` | `modules/vehicle/ride-map.js` |
| `computeCashflowForecast` | `modules/finance/tx-list-cashflow.js` |
| `computeFileSizeStatus` | `diagnostik-versi.js` |
| `computeModalSweepFnNames` | `self-test.js` |
| `computeModuleSyncStatus` | `diagnostik-versi.js` |
| `computeNavSmokePageNames` | `self-test.js` |
| `computeNavSmokeTestResults` | `self-test.js` |
| `computeNoSpendLast30` | `pajak-aset-ui-wrappers.js` |
| `computeOrderTotals` | `modules/shop/cobek-io.js` |
| `computeProductionSyncStatus` | `diagnostik-versi.js` |
| `computeRipplePercent` | `modules/shared/ripple-position.js` |
| `computeSelfTestResults` | `self-test.js` |
| `computeServiceUrgency` | `modules/vehicle/sparepart-servis.js` |
| `computeTxShopSaleTotals` | `modules/shop/cobek-tx-cart.js` |
| `confirmChatAction` | `ai-chat.js` |
| `confirmWeeklyReset` | `modules/business/reset-gaji-mingguan.js` |
| `copyNavSmokeResults` | `self-test.js` |
| `copySelfTestResults` | `self-test.js` |
| `countBillFallbackAmbiguousSkipped` | `modules/finance/tagihan-kalender.js` |
| `countFallbackBillPaymentCandidates` | `modules/finance/tagihan-kalender.js` |
| `create` | `modules/vehicle/ride-map.js` |
| `createPiutangUtangAutoTx` | `modules/finance/piutang-utang.js` |
| `createRecorderInstance` | `modules/vehicle/ride-gps-recorder.js` |
| `createRide` | `modules/vehicle/ride-storage.js` |
| `CrossAIHook` | `modules/cross/cross-ai-hook.js` |
| `CrossDashboardCard` | `modules/cross/cross-dashboard-card.js` |
| `CrossInsightPresenter` | `modules/cross/cross-insight-presenter.js` |
| `CrossModuleWidgets` | `modules/cross/cross-module-widgets.js` |
| `CrossSummaryAPI` | `modules/cross/finance-vehicle-cross-summary.js` |
| `curBillHistoryId` | `modules/finance/tagihan-kalender.js` |
| `curBillType` | `modules/shared/features-helpers-global-security.js` |
| `curCatFilter` | `modules/shared/features-helpers-global-security.js` |
| `curMonth` | `modules/shared/features-helpers-global-security.js` |
| `curPayMethod` | `modules/shared/features-helpers-global-security.js` |
| `currentNetWorthValue` | `pajak-aset-ui-wrappers.js` |
| `curShopStockCart` | `modules/shop/cobek-tx-cart.js` |
| `curTxShopSaleCart` | `modules/shop/cobek-tx-cart.js` |
| `curTxType` | `modules/shared/features-helpers-global-security.js` |
| `curVehicleId` | `modules/shared/features-helpers-global-security.js` |
| `CustodianRegistry` | `modules/shared/custodian-registry.js` |
| `customerKey` | `modules/shop/cobek-io.js` |
| `D` | `modules/shared/features-helpers-global-security.js` |
| `DanaDaruratAI` | `modules/shared/modules-calc.js` |
| `DanaKelolaan` | `modules/finance/dana-kelolaan.js` |
| `DANAKELOLAAN_NAV_TARGETS` | `modules/finance/dana-kelolaan-presenter.js` |
| `DanaKelolaanInsight` | `modules/finance/dana-kelolaan-presenter.js` |
| `DanaKelolaanPresenter` | `modules/finance/dana-kelolaan-presenter.js` |
| `DanaTitipanCommitmentUI` | `modules/finance/dana-titipan-portfolio-render-b.js` |
| `DanaTitipanPoolAPI` | `modules/finance/dana-titipan-pool-api.js` |
| `DanaTitipanPoolUI` | `modules/finance/dana-titipan-portfolio-render-b.js` |
| `DanaTitipanPortfolioAPI` | `modules/finance/dana-titipan-aggregation-api.js` |
| `DanaTitipanPortfolioPresenter` | `modules/finance/dana-titipan-portfolio-render.js` |
| `DanaTitipanReturnUI` | `modules/finance/dana-titipan-portfolio-render-b.js` |
| `DASH_CARD_BY_KEY` | `modules/shared/modules-render.js` |
| `DASH_CARD_DEFS` | `modules/shared/modules-render.js` |
| `DASH_COMPACT_KEY` | `modules/dashboard-hub/dashboard-hub-settings.js` |
| `DASH_DEFAULT_TAB_KEY` | `modules/dashboard-hub/dashboard-hub-settings.js` |
| `DASH_DEFAULT_TAB_VALUES` | `modules/dashboard-hub/dashboard-hub-settings.js` |
| `DASH_DENSITY_KEY` | `modules/dashboard-hub/dashboard-hub-settings.js` |
| `DASH_DENSITY_VALUES` | `modules/dashboard-hub/dashboard-hub-settings.js` |
| `DASH_RENDER_ORDER` | `modules/shared/modules-render.js` |
| `DashboardHub` | `modules/dashboard-hub/dashboard-hub.js` |
| `DashboardHubAnalytics` | `modules/dashboard-hub/dashboard-hub.js` |
| `DashboardHubFavoritView` | `modules/dashboard-hub/dashboard-hub-favorit-view.js` |
| `DashboardHubHero` | `modules/dashboard-hub/dashboard-hub.js` |
| `DashboardHubOwnershipSummary` | `modules/dashboard-hub/dashboard-hub.js` |
| `DashboardHubSearch` | `modules/dashboard-hub/dashboard-hub-search.js` |
| `DashboardHubSummary` | `modules/dashboard-hub/dashboard-hub.js` |
| `DashboardHubTickerModern` | `modules/dashboard-hub/dashboard-hub.js` |
| `DashboardSettings` | `modules/dashboard-hub/dashboard-hub-settings.js` |
| `DASHHUB_GOTO_SECTION_MAP` | `modules/dashboard-hub/dashboard-hub.js` |
| `DASHHUB_OWNERSHIP_SUMMARY_ORDER` | `modules/dashboard-hub/dashboard-hub.js` |
| `dashHubNavigateToFeature` | `modules/dashboard-hub/dashboard-hub.js` |
| `dashHubQaBackup` | `modules/shared/action-wrappers.js` |
| `dashHubQaBackupHistory` | `modules/shared/action-wrappers.js` |
| `dashHubQaDanaTitipan` | `modules/shared/action-wrappers.js` |
| `dashHubQaFocusSearch` | `modules/shared/action-wrappers.js` |
| `dashHubQaOpenAI` | `modules/shared/action-wrappers.js` |
| `dashHubQaTambahTransaksi` | `modules/shared/action-wrappers.js` |
| `dashHubSearchFeatures` | `modules/dashboard-hub/dashboard-hub-search.js` |
| `dashServisVehFilter` | `modules/vehicle/sparepart-servis-b.js` |
| `DATA_MIGRATIONS` | `modules/shared/features-helpers-global-security.js` |
| `DataHealth` | `data-health-check.js` |
| `dateStatusBadge` | `modules/vehicle/vehicle-core.js` |
| `dateToISO` | `modules/shared/helper-teks.js` |
| `daysUntilDate` | `modules/vehicle/vehicle-core.js` |
| `DB_NAME` | `modules/vehicle/ride-storage.js` |
| `DB_VERSION` | `modules/vehicle/ride-storage.js` |
| `Debt` | `modules/finance/piutang-utang.js` |
| `DEBTOPTIMIZER_NAV_TARGETS` | `modules/finance/debt-optimizer-presenter.js` |
| `DebtOptimizerAPI` | `modules/finance/debt-optimizer-api.js` |
| `DebtOptimizerPresenter` | `modules/finance/debt-optimizer-presenter.js` |
| `DebtStrategy` | `modules/finance/piutang-utang.js` |
| `DecisionCenterAPI` | `modules/cross/decision-center-api.js` |
| `DecisionCenterHome` | `modules/cross/decision-center-home.js` |
| `decryptApiKeyWithPin` | `modules/shared/keamanan-pin.js` |
| `DEFAULT_ACCOUNTS` | `modules/shared/data-default.js` |
| `DEFAULT_CATS` | `modules/shared/data-default.js` |
| `DEFAULT_COBEK_KATEGORI` | `modules/shared/data-default.js` |
| `DEFAULT_OPTIONS` | `modules/vehicle/ride-activity-metrics.js` |
| `DEFAULT_OWNERSHIP` | `modules/shared/ownership-engine.js` |
| `DEFAULT_SPAREPARTS` | `modules/shared/data-default.js` |
| `delAcc` | `modules/finance/akun.js` |
| `delAsset` | `pajak-aset-ui-wrappers.js` |
| `delBbm` | `modules/vehicle/vehicle-core.js` |
| `delBill` | `modules/finance/tagihan-kalender.js` |
| `delBillArchive` | `modules/finance/tagihan-kalender.js` |
| `delCat` | `modules/finance/kategori.js` |
| `delCatFromModal` | `modules/finance/kategori.js` |
| `delDebt` | `pajak-aset-ui-wrappers.js` |
| `deleteBbmFromModal` | `modules/vehicle/vehicle-core.js` |
| `deleteBillHistoryTx` | `modules/finance/tagihan-kalender.js` |
| `deleteBudget` | `budget.js` |
| `deleteRide` | `modules/vehicle/ride-storage.js` |
| `deleteServisFromModal` | `modules/vehicle/sparepart-servis-b.js` |
| `deleteTxFromModal` | `modules/finance/transaksi.js` |
| `DeliveryPlanUI` | `modules/shop/delivery-plan-ui.js` |
| `delPiutang` | `pajak-aset-ui-wrappers.js` |
| `delProduct` | `modules/shop/cobek-tx-cart.js` |
| `delProdusen` | `modules/shop/cobek-io.js` |
| `delReminder` | `modules/finance/transaksi-b.js` |
| `delServis` | `modules/vehicle/sparepart-servis-b.js` |
| `delShop` | `modules/shop/cobek-io.js` |
| `delSim` | `modules/vehicle/vehicle-core.js` |
| `delSparepart` | `modules/vehicle/sparepart-servis-b.js` |
| `delStock` | `modules/vehicle/sparepart-servis-b.js` |
| `delSubCat` | `modules/finance/kategori.js` |
| `delTarget` | `modules/finance/tx-target.js` |
| `delTx` | `modules/finance/tx-list-cashflow.js` |
| `delVehicle` | `modules/vehicle/vehicle-core.js` |
| `delWealthSnapshot` | `pajak-aset-ui-wrappers.js` |
| `delWorkDay` | `modules/business/payroll-absensi.js` |
| `delZakatLog` | `pajak-aset-ui-wrappers.js` |
| `destroy` | `modules/vehicle/ride-map.js` |
| `detectPaylaterDueNextMonth` | `modules/shared/scan-ocr.js` |
| `detectScreenType` | `modules/shared/scan-ocr-b.js` |
| `detectScreenTypeScores` | `modules/shared/scan-ocr-b.js` |
| `detectScreenTypeWithConfidence` | `modules/shared/scan-ocr-b.js` |
| `disablePinFlow` | `modules/shared/keamanan-pin.js` |
| `dismissAllToasts` | `modules/shared/format-tema.js` |
| `dismissBackupReminder` | `modules/shared/modules-render.js` |
| `downscaleImage` | `modules/shared/scan-ocr.js` |
| `EARTH_RADIUS_M` | `modules/vehicle/ride-activity-metrics.js` |
| `editAccIdx` | `modules/finance/akun.js` |
| `editBillHistoryTx` | `modules/finance/tagihan-kalender.js` |
| `editChatAction` | `ai-chat.js` |
| `editSimId` | `modules/vehicle/vehicle-core.js` |
| `editSparepartFromReminder` | `modules/vehicle/sparepart-servis-b.js` |
| `editTx` | `modules/finance/transaksi.js` |
| `editVehicle` | `modules/vehicle/vehicle-core.js` |
| `editVehicleIntervalOverride` | `modules/vehicle/sparepart-servis.js` |
| `editWorkDay` | `modules/business/payroll-absensi.js` |
| `EduFund` | `modules/finance/edukasi-dana.js` |
| `EduFundInsight` | `modules/ai/feature-insights.js` |
| `EES_WEIGHTS` | `economic-intelligence/domain/scoring-formulas.js` |
| `EIE_IMPORT_KEYWORDS` | `economic-intelligence/adapters/user-finance-adapter.js` |
| `EIE_MACRO_INDICATORS` | `economic-intelligence/adapters/macro-data-adapter.js` |
| `EIE_RECOMMENDATIONS` | `economic-intelligence/services/recommendation-service.js` |
| `EIE_RULES` | `economic-intelligence/rules/rule-definitions.js` |
| `EIE_SEVERITY_ORDER` | `economic-intelligence/engine/rule-engine.js` |
| `EIE_STORE_DEFAULT` | `economic-intelligence/eie-store.js` |
| `EIE_STORE_KEY` | `economic-intelligence/eie-store.js` |
| `EIE_VALID_SEVERITIES` | `economic-intelligence/rules/rule-schema.js` |
| `EIEBus` | `economic-intelligence/eie-bus.js` |
| `EIEDashboard` | `economic-intelligence/ui/eie-dashboard.js` |
| `eieEnsureLoaded` | `economic-intelligence/eie-store.js` |
| `eieGetStore` | `economic-intelligence/eie-store.js` |
| `EIEInsightFeed` | `economic-intelligence/ui/eie-insight-feed.js` |
| `eieInvalidateCache` | `economic-intelligence/eie-store.js` |
| `eieLoad` | `economic-intelligence/eie-store.js` |
| `eieManualSync` | `economic-intelligence/ui/eie-dashboard.js` |
| `EIENotifSettings` | `economic-intelligence/ui/eie-notif-settings.js` |
| `EIERegistry` | `economic-intelligence/eie-registry.js` |
| `eieSave` | `economic-intelligence/eie-store.js` |
| `EIEScheduler` | `economic-intelligence/scheduler/eie-scheduler.js` |
| `EIEScoringEngine` | `economic-intelligence/engine/scoring-engine.js` |
| `EIEStore` | `economic-intelligence/eie-store.js` |
| `eieToggleWatchlistDetail` | `economic-intelligence/ui/eie-dashboard.js` |
| `emptyStateMarkup` | `modules/vehicle/ride-map.js` |
| `enablePinFlow` | `modules/shared/keamanan-pin.js` |
| `enableSwipeToDismiss` | `modules/shared/modal-navigasi.js` |
| `encryptApiKeyWithPin` | `modules/shared/keamanan-pin.js` |
| `ensureGajiCategory` | `modules/business/reset-gaji-mingguan.js` |
| `ensurePdfJs` | `modules/vehicle/vehicle-catalog-import.js` |
| `ensureZXing` | `modules/vehicle/vehicle-scanner.js` |
| `escapeHtml` | `modules/shared/helper-teks.js` |
| `estimateKmPerDay` | `modules/vehicle/vehicle-core.js` |
| `estimateRpPerKm` | `modules/vehicle/vehicle-core.js` |
| `estimateServiceDateISO` | `modules/vehicle/vehicle-core.js` |
| `Etalase` | `modules/shop/cobek-etalase.js` |
| `evalAmtExpr` | `modules/shared/kalkulator-input.js` |
| `exportCSV` | `modules/shared/backup-restore.js` |
| `exportData` | `modules/shared/backup-restore.js` |
| `exportJSON` | `modules/shared/backup-restore.js` |
| `exportLaporanImage` | `laporan-export.js` |
| `exportLaporanPDF` | `laporan-export.js` |
| `exportLaporanShopXLSX` | `modules/shop/cobek-io.js` |
| `exportShopEtalaseXLSX` | `modules/shop/cobek-io.js` |
| `exportShopPelangganXLSX` | `modules/shop/cobek-io.js` |
| `exportShopProdusenXLSX` | `modules/shop/cobek-io.js` |
| `exportShopRiwayatXLSX` | `modules/shop/cobek-io.js` |
| `exportShopSemuaXLSX` | `modules/shop/cobek-io.js` |
| `exportSparepartCategoryCSV` | `modules/vehicle/sparepart-servis-b.js` |
| `EXTRA_MODAL_SWEEP_SPECS` | `self-test.js` |
| `extractBibitKeuntungan` | `modules/shared/scan-ocr-b.js` |
| `extractBitgetFields` | `modules/shared/scan-ocr.js` |
| `extractDateFromText` | `modules/shared/scan-ocr.js` |
| `extractLabeledAmount` | `modules/shared/scan-ocr.js` |
| `extractOdometerKm` | `modules/shared/scan-ocr.js` |
| `extractPortfolioFields` | `modules/shared/scan-ocr.js` |
| `fallbackMatchAmount` | `modules/finance/tagihan-kalender.js` |
| `FEATURE_REGISTRY` | `modules/dashboard-hub/dashboard-hub-registry.js` |
| `FeatureIcons` | `modules/shared/feature-icons.js` |
| `FeatureInsightUI` | `modules/ai/feature-insights.js` |
| `FI` | `modules/shared/modules-calc.js` |
| `fiAnnualExpense` | `modules/shared/modules-calc.js` |
| `fiAssetFund` | `modules/shared/modules-calc.js` |
| `fiCalcAge` | `modules/shared/modules-calc.js` |
| `fiEffectiveMonths` | `modules/shared/modules-calc.js` |
| `fiEstimateMonthsToTarget` | `modules/shared/modules-calc.js` |
| `fiFormatMonths` | `modules/shared/modules-calc.js` |
| `fiGetAssumptions` | `modules/shared/modules-calc.js` |
| `fiInvestmentAssetValue` | `modules/shared/modules-calc.js` |
| `FILE_SIZE_ACTION_BYTES` | `diagnostik-versi.js` |
| `FILE_SIZE_WARN_BYTES` | `diagnostik-versi.js` |
| `filterCat` | `modules/finance/kategori.js` |
| `filterValidPoints` | `modules/vehicle/ride-map.js` |
| `fiMonthlySurplus` | `modules/shared/modules-calc.js` |
| `fiMonthsOfDataAvailable` | `modules/shared/modules-calc.js` |
| `FinanceDashboard` | `modules/finance/finance-dashboard.js` |
| `FinanceIntelligence` | `modules/finance/finance-intelligence.js` |
| `FinancialForecastAPI` | `modules/finance/financial-forecast-api.js` |
| `FinancialForecastPresenter` | `modules/finance/financial-forecast-presenter.js` |
| `FinancialGoalAPI` | `modules/finance/financial-goal-api.js` |
| `FinancialGoalPresenter` | `modules/finance/financial-goal-presenter.js` |
| `FinancialHealthScoreAPI` | `modules/finance/financial-health-score-api.js` |
| `FinancialHealthScorePresenter` | `modules/finance/financial-health-score-presenter.js` |
| `FinancialRiskDashboardAPI` | `modules/finance/financial-risk-dashboard-api.js` |
| `FinancialRiskDashboardPresenter` | `modules/finance/financial-risk-dashboard-presenter.js` |
| `FinCoach` | `modules/shared/modules-calc.js` |
| `findFallbackBillPaymentTxId` | `modules/finance/tagihan-kalender.js` |
| `findFallbackBillPaymentTxIdsForActiveBill` | `modules/shared/modules-render.js` |
| `findGhostMigratedAssets` | `modules/asset/aset-misc.js` |
| `findLinkedAssetForAccount` | `modules/finance/transaksi.js` |
| `findLinkedHoldingForAccount` | `modules/finance/transaksi.js` |
| `findLinkedHoldingsForAccount` | `modules/finance/transaksi.js` |
| `findMissingAriaLabels` | `self-test.js` |
| `findMultiOwnerAssetForAccount` | `modules/finance/transaksi.js` |
| `findPossibleDuplicateTx` | `modules/shared/scan-ocr.js` |
| `findTorsiDb` | `modules/vehicle/sparepart-servis-b.js` |
| `findVehicleSpec` | `modules/vehicle/sparepart-servis-b.js` |
| `fiNetAssetFund` | `modules/shared/modules-calc.js` |
| `FINGOAL_NAV_TARGETS` | `modules/finance/financial-goal-presenter.js` |
| `FINHEALTH_NAV_TARGETS` | `modules/finance/financial-health-score-presenter.js` |
| `finishOnboard` | `modules/shared/onboarding.js` |
| `FINRISK_NAV_TARGETS` | `modules/finance/financial-risk-dashboard-presenter.js` |
| `fireNotif` | `reminder-notif.js` |
| `fiTargetNominal` | `modules/shared/modules-calc.js` |
| `fiTotalDebt` | `modules/shared/modules-calc.js` |
| `fmt` | `modules/shared/format-tema.js` |
| `fmtBytes` | `modules/shared/data-archive.js` |
| `fmtDateID` | `modules/vehicle/vehicle-core.js` |
| `fmtFull` | `modules/shared/format-tema.js` |
| `fmtFullSigned` | `modules/shared/format-tema.js` |
| `fmtIDR` | `economic-intelligence/rules/rule-definitions.js` |
| `FORECAST_NAV_TARGETS` | `modules/finance/financial-forecast-presenter.js` |
| `FUEL_ANALYTICS_NAV_TARGETS` | `modules/vehicle/fuel-analytics.js` |
| `FuelAnalytics` | `modules/vehicle/fuel-analytics.js` |
| `FuelBarCorrection` | `modules/vehicle/fuel-intelligence-ui.js` |
| `FuelCard` | `modules/vehicle/fuel-card.js` |
| `FuelCompare` | `modules/vehicle/fuel-compare.js` |
| `FuelCostAnalytics` | `modules/vehicle/fuel-cost-analytics.js` |
| `FuelDashboard` | `modules/vehicle/fuel-dashboard.js` |
| `fuelEfficiency` | `modules/vehicle/vehicle-core.js` |
| `FuelFleetSelector` | `modules/vehicle/fuel-fleet-selector.js` |
| `FuelGaugeEngine` | `modules/vehicle/fuel-gauge-engine.js` |
| `FuelHistory` | `modules/vehicle/fuel-history.js` |
| `FuelInsightEngine` | `modules/vehicle/fuel-insight-engine.js` |
| `FuelIntelligenceEngine` | `modules/vehicle/fuel-intelligence-engine.js` |
| `FuelMaintenanceEngine` | `modules/vehicle/fuel-maintenance-engine.js` |
| `FuelModal` | `modules/vehicle/fuel-modal.js` |
| `FuelNotifBridge` | `modules/vehicle/fuel-notif-bridge.js` |
| `FuelPredictionEngine` | `modules/vehicle/fuel-prediction-engine.js` |
| `FuelStateEstimator` | `modules/vehicle/fuel-state-estimator.js` |
| `FuelStateHistory` | `modules/vehicle/fuel-state-history.js` |
| `FuelStorage` | `modules/vehicle/fuel-storage.js` |
| `FuelTankProfile` | `modules/vehicle/fuel-tank-profile.js` |
| `FuelTankProfileUI` | `modules/vehicle/fuel-tank-profile-ui.js` |
| `FuelTrendDashboard` | `modules/vehicle/fuel-trend-dashboard.js` |
| `gantiPin` | `modules/shared/keamanan-pin.js` |
| `GDRIVE_EMAIL_SCOPE` | `gdrive-backup.js` |
| `gdriveAccessToken` | `laporan-export.js` |
| `gdriveBackupNow` | `gdrive-backup.js` |
| `gdriveConnectOnly` | `gdrive-backup.js` |
| `gdriveConnStatusLabel` | `gdrive-backup.js` |
| `gdriveDisconnect` | `gdrive-backup.js` |
| `gdriveDownloadBackup` | `gdrive-backup.js` |
| `gdriveEnsureAuth` | `gdrive-backup.js` |
| `gdriveFetchUserInfo` | `gdrive-backup.js` |
| `gdriveHandleAuthSuccess` | `gdrive-backup.js` |
| `gdriveInitTokenClient` | `gdrive-backup.js` |
| `gdrivePendingAfterAuth` | `laporan-export.js` |
| `gdriveResetTokenState` | `gdrive-backup.js` |
| `gdriveRestoreNow` | `gdrive-backup.js` |
| `gdriveSaveClientId` | `gdrive-backup.js` |
| `gdriveThrowForFailedRes` | `gdrive-backup.js` |
| `gdriveToggleAutoSync` | `gdrive-backup.js` |
| `gdriveTokenClient` | `laporan-export.js` |
| `gdriveTokenExpiresAt` | `laporan-export.js` |
| `gdriveTokenScope` | `laporan-export.js` |
| `gdriveTrySilentReconnectOnLoad` | `gdrive-backup.js` |
| `gdriveUserEmail` | `laporan-export.js` |
| `generateVirtualBillItemsForMonth` | `modules/finance/tagihan-kalender.js` |
| `GENERIC_RECOMMEND_NAMES` | `modules/vehicle/sparepart-servis.js` |
| `geolocationAvailable` | `modules/vehicle/ride-gps-recorder.js` |
| `getAccOwners` | `modules/finance/akun.js` |
| `getAccOwnersEffective` | `modules/finance/akun.js` |
| `getAccOwnersRaw` | `modules/finance/akun.js` |
| `getAIAssetZakatMinThreshold` | `modules/asset/aset-misc.js` |
| `getAIDeliveryLowStockThreshold` | `modules/shop/cobek-pricing.js` |
| `getAIDeliveryThinMarginThreshold` | `modules/shop/cobek-pricing.js` |
| `getAIFinanceLowBalanceMultiplier` | `modules/finance/tx-list-cashflow.js` |
| `getAIFinanceOverspendThreshold` | `modules/finance/tx-list-cashflow.js` |
| `getAIVehicleFuelDropThreshold` | `modules/vehicle/sparepart-servis-b.js` |
| `getAllCats` | `modules/finance/kategori.js` |
| `getAutoPiutangIdForBill` | `modules/finance/piutang-utang.js` |
| `getBackupRange` | `modules/shared/backup-restore.js` |
| `getBillActiveDateForFilter` | `modules/finance/tagihan-kalender.js` |
| `getBillAnomalyInfo` | `modules/finance/tagihan-kalender.js` |
| `getBillArchiveEditSource` | `modules/finance/tagihan-kalender.js` |
| `getBillOccurrencesInMonth` | `modules/finance/tagihan-kalender.js` |
| `getBillOccurrencesInRange` | `modules/finance/tagihan-kalender.js` |
| `getBillPaidThisPeriodInfo` | `modules/finance/tagihan-kalender.js` |
| `getBillStats` | `modules/finance/tagihan-kalender.js` |
| `getBudgetEffectiveLimit` | `budget.js` |
| `getBudgetSettings` | `budget.js` |
| `getBudgetUsed` | `budget.js` |
| `getCat` | `modules/finance/kategori.js` |
| `getCatByType` | `modules/finance/kategori.js` |
| `getCatInfoById` | `budget.js` |
| `getCatNameById` | `budget.js` |
| `getCatsByType` | `modules/finance/kategori.js` |
| `getCicilanSharedMine` | `modules/finance/cicilan.js` |
| `getCnRange` | `modules/vehicle/vehicle-core.js` |
| `getCustomerOrders` | `modules/shop/cobek-io.js` |
| `getEffectiveIntervalBulan` | `modules/vehicle/sparepart-servis.js` |
| `getEffectiveIntervalKm` | `modules/vehicle/sparepart-servis.js` |
| `getFavoritKeys` | `modules/dashboard-hub/dashboard-hub-favorit.js` |
| `getHtmlSnapshotForSelfTest` | `diagnostik-versi.js` |
| `getInstance` | `modules/vehicle/ride-map.js` |
| `getKeuFilters` | `modules/finance/filter-laporan.js` |
| `getLaporanFilters` | `modules/finance/filter-laporan.js` |
| `getLastServiceDateForCat` | `modules/vehicle/sparepart-servis.js` |
| `getLastServiceKm` | `modules/vehicle/sparepart-servis.js` |
| `getLastServiceKmForCat` | `modules/vehicle/sparepart-servis-b.js` |
| `getLatestBillPaymentTxId` | `modules/finance/tagihan-kalender.js` |
| `getMonthlyCashProjection` | `modules/finance/cash-projection.js` |
| `getMultiOwnerAssets` | `modules/finance/piutang-utang.js` |
| `getOcrMinConfidence` | `modules/shared/scan-ocr-b.js` |
| `getOcrWorker` | `modules/shared/scan-ocr.js` |
| `getPinAutolockOption` | `modules/shared/keamanan-pin.js` |
| `getProactiveReminders` | `modules/vehicle/vehicle-core.js` |
| `getPTKP` | `pajak-aset-ui-wrappers.js` |
| `getRange` | `modules/finance/tx-list-cashflow.js` |
| `getRecoverableRides` | `modules/vehicle/ride-storage.js` |
| `getRide` | `modules/vehicle/ride-storage.js` |
| `getSelectedBudgetCatIds` | `budget.js` |
| `getSelectedFiCatIds` | `modules/shared/modules-calc.js` |
| `getSelfTestCases` | `self-test.js` |
| `getShopRange` | `modules/shop/cobek-io.js` |
| `getTrackpoints` | `modules/vehicle/ride-storage.js` |
| `getTxListRange` | `modules/finance/tx-list-cashflow.js` |
| `getVehicleKm` | `modules/vehicle/vehicle-core.js` |
| `getVehicleKmSource` | `modules/vehicle/vehicle-core.js` |
| `getWeekRange` | `modules/business/reset-gaji-mingguan.js` |
| `GhostAssetCleanupUI` | `modules/shared/ghost-asset-cleanup-ui.js` |
| `GOAL_SOURCE_BUILDERS` | `lifeos/adapters/goal-adapter.js` |
| `goalAdapterFindOne` | `lifeos/adapters/goal-adapter.js` |
| `goalAdapterList` | `lifeos/adapters/goal-adapter.js` |
| `goalSourceDebt` | `lifeos/adapters/goal-adapter.js` |
| `goalSourceEduFund` | `lifeos/adapters/goal-adapter.js` |
| `goalSourceFI` | `lifeos/adapters/goal-adapter.js` |
| `goalSourcePensiun` | `lifeos/adapters/goal-adapter.js` |
| `goalSourceTarget` | `lifeos/adapters/goal-adapter.js` |
| `goalSourceWishlist` | `lifeos/adapters/goal-adapter.js` |
| `GoldImport` | `modules/asset/aset-emas-impor.js` |
| `GoldZakat` | `modules/asset/aset-emas-impor.js` |
| `goToAbsensiFromGajiCalc` | `modules/shared/action-wrappers.js` |
| `goToDashboardHub` | `modules/shared/action-wrappers.js` |
| `goToKeuanganAkunTab` | `modules/finance/filter-laporan.js` |
| `goToList` | `modules/finance/filter-laporan.js` |
| `goToPageAndClose` | `global-search.js` |
| `goToServisFromDash` | `modules/vehicle/sparepart-servis-b.js` |
| `guessAssetJenisFromText` | `modules/shared/scan-ocr.js` |
| `guessAssetNameFromText` | `modules/shared/scan-ocr.js` |
| `guessCategoryFromReceiptText` | `modules/shared/scan-ocr.js` |
| `guessCheckoutCicilan` | `modules/shared/scan-ocr.js` |
| `guessCheckoutItemName` | `modules/shared/scan-ocr.js` |
| `guessCheckoutPrices` | `modules/shared/scan-ocr.js` |
| `guessCheckoutTotalTagihan` | `modules/shared/scan-ocr.js` |
| `guessCryptoSymbolFromText` | `modules/shared/scan-ocr.js` |
| `guessSparepartFromReceiptText` | `modules/shared/scan-ocr.js` |
| `guessTransferNameFromText` | `modules/shared/scan-ocr.js` |
| `guessWorthItCategory` | `modules/shared/scan-ocr.js` |
| `handleTxRenovBelumDibeli` | `modules/finance/tx-renov.js` |
| `hashPin` | `modules/shared/keamanan-pin.js` |
| `hashPinLegacyFixedSalt` | `modules/shared/keamanan-pin.js` |
| `hasIntervalOverride` | `modules/vehicle/sparepart-servis.js` |
| `hasValidAltitude` | `modules/vehicle/ride-activity-metrics.js` |
| `hasValidCoordinate` | `modules/vehicle/ride-activity-metrics.js` |
| `hasValidCoordinate` | `modules/vehicle/ride-map.js` |
| `hasValidSpeed` | `modules/vehicle/ride-activity-metrics.js` |
| `haversineMeters` | `modules/vehicle/ride-activity-metrics.js` |
| `HEADER_ALIAS` | `modules/shop/cobek-io.js` |
| `healFuelStateReferenceKm` | `modules/vehicle/vehicle-core.js` |
| `hideDashCardEl` | `modules/shared/modules-render.js` |
| `hideSuggestBox` | `modules/finance/transaksi.js` |
| `historyMatchesName` | `modules/vehicle/sparepart-servis.js` |
| `historyStatsForName` | `modules/vehicle/sparepart-servis.js` |
| `hitungPBB` | `pajak-aset-ui-wrappers.js` |
| `hitungPPh21` | `pajak-aset-ui-wrappers.js` |
| `hitungPPh21Progresif` | `pajak-aset-ui-wrappers.js` |
| `hitungZakatFitrah` | `pajak-aset-ui-wrappers.js` |
| `hitungZakatMaal` | `pajak-aset-ui-wrappers.js` |
| `hitungZakatPenghasilan` | `pajak-aset-ui-wrappers.js` |
| `HONDA_PDF_EXTRACT_PREVIEW_LEN` | `modules/vehicle/honda-pdf-import-extract.js` |
| `HONDA_PDF_IMPORT_DEFAULT` | `modules/vehicle/honda-pdf-import.js` |
| `HONDA_PDF_IMPORT_MAX_FILES` | `modules/vehicle/honda-pdf-import.js` |
| `HONDA_PDF_IMPORT_STORE_KEY` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfCommitAndPreview` | `modules/vehicle/honda-pdf-import-commit.js` |
| `hondaPdfCommitCommitRows` | `modules/vehicle/honda-pdf-import-commit.js` |
| `hondaPdfExtractAndPreview` | `modules/vehicle/honda-pdf-import-extract.js` |
| `hondaPdfExtractBase64ToArrayBuffer` | `modules/vehicle/honda-pdf-import-extract.js` |
| `hondaPdfExtractExtractAll` | `modules/vehicle/honda-pdf-import-extract.js` |
| `hondaPdfExtractExtractText` | `modules/vehicle/honda-pdf-import-extract.js` |
| `hondaPdfExtractMakeFileLike` | `modules/vehicle/honda-pdf-import-extract.js` |
| `hondaPdfExtractPreviewText` | `modules/vehicle/honda-pdf-import-extract.js` |
| `HondaPdfImport` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportAdd` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportAddMany` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportClear` | `modules/vehicle/honda-pdf-import.js` |
| `HondaPdfImportCommit` | `modules/vehicle/honda-pdf-import-commit.js` |
| `hondaPdfImportEnsureLoaded` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportErrorMessage` | `modules/vehicle/honda-pdf-import.js` |
| `HondaPdfImportExtract` | `modules/vehicle/honda-pdf-import-extract.js` |
| `hondaPdfImportFileToDataUrl` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportGet` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportGetStore` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportInvalidateCache` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportList` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportLoad` | `modules/vehicle/honda-pdf-import.js` |
| `HondaPdfImportParse` | `modules/vehicle/honda-pdf-import-parse.js` |
| `hondaPdfImportPickAndStage` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportPickFiles` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportRemove` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportSave` | `modules/vehicle/honda-pdf-import.js` |
| `HondaPdfImportStore` | `modules/vehicle/honda-pdf-import.js` |
| `HondaPdfImportUI` | `modules/vehicle/honda-pdf-import-ui.js` |
| `hondaPdfImportUiCommit` | `modules/vehicle/honda-pdf-import-ui.js` |
| `hondaPdfImportUiEditField` | `modules/vehicle/honda-pdf-import-ui.js` |
| `hondaPdfImportUiOpen` | `modules/vehicle/honda-pdf-import-ui.js` |
| `hondaPdfImportUiOpenPreview` | `modules/vehicle/honda-pdf-import-ui.js` |
| `hondaPdfImportUiPickFiles` | `modules/vehicle/honda-pdf-import-ui.js` |
| `hondaPdfImportUiProcess` | `modules/vehicle/honda-pdf-import-ui.js` |
| `hondaPdfImportUiRemove` | `modules/vehicle/honda-pdf-import-ui.js` |
| `hondaPdfImportUiRenderList` | `modules/vehicle/honda-pdf-import-ui.js` |
| `hondaPdfImportUiRenderPreview` | `modules/vehicle/honda-pdf-import-ui.js` |
| `hondaPdfImportUiToggleRow` | `modules/vehicle/honda-pdf-import-ui.js` |
| `hondaPdfImportUpdate` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfImportValidate` | `modules/vehicle/honda-pdf-import.js` |
| `hondaPdfParseAndPreview` | `modules/vehicle/honda-pdf-import-parse.js` |
| `hondaPdfParseParseAll` | `modules/vehicle/honda-pdf-import-parse.js` |
| `hondaPdfParseParseText` | `modules/vehicle/honda-pdf-import-parse.js` |
| `IDBStore` | `modules/asset/aset-misc.js` |
| `ikatPBBTagihan` | `pajak-aset-ui-wrappers.js` |
| `ikatSimTagihan` | `modules/vehicle/vehicle-core.js` |
| `ikatSptTagihan` | `modules/vehicle/vehicle-core.js` |
| `ikatVehTaxTagihan` | `modules/vehicle/vehicle-core.js` |
| `ImportKatalog` | `modules/shop/cobek-io.js` |
| `ImportShopExcel` | `modules/shop/cobek-io.js` |
| `initBillStatMonthDefault` | `modules/finance/tagihan-kalender.js` |
| `initChat` | `ai-chat.js` |
| `inRange` | `modules/shared/backup-restore.js` |
| `InsightGenerator` | `economic-intelligence/engine/insight-generator.js` |
| `InsightTargetMingguan` | `modules/business/insight-target-mingguan.js` |
| `invalidateAccBalCache` | `modules/finance/akun.js` |
| `invalidateCashflowForecastCache` | `modules/finance/tx-list-cashflow.js` |
| `INVENTORY_LIFECYCLE_TO_LOCATION` | `modules/shop/business-flow-presenter.js` |
| `INVENTORY_MOVEMENT_LOCATIONS` | `modules/shop/business-flow-presenter.js` |
| `INVENTORY_TRANSFER_STATUSES` | `modules/shop/business-flow-presenter.js` |
| `InventoryEngine` | `modules/shop/inventory-engine.js` |
| `InventoryService` | `modules/shop/generic/inventory-service.js` |
| `InvestAI` | `modules/asset/invest-ai-widget.js` |
| `Investment` | `modules/asset/investasi.js` |
| `INVESTMENT_TYPES` | `modules/asset/investasi.js` |
| `investmentAssetLinkOptionsHtml` | `modules/asset/investasi.js` |
| `investmentCrossCheckWarning` | `modules/asset/investasi.js` |
| `InvestmentListUI` | `modules/asset/investasi-list-view.js` |
| `InvestmentPlannerAPI` | `modules/finance/investment-planner-api.js` |
| `InvestmentPlannerPresenter` | `modules/finance/investment-planner-presenter.js` |
| `InvestmentTxUI` | `modules/asset/investasi-tx-view.js` |
| `InvestmentUI` | `modules/asset/investasi-view.js` |
| `InvestmentWatchUI` | `modules/asset/investasi-watch-view.js` |
| `INVESTPLANNER_NAV_TARGETS` | `modules/finance/investment-planner-presenter.js` |
| `isAccLinkedToAsset` | `modules/finance/akun.js` |
| `isAccOwnershipSelf` | `modules/finance/akun.js` |
| `isAssetOwnershipSelf` | `modules/asset/aset-misc.js` |
| `isBensinSubName` | `modules/finance/transaksi.js` |
| `isBillTypeLocked` | `modules/finance/tagihan-kalender.js` |
| `isCobekOwnershipSelf` | `modules/shop/cobek-order.js` |
| `isDashCardOn` | `modules/shared/modules-render.js` |
| `isDebtOwnershipSelf` | `modules/finance/piutang-utang.js` |
| `isDevMode` | `modules/shared/features-helpers-global-security.js` |
| `isDueSoon` | `lifeos/adapters/today-adapter.js` |
| `isFilterAll` | `modules/vehicle/ride-history.js` |
| `isFiniteNumber` | `modules/vehicle/ride-activity-metrics.js` |
| `isFiniteNumber` | `modules/vehicle/ride-gps-recorder.js` |
| `isFiniteNumber` | `modules/vehicle/ride-storage.js` |
| `isFiniteNumber` | `modules/vehicle/ride-map.js` |
| `isGajiTransaction` | `modules/finance/cash-projection.js` |
| `isHoldingOwnershipSelf` | `modules/asset/investasi.js` |
| `isiPPhDariTransaksi` | `pajak-aset-ui-wrappers.js` |
| `isKendaraanCatName` | `modules/finance/transaksi.js` |
| `isLatestBillPaymentTx` | `modules/finance/tagihan-kalender.js` |
| `isNonEmptyString` | `modules/vehicle/ride-storage.js` |
| `isNonNegativeInteger` | `modules/vehicle/ride-storage.js` |
| `isNoSpendDay` | `pajak-aset-ui-wrappers.js` |
| `isNullish` | `modules/vehicle/ride-gps-recorder.js` |
| `isNullish` | `modules/vehicle/ride-storage.js` |
| `isPiutangOwnershipSelf` | `modules/finance/piutang-utang.js` |
| `isProductOwnershipSelf` | `modules/shop/cobek-etalase.js` |
| `isRenovCatName` | `modules/finance/transaksi.js` |
| `isShopStockCatName` | `modules/finance/tx-cobek.js` |
| `isSparepartSubName` | `modules/finance/transaksi.js` |
| `isVehicleOwnershipSelf` | `modules/vehicle/vehicle-core.js` |
| `JAGO_POCKET_AMOUNT_RE` | `modules/shared/scan-ocr-b.js` |
| `JAGO_POCKET_NOISE_LINE_RE` | `modules/shared/scan-ocr-b.js` |
| `jsAttrEscape` | `modules/finance/transaksi.js` |
| `Kasir` | `modules/business/kasir.js` |
| `Kekayaan` | `modules/shared/modules-calc.js` |
| `KELOLA_SUBTAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `KELOLA_SUBTAB_LABEL` | `modules/finance/tx-list-cashflow.js` |
| `KELOLA_SUBTAB_ORDER` | `modules/finance/tx-list-cashflow.js` |
| `KEU_TAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `KEU_TAB_LABEL` | `modules/finance/tx-list-cashflow.js` |
| `KEU_TAB_ORDER` | `modules/finance/tx-list-cashflow.js` |
| `KeuanganInsight` | `modules/ai/feature-insights.js` |
| `keuFabOpenExpense` | `modules/shared/action-wrappers.js` |
| `keuFabOpenIncome` | `modules/shared/action-wrappers.js` |
| `keuFabToggleMain` | `modules/shared/action-wrappers.js` |
| `kmSourceLabel` | `modules/vehicle/vehicle-core.js` |
| `KNOWLEDGE_REF_SOURCE_BUILDERS` | `lifeos/adapters/knowledge-adapter.js` |
| `knowledgeAdapterByTag` | `lifeos/adapters/knowledge-adapter.js` |
| `knowledgeAdapterCatatanRef` | `lifeos/adapters/knowledge-adapter.js` |
| `knowledgeAdapterList` | `lifeos/adapters/knowledge-adapter.js` |
| `knowledgeRefSourceCatatan` | `lifeos/adapters/knowledge-adapter.js` |
| `knowledgeServiceDelete` | `lifeos/services/knowledge-service.js` |
| `knowledgeServiceSave` | `lifeos/services/knowledge-service.js` |
| `knowledgeServiceUpdateTags` | `lifeos/services/knowledge-service.js` |
| `Laporan` | `modules/shop/cobek-order.js` |
| `LAPORAN_SUBTAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `LAPORAN_SUBTAB_LABEL` | `modules/finance/tx-list-cashflow.js` |
| `LAPORAN_SUBTAB_ORDER` | `modules/finance/tx-list-cashflow.js` |
| `LaporanAset` | `modules/asset/aset-reports.js` |
| `laporanFabExportCSV` | `modules/shared/action-wrappers.js` |
| `laporanFabExportPDF` | `modules/shared/action-wrappers.js` |
| `laporanFabToggleMain` | `modules/shared/action-wrappers.js` |
| `lapTxPage` | `modules/finance/filter-laporan.js` |
| `learnCatFromItemName` | `modules/shared/scan-ocr.js` |
| `LIFE_OBJECT_KINDS` | `lifeos/services/life-object-service.js` |
| `LifeBalance` | `modules/home/hidup-seimbang.js` |
| `LifeDashboardSummaryAPI` | `modules/cross/life-dashboard-summary-api.js` |
| `lifeObjectServiceCreate` | `lifeos/services/life-object-service.js` |
| `lifeObjectServiceDelete` | `lifeos/services/life-object-service.js` |
| `lifeObjectServiceGet` | `lifeos/services/life-object-service.js` |
| `lifeObjectServiceList` | `lifeos/services/life-object-service.js` |
| `lifeObjectServiceUpdate` | `lifeos/services/life-object-service.js` |
| `LIFEOS_AREAS` | `lifeos/lifeos-registry.js` |
| `LIFEOS_GOAL_SOURCES` | `lifeos/lifeos-registry.js` |
| `LIFEOS_KNOWLEDGE_REF_SOURCE` | `lifeos/lifeos-registry.js` |
| `LIFEOS_LINK_REGISTRY` | `lifeos/lifeos-link-registry.js` |
| `LIFEOS_NAV_MAP` | `lifeos/lifeos-nav.js` |
| `LIFEOS_OBJECT_REF_SOURCES` | `lifeos/lifeos-registry.js` |
| `LIFEOS_PLUGIN_CAPABILITIES` | `lifeos/plugins/lifeos-plugin-manifest.js` |
| `LIFEOS_PLUGIN_MANIFEST_OPTIONAL_FIELDS` | `lifeos/plugins/lifeos-plugin-manifest.js` |
| `LIFEOS_PLUGIN_MANIFEST_REQUIRED_FIELDS` | `lifeos/plugins/lifeos-plugin-manifest.js` |
| `LIFEOS_PLUGIN_RUNTIME_STATES` | `lifeos/plugins/lifeos-plugin-runtime.js` |
| `LIFEOS_PROJECT_LEGACY_SOURCE` | `lifeos/lifeos-registry.js` |
| `LIFEOS_REVIEW_SOURCES` | `lifeos/lifeos-registry.js` |
| `LIFEOS_STORE_DEFAULT` | `lifeos/lifeos-store.js` |
| `LIFEOS_STORE_KEY` | `lifeos/lifeos-store.js` |
| `LIFEOS_TODAY_SOURCES` | `lifeos/lifeos-registry.js` |
| `LIFEOS_VISIBLE_KEY` | `lifeos/ui/lifeos-home.js` |
| `LifeOSAreas` | `lifeos/ui/areas.js` |
| `lifeOSEnsureLoaded` | `lifeos/lifeos-store.js` |
| `lifeOSFindLink` | `lifeos/lifeos-link-registry.js` |
| `lifeOSGetStore` | `lifeos/lifeos-store.js` |
| `LifeOSGoals` | `lifeos/ui/goals.js` |
| `LifeOSHome` | `lifeos/ui/lifeos-home.js` |
| `lifeOSInvalidateCache` | `lifeos/lifeos-store.js` |
| `LifeOSKnowledge` | `lifeos/ui/knowledge.js` |
| `LifeOSLifeObjects` | `lifeos/ui/life-objects.js` |
| `lifeOSLoad` | `lifeos/lifeos-store.js` |
| `lifeOSNavigateToSource` | `lifeos/lifeos-nav.js` |
| `lifeOSObjectRefExists` | `lifeos/lifeos-object-ref.js` |
| `lifeOSObjectRefResolve` | `lifeos/lifeos-object-ref.js` |
| `lifeOSObjectRefValidate` | `lifeos/lifeos-object-ref.js` |
| `lifeOSPluginCreateManifest` | `lifeos/plugins/lifeos-plugin-manifest.js` |
| `lifeOSPluginLoad` | `lifeos/plugins/lifeos-plugin-loader.js` |
| `LifeOSPluginRegistry` | `lifeos/plugins/lifeos-plugin-registry.js` |
| `LifeOSPluginRuntime` | `lifeos/plugins/lifeos-plugin-runtime.js` |
| `LifeOSPlugins` | `lifeos/ui/plugins.js` |
| `lifeOSPluginValidateManifest` | `lifeos/plugins/lifeos-plugin-validation.js` |
| `LifeOSProjects` | `lifeos/ui/projects.js` |
| `LifeOSReview` | `lifeos/ui/review.js` |
| `lifeOSSave` | `lifeos/lifeos-store.js` |
| `LifeOSStore` | `lifeos/lifeos-store.js` |
| `LifeOSToday` | `lifeos/ui/today.js` |
| `LifePriorityPanel` | `modules/cross/life-priority-panel.js` |
| `linkedAssetAccountIds` | `modules/finance/akun.js` |
| `LinkTx` | `modules/finance/linktx.js` |
| `linkTxToggleSelectStop` | `modules/shared/action-wrappers.js` |
| `listRides` | `modules/vehicle/ride-storage.js` |
| `load` | `modules/shared/features-helpers-global-security.js` |
| `loadAndMigrateApiKeyOnUnlock` | `modules/shared/keamanan-pin.js` |
| `loadKeuFilterPrefsIntoDOM` | `modules/finance/filter-laporan.js` |
| `loadMoreBbmList` | `modules/vehicle/vehicle-core.js` |
| `loadMoreLapTx` | `modules/finance/filter-laporan.js` |
| `loadMoreServisList` | `modules/vehicle/sparepart-servis-b.js` |
| `loadMoreTx` | `modules/finance/filter-laporan.js` |
| `localBoundingBox` | `modules/vehicle/ride-map.js` |
| `LogisticsEngine` | `modules/logistics/logistics-engine.js` |
| `LogisticsService` | `modules/logistics/logistics-service.js` |
| `MacroDataAdapter` | `economic-intelligence/adapters/macro-data-adapter.js` |
| `MacroSyncService` | `economic-intelligence/services/macro-sync-service.js` |
| `maintenanceForecast` | `modules/vehicle/sparepart-servis-b.js` |
| `makeError` | `modules/vehicle/ride-storage.js` |
| `MAP_DEFAULT_OPTIONS` | `modules/vehicle/ride-map.js` |
| `mapAssetJenisToInvestmentType` | `modules/asset/aset-misc.js` |
| `markBillPaid` | `modules/finance/tagihan-kalender.js` |
| `markShopDelivered` | `modules/shop/cobek-io.js` |
| `markSparepartServiced` | `modules/vehicle/sparepart-servis-b.js` |
| `matchingVehicleName` | `modules/vehicle/sparepart-servis.js` |
| `maybeCreateSharedPiutangFromBill` | `modules/finance/piutang-utang.js` |
| `maybeCreateTitipanTalanganPiutang` | `modules/finance/piutang-utang.js` |
| `maybeOfferPaylaterReminder` | `modules/shared/scan-ocr.js` |
| `mergeOptions` | `modules/vehicle/ride-map.js` |
| `migrateAssetInvestmentsToHoldings` | `modules/asset/aset-misc.js` |
| `migrateShopCategory` | `modules/shared/features-helpers-global-security.js` |
| `MobilInsight` | `modules/ai/feature-insights.js` |
| `MODAL_HTML` | `modules/shared/modals.js` |
| `MODAL_SWEEP_MANUAL_OVERRIDE_FNS` | `self-test.js` |
| `MODAL_VERSION` | `modules/shared/modals.js` |
| `MODULE_CALC_VERSION` | `modules/shared/modules-calc.js` |
| `MODULE_FEATURES_VERSION` | `chat-action-handlers.js` |
| `MODULE_RENDER_VERSION` | `modules/shared/modules-render.js` |
| `modulesReady` | `modules/vehicle/ride-history.js` |
| `MONTHS` | `modules/shared/helper-teks.js` |
| `MONTHS_FULL` | `modules/shared/helper-teks.js` |
| `monthsSinceISO` | `modules/vehicle/sparepart-servis.js` |
| `MPS_TO_KMH` | `modules/vehicle/ride-activity-metrics.js` |
| `MultiOwnerEngine` | `modules/shared/multi-owner-engine.js` |
| `MY_WRENCH` | `car-notes.js` |
| `MY_WRENCH_SCALE` | `modules/vehicle/sparepart-servis-b.js` |
| `navBillCalendar` | `modules/finance/tagihan-kalender.js` |
| `navBillFilterMonth` | `modules/finance/tagihan-kalender.js` |
| `navFabToggle` | `modules/shared/action-wrappers.js` |
| `netWorthForecast` | `modules/asset/aset-misc.js` |
| `normalizeAmtToken` | `modules/shared/kalkulator-input.js` |
| `normalizeGeoError` | `modules/vehicle/ride-gps-recorder.js` |
| `normalizeOcrNumber` | `pajak-aset-ui-wrappers.js` |
| `normalizeOptions` | `modules/vehicle/ride-activity-metrics.js` |
| `normalizeTrackpoint` | `modules/vehicle/ride-gps-recorder.js` |
| `NotificationService` | `economic-intelligence/services/notification-service.js` |
| `OCR_MIN_CONFIDENCE_DEFAULT_PCT` | `modules/shared/scan-ocr-b.js` |
| `ocrRecognize` | `modules/shared/scan-ocr.js` |
| `onAccJenisChange` | `modules/finance/akun.js` |
| `onBackupPeriodeChange` | `modules/shared/backup-restore.js` |
| `onBudgetCatChildToggle` | `budget.js` |
| `onBudgetCatTotalToggle` | `budget.js` |
| `onCicilanTenorSelectChange` | `modules/finance/transaksi.js` |
| `onCustomerInputChange` | `modules/shop/cobek-io.js` |
| `onDsExtraInput` | `pajak-aset-ui-wrappers.js` |
| `onFiCatTotalToggle` | `modules/shared/modules-calc.js` |
| `onFKatChange` | `modules/finance/filter-laporan.js` |
| `OngkirCalc` | `modules/shop/cobek-pricing.js` |
| `onGlobalSearchInput` | `global-search.js` |
| `onImportShopExcelFileChange` | `modules/shop/cobek-io.js` |
| `onKfKatChange` | `modules/finance/filter-laporan.js` |
| `onKfSearchInput` | `modules/finance/filter-laporan.js` |
| `onKmVehicleChange` | `modules/vehicle/vehicle-core.js` |
| `onPProdusenChange` | `modules/shop/cobek-tx-cart.js` |
| `onServisCatalogPartChange` | `modules/vehicle/sparepart-servis-b.js` |
| `onServisItemAutofillInterval` | `modules/vehicle/sparepart-servis-b.js` |
| `onServisItemInput` | `modules/vehicle/sparepart-servis-b.js` |
| `onServisPartChange` | `modules/vehicle/sparepart-servis-b.js` |
| `onShopCsvImportFileChange` | `modules/business/shop-data-io-api.js` |
| `onShopCustFieldInput` | `modules/shop/cobek-tx-cart.js` |
| `onShopJsonImportFileChange` | `modules/business/shop-data-io-api.js` |
| `onSimJenisChange` | `modules/vehicle/vehicle-core.js` |
| `onSparepartCsvImportFileChange` | `modules/vehicle/sparepart-servis-b.js` |
| `onStgPinDisableToggleChange` | `modules/shared/keamanan-pin.js` |
| `onTargetAccChange` | `modules/finance/tx-target.js` |
| `onTargetDanaDaruratToggle` | `modules/finance/tx-target.js` |
| `onTxAccChange` | `modules/finance/transaksi.js` |
| `onTxAssetChange` | `modules/finance/transaksi.js` |
| `onTxBbmVehicleChange` | `modules/finance/tx-bbm.js` |
| `onTxCatInput` | `modules/finance/transaksi.js` |
| `onTxShopSaleItemChange` | `modules/shop/cobek-tx-cart.js` |
| `onTxShopStockItemChange` | `modules/shop/cobek-tx-cart.js` |
| `onTxShopStockProdusenChange` | `modules/shop/cobek-tx-cart.js` |
| `onTxStockItemChange` | `modules/finance/tx-stok-sparepart.js` |
| `onTxSubCatInput` | `modules/finance/transaksi.js` |
| `onVehJenisChange` | `modules/vehicle/vehicle-core.js` |
| `openAbsensiModal` | `modules/business/gaji-calc.js` |
| `openAccModal` | `modules/finance/akun.js` |
| `openAccTxHistory` | `modules/finance/akun.js` |
| `openArchiveModal` | `modules/shared/data-archive.js` |
| `openAssetModal` | `pajak-aset-ui-wrappers.js` |
| `openBackupModal` | `modules/shared/backup-restore.js` |
| `openBbmModal` | `modules/vehicle/vehicle-core.js` |
| `openBillActionsMenu` | `modules/finance/tagihan-kalender.js` |
| `openBillArchive` | `modules/finance/tagihan-kalender.js` |
| `openBillCalendar` | `modules/finance/tagihan-kalender.js` |
| `openBillHistory` | `modules/finance/tagihan-kalender.js` |
| `openBillModal` | `modules/finance/tagihan-kalender.js` |
| `openBudgetModal` | `budget.js` |
| `openBudgetSettings` | `budget.js` |
| `openCalc` | `modules/shared/kalkulator-input.js` |
| `openCatatan` | `modules/finance/transaksi.js` |
| `openCatModal` | `modules/finance/kategori.js` |
| `openCatModalQuick` | `modules/shared/action-wrappers.js` |
| `openCicilanHistoryFromTx` | `modules/finance/cicilan.js` |
| `openCustomerDetail` | `modules/shop/cobek-io.js` |
| `openDatabase` | `modules/vehicle/ride-storage.js` |
| `openDebtModal` | `pajak-aset-ui-wrappers.js` |
| `openFiSettingsModal` | `modules/shared/modules-calc.js` |
| `openGajiCalc` | `modules/business/gaji-calc.js` |
| `openGlobalSearch` | `global-search.js` |
| `openImportKatalogModal` | `modules/shop/cobek-io.js` |
| `openImportShopExcelModal` | `modules/shop/cobek-io.js` |
| `openKmModal` | `modules/vehicle/vehicle-core.js` |
| `openModal` | `modules/shared/modal-navigasi.js` |
| `openOrderModal` | `modules/shop/cobek-io.js` |
| `openPiutangModal` | `pajak-aset-ui-wrappers.js` |
| `openPriceRekoWidgetDetail` | `modules/shop/cobek-io.js` |
| `openProductModal` | `modules/shop/cobek-tx-cart.js` |
| `openProdusenHargaModal` | `modules/shop/cobek-io.js` |
| `openProdusenModal` | `modules/shop/cobek-io.js` |
| `openQS` | `modules/shared/modal-navigasi.js` |
| `openReminderModal` | `modules/finance/transaksi.js` |
| `openServisModal` | `modules/vehicle/sparepart-servis-b.js` |
| `openShopCsvImportModal` | `modules/business/shop-data-io-api.js` |
| `openShopJsonModal` | `modules/business/shop-data-io-api.js` |
| `openShopKatalogDinamis` | `modules/shared/modal-navigasi.js` |
| `openSimModal` | `modules/vehicle/vehicle-core.js` |
| `openSparepartCsvImportModal` | `modules/vehicle/sparepart-servis-b.js` |
| `openSparepartModal` | `modules/vehicle/sparepart-servis-b.js` |
| `openStockModal` | `modules/vehicle/sparepart-servis-b.js` |
| `openStockRekoWidgetDetail` | `modules/shop/cobek-io.js` |
| `openSubCatModal` | `modules/finance/kategori.js` |
| `openTargetModal` | `modules/finance/tx-target.js` |
| `openTargetModalDanaDarurat` | `modules/shared/action-wrappers.js` |
| `openTransferModal` | `modules/finance/tx-transfer.js` |
| `openTxLinkedServisModal` | `modules/finance/tx-servis.js` |
| `openTxModal` | `modules/finance/transaksi.js` |
| `openVehicleModal` | `modules/vehicle/vehicle-core.js` |
| `openVehTaxModal` | `modules/vehicle/vehicle-core.js` |
| `openWaShare` | `reminder-notif.js` |
| `openWeeklyResetManual` | `modules/business/reset-gaji-mingguan.js` |
| `Order` | `modules/shop/cobek-order.js` |
| `ownerMismatch` | `modules/shared/multi-owner-engine.js` |
| `OwnerRegistry` | `modules/shared/owner-registry.js` |
| `OwnerRegistrySettingsUI` | `modules/shared/owner-registry-settings-ui.js` |
| `OWNERSHIP_LABELS` | `modules/shared/ownership-engine.js` |
| `OWNERSHIP_TYPES` | `modules/shared/ownership-engine.js` |
| `OwnershipEngine` | `modules/shared/ownership-engine.js` |
| `OwnershipSettingsPresenter` | `modules/shared/ownership-settings-presenter.js` |
| `ownerSignature` | `modules/shared/multi-owner-engine.js` |
| `packingCalculator` | `modules/shop/cobek-etalase.js` |
| `PAGE_NAV_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `PAJAK_TAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `PAJAK_TAB_LABEL` | `pajak-aset-ui-wrappers.js` |
| `PajakAset` | `modules/asset/aset-reports.js` |
| `PajakInsight` | `modules/ai/feature-insights.js` |
| `parseBankScreen` | `modules/shared/scan-ocr-b.js` |
| `parseBibitScreen` | `modules/shared/scan-ocr-b.js` |
| `parseBillMultiItems` | `modules/shared/scan-ocr.js` |
| `parseDecStr` | `pajak-aset-ui-wrappers.js` |
| `parseJagoPocketScreen` | `modules/shared/scan-ocr-b.js` |
| `parsePzNum` | `pajak-aset-ui-wrappers.js` |
| `parseWalletNominal` | `modules/shared/scan-ocr-b.js` |
| `parseWalletScreen` | `modules/shared/scan-ocr-b.js` |
| `passesAccuracyFilter` | `modules/vehicle/ride-activity-metrics.js` |
| `PAYLATER_DUE_NEXT_MONTH_RE` | `modules/shared/scan-ocr.js` |
| `PAYMENT_STATUSES` | `modules/shop/business-flow-presenter.js` |
| `Payroll` | `modules/business/payroll-absensi.js` |
| `PBB` | `modules/finance/pajak-pbb-zakat.js` |
| `PEHS_WEIGHTS` | `economic-intelligence/domain/scoring-formulas.js` |
| `Pelanggan` | `modules/shop/cobek-order.js` |
| `Pensiun` | `modules/shared/modules-calc.js` |
| `Penyusutan` | `modules/asset/aset-reports.js` |
| `PENYUSUTAN_AI_JENIS_MENURUN` | `modules/asset/penyusutan-ai-widget.js` |
| `PENYUSUTAN_AI_JENIS_TIDAK_SUSUT` | `modules/asset/penyusutan-ai-widget.js` |
| `PenyusutanAI` | `modules/asset/penyusutan-ai-widget.js` |
| `persistApiKeyEncrypted` | `modules/shared/keamanan-pin.js` |
| `PersonalOverviewPresenter` | `modules/cross/personal-overview-presenter.js` |
| `phoneToWaId` | `reminder-notif.js` |
| `pickAssetScanCandidate` | `modules/shared/scan-ocr.js` |
| `pickGeoOptions` | `modules/vehicle/ride-gps-recorder.js` |
| `pilihAsetPBB` | `pajak-aset-ui-wrappers.js` |
| `PIN_AUTOLOCK_KEY` | `modules/shared/keamanan-pin.js` |
| `PIN_AUTOLOCK_OPTIONS` | `modules/shared/keamanan-pin.js` |
| `PIN_LOCK_DURATIONS_SEC` | `modules/shared/keamanan-pin.js` |
| `PIN_MAX_ATTEMPTS` | `modules/shared/keamanan-pin.js` |
| `pinBack` | `modules/shared/keamanan-pin.js` |
| `pinBuffer` | `modules/shared/features-helpers-global-security.js` |
| `pinPress` | `modules/shared/keamanan-pin.js` |
| `Piutang` | `modules/finance/piutang-utang.js` |
| `PiutangUtangInsight` | `modules/ai/feature-insights.js` |
| `PJK_SUBTAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `PJK_SUBTAB_LABEL` | `pajak-aset-ui-wrappers.js` |
| `PJK_SUBTAB_ORDER` | `pajak-aset-ui-wrappers.js` |
| `populateAccFilters` | `modules/finance/akun.js` |
| `populateBillFilterOptions` | `modules/finance/tagihan-kalender.js` |
| `populateCatFilter` | `modules/finance/filter-laporan.js` |
| `populateCatSelect` | `modules/finance/kategori.js` |
| `populateEntryAssetSelect` | `modules/finance/piutang-utang.js` |
| `populateKeuFilters` | `modules/finance/filter-laporan.js` |
| `populateKmVehicleSelect` | `modules/vehicle/vehicle-core.js` |
| `populateOrderProductSelect` | `modules/shop/cobek-io.js` |
| `populateServisPartSelect` | `modules/vehicle/sparepart-servis-b.js` |
| `populateSparepartDatalist` | `modules/vehicle/sparepart-servis-b.js` |
| `populateStockCatSelect` | `modules/vehicle/sparepart-servis-b.js` |
| `populateSubSelect` | `modules/finance/kategori.js` |
| `populateSyncTxAccSelect` | `modules/finance/piutang-utang.js` |
| `populateTxBbmVehicleSelect` | `modules/finance/tx-bbm.js` |
| `populateTxRenovSelect` | `modules/finance/tx-renov.js` |
| `populateTxServisVehicleSelect` | `modules/finance/tx-servis.js` |
| `populateTxShopSaleSelect` | `modules/shop/cobek-tx-cart.js` |
| `populateTxShopStockSelect` | `modules/shop/cobek-tx-cart.js` |
| `populateTxStockSelect` | `modules/finance/tx-stok-sparepart.js` |
| `PORSI_EPSILON` | `modules/shared/multi-owner-engine.js` |
| `PORSI_TOTAL` | `modules/shared/multi-owner-engine.js` |
| `PORTFOLIO_LABELS` | `modules/asset/aset-misc.js` |
| `predictAssetValue` | `modules/asset/aset-misc.js` |
| `predictCashflow` | `modules/finance/tx-list-cashflow.js` |
| `predictExpense` | `modules/finance/tx-list-cashflow.js` |
| `predictIncome` | `modules/finance/tx-list-cashflow.js` |
| `predictService` | `modules/vehicle/sparepart-servis-b.js` |
| `previewGoldImport` | `modules/asset/aset-emas-impor.js` |
| `previewImportKatalog` | `modules/shop/cobek-io.js` |
| `PriceReko` | `modules/shop/cobek-pricing.js` |
| `PriceRekoWidget` | `modules/shop/cobek-pricing.js` |
| `PricingService` | `modules/shop/generic/pricing-service.js` |
| `printWindow` | `modules/shared/action-wrappers.js` |
| `PriorityEngine` | `modules/cross/priority-engine.js` |
| `PRODUCTION_BUILD_SYNCED_VERSION` | `modules/shared/features-helpers-global-security.js` |
| `ProductRepository` | `modules/shop/generic/product-repository.js` |
| `ProductStore` | `modules/shop/generic/product-store.js` |
| `Produsen` | `modules/shop/cobek-order.js` |
| `produsenActionDelete` | `modules/shared/action-wrappers.js` |
| `produsenActionHarga` | `modules/shared/action-wrappers.js` |
| `profileJiwaKeluarga` | `modules/shared/profil-pengaturan.js` |
| `profilePTKPStatus` | `modules/shared/profil-pengaturan.js` |
| `ProfitEngine` | `modules/shop/profit-engine.js` |
| `PROJECT_LEGACY_SOURCE_BUILDERS` | `lifeos/adapters/project-adapter.js` |
| `projectAdapterFindOne` | `lifeos/adapters/project-adapter.js` |
| `projectAdapterLegacyList` | `lifeos/adapters/project-adapter.js` |
| `projectAdapterList` | `lifeos/adapters/project-adapter.js` |
| `projectPoint` | `modules/vehicle/ride-map.js` |
| `projectPoints` | `modules/vehicle/ride-map.js` |
| `projectServiceAddChecklistItem` | `lifeos/services/project-service.js` |
| `projectServiceCreate` | `lifeos/services/project-service.js` |
| `projectServiceDelete` | `lifeos/services/project-service.js` |
| `projectServiceSetStatus` | `lifeos/services/project-service.js` |
| `projectServiceToggleChecklistItem` | `lifeos/services/project-service.js` |
| `projectSourceRenovasi` | `lifeos/adapters/project-adapter.js` |
| `PROPERTY_MGMT_CARD_NAV_TARGETS` | `modules/asset/property-management-presenter.js` |
| `PropertyManagementAPI` | `modules/asset/property-management-api.js` |
| `PropertyManagementPresenter` | `modules/asset/property-management-presenter.js` |
| `PurchaseEngine` | `modules/shop/purchase-engine.js` |
| `qsAiAnalisaBulanIni` | `modules/shared/action-wrappers.js` |
| `qsAiCekBisnisShop` | `modules/shared/action-wrappers.js` |
| `qsAiCekKendaraan` | `modules/shared/action-wrappers.js` |
| `qsAiEditProfil` | `modules/shared/action-wrappers.js` |
| `qsAiGajiAbsensi` | `modules/shared/action-wrappers.js` |
| `qsAiResetChat` | `modules/shared/action-wrappers.js` |
| `qsAiTagihanMendesak` | `modules/shared/action-wrappers.js` |
| `qsCarnotesCatatServis` | `modules/shared/action-wrappers.js` |
| `qsCarnotesIsiBbm` | `modules/shared/action-wrappers.js` |
| `qsCarnotesKatalog` | `modules/shared/action-wrappers.js` |
| `qsCarnotesKatalogDinamis` | `modules/shared/action-wrappers.js` |
| `qsCarnotesKategoriPart` | `modules/shared/action-wrappers.js` |
| `qsCarnotesKelolaKendaraan` | `modules/shared/action-wrappers.js` |
| `qsCarnotesUpdateKm` | `modules/shared/action-wrappers.js` |
| `qsKeuDanaPendidikan` | `modules/shared/action-wrappers.js` |
| `qsKeuExportCSV` | `modules/shared/action-wrappers.js` |
| `qsKeuKategoriKeluar` | `modules/shared/action-wrappers.js` |
| `qsKeuKategoriMasuk` | `modules/shared/action-wrappers.js` |
| `qsKeuLihatSemua` | `modules/shared/action-wrappers.js` |
| `qsKeuTambahAkun` | `modules/shared/action-wrappers.js` |
| `qsKeuTambahTagihan` | `modules/shared/action-wrappers.js` |
| `qsKeuTambahTarget` | `modules/shared/action-wrappers.js` |
| `qsKeuTransferAkun` | `modules/shared/action-wrappers.js` |
| `qsLaporanBackupLanjutan` | `modules/shared/action-wrappers.js` |
| `qsLaporanBulanIni` | `modules/shared/action-wrappers.js` |
| `qsLaporanExportCSV` | `modules/shared/action-wrappers.js` |
| `qsLaporanExportJSON` | `modules/shared/action-wrappers.js` |
| `qsLaporanPemasukanSaja` | `modules/shared/action-wrappers.js` |
| `qsLaporanPengeluaranSaja` | `modules/shared/action-wrappers.js` |
| `qsLaporanSetelanAkun` | `modules/shared/action-wrappers.js` |
| `qsLaporanTahunIni` | `modules/shared/action-wrappers.js` |
| `qsShopBackup` | `modules/shared/action-wrappers.js` |
| `qsShopKatalogDinamis` | `modules/shared/action-wrappers.js` |
| `qsShopLihatEtalase` | `modules/shared/action-wrappers.js` |
| `qsShopRiwayat` | `modules/shared/action-wrappers.js` |
| `qsShopSetelanLanjutan` | `modules/shared/action-wrappers.js` |
| `qsShopTambahProduk` | `modules/shared/action-wrappers.js` |
| `qsShopTransaksiBaru` | `modules/shared/action-wrappers.js` |
| `quickScanAsset` | `modules/shared/scan-ocr.js` |
| `quickToggleInclude` | `modules/finance/akun.js` |
| `REALIZATION_STATUSES` | `modules/shop/business-flow-presenter.js` |
| `recalcAccBalance` | `modules/finance/akun.js` |
| `RECEIPT_NOISE_LINE_RE` | `modules/shared/scan-ocr.js` |
| `RECEIPT_TOTAL_LABEL_RE` | `modules/shared/scan-ocr.js` |
| `RECEIVE_STATUSES` | `modules/shop/business-flow-presenter.js` |
| `recentUniqueStrings` | `modules/finance/transaksi.js` |
| `RecommendationPanel` | `modules/cross/recommendation-panel.js` |
| `recommendationPanelChatContext` | `ai-chat.js` |
| `RecommendationService` | `economic-intelligence/services/recommendation-service.js` |
| `recommendIntervalKm` | `modules/vehicle/sparepart-servis.js` |
| `recordBbmLog` | `modules/finance/tx-bbm.js` |
| `recordServisLog` | `modules/finance/tx-servis.js` |
| `recordShopSale` | `modules/shop/cobek-tx-cart.js` |
| `RECOVERABLE_STATUS` | `modules/vehicle/ride-storage.js` |
| `RECOVERY_POLL_MS` | `modules/shared/scanner-session.js` |
| `RECOVERY_STUCK_MS` | `modules/shared/scanner-session.js` |
| `RefAI` | `modules/finance/pajak-pbb-zakat.js` |
| `Refleksi` | `modules/home/refleksi-selfcare.js` |
| `REFLEKSI_SELFCARE_ITEMS` | `modules/home/refleksi-selfcare.js` |
| `refreshBillEverywhere` | `modules/finance/tagihan-kalender.js` |
| `refreshBillHistoryModalViews` | `modules/finance/tagihan-kalender.js` |
| `refreshCurrentPage` | `modules/shared/modal-navigasi.js` |
| `refreshTxCatIfOpen` | `modules/finance/kategori.js` |
| `registerAssetAIRules` | `modules/asset/aset-misc.js` |
| `registerCrossModuleAIRules` | `modules/ai/ai-decision-engine.js` |
| `registerDeliveryAIRules` | `modules/shop/cobek-pricing.js` |
| `registerFinanceAIRules` | `modules/finance/tx-list-cashflow.js` |
| `registerVehicleAIRules` | `modules/vehicle/sparepart-servis-b.js` |
| `rememberLastAccForCat` | `modules/shared/scan-ocr.js` |
| `removeOrderItem` | `modules/shop/cobek-io.js` |
| `removeOrphanedAutoPiutangForBill` | `modules/finance/piutang-utang.js` |
| `removeShopStockCartItem` | `modules/shop/cobek-tx-cart.js` |
| `removeTxShopSaleCartItem` | `modules/shop/cobek-tx-cart.js` |
| `removeUnpaidTitipanTalanganPiutangForTx` | `modules/finance/piutang-utang.js` |
| `renderAccGrid` | `modules/shared/modules-render.js` |
| `renderActualStorageQuota` | `modules/shared/modules-render-b.js` |
| `renderArchiveHistory` | `modules/shared/modules-render-b.js` |
| `renderArchiveSuggestHint` | `modules/shared/modules-render-b.js` |
| `renderAssetList` | `modules/shared/modules-render-b.js` |
| `renderBbmList` | `modules/shared/modules-render-b.js` |
| `renderBillArchive` | `modules/shared/modules-render.js` |
| `renderBillCalendar` | `modules/shared/modules-render.js` |
| `renderBillHistory` | `modules/shared/modules-render.js` |
| `renderBillItemHtml` | `modules/shared/modules-render.js` |
| `renderBillList` | `modules/shared/modules-render.js` |
| `renderBudgetCatOptions` | `modules/shared/modules-render-b.js` |
| `renderBudgets` | `modules/shared/modules-render-b.js` |
| `renderCarImportVehicleSelect` | `modules/shared/modules-render-b.js` |
| `renderCashflowForecast` | `modules/shared/modules-render-b.js` |
| `renderCatList` | `modules/shared/modules-render.js` |
| `renderChatActionBubble` | `modules/shared/modules-render-b.js` |
| `renderCnTab` | `modules/shared/modules-render-b.js` |
| `renderCustomerList` | `modules/shop/cobek-io.js` |
| `renderDashAccList` | `modules/shared/modules-render.js` |
| `renderDashboard` | `modules/shared/modules-render-b.js` |
| `renderDashboardBackupReminder` | `modules/shared/modules-render.js` |
| `renderDashboardBills` | `modules/shared/modules-render.js` |
| `renderDashboardServisReminder` | `modules/shared/modules-render.js` |
| `renderDashboardSewaKiosReminder` | `modules/shared/modules-render.js` |
| `renderDashBudgetMini` | `modules/shared/modules-render-b.js` |
| `renderDashCardPrefsUI` | `modules/shared/modules-render.js` |
| `renderDashCashflowForecast` | `modules/shared/modules-render.js` |
| `renderDashDanaDarurat` | `modules/shared/modules-render-b.js` |
| `renderDashLaporanMini` | `modules/shared/modules-render-b.js` |
| `renderDashServisVehChips` | `modules/shared/modules-render.js` |
| `renderDashZakatMini` | `modules/shared/modules-render-b.js` |
| `renderDebtList` | `modules/shared/modules-render-b.js` |
| `renderFiCatOptions` | `modules/shared/modules-render-b.js` |
| `renderFinancialFreedom` | `modules/shared/modules-render-b.js` |
| `renderFiScenarios` | `modules/shared/modules-render-b.js` |
| `renderGDriveSettings` | `modules/shared/modules-render-b.js` |
| `renderGrafik` | `modules/shared/modules-render-b.js` |
| `renderKeamananSettings` | `modules/shared/keamanan-pin.js` |
| `renderKekayaanBersih` | `modules/shared/modules-render-b.js` |
| `renderKeuAbsensiGajiCard` | `modules/shared/modules-render-b.js` |
| `renderKeuangan` | `modules/shared/modules-render-b.js` |
| `renderLapAccList` | `modules/shared/modules-render.js` |
| `renderLaporan` | `modules/shared/modules-render-b.js` |
| `renderLDR` | `modules/shared/modules-render.js` |
| `renderModalSweepResults` | `modules/shared/modules-render-b.js` |
| `renderMs` | `modules/shared/modules-render-b.js` |
| `renderNavSmokeResults` | `modules/shared/modules-render-b.js` |
| `renderNotifSettings` | `modules/shared/modules-render-b.js` |
| `renderOrderItems` | `modules/shop/cobek-io.js` |
| `renderPageContent` | `modules/shared/modules-render.js` |
| `renderPajakRekomendasi` | `modules/shared/modules-render.js` |
| `renderPajakZakat` | `modules/shared/modules-render-b.js` |
| `renderPBB` | `modules/shared/modules-render-b.js` |
| `renderPBBBillStatus` | `modules/shared/modules-render-b.js` |
| `renderPiutangList` | `modules/shared/modules-render-b.js` |
| `renderProductList` | `modules/shop/cobek-io.js` |
| `renderProdusenList` | `modules/shop/cobek-io.js` |
| `renderReceiptInsight` | `modules/shared/modules-render.js` |
| `renderRefCheckReminder` | `modules/shared/modules-render-b.js` |
| `renderReminder` | `modules/shared/modules-render-b.js` |
| `renderSalaryAllocationSuggestion` | `modules/shared/profil-pengaturan.js` |
| `renderSelfTestLastResult` | `modules/shared/modules-render-b.js` |
| `renderSelfTestResults` | `modules/shared/modules-render-b.js` |
| `renderServisList` | `modules/shared/modules-render-b.js` |
| `renderServisReminder` | `modules/shared/modules-render-b.js` |
| `renderSettings` | `modules/shared/modules-render-b.js` |
| `renderSheetsSettings` | `modules/shared/modules-render-b.js` |
| `renderShop` | `modules/shop/cobek-io.js` |
| `renderShopGrafik` | `modules/shop/cobek-io.js` |
| `renderShopLaporan` | `modules/shop/cobek-io.js` |
| `renderShopRecent` | `modules/shop/cobek-io.js` |
| `renderShopStockCartList` | `modules/shop/cobek-io.js` |
| `renderSiapPulang` | `modules/shop/cobek-io.js` |
| `renderSimLinkStatus` | `modules/shared/modules-render-b.js` |
| `renderSimList` | `modules/shared/modules-render-b.js` |
| `renderSparepartCatList` | `modules/shared/modules-render-b.js` |
| `renderSptLinkStatus` | `modules/shared/modules-render-b.js` |
| `renderStockList` | `modules/shared/modules-render-b.js` |
| `renderStorageUsage` | `modules/shared/modules-render-b.js` |
| `renderTarget` | `modules/shared/modules-render-b.js` |
| `renderTxShopSaleCartList` | `modules/shop/cobek-io.js` |
| `renderUMKMPajak` | `modules/shared/modules-render-b.js` |
| `renderVehicleManageList` | `modules/shared/modules-render-b.js` |
| `renderVehicleSelect` | `modules/shared/modules-render-b.js` |
| `renderVehicleSpecCard` | `modules/shared/modules-render-b.js` |
| `renderVehTaxLinkStatus` | `modules/shared/modules-render-b.js` |
| `renderVehTaxList` | `modules/shared/modules-render-b.js` |
| `renderVehTaxSim` | `modules/shared/modules-render-b.js` |
| `renderWealthSnapshots` | `modules/shared/modules-render-b.js` |
| `renderWorkDays` | `modules/shared/modules-render-b.js` |
| `renderZakatLog` | `modules/shared/modules-render-b.js` |
| `renovAiSuggestCur` | `modules/shared/action-wrappers.js` |
| `renovCalcOpenCur` | `modules/shared/action-wrappers.js` |
| `renovCalcOpenNull` | `modules/shared/action-wrappers.js` |
| `renovDeleteProjectCur` | `modules/shared/action-wrappers.js` |
| `renovOpenItemModalCur` | `modules/shared/action-wrappers.js` |
| `RENTAL_MGMT_CARD_NAV_TARGETS` | `modules/asset/rental-management-presenter.js` |
| `RentalManagementAPI` | `modules/asset/rental-management-api.js` |
| `RentalManagementPresenter` | `modules/asset/rental-management-presenter.js` |
| `repairTitipanOrphans` | `self-test.js` |
| `reqToPromise` | `modules/vehicle/ride-storage.js` |
| `requestAIRecommendation` | `modules/shop/cobek-order.js` |
| `requestNotifPermission` | `reminder-notif.js` |
| `resetAllBudgetsConfirm` | `modules/shared/action-wrappers.js` |
| `resetApp` | `reminder-notif.js` |
| `resetBillFilter` | `modules/finance/tagihan-kalender.js` |
| `resetKeuFilter` | `modules/finance/filter-laporan.js` |
| `resetLaporanFilter` | `modules/finance/filter-laporan.js` |
| `resetOcrWorker` | `modules/shared/scan-ocr.js` |
| `resetPayMethodLock` | `modules/finance/transaksi.js` |
| `resetShopStockCart` | `modules/shop/cobek-tx-cart.js` |
| `resetTxPageAndRender` | `modules/finance/filter-laporan.js` |
| `resetTxShopSaleCart` | `modules/shop/cobek-tx-cart.js` |
| `resolveAccOwnershipBadgeState` | `modules/finance/akun.js` |
| `resolveAliasValue` | `modules/shop/cobek-io.js` |
| `resolveElement` | `modules/vehicle/ride-map.js` |
| `resolveEntryAssetSelfPorsi` | `modules/finance/piutang-utang.js` |
| `resolveFavoritEntries` | `modules/dashboard-hub/dashboard-hub-favorit-view.js` |
| `resolveInvestmentAssetLink` | `modules/asset/investasi.js` |
| `resolveInvestmentByAssetId` | `modules/asset/investasi.js` |
| `resolveLinkedInvestmentAsset` | `modules/asset/investasi.js` |
| `resolveLinkedVehicleAsset` | `modules/vehicle/vehicle-core.js` |
| `resolveOwnerDefaultForAccount` | `modules/finance/transaksi.js` |
| `resolveServisCatForVehicle` | `modules/vehicle/sparepart-servis.js` |
| `resolveShopKategori` | `modules/shop/cobek-tx-cart.js` |
| `resolveTxOwnerAssignment` | `modules/finance/filter-laporan.js` |
| `resolveTxOwnerSplitForAccount` | `modules/finance/filter-laporan.js` |
| `resolveTxTitipanOwner` | `modules/finance/transaksi.js` |
| `resolveVehicleAssetLink` | `modules/vehicle/vehicle-core.js` |
| `resolveVehicleAssetTitipan` | `modules/vehicle/vehicle-core.js` |
| `resolveVehicleByAssetId` | `modules/vehicle/vehicle-core.js` |
| `resolveVehicleTxCategory` | `modules/finance/transaksi.js` |
| `RETIRE_NAV_TARGETS` | `modules/finance/retirement-planner-presenter.js` |
| `RetirementPlannerAPI` | `modules/finance/retirement-planner-api.js` |
| `RetirementPlannerPresenter` | `modules/finance/retirement-planner-presenter.js` |
| `revertBillFromDeletedTx` | `modules/finance/tagihan-kalender.js` |
| `revertStockPurchase` | `modules/finance/tx-stok-sparepart.js` |
| `revertStockUsage` | `modules/vehicle/sparepart-servis-b.js` |
| `REVIEW_OUTPUT_FIELD` | `lifeos/adapters/review-adapter.js` |
| `REVIEW_SOURCE_BUILDERS` | `lifeos/adapters/review-adapter.js` |
| `reviewAdapterIsOverdue` | `lifeos/adapters/review-adapter.js` |
| `reviewAdapterLatestSnapshots` | `lifeos/adapters/review-adapter.js` |
| `reviewAdapterLogFor` | `lifeos/adapters/review-adapter.js` |
| `reviewServiceAddActionItem` | `lifeos/services/review-service.js` |
| `reviewServiceComplete` | `lifeos/services/review-service.js` |
| `reviewServiceStartSession` | `lifeos/services/review-service.js` |
| `reviewSourceDirect` | `lifeos/adapters/review-adapter.js` |
| `reviewSourceLastSnapshot` | `lifeos/adapters/review-adapter.js` |
| `RideActivityMetrics` | `modules/vehicle/ride-activity-metrics.js` |
| `RideAnalytics` | `modules/vehicle/ride-history.js` |
| `RideGpsRecorder` | `modules/vehicle/ride-gps-recorder.js` |
| `RideHistory` | `modules/vehicle/ride-history.js` |
| `RideMap` | `modules/vehicle/ride-map.js` |
| `RideStorage` | `modules/vehicle/ride-storage.js` |
| `RideUI` | `modules/vehicle/ride-ui.js` |
| `RideVehicleIntegration` | `modules/vehicle/ride-vehicle-integration.js` |
| `RIPPLE_SELECTOR` | `modules/shared/ripple-position.js` |
| `RISKY_OPENER_SPECS` | `self-test.js` |
| `rollbackShopItems` | `modules/shop/cobek-tx-cart.js` |
| `round2` | `modules/vehicle/ride-map.js` |
| `RuleEngine` | `economic-intelligence/engine/rule-engine.js` |
| `runBackup` | `modules/shared/backup-restore.js` |
| `runDataHealthCheck` | `data-health-check.js` |
| `runDataMigrations` | `modules/shared/features-helpers-global-security.js` |
| `runDeferredOrNow` | `modules/shared/modules-render-b.js` |
| `runFullBackup` | `modules/shared/backup-restore.js` |
| `runGlobalSearch` | `global-search.js` |
| `runNavSmokeTest` | `self-test.js` |
| `runSelfTest` | `self-test.js` |
| `runTransaction` | `modules/vehicle/ride-storage.js` |
| `runTxDeleteCascades` | `modules/finance/tx-list-cashflow.js` |
| `runUniversalScanParser` | `modules/shared/scan-ocr-b.js` |
| `safeCalc` | `modules/shared/kalkulator-input.js` |
| `safeSetItem` | `modules/shared/features-helpers-global-security.js` |
| `SalaryAllocation` | `modules/shared/modules-calc.js` |
| `salaryAllocationSuggest` | `modules/shared/modules-calc.js` |
| `sameId` | `modules/shared/features-helpers-global-security.js` |
| `save` | `modules/shared/features-helpers-global-security.js` |
| `saveAcc` | `modules/finance/akun.js` |
| `saveAsset` | `pajak-aset-ui-wrappers.js` |
| `saveBbm` | `modules/vehicle/vehicle-core.js` |
| `saveBill` | `modules/finance/tagihan-kalender.js` |
| `saveBillHistoryEdit` | `modules/finance/tagihan-kalender.js` |
| `saveBudget` | `budget.js` |
| `saveBudgetSettings` | `budget.js` |
| `saveBudgetSettingsModal` | `modules/shared/action-wrappers.js` |
| `saveCat` | `modules/finance/kategori.js` |
| `saveCatatan` | `modules/finance/transaksi-b.js` |
| `saveChatActionEdit` | `ai-chat.js` |
| `saveDebt` | `pajak-aset-ui-wrappers.js` |
| `saveFiSettings` | `modules/shared/modules-calc.js` |
| `saveFlush` | `modules/shared/features-helpers-global-security.js` |
| `saveGajiAsIncome` | `modules/business/gaji-calc.js` |
| `saveKeuFilterPrefs` | `modules/finance/filter-laporan.js` |
| `saveKm` | `modules/vehicle/vehicle-core.js` |
| `saveLDR` | `modules/finance/transaksi-b.js` |
| `saveOrder` | `modules/shop/cobek-io.js` |
| `savePajakSettings` | `pajak-aset-ui-wrappers.js` |
| `savePiutang` | `pajak-aset-ui-wrappers.js` |
| `saveProduct` | `modules/shop/cobek-tx-cart.js` |
| `saveProdusen` | `modules/shop/cobek-io.js` |
| `saveProdusenHarga` | `modules/shop/cobek-io.js` |
| `saveReminder` | `modules/finance/transaksi-b.js` |
| `saveSelfTestState` | `self-test.js` |
| `saveServis` | `modules/vehicle/sparepart-servis-b.js` |
| `saveSim` | `modules/vehicle/vehicle-core.js` |
| `saveSparepart` | `modules/vehicle/sparepart-servis-b.js` |
| `saveStock` | `modules/vehicle/sparepart-servis-b.js` |
| `saveSubCat` | `modules/finance/kategori.js` |
| `saveTarget` | `modules/finance/tx-target.js` |
| `saveTrackpoint` | `modules/vehicle/ride-storage.js` |
| `saveTrackpoints` | `modules/vehicle/ride-storage.js` |
| `saveTransfer` | `modules/finance/tx-transfer.js` |
| `saveTx` | `modules/finance/transaksi-b.js` |
| `saveVehicle` | `modules/vehicle/vehicle-core.js` |
| `saveVehTax` | `modules/vehicle/vehicle-core.js` |
| `saveWealthSnapshot` | `pajak-aset-ui-wrappers.js` |
| `scanAllBillFallbackCandidates` | `modules/finance/tagihan-kalender.js` |
| `scanAssetPortfolio` | `modules/shared/scan-ocr.js` |
| `scanBillMultiItems` | `modules/shared/scan-ocr.js` |
| `scanBuktiTransfer` | `modules/shared/scan-ocr.js` |
| `scanErrorMessage` | `modules/shared/scan-ocr.js` |
| `scanKmOdometer` | `modules/shared/scan-ocr.js` |
| `ScannerSession` | `modules/shared/scanner-session.js` |
| `scannerSessionEnter` | `modules/shared/scanner-session.js` |
| `scannerSessionExit` | `modules/shared/scanner-session.js` |
| `scannerSessionIsActive` | `modules/shared/scanner-session.js` |
| `scannerSessionPauseUI` | `modules/shared/scanner-session.js` |
| `scannerSessionResumeUI` | `modules/shared/scanner-session.js` |
| `scanReceipt` | `modules/shared/scan-ocr.js` |
| `scanReceiptBelanja` | `modules/shared/scan-ocr.js` |
| `scanTanggalDariFoto` | `modules/shared/scan-ocr.js` |
| `scanUniversal` | `modules/shared/scan-ocr-b.js` |
| `scanWorthItCheckout` | `modules/shared/scan-ocr.js` |
| `SCHEMA_VERSION` | `modules/shared/features-helpers-global-security.js` |
| `scrollTabBarIntoView` | `modules/shared/modal-navigasi.js` |
| `selectBillCalDay` | `modules/finance/tagihan-kalender.js` |
| `selectBudgetIcon` | `budget.js` |
| `selectBudgetPeriod` | `budget.js` |
| `selectFiAssetScope` | `modules/shared/modules-calc.js` |
| `selectFilterTxOwnerSplit` | `modules/finance/filter-laporan.js` |
| `selectShopCustomer` | `modules/shop/cobek-tx-cart.js` |
| `selectSimpleAutocomplete` | `modules/finance/transaksi.js` |
| `selectStatusKawin` | `modules/shared/profil-pengaturan.js` |
| `selectStatusPekerjaan` | `modules/shared/profil-pengaturan.js` |
| `selectTanggungan` | `modules/shared/profil-pengaturan.js` |
| `selectTxCat` | `modules/finance/transaksi.js` |
| `selectTxSubCat` | `modules/finance/transaksi.js` |
| `selectTxSubCatWithCat` | `modules/finance/transaksi.js` |
| `selectVehicle` | `modules/vehicle/vehicle-core.js` |
| `SELF_REWARD_LEVEL_LABEL` | `modules/self-reward/self-reward-view.js` |
| `SelfCareReko` | `modules/home/refleksi-selfcare.js` |
| `SelfReward` | `modules/self-reward/self-reward-engine.js` |
| `SelfRewardAI` | `modules/self-reward/self-reward-ai-widget.js` |
| `SelfRewardDefaults` | `modules/self-reward/self-reward-engine.js` |
| `SelfRewardView` | `modules/self-reward/self-reward-view.js` |
| `sendChat` | `ai-chat.js` |
| `Servis` | `car-notes.js` |
| `servisLogMatchesCat` | `modules/vehicle/sparepart-servis.js` |
| `setAccOwners` | `modules/finance/akun.js` |
| `setAIAssetZakatMinThreshold` | `modules/asset/aset-misc.js` |
| `setAIDeliveryLowStockThreshold` | `modules/shop/cobek-pricing.js` |
| `setAIDeliveryThinMarginThreshold` | `modules/shop/cobek-pricing.js` |
| `setAIFinanceLowBalanceMultiplier` | `modules/finance/tx-list-cashflow.js` |
| `setAIFinanceOverspendThreshold` | `modules/finance/tx-list-cashflow.js` |
| `setAIVehicleFuelDropThreshold` | `modules/vehicle/sparepart-servis-b.js` |
| `setAllDashCardPrefs` | `modules/shared/modules-render.js` |
| `setAsetTab` | `modules/asset/aset-misc.js` |
| `setBillListTab` | `modules/finance/tagihan-kalender.js` |
| `setBillType` | `modules/finance/tagihan-kalender.js` |
| `setCatModalType` | `modules/finance/kategori.js` |
| `setCnBbmTab` | `modules/vehicle/vehicle-core.js` |
| `setCnInsightTab` | `modules/vehicle/vehicle-core.js` |
| `setCnPeriode` | `modules/vehicle/vehicle-core.js` |
| `setCnTab` | `modules/vehicle/vehicle-core.js` |
| `setCobekTab` | `modules/shop/cobek-io.js` |
| `setDashServisVehFilter` | `modules/vehicle/sparepart-servis-b.js` |
| `setDebtStrategyMethod` | `pajak-aset-ui-wrappers.js` |
| `setImportKatalogTarget` | `modules/shop/cobek-io.js` |
| `setImportShopExcelTarget` | `modules/shop/cobek-io.js` |
| `setInner` | `modules/vehicle/ride-map.js` |
| `setKelolaTab` | `modules/finance/tx-list-cashflow.js` |
| `setKeuanganTab` | `modules/finance/tx-list-cashflow.js` |
| `setLaporanPeriode` | `modules/shop/cobek-io.js` |
| `setLaporanTab` | `modules/finance/tx-list-cashflow.js` |
| `setOcrMinConfidence` | `modules/shared/scan-ocr-b.js` |
| `setPajakTab` | `pajak-aset-ui-wrappers.js` |
| `setPayMethod` | `modules/finance/transaksi.js` |
| `setPeriode` | `modules/finance/tx-list-cashflow.js` |
| `setPinAutolock` | `modules/shared/keamanan-pin.js` |
| `setPjkTab` | `pajak-aset-ui-wrappers.js` |
| `setSettingsTab` | `modules/shared/pengaturan-search.js` |
| `setShopPeriode` | `modules/shop/cobek-io.js` |
| `setShopTab` | `modules/shop/cobek-io.js` |
| `setTheme` | `modules/shared/format-tema.js` |
| `SETTINGS_TAB_LABEL` | `modules/shared/pengaturan-search.js` |
| `SETTINGS_TAB_ORDER` | `modules/shared/pengaturan-search.js` |
| `setToastSuppressed` | `modules/shared/format-tema.js` |
| `setTxListPeriode` | `modules/finance/tx-list-cashflow.js` |
| `setTxRenovStatus` | `modules/finance/tx-renov.js` |
| `setTxType` | `modules/finance/transaksi.js` |
| `setupPWA` | `pwa-setup.js` |
| `setupRipplePositionTracking` | `modules/shared/ripple-position.js` |
| `SewaKiosRenovInsight` | `modules/ai/feature-insights.js` |
| `shareBillWA` | `reminder-notif.js` |
| `shareLDRWA` | `reminder-notif.js` |
| `SHEETS_MODULES` | `sheets-schema.js` |
| `SHEETS_ROW_BUFFER` | `sheets-sync.js` |
| `SHEETS_SCHEMAS` | `sheets-schema.js` |
| `SHEETS_WRITE_CHUNK` | `sheets-sync.js` |
| `sheetsCellsToItem` | `sheets-schema.js` |
| `sheetsColLetter` | `sheets-schema.js` |
| `sheetsConnectOnly` | `sheets-sync.js` |
| `sheetsEnsureAuth` | `sheets-sync.js` |
| `sheetsEnsureTabs` | `sheets-sync.js` |
| `sheetsFetch` | `sheets-sync.js` |
| `sheetsGetOrCreateSpreadsheet` | `sheets-sync.js` |
| `sheetsHeaderFor` | `sheets-schema.js` |
| `sheetsInitTokenClient` | `sheets-sync.js` |
| `sheetsItemToCells` | `sheets-schema.js` |
| `sheetsLastColFor` | `sheets-schema.js` |
| `sheetsPendingAfterAuth` | `sheets-sync.js` |
| `sheetsPullNow` | `sheets-sync.js` |
| `sheetsSaveSpreadsheetId` | `sheets-schema.js` |
| `sheetsSyncNow` | `sheets-sync.js` |
| `sheetsTokenClient` | `sheets-sync.js` |
| `SHOP_ENGINE_NAV_TARGETS` | `modules/shop/shop-business-engine-presenter.js` |
| `SHOP_TAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `SHOP_TAB_LABEL` | `modules/shop/cobek-io.js` |
| `SHOP_TAB_ORDER` | `modules/finance/filter-laporan.js` |
| `ShopBusinessEnginePresenter` | `modules/shop/shop-business-engine-presenter.js` |
| `ShopCsvImport` | `modules/business/shop-data-io-api.js` |
| `ShopDataIO` | `modules/business/shop-data-io-api.js` |
| `ShopExport` | `modules/shop/cobek-io.js` |
| `shopFabOpenOrder` | `modules/shared/action-wrappers.js` |
| `shopFabOpenProduct` | `modules/shared/action-wrappers.js` |
| `shopFabToggleMain` | `modules/shared/action-wrappers.js` |
| `ShopInsight` | `modules/ai/feature-insights.js` |
| `ShopJsonIO` | `modules/business/shop-data-io-api.js` |
| `ShopKatalogDinamisAPI` | `modules/vehicle/shop-katalog-dinamis-api.js` |
| `ShopKatalogDinamisPresenter` | `modules/vehicle/shop-katalog-dinamis-presenter.js` |
| `shopKategoriName` | `modules/shop/cobek-tx-cart.js` |
| `shopLaporanFabExportSemua` | `modules/shared/action-wrappers.js` |
| `shopLaporanFabExportXLSX` | `modules/shared/action-wrappers.js` |
| `shopLaporanFabToggleMain` | `modules/shared/action-wrappers.js` |
| `ShopMiniSummary` | `modules/dashboard-hub/dashboard-hub.js` |
| `shopOrderRowHTML` | `modules/shop/cobek-io.js` |
| `ShopPdfImportUI` | `modules/business/shop-pdf-import-ui.js` |
| `shopPdfImportUiCommit` | `modules/business/shop-pdf-import-ui.js` |
| `shopPdfImportUiEditField` | `modules/business/shop-pdf-import-ui.js` |
| `shopPdfImportUiOnFileChange` | `modules/business/shop-pdf-import-ui.js` |
| `shopPdfImportUiOpen` | `modules/business/shop-pdf-import-ui.js` |
| `shopPdfImportUiPickFile` | `modules/business/shop-pdf-import-ui.js` |
| `shopPdfImportUiRenderPreview` | `modules/business/shop-pdf-import-ui.js` |
| `shopPdfImportUiSetTarget` | `modules/business/shop-pdf-import-ui.js` |
| `shopPdfImportUiToggleRow` | `modules/business/shop-pdf-import-ui.js` |
| `ShopScanUI` | `modules/business/shop-scan-ui.js` |
| `shopScanUiCommit` | `modules/business/shop-scan-ui.js` |
| `shopScanUiEditField` | `modules/business/shop-scan-ui.js` |
| `shopScanUiRenderPreview` | `modules/business/shop-scan-ui.js` |
| `shopScanUiResetState` | `modules/business/shop-scan-ui.js` |
| `shopScanUiScanCamera` | `modules/business/shop-scan-ui.js` |
| `shopScanUiScanGallery` | `modules/business/shop-scan-ui.js` |
| `shopScanUiSetTarget` | `modules/business/shop-scan-ui.js` |
| `shopScanUiToggleRow` | `modules/business/shop-scan-ui.js` |
| `shouldShowGenericDueField` | `modules/finance/tagihan-kalender.js` |
| `showAlertModal` | `modules/shared/modal-navigasi.js` |
| `showAllBudgetDrillDown` | `budget.js` |
| `showBudgetDrillDown` | `budget.js` |
| `showChoiceModal` | `modules/shared/modal-navigasi.js` |
| `showDashCardEl` | `modules/shared/modules-render.js` |
| `showFilteredTx` | `modules/finance/filter-laporan.js` |
| `showMain` | `modules/shared/features-helpers-global-security.js` |
| `showPage` | `modules/shared/modal-navigasi.js` |
| `showPinPromptModal` | `modules/shared/modal-navigasi.js` |
| `showPinScreen` | `modules/shared/keamanan-pin.js` |
| `showPromptModal` | `modules/shared/modal-navigasi.js` |
| `showQuickScanPicker` | `modules/shared/scan-ocr.js` |
| `showTargetAccountTx` | `modules/finance/tx-target.js` |
| `SiapPulang` | `modules/shop/cobek-order.js` |
| `SIM_MASA_BERLAKU_TAHUN` | `modules/vehicle/vehicle-core.js` |
| `simJenisFieldsHtml` | `modules/vehicle/vehicle-core.js` |
| `simpleAutocompleteInput` | `modules/finance/transaksi.js` |
| `simTarifKey` | `modules/vehicle/vehicle-core.js` |
| `sortedByTimestamp` | `modules/vehicle/ride-activity-metrics.js` |
| `Sparepart` | `modules/vehicle/sparepart-servis.js` |
| `SPAREPART_BRAND_KEYWORDS` | `modules/vehicle/sparepart-ocr-parser.js` |
| `SPAREPART_LINE_KEYWORDS` | `modules/shared/scan-ocr.js` |
| `SPAREPART_OCR_CATALOG_ADD_CONFIRM_ACTION` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `SPAREPART_OCR_CATALOG_ADD_DEFAULT_SAVE_ACTION` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `SPAREPART_OCR_CATALOG_ADD_SAVE_BTN_ID` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `SPAREPART_OCR_CATALOG_DETAIL_EMPTY` | `modules/vehicle/sparepart-ocr-catalog-detail.js` |
| `SPAREPART_SCANNER_CAMERA_INIT_TIMEOUT_MS` | `modules/vehicle/sparepart-scanner.js` |
| `SPAREPART_SCANNER_DEBOUNCE_MS` | `modules/vehicle/sparepart-scanner.js` |
| `SparepartCsvImport` | `modules/vehicle/sparepart-servis-b.js` |
| `SparepartOcr` | `modules/vehicle/sparepart-ocr.js` |
| `SparepartOcrCatalogAdd` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `sparepartOcrCatalogAddCancel` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `sparepartOcrCatalogAddConfirmSave` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `sparepartOcrCatalogAddFields` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `sparepartOcrCatalogAddOpen` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `SparepartOcrCatalogDetail` | `modules/vehicle/sparepart-ocr-catalog-detail.js` |
| `sparepartOcrCatalogDetailFields` | `modules/vehicle/sparepart-ocr-catalog-detail.js` |
| `sparepartOcrCatalogDetailHtml` | `modules/vehicle/sparepart-ocr-catalog-detail.js` |
| `sparepartOcrCatalogDetailOpen` | `modules/vehicle/sparepart-ocr-catalog-detail.js` |
| `sparepartOcrCatalogFindByCode` | `modules/vehicle/sparepart-ocr-catalog-link.js` |
| `sparepartOcrCatalogFindFromParsed` | `modules/vehicle/sparepart-ocr-catalog-link.js` |
| `sparepartOcrCatalogFindFromText` | `modules/vehicle/sparepart-ocr-catalog-link.js` |
| `SparepartOcrCatalogLink` | `modules/vehicle/sparepart-ocr-catalog-link.js` |
| `sparepartOcrCatalogShowDetail` | `modules/vehicle/sparepart-ocr-catalog-detail.js` |
| `sparepartOcrErrorMessage` | `modules/vehicle/sparepart-ocr.js` |
| `sparepartOcrOrchestrateRun` | `modules/vehicle/sparepart-ocr-orchestrator.js` |
| `SparepartOcrOrchestrator` | `modules/vehicle/sparepart-ocr-orchestrator.js` |
| `sparepartOcrParseBrand` | `modules/vehicle/sparepart-ocr-parser.js` |
| `sparepartOcrParseCodes` | `modules/vehicle/sparepart-ocr-parser.js` |
| `sparepartOcrParsePartName` | `modules/vehicle/sparepart-ocr-parser.js` |
| `SparepartOcrParser` | `modules/vehicle/sparepart-ocr-parser.js` |
| `sparepartOcrParseText` | `modules/vehicle/sparepart-ocr-parser.js` |
| `sparepartOcrPickImageFile` | `modules/vehicle/sparepart-ocr.js` |
| `sparepartOcrRecognizeFile` | `modules/vehicle/sparepart-ocr.js` |
| `sparepartOcrScan` | `modules/vehicle/sparepart-ocr.js` |
| `SparepartScanner` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerApplyTorchCapability` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerAttachLifecycle` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerBuildOverlay` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerCameraAdapter` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerDecodeFromFile` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerDetachLifecycle` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerErrorMessage` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerGalleryAdapter` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerGetAdapter` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerHandleCode` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerIsHarmlessDecodeError` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerListAdapters` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerPauseCamera` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerPickImageFile` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerRecordScan` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerRegisterAdapter` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerResumeCamera` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerScan` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerShouldDebounce` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerStopMediaStream` | `modules/vehicle/sparepart-scanner.js` |
| `sparepartScannerTeardownOverlay` | `modules/vehicle/sparepart-scanner.js` |
| `SparepartScannerUI` | `modules/vehicle/sparepart-scanner-ui.js` |
| `sparepartScannerUiOnScanResult` | `modules/vehicle/sparepart-scanner-ui.js` |
| `sparepartScannerUiScanCamera` | `modules/vehicle/sparepart-scanner-ui.js` |
| `sparepartScannerUiScanGallery` | `modules/vehicle/sparepart-scanner-ui.js` |
| `sparepartScannerWithCameraTimeout` | `modules/vehicle/sparepart-scanner.js` |
| `sptStatusBadge` | `modules/vehicle/vehicle-core.js` |
| `sptTahunanDueDate` | `modules/vehicle/vehicle-core.js` |
| `startEditCurKm` | `modules/vehicle/vehicle-core.js` |
| `STATUS_BAR_LINE_RE` | `modules/shared/scan-ocr.js` |
| `STATUS_META` | `economic-intelligence/domain/status-classifier.js` |
| `STG_EXTERNAL_SETTINGS_INDEX` | `modules/shared/pengaturan-search.js` |
| `stgSearch` | `modules/shared/pengaturan-search.js` |
| `StockRekoWidget` | `modules/shop/cobek-pricing.js` |
| `stopPropOnly` | `modules/shared/action-wrappers.js` |
| `STORAGE_BIG_MODULES` | `modules/shared/data-archive.js` |
| `STORAGE_QUOTA_ESTIMATE` | `modules/shared/data-archive.js` |
| `STORE_RIDES` | `modules/vehicle/ride-storage.js` |
| `STORE_TRACKPOINTS` | `modules/vehicle/ride-storage.js` |
| `subCatParentId` | `modules/shared/features-helpers-global-security.js` |
| `subNamesForCat` | `modules/finance/kategori.js` |
| `suggestServiceIntervalKm` | `modules/vehicle/sparepart-servis-b.js` |
| `suggestSparepartInterval` | `modules/vehicle/sparepart-servis-b.js` |
| `sumClassifiedIntervalSec` | `modules/vehicle/ride-activity-metrics.js` |
| `SupplierStore` | `modules/shop/generic/supplier-store.js` |
| `svgOpenTag` | `modules/vehicle/ride-map.js` |
| `syncBbmCost` | `modules/vehicle/vehicle-core.js` |
| `syncBbmHargaChanged` | `modules/vehicle/vehicle-core.js` |
| `syncBbmLiterFromCost` | `modules/vehicle/vehicle-core.js` |
| `syncCicilanDate` | `modules/finance/cicilan.js` |
| `syncCicilanPreview` | `modules/finance/cicilan.js` |
| `syncDebtBalanceOnPaymentEdit` | `modules/finance/piutang-utang.js` |
| `syncFuelStateFromEstimator` | `modules/finance/tx-bbm.js` |
| `syncFuelStateFromFullTankBbm` | `modules/finance/tx-bbm.js` |
| `syncLinkedAssetNilaiFromAkun` | `modules/asset/aset-misc.js` |
| `syncOutstandingSharedPiutang` | `modules/finance/piutang-utang.js` |
| `syncPartsStockFromCatalog` | `modules/finance/tx-stok-sparepart.js` |
| `syncPiutangFinanceViews` | `modules/shop/cobek-order.js` |
| `syncSharedPiutangOnPaymentEdit` | `modules/finance/piutang-utang.js` |
| `syncSparepartFromCatalog` | `modules/vehicle/sparepart-servis-b.js` |
| `syncTitipanTalanganPiutangOnEdit` | `modules/finance/piutang-utang.js` |
| `syncTxAmtToLiter` | `modules/finance/tx-bbm.js` |
| `syncTxAmtToLiterForce` | `modules/finance/tx-bbm.js` |
| `syncTxBbmAmt` | `modules/finance/tx-bbm.js` |
| `syncTxShopSaleAmt` | `modules/shop/cobek-tx-cart.js` |
| `syncTxShopStockAmt` | `modules/shop/cobek-tx-cart.js` |
| `syncUnlinkedCatalogPartsToStock` | `modules/finance/tx-stok-sparepart.js` |
| `testNotif` | `reminder-notif.js` |
| `TimelineW` | `modules/asset/aset-misc.js` |
| `timeToMinutes` | `modules/business/payroll-absensi.js` |
| `TitipanExpenseFlow` | `modules/finance/titipan-expense-flow.js` |
| `TitipanExpenseUI` | `modules/finance/titipan-expense-ui.js` |
| `TitipanReconcile` | `modules/finance/titipan-reconcile.js` |
| `TitipanSync` | `modules/finance/titipan-sync.js` |
| `toast` | `modules/shared/format-tema.js` |
| `toastUndo` | `modules/shared/format-tema.js` |
| `TODAY_SOURCE_BUILDERS` | `lifeos/adapters/today-adapter.js` |
| `todayAdapterList` | `lifeos/adapters/today-adapter.js` |
| `todaySourceBills` | `lifeos/adapters/today-adapter.js` |
| `todaySourcePayroll` | `lifeos/adapters/today-adapter.js` |
| `todaySourceReminders` | `lifeos/adapters/today-adapter.js` |
| `todaySourceSelfcare` | `lifeos/adapters/today-adapter.js` |
| `todaySourceTukang` | `lifeos/adapters/today-adapter.js` |
| `todayStr` | `modules/shared/features-helpers-global-security.js` |
| `toEpochMs` | `modules/vehicle/ride-activity-metrics.js` |
| `toggleAccInclude` | `modules/finance/akun.js` |
| `toggleApiKeyHint` | `modules/shared/profil-pengaturan.js` |
| `toggleArchiveYear` | `modules/shared/data-archive.js` |
| `toggleAssetZakatable` | `pajak-aset-ui-wrappers.js` |
| `toggleBackupModule` | `modules/shared/backup-restore.js` |
| `toggleBillCardDetail` | `modules/shared/action-wrappers.js` |
| `toggleBillFilterPanel` | `modules/finance/tagihan-kalender.js` |
| `toggleBillSharedFields` | `modules/finance/tagihan-kalender.js` |
| `toggleCardCollapse` | `modules/shared/modal-navigasi.js` |
| `toggleCatExtraFields` | `modules/vehicle/vehicle-catalog-ui.js` |
| `toggleCatGroup` | `modules/finance/kategori.js` |
| `toggleCicilanSharedFields` | `modules/finance/cicilan.js` |
| `toggleDashCardPref` | `modules/shared/modules-render.js` |
| `toggleDebtLunas` | `pajak-aset-ui-wrappers.js` |
| `toggleDebtSyncTxFields` | `modules/finance/piutang-utang.js` |
| `toggleDebugConsole` | `modules/shared/debug-console.js` |
| `toggleEieNotif` | `economic-intelligence/ui/eie-notif-settings.js` |
| `toggleFavorit` | `modules/dashboard-hub/dashboard-hub-favorit.js` |
| `toggleKasirDeliveredField` | `modules/business/kasir.js` |
| `toggleKeuFilter` | `modules/finance/filter-laporan.js` |
| `toggleMs` | `modules/finance/transaksi-b.js` |
| `toggleNotifEnabled` | `reminder-notif.js` |
| `toggleOrderDeliveredField` | `modules/shop/cobek-io.js` |
| `togglePiutangLunas` | `pajak-aset-ui-wrappers.js` |
| `togglePiutangSyncTxFields` | `modules/finance/piutang-utang.js` |
| `toggleSingleCardCollapse` | `modules/shared/pengaturan-search.js` |
| `toggleSparepartShowInReminder` | `modules/vehicle/sparepart-servis-b.js` |
| `toggleStgGroup` | `modules/shared/pengaturan-search.js` |
| `toggleTxBbmFields` | `modules/finance/tx-bbm.js` |
| `toggleTxRenovFields` | `modules/finance/tx-renov.js` |
| `toggleTxServisFields` | `modules/finance/tx-servis.js` |
| `toggleTxShopSaleFields` | `modules/shop/cobek-tx-cart.js` |
| `toggleTxShopStockFields` | `modules/shop/cobek-tx-cart.js` |
| `toggleTxStockFields` | `modules/finance/tx-stok-sparepart.js` |
| `Torsi` | `car-notes.js` |
| `TORSI_DB` | `modules/vehicle/sparepart-servis-b.js` |
| `TORSI_NM_PER_KGF` | `modules/vehicle/sparepart-servis-b.js` |
| `TORSI_STANDARD_CAT` | `car-notes.js` |
| `torsiCatatServisStop` | `modules/shared/action-wrappers.js` |
| `torsiSelectPartIfAllowed` | `modules/shared/action-wrappers.js` |
| `torsiSetCatFromChip` | `modules/shared/action-wrappers.js` |
| `torsiToggleCatCardEl` | `modules/shared/action-wrappers.js` |
| `torsiToggleCheckStop` | `modules/shared/action-wrappers.js` |
| `TorsiVehicleAPI` | `modules/vehicle/torsi-vehicle-api.js` |
| `totalAssetValue` | `pajak-aset-ui-wrappers.js` |
| `totalCicilanOutstanding` | `pajak-aset-ui-wrappers.js` |
| `totalDebtCicilanBulanan` | `pajak-aset-ui-wrappers.js` |
| `totalDebtValue` | `pajak-aset-ui-wrappers.js` |
| `totalInventoriBisnisValue` | `pajak-aset-ui-wrappers.js` |
| `totalPiutangValue` | `pajak-aset-ui-wrappers.js` |
| `totalSaldoAkun` | `modules/finance/akun.js` |
| `TRIP_STATUSES` | `modules/shop/business-flow-presenter.js` |
| `TripEngine` | `modules/shop/trip-engine.js` |
| `TripPresenter` | `modules/shop/trip-presenter.js` |
| `Tukang` | `modules/business/tukang-absensi.js` |
| `TX_PAGE_SIZE` | `modules/finance/filter-laporan.js` |
| `TxDeductionOwner` | `modules/finance/transaksi.js` |
| `txEditId` | `modules/shared/features-helpers-global-security.js` |
| `txHTML` | `modules/finance/tx-list-cashflow.js` |
| `txListPage` | `modules/finance/filter-laporan.js` |
| `txListPeriode` | `modules/finance/tx-list-cashflow.js` |
| `txMatchesFilters` | `modules/finance/filter-laporan.js` |
| `txMatchesSearch` | `modules/finance/filter-laporan.js` |
| `txStockScanPart` | `modules/finance/tx-stok-sparepart.js` |
| `txStockScanPartGallery` | `modules/finance/tx-stok-sparepart.js` |
| `txStockScanPartVia` | `modules/finance/tx-stok-sparepart.js` |
| `txTableHTML` | `modules/finance/tx-list-cashflow.js` |
| `txTableRowHTML` | `modules/finance/tx-list-cashflow.js` |
| `uid` | `modules/shared/features-helpers-global-security.js` |
| `UnifiedAIBriefing` | `modules/cross/unified-ai-briefing.js` |
| `unifiedBriefingChatContext` | `ai-chat.js` |
| `UnifiedBriefingPresenter` | `modules/cross/unified-briefing-presenter.js` |
| `UnifiedDashboardHome` | `modules/cross/unified-dashboard-home.js` |
| `UnifiedSummaryAPI` | `modules/cross/unified-summary-api.js` |
| `uniqueCatList` | `modules/finance/kategori.js` |
| `UNIVERSAL_SCAN_HISTORY_KEY` | `modules/shared/scan-ocr-b.js` |
| `UNIVERSAL_SCAN_PARSERS` | `modules/shared/scan-ocr-b.js` |
| `UniversalScan` | `modules/shared/scan-ocr-b.js` |
| `UniversalScanHistory` | `modules/shared/scan-ocr-b.js` |
| `unmigrateAssetFromInvestment` | `modules/asset/aset-misc.js` |
| `update` | `modules/vehicle/ride-map.js` |
| `updateAccIncludeBtn` | `modules/finance/akun.js` |
| `updateAmtPreview` | `modules/shared/kalkulator-input.js` |
| `updateArchivePreview` | `modules/shared/data-archive.js` |
| `updateBillSharedPreview` | `modules/finance/tagihan-kalender.js` |
| `updateBillStatGrid` | `modules/finance/tagihan-kalender.js` |
| `updateBillSubCatOptions` | `modules/finance/tagihan-kalender.js` |
| `updateCicilanTenorUI` | `modules/finance/transaksi.js` |
| `updateDebugConsoleBtn` | `modules/shared/debug-console.js` |
| `updateKfBadge` | `modules/finance/filter-laporan.js` |
| `updateOnboardPreview` | `modules/shared/onboarding.js` |
| `updateOrderItemHarga` | `modules/shop/cobek-io.js` |
| `updatePinDots` | `modules/shared/keamanan-pin.js` |
| `updatePinLockUI` | `modules/shared/keamanan-pin.js` |
| `updateProfilPTKPPreview` | `modules/shared/profil-pengaturan.js` |
| `updateRide` | `modules/vehicle/ride-storage.js` |
| `updateSelfTestBadge` | `self-test.js` |
| `updateSubCatOptions` | `modules/finance/transaksi.js` |
| `updateTxAssetHintText` | `modules/finance/transaksi.js` |
| `updateTxAssetWrapVisibility` | `modules/finance/transaksi.js` |
| `updateTxDeductionOwnerVisibility` | `modules/finance/transaksi.js` |
| `updateTxVehiclePanels` | `modules/finance/transaksi.js` |
| `updateUsiaPreview` | `modules/shared/profil-pengaturan.js` |
| `uploadBackupToDrive` | `gdrive-backup.js` |
| `UserFinanceAdapter` | `economic-intelligence/adapters/user-finance-adapter.js` |
| `validateAIRuleShape` | `modules/ai/ai-decision-engine.js` |
| `validateCicilanFields` | `modules/finance/cicilan.js` |
| `validateRideId` | `modules/vehicle/ride-storage.js` |
| `validateRuleShape` | `economic-intelligence/rules/rule-schema.js` |
| `validateSession` | `modules/vehicle/ride-storage.js` |
| `validateTrackpoint` | `modules/vehicle/ride-storage.js` |
| `validateUniversalScanItem` | `modules/shared/scan-ocr-b.js` |
| `VEH_JENIS_DEFAULT_INTERVAL` | `modules/vehicle/vehicle-core.js` |
| `vehAssetBridgeHtml` | `modules/vehicle/vehicle-core.js` |
| `vehAssetViewActionHtml` | `modules/vehicle/vehicle-core.js` |
| `vehCnCurKmInputStop` | `modules/shared/action-wrappers.js` |
| `vehEditIdx` | `modules/vehicle/vehicle-core.js` |
| `VEHICLE_ANALYTICS_NAV_TARGETS` | `modules/vehicle/vehicle-analytics-presenter.js` |
| `VEHICLE_AUTOMATION_NAV_TARGETS` | `modules/vehicle/vehicle-automation-presenter.js` |
| `VEHICLE_CATALOG_DEFAULT` | `modules/vehicle/vehicle-catalog.js` |
| `VEHICLE_CATALOG_MAX_PHOTOS` | `modules/vehicle/vehicle-catalog.js` |
| `VEHICLE_CATALOG_STORE_KEY` | `modules/vehicle/vehicle-catalog.js` |
| `VEHICLE_DASHBOARD_NAV_TARGETS` | `modules/vehicle/vehicle-dashboard.js` |
| `VEHICLE_IMPORT_CATEGORY_CODE_RE` | `modules/vehicle/vehicle-catalog-import.js` |
| `VEHICLE_IMPORT_CATEGORY_STITCH_MAX_LOOKAHEAD` | `modules/vehicle/vehicle-catalog-import.js` |
| `VEHICLE_IMPORT_CODE_TOKEN_RE` | `modules/vehicle/vehicle-catalog-import.js` |
| `VEHICLE_IMPORT_NOISE_LINE_RE` | `modules/vehicle/vehicle-catalog-import.js` |
| `VEHICLE_IMPORT_PDFJS_URL` | `modules/vehicle/vehicle-catalog-import.js` |
| `VEHICLE_IMPORT_PDFJS_WORKER_URL` | `modules/vehicle/vehicle-catalog-import.js` |
| `VEHICLE_IMPORT_PRICE_PLAIN_RE` | `modules/vehicle/vehicle-catalog-import.js` |
| `VEHICLE_IMPORT_PRICE_RE` | `modules/vehicle/vehicle-catalog-import.js` |
| `VEHICLE_IMPORT_STITCH_MAX_LOOKAHEAD` | `modules/vehicle/vehicle-catalog-import.js` |
| `VEHICLE_IMPORT_TITLE_LINE_RE` | `modules/vehicle/vehicle-catalog-import.js` |
| `VEHICLE_INSIGHT_NAV_TARGETS` | `modules/vehicle/vehicle-insight-presenter.js` |
| `VEHICLE_SCANNER_CAMERA_INIT_TIMEOUT_MS` | `modules/vehicle/vehicle-scanner.js` |
| `VEHICLE_SCANNER_DEBOUNCE_MS` | `modules/vehicle/vehicle-scanner.js` |
| `VEHICLE_SCANNER_LIB_URL` | `modules/vehicle/vehicle-scanner.js` |
| `VEHICLE_SPEC_DB` | `modules/vehicle/sparepart-servis-b.js` |
| `VEHICLE_WEB_IMPORT_CODE_RE` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `VEHICLE_WEB_IMPORT_NAME_STOPLIST` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `VehicleActionRecommendation` | `modules/vehicle/vehicle-action-recommendation.js` |
| `VehicleAIHook` | `modules/vehicle/vehicle-ai-hook.js` |
| `VehicleAlertPanel` | `modules/vehicle/vehicle-alert-panel.js` |
| `VehicleAnalyticsPresenter` | `modules/vehicle/vehicle-analytics-presenter.js` |
| `vehicleAssetLinkOptionsHtml` | `modules/vehicle/vehicle-core.js` |
| `VehicleAttentionPresenter` | `modules/vehicle/vehicle-attention-presenter.js` |
| `VehicleAutomationAPI` | `modules/vehicle/vehicle-automation-api.js` |
| `VehicleAutomationPresenter` | `modules/vehicle/vehicle-automation-presenter.js` |
| `VehicleCatalog` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogAttachSnapshotToTx` | `modules/finance/vehicle-catalog-tx-link.js` |
| `vehicleCatalogAttachToServis` | `modules/vehicle/vehicle-catalog-servis-link.js` |
| `vehicleCatalogAttachToTx` | `modules/finance/vehicle-catalog-tx-link.js` |
| `vehicleCatalogBuildTxSnapshot` | `modules/finance/vehicle-catalog-tx-link.js` |
| `vehicleCatalogClearTxSnapshot` | `modules/finance/vehicle-catalog-tx-link.js` |
| `vehicleCatalogCreate` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogDetachFromServis` | `modules/vehicle/vehicle-catalog-servis-link.js` |
| `vehicleCatalogDetachFromTx` | `modules/finance/vehicle-catalog-tx-link.js` |
| `vehicleCatalogEnsureLoaded` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogFilterForVehicle` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogFindByCode` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogGetAll` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogGetById` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogGetDrafts` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogGetServisRefs` | `modules/vehicle/vehicle-catalog-servis-link.js` |
| `vehicleCatalogGetStore` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogGetTxRefs` | `modules/finance/vehicle-catalog-tx-link.js` |
| `vehicleCatalogGetTxSnapshot` | `modules/finance/vehicle-catalog-tx-link.js` |
| `vehicleCatalogHandleOcrLabel` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogHandleScan` | `modules/vehicle/vehicle-catalog.js` |
| `VehicleCatalogImport` | `modules/vehicle/vehicle-catalog-import.js` |
| `VehicleCatalogImportStockPush` | `modules/vehicle/vehicle-catalog-import-stock-push.js` |
| `vehicleCatalogImportStockPushPromptAndRun` | `modules/vehicle/vehicle-catalog-import-stock-push.js` |
| `vehicleCatalogImportStockPushRun` | `modules/vehicle/vehicle-catalog-import-stock-push.js` |
| `VehicleCatalogImportUI` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `vehicleCatalogInvalidateCache` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogIsLoaded` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogLoad` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogNormalizeServisRefs` | `modules/vehicle/vehicle-catalog-servis-link.js` |
| `vehicleCatalogNormalizeTxRefs` | `modules/finance/vehicle-catalog-tx-link.js` |
| `vehicleCatalogParseLabelText` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogRecommend` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogRemove` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogRemoveAll` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogRemoveMany` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogResolveDraft` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogResolveServisParts` | `modules/vehicle/vehicle-catalog-servis-link.js` |
| `vehicleCatalogResolveTxParts` | `modules/finance/vehicle-catalog-tx-link.js` |
| `vehicleCatalogSave` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogSearch` | `modules/vehicle/vehicle-catalog.js` |
| `VehicleCatalogServisLink` | `modules/vehicle/vehicle-catalog-servis-link.js` |
| `VehicleCatalogStore` | `modules/vehicle/vehicle-catalog.js` |
| `VehicleCatalogTxLink` | `modules/finance/vehicle-catalog-tx-link.js` |
| `VehicleCatalogUI` | `modules/vehicle/vehicle-catalog-ui.js` |
| `vehicleCatalogUpdate` | `modules/vehicle/vehicle-catalog.js` |
| `vehicleCatalogValidate` | `modules/vehicle/vehicle-catalog.js` |
| `VehicleCatalogWebImport` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `VehicleCatalogWebImportUI` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `VehicleCostSummary` | `modules/vehicle/vehicle-cost-summary.js` |
| `VehicleDailyBrief` | `modules/vehicle/vehicle-daily-brief.js` |
| `VehicleDashboard` | `modules/vehicle/vehicle-dashboard.js` |
| `VehicleDecisionAPI` | `modules/vehicle/vehicle-decision-api.js` |
| `VehicleDecisionPresenter` | `modules/vehicle/vehicle-decision-presenter.js` |
| `VehicleFuelTrendSummary` | `modules/vehicle/vehicle-fuel-trend.js` |
| `vehicleImportCommitRows` | `modules/vehicle/vehicle-catalog-import.js` |
| `vehicleImportExtractPdfText` | `modules/vehicle/vehicle-catalog-import.js` |
| `vehicleImportFilterCompleteRows` | `modules/vehicle/vehicle-catalog-import.js` |
| `vehicleImportGroupRowsByCategory` | `modules/vehicle/vehicle-catalog-import.js` |
| `vehicleImportParseCatalogRow` | `modules/vehicle/vehicle-catalog-import.js` |
| `vehicleImportParseCatalogRows` | `modules/vehicle/vehicle-catalog-import.js` |
| `VehicleInsightFeed` | `modules/vehicle/vehicle-insight-feed.js` |
| `VehicleInsightPresenter` | `modules/vehicle/vehicle-insight-presenter.js` |
| `VehicleIntelligence` | `modules/vehicle/vehicle-intelligence.js` |
| `VehicleMaintenanceAutomation` | `modules/vehicle/vehicle-maintenance-automation.js` |
| `VehicleNotifBridge` | `modules/vehicle/vehicle-notif-bridge.js` |
| `VehiclePriorityScoring` | `modules/vehicle/vehicle-priority-scoring.js` |
| `VehicleRecommendationEngine` | `modules/vehicle/vehicle-recommendation-engine.js` |
| `VehicleReminder` | `modules/vehicle/vehicle-reminder.js` |
| `VehicleReminderScheduler` | `modules/vehicle/vehicle-reminder-scheduler.js` |
| `VehicleScanner` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerApplyTorchCapability` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerAttachLifecycle` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerBuildHints` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerBuildOverlay` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerDetachLifecycle` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerErrorMessage` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerHandleResult` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerIsHarmlessDecodeError` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerPauseCamera` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerRecordScan` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerResumeCamera` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerScan` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerShouldDebounce` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerStopMediaStream` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerTeardown` | `modules/vehicle/vehicle-scanner.js` |
| `vehicleScannerWithCameraTimeout` | `modules/vehicle/vehicle-scanner.js` |
| `VehicleServiceTrendSummary` | `modules/vehicle/vehicle-service-trend.js` |
| `VehicleTaxDocumentAutomation` | `modules/vehicle/vehicle-tax-document-automation.js` |
| `VehicleTrendAPI` | `modules/vehicle/vehicle-trend-api.js` |
| `vehicleWebImportFetchHtml` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `vehicleWebImportParseCatalogHtml` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `vehJenisFieldsHtml` | `modules/vehicle/vehicle-core.js` |
| `vehMetaText` | `modules/vehicle/vehicle-core.js` |
| `VEHTAX_INPUT_IDS` | `car-notes.js` |
| `VEHTAX_ITEMS` | `car-notes.js` |
| `vehTaxHistoryEstimate` | `car-notes.js` |
| `volumeCalculator` | `modules/shop/cobek-etalase.js` |
| `WALLET_BARE_AMT_RE` | `modules/shared/scan-ocr-b.js` |
| `WALLET_SPEND_CONTEXT_RE` | `modules/shared/scan-ocr-b.js` |
| `waShareLink` | `reminder-notif.js` |
| `WeightBulkWidget` | `modules/shop/cobek-pricing.js` |
| `weightCalculator` | `modules/shop/cobek-etalase.js` |
| `withSaveGuard` | `modules/shared/features-helpers-global-security.js` |
| `withSaveGuardAsync` | `modules/shared/features-helpers-global-security.js` |
| `withTimeout` | `modules/shared/scan-ocr.js` |
| `WorthIt` | `modules/finance/worthit.js` |
| `WORTHIT_KEBUTUHAN_KEYWORDS` | `modules/shared/scan-ocr.js` |
| `Zakat` | `modules/finance/pajak-pbb-zakat.js` |
