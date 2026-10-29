# PATCH S2741 — audit lanjutan UI 360px (build 2715, di atas S2740)

Hanya presentasi/render; tidak menyentuh SOT atau data. Rujukan: AUDIT-LANJUTAN-UI.md.

- L1 Shop › Etalase: `+ Tambah` tidak lagi menyusut/terpotong (`flex:0 0 auto`, input `min-width:0`).
- L2 Shop › Laporan: baris insight yang bisa diklik min-height 36px (HP).
- L3 Keuangan: 10 grid presenter (findash, forecast, budgetReco, cashflowProj, financialGoal, investPlanner, debtOptimizer, retirementPlanner, healthScore, riskDashboard) melewati penulisan bila HTML identik dgn render terakhir; cache direset di state kosong.
- L4 `populateCatSelect`, `populateSubSelect`, `populateServiceFilterSelects`: opsi tidak ditulis ulang bila identik (nilai terpilih tetap dijaga).
- L5 `Pensiun.render`: lewati penulisan identik.
- L6 `Kekayaan.renderSnapshots`: lewati penulisan daftar identik (ringkasan CAGR tetap dihitung).
- L7 Target sentuh (HP): chip Kasir 36px, `cn-summary-link` min-width 36px, angka ringkasan yang bisa diklik area tekan 36px tanpa menggeser layout. Checkbox Car Notes tidak diubah (sudah dibungkus label).
- L8 nilai ekstrem 13 digit: tidak diubah (risiko rendah).

Terapkan: salin semua file di ZIP ke root proyek (timpa). Tidak ada file yang dihapus.
