# Dashboard — Fix Data Ganda (Ringkasan Bulan Ini)

## Masalah
Di halaman Dashboard (`#page-dashboard-hub`), angka Pemasukan/Pengeluaran/
Bersih/Jumlah Transaksi bulan berjalan tampil **3x** karena ada 3 komponen
terpisah yang masing-masing menghitung ulang & merender angka yang sama:

1. **Hero Card** (`DashboardHubHero`, Tahap 2) — "Pemasukan Bulan Ini" /
   "Pengeluaran Bulan Ini" + saldo semua akun.
2. **Summary Cards** (`DashboardHubSummary`, Tahap 5) — "Pemasukan Bulan
   Ini" / "Pengeluaran Bulan Ini" / "Bersih Bulan Ini" / "Jumlah Transaksi".
3. **Analytics Row** (`DashboardHubAnalytics`, Tahap 7) — "Transaksi Bulan
   Ini" / "Total Pemasukan" / "Total Pengeluaran" / "Saldo Bersih" /
   "Pemasukan vs Pengeluaran".

Ketiganya sengaja dibuat sebagai widget independen (masing-masing punya
fungsi hitung sendiri: `_dashHubHeroMonthTx`, `_dashHubSummaryMonthTx`,
`_dashHubAnalyticsMonthTx`, isinya identik) supaya widget lama tidak perlu
disentuh tiap ada fitur baru — efeknya data yang sama numpuk 3x di layar.

## Fix
Bukan menghapus kode (biar tidak merusak test lama), tapi menyembunyikan
tampilan yang paling redundan:

- **Summary Cards** (`#dashHubSummaryGrid`) → disembunyikan via
  `display:none` di `styles.css`. Semua 4 angkanya sudah tercakup penuh di
  Analytics Row (yang bahkan punya tambahan rasio %).
- **Hero Card** & **Analytics Row** tetap tampil apa adanya — Hero unik
  karena menampilkan Saldo Semua Akun (tidak ada di widget lain), Analytics
  Row jadi satu-satunya baris rincian bulan berjalan.
- `DashboardHubSummary.render()` TETAP dipanggil dari `DashboardHub.render()`
  tanpa perubahan JS, supaya `tests/dashboard-hub-summary.test.js` tetap
  lolos — cuma outputnya tidak lagi terlihat di layar.

## File yang berubah
- `styles.css` — tambah `.dashhub-summary-grid{display:none}`.
- `index.html` — tambah komentar dokumentasi di atas `#dashHubSummaryGrid`.
- `app-bundle-b.min.js` / `app_production.html` — hasil rebuild
  (`node scripts/build.js`).

## Fix #2 — CrossDashboardCard (tab Insight) duplikat dgn tab Keuangan/Car Notes

### Masalah
Kartu **"Skor Kesehatan Finansial"** & **"Skor Kesehatan Armada"** di
`#crossDashGrid` (tab **Insight**, `modules/cross/cross-dashboard-card.js`)
menampilkan angka yang **100% sama** dengan kartu yang sudah tampil di:
- `#findashWrap` (tab **Keuangan**, `FinanceDashboard`) — Skor Kesehatan
  Finansial, sumber `FinanceIntelligence.healthScore()`.
- `#vehdashWrap` (tab **Car Notes**, `VehicleDashboard`) — Skor Kesehatan
  Armada, sumber `VehicleIntelligence.fleetSummary()`.

`CrossDashboardCard` membaca kedua nilai ini lewat `CrossAIHook.getAIHook()`
(gabungan `FinanceDashboard.getAIHook()`+`VehicleAIHook.fleetSummary()`) —
sumber data persis sama, cuma dibungkus ulang, jadi user melihat angka
identik 2x di 2 tab berbeda.

### Fix
- `modules/cross/cross-dashboard-card.js` — `render()` sekarang HANYA
  memanggil `_combinedAttentionCard()`. `_financeHealthCard()`/
  `_vehicleHealthCard()` TETAP ada di file (tidak dihapus) tapi tidak lagi
  dipanggil — pola sama persis fix #1 di atas (`DashboardHubSummary.render()`
  tetap ada, cuma output disembunyikan).
- `index.html` (→ dibangun ulang ke `app_production.html`) — deskripsi
  section `#crossDashWrap` diperbarui, tidak lagi menyebut "skor kesehatan
  finansial & armada" karena sudah tidak ditampilkan di situ.
- `CrossModuleWidgets`/`UnifiedBriefingPresenter`/dll TIDAK disentuh — sudah
  dicek, tidak ada yang menampilkan ulang 2 skor ini.

Yang tersisa di kartu `#crossDashGrid` cuma **"Total Perhatian Gabungan"**
(gabungan anggaran lewat batas + servis/pajak/BBM lewat jatuh tempo) — satu-
satunya angka di situ yang memang belum ada di kartu lain manapun.

### Verifikasi
```
node --test tests/*.test.js
# tests 381 / pass 381 / fail 0 (tidak ada test khusus CrossDashboardCard
# sebelum maupun sesudah fix — 0 regresi)

node scripts/build.js kw156f-dashboard-cross-dedup-fix
# ✅ Build selesai & lolos cek sintaks bundle, ?v=595
```

## Belum disentuh (butuh cek manual di browser)
Potongan teks "Rp 1.5 jt" / "Rp 2.2 jt" yang kelihatan terpotong di atas
baris ikon Quick Actions pada screenshot kemungkinan besar cuma posisi
scroll saat screenshot diambil (Hero Card ikut tergulung sedikit ke atas),
bukan bug CSS — tidak ditemukan `overflow:hidden`/`position:absolute` yang
mencurigakan di `.dashhub-hero*`. Kalau setelah update ini teks itu masih
selalu terpotong walau halaman dalam posisi scroll paling atas, ini perlu
dicek langsung di browser (DevTools) karena tidak bisa dipastikan dari kode
statis saja.
