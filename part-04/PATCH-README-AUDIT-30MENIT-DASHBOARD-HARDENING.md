# Patch Akumulasi — Audit 30 Menit → Dashboard Insight + Performance Hardening

Basis: `app-main-36-AUDIT-FIX-30MENIT-DASHBOARD-PATCH.zip`
Tanggal: 2026-09-21

## Perubahan tambahan yang sudah diakumulasikan

1. **Dashboard memakai jalur audit ringan**
   - Menambah `FinancialAuditEngine.dashboardInsight()`.
   - Dashboard Hub tidak lagi menjalankan analisis full-audit yang tidak ditampilkan, khususnya recurring candidates dan expense groups.

2. **Kurangi pemindaian transaksi berulang**
   - `FinancialAuditEngine.audit()` berbagi satu eligibility scan untuk semua analisis periode aktif.
   - Periode pembanding hanya dipindai sekali.
   - Diagnosis duplicate dan data-quality menggunakan hasil eligibility yang sama.

3. **Label periode diperjelas**
   - Insight menampilkan `Audit Keuangan 30 Menit · 30 hari terakhir` agar nama fitur tidak membingungkan dengan periode data.

4. **Regression test**
   - Memastikan audit full memakai tepat 2 eligibility scan: periode aktif + periode pembanding.
   - Memastikan dashboard insight tidak memanggil analisis full-audit yang tidak diperlukan.
   - Presenter tetap read-only.

## File yang berubah/ditambahkan dalam patch kumulatif

- `modules/finance/financial-audit-engine.js`
- `modules/finance/financial-audit-presenter.js`
- `tests/financial-audit-engine.test.js`
- `tests/financial-audit-presenter.test.js`
- `app-bundle-b.min.js`
- `AUDIT-FIX-FINANCIAL-AUDIT-30MENIT-DASHBOARD.md`
- seluruh file patch sebelumnya tetap dipertahankan.

## Verifikasi

- Financial Audit Engine + Presenter: **15/15 PASS**.
- `node --check` engine: PASS.
- `node --check` presenter: PASS.
- `node --check` bundle B: PASS.
- `verify-bundle-freshness.js`: **bundle A & B PASS / source hash cocok**.
- Tidak ada perubahan transaksi atau persistence.
- Tidak ada version bump pada patch ini; patch mengikuti versi runtime yang sudah ada pada patch basis.

## Urutan penerapan

Patch ini adalah **patch kumulatif**. Terapkan sebagai satu paket di atas project yang sudah menerapkan patch basis. `app-bundle-b.min.js` sudah direbuild dari source GROUP_B dan siap menggantikan bundle B lama.


## Akumulasi — Penamaan & Durasi Audit
- Nama UI diubah menjadi **Audit Keuangan Cepat**; istilah internal/action `financialAudit30Menit` dipertahankan untuk kompatibilitas.
- Periode audit tetap **30 hari terakhir**.
- Presenter mengukur durasi aktual dengan `performance.now()` (fallback `Date.now()`) dan menampilkan ms bila <1 detik, atau detik bila ≥1 detik.
- Dashboard Insight menampilkan durasi aktual tanpa menjalankan audit tambahan.
- Detail audit menampilkan `Waktu audit` agar performa dapat dipantau tanpa menyiratkan SLA 30 detik/menit.


## Verifikasi Akumulasi v1876
- UI: **Audit Keuangan Cepat**.
- Periode data: **30 hari terakhir**.
- Durasi: aktual, `ms` jika <1 detik dan `detik` jika ≥1 detik.
- API/action internal `openFinancialAudit30Menit` dipertahankan untuk kompatibilitas.
- Cache/version: **v1876** pada HTML dan Service Worker agar bundle baru tidak tertahan cache v1875.
