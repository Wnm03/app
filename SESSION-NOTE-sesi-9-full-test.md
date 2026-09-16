# Full Test Report — patch-oversized-build-sesi-9-cumulative

## Metode
1. Extract `app-main__17_.zip` sebagai baseline.
2. Overlay `patch-oversized-build-sesi-9-cumulative.zip` (11 file) ke baseline.
3. `node --test tests/*.test.js` (787 file, 6846 test) pada baseline murni DAN pada hasil overlay, dibandingkan.
4. `node scripts/build.js` pada keduanya.

## Hasil awal (sebelum fix sesi ini)
- Baseline murni (tanpa patch): 6843/6846 pass, 3 fail (pre-existing, tidak terkait migrasi ini):
  - `SA13: APP_BUILD_VERSION, semua ?v= di HTML, dan CACHE_NAME sw.js sinkron`
  - `S1731: every Car Notes Pro data-action resolves to an implementation`
  - `1718 mockup uses dedicated component classes, not theme-only styling`
- Setelah overlay patch (sebelum fix): 6840/6846 pass, 6 fail — 3 pre-existing di atas + **3 regresi baru dari migrasi**:
  1. `service-hardening-v36.test.js` — comment block `// V36: lifecycle and finance projections are independent...` ikut hilang saat servis.js dipecah/ditulis ulang; helper `readCarNotesSource()` gagal menemukannya.
  2. `service-zero-cost-v13.test.js` — comment block `// v13: servis Rp0 tetap menjadi Service Event...` juga hilang di lokasi berbeda pada file yang sama.
  3. `s1608-modules-modals-orphan-guard.test.js` — sub-test terakhir gagal karena entri `{ file: 'modules/shared/modals.js', varName: 'MODAL_VERSION' }` memang **pindah** ke `scripts/build-core.js` (bagian dari migrasi build.js), tapi test lama cuma baca `scripts/build.js`.

Catatan: kedua comment yang hilang (poin 1 & 2) murni komentar dokumentasi — 0 perubahan logic/behavior di sekitarnya. Kemungkinan besar tergerus saat proses mekanis pemecahan file.

## Fix diterapkan (di ZIP ini)
- `modules/vehicle/servis.js`: comment V36 & v13 dikembalikan persis seperti baseline, tanpa mengubah kode apa pun di sekitarnya.
- `tests/s1608-modules-modals-orphan-guard.test.js`: `BUILD_SRC` sekarang menggabungkan isi `scripts/build.js` + `scripts/build-core.js`, supaya guard test tetap valid setelah migrasi split.

## Hasil akhir (setelah fix)
- `node --test`: **6843/6846 pass** — persis sama dengan baseline murni (3 fail sisanya pre-existing, di luar scope patch ini).
- `node scripts/build.js`:
  - ✓ Warning "file .js lewat 1600 baris" **hilang total** — tujuan migrasi (split 5 file oversized) tercapai.
  - ❌ Build tetap berhenti di `verifyVersionConstantsSynced()`: `chat-action-handlers.js` punya `MODULE_FEATURES_VERSION` yang sudah menyimpang (`'s750-carnotes-cleanup-audit-baseline-1754'`) dari daftar versi-sync 5 file lain. **Ini bug pre-existing, identik persis di baseline tanpa patch — bukan disebabkan migrasi sesi 9.** Di luar scope "1 sesi 1 file source" utk sesi ini; perlu sesi terpisah utk `chat-action-handlers.js`.

## Isi ZIP
Sama seperti patch asli (11 file) + 2 file diperbaiki + catatan sesi ini.
