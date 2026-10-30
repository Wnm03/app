# Audit/Fix — Audit Keuangan 30 Menit belum tampil di Dashboard Hub

Tanggal: 2026-09-21

## Temuan
- `FinancialAuditEngine` dan `FinancialAuditPresenter` sudah aktif dan fitur modal Audit Keuangan 30 Menit sudah dapat dibuka dari Finance Dashboard.
- `FinanceDashboard._auditCard()` sebelumnya hanya menampilkan tombol `Mulai audit`; hasil audit tidak pernah dipresentasikan ke Dashboard Hub.
- `DashboardHub.renderSection('insight')` sebelumnya tidak memanggil presenter Audit Keuangan 30 Menit.
- Karena dashboard-role mengeluarkan widget finance detail dari Dashboard Hub, menampilkan seluruh audit di Dashboard akan membuat dashboard berat dan berpotensi duplikasi.

## Perbaikan
1. Menambahkan `FinancialAuditPresenter.renderDashboardInsight()` sebagai presenter ringan yang 100% reuse `FinancialAuditEngine.audit()`.
2. Menambahkan kartu `financialAuditInsightWrap` + `financialAuditInsightBody` pada tab **Insight** Dashboard Hub.
3. Menambahkan wiring di `DashboardHub.renderSection('insight')`.
4. Insight hanya menampilkan ringkasan 30 hari: sinyal duplikasi/kualitas data, transaksi kecil, kategori pengeluaran terbesar, total pemasukan/pengeluaran, dan perubahan pengeluaran vs 30 hari sebelumnya.
5. Tombol `Buka` membuka audit lengkap; detail tetap berada di fitur Keuangan sehingga Dashboard Hub tidak menjadi berat.
6. Tidak ada mutasi transaksi, persistence baru, atau rumus audit baru.

## Verifikasi
- Targeted test: 47/47 PASS.
- Build: PASS; kedua bundle lolos `node --check`.
- Build menghasilkan versi `1875` dan menyinkronkan `index.html`, `app_production.html`, `sw.js`, serta bundle.
- `esbuild` tidak tersedia di environment build, sehingga bundle valid tetapi belum diminify.
- Full `npm test` dijalankan tetapi belum selesai dalam batas 5 menit environment; karena itu hasil full-suite tidak dinyatakan PASS.

## Hardening tambahan — 2026-09-21
7. Jalur Dashboard Hub kini memakai `FinancialAuditEngine.dashboardInsight()` sehingga analisis berat yang tidak ditampilkan di Hub (pola berulang dan kelompok pengeluaran) tidak ikut dihitung.
8. `FinancialAuditEngine.audit()` sekarang berbagi satu hasil eligibility scan untuk seluruh analisis periode aktif; periode pembanding hanya dipindai sekali. Ini mengurangi pemindaian berulang terhadap `D.transactions`.
9. Label Hub diperjelas menjadi **Audit Keuangan 30 Menit · 30 hari terakhir** agar “30 Menit” tidak disalahartikan sebagai panjang periode audit.
10. Ditambahkan regression test untuk memastikan jumlah eligibility scan tetap 2 (current + previous) dan dashboard insight tidak menjalankan analisis full-audit yang tidak dipakai.

## Verifikasi hardening
- Financial Audit Engine + Presenter: **15/15 PASS**.
- `node --check` source engine/presenter: PASS.
- `node --check` `app-bundle-b.min.js`: PASS.
- Bundle B direbuild dari seluruh GROUP_B dan source hash diperbarui.
- Tidak ada perubahan pada transaksi/persistence.
