# FIX v1148 -> v1149 (s434) — Audit & perbaikan 2 laporan user: "nominal akun tertaut selalu 0" & "riwayat transaksi tidak muncul saat akun diklik"

## Konteks

Laporan user, 2 hal terpisah:

1. Akun yang ditautkan dari 📋 Buku Aset nominalnya selalu Rp 0.
2. Klik akun (mis. dari 📜 Riwayat Transaksi akun tertaut) tidak menampilkan
   daftar transaksinya sama sekali.

## Bug #2 — Riwayat transaksi kosong (BUG NYATA, diperbaiki)

### Root cause

`showFilteredTx()` (`modules/finance/filter-laporan.js`) scope `'account'`
mencocokkan transaksi lewat:

```js
txs=D.transactions.filter(t=>t.accountId===accId);
```

Strict equality (`===`). `sameId()` (`String(a)===String(b)`) sudah dipakai
HAMPIR di semua tempat lain di codebase ini (`aset.js`, `akun.js`, dst) justru
untuk menghindari kasus `t.accountId` & `accId` bertipe beda (mis. salah satu
angka, satunya string — bisa terjadi dari data lama/import/localStorage yang
tidak selalu konsisten tipe datanya). `showFilteredTx()` scope `'account'`
adalah SATU-SATUNYA titik pencocokan-by-id di sekitar riwayat transaksi akun
yang masih pakai `===` mentah, jadi begitu ada mismatch tipe, hasilnya selalu
list kosong tanpa error apa pun — persis gejala yang dilaporkan.

### Perbaikan

```js
txs=D.transactions.filter(t=>sameId(t.accountId,accId));
```

0 logic baru — reuse helper global yang sudah ada. Tidak menyentuh scope
`'dashboard'`/`'keuangan'`/`'laporan'` (tidak match by-id, jadi tidak
terdampak bug ini).

File yang diubah: `modules/finance/filter-laporan.js`.

## Bug #1 — "Nominal akun tertaut selalu 0" (BUKAN bug hitungan — audit dikonfirmasi)

### Hasil audit

Dikonfirmasi: akun tertaut MEMANG SENGAJA cuma menampung porsi **Milik
Sendiri**, lewat `MultiOwnerEngine.selfOwnedValue(a, a.nilai)` — supaya nilai
aset tidak dobel dihitung antara 📋 Buku Aset & 🏦 Akun (lihat komentar
panjang di `totalSaldoAkun()`/`Aset.save()`, ditulis sesi 422c/Sesi C
migrasi Dana Titipan). Rantai baca porsi (`MultiOwnerEngine.getOwners()`):

1. `entity.owners[]` (hasil "⚖️ Atur Porsi Kepemilikan") kalau ada & valid.
2. Dana titipan legacy (`titipanAmount`), kalau berlaku.
3. **Field dropdown "Kepemilikan"** (`entity.ownership`, SATU tipe untuk
   SELURUH aset) — kalau bukan `SELF` (mis. INVESTOR/CUSTOMER/FAMILY/
   THIRD_PARTY), disintesis jadi **1 pemilik porsi 100%, `isSelf:false`** →
   `selfPorsi()` = 0 → `selfOwnedValue()` = 0.
4. Default: 1 pemilik SELF 100%.

Jadi kalau aset yang akun-nya ditautkan py Kepemilikan ≠ "Milik Sendiri", ATAU
py `owners[]` dgn porsi Milik Sendiri 0%, saldo akun tertaut MEMANG akan Rp 0
di setiap simpan — **sesuai desain**, bukan regresi/bug hitungan. Diverifikasi
manual (baca `multi-owner-engine.js` + `aset.js` baris ~805-860, ~687-702)
dan lewat test baru (lihat bawah) — tidak ditemukan cabang kode yang
menghitung salah.

### Kenapa tetap perlu perbaikan

Dari sisi user, gejalanya SAMA PERSIS dengan bug ("kok tiba-tiba 0?") — tidak
ada info apa pun di UI yang menjelaskan KENAPA. Field "Kepemilikan" letaknya
terpisah jauh dari akun tertaut, gampang lupa/tidak sadar dampaknya.

### Perbaikan (tampilan saja, 0 perubahan hitungan)

`Aset.openActionsMenu()` (`modules/asset/aset.js`) — baris info "🔗 Akun
tertaut" sekarang menyertakan saldo porsi Milik Sendiri vs nilai penuh aset,
kalau keduanya beda:

```
🔗 Akun tertaut: BCA Sewa (saldo Rp300.000 — porsi Milik Sendiri dari nilai aset Rp1.000.000)
```

Kalau porsi Milik Sendiri = 100% (kasus mayoritas/default), keterangan
tambahan itu tidak muncul (perilaku lama, tidak berubah) — cuma nama akun
seperti biasa, supaya tidak menambah noise buat aset yang tidak kena kasus
ini. Reuse penuh `MultiOwnerEngine.selfOwnedValue()` — 0 rumus baru.

File yang diubah: `modules/asset/aset.js`.

## Yang SUDAH BENAR (diverifikasi, TIDAK diubah)

- `totalSaldoAkun()` mengecualikan akun tertaut sepenuhnya dari Total Saldo
  Akun (S422c) — tetap, supaya tidak dobel hitung dgn `Aset.totalValue()`.
- `Aset.save()` / `Aset.saveOwners()` sync `linkedAcc.balance`/`baseBalance`
  ke `ownPortion` lewat pola `txDelta` (riwayat transaksi akun TIDAK
  diutak-atik) — tetap, tidak disentuh sesi ini.
- Rantai prioritas `MultiOwnerEngine.getOwners()` (owners[] > titipan legacy
  > ownership legacy > default SELF 100%) — tetap, ini fondasi S390/406b,
  di luar scope sesi ini.

## Test (nyata, dijalankan)

`tests/s434-linked-account-zero-and-tx-history.test.js` — 3 test BARU, load
SOURCE ASLI (`modules/finance/filter-laporan.js`, `modules/asset/aset.js`)
lewat VM harness (`loadSource`):

1. `showFilteredTx('account',...)` dgn `accId` angka & `t.accountId` campuran
   string/angka → transaksi yang cocok (via `sameId`) HARUS tetap muncul,
   yang tidak cocok TIDAK ikut, summary hitung benar.
2. Regresi: `accId`/`accountId` sama-sama string → tetap match (perilaku
   lama tidak berubah).
3. `Aset.openActionsMenu()` dgn aset multi-owner (porsi Milik Sendiri 30%) →
   `assetActionsMeta` HARUS menampilkan saldo porsi (Rp300.000) & nilai penuh
   aset (Rp1.000.000) berdampingan.

Full suite: **2895/2895 test `node --test` lulus** (naik dari 2892, +3 test
baru session ini), 0 regresi di test lama (termasuk seluruh test
`multi-owner-engine`/`aset`/`filter-laporan` yang sudah ada).

## Release gate

- `lint`: override dipakai (eslint tidak bisa diinstall, sandbox tanpa akses
  jaringan) — konsisten sesi-sesi sebelumnya.
- `minify`: override dipakai (esbuild tidak terpasang, sandbox tanpa akses
  jaringan) — bundle unminified 100% valid (`node --check` lolos).
- `html-sync`: lolos normal.

Versi: v1148 → **v1149** (`s434-audit-fix-linked-acc-nol-riwayat-kosong`).
Backup bundle lama tersimpan otomatis di `backups/`.
