# Merge Patch S551 + S552 + S553

File ini adalah gabungan 3 patch (S551, S552, S553) menjadi 1 layer siap-apply,
sudah diselaraskan (S552 superset S551 utk data-health-check.js, S553 di atas
keduanya) -- bukan sekadar ZIP dari 3 file terpisah dicampur.

## Urutan & isi
- **S551** — audit duplikat nama Aset<->Investasi dgn kepemilikan berbeda
  (data-health-check.js, warn-only, murni baca).
- **S552** — badge link resmi Aset<->Investasi (assetId) + orphan check;
  data-health-check.js versi S552 sudah include S551 (superset, dicek diff).
- **S553** — gap lanjutan: Piutang/Utang tertaut ke aset yang bukan
  multi-owner (silent no-op warning).

## File final per patch (apply langsung timpa ke root proyek)
- `data-health-check.js` — versi final (S551+S552+S553 tergabung)
- `modules/shared/modals.js` — versi S552
- `modules/asset/investasi.js` — versi S552
- `modules/asset/investasi-list-view.js` — versi S552
- `modules/asset/aset.js` — versi S552
- `tests/*.test.js` — 4 file test (S551 x1, S552 x2, S553 x1)

## Status
Full suite `node --test tests/*.test.js` di atas tree gabungan sesi550
full-merge + S551 + S552 + S553: **3832/3832 pass, 0 fail**.
