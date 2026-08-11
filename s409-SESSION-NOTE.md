# Sesi 409 (Sesi D dari 4) — `sumTitipanAset()` baca dari `MultiOwnerEngine`

## Konteks

Sesi terakhir (dari 4) migrasi Dana Titipan -> Multi-Owner Engine (lihat
`s406b-SESSION-NOTE.md`/Sesi A, `s407-SESSION-NOTE.md`/Sesi A susulan,
`s408-SESSION-NOTE.md` utk Sesi B). Sesi ini: Sesi D —
`modules/finance/dana-kelolaan.js`. Dipilih duluan drpd Sesi C krn lebih
ringan (1 fungsi murni + 1 file test, 0 perubahan UI/DOM) — Sesi C
(`Aset.save()`/`saveOwners()` + rombak `assetModal`) masih tertunda.

## Perubahan

- `modules/finance/dana-kelolaan.js`:
  - `DanaKelolaan.sumTitipanAset()` — SEBELUM sesi ini baca `a.titipanAmount`
    legacy langsung (`s + (a.titipanAmount||0)`). Sekarang pakai
    `MultiOwnerEngine.selfPorsi(a)`: porsi titipan = `a.nilai * (1 -
    selfPorsi/100)`, dijumlah per aset ber-ownership efektif SELF (filter
    `_resolveType(a)==='SELF'` TIDAK berubah). 100% reuse rumus yang sudah
    ada di `MultiOwnerEngine.selfOwnedValue()`/`Aset.selfOwnedNilai()`
    (Sesi 393) — 0 rumus baru ditulis sendiri di sini, cuma pasang ulang.
  - Kenapa ini "penyelesaian" migrasi, bukan cuma refactor kosmetik:
    `a.titipanAmount` cuma bisa merepresentasikan 1 pemilik titipan per
    aset. `a.owners` (S390-392e, "Atur Porsi Kepemilikan") bisa >1 owner
    non-SELF sekaligus (mis. 25% Budi + 15% Ayah). Versi lama
    `sumTitipanAset()` TIDAK PERNAH baca `a.owners` sama sekali — aset
    yang porsi titipannya diatur lewat modal majemuk itu ke-invisible di
    Dana Kelolaan. Sekarang lewat `selfPorsi()` (yang baca `getOwners()`,
    otomatis prioritaskan `a.owners` kalau valid), porsi majemuk itu ikut
    kehitung.
  - 0 REGRESI utk aset yang belum sempat auto-migrate ke `a.owners` (Sesi C
    belum jalan sesi ini): `MultiOwnerEngine.getOwners()` sendiri MASIH
    baca `titipanAmount` legacy lewat cabang sintesis
    `_synthesizeFromTitipan()` (Sesi 406b) kalau `a.owners` belum ada/tidak
    valid — jadi `sumTitipanAset()` TIDAK PERLU TAHU beda sumber datanya,
    tinggal pakai porsi efektif apa pun asalnya.
  - Hasil per-aset dibulatkan `Math.round()` sebelum dijumlah (bukan di
    akhir) — jaga presisi Rupiah & menghindari residu floating-point dari
    pembagian `titipanAmt/nilai*100` lalu dikonversi balik ke nominal
    (mis. `1700000` bisa jadi `1699999.9999999998` tanpa pembulatan ini).
  - Guard `typeof MultiOwnerEngine==='undefined'` -> fallback `0` (pola
    sama persis guard `OwnershipEngine` di `_resolveType()` — modul ini
    didesain aman dipakai berdiri sendiri kalau salah satu engine belum
    dimuat, lihat komentar header file).
- `tests/dana-kelolaan.test.js`:
  - `makeCtx()` — tambah `modules/shared/multi-owner-engine.js` ke daftar
    file yang di-load & `MultiOwnerEngine` ke daftar expose (WAJIB, kalau
    tidak `sumTitipanAset()` versi baru selalu fallback ke guard `0` di
    sandbox test, semua assert titipanAset gagal).
  - +1 test baru: aset SELF porsi majemuk 60% SELF + 25% Budi + 15% Ayah
    lewat `a.owners` (kasus yang TIDAK BISA direpresentasikan
    `titipanAmount` tunggal) -> `titipanAset` harus kehitung 40% dari
    nilai aset, lintas 2 owner non-SELF sekaligus.
  - 2 test titipan legacy existing (single titipanAmount, & titipanAmount
    di aset non-SELF) TIDAK diubah logikanya — tetap hijau apa adanya,
    membuktikan 0 regresi jalur lama.
- `tests/asset-titipan.test.js` — TIDAK disentuh sesi ini (sudah ditulis
  ulang tuntas di Sesi B/408, tidak ada lagi referensi
  `_syncTitipanDebt()`/`titipanDebtLinkId` di sana yang perlu diubah utk
  perubahan Sesi D ini — beda modul, beda fungsi, tidak overlap).

## Verifikasi

- `node --test tests/*.test.js` → **2732/2732 pass**, 0 fail (2731 lama +
  1 test baru Sesi D).
- `node scripts/build.js` → build sukses, sintaks bundle valid, versi
  `v1114` → `v1115`.
- `npm run lint` (eslint) belum sempat dijalankan (tidak ada akses internet
  di environment ini) — kode baru mengikuti gaya file sekitarnya.

## Lanjut ke Sesi C (terakhir dari 4)

`Aset.save()` + `saveOwners()`: wiring auto-migrate BENERAN (nulis
`a.owners` dari `titipanAmount` via `MultiOwnerEngine.setOwners()`) saat
titik simpan, hapus toggle & field titipan dari `assetModal`, ganti jadi
ringkasan read-only. Belum dikerjakan sesi ini — setelah Sesi C selesai,
migrasi Dana Titipan -> Multi-Owner Engine 4 sesi ini TUNTAS.
