# Patch Manifest — v997 / s333-fix-budget-reco-priority-sort

Fix BUG-014 (`modules/finance/budget-recommendation-api.js`) — lihat
`FIX-v997-s333-budget-reco-priority-sort.md` untuk detail lengkap.

## File kode yang diubah (fungsional)
- `modules/finance/budget-recommendation-api.js` — tambah
  `_CATEGORY_PRIORITY` + `_sortBySeverity()`, `spendingAnalysis()`
  mengurutkan `items` sebelum return.

## File test baru
- `tests/budget-recommendation-severity-sort-s333.test.js` (7 test baru)

## File hasil `node scripts/build.js s333-fix-budget-reco-priority-sort`
(otomatis, bukan diedit manual — upload SEMUA supaya versi tetap sinkron)
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `index.html`, `app_production.html`, `sw.js` (?v=997 / CACHE_NAME v997)
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js`
  (APP_BUILD_VERSION -> s333-fix-budget-reco-priority-sort)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerasi otomatis)

## Dokumentasi audit disinkronkan
- `docs/BUG_REGISTRY.md` — BUG-014 -> FIXED, entri Resolved ditambahkan
- `docs/AUDIT_MATRIX.md` §14 — status baris terkait -> FIXED
- `docs/KNOWN-ISSUES.md` §14 — BUG-014 ditandai ✅ FIXED
- `TODO.md` — 2 task BUG-014 -> DONE
- `CHANGELOG.md` — entri Sesi 333 baru
- `CHANGELOG-AUDIT.md` — entri implementasi fix baru
- `FIX-v997-s333-budget-reco-priority-sort.md` — file baru

## Verifikasi
- `node --test tests/*.test.js` -> 2074/2074 PASS (0 fail, 0 regresi)
- `node scripts/build.js s333-fix-budget-reco-priority-sort` -> sukses,
  ?v=997, semua guard regresi lolos, bundle valid, HTML identik
