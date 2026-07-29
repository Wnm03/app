// dashboard-hub-registry.js — FEATURE_REGISTRY: sumber data tunggal taksonomi
// Dipindah ke modules/dashboard-hub/dashboard-hub-registry.js (Sesi 11 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Dashboard Feature Hub (blueprint-dashboard-hub.md §1 & §7, Tahap 0).
//
// PENTING — file ini MURNI DATA, tidak ada logic render/navigasi apa pun.
// Tahap 0 blueprint: "Finalisasi taksonomi §1 jadi 1 sumber data ... Tidak
// ada elemen visual baru dirender." dashboard-hub.js/sidebar-nav.js/
// dashboard-hub-search.js (Tahap 1+) akan MENGKONSUMSI registry ini, bukan
// didefinisikan di sini.
//
// Setiap `target` di bawah HANYA diisi berdasarkan navigasi yang SUDAH ADA &
// TERVERIFIKASI di codebase (showPage/goToList/setKeuanganTab/setShopTab/
// setPajakTab/toggleStgGroup/data-action) — bukan tebakan. Bentuk `target`:
//   { page }              — nama page (cocok dgn id="page-<page>")
//   { page, tab }         — tab di dalam page (lihat TAB REFERENSI di bawah)
//   { page, tab, goTo }   — + id elemen utk scroll-highlight ala goToList()
//   { page, group }       — khusus page:'settings', id grup stgGroup (toggleStgGroup)
//   { page, group, goTo } — + id elemen di dalam grup itu
//   { page, dashKey }     — key di DASH_CARD_DEFS (modules-render.js) utk
//                           widget Pinned. Sejak Tahap 3a, 4 widget migrasi
//                           (refleksi/fi/pensiun/absensi) render-nya TETAP
//                           dikontrol DASH_CARD_DEFS yg sama, tapi elemen
//                           HTML-nya sudah pindah ke page:'dashboard-hub'
//                           (section "Pinned Widgets") — sisanya (mis.
//                           laporanMini) masih page:'dashboard' lama.
//   { page, goTo }        — kartu inti Dashboard yang TIDAK ada di
//                           DASH_CARD_DEFS (advisorCard/lifeBalanceCard) —
//                           selalu tampil, tidak bisa dimatikan lewat
//                           isDashCardOn(). Sejak Tahap 3b elemen HTML-nya
//                           sudah pindah ke page:'dashboard-hub' (section
//                           "Pinned Widgets"), sama seperti 4 widget Tahap
//                           3a — render-nya TETAP dipanggil langsung & tanpa
//                           syarat dari renderDashboard() (Advisor.render()/
//                           AIWidget.render()/FinCoach.renderDash()/
//                           LifeBalance.render()), bukan lewat DASH_CARD_DEFS.
//   { page, tab, action } — target utama fitur ini adalah membuka modal
//                           lewat data-action (mis. openTxModal), bukan
//                           scroll ke kartu — dipakai kalau fitur murni
//                           form/modal tanpa kartu tersendiri di halaman
//   { action }            — fitur modal-only, tidak attach ke page/tab
//                           manapun (dibuka lewat Quick Switcher, mis.
//                           WorthIt.open()), TIDAK ADA kartu di page manapun
//                           per audit codebase saat ini
//
// TAB REFERENSI (diverifikasi lewat data-action="setXxxTab" & pane id di
// index.html/app_production.html):
//   page:'keuangan' -> 'kelola' | 'tagihan' | 'budget' | 'laporan' (setKeuanganTab, tx-list-cashflow.js)
//     tab:'laporan' PUNYA sub-tab bersarang (2026-07-17): field opsional
//     `subtab: 'ringkasan'|'aruskas'|'transaksi'` (setLaporanTab, sama file)
//     tab:'kelola' JUGA PUNYA sub-tab bersarang (2026-07-17, bagian ke-3):
//     field opsional `subtab: 'ringkasan'|'transaksi'|'pengaturan'`
//     (setKelolaTab, sama file)
//   page:'shop'     -> 'kasir'|'jual'|'etalase'|'produsen'|'riwayat'|'pelanggan' (setShopTab, cobek-io.js)
//   page:'carnotes' -> 'insight'|'bbm'|'servis'|'pajak'  (setCnTab, vehicle-core.js,
//     4 tab sejak Sesi 157 — dulu cuma 'bbm'|'servis')
//     tab:'insight' PUNYA sub-tab bersarang (Sesi 158): field opsional
//     `subtab: 'ringkasan'|'rekomendasi'` (setCnInsightTab, vehicle-core.js)
//     tab:'bbm' JUGA PUNYA sub-tab bersarang (Sesi 158): field opsional
//     `subtab: 'ringkasan'|'analisis'` (setCnBbmTab, vehicle-core.js)
//   page:'pajak'    -> 'zakat' | 'pajak'           (setPajakTab, features-sheets-pwa-selftest.js)
//     tab:'pajak' JUGA PUNYA sub-tab bersarang (2026-07-17, bagian ke-4):
//     field opsional `subtab: 'pph21'|'pbb'` (setPjkTab, sama file)
//   page:'aset'     -> 'ringkasan' | 'buku' | 'analisis' (setAsetTab, aset.js) — PUNYA
//                        nav-item bottom-nav sendiri (slot index 3, dulu "AI") sejak
//                        update sebelumnya, lihat PAGE_NAV_IDX di dashboard-hub.js.
//                        Dipecah jadi 3 tab di sesi ini krn sebelumnya 1 halaman tunggal
//                        numpuk 8 kartu (lihat catatan kerja "Split tab: Aset" di CLAUDE.md).
//
// `icon` per fitur/kategori SENGAJA masih emoji (bukan nama ikon SVG
// Feather/Lucide dari Design System §9) — emoji ini adalah yang SUDAH
// dipakai app di card-title masing-masing fitur (jadi terverifikasi nyata
// ada), gampang di-cross-check. Konversi ke SVG outline 24px sesuai §9
// adalah kerjaan visual Tahap 1+, BUKAN Tahap 0.
//
// Kalau nanti ada fitur baru/pindah lokasi, update HANYA file ini —
// jangan taruh taksonomi duplikat di file lain.

const FEATURE_REGISTRY = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    desc: 'Ringkasan personal & insight otomatis',
    target: { page: 'dashboard-hub' },
    navIdx: 0,
    features: [
      { key: 'dash-penasihat', label: 'Penasihat AI', icon: '🧠', desc: 'Insight Cepat & Laporan AI', target: { page: 'dashboard-hub', goTo: 'advisorCard' } },
      // Sesi 22 (TODO.md, Tahap 2 Registry) — 2 sub-bagian DI DALAM kartu
      // "advisorCard" di atas, sumber data AIService (modules/ai/*, Smart
      // Delivery Engine): AIRecommendCard.render() -> #aiRecommendBody,
      // AIDailyBriefingCard.render() -> #aiBriefingBody (lihat ai-chat.js).
      // Sebelumnya HANYA kartu induk (dash-penasihat) yang terdaftar,
      // 2 sub-bagian ini belum bisa ditemukan sendiri lewat pencarian
      // (mis. cari "rekomendasi ai"/"ringkasan harian" tidak nemu apa-apa
      // krn cuma cocok ke label generik "Penasihat AI"). Target tetap
      // page:'dashboard-hub' (SAMA dgn dash-penasihat), goTo beda —
      // keduanya render KOSONG (innerHTML='') kalau tidak ada apa pun
      // buat ditampilkan (lihat render() masing-masing), jadi goTo yang
      // scroll ke situ tetap aman walau body sedang kosong.
      { key: 'dash-ai-rekomendasi', label: 'Rekomendasi AI', icon: '💡', desc: 'Saran otomatis dari rule AI lintas modul', target: { page: 'dashboard-hub', goTo: 'aiRecommendBody' } },
      { key: 'dash-ai-ringkasan-harian', label: 'Ringkasan Harian AI', icon: '📋', desc: 'Jumlah keputusan AI terbaru & ringkasan pengiriman pending', target: { page: 'dashboard-hub', goTo: 'aiBriefingBody' } },
      { key: 'dash-hidup-seimbang', label: 'Skor Hidup Seimbang', icon: '⚖️', desc: 'Dana Darurat, DSR, No-Spend, kerja-istirahat', target: { page: 'dashboard-hub', goTo: 'lifeBalanceCard' } },
      { key: 'dash-refleksi', label: 'Refleksi & Self-Care', icon: '📝', desc: 'Jurnal syukur & checklist harian', target: { page: 'dashboard-hub', dashKey: 'refleksi', goTo: 'refleksiCard' } },
      { key: 'dash-fi', label: 'Kebebasan Finansial (FI)', icon: '🎯', desc: 'Progres menuju financial independence', target: { page: 'dashboard-hub', dashKey: 'fi', goTo: 'dashFiCard' } },
      // Sesi 27 (TODO.md #6b, Tahap 2 Navigation wiring — lihat
      // docs/PRODUCT_DECISIONS.md) — Life OS (lifeos/ui/lifeos-home.js)
      // sebelumnya TIDAK terdaftar sama sekali di FEATURE_REGISTRY, jadi
      // tidak bisa ditemukan lewat pencarian/Favorit walau section-nya
      // sudah lama ada & berfungsi (#lifeOSWrap, dirender LifeOSHome.render()
      // dari DashboardHub.render(), lihat dashboard-hub.js). Target menunjuk
      // ke wrapper section-nya (grid 5 kartu Today/Goals/Projects/Review/
      // Knowledge, tiap kartu pindah panel lewat LifeOSHome.switchPanel() —
      // BUKAN showPage(), lihat catatan navigasi di lifeos-home.js), sama
      // seperti pola dashKey card lain di kategori ini yang bisa
      // disembunyikan (di sini lewat toggle Setelan > Profil & Tampilan >
      // Life OS di Dashboard Hub, default OFF) — goTo tetap valid begitu
      // section-nya ditampilkan user, pola sama dgn dash-fi/dash-refleksi
      // di atas yang juga menunjuk dashKey card yang bisa dimatikan.
      { key: 'dash-lifeos', label: 'Life OS', icon: '🌱', desc: 'Today, Goals, Projects, Review & Knowledge personal', target: { page: 'dashboard-hub', goTo: 'lifeOSWrap' } },
    ],
  },
  {
    key: 'keuangan',
    label: 'Keuangan',
    icon: '💰',
    desc: 'Uang masuk/keluar, rencana, dan laporan',
    target: { page: 'keuangan' },
    navIdx: 1,
    features: [
      { key: 'keu-transaksi', label: 'Transaksi (Masuk/Keluar/Transfer)', icon: '💸', desc: 'Catat pemasukan, pengeluaran, transfer akun', target: { page: 'keuangan', tab: 'kelola', subtab: 'transaksi', action: 'openTxModal' } },
      { key: 'keu-saldo-akun', label: 'Saldo Akun', icon: '🏦', desc: 'Saldo tiap akun cash/bank/e-wallet', target: { page: 'keuangan', tab: 'laporan', subtab: 'ringkasan', goTo: 'lapAccList' } },
      { key: 'keu-anggaran', label: 'Anggaran Bulan Ini', icon: '📋', desc: 'Batas & pemakaian anggaran per kategori', target: { page: 'keuangan', tab: 'budget', goTo: 'budgetList' } },
      { key: 'keu-tagihan', label: 'Tagihan & Cicilan', icon: '🧾', desc: 'Tagihan, cicilan, dan langganan jatuh tempo', target: { page: 'keuangan', tab: 'tagihan', goTo: 'billListKeu' } },
      { key: 'keu-target', label: 'Target Keuangan', icon: '🎯', desc: 'Target tabungan & Dana Darurat', target: { page: 'settings', group: 'stgGroup2', goTo: 'targetList' } },
      { key: 'keu-pensiun', label: 'Dana Pensiun', icon: '👴', desc: 'Proyeksi kebutuhan & tabungan pensiun', target: { page: 'keuangan', tab: 'asetproyek', goTo: 'pensiunBody' } },
      { key: 'keu-grafik', label: 'Grafik 6 Bulan', icon: '📈', desc: 'Tren income/expense 6 bulan terakhir', target: { page: 'keuangan', tab: 'laporan', subtab: 'ringkasan', goTo: 'grafikBars' } },
      { key: 'keu-cashflow', label: 'Proyeksi Arus Kas 30 Hari', icon: '🌊', desc: 'Perkiraan saldo 30 hari ke depan', target: { page: 'keuangan', tab: 'laporan', subtab: 'aruskas', goTo: 'cfBody' } },
      { key: 'keu-laporan-kategori', label: 'Laporan per Kategori', icon: '🗂️', desc: 'Rekap pengeluaran/pemasukan per kategori', target: { page: 'keuangan', tab: 'laporan', subtab: 'aruskas', goTo: 'lapKat' } },
      { key: 'keu-export', label: 'Export', icon: '📤', desc: 'Export laporan ke CSV/JSON/PDF/Gambar', target: { page: 'keuangan', tab: 'laporan', subtab: 'transaksi' } },
    ],
  },
  {
    key: 'bisnis',
    label: 'Bisnis',
    icon: '🛒',
    desc: 'Operasional toko/Shop',
    navIdx: 2,
    features: [
      { key: 'shop-kasir', label: 'Kasir AI', icon: '🧮', desc: 'Checkout cepat tap produk dari grid', target: { page: 'shop', tab: 'kasir', goTo: 'kasirGrid' } },
      { key: 'shop-etalase', label: 'Etalase Produk', icon: '🏪', desc: 'Katalog produk, harga, stok', target: { page: 'shop', tab: 'etalase', goTo: 'productList' } },
      { key: 'shop-produsen', label: 'Produsen/Supplier', icon: '🏭', desc: 'Daftar pemasok produk', target: { page: 'shop', tab: 'produsen', goTo: 'produsenList' } },
      { key: 'shop-order', label: 'Order Manual', icon: '📦', desc: 'Input transaksi jual manual', target: { page: 'shop', tab: 'jual', goTo: 'shopRecentList' } },
      { key: 'shop-pelanggan', label: 'Pelanggan', icon: '👥', desc: 'Data & riwayat pelanggan', target: { page: 'shop', tab: 'pelanggan', goTo: 'customerList' } },
      { key: 'shop-laporan-omzet', label: 'Laporan Omzet', icon: '💹', desc: 'Riwayat & rekap transaksi Shop', target: { page: 'shop', tab: 'riwayat', goTo: 'shopList' } },
      { key: 'shop-tren', label: 'Tren Penjualan 6 Bulan', icon: '📈', desc: 'Grafik omzet 6 bulan terakhir', target: { page: 'shop', tab: 'riwayat', goTo: 'shopGrafikBars' } },
      { key: 'shop-reko-harga', label: 'Rekomendasi Harga Jual AI', icon: '🏷️', desc: 'Saran harga jual per produk', target: { page: 'shop', tab: 'etalase', goTo: 'priceRekoWidgetList' } },
      { key: 'shop-reko-restock', label: 'Rekomendasi Restock AI', icon: '🔄', desc: 'Saran produk yang perlu di-restock', target: { page: 'shop', tab: 'etalase', goTo: 'stockRekoWidgetList' } },
      { key: 'shop-sewakios', label: 'Sewa Kios', icon: '🔑', desc: 'Unit kios disewakan & riwayat tagihan', target: { page: 'keuangan', tab: 'asetproyek', goTo: 'sewaKiosList' } },
      { key: 'shop-renovasi', label: 'Proyek Renovasi', icon: '🛠️', desc: 'Kalkulator material & biaya renovasi', target: { page: 'keuangan', tab: 'asetproyek', goTo: 'renovList' } },
    ],
  },
  {
    key: 'kendaraan',
    label: 'Kendaraan',
    icon: '🚗',
    desc: 'Car Notes: pajak, BBM, servis, sparepart',
    target: { page: 'carnotes' },
    navIdx: 4,
    features: [
      { key: 'cn-pajak-sim', label: 'Pajak Kendaraan & SIM', icon: '🪪', desc: 'STNK, SPT Tahunan, SIM', target: { page: 'carnotes', goTo: 'vehTaxList' } },
      { key: 'cn-bbm', label: 'Riwayat Isi BBM', icon: '⛽', desc: 'Catatan isi BBM & konsumsi km/L', target: { page: 'carnotes', tab: 'bbm', subtab: 'ringkasan', goTo: 'bbmList' } },
      { key: 'cn-servis', label: 'Riwayat Servis', icon: '🔧', desc: 'Catatan servis & pengingat interval', target: { page: 'carnotes', tab: 'servis', goTo: 'servisList' } },
      { key: 'cn-sparepart', label: 'Sparepart', icon: '⚙️', desc: 'Stok sparepart per kategori', target: { page: 'carnotes', tab: 'servis', goTo: 'stockList' } },
    ],
  },
  {
    key: 'pajak-zakat',
    label: 'Pajak & Zakat',
    icon: '🕌',
    desc: 'Kewajiban ke negara & agama',
    target: { page: 'pajak' },
    navIdx: 5,
    features: [
      { key: 'pz-zakat-penghasilan', label: 'Zakat Penghasilan (Profesi)', icon: '🕌', desc: 'Estimasi zakat profesi bulanan', target: { page: 'pajak', tab: 'zakat', goTo: 'zpStatusBox' } },
      { key: 'pz-zakat-maal', label: 'Zakat Maal', icon: '💰', desc: 'Zakat harta & simpanan', target: { page: 'pajak', tab: 'zakat', goTo: 'zmStatusBox' } },
      { key: 'pz-zakat-fitrah', label: 'Zakat Fitrah', icon: '🌙', desc: 'Hitung zakat fitrah per jiwa', target: { page: 'pajak', tab: 'zakat', goTo: 'zfTotal' } },
      { key: 'pz-riwayat-zakat', label: 'Riwayat Pembayaran Zakat', icon: '📜', desc: 'Catatan zakat yang sudah dibayar', target: { page: 'pajak', tab: 'zakat', goTo: 'zakatLogList' } },
      { key: 'pz-pph21', label: 'Estimasi PPh 21', icon: '🧾', desc: 'Estimasi pajak penghasilan pribadi', target: { page: 'pajak', tab: 'pajak', subtab: 'pph21', goTo: 'pphResultBox' } },
      { key: 'pz-pbb', label: 'PBB', icon: '🏠', desc: 'Pajak Bumi & Bangunan', target: { page: 'pajak', tab: 'pajak', subtab: 'pbb', goTo: 'pbbAssetPick' } },
    ],
  },
  {
    key: 'aset',
    label: 'Aset',
    icon: '📦',
    desc: 'Kekayaan di luar arus kas harian',
    navIdx: 5,
    features: [
      { key: 'aset-buku', label: 'Buku Aset & Kekayaan Bersih', icon: '📚', desc: 'Daftar aset & total kekayaan bersih', target: { page: 'aset', tab: 'buku', goTo: 'assetList' } },
      { key: 'aset-histori', label: 'Histori Kekayaan & Growth Rate', icon: '📉', desc: 'Snapshot kekayaan & CAGR', target: { page: 'aset', tab: 'ringkasan', goTo: 'wealthSnapshotList' } },
      { key: 'aset-alokasi', label: 'Rekomendasi Alokasi Aset', icon: '🧭', desc: 'Saran alokasi dana sesuai profil risiko', target: { page: 'aset', tab: 'analisis', goTo: 'aaResult' } },
      { key: 'aset-emas', label: 'Aset Emas (impor nota massal)', icon: '🥇', desc: 'Impor nota emas & rekap zakat maal emas', target: { page: 'aset', tab: 'buku', goTo: 'assetList', action: 'GoldImport.open' } },
    ],
  },
  {
    key: 'personal',
    label: 'Personal',
    icon: '🌱',
    desc: 'Fitur non-finansial keluarga',
    navIdx: 6,
    features: [
      { key: 'per-absensi', label: 'Absensi Harian & Kalkulator Gaji', icon: '🕒', desc: 'Absensi & estimasi gaji mingguan', target: { page: 'dashboard-hub', dashKey: 'absensi', goTo: 'dashAbsensiCard' } },
      { key: 'per-edufund', label: 'Dana Pendidikan', icon: '🎓', desc: 'Target biaya sekolah/kuliah anak', target: { page: 'settings', group: 'stgGroup2', goTo: 'eduFundList' } },
      { key: 'per-worthit', label: 'Worth It? & Prioritas Belanja', icon: '🤔', desc: 'Cek layak beli & daftar prioritas belanja', target: { action: 'WorthIt.open' } },
      { key: 'per-self-reward', label: 'Self Reward', icon: '🎁', desc: 'Cek kelayakan & level self reward sesuai kondisi finansial', target: { action: 'SelfRewardView.open' } },
      { key: 'per-piutang-utang', label: 'Piutang & Utang', icon: '🤝', desc: 'Catatan piutang, utang, strategi pelunasan', target: { page: 'keuangan', tab: 'utangpiutang', goTo: 'piutangList' } },
      { key: 'per-pengingat', label: 'Pengingat', icon: '🔔', desc: 'Pengingat umum', target: { page: 'settings', group: 'stgGroup3', goTo: 'reminderList' } },
    ],
  },
  {
    key: 'ai',
    label: 'AI',
    icon: '🤖',
    desc: 'Kecerdasan buatan lintas fitur',
    target: { page: 'ai' },
    navIdx: 3,
    features: [
      { key: 'ai-chat', label: 'AI Asisten (chat)', icon: '💬', desc: 'Tanya jawab & aksi lewat chat AI', target: { page: 'ai', goTo: 'chatBox' } },
      { key: 'ai-kategorisasi', label: 'Kategorisasi Transaksi Otomatis', icon: '🏷️', desc: 'Tebak kategori dari catatan bebas saat isi transaksi', target: { page: 'keuangan', tab: 'kelola', subtab: 'transaksi', action: 'openTxModal' } },
      { key: 'ai-scan-ocr', label: 'Scan Struk/OCR', icon: '📸', desc: 'Scan struk belanja, transfer, odometer, portofolio aset', target: { page: 'keuangan', tab: 'kelola', subtab: 'transaksi', action: 'openTxModal' } },
    ],
  },
  {
    key: 'backup',
    label: 'Backup',
    icon: '☁️',
    desc: 'Keamanan & portabilitas data',
    target: { page: 'settings', group: 'stgGroup4' },
    navIdx: 6,
    features: [
      { key: 'bk-manual', label: 'Backup & Restore manual', icon: '💾', desc: 'Backup/restore data lewat file', target: { page: 'settings', group: 'stgGroup4', goTo: 'restoreFileInput' } },
      { key: 'bk-gdrive', label: 'Backup Otomatis ke Google Drive', icon: '☁️', desc: 'Sinkron backup terjadwal ke Drive', target: { page: 'settings', group: 'stgGroup4', goTo: 'gdStatus' } },
      { key: 'bk-sheets', label: 'Sinkron ke Google Sheets', icon: '📊', desc: 'Sinkron data ke Google Sheets', target: { page: 'settings', group: 'stgGroup4', goTo: 'gsStatus' } },
      { key: 'bk-export-per-fitur', label: 'Export/Import per fitur', icon: '📤', desc: 'CSV/XLSX/JSON per modul (Aset, Shop, Keuangan, Car Notes)', target: { page: 'settings', group: 'stgGroup4' } },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: '⚙️',
    desc: 'Konfigurasi aplikasi murni',
    target: { page: 'settings' },
    navIdx: 6,
    features: [
      { key: 'stg-profil', label: 'Profil', icon: '👤', desc: 'Nama, gaji, kiriman, data pribadi', target: { page: 'settings', group: 'stgGroup1', goTo: 'sNama' } },
      { key: 'stg-tema', label: 'Tema Tampilan', icon: '🎨', desc: 'Ganti tema warna aplikasi', target: { page: 'settings', group: 'stgGroup1', goTo: 'themeGrid' } },
      { key: 'stg-akun', label: 'Akun & Metode Pembayaran', icon: '💳', desc: 'Kelola akun cash/bank/e-wallet', target: { page: 'settings', group: 'stgGroup2', goTo: 'accGrid' } },
      { key: 'stg-lanjutan', label: 'Pengaturan Lanjutan per Fitur', icon: '🛠️', desc: 'Pengaturan mendalam per modul', target: { page: 'settings', group: 'stgGroup2' } },
      { key: 'stg-keamanan', label: 'Keamanan (PIN)', icon: '🔒', desc: 'Ganti PIN & pengaturan keamanan lain', target: { page: 'settings', group: 'stgGroup5' } },
      { key: 'stg-storage', label: 'Kapasitas Penyimpanan HP', icon: '📱', desc: 'Estimasi & rincian pemakaian storage', target: { page: 'settings', group: 'stgGroup4', goTo: 'storageOverallBar' } },
      { key: 'stg-debug', label: 'Debug Console', icon: '🐞', desc: 'Aktifkan panel debug pihak ketiga (eruda)', target: { page: 'settings', group: 'stgGroup6', goTo: 'btnToggleDebugConsole' } },
      { key: 'stg-selftest', label: 'Tes Otomatis/Self-test', icon: '✅', desc: 'Jalankan self-test internal aplikasi', target: { page: 'settings', group: 'stgGroup6', goTo: 'selfTestResults' } },
      { key: 'stg-diagnostik-versi', label: 'Diagnostik Versi', icon: '🔍', desc: 'Status sinkron versi produksi vs modul', target: { page: 'settings', group: 'stgGroup6', goTo: 'aboutProdSyncStatus' } },
      { key: 'stg-about', label: 'Tentang Aplikasi', icon: 'ℹ️', desc: 'Versi build & informasi aplikasi', target: { page: 'settings', group: 'stgGroup6', goTo: 'aboutBuildVersion' } },
    ],
  },
];
