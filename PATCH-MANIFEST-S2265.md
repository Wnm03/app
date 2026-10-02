# Patch Manifest — S2265 (kumulatif S2262 → S2265)

Baseline: `app-main (50).zip`.

## Delta S2265 (memperbaiki 2 regresi tes dari S2263/S2264)
- `modules/shared/modules-render-b.js`: `renderServiceIntegrityCard()` membungkus audit tunggal dengan profil `carnotes.audit.service` (tanpa pemanggilan audit ganda); branch Servis memanggil `Sparepart.repairCategoryProjection()` sebelum presenter.
- `modules/vehicle/sparepart-servis.js`: method baru `repairCategoryProjection()` (ensureCanonical + reconcileLegacyCategoryProjection, idempoten, memo per kendaraan/jumlah kategori). `renderCatList()` tetap presenter murni (kontrak S2263). Sebelumnya repair ini terhapus dan tidak dipanggil di mana pun.
- `tests/s2170-reminder-sot-recovery-regression.test.js`: kontrak diperbarui ke desain render-purity (reconcile di repair eksplisit, bukan di presenter).

## Status gate (dijalankan)
- Full suite: 8226/8233 PASS. 6 gagal = identik dengan baseline (source-size, carnotes-persistence-recovery-1745, flush >3MiB, PWA recovery contract, S2252 GROUP_B, S2275 cache). Tidak ada regresi baru.
- Car Notes performance guard: PASS. Car Notes integrity: PASS (517 scanned, 0 forbidden, 0 duplicate IDs).
- Build produksi: BELUM dijalankan (esbuild tidak tersedia). Bundle masih basi; jalankan `npm run build` lalu `npm run verify-bundle` sebelum deploy.
