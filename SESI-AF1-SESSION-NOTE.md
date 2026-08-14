# Sesi AF1 — Auto-fill Sisa Porsi (Remaining Allocation)

Ref: `DESIGN-LOCK-autofill-sisa-porsi.md` (dikunci di chat sebelumnya).
Label "AF1" dipakai supaya tidak bentrok dgn nomor sesi utama project (S583/Sesi 9 sedang berjalan) —
sesuaikan ke nomor sesi resmi saat digabung ke riwayat utama.

## Yang dikerjakan
- **Util baru** `calculateRemainingShare(rows, editedIndex)` di `modules/shared/modules-calc.js`
  (PURE, 0 DOM) — SSOT dipakai 3 modal porsi kepemilikan. Cari baris pertama SELAIN yang baru
  diedit yang porsinya masih kosong/0 & belum pernah diketik manual (`_touched`), isi dgn
  `100% - total baris lain` (clamp ≥0, presisi 4 desimal).
- **`investmentOwnersModal`** (`modules/asset/investasi-view.js`, `InvestmentUI`) — modal di
  screenshot user. Ditambah `_applyRemainingShare()`, dipanggil dari `onOwnerPorsiInput()` DAN
  `onOwnerNominalInput()` (sebelumnya modal ini 0 auto-fill sama sekali).
- **`assetOwnersModal`** (`modules/asset/aset.js`, `Aset`) — ditambah `_applyRemainingShare()`,
  dipanggil dari `onOwnerPorsiInput()` (baru) & `onOwnerNominalInput()` (ganti trigger dari
  `_autoDistributeRemaining()` lama). `_autoDistributeRemaining()` **TIDAK dihapus** — fungsi &
  test S431/S449/S457 yang memanggilnya langsung tetap valid, cuma tidak lagi auto-terpanggil dari
  `onOwnerNominalInput()`.
- **`accountOwnersModal`** (`modules/finance/akun.js`, `AccOwners`) — versi porsi-only (modal ini
  tidak punya kolom Nominal Rp), wired di `onPorsiInput()`.

## TIDAK disentuh (sesuai Design Lock)
- `billSharedPct`/`txCicilanSharedPct` (skema 2 pihak implisit).
- Rumus konversi %↔Rp presisi 4 desimal (S457) — reuse persis, 0 rumus baru.
- `MODULE_CALC_VERSION` & konstanta versi lain — TIDAK di-bump di patch ini (bukan build resmi via
  `scripts/build.js`/`bumpVersionEverywhere()`), supaya tidak membuat state versi tidak sinkron.
  Jalankan build resmi sebelum/saat merge ke riwayat sesi utama.

## Verifikasi yang sudah dilakukan (sandbox, tanpa build/test runner project)
- `node --check` lolos untuk 4 file yang diubah (syntax valid).
- **Belum dijalankan**: `node --test tests/*.test.js` (test runner project tidak dieksekusi di sesi
  ini) — wajib dijalankan sebelum merge, terutama:
  - Regresi `tests/asset-owners-nominal-autodistribute-s431.test.js`,
    `...-proportional-s449.test.js`, `...-precision-s457.test.js` (harus tetap lolos, fungsi lama
    tidak dihapus).
  - Test baru disarankan (belum ditulis): `calculateRemainingShare()` pure (2 baris, 3+ baris,
    semua touched, sisa≤0), + wiring per modal (Porsi & Nominal, termasuk round-trip nominal bulat
    seperti didiskusikan di chat: 1.700.000 / 500.000 / 74.136 di berbagai skala nilai).

## File dalam ZIP
- `modules/shared/modules-calc.js`
- `modules/asset/aset.js`
- `modules/asset/investasi-view.js`
- `modules/finance/akun.js`
- `SESI-AF1-SESSION-NOTE.md` (file ini)

Struktur folder di dalam ZIP mengikuti path relatif repo — tinggal extract & overwrite ke root
project sebelum upload manual ke GitHub.

## Next
- Jalankan `node --test tests/*.test.js` penuh, tulis test baru untuk `calculateRemainingShare()`.
- Jalankan `scripts/build.js` resmi (bump versi bundle + `MODULE_CALC_VERSION` dkk).
- Opsional: evaluasi apakah `_autoDistributeRemaining()` di `aset.js` sekarang dead code dari sisi
  UI (hanya dipanggil dari test) — putuskan apakah dihapus di sesi lanjutan atau dipertahankan.
