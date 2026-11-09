# SESSION-NOTE S2779 — Validasi sebelum simpan & lepas tautan panel BBM / Penjualan Shop / Renovasi

Kumulatif di atas S2778 (build 2778 → 2779). Baseline: app-main_6 + PATCH-S2778.

## Pola A — validasi gagal setelah transaksi tersimpan (BUG-032, BUG-033)
| Panel | Perubahan |
|---|---|
| BBM | `validateTxBbmBeforeSave()` (tx-bbm.js), dipanggil di `_saveTxInner()` sebelum mutasi |
| Penjualan Shop | `txShopSalePrecheck()` kini menolak daftar kosong (sebelumnya `ok:true`) |
| Stok Shop | TIDAK diubah: `txShopStockPrecheck()` (S2433-A) sudah menolak daftar kosong; guard di `applyTxShopStockFromTx()` hanya defensif |

## Pola B — centang dimatikan pada transaksi tertaut (BUG-034, BUG-035)
- BBM: konfirmasi → log BBM dihapus + `reconcileFuelStateFromLogs()` (pola `delTx`), `bbmLinkId` dilepas.
- Renovasi: konfirmasi → item proyek kembali **belum lunas** (tidak dihapus; pola `Renov.onLinkedTxDeleted`), tautan dilepas.
- Konfirmasi memakai dialog S2778 yang sama (satu dialog memuat semua tautan yang dilepas).
- Pelepasan dijalankan sebelum sinkron dasar `bbmLinkId`/`Renov.onLinkedTxEdited` di cabang edit, supaya tidak ter-sync ulang.
- Rollback edit: `_serviceEditSnapshot` memuat `bbmLogs`/`renovProjects` (hanya bila unlink diminta) dan memulihkan + merekonsiliasi fuelState bila simpan gagal.
- Gate jalur: `curPayMethod==='tunai'&&!existingBill`.

## Tidak dikerjakan (S2780)
Pola B Stok Shop & Penjualan Shop (stok produk/piutang) — lihat bagian OPEN `docs/BUG_REGISTRY.md` (O-4).

## Verifikasi
- `tests/s2779-tx-panel-validate-unlink.test.js` (7) PASS.
- Full suite: 9596 tes, 9590 lulus, 5 gagal = baseline yang sama dgn S2778 (3 file retired belum dihapus via `apply-delete-manifest`, 2 `s256au` karena `after-light.png` tidak ada di ZIP). Bukan regresi.
- Build dengan esbuild (diminify), cek sintaks bundle lolos, `verify-window-expose` OK, eslint 0 error.
- Belum diuji di browser nyata (alur edit → matikan centang → konfirmasi → simpan); hanya unit/source-order test.
