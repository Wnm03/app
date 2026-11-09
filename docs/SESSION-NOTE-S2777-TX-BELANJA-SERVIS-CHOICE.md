# SESSION-NOTE S2777 — Tautan Keuangan → Servis / Belanja Part: simpan salah satu atau keduanya

Baseline: app-main_6 (build 2776). Build baru: 2777.

## Perilaku akhir
| Centang Stok Sparepart | Centang Servis | Hasil |
|---|---|---|
| ✔ | ✘ | Belanja part saja (stok masuk, tanpa log Servis) |
| ✘ | ✔ | Servis saja |
| ✔ | ✔ | Keduanya (stok masuk lalu auto-link `usedPartId`, net stok 0) |

Sub-kategori Servis tetap mencentang Servis otomatis sebagai default; user bisa mematikannya.

## Perubahan
- `tx-servis.js`: `_txServisAutoActive()`, opt-out, `validateTxServisBeforeSave()`.
- `transaksi.js`: `updateTxVehiclePanels()` memakai `_txServisAutoActive()`; reset pilihan saat konteks/modal berganti.
- `transaksi-b.js`: validasi Servis & Stok SEBELUM mutasi di `_saveTxInner()`.
- `tx-stok-sparepart.js`: `validateTxStockBeforeSave()`.
- Test: `tests/s2777-tx-belanja-servis-choice.test.js` (11).

## Verifikasi
Full suite 9577/9583 (+11 baru). 5 gagal SUDAH ada di baseline app-main_6 (bukan regresi): 3 karena file retired (`DELETE-FILES.txt`) belum dihapus di ZIP — hilang setelah `node scripts/apply-delete-manifest.js`; 2 (`s256au`) karena `docs/screenshots-fase0/after-light.png` tidak ada di ZIP. Build tanpa minify (esbuild tidak tersedia offline).

## Celah terbuka
Lihat bagian OPEN di `docs/BUG_REGISTRY.md` (O-1..O-3).
