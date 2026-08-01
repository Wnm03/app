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

Terakhir digenerate: 2026-08-01T08:28:26.908Z
Total file source: 278 · Total identifier global: 1953

## 1. Urutan load & ringkasan tiap file

Urutan sesuai `GROUP_A`+`GROUP_B` di `build.js` (urutan ini yang dipakai
bundler menggabungkan semua file jadi `app-bundle-a.min.js`/`app-bundle-b.min.js`).

| # | File | Baris | Ringkasan |
|---|------|------:|-----------|
| 1 | `modules/shared/modules-render.js` | 1956 | Fungsi render (85 fungsi) dipisah dari app_production.html untuk pemerataan ukuran file. Dipindah ke modules/shared/modules-render.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & … |
| 2 | `modules/shared/modals.js` | 8 | Modal HTML dipisah dari app_production.html untuk pemerataan ukuran file. Dipindah ke modules/shared/modals.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 3 | `modules/shared/modules-calc.js` | 916 | _(tidak ada komentar header)_ |
| 4 | `modules/shop/cobek-etalase.js` | 604 | Domain Shop bagian Etalase: katalog produk (tambah/edit/hapus, Dipindah ke modules/shop/cobek-etalase.js (Sesi 10 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 5 | `modules/shop/cobek-pricing.js` | 856 | Domain Shop bagian rekomendasi harga & ongkir: PriceReko (kalkulator Dipindah ke modules/shop/cobek-pricing.js (Sesi 10 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, … |
| 6 | `modules/shop/cobek-order.js` | 862 | Domain Shop bagian order & pelanggan: Produsen (supplier), SiapPulang Dipindah ke modules/shop/cobek-order.js (Sesi 10 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, … |
| 7 | `modules/shop/cobek-tx-cart.js` | 373 | Domain Shop bagian integrasi form Transaksi: cart Stok Masuk & Penjualan Dipindah ke modules/shop/cobek-tx-cart.js (Sesi 10 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 8 | `modules/shop/cobek-io.js` | 512 | Domain Shop bagian impor/ekspor: ImportKatalog (impor massal produk+harga Dipindah ke modules/shop/cobek-io.js (Sesi 10 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, … |
| 9 | `modules/business/shop-data-io-api.js` | 402 | Bagian B (Shop Import/Export: Scan/PDF/CSV/JSON) dari DESIGN_torsi-vehicle-selector_shop-import-export-2.md. Bagian B (Scan, Import PDF, Import CSV, Import/Export JSON) SUDAH SELESAI 4/4. Sesi ini (lanjutan opsional, … |
| 10 | `modules/business/kasir.js` | 367 | Modul "🧠 Kasir AI" (v127, kw81-kasir-ai-pos): Dipindah ke modules/business/kasir.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder). Tab … |
| 11 | `modules/finance/piutang-utang.js` | 609 | Domain Piutang & Utang: catatan piutang (uang dipinjamkan), utang (uang dipinjam) beserta status lunas/cicilan, dan DebtStrategy (simulasi strategi pelunasan Avalanche/Snowball). Dipindah ke … |
| 12 | `modules/finance/pajak-pbb-zakat.js` | 376 | Kalkulator Pajak Bumi & Bangunan (PBB), Zakat (penghasilan, maal, fitrah), Referensi AI (cek harga emas/nisab via AI), Pajak UMKM, dan PPh 21 (Orang Pribadi) Dipindah ke modules/finance/pajak-pbb-zakat.js (Sesi 16 … |
| 13 | `budget.js` | 535 | Anggaran Budget (batas pengeluaran per kategori, tab List/Rekomendasi, drill-down transaksi). Dipisah dari features-budget-laporan-carnotes-pelanggan.js (Sesi 6 restrukturisasi folder, bagian budget/laporan — lihat … |
| 14 | `car-notes.js` | 1238 | Catatan Kendaraan (Car Notes): pajak kendaraan (VEHTAX), log BBM, log servis + pengingat interval, kalkulator Torsi baut. Dipisah dari features-budget-laporan-carnotes-pelanggan.js (Sesi 6 restrukturisasi folder, bagian … |
| 15 | `chat-action-handlers.js` | 107 | Aksi AI Chat/RefAI: label & handler eksekusi usulan aksi dari balasan AI (blok [[ACTION]]). Dipisah dari features-budget-laporan-carnotes-pelanggan.js (Sesi 7 restrukturisasi folder — file lama SELESAI dihapus total, … |
| 16 | `modules/finance/edukasi-dana.js` | 176 | Dana Pendidikan (EduFund): kalkulator target biaya sekolah/kuliah & nabung/bulan Dipindah ke modules/finance/edukasi-dana.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 17 | `modules/home/hidup-seimbang.js` | 220 | Domain Skor Hidup Seimbang: skor gabungan dari Dana Darurat, DSR cicilan, No-Spend 30 hari, & keseimbangan kerja-istirahat, plus riwayat snapshot bulanan. Dipindah ke modules/home/hidup-seimbang.js (Sesi 13 … |
| 18 | `modules/finance/linktx.js` | 256 | Transaksi tertaut (LinkTx): hubungkan transaksi lama di Keuangan ke Renov/Wishlist/Bill Dipindah ke modules/finance/linktx.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 19 | `modules/asset/aset.js` | 1756 | Domain Aset & Kekayaan: ALOKASI_PRESETS/AlokasiAset (rekomendasi alokasi dana), Aset (Buku Aset & Kekayaan Bersih), Penyusutan (estimasi nilai buku aset yg menurun nilainya: Garis Lurus/Saldo Menurun/Manual), PajakAset … |
| 20 | `modules/asset/aset-keluarga.js` | 93 | Laporan gabungan lintas-modul: 🏠 Aset Keluarga Dipindah ke modules/asset/aset-keluarga.js (Sesi 9 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder). … |
| 21 | `modules/ai/feature-insights.js` | 434 | Kartu "💡 Insight ..." di PALING ATAS/dekat 7 fitur (Keuangan, Pajak & Dipindah ke modules/ai/feature-insights.js (Sesi 14 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 22 | `modules/asset/invest-ai-widget.js` | 195 | Widget "🤖 Rekomendasi AI" otomatis di kartu 🧭 Dipindah ke modules/asset/invest-ai-widget.js (Sesi 9 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 23 | `modules/asset/penyusutan-ai-widget.js` | 166 | Widget "🤖 Rekomendasi AI" utk kartu 📉 Penyusutan Dipindah ke modules/asset/penyusutan-ai-widget.js (Sesi 9 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 24 | `modules/asset/aset-emas-impor.js` | 394 | FITUR BARU: GoldImport (impor massal nota emas via paste teks ATAU Dipindah ke modules/asset/aset-emas-impor.js (Sesi 9 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, … |
| 25 | `modules/asset/property-management-api.js` | 163 | modules/asset/property-management-api.js — Property Management API (S102, Batch 10). Target sesi: Property Management Foundation. PRINSIP (RULE #1 sesi ini): 100% REUSE modul Asset yang SUDAH ADA — TIDAK ada rumus … |
| 26 | `modules/asset/property-management-presenter.js` | 155 | modules/asset/property-management-presenter.js — Property Management Presenter (Sesi 132, Batch 10 lanjutan). Target sesi: audit menemukan `PropertyManagementAPI` (S102) sudah lengkap + ada test, tapi TIDAK PERNAH … |
| 27 | `modules/asset/rental-management-api.js` | 162 | modules/asset/rental-management-api.js — Rental Management API (S103, Batch 10). Target sesi: Rental Management Foundation. PRINSIP (RULE #1 sesi ini): 100% REUSE modul Asset yang SUDAH ADA — TIDAK ada rumus keuangan … |
| 28 | `modules/asset/rental-management-presenter.js` | 144 | modules/asset/rental-management-presenter.js — Rental Management Presenter (Sesi 132, Batch 10 lanjutan). Target sesi: audit menemukan `RentalManagementAPI` (S103) sudah lengkap + ada test, tapi TIDAK PERNAH dipanggil … |
| 29 | `modules/asset/asset-maintenance-api.js` | 132 | modules/asset/asset-maintenance-api.js — Asset Maintenance API (S104, Batch 10). Target sesi: Asset Maintenance Foundation. PRINSIP (RULE #1 sesi ini): 100% REUSE modul Asset yang SUDAH ADA — TIDAK ada rumus baru, TIDAK … |
| 30 | `modules/asset/asset-maintenance-presenter.js` | 124 | modules/asset/asset-maintenance-presenter.js — Asset Maintenance Presenter (Sesi 132, Batch 10 lanjutan). Target sesi: audit menemukan `AssetMaintenanceAPI` (S104) sudah lengkap + ada test, tapi TIDAK PERNAH dipanggil … |
| 31 | `modules/finance/worthit.js` | 705 | Domain Worth It? & Prioritas Belanja: cek kondisi keuangan sebelum belanja + daftar prioritas barang yang mau dibeli Dipindah ke modules/finance/worthit.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & … |
| 32 | `modules/shared/ripple-position.js` | 64 | ROADMAP-v1.1.md item #8 (KNOWN-ISSUES.md §5.2): ripple berbasis koordinat sentuh/klik ASLI, bukan selalu pulsa dari tengah elemen. Murni aditif: CSS ripple Tahap 7 (styles.css, radial-gradient via ::after) sebelumnya … |
| 33 | `modules/shared/data-default.js` | 68 | Domain Data Default: kategori shop bawaan (DEFAULT_COBEK_KATEGORI), Dipindah ke modules/shared/data-default.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 34 | `modules/shared/ownership-engine.js` | 208 | Ownership Engine (Sesi 191, fondasi lintas-domain). TARGET EKSPLISIT USER: "Implementasikan hanya Ownership Engine. Reuse seluruh modul existing. Jangan ubah business logic. Jangan refactor besar... Buat satu Ownership … |
| 35 | `modules/shared/ownership-settings-presenter.js` | 82 | Sesi 229-230: Settings → Ownership (tampilan read-only 5 tipe kepemilikan). Target eksplisit user: "Reuse existing: OwnershipEngine. No new engine. No business logic changes... Show existing ownership: SELF/INVESTOR/ … |
| 36 | `modules/shared/features-helpers-global-security.js` | 586 | Helper global (migrasi data, state D, save/load, event dispatcher) Dipindah ke modules/shared/features-helpers-global-security.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama … |
| 37 | `modules/shared/action-wrappers.js` | 174 | S264 Security Hardening — wrapper functions untuk eks data-onclick. Semua inline handler (data-onclick + new Function()) diganti data-action yang manggil fungsi bernama di sini. Tidak ada logic baru, cuma re-wrap kode … |
| 38 | `diagnostik-versi.js` | 77 | Domain Diagnostik & Sinkronisasi Versi: snapshot HTML utk self-test (getHtmlSnapshotForSelfTest), cek status sinkron versi produksi vs master (computeProductionSyncStatus), cek status sinkron versi antar file modul … |
| 39 | `modules/shared/format-tema.js` | 56 | Domain Format Angka & Tema: format rupiah singkat (fmt, mis. "Rp 1.5 jt"), Dipindah ke modules/shared/format-tema.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 40 | `modules/shared/error-handler.js` | 39 | Domain Error Handler Global: tangkap error tak tertangani (uncaught error & Dipindah ke modules/shared/error-handler.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 41 | `modules/shared/helper-teks.js` | 26 | Domain Helper Teks & Kalender: escape karakter HTML berbahaya biar aman Dipindah ke modules/shared/helper-teks.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 42 | `modules/shared/keamanan-pin.js` | 279 | Domain Keamanan: layar PIN (showPinScreen/checkPin/pinPress/pinBack/updatePinDots), Dipindah ke modules/shared/keamanan-pin.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama … |
| 43 | `modules/home/refleksi-selfcare.js` | 256 | Domain Refleksi & Self-Care: Jurnal Syukur, Checklist Self-Care harian Dipindah ke modules/home/refleksi-selfcare.js (Sesi 13 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 44 | `modules/shared/modal-navigasi.js` | 351 | Domain Modal Generik & Navigasi Halaman: modal konfirmasi/prompt/pilihan/info/pin Dipindah ke modules/shared/modal-navigasi.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama … |
| 45 | `modules/shared/scanner-session.js` | 238 | modules/shared/scanner-session.js — ScannerSession (Tahap 5, docs/ PRODUCT_DECISIONS.md § "Scanner — Exclusive Scanner Mode via ScannerSession (FINAL — Sesi 316, PD-007)"). PD-007 — Scanner WAJIB berjalan lewat … |
| 46 | `modules/business/reset-gaji-mingguan.js` | 115 | Domain Reset Gaji Mingguan: hitung rentang minggu berjalan (getWeekRange), Dipindah ke modules/business/reset-gaji-mingguan.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 47 | `modules/shared/debug-console.js` | 50 | Domain Debug Console: toggle tombol status (updateDebugConsoleBtn) & aktifkan/matikan Dipindah ke modules/shared/debug-console.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama … |
| 48 | `modules/shared/pengaturan-search.js` | 140 | Domain Pencarian Pengaturan: buka/tutup grup pengaturan (toggleStgGroup), cari Dipindah ke modules/shared/pengaturan-search.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama … |
| 49 | `modules/shared/onboarding.js` | 55 | Domain Onboarding: preview perkiraan kasar gaji/kiriman saat setup awal Dipindah ke modules/shared/onboarding.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 50 | `modules/shared/kalkulator-input.js` | 142 | Kalkulator ekspresi angka: parser aman (safeCalc), popup kalkulator (openCalc/calcPress/dst), Dipindah ke modules/shared/kalkulator-input.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; … |
| 51 | `modules/shared/scan-ocr.js` | 1616 | Scan struk belanja (OCR): struk belanja, bukti transfer, tanggal dari foto, odometer, portofolio aset, kategori & sparepart otomatis dari struk Dipindah ke modules/shared/scan-ocr.js (Sesi 17-18 restrukturisasi folder — … |
| 52 | `modules/finance/filter-laporan.js` | 235 | Filter transaksi/keuangan (panel filter Keuangan & Laporan), pencarian, paginasi list transaksi, navigasi antar-list (goToList/showFilteredTx) Dipindah ke modules/finance/filter-laporan.js (Sesi 16 restrukturisasi … |
| 53 | `modules/finance/akun.js` | 285 | Kelola Akun (Cash/Bank/Ewallet dll): saldo, filter dropdown akun di seluruh app, CRUD akun Dipindah ke modules/finance/akun.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 54 | `modules/business/gaji-calc.js` | 56 | Kalkulator gaji harian/borongan (Tukang & karyawan lepas), catat sbg pemasukan Dipindah ke modules/business/gaji-calc.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 55 | `modules/finance/cicilan.js` | 114 | logika form Cicilan pada txModal (Tambah/Edit Transaksi Keuangan). Dipindah ke modules/finance/cicilan.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 56 | `modules/finance/tx-bbm.js` | 94 | logika panel "Sinkron ke Catatan Mobil (BBM)" pada txModal Dipindah ke modules/finance/tx-bbm.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 57 | `modules/finance/tx-stok-sparepart.js` | 285 | logika panel "Tambah ke Stok Sparepart juga?" pada Dipindah ke modules/finance/tx-stok-sparepart.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 58 | `modules/finance/tx-renov.js` | 128 | logika panel "🔨 Catat juga ke Proyek Renovasi?" pada txModal (Tambah/Edit Transaksi Keuangan). Pola panel kondisional PERSIS SAMA dengan tx-stok-sparepart.js (lihat file itu utk pola aslinya "Tambah ke Stok Sparepart … |
| 59 | `modules/finance/tx-transfer.js` | 34 | logika modal "⇄ Transfer Antar Akun" (transferModal). Dipindah ke modules/finance/tx-transfer.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 60 | `modules/finance/tx-cobek.js` | 30 | domain "Stok/Penjualan Shop (Shop)" pada form Transaksi. Dipindah ke modules/finance/tx-cobek.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 61 | `modules/finance/tx-target.js` | 69 | domain "Target Tabungan" (modal tambah target, deteksi Dana Dipindah ke modules/finance/tx-target.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 62 | `modules/finance/tx-list-cashflow.js` | 517 | domain "List Transaksi (kartu tx, hapus tx), filter Dipindah ke modules/finance/tx-list-cashflow.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 63 | `modules/finance/transaksi.js` | 1048 | Form Tambah/Edit Transaksi Keuangan: autocomplete kategori/produk, Dipindah ke modules/finance/transaksi.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 64 | `modules/shared/profil-pengaturan.js` | 98 | Profil pengguna di Pengaturan: auto-save profil, status Dipindah ke modules/shared/profil-pengaturan.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 65 | `modules/finance/kategori.js` | 171 | Modal Kategori & Subkategori (tambah/edit/hapus, filter tampilan) Dipindah ke modules/finance/kategori.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 66 | `modules/ai/kategorisasi-ai.js` | 187 | AI Auto-Kategorisasi Transaksi dari Catatan Bebas Dipindah ke modules/ai/kategorisasi-ai.js (Sesi 14 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder). … |
| 67 | `modules/finance/tagihan-kalender.js` | 1352 | Modul Tagihan/Bill (CRUD, riwayat, filter, arsip) & Kalender Jatuh Tempo Dipindah ke modules/finance/tagihan-kalender.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 68 | `modules/shared/backup-restore.js` | 834 | Export/import/backup data (satu domain penuh: CSV/JSON export laporan, backup Dipindah ke modules/shared/backup-restore.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 69 | `modules/shared/backup-history-api.js` | 93 | modules/shared/backup-history-api.js — Backup History API (Data Management Core). Target: catat histori tiap kali proses backup dijalankan (sukses/sebagian/gagal), lalu sediakan API baca murni di atasnya. PRINSIP: REUSE … |
| 70 | `modules/shared/backup-health-api.js` | 60 | modules/shared/backup-health-api.js — Backup Health API (Data Management Core). Target: status kesehatan backup (kapan terakhir, terlambat atau tidak) + keandalan (persentase sukses dari histori). PRINSIP: REUSE … |
| 71 | `modules/shared/backup-history-presenter.js` | 49 | modules/shared/backup-history-presenter.js — Backup History Presenter (Data Management Core). Lihat catatan lengkap di modules/shared/backup-history-api.js. PRINSIP: UI HANYA presenter. 100% REUSE … |
| 72 | `modules/shared/backup-health-presenter.js` | 45 | modules/shared/backup-health-presenter.js — Backup Health Presenter (Data Management Core). Lihat catatan lengkap di modules/shared/backup-health-api.js. PRINSIP: UI HANYA presenter. 100% REUSE … |
| 73 | `modules/business/payroll-absensi.js` | 486 | Payroll: Absensi Harian & Kalkulator Gaji Mingguan (const Payroll={...}) Dipindah ke modules/business/payroll-absensi.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 74 | `modules/business/tukang-absensi.js` | 681 | Domain Tukang (absensi/payroll harian & borongan) ONLY. Dipindah ke modules/business/tukang-absensi.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 75 | `modules/business/insight-target-mingguan.js` | 71 | S132: Insight Target Mingguan (kirim uang ke istri). Domain BARU, tapi 100% reuse data & fungsi yang sudah ada: - Target = D.profile.kiriman (field "Kiriman Mingguan (Rp)" yang SUDAH ADA di Pengaturan → Profil, dulu … |
| 76 | `modules/vehicle/vehicle-core.js` | 747 | Domain Vehicle core: CRUD kendaraan, KM (log & estimasi konsumsi/rp-per-km), Pajak Kendaraan (STNK tahunan/5-tahunan + SPT Tahunan pribadi), SIM, proactive reminders (dashboard), dan Car Notes tab (filter periode, edit … |
| 77 | `modules/vehicle/vehicle-catalog.js` | 620 | Parts Catalog (Katalog Suku Cadang), Milestone 0 Phase 1: fondasi murni (storage + CRUD + validation + search + filter), TANPA UI/wiring page baru. PERUBAHAN SESI INI (TASK-007 — Tahap 3 OCR label kemasan, logic saja, … |
| 78 | `modules/vehicle/vehicle-scanner.js` | 569 | Scan Barcode/QR/DataMatrix untuk Vehicle Catalog (lanjutan dari ACR-001/Tahap 2 — lihat komentar handleScan() di vehicle-catalog.js: "itu butuh keputusan produk terpisah: pilih library, izin kamera, dsb — di luar … |
| 79 | `modules/vehicle/vehicle-catalog-ui.js` | 553 | UI dasar Vehicle Catalog (Katalog Suku Cadang), lanjutan ringkas Tahap 2 ACR-001. Scan (vehicle-scanner.js) & storage/CRUD (vehicle-catalog.js) SUDAH ADA dari sesi sebelumnya — sesi ini isinya HANYA lapisan UI, scope … |
| 80 | `modules/vehicle/sparepart-scanner.js` | 668 | Scanner Sparepart (Tahap 7B-1 Fondasi + Tahap 7B-2 Kamera Real-Time) CAKUPAN TAHAP 7B-1 (fondasi, disepakati eksplisit — RULE #1: 100% reuse, TIDAK ada formula/skema baru, UI presenter layer saja): - Adapter "gallery": … |
| 81 | `modules/vehicle/sparepart-scanner-ui.js` | 94 | UI tipis Scanner Sparepart (Tahap 7B-1 Fondasi + Tahap 7B-2 Kamera Real-Time), tombol "📷 Scan" (kamera) & "🖼️ Scan dari Galeri" di catalogModal (modules/shared/modals.js) yang SUDAH ADA (VehicleCatalogUI/catalogModal, … |
| 82 | `modules/vehicle/sparepart-ocr.js` | 125 | Engine OCR Sparepart Scanner (Tahap 7C-1, Fondasi) CAKUPAN TAHAP 7C-1 (disepakati eksplisit — RULE #1: 100% reuse, TIDAK ada OCR engine baru, TIDAK ada integrasi Vehicle Catalog): - Engine baca 1 foto dari GALERI (input … |
| 83 | `modules/vehicle/sparepart-ocr-parser.js` | 151 | Parser Hasil OCR Sparepart (Tahap 7C-2, logic murni) CAKUPAN TAHAP 7C-2 (disepakati eksplisit — parsing MURNI, BELUM menyimpan data, BELUM ubah UI): - Terima STRING teks OCR mentah (hasil SparepartOcr.scan(), Tahap … |
| 84 | `modules/vehicle/sparepart-ocr-catalog-link.js` | 124 | Sparepart OCR Tahap 7C-3a: jembatan MURNI LOGIC antara hasil SparepartOcrParser (Tahap 7C-2, modules/vehicle/sparepart-ocr-parser.js) dan VehicleCatalog (modules/vehicle/vehicle-catalog.js). CAKUPAN TAHAP 7C-3a … |
| 85 | `modules/vehicle/sparepart-ocr-catalog-detail.js` | 160 | Sparepart OCR Tahap 7C-3b: tampilkan detail part KALAU hasil pencarian (Tahap 7C-3a, SparepartOcrCatalogLink) ditemukan. CAKUPAN TAHAP 7C-3b (disepakati eksplisit — hanya presentasi detail part, TIDAK ubah parser & … |
| 86 | `modules/vehicle/sparepart-ocr-catalog-add.js` | 211 | Sparepart OCR: kalau part TIDAK ditemukan (SparepartOcrCatalogLink.findFromParsed()/findFromText(), Tahap 7C-3a, `found:false`), buka form tambah part yang SUDAH ADA (`VehicleCatalogUI.openForm()`, Sesi 181) dalam mode … |
| 87 | `modules/vehicle/sparepart-ocr-orchestrator.js` | 118 | Sparepart OCR Tahap 7C-4b: orkestrator utama Scan -> Parse -> Cari Vehicle Catalog -> (ditemukan -> Detail) / (tidak ditemukan -> Add). CAKUPAN TAHAP 7C-4b (disepakati eksplisit — orkestrasi saja, 0 logic baru, 100% … |
| 88 | `modules/vehicle/vehicle-catalog-import.js` | 612 | Tahap 5: Import Katalog (PDF -> OCR -> Parser -> Preview -> Import), logic murni (parsing/orchestration), TIDAK menyentuh DOM. Lanjutan dari ACR-001/Vehicle Catalog, mengikuti Project Decision sesi ini. KEPUTUSAN PRODUK … |
| 89 | `modules/vehicle/vehicle-catalog-import-ui.js` | 255 | UI Tahap 5 "Import Katalog" (PDF -> OCR -> Parser -> Preview -> Import). Lapisan DOM/presenter SAJA, seluruh logic parsing/commit ada di vehicle-catalog-import.js (TIDAK diduplikasi/diubah di sini) — pola sama persis … |
| 90 | `modules/vehicle/vehicle-catalog-import-stock-push.js` | 117 | "Push ke Stok Sparepart" pasca Import Katalog (jawaban langsung atas pertanyaan user: sync Katalog -> Stok Sparepart TIDAK otomatis dapat qty nyata, cuma dapat baris kosong qty:0 lewat syncUnlinkedCatalogPartsToStock() … |
| 91 | `modules/vehicle/vehicle-catalog-web-import.js` | 186 | Tahap 6: Import Katalog dari URL Web (fetch HTML -> Parser -> Preview -> Import), lanjutan dari Tahap 5 (vehicle-catalog-import.js, PDF -> OCR -> Parser -> Preview -> Import). Logic murni (fetch/parsing), TIDAK … |
| 92 | `modules/vehicle/vehicle-catalog-web-import-ui.js` | 226 | UI Tahap 6 "Import Katalog dari URL Web" (fetch/paste HTML -> Parser -> Preview -> Import). Lapisan DOM/presenter SAJA, logic ada di vehicle-catalog-web-import.js — pola sama persis vehicle-catalog-import-ui.js vs … |
| 93 | `modules/vehicle/vehicle-catalog-servis-link.js` | 138 | Vehicle Catalog Tahap 6, Sesi 1/3 (paling ringan): jembatan MURNI LOGIC antara D.servisLogs (catatan servis, dimiliki car-notes.js/data-default.js) dan VehicleCatalog (katalog suku cadang, IDBStore terpisah, … |
| 94 | `modules/finance/vehicle-catalog-tx-link.js` | 234 | Vehicle Catalog Tahap 7A: "Smart Transaction Foundation", jembatan MURNI LOGIC antara D.transactions (transaksi keuangan, dimiliki modules/finance/transaksi.js) dan VehicleCatalog (katalog suku cadang, IDBStore … |
| 95 | `modules/vehicle/honda-pdf-import.js` | 288 | Import PDF Honda (Tahap 7D-1, Fondasi) CAKUPAN TAHAP 7D-1 (disepakati eksplisit — IMPLEMENTATION ONLY): - Pilih 1 ATAU BANYAK file PDF sekaligus (input file `multiple`, filter `accept="application/pdf"`), pola picker … |
| 96 | `modules/vehicle/honda-pdf-import-extract.js` | 152 | Import PDF Honda: Extract Text -> Preview (Tahap 7D-2), lanjutan Tahap 7D-1 (honda-pdf-import.js, pilih+simpan sementara). Logic murni orkestrasi + 1 helper decode base64 -> pdf.js; TIDAK ada parsing OEM/harga/nama-part … |
| 97 | `modules/vehicle/honda-pdf-import-parse.js` | 98 | Import PDF Honda: Parse Text -> JSON (Tahap 7D-3), lanjutan Tahap 7D-2 (honda-pdf-import-extract.js, extract teks -> preview). Logic murni orkestrasi, TIDAK ada engine parsing baru: 100% reuse … |
| 98 | `modules/vehicle/honda-pdf-import-commit.js` | 76 | Import PDF Honda: JSON -> Vehicle Catalog (Tahap 7D-4), lanjutan Tahap 7D-3 (honda-pdf-import-parse.js, parse teks -> JSON). Logic murni orkestrasi, TIDAK ada engine commit baru: 100% reuse … |
| 99 | `modules/vehicle/honda-pdf-import-ui.js` | 236 | UI Tahap 7D-5 "Import PDF Honda" (Preview Import). Lapisan DOM/presenter SAJA di atas HondaPdfImport (Tahap 7D-1, pilih+simpan sementara), HondaPdfImportExtract (Tahap 7D-2, extract teks), HondaPdfImportParse (Tahap … |
| 100 | `modules/business/shop-pdf-import-ui.js` | 201 | Bagian B (Shop Import/Export: Scan/PDF/CSV/JSON) dari DESIGN_torsi-vehicle-selector_shop-import-export-2.md, §B.3.2 Import PDF (Sesi N+7, urutan implementasi disarankan di dokumen tsb — setelah Sesi N+6 … |
| 101 | `modules/business/shop-scan-ui.js` | 193 | Bagian B (Shop Import/Export: Scan/PDF/CSV/JSON) dari DESIGN_torsi-vehicle-selector_shop-import-export-2.md, §B.3.1 Scan (Sesi N+8, urutan implementasi disarankan di dokumen tsb — setelah Sesi N+7 Import PDF Shop). … |
| 102 | `modules/ai/chat-action.js` | 84 | Parsing & UI blok [[ACTION]] dari balasan AI Chat (RefAI), murni ekstraksi/format teks, Dipindah ke modules/ai/chat-action.js (Sesi 14 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file … |
| 103 | `modules/shared/data-archive.js` | 162 | Storage usage estimate & Archive (export lalu hapus data lama per tahun). Dipindah ke modules/shared/data-archive.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 104 | `modules/vehicle/sparepart-servis.js` | 1424 | Domain Sparepart & Servis kendaraan: kategori & stok sparepart (Sparepart), catatan servis (wrapper ke Servis di car-notes.js), interval servis per-kategori & override per-kendaraan, katalog referensi … |
| 105 | `modules/vehicle/shop-katalog-dinamis-api.js` | 158 | modules/vehicle/shop-katalog-dinamis-api.js — Shop Katalog Sparepart Dinamis (per-Kendaraan) API. Batch: "ringan dulu" — cuma layer data (API), TIDAK ada presenter/modal baru di sesi ini (menyusul kalau API ini sudah … |
| 106 | `modules/vehicle/shop-katalog-dinamis-presenter.js` | 76 | modules/vehicle/shop-katalog-dinamis-presenter.js — Shop Katalog Sparepart Dinamis Presenter. 100% REUSE ShopKatalogDinamisAPI (modules/vehicle/shop-katalog-dinamis-api.js) — TIDAK ada query/hitungan baru di sini, murni … |
| 107 | `modules/vehicle/torsi-vehicle-api.js` | 138 | modules/vehicle/torsi-vehicle-api.js — Torsi Vehicle Selector API (Sesi 1). Basis: DESIGN_torsi-vehicle-selector_shop-import-export.md, Bagian A. Batch: "ringan dulu" — cuma layer data (API) + migrasi, TIDAK ada … |
| 108 | `ai-chat.js` | 1151 | Chat AI (RefAI): UI edit aksi chat, kirim pesan ke provider AI (sendChat/ callAIProviderRaw), Advisor (rule-based tips) & AIWidget (widget rekomendasi AI generik dipakai modul lain). Dipisah dari … |
| 109 | `reminder-notif.js` | 163 | resetApp (reset total data, disatukan di sini krn tidak ada domain lain yang cocok & cuma 1 fungsi kecil), share ke WhatsApp (phoneToWaId/waShareLink/openWaShare), notifikasi browser … |
| 110 | `laporan-export.js` | 146 | Ekspor Laporan Keuangan ke PDF (exportLaporanPDF) & gambar (exportLaporanImage), plus builder data laporan (buildLaporanExportData: filter periode, total income/expense, breakdown per kategori). Dipisah dari … |
| 111 | `gdrive-backup.js` | 293 | Integrasi Google Drive: OAuth connect/disconnect, backup manual/otomatis (uploadBackupToDrive), restore (gdriveDownloadBackup). Dipisah dari features-aiwidget-reminder-gdrive-search.js (Sesi 5 restrukturisasi folder, … |
| 112 | `data-health-check.js` | 270 | Cek integritas data lintas-domain (runDataHealthCheck): transaksi dengan akun/tanggal/jumlah tidak valid, ID duplikat, tagihan/aset/BBM dengan tautan akun atau kendaraan yang sudah dihapus, dll. Dipisah dari … |
| 113 | `global-search.js` | 54 | Pencarian DATA milik user lintas halaman (openGlobalSearch/runGlobalSearch), beda tujuan dari Feature Search (dashboard-hub-search.js) yang cari FITUR/MENU. Dipisah dari features-aiwidget-reminder-gdrive-search.js (Sesi … |
| 114 | `sheets-schema.js` | 228 | Skema kolom Google Sheets per modul (SHEETS_SCHEMAS/SHEETS_MODULES) & helper konversi item<->baris (sheetsHeaderFor/sheetsItemToCells/sheetsCellsToItem dst), dipakai oleh sheets-sync.js. Dipisah dari … |
| 115 | `sheets-sync.js` | 239 | Integrasi Google Sheets: koneksi OAuth, sinkronisasi push/pull data D.* ke/dari Google Spreadsheet. Dipisah dari features-sheets-pwa-selftest.js (Sesi 2 restrukturisasi folder, blok 1/5 — lihat … |
| 116 | `pwa-setup.js` | 62 | Setup PWA: registrasi manifest (via Blob kalau tidak di-hosting https) & service worker (sw.js, fallback inline Blob). Dipisah dari features-sheets-pwa-selftest.js (Sesi 2 restrukturisasi folder, blok 2/5 — lihat … |
| 117 | `self-test.js` | 2160 | CATATAN (Sesi 297): file ini adalah runtime app (bukan file test Node), tapi namanya cocok pola default `node --test` (*-test.js) sehingga bisa ke-load & "gagal" kalau `node --test` dijalankan TANPA argumen di root. … |
| 118 | `pajak-aset-ui-wrappers.js` | 161 | Wrapper UI tipis: parser angka (parsePzNum/parseDecStr/ normalizeOcrNumber), ganti tab pajak/zakat (setPajakTab/setPjkTab/savePajakSettings), dan delegasi tipis ke modul … |
| 119 | `modules/finance/finance-intelligence.js` | 238 | Finance Intelligence Foundation (Sesi 74, Batch 6). Target sesi: Cash Flow Summary, Budget Summary, Income vs Expense, Financial Health Score, Insight dasar — lihat docs/BATCH_PLAN.md § Batch 6. PRINSIP (RULE #1 sesi … |
| 120 | `modules/finance/finance-dashboard.js` | 202 | modules/finance/finance-dashboard.js — Finance Dashboard & AI Hook Foundation (Sesi 75, Batch 6). Lihat docs/BATCH_PLAN.md § Batch 6. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 121 | `modules/finance/financial-forecast-api.js` | 114 | modules/finance/financial-forecast-api.js — Financial Forecast API (Sesi 91, Batch 10). Target sesi: Financial Forecast Foundation — lihat docs/BATCH_PLAN.md § Batch 10. PRINSIP (RULE #1 sesi ini): 100% REUSE … |
| 122 | `modules/finance/financial-forecast-presenter.js` | 133 | modules/finance/financial-forecast-presenter.js — Financial Forecast Presenter (Sesi 91, Batch 10). Target sesi: Financial Forecast Foundation — lihat docs/BATCH_PLAN.md § Batch 10. PRINSIP (RULE #1 sesi ini): UI HANYA … |
| 123 | `modules/finance/budget-recommendation-api.js` | 241 | modules/finance/budget-recommendation-api.js — Budget Recommendation API (Sesi 92, Batch 10). Target sesi: Budget Recommendation Foundation — lihat docs/BATCH_PLAN.md § Batch 10. PRINSIP (RULE #1 sesi ini): 100% REUSE … |
| 124 | `modules/finance/budget-recommendation-presenter.js` | 136 | modules/finance/budget-recommendation-presenter.js — Budget Recommendation Presenter (Sesi 92, Batch 10). Target sesi: Budget Recommendation Foundation — lihat docs/BATCH_PLAN.md § Batch 10. PRINSIP (RULE #1 sesi ini): … |
| 125 | `modules/finance/cashflow-projection-api.js` | 112 | modules/finance/cashflow-projection-api.js — Cash Flow Projection API (Sesi 93, Batch 10). Target sesi: Cash Flow Projection Foundation — lihat docs/BATCH_PLAN.md § Batch 10. PRINSIP (RULE #1 sesi ini): 100% REUSE … |
| 126 | `modules/finance/cashflow-projection-presenter.js` | 135 | modules/finance/cashflow-projection-presenter.js — Cash Flow Projection Presenter (Sesi 93, Batch 10). Target sesi: Cash Flow Projection Foundation — lihat docs/BATCH_PLAN.md § Batch 10. PRINSIP (RULE #1 sesi ini): UI … |
| 127 | `modules/finance/financial-goal-api.js` | 224 | modules/finance/financial-goal-api.js — Financial Goal API (Sesi 94, Batch 10). Target sesi: Financial Goal Planner Foundation — Financial Goal API, Goal Progress, Target Projection, Goal Recommendation, Goal Presenter. … |
| 128 | `modules/finance/financial-goal-presenter.js` | 149 | modules/finance/financial-goal-presenter.js — Financial Goal Presenter (Sesi 94, Batch 10). Target sesi: Financial Goal Planner Foundation — lihat catatan lengkap di modules/finance/financial-goal-api.js. PRINSIP (RULE … |
| 129 | `modules/finance/investment-planner-api.js` | 250 | modules/finance/investment-planner-api.js — Investment Planner API (Sesi 95, Batch 10; REWIRED Sesi 161 — lihat catatan di atas `_portfolio()`/`_allocation()`/`watchlistAlerts()` di bawah). Target sesi: Investment … |
| 130 | `modules/finance/investment-planner-presenter.js` | 143 | modules/finance/investment-planner-presenter.js — Investment Planner Presenter (Sesi 95, Batch 10). Target sesi: Investment Planner Foundation — lihat catatan lengkap di modules/finance/investment-planner-api.js. … |
| 131 | `modules/finance/debt-optimizer-api.js` | 191 | modules/finance/debt-optimizer-api.js — Debt Optimizer API (Sesi 96, Batch 10). Target sesi: Debt Optimizer Foundation — Debt Overview, DSR (Debt Service Ratio), Payoff Plan, Debt Recommendation, Presenter. PRINSIP … |
| 132 | `modules/finance/debt-optimizer-presenter.js` | 141 | modules/finance/debt-optimizer-presenter.js — Debt Optimizer Presenter (Sesi 96, Batch 10). Target sesi: Debt Optimizer Foundation — lihat catatan lengkap di modules/finance/debt-optimizer-api.js. PRINSIP (RULE #1 sesi … |
| 133 | `modules/finance/retirement-planner-api.js` | 173 | modules/finance/retirement-planner-api.js — Retirement Planner API (Sesi 97, Batch 10). Target sesi: Retirement Planner Foundation — Retirement Overview, Gap Analysis, Contribution Recommendation, Retirement … |
| 134 | `modules/finance/retirement-planner-presenter.js` | 142 | modules/finance/retirement-planner-presenter.js — Retirement Planner Presenter (Sesi 97, Batch 10). Target sesi: Retirement Planner Foundation — lihat catatan lengkap di modules/finance/ retirement-planner-api.js. … |
| 135 | `modules/finance/financial-health-score-api.js` | 138 | modules/finance/financial-health-score-api.js — Financial Health Score API (Sesi 98, Batch 10). Target sesi: Financial Health Score Foundation — Score Overview, Component Breakdown, Recommendation, Presenter. PRINSIP … |
| 136 | `modules/finance/financial-health-score-presenter.js` | 140 | modules/finance/financial-health-score-presenter.js — Financial Health Score Presenter (Sesi 98, Batch 10). Target sesi: Financial Health Score Foundation — lihat catatan lengkap di modules/finance/ … |
| 137 | `modules/finance/financial-risk-dashboard-api.js` | 163 | modules/finance/financial-risk-dashboard-api.js — Financial Risk Dashboard API (Sesi 99, Batch 10). Target sesi: Financial Risk Dashboard — Risk Factors, Risk Level, Presenter. PRINSIP (RULE #1 sesi ini): 100% REUSE … |
| 138 | `modules/finance/financial-risk-dashboard-presenter.js` | 151 | modules/finance/financial-risk-dashboard-presenter.js — Financial Risk Dashboard Presenter (Sesi 99, Batch 10). Target sesi: Financial Risk Dashboard — lihat catatan lengkap di modules/finance/ … |
| 139 | `modules/vehicle/vehicle-intelligence.js` | 181 | Vehicle Intelligence Foundation (Sesi 76, Batch 7). Target sesi: lapisan agregasi domain VEHICLE — vehicle overview, health score per kendaraan, ringkasan armada (fleet), insight dasar — lihat docs/BATCH_PLAN.md § Batch … |
| 140 | `modules/vehicle/vehicle-dashboard.js` | 142 | modules/vehicle/vehicle-dashboard.js — Vehicle Dashboard Foundation (Sesi 77, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE VehicleIntelligence.summary() … |
| 141 | `modules/vehicle/vehicle-reminder.js` | 216 | Vehicle Reminder Foundation (Sesi 78, Batch 7). Target sesi: lapisan reminder domain VEHICLE — Service Reminder, Tax Reminder, Fuel Reminder, + Reminder Summary API. Lihat docs/BATCH_PLAN.md § Batch 7. Pola SAMA PERSIS … |
| 142 | `modules/vehicle/vehicle-notif-bridge.js` | 70 | Vehicle Notification Bridge (Sesi 84, Batch 7). Target sesi: **Vehicle Dashboard Final Integration** — menutup gap terakhir yang tercatat di docs/BATCH_PLAN.md Sesi 83 ("wiring … |
| 143 | `modules/vehicle/vehicle-ai-hook.js` | 76 | modules/vehicle/vehicle-ai-hook.js — Vehicle AI Hook Foundation (Sesi 79, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE, TIDAK ada rumus baru, TIDAK duplikasi logic, TIDAK mengubah … |
| 144 | `modules/vehicle/vehicle-insight-presenter.js` | 124 | modules/vehicle/vehicle-insight-presenter.js — Vehicle Insight Presenter (Sesi 79, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE VehicleAIHook.fleetSummary() … |
| 145 | `modules/vehicle/vehicle-daily-brief.js` | 68 | modules/vehicle/vehicle-daily-brief.js — Vehicle Daily Brief (Sesi 80, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE VehicleAIHook.fleetSummary() … |
| 146 | `modules/vehicle/vehicle-alert-panel.js` | 51 | modules/vehicle/vehicle-alert-panel.js — Vehicle Alert Panel (Sesi 80, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE VehicleAIHook.fleetSummary() … |
| 147 | `modules/vehicle/vehicle-insight-feed.js` | 71 | modules/vehicle/vehicle-insight-feed.js — Vehicle Insight Feed (Sesi 80, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE VehicleAIHook.fleetSummary() … |
| 148 | `modules/vehicle/vehicle-trend-api.js` | 118 | Vehicle Trend API Foundation (Sesi 81, Batch 7). Target sesi: Vehicle Analytics Foundation — Vehicle Trend API, Vehicle Cost Summary, Fuel Trend Summary, Service Trend Summary, Vehicle Analytics Presenter. Lihat … |
| 149 | `modules/vehicle/vehicle-cost-summary.js` | 58 | Vehicle Cost Summary (Sesi 81, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleTrendAPI.monthlyCostTrend() (modules/vehicle/vehicle-trend-api.js, sesi ini) — TIDAK menghitung … |
| 150 | `modules/vehicle/vehicle-fuel-trend.js` | 50 | Fuel Trend Summary (Sesi 81, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleTrendAPI.monthlyCostTrend() (type:'fuel', modules/vehicle/vehicle-trend-api.js, sesi ini) utk … |
| 151 | `modules/vehicle/vehicle-service-trend.js` | 43 | Service Trend Summary (Sesi 81, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleTrendAPI.monthlyCostTrend() (type:'service', modules/vehicle/vehicle-trend-api.js, sesi ini) … |
| 152 | `modules/vehicle/vehicle-analytics-presenter.js` | 158 | modules/vehicle/vehicle-analytics-presenter.js — Vehicle Analytics Presenter (Sesi 81, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 153 | `modules/vehicle/fuel-storage.js` | 46 | Fuel Storage (TASK-141, Fuel Intelligence Card). PRINSIP: 100% REUSE D.bbmLogs (data mentah yang SUDAH ADA, diisi tx-bbm.js/car-notes.js BBM._saveInner/recordBbmLog) — TIDAK ada field baru ditambahkan ke D, TIDAK ada … |
| 154 | `modules/vehicle/fuel-tank-profile.js` | 128 | Fuel Tank Profile (TASK-142). PRINSIP: field baru & OPSIONAL di D.vehicles[i].fuelTankProfile (ADDITIVE — kendaraan lama tanpa field ini tetap jalan normal, get() balikin DEFAULTS penuh). TIDAK ada storage baru di luar … |
| 155 | `modules/vehicle/fuel-intelligence-engine.js` | 82 | Fuel Engine (TASK-141, Fuel Intelligence Card). PRINSIP: 100% REUSE service yang SUDAH ADA — TIDAK ada rumus kmPerLiter/rpPerKm/estMonthlyCost baru (fuelEfficiency(), vehicle-core.js), TIDAK menghitung ulang tren biaya … |
| 156 | `modules/vehicle/fuel-gauge-engine.js` | 272 | Fuel Gauge Engine (TASK-143). PRINSIP: 100% REUSE FuelTankProfile.get() (TASK-142, kalibrasi tangki per kendaraan) + fuelEfficiency() global (vehicle-core.js, SUDAH ADA, dipakai … |
| 157 | `modules/vehicle/fuel-history.js` | 42 | Fuel History (TASK-141, Fuel Intelligence Card). PRINSIP: UI HANYA presenter. 100% REUSE FuelStorage.recent() (sesi ini — sendiri 100% reuse D.bbmLogs apa adanya) utk daftar catatan isi BBM terbaru. Tap 1 baris membuka … |
| 158 | `modules/vehicle/fuel-analytics.js` | 88 | Fuel Analytics (TASK-141, Fuel Intelligence Card). PRINSIP: UI HANYA presenter. 100% REUSE VehicleFuelTrendSummary.summary() (Sesi 81, Batch 7 — sendiri 100% reuse VehicleTrendAPI.monthlyCostTrend() utk histori biaya … |
| 159 | `modules/vehicle/fuel-modal.js` | 44 | Fuel Modal (TASK-141, Fuel Intelligence Card). PRINSIP: orkestrasi TIPIS saja. Buka overlay #fuelIntelModal (markup di modals.js, sesi ini) & panggil FuelAnalytics.render()/FuelHistory.render() (sesi ini, keduanya 100% … |
| 160 | `modules/vehicle/fuel-card.js` | 212 | Fuel Card (TASK-141, Fuel Intelligence Card). PRINSIP: UI HANYA presenter. 100% REUSE FuelIntelligenceEngine.vehicleInsight() (sesi ini) utk kendaraan aktif (curVehicleId, SUDAH ADA — variabel yang sama dipakai … |
| 161 | `modules/vehicle/fuel-intelligence-ui.js` | 296 | Fuel Bar Correction (TASK-144). PRINSIP: UI/orkestrasi TIPIS saja, 100% REUSE FuelGaugeEngine (TASK-143, konversi bar<->liter<->persen) + FuelTankProfile (TASK-142, kapasitas tangki & jumlah bar) — TIDAK ada rumus … |
| 162 | `modules/vehicle/fuel-tank-profile-ui.js` | 135 | Atur Tangki UI (companion untuk TASK-142 FuelTankProfile & TASK-144 FuelBarCorrection). PRINSIP: UI/orkestrasi TIPIS saja, 100% REUSE FuelTankProfile.get()/ validate()/save() (SUDAH ADA) — TIDAK ada rumus/validasi baru … |
| 163 | `modules/vehicle/fuel-prediction-engine.js` | 216 | Fuel Consumption Prediction Engine (TASK-146). PRINSIP: engine-only, 0 UI, PURE (read-only, tidak pernah panggil save() atau menulis ke D). 100% REUSE modul fuel yang SUDAH ADA — 0 rumus bar/liter/persen/km/L/Rp per km … |
| 164 | `modules/vehicle/fuel-cost-analytics.js` | 247 | Fuel Cost Analytics Engine (TASK-147). PRINSIP: engine-only, 0 UI, PURE (read-only, tidak pernah panggil save() atau menulis ke D/D.bbmLogs/D.vehicles). 100% REUSE modul fuel yang SUDAH ADA — 0 rumus km/L, Rp/km, atau … |
| 165 | `modules/vehicle/fuel-maintenance-engine.js` | 283 | Fuel Maintenance Intelligence Engine (TASK-148). PRINSIP: engine-only, 0 UI, PURE (read-only, tidak pernah panggil save() atau menulis ke D). 100% REUSE modul & fungsi yang SUDAH ADA — 0 rumus km/L, Rp/km, … |
| 166 | `modules/vehicle/fuel-insight-engine.js` | 523 | Fuel Insight Engine (TASK-149; diperluas TASK-150A "Expand FuelInsightEngine Summary API"). PRINSIP: engine-only, 0 UI, PURE (read-only, tidak pernah panggil save() atau menulis ke D). 100% REUSE SELURUH engine fuel … |
| 167 | `modules/vehicle/fuel-fleet-selector.js` | 130 | Fuel Fleet Brief Selector (TASK-151A). KONTEKS: TASK-151 (Fuel AI Daily Briefing Integration) di-STOP krn pipeline briefing yang ada beroperasi fleet-wide, sedangkan FuelInsightEngine.getSummary()/getInsights() wajib 1 … |
| 168 | `modules/vehicle/fuel-notif-bridge.js` | 113 | Fuel Notification Bridge (TASK-153, Fuel Notification & Reminder). KONTEKS: reminder-notif.js (checkAndFireReminders()) SUDAH menembak notifikasi browser nyata utk tagihan/LDR/pajak-kendaraan/SIM/SPT + (Sesi 84) … |
| 169 | `modules/vehicle/fuel-dashboard.js` | 333 | Fuel Dashboard (TASK-150, Fuel Dashboard Integration). + Export Fuel Dashboard (TASK-155A, exportVehicleHTML()/exportVehicleJSON(), lihat blok "TASK-155A: Export (Single Vehicle)" di bawah). PRINSIP: UI HANYA presenter, … |
| 170 | `modules/vehicle/fuel-compare.js` | 389 | Multi Vehicle Fuel Comparison (TASK-154). + Export All FuelCompare (TASK-155A, exportFleetHTML()/exportFleetJSON(), lihat blok "TASK-155A: Export (Fleet)" di bawah). PRINSIP: presentation only, 0 UI baru … |
| 171 | `modules/vehicle/fuel-trend-dashboard.js` | 296 | Fuel Trend Dashboard (TASK-156). PRINSIP: UI HANYA presenter, 0 rumus/skoring/engine/storage baru. 100% REUSE (persis 4 dependency yang diminta task, dipanggil LANGSUNG — bukan cuma lewat FuelInsightEngine.getSummary() … |
| 172 | `modules/vehicle/vehicle-decision-api.js` | 45 | modules/vehicle/vehicle-decision-api.js — Vehicle Decision API (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleAIHook.fleetSummary()/ .vehicleInsight(vehicleId) … |
| 173 | `modules/vehicle/vehicle-recommendation-engine.js` | 92 | modules/vehicle/vehicle-recommendation-engine.js — Vehicle Recommendation Engine (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleDecisionAPI.context() … |
| 174 | `modules/vehicle/vehicle-priority-scoring.js` | 58 | modules/vehicle/vehicle-priority-scoring.js — Vehicle Priority Scoring (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE field `severity` yang SUDAH ADA di tiap … |
| 175 | `modules/vehicle/vehicle-action-recommendation.js` | 65 | modules/vehicle/vehicle-action-recommendation.js — Vehicle Action Recommendation (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE field `type`/`severity` yang SUDAH ADA di … |
| 176 | `modules/vehicle/vehicle-decision-presenter.js` | 78 | modules/vehicle/vehicle-decision-presenter.js — Vehicle Decision Presenter (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 177 | `modules/vehicle/vehicle-attention-presenter.js` | 110 | modules/vehicle/vehicle-attention-presenter.js — Vehicle Attention Card (Sesi 156b, permintaan eksplisit user: gabungkan VehicleAlertPanel + VehicleInsightFeed + VehicleDecisionPresenter jadi SATU card ranked "🧭 Perlu … |
| 178 | `modules/vehicle/vehicle-automation-api.js` | 51 | modules/vehicle/vehicle-automation-api.js — Vehicle Automation API (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleRecommendationEngine. recommendations() + … |
| 179 | `modules/vehicle/vehicle-reminder-scheduler.js` | 70 | modules/vehicle/vehicle-reminder-scheduler.js — Smart Reminder Scheduler (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleAutomationAPI.context() … |
| 180 | `modules/vehicle/vehicle-maintenance-automation.js` | 36 | modules/vehicle/vehicle-maintenance-automation.js — Maintenance Automation (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleReminderScheduler. schedule() … |
| 181 | `modules/vehicle/vehicle-tax-document-automation.js` | 36 | modules/vehicle/vehicle-tax-document-automation.js — Tax & Document Automation (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleReminderScheduler. schedule() … |
| 182 | `modules/vehicle/vehicle-automation-presenter.js` | 141 | modules/vehicle/vehicle-automation-presenter.js — Automation Presenter (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 183 | `modules/cross/finance-vehicle-cross-summary.js` | 45 | modules/cross/finance-vehicle-cross-summary.js — Finance & Vehicle Cross Summary API (Sesi 87, Batch 8). Target sesi: Finance & Vehicle Cross Integration Foundation — lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 … |
| 184 | `modules/cross/cross-ai-hook.js` | 37 | modules/cross/cross-ai-hook.js — Finance & Vehicle Unified AI Hook (Sesi 87, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): 100% REUSE CrossSummaryAPI.summary() … |
| 185 | `modules/cross/cross-dashboard-card.js` | 117 | modules/cross/cross-dashboard-card.js — Finance & Vehicle Unified Dashboard Card (Sesi 87, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE CrossAIHook.getAIHook() … |
| 186 | `modules/cross/cross-insight-presenter.js` | 62 | modules/cross/cross-insight-presenter.js — Finance & Vehicle Shared Insight Presenter (Sesi 87, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 187 | `modules/cross/unified-summary-api.js` | 52 | modules/cross/unified-summary-api.js — Finance & Vehicle Unified Summary API (Sesi 88, Batch 8). Target sesi: Unified AI Briefing Foundation — lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): 100% REUSE … |
| 188 | `modules/cross/unified-ai-briefing.js` | 93 | modules/cross/unified-ai-briefing.js — Finance & Vehicle Unified AI Briefing (Sesi 88, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): 100% REUSE UnifiedSummaryAPI.summary() … |
| 189 | `modules/cross/unified-briefing-presenter.js` | 60 | modules/cross/unified-briefing-presenter.js — Finance & Vehicle Dashboard Briefing Presenter (Sesi 88, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 190 | `modules/cross/life-dashboard-summary-api.js` | 60 | modules/cross/life-dashboard-summary-api.js — Personal Life Dashboard Summary API (Sesi 89, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): 100% REUSE UnifiedSummaryAPI.summary() … |
| 191 | `modules/cross/priority-engine.js` | 62 | modules/cross/priority-engine.js — Priority Engine (Sesi 90, Batch 8). Target sesi: Personal Decision Center Foundation. PRINSIP (RULE #1 sesi ini): 100% REUSE LifeDashboardSummaryAPI.summary() … |
| 192 | `modules/cross/personal-overview-presenter.js` | 37 | modules/cross/personal-overview-presenter.js — Personal Overview Presenter (Sesi 89, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE … |
| 193 | `modules/cross/cross-module-widgets.js` | 57 | modules/cross/cross-module-widgets.js — Cross Module Widgets (Sesi 89, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE LifeDashboardSummaryAPI.summary() … |
| 194 | `modules/cross/life-priority-panel.js` | 65 | modules/cross/life-priority-panel.js — Priority Panel (Sesi 89, Batch 8, direfaktor Sesi 90 — Personal Decision Center Foundation). Lihat docs/BATCH_PLAN.md § Batch 8. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. … |
| 195 | `modules/cross/unified-dashboard-home.js` | 32 | modules/cross/unified-dashboard-home.js — Unified Dashboard Home (Sesi 89, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8 — "Personal Life Dashboard Foundation". PRINSIP (RULE #1 sesi ini): UI HANYA presenter, TIDAK ada … |
| 196 | `modules/cross/decision-center-api.js` | 78 | modules/cross/decision-center-api.js — Personal Decision Center API (Sesi 90, Batch 8). Target sesi: Personal Decision Center Foundation. PRINSIP (RULE #1 sesi ini): 100% REUSE LifeDashboardSummaryAPI.summary() … |
| 197 | `modules/cross/recommendation-panel.js` | 71 | modules/cross/recommendation-panel.js — Recommendation Panel (Sesi 90, Batch 8). Target sesi: Personal Decision Center Foundation. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE DecisionCenterAPI.summary() … |
| 198 | `modules/cross/action-queue.js` | 99 | modules/cross/action-queue.js — Action Queue (Sesi 90, Batch 8). Target sesi: Personal Decision Center Foundation. PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE DecisionCenterAPI.summary() … |
| 199 | `modules/cross/decision-center-home.js` | 28 | modules/cross/decision-center-home.js — Decision Center Home (Sesi 90, Batch 8). Target sesi: Personal Decision Center Foundation — Dashboard Integration. PRINSIP (RULE #1 sesi ini): UI HANYA presenter, TIDAK ada … |
| 200 | `app-bootstrap.js` | 60 | Titik bootstrap utama app: expose modul-modul ke window (Object.assign) lalu panggil init(). Dipisah dari features-sheets-pwa-selftest.js (Sesi 3 restrukturisasi folder, blok 5 — lihat … |
| 201 | `modules/shared/feature-icons.js` | 108 | Migrasi Icon Emoji -> SVG (KNOWN-ISSUES.md §4.1 / ROADMAP-v1.1.md #3) Dipindah ke modules/shared/feature-icons.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK … |
| 202 | `modules/dashboard-hub/dashboard-hub-registry.js` | 269 | FEATURE_REGISTRY: sumber data tunggal taksonomi Dipindah ke modules/dashboard-hub/dashboard-hub-registry.js (Sesi 11 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 203 | `modules/dashboard-hub/dashboard-hub.js` | 887 | Dashboard Feature Hub (blueprint-dashboard-hub.md §5) Dipindah ke modules/dashboard-hub/dashboard-hub.js (Sesi 11 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 204 | `modules/dashboard-hub/dashboard-hub-search.js` | 129 | Feature Search: cari FITUR/MENU (bukan data Dipindah ke modules/dashboard-hub/dashboard-hub-search.js (Sesi 11 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 205 | `modules/dashboard-hub/dashboard-hub-favorit.js` | 40 | Favorit (Tahap 3, Langkah 6): storage + service Dipindah ke modules/dashboard-hub/dashboard-hub-favorit.js (Sesi 11 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 206 | `modules/dashboard-hub/dashboard-hub-favorit-view.js` | 114 | Favorit (Tahap 3, Langkah 7-8): render + Dipindah ke modules/dashboard-hub/dashboard-hub-favorit-view.js (Sesi 11 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 207 | `modules/dashboard-hub/dashboard-hub-settings.js` | 193 | S129: "Pengaturan Dashboard" (Dashboard Settings). Presenter layer MURNI di atas mekanisme yang SUDAH ADA — RULE #1 sesi ini: ZIP sesi lalu adalah source of truth, 100% reuse modul existing, ZERO formula/framework baru, … |
| 208 | `modules/ai/ai-command-center.js` | 142 | Sprint 3 Tahap 3.1: AI Command Center Foundation. Dipindah ke modules/ai/ai-command-center.js (Sesi 14 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi … |
| 209 | `modules/self-reward/self-reward-engine.js` | 217 | Domain Self Reward Engine: cek kelayakan self reward Dipindah ke modules/self-reward/self-reward-engine.js (Sesi 12 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 210 | `modules/self-reward/self-reward-view.js` | 221 | UI layer untuk Self Reward Engine. Memisahkan render/DOM Dipindah ke modules/self-reward/self-reward-view.js (Sesi 12 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, … |
| 211 | `modules/self-reward/self-reward-ai-widget.js` | 236 | Widget Rekomendasi AI di dalam modal Self Reward. Dipindah ke modules/self-reward/self-reward-ai-widget.js (Sesi 12 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 212 | `modules/asset/investasi.js` | 379 | Domain Investment: Portfolio, Dividend, Capital Gain/Loss, ROI, Dipindah ke modules/asset/investasi.js (Sesi 9 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma … |
| 213 | `modules/asset/asset-portfolio-api.js` | 191 | modules/asset/asset-portfolio-api.js — Asset Portfolio API (S101, Batch 10). Target sesi: Asset Portfolio Foundation. PRINSIP (RULE #1 sesi ini): 100% REUSE modul Asset/Finance yang SUDAH ADA — TIDAK ada rumus keuangan … |
| 214 | `modules/asset/asset-portfolio-presenter.js` | 142 | modules/asset/asset-portfolio-presenter.js — Asset Portfolio Presenter (Sesi 132, Batch 10 lanjutan). Target sesi: audit menemukan `AssetPortfolioAPI` (S101) sudah lengkap + ada test, tapi TIDAK PERNAH dipanggil dari … |
| 215 | `lifeos/lifeos-store.js` | 66 | SATU-SATUNYA tempat Life OS boleh MENULIS. ATURAN WAJIB: - Tidak pernah menyentuh D. Tidak ada property baru di D, tidak ada perubahan struktur D sedikit pun. - Tidak pernah memanggil save() milik D. - Persist lewat … |
| 216 | `lifeos/lifeos-registry.js` | 187 | taksonomi FUNGSIONAL Life OS (beda dari FEATURE_REGISTRY yang taksonomi NAVIGASI — keduanya sengaja terpisah, lihat personal-life-os-blueprint.md Langkah 1). PENTING: file ini MURNI DATA. Tidak ada logic, tidak ada … |
| 217 | `lifeos/lifeos-link-registry.js` | 25 | relasi implisit-by-convention di D dibuat eksplisit di SATU tempat (Gap #9, personal-life-os-blueprint.md). PENTING: murni data deklaratif. `match`/lookup di sini hanya MEMBACA D — tidak pernah menulis. Dikonsumsi oleh … |
| 218 | `lifeos/plugins/lifeos-plugin-manifest.js` | 35 | Plugin Manifest, LifeOS Plugin System MVP (Sesi 65, Batch 5). Scope MVP sesi ini SENGAJA sempit: manifest MURNI METADATA (id/name/version/areaKey/description) — TIDAK ada `entry`/kode eksekusi apa pun. Plugin Runtime … |
| 219 | `lifeos/plugins/lifeos-plugin-validation.js` | 55 | Plugin Validation, LifeOS Plugin System MVP (Sesi 65, Batch 4). Validasi MURNI bentuk manifest (tidak menulis apa pun, tidak menyentuh registry) — dipakai oleh LifeOSPluginRegistry. register() SEBELUM plugin apa pun … |
| 220 | `lifeos/plugins/lifeos-plugin-registry.js` | 51 | Plugin Registry, LifeOS Plugin System MVP (Sesi 65, Batch 5). SATU-SATUNYA tempat menyimpan plugin yang berhasil terdaftar (in-memory, `_plugins` map by id) — pola sama dgn EIERegistry … |
| 221 | `lifeos/plugins/lifeos-plugin-loader.js` | 28 | Plugin Loader, LifeOS Plugin System MVP (Sesi 65, Batch 5). Loader MURNI batch-register: terima array manifest, panggil LifeOSPluginRegistry.register() satu-satu, dan kumpulkan hasil —TIDAK menjalankan/mengeksekusi kode … |
| 222 | `lifeos/plugins/lifeos-plugin-runtime.js` | 168 | Plugin Runtime MVP, LifeOS Plugin System (Sesi 69, Batch 5, target eksplisit user: "Plugin Runtime" di atas Registry + Manifest + Loader yang sudah ada — TIDAK Marketplace, TIDAK Plugin UI baru). Layer BARU murni … |
| 223 | `lifeos/adapters/area-adapter.js` | 31 | adapters/area-adapter.js — READ-ONLY. Ringkasan per AREA (lifeos-registry.js: LIFEOS_AREAS) — murni menjumlah panjang tiap D.* yang terdaftar di `dSources` per area. Tidak ada skor/logic bisnis baru, cuma menghitung … |
| 224 | `lifeos/adapters/goal-adapter.js` | 162 | adapters/goal-adapter.js — READ-ONLY. Menyeragamkan sumber goal lama (D.targets, D.eduFunds, D.pensiun, D.finansialFreedom, D.wishlist, D.debtStrategy) jadi satu bentuk "goal card". Tidak menyimpan apa pun, dihitung … |
| 225 | `lifeos/adapters/project-adapter.js` | 63 | adapters/project-adapter.js — merge READ-ONLY antara dua sumber: 1. D.renovProjects (legacy, milik renovasi.js — tidak disentuh) 2. LifeOSStore.projects (generic, milik Life OS — lihat services/project-service.js untuk … |
| 226 | `lifeos/adapters/today-adapter.js` | 129 | adapters/today-adapter.js — READ-ONLY. TODAY bukan penyimpanan sendiri, cuma lensa waktu di atas AREAS/PROJECTS/GOALS (lihat personal-life-os-blueprint.md Langkah 2). Depends on: lifeos-registry.js … |
| 227 | `lifeos/adapters/review-adapter.js` | 74 | adapters/review-adapter.js — READ-ONLY. Menggabungkan histori pasif existing (D.wealthSnapshots, D.lifeBalanceSnapshots, D.assetAllocation) dengan sesi review Life OS sendiri (LifeOSStore.reviewLog). Tidak pernah … |
| 228 | `lifeos/adapters/knowledge-adapter.js` | 52 | adapters/knowledge-adapter.js — READ-ONLY. D.catatan (catatan privat manual, milik keamanan-pin.js/refleksi-selfcare.js dll) dibaca sebagai REFERENSI saja — Knowledge base Life OS yang sebenarnya (insight AI tersimpan) … |
| 229 | `lifeos/lifeos-object-ref.js` | 72 | resolver & validator utk `sourceRef` milik Life Object `kind:"ref"`. Sesi 58 (Batch 4, keputusan produk FINAL — lihat docs/PRODUCT_DECISIONS.md § LifeOS — Life Object sourceRef): sourceRef = { domain: "...", id: "..." } … |
| 230 | `lifeos/services/project-service.js` | 48 | services/project-service.js — SATU-SATUNYA tempat menulis LifeOSStore.projects (generic project). Tidak pernah menulis ke D.renovProjects atau array D.* lain — kalau butuh baca renovasi, pakai … |
| 231 | `lifeos/services/review-service.js` | 34 | services/review-service.js — SATU-SATUNYA tempat menulis LifeOSStore.reviewLog. Boleh MEMBACA D.wealthSnapshots/ D.lifeBalanceSnapshots (lewat adapters/review-adapter.js) untuk menyimpan referensi id-nya, tapi tidak … |
| 232 | `lifeos/services/knowledge-service.js` | 29 | services/knowledge-service.js — SATU-SATUNYA tempat menulis LifeOSStore.knowledge. Tidak pernah menulis ke D.catatan — kalau butuh baca catatan lama, pakai adapters/knowledge-adapter.js (knowledgeAdapterCatatanRef). |
| 233 | `lifeos/services/life-object-service.js` | 98 | services/life-object-service.js — SATU-SATUNYA tempat menulis LifeOSStore.objects (Life Object). Sesi 58 (Batch 4, lanjutan Sesi 57 — registry+resolver+validator sourceRef). Tidak pernah menulis ke D atau array D.* … |
| 234 | `lifeos/ui/lifeos-home.js` | 159 | ui/lifeos-home.js — halaman masuk Life OS. Hanya membaca lewat adapter, menulis (kalau ada aksi) hanya lewat services/*.js. Tidak pernah akses D atau LifeOSStore langsung dari file UI — selalu lewat adapter/service. … |
| 235 | `lifeos/ui/areas.js` | 40 | ui/areas.js — render-only lewat areaAdapterList(D). Ringkasan jumlah item per AREA (lihat adapters/area-adapter.js — LIFEOS_AREAS, lifeos-registry.js). Sebelum Sesi 39, area-adapter.js sudah ADA & sudah dites (Sesi 24) … |
| 236 | `lifeos/ui/today.js` | 20 | ui/today.js — render-only lewat todayAdapterList(D). Aksi "selesaikan" tetap dispatch ke fungsi modul LAMA (mis. dismiss bill), Life OS tidak menduplikasi logic itu. |
| 237 | `lifeos/ui/goals.js` | 23 | ui/goals.js — render-only lewat goalAdapterList(D). Tidak ada goal-service.js karena Goals tidak punya data tulis sendiri di Life OS (murni agregasi 6 sumber lama, lihat Gap #2). Aksi "tambah tabungan" dsb tetap … |
| 238 | `lifeos/ui/projects.js` | 40 | ui/projects.js — render lewat projectAdapterList(D, store); aksi tulis (create/toggle checklist/dsb) HANYA lewat services/project-service.js. |
| 239 | `lifeos/ui/review.js` | 32 | ui/review.js — render lewat review-adapter.js; aksi mulai/selesai sesi review HANYA lewat services/review-service.js. |
| 240 | `lifeos/ui/life-objects.js` | 356 | ui/life-objects.js — panel ke-7 Life OS (LifeOSLifeObjects). Render lewat lifeObjectServiceList(); aksi tulis (create/update/delete) HANYA lewat services/life-object-service.js. Fase 1 (Sesi 61) + Fase 2 (Sesi 62) + … |
| 241 | `lifeos/ui/plugins.js` | 82 | ui/plugins.js — Plugin UI, LifeOS Plugin System (Sesi 66, Batch 5, lanjutan Plugin System MVP Sesi 65 — Registry/Manifest/Loader/ Validation). Scope MVP UI: list + empty state + register (manual, via showPromptModal() … |
| 242 | `lifeos/ui/knowledge.js` | 46 | ui/knowledge.js — render lewat knowledge-adapter.js; aksi simpan/hapus HANYA lewat services/knowledge-service.js. D.catatan ditampilkan sebagai referensi read-only, tidak pernah dimigrasikan ke sini. |
| 243 | `lifeos/lifeos-nav.js` | 188 | "Jump to source": item Life OS (Today/Goals/Projects) hanyalah LENSA baca di atas data lama (lihat komentar di adapters/today-adapter.js & adapters/goal-adapter.js: tiap item sudah bawa `sourceKind`/`sourceId`). File … |
| 244 | `economic-intelligence/eie-bus.js` | 41 | Event bus internal Economic Intelligence Engine (EIE). Pola pub/sub sederhana, TIDAK bergantung pada library luar, TIDAK menyentuh IndexedDB/D. Dipakai supaya macro-sync-service/scoring-engine bisa "memancarkan" event … |
| 245 | `economic-intelligence/eie-store.js` | 71 | SATU-SATUNYA tempat EIE boleh MENULIS/MEMBACA persistensi. ATURAN WAJIB (sama persis dgn pola lifeos-store.js yang sudah terbukti): - Tidak pernah menyentuh D. Tidak ada property baru di D, tidak ada perubahan struktur … |
| 246 | `economic-intelligence/domain/entities.js` | 70 | domain/entities.js — Definisi bentuk data EIE (JSDoc typedef murni). ATURAN DOMAIN LAYER: file ini TIDAK BOLEH import/reference apa pun dari adapters/ atau eie-store.js. Tidak ada I/O. Tidak ada IndexedDB/API. 100% … |
| 247 | `economic-intelligence/domain/scoring-formulas.js` | 129 | domain/scoring-formulas.js — Pure function rumus EES/PEHS/ERI. ATURAN DOMAIN LAYER: TIDAK ADA I/O di file ini. Semua fungsi murni menerima UserFinanceSnapshot/MacroSnapshot dan mengembalikan angka — 100% unit-testable … |
| 248 | `economic-intelligence/domain/status-classifier.js` | 23 | domain/status-classifier.js — Pure function skor -> Economic Status. (Sebelumnya "weather-classifier.js"/istilah "Economic Weather" — diganti ke istilah "status"/"kondisi" ekonomi, konsisten dgn label yang memang sudah … |
| 249 | `economic-intelligence/adapters/user-finance-adapter.js` | 117 | adapters/user-finance-adapter.js — READ-ONLY. Menerjemahkan D.* (state finance existing app) jadi UserFinanceSnapshot (lihat domain/entities.js). ATURAN (sama seperti adapters/goal-adapter.js LifeOS): tidak menyimpan … |
| 250 | `economic-intelligence/adapters/macro-data-adapter.js` | 192 | adapters/macro-data-adapter.js — Normalisasi data makro dari berbagai sumber, dgn fallback cache (offline-first, §16 dokumen desain). FASE 1 (MVP, "senyap"): TIDAK ada fetch ke API eksternal apa pun. Nilai makro diisi … |
| 251 | `economic-intelligence/rules/rule-schema.js` | 19 | rules/rule-schema.js — Validasi struktur Rule (§9.1). Dipakai oleh EIERegistry.registerRule() supaya rule custom (plugin, §20) tidak bisa masuk dalam bentuk yang salah dan mendiamkan error di tengah evaluasi. |
| 252 | `economic-intelligence/rules/rule-definitions.js` | 287 | rules/rule-definitions.js — rule IF-THEN prioritas tertinggi. 16 rule awal dari fase 1 MVP (§22 dokumen desain) + 7 rule tambahan fase 3 (ditandai FASE 3 di komentar masing-masing, per kategori yang sudah ada — tidak … |
| 253 | `economic-intelligence/engine/rule-engine.js` | 56 | engine/rule-engine.js — Evaluator IF-THEN generik (§9.2). SATU-SATUNYA tempat yang menjalankan condition/action dari rules/rule-definitions.js + rule custom hasil EIERegistry.registerRule() (§20). Cooldown anti-spam … |
| 254 | `economic-intelligence/engine/scoring-engine.js` | 69 | engine/scoring-engine.js — Orkestrasi EES/PEHS/ERI + Status Ekonomi (§5-8), memanggil RuleEngine (§9) untuk insight, lalu PERSIST hasil ke eie-store. Ini SATU-SATUNYA tempat yang menulis EIEScoreSnapshot & Insight[] ke … |
| 255 | `economic-intelligence/engine/insight-generator.js` | 43 | engine/insight-generator.js — Fase 1: template + slot filling SUDAH dilakukan langsung di dalam rule.action() (rules/rule-definitions.js), jadi file ini fokus jadi helper baca/kelola Insight[] tersimpan, dengan … |
| 256 | `economic-intelligence/services/macro-sync-service.js` | 25 | services/macro-sync-service.js — Orkestrasi refresh macro + recompute skor. Ini titik masuk utama yang dipanggil UI/scheduler (§2: "SATU- SATUNYA tempat menulis ke EIEStore.*" ada di layer services/engine). FASE 1 … |
| 257 | `economic-intelligence/services/notification-service.js` | 50 | services/notification-service.js — Event listener -> Notification API / in-app toast (§2, §14 dokumen desain). FASE 1 ("senyap", sesuai permintaan implementasi bertahap): service ini TIDAK subscribe ke EIEBus secara … |
| 258 | `economic-intelligence/services/recommendation-service.js` | 39 | services/recommendation-service.js — mapping recommendationId -> aksi konkret (deep link ke fitur app existing yang SUDAH ada, bukan fitur baru). Data-only map + 1 fungsi baca, tidak ada state/I/O. `target` di sini … |
| 259 | `economic-intelligence/scheduler/eie-scheduler.js` | 26 | scheduler/eie-scheduler.js — Trigger periodik untuk MacroSyncService (§14). FASE 1 ("senyap"): TIDAK ada setInterval yang otomatis jalan saat file ini dimuat. start()/stop() harus dipanggil eksplisit — supaya … |
| 260 | `economic-intelligence/ui/eie-dashboard.js` | 277 | ui/eie-dashboard.js — Kartu Status Ekonomi (§19). HANYA render, tidak pernah akses EIEStore/adapter langsung — selalu lewat EIEScoringEngine/ MacroSyncService. Dipanggil dari DashboardHub.render() (pola "tambahan murni" … |
| 261 | `economic-intelligence/ui/eie-insight-feed.js` | 50 | ui/eie-insight-feed.js — Feed insight & rekomendasi (§3, §19). HANYA render, akses data lewat InsightGenerator/RecommendationService (bukan EIEStore langsung). Baris rekomendasi ("→ ...") DAPAT DIKLIK — fase 2 UI yang … |
| 262 | `economic-intelligence/ui/eie-notif-settings.js` | 72 | ui/eie-notif-settings.js — Toggle notifikasi EIE di Pengaturan (fase 3). HANYA render + baca/tulis toggle lewat eie-store; tidak pernah menyentuh D (sama seperti ui/eie-dashboard.js & ui/eie-insight-feed.js). Menyalakan … |
| 263 | `economic-intelligence/eie-registry.js` | 43 | Plugin registry EIE. Dimuat PALING AKHIR (lihat urutan load di scripts/build.js), supaya EIE_RULES bawaan (rules/rule-definitions.js) sudah tersedia untuk diregistrasi sbg default. - registerIndicator(): daftar sumber … |
| 264 | `modules/ai/ai-core.js` | 313 | Smart Delivery Engine, Sesi 1/6: fondasi murni. Lihat RENCANA-SESI-RINGKAS.md (Smart Delivery Engine) untuk peta 6 sesi lengkap. Sesi ini CUMA fondasi (bus + storage + context) — TANPA fitur, TANPA … |
| 265 | `modules/ai/ai-decision-engine.js` | 392 | Smart Delivery Engine, Sesi 2/6: "otak" AI. Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. Sesi ini butuh Sesi 1 (ai-core.js: AIBus, AIStore/aiEnsureLoaded/aiGetStore/aiSave, AIContext) SUDAH dimuat lebih dulu — lihat … |
| 266 | `modules/ai/ai-service.js` | 665 | Smart Delivery Engine, Sesi 2/6: facade tunggal. Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. Butuh ai-core.js (Sesi 1) & ai-decision-engine.js (di atas, Sesi 2 ini) sudah dimuat lebih dulu — lihat urutan di … |
| 267 | `modules/logistics/logistics-engine.js` | 415 | Smart Delivery Engine, Sesi 3/6: mesin hitung logistik. Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. Sesi ini TIDAK butuh ai-core.js/ai-decision-engine.js/ai-service.js (Sesi 1-2) sama sekali — murni fungsi hitung … |
| 268 | `modules/logistics/logistics-service.js` | 130 | Smart Delivery Engine, Sesi 3/6: facade logistik. Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. Butuh logistics-engine.js (di atas, Sesi 3 ini) sudah dimuat lebih dulu — lihat urutan di scripts/build.js. Kenapa 1 … |
| 269 | `modules/shop/purchase-engine.js` | 88 | Shop Business Engine, S198 (Business Engine untuk Shop). TARGET EKSPLISIT USER (S198): "Buat Business Engine untuk Shop. Reuse seluruh Shop existing. Jangan ubah business logic. Jangan implementasi ke modul lain. Jangan … |
| 270 | `modules/shop/trip-engine.js` | 91 | Shop Business Engine, S198 (Business Engine untuk Shop). TripEngine = lapisan pengiriman/rit (ongkir, berat/volume/packing, muatan kendaraan, BBM). SAMA POLA dgn PurchaseEngine (file sebelah) & LogisticsEngine … |
| 271 | `modules/shop/inventory-engine.js` | 96 | Shop Business Engine, S198 (Business Engine untuk Shop). InventoryEngine = lapisan stok/katalog (nilai stok tertanam, status stok per produk, grup harga ukuran/gabungan, & rekomendasi restock). SAMA POLA dgn … |
| 272 | `modules/shop/profit-engine.js` | 74 | Shop Business Engine, S198 (Business Engine untuk Shop). ProfitEngine = lapisan profit/margin (untung per transaksi, rekap omzet periode, & rekomendasi harga jual). SAMA POLA dgn PurchaseEngine/ … |
| 273 | `modules/shop/delivery-plan-ui.js` | 259 | modules/shop/delivery-plan-ui.js — Delivery Plan UI (Sesi 203, Continue). Menutup gap yang dicatat di trip-engine.js ("Belum digunakan UI. Belum dihubungkan ke Shop.") & shop-business-engine-presenter.js ("TripEngine … |
| 274 | `modules/shop/shop-business-engine-presenter.js` | 232 | modules/shop/shop-business-engine-presenter.js — Shop Business Engine Presenter (Sesi 199, Finalisasi Integrasi Shop). Target sesi: audit menemukan PurchaseEngine/TripEngine/InventoryEngine/ProfitEngine (S198, … |
| 275 | `modules/shop/trip-presenter.js` | 166 | modules/shop/trip-presenter.js — Trip Presenter (Sesi 204-A). Menutup gap yang dicatat eksplisit di shop-business-engine-presenter.js: "TripEngine (S198) tidak dipakai di sini — tidak ada ringkasan 'pengiriman' yang … |
| 276 | `modules/shop/business-flow-presenter.js` | 2014 | modules/shop/business-flow-presenter.js — Business Flow Presenter (Sesi 205). WIRE ONLY: menyusun 4 tahap alur bisnis Shop — Purchase -> Trip -> Stock -> Sale — dari 2 presenter yang SUDAH ADA: … |
| 277 | `modules/finance/dana-kelolaan.js` | 165 | Dana Kelolaan / Managed Funds (Sesi 195). TARGET EKSPLISIT USER: "S195 Managed Funds. Reuse OwnershipEngine. Implementasikan Dana Kelolaan... Reuse existing modules. No audit. No refactor. No business logic changes." … |
| 278 | `modules/finance/dana-kelolaan-presenter.js` | 160 | Dana Kelolaan / Managed Funds Presenter (Sesi 195). Pola SAMA PERSIS PropertyManagementPresenter.render() (modules/asset/property-management-presenter.js, S102/Sesi 132): UI HANYA presenter, 100% reuse … |

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
| `_aiReminderAndTargetSummary` | `modules/ai/ai-service.js` |
| `_apiKeyEncSaveTimer` | `modules/shared/keamanan-pin.js` |
| `_assetAIRulesRegistered` | `modules/asset/aset.js` |
| `_assetNetWorthDeclineCheck` | `modules/asset/aset.js` |
| `_assetZakatDueCheck` | `modules/asset/aset.js` |
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
| `_catSearchQuery` | `modules/vehicle/vehicle-catalog-ui.js` |
| `_catSelectedIds` | `modules/vehicle/vehicle-catalog-ui.js` |
| `_catSelectMode` | `modules/vehicle/vehicle-catalog-ui.js` |
| `_catVisibleIds` | `modules/vehicle/vehicle-catalog-ui.js` |
| `_choiceModalAnswer` | `modules/shared/modal-navigasi.js` |
| `_choiceModalResolve` | `modules/shared/modal-navigasi.js` |
| `_confirmModalAnswer` | `modules/shared/modal-navigasi.js` |
| `_confirmResolve` | `modules/shared/modal-navigasi.js` |
| `_crossFinanceDeliveryCheck` | `modules/ai/ai-decision-engine.js` |
| `_crossModuleAIRulesRegistered` | `modules/ai/ai-decision-engine.js` |
| `_dashHubAnalyticsMonthTx` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubCallAction` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubHeroMonthTx` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubIsFav` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubMonthTxShared` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubResolveGoToSection` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashHubSummaryMonthTx` | `modules/dashboard-hub/dashboard-hub.js` |
| `_dashServisSelfVehicles` | `modules/shared/modules-render.js` |
| `_dataActionClickHandler` | `modules/shared/features-helpers-global-security.js` |
| `_deliveryAIRulesRegistered` | `modules/shop/cobek-pricing.js` |
| `_deliveryLowStockCheck` | `modules/shop/cobek-pricing.js` |
| `_deliveryThinMarginCheck` | `modules/shop/cobek-pricing.js` |
| `_deriveApiKeyCryptoKey` | `modules/shared/keamanan-pin.js` |
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
| `_formatLockDuration` | `modules/shared/keamanan-pin.js` |
| `_friendlyErrorNotice` | `modules/shared/error-handler.js` |
| `_fuzzyAccountMatch` | `modules/shared/scan-ocr.js` |
| `_gcLastTotal` | `modules/business/gaji-calc.js` |
| `_gdriveDownloadBackupInner` | `gdrive-backup.js` |
| `_gdriveFindExistingBackupFileId` | `gdrive-backup.js` |
| `_gdriveLocalDataLooksEmpty` | `gdrive-backup.js` |
| `_gdriveSilentReconnectInProgress` | `gdrive-backup.js` |
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
| `_infoModalResolve` | `modules/shared/modal-navigasi.js` |
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
| `_normalizeAccNameForMatch` | `modules/shared/scan-ocr.js` |
| `_ocrWorkerPromise` | `modules/shared/scan-ocr.js` |
| `_paEsc` | `modules/asset/penyusutan-ai-widget.js` |
| `_paFmtRp` | `modules/asset/penyusutan-ai-widget.js` |
| `_pajakZakatRenderedOnce` | `pajak-aset-ui-wrappers.js` |
| `_pendingChatActions` | `modules/ai/chat-action.js` |
| `_pinLockRemainingMs` | `modules/shared/keamanan-pin.js` |
| `_pinLockState` | `modules/shared/keamanan-pin.js` |
| `_pinLockTimer` | `modules/shared/keamanan-pin.js` |
| `_pinPromptAnswer` | `modules/shared/modal-navigasi.js` |
| `_pinPromptResolve` | `modules/shared/modal-navigasi.js` |
| `_pinPromptSubmit` | `modules/shared/modal-navigasi.js` |
| `_populateVehOwnershipSelect` | `modules/vehicle/vehicle-core.js` |
| `_posOrNull` | `modules/vehicle/vehicle-core.js` |
| `_predictMonthlySeries` | `modules/finance/tx-list-cashflow.js` |
| `_promptModalAnswer` | `modules/shared/modal-navigasi.js` |
| `_promptModalResolve` | `modules/shared/modal-navigasi.js` |
| `_promptModalSubmit` | `modules/shared/modal-navigasi.js` |
| `_repairLooseJson` | `modules/ai/chat-action.js` |
| `_saveAccInner` | `modules/finance/akun.js` |
| `_saveBillInner` | `modules/finance/tagihan-kalender.js` |
| `_saveDebounceTimer` | `modules/shared/features-helpers-global-security.js` |
| `_saveErrorShown` | `modules/shared/features-helpers-global-security.js` |
| `_saveGuards` | `modules/shared/features-helpers-global-security.js` |
| `_saveImmediate` | `modules/shared/features-helpers-global-security.js` |
| `_saveTxInner` | `modules/finance/transaksi.js` |
| `_scannerSessionActive` | `modules/shared/scanner-session.js` |
| `_scannerSessionCount` | `modules/shared/scanner-session.js` |
| `_scannerSessionEnsureStyle` | `modules/shared/scanner-session.js` |
| `_scannerSessionHasLiveOverlay` | `modules/shared/scanner-session.js` |
| `_scannerSessionPrevChrome` | `modules/shared/scanner-session.js` |
| `_scannerSessionSelfHeal` | `modules/shared/scanner-session.js` |
| `_selfTestAssert` | `self-test.js` |
| `_sendChatInner` | `ai-chat.js` |
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
| `_toastHideTimer` | `modules/shared/format-tema.js` |
| `_totalSaldoCache` | `modules/finance/akun.js` |
| `_txAccManuallySet` | `modules/shared/features-helpers-global-security.js` |
| `_txByAccIndex` | `modules/finance/akun.js` |
| `_txCatLearnSource` | `modules/shared/features-helpers-global-security.js` |
| `_txPayMethodTouchedByUser` | `modules/finance/transaksi.js` |
| `_txRenovStatus` | `modules/finance/tx-renov.js` |
| `_txSaving` | `modules/shared/features-helpers-global-security.js` |
| `_universalScanEmoji` | `modules/shared/scan-ocr.js` |
| `_uploadBackupToDriveInner` | `gdrive-backup.js` |
| `_vehCapacityFieldsHtml` | `modules/vehicle/vehicle-core.js` |
| `_vehicleCatalogLoaded` | `modules/vehicle/vehicle-catalog.js` |
| `_vehicleCatalogNormalize` | `modules/vehicle/vehicle-catalog.js` |
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
| `_vehicleScannerBusy` | `modules/vehicle/vehicle-scanner.js` |
| `_vehicleScannerLastTimestamp` | `modules/vehicle/vehicle-scanner.js` |
| `_vehicleScannerLastValue` | `modules/vehicle/vehicle-scanner.js` |
| `_vehicleWebImportIsNameCandidate` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `_vehicleWebImportIsPriceLine` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `_vehicleWebImportNormalizeToLines` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `_vehicleWebImportParsePriceLine` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `_vehImportClearVehicles` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `_vehImportReadSelectedVehicleIds` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `_vehImportRenderVehiclePicker` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `_vehImportRows` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `_vehImportSelectAllVehicles` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `_vehImportSetStatus` | `modules/vehicle/vehicle-catalog-import-ui.js` |
| `_vehWebImportClearVehicles` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `_vehWebImportReadSelectedVehicleIds` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `_vehWebImportRenderVehiclePicker` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `_vehWebImportRows` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `_vehWebImportSelectAllVehicles` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `_vehWebImportSetStatus` | `modules/vehicle/vehicle-catalog-web-import-ui.js` |
| `_writeLocalSnapshot` | `modules/shared/features-helpers-global-security.js` |
| `_wrLastTotal` | `modules/business/reset-gaji-mingguan.js` |
| `acBillNames` | `modules/finance/transaksi.js` |
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
| `addNewCatFromInput` | `modules/finance/transaksi.js` |
| `addOrderItem` | `modules/shop/cobek-io.js` |
| `addShopStockCartItem` | `modules/shop/cobek-tx-cart.js` |
| `addTarget` | `modules/finance/tx-target.js` |
| `addTxShopSaleCartItem` | `modules/shop/cobek-tx-cart.js` |
| `addWorkDay` | `modules/business/payroll-absensi.js` |
| `advanceBillNextDue` | `modules/finance/tagihan-kalender.js` |
| `Advisor` | `ai-chat.js` |
| `aggregateCustomers` | `modules/shop/cobek-io.js` |
| `AI_ASSET_ZAKAT_MIN_DEFAULT_RP` | `modules/asset/aset.js` |
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
| `ALOKASI_PRESETS` | `modules/asset/aset.js` |
| `AlokasiAset` | `modules/asset/aset.js` |
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
| `applyStockPurchase` | `modules/finance/tx-stok-sparepart.js` |
| `applyTxBbmFromTx` | `modules/finance/tx-bbm.js` |
| `applyTxRenovFromTx` | `modules/finance/tx-renov.js` |
| `applyTxShopSaleFromTx` | `modules/shop/cobek-tx-cart.js` |
| `applyTxShopStockFromTx` | `modules/shop/cobek-tx-cart.js` |
| `applyTxStockFromTx` | `modules/finance/tx-stok-sparepart.js` |
| `ARCHIVE_MODULES` | `modules/shared/data-archive.js` |
| `archiveAvailableYears` | `modules/shared/data-archive.js` |
| `archiveCollectByYears` | `modules/shared/data-archive.js` |
| `archiveExportedYears` | `modules/shared/data-archive.js` |
| `archiveExportStep` | `modules/shared/data-archive.js` |
| `archiveGetYear` | `modules/shared/data-archive.js` |
| `archiveSelectedYears` | `modules/shared/data-archive.js` |
| `areaAdapterFindOne` | `lifeos/adapters/area-adapter.js` |
| `areaAdapterList` | `lifeos/adapters/area-adapter.js` |
| `Aset` | `modules/asset/aset.js` |
| `ASET_TAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `ASET_TAB_ORDER` | `modules/asset/aset.js` |
| `AsetKeluarga` | `modules/asset/aset-keluarga.js` |
| `askConfirm` | `modules/shared/modal-navigasi.js` |
| `ASSET_JENIS_KEYWORDS` | `modules/shared/scan-ocr.js` |
| `ASSET_MAINTENANCE_CARD_NAV_TARGETS` | `modules/asset/asset-maintenance-presenter.js` |
| `ASSET_NAME_EXCLUDE_RE` | `modules/shared/scan-ocr.js` |
| `ASSET_NAME_LABEL_RE` | `modules/shared/scan-ocr.js` |
| `ASSET_PORTFOLIO_CARD_NAV_TARGETS` | `modules/asset/asset-portfolio-presenter.js` |
| `assetActionDelete` | `modules/shared/action-wrappers.js` |
| `assetActionHistory` | `modules/shared/action-wrappers.js` |
| `assetActionScan` | `modules/shared/action-wrappers.js` |
| `AssetInsight` | `modules/asset/aset.js` |
| `AssetMaintenanceAPI` | `modules/asset/asset-maintenance-api.js` |
| `AssetMaintenancePresenter` | `modules/asset/asset-maintenance-presenter.js` |
| `AssetPortfolioAPI` | `modules/asset/asset-portfolio-api.js` |
| `AssetPortfolioPresenter` | `modules/asset/asset-portfolio-presenter.js` |
| `autoBudgetName` | `budget.js` |
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
| `BIBIT_DETAIL_LABELS` | `modules/shared/scan-ocr.js` |
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
| `BILLCAL_MAX_ITER` | `modules/finance/tagihan-kalender.js` |
| `billCalYear` | `modules/finance/tagihan-kalender.js` |
| `BillFallbackScan` | `modules/finance/tagihan-kalender.js` |
| `billFilterStatus` | `modules/finance/tagihan-kalender.js` |
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
| `buildLaporanExportData` | `laporan-export.js` |
| `buildModalBodyHtml` | `modules/self-reward/self-reward-view.js` |
| `buildSettingsFormHtml` | `modules/self-reward/self-reward-view.js` |
| `BUSINESS_LIFECYCLE_STATUSES` | `modules/shop/business-flow-presenter.js` |
| `BusinessFlowPresenter` | `modules/shop/business-flow-presenter.js` |
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
| `cashflowActionSuggestion` | `modules/finance/tagihan-kalender.js` |
| `CASHFLOWPROJ_NAV_TARGETS` | `modules/finance/cashflow-projection-presenter.js` |
| `CashFlowProjectionAPI` | `modules/finance/cashflow-projection-api.js` |
| `CashFlowProjectionPresenter` | `modules/finance/cashflow-projection-presenter.js` |
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
| `catalogUiOnSearchInput` | `modules/vehicle/vehicle-catalog-ui.js` |
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
| `catalogUiTagSelectedForCurrentVehicle` | `modules/vehicle/vehicle-catalog-ui.js` |
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
| `catLearnKey` | `modules/shared/scan-ocr.js` |
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
| `cleanCatOptText` | `budget.js` |
| `clearChat` | `modules/shared/features-helpers-global-security.js` |
| `clickAssetImportFile` | `modules/shared/action-wrappers.js` |
| `clickElById` | `modules/shared/action-wrappers.js` |
| `closeCalc` | `modules/shared/kalkulator-input.js` |
| `closeModal` | `modules/shared/modal-navigasi.js` |
| `closeQS` | `modules/shared/modal-navigasi.js` |
| `CN_TAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `CN_TAB_ORDER` | `modules/finance/filter-laporan.js` |
| `CNB_SUBTAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `CNB_SUBTAB_ORDER` | `modules/vehicle/vehicle-core.js` |
| `CNI_SUBTAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `CNI_SUBTAB_ORDER` | `modules/vehicle/vehicle-core.js` |
| `codeFromName` | `modules/vehicle/sparepart-servis.js` |
| `commitCurKmEdit` | `modules/vehicle/vehicle-core.js` |
| `commitGoldImport` | `modules/asset/aset-emas-impor.js` |
| `commitImportKatalog` | `modules/shop/cobek-io.js` |
| `commitImportShopExcel` | `modules/shop/cobek-io.js` |
| `commitShopCsvImport` | `modules/business/shop-data-io-api.js` |
| `commitShopJsonImport` | `modules/business/shop-data-io-api.js` |
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
| `computeTxShopSaleTotals` | `modules/shop/cobek-tx-cart.js` |
| `confirmChatAction` | `ai-chat.js` |
| `confirmWeeklyReset` | `modules/business/reset-gaji-mingguan.js` |
| `copyNavSmokeResults` | `self-test.js` |
| `copySelfTestResults` | `self-test.js` |
| `countBillFallbackAmbiguousSkipped` | `modules/finance/tagihan-kalender.js` |
| `countFallbackBillPaymentCandidates` | `modules/finance/tagihan-kalender.js` |
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
| `customerKey` | `modules/shop/cobek-io.js` |
| `D` | `modules/shared/features-helpers-global-security.js` |
| `DanaDaruratAI` | `modules/shared/modules-calc.js` |
| `DanaKelolaan` | `modules/finance/dana-kelolaan.js` |
| `DANAKELOLAAN_NAV_TARGETS` | `modules/finance/dana-kelolaan-presenter.js` |
| `DanaKelolaanInsight` | `modules/finance/dana-kelolaan-presenter.js` |
| `DanaKelolaanPresenter` | `modules/finance/dana-kelolaan-presenter.js` |
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
| `DashboardSettings` | `modules/dashboard-hub/dashboard-hub-settings.js` |
| `DASHHUB_GOTO_SECTION_MAP` | `modules/dashboard-hub/dashboard-hub.js` |
| `DASHHUB_OWNERSHIP_SUMMARY_ORDER` | `modules/dashboard-hub/dashboard-hub.js` |
| `dashHubNavigateToFeature` | `modules/dashboard-hub/dashboard-hub.js` |
| `dashHubQaBackup` | `modules/shared/action-wrappers.js` |
| `dashHubQaBackupHistory` | `modules/shared/action-wrappers.js` |
| `dashHubQaFocusSearch` | `modules/shared/action-wrappers.js` |
| `dashHubQaOpenAI` | `modules/shared/action-wrappers.js` |
| `dashHubQaTambahTransaksi` | `modules/shared/action-wrappers.js` |
| `dashHubSearchFeatures` | `modules/dashboard-hub/dashboard-hub-search.js` |
| `DATA_MIGRATIONS` | `modules/shared/features-helpers-global-security.js` |
| `dateStatusBadge` | `modules/vehicle/vehicle-core.js` |
| `dateToISO` | `modules/shared/helper-teks.js` |
| `daysUntilDate` | `modules/vehicle/vehicle-core.js` |
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
| `deleteTxFromModal` | `modules/finance/transaksi.js` |
| `DeliveryPlanUI` | `modules/shop/delivery-plan-ui.js` |
| `delPiutang` | `pajak-aset-ui-wrappers.js` |
| `delProduct` | `modules/shop/cobek-tx-cart.js` |
| `delProdusen` | `modules/shop/cobek-io.js` |
| `delReminder` | `modules/finance/transaksi.js` |
| `delShop` | `modules/shop/cobek-io.js` |
| `delSim` | `modules/vehicle/vehicle-core.js` |
| `delSubCat` | `modules/finance/kategori.js` |
| `delTarget` | `modules/finance/tx-target.js` |
| `delTx` | `modules/finance/tx-list-cashflow.js` |
| `delVehicle` | `modules/vehicle/vehicle-core.js` |
| `delWealthSnapshot` | `pajak-aset-ui-wrappers.js` |
| `delWorkDay` | `modules/business/payroll-absensi.js` |
| `delZakatLog` | `pajak-aset-ui-wrappers.js` |
| `detectPaylaterDueNextMonth` | `modules/shared/scan-ocr.js` |
| `detectScreenType` | `modules/shared/scan-ocr.js` |
| `detectScreenTypeScores` | `modules/shared/scan-ocr.js` |
| `detectScreenTypeWithConfidence` | `modules/shared/scan-ocr.js` |
| `dismissBackupReminder` | `modules/shared/modules-render.js` |
| `downscaleImage` | `modules/shared/scan-ocr.js` |
| `editAccIdx` | `modules/finance/akun.js` |
| `editBillHistoryTx` | `modules/finance/tagihan-kalender.js` |
| `editChatAction` | `ai-chat.js` |
| `editSimId` | `modules/vehicle/vehicle-core.js` |
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
| `enableSwipeToDismiss` | `modules/shared/modal-navigasi.js` |
| `encryptApiKeyWithPin` | `modules/shared/keamanan-pin.js` |
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
| `EXTRA_MODAL_SWEEP_SPECS` | `self-test.js` |
| `extractBibitKeuntungan` | `modules/shared/scan-ocr.js` |
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
| `findMissingAriaLabels` | `self-test.js` |
| `findPossibleDuplicateTx` | `modules/shared/scan-ocr.js` |
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
| `getAIAssetZakatMinThreshold` | `modules/asset/aset.js` |
| `getAIDeliveryLowStockThreshold` | `modules/shop/cobek-pricing.js` |
| `getAIDeliveryThinMarginThreshold` | `modules/shop/cobek-pricing.js` |
| `getAIFinanceLowBalanceMultiplier` | `modules/finance/tx-list-cashflow.js` |
| `getAIFinanceOverspendThreshold` | `modules/finance/tx-list-cashflow.js` |
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
| `getEffectiveIntervalKm` | `modules/vehicle/sparepart-servis.js` |
| `getFavoritKeys` | `modules/dashboard-hub/dashboard-hub-favorit.js` |
| `getHtmlSnapshotForSelfTest` | `diagnostik-versi.js` |
| `getKeuFilters` | `modules/finance/filter-laporan.js` |
| `getLaporanFilters` | `modules/finance/filter-laporan.js` |
| `getLastServiceKm` | `modules/vehicle/sparepart-servis.js` |
| `getLatestBillPaymentTxId` | `modules/finance/tagihan-kalender.js` |
| `getOcrMinConfidence` | `modules/shared/scan-ocr.js` |
| `getOcrWorker` | `modules/shared/scan-ocr.js` |
| `getProactiveReminders` | `modules/vehicle/vehicle-core.js` |
| `getPTKP` | `pajak-aset-ui-wrappers.js` |
| `getRange` | `modules/finance/tx-list-cashflow.js` |
| `getSelectedBudgetCatIds` | `budget.js` |
| `getSelectedFiCatIds` | `modules/shared/modules-calc.js` |
| `getSelfTestCases` | `self-test.js` |
| `getShopRange` | `modules/shop/cobek-io.js` |
| `getTxListRange` | `modules/finance/tx-list-cashflow.js` |
| `getVehicleKm` | `modules/vehicle/vehicle-core.js` |
| `getWeekRange` | `modules/business/reset-gaji-mingguan.js` |
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
| `goToKeuanganAkunTab` | `modules/finance/tx-list-cashflow.js` |
| `goToList` | `modules/finance/filter-laporan.js` |
| `goToPageAndClose` | `global-search.js` |
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
| `hasIntervalOverride` | `modules/vehicle/sparepart-servis.js` |
| `hideDashCardEl` | `modules/shared/modules-render.js` |
| `hideSuggestBox` | `modules/finance/transaksi.js` |
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
| `IDBStore` | `modules/asset/aset.js` |
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
| `InvestAI` | `modules/asset/invest-ai-widget.js` |
| `Investment` | `modules/asset/investasi.js` |
| `INVESTMENT_TYPES` | `modules/asset/investasi.js` |
| `InvestmentPlannerAPI` | `modules/finance/investment-planner-api.js` |
| `InvestmentPlannerPresenter` | `modules/finance/investment-planner-presenter.js` |
| `INVESTPLANNER_NAV_TARGETS` | `modules/finance/investment-planner-presenter.js` |
| `isAccLinkedToAsset` | `modules/finance/akun.js` |
| `isAccOwnershipSelf` | `modules/finance/akun.js` |
| `isAssetOwnershipSelf` | `modules/asset/aset.js` |
| `isBensinSubName` | `modules/finance/transaksi.js` |
| `isBillTypeLocked` | `modules/finance/tagihan-kalender.js` |
| `isCobekOwnershipSelf` | `modules/shop/cobek-order.js` |
| `isDashCardOn` | `modules/shared/modules-render.js` |
| `isDebtOwnershipSelf` | `modules/finance/piutang-utang.js` |
| `isDevMode` | `modules/shared/features-helpers-global-security.js` |
| `isDueSoon` | `lifeos/adapters/today-adapter.js` |
| `isHoldingOwnershipSelf` | `modules/asset/investasi.js` |
| `isiPPhDariTransaksi` | `pajak-aset-ui-wrappers.js` |
| `isKendaraanCatName` | `modules/finance/transaksi.js` |
| `isLatestBillPaymentTx` | `modules/finance/tagihan-kalender.js` |
| `isNoSpendDay` | `pajak-aset-ui-wrappers.js` |
| `isPiutangOwnershipSelf` | `modules/finance/piutang-utang.js` |
| `isProductOwnershipSelf` | `modules/shop/cobek-etalase.js` |
| `isRenovCatName` | `modules/finance/transaksi.js` |
| `isShopStockCatName` | `modules/finance/tx-cobek.js` |
| `isSparepartSubName` | `modules/finance/transaksi.js` |
| `isVehicleOwnershipSelf` | `modules/vehicle/vehicle-core.js` |
| `JAGO_POCKET_AMOUNT_RE` | `modules/shared/scan-ocr.js` |
| `JAGO_POCKET_NOISE_LINE_RE` | `modules/shared/scan-ocr.js` |
| `jsAttrEscape` | `modules/finance/transaksi.js` |
| `Kasir` | `modules/business/kasir.js` |
| `Kekayaan` | `modules/shared/modules-calc.js` |
| `KELOLA_SUBTAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `KELOLA_SUBTAB_LABEL` | `modules/finance/tx-list-cashflow.js` |
| `KELOLA_SUBTAB_ORDER` | `modules/finance/tx-list-cashflow.js` |
| `KEU_TAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `KEU_TAB_ORDER` | `modules/finance/tx-list-cashflow.js` |
| `KeuanganInsight` | `modules/ai/feature-insights.js` |
| `keuFabOpenExpense` | `modules/shared/action-wrappers.js` |
| `keuFabOpenIncome` | `modules/shared/action-wrappers.js` |
| `keuFabToggleMain` | `modules/shared/action-wrappers.js` |
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
| `LaporanAset` | `modules/asset/aset.js` |
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
| `load` | `modules/shared/features-helpers-global-security.js` |
| `loadAndMigrateApiKeyOnUnlock` | `modules/shared/keamanan-pin.js` |
| `loadKeuFilterPrefsIntoDOM` | `modules/finance/filter-laporan.js` |
| `loadMoreBbmList` | `modules/vehicle/vehicle-core.js` |
| `loadMoreLapTx` | `modules/finance/filter-laporan.js` |
| `loadMoreTx` | `modules/finance/filter-laporan.js` |
| `LogisticsEngine` | `modules/logistics/logistics-engine.js` |
| `LogisticsService` | `modules/logistics/logistics-service.js` |
| `MacroDataAdapter` | `economic-intelligence/adapters/macro-data-adapter.js` |
| `MacroSyncService` | `economic-intelligence/services/macro-sync-service.js` |
| `markBillPaid` | `modules/finance/tagihan-kalender.js` |
| `markShopDelivered` | `modules/shop/cobek-io.js` |
| `matchingVehicleName` | `modules/vehicle/sparepart-servis.js` |
| `maybeCreateSharedPiutangFromBill` | `modules/finance/piutang-utang.js` |
| `maybeOfferPaylaterReminder` | `modules/shared/scan-ocr.js` |
| `migrateShopCategory` | `modules/shared/features-helpers-global-security.js` |
| `MobilInsight` | `modules/ai/feature-insights.js` |
| `MODAL_HTML` | `modules/shared/modals.js` |
| `MODAL_VERSION` | `modules/shared/modals.js` |
| `MODULE_CALC_VERSION` | `modules/shared/modules-calc.js` |
| `MODULE_FEATURES_VERSION` | `chat-action-handlers.js` |
| `MODULE_RENDER_VERSION` | `modules/shared/modules-render.js` |
| `MONTHS` | `modules/shared/helper-teks.js` |
| `MONTHS_FULL` | `modules/shared/helper-teks.js` |
| `MY_WRENCH` | `car-notes.js` |
| `navBillCalendar` | `modules/finance/tagihan-kalender.js` |
| `navBillFilterMonth` | `modules/finance/tagihan-kalender.js` |
| `netWorthForecast` | `modules/asset/aset.js` |
| `normalizeAmtToken` | `modules/shared/kalkulator-input.js` |
| `normalizeOcrNumber` | `pajak-aset-ui-wrappers.js` |
| `NotificationService` | `economic-intelligence/services/notification-service.js` |
| `OCR_MIN_CONFIDENCE_DEFAULT_PCT` | `modules/shared/scan-ocr.js` |
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
| `onShopCsvImportFileChange` | `modules/business/shop-data-io-api.js` |
| `onShopCustFieldInput` | `modules/shop/cobek-tx-cart.js` |
| `onShopJsonImportFileChange` | `modules/business/shop-data-io-api.js` |
| `onSimJenisChange` | `modules/vehicle/vehicle-core.js` |
| `onTargetAccChange` | `modules/finance/tx-target.js` |
| `onTargetDanaDaruratToggle` | `modules/finance/tx-target.js` |
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
| `openShopCsvImportModal` | `modules/business/shop-data-io-api.js` |
| `openShopJsonModal` | `modules/business/shop-data-io-api.js` |
| `openShopKatalogDinamis` | `modules/shared/modal-navigasi.js` |
| `openSimModal` | `modules/vehicle/vehicle-core.js` |
| `openStockRekoWidgetDetail` | `modules/shop/cobek-io.js` |
| `openSubCatModal` | `modules/finance/kategori.js` |
| `openTargetModal` | `modules/finance/tx-target.js` |
| `openTargetModalDanaDarurat` | `modules/shared/action-wrappers.js` |
| `openTransferModal` | `modules/finance/tx-transfer.js` |
| `openTxModal` | `modules/finance/transaksi.js` |
| `openVehicleModal` | `modules/vehicle/vehicle-core.js` |
| `openVehTaxModal` | `modules/vehicle/vehicle-core.js` |
| `openWaShare` | `reminder-notif.js` |
| `openWeeklyResetManual` | `modules/business/reset-gaji-mingguan.js` |
| `Order` | `modules/shop/cobek-order.js` |
| `OWNERSHIP_LABELS` | `modules/shared/ownership-engine.js` |
| `OWNERSHIP_TYPES` | `modules/shared/ownership-engine.js` |
| `OwnershipEngine` | `modules/shared/ownership-engine.js` |
| `OwnershipSettingsPresenter` | `modules/shared/ownership-settings-presenter.js` |
| `packingCalculator` | `modules/shop/cobek-etalase.js` |
| `PAGE_NAV_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `PAJAK_TAB_IDX` | `modules/dashboard-hub/dashboard-hub.js` |
| `PajakAset` | `modules/asset/aset.js` |
| `PajakInsight` | `modules/ai/feature-insights.js` |
| `parseBankScreen` | `modules/shared/scan-ocr.js` |
| `parseBibitScreen` | `modules/shared/scan-ocr.js` |
| `parseBillMultiItems` | `modules/shared/scan-ocr.js` |
| `parseDecStr` | `pajak-aset-ui-wrappers.js` |
| `parseJagoPocketScreen` | `modules/shared/scan-ocr.js` |
| `parsePzNum` | `pajak-aset-ui-wrappers.js` |
| `parseWalletNominal` | `modules/shared/scan-ocr.js` |
| `parseWalletScreen` | `modules/shared/scan-ocr.js` |
| `PAYLATER_DUE_NEXT_MONTH_RE` | `modules/shared/scan-ocr.js` |
| `PAYMENT_STATUSES` | `modules/shop/business-flow-presenter.js` |
| `Payroll` | `modules/business/payroll-absensi.js` |
| `PBB` | `modules/finance/pajak-pbb-zakat.js` |
| `PEHS_WEIGHTS` | `economic-intelligence/domain/scoring-formulas.js` |
| `Pelanggan` | `modules/shop/cobek-order.js` |
| `Pensiun` | `modules/shared/modules-calc.js` |
| `Penyusutan` | `modules/asset/aset.js` |
| `PENYUSUTAN_AI_JENIS_MENURUN` | `modules/asset/penyusutan-ai-widget.js` |
| `PENYUSUTAN_AI_JENIS_TIDAK_SUSUT` | `modules/asset/penyusutan-ai-widget.js` |
| `PenyusutanAI` | `modules/asset/penyusutan-ai-widget.js` |
| `persistApiKeyEncrypted` | `modules/shared/keamanan-pin.js` |
| `PersonalOverviewPresenter` | `modules/cross/personal-overview-presenter.js` |
| `phoneToWaId` | `reminder-notif.js` |
| `pickAssetScanCandidate` | `modules/shared/scan-ocr.js` |
| `pilihAsetPBB` | `pajak-aset-ui-wrappers.js` |
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
| `populateKeuFilters` | `modules/finance/filter-laporan.js` |
| `populateKmVehicleSelect` | `modules/vehicle/vehicle-core.js` |
| `populateOrderProductSelect` | `modules/shop/cobek-io.js` |
| `populateSubSelect` | `modules/finance/kategori.js` |
| `populateTxBbmVehicleSelect` | `modules/finance/tx-bbm.js` |
| `populateTxRenovSelect` | `modules/finance/tx-renov.js` |
| `populateTxShopSaleSelect` | `modules/shop/cobek-tx-cart.js` |
| `populateTxShopStockSelect` | `modules/shop/cobek-tx-cart.js` |
| `populateTxStockSelect` | `modules/finance/tx-stok-sparepart.js` |
| `PORTFOLIO_LABELS` | `modules/asset/aset.js` |
| `predictAssetValue` | `modules/asset/aset.js` |
| `predictCashflow` | `modules/finance/tx-list-cashflow.js` |
| `predictExpense` | `modules/finance/tx-list-cashflow.js` |
| `predictIncome` | `modules/finance/tx-list-cashflow.js` |
| `previewGoldImport` | `modules/asset/aset-emas-impor.js` |
| `previewImportKatalog` | `modules/shop/cobek-io.js` |
| `PriceReko` | `modules/shop/cobek-pricing.js` |
| `PriceRekoWidget` | `modules/shop/cobek-pricing.js` |
| `printWindow` | `modules/shared/action-wrappers.js` |
| `PriorityEngine` | `modules/cross/priority-engine.js` |
| `PRODUCTION_BUILD_SYNCED_VERSION` | `modules/shared/features-helpers-global-security.js` |
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
| `recordBbmLog` | `modules/finance/tx-bbm.js` |
| `recordShopSale` | `modules/shop/cobek-tx-cart.js` |
| `RefAI` | `modules/finance/pajak-pbb-zakat.js` |
| `Refleksi` | `modules/home/refleksi-selfcare.js` |
| `REFLEKSI_SELFCARE_ITEMS` | `modules/home/refleksi-selfcare.js` |
| `refreshBillEverywhere` | `modules/finance/tagihan-kalender.js` |
| `refreshBillHistoryModalViews` | `modules/finance/tagihan-kalender.js` |
| `refreshCurrentPage` | `modules/shared/modal-navigasi.js` |
| `refreshTxCatIfOpen` | `modules/finance/kategori.js` |
| `registerAssetAIRules` | `modules/asset/aset.js` |
| `registerCrossModuleAIRules` | `modules/ai/ai-decision-engine.js` |
| `registerDeliveryAIRules` | `modules/shop/cobek-pricing.js` |
| `registerFinanceAIRules` | `modules/finance/tx-list-cashflow.js` |
| `rememberLastAccForCat` | `modules/shared/scan-ocr.js` |
| `removeOrderItem` | `modules/shop/cobek-io.js` |
| `removeOrphanedAutoPiutangForBill` | `modules/finance/piutang-utang.js` |
| `removeShopStockCartItem` | `modules/shop/cobek-tx-cart.js` |
| `removeTxShopSaleCartItem` | `modules/shop/cobek-tx-cart.js` |
| `renderAccGrid` | `modules/shared/modules-render.js` |
| `renderActualStorageQuota` | `modules/shared/modules-render.js` |
| `renderArchiveHistory` | `modules/shared/modules-render.js` |
| `renderArchiveSuggestHint` | `modules/shared/modules-render.js` |
| `renderAssetList` | `modules/shared/modules-render.js` |
| `renderBbmList` | `modules/shared/modules-render.js` |
| `renderBillArchive` | `modules/shared/modules-render.js` |
| `renderBillCalendar` | `modules/shared/modules-render.js` |
| `renderBillHistory` | `modules/shared/modules-render.js` |
| `renderBillItemHtml` | `modules/shared/modules-render.js` |
| `renderBillList` | `modules/shared/modules-render.js` |
| `renderBudgetCatOptions` | `modules/shared/modules-render.js` |
| `renderBudgets` | `modules/shared/modules-render.js` |
| `renderCarImportVehicleSelect` | `modules/shared/modules-render.js` |
| `renderCashflowForecast` | `modules/shared/modules-render.js` |
| `renderCatList` | `modules/shared/modules-render.js` |
| `renderChatActionBubble` | `modules/shared/modules-render.js` |
| `renderCnTab` | `modules/shared/modules-render.js` |
| `renderCustomerList` | `modules/shop/cobek-io.js` |
| `renderDashAccList` | `modules/shared/modules-render.js` |
| `renderDashboard` | `modules/shared/modules-render.js` |
| `renderDashboardBackupReminder` | `modules/shared/modules-render.js` |
| `renderDashboardBills` | `modules/shared/modules-render.js` |
| `renderDashboardServisReminder` | `modules/shared/modules-render.js` |
| `renderDashboardSewaKiosReminder` | `modules/shared/modules-render.js` |
| `renderDashBudgetMini` | `modules/shared/modules-render.js` |
| `renderDashCardPrefsUI` | `modules/shared/modules-render.js` |
| `renderDashCashflowForecast` | `modules/shared/modules-render.js` |
| `renderDashDanaDarurat` | `modules/shared/modules-render.js` |
| `renderDashLaporanMini` | `modules/shared/modules-render.js` |
| `renderDashServisVehChips` | `modules/shared/modules-render.js` |
| `renderDashZakatMini` | `modules/shared/modules-render.js` |
| `renderDebtList` | `modules/shared/modules-render.js` |
| `renderFiCatOptions` | `modules/shared/modules-render.js` |
| `renderFinancialFreedom` | `modules/shared/modules-render.js` |
| `renderFiScenarios` | `modules/shared/modules-render.js` |
| `renderGDriveSettings` | `modules/shared/modules-render.js` |
| `renderGrafik` | `modules/shared/modules-render.js` |
| `renderKekayaanBersih` | `modules/shared/modules-render.js` |
| `renderKeuAbsensiGajiCard` | `modules/shared/modules-render.js` |
| `renderKeuangan` | `modules/shared/modules-render.js` |
| `renderLapAccList` | `modules/shared/modules-render.js` |
| `renderLaporan` | `modules/shared/modules-render.js` |
| `renderLDR` | `modules/shared/modules-render.js` |
| `renderModalSweepResults` | `modules/shared/modules-render.js` |
| `renderMs` | `modules/shared/modules-render.js` |
| `renderNavSmokeResults` | `modules/shared/modules-render.js` |
| `renderNotifSettings` | `modules/shared/modules-render.js` |
| `renderOrderItems` | `modules/shop/cobek-io.js` |
| `renderPageContent` | `modules/shared/modules-render.js` |
| `renderPajakRekomendasi` | `modules/shared/modules-render.js` |
| `renderPajakZakat` | `modules/shared/modules-render.js` |
| `renderPBB` | `modules/shared/modules-render.js` |
| `renderPBBBillStatus` | `modules/shared/modules-render.js` |
| `renderPiutangList` | `modules/shared/modules-render.js` |
| `renderProductList` | `modules/shop/cobek-io.js` |
| `renderProdusenList` | `modules/shop/cobek-io.js` |
| `renderReceiptInsight` | `modules/shared/modules-render.js` |
| `renderRefCheckReminder` | `modules/shared/modules-render.js` |
| `renderReminder` | `modules/shared/modules-render.js` |
| `renderSelfTestLastResult` | `modules/shared/modules-render.js` |
| `renderSelfTestResults` | `modules/shared/modules-render.js` |
| `renderServisList` | `modules/shared/modules-render.js` |
| `renderServisReminder` | `modules/shared/modules-render.js` |
| `renderSettings` | `modules/shared/modules-render.js` |
| `renderSheetsSettings` | `modules/shared/modules-render.js` |
| `renderShop` | `modules/shop/cobek-io.js` |
| `renderShopGrafik` | `modules/shop/cobek-io.js` |
| `renderShopLaporan` | `modules/shop/cobek-io.js` |
| `renderShopRecent` | `modules/shop/cobek-io.js` |
| `renderShopStockCartList` | `modules/shop/cobek-io.js` |
| `renderSiapPulang` | `modules/shop/cobek-io.js` |
| `renderSimLinkStatus` | `modules/shared/modules-render.js` |
| `renderSimList` | `modules/shared/modules-render.js` |
| `renderSparepartCatList` | `modules/shared/modules-render.js` |
| `renderSptLinkStatus` | `modules/shared/modules-render.js` |
| `renderStockList` | `modules/shared/modules-render.js` |
| `renderStorageUsage` | `modules/shared/modules-render.js` |
| `renderTarget` | `modules/shared/modules-render.js` |
| `renderTxShopSaleCartList` | `modules/shop/cobek-io.js` |
| `renderUMKMPajak` | `modules/shared/modules-render.js` |
| `renderVehicleManageList` | `modules/shared/modules-render.js` |
| `renderVehicleSelect` | `modules/shared/modules-render.js` |
| `renderVehicleSpecCard` | `modules/shared/modules-render.js` |
| `renderVehTaxLinkStatus` | `modules/shared/modules-render.js` |
| `renderVehTaxList` | `modules/shared/modules-render.js` |
| `renderVehTaxSim` | `modules/shared/modules-render.js` |
| `renderWealthSnapshots` | `modules/shared/modules-render.js` |
| `renderWorkDays` | `modules/shared/modules-render.js` |
| `renderZakatLog` | `modules/shared/modules-render.js` |
| `renovAiSuggestCur` | `modules/shared/action-wrappers.js` |
| `renovCalcOpenCur` | `modules/shared/action-wrappers.js` |
| `renovCalcOpenNull` | `modules/shared/action-wrappers.js` |
| `renovDeleteProjectCur` | `modules/shared/action-wrappers.js` |
| `renovOpenItemModalCur` | `modules/shared/action-wrappers.js` |
| `RENTAL_MGMT_CARD_NAV_TARGETS` | `modules/asset/rental-management-presenter.js` |
| `RentalManagementAPI` | `modules/asset/rental-management-api.js` |
| `RentalManagementPresenter` | `modules/asset/rental-management-presenter.js` |
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
| `resolveFavoritEntries` | `modules/dashboard-hub/dashboard-hub-favorit-view.js` |
| `resolveShopKategori` | `modules/shop/cobek-tx-cart.js` |
| `resolveVehicleTxCategory` | `modules/finance/transaksi.js` |
| `RETIRE_NAV_TARGETS` | `modules/finance/retirement-planner-presenter.js` |
| `RetirementPlannerAPI` | `modules/finance/retirement-planner-api.js` |
| `RetirementPlannerPresenter` | `modules/finance/retirement-planner-presenter.js` |
| `revertBillFromDeletedTx` | `modules/finance/tagihan-kalender.js` |
| `revertStockPurchase` | `modules/finance/tx-stok-sparepart.js` |
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
| `RIPPLE_SELECTOR` | `modules/shared/ripple-position.js` |
| `RISKY_OPENER_SPECS` | `self-test.js` |
| `RuleEngine` | `economic-intelligence/engine/rule-engine.js` |
| `runBackup` | `modules/shared/backup-restore.js` |
| `runDataHealthCheck` | `data-health-check.js` |
| `runDataMigrations` | `modules/shared/features-helpers-global-security.js` |
| `runDeferredOrNow` | `modules/shared/modules-render.js` |
| `runFullBackup` | `modules/shared/backup-restore.js` |
| `runGlobalSearch` | `global-search.js` |
| `runNavSmokeTest` | `self-test.js` |
| `runSelfTest` | `self-test.js` |
| `runUniversalScanParser` | `modules/shared/scan-ocr.js` |
| `safeCalc` | `modules/shared/kalkulator-input.js` |
| `safeSetItem` | `modules/shared/features-helpers-global-security.js` |
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
| `saveCatatan` | `modules/finance/transaksi.js` |
| `saveChatActionEdit` | `ai-chat.js` |
| `saveDebt` | `pajak-aset-ui-wrappers.js` |
| `saveFiSettings` | `modules/shared/modules-calc.js` |
| `saveFlush` | `modules/shared/features-helpers-global-security.js` |
| `saveGajiAsIncome` | `modules/business/gaji-calc.js` |
| `saveKeuFilterPrefs` | `modules/finance/filter-laporan.js` |
| `saveKm` | `modules/vehicle/vehicle-core.js` |
| `saveLDR` | `modules/finance/transaksi.js` |
| `saveOrder` | `modules/shop/cobek-io.js` |
| `savePajakSettings` | `pajak-aset-ui-wrappers.js` |
| `savePiutang` | `pajak-aset-ui-wrappers.js` |
| `saveProduct` | `modules/shop/cobek-tx-cart.js` |
| `saveProdusen` | `modules/shop/cobek-io.js` |
| `saveProdusenHarga` | `modules/shop/cobek-io.js` |
| `saveReminder` | `modules/finance/transaksi.js` |
| `saveSelfTestState` | `self-test.js` |
| `saveSim` | `modules/vehicle/vehicle-core.js` |
| `saveSubCat` | `modules/finance/kategori.js` |
| `saveTarget` | `modules/finance/tx-target.js` |
| `saveTransfer` | `modules/finance/tx-transfer.js` |
| `saveTx` | `modules/finance/transaksi.js` |
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
| `scanUniversal` | `modules/shared/scan-ocr.js` |
| `scanWorthItCheckout` | `modules/shared/scan-ocr.js` |
| `SCHEMA_VERSION` | `modules/shared/features-helpers-global-security.js` |
| `selectBillCalDay` | `modules/finance/tagihan-kalender.js` |
| `selectBudgetIcon` | `budget.js` |
| `selectBudgetPeriod` | `budget.js` |
| `selectFiAssetScope` | `modules/shared/modules-calc.js` |
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
| `setAIAssetZakatMinThreshold` | `modules/asset/aset.js` |
| `setAIDeliveryLowStockThreshold` | `modules/shop/cobek-pricing.js` |
| `setAIDeliveryThinMarginThreshold` | `modules/shop/cobek-pricing.js` |
| `setAIFinanceLowBalanceMultiplier` | `modules/finance/tx-list-cashflow.js` |
| `setAIFinanceOverspendThreshold` | `modules/finance/tx-list-cashflow.js` |
| `setAllDashCardPrefs` | `modules/shared/modules-render.js` |
| `setAsetTab` | `modules/asset/aset.js` |
| `setBillListTab` | `modules/finance/tagihan-kalender.js` |
| `setBillType` | `modules/finance/tagihan-kalender.js` |
| `setCatModalType` | `modules/finance/kategori.js` |
| `setCnBbmTab` | `modules/vehicle/vehicle-core.js` |
| `setCnInsightTab` | `modules/vehicle/vehicle-core.js` |
| `setCnPeriode` | `modules/vehicle/vehicle-core.js` |
| `setCnTab` | `modules/vehicle/vehicle-core.js` |
| `setCobekTab` | `modules/shop/cobek-io.js` |
| `setDebtStrategyMethod` | `pajak-aset-ui-wrappers.js` |
| `setImportKatalogTarget` | `modules/shop/cobek-io.js` |
| `setImportShopExcelTarget` | `modules/shop/cobek-io.js` |
| `setKelolaTab` | `modules/finance/tx-list-cashflow.js` |
| `setKeuanganTab` | `modules/finance/tx-list-cashflow.js` |
| `setLaporanPeriode` | `modules/shop/cobek-io.js` |
| `setLaporanTab` | `modules/finance/tx-list-cashflow.js` |
| `setOcrMinConfidence` | `modules/shared/scan-ocr.js` |
| `setPajakTab` | `pajak-aset-ui-wrappers.js` |
| `setPayMethod` | `modules/finance/transaksi.js` |
| `setPeriode` | `modules/finance/tx-list-cashflow.js` |
| `setPjkTab` | `pajak-aset-ui-wrappers.js` |
| `setSettingsTab` | `modules/shared/pengaturan-search.js` |
| `setShopPeriode` | `modules/shop/cobek-io.js` |
| `setShopTab` | `modules/shop/cobek-io.js` |
| `setTheme` | `modules/shared/format-tema.js` |
| `SETTINGS_TAB_ORDER` | `modules/shared/pengaturan-search.js` |
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
| `Sparepart` | `modules/vehicle/sparepart-servis.js` |
| `SPAREPART_BRAND_KEYWORDS` | `modules/vehicle/sparepart-ocr-parser.js` |
| `SPAREPART_LINE_KEYWORDS` | `modules/shared/scan-ocr.js` |
| `SPAREPART_OCR_CATALOG_ADD_CONFIRM_ACTION` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `SPAREPART_OCR_CATALOG_ADD_DEFAULT_SAVE_ACTION` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `SPAREPART_OCR_CATALOG_ADD_SAVE_BTN_ID` | `modules/vehicle/sparepart-ocr-catalog-add.js` |
| `SPAREPART_OCR_CATALOG_DETAIL_EMPTY` | `modules/vehicle/sparepart-ocr-catalog-detail.js` |
| `SPAREPART_SCANNER_CAMERA_INIT_TIMEOUT_MS` | `modules/vehicle/sparepart-scanner.js` |
| `SPAREPART_SCANNER_DEBOUNCE_MS` | `modules/vehicle/sparepart-scanner.js` |
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
| `subCatParentId` | `modules/shared/features-helpers-global-security.js` |
| `subNamesForCat` | `modules/finance/kategori.js` |
| `syncBbmCost` | `modules/vehicle/vehicle-core.js` |
| `syncBbmHargaChanged` | `modules/vehicle/vehicle-core.js` |
| `syncBbmLiterFromCost` | `modules/vehicle/vehicle-core.js` |
| `syncCicilanDate` | `modules/finance/cicilan.js` |
| `syncCicilanPreview` | `modules/finance/cicilan.js` |
| `syncDebtBalanceOnPaymentEdit` | `modules/finance/piutang-utang.js` |
| `syncOutstandingSharedPiutang` | `modules/finance/piutang-utang.js` |
| `syncPartsStockFromCatalog` | `modules/finance/tx-stok-sparepart.js` |
| `syncPiutangFinanceViews` | `modules/shop/cobek-order.js` |
| `syncSharedPiutangOnPaymentEdit` | `modules/finance/piutang-utang.js` |
| `syncTxAmtToLiter` | `modules/finance/tx-bbm.js` |
| `syncTxAmtToLiterForce` | `modules/finance/tx-bbm.js` |
| `syncTxBbmAmt` | `modules/finance/tx-bbm.js` |
| `syncTxShopSaleAmt` | `modules/shop/cobek-tx-cart.js` |
| `syncTxShopStockAmt` | `modules/shop/cobek-tx-cart.js` |
| `syncUnlinkedCatalogPartsToStock` | `modules/finance/tx-stok-sparepart.js` |
| `testNotif` | `reminder-notif.js` |
| `TimelineW` | `modules/asset/aset.js` |
| `timeToMinutes` | `modules/business/payroll-absensi.js` |
| `toast` | `modules/shared/format-tema.js` |
| `TODAY_SOURCE_BUILDERS` | `lifeos/adapters/today-adapter.js` |
| `todayAdapterList` | `lifeos/adapters/today-adapter.js` |
| `todaySourceBills` | `lifeos/adapters/today-adapter.js` |
| `todaySourcePayroll` | `lifeos/adapters/today-adapter.js` |
| `todaySourceReminders` | `lifeos/adapters/today-adapter.js` |
| `todaySourceSelfcare` | `lifeos/adapters/today-adapter.js` |
| `todaySourceTukang` | `lifeos/adapters/today-adapter.js` |
| `todayStr` | `modules/shared/features-helpers-global-security.js` |
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
| `toggleDebugConsole` | `modules/shared/debug-console.js` |
| `toggleEieNotif` | `economic-intelligence/ui/eie-notif-settings.js` |
| `toggleFavorit` | `modules/dashboard-hub/dashboard-hub-favorit.js` |
| `toggleKasirDeliveredField` | `modules/business/kasir.js` |
| `toggleKeuFilter` | `modules/finance/filter-laporan.js` |
| `toggleMs` | `modules/finance/transaksi.js` |
| `toggleNotifEnabled` | `reminder-notif.js` |
| `toggleOrderDeliveredField` | `modules/shop/cobek-io.js` |
| `togglePiutangLunas` | `pajak-aset-ui-wrappers.js` |
| `toggleSingleCardCollapse` | `modules/shared/pengaturan-search.js` |
| `toggleStgGroup` | `modules/shared/pengaturan-search.js` |
| `toggleTxBbmFields` | `modules/finance/tx-bbm.js` |
| `toggleTxRenovFields` | `modules/finance/tx-renov.js` |
| `toggleTxShopSaleFields` | `modules/shop/cobek-tx-cart.js` |
| `toggleTxShopStockFields` | `modules/shop/cobek-tx-cart.js` |
| `toggleTxStockFields` | `modules/finance/tx-stok-sparepart.js` |
| `Torsi` | `car-notes.js` |
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
| `txEditId` | `modules/shared/features-helpers-global-security.js` |
| `txHTML` | `modules/finance/tx-list-cashflow.js` |
| `txListPage` | `modules/finance/filter-laporan.js` |
| `txListPeriode` | `modules/finance/tx-list-cashflow.js` |
| `txMatchesFilters` | `modules/finance/filter-laporan.js` |
| `txMatchesSearch` | `modules/finance/filter-laporan.js` |
| `txStockScanPart` | `modules/finance/tx-stok-sparepart.js` |
| `txStockScanPartGallery` | `modules/finance/tx-stok-sparepart.js` |
| `txStockScanPartVia` | `modules/finance/tx-stok-sparepart.js` |
| `uid` | `modules/shared/features-helpers-global-security.js` |
| `UnifiedAIBriefing` | `modules/cross/unified-ai-briefing.js` |
| `unifiedBriefingChatContext` | `ai-chat.js` |
| `UnifiedBriefingPresenter` | `modules/cross/unified-briefing-presenter.js` |
| `UnifiedDashboardHome` | `modules/cross/unified-dashboard-home.js` |
| `UnifiedSummaryAPI` | `modules/cross/unified-summary-api.js` |
| `uniqueCatList` | `modules/finance/kategori.js` |
| `UNIVERSAL_SCAN_HISTORY_KEY` | `modules/shared/scan-ocr.js` |
| `UNIVERSAL_SCAN_PARSERS` | `modules/shared/scan-ocr.js` |
| `UniversalScan` | `modules/shared/scan-ocr.js` |
| `UniversalScanHistory` | `modules/shared/scan-ocr.js` |
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
| `updateSelfTestBadge` | `self-test.js` |
| `updateSubCatOptions` | `modules/finance/transaksi.js` |
| `updateTxVehiclePanels` | `modules/finance/transaksi.js` |
| `updateUsiaPreview` | `modules/shared/profil-pengaturan.js` |
| `uploadBackupToDrive` | `gdrive-backup.js` |
| `UserFinanceAdapter` | `economic-intelligence/adapters/user-finance-adapter.js` |
| `validateAIRuleShape` | `modules/ai/ai-decision-engine.js` |
| `validateCicilanFields` | `modules/finance/cicilan.js` |
| `validateRuleShape` | `economic-intelligence/rules/rule-schema.js` |
| `validateUniversalScanItem` | `modules/shared/scan-ocr.js` |
| `VEH_JENIS_DEFAULT_INTERVAL` | `modules/vehicle/vehicle-core.js` |
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
| `VEHICLE_WEB_IMPORT_CODE_RE` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `VEHICLE_WEB_IMPORT_NAME_STOPLIST` | `modules/vehicle/vehicle-catalog-web-import.js` |
| `VehicleActionRecommendation` | `modules/vehicle/vehicle-action-recommendation.js` |
| `VehicleAIHook` | `modules/vehicle/vehicle-ai-hook.js` |
| `VehicleAlertPanel` | `modules/vehicle/vehicle-alert-panel.js` |
| `VehicleAnalyticsPresenter` | `modules/vehicle/vehicle-analytics-presenter.js` |
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
| `WALLET_BARE_AMT_RE` | `modules/shared/scan-ocr.js` |
| `WALLET_SPEND_CONTEXT_RE` | `modules/shared/scan-ocr.js` |
| `waShareLink` | `reminder-notif.js` |
| `WeightBulkWidget` | `modules/shop/cobek-pricing.js` |
| `weightCalculator` | `modules/shop/cobek-etalase.js` |
| `withSaveGuard` | `modules/shared/features-helpers-global-security.js` |
| `withSaveGuardAsync` | `modules/shared/features-helpers-global-security.js` |
| `withTimeout` | `modules/shared/scan-ocr.js` |
| `WorthIt` | `modules/finance/worthit.js` |
| `WORTHIT_KEBUTUHAN_KEYWORDS` | `modules/shared/scan-ocr.js` |
| `Zakat` | `modules/finance/pajak-pbb-zakat.js` |
