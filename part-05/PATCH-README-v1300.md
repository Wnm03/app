# PATCH v1299 → v1300 (bump versi deploy + sinkron label build)

## Isi
Cuma bump versi + sinkronisasi label — 0 perubahan logic. Fitur "Porsi Pemilik
(Akun Patungan)" & fix S559 (self-link redundant) sendiri SUDAH ada di source
`app-main` sebelum patch ini; yang belum sinkron cuma angka versi cache/label
build-nya (situs live masih kekunci di v1299 lama).

- `index.html`, `app_production.html` — `?v=1299` → `?v=1300` (9 referensi)
- `sw.js` — `CACHE_NAME`: `kw-cache-v1299` → `kw-cache-v1300` (paksa browser
  ambil ulang semua file, bukan pakai cache lama)
- `modules/shared/modules-render.js`, `modals.js`, `modules-calc.js`,
  `features-helpers-global-security.js` — label versi internal
  (`MODULE_RENDER_VERSION`/`MODAL_VERSION`/`MODULE_CALC_VERSION`/
  `APP_BUILD_VERSION`/`PRODUCTION_BUILD_SYNCED_VERSION`) disamakan ke
  `s569-owner-porsi-tx-assignment` — sebelumnya nyangkut di `s559b-...`,
  bikin diagnostik versi bawaan app sendiri nunjuk "⚠️ Ketinggalan" padahal
  kodenya sudah lebih baru.

## Status
- `node --check` semua file di atas → lolos
- `node --test tests/*.test.js` (dijalankan di source lengkap, bukan cuma
  file patch ini) → 3999 PASS, 7 FAIL — sama seperti sebelum patch ini
  (6 fail pre-existing tak terkait `_ownerNominalText`, + 1 fail
  `data-health-check` follow-up S559 yang MASIH belum di-patch, terpisah
  dari patch ini).

## Cara pasang
Timpa 7 file di atas ke posisi folder yang sama di repo/hosting
(`wnm03.github.io/app/`). Struktur folder di zip ini sudah sama persis
dengan repo.
