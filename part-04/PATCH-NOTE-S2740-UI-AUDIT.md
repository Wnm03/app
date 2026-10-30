# PATCH S2740 — perbaikan audit UI mobile (versi build 2714)

Hanya presentasi/render; tidak menyentuh SOT atau data.

- T1 Servis: `renderServisList(opts)` meneruskan `skipReminder` (kartu Pengingat tidak lagi dirender 2x).
- T2 `catDelBtn` ganda: modal Katalog Part memakai `catalogDelBtn`.
- T3-T6,T10 Shop: tombol Export ganda dihapus; insight atas hanya di tab Kasir (HP) dan disembunyikan di tab BI; KPI 3 kolom satu baris; hero ringkas di HP; breadcrumb ganda disembunyikan (Shop, Keuangan > Kelola).
- T7 Target sentuh: area tekan bintang favorit diperluas, tombol Budget min 36px, ✕ FinCoach min 36px.
- T8 Font: teks Servis/Shop/Sparepart/Pajak kendaraan minimal 11px.
- T9 (sebagian): kartu insight melewati penulisan ulang bila HTML identik. Dana Titipan Laporan TIDAK diubah.
- Tes diselaraskan: carnotes-theme-pro-rollback, innerhtml-audit-s27. FILE-HASHES-SHA256.txt di-refresh.
- Hasil build: bundle a/b, index.html, app_production.html, sw.js, file versi, FILE-MAP, COVERAGE-PER-MODULE.

Terapkan: salin semua file di ZIP ke root proyek (timpa). Tidak ada file yang dihapus.
