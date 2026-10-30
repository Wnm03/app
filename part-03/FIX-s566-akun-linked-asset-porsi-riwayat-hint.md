# FIX s566 — Perjelas Akun Tertaut Aset: Porsi Lengkap + Hint Riwayat Transaksi Modal

**Permintaan user:** "perjelas aset yg ditautkan untuk akun transaksi agar
menampilkan porsi lengkap dengan riwayat transaksi modal total."

## Masalah

Kartu akun berbadge "(via Aset)" di `renderAccGrid()` (🏦 Akun & Metode
Pembayaran, Pengaturan > Keuangan) — contoh: kartu "Majoris (via Aset)
Investor · Modal Rp 11.100.000 · ... · Rp 11.241.970" — cuma nampilin:

- Badge ownership generik 1 tipe ("Investor") lewat `OwnershipEngine`,
  padahal Aset yang menautkan akun ini bisa multi-owner dgn porsi pecahan
  (`MultiOwnerEngine`) — porsi lengkapnya TIDAK terlihat sama sekali dari
  kartu akun.
- `invDetailLine` statis dari `a.investDetail` (snapshot hasil scan OCR) —
  angka Modal/Untung/unit, tapi 0 petunjuk ke user bahwa tap kartu ini
  membuka Riwayat Transaksi (aksi `openAccTxHistory` sudah ada sejak lama,
  tapi 0 affordance visual).

## Perubahan

- **`modules/shared/modules-render.js`, `renderAccGrid()`:** 2 baris baru
  di kartu akun, HANYA muncul kalau akun `linked` (badge "(via Aset)"),
  PURE UI/read-only, 0 field baru, 0 rumus baru:
  1. `👥 Porsi: <nama> (<porsi>%) · ...` — cari Aset yang `accountId`-nya
     menunjuk ke akun ini (`D.assets.find(x=>x.accountId===a.id)`), lalu
     100% REUSE `MultiOwnerEngine.getOwners()` (sama pola persis
     `linkMultiOwnerWarn` di `Aset.openActionsMenu()`, aset.js) — otomatis
     toleran data lama (owner tunggal disintesis "Milik Sendiri (100%)").
  2. `📜 Ketuk kartu untuk riwayat transaksi modal` — hint statis,
     memperjelas aksi klik kartu yang SUDAH ADA (`data-action=
     "openAccTxHistory"` di wrapper div, TIDAK diubah/ditambah aksi baru).
- Akun yang TIDAK tertaut ke aset apa pun, atau berstatus nonaktif (off):
  0 perubahan tampilan (kedua baris di atas cuma dirender kalau `linked`
  true, sama syarat dgn badge "(via Aset)" yang sudah ada).
- **Test baru:** `tests/s566-linked-account-porsi-riwayat-hint.test.js`
  (5 test): porsi multi-owner lengkap tampil, hint riwayat tampil, porsi
  single-owner tetap tampil (sintesis 100%), akun biasa 0 perubahan, akun
  off tetap 0 perubahan walau kebetulan ada aset menunjuk ke id yang sama.

## Verifikasi

- `node --test tests/s566-linked-account-porsi-riwayat-hint.test.js` →
  **5/5 lolos**.
- `node --test tests/*.test.js` → **3971/3971 lolos, 0 gagal** (0 regresi).
- `node scripts/build.js s566-akun-linked-asset-porsi-riwayat-hint` — lolos
  semua lint blocking, versi disamakan di 5 file source, kedua bundle
  lolos `node --check`.

## Belum ditangani (di luar scope sesi ini)

- `invDetailLine` (snapshot `a.investDetail` dari scan OCR) tidak
  disatukan dengan data live Aset — sengaja tidak disentuh, keduanya bisa
  jadi sumber berbeda (akun investasi berdiri sendiri vs akun tertaut
  Aset) dan menyatukan berisiko mengubah tampilan akun yang sudah ada.
- Riwayat transaksi yang dibuka lewat `openAccTxHistory()` scope
  `'account'` cuma menampilkan `D.transactions` yang tercatat dgn
  `accountId` ini (termasuk transaksi Beli/Jual Investasi kalau direkam
  dgn akun ini) — tidak ada perubahan ke filter/scope tersebut sesi ini.
