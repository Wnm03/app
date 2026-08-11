# PATCH — Sinkronisasi repo GitHub ke S531 Full Release

Patch ini dibuat dari perbandingan byte-per-byte antara isi repo GitHub yang
diupload (`repo-main__5_.zip`) dengan state full release terkini
(`S531-FULL-RELEASE.zip`, hasil sesi S519–S531: fitur Ride/GPS Recorder
lengkap S522–S530 + fix collision `create()` di S531).

Cara pakai: extract isi zip ini ke root repo, timpa/tambahkan sesuai struktur
folder (folder `modules/`, `tests/`, `docs/` sudah disertakan apa adanya).
Tidak perlu jalankan `node scripts/build.js` lagi — `app-bundle-a.min.js`
dan `app-bundle-b.min.js` di patch ini SUDAH hasil build fresh (lolos
`verify-bundle-freshness.js` dan `npm test` 3704/3704 PASS).

## 1. FILE YANG DIUBAH (14 file — isi beda dari repo GitHub Anda)

Ini bukan cuma fitur Ride — juga mencakup selisih sesi-sesi sebelumnya yang
rupanya belum ter-sync ke repo GitHub (mis. `dana-titipan-portfolio-presenter.js`,
`scripts/build.js`, versi HTML/sw.js):

- `app-bundle-a.min.js`
- `app-bundle-b.min.js`
- `app_production.html`
- `chat-action-handlers.js`
- `docs/COVERAGE-PER-MODULE.md`
- `docs/FILE-MAP.md`
- `index.html`
- `modules/finance/dana-titipan-portfolio-presenter.js`
- `modules/shared/features-helpers-global-security.js`
- `modules/shared/modals.js`
- `modules/shared/modules-calc.js`
- `modules/shared/modules-render.js`
- `scripts/build.js`
- `sw.js`

## 2. FILE BARU (23 file — belum ada sama sekali di repo GitHub Anda)

Modul Ride/GPS Recorder (S522–S530) tidak ada sama sekali di repo GitHub
yang diupload — berarti fitur Ride belum pernah ter-push:

- `modules/vehicle/ride-activity-metrics.js`
- `modules/vehicle/ride-gps-recorder.js` (sudah termasuk fix collision `create()` S531)
- `modules/vehicle/ride-history.js`
- `modules/vehicle/ride-map.js`
- `modules/vehicle/ride-storage.js`
- `modules/vehicle/ride-ui.js`
- `modules/vehicle/ride-vehicle-integration.js`
- `tests/helpers/fakeIndexedDB.js`
- `tests/ride-activity-metrics.test.js`
- `tests/ride-gps-recorder.test.js` (sudah termasuk test regresi collision S531)
- `tests/ride-history.test.js`
- `tests/ride-map.test.js`
- `tests/ride-storage.test.js`
- `tests/ride-ui.test.js`
- `tests/ride-vehicle-integration.test.js`
- `tests/s523a-owner-identity-duplicate-orphan-audit.test.js`
- `tests/s523b-titipan-owner-creation.test.js`
- `tests/s523c-commitment-delete-vs-owner-linkage.test.js`
- `tests/s523f-aggregation-duplicate-linkage-audit.test.js`
- `S523-B-SESSION-NOTE.md`
- `S523-C-SESSION-NOTE.md`
- `S523-FINAL-REPORT.md`
- `S523-H-REPORT.md`

## 3. FILE YANG ADA DI REPO GITHUB TAPI TIDAK ADA DI RELEASE (15 file)

**TIDAK disertakan di patch ini** (zip patch cuma bisa nambah/timpa, bukan
hapus). Supaya repo Anda **persis** sama seperti release, file-file ini
sebaiknya dihapus manual dari repo setelah patch di-apply — silakan review
dulu sebelum hapus, terutama 5 file di `modules/shop/` yang terlihat seperti
salinan nyasar (nama file sama persis dengan yang ada di `modules/shared/`,
tapi lokasinya di `modules/shop/` — kemungkinan besar sisa copy-paste lama
yang tidak lagi dipakai build.js manapun):

- `ADDED-FILES.txt`
- `CHANGED-FILES.txt`
- `FIX-v1108-to-v1111-s404-lint-overlay-open-reflow-guard.md`
- `PATCH-INFO.md`
- `PATCH-README-KONSOLIDASI-s484gabungan-to-s487.md`
- `PATCH-README-s481.md`
- `PATCH-README-s488.md`
- `README-PATCH-UPDATE-s496-to-s509c.md`
- `REMOVED-STALE-FILES-MANUAL.txt`
- `lifeos/adapters/s456-goal-adapter-exclude-titipan.test.js`
- `modules/shop/features-helpers-global-security.js` ⚠️ kemungkinan file nyasar
- `modules/shop/modals.js` ⚠️ kemungkinan file nyasar
- `modules/shop/modules-calc.js` ⚠️ kemungkinan file nyasar
- `modules/shop/modules-render.js` ⚠️ kemungkinan file nyasar
- `modules/shop/multi-owner-engine.js` ⚠️ kemungkinan file nyasar

## 4. Setelah apply patch

1. Timpa/tambahkan 37 file di zip ini ke repo.
2. (Opsional, disarankan) Hapus 15 file di poin 3 setelah direview.
3. Jalankan `npm test` — harus 3704/3704 PASS.
4. Jalankan `node scripts/verify-bundle-freshness.js` — harus exit 0.
