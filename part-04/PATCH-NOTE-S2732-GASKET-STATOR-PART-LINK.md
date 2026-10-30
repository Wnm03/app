# PATCH S2732 — Tautan Gasket Stator Base ×2 → part katalog 11363KWN900

Hanya DATA (tanpa perubahan kode app, tanpa rebuild, build tetap 2697). Overlay di atas PATCH-S2731.

- Log 1782820344534 (Rp35.000) & 1782820344535 (Rp15.000): `catalogPartRefs = [{catalogId:"1791851003804", qty:1}]`.
- Restore backup: pakai `data-fix/…-S2731-FIXED-S2732.json` (checksum disegel ulang, valid).

## Efek stok — hasil telaah kode
- Stok hanya dipotong lewat jalur simpan/edit app (`Servis.applyStockUsages` saat simpan baru; `replaceStockUsages` saat edit sesi). Skrip data tidak memanggilnya → `partsStock` identik byte-per-byte (diuji).
- Stok part ini 0 (`st_1792734467118`, katalog 1791851003804). Jika tautan ini dibuat lewat UI, simpan akan DITOLAK `INSUFFICIENT_STOCK` — itu alasan tautan ditulis lewat data-fix.
- Hapus log mengembalikan stok hanya dari `usedPartId`/`catalogPartLinkedStockId` (sengaja dibiarkan null) → hapus log tidak menambah stok palsu.
- Edit sesi tanpa mengubah ref → selisih stok 0. Edge case: bila komponen ini DIHAPUS lewat editor sesi, `replaceStockUsages` akan menambah +1 ke stok (tidak pernah dipotong). Hindari, atau koreksi stok manual.
- Baris stok kembar `st_1785394924536_dup178` (katalog 1785394918140, tidak ada di katalog) tidak ikut terpengaruh; layak dirapikan terpisah.

## Berkas
scripts/link-gasket-stator-base-part-s2732.js · tests/s2732-gasket-stator-base-part-link-stock-safe.test.js (4 tes lulus) · data-fix/…-S2732.json · data-fix/laporan-perubahan-S2732.json
