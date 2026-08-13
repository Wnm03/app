# MERGE NOTES — gabungan patch s594 + s596 + s597 + s598 + s599

Patch ini adalah gabungan 5 patch sesi (diterapkan sesuai urutan sesi,
versi terbaru menang jika ada file yang sama):

1. patch-s594-migrated-asset-doublecount
2. patch-s596-migrate-titipan-tests-to-production-file
3. patch-s597-port-sesi-c-expense-comparison
4. patch-s598-r5-presenter-split-realized
5. patch-s599-fix-91-test-harness-drift

## Isi final (setelah overlay + resolusi konflik)

- `modules/finance/dana-titipan-aggregation-api.js` (baru, dari s598)
- `modules/finance/dana-titipan-commitment-return-api.js` (baru, dari s598)
- `modules/finance/dana-titipan-portfolio-render.js` (baru, dari s598)
- `modules/shared/modules-render.js` (dari s598)
- `scripts/build.js` (dari s598)
- 62 file `tests/*.test.js` (gabungan s596/s597/s598/s599, versi terbaru per file)

## PENTING — file yang SENGAJA dihapus dari hasil gabungan ini

`modules/finance/dana-titipan-portfolio-presenter.js` — file ini ada di
versi s594/s597, tapi **s598 menggantikannya** dengan 3 file split di
atas dan secara eksplisit menginstruksikan penghapusan file monolit ini
(lihat `docs/CHANGED-FILES-s598.txt` & `docs/FIX-s598-r5-presenter-split-realized.md`).
Karena itu file ini TIDAK disertakan dalam patch gabungan ini — pastikan
file lama ini juga terhapus di repo Anda setelah menimpa dengan patch ini.

## Langkah setelah menimpa file dari patch ini ke repo

1. Hapus manual (jika masih ada): `modules/finance/dana-titipan-portfolio-presenter.js`
2. `node --test tests/*.test.js` → harus 4055 pass, 91 fail (pre-existing,
   tidak terkait Dana Titipan — lihat `docs/FIX-s599-91-test-failures-harness-drift.md`)
3. `node scripts/build.js` → regenerasi bundle & versi otomatis

## Dokumentasi asli tiap sesi

Disertakan apa adanya di folder `docs/` untuk referensi/audit trail.
