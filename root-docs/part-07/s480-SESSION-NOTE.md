# Sesi 480 (Koreksi Stok / Stok Opname — gap test Backup & Restore)

## Konteks

Fitur Koreksi Stok/Opname (S478, `stockKoreksiState` di `cobek-etalase.js`)
menulis log ke `D.productStockCorrections` (array baru di `D`, didaftarkan
di `features-helpers-global-security.js` — default awal + self-heal
`if(!D.productStockCorrections) D.productStockCorrections=[]` di `init()`,
pola SAMA PERSIS `inventoryTransfers`/`purchaseOrders` sebelumnya). Source
sudah lengkap & sudah aktif di build (`APP_BUILD_VERSION='s480-stok-koreksi-opname'`),
tapi field ini belum pernah disentuh oleh test suite Backup & Restore
(`tests/backup-restore-regression-s266.test.js`) — audit ulang.

## Audit (sebelum nulis test)

- `buildBackupPayload()`: pakai `{...D}` generik → `productStockCorrections`
  otomatis ikut export, TIDAK butuh pendaftaran manual (beda dari
  `_lifeosStore`/`_eieStore`/dst yang memang di IndexedDB terpisah).
- `applyRestoredData()`: merge `D={...D,...imp}` generik juga → field ini
  otomatis ikut restore.
- `applyRestoredDataMigrations()`: TIDAK mendefault field ini (dicek —
  `inventoryTransfers`/`purchaseOrders`/`productMovementOverride` juga
  TIDAK ada di sana). Bukan bug baru — polanya memang mengandalkan
  self-heal `init()` global (di luar cakupan modul backup-restore.js) utk
  ketiga field shop ini, bukan `applyRestoredDataMigrations()`.
- **Kesimpulan**: TIDAK ADA bug/data-loss nyata. Gap-nya murni **test
  coverage** — regression suite backup tidak punya bukti eksplisit bahwa
  `productStockCorrections` selamat lewat siklus backup→restore, jadi
  rawan lolos tak terdeteksi kalau suatu saat `buildBackupPayload()`
  diubah jadi whitelist eksplisit (pola yg sudah dipakai utk
  `_lifeosStore` dkk).

## Perubahan

- `tests/backup-restore-regression-s266.test.js`:
  - `makeD()`: tambah 1 entry sampel `productStockCorrections` (pola
    komentar sama seperti field shop lain di fixture ini).
  - Test round-trip utama (`buildBackupPayload()->...->applyRestoredData()`):
    tambah assertion panjang array & `delta` tetap utuh setelah
    backup→restore.
  - Test baru: `productStockCorrections ikut buildBackupPayload()` +
    verifikasi restore backup LAMA (belum punya field ini sama sekali)
    tetap `ok:true`, tidak crash.
- Tidak ada perubahan source (`modules/shared/backup-restore.js`,
  `modules/shop/cobek-etalase.js`, dll) — murni test, karena source
  sudah benar sejak S478.

## Verifikasi

- `node --test tests/backup-restore-regression-s266.test.js` → 22/22 pass
  (20 lama + 2 baru).
- `node --test tests/*.test.js` → **3063/3063 pass**, 0 fail (full suite,
  tidak ada regresi di modul lain).

## Lanjutan (sama sesi): gap sejenis di 3 field lama

`inventoryTransfers`/`purchaseOrders`/`productMovementOverride` (S377/S378)
punya gap test PERSIS sama — dicek, TIDAK ada di `makeD()` fixture atau
assertion round-trip manapun sebelum sesi ini, padahal polanya identik
(self-heal via `init()` global, generic spread, bukan lewat
`applyRestoredDataMigrations()`). Ditutup sekalian sesi ini:

- `makeD()`: tambah sampel `inventoryTransfers`/`purchaseOrders`/
  `productMovementOverride`.
- Round-trip test utama: tambah assertion ketiganya.
- Test baru: `inventoryTransfers/purchaseOrders/productMovementOverride
  (S377/S378) — ikut buildBackupPayload() & backup lama tanpa field ini
  tidak crash saat restore`.

## Verifikasi (final)

- `node --test tests/backup-restore-regression-s266.test.js` → **23/23
  pass** (20 baseline + 3 baru: 1 `productStockCorrections` + assertion
  round-trip + 1 gabungan 3-field).
- `node --test tests/*.test.js` → **3064/3064 pass**, 0 fail — full suite,
  tidak ada regresi modul lain.

## Yang BELUM ditangani

- Tidak ada gap test tersisa yang diketahui di domain field-baru Shop
  (`productStockCorrections`/`inventoryTransfers`/`purchaseOrders`/
  `productMovementOverride`) untuk modul backup-restore.js. Audit test-
  coverage domain LAIN (di luar Shop) di luar cakupan sesi ini.
