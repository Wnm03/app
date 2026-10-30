PATCH — Audit Keuangan 30 Menit (Phase A + Hardening + Diagnostic Data Ganda)

Patch ini mengakumulasi seluruh perubahan Audit Keuangan 30 Menit sebelumnya.
Ekstrak ke ROOT project app-main dengan struktur folder dipertahankan.

FITUR:
- Audit 30 hari read-only: ringkasan, Top 3 kategori, transaksi kecil, data quality.
- Diagnosis data transaksi ganda: duplicate ID, duplicate bisnis, near-duplicate, dan dampak nominal ke audit.
- Pengelompokan pengeluaran Kebutuhan / Keinginan / Masa depan / Perlu ditinjau berbasis mapping eksplisit pengguna; tidak menebak kategori ambigu.
- Perbandingan dengan periode sebelumnya yang panjangnya sama.
- Kandidat transaksi berulang; TIDAK otomatis dibuat sebagai langganan.
- Ambang audit dapat dikonfigurasi dan disimpan di D.financeAuditSettings.
- Pilih satu rencana tindakan dan navigasi ke modul terkait; tidak membuat transaksi/budget otomatis.
- Anotasi transaksi terpisah di D.financeAuditAnnotations: flag, trigger, catatan refleksi.
- Riwayat rencana perbaikan melalui status active/completed.
- Semua perubahan transaksi asli dihindari.
- Navigasi dari kandidat duplicate ke sumber transaksi untuk pemeriksaan manual.
- Pilihan tindakan tambahan: menetapkan batas anggaran.

FILE TAMBAHAN/BERUBAH:
- modules/finance/financial-audit-engine.js
- modules/finance/financial-audit-presenter.js
- modules/finance/financial-audit-annotations.js (baru)
- modules/finance/finance-dashboard.js (dari patch sebelumnya)
- modules/shared/features-helpers-global-security.js
- scripts/build.js
- tests/financial-audit-engine.test.js
- tests/financial-audit-annotations.test.js (baru)
- tests/financial-audit-presenter.test.js (baru)
- tests/financial-audit-duplicates.test.js
- app-bundle-b.min.js

VALIDASI:
- Test Audit terarah + duplicate + presenter: 24/24 lulus.
- `node --check` source presenter/engine/annotations dan bundle B: lulus.
- node --check untuk kedua bundle: lulus saat build.
- Build selesai dengan versi existing s1877-selftest-persistence-fix-1874.
- esbuild tidak tersedia di environment build ini, sehingga bundle fallback non-minified tetapi valid.

CATATAN:
- app-bundle-b.min.js adalah artefak build yang diperbarui karena modul audit berada di GROUP_B.
- Tidak ada app HTML/full source dalam patch ini.

PATCH DIAGNOSTIC DUPLIKASI TRANSAKSI
- Menambahkan tests/financial-audit-duplicates.test.js.
- Mendeteksi duplicate ID dan duplicate business signature.
- Membedakan duplicate pasti dari transaksi yang hanya mirip.
- Menguji dampak duplicate ke summary, Top 3 kategori, small leakage,
  recurring candidates, comparison, audit snapshot, serta anotasi/rencana.
- Test bersifat read-only terhadap D.transactions.


HARDENING TAMBAHAN TAHAP INI
- Memperbaiki bug TDZ di presenter: settings harus dibaca sebelum dipakai saat render.
- `FinancialAuditEngine.duplicateDiagnostics(range)` bersifat read-only dan dipakai juga oleh dataQuality()/audit().
- Duplikasi tidak dihapus atau dideduplikasi otomatis; hasil raw tetap transparan dan pengguna diarahkan memeriksa sumber.
- `expenseGroups(range, { categoryMap })` hanya mengelompokkan kategori yang dipetakan eksplisit. Tanpa mapping, kategori masuk Perlu ditinjau.
- `FinancialAuditAnnotations.setCategoryGroup()` menyimpan mapping di `D.financeAuditSettings`, terpisah dari D.transactions.
- Regression test mencakup duplicate ID, duplicate bisnis, near-duplicate, dampak summary/top/leakage/recurring/comparison/audit, grouping eksplisit, data quality, presenter TDZ, dan read-only.

BUILD
- Bundle B dibangun ulang setelah hardening. Build environment tidak memiliki esbuild, sehingga bundle fallback non-minified tetapi `node --check` valid.
- Versi hasil build workspace: s1877-audit-keuangan-30-menit-1880.

PATCH v5 — DASHBOARD INSIGHT DEDUP
----------------------------------
- Added modules/dashboard-hub/dashboard-insight-dedup.js.
- Added presentation-only consolidation for Dashboard Hub:
  * hides empty insight wrappers;
  * hides exact duplicate insight sections, preserving the first canonical section;
  * hides known mirrored Advisor bodies when their canonical Dashboard Hub section has the same content.
- Canonical presentation order: Cross Brief -> Cross Insight -> Personal Overview -> Cross Module Widgets -> Life Priority -> Recommendation Panel -> Action Queue.
- Does NOT delete or mutate source engines, APIs, D.transactions, or user records.
- Added module to scripts/build.js and included the runtime module in app-bundle-b.min.js.
- Added tests/dashboard-insight-dedup.test.js (4/4 PASS).
- Syntax checks: new module, build script, and app-bundle-b.min.js PASS.
- Existing v4 Audit Keuangan + duplicate diagnostic files remain accumulated in this patch.

PATCH v6 — DASHBOARD INSIGHT HARDENING + SINGLE CANONICAL HOME
--------------------------------------------------------------
- Memperketat deduplikasi presentation layer agar tidak memakai `includes()` mentah yang berisiko false-positive.
- Menambahkan token/Jaccard similarity konservatif (threshold 0.94) untuk duplicate/mirror insight.
- Menambahkan deduplikasi mirror eksplisit via `data-insight-mirror-of` untuk integrasi UI baru tanpa mengubah engine.
- Empty insight wrapper tetap disembunyikan; wrapper yang benar-benar berisi informasi unik tetap dipertahankan.
- Menambahkan `aria-hidden` saat elemen disembunyikan untuk aksesibilitas.
- Menambahkan MutationObserver dengan debounce agar insight yang diisi secara async tetap dikonsolidasikan setelah render, tanpa polling terus-menerus.
- Menambahkan `disconnect()` untuk lifecycle cleanup dan mencegah observer tertinggal.
- `run()` dibuat idempotent dan mencatat jumlah hide ke `document.documentElement.dataset.dashboardInsightDedup`.
- Tidak menghapus engine/API/source data, tidak mengubah D.transactions, dan tidak menghapus widget domain yang informasinya unik.
- Regression dashboard dedup diperluas menjadi 9/9 PASS.

REKOMENDASI YANG DIIMPLEMENTASIKAN DALAM TAHAP INI
- Satu insight -> satu rumah UI canonical.
- Empty state tidak mengambil ruang jika tidak ada temuan.
- Mirror Advisor/AI tidak tampil ulang bila kontennya sudah ada di Dashboard Hub.
- Deduplikasi lintas presenter dibuat konservatif untuk menghindari false-positive.
- UI yang dirender async tetap terkena cleanup otomatis.
- Source engine/API tetap reusable; cleanup hanya di presentation layer.

VALIDASI v6
- Financial Audit Engine: 11/11 PASS.
- Financial Audit Annotations: 3/3 PASS.
- Financial Audit Presenter: 1/1 PASS.
- Diagnostic Duplicate Transactions: 9/9 PASS.
- Dashboard Insight Dedup: 9/9 PASS.
- Total targeted regression: 33/33 PASS.
- node --check dashboard-insight-dedup.js: PASS.
- node --check app-bundle-b.min.js: PASS.
- node --check scripts/build.js: PASS.
- Local test helper dipakai hanya saat verifikasi dan TIDAK dimasukkan ke ZIP patch.

PATCH v7 — ROLE-BASED DASHBOARD VISIBILITY
------------------------------------------
- Menambahkan prinsip role-based dashboard: setiap halaman hanya menampilkan widget/domain yang sesuai fungsi utamanya.
- Dashboard Hub: overview/cross summary; detail Finance, Vehicle, Shop, Pajak, dan domain lain tidak diduplikasi di Hub.
- Keuangan: hanya widget Finance/keuangan + Audit yang relevan; insight lintas-domain/advisor/cross mirror disembunyikan.
- Car Notes: hanya widget kendaraan, BBM, servis, perjalanan, dan vehicle insight.
- Shop: hanya business engine, kasir, stok, pricing, dan shop insight.
- Aset/Pajak: hanya widget domain masing-masing.
- Visibility bersifat presentation-only: engine, API, transaksi, dan data pengguna tidak diubah.
- Menambahkan restore lifecycle saat berpindah halaman agar widget yang tersembunyi di dashboard sebelumnya muncul kembali di dashboard yang memilikinya.
- MutationObserver memantau perubahan class/DOM agar perpindahan tab/render async tetap terjaga.
- Test tambahan: tests/dashboard-role-visibility.test.js (5/5 PASS).

PATCH v7.1 — FIX WINDOW-EXPOSE (hasil full test)
- modules/finance/financial-audit-presenter.js: tambah window.FinancialAuditPresenter = FinancialAuditPresenter
  (tombol data-action="FinancialAuditPresenter.*" gagal diam-diam tanpa expose; ditangkap tests/verify-window-expose-s423.test.js).
- app-bundle-b.min.js di-build ulang (versi tetap s1877-selftest-persistence-fix-1874, hash 62fb310e0f619cd3).
- Prasyarat: jalankan node scripts/apply-delete-manifest.js (hapus pro-ui-layer.css) di app-main (35).
