# FIX v1152 -> v1153 (s437) — Ownership akun tertaut tidak ikut sync ke ownership aset

## Konteks

Lanjutan audit "porsi kepemilikan & ownership harus jadi fitur dengan data
tunggal (single source of truth)" — OwnershipEngine (Sesi 191/192/231) sudah
jadi SSOT untuk 5 tipe kepemilikan (SELF/INVESTOR/CUSTOMER/THIRD_PARTY/
FAMILY) di Akun & Aset masing-masing sebagai entity independen. Tapi untuk
Aset yang **ditautkan** ke Akun transaksi (`assetAccId`), ownership akun
tertaut itu ternyata TIDAK selalu ikut mengikuti ownership aset — jadi di
titik tautan itu OwnershipEngine berhenti jadi single source of truth.

## Root cause

Ada 2 jalur yang mengubah/menautkan akun ke aset, dan cuma 1 dari 3 titik
sync ownership yang benar:

1. `Aset.save()`, opsi `assetAccId === "__new__"` (buat akun baru dari
   aset) — **BENAR**, akun baru langsung diisi `ownership` dari dropdown
   aset (fix Sesi 311).
2. `Aset.save()`, menautkan ke akun yang **SUDAH ADA** (`accountId &&
   !_createdNewAcc`) — blok ini cuma resync `baseBalance`/`balance` akun
   tertaut, `ownership` akun TIDAK ikut disamakan. Kalau akun lama itu
   sebelumnya SELF/default & aset yang menautkannya INVESTOR, akun tetap
   kebaca SELF (ikut Total Saldo Kas, padahal seharusnya dikecualikan).
3. `Aset.saveOwners()` (modal ⚖️ Atur Porsi Kepemilikan) — sejak Sesi 422e
   sudah resync `baseBalance`/`balance` akun tertaut ke porsi baru, tapi
   `ownership` akun juga tidak ikut disamakan di sini.

## Perbaikan

- `Aset.save()`: di blok sync akun EXISTING, tambah
  `linkedAcc.ownership=ownership;` (variabel `ownership` = hasil baca+
  normalisasi dropdown `#assetOwnership` yang sudah ada di fungsi ini),
  guard `typeof OwnershipEngine!=='undefined'`.
- `Aset.saveOwners()`: di blok sync akun tertaut, tambah
  `linkedAcc.ownership=OwnershipEngine.resolve(a).type;` (pakai
  `resolve()`, bukan `a.ownership` mentah, supaya aset lama tanpa field
  `ownership` tetap fallback SELF/DEFAULT — konsisten dengan seluruh
  konsumen OwnershipEngine lain di project ini).

Arah sync tetap SATU ARAH (Aset -> Akun), sama seperti sync saldo yang
sudah ada — akun tertaut tidak pernah jadi sumber kebenaran untuk
ownership-nya sendiri selama masih tertaut ke sebuah Aset.

File yang diubah: `modules/asset/aset.js`.

## Test

Ditambah `tests/asset-owners-linked-account-ownership-sync-s437.test.js`
(3 test baru, pola sama dengan `asset-owners-linked-account-resync-s422e.test.js`):

1. `saveOwners()` — akun tertaut ikut disamakan ownership-nya ke ownership
   aset (INVESTOR).
2. `saveOwners()` — aset tanpa field `ownership` (data lama) -> akun
   tertaut fallback SELF via `OwnershipEngine.resolve()`.
3. `Aset.save()` — menautkan ke akun EXISTING ikut menyamakan ownership
   akun ke ownership aset yang dipilih di form.

Regresi: `asset-owners-linked-account-resync-s422e.test.js` &
`akun-multiowner-linked-account-s396.test.js` (saldo/exclusion logic,
tidak disentuh) tetap lolos tanpa perubahan. Full suite: **2900/2900
lolos** (naik dari 2897 di v1152 + 3 test baru sesi ini).

## Build

- `npm test` -> 2900/2900 lolos.
- `node scripts/build.js s437-ownership-linked-account-sync-fix` -> versi
  naik v1152 -> v1153.
- `verify-window-expose` ✓, `verify-bundle-freshness` ✓ (kedua bundle
  segar, hash cocok source).
- `verify-release-ready` (release gate): 2 gate di-override manual (lint —
  eslint tidak terpasang di sandbox tanpa akses npm registry; minify —
  esbuild tidak terpasang di sandbox tanpa akses jaringan), konsisten
  dengan batasan environment sesi-sesi sebelumnya. Gate `html-sync` lolos
  normal.

## Catatan out-of-scope

Audit ini fokus HANYA pada sync ownership akun<->aset tertaut. Ditemukan
tapi SENGAJA TIDAK disentuh sesi ini (di luar scope "1 task = 1 sesi"):
- `resolveTxAssetSplit()`/`MultiOwnerEngine` di `modules/finance/transaksi.js`
  (split porsi ke tampilan transaksi Pemasukan yang ditautkan ke aset
  multi-owner) sudah reuse `MultiOwnerEngine.getOwners()`/`splitByPorsi()`
  dengan benar — TIDAK ada gap serupa di jalur ini, dicek saat audit tapi
  tidak perlu perubahan.
