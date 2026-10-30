# S1868 — Perbaikan kontrak test/gate untuk Service Master 102 komponen

Patch kumulatif S1868 asli tetap utuh (semua 61 file manifest + manifest itu
sendiri, termasuk bundle segar `1871`). Yang ditambahkan hanya test/gate; **tidak
ada source runtime maupun bundle yang diubah**.

## Akar masalah
S1863/S1864 mengubah `modules/vehicle/servis-checklist.js` dari 50 item hardcode
menjadi proyeksi `service-master-data.generated.js` (13 grup / **102 komponen**
= 50 legacy KZR + 52 katalog). Test & gate lama masih:
1. menjalankan `servis-checklist.js` di vm tanpa memuat data generated
   (-> 0 grup), atau mem-parse literal `id:`/`linkCat:` dari source (-> 0 item);
2. meng-assert angka 13 grup / 50 item / 44 linkCat / 8 item servis-mesin;
3. `service-sot-integrity-gate.js` (gate rilis, tidak bisa di-override) mencari
   literal `id: 'kampas-rem-depan'` dan menuntut tepat 50 item.

## Perbaikan
- Helper baru `tests/helpers/serviceMasterFixture.js`: memuat data generated,
  membekukan 50 ID legacy (`LEGACY_CHECKLIST_IDS`) dan konstanta master
  (102 item / 13 grup / 44 legacy linkCat / 46 total linkCat).
- 12 test diperbarui (kontrak dipertahankan, tidak dilemahkan): tiap test kini
  memverifikasi **50 legacy tetap utuh + master = 102**, bukan lagi angka 50.
  Registry aturan KZR (`SERVICE_MAINTENANCE_RULES`, 50 aturan) dicek terhadap 50
  ID legacy, tanpa orphan terhadap master.
- `vehicle-core-crud-aibus-vehicle-updated-sesi-c.test.js`: mock elemen DOM diberi
  `dataset`/`querySelectorAll`/`innerHTML` seperti elemen nyata, karena
  `saveVehicle()` kini membaca `#vehMaintenanceTemplateWrap.dataset`.
- `scripts/service-sot-integrity-gate.js`: cek CHECKLIST dan BRAKE membaca grup
  hasil proyeksi (102 item, 50 legacy tidak boleh hilang, ID unik, tanpa orphan
  category) alih-alih regex pada source.

## Verifikasi (salinan bersih app-main (9) + patch ini + delete-manifest)
- Full suite: 7156 / 7156 pass, 0 fail.
- `verify-release-ready.js`: LOLOS (override sandbox: lint, minify).
- `service-sot-integrity-gate`, `sot-integrity-gate`, `verify-bundle-freshness`,
  `verify-window-expose`, `s1860-app-wide-hardening-gate`: PASS.

## Build ulang (tanpa bump versi)
`node scripts/build.js s1868-dynamic-vehicle-maintenance-template-1871` dijalankan
setelah perbaikan test: kedua bundle **identik byte-per-byte** dengan yang sudah
dikirim (hash source `67c41b466b66ff82` / `99055196d029d7bf`), versi tetap 1871.
Yang ikut ter-regenerate hanya `docs/FILE-MAP.md` (384 file) dan
`docs/COVERAGE-PER-MODULE.md` (17 family, 0 tanpa test langsung); keduanya, plus
`docs/RELEASE-GATE-LOG.md`, sudah dimasukkan ke ZIP.
