# PATCH — Audit & Perbaikan Dashboard Hub (build v2616)

Basis: app-main_33.zip. ZIP ini HANYA berisi file yang berubah (lihat CHANGED-FILES-DASHBOARD-AUDIT.txt). Tidak ada file yang dihapus. Timpa ke root app-main/.

## Temuan audit (diuji nyata di Chromium, data uji lintas domain)
1. Tab Ringkasan (landing default) nyaris kosong: hanya saldo + "Ownership Summary" (hitungan entitas, bukan insight). Pemasukan/pengeluaran bulan ini tersembunyi CSS (.dashhub-hero-stats display:none) dan ticker hanya tampil di tema "modern".
2. "Perlu Perhatian" hanya membaca tagihan/servis/backup. Anggaran jebol, utang/piutang, zakat, stok shop, dana titipan, risiko keuangan tidak muncul, padahal PriorityEngine sudah menggabungkan semuanya.
3. Kartu "Finance & Vehicle Cross Summary" menampilkan "Total Perhatian Gabungan 1" saat domain lain punya 19 item: angka kontradiktif/menyesatkan.
4. Tab bar Ringkasan/Fitur/Widget/Insight berpindah posisi (di bawah konten pada Ringkasan, di atas pada tab lain).
5. Ikon header kartu melebar jadi pil (flex:1 pada semua anak .dashhub-cat-head), tombol "Buka" terpotong jadi "Buk/a".
6. Tab Insight tipis dan tidak ada laporan tren/analisis.
7. Akun baru dibanjiri peringatan semu (skor 33/100, "10 servis segera" tanpa riwayat KM).

## Perbaikan
- BARU modules/dashboard-hub/dashboard-hub-overview.js (presenter read-only, 0 rumus finansial baru, reuse PriorityEngine/FinanceIntelligence/FinancialHealthScoreAPI/AssetPortfolioAPI/getBillStats/VehicleReminder/ShopBusinessEnginePresenter/ZakatReminder):
  - Pusat Perhatian: item PriorityEngine dikelompokkan PER DOMAIN (jumlah, pesan terparah, tap = buka halaman domain) + status backup. Tanpa duplikasi anggaran/risiko.
  - Pantau Domain (tab Ringkasan): Arus Kas (masuk/keluar/bersih/tingkat tabungan/vs bulan lalu), Kekayaan Bersih + komposisi + saran diversifikasi, Tagihan & Cicilan, Anggaran, Kesehatan Finansial, Kendaraan (+km/L), Shop, Zakat. Domain tanpa data disembunyikan.
  - Tren Keuangan 6 bulan + 5 kategori pengeluaran terbesar vs bulan lalu (tab Insight).
- DIHAPUS dari Beranda: Ownership Summary (tetap ada di Pengaturan > Kepemilikan), Cross Summary yang menyesatkan.
- Tab bar tidak lagi berpindah; ikon kartu & tombol "Buka" dirapikan.
- Pin gerbang repo diperbarui: GROUP_B 361 -> 362 (s2252, s2391), FILE-HASHES di-refresh, budget CSS tetap lolos (styles.css 179998/180000).

## Verifikasi
- `node --test tests/*.test.js`: 9100 tes, 9099 lulus, 0 gagal (1 skip bawaan). 9 tes baru: tests/dashboard-hub-overview-s2612.test.js.
- Budget performa lolos. Dijalankan di Chromium: 0 error konsol, klik grup/tile menavigasi benar, empty-state akun baru bersih.
- Catatan: eslint/lint tidak dijalankan.
