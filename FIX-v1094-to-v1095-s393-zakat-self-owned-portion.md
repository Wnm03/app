# Sesi 393 — Sync Ownership ke Zakat: hitung porsi milik SENDIRI, bukan nilai penuh

## Temuan (dari audit ownership sesi sebelumnya)

`MultiOwnerEngine` (S390) sudah bisa catat aset dgn beberapa pemilik & porsi
beda-beda (`asset.owners`), tapi **Zakat Maal** (2 tempat: `Zakat.hitungMaal()`
di `pajak-pbb-zakat.js`, dan `PajakAset.hitungZakatAset()` di `aset.js`) masih
menghitung dari `a.nilai` (nilai PENUH aset) tanpa peduli porsi kepemilikan —
kalau aset zakatable itu multi-pemilik (mis. kamu cuma punya 40%), zakat tetap
dihitung dari 100% nilainya, bukan porsi milikmu saja. Transaksi, Utang &
Piutang, dan Akun Keuangan **belum** disentuh sesi ini (di luar scope — lihat
bagian "Belum dikerjakan").

## Yang dikerjakan

**1. `modules/shared/multi-owner-engine.js`** — field baru `isSelf` (boolean)
per baris pemilik + 2 method baru:
- `_resolveIsSelf(o)` — helper internal: `true` kalau baris eksplisit ditandai
  `isSelf:true`, ATAU `ownerId` (case-insensitive) `'SELF'` (sentinel yang
  SUDAH dipakai konsisten di codebase ini — `OwnershipEngine.DEFAULT`, filter
  `vehOwnFilter`, dst) — supaya data lama/tersintesis TETAP kebaca benar tanpa
  migrasi.
- `getOwners()`/`setOwners()` sekarang menyertakan `isSelf` di tiap baris
  (dipakai `_resolveIsSelf`).
- `selfPorsi(entity)` — total % porsi milik sendiri (0 kalau tidak ada baris
  `isSelf`). Aset single-owner (mayoritas — default/legacy) selalu balik
  **100** (0 regresi).
- `selfOwnedValue(entity, nilai)` — `nilai * selfPorsi(entity)/100`, pure.

**2. `modules/asset/aset.js`**:
- `Aset.selfOwnedNilai(a)` — wrapper tipis ke `MultiOwnerEngine.selfOwnedValue()`
  (guard `typeof`, fallback nilai penuh kalau engine belum dimuat).
- `PajakAset.hitungZakatAset()` & baris zakat per-aset di `renderList()` —
  pakai `Aset.selfOwnedNilai(a)`, bukan `a.nilai` langsung.
- Modal "⚖️ Atur Porsi Kepemilikan" (`assetOwnersModal`) — tiap baris pemilik
  sekarang punya checkbox **"👤 Ini saya"** (`Aset.onOwnerIsSelfToggle`).
  Baris pertama yang ditambahkan (`addOwnerRow`) default tercentang, baris
  berikutnya default tidak — bisa ditoggle bebas, tidak dibatasi cuma 1 baris.
  `openOwnersModal`/`saveOwners`/`resetOwners` ikut bawa field `isSelf`.

**3. `modules/finance/pajak-pbb-zakat.js`** — `Zakat.hitungMaal()`: hitung
`asetZakatable` lewat `MultiOwnerEngine.selfOwnedValue(a, a.nilai||0)` (guard
`typeof`, fallback nilai penuh). Sengaja TIDAK import `Aset` — modul ini
berdiri sendiri, panggil `MultiOwnerEngine` langsung (pola sama dgn
`totalPiutangValue()`/`totalDebtValue()` yang juga dipanggil lintas-domain apa
adanya).

## Efek samping yang disengaja (bonus fix, bukan scope creep)

Karena `getOwners()` mensintesis pemilik dari field lama `ownership`
(OwnershipEngine S191) dgn `ownerId` = tipe kepemilikan itu sendiri
(`SELF`/`INVESTOR`/`CUSTOMER`/dst), aset lama yang ditandai `ownership:
'INVESTOR'` (bukan milik sendiri) tapi kebetulan juga `zakatable:true` —
SEBELUMNYA tetap kena hitung zakat penuh (bug terpisah, ketemu waktu audit).
Sekarang otomatis ikut benar juga: `isSelf` cuma `true` kalau tipe-nya
`'SELF'`, jadi porsi INVESTOR/CUSTOMER/dst otomatis 0% ke zakat kamu — tanpa
perlu perubahan kode tambahan.

## Kompatibilitas / regresi

- Aset single-owner (mayoritas, default/legacy) — `selfPorsi()` selalu 100%,
  hasil zakat SAMA PERSIS seperti sebelum sesi ini.
- Aset yang SUDAH punya `owners` array multi-pemilik dari sesi 392 (kalau
  ada) TAPI belum ditandai `isSelf` di baris manapun — porsi zakat jadi 0%
  sampai user buka lagi modal porsi & centang "👤 Ini saya" di baris yang
  sesuai. Ini SENGAJA (itulah inti perbaikannya) — dicatat di sini supaya
  tidak disangka bug kalau ditemukan di lapangan.

## Test & build

`npm test`: **2683/2683 pass** (2675 lama + 4 diupdate shape `isSelf` + 8
baru di `tests/asset-zakat-self-portion-s393.test.js`, 0 gagal).
`node scripts/build.js s393-zakat-self-owned-portion` — sukses, sintaks kedua
bundle valid. Versi v1094 → **v1095**.

## Belum dikerjakan sesi ini (dari audit, scope lebih besar/sesi terpisah)

- **Transaksi** — hasil jual/pemasukan dari aset multi-owner belum otomatis
  kesplit ke tiap owner di modul Transaksi.
- **Utang & Piutang** — belum ikut pakai `MultiOwnerEngine`/`isSelf`; masih
  terpisah dari mekanisme "Dana Titipan" (`titipanAmount`) yang sudah ada.
- **Akun Keuangan** — saldo akun yang tertaut ke aset multi-owner belum
  difilter berdasarkan porsi kepemilikan.
- **PBB** (`PajakAset.hitungPBB()`) — masih pakai `a.nilai` penuh (tidak
  disentuh; lebih rendah prioritas krn PBB terutang biasanya tetap atas nama
  properti penuh, beda karakter dgn Zakat Maal yang personal per-wajib-zakat).
