# Merge Note — patch-s552 (nominal dua arah) + patch-v1289 (s545–s553 modal sweep)

## Alasan merge
Kedua zip sumber sama-sama berupa *partial patch* (bukan full repo) yang
tumpang-tindih pada beberapa file bundle/shared. Pengecekan versi build
membuktikan urutannya:

- `patch-s552-investasi-nominal-bidirectional.zip` → build **s556**
  (`sw.js` cache `kw-cache-v1288`, `MODAL_VERSION='s556-modal-sweep-datahealth-fixes'`)
- `patch-v1289-s545-s553-modal-datahealth-gapfix.zip` → build **s557 / v1289**
  (`sw.js` cache `kw-cache-v1289`, `MODAL_VERSION='s557-modal-sweep-datahealth-fixes'`)

v1289 dibangun **setelah** s552, dan bundle-nya (`app-bundle-a/b.min.js`,
`app_production.html`, `index.html`, `sw.js`) sudah mengandung hasil compile
dari `investasi-view.js` versi s552 (diverifikasi lewat penghitungan marker
fungsi `assetInvestmentId`/investasi-view di kedua bundle — jumlahnya
konsisten). `modules/shared/modals.js` versi v1289 juga sudah memuat semua
elemen dari s552 (`investmentOwnersModal`, dst) ditambah fix baru sesi
v1289 (`assetOwnersBtn`, `assetInvestmentId` dropdown, `assetOwnersEditControls`).

## Strategi merge
1. **Base = v1289** (lebih baru, superset untuk semua file yang beririsan):
   `modals.js`, `features-helpers-global-security.js`, `modules-render.js`,
   `modules-calc.js`, `data-health-check.js`, `chat-action-handlers.js`,
   `app_production.html`, `index.html`, `sw.js`, `app-bundle-a.min.js`,
   `app-bundle-b.min.js`, `docs/COVERAGE-PER-MODULE.md`, `docs/FILE-MAP.md`.
2. **Ditambahkan dari patch-s552** (tidak ada di zip v1289 karena file ini
   memang tidak disentuh di sesi v1289, tapi tetap dibutuhkan sbg source
   asli — bundle sudah punya versi compiled-nya, source terpisah ini yang
   belum ada di v1289):
   - `modules/asset/investasi-view.js`
   - `tests/s552-investment-owners-nominal-bidirectional.test.js`

## Cara pakai
1. Extract folder `repo-main/` di zip gabungan ini, timpa (overwrite) semua
   file dengan nama yang sama di repo kamu.
2. **Hapus manual** `tests/s551-investment-owners-nominal-readonly.test.js`
   kalau masih ada di repo (sudah digantikan test s552 — field Nominal
   sudah bukan read-only lagi sejak s552).
3. Jalankan full test suite untuk konfirmasi 3936/3936 PASS.
4. Commit & push seperti biasa.
