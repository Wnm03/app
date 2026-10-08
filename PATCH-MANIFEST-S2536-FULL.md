# PATCH-MANIFEST-S2536-FULL — kumulatif S2530 + S2531 + S2532–S2536 (non-SOT)

Baseline: `app-main.zip` polos (runtime v2272). Patch ini SUDAH memuat S2530 dan S2531; jangan diterapkan ulang di atasnya.
Terapkan: timpa ke root app-main, hapus path di DELETE-FILES.txt, lalu `node scripts/build.js` dan `python3 scripts/refresh-file-hashes.py --write`.

## Temuan penting saat akumulasi
Patch S2532–S2536 sebelumnya dibangun dari file BASELINE POLOS untuk `fuel-dashboard.js`, `fuel-trend-dashboard.js`, `fuel-compare.js`. Jika S2530/S2531 diterapkan lebih dulu lalu patch itu ditimpa, filter ownership `isVehicleOwnershipSelf` kembali dan tab BBM > Analisis Lanjutan kosong lagi untuk kendaraan non-SELF. Ketiga file di sini adalah hasil merge 3 arah (0 konflik): S2530/S2531 + S2532–S2536. `fuel-fleet-selector.js` dan `fuel-intelligence-engine.js` dibawa dari S2530.

## Test yang disesuaikan (kode lama terkunci oleh test)
- `fuel-dashboard.test.js`: tombol CTA 3→4 (N16 tombol Export JSON).
- `dashboard-hub-goto-subtab.test.js`: `lifeOSWrap` dan `dashHubSummaryGrid` dipensiunkan dari peta goTo (N2/N6) → null.
- `dashboard-performance-hardening.test.js`: pembaca tab lewat `readDashboardHubSectionTab` (N1).
- `audit-nonsot-s2535-n5.test.js`: pemindai mengabaikan `backups/` dan `.test-checkpoints/` (artefak build).

## Verifikasi (baseline polos + patch ini + build dev + refresh hash)
- Full suite (`scripts/run-full-test.js`, 32 shard): 8688 tests, 8687 pass, 0 fail, 1 skipped.
- `verify-window-expose`: OK (83 modul). `audit:duplicates`: exit 0. Sintaks JS berubah: OK.
- NOT VERIFIED: ESLint (tidak terpasang, tanpa jaringan), build minify (esbuild tidak tersedia).
- Tidak ada perubahan SOT/schema/hitungKas/ownership tersimpan/commit-rollback/canTransition.
