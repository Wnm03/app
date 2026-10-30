# Merge S551 + S552 → Patch Gabungan

Patch ini menggabungkan 2 patch sesi berurutan (S552 dibangun tepat di atas
S551, lihat catatan di s552-SESSION-NOTE.md):

## Isi gabungan
- `modules/asset/investasi-view.js` — dipakai versi S552 (SUDAH termasuk
  semua perubahan S551 `_ownerNominalText`/`_updateOwnerNominalDisplay`
  DITAMBAH perubahan S552 `_findLinkCandidate`/`_renderLinkBanner`/
  `applySamakanPorsiFromAsset`/`dismissLinkBanner`). Diverifikasi: source
  S552 mengandung seluruh marker fungsi S551 (9 match) + marker fungsi
  S552 (19 match).
- `modules/shared/modals.js` — dipakai versi S552 (identik S551 + 1 baris
  tambahan `#investmentOwnersLinkBanner` di `investmentOwnersModal`).
- `tests/s551-investment-owners-nominal-readonly.test.js` — dari S551 (7 test).
- `tests/s552-banner-samakan-porsi.test.js` — dari S552 (11 test).
- File lain (`app_production.html`, `index.html`, `sw.js`,
  `app-bundle-a.min.js`, `app-bundle-b.min.js`, `chat-action-handlers.js`,
  `features-helpers-global-security.js`, `modules-render.js`,
  `modules-calc.js`, `package.json`, docs) — dari S551 (S552 tidak
  menyertakan ulang file-file ini di patchnya).

## Verifikasi yang sudah dilakukan di sandbox ini
- `node --check` PASS untuk `modals.js` & `investasi-view.js` gabungan.
- Tidak bisa menjalankan `node --test` penuh (test butuh
  `tests/helpers/loadSource` & modul lain dari basis kode lengkap yang
  tidak ikut ke-upload di kedua ZIP patch — sandbox ini cuma nerima 2
  ZIP patch, bukan seluruh repo).

## ⚠️ BELUM dikerjakan — WAJIB sebelum rilis
Sesuai catatan S552 sendiri: **bundle belum di-rebuild** dari source hasil
merge ini. `app-bundle-a.min.js`, `app-bundle-b.min.js`, `app_production.html`,
`index.html` di patch ini masih versi S551 (BELUM mengandung perubahan
banner S552 di `investasi-view.js`/`modals.js`). Jalankan
`node scripts/build.js` di basis kode penuh (device kamu, bukan sandbox ini)
supaya bundle & versi (`?v=`, `CACHE_NAME`) tersinkron dengan source gabungan
di atas, baru rilis.
